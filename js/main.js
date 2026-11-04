// ==========================================================================
// Plan B Careers - Global Shared UI & Navigation
// Palette: Deep Midnight Navy (#101A2C) · Rich Teal (#087F8C) · Electric Lime (#C7F36B)
// ==========================================================================

function initPlanBCareers() {
    // --- 1. Sticky Navigation on Scroll ---
    const navbar = document.getElementById('navbar') || document.querySelector('header');
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                navbar.classList.add('header-scrolled');
                navbar.classList.remove('bg-transparent');
            } else {
                navbar.classList.remove('header-scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // --- 2. Mobile Drawer Navigation ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn') || document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu') || document.getElementById('navMenu');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenuBtn');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const isHidden = mobileMenu.classList.contains('hidden');
            document.body.style.overflow = isHidden ? '' : 'hidden';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });

        if (closeMobileMenuBtn) {
            closeMobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            });
        }

        // Close on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            });
        });
    }

    // --- 3. Interactive FAQ Accordion ---
    function setupAccordions() {
        document.querySelectorAll('.accordion-item, .faq-item').forEach(item => {
            const trigger = item.querySelector('.accordion-trigger, .faq-question, button');
            const collapse = item.querySelector('.accordion-collapse, .accordion-content, .faq-answer');

            if (!trigger || !collapse) return;

            // Accessibility attributes
            if (!trigger.hasAttribute('aria-expanded')) {
                trigger.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
            }

            // Guard against duplicate listener binding
            if (trigger.dataset.accordionBound === 'true') return;
            trigger.dataset.accordionBound = 'true';

            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = item.classList.contains('active');
                const container = item.closest('.space-y-4, .accordion-container') || item.parentElement;

                // Close other accordion items in the same container
                if (container) {
                    container.querySelectorAll('.accordion-item.active, .faq-item.active').forEach(sibling => {
                        if (sibling !== item) {
                            sibling.classList.remove('active');
                            const sibTrigger = sibling.querySelector('.accordion-trigger, .faq-question, button');
                            const sibCollapse = sibling.querySelector('.accordion-collapse, .accordion-content, .faq-answer');
                            const sibArrow = sibling.querySelector('.accordion-arrow, .accordion-icon, svg');
                            if (sibTrigger) sibTrigger.setAttribute('aria-expanded', 'false');
                            if (sibCollapse) sibCollapse.style.maxHeight = '0px';
                            if (sibArrow) sibArrow.style.transform = '';
                        }
                    });
                }

                // Toggle current item
                if (isOpen) {
                    item.classList.remove('active');
                    trigger.setAttribute('aria-expanded', 'false');
                    collapse.style.maxHeight = '0px';
                    const arrow = item.querySelector('.accordion-arrow, .accordion-icon, svg');
                    if (arrow) arrow.style.transform = '';
                } else {
                    item.classList.add('active');
                    trigger.setAttribute('aria-expanded', 'true');
                    collapse.style.maxHeight = collapse.scrollHeight + 'px';
                    const arrow = item.querySelector('.accordion-arrow, .accordion-icon, svg');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                }
            });
        });
    }
    setupAccordions();

    // --- 4. Live Stats Counter Auto-Fetch ---
    async function refreshPlatformStats() {
        try {
            const res = await fetch('/api/stats');
            if (res.ok) {
                const stats = await res.json();
                const placedEl = document.getElementById('statCandidatesPlaced');
                const hiringEl = document.getElementById('statCompaniesHiring');
                const openJobsEl = document.getElementById('statOpenJobs');

                if (placedEl && stats.candidates_placed) placedEl.innerText = `${stats.candidates_placed}+`;
                if (hiringEl && stats.companies_hiring) hiringEl.innerText = `${stats.companies_hiring}+`;
                if (openJobsEl && stats.jobsAvailable) openJobsEl.innerText = `${stats.jobsAvailable}+`;
            }
        } catch (e) {
            // Quiet fallback
        }
    }
    refreshPlatformStats();

    // --- 5. Lucide Icon Initialization ---
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlanBCareers);
} else {
    initPlanBCareers();
}
