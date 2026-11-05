require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

let db;
try {
    if (process.env.VERCEL) throw new Error('Running on Vercel Serverless (read-only), using mock DB');
    db = require('./database');
} catch (e) {
    console.warn("Mocking Database:", e.message);
    db = {
        get: (q, p, cb) => {
            if (typeof p === 'function') { cb = p; p = []; }
            if (q.includes('settings')) return cb(null, { value: '1250' });
            if (q.includes('COUNT(*)')) return cb(null, { count: 1250 });
            cb(null, null);
        },
        all: (q, p, cb) => {
            if (typeof p === 'function') { cb = p; p = []; }
            if (q.includes('activity_feed')) return cb(null, [
                { action_type: 'verified', description: 'Vikram R. completed verification', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { action_type: 'placed', description: 'Rahul S. secured a role at Tech Mahindra', timestamp: new Date(Date.now() - 86400000).toISOString() }
            ]);
            if (q.includes('jobs')) return cb(null, []);
            cb(null, []);
        },
        run: (q, p, cb) => {
            if (typeof p === 'function') cb = p;
            if (cb) cb(null);
        }
    };
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretplanbkey2026';

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for inline scripts/styles if any
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: "Too many requests" });
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // Serve all HTML/CSS static files from root

// ----------------------------------------------------
// SEO, LLMS & INDEXNOW CLEAN URL ROUTES
// ----------------------------------------------------
app.get('/7f2e1a498b3c419fa82b5e90d12e847c.txt', (req, res) => {
    res.type('text/plain').send('7f2e1a498b3c419fa82b5e90d12e847c');
});

app.get('/llms.txt', (req, res) => {
    const p = path.join(__dirname, 'llms.txt');
    if (fs.existsSync(p)) res.type('text/plain; charset=UTF-8').sendFile(p);
    else res.status(404).send('Not found');
});

app.get('/llms-full.txt', (req, res) => {
    const p = path.join(__dirname, 'llms-full.txt');
    if (fs.existsSync(p)) res.type('text/plain; charset=UTF-8').sendFile(p);
    else res.status(404).send('Not found');
});

// Clean URLs for leaf jobs: /job/:identifier
app.get('/job/:identifier', (req, res, next) => {
    let id = req.params.identifier;
    if (id.endsWith('.html')) return next();
    
    const fileWithHtml = path.join(__dirname, 'job', `${id}.html`);
    if (fs.existsSync(fileWithHtml)) {
        return res.sendFile(fileWithHtml);
    }
    
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
        const directIdFile = path.join(__dirname, 'job', `${numId}.html`);
        if (fs.existsSync(directIdFile)) {
            return res.sendFile(directIdFile);
        }
    }
    next();
});

// Clean URLs for job categories: /jobs/:category
app.get('/jobs/:cat', (req, res, next) => {
    let cat = req.params.cat;
    if (cat.endsWith('.html')) return next();

    const catFile = path.join(__dirname, 'jobs', `${cat}.html`);
    if (fs.existsSync(catFile)) {
        return res.sendFile(catFile);
    }
    next();
});

// IndexNow Submission Endpoint
app.post('/api/indexnow/submit', async (req, res) => {
    const { urls } = req.body;
    const host = 'planbcareers.in';
    const key = '7f2e1a498b3c419fa82b5e90d12e847c';
    const payload = {
        host: host,
        key: key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: Array.isArray(urls) && urls.length > 0 ? urls : [`https://${host}/`]
    };
    try {
        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload)
        });
        res.json({ success: true, status: response.status, count: payload.urlList.length });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Multer setup for uploads (Memory storage ensures serverless platforms like Vercel never crash on read-only disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB resume file limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/octet-stream'
        ];
        if (allowedExtensions.includes(ext) && (allowedMimeTypes.includes(file.mimetype) || ext === '.docx' || ext === '.doc')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Only PDF, DOC, and DOCX files up to 5MB are accepted.'));
        }
    }
});

// ----------------------------------------------------
// AUTH API
// ----------------------------------------------------
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE username = ?", [username], (err, admin) => {
        if (err || !admin) return res.status(401).json({ error: 'Invalid credentials' });
        
        if (bcrypt.compareSync(password, admin.password)) {
            const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token, message: 'Logged in successfully' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.adminId = decoded.id;
        next();
    });
};

// ----------------------------------------------------
// STATS / LIVE COUNTERS API
// ----------------------------------------------------
app.get('/api/stats', (req, res) => {
    // Record hit
    const today = new Date().toISOString().split('T')[0];
    db.run("INSERT INTO traffic (date, views) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET views = views + 1", [today]);

    db.get("SELECT (SELECT COUNT(*) FROM jobs WHERE status='Open') as open_jobs, (SELECT COUNT(*) FROM applications) as apps", (err, counts) => {
        db.all("SELECT key, value FROM settings WHERE key IN ('candidates_placed', 'companies_hiring')", (err, settings) => {
            const openJobs = counts && counts.open_jobs ? counts.open_jobs : 0;
            const appsCount = counts && counts.apps ? counts.apps : 0;
            const data = { jobsAvailable: openJobs, applicationsReceived: appsCount };
            if (settings && Array.isArray(settings)) {
                settings.forEach(s => data[s.key] = s.value);
            }
            res.json(data);
        });
    });
});

app.get('/api/analytics', verifyToken, (req, res) => {
    db.all("SELECT * FROM traffic ORDER BY date DESC LIMIT 7", (err, traffic) => {
        db.all("SELECT status, COUNT(*) as count FROM applications GROUP BY status", (err, appStats) => {
            res.json({ traffic, appStats });
        });
    });
});

// ----------------------------------------------------
// JOBS API
// ----------------------------------------------------
app.get('/api/jobs', (req, res) => {
    db.all("SELECT * FROM jobs ORDER BY id DESC", (err, rows) => {
        let fallbackJobs = [];
        try {
            delete require.cache[require.resolve('./jobs.json')];
            fallbackJobs = require('./jobs.json');
        } catch(e) {}

        if (err || !rows || rows.length === 0) {
            return res.json(fallbackJobs);
        }

        try {
            const jobMap = new Map(fallbackJobs.map(j => [j.id, j]));
            const enriched = rows.map(r => {
                const base = jobMap.get(r.id) || {};
                let cats = base.categories;
                if (r.categories) {
                    try { cats = JSON.parse(r.categories); } catch(e) { cats = [r.categories]; }
                }
                return {
                    ...base,
                    ...r,
                    categories: cats || base.categories || ["Other Opportunities"],
                    work_mode: r.work_mode || base.work_mode || (r.location && r.location.toLowerCase().includes('home') ? "Work From Home" : "Work From Office"),
                    experience_level: r.experience_level || base.experience_level || "Fresher",
                    qualification: r.qualification || base.qualification || "12th Pass / Graduate",
                    languages: r.languages || base.languages || "Hindi / English",
                    shifts: r.shifts || base.shifts || "Standard Shifts",
                    last_updated: r.last_updated || base.last_updated || "2026-10-25",
                    verified: true
                };
            });
            res.json(enriched);
        } catch(e) {
            res.json(fallbackJobs.length > 0 ? fallbackJobs : rows);
        }
    });
});

app.post('/api/jobs', verifyToken, (req, res) => {
    const { 
        title, company, location, salary, type, description, 
        industry, min_salary, max_salary, salary_period, salary_type,
        categories, work_mode, experience_level, qualification, shifts, languages 
    } = req.body;

    const catsJson = Array.isArray(categories) ? JSON.stringify(categories) : (categories || null);

    db.run(`INSERT INTO jobs (
        title, company, location, salary, type, description,
        industry, min_salary, max_salary, salary_period, salary_type,
        categories, work_mode, experience_level, qualification, shifts, languages
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            title, company, location, salary, type, description,
            industry || 'BPO & Customer Support', 
            min_salary || null, max_salary || null, 
            salary_period || 'monthly', salary_type || 'Fixed',
            catsJson, work_mode || 'Work From Office', 
            experience_level || 'Fresher', qualification || 'Graduate',
            shifts || 'Day Shift', languages || 'Hindi / English'
        ], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, message: 'Job created successfully' });
    });
});

app.put('/api/jobs/:id', verifyToken, (req, res) => {
    const { 
        title, company, location, salary, type, description, status,
        industry, min_salary, max_salary, salary_period, salary_type,
        categories, work_mode, experience_level, qualification, shifts, languages 
    } = req.body;

    const catsJson = Array.isArray(categories) ? JSON.stringify(categories) : (categories || null);

    db.run(`UPDATE jobs SET 
        title=?, company=?, location=?, salary=?, type=?, description=?, status=?,
        industry=?, min_salary=?, max_salary=?, salary_period=?, salary_type=?,
        categories=?, work_mode=?, experience_level=?, qualification=?, shifts=?, languages=?
        WHERE id=?`,
        [
            title, company, location, salary, type, description, status,
            industry, min_salary || null, max_salary || null, 
            salary_period || 'monthly', salary_type || 'Fixed',
            catsJson, work_mode, experience_level, qualification, shifts, languages,
            req.params.id
        ], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ message: 'Job updated successfully' });
    });
});

app.delete('/api/jobs/:id', verifyToken, (req, res) => {
    db.run("DELETE FROM jobs WHERE id=?", [req.params.id], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Job deleted' });
    });
});

// ----------------------------------------------------
// MULTI-INDUSTRY CATEGORIES API
// ----------------------------------------------------
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories WHERE status = 'Active' ORDER BY display_order ASC, id ASC", (err, rows) => {
        const defaultCats = [
            { id: 1, name: "IT & Software", icon: "code-2", display_order: 1 },
            { id: 2, name: "Banking & Finance", icon: "landmark", display_order: 2 },
            { id: 3, name: "BPO & Customer Support", icon: "headset", display_order: 3 },
            { id: 4, name: "Healthcare & Medical", icon: "stethoscope", display_order: 4 },
            { id: 5, name: "Education & EdTech", icon: "graduation-cap", display_order: 5 },
            { id: 6, name: "Sales & Marketing", icon: "trending-up", display_order: 6 },
            { id: 7, name: "Retail & E-commerce", icon: "shopping-bag", display_order: 7 },
            { id: 8, name: "Logistics & Supply Chain", icon: "truck", display_order: 8 },
            { id: 9, name: "Insurance", icon: "shield", display_order: 9 },
            { id: 10, name: "Manufacturing & Industrial", icon: "factory", display_order: 10 },
            { id: 11, name: "Hospitality & Tourism", icon: "utensils", display_order: 11 },
            { id: 12, name: "Government & Competitive Exams", icon: "award", display_order: 12 },
            { id: 13, name: "Data Entry & Back Office", icon: "file-spreadsheet", display_order: 13 },
            { id: 14, name: "Telecalling & Telesales", icon: "phone-call", display_order: 14 },
            { id: 15, name: "Other Services", icon: "layers", display_order: 15 }
        ];

        if (err || !rows || rows.length === 0) {
            return res.json(defaultCats);
        }
        res.json(rows);
    });
});

app.post('/api/admin/categories', verifyToken, (req, res) => {
    const { name, icon, display_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    db.run("INSERT INTO categories (name, icon, display_order, status) VALUES (?, ?, ?, 'Active')",
        [name.trim(), icon || 'briefcase', display_order || 0], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Category created successfully' });
    });
});

// ----------------------------------------------------
// PAID SERVICES API
// ----------------------------------------------------
app.get('/api/paid-services', (req, res) => {
    db.all("SELECT * FROM paid_services WHERE status = 'Active' ORDER BY display_order ASC", (err, rows) => {
        const defaultServices = [
            {
                id: 1,
                title: "Professional Resume Creation",
                price_display: "₹300",
                price_numeric: 300,
                short_desc: "Recruiter-approved ATS compliant resume drafted by recruitment specialists.",
                features: ["ATS-friendly formatting", "Keyword optimization for target industry", "Delivered in PDF & editable Word format", "Turnaround within 24-48 hours"],
                enquiry_tag: "Resume-Creation-300"
            },
            {
                id: 2,
                title: "Mock Interview Preparation",
                price_display: "₹500",
                price_numeric: 500,
                short_desc: "1-on-1 personalized interview coaching session with senior HR recruiters.",
                features: ["30-minute structured mock interview", "Detailed communication & body language feedback", "Industry-specific question & answer drills", "Confidence building & salary negotiation tips"],
                enquiry_tag: "Mock-Interview-500"
            },
            {
                id: 3,
                title: "Company Interview Arrangement",
                price_display: "₹1,500 (2 Interviews)",
                price_numeric: 1500,
                short_desc: "Guaranteed interview scheduling with 2 verified corporate hiring clients.",
                features: ["Direct coordination with employer HR desks", "Confirmed interview slot booking", "Pre-interview company dossier & briefing", "Dedicated post-interview feedback follow-up"],
                enquiry_tag: "Company-Interviews-1500"
            },
            {
                id: 4,
                title: "Placement Assistance Package",
                price_display: "₹6,000 – ₹10,000",
                price_numeric: 6000,
                short_desc: "Comprehensive end-to-end placement guidance and dedicated career mentoring.",
                features: ["Priority profile presentation to client partners", "Unlimited interview coordination until placement", "Personalized career roadmap & grooming", "Offer letter evaluation & joining guidance"],
                enquiry_tag: "Placement-Assistance-Pkg"
            }
        ];

        if (err || !rows || rows.length === 0) {
            return res.json(defaultServices);
        }

        const formatted = rows.map(r => {
            let parsedFeatures = [];
            try { parsedFeatures = JSON.parse(r.features); } catch(e) { parsedFeatures = [r.features]; }
            return { ...r, features: parsedFeatures };
        });
        res.json(formatted);
    });
});

app.put('/api/admin/paid-services/:id', verifyToken, (req, res) => {
    const { title, price_display, price_numeric, short_desc, features, status } = req.body;
    const featStr = Array.isArray(features) ? JSON.stringify(features) : features;
    db.run("UPDATE paid_services SET title=?, price_display=?, price_numeric=?, short_desc=?, features=?, status=? WHERE id=?",
        [title, price_display, price_numeric, short_desc, featStr, status || 'Active', req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Service updated successfully' });
    });
});

// ----------------------------------------------------
// NATIVE ADMISSION ENQUIRIES API
// ----------------------------------------------------
app.post('/api/admission-enquiries', (req, res) => {
    const {
        student_name,
        mobile,
        whatsapp_number,
        email,
        qualification,
        interested_course,
        preferred_college,
        preferred_city,
        admission_type,
        additional_requirements
    } = req.body;

    if (!student_name || !mobile) {
        return res.status(400).json({ error: 'Student name and contact mobile are required.' });
    }

    db.run(`INSERT INTO admission_enquiries (
        student_name, mobile, whatsapp_number, email, qualification,
        interested_course, preferred_college, preferred_city, admission_type,
        additional_requirements, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')`,
        [
            student_name.trim(),
            mobile.trim(),
            (whatsapp_number || mobile).trim(),
            (email || '').trim(),
            (qualification || '').trim(),
            (interested_course || '').trim(),
            (preferred_college || '').trim(),
            (preferred_city || '').trim(),
            (admission_type || 'Merit / Counselling').trim(),
            (additional_requirements || '').trim()
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Build WhatsApp confirmation link
            const waNumber = (whatsapp_number || mobile).replace(/\D/g, '');
            const adminNotifyText = `*New Admission Enquiry - Plan B Careers*%0A%0A*Student:* ${encodeURIComponent(student_name)}%0A*Mobile:* ${encodeURIComponent(mobile)}%0A*Course:* ${encodeURIComponent(interested_course || 'Not specified')}%0A*City:* ${encodeURIComponent(preferred_city || 'Not specified')}%0A*Type:* ${encodeURIComponent(admission_type || 'General')}`;

            res.json({
                success: true,
                id: this.lastID,
                message: 'Enquiry submitted successfully. Our admission advisor will contact you.',
                admin_whatsapp_link: `https://wa.me/919420512501?text=${adminNotifyText}`
            });
    });
});

app.get('/api/admin/admission-enquiries', verifyToken, (req, res) => {
    db.all("SELECT * FROM admission_enquiries ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.put('/api/admin/admission-enquiries/:id', verifyToken, (req, res) => {
    const { status, notes } = req.body;
    db.run("UPDATE admission_enquiries SET status = ?, notes = ? WHERE id = ?",
        [status, notes, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Enquiry status updated' });
    });
});

app.delete('/api/admin/admission-enquiries/:id', verifyToken, (req, res) => {
    db.run("DELETE FROM admission_enquiries WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Enquiry deleted' });
    });
});

// ----------------------------------------------------
// APPLICATIONS API
// ----------------------------------------------------
app.get('/api/applications', verifyToken, (req, res) => {
    db.all("SELECT a.*, j.title as job_title, j.company as job_company FROM applications a LEFT JOIN jobs j ON a.job_id = j.id ORDER BY a.id DESC", (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// ----------------------------------------------------
// RESUME CLOUD STORAGE HELPER (Permanent public view/download link)
// ----------------------------------------------------
async function uploadResumeToCloud(file) {
    if (!file || !file.buffer) return null;
    const originalName = (file.originalname || 'resume.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const isPdf = /\.pdf$/i.test(originalName);

    // 1. If PDF, try Catbox for direct raw PDF URL
    if (isPdf) {
        try {
            const fd = new FormData();
            fd.append('reqtype', 'fileupload');
            fd.append('fileToUpload', new Blob([file.buffer], { type: 'application/pdf' }), originalName);
            const res = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                body: fd,
                signal: AbortSignal.timeout(5000)
            }).then(r => r.text());
            if (res && res.startsWith('http')) {
                return res.trim();
            }
        } catch (e) {
            console.warn('Catbox upload fallback:', e.message);
        }
    }

    // 2. Gofile (supports all formats: PDF, DOC, DOCX)
    try {
        const serversRes = await fetch('https://api.gofile.io/servers', { signal: AbortSignal.timeout(4000) }).then(r => r.json());
        const server = serversRes?.data?.servers?.[0]?.name;
        if (server) {
            const fd = new FormData();
            fd.append('file', new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' }), originalName);
            const res = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
                method: 'POST',
                body: fd,
                signal: AbortSignal.timeout(6000)
            }).then(r => r.json());
            if (res?.data?.downloadPage) {
                return res.data.downloadPage;
            }
        }
    } catch (e) {
        console.warn('Gofile upload fallback:', e.message);
    }

    return null;
}

// ----------------------------------------------------
// GOOGLE APPS SCRIPT / DRIVE / SHEETS INTEGRATION
// ----------------------------------------------------
async function submitToGoogleAppsScript(payload) {
    const scriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyl27R8Lr_T7hqpsX3y2R0KqM7DVFjc5E6kt_lAce5f5vPmXrKCA_UsVpDgCBYr9XndvQ/exec').trim();
    const scriptSecret = (process.env.GOOGLE_APPS_SCRIPT_SECRET || '').trim();

    if (!scriptSecret) {
        console.warn('⚠️ GOOGLE_APPS_SCRIPT_SECRET is not configured in environment variables.');
        return {
            configured: false,
            success: false,
            error: 'GOOGLE_APPS_SCRIPT_SECRET not configured'
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for Drive upload + Sheets append

        // Exact payload schema required by existing Apps Script contract:
        // { secret, applicationId, name, whatsapp, email, city, state, qualification, experience, experienceYears, role, resumeFileName, resumeBase64 }
        const requestBody = {
            secret: scriptSecret,
            applicationId: payload.applicationId,
            name: payload.name,
            whatsapp: payload.whatsapp,
            email: payload.email,
            city: payload.city,
            state: payload.state,
            qualification: payload.qualification,
            experience: payload.experience,
            experienceYears: payload.experienceYears,
            role: payload.role,
            resumeFileName: payload.resumeFileName || '',
            resumeBase64: payload.resumeBase64 || ''
        };

        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`Google Apps Script HTTP ${response.status}:`, errText);
            return {
                configured: true,
                success: false,
                error: `Google Apps Script returned HTTP ${response.status}`
            };
        }

        const data = await response.json();
        return {
            configured: true,
            success: Boolean(data && data.success),
            duplicate: Boolean(data && data.duplicate),
            applicationId: data?.applicationId || payload.applicationId,
            resumeName: data?.resumeName || payload.resumeFileName || null,
            resumeUrl: data?.resumeUrl || null,
            message: data?.message || (data?.success ? 'Application recorded in Google Sheets & Drive' : 'Unknown error from Apps Script'),
            rawError: data?.error || null
        };
    } catch (err) {
        console.error('Google Apps Script request error:', err.message);
        return {
            configured: true,
            success: false,
            error: err.name === 'AbortError' ? 'Google Apps Script connection timed out after 20 seconds.' : err.message
        };
    }
}

// ----------------------------------------------------
// ADMIN NOTIFICATION EMAIL WITH ATTACHED RESUME
// ----------------------------------------------------
async function sendAdminApplicationEmail(candidateData, resumeFile, resumeUrl, applicationId) {
    const adminRecipient = (process.env.ADMIN_EMAIL || 'contact.planbcareers@gmail.com').trim();
    const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || 'contact.planbcareers@gmail.com').trim();
    const smtpPass = (process.env.GMAIL_PASS || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

    if (!smtpPass) {
        console.warn('⚠️ Admin email not dispatched: GMAIL_PASS / SMTP_PASS app password not set in environment variables.');
        return { success: false, reason: 'GMAIL_PASS / SMTP_PASS not set' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '465', 10),
            secure: true,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        const role = candidateData.preferred_company || candidateData.job_title || 'General Job Application';
        const rawMobile = (candidateData.mobile || '').replace(/\D/g, '');
        const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
        const waLink = `https://wa.me/91${cleanMobile}`;
        const appIdDisplay = applicationId || 'NEW';

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 24px 30px; text-align: left; }
            .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #ffffff; }
            .header p { margin: 0; color: #c7d2fe; font-size: 13px; }
            .content { padding: 30px; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; padding: 4px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
            .table-details { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .table-details td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
            .table-details td.label { font-weight: 600; color: #6b7280; width: 38%; }
            .table-details td.value { color: #111827; font-weight: 500; }
            .actions { margin: 25px 0; }
            .btn { display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; text-align: center; margin-right: 10px; margin-bottom: 10px; }
            .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 New Job Application & Resume</h1>
              <p>Plan B Careers Application Portal (planbcareers.in)</p>
            </div>
            <div class="content">
              <span class="badge">Candidate Applied via Website</span>
              <table class="table-details">
                <tr><td class="label">🆔 Application ID</td><td class="value"><strong style="color:#4f46e5;font-family:monospace;font-size:15px;">${appIdDisplay}</strong></td></tr>
                <tr><td class="label">👤 Candidate Name</td><td class="value"><strong>${candidateData.name || 'Not provided'}</strong></td></tr>
                <tr><td class="label">📱 WhatsApp / Mobile</td><td class="value"><a href="${waLink}" style="color:#2563eb;font-weight:bold;text-decoration:none;">+91 ${cleanMobile}</a></td></tr>
                <tr><td class="label">📧 Email</td><td class="value">${candidateData.email ? `<a href="mailto:${candidateData.email}">${candidateData.email}</a>` : 'Not provided'}</td></tr>
                <tr><td class="label">📍 City / Location</td><td class="value">${candidateData.city || 'Not provided'}</td></tr>
                <tr><td class="label">🎓 Qualification</td><td class="value">${candidateData.qualification || 'Not provided'}</td></tr>
                <tr><td class="label">💼 Experience</td><td class="value">${candidateData.experience || 'Not provided'}</td></tr>
                <tr><td class="label">🎯 Role Applied</td><td class="value"><strong>${role}</strong></td></tr>
                <tr><td class="label">📄 Resume Document</td><td class="value">${resumeUrl ? `<a href="${resumeUrl}" style="color:#059669;font-weight:700;text-decoration:none;" target="_blank">Google Drive Document ↗</a>` : (resumeFile ? `Attached (${resumeFile.originalname})` : 'No document attached')}</td></tr>
              </table>

              <div class="actions">
                <a href="${waLink}" class="btn" style="background:#25D366;color:#ffffff;display:inline-block;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:10px;">
                  💬 Chat on WhatsApp (+91 ${cleanMobile})
                </a>
                ${resumeUrl ? `
                <a href="${resumeUrl}" class="btn" style="background:#059669;color:#ffffff;display:inline-block;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                  📁 View Resume on Google Drive
                </a>` : ''}
              </div>

              ${resumeUrl ? `<p style="font-size:12px;color:#059669;margin-top:15px;word-break:break-all;"><strong>Google Drive Link:</strong> <a href="${resumeUrl}" target="_blank" style="color:#059669;">${resumeUrl}</a></p>` : ''}
              ${resumeFile ? `<p style="font-size:12px;color:#4f46e5;margin-top:10px;">📎 <strong>The original candidate resume (${resumeFile.originalname}) is also attached directly to this email.</strong></p>` : ''}
            </div>
            <div class="footer">
              Plan B Careers • Akola, Maharashtra • <a href="https://planbcareers.in" style="color:#6b7280;">planbcareers.in</a><br>
              Delivered to: ${adminRecipient}
            </div>
          </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"Plan B Careers Applications" <${smtpUser}>`,
            to: adminRecipient,
            subject: `📄 New Job Application [${appIdDisplay}]: ${candidateData.name || 'Candidate'} - ${role}`,
            text: [
                `New Job Application received via planbcareers.in:`,
                ``,
                `🆔 Application ID: ${appIdDisplay}`,
                `👤 Name: ${candidateData.name}`,
                `📱 WhatsApp / Mobile: +91 ${cleanMobile}`,
                `📧 Email: ${candidateData.email || 'Not provided'}`,
                `📍 City: ${candidateData.city || 'Not provided'}`,
                `🎓 Qualification: ${candidateData.qualification || 'Not provided'}`,
                `💼 Experience: ${candidateData.experience || 'Not provided'}`,
                `🎯 Applied For: ${role}`,
                resumeUrl ? `🔗 Google Drive Resume Link: ${resumeUrl}` : '',
                ``,
                `Direct WhatsApp Chat: ${waLink}`,
                ``,
                resumeFile ? `Resume document (${resumeFile.originalname}) is attached directly to this email.` : ''
            ].filter(Boolean).join('\n'),
            html: htmlContent,
            attachments: []
        };

        if (resumeFile && resumeFile.buffer) {
            mailOptions.attachments.push({
                filename: resumeFile.originalname || 'candidate-resume.pdf',
                content: resumeFile.buffer
            });
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Admin application email sent successfully to:', adminRecipient, 'MessageId:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('❌ Admin application email error:', err.message);
        return { success: false, error: err.message };
    }
}

app.get('/api/admin/test-email', async (req, res) => {
    const adminRecipient = (process.env.ADMIN_EMAIL || 'contact.planbcareers@gmail.com').trim();
    const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || 'contact.planbcareers@gmail.com').trim();
    const smtpPass = (process.env.GMAIL_PASS || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

    if (!smtpPass) {
        return res.json({
            status: 'unconfigured',
            recipient: adminRecipient,
            sender: smtpUser,
            message: 'GMAIL_PASS / SMTP_PASS is not configured in Vercel environment variables yet.',
            help: 'Generate a 16-character Google App Password at https://myaccount.google.com/apppasswords and add GMAIL_PASS (and GMAIL_USER) in Vercel settings.'
        });
    }

    try {
        const result = await sendAdminApplicationEmail(
            {
                name: 'Test Candidate (Plan B Verification)',
                mobile: '9420512501',
                email: 'test@planbcareers.in',
                city: 'Akola',
                qualification: 'Graduate',
                experience: 'Fresher',
                preferred_company: 'Software Test Role'
            },
            {
                originalname: 'sample-test-resume.pdf',
                buffer: Buffer.from('%PDF-1.4 Sample Test Resume from Plan B Careers')
            },
            'https://planbcareers.in'
        );
        return res.json({ status: result.success ? 'sent' : 'failed', result });
    } catch (e) {
        return res.status(500).json({ status: 'error', error: e.message });
    }
});

// In-flight application submission map to prevent duplicate executions from fast double clicks
const inFlightApplications = new Map();

app.post('/api/applications', (req, res) => {
    try {
        upload.single('resume')(req, res, async (uploadErr) => {
            try {
                if (uploadErr) {
                    if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            success: false,
                            error: 'Resume file size exceeds the 5MB limit. Please upload a PDF, DOC, or DOCX up to 5MB.'
                        });
                    }
                    return res.status(400).json({
                        success: false,
                        error: uploadErr.message || 'File upload error.'
                    });
                }

                // 1. Mandatory Resume Document Validation
                if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Resume document is required. Please upload your resume in PDF, DOC, or DOCX format (up to 5MB).'
                    });
                }

                const { job_id, name, mobile, email, city, state, qualification, experience, preferred_company } = req.body || {};

                const applicantName = (name || '').trim();
                const rawMobile = (mobile || '').replace(/\D/g, '');
                const applicantMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
                const applicantEmail = (email || '').trim();
                const applicantCity = (city || '').trim();
                const applicantState = (state || 'Maharashtra').trim();
                const applicantQual = (qualification || 'Graduate').trim();
                const applicantExp = (experience || 'Fresher').trim();
                const role = (preferred_company || req.body.role || req.body.job_title || 'General Job Application').trim();

                if (!applicantName || !applicantMobile) {
                    return res.status(400).json({
                        success: false,
                        error: 'Full name and WhatsApp / mobile number are required.'
                    });
                }

                // 2. Reliable Idempotency - Reuse client Application ID on retries / double-clicks
                const clientAppId = (req.body.application_id || req.body.applicationId || req.headers['x-idempotency-key'] || '').trim();
                let applicationId;
                if (clientAppId && /^PB-\d{8}-[A-Za-z0-9_-]{4,12}$/i.test(clientAppId)) {
                    applicationId = clientAppId.toUpperCase();
                } else {
                    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    const randPart = Math.floor(1000 + Math.random() * 9000);
                    applicationId = `PB-${datePart}-${randPart}`;
                }

                // 3. Deduplication Check - Handle fast concurrent double-clicks
                if (inFlightApplications.has(applicationId)) {
                    console.log('⏳ In-flight submission detected for', applicationId, '- waiting for original execution...');
                    try {
                        const inFlightResponse = await inFlightApplications.get(applicationId);
                        return res.json(inFlightResponse);
                    } catch (waitErr) {
                        return res.status(500).json({ success: false, error: waitErr.message });
                    }
                }

                // 4. Database Check - Check if this Application ID was already successfully recorded
                const existingApp = await new Promise((resolve) => {
                    if (db && typeof db.get === 'function') {
                        db.get("SELECT * FROM applications WHERE application_id = ?", [applicationId], (err, row) => {
                            if (err) resolve(null);
                            else resolve(row);
                        });
                    } else {
                        resolve(null);
                    }
                });

                if (existingApp && existingApp.resume_url) {
                    console.log('🔄 Application already processed previously for ID:', applicationId);
                    return res.json({
                        success: true,
                        duplicate: true,
                        applicationId,
                        application_id: applicationId,
                        resume_url: existingApp.resume_url,
                        message: 'Application already received and recorded.'
                    });
                }

                // 5. Parse experience years
                let experienceYears = "0";
                const expMatch = applicantExp.match(/\d+/);
                if (expMatch) experienceYears = expMatch[0];

                // 6. Resume Base64 and clean filename
                const ext = path.extname(req.file.originalname || '').toLowerCase() || '.pdf';
                const safeName = applicantName.replace(/[^a-zA-Z0-9]/g, '_');
                const resumeFileName = `${safeName}_${applicationId}_Resume${ext}`;
                const resumeBase64 = req.file.buffer.toString('base64');

                // Helper to perform the actual submission and cache in inFlightApplications
                const executeSubmission = async () => {
                    let cloud_resume_url = null;
                    let isDuplicate = false;

                    const gasResult = await submitToGoogleAppsScript({
                        applicationId,
                        name: applicantName,
                        whatsapp: applicantMobile,
                        email: applicantEmail,
                        city: applicantCity,
                        state: applicantState,
                        qualification: applicantQual,
                        experience: applicantExp,
                        experienceYears: String(experienceYears),
                        role,
                        resumeFileName,
                        resumeBase64
                    });

                    if (gasResult.configured) {
                        if (!gasResult.success) {
                            console.error('❌ Google Apps Script submission failed:', gasResult.error || gasResult.rawError);
                            throw new Error(gasResult.rawError || gasResult.error || 'Failed to submit application to Google storage. Please try again.');
                        }

                        cloud_resume_url = gasResult.resumeUrl;
                        isDuplicate = Boolean(gasResult.duplicate);

                        if (!cloud_resume_url) {
                            console.error('❌ Google Apps Script did not return a confirmed Google Drive resume URL for', applicationId);
                            throw new Error('Google storage did not return a confirmed Google Drive resume URL. Please try again.');
                        }

                        if (isDuplicate) {
                            console.log('ℹ️ Google Apps Script returned duplicate for', applicationId, 'Returning existing Drive URL:', cloud_resume_url);
                        } else {
                            console.log('✅ Application stored in Google Sheets & Drive:', applicationId, 'Resume:', cloud_resume_url);
                        }
                    } else {
                        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                            throw new Error('Google Apps Script storage is not configured. Please configure GOOGLE_APPS_SCRIPT_SECRET in Vercel environment variables.');
                        }
                        console.warn('⚠️ Google Apps Script secret not configured locally (saving to local database only).');
                        cloud_resume_url = cloud_resume_url || `https://drive.google.com/file/d/local-mock-${applicationId}/view?usp=drivesdk`;
                    }

                    // Save to SQLite DB safely - NEVER use INSERT OR REPLACE to protect existing candidate records
                    if (db && typeof db.run === 'function') {
                        await new Promise((resolve) => {
                            if (existingApp) {
                                // Already in SQLite - preserve without touching
                                return resolve();
                            }
                            db.run(`INSERT OR IGNORE INTO applications (application_id, job_id, name, mobile, email, city, qualification, experience, resume_url)
                                    VALUES (?,?,?,?,?,?,?,?,?)`,
                                [applicationId, job_id || null, applicantName, applicantMobile, applicantEmail, applicantCity, applicantQual, applicantExp, cloud_resume_url || req.file.originalname],
                                (err) => {
                                    if (err) console.warn('DB application insert warning:', err.message);
                                    resolve();
                                }
                            );
                        });
                    }

                    // Only send Admin Notification Email for NEW applications (not duplicates)
                    if (!isDuplicate) {
                        sendAdminApplicationEmail(
                            { name: applicantName, mobile: applicantMobile, email: applicantEmail, city: applicantCity, qualification: applicantQual, experience: applicantExp, preferred_company: role },
                            req.file,
                            cloud_resume_url,
                            applicationId
                        ).then(info => {
                            if (info && info.success) console.log('Admin email notification sent for', applicationId);
                        }).catch(mailErr => {
                            console.warn('Admin email dispatch warning:', mailErr.message);
                        });

                        // Candidate confirmation email
                        if (applicantEmail && (process.env.SMTP_PASS || process.env.GMAIL_PASS)) {
                            try {
                                sendConfirmationEmail(applicantEmail, applicantName);
                            } catch (mailErr) {
                                console.warn('Confirmation email warning:', mailErr.message);
                            }
                        }
                    }

                    return {
                        success: true,
                        duplicate: isDuplicate,
                        applicationId,
                        application_id: applicationId,
                        resume_url: cloud_resume_url,
                        message: isDuplicate ? (gasResult.message || 'Application already recorded in Google Drive & Sheets.') : (gasResult.message || 'Application submitted successfully')
                    };
                };

                // Register in-flight promise
                const executionPromise = executeSubmission();
                inFlightApplications.set(applicationId, executionPromise);

                try {
                    const result = await executionPromise;
                    return res.json(result);
                } catch (subErr) {
                    return res.status(502).json({
                        success: false,
                        error: subErr.message || 'Failed to record application'
                    });
                } finally {
                    inFlightApplications.delete(applicationId);
                }

            } catch (innerErr) {
                console.error('Error handling application submission inner:', innerErr);
                return res.status(500).json({
                    success: false,
                    error: innerErr.message || 'Internal server error while processing application'
                });
            }
        });
    } catch (outerErr) {
        console.error('Error handling application submission outer:', outerErr);
        return res.status(500).json({
            success: false,
            error: outerErr.message || 'Error processing request'
        });
    }
});

app.put('/api/applications/:id/status', verifyToken, (req, res) => {
    db.run("UPDATE applications SET status=?, notes=? WHERE id=?", [req.body.status, req.body.notes, req.params.id], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Application updated' });
    });
});

// ----------------------------------------------------
// SETTINGS API
// ----------------------------------------------------
app.get('/api/settings', (req, res) => {
    db.all("SELECT key, value FROM settings", (err, rows) => {
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/settings', verifyToken, (req, res) => {
    const { key, value } = req.body;
    db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?", [key, value, value], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Setting updated' });
    });
});

// ----------------------------------------------------
// EMAIL UTILITY
// ----------------------------------------------------
function sendConfirmationEmail(toEmail, name) {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal_user') {
        console.log('Skipping email send: SMTP credentials not configured.');
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_USER || 'ethereal_user',
            pass: process.env.SMTP_PASS || 'ethereal_pass'
        }
    });

    const mailOptions = {
        from: '"Plan B Careers" <noreply@planbcareers.in>',
        to: toEmail,
        subject: 'Application Received - Plan B Careers',
      text:
 "Dear " + name +
  "\n\nThank you for applying through Plan B Careers. Your application has been received and is under review. Our HR team will contact you shortly if your profile matches our requirements." +
  "\n\nBest Regards,\nPlan B Careers Team"  
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email send error:', error);
        } else {
            console.log('Confirmation email sent:', info.messageId);
        }
    });
}

// Fallback to serve index.html for unknown routes if SPA, but we just serve static.

// FILE-SYSTEM IMAGE LOADING API
// ----------------------------------------------------
app.get('/api/images/:folder', (req, res) => {
    try {
        const folder = req.params.folder;
        if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
            return res.status(400).json({ error: 'Invalid folder name' });
        }
        
        let folderPath = path.join(__dirname, 'images', folder);
        if (!fs.existsSync(folderPath)) {
            folderPath = path.join(__dirname, 'images', folder.toLowerCase());
        }
        
        if (!fs.existsSync(folderPath)) {
            return res.json([]); 
        }
        
        const actualFolder = path.basename(folderPath);
        const files = fs.readdirSync(folderPath);
        
        const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
            .map(f => `/images/${actualFolder}/${f}`);
            
        res.json(imageFiles);
    } catch (err) {
        console.error('Error reading images directory:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Start Server

// ----------------------------------------------------
// TRUST CENTER APIs
// ----------------------------------------------------

app.get('/api/trust/visitor', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const sessionId = Buffer.from(ip).toString('base64').substring(0, 16); 
    const today = new Date().toISOString().split('T')[0];
    const visitTime = new Date().toLocaleString();
    
    const dateStr = today.replace(/-/g, '');
    const rand = Math.floor(100000 + Math.random() * 900000);
    const visitorId = `PB-VIS-${dateStr}-${rand}`;

    db.run("INSERT OR REPLACE INTO visitor_sessions (session_id, ip_address, last_active) VALUES (?, ?, CURRENT_TIMESTAMP)", [sessionId, ip], () => {
        db.run("DELETE FROM visitor_sessions WHERE last_active < datetime('now', '-10 minutes')", [], () => {
            db.get("SELECT COUNT(*) as online FROM visitor_sessions", (err, onlineRow) => {
                db.get("SELECT views as todayViews FROM traffic WHERE date = ?", [today], (err, todayRow) => {
                    db.get("SELECT SUM(views) as totalViews FROM traffic", (err, totalRow) => {
                        res.json({
                            visitorId,
                            time: visitTime,
                            country: 'India',
                            status: 'Active',
                            onlineVisitors: onlineRow ? onlineRow.online : 1,
                            todayVisitors: todayRow ? todayRow.todayViews : 1,
                            pageViews: totalRow && totalRow.totalViews ? totalRow.totalViews : 100
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/trust/galleries/:category', (req, res) => {
    db.all("SELECT * FROM media WHERE category = ? ORDER BY id DESC", [req.params.category], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/admin/galleries', verifyToken, upload.single('image'), (req, res) => {
    const { category, caption } = req.body;
    const image_url = req.file ? '/assets/images/uploads/' + req.file.filename : null;
    if (!image_url) return res.status(400).json({error: 'Image is required'});
    
    db.run("INSERT INTO galleries (category, image_url, caption) VALUES (?, ?, ?)", [category, image_url, caption], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ id: this.lastID, message: 'Gallery image uploaded' });
    });
});

app.get('/api/trust/verify-candidate', (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({error: 'Search query required'});
    
    let idSearch = -1;
    const cleanQ = query.toUpperCase().trim();
    if (cleanQ.startsWith('PB-CAN-')) {
        idSearch = parseInt(cleanQ.replace('PB-CAN-', ''), 10);
    } else if (cleanQ.startsWith('PBC-')) {
        idSearch = parseInt(cleanQ.replace('PBC-', ''), 10);
    } else if (/^\d+$/.test(cleanQ) && cleanQ.length <= 6) {
        idSearch = parseInt(cleanQ, 10);
    }
    
    db.all("SELECT a.id, a.name, a.city, a.status, j.title as job_title, j.company as job_company FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ? OR a.mobile = ? OR a.email = ?", [idSearch, query, query], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        const mapped = rows.map(r => ({
            candidate_id: `PB-CAN-${r.id.toString().padStart(4, '0')}`,
            name: r.name,
            city: r.city,
            job_title: r.job_title,
            company: r.job_company,
            status: r.status
        }));
        res.json(mapped);
    });
});

app.get('/api/trust/activity', (req, res) => {
    db.all("SELECT * FROM activity_feed ORDER BY id DESC LIMIT 10", (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/trust/reviews', (req, res) => {
    db.all("SELECT * FROM reviews ORDER BY id DESC", (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});


// ----------------------------------------------------
// DIGITAL ASSET MANAGEMENT (DAM) APIs
// ----------------------------------------------------

app.post('/api/admin/media', verifyToken, upload.array('files', 20), async (req, res) => {
    try {
        const { category } = req.body;
        if (!category) return res.status(400).json({ error: 'Category is required' });

        const results = [];

        for (const file of req.files) {
            let finalUrl = '/assets/images/uploads/' + file.filename;
            let finalMime = file.mimetype;
            let finalSize = file.size;
            let finalName = file.filename;

            // Compress and convert images (exclude SVG, PDF, MP4)
            if (file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
                const webpName = file.filename.split('.')[0] + '.webp';
                const webpPath = path.join(__dirname, 'assets', 'images', 'uploads', webpName);
                
                await sharp(file.path)
                    .resize({ width: 1920, withoutEnlargement: true }) // Max width 1920
                    .webp({ quality: 80 })
                    .toFile(webpPath);
                
                // Remove original uncompressed file
                fs.unlinkSync(file.path);
                
                const stats = fs.statSync(webpPath);
                finalUrl = '/assets/images/uploads/' + webpName;
                finalMime = 'image/webp';
                finalSize = stats.size;
                finalName = webpName;
            }

            // Insert into Media Table
            await new Promise((resolve, reject) => {
                db.run("INSERT INTO media (filename, original_name, category, mime_type, size, url) VALUES (?, ?, ?, ?, ?, ?)",
                    [finalName, file.originalname, category, finalMime, finalSize, finalUrl], 
                    function(err) {
                        if (err) reject(err);
                        else {
                            results.push({ id: this.lastID, url: finalUrl, name: file.originalname });
                            resolve();
                        }
                    }
                );
            });
        }
        res.json({ message: 'Files uploaded successfully', files: results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/media', verifyToken, (req, res) => {
    const { category } = req.query;
    let query = "SELECT * FROM media ORDER BY id DESC";
    let params = [];
    if (category) {
        query = "SELECT * FROM media WHERE category = ? ORDER BY id DESC";
        params = [category];
    }
    db.all(query, params, (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.delete('/api/admin/media/:id', verifyToken, (req, res) => {
    db.get("SELECT url FROM media WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({error: 'Not found'});
        
        // Delete physical file
        const filePath = path.join(__dirname, row.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete DB record
        db.run("DELETE FROM media WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({ message: 'Media deleted' });
        });
    });
});

app.put('/api/admin/media/:id', verifyToken, (req, res) => {
    const { original_name, category } = req.body;
    db.run("UPDATE media SET original_name = ?, category = ? WHERE id = ?", [original_name, category, req.params.id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({ message: 'Media updated' });
    });
});

// ----------------------------------------------------
// TEAM API
// ----------------------------------------------------
app.get('/api/public/team', (req, res) => {
    db.all("SELECT * FROM team_members WHERE status = 'Active' ORDER BY display_order ASC, id DESC", (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/admin/team', verifyToken, (req, res) => {
    const { name, designation, mobile, email, linkedin, instagram, bio, photo_url, display_order, status } = req.body;
    db.run("INSERT INTO team_members (name, designation, mobile, email, linkedin, instagram, bio, photo_url, display_order, status) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [name, designation, mobile, email, linkedin, instagram, bio, photo_url, display_order, status || 'Active'], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, message: 'Team member added' });
    });
});

app.put('/api/admin/team/:id', verifyToken, (req, res) => {
    const { name, designation, mobile, email, linkedin, instagram, bio, photo_url, display_order, status } = req.body;
    db.run("UPDATE team_members SET name=?, designation=?, mobile=?, email=?, linkedin=?, instagram=?, bio=?, photo_url=?, display_order=?, status=? WHERE id=?",
        [name, designation, mobile, email, linkedin, instagram, bio, photo_url, display_order, status, req.params.id], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ message: 'Team member updated' });
    });
});

app.delete('/api/admin/team/:id', verifyToken, (req, res) => {
    db.run("DELETE FROM team_members WHERE id=?", [req.params.id], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Team member deleted' });
    });
});

// ----------------------------------------------------
// SUCCESS STORIES API
// ----------------------------------------------------
app.get('/api/public/success-stories', (req, res) => {
    db.all("SELECT * FROM success_stories ORDER BY id DESC", (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/admin/success-stories', verifyToken, (req, res) => {
    const { candidate_name, testimonial, photo_url, company_logo_url, offer_letter_url, salary_slip_url, video_url } = req.body;
    db.run("INSERT INTO success_stories (candidate_name, testimonial, photo_url, company_logo_url, offer_letter_url, salary_slip_url, video_url) VALUES (?,?,?,?,?,?,?)",
        [candidate_name, testimonial, photo_url, company_logo_url, offer_letter_url, salary_slip_url, video_url], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, message: 'Success story added' });
    });
});

app.delete('/api/admin/success-stories/:id', verifyToken, (req, res) => {
    db.run("DELETE FROM success_stories WHERE id=?", [req.params.id], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Success story deleted' });
    });
});


if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        
        // Ensure upload dir exists
        const fs = require('fs');
        const uploadDir = path.join(__dirname, 'assets', 'images', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
    });
}

module.exports = app;
