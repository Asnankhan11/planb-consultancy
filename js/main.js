// ===================================
// Plan B Careers - Shared JS
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

// --- Lead Form Handler → CRM + WhatsApp ---
async function handleLeadForm(event) {
    event.preventDefault();

    const service = document.getElementById('leadService').value;
    const name = document.getElementById('leadName').value;
    const phone = document.getElementById('leadPhone').value;

    // Post to CRM Public API
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
        ? 'http://localhost:3001/api/candidates/public'
        : 'https://planb-crm-production.up.railway.app/api/candidates/public';

    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile', phone);
    formData.append('current_company', service);
    formData.append('source', 'Website - Lead Form');
    formData.append('stage', 'New Lead');

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
    } catch (err) {
        console.error('CRM save error:', err);
    }

    const message = `Hello, I'm interested in *${service}*.%0A%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0A%0APlease guide me further.`;

    window.open(`https://wa.me/919420512501?text=${message}`, '_blank');
}

// ===================================
// PLAN B DYNAMIC PLATFORM EXTENSIONS
// ===================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- Live Counters ---
    const statsSection = document.getElementById('stats');
    if (statsSection) {
        try {
            // Note: In production this would be absolute URL or relative if hosted together
            const res = await fetch('/api/stats');
            if (res.ok) {
                const data = await res.json();
                
                // Assuming the stats are in this order in HTML: Placed, Companies, Apps, Jobs
                const statNumbers = document.querySelectorAll('.stat-number');
                if (statNumbers.length >= 4) {
                    statNumbers[0].setAttribute('data-target', data.candidates_placed || 1250);
                    statNumbers[1].setAttribute('data-target', data.companies_hiring || 45);
                    statNumbers[2].setAttribute('data-target', data.applicationsReceived || 331);
                    statNumbers[3].setAttribute('data-target', data.jobsAvailable || 95);
                }
            }
        } catch(err) {
            console.error('Failed to load live stats:', err);
        }
    }

    // --- Global Search Overlay ---
    const searchHTML = `
    <div id="globalSearchOverlay" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md hidden items-start justify-center pt-24 opacity-0 transition-opacity duration-300">
        <div class="bg-[#0d0720] border border-white/10 rounded-2xl w-full max-w-2xl mx-6 shadow-2xl overflow-hidden flex flex-col transform scale-95 transition-transform duration-300" id="searchBox">
            <div class="p-4 border-b border-white/10 flex items-center gap-3">
                <i data-lucide="search" class="text-gray-400 w-5 h-5"></i>
                <input type="text" id="searchInputBox" placeholder="Search jobs, companies, resources..." class="w-full bg-transparent text-white text-lg focus:outline-none placeholder-gray-500">
                <button onclick="closeSearch()" class="text-gray-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="p-4 max-h-[60vh] overflow-y-auto" id="searchResults">
                <p class="text-gray-500 text-sm text-center py-8">Type to start searching...</p>
            </div>
        </div>
    </div>
    <button onclick="openSearch()" class="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform" aria-label="Search">
        <i data-lucide="search" class="w-5 h-5"></i>
    </button>
    `;
    
    document.body.insertAdjacentHTML('beforeend', searchHTML);
    lucide.createIcons();

    const searchInputBox = document.getElementById('searchInputBox');
    let searchTimeout;
    searchInputBox.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();
        const resultsBox = document.getElementById('searchResults');
        
        if(!query) {
            resultsBox.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Type to start searching...</p>';
            return;
        }

        resultsBox.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Searching...</p>';
        
        searchTimeout = setTimeout(async () => {
            try {
                // Fetch dynamic jobs
                const res = await fetch('/api/jobs');
                let html = '';
                if(res.ok) {
                    const jobs = await res.json();
                    const filtered = jobs.filter(j => 
                        j.title.toLowerCase().includes(query) || 
                        j.company.toLowerCase().includes(query)
                    );

                    if(filtered.length > 0) {
                        html += '<h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Jobs Found</h4>';
                        html += '<ul class="space-y-2 mb-6">';
                        filtered.forEach(j => {
                            html += `
                            <li>
                                <a href="apply-job.html?job=${j.title}" class="block p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-white font-bold">${j.title}</p>
                                            <p class="text-xs text-gray-400">${j.company} &bull; ${j.location}</p>
                                        </div>
                                        <span class="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded">${j.salary || 'Negotiable'}</span>
                                    </div>
                                </a>
                            </li>`;
                        });
                        html += '</ul>';
                    }
                }
                
                // Static mappings for resources
                const staticPages = [
                    { t: 'Interview Grooming', l: 'resources.html' },
                    { t: 'Resume Template', l: 'resources.html' },
                    { t: 'Verify Candidate', l: 'verify-candidate.html' },
                    { t: 'Success Stories', l: 'success-stories.html' }
                ];
                const staticFiltered = staticPages.filter(p => p.t.toLowerCase().includes(query));
                if(staticFiltered.length > 0) {
                    html += '<h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pages & Resources</h4>';
                    html += '<ul class="space-y-2">';
                    staticFiltered.forEach(p => {
                        html += `<li><a href="${p.l}" class="block p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-white font-medium">${p.t}</a></li>`;
                    });
                    html += '</ul>';
                }

                if(!html) {
                    html = '<p class="text-gray-500 text-sm text-center py-8">No results found for "'+query+'"</p>';
                }
                resultsBox.innerHTML = html;
            } catch(e) {
                resultsBox.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error loading results</p>';
            }
        }, 300);
    });

    // Keyboard shortcut (Ctrl+K)
    document.addEventListener('keydown', (e) => {
        if((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
        if(e.key === 'Escape') closeSearch();
    });
});

window.openSearch = function() {
    const overlay = document.getElementById('globalSearchOverlay');
    const box = document.getElementById('searchBox');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    // slight delay for transition
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        document.getElementById('searchInputBox').focus();
    }, 10);
};

window.closeSearch = function() {
    const overlay = document.getElementById('globalSearchOverlay');
    const box = document.getElementById('searchBox');
    overlay.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }, 300);
};
