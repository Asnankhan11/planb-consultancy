'use strict';

const NAVY = '#10233F';
const GOLD = '#D9A313';
const LIGHT_BG = '#F8F9FA';
const WHITE = '#FFFFFF';
const BORDER = '#E5E7EB';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';
const LOGO_URL = 'https://planbcareers.in/images/optimized/planb-logo.webp';

function wrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${WHITE};border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">

<!-- Header -->
<tr><td style="background:${NAVY};padding:24px 32px;text-align:center;">
<img src="${LOGO_URL}" alt="Plan B Careers" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:8px;">
<span style="display:inline-block;vertical-align:middle;margin-left:12px;color:${WHITE};font-size:20px;font-weight:700;letter-spacing:0.5px;">Plan B Careers</span>
</td></tr>

<!-- Gold accent bar -->
<tr><td style="background:${GOLD};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- Body -->
<tr><td style="padding:32px;color:${TEXT_DARK};font-size:15px;line-height:1.6;">
${bodyHtml}
</td></tr>

<!-- Footer -->
<tr><td style="background:${LIGHT_BG};padding:20px 32px;text-align:center;border-top:1px solid ${BORDER};">
<p style="margin:0 0 4px;font-size:13px;color:${TEXT_MUTED};">Plan B Careers &middot; Near City Kotwali, Akola, Maharashtra</p>
<p style="margin:0;font-size:13px;color:${TEXT_MUTED};"><a href="tel:+919420512501" style="color:${NAVY};text-decoration:none;">+91 94205 12501</a> &middot; <a href="mailto:info@planbcareers.in" style="color:${NAVY};text-decoration:none;">info@planbcareers.in</a> &middot; <a href="https://planbcareers.in" style="color:${NAVY};text-decoration:none;">planbcareers.in</a></p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:6px 12px;font-size:13px;color:${TEXT_MUTED};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${BORDER};">${esc(label)}</td><td style="padding:6px 12px;font-size:14px;color:${TEXT_DARK};border-bottom:1px solid ${BORDER};">${esc(value)}</td></tr>`;
}

function timestamp() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

function applicationAdmin(fields, applicationId) {
  return wrap(`Application ${applicationId}`, `
<h2 style="margin:0 0 8px;font-size:18px;color:${NAVY};">New Job Application</h2>
<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">Reference: <strong style="color:${NAVY};">${esc(applicationId)}</strong> &middot; ${esc(timestamp())}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;margin-bottom:20px;">
${row('Name', fields.name)}
${row('Mobile', fields.mobile)}
${row('Email', fields.email)}
${row('City', fields.city)}
${row('State', fields.state)}
${row('Qualification', fields.qualification)}
${row('Experience', fields.experience)}
${row('Experience (Years)', fields.experienceYears)}
${row('Applied Role', fields.role)}
</table>
<p style="margin:0;font-size:13px;color:${TEXT_MUTED};">The application has been saved. Hiring decisions remain with the employer. Resume is attached if provided.</p>
`);
}

function applicationConfirmation(fields, applicationId) {
  return wrap('Application Received', `
<h2 style="margin:0 0 16px;font-size:18px;color:${NAVY};">Hello ${esc(fields.name)},</h2>
<p style="margin:0 0 16px;">Your application has been received and recorded with Plan B Careers.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;margin-bottom:20px;">
${row('Reference', applicationId)}
${row('Applied Role', fields.role)}
${row('Submitted', timestamp())}
</table>
<p style="margin:0 0 8px;font-size:14px;">Our team will review your application and contact you if you are shortlisted. Receipt does not guarantee an interview or selection.</p>
<p style="margin:0 0 20px;font-size:14px;">If you have questions, contact us at <a href="tel:+919420512501" style="color:${NAVY};">+91 94205 12501</a> or <a href="mailto:info@planbcareers.in" style="color:${NAVY};">info@planbcareers.in</a>.</p>
<p style="margin:0;font-size:13px;color:${TEXT_MUTED};">— Plan B Careers, Akola</p>
`);
}

function admissionAdmin(fields, enquiryId) {
  return wrap(`Admission Enquiry ${enquiryId}`, `
<h2 style="margin:0 0 8px;font-size:18px;color:${NAVY};">New Admission Enquiry</h2>
<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">Reference: <strong style="color:${NAVY};">${esc(enquiryId)}</strong> &middot; ${esc(timestamp())}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;margin-bottom:20px;">
${row('Student Name', fields.student_name)}
${row('Mobile', fields.mobile)}
${row('WhatsApp', fields.whatsapp_number)}
${row('Email', fields.email)}
${row('Qualification', fields.qualification)}
${row('Interested Course', fields.interested_course)}
${row('Preferred College', fields.preferred_college)}
${row('Preferred City', fields.preferred_city)}
${row('Admission Type', fields.admission_type)}
${row('Additional Requirements', fields.additional_requirements)}
</table>
<p style="margin:0;font-size:13px;color:${TEXT_MUTED};">Admission and eligibility are decided by the institution. Follow up promptly.</p>
`);
}

function admissionConfirmation(fields, enquiryId) {
  return wrap('Admission Enquiry Received', `
<h2 style="margin:0 0 16px;font-size:18px;color:${NAVY};">Hello ${esc(fields.student_name)},</h2>
<p style="margin:0 0 16px;">Your admission enquiry has been received and recorded with Plan B Careers.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;margin-bottom:20px;">
${row('Reference', enquiryId)}
${row('Course', fields.interested_course)}
${row('Preferred City', fields.preferred_city)}
${row('Submitted', timestamp())}
</table>
<p style="margin:0 0 8px;font-size:14px;">Our team will review your enquiry and reach out with guidance. Admission and eligibility are decided by the institution.</p>
<p style="margin:0 0 20px;font-size:14px;">Questions? Contact us at <a href="tel:+919420512501" style="color:${NAVY};">+91 94205 12501</a> or <a href="mailto:info@planbcareers.in" style="color:${NAVY};">info@planbcareers.in</a>.</p>
<p style="margin:0;font-size:13px;color:${TEXT_MUTED};">— Plan B Careers, Akola</p>
`);
}

module.exports = { applicationAdmin, applicationConfirmation, admissionAdmin, admissionConfirmation };
