/* Submission state follows the API receipt. Personal form data stays out of browser storage. */
(() => {
  'use strict';
  const result = document.getElementById('formResult');
  if (!result) return;
  const MAX_BYTES = 3 * 1024 * 1024;
  const WHATSAPP = 'https://wa.me/919420512501';
  const phone = value => {
    let digits = String(value || '').replace(/\D/g,'');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
  };
  const retryId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('');
  const whatsapp = message => WHATSAPP + '?text=' + encodeURIComponent(message);
  function safeWhatsApp(value, fallback) {
    try { const url = new URL(value); return url.origin === 'https://wa.me' && url.pathname === '/919420512501' ? url.href : fallback; }
    catch { return fallback; }
  }
  function show(title, text, { reference, link, linkLabel = 'Open WhatsApp with the team', note, error = false } = {}) {
    result.replaceChildren(); result.hidden = false; result.className = 'notice';
    result.setAttribute('role', error ? 'alert' : 'status'); result.setAttribute('tabindex','-1');
    const heading = document.createElement('h2'); heading.textContent = title; result.append(heading);
    const paragraph = document.createElement('p'); paragraph.textContent = text; result.append(paragraph);
    if (reference) { const p = document.createElement('p'); p.textContent = 'Your reference: '; const strong = document.createElement('strong'); strong.textContent = reference; p.append(strong); result.append(p); }
    if (note) { const p = document.createElement('p'); p.textContent = note; result.append(p); }
    if (link) {
      const a = document.createElement('a'); a.href = link; a.textContent = linkLabel; a.className = 'button button-outline'; a.target = '_blank'; a.rel = 'noopener noreferrer'; result.append(a);
      const p = document.createElement('p'); p.textContent = 'This opens a prepared message. You choose whether to send it in WhatsApp.'; result.append(p);
    }
    result.focus({preventScroll:true}); result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function saveReference(reference) {
    try {
      const previous = JSON.parse(localStorage.getItem('pb_application_references') || '[]');
      const clean = (Array.isArray(previous) ? previous : []).filter(item => item && typeof item.id === 'string' && item.id !== reference.id)
        .map(item => ({id:item.id,jobid:String(item.jobid || ''),title:String(item.title || '').slice(0,200),date:String(item.date || '')}));
      localStorage.setItem('pb_application_references',JSON.stringify([reference,...clean].slice(0,100)));
      return true;
    } catch { return false; }
  }
  async function resumeProblem(file) {
    if (!file || !file.size) return 'Choose a non-empty PDF, DOC or DOCX resume.';
    if (file.size > MAX_BYTES) return 'Your resume is larger than 3 MB. Choose a smaller file.';
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['pdf','doc','docx'].includes(extension)) return 'Choose a PDF, DOC or DOCX resume.';
    const bytes = new Uint8Array(await file.slice(0,8).arrayBuffer());
    const matches = (expected) => expected.every((value,index) => bytes[index] === value);
    const valid = extension === 'pdf' ? matches([37,80,68,70,45]) : extension === 'doc' ? matches([208,207,17,224,161,177,26,225]) : matches([80,75,3,4]);
    return valid ? '' : 'The resume contents do not match its file extension. Export it as PDF, DOC or DOCX and try again.';
  }
  async function post(url, options) {
    const response = await fetch(url,{method:'POST',...options,headers:{Accept:'application/json',...(options.headers || {})},signal:AbortSignal.timeout(45000)});
    let body; try { body = await response.json(); } catch { body = {}; }
    return {response,body};
  }
  function busy(form, value, label) {
    const button = form.querySelector('button[type="submit"]');
    form.setAttribute('aria-busy',String(value));
    if (button) { button.disabled = value; button.textContent = value ? 'Sending…' : label; }
  }
  function validatePhones(form,names) {
    for (const name of names) {
      const input = form.elements.namedItem(name);
      if (!input) continue;
      input.setCustomValidity(phone(input.value) ? '' : 'Enter a valid 10-digit Indian mobile number.');
      if (!input.reportValidity()) return false;
    }
    return true;
  }
  document.querySelectorAll('input[type="tel"]').forEach(input => input.addEventListener('input',() => input.setCustomValidity('')));

  const application = document.getElementById('jobApplicationForm');
  if (application) {
    const select = application.elements.namedItem('job_id');
    const notice = document.getElementById('selectedJobNotice');
    const requested = new URLSearchParams(location.search).get('job_id') || new URLSearchParams(location.search).get('id');
    if (requested) {
      const option = [...select.options].find(item => item.value === requested);
      if (option && option.value) { select.value = option.value; notice.textContent = 'Selected role: ' + option.textContent; }
      else { select.value = ''; notice.textContent = 'The requested listing is not accepting applications in the current publication. Choose an open role below.'; }
      notice.hidden = false;
    }
    select.addEventListener('change',() => { if (notice) { notice.textContent = select.value ? 'Selected role: ' + select.selectedOptions[0].textContent : 'Choose an open role before submitting.'; notice.hidden = false; } });
    const resume = application.elements.namedItem('resume');
    resume.addEventListener('change',() => resume.setCustomValidity(''));
    let sending = false;
    // A retry token identifies this in-memory attempt, never an applicant or public application reference.
    let retryToken = retryId();
    application.addEventListener('submit',async event => {
      event.preventDefault(); if (sending) return;
      if (!validatePhones(application,['mobile']) || !application.reportValidity()) return;
      const file = resume.files[0];
      let issue;
      try { issue = await resumeProblem(file); } catch { issue = 'The resume could not be read. Choose the file again.'; }
      if (issue) { resume.setCustomValidity(issue); resume.reportValidity(); return; }
      if (sending) return;
      if (!select.value || ![...select.options].some(option => option.value === select.value)) return;
      const jobid = select.value, title = select.selectedOptions[0].textContent;
      const fallback = whatsapp(`I need help submitting an application for ${title} (listing #${jobid}).`);
      const label = application.querySelector('button[type="submit"]').textContent;
      sending = true; busy(application,true,label);
      try {
        const payload = new FormData(application); payload.set('requestId',retryToken);
        const {response,body} = await post('/api/applications',{body:payload});
        if (!response.ok || body.success !== true || !/^PB-[A-Z0-9-]{8,80}$/.test(body.applicationId || '')) {
          show('Application not confirmed',body.error || 'We could not confirm that your application was saved. Keep this form open to retry, or contact the team.',{error:true,link:fallback}); return;
        }
        const stored = saveReference({id:body.applicationId,jobid,title,date:new Date().toISOString()});
        let note = stored ? 'This reference is saved on this browser. Keep a copy if you plan to clear your browser data.' : 'Browser storage is unavailable. Keep a copy of this reference.';
        if (body.notifications?.applicant === 'sent') note += ' A confirmation email was sent.';
        else if (body.notifications?.applicant === 'failed') note += ' The confirmation email could not be sent; your application is recorded.';
        show('Application recorded',body.message || 'Your application has been recorded. Hiring decisions remain with the employer.',{reference:body.applicationId,note,link:whatsapp(`Please help me with application reference ${body.applicationId}.`)});
        application.reset(); application.hidden = true; if (notice) notice.hidden = true; retryToken = retryId();
        if (!body.duplicate) window.planBTrack?.('application_received',{job_id:jobid,form_type:'job'});
      } catch {
        show('Application not confirmed','We could not confirm receipt. Keep this form open to retry with the same details, or contact the team before submitting again.',{error:true,link:fallback});
      } finally { sending = false; busy(application,false,label); }
    });
  }

  const admission = document.getElementById('admissionForm');
  if (admission) {
    let sending = false;
    admission.addEventListener('submit',async event => {
      event.preventDefault(); if (sending || !validatePhones(admission,['mobile','whatsapp_number']) || !admission.reportValidity()) return;
      const fields = Object.fromEntries(new FormData(admission));
      const fallback = whatsapp(`Admission enquiry\nName: ${fields.student_name}\nCourse: ${fields.interested_course}\nPreferred city: ${fields.preferred_city}`);
      const label = admission.querySelector('button[type="submit"]').textContent;
      sending = true; busy(admission,true,label);
      try {
        const {response,body} = await post('/api/admission-enquiries',{headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});
        const link = safeWhatsApp(body.whatsappUrl || body.admin_whatsapp_link,fallback);
        if (!response.ok || body.success !== true || !/^PA-[A-Z0-9-]{8,80}$/.test(body.enquiryId || body.id || '')) {
          show('Enquiry not confirmed',body.error || 'Online submission is unavailable. You can send the prepared message directly to the team.',{error:true,link}); return;
        }
        const id = body.enquiryId || body.id;
        show('Admission enquiry recorded',body.message || 'Your enquiry has been recorded. Admission and eligibility are decided by the institution.',{reference:id,link,note:'Keep this reference when contacting the team. This is an enquiry receipt, not an admission confirmation.'});
        admission.reset(); admission.hidden = true;
        window.planBTrack?.('admission_enquiry_received',{form_type:'admission'});
      } catch { show('Enquiry not confirmed','We could not confirm receipt of your enquiry. Contact the team using the prepared message before submitting again.',{error:true,link:fallback}); }
      finally { sending = false; busy(admission,false,label); }
    });
  }

  const contact = document.getElementById('contactDraftForm');
  contact?.addEventListener('submit',event => {
    event.preventDefault(); if (!contact.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(contact));
    const message = `${fields.purpose}\nName: ${fields.name}\n\n${fields.message}`;
    show('Your WhatsApp message is ready','The message has not been sent. Open WhatsApp, review the text and choose Send when you are ready.',{link:whatsapp(message),linkLabel:'Review and send in WhatsApp'});
  });
})();
