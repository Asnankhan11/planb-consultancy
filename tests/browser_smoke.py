"""Synthetic browser verification against a local production-mode server; never sends external requests."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:4188'
OUT=Path(os.environ.get('PLANB_EVIDENCE_DIR','test-results'));OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE','/Users/sheikhwasique/Library/Caches/ms-playwright/chromium-1248/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    public=json.loads(Path('data/public-manifest.json').read_text())
    paths=['/'+f[:-5] for f in public if f.endswith('.html') and not f.startswith(('admin/','google')) and '/'+f[:-5] not in ['/404','/index']]
    paths=['/']+paths
    for url in paths:
        response=page.goto(BASE+url,wait_until='networkidle')
        check('page200 '+url,response.status==200)
        if page.locator('#mobileMenuBtn').count():
            button=page.locator('#mobileMenuBtn');button.click();check('menu opens '+url,button.get_attribute('aria-expanded')=='true' and page.locator('#mobileMenu').is_visible());page.keyboard.press('Escape');check('menu closes '+url,button.get_attribute('aria-expanded')=='false' and not page.locator('#mobileMenu').is_visible())
        check('mobile width '+url,page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
    for url in ['/','/jobs','/job/4-backend-process-executive','/contact','/resources/resume-guide','/career-guidance-akola']:
        page.set_viewport_size({'width':1440,'height':1000});page.goto(BASE+url,wait_until='networkidle');check('desktop width '+url,page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'));page.screenshot(path=str(OUT/((url.strip('/').replace('/','-') or 'home')+'-desktop.png')),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.goto(BASE+'/',wait_until='networkidle');page.screenshot(path=str(OUT/'home-mobile.png'),full_page=True)
    page.goto(BASE+'/jobs',wait_until='networkidle');check('eight hydrated jobs',page.locator('#jobCards article').count()==8)
    options=page.locator('#industryFilter option').evaluate_all('(els)=>els.map(e=>e.value)')
    for value in options[1:]:
        page.select_option('#industryFilter',value);check('industry has matching inventory '+value,page.locator('#jobCards article').count()>0)
    page.click('#clearFilters');page.select_option('#locationFilter','akola');check('Akola does not count remote as local',page.locator('#jobCards article').count()==0 and page.locator('#jobsEmpty').is_visible());check('filter URL', 'loc=akola' in page.url)
    page.click('#clearFilters');page.locator('[data-job-save]').first.click();page.goto(BASE+'/dashboard',wait_until='networkidle');check('saved job available',page.locator('#savedJobs article').count()==1)
    page.click('#clearSavedData');check('saved data cleared',page.evaluate("localStorage.getItem('pb_saved_job_ids')") in [None,'[]'])
    page.goto(BASE+'/apply-job?job_id=2',wait_until='networkidle');check('closed role not selectable',page.locator('#job_id').input_value()=='' and 'not accepting' in page.locator('#selectedJobNotice').inner_text())
    page.goto(BASE+'/apply-job?job_id=4',wait_until='networkidle');check('selected role binds',page.locator('#job_id').input_value()=='4')
    page.fill('#name','Synthetic Browser Test');page.fill('#mobile','9000000001');page.fill('#email','candidate@example.invalid');page.fill('#city','Akola');page.set_input_files('#resume',{'name':'synthetic.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\nSynthetic test only\n%%EOF'})
    page.evaluate("window.testConversions=[];window.addEventListener('planb:conversion',e=>window.testConversions.push(e.detail))")
    page.locator('#jobApplicationForm button[type=submit]').click();page.wait_for_function("document.querySelector('#formResult').textContent.includes('Application not confirmed')")
    check('unconfigured storage never reports receipt','Application recorded' not in page.locator('#formResult').inner_text());check('failed submit records no conversion',page.evaluate('window.testConversions.length')==0);check('form analytics excluded',page.locator('script[src="/js/analytics.js"]').count()==0)
    ref='PB-'+'A'*32
    page.route('**/api/applications',lambda route:route.fulfill(status=201,content_type='application/json',body=json.dumps({'success':True,'applicationId':ref,'notifications':{'applicant':'not_configured'}})))
    page.locator('#jobApplicationForm button[type=submit]').click();page.wait_for_function("document.querySelector('#formResult').textContent.includes('Application recorded')")
    check('only actual server reference saved',ref in page.locator('#formResult').inner_text());saved=page.evaluate("localStorage.getItem('pb_application_references')");check('no applicant PII saved','Synthetic Browser Test' not in saved and '9000000001' not in saved and 'example.invalid' not in saved);check('confirmed conversion hook',page.evaluate('window.testConversions[0].name')=='application_received')
    page.goto(BASE+'/admissions',wait_until='networkidle')
    for key,value in {'student_name':'Synthetic Student','mobile':'9000000001','whatsapp_number':'9000000002','qualification':'12th','interested_course':'Commerce','preferred_city':'Akola'}.items():page.fill('#'+key,value)
    page.locator('#admissionForm button[type=submit]').click();page.wait_for_function("document.querySelector('#formResult').textContent.includes('Enquiry not confirmed')");check('admission honest fallback','prepared message' in page.locator('#formResult').inner_text());check('distinct WhatsApp entered',page.locator('#whatsapp_number').input_value()=='9000000002')
    page.goto(BASE+'/contact',wait_until='networkidle');page.fill('#name','Synthetic Contact');page.fill('#message','Test draft, do not send');page.locator('#contactDraftForm button[type=submit]').click();check('contact draft is not delivered','has not been sent' in page.locator('#formResult').inner_text());check('no external window opened',len(context.pages)==1)
    for url in ['/server.js','/database.js','/planb.sqlite','/.env','/google-apps-script-code.gs','/images/team/AsnanResume%20new%2026.pdf','/unknown-page','/unknown-page.html','/.well-known/ai-catalog.json']:
        check('private/unknown404 '+url,context.request.get(BASE+url).status==404)
    check('template downloads',context.request.get(BASE+'/resources/Plan_B_Careers_ATS_Resume_Template_Branded.docx').status==200)
    nojs=browser.new_context(java_script_enabled=False);plain=nojs.new_page();plain.goto(BASE+'/jobs');check('jobs rendered without JavaScript',plain.locator('#jobCards article').count()==8);nojs.close()
    check('no uncaught JavaScript errors',not errors)
    context.close();browser.close()
Path('docs/implementation/browser-verification.json').write_text(json.dumps({'checksPassed':len(checks),'checks':checks,'pageErrors':errors,'scope':'Local production-mode server, external network blocked, synthetic form response only'},indent=2)+'\n')
print(json.dumps({'checksPassed':len(checks),'pageErrors':errors}))
