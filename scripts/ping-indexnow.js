/**
 * Plan B Careers - IndexNow Automated Submitter
 * Submits updated URLs directly to Bing & IndexNow search engines
 */

const https = require('https');

const host = 'planbcareers.in';
const key = '7f2e1a498b3c419fa82b5e90d12e847c';
const keyLocation = `https://${host}/${key}.txt`;

const urlList = [
    `https://${host}/`,
    `https://${host}/jobs.html`,
    `https://${host}/women-wfh.html`,
    `https://${host}/admissions.html`,
    `https://${host}/trust.html`,
    `https://${host}/about.html`,
    `https://${host}/contact.html`,
    `https://${host}/verify-candidate.html`,
    // Category Pages
    `https://${host}/jobs/work-from-home.html`,
    `https://${host}/jobs/customer-support.html`,
    `https://${host}/jobs/data-entry.html`,
    `https://${host}/jobs/telecalling.html`,
    `https://${host}/jobs/freshers.html`,
    // Regional Location Hubs
    `https://${host}/jobs/location-akola.html`,
    `https://${host}/jobs/location-pune.html`,
    `https://${host}/jobs/location-nagpur.html`,
    `https://${host}/jobs/location-mumbai.html`,
    `https://${host}/jobs/location-chhatrapati-sambhajinagar.html`,
    // Leaf Job Pages
    `https://${host}/job/4-backend-process-executive.html`,
    `https://${host}/job/5-remote-telesales-specialist.html`,
    `https://${host}/job/10-recharge-assistant.html`,
    `https://${host}/job/12-barcode-generation-data-processing-associate.html`,
    `https://${host}/job/17-inventory-executive.html`,
    `https://${host}/job/18-edtech-sales-executive.html`,
    `https://${host}/job/19-collection-agent.html`,
    `https://${host}/job/21-customer-support-executive.html`,
    `https://${host}/job/22-international-customer-support-executive.html`,
    `https://${host}/job/23-edtech-counsellor.html`,
    `https://${host}/job/3-hr-recruiter.html`
];

const payload = JSON.stringify({
    host: host,
    key: key,
    keyLocation: keyLocation,
    urlList: urlList
});

console.log(`Submitting ${urlList.length} URLs to IndexNow...`);

const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    console.log(`IndexNow Response Status: ${res.statusCode} ${res.statusMessage}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        if (chunk) console.log(`Response: ${chunk}`);
    });
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
            console.log('✓ Successfully notified IndexNow search engines of all updated URLs!');
        } else {
            console.log(`Note: Search engine returned status ${res.statusCode}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`IndexNow submission error: ${e.message}`);
});

req.write(payload);
req.end();

