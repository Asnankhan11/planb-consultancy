// ===================================
// Plan-B Consultancy — Shared JS
// ===================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar Scroll Effect ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
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
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                history.pushState(null, null, href);
            }
        });
    });

    // --- Soft Fade-In on Scroll ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Elements to animate
    const animatableSelectors = [
        '.service-card',
        '.step-item',
        '.why-card',
        '.review-card',
        '.contact-card',
        '.card',
        '.stat-card',
        '.step',
        '.job-card',
        '.path-card',
        '.value-prop-card',
        '.faq-item',
        '.workflow-step',
        '.workflow-column',
        '.service-stat-card'
    ];

    document.querySelectorAll(animatableSelectors.join(', ')).forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(15px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // Legal page content animations
    document.querySelectorAll('.legal-content h3, .legal-content p, .legal-content ul').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        observer.observe(el);
    });

    // --- Floating WhatsApp ---
    const floatingWhatsapp = document.getElementById('floatingWhatsapp');
    if (floatingWhatsapp) {
        let labelShown = false;

        window.addEventListener('scroll', () => {
            if (!labelShown && window.scrollY > 400) {
                floatingWhatsapp.classList.add('show-label');
                labelShown = true;
                setTimeout(() => {
                    floatingWhatsapp.classList.remove('show-label');
                }, 5000);
            }
        });
    }

});

// --- FAQ Accordion ---
function toggleFaq(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// --- Lead Form Handler ---
function handleLeadForm(event) {
    event.preventDefault();

    const service = document.getElementById('leadService').value;
    const name = document.getElementById('leadName').value;
    const phone = document.getElementById('leadPhone').value;

    const message = `Hello, I'm interested in *${service}*.%0A%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0A%0APlease guide me further.`;

    window.open(`https://wa.me/918390405900?text=${message}`, '_blank');
}
