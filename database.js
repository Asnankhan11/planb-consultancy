'use strict';

const bcrypt = require('bcryptjs');
const { createDatabase, unavailableError } = require('./lib/database-adapter');
let db;
try { db = createDatabase(); } catch {
    console.error('Database configuration is invalid; writes are disabled.');
    db = {mode: 'unavailable', configured: false, available: false, close: async () => {}};
}

const schema = [
    `CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, location TEXT NOT NULL, salary TEXT, type TEXT, status TEXT NOT NULL DEFAULT 'Details pending', description TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, application_id TEXT UNIQUE, request_hash TEXT, job_id INTEGER, name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', city TEXT, qualification TEXT, experience TEXT, resume_url TEXT, resume_file_id TEXT, status TEXT DEFAULT 'Pending', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admission_enquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, enquiry_id TEXT UNIQUE, student_name TEXT NOT NULL, mobile TEXT NOT NULL, whatsapp_number TEXT, email TEXT, qualification TEXT, interested_course TEXT, preferred_college TEXT, preferred_city TEXT, admission_type TEXT, additional_requirements TEXT, status TEXT DEFAULT 'New', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS traffic (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE, views INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, icon TEXT DEFAULT 'briefcase', display_order INTEGER DEFAULT 0, status TEXT DEFAULT 'Active')`,
    `CREATE TABLE IF NOT EXISTS paid_services (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, price_display TEXT NOT NULL, price_numeric INTEGER DEFAULT 0, short_desc TEXT, features TEXT, enquiry_tag TEXT, display_order INTEGER DEFAULT 0, status TEXT DEFAULT 'Active')`,
    `CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, city TEXT, rating INTEGER DEFAULT 5, text TEXT NOT NULL, photo_url TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS galleries (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, image_url TEXT NOT NULL, caption TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS activity_feed (id INTEGER PRIMARY KEY AUTOINCREMENT, action_type TEXT NOT NULL, description TEXT NOT NULL, timestamp TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS visitor_sessions (session_id TEXT PRIMARY KEY, ip_address TEXT, last_active TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS stored_files (id TEXT PRIMARY KEY, bytes BLOB NOT NULL, mime_type TEXT NOT NULL, filename TEXT NOT NULL, private INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, original_name TEXT NOT NULL, category TEXT NOT NULL, mime_type TEXT, size INTEGER, url TEXT NOT NULL, file_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS team_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, designation TEXT NOT NULL, mobile TEXT, email TEXT, linkedin TEXT, instagram TEXT, bio TEXT, photo_url TEXT, display_order INTEGER DEFAULT 0, status TEXT DEFAULT 'Active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS success_stories (id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_name TEXT NOT NULL, testimonial TEXT NOT NULL, photo_url TEXT, company_logo_url TEXT, offer_letter_url TEXT, salary_slip_url TEXT, video_url TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
];

async function initialize() {
    if (!db.configured) return false;
    await db.batch(schema);
    // Migrations preserve existing applicant data. Ignore only the documented duplicate-column condition.
    for (const sql of [
        'ALTER TABLE applications ADD COLUMN application_id TEXT',
        'ALTER TABLE applications ADD COLUMN request_hash TEXT',
        'ALTER TABLE applications ADD COLUMN resume_file_id TEXT',
        'ALTER TABLE admission_enquiries ADD COLUMN enquiry_id TEXT',
        'ALTER TABLE media ADD COLUMN file_id TEXT'
    ]) {
        try { await db.execute(sql); } catch (error) { if (!/duplicate column/i.test(error.message)) throw error; }
    }
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_app_id ON applications(application_id) WHERE application_id IS NOT NULL');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_admission_enquiry_id ON admission_enquiries(enquiry_id) WHERE enquiry_id IS NOT NULL');
    // Preserve source IDs; do not silently remap jobs 2/3/4 to database IDs 1/2/3.
    const jobs = require('./jobs.json');
    await db.batch(jobs.map(job => ({
        sql: 'INSERT INTO jobs (id,title,company,location,salary,type,status,description,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,company=excluded.company,location=excluded.location,salary=excluded.salary,type=excluded.type,status=excluded.status,description=excluded.description,created_at=excluded.created_at',
        args: [job.id,job.title,job.company,job.location,job.salary,job.type,job.status || 'Details pending',job.description,job.created_at]
    })));
    // Revoke the historical, publicly-known bootstrap password rather than leaving it valid after upgrade.
    const legacy = await db.execute('SELECT id,password FROM admins WHERE username=?', ['admin']);
    if (legacy.rows[0] && await bcrypt.compare('admin123', legacy.rows[0].password)) await db.execute('DELETE FROM admins WHERE id=?', [legacy.rows[0].id]);
    const username = process.env.ADMIN_USERNAME;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (username && hash && /^\$2[aby]\$\d{2}\$/.test(hash) && !await bcrypt.compare('admin123', hash)) {
        await db.execute('INSERT INTO admins (username,password) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET password=excluded.password', [username,hash]);
    }
    return true;
}

db.ready = initialize().catch(error => {
    db.available = false;
    console.error('Database initialization failed; writes are disabled.', error.code || 'DATABASE_ERROR');
    return false;
});
db.query = async (sql, args = []) => {
    await db.ready;
    if (!db.available) throw unavailableError();
    return db.execute(sql, args);
};
module.exports = db;
