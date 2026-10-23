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

// Multer setup for uploads (Memory storage ensures serverless platforms like Vercel never crash on read-only disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
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
            const data = { jobsAvailable: counts.open_jobs, applicationsReceived: counts.apps };
            settings.forEach(s => data[s.key] = s.value);
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
        if(err) return res.status(500).json({error: err.message});
        if (!rows || rows.length === 0) {
            try {
                const fallbackJobs = require('./jobs.json');
                return res.json(fallbackJobs);
            } catch(e) {
                // Ignore fallback error
            }
        }
        res.json(rows);
    });
});

app.post('/api/jobs', verifyToken, (req, res) => {
    const { title, company, location, salary, type, description } = req.body;
    db.run("INSERT INTO jobs (title, company, location, salary, type, description) VALUES (?,?,?,?,?,?)",
        [title, company, location, salary, type, description], function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({ id: this.lastID, message: 'Job created' });
    });
});

app.put('/api/jobs/:id', verifyToken, (req, res) => {
    const { title, company, location, salary, type, description, status } = req.body;
    db.run("UPDATE jobs SET title=?, company=?, location=?, salary=?, type=?, description=?, status=? WHERE id=?",
        [title, company, location, salary, type, description, status, req.params.id], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ message: 'Job updated' });
    });
});

app.delete('/api/jobs/:id', verifyToken, (req, res) => {
    db.run("DELETE FROM jobs WHERE id=?", [req.params.id], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({ message: 'Job deleted' });
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
// ADMIN NOTIFICATION EMAIL WITH ATTACHED RESUME
// ----------------------------------------------------
async function sendAdminApplicationEmail(candidateData, resumeFile, resumeUrl) {
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
                <tr><td class="label">👤 Candidate Name</td><td class="value"><strong>${candidateData.name || 'Not provided'}</strong></td></tr>
                <tr><td class="label">📱 WhatsApp / Mobile</td><td class="value"><a href="${waLink}" style="color:#2563eb;font-weight:bold;text-decoration:none;">+91 ${cleanMobile}</a></td></tr>
                <tr><td class="label">📧 Email</td><td class="value">${candidateData.email ? `<a href="mailto:${candidateData.email}">${candidateData.email}</a>` : 'Not provided'}</td></tr>
                <tr><td class="label">📍 City / Location</td><td class="value">${candidateData.city || 'Not provided'}</td></tr>
                <tr><td class="label">🎓 Qualification</td><td class="value">${candidateData.qualification || 'Not provided'}</td></tr>
                <tr><td class="label">💼 Experience</td><td class="value">${candidateData.experience || 'Not provided'}</td></tr>
                <tr><td class="label">🎯 Role Applied</td><td class="value"><strong>${role}</strong></td></tr>
                <tr><td class="label">📄 Resume Document</td><td class="value">${resumeFile ? `Attached (${resumeFile.originalname})` : (resumeUrl ? 'Uploaded to Cloud' : 'No document attached')}</td></tr>
              </table>

              <div class="actions">
                <a href="${waLink}" class="btn" style="background:#25D366;color:#ffffff;display:inline-block;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:10px;">
                  💬 Chat on WhatsApp (+91 ${cleanMobile})
                </a>
                ${resumeUrl ? `
                <a href="${resumeUrl}" class="btn" style="background:#4f46e5;color:#ffffff;display:inline-block;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                  📥 View / Download Resume
                </a>` : ''}
              </div>

              ${resumeUrl ? `<p style="font-size:12px;color:#6b7280;margin-top:15px;word-break:break-all;">Direct Resume Link: <a href="${resumeUrl}">${resumeUrl}</a></p>` : ''}
              ${resumeFile ? `<p style="font-size:12px;color:#059669;margin-top:10px;">📎 <strong>The original candidate resume is attached directly to this email.</strong></p>` : ''}
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
            subject: `📄 New Job Application: ${candidateData.name || 'Candidate'} - ${role}`,
            text: [
                `New Job Application received via planbcareers.in:`,
                ``,
                `👤 Name: ${candidateData.name}`,
                `📱 WhatsApp / Mobile: +91 ${cleanMobile}`,
                `📧 Email: ${candidateData.email || 'Not provided'}`,
                `📍 City: ${candidateData.city || 'Not provided'}`,
                `🎓 Qualification: ${candidateData.qualification || 'Not provided'}`,
                `💼 Experience: ${candidateData.experience || 'Not provided'}`,
                `🎯 Applied For: ${role}`,
                resumeUrl ? `🔗 Direct Resume Link: ${resumeUrl}` : '',
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

app.post('/api/applications', (req, res) => {
    upload.single('resume')(req, res, async (uploadErr) => {
        if (uploadErr) {
            console.warn('Multer upload warning:', uploadErr.message);
        }

        const { job_id, name, mobile, email, city, qualification, experience, preferred_company } = req.body || {};
        
        // 1. Upload resume to Cloud for permanent public access URL
        let cloud_resume_url = null;
        if (req.file) {
            try {
                cloud_resume_url = await uploadResumeToCloud(req.file);
            } catch (err) {
                console.warn('Resume cloud upload failed:', err.message);
            }
        }

        const applicantName = name || 'Applicant';
        const applicantEmail = email || '';
        const applicantMobile = mobile || '';

        // 2. Send Admin Notification Email to contact.planbcareers@gmail.com with actual resume attached (Awaited)
        let emailResult = null;
        try {
            emailResult = await sendAdminApplicationEmail(
                { name: applicantName, mobile: applicantMobile, email: applicantEmail, city, qualification, experience, preferred_company },
                req.file,
                cloud_resume_url
            );
        } catch (mailErr) {
            console.warn('Admin email dispatch error:', mailErr.message);
        }

        // 3. Send Candidate confirmation email (if SMTP configured)
        if (applicantEmail && process.env.SMTP_PASS) {
            try {
                sendConfirmationEmail(applicantEmail, applicantName);
            } catch (mailErr) {
                console.warn('Confirmation email error:', mailErr.message);
            }
        }

        // 4. Save to DB if available
        db.run(`INSERT INTO applications (job_id, name, mobile, email, city, qualification, experience, resume_url) 
                VALUES (?,?,?,?,?,?,?,?)`, 
            [job_id || null, applicantName, applicantMobile, applicantEmail, city || '', qualification || '', experience || '', cloud_resume_url || (req.file ? req.file.originalname : null)], 
            function(err) {
                const returnId = (this && this.lastID) ? this.lastID : Date.now();
                return res.json({
                    id: returnId,
                    message: 'Application submitted successfully',
                    resume_url: cloud_resume_url,
                    email_sent: emailResult ? emailResult.success : false
                });
        });
    });
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
    if (query.toUpperCase().startsWith('PB-CAN-')) {
        idSearch = parseInt(query.toUpperCase().replace('PB-CAN-', ''), 10);
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
