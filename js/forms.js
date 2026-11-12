/* Submission state follows the API receipt. Personal form data stays out of browser storage. */
(() => {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024;
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
  function show(title, text, { reference, link, linkLabel = 'Confirm on WhatsApp', note, error = false } = {}, targetId = 'formResult') {
    const target = document.getElementById(targetId) || document.getElementById('formResult') || document.getElementById('modalFormResult');
    if (!target) return;
    target.replaceChildren(); target.hidden = false; target.className = 'notice';
    target.setAttribute('role', error ? 'alert' : 'status'); target.setAttribute('tabindex','-1');
    const heading = document.createElement('h2'); heading.textContent = title; target.append(heading);
    const paragraph = document.createElement('p'); paragraph.textContent = text; target.append(paragraph);
    if (reference) {
      const p = document.createElement('p');
      p.textContent = 'Application ID: ';
      const strong = document.createElement('strong');
      strong.textContent = reference;
      p.append(strong);
      target.append(p);
    }
    if (note) { const p = document.createElement('p'); p.textContent = note; target.append(p); }
    if (link) {
      const a = document.createElement('a'); a.href = link; a.textContent = linkLabel; a.className = 'button button-whatsapp'; a.target = '_blank'; a.rel = 'noopener noreferrer'; target.append(a);
      const p = document.createElement('p'); p.textContent = 'Opening WhatsApp sends your details directly to the HR team.'; target.append(p);
    }
    target.focus({preventScroll:true}); target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
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
    if (file.size > MAX_BYTES) return 'Your resume is larger than 5 MB. Choose a smaller file.';
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
    if (button) { button.disabled = value; button.textContent = value ? 'Submitting…' : label; }
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
  // Online health check never hides the form on load
  function applicationAvailability(form, selectedRole) {
    const panel = document.createElement('section');
    panel.id = 'applicationAvailability'; panel.className = 'notice intake-availability';
    panel.setAttribute('aria-label','Online application availability');
    panel.setAttribute('aria-live','polite');
    panel.hidden = true;
    form.before(panel);
    let unavailable = false, checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(),4000);
      try {
        const response = await fetch('/api/health',{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
        const health = response.ok ? await response.json() : null;
        unavailable = health?.applicationIntakeAvailable === false;
      } catch { unavailable = false; }
      finally { clearTimeout(timeout); checking = false; }
      if (unavailable) {
        panel.hidden = false;
        panel.replaceChildren();
        const heading = document.createElement('h2'); heading.textContent = 'Apply with help from the team'; panel.append(heading);
        const text = document.createElement('p');
        text.textContent = 'Online intake is experiencing high volume. Please try submitting the form below, or contact our team for assistance.'; panel.append(text);
        const contact = document.createElement('a'); contact.className = 'button button-outline'; contact.textContent = 'Ask the Plan B team';
        contact.href = '/contact';
        panel.append(contact);
      } else {
        panel.hidden = true;
      }
    }
    check();
    return () => unavailable;
  }
  document.querySelectorAll('input[type="tel"]').forEach(input => input.addEventListener('input',() => input.setCustomValidity('')));

  // Experience level helper
  function setupExperienceToggle(form) {
    const expSelect = form.elements.namedItem('experience');
    const expYears = form.elements.namedItem('experienceYears');
    if (expSelect && expYears) {
      expSelect.addEventListener('change', () => {
        if (expSelect.value === 'Fresher') {
          expYears.value = '0';
        } else if (expYears.value === '0') {
          expYears.value = '1';
        }
      });
    }
  }

  // Generic Job Application Form Handler
  function setupApplicationForm(form, targetResultId) {
    if (!form) return;
    setupExperienceToggle(form);
    const select = form.elements.namedItem('job_id');
    const notice = document.getElementById('selectedJobNotice');
    if (select && select.tagName === 'SELECT') {
      const requested = new URLSearchParams(location.search).get('job_id') || new URLSearchParams(location.search).get('id');
      if (requested) {
        const option = [...select.options].find(item => item.value === requested);
        if (option && option.value) {
          select.value = option.value;
          if (notice) { notice.textContent = 'Selected role: ' + option.textContent; notice.hidden = false; }
        }
      }
      select.addEventListener('change',() => {
        if (notice) {
          notice.textContent = select.value ? 'Selected role: ' + select.selectedOptions[0].textContent : 'Choose an open role before submitting.';
          notice.hidden = false;
        }
      });
      applicationAvailability(form, () => select.value ? {id:select.value,title:select.selectedOptions[0].textContent} : null);
    }

    const resume = form.elements.namedItem('resume');
    if (resume) resume.addEventListener('change', () => resume.setCustomValidity(''));
    let sending = false;
    let retryToken = retryId();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending) return;
      if (!validatePhones(form, ['mobile']) || !form.reportValidity()) return;
      if (resume) {
        const file = resume.files[0];
        let issue;
        try { issue = await resumeProblem(file); } catch { issue = 'The resume could not be read. Choose the file again.'; }
        if (issue) { resume.setCustomValidity(issue); resume.reportValidity(); return; }
      }
      if (select && select.tagName === 'SELECT' && (!select.value || ![...select.options].some(option => option.value === select.value))) {
        select.setCustomValidity('Please select an open job role.');
        select.reportValidity();
        return;
      }
      const jobid = select ? select.value : '';
      const title = select && select.selectedOptions ? select.selectedOptions[0].textContent : (form.querySelector('input[name="role"]')?.value || 'Job');
      const submitBtn = form.querySelector('button[type="submit"]');
      const label = submitBtn ? submitBtn.textContent : 'Submit application';
      sending = true; busy(form, true, label);
      try {
        const payload = new FormData(form);
        payload.set('requestId', retryToken);
        const { response, body } = await post('/api/applications', { body: payload });
        if (!response.ok || body.success !== true || !/^PB-[A-Z0-9-]{8,80}$/.test(body.applicationId || '')) {
          show('Application not confirmed', body.error || 'We could not confirm that your application was saved. Please keep this form open and try again.', { error: true }, targetResultId);
          return;
        }
        const stored = saveReference({ id: body.applicationId, jobid, title, date: new Date().toISOString() });
        let note = stored ? 'This reference is saved on this browser for your records.' : 'Keep a note of your Application ID reference.';
        if (body.notifications?.applicant === 'sent') note += ' A confirmation email was sent.';
        const waConfirm = whatsapp(`Hello HR, I have submitted my job application for ${title}. My Application ID is ${body.applicationId}.`);
        show('Application Submitted Successfully', body.message || 'Your job application has been recorded in Google Sheets and Drive. Our HR team will review your profile.', {
          reference: body.applicationId,
          note,
          link: waConfirm,
          linkLabel: 'Send Confirmation to HR on WhatsApp'
        }, targetResultId);
        form.reset();
        form.hidden = true;
        if (notice) notice.hidden = true;
        retryToken = retryId();
        if (!body.duplicate) window.planBTrack?.('application_received', { job_id: jobid, form_type: 'job' });
      } catch {
        show('Application not confirmed', 'We could not confirm receipt of your application. Please try submitting the form again, or contact our team for assistance.', { error: true }, targetResultId);
      } finally {
        sending = false;
        busy(form, false, label);
      }
    });
  }

  // Setup full-page application form
  const application = document.getElementById('jobApplicationForm');
  if (application) setupApplicationForm(application, 'formResult');

  // Setup modal application form
  const modalApplication = document.getElementById('modalJobApplicationForm');
  if (modalApplication) setupApplicationForm(modalApplication, 'modalFormResult');

  // Setup Modal open/close trigger handlers
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', e => {
      const modalId = btn.getAttribute('data-open-modal');
      const dialog = document.getElementById(modalId);
      if (dialog && typeof dialog.showModal === 'function') {
        e.preventDefault();
        dialog.showModal();
      }
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = btn.closest('dialog');
      if (dialog && typeof dialog.close === 'function') dialog.close();
    });
  });
  document.querySelectorAll('dialog.job-modal').forEach(dialog => {
    dialog.addEventListener('click', e => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!inDialog && typeof dialog.close === 'function') dialog.close();
    });
  });

  // Admission enquiry form
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

  // Contact draft form
  const contact = document.getElementById('contactDraftForm');
  contact?.addEventListener('submit',event => {
    event.preventDefault(); if (!contact.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(contact));
    const message = `${fields.purpose}\nName: ${fields.name}\n\n${fields.message}`;
    show('Your WhatsApp message is ready','The message has not been sent. Open WhatsApp, review the text and choose Send when you are ready.',{link:whatsapp(message),linkLabel:'Review and send in WhatsApp'});
  });
})();
