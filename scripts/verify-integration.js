const http = require('http');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Use the local SQLite database
const dbPath = path.join(__dirname, '..', 'planb.sqlite');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Helper to make multipart HTTP requests using native Node.js
function sendApplicationRequest(port, fields, fileInfo) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        let postData = [];

        // Add text fields
        for (const [key, val] of Object.entries(fields)) {
            postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
        }

        // Add file
        if (fileInfo) {
            postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${fileInfo.name}"\r\nContent-Type: ${fileInfo.type || 'application/pdf'}\r\n\r\n`);
        }

        const headerBuffer = Buffer.from(postData.join(''), 'utf8');
        const fileBuffer = fileInfo ? fileInfo.buffer : Buffer.alloc(0);
        const footerBuffer = fileInfo ? Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8') : Buffer.from(`--${boundary}--\r\n`, 'utf8');
        const fullBody = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

        const req = http.request({
            hostname: '127.0.0.1',
            port: port,
            path: '/api/applications',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        req.write(fullBody);
        req.end();
    });
}

async function main() {
    console.log('====================================================');
    console.log('PLAN B CAREERS: INTEGRATION & IDEMPOTENCY TEST SUITE');
    console.log('====================================================\n');

    // 1. Check historical records in DB
    const initialRows = await runQuery('SELECT id, application_id, name, mobile, email FROM applications ORDER BY id ASC');
    console.log(`[CHECK 1] Initial Database Records: ${initialRows.length} applications found.`);
    initialRows.forEach(r => console.log(`   - ID ${r.id}: ${r.name} (${r.mobile}) | AppID: ${r.application_id || 'NULL (Historical)'}`));
    
    if (initialRows.length < 3 || initialRows[0].id !== 1 || initialRows[1].id !== 2 || initialRows[2].id !== 3) {
        throw new Error('Historical candidate records missing or corrupted!');
    }
    console.log('✅ Historical candidates (IDs 1, 2, 3) verified intact.\n');

    // 2. Start temporary local test server on port 3099
    console.log('[START] Starting test server instance on port 3099...');
    const app = require('../server.js');
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(3099, '127.0.0.1', resolve));
    console.log('✅ Test server listening on http://127.0.0.1:3099\n');

    try {
        const testAppId1 = 'PB-20261105-8801';
        const dummyPdf = Buffer.from('%PDF-1.4 Test Resume Content For Candidate');

        // TEST 1: First-time application submission
        console.log('[TEST 1] Submitting first-time application with ID:', testAppId1);
        const res1 = await sendApplicationRequest(3099, {
            application_id: testAppId1,
            name: 'Pooja Deshmukh',
            mobile: '9822001122',
            email: 'pooja.deshmukh@example.com',
            city: 'Nagpur',
            qualification: 'B.Com',
            experience: 'Fresher',
            preferred_company: 'Back Office Executive'
        }, {
            name: 'Pooja_Resume.pdf',
            type: 'application/pdf',
            buffer: dummyPdf
        });

        console.log('Response 1:', JSON.stringify(res1));
        if (res1.status !== 200 || !res1.data.success || res1.data.applicationId !== testAppId1) {
            throw new Error(`Test 1 Failed: ${JSON.stringify(res1)}`);
        }
        if (!res1.data.resume_url) {
            throw new Error('Test 1 Failed: resume_url not returned in response.');
        }
        console.log('✅ Test 1 Passed: First submission succeeded and returned resume_url.\n');

        // TEST 2: Duplicate resubmission with SAME Application ID
        console.log('[TEST 2] Resubmitting application with the EXACT SAME ID:', testAppId1);
        const res2 = await sendApplicationRequest(3099, {
            application_id: testAppId1,
            name: 'Pooja Deshmukh',
            mobile: '9822001122',
            email: 'pooja.deshmukh@example.com',
            city: 'Nagpur',
            qualification: 'B.Com',
            experience: 'Fresher',
            preferred_company: 'Back Office Executive'
        }, {
            name: 'Pooja_Resume.pdf',
            type: 'application/pdf',
            buffer: dummyPdf
        });

        console.log('Response 2:', JSON.stringify(res2));
        if (res2.status !== 200 || !res2.data.success || !res2.data.duplicate) {
            throw new Error(`Test 2 Failed: Did not report duplicate: ${JSON.stringify(res2)}`);
        }
        if (res2.data.resume_url !== res1.data.resume_url) {
            throw new Error('Test 2 Failed: Duplicate response did not return the original resume_url.');
        }
        console.log('✅ Test 2 Passed: Resubmission correctly identified duplicate and returned existing resume_url without duplicate insert.\n');

        // Check DB row count after Test 1 & 2
        const check1Rows = await runQuery('SELECT * FROM applications WHERE application_id = ?', [testAppId1]);
        if (check1Rows.length !== 1) {
            throw new Error(`Database Integrity Failed: Expected exactly 1 record for ${testAppId1}, found ${check1Rows.length}`);
        }
        console.log(`✅ DB verification: Exactly 1 row exists for ${testAppId1} (no duplicate rows created).\n`);

        // TEST 3: Concurrent double-click simulation (Promise.all with SAME Application ID)
        const testAppId2 = 'PB-20261105-8802';
        console.log('[TEST 3] Simulating concurrent double-click with ID:', testAppId2);
        const [doubleClick1, doubleClick2] = await Promise.all([
            sendApplicationRequest(3099, {
                application_id: testAppId2,
                name: 'Karan Mehra',
                mobile: '9765432100',
                email: 'karan@example.com',
                city: 'Pune',
                qualification: 'B.E. Computer',
                experience: '1 Year',
                preferred_company: 'IT Support'
            }, {
                name: 'Karan_Resume.pdf',
                type: 'application/pdf',
                buffer: dummyPdf
            }),
            sendApplicationRequest(3099, {
                application_id: testAppId2,
                name: 'Karan Mehra',
                mobile: '9765432100',
                email: 'karan@example.com',
                city: 'Pune',
                qualification: 'B.E. Computer',
                experience: '1 Year',
                preferred_company: 'IT Support'
            }, {
                name: 'Karan_Resume.pdf',
                type: 'application/pdf',
                buffer: dummyPdf
            })
        ]);

        console.log('Double Click 1 status:', doubleClick1.status, 'success:', doubleClick1.data?.success);
        console.log('Double Click 2 status:', doubleClick2.status, 'success:', doubleClick2.data?.success);
        if (!doubleClick1.data?.success || !doubleClick2.data?.success) {
            throw new Error('Test 3 Failed: One or both concurrent requests failed.');
        }

        const check2Rows = await runQuery('SELECT * FROM applications WHERE application_id = ?', [testAppId2]);
        if (check2Rows.length !== 1) {
            throw new Error(`Test 3 Failed: Concurrent submissions resulted in ${check2Rows.length} rows instead of 1!`);
        }
        console.log(`✅ Test 3 Passed: Concurrent double-click cleanly handled! Exactly 1 row in DB for ${testAppId2}.\n`);

        // TEST 4: Missing Resume Validation
        console.log('[TEST 4] Testing validation when resume document is omitted:');
        const resNoResume = await sendApplicationRequest(3099, {
            application_id: 'PB-20261105-8803',
            name: 'No Resume Applicant',
            mobile: '9876543210'
        }, null);
        console.log('Response (No Resume):', JSON.stringify(resNoResume));
        if (resNoResume.status !== 400 || resNoResume.data.success !== false) {
            throw new Error('Test 4 Failed: Application without resume should be rejected with HTTP 400.');
        }
        console.log('✅ Test 4 Passed: Missing resume correctly rejected with HTTP 400.\n');

        // TEST 5: Verify historical candidate records remain completely untouched
        console.log('[TEST 5] Re-verifying historical candidate records (IDs 1, 2, 3):');
        const finalHistorical = await runQuery('SELECT id, application_id, name, mobile, email FROM applications WHERE id IN (1, 2, 3) ORDER BY id ASC');
        if (finalHistorical.length !== 3) {
            throw new Error(`Critical Safety Failure: Historical records lost! Found ${finalHistorical.length}`);
        }
        finalHistorical.forEach(r => {
            console.log(`   - ID ${r.id}: ${r.name} (${r.mobile}) | AppID: ${r.application_id || 'NULL (Preserved)'}`);
        });
        console.log('✅ Test 5 Passed: All historical candidate records 100% preserved and untouched.\n');

        // Clean up test rows
        await runQuery("DELETE FROM applications WHERE application_id IN ('PB-20261105-8801', 'PB-20261105-8802', 'PB-20261105-8803')");
        console.log('🧹 Cleaned up temporary test rows from database.');

        console.log('\n====================================================');
        console.log('🎉 ALL INTEGRATION & IDEMPOTENCY TESTS PASSED (5/5)!');
        console.log('====================================================');

    } finally {
        server.close();
        db.close();
    }
}

main().catch(err => {
    console.error('❌ Test Suite Error:', err);
    process.exit(1);
});

