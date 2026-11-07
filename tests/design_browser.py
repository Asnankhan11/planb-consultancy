"""Local, synthetic journey checks for job discovery and application availability.

No messages are sent. All external requests are blocked, and application receipts
are mocked. Run against the built site with the webapp-testing server helper.
"""
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get('PLANB_BASE_URL', 'http://127.0.0.1:4188')
OUT = Path(os.environ.get('PLANB_EVIDENCE_DIR', 'test-results'))
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def health(route, available):
    route.fulfill(status=200, content_type='application/json',
                  body=json.dumps({'applicationIntakeAvailable': available}))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get(
        'PLAYWRIGHT_CHROMIUM_EXECUTABLE',
        '/Users/sheikhwasique/Library/Caches/ms-playwright/chromium-1248/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))

    # A candidate can discover a role directly from the first page.
    page.goto(BASE, wait_until='networkidle')
    search = page.locator('form[action="/jobs"] input[name="q"]').first
    search.fill('backend')
    search.press('Enter')
    page.wait_for_url('**/jobs?q=backend*')
    page.wait_for_load_state('networkidle')
    check('home search carries query to matching jobs',
          page.locator('#searchInput').input_value() == 'backend' and
          page.locator('#jobCards article').count() > 0 and
          all('backend' in text.lower() for text in page.locator('#jobCards article').all_inner_texts()))

    # Saving and filtering are reversible; navigation restores prior search state.
    page.click('#clearFilters')
    check('reset shows all current listings', page.locator('#jobCards article').count() == 8)
    page.locator('[data-job-save]').nth(0).click()
    page.locator('[data-job-save]').nth(1).click()
    check('save buttons expose pressed state', page.locator('[data-job-save][aria-pressed="true"]').count() == 2)
    page.click('[data-quick-filter="saved"]')
    check('saved filter shows only the shortlist', page.locator('#jobCards article').count() == 2 and 'saved=1' in page.url)
    page.reload(wait_until='networkidle')
    check('saved filter and shortlist survive reload', page.locator('#jobCards article').count() == 2 and page.locator('#savedFilter').get_attribute('aria-pressed') == 'true')
    page.click('[data-quick-filter="all"]')
    page.click('[data-quick-filter="fresher"]')
    fresher_count = page.locator('#jobCards article').count()
    check('fresher shortcut changes criteria', page.locator('#experienceFilter').input_value() == 'fresher' and fresher_count > 0)
    page.go_back(wait_until='networkidle')
    check('Back restores all listings', page.locator('#experienceFilter').input_value() == 'all' and page.locator('#jobCards article').count() == 8)
    page.go_forward(wait_until='networkidle')
    check('Forward restores fresher results', page.locator('#experienceFilter').input_value() == 'fresher' and page.locator('#jobCards article').count() == fresher_count)
    page.locator('#moreFilters').evaluate('(element) => element.open = true')
    page.select_option('#locationFilter', 'akola')
    check('local filter distinguishes remote jobs', page.locator('#jobsEmpty').is_visible() and page.locator('#jobCards article').count() == 0)
    page.click('#emptyReset')
    check('empty-state reset recovers discovery', page.locator('#jobCards article').count() == 8 and not page.locator('#jobsEmpty').is_visible())
    page.evaluate('scrollTo(0, 0)')
    page.screenshot(path=str(OUT / 'jobs-discovery-mobile.png'), full_page=True)
    page.route('**/api/jobs', lambda route: route.abort())
    page.goto(BASE + '/jobs', wait_until='networkidle')
    page.click('[data-quick-filter="fresher"]')
    check('published snapshot supports filters when API is unavailable', page.locator('#jobCards article').count() == fresher_count)
    page.unroute('**/api/jobs')
    pending_jobs = []
    page.route('**/api/jobs', lambda route: pending_jobs.append(route))
    page.goto(BASE + '/jobs', wait_until='domcontentloaded')
    first_role = page.locator('.job-details-link').first
    first_role.focus()
    focused_href = first_role.get_attribute('href')
    payload = page.locator('#publishedJobs').text_content()
    check('delayed jobs refresh is intercepted', len(pending_jobs) == 1)
    pending_jobs[0].fulfill(status=200, content_type='application/json', body=payload)
    page.wait_for_load_state('networkidle')
    check('API refresh preserves focused role link', page.evaluate('document.activeElement.getAttribute("href")') == focused_href)
    page.evaluate("dispatchEvent(new StorageEvent('storage', {key:'pb_saved_job_ids'}))")
    check('shortlist storage refresh preserves focused role link', page.evaluate('document.activeElement.getAttribute("href")') == focused_href)
    page.unroute('**/api/jobs')

    # An explicit outage is disclosed before the visitor spends time on a form.
    requests = []
    page.on('request', lambda request: requests.append(request.method + ' ' + request.url))
    page.route('**/api/health', lambda route: health(route, False))
    page.goto(BASE + '/apply-job?job_id=4', wait_until='networkidle')
    check('unavailable intake disclosed upfront', page.locator('#applicationAvailability').is_visible() and not page.locator('#jobApplicationForm').is_visible())
    check('selected role remains visible', 'Backend' in page.locator('#selectedJobNotice').inner_text())
    message_link = page.locator('#applicationAvailability a[href^="https://wa.me/"]')
    message = parse_qs(urlparse(message_link.get_attribute('href')).query).get('text', [''])[0]
    check('contact fallback preserves selected role', 'listing #4' in message and 'Backend' in message)
    bounds = message_link.bounding_box()
    check('unavailable application has a first-screen contact action', bounds['y'] + bounds['height'] <= 844)
    check('outage does not submit or send a message', not any(request.startswith('POST ') for request in requests) and len(context.pages) == 1)
    check('outage offers another role', page.locator('#applicationAvailability a[href="/jobs"]').count() == 1)
    page.screenshot(path=str(OUT / 'application-unavailable-mobile.png'), full_page=True)
    page.unroute('**/api/health')
    page.route('**/api/health', lambda route: health(route, True))
    page.locator('#applicationAvailability button').click()
    page.wait_for_selector('#jobApplicationForm', state='visible')
    check('availability retry restores selected form', page.locator('#job_id').input_value() == '4' and not page.locator('#applicationAvailability').is_visible())
    check('retry focus returns to the role field', page.locator('#job_id').evaluate('(element) => element === document.activeElement'))

    # A failed health request must never permanently lock a working form.
    for mode in ['network-error', 'invalid-response', 'timeout']:
        page.unroute('**/api/health')
        if mode == 'network-error':
            page.route('**/api/health', lambda route: route.abort())
        elif mode == 'invalid-response':
            page.route('**/api/health', lambda route: route.fulfill(status=200, content_type='application/json', body='{}'))
        else:
            page.add_init_script('''if (new URLSearchParams(location.search).has('health_timeout')) {
              const realFetch = window.fetch;
              window.fetch = (url, options) => String(url) === '/api/health'
                ? new Promise((resolve, reject) => options.signal.addEventListener('abort',
                    () => reject(new DOMException('Aborted', 'AbortError')), {once:true}))
                : realFetch(url, options);
            }''')
        page.goto(BASE + '/apply-job?job_id=4' + ('&health_timeout=1' if mode == 'timeout' else ''), wait_until='networkidle', timeout=12000)
        page.wait_for_selector('#jobApplicationForm', state='visible', timeout=6000)
        check(mode + ' leaves normal submission available', page.locator('#jobApplicationForm').is_visible() and not page.locator('#applicationAvailability').is_visible())
    page.unroute('**/api/health')
    page.route('**/api/health', lambda route: health(route, True))

    # Motion preferences are respected even for result feedback.
    page.emulate_media(reduced_motion='reduce')
    page.goto(BASE + '/contact', wait_until='networkidle')
    page.evaluate("() => { Element.prototype.scrollIntoView = function(options) { window.lastScrollBehavior = options?.behavior; }; }")
    page.fill('#name', 'Synthetic UI Check')
    page.fill('#message', 'Local test draft only')
    page.locator('#contactDraftForm button[type="submit"]').click()
    check('reduced-motion feedback does not smooth-scroll', page.evaluate('window.lastScrollBehavior') == 'auto')
    check('contact draft remains explicit and unsent', 'has not been sent' in page.locator('#formResult').inner_text())

    # Responsive inspection includes small phones, landscape, tablet and desktop.
    for width, height in [(320, 740), (375, 812), (768, 1024), (844, 390), (1024, 768), (1440, 1000)]:
        page.set_viewport_size({'width': width, 'height': height})
        for route in ['/', '/jobs', '/job/4-backend-process-executive', '/apply-job?job_id=4']:
            page.goto(BASE + route, wait_until='networkidle')
            check(f'no overflow {width} {route}', page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            check(f'controls within viewport {width} {route}', page.locator('header a, header button, main button, main input, main select').evaluate_all('''elements => elements.every(element => {
              const rect = element.getBoundingClientRect();
              return !rect.width || !rect.height || (rect.left >= -1 && rect.right <= innerWidth + 1);
            })'''))
            if width <= 768:
                check(f'touch targets {width} {route}', page.locator('header button, main button, main input:not([type="checkbox"]), main select').evaluate_all('''elements => elements.every(element => {
                  const rect = element.getBoundingClientRect();
                  return !rect.width || !rect.height || (rect.width >= 44 && rect.height >= 44);
                })'''))
    page.goto(BASE, wait_until='networkidle')
    check('reduced-motion has no running decorative animation', page.evaluate('document.getAnimations().filter(animation => animation.playState === "running").length') == 0)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.add_style_tag(content='html { font-size: 200% !important; }')
    check('homepage remains usable with enlarged text', page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    check('no uncaught page errors', not errors)
    context.close()
    browser.close()

report = {'checksPassed': len(checks), 'checks': checks, 'pageErrors': errors,
          'scope': 'Local built site, external requests blocked; no external submission or message.'}
(OUT / 'design-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'checksPassed': len(checks), 'pageErrors': errors}))
