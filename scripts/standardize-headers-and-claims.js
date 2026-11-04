const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Helper to determine active link
function getHeader(file, isSubdir = false) {
    const prefix = isSubdir ? '/' : '';
    const imgPrefix = isSubdir ? '/' : '';
    
    const activeMap = {
        'index.html': 'home',
        'jobs.html': 'jobs',
        'women-wfh.html': 'wfh',
        'admissions.html': 'admissions',
        'apply-admission.html': 'admissions',
        'trust.html': 'trust',
        'about.html': 'about',
        'contact.html': 'contact',
        'verify-candidate.html': 'verify'
    };

    const currentKey = activeMap[file] || '';

    const navLink = (href, label, key) => {
        const isActive = currentKey === key;
        const cls = isActive ? 'nav-item active' : 'nav-item';
        return `<a href="${prefix}${href}" class="${cls}">${label}</a>`;
    };

    const mNavLink = (href, label, key) => {
        const isActive = currentKey === key;
        const cls = isActive 
            ? 'px-4 py-2.5 rounded-xl font-semibold bg-teal-50 text-teal-800' 
            : 'px-4 py-2.5 rounded-xl font-medium text-navy-900 hover:bg-teal-50';
        return `<a href="${prefix}${href}" class="${cls}">${label}</a>`;
    };

    return `    <!-- MAIN NAVBAR -->
    <header id="navbar" class="header-glass sticky top-0 z-40 transition-all duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20 gap-4">
                <!-- Brand Logo & Tagline -->
                <a href="${prefix}index.html" class="flex items-center gap-3 group shrink-0 py-1">
                    <img src="${imgPrefix}images/logos/Plan-B-Careers-logo.png" alt="Plan B Careers Logo" class="h-10 w-auto object-contain transition-transform group-hover:scale-105 shrink-0">
                    <div class="flex flex-col shrink-0 justify-center">
                        <span class="font-display font-extrabold text-base sm:text-lg text-navy-900 leading-none whitespace-nowrap tracking-tight">PLAN B CAREERS</span>
                        <span class="text-[10px] font-semibold text-teal-600 uppercase leading-none mt-1 whitespace-nowrap tracking-wider">Backup jo kaam kare</span>
                    </div>
                </a>

                <!-- Desktop Nav Links -->
                <nav class="hidden xl:flex items-center gap-1 shrink-0">
                    ${navLink('index.html', 'Home', 'home')}
                    ${navLink('jobs.html', 'Find Jobs', 'jobs')}
                    ${navLink('women-wfh.html', 'Work From Home', 'wfh')}
                    ${navLink('admissions.html', 'Admissions', 'admissions')}
                    ${navLink('trust.html', 'Trust Center', 'trust')}
                    ${navLink('about.html', 'About Us', 'about')}
                    ${navLink('contact.html', 'Contact', 'contact')}
                </nav>

                <!-- Actions -->
                <div class="hidden sm:flex items-center gap-2.5 shrink-0">
                    <a href="${prefix}dashboard.html" class="btn-outline-navy text-xs py-2 px-3 gap-1.5 whitespace-nowrap">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Candidate Portal</span>
                    </a>
                    <a href="https://wa.me/919420512501" target="_blank" class="btn-accent text-xs py-2 px-3.5 gap-1.5 whitespace-nowrap">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                        <span>HR WhatsApp</span>
                    </a>
                </div>

                <!-- Mobile Hamburger -->
                <button id="mobileMenuBtn" class="xl:hidden p-2 rounded-xl text-navy-900 hover:bg-gray-100 transition-colors" aria-label="Toggle navigation">
                    <i data-lucide="menu" class="w-6 h-6"></i>
                </button>
            </div>
        </div>

        <!-- Mobile Drawer -->
        <div id="mobileMenu" class="hidden xl:hidden fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-md">
            <div class="fixed top-0 right-0 w-80 max-w-full h-full bg-white shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
                <div>
                    <div class="flex items-center justify-between pb-6 border-b border-gray-100">
                        <div class="flex items-center gap-2.5">
                            <img src="${imgPrefix}images/logos/Plan-B-Careers-logo.png" alt="Plan B Careers Logo" class="h-8 w-auto">
                            <div class="flex flex-col">
                                <span class="font-display font-extrabold text-sm text-navy-900 leading-none whitespace-nowrap">PLAN B CAREERS</span>
                                <span class="text-[9px] font-semibold text-teal-600 uppercase leading-none mt-1 whitespace-nowrap">Backup jo kaam kare</span>
                            </div>
                        </div>
                        <button id="closeMobileMenuBtn" class="p-2 text-slate hover:text-navy-900 rounded-lg">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="py-6 flex flex-col gap-1.5">
                        ${mNavLink('index.html', 'Home', 'home')}
                        ${mNavLink('jobs.html', 'Find Jobs', 'jobs')}
                        ${mNavLink('women-wfh.html', 'Work From Home', 'wfh')}
                        ${mNavLink('admissions.html', 'Admissions Guidance', 'admissions')}
                        <a href="${prefix}dashboard.html" class="px-4 py-2.5 rounded-xl font-medium text-navy-900 hover:bg-teal-50">Candidate Portal</a>
                        ${mNavLink('verify-candidate.html', 'Verify Candidate', 'verify')}
                        ${mNavLink('trust.html', 'Trust Center', 'trust')}
                        ${mNavLink('about.html', 'About Us', 'about')}
                        ${mNavLink('contact.html', 'Contact', 'contact')}
                    </div>
                </div>

                <div class="pt-6 border-t border-gray-100 flex flex-col gap-3">
                    <a href="${prefix}dashboard.html" class="btn-outline-navy w-full py-2.5 justify-center gap-2 text-xs">
                        <i data-lucide="user" class="w-4 h-4 text-teal-600"></i>
                        <span>Candidate Portal</span>
                    </a>
                    <a href="https://wa.me/919420512501" target="_blank" class="btn-accent w-full py-3 justify-center gap-2 text-xs">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                        <span>HR WhatsApp Desk</span>
                    </a>
                </div>
            </div>
        </div>
    </header>`;
}

const targetFiles = [
    'index.html',
    'jobs.html',
    'women-wfh.html',
    'admissions.html',
    'apply-admission.html',
    'apply-job.html',
    'job-details.html',
    'about.html',
    'contact.html',
    'trust.html',
    'fast-track.html',
    'business.html',
    'resources.html',
    'success-stories.html',
    'verify-candidate.html',
    'disclaimer.html',
    'privacy-policy.html',
    'refund-policy.html',
    'terms.html',
    'legal.html',
    'connect.html',
    'jobs-impact.html',
    'women-wfh-impact.html',
    'students-earning-impact.html',
    'admissions-impact.html'
];

targetFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace <header ... </header> or old <nav class="navbar ... </nav>
    const headerRegex = /<!-- MAIN NAVBAR -->[\s\S]*?<\/header>|<header id="navbar"[\s\S]*?<\/header>|<header class="header-glass[\s\S]*?<\/header>|(?:<!-- NAVIGATION BAR -->\s*)?<nav class="navbar[\s\S]*?<\/nav>/i;
    if (headerRegex.test(content)) {
        content = content.replace(headerRegex, getHeader(file));
        console.log(`Standardized header in ${file}`);
    } else {
        console.log(`Header tag not matched in ${file}`);
    }

    // Clean address locality in JSON-LD schemas
    content = content.replace(/"addressLocality":\s*"Chhatrapati Sambhajinagar"/g, '"addressLocality": "Akola"');
    content = content.replace(/"postalCode":\s*"431005"/g, '"postalCode": "444002"');

    // Clean remaining ₹0 / Free fee badges
    content = content.replace(/₹0 Registration Fee/g, 'Professional Placement Support');
    content = content.replace(/100% Free Placement/g, 'Professional Placement Assistance');
    content = content.replace(/Zero Registration Fee Policy/gi, 'Official Service & Registration Policy');
    content = content.replace(/Fee for Freshers/g, 'Verified Hiring Sectors');
    content = content.replace(/<span class="font-outfit font-extrabold text-2xl sm:text-3xl text-lime-600 block">₹0<\/span>/g, '<span class="font-outfit font-extrabold text-2xl sm:text-3xl text-teal-600 block">15+</span>');

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('All targeted headers and claims standardized successfully!');
