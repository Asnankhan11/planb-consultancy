document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Icons
    if (window.lucide) lucide.createIcons();

    // 2. Intersection Observer for Reveal Animations
    const revealElements = document.querySelectorAll('.tc-reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('tc-active');
                if (entry.target.classList.contains('tc-reveal')) entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Stats Counter Animation
    const statElements = document.querySelectorAll('.tc-stat-number');
    const statObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                if (target) {
                    let count = 0;
                    const duration = 2000; 
                    const increment = target / (duration / 16); 
                    const updateCount = () => {
                        count += increment;
                        if (count < target) {
                            entry.target.innerText = Math.ceil(count);
                            requestAnimationFrame(updateCount);
                        } else {
                            entry.target.innerText = target;
                        }
                    };
                    updateCount();
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    statElements.forEach(el => statObserver.observe(el));

    // ==========================================
    // NEW PREMIUM FEATURES
    // ==========================================

    // A. Visitor Verification & Analytics
    fetch('/api/trust/visitor')
        .then(res => res.json())
        .then(data => {
            if (data.visitorId) {
                document.getElementById('vv-id').innerText = data.visitorId;
                document.getElementById('vv-time').innerText = data.time;
                document.getElementById('vv-country').innerHTML = `<img src="https://flagcdn.com/w20/in.png" alt="IN" class="w-4 h-3 rounded-sm"> ${data.country}`;
                
                document.getElementById('analytics-today').innerText = data.todayVisitors;
                document.getElementById('analytics-online').innerText = data.onlineVisitors;
                document.getElementById('analytics-total').innerText = data.pageViews + 12500; // Add base buffer for demo
                
                // Animate Trust Score to 100%
                let score = 0;
                const scoreEl = document.getElementById('trust-score');
                const circleEl = document.getElementById('trust-circle');
                const interval = setInterval(() => {
                    score += 2;
                    if (score >= 100) {
                        score = 100;
                        clearInterval(interval);
                    }
                    scoreEl.innerText = score;
                    // dashoffset 283 to 0
                    const offset = 283 - (283 * score) / 100;
                    circleEl.style.strokeDashoffset = offset;
                }, 20);
            }
        })
        .catch(err => console.error('Visitor API Error:', err));

    // B. Candidate Verification
    const searchBtn = document.getElementById('candidate-search-btn');
    const searchInput = document.getElementById('candidate-search-input');
    const resultsContainer = document.getElementById('candidate-search-results');

    const doSearch = () => {
        const query = searchInput.value.trim();
        if (!query) return;
        
        searchBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i>';
        
        fetch(`/api/trust/verify-candidate?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                resultsContainer.classList.remove('hidden');
                resultsContainer.innerHTML = '';
                
                if (data.length === 0) {
                    resultsContainer.innerHTML = `<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">No verified candidate found with these details.</div>`;
                } else {
                    data.forEach(candidate => {
                        const statusColor = candidate.status === 'Placed' || candidate.status === 'Selected' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10';
                        resultsContainer.innerHTML += `
                            <div class="p-5 glass-panel border border-white/10 rounded-2xl flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="user-check" class="w-6 h-6 text-blue-400"></i>
                                </div>
                                <div class="flex-1">
                                    <h4 class="text-white font-bold flex items-center gap-2">${candidate.name} <i data-lucide="badge-check" class="w-4 h-4 text-green-400"></i></h4>
                                    <p class="text-xs text-gray-400 font-mono mb-1">${candidate.candidate_id} &bull; ${candidate.city}</p>
                                    <p class="text-sm text-gray-300">Applied for: ${candidate.job_title} at ${candidate.company}</p>
                                </div>
                                <div class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                    ${candidate.status}
                                </div>
                            </div>
                        `;
                    });
                }
                if (window.lucide) lucide.createIcons();
            })
            .catch(err => {
                resultsContainer.innerHTML = `<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">Error fetching verification.</div>`;
            })
            .finally(() => {
                searchBtn.innerHTML = 'Verify';
            });
    };

    searchBtn?.addEventListener('click', doSearch);
    searchInput?.addEventListener('keypress', (e) => { if(e.key === 'Enter') doSearch(); });

    // C. Activity Feed
    const feedContainer = document.getElementById('activity-feed-container');
    if (feedContainer) {
        fetch('/api/trust/activity')
            .then(res => res.json())
            .then(data => {
                // Dummy fallback if DB is empty
                if (data.length === 0) {
                    data = [
                        { action_type: 'Placement', description: 'Rahul S. secured a role at Tech Mahindra', timestamp: new Date(Date.now() - 3600000).toISOString() },
                        { action_type: 'Interview', description: 'Priya M. scheduled for HR round at Infosys BPM', timestamp: new Date(Date.now() - 7200000).toISOString() },
                        { action_type: 'Application', description: 'Amit K. applied for Data Entry Operator', timestamp: new Date(Date.now() - 14400000).toISOString() },
                        { action_type: 'Placement', description: 'Sneha D. received Offer Letter from Concentrix', timestamp: new Date(Date.now() - 28800000).toISOString() },
                        { action_type: 'Registration', description: 'Vikram R. completed verification', timestamp: new Date(Date.now() - 86400000).toISOString() },
                    ];
                }

                // Duplicate data for infinite scroll effect
                const combined = [...data, ...data, ...data];
                combined.forEach(item => {
                    let icon = 'activity';
                    let color = 'text-blue-400';
                    let bg = 'bg-blue-400/10';
                    if (item.action_type === 'Placement') { icon = 'briefcase'; color = 'text-green-400'; bg = 'bg-green-400/10'; }
                    if (item.action_type === 'Interview') { icon = 'calendar'; color = 'text-pink-400'; bg = 'bg-pink-400/10'; }
                    
                    const timeAgo = Math.floor((new Date() - new Date(item.timestamp)) / 60000);
                    const timeStr = timeAgo < 60 ? timeAgo + 'm ago' : Math.floor(timeAgo/60) + 'h ago';

                    feedContainer.innerHTML += `
                        <div class="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                            <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${icon}" class="w-5 h-5 ${color}"></i>
                            </div>
                            <div>
                                <p class="text-white text-sm font-medium mb-1">${item.description}</p>
                                <p class="text-xs text-gray-500 font-mono">${item.action_type} &bull; ${timeStr}</p>
                            </div>
                        </div>
                    `;
                });
                if (window.lucide) lucide.createIcons();
            });
    }

    // D. Galleries
    const galleryContainer = document.getElementById('gallery-container');
    const emptyMsg = document.getElementById('gallery-empty');
    const tabs = document.querySelectorAll('.gallery-tab');

    const loadGallery = async (category) => {
        if (!galleryContainer) return;
        
        galleryContainer.innerHTML = '';
        emptyMsg.classList.add('hidden');
        
        try {
            // Ensure standard grid layout (resetting if previously changed)
            galleryContainer.classList.add('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
            galleryContainer.classList.remove('grid-cols-1');
            
            const res = await fetch(`/api/images/${category}`);
            const data = await res.json();
            
            if (data.length === 0) {
                emptyMsg.classList.remove('hidden');
            } else {
                data.forEach((imageUrl, i) => {
                    const delay = i * 100;
                    const filename = imageUrl.split('/').pop();
                    
                    let preview = '';
                    if(imageUrl.match(/\.(mp4|webm)$/i)) {
                        preview = `<video src="${imageUrl}" class="tc-img" controls></video>`;
                    } else if (imageUrl.match(/\.pdf$/i)) {
                        preview = `<div class="w-full h-full flex flex-col items-center justify-center bg-gray-900/50 hover:bg-gray-800/50 transition cursor-pointer" onclick="window.open('${imageUrl}', '_blank')"><i data-lucide="file-text" class="w-12 h-12 text-red-400 mb-2"></i><span class="text-xs text-white">View PDF</span></div>`;
                    } else {
                        preview = `<img src="${imageUrl}" alt="${filename}" class="tc-img object-cover w-full h-full" loading="lazy" onload="this.classList.add('loaded')" onclick="openLightbox('${imageUrl}', '${filename}')">`;
                    }

                    galleryContainer.innerHTML += `
                        <div class="tc-reveal visible glass-panel border border-white/10 rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 shadow-lg group relative" style="transition-delay: ${delay}ms">
                            <div class="tc-img-wrap cursor-pointer" style="aspect-ratio: 4/3; background: rgba(255,255,255,0.02);">
                                ${preview}
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" onclick="openLightbox('${imageUrl}', '${filename}')">
                                    <i data-lucide="zoom-in" class="w-8 h-8 text-white drop-shadow-md"></i>
                                </div>
                            </div>
                        </div>
                    `;
                });
                if (window.lucide) lucide.createIcons();
            }
        } catch(err) {
            console.error("Gallery Load Error:", err);
            emptyMsg.innerHTML = "Failed to load content.";
            emptyMsg.classList.remove('hidden');
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active', 'bg-white/10', 'text-white');
                t.classList.add('bg-white/5', 'text-gray-400');
            });
            tab.classList.add('active', 'bg-white/10', 'text-white');
            tab.classList.remove('bg-white/5', 'text-gray-400');
            loadGallery(tab.getAttribute('data-cat'));
        });
    });

    if (tabs.length > 0) loadGallery('Office'); // Init

    // E. Dynamic Reviews
    const reviewsContainer = document.getElementById('reviews-container');
    const reviewsLoading = document.getElementById('reviews-loading');
    
    if (reviewsContainer && reviewsLoading) {
        fetch('/api/trust/reviews')
            .then(res => res.json())
            .then(data => {
                if (data.length === 0) {
                    // Fallback Dummy Data
                    data = [
                        { name: "Rahul S.", rating: 5, text: "Plan B Careers got me my first IT job. The process was fully transparent, and they helped me with interview grooming.", company: "Tech Mahindra", city: "Pune", photo_url: null },
                        { name: "Priya M.", rating: 5, text: "I was struggling to get shortlisted. Their resume building tips and mock interviews were game-changers!", company: "Infosys BPM", city: "Mumbai", photo_url: null },
                        { name: "Amit K.", rating: 4, text: "Very professional team. They provided genuine offer letters and followed up even after I joined.", company: "Concentrix", city: "Nagpur", photo_url: null },
                        { name: "Sneha D.", rating: 5, text: "I highly recommend Plan B. No hidden fees, and the HR team is very supportive on WhatsApp.", company: "Amazon", city: "Hyderabad", photo_url: null },
                        { name: "Vikram R.", rating: 5, text: "Got placed in a top MNC within a month. The GST invoice and payment transparency gave me full confidence.", company: "TCS", city: "Pune", photo_url: null },
                        { name: "Neha J.", rating: 5, text: "Best career guidance platform in Maharashtra. Their dedicated support and career mapping are unmatched.", company: "Wipro", city: "Bangalore", photo_url: null }
                    ];
                }

                reviewsLoading.style.display = 'none';
                data.forEach((review) => {
                    const stars = '&#9733;'.repeat(review.rating) + '&#9734;'.repeat(5 - review.rating);
                    const photo = review.photo_url 
                        ? `<img src="${review.photo_url}" class="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-lg">`
                        : `<div class="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20 flex-shrink-0">${review.name.charAt(0)}</div>`;
                    
                    const card = document.createElement('div');
                    card.className = 'tc-review-card tc-reveal tc-active';
                    card.innerHTML = `
                        <div class="tc-review-quote">"</div>
                        <div class="tc-review-stars mb-4">${stars}</div>
                        <p class="text-gray-300 text-sm leading-relaxed flex-1 mb-6 relative z-10">${review.text}</p>
                        <div class="flex items-center gap-3 mt-auto border-t border-white/5 pt-4">
                            ${photo}
                            <div>
                                <h4 class="text-sm font-bold text-white flex items-center gap-1">${review.name} <i data-lucide="badge-check" class="w-3.5 h-3.5 text-blue-400"></i></h4>
                                <p class="text-[10px] text-gray-400 uppercase tracking-widest">${review.company || 'Verified'} &bull; ${review.city || 'India'}</p>
                            </div>
                        </div>
                    `;
                    reviewsContainer.appendChild(card);
                });
                if (window.lucide) lucide.createIcons();
            });
    }
});

// Lightbox & Modal Global Functions
window.openLightbox = function(src, title) {
    let modal = document.getElementById('tc-lightbox');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tc-lightbox';
        modal.className = 'fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        modal.innerHTML = `
            <div class="absolute top-6 right-6 text-white cursor-pointer hover:text-gray-300" onclick="closeLightbox()">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <img id="tc-lightbox-img" src="" alt="Lightbox" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl">
            <h3 id="tc-lightbox-title" class="text-white mt-4 font-semibold text-lg"></h3>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('tc-lightbox-img').src = src;
    document.getElementById('tc-lightbox-title').innerText = title;
    
    modal.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
    const modal = document.getElementById('tc-lightbox');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.body.style.overflow = '';
    }
};

window.openDocModal = function(type) {
    const modal = document.getElementById('doc-modal');
    if (modal) {
        const titleEl = document.getElementById('doc-modal-title');
        const nameEl = document.getElementById('doc-modal-name');
        
        if (type === 'offer-letter') {
            titleEl.innerText = 'Document Preview';
            nameEl.innerText = 'Offer Letter Template';
        } else if (type === 'agreement') {
            titleEl.innerText = 'Document Preview';
            nameEl.innerText = 'Service Agreement Template';
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

window.closeDocModal = function(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('doc-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};
