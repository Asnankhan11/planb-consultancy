// ===================================
// Plan-B Consultancy - Shared JS
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

    // --- Smooth Scroll for Anchor Links (with URL hash update) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return; // Skip plain # links
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = navbar ? navbar.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                // Update URL hash without page reload
                history.pushState(null, null, href);
            }
        });
    });

    // --- Intersection Observer for Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
            }
        });
    }, observerOptions);

    // Observe all animatable elements across all pages
    const animatableSelectors = [
        '.card',
        '.stat-card',
        '.step',
        '.review-card',
        '.job-card',
        '.path-card',
        '.value-prop-card',
        '.faq-item',
        '.contact-card',
        '.workflow-step',
        '.service-stat-card',
        '.workflow-column'
    ];

    document.querySelectorAll(animatableSelectors.join(', ')).forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });

    // Special handling for legal page content animations
    document.querySelectorAll('.legal-content h3, .legal-content p, .legal-content ul').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });

    // --- Floating WhatsApp Label on Scroll ---
    const floatingWhatsapp = document.getElementById('floatingWhatsapp');
    if (floatingWhatsapp) {
        let labelShown = false;
        let labelTimeout = null;

        const showLabel = () => {
            if (!labelShown && window.scrollY > 400) {
                floatingWhatsapp.classList.add('show-label');
                labelShown = true;

                // Auto-hide after 5 seconds
                labelTimeout = setTimeout(() => {
                    floatingWhatsapp.classList.remove('show-label');
                }, 5000);
            }
        };

        window.addEventListener('scroll', showLabel);

        // Re-show label periodically
        setInterval(() => {
            if (window.scrollY > 400) {
                floatingWhatsapp.classList.add('show-label');
                setTimeout(() => {
                    floatingWhatsapp.classList.remove('show-label');
                }, 4000);
            }
        }, 30000);
    }

});

// --- FAQ Accordion ---
function toggleFaq(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');

    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    // Toggle the clicked one
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
