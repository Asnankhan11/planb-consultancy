// ==========================================================================
// Plan B Careers - Global Shared UI & Navigation
// Palette: Deep Midnight Navy (#101A2C) · Rich Teal (#087F8C) · Electric Lime (#C7F36B)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

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
    document.querySelectorAll('.accordion-item, .faq-item').forEach(item => {
        const trigger = item.querySelector('.accordion-trigger, .faq-question, button');
        const content = item.querySelector('.accordion-content, .faq-answer');
        const icon = item.querySelector('.accordion-icon, svg, [data-lucide="chevron-down"]');

        if (trigger && content) {
            trigger.addEventListener('click', () => {
                const isOpen = item.classList.contains('active');

                // Close other accordion items in the same container
                const parent = item.parentElement;
                if (parent) {
                    parent.querySelectorAll('.accordion-item.active, .faq-item.active').forEach(sibling => {
                        if (sibling !== item) {
                            sibling.classList.remove('active');
                            const sibContent = sibling.querySelector('.accordion-content, .faq-answer');
                            const sibIcon = sibling.querySelector('.accordion-icon, [data-lucide="chevron-down"]');
                            if (sibContent) sibContent.style.maxHeight = null;
                            if (sibIcon) sibIcon.style.transform = '';
                        }
                    });
                }

                if (isOpen) {
                    item.classList.remove('active');
                    content.style.maxHeight = null;
                    if (icon) icon.style.transform = '';
                } else {
                    item.classList.add('active');
                    content.style.maxHeight = (content.scrollHeight + 30) + 'px';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        }
    });

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
});
