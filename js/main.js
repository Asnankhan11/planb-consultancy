// ===================================
// Plan-B Consultancy — Main JS
// Animations engine for ALL pages
// ===================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar Scroll Effect ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => navMenu.classList.remove('active'));
        });
    }

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = navbar ? navbar.offsetHeight : 0;
                const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({ top, behavior: 'smooth' });
                history.pushState(null, null, href);
            }
        });
    });

    // --- Hero Rotating Headlines ---
    const headlines = document.querySelectorAll('.hero-headline');
    if (headlines.length > 1) {
        let currentIndex = 0;
        setInterval(() => {
            headlines[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % headlines.length;
            headlines[currentIndex].classList.add('active');
        }, 3500);
    }

    // ===========================================
    // SCROLL ANIMATION ENGINE — works on ALL pages
    // ===========================================

    // 1. Observe explicitly marked elements (.fade-up, .fade-left, .fade-right, .fade-scale)
    const explicitFadeEls = document.querySelectorAll('.fade-up, .fade-left, .fade-right, .fade-scale');

    // 2. Auto-detect common animatable elements that DON'T already have a fade class
    const autoAnimateSelectors = [
        '.service-card', '.step-item', '.why-card', '.review-card',
        '.contact-card', '.card', '.stat-card', '.step', '.job-card',
        '.path-card', '.value-prop-card', '.faq-item', '.workflow-step',
        '.workflow-column', '.service-stat-card', '.partner-logo',
        '.stat-item', '.lead-form'
    ];

    const autoAnimateEls = document.querySelectorAll(autoAnimateSelectors.join(', '));
    autoAnimateEls.forEach(el => {
        // Don't double-apply if already has a fade class
        if (!el.classList.contains('fade-up') &&
            !el.classList.contains('fade-left') &&
            !el.classList.contains('fade-right') &&
            !el.classList.contains('fade-scale')) {
            el.classList.add('fade-up');
        }
    });

    // 3. Also animate section headers and legal content
    document.querySelectorAll('.section-header, .legal-content h3, .legal-content p, .legal-content ul').forEach(el => {
        if (!el.classList.contains('fade-up')) {
            el.classList.add('fade-up');
        }
    });

    // Collect ALL fade elements after auto-applying
    const allFadeEls = document.querySelectorAll('.fade-up, .fade-left, .fade-right, .fade-scale');

    if (allFadeEls.length > 0) {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -50px 0px'
        });

        // Apply stagger delays for grid children
        const gridParents = [
            'services-grid', 'stats-grid', 'why-grid', 'partners-grid',
            'review-grid', 'contact-cards', 'card-grid', 'value-prop-grid',
            'steps-container', 'process-steps', 'stats-grid', 'faq-list',
            'dual-workflow', 'filter-bar'
        ];

        allFadeEls.forEach(el => {
            const parent = el.parentElement;
            if (parent) {
                const isGrid = gridParents.some(cls => parent.classList.contains(cls));
                if (isGrid) {
                    const siblings = Array.from(parent.children);
                    const index = siblings.indexOf(el);
                    el.style.transitionDelay = (index * 0.1) + 's';
                }
            }
            fadeObserver.observe(el);
        });
    }

    // ===========================================
    // ANIMATED STATS COUNTERS
    // ===========================================
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    if (statNumbers.length > 0) {
        let statsCounted = false;
        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !statsCounted) {
                    statsCounted = true;
                    statNumbers.forEach(num => {
                        const target = parseInt(num.getAttribute('data-target'));
                        const duration = 2000;
                        const startTime = performance.now();

                        function updateCounter(currentTime) {
                            const elapsed = currentTime - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            // Ease out cubic for smooth deceleration
                            const eased = 1 - Math.pow(1 - progress, 3);
                            num.textContent = Math.floor(eased * target);
                            if (progress < 1) {
                                requestAnimationFrame(updateCounter);
                            } else {
                                num.textContent = target;
                            }
                        }
                        requestAnimationFrame(updateCounter);
                    });
                    countObserver.disconnect();
                }
            });
        }, { threshold: 0.3 });

        const statsSection = document.getElementById('stats');
        if (statsSection) countObserver.observe(statsSection);
    }

    // ===========================================
    // FLOATING WHATSAPP
    // ===========================================
    const floatingWhatsapp = document.getElementById('floatingWhatsapp');
    if (floatingWhatsapp) {
        let labelShown = false;
        window.addEventListener('scroll', () => {
            if (!labelShown && window.scrollY > 400) {
                floatingWhatsapp.classList.add('show-label');
                labelShown = true;
                setTimeout(() => floatingWhatsapp.classList.remove('show-label'), 5000);
            }
        }, { passive: true });
    }

});

// ===========================================
// FAQ Accordion
// ===========================================
function toggleFaq(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
    if (!isActive) faqItem.classList.add('active');
}

// ===========================================
// Lead Form Handler → WhatsApp redirect
// ===========================================
function handleLeadForm(event) {
    event.preventDefault();
    const service = document.getElementById('leadService').value;
    const name = document.getElementById('leadName').value;
    const phone = document.getElementById('leadPhone').value;
    const message = `Hello, I'm interested in *${service}*.%0A%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0A%0APlease guide me further.`;
    window.open(`https://wa.me/919420512501?text=${message}`, '_blank');
}
