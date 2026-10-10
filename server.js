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

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets', 'images', 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

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

app.post('/api/applications', upload.single('resume'), (req, res) => {
    const { job_id, name, mobile, email, city, qualification, experience, preferred_company } = req.body;
    const resume_url = req.file ? '/assets/images/uploads/' + req.file.filename : null;
    
    db.run(`INSERT INTO applications (job_id, name, mobile, email, city, qualification, experience, resume_url) 
            VALUES (?,?,?,?,?,?,?,?)`, 
        [job_id, name, mobile, email, city, qualification, experience, resume_url], function(err) {
            if(err) return res.status(500).json({error: err.message});
            
            // Send confirmation email
            sendConfirmationEmail(email, name);
            
            res.json({ id: this.lastID, message: 'Application submitted successfully' });
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
    // Note: Since this is local dev, we mock the real SMTP logic or use a dummy
    // In production, user will supply real SMTP credentials in .env
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
        
        const folderPath = path.join(__dirname, 'images', folder);
        
        if (!fs.existsSync(folderPath)) {
            return res.json([]); 
        }
        
        const files = fs.readdirSync(folderPath);
        
        const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
            .map(f => `/images/${folder}/${f}`);
            
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
