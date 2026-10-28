/**
 * Plan B Careers - Explore Job Opportunities Component
 * Supports interactive category selection, multi-filter, search, modal details, and WhatsApp integration.
 */

(function () {
    'use strict';

    // Verified Configuration Constants
    const OFFICIAL_WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8Jj0ZFnSz0gEqmgK10';
    const HR_WHATSAPP_NUMBER = '919420512501';

    // 10 Official Job Categories
    const JOB_CATEGORIES = [
        { id: 'wfh', name: 'Work From Home Jobs', icon: 'laptop', desc: 'Remote & digital roles across India' },
        { id: 'voice', name: 'Customer Support — Voice', icon: 'headphones', desc: 'Inbound & outbound voice processes' },
        { id: 'non-voice', name: 'Customer Support — Chat / Non-Voice', icon: 'message-square', desc: '100% chat, email & ticketing roles' },
        { id: 'telecalling', name: 'Telecalling & Tele Sales', icon: 'phone-call', desc: 'Calling, lead verification & client relations' },
        { id: 'sales', name: 'Sales & Business Development', icon: 'trending-up', desc: 'B2B & B2C growth opportunities' },
        { id: 'edtech', name: 'EdTech Counsellor', icon: 'graduation-cap', desc: 'Academic counselling & student guidance' },
        { id: 'backoffice', name: 'Data Annotation & Back Office', icon: 'database', desc: 'Data entry, barcode & operations' },
        { id: 'freshers', name: 'Freshers Jobs', icon: 'sparkles', desc: 'Zero experience required, training provided' },
        { id: 'experienced', name: 'Experienced Candidates', icon: 'briefcase', desc: 'Roles for candidates with 1+ years experience' },
        { id: 'other', name: 'Other Opportunities', icon: 'compass', desc: 'Flexible, freelance & specialized openings' }
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
            const res = await fetch('/api/jobs');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    allJobs = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('API /api/jobs failed, falling back to jobs.json:', e);
        }

        try {
            const fallbackRes = await fetch('/jobs.json');
            if (fallbackRes.ok) {
                allJobs = await fallbackRes.json();
            }
        } catch (e) {
            console.error('Failed to load jobs data:', e);
            allJobs = [];
        }

        // Normalize jobs data to ensure clean array categories and metadata
        allJobs = allJobs.map(job => {
            let cats = job.categories;
            if (typeof cats === 'string') {
                try { cats = JSON.parse(cats); } catch(e) { cats = [cats]; }
            }
            if (!Array.isArray(cats) || cats.length === 0) {
                cats = [];
                const fullText = [job.title, job.description, job.type, job.location].filter(Boolean).join(' ').toLowerCase();
                if (fullText.includes('home') || fullText.includes('remote')) cats.push('Work From Home Jobs');
                if (fullText.includes('voice') && !fullText.includes('non-voice')) cats.push('Customer Support — Voice');
                if (fullText.includes('non-voice') || fullText.includes('chat')) cats.push('Customer Support — Chat / Non-Voice');
                if (fullText.includes('telesales') || fullText.includes('telecalling') || fullText.includes('calling')) cats.push('Telecalling & Tele Sales');
                if (fullText.includes('sales') || fullText.includes('business development')) cats.push('Sales & Business Development');
                if (fullText.includes('counsellor') || fullText.includes('edtech')) cats.push('EdTech Counsellor');
                if (fullText.includes('data') || fullText.includes('barcode') || fullText.includes('back office') || fullText.includes('inventory')) cats.push('Data Annotation & Back Office');
                if (fullText.includes('fresher') || fullText.includes('freshers')) cats.push('Freshers Jobs');
                if (fullText.includes('experienced') || fullText.includes('1-') || fullText.includes('1–') || fullText.includes('years')) cats.push('Experienced Candidates');
                if (cats.length === 0) cats.push('Other Opportunities');
            }
            return {
                ...job,
                categories: cats,
                work_mode: job.work_mode || (job.location && job.location.toLowerCase().includes('home') ? "Work From Home" : "Work From Office"),
                experience_level: job.experience_level || "Fresher",
                qualification: job.qualification || "12th Pass / Graduate",
                languages: job.languages || "Hindi / English",
                shifts: job.shifts || "Standard Shifts",
                last_updated: job.last_updated || "2026-10-25"
            };
        });
    }

    /**
     * Render the 10 interactive category selectors
     */
    function renderCategories() {
        if (!categoriesGridEl) return;
        categoriesGridEl.innerHTML = '';

        JOB_CATEGORIES.forEach(cat => {
            // Count matching jobs for this category
            const count = allJobs.filter(job => {
                const cats = job.categories || [];
                return cats.some(c => c.toLowerCase() === cat.name.toLowerCase());
            }).length;

            const isSelected = selectedCategories.has(cat.name);

            const card = document.createElement('button');
            card.type = 'button';
            card.className = `category-card group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer border flex flex-col justify-between ${
                isSelected
                    ? 'border-[#1B3A7D] bg-blue-50/70 shadow-md ring-2 ring-[#1B3A7D]/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`;
            card.dataset.category = cat.name;

            card.innerHTML = `
                <div class="flex items-start justify-between w-full mb-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#1B3A7D] text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-[#1B3A7D]'
                    }">
                        <i data-lucide="${cat.icon}" class="w-5 h-5"></i>
                    </div>
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold transition-all ${
                        isSelected
                            ? 'bg-[#1B3A7D] border-[#1B3A7D] text-white'
                            : 'border-slate-300 text-transparent group-hover:border-slate-400'
                    }">
                        <i data-lucide="check" class="w-3 h-3 ${isSelected ? 'block' : 'hidden'}"></i>
                    </span>
                </div>
                <div>
                    <h4 class="text-sm font-bold leading-snug mb-1 ${isSelected ? 'text-[#1B3A7D]' : 'text-slate-900 group-hover:text-[#1B3A7D]'}">
                        ${cat.name}
                    </h4>
                    <p class="text-xs text-slate-500 line-clamp-1 mb-2">${cat.desc}</p>
                    <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isSelected
                            ? 'bg-blue-100 text-[#1B3A7D]'
                            : 'bg-slate-100 text-slate-600'
                    }">
                        ${count} ${count === 1 ? 'Opening' : 'Openings'}
                    </span>
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
                JOB_CATEGORIES.forEach(c => selectedCategories.add(c.name));
                renderCategories();
                filterAndRenderJobs();
            });
        }

        const clearCatsBtn = document.getElementById('clearCatsBtn');
        if (clearCatsBtn) {
            clearCatsBtn.addEventListener('click', () => {
                selectedCategories.clear();
                renderCategories();
                filterAndRenderJobs();
            });
        }

        // Close modal on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && jobModalEl && !jobModalEl.classList.contains('hidden')) {
                closeJobDetailsModal();
            }
        });
    }

    /**
     * Filter and render jobs list
     */
    function filterAndRenderJobs() {
        if (!jobCardsGridEl) return;

        const filtered = allJobs.filter(job => {
            // 1. Category filter: if any categories are selected, job must belong to at least one
            if (selectedCategories.size > 0) {
                const jobCats = job.categories || [];
                const hasMatch = Array.from(selectedCategories).some(selCat =>
                    jobCats.some(jc => jc.toLowerCase() === selCat.toLowerCase())
                );
                if (!hasMatch) return false;
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
                <div class="col-span-full py-16 px-6 text-center bg-slate-50 border border-slate-200 rounded-3xl max-w-2xl mx-auto shadow-sm">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#1B3A7D] flex items-center justify-center">
                        <i data-lucide="search-x" class="w-8 h-8"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">No Matching Job Openings Found</h3>
                    <p class="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                        No active vacancies match your current combination of category, search, or filters. Try clearing some filters or visit our official WhatsApp channel for newly announced openings.
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <button onclick="window.exploreJobsResetFilters()" class="px-5 py-2.5 rounded-full font-semibold text-sm bg-[#1B3A7D] text-white hover:bg-[#142B5C] transition-all shadow-sm">
                            Clear All Filters
                        </button>
                        <a href="${OFFICIAL_WHATSAPP_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-full font-semibold text-sm bg-[#E8F8EE] text-[#0D6832] border border-[#25D366]/40 hover:bg-[#DCFCE7] transition-all inline-flex items-center gap-2">
                            <span>Check WhatsApp Channel</span>
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
            
            // Format clean description snippet
            let cleanDesc = (job.description || '')
                .replace(/\n+/g, ' ')
                .replace(/Responsibilities:|Requirements:|Benefits:/gi, '')
                .trim();
            if (cleanDesc.length > 140) {
                cleanDesc = cleanDesc.substring(0, 137) + '...';
            }
            if (!cleanDesc) {
                cleanDesc = 'Verified opportunity assisting candidates across Tier 2 and Tier 3 cities in India.';
            }

            const card = document.createElement('div');
            card.className = 'job-card-white group bg-white border border-slate-200 hover:border-[#1B3A7D]/40 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between';

            card.innerHTML = `
                <div>
                    <!-- Card Header: Badges -->
                    <div class="flex items-center justify-between gap-2 mb-3.5">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            workModeBadge.includes('Home')
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }">
                            <i data-lucide="${workModeBadge.includes('Home') ? 'home' : 'building'}" class="w-3.5 h-3.5"></i>
                            ${workModeBadge}
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isClosed
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }">
                            <span class="w-2 h-2 rounded-full ${isClosed ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}"></span>
                            ${isClosed ? 'Closed' : 'Open'}
                        </span>
                    </div>

                    <!-- Job Title -->
                    <h3 class="text-lg font-bold text-slate-900 group-hover:text-[#1B3A7D] transition-colors mb-1">
                        ${job.title}
                    </h3>

                    <!-- Company Name -->
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-3">
                        <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>${job.company || 'Authorized Hiring Client'}</span>
                        <span class="text-slate-300">•</span>
                        <span class="text-emerald-600 font-medium flex items-center gap-0.5">
                            <i data-lucide="shield-check" class="w-3 h-3"></i> Verified
                        </span>
                    </div>

                    <!-- Salary Highlight -->
                    <div class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-bold">
                        <i data-lucide="indian-rupee" class="w-3.5 h-3.5 text-amber-600"></i>
                        <span>${job.salary || 'Competitive / Verified Salary'}</span>
                    </div>

                    <!-- Key Metadata Chips Grid -->
                    <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#1B3A7D]"></i>
                            <span class="truncate" title="${job.location}">${job.location || 'Pan India'}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="user-check" class="w-3.5 h-3.5 text-[#1B3A7D]"></i>
                            <span class="truncate">${job.experience_level || 'Fresher / All'}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-[#1B3A7D]"></i>
                            <span class="truncate" title="${job.qualification || '12th Pass / Graduate'}">${job.qualification || '12th Pass / Graduate'}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="languages" class="w-3.5 h-3.5 text-[#1B3A7D]"></i>
                            <span class="truncate" title="${job.languages || 'Hindi / English'}">${job.languages || 'Hindi / English'}</span>
                        </div>
                    </div>

                    <!-- Description Snippet -->
                    <p class="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                        ${cleanDesc}
                    </p>
                </div>

                <!-- Footer with Date & Action Buttons -->
                <div class="pt-4 border-t border-slate-100 mt-2">
                    <div class="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                        <span class="flex items-center gap-1">
                            <i data-lucide="calendar" class="w-3 h-3"></i> Updated: ${job.last_updated || 'Recent'}
                        </span>
                        <span class="text-slate-400">ID: #${job.id}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2.5">
                        <button onclick="window.openJobDetailsModal(${job.id})" class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                            <i data-lucide="info" class="w-3.5 h-3.5"></i>
                            <span>View Details</span>
                        </button>

                        <button onclick="window.applyForJob(${job.id})" class="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isClosed
                                ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#1B3A7D] to-[#2A4D9B] hover:opacity-95 shadow-sm hover:shadow'
                        }" ${isClosed ? 'disabled' : ''}>
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                            <span>${isClosed ? 'Closed' : 'Apply Now'}</span>
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
        document.getElementById('modalCompany').innerText = job.company || 'Authorized Hiring Client';
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
            statusEl.innerText = isClosed ? 'Closed' : 'Open';
            statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
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
                            return `<li class="ml-4 list-disc text-slate-700 my-1">${trimmed.replace(/^[-•]\s*/, '')}</li>`;
                        }
                        if (trimmed.endsWith(':')) {
                            return `<h5 class="font-bold text-slate-900 mt-3 mb-1">${trimmed}</h5>`;
                        }
                        return `<p class="text-slate-700 my-1 leading-relaxed">${trimmed}</p>`;
                    })
                    .join('');
            } else {
                descContainer.innerHTML = '<p class="text-slate-600">Verified opportunity verified by Plan B Careers team. Candidates from Tier 2 and Tier 3 cities across India are encouraged to apply.</p>';
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
            `I am interested in applying for the following verified opportunity:%0A%0A` +
            `🎯 *Role:* ${encodeURIComponent(job.title)}%0A` +
            `🏢 *Company:* ${encodeURIComponent(job.company || 'Client via Plan B Careers')}%0A` +
            `📍 *Location:* ${encodeURIComponent(job.location || 'Pan India')}%0A` +
            `💰 *Salary:* ${encodeURIComponent(job.salary || 'As per listing')}%0A` +
            `🆔 *Job ID:* #${job.id}%0A%0A` +
            `Please let me know the eligibility check and interview procedure. I am ready to share my resume.%0A%0A` +
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
