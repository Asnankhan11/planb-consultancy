// ===================================
// Plan B Careers - Dynamic Jobs JS
// ===================================

document.addEventListener('DOMContentLoaded', async () => {

    const jobCardsContainer = document.getElementById('jobCards');
    const searchInput = document.getElementById('jobSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    let allJobs = [];

    // --- Fetch Jobs from API ---
    async function loadDynamicJobs() {
        if (!jobCardsContainer) return;
        try {
            const res = await fetch('/api/jobs');
            if(res.ok) {
                allJobs = await res.json();
                renderJobs(allJobs);
            }
        } catch(err) {
            console.error('Failed to load jobs:', err);
            jobCardsContainer.innerHTML = '<p class="text-white text-center w-full py-10">Failed to load jobs. Please try again later.</p>';
        }
    }

    function renderJobs(jobs) {
        if (!jobCardsContainer) return;
        jobCardsContainer.innerHTML = '';
        
        if (jobs.length === 0) {
            jobCardsContainer.innerHTML = '<p class="text-white text-center w-full py-10">No jobs found matching your criteria.</p>';
            return;
        }

        jobs.forEach(job => {
            // Determine badge color
            const badgeColor = job.type === 'Work From Home' ? 'pink' : (job.type === 'Part Time' ? 'blue' : 'purple');
            
            const cardHTML = `
                <div class="job-card bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:shadow-lg flex flex-col justify-between h-full" data-category="${job.type}">
                    <div>
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1 bg-${badgeColor}-500/20 text-${badgeColor}-300 text-xs font-semibold rounded-full border border-${badgeColor}-500/30">
                                ${job.type}
                            </span>
                            <span class="text-gray-400 text-xs">Recently Added</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-2">${job.title}</h3>
                        <p class="text-gray-400 text-sm mb-4"><i data-lucide="building-2" class="inline w-4 h-4 mr-1"></i> ${job.company}</p>
                        <p class="text-gray-400 text-sm mb-4"><i data-lucide="map-pin" class="inline w-4 h-4 mr-1"></i> ${job.location}</p>
                        <p class="text-gray-300 text-sm mb-6 line-clamp-3">${job.description || 'Verified job opportunity via Plan B Careers.'}</p>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-white/10">
                        <span class="text-green-400 font-bold">${job.salary || 'Salary Negotiable'}</span>
                        <button onclick="openApplyModal('${job.title}', ${job.id})" class="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors">
                            Apply Now
                        </button>
                    </div>
                </div>
            `;
            jobCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // --- Filter & Search Logic ---
    function applyFilters() {
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        const activeBtn = document.querySelector('.filter-btn.active');
        const activeFilter = activeBtn ? activeBtn.dataset.filter : 'all';

        const filteredJobs = allJobs.filter(job => {
            const matchesFilter = activeFilter === 'all' || job.type.includes(activeFilter);
            const matchesSearch = job.title.toLowerCase().includes(searchText) || job.company.toLowerCase().includes(searchText);
            return matchesFilter && matchesSearch;
        });

        renderJobs(filteredJobs);
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

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

    // Open modal
    window.openApplyModal = function (jobTitle, jobId) {
        if (!modal) return;
        currentJobId = jobId || null;
        modal.style.display = 'flex';
        if (modalJobTitle) modalJobTitle.innerText = jobTitle;
        if (jobAppliedInput) jobAppliedInput.value = jobTitle;
        if (form) form.style.display = 'block';
        if (successMessage) successMessage.style.display = 'none';
    };

    // Close modal
    window.closeApplyModal = function () {
        if (modal) modal.style.display = 'none';
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeApplyModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) window.closeApplyModal();
    });

    // --- Form Submit → Dynamic API ---
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Submitting...';
            }

            const name = document.getElementById('fullName')?.value || '';
            const mobile = document.getElementById('mobile')?.value || '';
            const email = document.getElementById('email')?.value || '';
            const city = document.getElementById('city')?.value || '';
            const qualification = document.getElementById('qualification')?.value || '';
            const experience = document.getElementById('experience')?.value || '';
            const jobTitle = jobAppliedInput?.value || '';

            const formData = new FormData();
            if (currentJobId) formData.append('job_id', currentJobId);
            formData.append('name', name);
            formData.append('mobile', mobile);
            formData.append('email', email);
            formData.append('city', city);
            formData.append('qualification', qualification);
            formData.append('experience', experience);
            formData.append('preferred_company', jobTitle);

            const resumeInput = document.getElementById('resume');
            if (resumeInput && resumeInput.files.length > 0) {
                formData.append('resume', resumeInput.files[0]);
            }

            const API_URL = '/api/applications';

            try {
                const resp = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });
                
                if (resp.ok) {
                    form.reset();
                    form.style.display = 'none';
                    if (successMessage) successMessage.style.display = 'block';
                } else {
                    alert('Error submitting application. Please try again.');
                }
            } catch (err) {
                console.error('API save error:', err);
                alert('Server connection error. Please try again later.');
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Application';
            }
        });
    }

});
