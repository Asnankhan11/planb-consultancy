/* Shared accessible navigation and candidate actions. No fabricated live counters. */
(() => {
  'use strict';
  if (window.__planBInitialized) return;
  window.__planBInitialized = true;
  const initialize = () => {
    const button = document.getElementById('mobileMenuBtn') || document.getElementById('menuToggle');
    const menu = document.getElementById('mobileMenu') || document.getElementById('navMenu');
    if (button && menu) {
      button.type = 'button';
      button.setAttribute('aria-controls', menu.id);
      button.setAttribute('aria-expanded', 'false');
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Open menu');
      let cleanButton = button;
      const setOpen = open => {
        menu.classList.toggle('hidden', !open);
        cleanButton.setAttribute('aria-expanded', String(open));
        cleanButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = '';
      };
      // Replacing the button removes obsolete inline/template handlers without double toggling.
      cleanButton = button.cloneNode(true);
      button.replaceWith(cleanButton);
      cleanButton.removeAttribute('onclick');
      cleanButton.addEventListener('click', () => {
        const open = cleanButton.getAttribute('aria-expanded') !== 'true';
        menu.classList.toggle('hidden', !open);
        cleanButton.setAttribute('aria-expanded', String(open));
        cleanButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      menu.addEventListener('click', e => {
        if (e.target.closest('a')) {setOpen(false);}
      });
      document.addEventListener('keydown', e => {
        if (e.key==='Escape' && !menu.classList.contains('hidden')) {setOpen(false);cleanButton.focus();}
      });
      const close = document.getElementById('closeMobileMenuBtn');
      close?.addEventListener('click', () => {setOpen(false);cleanButton.focus();});
      setOpen(false);
    }
    window.toggleAccordion = button => {
      const item=button?.closest('.accordion-item,.faq-item');
      const content=item?.querySelector('.accordion-collapse,.accordion-content,.faq-answer');
      if (!item || !content) return;
      const open=!item.classList.contains('active');
      item.classList.toggle('active',open);button.setAttribute('aria-expanded',String(open));
      content.style.maxHeight=open ? `${content.scrollHeight+32}px` : '0px';content.style.opacity=open?'1':'0';
    };
    window.toggleFaq=window.toggleAccordion;
    document.querySelectorAll('.accordion-item,.faq-item').forEach(item=>{
      const trigger=item.querySelector('button');
      if(trigger && !trigger.hasAttribute('onclick')) trigger.addEventListener('click',()=>window.toggleAccordion(trigger));
    });
    document.querySelectorAll('[data-save-job]').forEach(button=>{
      const id=String(button.dataset.saveJob);
      const read=()=>{try{return JSON.parse(localStorage.getItem('pb_saved_job_ids')||'[]').map(String);}catch{return [];}};
      const update=()=>{const saved=read().includes(id);button.textContent=saved?'Saved on this device':'Save this job';button.setAttribute('aria-pressed',String(saved));};
      button.addEventListener('click',()=>{try{const ids=read();localStorage.setItem('pb_saved_job_ids',JSON.stringify(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]));update();}catch{button.textContent='Saving is unavailable in this browser';}});update();
    });
    document.querySelectorAll('a[target="_blank"]').forEach(a=>a.rel='noopener noreferrer');
    if (window.lucide) window.lucide.createIcons();
  };
  window.planBTrack = (name, parameters={}) => {
    // Send only non-personal event fields. Never include candidate data or a resume URL.
    const allowed = Object.fromEntries(Object.entries(parameters).filter(([key])=>['job_id','form_type','method'].includes(key)));
    window.dispatchEvent(new CustomEvent('planb:conversion', { detail: { name, ...allowed } }));
    if (typeof window.gtag==='function') window.gtag('event',name,allowed);
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initialize):initialize();
})();
