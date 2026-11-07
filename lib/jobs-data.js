/* Shared, deterministic vacancy rules for the API, generated pages and browser. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PlanBJobs = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const INDUSTRIES = [
        ['it', 'IT & Software'], ['banking', 'Banking & Finance'], ['bpo', 'BPO & Customer Support'],
        ['healthcare', 'Healthcare & Medical'], ['education', 'Education & EdTech'],
        ['sales', 'Sales & Marketing'], ['retail', 'Retail & E-commerce'],
        ['logistics', 'Logistics & Supply Chain'], ['insurance', 'Insurance'],
        ['manufacturing', 'Manufacturing & Industrial'], ['hospitality', 'Hospitality & Tourism'],
        ['govt', 'Government & Competitive Exams'], ['dataentry', 'Data Entry & Back Office'],
        ['telecalling', 'Telecalling & Telesales'], ['other', 'Other Services']
    ].map(([id, name]) => ({ id, name }));
    const text = value => String(value == null ? '' : value);
    const escapeHtml = value => text(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    function createSlug(id, title) {
        return text(id) + '-' + (text(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'job');
    }
    function jobPath(job) { return '/job/' + createSlug(job.id, job.title); }
    function isRemote(job) { return /work\s*from\s*home|remote|telecommut/i.test([job.work_mode, job.location, job.type].join(' ')); }
    function isOpenJob(job, now) {
        if (!job || text(job.status).trim().toLowerCase() !== 'open') return false;
        if (job.publication_status && job.publication_status !== 'published') return false;
        const expiry = job.valid_through || job.validThrough;
        if (!expiry) return true;
        const date = Date.parse(expiry);
        return Number.isFinite(date) && date > (now == null ? Date.now() : new Date(now).getTime());
    }
    function getIndustryIds(job) {
        const supplied = Array.isArray(job.industry_ids) ? job.industry_ids : [job.industry_id || job.industry];
        const ids = supplied.map(value => INDUSTRIES.find(i => i.id === value || i.name.toLowerCase() === text(value).toLowerCase())).filter(Boolean).map(i => i.id);
        if (ids.length) return [...new Set(ids)];
        // Compatibility with historical records; inspect category/role labels, not arbitrary description digits.
        const labels = [job.title, ...(Array.isArray(job.categories) ? job.categories : [])].join(' ').toLowerCase();
        if (/customer support|chat|non.voice|bpo/.test(labels)) ids.push('bpo');
        if (/data entry|data annotation|back office|backend|barcode|data processing/.test(labels)) ids.push('dataentry');
        if (/telecall|telesales|collection|recharge/.test(labels)) ids.push('telecalling');
        if (/sales|business development/.test(labels)) ids.push('sales');
        if (/edtech|education|counsellor/.test(labels)) ids.push('education');
        if (/inventory/.test(labels)) ids.push('logistics');
        return ids.length ? [...new Set(ids)] : ['other'];
    }
    function getIndustry(job) { return INDUSTRIES.find(i => i.id === getIndustryIds(job)[0]).name; }
    function matchesIndustry(job, value) {
        if (!value || value === 'all') return true;
        const item = INDUSTRIES.find(i => i.id === value || i.name.toLowerCase() === text(value).toLowerCase());
        return !!item && getIndustryIds(job).includes(item.id);
    }
    function getExperience(job) {
        const level = text(job.experience_level).toLowerCase();
        const range = level.match(/(\d+)\s*[–—-]\s*(\d+)\s*years?/);
        const single = level.match(/(\d+)\s*\+?\s*years?/);
        const min = Number.isFinite(job.experience_min) ? job.experience_min : range ? Number(range[1]) : /fresher|no experience/.test(level) ? 0 : single ? Number(single[1]) : null;
        const max = Object.prototype.hasOwnProperty.call(job, 'experience_max') ? job.experience_max : range ? Number(range[2]) : null;
        const accepts = typeof job.accepts_freshers === 'boolean' ? job.accepts_freshers : min === 0;
        return { min, max, acceptsFreshers: accepts && (min == null || min === 0) };
    }
    function acceptsFreshers(job) { return getExperience(job).acceptsFreshers; }
    function getSalaryMonthlyMinMax(job) {
        const value = text(job.salary).toLowerCase();
        if (!value || /commission|performance.based|in.hand|ctc|after training/.test(value)) return null;
        const lpa = value.match(/^\s*([\d.]+)\s*lpa\s*$/);
        if (lpa) { const annual = Number(lpa[1]) * 100000; return { min: annual / 12, max: annual / 12, lpa: Number(lpa[1]), variable: false }; }
        const divisor = /(?:\/|per)\s*month/.test(value) ? 1 : /(?:\/|per)\s*year/.test(value) ? 12 : null;
        if (!divisor) return null;
        const numbers = value.match(/(?:₹|rs\.?\s*)?([\d,]+)\s*[–—-]\s*(?:₹|rs\.?\s*)?([\d,]+)/);
        if (numbers) {
            const min = Number(numbers[1].replace(/,/g, '')) / divisor, max = Number(numbers[2].replace(/,/g, '')) / divisor;
            return { min, max, lpa: max * 12 / 100000, variable: /incentive|after training/.test(value) };
        }
        const amount = value.match(/(?:₹|rs\.?)\s*([\d,]+)/);
        if (!amount) return null;
        const max = Number(amount[1].replace(/,/g, '')) / divisor;
        return { min: /up\s*to/.test(value) ? null : max, max, lpa: max * 12 / 100000, variable: /up\s*to|incentive/.test(value) };
    }
    function normalizeJob(job) {
        const ids = getIndustryIds(job), exp = getExperience(job);
        return { ...job, industry_id: ids[0], industry: getIndustry(job), industry_ids: ids,
            industries: ids.map(id => INDUSTRIES.find(i => i.id === id).name), accepts_freshers: exp.acceptsFreshers,
            slug: createSlug(job.id, job.title), url: jobPath(job), is_remote: isRemote(job) };
    }
    return { INDUSTRIES, normalizeJob, isOpenJob, isRemote, getIndustry, getIndustryIds, matchesIndustry,
        getExperience, acceptsFreshers, createSlug, jobPath, getSalaryMonthlyMinMax, escapeHtml };
}));
