'use strict';
if (process.env.NODE_ENV !== 'test') require('dotenv').config({ quiet: true });
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');
const jobsModel = require('./lib/jobs-data');
const intake = require('./lib/intake');
const { text, phone, email, httpError } = intake;
const app = express();
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const sourceJobs = () => require('./jobs.json');
const JWT_SECRET = process.env.JWT_SECRET || '';
const authConfigured = JWT_SECRET.length >= 32 && JWT_SECRET !== 'supersecretplanbkey2026';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), sameSite: 'strict', path: '/api', maxAge: 8 * 60 * 60 * 1000 };
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: intake.MAX_UPLOAD_BYTES, files: 1, fields: 24, fieldSize: 10000, parts: 26 } });
const inFlight = new Map();
const stableRetrySecret = [process.env.APPLICATION_ID_SECRET, JWT_SECRET, process.env.GOOGLE_APPS_SCRIPT_SECRET].find(value => typeof value === 'string' && value.length >= 32);
const retrySecret = stableRetrySecret || crypto.randomBytes(32).toString('hex');

app.disable('x-powered-by');
if (process.env.VERCEL) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (Number(req.headers['content-length']) > 4 * 1024 * 1024) return res.status(413).json({ success: false, error: 'Request is too large. Upload one file, no larger than 3 MB.' });
    next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
const intakeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many submissions. Please try again later or contact the team.' } });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many login attempts. Please try again later.' } });
async function requireStorage() { await db.ready; if (!db.available) throw httpError(503, 'Persistent storage is unavailable. Please contact the team directly.', 'STORAGE_UNAVAILABLE'); }
const rows = async (sql, args) => (await db.query(sql, args)).rows;
const first = async (sql, args) => (await rows(sql, args))[0];
async function publicRows(sql, args) { await db.ready; return db.available ? rows(sql, args) : []; }
function positiveId(value) { if (!/^\d+$/.test(String(value)) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) throw httpError(400, 'A valid record ID is required.'); return Number(value); }
function required(value, label, max = 200) { const result = text(value, max); if (!result) throw httpError(400, `${label} is required.`); return result; }
function safeUrl(value) { const result = text(value, 1000); if (!result) return ''; if (/^\/(?!\/)[a-zA-Z0-9_./%-]+$/.test(result)) return result; try { if (new URL(result).protocol === 'https:') return result; } catch {} throw httpError(400, 'Use a secure HTTPS link or a local media URL.'); }
function enumValue(value, allowed, fallback) { const result = text(value, 80) || fallback; if (!allowed.includes(result)) throw httpError(400, 'Invalid status.'); return result; }
function sameOrigin(req, res, next) {
    if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}` && req.headers.origin !== 'https://planbcareers.in') return next(httpError(403,'Request origin is not allowed.'));
    next();
}
const verifyToken = asyncRoute(async (req, res, next) => {
    if (!authConfigured) throw httpError(503, 'Administration is not configured.');
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('pb_admin='))?.slice(9);
    const token = bearer || cookie;
    if (!token) throw httpError(401, 'Sign in to continue.');
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'planbcareers', audience: 'planb-admin' }); } catch { throw httpError(401, 'Your session is invalid or expired.'); }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && cookie && !bearer && req.headers.origin) {
        const expected = `${req.protocol}://${req.get('host')}`;
        if (req.headers.origin !== expected && req.headers.origin !== 'https://planbcareers.in') throw httpError(403, 'Request origin is not allowed.');
    }
    const admin = await first('SELECT id FROM admins WHERE id=?', [decoded.id]);
    if (!admin) throw httpError(401, 'Your session is invalid or expired.');
    req.adminId = admin.id;
    next();
});
app.post('/api/admin/login', sameOrigin, loginLimit, asyncRoute(async (req, res) => {
    if (!authConfigured) throw httpError(503, 'Administration is not configured.');
    const username = text(req.body.username, 100), password = text(req.body.password, 200);
    const admin = await first('SELECT id,password FROM admins WHERE username=?', [username]);
    if (!admin || !await bcrypt.compare(password, admin.password)) throw httpError(401, 'Invalid credentials.');
    const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '8h', issuer: 'planbcareers', audience: 'planb-admin', algorithm: 'HS256' });
    res.cookie('pb_admin', token, cookieOptions).json({ success: true, message: 'Signed in.' });
}));
app.get('/api/admin/session', verifyToken, (req, res) => res.json({ authenticated: true }));
app.post('/api/admin/logout', sameOrigin, (req, res) => res.clearCookie('pb_admin', { ...cookieOptions, maxAge: undefined }).json({ success: true }));
app.get('/api/health', asyncRoute(async (req, res) => { await db.ready; res.json({ status: 'ok', storageAvailable: db.available, applicationIntakeAvailable: (db.available || intake.gasConfigured()) && (!(process.env.VERCEL || process.env.NODE_ENV === 'production') || Boolean(stableRetrySecret)) }); }));
app.get('/api/jobs', (req, res) => res.json(sourceJobs().filter(job => jobsModel.isOpenJob(job)).map(jobsModel.normalizeJob)));
app.get('/api/categories', (req, res) => res.json(jobsModel.INDUSTRIES.map((item, i) => ({ ...item, icon: 'briefcase', display_order: i }))));
// Canonical vacancy publication is a reviewed jobs.json change followed by the static build.
for (const method of ['post', 'put', 'delete']) app[method](method === 'post' ? '/api/jobs' : '/api/jobs/:id', verifyToken, (req, res) => res.status(409).json({ error: 'Publish vacancy changes through jobs.json and the site build so the API and indexed pages stay consistent.', code: 'SOURCE_PUBLICATION_REQUIRED' }));
app.get('/api/stats', (req, res) => res.json({ jobsAvailable: sourceJobs().filter(job => jobsModel.isOpenJob(job)).length, applicationsReceived: null, candidates_placed: null, companies_hiring: null }));
app.get('/api/analytics', verifyToken, asyncRoute(async (req, res) => res.json({ traffic: await rows('SELECT * FROM traffic ORDER BY date DESC LIMIT 7'), appStats: await rows('SELECT status,COUNT(*) AS count FROM applications GROUP BY status') })));
app.get('/api/paid-services', (req, res) => res.json([]));
const publicSettingKeys = ['contact_phone','contact_email','office_address','business_hours'];
app.get('/api/settings', asyncRoute(async (req, res) => { const settings = await publicRows(`SELECT key,value FROM settings WHERE key IN (${publicSettingKeys.map(() => '?').join(',')})`, publicSettingKeys); res.json(Object.fromEntries(settings.map(s => [s.key, s.value]))); }));
app.post('/api/settings', verifyToken, asyncRoute(async (req, res) => {
    if (!publicSettingKeys.includes(req.body.key)) throw httpError(400, 'This setting is not editable through the API.');
    await db.query('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [req.body.key,text(req.body.value,1000)]);
    res.json({ message: 'Setting updated.' });
}));
app.post('/api/admin/categories', verifyToken, (req, res) => res.status(409).json({ error: 'Categories are published with the vacancy source and site build.' }));
app.put('/api/admin/paid-services/:id', verifyToken, asyncRoute(async (req, res) => {
    const result = await db.query('UPDATE paid_services SET title=?,price_display=?,price_numeric=?,short_desc=?,features=?,status=? WHERE id=?', [required(req.body.title,'Title'),required(req.body.price_display,'Price'),Math.max(0,Number(req.body.price_numeric)||0),text(req.body.short_desc,1000),JSON.stringify((Array.isArray(req.body.features)?req.body.features:[]).slice(0,20).map(v=>text(v,300))),enumValue(req.body.status,['Active','Inactive'],'Active'),positiveId(req.params.id)]);
    if (!result.changes) throw httpError(404,'Service not found.'); res.json({message:'Service updated.'});
}));

app.post('/api/admission-enquiries', intakeLimit, asyncRoute(async (req, res) => {
    const fields = { student_name: required(req.body.student_name,'Student name'), mobile: phone(req.body.mobile), whatsapp_number: phone(req.body.whatsapp_number || req.body.whatsapp || req.body.mobile), email: email(req.body.email), qualification: text(req.body.qualification), interested_course: text(req.body.interested_course), preferred_college: text(req.body.preferred_college), preferred_city: text(req.body.preferred_city), admission_type: text(req.body.admission_type), additional_requirements: text(req.body.additional_requirements,2000) };
    if (!fields.mobile || !fields.whatsapp_number) throw httpError(400,'Enter a valid 10-digit Indian mobile and WhatsApp number.');
    const id = 'PA-' + crypto.randomBytes(16).toString('hex').toUpperCase();
    const whatsappUrl = intake.admissionWhatsApp(fields);
    await db.ready;
    if (db.available) {
        const keys = Object.keys(fields);
        await db.query(`INSERT INTO admission_enquiries (enquiry_id,${keys.join(',')}) VALUES (${keys.map(()=>'?').concat('?').join(',')})`, [id,...Object.values(fields)]);
    } else if (intake.gasConfigured() && process.env.GOOGLE_APPS_SCRIPT_VERSION === '2') {
        await intake.submitToGoogleAppsScript({ action:'admission',applicationId:id,...fields });
    } else {
        return res.status(503).json({ success:false,error:'Online admission enquiries are temporarily unavailable. Send the prepared WhatsApp message to contact our team.',whatsappUrl,admin_whatsapp_link:whatsappUrl,fallback:{type:'whatsapp',requires_send:true} });
    }
    res.status(201).json({ success:true,id,enquiryId:id,message:'Your enquiry has been recorded. Admission and eligibility are decided by the institution.',whatsappUrl,admin_whatsapp_link:whatsappUrl });
}));
app.post('/api/applications', intakeLimit, upload.single('resume'), asyncRoute(async (req, res) => {
    if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && !stableRetrySecret) throw httpError(503,'Online applications are temporarily unavailable. Please contact the team.','STORAGE_CONFIGURATION');
    intake.validateResume(req.file);
    let job = null;
    if (req.body.job_id && req.body.job_id !== 'general') {
        const id = positiveId(req.body.job_id); job = sourceJobs().find(item => Number(item.id) === id);
        if (!job) throw httpError(404,'This vacancy was not found.');
        if (!jobsModel.isOpenJob(job)) throw httpError(409,'This vacancy is not accepting applications. Please choose an open role.');
    }
    const fields = { job_id:job?.id || null, name:required(req.body.name,'Name'), mobile:phone(req.body.mobile || req.body.whatsapp), email:email(req.body.email), city:required(req.body.city,'City'), state:text(req.body.state,80), qualification:text(req.body.qualification), experience:text(req.body.experience,100), experienceYears:text(req.body.experienceYears || req.body.experience_years,20), role:job ? `${job.title} — ${job.company}` : 'General career enquiry' };
    if (!fields.mobile) throw httpError(400,'Enter a valid 10-digit Indian mobile number.');
    const identity = intake.applicationIdentity(fields,req.file,req.body.requestId || req.body.applicationId || req.body.application_id,retrySecret);
    const save = async () => {
        await db.ready;
        let duplicate = false;
        if (db.available) {
            const existing = await first('SELECT request_hash FROM applications WHERE application_id=?',[identity.id]);
            if (existing) {
                if (existing.request_hash !== identity.fingerprint) throw httpError(409,'This retry could not be matched to your submission. Please start a new application.');
                duplicate = true;
            } else {
                const fileId = crypto.randomUUID();
                try {
                    await db.batch([
                        {sql:'INSERT INTO stored_files (id,bytes,mime_type,filename,private) VALUES (?,?,?,?,1)',args:[fileId,req.file.buffer,req.file.mimetype,req.file.originalname]},
                        {sql:'INSERT INTO applications (application_id,request_hash,job_id,name,mobile,email,city,qualification,experience,resume_url,resume_file_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',args:[identity.id,identity.fingerprint,fields.job_id,fields.name,fields.mobile,fields.email,fields.city,fields.qualification,fields.experience,`/api/admin/applications/${identity.id}/resume`,fileId]}
                    ]);
                } catch (error) {
                    // Another serverless instance may have committed the same retry first.
                    const concurrent = await first('SELECT request_hash FROM applications WHERE application_id=?', [identity.id]);
                    if (!concurrent || concurrent.request_hash !== identity.fingerprint) throw error;
                    duplicate = true;
                }
            }
        } else if (intake.gasConfigured()) {
            const result = await intake.submitToGoogleAppsScript({ ...fields,whatsapp:fields.mobile,applicationId:identity.id,requestHash:identity.fingerprint,resumeBase64:req.file.buffer.toString('base64'),resumeFileName:req.file.originalname,resumeMimeType:req.file.mimetype });
            duplicate = Boolean(result.duplicate);
        } else throw httpError(503,'Online applications are temporarily unavailable. Please contact +91 94205 12501 for help.','STORAGE_UNAVAILABLE');
        const notifications = duplicate ? {admin:'not_repeated',applicant:'not_repeated'} : await intake.notifyApplication(fields,req.file,identity.id);
        return { success:true,applicationId:identity.id,duplicate,resumeName:req.file.originalname,message:duplicate?'Your application was already recorded.':'Your application has been recorded. Receipt does not guarantee an interview or selection.',notifications };
    };
    let pending = inFlight.get(identity.id);
    if (!pending) { pending = save(); inFlight.set(identity.id,pending); }
    try { res.status(201).json(await pending); } finally { if (inFlight.get(identity.id) === pending) inFlight.delete(identity.id); }
}));
app.get('/api/applications', verifyToken, asyncRoute(async (req, res) => {
    const applications = await rows('SELECT * FROM applications ORDER BY id DESC');
    res.json(applications.map(({request_hash,resume_file_id,...item}) => { const job = sourceJobs().find(j=>Number(j.id)===item.job_id); return {...item,job_title:job?.title || 'General career enquiry',job_company:job?.company || ''}; }));
}));
app.get('/api/admin/applications/:id/resume', verifyToken, asyncRoute(async (req,res) => {
    const item = await first('SELECT f.* FROM stored_files f JOIN applications a ON a.resume_file_id=f.id WHERE a.application_id=? OR CAST(a.id AS TEXT)=?',[req.params.id,req.params.id]);
    if (!item) throw httpError(404,'Resume not found.');
    res.type(item.mime_type).attachment(item.filename).send(Buffer.from(item.bytes));
}));
app.put('/api/applications/:id/status', verifyToken, asyncRoute(async (req,res) => {
    const result = await db.query('UPDATE applications SET status=?,notes=? WHERE id=?',[enumValue(req.body.status,['Pending','Reviewed','Shortlisted','Interview Scheduled','Selected','Rejected','Placed'],'Pending'),text(req.body.notes,4000),positiveId(req.params.id)]);
    if (!result.changes) throw httpError(404,'Application not found.'); res.json({message:'Application updated.'});
}));
app.get('/api/admin/admission-enquiries', verifyToken, asyncRoute(async(req,res)=>res.json(await rows('SELECT * FROM admission_enquiries ORDER BY id DESC'))));
app.put('/api/admin/admission-enquiries/:id', verifyToken, asyncRoute(async(req,res)=>{
    const result=await db.query('UPDATE admission_enquiries SET status=?,notes=? WHERE id=?',[enumValue(req.body.status,['New','Contacted','Counselling','In Progress','Converted','Closed'],'New'),text(req.body.notes,4000),positiveId(req.params.id)]);
    if(!result.changes) throw httpError(404,'Enquiry not found.'); res.json({message:'Enquiry updated.'});
}));
app.delete('/api/admin/admission-enquiries/:id',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('DELETE FROM admission_enquiries WHERE id=?',[positiveId(req.params.id)]);if(!result.changes)throw httpError(404,'Enquiry not found.');res.json({message:'Enquiry deleted.'});}));
app.get('/api/admin/test-email',verifyToken,(req,res)=>res.json({configured:Boolean(intake.smtpConfig()),message:'Configuration check only. No email was sent.'}));
app.post('/api/indexnow/submit',verifyToken,asyncRoute(async(req,res)=>{
    const urls=req.body.urls;
    if(!Array.isArray(urls)||!urls.length||urls.length>100)throw httpError(400,'Supply between 1 and 100 public site URLs.');
    for(const value of urls){let u;try{u=new URL(value);}catch{throw httpError(400,'Invalid site URL.');}if(u.origin!=='https://planbcareers.in'||u.username||u.password||u.hash||u.pathname.startsWith('/api')||u.pathname.startsWith('/admin'))throw httpError(400,'Only public planbcareers.in URLs can be submitted.');}
    const key='7f2e1a498b3c419fa82b5e90d12e847c';
    const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:'planbcareers.in',key,keyLocation:`https://planbcareers.in/${key}.txt`,urlList:urls}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw httpError(502,'IndexNow did not accept the submission.');res.json({success:true,submitted:urls.length,message:'Submitted. Search engines decide whether and when to index each URL.'});
}));

app.get('/api/trust/verify-candidate',(req,res)=>res.status(410).json({error:'Public candidate lookup has been retired to protect applicant privacy. Contact our team for authorised verification.'}));
app.get('/api/trust/visitor',(req,res)=>res.json({available:false,visitorId:null,onlineVisitors:null,todayVisitors:null,pageViews:null,status:'Unavailable'}));
// Publish testimonials and activity only after an explicit provenance review of existing records.
app.get('/api/trust/activity',(req,res)=>res.json([]));
app.get('/api/trust/reviews',(req,res)=>res.json([]));
app.get('/api/trust/galleries/:category',(req,res)=>res.json([]));
app.get('/api/images/:folder',(req,res)=>{
    const knownFolders = ['office','founder','team','receipts','salary','logos','payment-proofs','certificates','offer-letters','reviews'];
    if (!knownFolders.includes(req.params.folder)) return res.status(404).json({error:'Gallery not found.'});
    // The reviewed publication manifest is the only source; never enumerate source folders.
    const manifestPath = path.join(__dirname, 'data', 'media-manifest.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) { try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch {} }
    const entries = Array.isArray(manifest) ? manifest : [];
    res.json(entries.filter(entry => entry && entry.approved === true && entry.folder === req.params.folder && /^\/(?:assets|images)\/[a-zA-Z0-9_./%-]+\.(?:webp|avif|png|jpe?g)$/.test(entry.url || '')).map(entry => entry.url));
});
async function storeMedia(file,category){
    await requireStorage(); if(!file?.buffer?.length)throw httpError(400,'Select one file no larger than 3 MB.');
    const extension=path.extname(file.originalname).toLowerCase();
    let bytes=file.buffer,mime,filename;
    const id=crypto.randomUUID();
    if(['.jpg','.jpeg','.png','.webp','.gif'].includes(extension)){
        try{bytes=await sharp(bytes,{limitInputPixels:25000000}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();}catch{throw httpError(400,'The image could not be decoded. Use a valid JPG, PNG, GIF or WebP image.');}
        mime='image/webp';filename=id+'.webp';
    }else if(extension==='.pdf'&&bytes.subarray(0,5).toString()==='%PDF-'){mime='application/pdf';filename=id+'.pdf';}
    else if(extension==='.mp4'&&bytes.length>12&&bytes.subarray(4,8).toString()==='ftyp'){mime='video/mp4';filename=id+'.mp4';}
    else throw httpError(400,'Use a valid JPG, PNG, GIF, WebP, PDF or MP4 file.');
    const url='/api/media/'+id;
    await db.batch([{sql:'INSERT INTO stored_files (id,bytes,mime_type,filename,private) VALUES (?,?,?,?,0)',args:[id,bytes,mime,filename]},{sql:'INSERT INTO media (filename,original_name,category,mime_type,size,url,file_id) VALUES (?,?,?,?,?,?,?)',args:[filename,text(file.originalname,120),required(category,'Category',100),mime,bytes.length,url,id]}]);
    const record=await first('SELECT id FROM media WHERE file_id=?',[id]);return{id:record.id,url,name:text(file.originalname,120)};
}
app.post('/api/admin/media',verifyToken,upload.array('files',1),asyncRoute(async(req,res)=>{const result=await storeMedia(req.files?.[0],req.body.category);res.status(201).json({message:'File stored.',files:[result]});}));
app.post('/api/admin/galleries',verifyToken,upload.single('image'),asyncRoute(async(req,res)=>{const result=await storeMedia(req.file,req.body.category);res.status(201).json({...result,message:'Image stored.'});}));
app.get('/api/media/:id',asyncRoute(async(req,res)=>{
    if(!/^[a-f0-9-]{36}$/.test(req.params.id))throw httpError(404,'Media not found.');
    const item=await first('SELECT bytes,mime_type,filename FROM stored_files WHERE id=? AND private=0',[req.params.id]);if(!item)throw httpError(404,'Media not found.');
    res.set('Content-Security-Policy',"default-src 'none'; sandbox").type(item.mime_type);
    if(item.mime_type==='application/pdf')res.attachment(item.filename);res.send(Buffer.from(item.bytes));
}));
app.get('/api/admin/media',verifyToken,asyncRoute(async(req,res)=>res.json(await rows('SELECT * FROM media'+(req.query.category?' WHERE category=?':'')+' ORDER BY id DESC',req.query.category?[text(req.query.category,100)]:[]))));
app.delete('/api/admin/media/:id',verifyToken,asyncRoute(async(req,res)=>{
    const id=positiveId(req.params.id),item=await first('SELECT file_id FROM media WHERE id=?',[id]);if(!item)throw httpError(404,'Media not found.');
    await db.batch([{sql:'DELETE FROM media WHERE id=?',args:[id]},{sql:'DELETE FROM stored_files WHERE id=? AND private=0',args:[item.file_id]}]);res.json({message:'Media deleted.'});
}));
app.put('/api/admin/media/:id',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('UPDATE media SET original_name=?,category=? WHERE id=?',[required(req.body.original_name,'Name',120),required(req.body.category,'Category',100),positiveId(req.params.id)]);if(!result.changes)throw httpError(404,'Media not found.');res.json({message:'Media updated.'});}));
app.get('/api/public/team',asyncRoute(async(req,res)=>res.json(await publicRows("SELECT * FROM team_members WHERE status='Active' ORDER BY display_order,id DESC"))));
function teamFields(body){return[required(body.name,'Name'),required(body.designation,'Designation'),text(body.mobile,30),email(body.email),safeUrl(body.linkedin),safeUrl(body.instagram),text(body.bio,4000),safeUrl(body.photo_url),Number(body.display_order)||0,enumValue(body.status,['Active','Inactive'],'Active')];}
app.post('/api/admin/team',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('INSERT INTO team_members (name,designation,mobile,email,linkedin,instagram,bio,photo_url,display_order,status) VALUES (?,?,?,?,?,?,?,?,?,?)',teamFields(req.body));res.status(201).json({id:result.lastID,message:'Team member added.'});}));
app.put('/api/admin/team/:id',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('UPDATE team_members SET name=?,designation=?,mobile=?,email=?,linkedin=?,instagram=?,bio=?,photo_url=?,display_order=?,status=? WHERE id=?',[...teamFields(req.body),positiveId(req.params.id)]);if(!result.changes)throw httpError(404,'Team member not found.');res.json({message:'Team member updated.'});}));
app.delete('/api/admin/team/:id',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('DELETE FROM team_members WHERE id=?',[positiveId(req.params.id)]);if(!result.changes)throw httpError(404,'Team member not found.');res.json({message:'Team member deleted.'});}));
app.get('/api/public/success-stories',(req,res)=>res.json([]));
app.post('/api/admin/success-stories',verifyToken,(req,res)=>res.status(409).json({error:'Success-story publication requires documented candidate consent and an approved, redacted public record.'}));
app.delete('/api/admin/success-stories/:id',verifyToken,asyncRoute(async(req,res)=>{const result=await db.query('DELETE FROM success_stories WHERE id=?',[positiveId(req.params.id)]);if(!result.changes)throw httpError(404,'Success story not found.');res.json({message:'Success story deleted.'});}));

// Only the public build is served in production. Development fallback also has a finite allowlist.
const distribution = path.join(__dirname, 'dist');
const publicRoot = fs.existsSync(path.join(distribution, 'index.html')) || process.env.VERCEL || process.env.NODE_ENV === 'production' ? distribution : __dirname;
const rootPages=new Set(['index','404','about','admissions','service-fees','jobs-vidarbha','admissions-impact','apply-admission','apply-job','business','connect','contact','dashboard','disclaimer','fast-track','job-details','jobs','jobs-impact','legal','privacy-policy','refund-policy','resources','students-earning-impact','success-stories','terms','trust','verify-candidate','women-wfh','women-wfh-impact','job-consultancy-akola','jobs-in-akola','jobs-in-vidarbha','career-guidance-akola','recruitment-services-akola','admission-guidance-akola']);
const publicFiles=new Set(['resources/Plan_B_Careers_ATS_Resume_Template_Branded.docx','jobs.json','robots.txt','sitemap.xml','sitemap-jobs.xml','llms.txt','llms-full.txt','7f2e1a498b3c419fa82b5e90d12e847c.txt','googlef9c124eb9271294f.html']);
app.use((req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method)||req.path.startsWith('/api/'))return next();
    let requested;try{requested=decodeURIComponent(req.path);}catch{return next();}
    if(requested.includes('..')||requested.includes('\\')||requested.split('/').some(segment=>segment.startsWith('.')))return next();
    const legacyRedirects = {'/connect':'/contact','/apply-admission':'/admissions#enquiry','/admissions-impact':'/admissions','/jobs-impact':'/jobs','/women-wfh-impact':'/women-wfh','/students-earning-impact':'/jobs/freshers'};
    const redirect = legacyRedirects[requested.replace(/\.html$/, '')];
    if (redirect) return res.redirect(301, redirect);
    if(/^\/job\/\d+(?:\.html)?$/.test(requested)){const id=Number(requested.match(/\d+/)[0]),job=sourceJobs().find(j=>Number(j.id)===id);if(job)return res.redirect(301,jobsModel.jobPath(job));}
    if(requested.endsWith('.html')&&requested!=='/admin/index.html'&&requested!=='/googlef9c124eb9271294f.html') {
        if (!fs.existsSync(path.join(publicRoot, requested.slice(1)))) return next();
        return res.redirect(301,requested==='/index.html'?'/':requested.slice(0,-5));
    }
    let relative=requested==='/'?'index.html':requested.slice(1);
    if(relative==='admin'||relative==='admin/')relative='admin/index.html';
    else if(!path.extname(relative))relative+='.html';
    const rootName=relative.replace(/\.html$/,'');
    const allowed=publicFiles.has(relative)||(rootPages.has(rootName)&&relative.endsWith('.html'))||relative==='admin/index.html'||/^(job|jobs|resources)\/[a-z0-9-]+\.html$/.test(relative)||/^(css|js)\/[a-zA-Z0-9_./-]+\.(css|js)$/.test(relative)||/^lib\/jobs-data\.js$/.test(relative)||/^(images|assets|fonts)\/[a-zA-Z0-9_ .%/-]+\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|mp4)$/i.test(relative);
    if(!(allowed || (publicRoot !== __dirname && /^[a-z0-9/-]+\.html$/.test(relative)))||/^assets\/images\/uploads\//.test(relative)||/^images\/(?:receipts|salary|payment-proofs|certificates|offer-letters|reviews)\//.test(relative))return next();
    const filename=path.join(publicRoot,relative);if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())return next();
    if(relative.startsWith('admin/'))res.set('X-Robots-Tag','noindex, nofollow');res.sendFile(filename);
});
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Endpoint not found.'});const page=path.join(publicRoot,'404.html');res.status(404);if(fs.existsSync(page))return res.sendFile(page);res.type('text/plain').send('Page not found.');});
app.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    let status=Number(error.status)||500,message=status<500 || error.expose === true?error.message:'This request could not be completed. Please try again or contact our team.';
    if(error instanceof multer.MulterError){status=error.code==='LIMIT_FILE_SIZE'?413:400;message=error.code==='LIMIT_FILE_SIZE'?'File must be no larger than 3 MB.':'Upload one file and check the form fields.';}
    if(error.code==='STORAGE_UNAVAILABLE'||error.code==='STORAGE_NOT_CONFIRMED'||error.code==='STORAGE_CONFIGURATION')message=error.message;
    if(status>=500)console.error('Request failed.',error.code||'REQUEST_ERROR');
    res.status(status).json({success:false,error:message,...(error.code&&String(error.code).startsWith('STORAGE_')?{code:error.code}:{})});
});
if(require.main===module&&!process.env.VERCEL)app.listen(process.env.PORT||3000,()=>console.log('Plan B Careers server ready.'));
module.exports=app;
