/* Retain the site's existing GA4 property. Never include form data or query strings. */
(() => {
  if (location.hostname !== 'planbcareers.in' && location.hostname !== 'www.planbcareers.in') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  let referrer='';try{const source=new URL(document.referrer);referrer=source.origin+source.pathname;}catch{}
  window.gtag('config', 'G-N8FKFJBJPM', { page_referrer: referrer, page_location: location.origin + location.pathname, allow_google_signals: false, allow_ad_personalization_signals: false });
  const load = () => { const script = document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id=G-N8FKFJBJPM';document.head.appendChild(script); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(load,{timeout:2500});else setTimeout(load,1000);
  document.addEventListener('click', event => {
    const link=event.target.closest('a[href]');if(!link)return;
    const href=link.getAttribute('href');
    const method=href.startsWith('tel:')?'phone':href.startsWith('mailto:')?'email':/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(href)?'whatsapp':null;
    if(method)window.planBTrack?.('contact_click',{method});
  });
})();
