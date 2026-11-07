'use strict';

(() => {
    const byId = id => document.getElementById(id);
    const views = {
        applications: {
            name: 'Applications', endpoint: '/api/applications',
            description: 'Review received applications and keep internal status notes. Resume files require an active administrator session.',
            statuses: ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Placed']
        },
        admissions: {
            name: 'Admission enquiries', endpoint: '/api/admin/admission-enquiries',
            description: 'Review student enquiries and record follow-up progress. Deleting an enquiry permanently removes its record.',
            statuses: ['New', 'Contacted', 'Counselling', 'In Progress', 'Converted', 'Closed']
        },
        jobs: {
            name: 'Published jobs', endpoint: '/api/jobs',
            description: 'Read-only view of currently available published jobs. Vacancy changes are reviewed in the site source and published with a site build so the website, API and indexed job pages agree.',
            statuses: ['Open']
        }
    };
    const state = { authenticated: false, view: 'applications', records: null, selected: null, version: 0, busy: false, rowBusy: false };

    // Retire the old console's browser-stored credential; this console uses only the HttpOnly session cookie.
    try { localStorage.removeItem('adminToken'); } catch { /* Storage may be disabled. */ }

    const text = value => value == null || value === '' ? 'Not provided' : String(value);
    function node(tag, content, className) {
        const element = document.createElement(tag);
        if (content != null) element.textContent = String(content);
        if (className) element.className = className;
        return element;
    }
    function message(id, value, error = false) {
        const element = byId(id);
        element.textContent = value;
        element.className = 'notice' + (error ? ' notice-error' : '');
        element.hidden = !value;
    }
    function formatDate(value) {
        if (!value) return 'Not provided';
        const raw = String(value);
        const date = new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw);
        return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('en-IN');
    }
    function fillStatuses(select, statuses, includeAll) {
        select.replaceChildren();
        if (includeAll) select.append(new Option('All statuses', ''));
        statuses.forEach(status => select.append(new Option(status, status)));
    }
    function setSignedOut(value, error = false) {
        state.authenticated = false;
        state.records = null;
        state.selected = null;
        state.version += 1;
        byId('workspace').hidden = true;
        byId('logout-button').hidden = true;
        byId('login-panel').hidden = false;
        byId('records-body').replaceChildren();
        byId('record-details').replaceChildren();
        byId('record-notes').value = '';
        byId('record-editor').hidden = true;
        message('session-status', value, error);
    }
    async function request(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
            let data = null;
            try { data = await response.json(); } catch { /* Preserve HTTP status for non-JSON errors. */ }
            if (!response.ok) {
                const error = new Error(data?.error || data?.message || 'The request failed (HTTP ' + response.status + '). Please try again.');
                error.status = response.status;
                if (response.status === 401 && state.authenticated) setSignedOut('Your session has expired. Sign in again.', true);
                throw error;
            }
            if (data === null) throw new Error('The server returned an unexpected response. No change could be confirmed.');
            return data;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('The request timed out. Refresh records to check whether a change was saved before trying again.');
            if (error instanceof TypeError) throw new Error('The server could not be reached. Check your connection and try again.');
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }
    const jsonRequest = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    function setLoading(loading) {
        state.busy = loading;
        byId('refresh-button').disabled = loading || state.rowBusy;
        byId('records-region').setAttribute('aria-busy', String(loading));
        byId('record-search').disabled = loading;
        byId('record-filter').disabled = loading;
    }
    function setRowBusy(busy) {
        state.rowBusy = busy;
        ['save-button', 'delete-button', 'close-editor', 'record-status', 'record-notes', 'resume-button'].forEach(id => { byId(id).disabled = busy; });
        document.querySelectorAll('[data-view], [data-record-id]').forEach(button => { button.disabled = busy; });
        byId('refresh-button').disabled = busy || state.busy;
    }
    function dirty() {
        return state.selected && (byId('record-status').value !== (state.selected.status || views[state.view].statuses[0]) || byId('record-notes').value !== (state.selected.notes || ''));
    }
    function closeEditor(confirmDiscard = true) {
        if (state.rowBusy) return false;
        if (confirmDiscard && dirty() && !window.confirm('Discard the unsaved changes to this record?')) return false;
        state.selected = null;
        byId('record-editor').hidden = true;
        byId('record-details').replaceChildren();
        byId('record-notes').value = '';
        return true;
    }
    function renderRecords() {
        const config = views[state.view];
        const query = byId('record-search').value.trim().toLowerCase();
        const status = byId('record-filter').value;
        const records = (state.records || []).filter(record => {
            const values = state.view === 'jobs'
                ? [record.title, record.company, record.location, record.salary, record.type]
                : [record.name, record.student_name, record.mobile, record.email, record.city, record.qualification, record.job_title, record.interested_course, record.preferred_city, record.application_id, record.enquiry_id];
            return (!status || record.status === status) && (!query || values.some(value => String(value || '').toLowerCase().includes(query)));
        });
        const headers = state.view === 'jobs' ? ['Role', 'Company and location', 'Pay as published', 'Status', 'Page']
            : state.view === 'applications' ? ['Applicant', 'Role and contact', 'Status', 'Received', 'Action']
            : ['Student', 'Course and contact', 'Status', 'Received', 'Action'];
        const header = node('tr');
        headers.forEach(label => { const cell = node('th', label); cell.scope = 'col'; header.append(cell); });
        byId('records-head').replaceChildren(header);
        byId('records-caption').textContent = config.name + ' returned by the server';
        const fragment = document.createDocumentFragment();
        records.forEach(record => {
            const row = node('tr');
            const values = state.view === 'jobs'
                ? [record.title, [record.company, record.location].filter(Boolean).join(' · '), record.salary, record.status]
                : state.view === 'applications'
                    ? [record.name, [record.job_title, record.mobile, record.email].filter(Boolean).join(' · '), record.status, formatDate(record.created_at)]
                    : [record.student_name, [record.interested_course, record.mobile, record.email].filter(Boolean).join(' · '), record.status, formatDate(record.created_at)];
            values.forEach(value => row.append(node('td', text(value), 'align-top break-words')));
            const action = node('td');
            if (state.view === 'jobs') {
                const url = String(record.url || '');
                if (/^\/job\/[a-zA-Z0-9-]+$/.test(url)) {
                    const link = node('a', 'View job', 'underline');
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    action.append(link);
                } else action.textContent = 'Page unavailable';
            } else {
                const button = node('button', 'Review', 'button button-outline');
                button.type = 'button';
                button.dataset.recordId = String(record.id);
                button.setAttribute('aria-label', 'Review ' + text(record.name || record.student_name));
                button.addEventListener('click', () => openEditor(record));
                action.append(button);
            }
            row.append(action);
            fragment.append(row);
        });
        byId('records-body').replaceChildren(fragment);
        const count = state.records?.length || 0;
        message('records-status', count ? 'Showing ' + records.length + ' of ' + count + ' loaded records.' : 'No ' + config.name.toLowerCase() + ' were returned by the server.');
        if (count && !records.length) message('records-status', 'No loaded records match your search or status filter.');
    }
    async function loadRecords() {
        if (!state.authenticated || state.rowBusy) return;
        if (!closeEditor()) return;
        const version = ++state.version;
        const view = state.view;
        state.records = null;
        byId('records-body').replaceChildren();
        byId('records-head').replaceChildren();
        message('records-status', 'Loading ' + views[view].name.toLowerCase() + '…');
        setLoading(true);
        try {
            const data = await request(views[view].endpoint);
            if (!state.authenticated || version !== state.version) return;
            if (!Array.isArray(data)) throw new Error('The server did not return a record list. No records can be displayed.');
            state.records = data;
            renderRecords();
        } catch (error) {
            if (version === state.version) message('records-status', error.message + ' Records are unavailable; this is not a zero-record result.', true);
        } finally {
            if (version === state.version) setLoading(false);
        }
    }
    function switchView(view) {
        if (state.rowBusy || !views[view] || !closeEditor()) return;
        state.view = view;
        byId('view-heading').textContent = views[view].name;
        byId('view-description').textContent = views[view].description;
        byId('record-search').value = '';
        fillStatuses(byId('record-filter'), views[view].statuses, true);
        document.querySelectorAll('[data-view]').forEach(button => {
            const active = button.dataset.view === view;
            button.setAttribute('aria-pressed', String(active));
            button.className = 'button' + (active ? '' : ' button-outline');
        });
        loadRecords();
    }
    function openEditor(record) {
        if (!closeEditor()) return;
        state.selected = record;
        const application = state.view === 'applications';
        const fields = application
            ? [['Name', record.name], ['Application reference', record.application_id || record.id], ['Role', record.job_title], ['Company', record.job_company], ['Mobile', record.mobile], ['Email', record.email], ['City', record.city], ['Qualification', record.qualification], ['Experience', record.experience], ['Received', formatDate(record.created_at)]]
            : [['Student', record.student_name], ['Enquiry reference', record.enquiry_id || record.id], ['Mobile', record.mobile], ['WhatsApp', record.whatsapp_number], ['Email', record.email], ['Qualification', record.qualification], ['Course', record.interested_course], ['Preferred college', record.preferred_college], ['Preferred city', record.preferred_city], ['Admission type', record.admission_type], ['Additional requirements', record.additional_requirements], ['Received', formatDate(record.created_at)]];
        const details = document.createDocumentFragment();
        fields.forEach(([label, value]) => {
            const group = node('div');
            group.append(node('dt', label, 'font-semibold'), node('dd', text(value), 'break-words whitespace-pre-wrap'));
            details.append(group);
        });
        byId('record-details').replaceChildren(details);
        byId('editor-heading').textContent = 'Review ' + text(record.name || record.student_name);
        fillStatuses(byId('record-status'), views[state.view].statuses, false);
        if (record.status && !views[state.view].statuses.includes(record.status)) {
            const legacy = new Option('Current: ' + record.status + ' (choose a supported status)', record.status);
            legacy.disabled = true;
            byId('record-status').prepend(legacy);
        }
        byId('record-status').value = record.status || views[state.view].statuses[0];
        byId('record-notes').value = record.notes || '';
        byId('resume-area').hidden = !application;
        byId('delete-button').hidden = application;
        byId('record-editor').hidden = false;
        message('editor-message', '');
        byId('editor-heading').focus();
        byId('record-editor').scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    async function signIn(event) {
        event.preventDefault();
        byId('login-button').disabled = true;
        message('login-error', '');
        try {
            await request('/api/admin/login', jsonRequest('POST', { username: byId('admin-username').value, password: byId('admin-password').value }));
            await request('/api/admin/session');
            byId('admin-password').value = '';
            state.authenticated = true;
            byId('login-panel').hidden = true;
            byId('workspace').hidden = false;
            byId('logout-button').hidden = false;
            message('session-status', 'Signed in. Candidate records are private.');
            switchView('applications');
        } catch (error) {
            byId('admin-password').value = '';
            message('login-error', error.message, true);
        } finally {
            byId('login-button').disabled = false;
        }
    }
    async function signOut() {
        if (state.rowBusy || (dirty() && !window.confirm('Discard unsaved changes and sign out?'))) return;
        byId('logout-button').disabled = true;
        try {
            await request('/api/admin/logout', { method: 'POST' });
            setSignedOut('Signed out.');
        } catch (error) {
            message('session-status', 'Sign-out could not be confirmed. ' + error.message + ' Try signing out again.', true);
        } finally { byId('logout-button').disabled = false; }
    }
    async function saveRecord(event) {
        event.preventDefault();
        if (!state.selected || state.rowBusy) return;
        const record = state.selected;
        const view = state.view;
        const status = byId('record-status').value;
        if (!views[view].statuses.includes(status)) return message('editor-message', 'Choose one of the supported statuses before saving.', true);
        const notes = byId('record-notes').value;
        const id = encodeURIComponent(record.id);
        const endpoint = view === 'applications' ? '/api/applications/' + id + '/status' : '/api/admin/admission-enquiries/' + id;
        setRowBusy(true);
        message('editor-message', 'Saving changes…');
        try {
            await request(endpoint, jsonRequest('PUT', { status, notes }));
            if (!state.authenticated) return;
            record.status = status;
            record.notes = notes;
            renderRecords();
            message('editor-message', 'Changes saved.');
        } catch (error) { message('editor-message', error.message, true); }
        finally { setRowBusy(false); }
    }
    async function deleteEnquiry() {
        if (!state.selected || state.view !== 'admissions' || state.rowBusy) return;
        const record = state.selected;
        if (!window.confirm('Permanently delete the admission enquiry for ' + text(record.student_name) + '? This cannot be undone.')) return;
        setRowBusy(true);
        try {
            await request('/api/admin/admission-enquiries/' + encodeURIComponent(record.id), { method: 'DELETE' });
            if (!state.authenticated) return;
            state.records = state.records.filter(item => item.id !== record.id);
            setRowBusy(false);
            closeEditor(false);
            renderRecords();
            message('records-status', 'Enquiry deleted. ' + state.records.length + ' records remain in this loaded list.');
        } catch (error) { message('editor-message', error.message, true); }
        finally { setRowBusy(false); }
    }
    async function downloadResume() {
        if (!state.selected || state.view !== 'applications' || state.rowBusy) return;
        const id = state.selected.application_id || state.selected.id;
        setRowBusy(true);
        message('editor-message', 'Requesting the private resume…');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch('/api/admin/applications/' + encodeURIComponent(id) + '/resume', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                if (response.status === 401) setSignedOut('Your session has expired. Sign in again.', true);
                throw new Error(error.error || 'The resume could not be downloaded (HTTP ' + response.status + ').');
            }
            const type = response.headers.get('Content-Type') || '';
            if (!/application\/(?:pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|octet-stream)/i.test(type)) throw new Error('The server did not return a supported resume file.');
            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);
            const link = node('a');
            const supplied = /filename="([^"]+)"/i.exec(response.headers.get('Content-Disposition') || '')?.[1];
            link.download = (supplied || 'resume-' + id + (type.includes('pdf') ? '.pdf' : type.includes('msword') ? '.doc' : '.docx')).replace(/[/\\\u0000-\u001f]/g, '_');
            link.href = objectURL;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
            message('editor-message', 'Resume download started. Handle candidate documents privately.');
        } catch (error) {
            message('editor-message', error.name === 'AbortError' ? 'The resume request timed out. Try again.' : error.message, true);
        } finally { clearTimeout(timer); setRowBusy(false); }
    }
    byId('login-form').addEventListener('submit', signIn);
    byId('logout-button').addEventListener('click', signOut);
    byId('refresh-button').addEventListener('click', loadRecords);
    byId('record-search').addEventListener('input', () => { if (state.records) renderRecords(); });
    byId('record-filter').addEventListener('change', () => { if (state.records) renderRecords(); });
    byId('close-editor').addEventListener('click', () => closeEditor());
    byId('record-form').addEventListener('submit', saveRecord);
    byId('delete-button').addEventListener('click', deleteEnquiry);
    byId('resume-button').addEventListener('click', downloadResume);
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    window.addEventListener('beforeunload', event => { if (dirty() || state.rowBusy) { event.preventDefault(); event.returnValue = ''; } });
    (async () => {
        try {
            await request('/api/admin/session');
            state.authenticated = true;
            byId('login-panel').hidden = true;
            byId('workspace').hidden = false;
            byId('logout-button').hidden = false;
            message('session-status', 'Signed in. Candidate records are private.');
            switchView('applications');
        } catch (error) {
            setSignedOut(error.status === 401 ? 'Sign in to view private records.' : error.message, error.status !== 401);
        }
    })();
})();
