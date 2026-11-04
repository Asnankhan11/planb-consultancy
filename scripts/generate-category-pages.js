/**
 * Plan B Careers - Programmatic Category & Regional Location Hub Pages Generator
 */

const fs = require('fs');
const path = require('path');

const jobsFilePath = path.join(__dirname, '..', 'jobs.json');
const outputDir = path.join(__dirname, '..', 'jobs');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const allJobs = JSON.parse(fs.readFileSync(jobsFilePath, 'utf8'));

const pagesConfig = [
    {
        filename: 'work-from-home.html',
        slug: 'work-from-home',
        h1: 'Work From Home Jobs for Freshers in India',
        subtitle: 'Verified remote roles with flexible shifts, reliable monthly payouts, and 100% free candidate assistance.',
        title: 'Work From Home Jobs for Freshers (Verified) | Plan B Careers',
        description: 'Explore verified work from home jobs for freshers and experienced candidates. Non-voice, data entry, telecalling roles with ₹15,000–₹30,000/mo. Apply 100% free.',
        filterFn: (j) => (j.work_mode || j.type || j.location || '').toLowerCase().includes('home') || (j.location || '').toLowerCase().includes('remote'),
        faqs: [
            {
                q: 'What types of work from home jobs are available for freshers?',
                a: 'Plan B Careers provides verified remote opportunities including 100% non-voice chat support, data processing, telecalling, edtech sales counselling, and inventory coordination. Most roles require basic English reading and computer skills.'
            },
            {
                q: 'Do I need a laptop or computer to work from home?',
                a: 'Some roles like Backend Process Executive and International Customer Support require a laptop or desktop with Windows and stable Wi-Fi. However, roles like mobile data processing and recharge assistance can be completed using a smartphone.'
            },
            {
                q: 'Does Plan B Careers charge candidates for its services?',
                a: 'Yes. Plan B Careers provides professional recruitment, career counselling, interview preparation and placement assistance through paid services. Applicable registration or service charges may vary depending on the service selected.'
            }
        ]
    },
    {
        filename: 'customer-support.html',
        slug: 'customer-support',
        h1: 'Customer Support & Non-Voice BPO Jobs',
        subtitle: 'Inbound, outbound, and live chat support vacancies with leading multinational BPOs and enterprise hiring partners.',
        title: 'Customer Support & Non-Voice BPO Jobs | Plan B Careers',
        description: 'Find genuine customer support voice and non-voice chat jobs. Immediate hiring for freshers and experienced with top MNCs and domestic BPOs. Apply free.',
        filterFn: (j) => {
            const str = ((j.title || '') + ' ' + (j.categories || []).join(' ')).toLowerCase();
            return str.includes('support') || str.includes('voice') || str.includes('chat') || str.includes('bpo') || str.includes('process');
        },
        faqs: [
            {
                q: 'What is the difference between voice and non-voice customer support?',
                a: 'Voice customer support involves answering phone calls from customers to address queries or resolve complaints. Non-voice support is conducted via live chat, email, or ticketing systems without making or receiving voice calls.'
            },
            {
                q: 'Can freshers apply for international customer support positions?',
                a: 'Yes. Freshers with good English pronunciation and communication skills are eligible for international voice and chat processes. Training is provided by our hiring partners.'
            }
        ]
    },
    {
        filename: 'data-entry.html',
        slug: 'data-entry',
        h1: 'Back Office & Data Entry Jobs from Home',
        subtitle: 'Authentic data processing, typing, and digital annotation jobs with transparent performance-based compensation.',
        title: 'Back Office & Data Entry Jobs from Home | Plan B Careers',
        description: 'Verified back office, data entry, and barcode processing jobs. Smartphone and PC options for freshers and students across India. Verified recruitment & interview assistance.',
        filterFn: (j) => {
            const str = ((j.title || '') + ' ' + (j.categories || []).join(' ')).toLowerCase();
            return str.includes('data') || str.includes('barcode') || str.includes('entry') || str.includes('inventory') || str.includes('office');
        },
        faqs: [
            {
                q: 'How can I identify genuine data entry jobs from online scams?',
                a: 'Genuine data entry jobs never ask for security deposits, registration fees, or software purchasing costs. Plan B Careers verifies every employer partner to guarantee 100% free and legitimate work.'
            },
            {
                q: 'What skills are required for back office executive roles?',
                a: 'Essential skills include basic proficiency in MS Excel or Google Sheets, a typing speed of 25+ words per minute, attention to detail, and basic English comprehension.'
            }
        ]
    },
    {
        filename: 'telecalling.html',
        slug: 'telecalling',
        h1: 'Telecalling & Telesales Job Opportunities',
        subtitle: 'High-growth career tracks with fixed monthly salary plus uncapped incentive structures in education, telecom, and finance.',
        title: 'Telecalling & Telesales Jobs (Remote & Office) | Plan B Careers',
        description: 'Apply for telecalling, telesales, and EdTech counselling jobs. Fixed salary plus attractive incentives. Immediate interview scheduling via WhatsApp.',
        filterFn: (j) => {
            const str = ((j.title || '') + ' ' + (j.categories || []).join(' ')).toLowerCase();
            return str.includes('tele') || str.includes('sales') || str.includes('counsellor') || str.includes('collection');
        },
        faqs: [
            {
                q: 'What is the salary structure for telesales and telecalling roles?',
                a: 'Entry-level telecallers earn between ₹15,000 and ₹22,000 fixed per month. High-performing executives earn additional performance incentives of ₹10,000 to ₹40,000 monthly.'
            },
            {
                q: 'Is English fluency mandatory for telecalling jobs?',
                a: 'No. While some corporate accounts require bilingual fluency (English and Hindi), multiple domestic campaigns specifically seek fluent Hindi, Marathi, or regional language speakers.'
            }
        ]
    },
    {
        filename: 'freshers.html',
        slug: 'freshers',
        h1: 'Fresher Jobs for 12th Pass & College Graduates',
        subtitle: 'Kickstart your corporate journey with verified entry-level openings requiring zero prior work experience.',
        title: 'Fresher Jobs for 12th Pass & Graduates | Plan B Careers',
        description: 'Browse entry-level jobs for 10th pass, 12th pass, and fresh graduates. No experience required. Free interview preparation and direct placement support.',
        filterFn: (j) => {
            const exp = (j.experience_level || '').toLowerCase();
            const qual = (j.qualification || '').toLowerCase();
            const cats = (j.categories || []).join(' ').toLowerCase();
            return exp.includes('fresher') || exp.includes('0') || qual.includes('12th') || cats.includes('fresh');
        },
        faqs: [
            {
                q: 'Can 12th pass students apply for jobs through Plan B Careers?',
                a: 'Yes. We actively recruit 12th pass candidates for customer support, telecalling, retail executive, and backend operations positions.'
            },
            {
                q: 'How does Plan B Careers prepare freshers for job interviews?',
                a: 'Our HR coordinators conduct complimentary resume reviews, mock telephonic interviews, and share company-specific interview question sets to ensure candidates pass client rounds confidently.'
            }
        ]
    },
    // Regional Location Hubs
    {
        filename: 'location-akola.html',
        slug: 'location-akola',
        isLocation: true,
        cityName: 'Akola',
        h1: 'Verified Jobs in Akola for Freshers & Experienced',
        subtitle: 'Local office positions and verified work-from-home vacancies curated for candidates across Akola district.',
        title: 'Jobs in Akola for Freshers & Experienced | Plan B Careers',
        description: 'Find verified jobs in Akola, Maharashtra. HR recruiter, back office, sales, and work from home vacancies. Visit our Civil Lines desk or apply online.',
        filterFn: (j) => {
            const loc = (j.location || '').toLowerCase();
            const isWfh = (j.work_mode || j.type || '').toLowerCase().includes('home') || loc.includes('remote');
            return loc.includes('akola') || isWfh;
        },
        faqs: [
            {
                q: 'Where is the Plan B Careers office located in Akola?',
                a: 'Our regional operations desk is located at Civil Lines, Akola, Maharashtra 444001. Candidates can contact our team at +91 9420512501 for appointments.'
            },
            {
                q: 'Are work from home jobs available for candidates residing in Akola?',
                a: 'Yes. We connect candidates in Akola with national employers offering 100% remote positions in non-voice support, telecalling, and backend processing.'
            }
        ]
    },
    {
        filename: 'location-pune.html',
        slug: 'location-pune',
        isLocation: true,
        cityName: 'Pune',
        h1: 'Jobs in Pune for Freshers – BPO, IT & Remote Roles',
        subtitle: 'Access high-growth corporate careers in Pune with leading technology, BPO, and retail corporate partners.',
        title: 'Jobs in Pune for Freshers (WFH & Office) | Plan B Careers',
        description: 'Explore top jobs in Pune for freshers. Customer support, BPO, data entry, and remote positions. Verified openings with competitive salaries.',
        filterFn: (j) => {
            const loc = (j.location || '').toLowerCase();
            const isWfh = (j.work_mode || j.type || '').toLowerCase().includes('home') || loc.includes('remote');
            return loc.includes('pune') || isWfh;
        },
        faqs: [
            {
                q: 'What is the average starting salary for freshers in Pune BPO jobs?',
                a: 'Freshers placed in Pune corporate BPOs typically start between ₹18,000 and ₹26,000 per month, with annual packages ranging from 2.2 LPA to 3.5 LPA.'
            }
        ]
    },
    {
        filename: 'location-nagpur.html',
        slug: 'location-nagpur',
        isLocation: true,
        cityName: 'Nagpur',
        h1: 'Jobs in Nagpur for Freshers & Graduates',
        subtitle: 'Verified vacancies across MIHAN, Sitabuldi, and remote setups for candidates living in Vidarbha.',
        title: 'Jobs in Nagpur for Freshers & Graduates | Plan B Careers',
        description: 'Discover entry-level and experienced jobs in Nagpur. Back office, telecalling, and remote WFH roles. Connect with Plan B Careers recruitment desk.',
        filterFn: (j) => {
            const loc = (j.location || '').toLowerCase();
            const isWfh = (j.work_mode || j.type || '').toLowerCase().includes('home') || loc.includes('remote');
            return loc.includes('nagpur') || isWfh;
        },
        faqs: [
            {
                q: 'Are remote work options available for candidates in Nagpur?',
                a: 'Yes. Candidates in Nagpur can apply for verified remote non-voice, telesales, and backend data processing jobs without relocating.'
            }
        ]
    },
    {
        filename: 'location-mumbai.html',
        slug: 'location-mumbai',
        isLocation: true,
        cityName: 'Mumbai',
        h1: 'Jobs in Mumbai & Navi Mumbai for Freshers',
        subtitle: 'Entry-level customer care, sales, and remote vacancies with leading corporate organizations across Mumbai MMR.',
        title: 'Jobs in Mumbai for Freshers (BPO & Remote) | Plan B Careers',
        description: 'Apply for verified jobs in Mumbai and Navi Mumbai. Call center, chat support, sales, and remote roles. 100% free candidate recruitment.',
        filterFn: (j) => {
            const loc = (j.location || '').toLowerCase();
            const isWfh = (j.work_mode || j.type || '').toLowerCase().includes('home') || loc.includes('remote');
            return loc.includes('mumbai') || isWfh;
        },
        faqs: [
            {
                q: 'Do Mumbai recruitment openings provide night shift allowance?',
                a: 'Yes. International customer support roles in Mumbai typically offer additional shift allowances and free centralized cab transport or work from home.'
            }
        ]
    },
    {
        filename: 'location-chhatrapati-sambhajinagar.html',
        slug: 'location-chhatrapati-sambhajinagar',
        isLocation: true,
        cityName: 'Chhatrapati Sambhajinagar',
        h1: 'Jobs in Chhatrapati Sambhajinagar (Aurangabad)',
        subtitle: 'Official headquarters of Plan B Careers. Connect directly with our local recruitment desk in Garkheda Parisar.',
        title: 'Jobs in Chhatrapati Sambhajinagar | Plan B Careers Office',
        description: 'Official Plan B Careers consultancy hub in Chhatrapati Sambhajinagar. BPO, admission counselling, telecalling, and WFH roles. Visit our Garkheda desk.',
        filterFn: (j) => {
            const loc = (j.location || '').toLowerCase();
            const isWfh = (j.work_mode || j.type || '').toLowerCase().includes('home') || loc.includes('remote');
            return loc.includes('sambhajinagar') || loc.includes('aurangabad') || isWfh;
        },
        faqs: [
            {
                q: 'Where is the main office of Plan B Careers located?',
                a: 'Our main office is located opposite Dr. Hedgewar Hospital, Garkheda Parisar, Chhatrapati Sambhajinagar, Maharashtra 431005. Contact +91 9420512501 for visiting hours.'
            },
            {
                q: 'What services are offered at the Chhatrapati Sambhajinagar office?',
                a: 'We offer free candidate job registration, interview preparation, career counselling, and higher education admission guidance (UG, PG, MBA, NEET MBBS).'
            }
        ]
    }
];

function generateCategoryPageHtml(cfg, matchingJobs) {
    const canonicalUrl = `https://planbcareers.in/jobs/${cfg.filename}`;

    // Schema: ItemList
    const itemListSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": cfg.h1,
        "description": cfg.description,
        "numberOfItems": matchingJobs.length,
        "itemListElement": matchingJobs.map((j, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "url": `https://planbcareers.in/job/${j.id}.html`,
            "name": j.title
        }))
    };

    // Schema: BreadcrumbList
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://planbcareers.in/" },
            { "@type": "ListItem", "position": 2, "name": "Jobs", "item": "https://planbcareers.in/jobs.html" },
            { "@type": "ListItem", "position": 3, "name": cfg.cityName ? `Jobs in ${cfg.cityName}` : cfg.h1, "item": canonicalUrl }
        ]
    };

    // Schema: FAQPage
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": (cfg.faqs || []).map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f.a
            }
        }))
    };

    // Optional Schema: LocalBusiness for location pages
    let localBizSchemaStr = '';
    if (cfg.isLocation) {
        const localBiz = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": `Plan B Careers - ${cfg.cityName} Desk`,
            "image": "https://planbcareers.in/images/logos/Plan-B-Careers-logo.png",
            "telephone": "+919420512501",
            "email": "contact.planbcareers@gmail.com",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "Opp. Dr. Hedgewar Hospital, Garkheda Parisar",
                "addressLocality": cfg.cityName,
                "addressRegion": "MH",
                "postalCode": "431005",
                "addressCountry": "IN"
            },
            "priceRange": "Paid Professional Services",
            "url": canonicalUrl
        };
        localBizSchemaStr = `<script type="application/ld+json">\n${JSON.stringify(localBiz, null, 2)}\n</script>`;
    }

    // Render Job Cards HTML
    const cardsHtml = matchingJobs.map(job => {
        const isWfh = (job.work_mode || job.type || job.location || '').toLowerCase().includes('home');
        const isClosed = (job.status || '').toLowerCase() === 'closed';
        return `
            <div class="card-modern flex flex-col justify-between h-full group hover:shadow-xl transition-all">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold px-3 py-1 rounded-full ${isWfh ? 'bg-teal-50 text-teal-800' : 'bg-navy-50 text-navy-900'}">
                            ${job.work_mode || 'Full Time'}
                        </span>
                        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${isClosed ? 'bg-gray-100 text-slate' : 'bg-lime-100 text-lime-900'}">
                            ${isClosed ? 'Closed' : 'Active'}
                        </span>
                    </div>

                    <h3 class="text-lg font-bold text-navy-900 group-hover:text-teal-700 transition-colors mb-1 leading-snug">
                        <a href="/job/${job.id}.html">${job.title}</a>
                    </h3>
                    
                    <p class="text-xs text-slate mb-3">${job.company || 'Plan B Hiring Partner'} • <span class="text-teal-700 font-medium">Verified Opening</span></p>

                    <div class="mb-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-ivory border border-gray-200 text-navy-900 text-xs font-bold">
                        <i data-lucide="wallet" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>${job.salary || 'Salary Negotiable'}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs text-charcoal mb-4 bg-ivory/60 p-2.5 rounded-xl border border-gray-200/60">
                        <div class="truncate">📍 ${job.location || 'Remote'}</div>
                        <div class="truncate">🎓 ${job.qualification || '12th Pass / Graduate'}</div>
                        <div class="truncate">💼 ${job.experience_level || 'Fresher'}</div>
                        <div class="truncate">⏰ ${job.shifts || 'Day Shift'}</div>
                    </div>
                </div>

                <div class="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <a href="/job/${job.id}.html" class="btn-outline-navy text-xs py-2 px-3 justify-center gap-1 flex-1">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Details</span>
                    </a>
                    <a href="https://wa.me/919420512501?text=Hello%20HR,%20I%20am%20interested%20in%20${encodeURIComponent(job.title)}" target="_blank" class="btn-accent text-xs py-2 px-3 justify-center gap-1 flex-1">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Apply</span>
                    </a>
                </div>
            </div>
        `;
    }).join('');

    // Render FAQs HTML
    const faqsHtml = (cfg.faqs || []).map(f => `
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 class="text-base font-bold text-navy-900 mb-2 flex items-center gap-2">
                <i data-lucide="help-circle" class="w-4 h-4 text-teal-600 shrink-0"></i>
                ${f.q}
            </h3>
            <p class="text-xs sm:text-sm text-slate leading-relaxed">
                ${f.a}
            </p>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-N8FKFJBJPM"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-N8FKFJBJPM');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cfg.title}</title>
    <meta name="description" content="${cfg.description}">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${cfg.title}">
    <meta property="og:description" content="${cfg.description}">
    <meta property="og:image" content="https://planbcareers.in/images/logos/Plan-B-Careers-logo.png">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${cfg.title}">
    <meta name="twitter:description" content="${cfg.description}">
    <meta name="twitter:image" content="https://planbcareers.in/images/logos/Plan-B-Careers-logo.png">

    <link rel="stylesheet" href="/css/styles.css?v=5.0">
    <link rel="stylesheet" href="/css/white-theme.css?v=2.0">
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(itemListSchema, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
    </script>
    ${localBizSchemaStr}
</head>
<body class="bg-ivory text-charcoal min-h-screen flex flex-col font-sans selection:bg-lime-400 selection:text-navy-950">

    <!-- TOP ANNOUNCEMENT BAR -->
    <div class="bg-navy-900 text-white text-xs py-2 px-4 border-b border-navy-800">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div class="flex items-center gap-2">
                <span class="badge-lime text-[10px] py-0.5 px-2">Professional Placement Desk</span>
                <span class="text-slate font-medium">MSME Registered: UDYAM-MH-01-0027668 • Direct WhatsApp Dispatch</span>
            </div>
            <div class="flex items-center gap-4 text-slate">
                <a href="https://wa.me/919420512501" target="_blank" class="hover:text-lime-300 transition-colors flex items-center gap-1">
                    <i data-lucide="phone-call" class="w-3.5 h-3.5 text-lime-400"></i> +91 9420512501
                </a>
                <span>•</span>
                <a href="/verify-candidate.html" class="hover:text-white transition-colors">Candidate Verification</a>
            </div>
        </div>
    </div>

    <!-- MAIN NAVBAR -->
    <header class="header-glass sticky top-0 z-40 transition-all duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
                <a href="/" class="flex items-center gap-3 group">
                    <img src="/images/logos/Plan-B-Careers-logo.png" alt="Plan B Careers Logo" class="h-10 w-auto object-contain transition-transform group-hover:scale-105">
                    <div class="flex flex-col">
                        <span class="font-display font-bold text-lg text-navy-900 leading-tight">PLAN B CAREERS</span>
                        <span class="text-[10px] font-semibold text-teal-600 tracking-wider uppercase">Backup jo kaam kare</span>
                    </div>
                </a>

                <nav class="hidden lg:flex items-center gap-1">
                    <a href="/" class="nav-item">Home</a>
                    <a href="/jobs.html" class="nav-item active">Find Jobs</a>
                    <a href="/women-wfh.html" class="nav-item">Work From Home</a>
                    <a href="/admissions.html" class="nav-item">Admissions</a>
                    <a href="/dashboard.html" class="nav-item">Candidate Portal</a>
                    <a href="/trust.html" class="nav-item">Trust Center</a>
                    <a href="/about.html" class="nav-item">About Us</a>
                    <a href="/contact.html" class="nav-item">Contact</a>
                </nav>

                <div class="hidden sm:flex items-center gap-3">
                    <a href="/dashboard.html" class="btn-outline-navy text-xs py-2 px-3.5 gap-1.5">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="https://wa.me/919420512501" target="_blank" class="btn-accent text-xs py-2 px-4 gap-1.5">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                        <span>HR WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- HERO HEADER -->
    <section class="bg-gradient-to-b from-teal-50/70 via-ivory to-ivory py-12 sm:py-16 border-b border-gray-200/60">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <nav class="flex items-center gap-2 text-xs text-slate mb-4 flex-wrap" aria-label="Breadcrumb">
                <a href="/" class="hover:text-teal-700">Home</a>
                <span>/</span>
                <a href="/jobs.html" class="hover:text-teal-700">Jobs</a>
                <span>/</span>
                <span class="text-navy-900 font-semibold">${cfg.cityName ? `Jobs in ${cfg.cityName}` : cfg.h1}</span>
            </nav>

            <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-teal-200 text-teal-800 text-xs font-bold mb-4 shadow-sm">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-teal-600"></i>
                <span>${matchingJobs.length} Verified Vacancies Available Today</span>
            </div>

            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-navy-900 leading-tight mb-4 max-w-4xl">
                ${cfg.h1}
            </h1>

            <p class="text-sm sm:text-base text-slate max-w-2xl leading-relaxed mb-6">
                ${cfg.subtitle}
            </p>

            <div class="flex flex-wrap items-center gap-3">
                <a href="https://wa.me/919420512501?text=Hello%20HR,%20I%20am%20looking%20for%20${encodeURIComponent(cfg.h1)}" target="_blank" class="btn-accent py-3 px-6 gap-2">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                    <span>Connect with Recruitment HR</span>
                </a>
                <a href="/jobs.html" class="btn-outline-navy py-3 px-5 gap-2">
                    <i data-lucide="sliders-horizontal" class="w-4 h-4 text-teal-600"></i>
                    <span>View All Categories</span>
                </a>
            </div>
        </div>
    </section>

    <!-- JOBS GRID SECTION -->
    <main class="py-12 flex-grow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                <h2 class="text-xl sm:text-2xl font-display font-bold text-navy-900">
                    Current Openings (${matchingJobs.length})
                </h2>
                <span class="text-xs text-slate">Updated Daily • Zero Application Fees</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                ${cardsHtml}
            </div>

            <!-- TRUST BANNER -->
            <div class="bg-white border border-gray-200 rounded-3xl p-8 mb-16 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
                <div class="max-w-2xl">
                    <span class="badge-lime text-xs py-0.5 px-2.5 mb-2 inline-block">Official Verification</span>
                    <h3 class="text-xl font-bold text-navy-900 mb-2">Government-Registered Career Advisory</h3>
                    <p class="text-xs sm:text-sm text-slate leading-relaxed">
                        Plan B Careers is an MSME-registered enterprise (UDYAM-MH-01-0027668) based in Maharashtra. We protect candidates against registration scams by delivering 100% free interview scheduling and direct corporate placements.
                    </p>
                </div>
                <a href="/trust.html" class="btn-primary py-3 px-6 shrink-0 gap-2">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                    <span>Read Our Trust Guarantee</span>
                </a>
            </div>

            <!-- FAQ SECTION (AEO / GEO Optimized) -->
            <section class="mb-12">
                <div class="text-center sm:text-left mb-8">
                    <h2 class="text-2xl font-display font-bold text-navy-900 mb-2">Frequently Asked Questions</h2>
                    <p class="text-xs sm:text-sm text-slate">Clear answers regarding eligibility, interview rounds, and selection criteria.</p>
                </div>
                <div class="space-y-4 max-w-4xl">
                    ${faqsHtml}
                </div>
            </section>
        </div>
    </main>

    <!-- FOOTER -->
    <footer class="bg-navy-950 text-white pt-12 pb-8 border-t border-navy-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate pb-6 border-b border-navy-800">
                <div class="flex items-center gap-3">
                    <img src="/images/logos/Plan-B-Careers-logo.png" alt="Plan B Careers Logo" class="h-8 w-auto">
                    <span class="font-display font-bold text-white text-base">PLAN B CAREERS</span>
                </div>
                <div class="flex flex-wrap gap-4 text-xs">
                    <a href="/" class="hover:text-white">Home</a>
                    <a href="/jobs.html" class="hover:text-white">All Jobs</a>
                    <a href="/jobs/work-from-home.html" class="hover:text-white">WFH Jobs</a>
                    <a href="/trust.html" class="hover:text-white">Trust & Safety</a>
                    <a href="/contact.html" class="hover:text-white">Contact Us</a>
                </div>
            </div>
            <div class="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate/70 gap-2">
                <p>&copy; 2026 Plan B Careers. MSME Reg: UDYAM-MH-01-0027668. All rights reserved.</p>
                <p>Professional Recruitment & Career Guidance Platform</p>

            <div class="flex items-center gap-2.5 pt-4">
                <a href="https://www.instagram.com/planbcareers_india/" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#E4405F]/20 hover:border-[#E4405F]/60 transition-all duration-200" aria-label="Plan B Careers on Instagram">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://www.facebook.com/share/1C1xoJXv4H/" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#1877F2]/20 hover:border-[#1877F2]/60 transition-all duration-200" aria-label="Plan B Careers on Facebook">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.linkedin.com/in/planbcareers" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#0A66C2]/20 hover:border-[#0A66C2]/60 transition-all duration-200" aria-label="Plan B Careers on LinkedIn">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </a>
                <a href="https://www.youtube.com/@planbcareers" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#FF0000]/20 hover:border-[#FF0000]/60 transition-all duration-200" aria-label="Plan B Careers on YouTube">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://whatsapp.com/channel/0029Vb8Jj0ZFnSz0gEqmgK10" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#25D366]/20 hover:border-[#25D366]/60 transition-all duration-200" aria-label="Plan B Careers on WhatsApp">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3z"/></svg>
                </a>
            </div>
            </div>
        </div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    </script>
</body>
</html>`;
}

// Generate all configured pages
console.log('Generating category & location hub pages...');
const categoryUrls = [];

pagesConfig.forEach(cfg => {
    const matchingJobs = allJobs.filter(cfg.filterFn);
    // If fewer than 2 matches, top up with open jobs
    const finalJobs = matchingJobs.length > 0 ? matchingJobs : allJobs.slice(0, 4);

    const html = generateCategoryPageHtml(cfg, finalJobs);
    const destPath = path.join(outputDir, cfg.filename);
    fs.writeFileSync(destPath, html, 'utf8');

    categoryUrls.push({
        loc: `https://planbcareers.in/jobs/${cfg.filename}`,
        changefreq: 'daily',
        priority: '0.85'
    });
    console.log(`Generated: /jobs/${cfg.filename} (${finalJobs.length} jobs)`);
});

console.log(`Generated all ${categoryUrls.length} category and location pages successfully!`);

