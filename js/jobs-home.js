/**
 * Plan B Careers - Explore Job Opportunities Component
 * Supports interactive category selection, multi-filter, search, modal details, and WhatsApp integration.
 * Palette: Deep Midnight Navy (#101A2C) · Rich Teal (#087F8C) · Electric Lime (#C7F36B) · Warm Ivory (#F7F6F0)
 */

(function () {
    'use strict';

    // Verified Configuration Constants
    const OFFICIAL_WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8Jj0ZFnSz0gEqmgK10';
    const HR_WHATSAPP_NUMBER = '919420512501';

    // 15 Multi-Industry Official Job Categories
    let JOB_CATEGORIES = [
        { id: 'it', name: 'IT & Software', icon: 'code-2', desc: 'Software dev, cloud, QA, testing & technical support' },
        { id: 'banking', name: 'Banking & Finance', icon: 'landmark', desc: 'Retail banking, loan verification, accounts & finance' },
        { id: 'bpo', name: 'BPO & Customer Support', icon: 'headphones', desc: 'Voice, chat & email international/domestic support' },
        { id: 'healthcare', name: 'Healthcare & Medical', icon: 'activity', desc: 'Hospital admin, medical billing, nursing & pharma' },
        { id: 'education', name: 'Education & EdTech', icon: 'graduation-cap', desc: 'Academic counselling, teaching & edtech sales' },
        { id: 'sales', name: 'Sales & Marketing', icon: 'trending-up', desc: 'Direct sales, digital marketing, B2B & branding' },
        { id: 'retail', name: 'Retail & E-commerce', icon: 'shopping-bag', desc: 'E-commerce operations, catalog & store handling' },
        { id: 'logistics', name: 'Logistics & Supply Chain', icon: 'truck', desc: 'Warehouse management, dispatch & inventory' },
        { id: 'insurance', name: 'Insurance', icon: 'shield-check', desc: 'Life, general insurance advisory & claim handling' },
        { id: 'manufacturing', name: 'Manufacturing & Industrial', icon: 'factory', desc: 'Assembly, quality audit & production supervision' },
        { id: 'hospitality', name: 'Hospitality & Tourism', icon: 'utensils', desc: 'Hotel operations, guest relations & travel desk' },
        { id: 'govt', name: 'Government & Competitive Exams', icon: 'book-open', desc: 'Exam prep coaching, academic & clerical advisory' },
        { id: 'dataentry', name: 'Data Entry & Back Office', icon: 'database', desc: 'MIS, typing, verification & non-voice operations' },
        { id: 'telecalling', name: 'Telecalling & Telesales', icon: 'phone-call', desc: 'Inside sales, verification & appointment booking' },
        { id: 'other', name: 'Other Services', icon: 'compass', desc: 'Specialized opportunities & multi-sector careers' }
    ];

    // State
    let allJobs = [];
    const selectedCategories = new Set();
    let currentSearch = '';
    let currentWorkMode = 'all';
    let currentExperience = 'all';
    let currentLocation = 'all';

    // DOM Elements
    let categoriesGridEl = null;
    let jobCardsGridEl = null;
    let visibleJobsCountEl = null;
    let catMatchedCountEl = null;
    let searchInputEl = null;
    let workModeSelectEl = null;
    let expSelectEl = null;
    let locSelectEl = null;
    let clearFiltersBtnEl = null;
    let showJobsBtnEl = null;
    let jobModalEl = null;

    // Initialize Component
    async function init() {
        categoriesGridEl = document.getElementById('categoriesGrid');
        jobCardsGridEl = document.getElementById('jobCardsGrid');
        visibleJobsCountEl = document.getElementById('visibleJobsCount');
        catMatchedCountEl = document.getElementById('catMatchedCount');
        searchInputEl = document.getElementById('jobSearchInput');
        workModeSelectEl = document.getElementById('workModeFilter');
        expSelectEl = document.getElementById('expFilter');
        locSelectEl = document.getElementById('locationFilter');
        clearFiltersBtnEl = document.getElementById('clearFiltersBtn');
        showJobsBtnEl = document.getElementById('showJobsBtn');
        jobModalEl = document.getElementById('jobDetailsModal');

        // Only run if the explore section exists on this page
        if (!jobCardsGridEl && !categoriesGridEl) return;

        await loadJobsData();
        renderCategories();
        bindEvents();
        filterAndRenderJobs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /**
     * Fetch verified jobs from API with fallback to jobs.json
     */
    async function loadJobsData() {
        try {
            const catRes = await fetch('/api/categories');
            if (catRes.ok) {
                const apiCats = await catRes.json();
                if (Array.isArray(apiCats) && apiCats.length > 0) {
                    const iconMap = {
                        'it': 'code-2', 'software': 'code-2', 'bank': 'landmark', 'finance': 'landmark',
                        'bpo': 'headphones', 'support': 'headphones', 'health': 'activity', 'medical': 'activity',
                        'edu': 'graduation-cap', 'edtech': 'graduation-cap', 'sale': 'trending-up', 'market': 'trending-up',
                        'retail': 'shopping-bag', 'comm': 'shopping-bag', 'logist': 'truck', 'supply': 'truck',
                        'insur': 'shield-check', 'manuf': 'factory', 'indust': 'factory', 'hospit': 'utensils',
                        'tour': 'utensils', 'govt': 'book-open', 'exam': 'book-open', 'data': 'database',
                        'office': 'database', 'tele': 'phone-call'
                    };
                    JOB_CATEGORIES = apiCats.map(c => {
                        let icon = 'compass';
                        const n = c.name.toLowerCase();
                        for (const [k, v] of Object.entries(iconMap)) {
                            if (n.includes(k)) { icon = v; break; }
                        }
                        return {
                            id: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            name: c.name,
                            icon: icon,
                            desc: c.description || `${c.name} career and employment opportunities across India`
                        };
                    });
                }
            }
        } catch(e) {
            // Use seeded JOB_CATEGORIES
        }

        try {
            const res = await fetch('/api/jobs');
            if (res.ok) {
                allJobs = await res.json();
            } else {
                throw new Error('API request failed');
            }
        } catch (e) {
            console.warn('Loading fallback jobs data:', e.message);
            try {
                const fallbackRes = await fetch('/jobs.json');
                if (fallbackRes.ok) {
                    allJobs = await fallbackRes.json();
                }
            } catch (err) {
                console.error('Failed to load fallback jobs:', err);
                allJobs = [];
            }
        }
    }

    /**
     * Render the 10 Job Categories with Modern UI
     */
    function renderCategories() {
        if (!categoriesGridEl) return;
        categoriesGridEl.innerHTML = '';

        JOB_CATEGORIES.forEach(cat => {
            const isSelected = selectedCategories.has(cat.name);
            const count = allJobs.filter(j => {
                const cats = j.categories || [];
                return cats.some(c => c.toLowerCase() === cat.name.toLowerCase());
            }).length;

            const card = document.createElement('div');
            card.className = `cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left flex flex-col justify-between ${
                isSelected
                    ? 'bg-navy-900 border-navy-900 text-white shadow-lg shadow-navy-900/15 scale-[1.02]'
                    : 'bg-white border-gray-200/90 text-navy-900 hover:border-teal-600/50 hover:shadow-card'
            }`;

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected
                                ? 'bg-lime-400 text-navy-950'
                                : 'bg-teal-50 text-teal-700'
                        }">
                            <i data-lucide="${cat.icon}" class="w-5 h-5"></i>
                        </div>
                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                                ? 'bg-white/15 text-white'
                                : 'bg-gray-100 text-slate'
                        }">
                            ${count} ${count === 1 ? 'Job' : 'Jobs'}
                        </span>
                    </div>
                    <h4 class="font-bold text-sm leading-snug mb-1 ${isSelected ? 'text-white' : 'text-navy-900'}">${cat.name}</h4>
                    <p class="text-xs ${isSelected ? 'text-gray-300' : 'text-slate'} line-clamp-2">${cat.desc}</p>
                </div>
                <div class="mt-3 pt-2 border-t flex items-center justify-between text-xs font-semibold ${
                    isSelected ? 'border-white/10 text-lime-300' : 'border-gray-100 text-teal-700'
                }">
                    <span>${isSelected ? 'Selected' : 'Filter by role'}</span>
                    <i data-lucide="${isSelected ? 'check-circle-2' : 'arrow-right'}" class="w-3.5 h-3.5"></i>
                </div>
            `;

            card.addEventListener('click', () => {
                toggleCategory(cat.name);
            });

            categoriesGridEl.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Toggle Category selection
     */
    function toggleCategory(catName) {
        if (selectedCategories.has(catName)) {
            selectedCategories.delete(catName);
        } else {
            selectedCategories.add(catName);
        }
        renderCategories();
        filterAndRenderJobs();
    }

    /**
     * Bind all form and button events
     */
    function bindEvents() {
        if (searchInputEl) {
            searchInputEl.addEventListener('input', (e) => {
                currentSearch = e.target.value.trim().toLowerCase();
                filterAndRenderJobs();
            });
        }

        if (workModeSelectEl) {
            workModeSelectEl.addEventListener('change', (e) => {
                currentWorkMode = e.target.value;
                filterAndRenderJobs();
            });
        }

        if (expSelectEl) {
            expSelectEl.addEventListener('change', (e) => {
                currentExperience = e.target.value;
                filterAndRenderJobs();
            });
        }

        if (locSelectEl) {
            locSelectEl.addEventListener('change', (e) => {
                currentLocation = e.target.value;
                filterAndRenderJobs();
            });
        }

        if (clearFiltersBtnEl) {
            clearFiltersBtnEl.addEventListener('click', resetAllFilters);
        }

        if (showJobsBtnEl) {
            showJobsBtnEl.addEventListener('click', () => {
                const catalogEl = document.getElementById('jobs-catalog');
                if (catalogEl) {
                    catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        const selectAllBtn = document.getElementById('selectAllCatsBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                if (selectedCategories.size === JOB_CATEGORIES.length) {
                    selectedCategories.clear();
                } else {
                    JOB_CATEGORIES.forEach(c => selectedCategories.add(c.name));
                }
                renderCategories();
                filterAndRenderJobs();
            });
        }
    }

    /**
     * Filter & Render Logic
     */
    function filterAndRenderJobs() {
        if (!jobCardsGridEl) return;

        const filtered = allJobs.filter(job => {
            // 1. Categories filter (OR logic among selected)
            if (selectedCategories.size > 0) {
                const jobCats = (job.categories || []).map(c => c.toLowerCase());
                const matchesAnyCat = Array.from(selectedCategories).some(sel => {
                    const selLower = sel.toLowerCase();
                    return jobCats.some(jc => jc.includes(selLower) || selLower.includes(jc));
                });
                if (!matchesAnyCat) {
                    return false;
                }
            }

            // 2. Keyword Search
            if (currentSearch) {
                const searchHaystack = [
                    job.title,
                    job.company,
                    job.location,
                    job.type,
                    job.salary,
                    job.description,
                    job.qualification,
                    job.languages,
                    job.shifts,
                    (job.categories || []).join(' ')
                ].filter(Boolean).join(' ').toLowerCase();

                if (!searchHaystack.includes(currentSearch)) {
                    return false;
                }
            }

            // 3. Work Mode filter
            if (currentWorkMode !== 'all') {
                const modeStr = ((job.work_mode || '') + ' ' + (job.type || '') + ' ' + (job.location || '')).toLowerCase();
                if (currentWorkMode === 'Work From Home' && !modeStr.includes('home') && !modeStr.includes('remote')) {
                    return false;
                }
                if (currentWorkMode === 'Work From Office' && !modeStr.includes('office') && !modeStr.includes('akola')) {
                    return false;
                }
                if (currentWorkMode === 'Hybrid' && !modeStr.includes('hybrid') && !modeStr.includes('flexible')) {
                    return false;
                }
                if (currentWorkMode === 'Freelance' && !modeStr.includes('freelance') && !modeStr.includes('contract') && !modeStr.includes('commission')) {
                    return false;
                }
            }

            // 4. Experience filter
            if (currentExperience !== 'all') {
                const expStr = ((job.experience_level || '') + ' ' + (job.description || '')).toLowerCase();
                if (currentExperience === 'Fresher' && !expStr.includes('fresher')) {
                    return false;
                }
                if (currentExperience === '0–1 Year' && !expStr.includes('0') && !expStr.includes('1') && !expStr.includes('fresher')) {
                    return false;
                }
                if (currentExperience === '1–3 Years' && !expStr.includes('1') && !expStr.includes('2') && !expStr.includes('3')) {
                    return false;
                }
                if (currentExperience === '3+ Years' && !expStr.includes('3') && !expStr.includes('4') && !expStr.includes('5')) {
                    return false;
                }
            }

            // 5. Location filter
            if (currentLocation !== 'all') {
                const locStr = (job.location || '').toLowerCase();
                if (currentLocation === 'remote' && !locStr.includes('remote') && !locStr.includes('home') && !locStr.includes('pan india')) {
                    return false;
                }
                if (currentLocation === 'akola' && !locStr.includes('akola')) {
                    return false;
                }
            }

            return true;
        });

        // Update counts
        if (visibleJobsCountEl) {
            visibleJobsCountEl.innerText = filtered.length;
        }
        if (catMatchedCountEl) {
            catMatchedCountEl.innerText = filtered.length;
        }

        renderJobs(filtered);
    }

    /**
     * Render Job Cards or Empty State
     */
    function renderJobs(jobs) {
        jobCardsGridEl.innerHTML = '';

        if (jobs.length === 0) {
            jobCardsGridEl.innerHTML = `
                <div class="col-span-full py-16 px-6 text-center bg-white border border-gray-200 rounded-3xl max-w-xl mx-auto shadow-card">
                    <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <i data-lucide="search-x" class="w-7 h-7"></i>
                    </div>
                    <h3 class="text-xl font-bold text-navy-900 mb-2">No Matching Job Openings Found</h3>
                    <p class="text-sm text-slate mb-6 max-w-md mx-auto">
                        No active vacancies match your current combination. Try clearing filters or connect directly on WhatsApp for newly unlisted roles.
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <button onclick="window.exploreJobsResetFilters()" class="btn-primary">
                            Clear All Filters
                        </button>
                        <a href="${OFFICIAL_WHATSAPP_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" class="btn-outline-teal inline-flex items-center gap-2">
                            <span>Join WhatsApp Channel</span>
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        jobs.forEach(job => {
            const isClosed = (job.status || '').toLowerCase() === 'closed';
            const workModeBadge = job.work_mode || (job.location && job.location.toLowerCase().includes('home') ? 'Work From Home' : 'Work From Office');
            const isWfh = workModeBadge.includes('Home') || workModeBadge.includes('Remote');

            // Format clean description snippet
            let cleanDesc = (job.description || '')
                .replace(/\n+/g, ' ')
                .replace(/Responsibilities:|Requirements:|Benefits:/gi, '')
                .trim();
            if (cleanDesc.length > 130) {
                cleanDesc = cleanDesc.substring(0, 127) + '...';
            }
            if (!cleanDesc) {
                cleanDesc = 'Verified employment opportunity assisting candidates across India.';
            }

            const card = document.createElement('div');
            card.className = 'group bg-white border border-gray-200/90 hover:border-teal-600/40 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between';

            card.innerHTML = `
                <div>
                    <!-- Badges Row -->
                    <div class="flex items-center justify-between gap-2 mb-3.5">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isWfh
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : 'bg-navy-50 text-navy-900 border border-navy-200'
                        }">
                            <i data-lucide="${isWfh ? 'laptop' : 'building-2'}" class="w-3.5 h-3.5"></i>
                            ${workModeBadge}
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isClosed
                                ? 'bg-gray-100 text-slate border border-gray-200'
                                : 'bg-lime-100 text-lime-900 border border-lime-300'
                        }">
                            <span class="w-2 h-2 rounded-full ${isClosed ? 'bg-slate' : 'bg-lime-500 animate-pulse'}"></span>
                            ${isClosed ? 'Closed' : 'Open Role'}
                        </span>
                    </div>

                    <!-- Job Title -->
                    <h3 class="text-lg font-bold text-navy-900 group-hover:text-teal-600 transition-colors mb-1 leading-snug">
                        <a href="job-details.html?id=${job.id}" class="hover:underline">${job.title}</a>
                    </h3>

                    <!-- Company Name -->
                    <div class="flex items-center gap-2 text-xs font-semibold text-slate mb-3">
                        <span class="text-charcoal font-medium">${job.company || 'Plan B Hiring Partner'}</span>
                        <span>•</span>
                        <span class="text-teal-600 font-medium inline-flex items-center gap-1">
                            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Verified
                        </span>
                    </div>

                    <!-- Salary Highlight -->
                    <div class="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory border border-gray-200 text-navy-900 text-xs font-bold font-outfit">
                        <i data-lucide="wallet" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>${job.salary || 'Salary Negotiable'}</span>
                    </div>

                    <!-- Key Metadata Chips Grid -->
                    <div class="grid grid-cols-2 gap-2 text-xs text-charcoal mb-4 bg-ivory/60 p-3 rounded-xl border border-gray-200/60">
                        <div class="flex items-center gap-1.5 truncate" title="${job.location}">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                            <span class="truncate">${job.location || 'Pan India'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 truncate">
                            <i data-lucide="user-check" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                            <span class="truncate">${job.experience_level || 'Fresher / Any'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 truncate" title="${job.qualification || '12th Pass / Graduate'}">
                            <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                            <span class="truncate">${job.qualification || '12th Pass / Graduate'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 truncate" title="${job.languages || 'Hindi / English'}">
                            <i data-lucide="languages" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                            <span class="truncate">${job.languages || 'Hindi / English'}</span>
                        </div>
                    </div>

                    <!-- Description Snippet -->
                    <p class="text-xs text-slate leading-relaxed mb-4 line-clamp-2">
                        ${cleanDesc}
                    </p>
                </div>

                <!-- Footer with Action Buttons -->
                <div class="pt-4 border-t border-gray-100 mt-2">
                    <div class="flex items-center justify-between text-[11px] text-slate mb-3">
                        <span class="inline-flex items-center gap-1">
                            <i data-lucide="clock" class="w-3 h-3 text-slate"></i> ${job.last_updated || 'Active this week'}
                        </span>
                        <span class="font-mono text-slate">#${job.id}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2.5">
                        <a href="job-details.html?id=${job.id}" class="btn-outline-navy text-xs py-2 px-3 justify-center gap-1">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            <span>Details</span>
                        </a>

                        <button onclick="window.applyForJob(${job.id})" class="text-xs py-2 px-3 justify-center gap-1 ${
                            isClosed
                                ? 'btn bg-gray-200 text-slate cursor-not-allowed'
                                : 'btn-accent'
                        }" ${isClosed ? 'disabled' : ''}>
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                            <span>${isClosed ? 'Closed' : 'Apply'}</span>
                        </button>
                    </div>
                </div>
            `;

            jobCardsGridEl.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Reset all filters
     */
    function resetAllFilters() {
        selectedCategories.clear();
        currentSearch = '';
        currentWorkMode = 'all';
        currentExperience = 'all';
        currentLocation = 'all';

        if (searchInputEl) searchInputEl.value = '';
        if (workModeSelectEl) workModeSelectEl.value = 'all';
        if (expSelectEl) expSelectEl.value = 'all';
        if (locSelectEl) locSelectEl.value = 'all';

        renderCategories();
        filterAndRenderJobs();
    }

    /**
     * Open Job Details Modal
     */
    function openJobDetailsModal(jobId) {
        const job = allJobs.find(j => j.id === jobId);
        if (!job || !jobModalEl) return;

        const isClosed = (job.status || '').toLowerCase() === 'closed';

        document.getElementById('modalTitle').innerText = job.title;
        document.getElementById('modalCompany').innerText = job.company || 'Plan B Hiring Partner';
        document.getElementById('modalLocation').innerText = job.location || 'Pan India';
        document.getElementById('modalSalary').innerText = job.salary || 'Salary Negotiable';
        document.getElementById('modalWorkMode').innerText = job.work_mode || job.type || 'Work From Home';
        document.getElementById('modalExperience').innerText = job.experience_level || 'Fresher / Any';
        document.getElementById('modalQualification').innerText = job.qualification || '12th Pass / Graduate';
        document.getElementById('modalLanguages').innerText = job.languages || 'Hindi / English';
        document.getElementById('modalShifts').innerText = job.shifts || 'Standard Business Shifts';
        document.getElementById('modalUpdated').innerText = job.last_updated || 'Recently Verified';

        const statusEl = document.getElementById('modalStatus');
        if (statusEl) {
            statusEl.innerText = isClosed ? 'Closed' : 'Open Role';
            statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isClosed ? 'bg-gray-100 text-slate' : 'bg-lime-100 text-lime-900 border border-lime-300'
            }`;
        }

        const descContainer = document.getElementById('modalFullDescription');
        if (descContainer) {
            if (job.description) {
                descContainer.innerHTML = job.description
                    .split('\n')
                    .map(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return '<br>';
                        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                            return `<li class="ml-4 list-disc text-charcoal my-1 text-sm">${trimmed.replace(/^[-•]\s*/, '')}</li>`;
                        }
                        if (trimmed.endsWith(':')) {
                            return `<h5 class="font-bold text-navy-900 mt-3 mb-1 text-sm">${trimmed}</h5>`;
                        }
                        return `<p class="text-charcoal my-1 leading-relaxed text-sm">${trimmed}</p>`;
                    })
                    .join('');
            } else {
                descContainer.innerHTML = '<p class="text-charcoal text-sm">Verified career opportunity by Plan B Careers. Candidates from Tier 2 and Tier 3 cities across India are encouraged to apply.</p>';
            }
        }

        // Action buttons inside modal
        const waBtn = document.getElementById('modalApplyWaBtn');
        if (waBtn) {
            if (isClosed) {
                waBtn.classList.add('opacity-50', 'pointer-events-none');
            } else {
                waBtn.classList.remove('opacity-50', 'pointer-events-none');
                waBtn.onclick = () => {
                    closeJobDetailsModal();
                    applyForJob(job.id);
                };
            }
        }

        const formBtn = document.getElementById('modalApplyFormBtn');
        if (formBtn) {
            if (isClosed) {
                formBtn.classList.add('opacity-50', 'pointer-events-none');
            } else {
                formBtn.classList.remove('opacity-50', 'pointer-events-none');
                formBtn.onclick = () => {
                    window.location.href = `apply-job.html?job_id=${job.id}&job_title=${encodeURIComponent(job.title)}`;
                };
            }
        }

        jobModalEl.classList.remove('hidden');
        jobModalEl.classList.add('flex');
        document.body.style.overflow = 'hidden';

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Close Job Details Modal
     */
    function closeJobDetailsModal() {
        if (!jobModalEl) return;
        jobModalEl.classList.add('hidden');
        jobModalEl.classList.remove('flex');
        document.body.style.overflow = '';
    }

    /**
     * Apply for Job action: connects to HR WhatsApp with pre-filled message
     */
    function applyForJob(jobId) {
        const job = allJobs.find(j => j.id === jobId);
        if (!job) return;

        if ((job.status || '').toLowerCase() === 'closed') {
            alert('This job vacancy is currently closed. Please check our other open positions or join our WhatsApp Channel for new opportunities.');
            return;
        }

        const message = 
            `*📋 Job Application Inquiry - Plan B Careers*%0A%0A` +
            `Hello HR Team,%0A` +
            `I am interested in applying for the following verified role on Plan B Careers:%0A%0A` +
            `🎯 *Role:* ${encodeURIComponent(job.title)}%0A` +
            `🏢 *Company:* ${encodeURIComponent(job.company || 'Client via Plan B Careers')}%0A` +
            `📍 *Location:* ${encodeURIComponent(job.location || 'Pan India')}%0A` +
            `💰 *Salary:* ${encodeURIComponent(job.salary || 'As per listing')}%0A` +
            `🆔 *Job ID:* #${job.id}%0A%0A` +
            `Please share the eligibility check and interview procedure. I am ready to share my resume details.%0A%0A` +
            `_Candidate inquiry via planbcareers.in_`;

        const waUrl = `https://wa.me/${HR_WHATSAPP_NUMBER}?text=${message}`;
        window.open(waUrl, '_blank');
    }

    // Expose global methods
    window.openJobDetailsModal = openJobDetailsModal;
    window.closeJobDetailsModal = closeJobDetailsModal;
    window.applyForJob = applyForJob;
    window.exploreJobsResetFilters = resetAllFilters;

})();
