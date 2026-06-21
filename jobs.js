// ===================================
// Plan-B Consultancy - Jobs Page JS
// ===================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Job Filter Logic ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const jobCards = document.querySelectorAll('#jobCards .job-card');
    const searchInput = document.getElementById('jobSearch');

    function filterJobs() {
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        const activeBtn = document.querySelector('.filter-btn.active');
        const activeFilter = activeBtn ? activeBtn.dataset.filter : 'all';

        jobCards.forEach(card => {
            const category = card.dataset.category || '';
            const cardText = card.innerText.toLowerCase();

            const matchesFilter = activeFilter === 'all' || category.includes(activeFilter);
            const matchesSearch = cardText.includes(searchText);

            card.style.display = (matchesFilter && matchesSearch) ? 'flex' : 'none';
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterJobs();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', filterJobs);
    }

    // Initialize: show all cards
    jobCards.forEach(card => card.style.display = 'flex');

    // --- Application Modal Logic ---
    const modal = document.getElementById('applyModal');
    const closeBtn = document.querySelector('.close-modal');
    const modalJobTitle = document.getElementById('modalJobTitle');
    const jobAppliedInput = document.getElementById('jobApplied');
    const form = document.getElementById('applyForm');
    const successMessage = document.getElementById('successMessage');

    // Open modal
    window.openApplyModal = function (jobTitle) {
        if (!modal) return;
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

    // --- Form Submit → CRM + WhatsApp ---
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
            const job = jobAppliedInput?.value || '';

            // Get resume file
            const resumeInput = document.getElementById('resume');
            const resumeFile = resumeInput && resumeInput.files.length > 0 ? resumeInput.files[0] : null;
            const resumeFileName = resumeFile ? resumeFile.name : 'No file';

            // Post to CRM Public API
            const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
                ? 'http://localhost:3001/api/candidates/public'
                : 'https://planb-crm-production.up.railway.app/api/candidates/public';

            const formData = new FormData();
            formData.append('name', name);
            formData.append('mobile', mobile);
            formData.append('email', email);
            formData.append('city', city);
            formData.append('qualification', qualification);
            formData.append('experience', experience);
            formData.append('current_company', job);
            formData.append('source', 'Website - Job Modal');
            formData.append('stage', 'New Lead');

            if (resumeFile) {
                formData.append('resume', resumeFile);
            }

            try {
                await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });
            } catch (err) {
                console.error('CRM save error:', err);
            }

            const message = `New Job Application:%0A` +
                `Job: ${job}%0A` +
                `Name: ${name}%0A` +
                `Mobile: ${mobile}%0A` +
                `Email: ${email}%0A` +
                `City: ${city}%0A` +
                `Qualification: ${qualification}%0A` +
                `Experience: ${experience}%0A` +
                `Resume: ${resumeFileName}`;

            const whatsappNumber = '919420512501';
            const url = `https://wa.me/${whatsappNumber}?text=${message}`;

            // Open WhatsApp with pre-filled message
            window.open(url, '_blank');

            // Show success state
            form.reset();
            form.style.display = 'none';
            if (successMessage) successMessage.style.display = 'block';

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Application';
            }
        });
    }

});
