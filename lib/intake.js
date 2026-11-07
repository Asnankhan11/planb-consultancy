'use strict';
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl27R8Lr_T7hqpsX3y2R0KqM7DVFjc5E6kt_lAce5f5vPmXrKCA_UsVpDgCBYr9XndvQ/exec';
const RESUME_TYPES = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

function httpError(status, message, code) { return Object.assign(new Error(message), { status, code, expose: true }); }
function text(value, max = 200) { return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : ''; }
function phone(value) {
    let digits = text(value, 30).replace(/[^\d]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}
function email(value) {
    const normalized = text(value, 254);
    if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw httpError(400, 'Enter a valid email address.');
    return normalized;
}
function safeCell(value) {
    const normalized = String(value == null ? '' : value);
    return /^[\s\u0000-\u001f]*[=+\-@]/.test(normalized) ? "'" + normalized : normalized;
}
// DOCX is a ZIP container with these required entries, not just a renamed ZIP file.
function isDocx(bytes) {
    let cursor = bytes.length - 22;
    const minimum = Math.max(0, bytes.length - 65557);
    while (cursor >= minimum && bytes.readUInt32LE(cursor) !== 0x06054b50) cursor--;
    if (cursor < minimum) return false;
    const entries = bytes.readUInt16LE(cursor + 10);
    const directorySize = bytes.readUInt32LE(cursor + 12);
    const directoryOffset = bytes.readUInt32LE(cursor + 16);
    if (!entries || entries > 2000 || directoryOffset + directorySize > cursor) return false;
    let offset = directoryOffset, totalSize = 0;
    const names = new Set();
    for (let i = 0; i < entries; i++) {
        if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) return false;
        const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32);
        const next = offset + 46 + nameLength + extraLength + commentLength;
        if (next > directoryOffset + directorySize) return false;
        totalSize += bytes.readUInt32LE(offset + 24);
        if (totalSize > 30 * 1024 * 1024) return false;
        names.add(bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
        offset = next;
    }
    return names.has('[Content_Types].xml') && names.has('word/document.xml') && !names.has('word/vbaProject.bin');
}
function validateResume(file) {
    if (!file?.buffer?.length) throw httpError(400, 'A PDF, DOC or DOCX resume is required.');
    if (file.buffer.length > MAX_UPLOAD_BYTES) throw httpError(413, 'Resume must be no larger than 3 MB.');
    const extension = require('node:path').extname(file.originalname || '').toLowerCase();
    const bytes = file.buffer;
    const valid = extension === '.pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' :
        extension === '.doc' ? bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex')) :
        extension === '.docx' ? bytes.length >= 22 && bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex')) && isDocx(bytes) : false;
    if (!valid) throw httpError(400, 'The resume contents must match its PDF, DOC or DOCX file type.');
    file.mimetype = RESUME_TYPES[extension];
    file.originalname = text(file.originalname, 120).replace(/[^a-zA-Z0-9._-]/g, '_');
    return extension;
}
function applicationIdentity(fields, file, clientKey, secret) {
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(fields)).update(file?.buffer || '').digest('hex');
    // A client request key is only a retry hint. It can never identify somebody else's application.
    const key = text(clientKey, 128);
    const suffix = key && secret ? crypto.createHmac('sha256', secret).update(key + ':' + fingerprint).digest('hex').slice(0, 32) : crypto.randomBytes(16).toString('hex');
    return { id: `PB-${suffix.toUpperCase()}`, fingerprint };
}
function gasConfigured() { return Boolean(process.env.GOOGLE_APPS_SCRIPT_SECRET) && process.env.GOOGLE_APPS_SCRIPT_VERSION === '2'; }
async function submitToGoogleAppsScript(payload) {
    if (!gasConfigured()) throw httpError(503, 'Online intake is temporarily unavailable. Please contact our team.', 'STORAGE_UNAVAILABLE');
    const url = process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_SCRIPT_URL;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) throw httpError(503, 'Online intake is temporarily unavailable.', 'STORAGE_CONFIGURATION');
    const safePayload = { ...payload };
    // Protect the already-deployed Script as well as the updated Script from formula injection.
    for (const key of ['name','whatsapp','email','city','state','qualification','experience','experienceYears','role','resumeFileName','student_name','interested_course','preferred_college','preferred_city','admission_type','additional_requirements']) {
        if (key in safePayload) safePayload[key] = safeCell(safePayload[key]);
    }
    try {
        // Verify the deployed version before transferring candidate data or a resume.
        // An environment flag alone cannot make the historical endpoint safe.
        const probe = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        const capabilities = probe.ok ? await probe.json() : {};
        if (capabilities.success !== true || capabilities.version !== 2) throw new Error('UPSTREAM_VERSION');
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...safePayload, secret: process.env.GOOGLE_APPS_SCRIPT_SECRET }), signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error('UPSTREAM_STATUS');
        const result = await response.json();
        if (!result.success || result.version !== 2 || result.applicationId !== payload.applicationId) throw new Error('UPSTREAM_REJECTED');
        if (payload.action !== 'admission' && !/^https:\/\/drive\.google\.com\//.test(result.resumeUrl || '')) throw new Error('UPSTREAM_STORAGE_UNCONFIRMED');
        return result;
    } catch (error) {
        console.error('Application storage could not confirm receipt.', error.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_ERROR');
        throw httpError(502, 'We could not confirm that your submission was saved. Please retry using the same form, or contact the team.', 'STORAGE_NOT_CONFIRMED');
    }
}
function smtpConfig() {
    const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
    const rawPass = process.env.GMAIL_PASS || process.env.SMTP_PASS || '';
    const pass = process.env.GMAIL_PASS ? rawPass.replace(/\s/g, '') : rawPass;
    if (!user || !pass) return null;
    const port = Number(process.env.SMTP_PORT || 465);
    return { host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user, pass }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 5000 };
}
async function notifyApplication(fields, file, applicationId) {
    const config = smtpConfig();
    if (!config) return { admin: 'not_configured', applicant: fields.email ? 'not_configured' : 'not_requested' };
    const transporter = nodemailer.createTransport(config);
    const from = `"Plan B Careers" <${config.auth.user}>`;
    const messages = [{ key: 'admin', options: { from, to: process.env.ADMIN_EMAIL || 'contact.planbcareers@gmail.com', subject: `Application ${applicationId}`, text: `Application ${applicationId}\nName: ${fields.name}\nMobile: ${fields.mobile}\nEmail: ${fields.email || 'Not provided'}\nCity: ${fields.city}\nRole: ${fields.role}\nThe application has been saved. Hiring decisions remain with the employer.`, attachments: file ? [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }] : [] } }];
    if (fields.email) messages.push({ key: 'applicant', options: { from, to: fields.email, subject: 'Application received — Plan B Careers', text: `Hello ${fields.name},\n\nYour application ${applicationId} for ${fields.role} has been recorded. Receipt does not guarantee an interview or selection. Contact +91 94205 12501 if you need help.\n\nPlan B Careers` } });
    const results = await Promise.all(messages.map(async message => {
        try { const receipt = await transporter.sendMail(message.options); return [message.key, Array.isArray(receipt.accepted) && receipt.accepted.length ? 'sent' : 'failed']; }
        catch { console.warn('Application notification failed.', message.key); return [message.key, 'failed']; }
    }));
    return { applicant: 'not_requested', ...Object.fromEntries(results) };
}
function admissionWhatsApp(fields) {
    return 'https://wa.me/919420512501?text=' + encodeURIComponent(`Admission enquiry — Plan B Careers\nName: ${fields.student_name}\nMobile: ${fields.mobile}\nCourse: ${fields.interested_course || 'Please advise'}\nPreferred city: ${fields.preferred_city || 'Please advise'}`);
}
module.exports = { MAX_UPLOAD_BYTES, text, phone, email, safeCell, validateResume, isDocx, applicationIdentity, gasConfigured, submitToGoogleAppsScript, notifyApplication, smtpConfig, admissionWhatsApp, httpError };
