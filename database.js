const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

let dbPath = path.join(process.cwd(), 'planb.sqlite');

if (process.env.VERCEL) {
    const fs = require('fs');
    const tmpPath = '/tmp/planb.sqlite';
    try {
        fs.copyFileSync(dbPath, tmpPath);
        console.log('Copied database to /tmp');
    } catch(e) {
        console.error('Failed to copy db to /tmp', e);
    }
    dbPath = tmpPath;
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize Schema
db.serialize(() => {
    // Admins Table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Jobs Table
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        salary TEXT,
        type TEXT,
        status TEXT DEFAULT 'Open',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Applications Table
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT,
        job_id INTEGER,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        city TEXT,
        qualification TEXT,
        experience TEXT,
        resume_url TEXT,
        status TEXT DEFAULT 'Pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id)
    )`);
    // Ensure application_id column exists if table was created in an earlier migration
    db.run("ALTER TABLE applications ADD COLUMN application_id TEXT", () => {});
    // Create partial unique index on non-null application_id for fast idempotent lookups
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_app_id ON applications(application_id) WHERE application_id IS NOT NULL", () => {});

    // Analytics / Traffic (simple daily hits)
    db.run(`CREATE TABLE IF NOT EXISTS traffic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        views INTEGER DEFAULT 0
    )`);

    // Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Admission Enquiries Table
    db.run(`CREATE TABLE IF NOT EXISTS admission_enquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        whatsapp_number TEXT,
        email TEXT,
        qualification TEXT,
        interested_course TEXT,
        preferred_college TEXT,
        preferred_city TEXT,
        admission_type TEXT,
        additional_requirements TEXT,
        status TEXT DEFAULT 'New',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Multi-Industry Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        icon TEXT DEFAULT 'briefcase',
        display_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active'
    )`);

    // Paid Professional Services Table
    db.run(`CREATE TABLE IF NOT EXISTS paid_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        price_display TEXT NOT NULL,
        price_numeric INTEGER DEFAULT 0,
        short_desc TEXT,
        features TEXT,
        enquiry_tag TEXT,
        display_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active'
    )`);

    // Safe Column Additions to jobs table
    const jobColumns = [
        "ALTER TABLE jobs ADD COLUMN industry TEXT",
        "ALTER TABLE jobs ADD COLUMN min_salary INTEGER",
        "ALTER TABLE jobs ADD COLUMN max_salary INTEGER",
        "ALTER TABLE jobs ADD COLUMN salary_period TEXT DEFAULT 'monthly'",
        "ALTER TABLE jobs ADD COLUMN salary_type TEXT DEFAULT 'Fixed'",
        "ALTER TABLE jobs ADD COLUMN categories TEXT",
        "ALTER TABLE jobs ADD COLUMN experience_level TEXT",
        "ALTER TABLE jobs ADD COLUMN work_mode TEXT",
        "ALTER TABLE jobs ADD COLUMN qualification TEXT",
        "ALTER TABLE jobs ADD COLUMN shifts TEXT",
        "ALTER TABLE jobs ADD COLUMN languages TEXT"
    ];
    jobColumns.forEach(sql => {
        db.run(sql, (err) => {
            // Ignore if column already exists
        });
    });

    // Seed 15 Multi-Industry Categories if empty
    db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (!row || row.count === 0) {
            const defaultCats = [
                { name: "IT & Software", icon: "code-2", order: 1 },
                { name: "Banking & Finance", icon: "landmark", order: 2 },
                { name: "BPO & Customer Support", icon: "headset", order: 3 },
                { name: "Healthcare & Medical", icon: "stethoscope", order: 4 },
                { name: "Education & EdTech", icon: "graduation-cap", order: 5 },
                { name: "Sales & Marketing", icon: "trending-up", order: 6 },
                { name: "Retail & E-commerce", icon: "shopping-bag", order: 7 },
                { name: "Logistics & Supply Chain", icon: "truck", order: 8 },
                { name: "Insurance", icon: "shield", order: 9 },
                { name: "Manufacturing & Industrial", icon: "factory", order: 10 },
                { name: "Hospitality & Tourism", icon: "utensils", order: 11 },
                { name: "Government & Competitive Exams", icon: "award", order: 12 },
                { name: "Data Entry & Back Office", icon: "file-spreadsheet", order: 13 },
                { name: "Telecalling & Telesales", icon: "phone-call", order: 14 },
                { name: "Other Services", icon: "layers", order: 15 }
            ];
            const stmt = db.prepare("INSERT OR IGNORE INTO categories (name, icon, display_order, status) VALUES (?, ?, ?, 'Active')");
            defaultCats.forEach(c => stmt.run(c.name, c.icon, c.order));
            stmt.finalize();
            console.log("Seeded 15 Multi-Industry Categories");
        }
    });

    // Seed Paid Services if empty
    db.get("SELECT COUNT(*) as count FROM paid_services", (err, row) => {
        if (!row || row.count === 0) {
            const defaultServices = [
                {
                    title: "Professional Resume Creation",
                    price_display: "₹300",
                    price_numeric: 300,
                    short_desc: "Recruiter-approved ATS compliant resume drafted by recruitment specialists.",
                    features: JSON.stringify([
                        "ATS-friendly formatting",
                        "Keyword optimization for target industry",
                        "Delivered in PDF & editable Word format",
                        "Turnaround within 24-48 hours"
                    ]),
                    enquiry_tag: "Resume-Creation-300",
                    order: 1
                },
                {
                    title: "Mock Interview Preparation",
                    price_display: "₹500",
                    price_numeric: 500,
                    short_desc: "1-on-1 personalized interview coaching session with senior HR recruiters.",
                    features: JSON.stringify([
                        "30-minute structured mock interview",
                        "Detailed communication & body language feedback",
                        "Industry-specific question & answer drills",
                        "Confidence building & salary negotiation tips"
                    ]),
                    enquiry_tag: "Mock-Interview-500",
                    order: 2
                },
                {
                    title: "Company Interview Arrangement",
                    price_display: "₹1,500 (2 Interviews)",
                    price_numeric: 1500,
                    short_desc: "Guaranteed interview scheduling with 2 verified corporate hiring clients.",
                    features: JSON.stringify([
                        "Direct coordination with employer HR desks",
                        "Confirmed interview slot booking",
                        "Pre-interview company dossier & briefing",
                        "Dedicated post-interview feedback follow-up"
                    ]),
                    enquiry_tag: "Company-Interviews-1500",
                    order: 3
                },
                {
                    title: "Placement Assistance Package",
                    price_display: "₹6,000 – ₹10,000",
                    price_numeric: 6000,
                    short_desc: "Comprehensive end-to-end placement guidance and dedicated career mentoring.",
                    features: JSON.stringify([
                        "Priority profile presentation to client partners",
                        "Unlimited interview coordination until placement",
                        "Personalized career roadmap & grooming",
                        "Offer letter evaluation & joining guidance"
                    ]),
                    enquiry_tag: "Placement-Assistance-Pkg",
                    order: 4
                }
            ];
            const sStmt = db.prepare("INSERT INTO paid_services (title, price_display, price_numeric, short_desc, features, enquiry_tag, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
            defaultServices.forEach(s => sStmt.run(s.title, s.price_display, s.price_numeric, s.short_desc, s.features, s.enquiry_tag, s.order));
            sStmt.finalize();
            console.log("Seeded 4 Paid Services");
        }
    });

    // Seed Second Admission Consultation Settings
    db.get("SELECT value FROM settings WHERE key = 'second_consultation_fee'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO settings (key, value) VALUES ('second_consultation_fee', 'Customized Assessment')");
            db.run("INSERT INTO settings (key, value) VALUES ('first_consultation_status', 'Free – ₹0')");
        }
    });

    // Seed Default Admin (admin / admin123)
    db.get("SELECT id FROM admins WHERE username = 'admin'", (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO admins (username, password) VALUES (?, ?)", ['admin', hash]);
            console.log('Default admin seeded.');
        }
    });

    // Seed Initial Stats Counters if empty
    db.get("SELECT value FROM settings WHERE key = 'candidates_placed'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO settings (key, value) VALUES ('candidates_placed', '1250')");
            db.run("INSERT INTO settings (key, value) VALUES ('companies_hiring', '45')");
        }
    });

    // Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        city TEXT,
        rating INTEGER DEFAULT 5,
        text TEXT NOT NULL,
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Galleries Table
    db.run(`CREATE TABLE IF NOT EXISTS galleries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Activity Feed Table
    db.run(`CREATE TABLE IF NOT EXISTS activity_feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Visitor Sessions Table
    db.run(`CREATE TABLE IF NOT EXISTS visitor_sessions (
        session_id TEXT PRIMARY KEY,
        ip_address TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Media / DAM Table
    db.run(`CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        category TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Team Members Table
    db.run(`CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        mobile TEXT,
        email TEXT,
        linkedin TEXT,
        instagram TEXT,
        bio TEXT,
        photo_url TEXT,
        display_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Success Stories Table
    db.run(`CREATE TABLE IF NOT EXISTS success_stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_name TEXT NOT NULL,
        testimonial TEXT NOT NULL,
        photo_url TEXT,
        company_logo_url TEXT,
        offer_letter_url TEXT,
        salary_slip_url TEXT,
        video_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed dummy jobs if empty
    db.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
        if (row && row.count === 0) {
            try {
                const jobsData = require('./jobs.json');
                jobsData.forEach(job => {
                    db.run("INSERT INTO jobs (title, company, location, salary, type, status, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        [job.title, job.company, job.location, job.salary, job.type, job.status, job.description, job.created_at]
                    );
                });
                console.log("Seeded " + jobsData.length + " jobs from jobs.json");
            } catch(e) {
                console.error("Failed to seed jobs.json", e);
            }
        }
    });
});

module.exports = db;
