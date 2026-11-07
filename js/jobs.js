// ==========================================================================
// Plan B Careers - Dynamic Jobs Listing JS
// Palette: Deep Midnight Navy (#101A2C) · Rich Teal (#087F8C) · Electric Lime (#C7F36B)
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {

    const jobCardsContainer = document.getElementById('jobCards');
    const searchInput = document.getElementById('jobSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const industryFilter = document.getElementById('industryFilter');
    const salaryFilter = document.getElementById('salaryFilter');
    const locationFilter = document.getElementById('locationFilter');
    const experienceFilter = document.getElementById('experienceFilter');
    const workModeFilter = document.getElementById('workModeFilter');
    const sortSelect = document.getElementById('sortSelect');
    const jobCountDisplay = document.getElementById('jobCountDisplay');
    
    let allJobs = [];

    // Helper: Parse salary range into monthly min/max and LPA
    function getSalaryMonthlyMinMax(job) {
        if (job.min_salary && job.max_salary) {
            const isAnnual = (job.salary_period || '').toLowerCase() === 'annual' || (job.salary_type || '').toLowerCase() === 'ctc';
            if (isAnnual) {
                return { min: job.min_salary / 12, max: job.max_salary / 12, lpa: job.max_salary / 100000 };
            }
            return { min: job.min_salary, max: job.max_salary, lpa: (job.max_salary * 12) / 100000 };
        }
        const salStr = (job.salary || '').toLowerCase();
        const lpaMatch = salStr.match(/([0-9.]+)\s*lpa/);
        if (lpaMatch) {
            const lpa = parseFloat(lpaMatch[1]);
            return { min: (lpa * 100000) / 12, max: (lpa * 100000) / 12, lpa: lpa };
        }
        const rangeMatch = salStr.match(/([0-9,]+)\s*(?:–|-|to)\s*([0-9,]+)/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
            const max = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
            return { min, max, lpa: (max * 12) / 100000 };
        }
        const singleMatch = salStr.match(/([0-9,]+)/);
        if (singleMatch) {
            const val = parseInt(singleMatch[1].replace(/,/g, ''), 10);
            return { min: val, max: val, lpa: (val * 12) / 100000 };
        }
        return null;
    }

    // --- Fetch Jobs from API with fallback ---
    async function loadDynamicJobs() {
        if (!jobCardsContainer) return;
        try {
            const res = await fetch('/api/jobs');
            if (res.ok) {
                allJobs = await res.json();
            } else {
                throw new Error('API failed');
            }
        } catch(err) {
            console.warn('Fallback jobs.json triggered:', err);
            try {
                const fbRes = await fetch('/jobs.json');
                if (fbRes.ok) allJobs = await fbRes.json();
            } catch(e) {
                allJobs = [];
            }
        }

        // Check URL params for category, filter, search, or mode
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search') || urlParams.get('q');
        const filterParam = urlParams.get('filter') || urlParams.get('category');
        const modeParam = urlParams.get('mode') || urlParams.get('work_mode');

        if (searchParam && searchInput) {
            searchInput.value = searchParam;
        }

        if (modeParam && workModeFilter) {
            const mOpt = Array.from(workModeFilter.options).find(o => o.value.toLowerCase() === modeParam.toLowerCase());
            if (mOpt) workModeFilter.value = mOpt.value;
        }

        if (filterParam) {
            const fp = filterParam.toLowerCase();
            if (fp === 'freelance' || fp === 'contract') {
                if (workModeFilter && Array.from(workModeFilter.options).some(o => o.value === 'freelance')) {
                    workModeFilter.value = 'freelance';
                } else if (searchInput && !searchInput.value) {
                    searchInput.value = 'Freelance';
                }
            } else if (fp === 'wfh' || fp === 'remote' || fp === 'home') {
                if (workModeFilter) workModeFilter.value = 'home';
            } else if (fp === 'fresher' || fp === 'freshers') {
                if (experienceFilter) {
                    const fOpt = Array.from(experienceFilter.options).find(o => o.value.toLowerCase().includes('fresher'));
                    if (fOpt) experienceFilter.value = fOpt.value;
                }
            } else if (fp === 'telecall' || fp === 'telecalling' || fp === 'non-voice' || fp === 'chat') {
                if (searchInput && !searchInput.value) {
                    searchInput.value = fp === 'non-voice' ? 'Chat Support' : (fp === 'telecall' ? 'Telecalling' : fp);
                }
            } else if (industryFilter) {
                const matchOption = Array.from(industryFilter.options).find(opt => 
                    opt.value.toLowerCase().includes(fp) || 
                    fp.includes(opt.value.toLowerCase())
                );
                if (matchOption) {
                    industryFilter.value = matchOption.value;
                }
            }
        }

        applyFilters();
    }

    function renderJobs(jobs) {
        if (!jobCardsContainer) return;
        jobCardsContainer.innerHTML = '';
        
        if (jobCountDisplay) {
            jobCountDisplay.innerText = `${jobs.length} ${jobs.length === 1 ? 'Job' : 'Jobs'} Found`;
        }

        if (jobs.length === 0) {
            const activeIndustry = industryFilter && industryFilter.value !== 'all' ? industryFilter.value : 'this sector';
            jobCardsContainer.innerHTML = `
                <div class="col-span-full py-16 px-6 text-center bg-white border border-gray-200 rounded-3xl max-w-xl mx-auto shadow-card">
                    <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <i data-lucide="briefcase" class="w-7 h-7"></i>
                    </div>
                    <h3 class="text-xl font-bold text-navy-900 mb-2">No Active Openings in ${activeIndustry} Yet</h3>
                    <p class="text-sm text-slate mb-6">We are actively onboarding verified employers in this industry. Connect directly on WhatsApp with our recruitment desk to get priority notifications.</p>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <a href="https://wa.me/919420512501?text=Hello%20Plan%20B%20Careers,%20please%20notify%20me%20for%20openings%20in%20${encodeURIComponent(activeIndustry)}" target="_blank" class="btn-accent text-xs py-2.5 px-4 gap-1.5">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                            <span>Notify Me on WhatsApp</span>
                        </a>
                        <button onclick="window.resetJobFilters()" class="btn-outline-navy text-xs py-2.5 px-4">
                            Reset All Filters
                        </button>
                    </div>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        jobs.forEach(job => {
            const isWfh = (job.work_mode || job.type || job.location || '').toLowerCase().includes('home');
            const isClosed = (job.status || '').toLowerCase() === 'closed';

            let cleanSnippet = (job.description || '')
                .replace(/\n+/g, ' ')
                .replace(/Responsibilities:|Requirements:|Benefits:/gi, '')
                .trim();
            if (cleanSnippet.length > 130) {
                cleanSnippet = cleanSnippet.substring(0, 127) + '...';
            }
            if (!cleanSnippet) {
                cleanSnippet = 'Verified employment opening via Plan B Careers. Freshers and experienced candidates welcome.';
            }

            const cardHTML = `
                <div class="card-modern flex flex-col justify-between h-full group" data-category="${job.type || ''}">
                    <div>
                        <!-- Badges Row -->
                        <div class="flex justify-between items-start mb-3.5 gap-2">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                isWfh 
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                                    : 'bg-navy-50 text-navy-900 border border-navy-200'
                            }">
                                <i data-lucide="${isWfh ? 'laptop' : 'building-2'}" class="w-3.5 h-3.5"></i>
                                ${job.work_mode || job.type || 'Full Time'}
                            </span>
                            <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                isClosed ? 'bg-gray-100 text-slate' : 'bg-lime-100 text-lime-900 border border-lime-300'
                            }">
                                <span class="w-2 h-2 rounded-full ${isClosed ? 'bg-slate' : 'bg-lime-500 animate-pulse'}"></span>
                                ${isClosed ? 'Closed' : 'Active'}
                            </span>
                        </div>

                        <!-- Job Title -->
                        <h3 class="text-lg font-bold text-navy-900 group-hover:text-teal-600 transition-colors mb-1 leading-snug">
                            <a href="/job/${job.id}.html" class="hover:underline">${job.title}</a>
                        </h3>
                        
                        <!-- Company & Verified Tag -->
                        <div class="flex items-center gap-2 text-xs text-slate mb-3">
                            <span class="text-charcoal font-semibold">${job.company || 'Plan B Hiring Partner'}</span>
                            <span>•</span>
                            <span class="text-teal-600 font-medium inline-flex items-center gap-1">
                                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Verified
                            </span>
                        </div>

                        <!-- Salary & Chips -->
                        <div class="mb-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-ivory border border-gray-200 text-navy-900 text-xs font-bold font-outfit">
                            <i data-lucide="wallet" class="w-3.5 h-3.5 text-teal-600"></i>
                            <span>${job.salary || 'Salary Negotiable'}</span>
                        </div>

                        <!-- Metadata Grid -->
                        <div class="grid grid-cols-2 gap-2 text-xs text-charcoal mb-4 bg-ivory/60 p-2.5 rounded-xl border border-gray-200/60">
                            <div class="flex items-center gap-1.5 truncate">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                                <span class="truncate">${job.location || 'Pan India'}</span>
                            </div>
                            <div class="flex items-center gap-1.5 truncate">
                                <i data-lucide="user-check" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                                <span class="truncate">${job.experience_level || 'Fresher / Any'}</span>
                            </div>
                            <div class="flex items-center gap-1.5 truncate">
                                <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                                <span class="truncate">${job.qualification || '12th Pass / Graduate'}</span>
                            </div>
                            <div class="flex items-center gap-1.5 truncate">
                                <i data-lucide="clock" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                                <span class="truncate">${job.shifts || 'Regular Shift'}</span>
                            </div>
                        </div>

                        <p class="text-xs text-slate leading-relaxed mb-4 line-clamp-2">
                            ${cleanSnippet}
                        </p>
                    </div>

                    <!-- Footer Actions -->
                    <div class="pt-4 border-t border-gray-100">
                        <div class="flex items-center justify-between gap-2">
                            <a href="/job/${job.id}.html" class="btn-outline-navy text-xs py-2 px-3 justify-center gap-1 flex-1">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                <span>Details</span>
                            </a>
                            <button onclick="openApplyModal('${(job.title || '').replace(/'/g, "\\'")}', ${job.id || 'null'})" class="text-xs py-2 px-3 justify-center gap-1 flex-1 ${
                                isClosed ? 'btn bg-gray-200 text-slate cursor-not-allowed' : 'btn-accent'
                            }" ${isClosed ? 'disabled' : ''}>
                                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                <span>Apply</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            jobCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // --- Filter & Search Logic ---
    function applyFilters() {
        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const activeBtn = document.querySelector('#categoryChipsContainer .filter-btn.active');
        const activeFilter = activeBtn ? (activeBtn.dataset.filter || 'all').toLowerCase() : 'all';
        const industryVal = industryFilter ? industryFilter.value.toLowerCase() : 'all';
        const salaryVal = salaryFilter ? salaryFilter.value : 'all';
        const locFilterVal = locationFilter ? locationFilter.value.toLowerCase() : 'all';
        const expFilterVal = experienceFilter ? experienceFilter.value.toLowerCase() : 'all';
        const modeFilterVal = workModeFilter ? workModeFilter.value.toLowerCase() : 'all';

        let filteredJobs = allJobs.filter(job => {
            const typeStr = (job.type || '').toLowerCase();
            const titleStr = (job.title || '').toLowerCase();
            const descStr = (job.description || '').toLowerCase();
            const compStr = (job.company || '').toLowerCase();
            const locStr = (job.location || '').toLowerCase();
            const modeStr = (job.work_mode || '').toLowerCase();
            const expStr = (job.experience_level || '').toLowerCase();
            const jobIndustry = (job.industry || '').toLowerCase();
            const cats = (job.categories || []).map(c => c.toLowerCase()).join(' ');

            // Category Button Filter
            const matchesCategoryBtn = activeFilter === 'all' || 
                                       jobIndustry.includes(activeFilter) || 
                                       typeStr.includes(activeFilter) || 
                                       titleStr.includes(activeFilter) || 
                                       cats.includes(activeFilter) ||
                                       descStr.includes(activeFilter);

            // Industry Dropdown Filter
            const matchesIndustry = industryVal === 'all' || 
                                    jobIndustry.includes(industryVal) || 
                                    typeStr.includes(industryVal) || 
                                    cats.includes(industryVal) || 
                                    titleStr.includes(industryVal);

            // Flexible Salary Range Filter
            let matchesSalary = true;
            if (salaryVal !== 'all') {
                const salObj = getSalaryMonthlyMinMax(job);
                if (!salObj) {
                    matchesSalary = false;
                } else {
                    if (salaryVal === '0-25000') {
                        matchesSalary = salObj.min <= 25000;
                    } else if (salaryVal === '25000-50000') {
                        matchesSalary = (salObj.min >= 20000 && salObj.min <= 50000) || (salObj.max >= 25000 && salObj.max <= 60000);
                    } else if (salaryVal === '50000-100000') {
                        matchesSalary = (salObj.max >= 50000 && salObj.max <= 100000) || (salObj.min >= 45000 && salObj.min <= 100000);
                    } else if (salaryVal === '100000+') {
                        matchesSalary = salObj.max >= 100000 || salObj.lpa >= 12;
                    } else if (salaryVal === '2-5lpa') {
                        matchesSalary = (salObj.lpa >= 2 && salObj.lpa <= 5.5) || (salObj.max >= 16000 && salObj.max <= 45000);
                    } else if (salaryVal === '5-10lpa') {
                        matchesSalary = (salObj.lpa >= 4.5 && salObj.lpa <= 10.5) || (salObj.max >= 40000 && salObj.max <= 90000);
                    } else if (salaryVal === '10lpa+') {
                        matchesSalary = salObj.lpa >= 10 || salObj.max >= 85000;
                    }
                }
            }

            // Keyword Search
            const matchesSearch = !searchText || 
                                  titleStr.includes(searchText) || 
                                  compStr.includes(searchText) || 
                                  descStr.includes(searchText) || 
                                  locStr.includes(searchText) ||
                                  typeStr.includes(searchText) ||
                                  modeStr.includes(searchText) ||
                                  jobIndustry.includes(searchText);

            // Location dropdown
            const matchesLoc = locFilterVal === 'all' || 
                               locStr.includes(locFilterVal) || 
                               (locFilterVal === 'remote' && (locStr.includes('home') || modeStr.includes('home')));

            // Work mode dropdown
            const matchesMode = modeFilterVal === 'all' || 
                                modeStr.includes(modeFilterVal) || 
                                locStr.includes(modeFilterVal) ||
                                typeStr.includes(modeFilterVal) ||
                                (modeFilterVal === 'freelance' && (typeStr.includes('freelance') || modeStr.includes('freelance') || descStr.includes('commission')));

            // Experience dropdown
            const matchesExp = expFilterVal === 'all' || 
                               expStr.includes(expFilterVal) || 
                               descStr.includes(expFilterVal);

            return matchesCategoryBtn && matchesIndustry && matchesSalary && matchesSearch && matchesLoc && matchesMode && matchesExp;
        });

        // Sorting
        if (sortSelect) {
            const sortVal = sortSelect.value;
            if (sortVal === 'newest') {
                filteredJobs.sort((a, b) => (b.id || 0) - (a.id || 0));
            } else if (sortVal === 'oldest') {
                filteredJobs.sort((a, b) => (a.id || 0) - (b.id || 0));
            }
        }

        renderJobs(filteredJobs);
    }

    // Reset helper
    window.resetJobFilters = function() {
        if (searchInput) searchInput.value = '';
        if (industryFilter) industryFilter.value = 'all';
        if (salaryFilter) salaryFilter.value = 'all';
        if (locationFilter) locationFilter.value = 'all';
        if (experienceFilter) experienceFilter.value = 'all';
        if (workModeFilter) workModeFilter.value = 'all';
        document.querySelectorAll('#categoryChipsContainer .filter-btn').forEach((b, idx) => {
            if (idx === 0) {
                b.classList.add('active', 'bg-navy-900', 'text-white');
            } else {
                b.classList.remove('active', 'bg-navy-900', 'text-white');
            }
        });
        applyFilters();
    };

    // Attach Event Listeners
    const categoryChips = document.querySelectorAll('#categoryChipsContainer .filter-btn');
    categoryChips.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryChips.forEach(b => b.classList.remove('active', 'bg-navy-900', 'text-white'));
            btn.classList.add('active', 'bg-navy-900', 'text-white');
            const targetFilter = btn.dataset.filter || 'all';
            if (industryFilter) {
                const matchOpt = Array.from(industryFilter.options).find(o => o.value.toLowerCase() === targetFilter.toLowerCase());
                industryFilter.value = matchOpt ? matchOpt.value : 'all';
            }
            applyFilters();
        });
    });

    if (industryFilter) {
        industryFilter.addEventListener('change', () => {
            const selectedVal = industryFilter.value.toLowerCase();
            categoryChips.forEach(b => {
                const bFilter = (b.dataset.filter || '').toLowerCase();
                if (bFilter === selectedVal || (selectedVal === 'all' && bFilter === 'all')) {
                    b.classList.add('active', 'bg-navy-900', 'text-white');
                } else {
                    b.classList.remove('active', 'bg-navy-900', 'text-white');
                }
            });
            applyFilters();
        });
    }

    if (salaryFilter) salaryFilter.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (locationFilter) locationFilter.addEventListener('change', applyFilters);
    if (experienceFilter) experienceFilter.addEventListener('change', applyFilters);
    if (workModeFilter) workModeFilter.addEventListener('change', applyFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    // Initial Load
    loadDynamicJobs();

    // --- Application Modal Logic ---
    const modal = document.getElementById('applyModal');
    const closeBtn = document.querySelector('.close-modal');
    const modalJobTitle = document.getElementById('modalJobTitle');
    const jobAppliedInput = document.getElementById('jobApplied');
    const form = document.getElementById('applyForm');
    const successMessage = document.getElementById('successMessage');
    
    let currentJobId = null;

    window.openApplyModal = function (jobTitle, jobId) {
        if (!modal) return;
        currentJobId = jobId || null;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        if (modalJobTitle) modalJobTitle.innerText = jobTitle || 'Job Role';
        if (jobAppliedInput) jobAppliedInput.value = jobTitle || '';
        if (form) form.style.display = 'block';
        if (successMessage) {
            successMessage.classList.add('hidden');
            successMessage.style.display = 'none';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.closeApplyModal = function () {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
        if (form) {
            delete form.dataset.applicationId;
        }
    };

    if (closeBtn) closeBtn.addEventListener('click', window.closeApplyModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) window.closeApplyModal();
    });

    // --- Form Submit -> Backend Sync + Instant WhatsApp Redirect ---
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = (document.getElementById('fullName')?.value || '').trim();
            const mobile = (document.getElementById('mobile')?.value || '').trim();
            const email = (document.getElementById('email')?.value || '').trim();
            const city = (document.getElementById('city')?.value || '').trim();
            const qualification = document.getElementById('qualification')?.value || '';
            const experience = document.getElementById('experience')?.value || '';
            const jobTitle = jobAppliedInput?.value || document.getElementById('modalJobTitle')?.innerText || 'Job Application';

            const resumeInput = document.getElementById('resume');
            const hasResume = resumeInput && resumeInput.files && resumeInput.files.length > 0;
            const resumeFileName = hasResume ? resumeInput.files[0].name : '';

            if (!hasResume || !resumeInput.files[0]) {
                alert('Resume document is required. Please upload your resume in PDF, DOC, or DOCX format (up to 5MB).');
                return;
            }

            const file = resumeInput.files[0];
            const allowedExts = ['.pdf', '.doc', '.docx'];
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
            if (!allowedExts.includes(ext)) {
                alert('Only PDF, DOC, and DOCX resume formats are supported.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Resume file size must be under 5MB.');
                return;
            }

            // Reliable Idempotency: assign or reuse application ID for retries / double-clicks
            let formAppId = form.dataset.applicationId;
            if (!formAppId) {
                const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const randPart = Math.floor(1000 + Math.random() * 9000);
                formAppId = `PB-${datePart}-${randPart}`;
                form.dataset.applicationId = formAppId;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit Application';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Submitting & Backing Up to Cloud...';
            }

            // Multipart Form Data
            const formData = new FormData();
            formData.append('application_id', formAppId);
            if (currentJobId) formData.append('job_id', currentJobId);
            formData.append('name', name);
            formData.append('mobile', mobile);
            formData.append('email', email);
            formData.append('city', city);
            formData.append('qualification', qualification);
            formData.append('experience', experience);
            formData.append('preferred_company', jobTitle);
            formData.append('resume', resumeInput.files[0]);

            // Sync with backend API (Google Drive + Google Sheets)
            let cloudResumeUrl = null;
            let returnedAppId = null;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 25000);
                const resp = await fetch('/api/applications', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await resp.json().catch(() => ({}));
                if (resp.ok && data && data.success) {
                    cloudResumeUrl = data.resume_url || null;
                    returnedAppId = data.application_id || data.applicationId || null;
                } else {
                    const errorMsg = data.error || data.message || 'Application submission failed. Please try again.';
                    alert(errorMsg);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalBtnText;
                    }
                    return;
                }
            } catch (err) {
                console.warn('API sync warning:', err);
                alert('Connection timeout submitting application. Please try again.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
                return;
            }

            // Save in localStorage for candidate dashboard
            try {
                let myApps = JSON.parse(localStorage.getItem('pb_applied_jobs') || '[]');
                myApps.unshift({
                    id: currentJobId || returnedAppId || Date.now(),
                    applicationId: returnedAppId || null,
                    title: jobTitle,
                    company: 'Plan B Client Partner',
                    date: new Date().toLocaleDateString(),
                    status: 'Under Review',
                    resumeUrl: cloudResumeUrl
                });
                localStorage.setItem('pb_applied_jobs', JSON.stringify(myApps));
            } catch(e) {}

            // Construct WhatsApp Message with Application ID & Google Drive link
            let resumeLine = '';
            if (cloudResumeUrl) {
                resumeLine = `📄 *Resume Link (Google Drive):* ${cloudResumeUrl} (👈 Click to View/Download)%0A%0A`;
            } else if (resumeFileName) {
                resumeLine = `📄 *Resume Document:* ${encodeURIComponent(resumeFileName)}%0A%0A`;
            }

            const appIdText = returnedAppId ? `🆔 *Application ID:* ${encodeURIComponent(returnedAppId)}%0A` : '';

            const whatsappMsg =
                `*📋 New Job Application - Plan B Careers*%0A%0A` +
                appIdText +
                `👤 *Name:* ${encodeURIComponent(name)}%0A` +
                `📱 *WhatsApp:* ${encodeURIComponent(mobile)}%0A` +
                (email ? `📧 *Email:* ${encodeURIComponent(email)}%0A` : '') +
                `📍 *City:* ${encodeURIComponent(city)}%0A` +
                `🎓 *Qualification:* ${encodeURIComponent(qualification)}%0A` +
                `💼 *Experience:* ${encodeURIComponent(experience)}%0A` +
                `🎯 *Role Applied:* ${encodeURIComponent(jobTitle)}%0A` +
                resumeLine +
                `_Please review my application and guide me through the interview._`;

            const waUrl = `https://wa.me/919420512501?text=${whatsappMsg}`;

            // Success view
            form.reset();
            form.style.display = 'none';
            if (successMessage) {
                successMessage.classList.remove('hidden');
                successMessage.style.display = 'block';
                const mainWaBtn = document.getElementById('mainWhatsAppBtn');
                if (mainWaBtn) mainWaBtn.href = waUrl;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }

            // Auto-open WhatsApp
            window.open(waUrl, '_blank');
        });
    }

});