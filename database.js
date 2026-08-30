const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'planb.sqlite');

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
            db.run("INSERT INTO jobs (title, company, location, salary, type, status) VALUES ('Customer Support Executive', 'Tech Mahindra', 'Pune, MH', '3.5 LPA', 'Full Time', 'Open')");
            db.run("INSERT INTO jobs (title, company, location, salary, type, status) VALUES ('HR Recruiter', 'Plan B Careers', 'Akola, MH', '2.4 LPA', 'Full Time', 'Open')");
            db.run("INSERT INTO jobs (title, company, location, salary, type, status) VALUES ('Data Entry Operator', 'Infosys BPM', 'Work From Home', '2.0 LPA', 'Part Time', 'Closed')");
        }
    });
});

module.exports = db;
