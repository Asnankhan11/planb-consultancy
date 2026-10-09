const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('planb.sqlite');

const newJobs = [
  {
    title: "Backend Process Executive",
    company: "SnapThink",
    location: "Pan India",
    salary: "Up to ₹30,000 / month",
    type: "Work From Home",
    description: "Process: 100% Non-Voice\nExperience: Freshers and experienced candidates\n\nResponsibilities:\n- Data entry and record updating\n- Verify hotel booking data\n- Identify and fix revenue leakage\n- Maintain accurate records\n- Check documents and data accuracy\n- Update spreadsheets and internal systems\n- Follow SOPs and process guidelines\n- Coordinate with internal teams\n\nRequirements:\n- Basic computer knowledge\n- MS Excel or Google Sheets\n- Good typing speed and attention to detail\n- Basic English reading and writing\n- Laptop or desktop mandatory\n- Stable internet connection\n\nBenefits:\n- Non-voice process\n- No target, as advertised\n- Work from home\n- Performance-based growth"
  },
  {
    title: "Remote Telesales Specialist",
    company: "Zenith Info & Technology",
    location: "Remote",
    salary: "₹20,000 / month + incentives",
    type: "Work From Home",
    description: "Working Hours: 10:00 AM–7:00 PM\nBreak: 1 hour\nWeekly Off: 1 day per week, usually Tuesday\nLanguage: Fluent Hindi\n\nRequirements:\n- Own Windows PC\n- Clear headset\n- Quiet working environment\n- Fluent Hindi communication\n\nResponsibilities:\n- Outbound telesales calling\n- Communicate with prospective customers\n- Explain products or services\n- Follow up with interested customers"
  },
  {
    title: "Calling Executive",
    company: "Yes Spin",
    location: "Confirm with recruiter",
    salary: "₹16,000 in-hand (Up to ₹35k with incentives)",
    type: "Work From Office",
    description: "Process: Outbound Calling\nWorking Days: 6 days per week\nWeekly Off: Sunday\nShift: 10:00 AM–10:00 PM\nBreak: 2 hours\nQualification: 12th Pass / Graduate, any stream\nExperience: Freshers and experienced candidates\nLanguages: Hindi and English\n\nResponsibilities:\n- Make outbound calls to potential users\n- Follow the provided script\n- Explain the gaming platform\n- Answer customer queries\n- Maintain accurate call logs\n- Achieve calling and quality targets\n- Coordinate with the team\n\nRequirements:\n- Good communication skills\n- Basic computer knowledge\n- Ability to follow scripts and company guidelines"
  },
  {
    title: "Business Development Executive (BDE) Intern",
    company: "RunElix Technologies",
    location: "Madhapur, Hyderabad",
    salary: "₹8,000–₹12,000 / month Stipend",
    type: "Work From Office",
    description: "Duration: 3–6 months\nPost-Internship Salary: ₹2–4 LPA, based on performance\nQualification: Any UG/PG degree or equivalent\nExperience: Freshers can apply\n\nResponsibilities:\n- Identify potential clients\n- Generate and qualify leads\n- Conduct market research\n- Understand customer requirements\n- Follow up with prospects\n- Prepare proposals and presentations\n- Maintain lead information in CRM systems\n- Support business development activities\n\nRequirements:\n- Good verbal and written communication\n- Relationship-building skills\n- Basic sales and business development knowledge\n- Follow-up and negotiation skills\n- Basic MS Office or Google Workspace knowledge\n- Willingness to learn\n\nContact: Phone: +91 73969 960987 | Email: hr@runelix.com"
  },
  {
    title: "Customer Support Executive",
    company: "Maxicus",
    location: "Remote",
    salary: "₹13,500 in-hand (₹18,000 CTC)",
    type: "Work From Home",
    description: "Process: Chat Support / Voice Support\nAge Limit: 18–40 years\nWorking Hours: 9 hours working + 1 hour break\nWorking Days: 6 days per week\nWeekly Off: 1 rotational day\nShifts: Rotational\n\nRequirements:\n- Laptop\n- Wi-Fi / stable internet\n- Power backup\n- Good communication skills\n- Good interpersonal skills"
  },
  {
    title: "Junior Python / Data Analytics Trainer",
    company: "VRS Universal",
    location: "Indore",
    salary: "₹12,000–₹15,000 / month",
    type: "Work From Office",
    description: "Experience: 0–2 years; freshers can apply\nQualification: Any graduate\nCommitment: 1-year bond, as advertised\n\nResponsibilities:\n- Assist learners with Python, SQL, Excel and Power BI\n- Support trainers during practical sessions\n- Help learners with assignments\n- Answer technical queries\n- Conduct basic practical sessions\n- Assist with data analytics and ML-related projects\n\nRequirements:\n- Good knowledge of Python and SQL\n- Basic Excel, Power BI and data analytics knowledge\n- Communication and problem-solving skills\n- Interest in teaching and training\n- Teaching experience preferred, not mandatory\n- Willingness to commit for at least one year\n\nContact: Phone: 9993921103 | Email: hrintervrs@gmail.com | Website: www.vrsuniversal.com"
  },
  {
    title: "Recharge Assistant",
    company: "Dish TV",
    location: "Remote",
    salary: "Commission-based",
    type: "Freelance",
    description: "Device: Smartphone; laptop not required\nLanguage: Fluent Hindi\nSelection: Easy selection, as advertised\n\nResponsibilities:\n- Guide customers through Dish TV recharge options\n- Help customers complete recharge payments\n\nNote: Earnings are purely commission-based."
  },
  {
    title: "Telesales Executive",
    company: "Yes Spin / iGaming",
    location: "Remote",
    salary: "₹20,000–₹25,000 fixed / month",
    type: "Work From Home",
    description: "Weekly Off: Sunday\nShift: Day shift only\nLanguages: Hindi, Kannada and Telugu\n\nRequirements:\n- Laptop\n- High-speed Wi-Fi\n- Basic computer knowledge\n- Strong communication skills\n\nResponsibilities:\n- Make outbound calls\n- Introduce gaming products\n- Explain offers and features\n- Generate customer interest\n- Follow calling targets\n- Maintain call logs"
  },
  {
    title: "Barcode Generation / Data Processing Associate",
    company: "Opsora Global Services",
    location: "Remote",
    salary: "Performance-based (Up to ₹28,000)",
    type: "Flexible",
    description: "Device: Mobile or laptop\nWorking Cycle: 25 days per month\nTimings: Flexible, advertised as 24/7\nPayment: Within 10 days after cycle completion, as advertised\n\nAdvertised Compensation:\n- 2,000 barcodes × ₹5 = ₹10,000\n- 2,500 barcodes × ₹6 = ₹15,000\n- 3,000 barcodes × ₹7 = ₹21,000\n- 3,500 barcodes × ₹8 = ₹28,000\n\nResponsibilities:\n- Generate barcodes\n- Complete assigned data processing\n- Maintain accurate work records\n- Follow company guidelines\n\nRequirements:\n- Smartphone or laptop\n- Attention to detail\n- Ability to complete assigned work accurately"
  },
  {
    title: "AI Engineer",
    company: "Atmiya Infosoft",
    location: "Uttran, Surat",
    salary: "Not specified",
    type: "Work From Office",
    description: "Experience: 6 months–2 years\n\nContact: Phone: +91 97278 79012 | Email: hr@atmiyainfosoft.com"
  },
  {
    title: "iOS Developer",
    company: "Atmiya Infosoft",
    location: "Uttran, Surat",
    salary: "Not specified",
    type: "Work From Office",
    description: "Experience: 6 months–1 year\n\nContact: Phone: +91 97278 79012 | Email: hr@atmiyainfosoft.com"
  },
  {
    title: "Android Developer",
    company: "Atmiya Infosoft",
    location: "Uttran, Surat",
    salary: "Not specified",
    type: "Work From Office",
    description: "Experience: 3–5 years\n\nContact: Phone: +91 97278 79012 | Email: hr@atmiyainfosoft.com"
  },
  {
    title: "Telecaller – Sales",
    company: "Atmiya Infosoft",
    location: "Uttran, Surat",
    salary: "Not specified",
    type: "Work From Office",
    description: "Number of Openings: 2\nExperience: 6 months–1 year\n\nContact: Phone: +91 97278 79012 | Email: hr@atmiyainfosoft.com"
  },
  {
    title: "Inventory Executive",
    company: "Opsora Global Services",
    location: "Remote",
    salary: "Up to ₹15,000 / month",
    type: "Flexible",
    description: "Device: Mobile-friendly\n\nResponsibilities:\n- Add and manage product details\n- Generate and maintain barcodes\n- Upload product images\n- Maintain data quality\n- Follow SOPs\n- Help maintain inventory records\n\nRequirements:\n- Attention to detail\n- Basic digital skills\n- Ability to manage product information accurately"
  },
  {
    title: "EdTech Sales Executive",
    company: "Plan B Careers",
    location: "Remote",
    salary: "₹18,000 / month + incentives",
    type: "Work From Home",
    description: "Shift: 11:00 AM–9:00 PM\nWorking Days: 6 days per week\nLanguage: Hindi and English\nLaptop: Mandatory\nExperience: Prior sales experience mandatory\n\nResponsibilities:\n- Make outbound calls to prospective customers\n- Explain educational programs\n- Understand customer requirements\n- Follow up with interested leads\n- Convert prospective customers into enrollments\n- Maintain call quality and achieve sales targets\n\nRequirements:\n- Sales experience from any sector\n- Good Hindi and English communication\n- Comfortable with target-based sales\n- Laptop and stable internet\n- Availability for the complete shift"
  },
  {
    title: "Collection Agent",
    company: "Green AI Technology Private Limited",
    location: "Pan India",
    salary: "₹18,000 / month (Fixed) + Incentives",
    type: "Work From Home",
    description: "Industry: Telecom Collection\nExperience: 1–5 years\nAdditional Incentives: Advertised potential earnings of ₹40,000–₹60,000 per month after achieving targets\nLanguages: Hindi and English\n\nRequirements:\n- Laptop\n- Suitable internet connection\n- Collection and recovery knowledge\n- Communication and negotiation skills\n\nResponsibilities:\n- Contact customers regarding repayment\n- Handle collection calls\n- Maintain customer records\n- Resolve queries\n- Achieve collection targets\n- Follow company collection policies"
  },
  {
    title: "Customer Support Executive",
    company: "Everika Global BPM Solutions (TGBS)",
    location: "Confirm with recruiter",
    salary: "₹13,000 / month + incentives",
    type: "Work From Home",
    description: "Process: Calling / Voice Support\nWork Mode: Work From Home or Work From Office at Opium B&B, depending on the actual opening\nQualification: Higher Secondary (12th) Pass\nLanguages: Hindi and English\n\nRequirements:\n- Good communication skills\n- Basic computer knowledge\n- Target-oriented approach\n- Survey process experience is an advantage\n\nResponsibilities:\n- Customer calling\n- Handle customer queries\n- Maintain call records\n- Follow process guidelines"
  },
  {
    title: "Customer Support Executive",
    company: "Zomato / Eternity",
    location: "Remote",
    salary: "₹16,000 in-hand (₹19,000 CTC)",
    type: "Work From Home",
    description: "Process: Blended (Chat + Voice)\nEmployment: Permanent role, as advertised\nWorking Days: 6 days per week\nShifts: Rotational, including night shifts\nEligibility: HSC (12th Pass) or graduate\nExperience: Freshers only, as advertised\n\nRequirements:\n- Own laptop\n- Stable Wi-Fi\n- High-speed internet\n- Mandatory USB headset\n- Active inverter or generator for power backup\n- Good verbal English communication\n- Basic knowledge of computer systems and hardware"
  },
  {
    title: "International Customer Support Executive",
    company: "Not specified",
    location: "Remote",
    salary: "₹13,000–₹15,000 / month after training",
    type: "Work From Home",
    description: "Process: International Inbound Voice\nCharges: No charges, as advertised\nTraining and Evaluation: 2.5 months\n\nTraining Structure:\n- First 2 weeks: Unpaid training\n- After 2 weeks: Eligible candidates receive ₹100 per day during the remaining training period\n- Subject to attendance, performance and company conditions\n\nRequirements:\n- Excellent spoken English and pronunciation\n- Strong communication skills\n- Customer-handling and problem-solving skills\n- Comfortable speaking with international customers\n- Willingness to work rotational and night shifts\n- Previous international BPO experience preferred, not mandatory\n\nTechnical Requirements:\n- Intel Core i5 10th Gen or AMD Ryzen 5 equivalent\n- Minimum 12 GB RAM; 16 GB preferred\n- Minimum 108 GB available storage\n- Windows 10/11 or compatible OS\n- Dual monitors required\n- Functional webcam/camera\n- Minimum 100 Mbps stable broadband\n- Quality headset\n- Quiet professional work environment"
  },
  {
    title: "EdTech Counsellor",
    company: "Physics Wallah (PW)",
    location: "Not specified",
    salary: "₹18,000 in-hand / month + incentives",
    type: "Not specified",
    description: "Job Category: EdTech / Education Counselling"
  }
];

db.serialize(() => {
  newJobs.forEach((job) => {
    db.run(
      "INSERT INTO jobs (title, company, location, salary, type, description) VALUES (?, ?, ?, ?, ?, ?)",
      [job.title, job.company, job.location, job.salary, job.type, job.description],
      function(err) {
        if (err) {
          console.error("Error inserting job:", err);
        } else {
          console.log(`Inserted job ID ${this.lastID}: ${job.title} at ${job.company}`);
        }
      }
    );
  });
});
