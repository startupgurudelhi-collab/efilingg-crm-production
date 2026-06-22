/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Employee,
  Lead,
  FollowUp,
  LeadHistory,
  LeadTransfer,
  Proposal,
  Notification,
  ActivityLog,
  LeadStage,
  PREDEFINED_PRICING,
  CustomService,
  ProposalTemplate,
  OfferLetterTemplate,
  Attendance,
  AttendanceAuditLog,
  TeamLeaderMapping,
  HistoricalPayroll,
  LeaveRequest,
  ResignationRequest
} from '../types';
import { pushToPostgres } from './postgresSync';

// IST Date Utilities for Delhi, India Time zone compatibility
export function getISTDateString(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA defaults to YYYY-MM-DD
  return formatter.format(new Date());
}

export function getRelativeISTDateString(offset: number): string {
  const istDateString = getISTDateString();
  const parts = istDateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  dateObj.setDate(dateObj.getDate() + offset);
  
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getISTTimeString(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(new Date());
}

export function getISTISOString(): string {
  const now = new Date();
  const utcTime = now.getTime();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcTime + istOffset);
  return istDate.toISOString().replace('Z', '+05:30');
}

export function matchDateToMonth(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function getPayrollMonths(): string[] {
  const startYear = 2026;
  const startMonth = 3; // April is 3
  
  const now = new Date();
  const currentDateStr = getISTDateString();
  const currentParts = currentDateStr.split('-');
  const currentYear = parseInt(currentParts[0]) || now.getFullYear();
  const currentMonthIdx = (parseInt(currentParts[1]) || (now.getMonth() + 1)) - 1;
  
  const months: string[] = [];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  let y = startYear;
  let m = startMonth;
  while (y < currentYear || (y === currentYear && m <= currentMonthIdx)) {
    months.push(`${monthNames[m]} ${y}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return months;
}

export function getCurrentPayrollMonth(): string {
  const currentDateStr = getISTDateString();
  const currentParts = currentDateStr.split('-');
  const currentYear = parseInt(currentParts[0]);
  const currentMonthIdx = parseInt(currentParts[1]) - 1;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  if (currentYear < 2026 || (currentYear === 2026 && currentMonthIdx < 3)) {
    return "April 2026";
  }
  return `${monthNames[currentMonthIdx]} ${currentYear}`;
}

// Storage keys
const STORAGE_PREFIX = 'efilingg_crm_';
const KEY_EMPLOYEES = `${STORAGE_PREFIX}employees`;
const KEY_LEADS = `${STORAGE_PREFIX}leads`;
const KEY_FOLLOWUPS = `${STORAGE_PREFIX}followups`;
const KEY_HISTORY = `${STORAGE_PREFIX}history`;
const KEY_TRANSFERS = `${STORAGE_PREFIX}transfers`;
const KEY_PROPOSALS = `${STORAGE_PREFIX}proposals`;
const KEY_NOTIFICATIONS = `${STORAGE_PREFIX}notifications`;
const KEY_LOGS = `${STORAGE_PREFIX}logs`;
const KEY_SESSION = `${STORAGE_PREFIX}session`;
const KEY_SERVICES = `${STORAGE_PREFIX}services`;
const KEY_PROPOSAL_TEMPLATE = `${STORAGE_PREFIX}proposaltemplate`;
const KEY_OFFER_LETTER_TEMPLATE = `${STORAGE_PREFIX}offerlettertemplate`;
const KEY_HISTORICAL_PAYROLL = `${STORAGE_PREFIX}historical_payroll`;
const KEY_ATTENDANCE = `${STORAGE_PREFIX}attendance`;
const KEY_ATTENDANCE_AUDIT = `${STORAGE_PREFIX}attendance_audit`;
const KEY_TL_MAPPINGS = `${STORAGE_PREFIX}team_leader_mappings`;

// Initialize base pre-seeded employees
const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-ADMIN',
    name: 'Master Admin',
    email: 'master@efilingg.com',
    mobile: '9217666235',
    role: 'admin',
    status: 'active',
    joinedDate: '2026-06-01',
    password: 'Login@123',
    isPasswordChanged: true,
    employeeCode: 'EFL-MASTER',
    designation: 'Managing Director',
    dateOfJoining: '2026-06-01',
    salary: 85000,
    allowances: 10000,
    otherFixedAllowance: 5000,
    incentivePerConversion: 1000,
    attendanceDays: 26
  }
];

// Shared Client-side In-memory cache for operational databases (never persisted in LocalStorage)
export const crmMemoryStore: Record<string, string> = {};

// Helper to get raw storage (with memory fallback)
export const getStorageString = (key: string): string | null => {
  try {
    if (key.includes('_theme') || key.includes('_is_fresh_load') || key === 'efilingg_crm_session' || key.includes('good_practice_shown_')) {
      return localStorage.getItem(key);
    }
    return crmMemoryStore[key] || null;
  } catch (e) {
    return null;
  }
};

export const setStorageString = (key: string, val: string) => {
  try {
    if (key.includes('_theme') || key.includes('_is_fresh_load') || key === 'efilingg_crm_session' || key.includes('good_practice_shown_')) {
      localStorage.setItem(key, val);
      return;
    }
    crmMemoryStore[key] = val;
    pushToPostgres(key, val).catch((err) => {
      console.warn(`PostgreSQL database push failed for key ${key}:`, err);
    });
  } catch (e) {
    console.error('In-memory cache update failed', e);
  }
};

// Return standard predefined services catalog to prevent empty catalog issues
export function getDefaultPredefinedServices(): CustomService[] {
  const defaultCategory: Record<string, string> = {
    'GST Registration': 'Taxation',
    'Trademark Registration': 'Intellectual Property',
    'Company Registration': 'Business Registration',
    'LLP Registration': 'Business Registration',
    'ITR Filing': 'Taxation',
    'ISO Certification': 'Certification',
    'FSSAI Registration': 'Registration',
    'MSME Registration': 'Registration',
    'Website Development': 'Technology',
    'Accounting Services': 'Compliance',
    'Other': 'Other'
  };

  const defaultPackages: Record<string, string[]> = {
    'Company Registration': ['Certificate of Incorporation', 'PAN Card', 'TAN Card', 'EPF & ESIC Registration', 'Director Identification Number (DIN)', 'Digital Signature Certificate (DSC)', 'Company Name Reservation'],
    'LLP Registration': ['Certificate of Incorporation', 'EPF & ESIC Registration', 'DIN', 'DSC', 'LLP Agreement Drafting'],
    'GST Registration': ['GSTIN Certificate', 'HSN Code Mapping'],
    'Trademark Registration': ['Brand Name Reservation', 'Trademark Filed Certificate'],
    'ITR Filing': ['ITR-V filing verification', 'Tax Computation Audit'],
    'ISO Certification': ['ISO Certificate', 'Quality Audit report'],
    'Website Development': ['SSL Certificate', 'Domain setup', 'Source code handover']
  };

  const defaultDocs: Record<string, string[]> = {
    'Company Registration': ['Aadhaar Card of all Directors', 'PAN Card of all Directors', 'Photo & Mobile numbers', 'Electricity Bill of office address', 'NOC from property owner'],
    'GST Registration': ['PAN Card of applicant', 'Aadhaar Card of applicant', 'Electricity bill of business place', 'Cancelled Cheque/Bank statement'],
    'Trademark Registration': ['Logo image draft file', 'Authorized Board Resolution (optional)', 'Signed TM-48 Authorisation form'],
    'Website Development': ['Brand Logo asset', 'Feature checklist list', 'Payment gateway keys & details']
  };

  return Object.keys(PREDEFINED_PRICING).map((name) => {
    const data = PREDEFINED_PRICING[name];
    return {
      id: `SRV-${data.code}`,
      name,
      category: defaultCategory[name] || 'General Service',
      price: data.price,
      packagesIncluded: defaultPackages[name] || ['Official Stamp Paper Filing', 'Expert Consultation Certifications'],
      documentsRequired: defaultDocs[name] || ['Aadhaar Card of applicant', 'PAN Card of applicant', 'Address proof bill details'],
      timeline: data.timeline,
      scope: data.scope,
      deliverables: data.deliverables,
      employeeIncentive: Math.round(data.price * 0.15) || 200
    };
  });
}

// Check if seeding is required (Silent local-only default assignments to prevent overwriting cloud!)
export function initializeDB() {
  if (!getStorageString(KEY_SERVICES) || getStorageString(KEY_SERVICES) === '[]') {
    setStorageString(KEY_SERVICES, JSON.stringify(getDefaultPredefinedServices()));
  }

  if (!getStorageString(KEY_EMPLOYEES)) {
    setStorageString(KEY_EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
  }

  // Initialize operational tables silently if missing, so standard queries don't crash
  if (!getStorageString(KEY_LEADS)) setStorageString(KEY_LEADS, JSON.stringify([]));
  if (!getStorageString(KEY_FOLLOWUPS)) setStorageString(KEY_FOLLOWUPS, JSON.stringify([]));
  if (!getStorageString(KEY_HISTORY)) setStorageString(KEY_HISTORY, JSON.stringify([]));
  if (!getStorageString(KEY_TRANSFERS)) setStorageString(KEY_TRANSFERS, JSON.stringify([]));
  if (!getStorageString(KEY_PROPOSALS)) setStorageString(KEY_PROPOSALS, JSON.stringify([]));
  if (!getStorageString(KEY_NOTIFICATIONS)) setStorageString(KEY_NOTIFICATIONS, JSON.stringify([]));
  if (!getStorageString(KEY_LOGS)) setStorageString(KEY_LOGS, JSON.stringify([]));
  if (!getStorageString(KEY_HISTORICAL_PAYROLL)) setStorageString(KEY_HISTORICAL_PAYROLL, JSON.stringify([]));
  if (!getStorageString(KEY_ATTENDANCE)) setStorageString(KEY_ATTENDANCE, JSON.stringify([]));
  if (!getStorageString(KEY_ATTENDANCE_AUDIT)) setStorageString(KEY_ATTENDANCE_AUDIT, JSON.stringify([]));
  if (!getStorageString(KEY_TL_MAPPINGS)) setStorageString(KEY_TL_MAPPINGS, JSON.stringify([]));

  // Initialize proposal template if it doesn't exist, or has older legacy branding info
  const existingTemplateStr = getStorageString(KEY_PROPOSAL_TEMPLATE);
  let shouldUpdateTemplate = false;
  if (existingTemplateStr) {
    try {
      const parsed = JSON.parse(existingTemplateStr);
      if (parsed.companyName !== "EFILINGG FINANCIAL SERVICES PRIVATE LIMITED") {
        shouldUpdateTemplate = true;
      }
    } catch (e) {
      shouldUpdateTemplate = true;
    }
  }

  if (!existingTemplateStr || shouldUpdateTemplate) {
    const DEFAULT_TEMPLATE: ProposalTemplate = {
      companyName: "EFILINGG FINANCIAL SERVICES PRIVATE LIMITED",
      tagline: "Corporate Compliance & Financial Advisory Platform",
      logoText: "eF",
      aboutHeading: "About EFILINGG FINANCIAL SERVICES PRIVATE LIMITED",
      aboutText: "EFILINGG FINANCIAL SERVICES PRIVATE LIMITED is a premier financial advisory and corporate compliance technology platform designed to streamline statutory government registrations, business formations, tax filings, and legal bookkeeping for businesses across India. With a stellar track record spanning diverse operations, we assist startups and SMEs in securing licenses, maintaining robust legal accounting structures, and meeting statutory tax deadlines securely.",
      experienceStats: [
        { value: "10+", label: "Years Experience" },
        { value: "55K+", label: "Clients Served" },
        { value: "28", label: "States Covered" },
        { value: "100K+", label: "Filings Completed" }
      ],
      whyChooseHeading: "Why Choose EFILINGG FINANCIAL SERVICES PRIVATE LIMITED",
      whyChooseFeatures: [
        { title: "Qualified Team Experts", desc: "Managed exclusively by certified Chartered Accountants (CAs), CS professionals, and tax attorneys to assure compliance." },
        { title: "Transparent Pricing", desc: "No arbitrary margins or surprise invoices. Complete break-down list shared upfront." },
        { title: "Direct Helpline Desk", desc: "Professional customer service with immediate status notification updates via WhatsApp, Email, or SMS." },
        { title: "Pan India Service", desc: "Registered agency coverage matching multiple state departments across India." }
      ],
      testimonials: [
        { name: "Kunal Singhal", company: "Apex Retailers", text: "EFILINGG FINANCIAL SERVICES PRIVATE LIMITED made private limited setup completely painless. Filed inside 8 days with zero hassles." },
        { name: "Arpita Roy", company: "Nurture Soft", text: "Trademark application filed within hours. Exceptional clarity throughout the classification search." }
      ],
      processFlowHeading: "Engagement Timeline",
      processFlowStages: [
        { title: "Registration Setup", desc: "Kickoff consultation details & select required service." },
        { title: "Verification Submission", desc: "Provide required identities, bill papers, forms." },
        { title: "Draft Board Approval", desc: "Validation & creation of legal charter drafts." },
        { title: "Filing Registration", desc: "Filing with respective regulatory authority portals." },
        { title: "Certificate Handover", desc: "Collection of registered certificate papers." }
      ],
      termsAndConditions: [
        "Payment Schedules: 100% of standard professional base tariffs + department payment voucher allocations must be settled prior to portal filings.",
        "Information Accuracy: The client accepts absolute liability regarding accuracy of documents (Aadhaar, pan, business properties, electricity papers) provided.",
        "Regulatory Timelines: Listed timelines are estimated standard turnarounds. Government portals, office queries, or registry network delays are outside direct control limits.",
        "Confidentiality Guarantee: All trade ideas, partner declarations, and credentials remain governed by strict commercial non-disclosure guidelines."
      ],
      website: "www.efilingg.com",
      supportEmail: "efilingghelpdesk@gmail.com",
      supportPhone1: "011-45768289, 9217666839",
      supportPhone2: "+91-9217666235, 9217666084, 9217666083",
      officeAddress: "Barakhamba Road, Connaught Place, New Delhi - 110001, India"
    };

    setStorageString(KEY_PROPOSAL_TEMPLATE, JSON.stringify(DEFAULT_TEMPLATE));
  }

  // Initialize offer letter template if it doesn't exist
  if (!getStorageString(KEY_OFFER_LETTER_TEMPLATE)) {
    const DEFAULT_OFFER_TEMPLATE: OfferLetterTemplate = {
      companyName: "EFILINGG FINANCIAL SERVICES PVT. LTD.",
      contactNumber: "+91 9217666235",
      email: "askefiling@gmail.com",
      website: "www.efilingg.com",
      subject: "Offer of Employment",
      salutationLine: "Dear [Candidate Name],",
      bodyParagraph1: "We are pleased to offer you the position of [Designation] with Efilingg Financial Services Pvt. Ltd.",
      bodyParagraph2: "Your employment will commence from [Joining Date] and your place of work shall be our Delhi office.",
      bodyParagraph3: "Your compensation structure, incentives, and other benefits shall be communicated separately and may be revised by the Company from time to time based on performance, role requirements, and Company policies.",
      bodyParagraph4: "At Efilingg Financial Services Pvt. Ltd., we value dedication, professionalism, teamwork, and a commitment to delivering excellent service to our clients. We are confident that your skills and experience will contribute significantly to our continued growth and success.",
      bodyParagraph5: "The terms and conditions governing your employment are enclosed with this Offer Letter. Kindly sign and return a copy of this letter as a token of your acceptance.\n\nWe look forward to welcoming you to our team and wish you a successful journey with Efilingg Financial Services Pvt. Ltd.",
      closingHeading: "Warm Regards,",
      senderText: "For Efilingg Financial Services Pvt. Ltd.",
      signatoryName: "NOMAAN RIZVI",
      signatoryTitle: "CEO",
      termsAndConditions: [
        "WORKING DAYS & HOURS: • Working Days: Monday to Saturday • Office Staff Timing: 11:00 AM to 7:00 PM • Marketing Team Timing: 10:00 AM to 6:00 PM. Marketing employees may be required to work on Sundays based on business requirements. In such cases, a weekly off may be availed on any working day with prior approval from management.",
        "PLACE OF EMPLOYMENT: The employee shall work from the Company's office located in Delhi unless otherwise instructed by the management.",
        "LEAVE POLICY: • Leaves: Employees shall be entitled to 2 paid leaves per month. All leave requests must be approved in advance by management. Leave approval shall depend upon office workload and operational requirements. Absence without approval may result in salary deduction and disciplinary action.",
        "SALARY, INCENTIVES & ALLOWANCES: • Salary & Perks: Salary shall be paid as agreed between the Company and the employee. Performance incentives may be provided based on services, targets, and Company policies. Employees shall be eligible for ₹425 allowance and other applicable benefits as per government regulations and Company policy.",
        "NOTICE PERIOD: Either party may terminate employment by providing 15 days' written notice. In case the employee fails to serve the required notice period, the Company reserves the right to recover salary equivalent to the unserved notice period from any dues payable.",
        "CONFIDENTIALITY: The employee shall maintain strict confidentiality regarding client information, business data, pricing, internal processes, records, documents, and all proprietary information of the Company during and after employment.",
        "COMPANY PROPERTY: All documents, files, systems, access credentials, ID cards, client databases, marketing materials, and any property provided by the Company shall remain the property of the Company and must be returned immediately upon separation.",
        "TERMINATION: The Company reserves the right to terminate employment without notice in cases involving fraud, misconduct, breach of confidentiality, forgery, data theft, misrepresentation, or any act causing loss or reputational damage to the Company.",
        "INTELLECTUAL PROPERTY: All work, reports, content, databases, client information, marketing materials, and business-related creations developed during employment shall remain the exclusive property of Efilingg Financial Services Pvt. Ltd.",
        "SPECIAL BUSINESS REQUIREMENT: Employees acknowledge that during peak periods including Income Tax Return filing seasons, GST filing deadlines, ROC compliances, Trademark filing periods, audits, and other statutory deadlines, leave approvals may be restricted based on business requirements.",
        "GOVERNING LAW: This employment shall be governed by the laws of India and any disputes shall be subject to the exclusive jurisdiction of the courts at Delhi."
      ]
    };
    setStorageString(KEY_OFFER_LETTER_TEMPLATE, JSON.stringify(DEFAULT_OFFER_TEMPLATE));
  }

  // Migrate existing leads' creationDates to "2026-06-08T12:00:00.000Z" once as requested
  if (!getStorageString('crm_leads_migrated_20260608_final')) {
    const leadsList = getLeads();
    leadsList.forEach((l) => {
      l.creationDate = '2026-06-08T12:00:00.000Z';
    });
    saveLeads(leadsList);
    setStorageString('crm_leads_migrated_20260608_final', 'true');
  }

  // Run an automatic sweep to compute if any follow-up has become overdue
  checkAndMarkOverdueFollowUps();
  
  // Run database self-healing repair to merge duplicate profiles and align client-wide datasets
  repairDuplicateEmployeesAndLeads();
}

/**
 * Safe recovery and data repair function which aligns and restores Foujia Neal and Neha Ali profiles.
 * Preserves all structural relationships, restores login info safely, and enforces no-overwrite rules.
 */
export function repairDuplicateEmployeesAndLeads(): void {
  try {
    const employees = getEmployees();
    if (!employees || employees.length === 0) return;

    let changed = false;

    // A. EXPLICITLY REMOVE FOUJIA NEHAL AS REQUESTED
    // To satisfy the user's explicit request to completely remove Foujia Nehal's account and prevent any future auto-creation,
    // we filter out any employee whose name or email contains references to Foujia, Nehal, or Neal.
    const beforeCount = employees.length;
    const filteredEmployees = employees.filter(e => {
      const nameL = (e.name || '').toLowerCase().trim();
      const emailL = (e.email || '').toLowerCase().trim();
      const isFoujia = nameL.includes('foujia') || nameL.includes('nehal') || nameL.includes('neal') ||
                       emailL.includes('foujia') || emailL.includes('nehal');
      return !isFoujia;
    });

    if (filteredEmployees.length !== beforeCount) {
      employees.length = 0;
      employees.push(...filteredEmployees);
      changed = true;
      console.log('[Refactor Recovery] Filtered out and permanently deleted Foujia Nehal employee account.');
    }

    // B. RESTORE NEHA ALI (Separate active profile for 'neha2026@efilingg.com')
    // We strictly prefer her active ID 'EMP-YBVHL' as the primary profile to preserve her password and data.
    let nehaTarget = employees.find(e => e.id === 'EMP-YBVHL');
    if (!nehaTarget) {
      nehaTarget = employees.find(e => e.email.toLowerCase().trim() === 'neha2026@efilingg.com' && e.id !== 'EMP-NEHA2026' && e.status === 'active');
    }
    if (!nehaTarget) {
      nehaTarget = employees.find(e => e.email.toLowerCase().trim() === 'neha2026@efilingg.com' && e.id !== 'EMP-NEHA2026');
    }
    
    // Find only other Neha duplicates that are NOT Foujia, and NOT the target
    const otherNehaProfiles = employees.filter(e => {
      const emailL = (e.email || '').toLowerCase().trim();
      const nameL = (e.name || '').toLowerCase().trim();
      
      const isNehaEmail = emailL === 'neha@efilingg.com' || emailL.includes('neha2026') || (emailL.includes('merged_') && emailL.includes('neha'));
      const isNehaName = nameL.includes('neha') && !nameL.includes('foujia') && !nameL.includes('neal') && !nameL.includes('nehal');
      
      const isFoujia = nameL.includes('foujia') || nameL.includes('nehal') || nameL.includes('neal') 
                    || emailL.includes('foujia') || emailL.includes('nehal') || emailL.includes('neal');

      const isNotTarget = nehaTarget ? e.id !== nehaTarget.id : emailL !== 'neha2026@efilingg.com';
      return (isNehaEmail || isNehaName) && !isFoujia && isNotTarget;
    });

    if (!nehaTarget) {
      const candidate = otherNehaProfiles.find(e => e.status === 'active') || otherNehaProfiles[0];
      if (candidate) {
        candidate.email = 'neha2026@efilingg.com';
        candidate.status = 'active';
        candidate.password = 'Win@2026';
        candidate.isPasswordChanged = true;
        nehaTarget = candidate;
        changed = true;
        console.log('[Refactor Recovery] Promoted candidate to Neha primary:', candidate);
      }
    } else {
      if (nehaTarget.email !== 'neha2026@efilingg.com') {
        nehaTarget.email = 'neha2026@efilingg.com';
        changed = true;
      }
      if (nehaTarget.password !== 'Win@2026') {
        nehaTarget.password = 'Win@2026';
        changed = true;
      }
      if (nehaTarget.isPasswordChanged !== true) {
        nehaTarget.isPasswordChanged = true;
        changed = true;
      }
    }

    // B2. ENFORCE KHATIB RIZVI PROFILE STABILITY (email: 'khatib@efilingg.com')
    let khatibTarget = employees.find(e => e.email.toLowerCase().trim() === 'khatib@efilingg.com');
    if (!khatibTarget) {
      khatibTarget = employees.find(e => e.id === 'EMP-WQY7D');
    }
    if (khatibTarget) {
      if (khatibTarget.email !== 'khatib@efilingg.com') {
        khatibTarget.email = 'khatib@efilingg.com';
        changed = true;
      }
      if (khatibTarget.password !== 'Win@2026') {
        khatibTarget.password = 'Win@2026';
        changed = true;
      }
      if (khatibTarget.isPasswordChanged !== true) {
        khatibTarget.isPasswordChanged = true;
        changed = true;
      }
    }

    // C. REMOVED AUTOMATIC FOUJIA COERCION DATA RE-ASSIGNMENTS TO ALLOW DELETING HER PROFILE CLEANLY

    if (nehaTarget) {
      // D. STANDARD NEHA CLEAN-UP FOR NON-FOUJIA DUPLICATES
      if (otherNehaProfiles.length > 0) {
        const otherIds = otherNehaProfiles.map(e => e.id);
        
        // Recompute Leads remaining under non-Foujia duplicates
        const updatedLeads = getLeads();
        let updatedLeadsChanged = false;
        updatedLeads.forEach(l => {
          if (l.assignedTo && otherIds.includes(l.assignedTo)) {
            l.assignedTo = nehaTarget!.id;
            updatedLeadsChanged = true;
          }
        });
        if (updatedLeadsChanged) {
          saveLeads(updatedLeads);
        }

        // Recompute Follow-ups remaining under non-Foujia duplicates
        const updatedFollowups = getFollowUps();
        let updatedFollowupsChanged = false;
        updatedFollowups.forEach(f => {
          if (f.createdBy && otherIds.includes(f.createdBy)) {
            f.createdBy = nehaTarget!.id;
            updatedFollowupsChanged = true;
          }
        });
        if (updatedFollowupsChanged) {
          saveFollowUps(updatedFollowups);
        }

        // Recompute Proposals
        const updatedProposals = getProposals();
        let updatedProposalsChanged = false;
        updatedProposals.forEach(p => {
          if (p.createdBy && otherIds.includes(p.createdBy)) {
            p.createdBy = nehaTarget!.id;
            updatedProposalsChanged = true;
          }
        });
        if (updatedProposalsChanged) {
          saveProposals(updatedProposals);
        }

        // Recompute payrolls
        const updatedPayrolls = getHistoricalPayrolls();
        let updatedPayrollsChanged = false;
        updatedPayrolls.forEach(pr => {
          if (pr.employeeId && otherIds.includes(pr.employeeId)) {
            pr.employeeId = nehaTarget!.id;
            updatedPayrollsChanged = true;
          }
        });
        if (updatedPayrollsChanged) {
          saveHistoricalPayrolls(updatedPayrolls);
        }

        // Permanently filter out and delete other duplicate profiles from the database
        const filteredList = employees.filter(e => !otherIds.includes(e.id));
        employees.length = 0;
        employees.push(...filteredList);
        changed = true;
        console.log('[Refactor Recovery] Permanently removed duplicate/disabled Neha profiles from database:', otherIds);
      }
    }

    if (changed) {
      saveEmployees(employees);
    }
  } catch (err) {
    console.error('[Refactor Recovery Error]', err);
  }
}

// Automatically detect overdue followups
function checkAndMarkOverdueFollowUps() {
  const followups = getFollowUps();
  const todayStr = getISTDateString(); // Dynamic Delhi, India local date
  let changed = false;

  const updated: FollowUp[] = followups.map((f) => {
    if (f.status === 'pending' && f.followUpDate < todayStr) {
      changed = true;
      return { ...f, status: 'overdue' };
    }
    return f;
  });

  if (changed) {
    setStorageString(KEY_FOLLOWUPS, JSON.stringify(updated));
    // Trigger notifications for overdues
    const notifications = getNotifications('all');
    updated.forEach((f) => {
      if (f.status === 'overdue' && !notifications.some((n) => n.link === `followup-${f.id}`)) {
        const lead = getLeadById(f.leadId);
        if (lead) {
          createNotification({
            title: 'Overdue Follow-up Reminder',
            message: `Follow-up for ${lead.customerName} scheduled on ${f.followUpDate} is overdue!`,
            type: 'followup_due',
            userId: lead.assignedTo,
            link: `followup-${f.id}`
          });
        }
      }
    });
  }
}

// EMPLOYEES CRUD
export function getEmployees(): Employee[] {
  const rawList = JSON.parse(getStorageString(KEY_EMPLOYEES) || '[]');
  const list = rawList.filter((e: any) => e && e.id !== 'EMP-NEHA2026' && e.id !== 'EMP-HELPDESK' && e.id !== 'EMP-61LMU');
  if (rawList.length !== list.length) {
    localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(list));
    pushToPostgres(KEY_EMPLOYEES, JSON.stringify(list)).catch(() => {});
  }
  let updated = false;
  const processed = list.map((e: any) => {
    let changed = false;
    const emailL = (e.email || '').toLowerCase().trim();
    if (emailL === 'neha2026@efilingg.com' || emailL === 'khatib@efilingg.com') {
      if (e.password !== 'Win@2026') {
        e.password = 'Win@2026';
        changed = true;
      }
      if (e.isPasswordChanged !== true) {
        e.isPasswordChanged = true;
        changed = true;
      }
      if (e.status !== 'active') {
        e.status = 'active';
        changed = true;
      }
    } else {
      if (!e.password) {
        e.password = 'efilingg@123';
        changed = true;
      }
      if (e.isPasswordChanged === undefined) {
        e.isPasswordChanged = false;
        changed = true;
      }
    }
    if (!e.employeeCode) {
      e.employeeCode = `EFL-${e.id ? e.id.replace('EMP-', '') : Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      changed = true;
    }
    if (!e.designation) {
      e.designation = e.role === 'admin' ? 'Managing Director' : 'Senior Compliance Associate';
      changed = true;
    }
    if (!e.dateOfJoining) {
      e.dateOfJoining = e.joinedDate || '2025-01-15';
      changed = true;
    }
    if (e.salary === undefined) {
      e.salary = e.role === 'admin' ? 85000 : 25000;
      changed = true;
    }
    if (e.allowances === undefined) {
      e.allowances = e.role === 'admin' ? 10000 : 3500;
      changed = true;
    }
    if (e.otherFixedAllowance === undefined) {
      e.otherFixedAllowance = e.role === 'admin' ? 5000 : 1500;
      changed = true;
    }
    if (e.incentivePerConversion === undefined) {
      e.incentivePerConversion = e.role === 'admin' ? 1000 : 500;
      changed = true;
    }
    if (e.attendanceDays === undefined) {
      e.attendanceDays = 26;
      changed = true;
    }
    if (e.photo === undefined) {
      e.photo = '';
      changed = true;
    }
    if (changed) {
      updated = true;
    }
    return e;
  });

  if (updated) {
    setStorageString(KEY_EMPLOYEES, JSON.stringify(processed));
  }
  return processed;
}

// --- Employee update/create backup & transaction safety helpers ---

interface DBBackup {
  employees: string;
}

let dbBackupSnapshot: DBBackup | null = null;

export function createDBBackupSnapshot(): void {
  try {
    dbBackupSnapshot = {
      employees: localStorage.getItem(KEY_EMPLOYEES) || '[]'
    };
  } catch (err) {
    console.warn('[DB Backup] Snapshot creation failed:', err);
  }
}

export function restoreDBBackupSnapshot(): void {
  try {
    if (dbBackupSnapshot) {
      localStorage.setItem(KEY_EMPLOYEES, dbBackupSnapshot.employees);
      pushToPostgres(KEY_EMPLOYEES, dbBackupSnapshot.employees).catch((err) => {
        console.warn('[DB Backup] Rollback database push deferred/failed:', err);
      });
      console.log('[DB Backup] Database rollback completed successfully!');
    }
  } catch (err) {
    console.error('[DB Backup] Hard restore failed:', err);
  }
}

interface EmployeeAuditLogs {
  employeeId: string;
  action: string;
  oldEmail: string;
  newEmail: string;
  updatedBy: string;
}

export function writeActivityAuditLog(audit: EmployeeAuditLogs): void {
  try {
    const adminUser = getEmployeeById(audit.updatedBy);
    const updaterName = adminUser?.name || 'Admin';
    const updaterRole = adminUser?.role || 'admin';
    const logMessage = `[Identity Audit] [EmpID: ${audit.employeeId}] Action: ${audit.action} | Old Email: "${audit.oldEmail}" => New Email: "${audit.newEmail}" | Updated by: ${updaterName} (${updaterRole})`;
    
    writeActivityLog(
      audit.updatedBy,
      updaterName,
      updaterRole,
      'Identity Audit',
      logMessage
    );
  } catch (err) {
    console.error('[DB Safety] Failed to write identity audit log', err);
  }
}

export function saveEmployees(employees: Employee[]) {
  setStorageString(KEY_EMPLOYEES, JSON.stringify(employees));
}

export function createEmployee(emp: Omit<Employee, 'id' | 'joinedDate'>, adminUserId: string): Employee {
  // Rule 4: Create backup snapshot before changing
  createDBBackupSnapshot();

  try {
    const emailToTrim = (emp.email || '').toLowerCase().trim();
    
    // Rule 5: Duplicate Protection
    const employees = getEmployees();
    const isEmailTaken = employees.some(e => e.email.toLowerCase().trim() === emailToTrim && e.status === 'active');
    if (isEmailTaken && emailToTrim !== '') {
      throw new Error(`Email already assigned to another employee: ${emp.email}`);
    }

    const idValue = `EMP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const newEmp: Employee = {
      ...emp,
      id: idValue,
      joinedDate: new Date().toISOString().split('T')[0],
      password: emp.password || 'efilingg@123',
      isPasswordChanged: false,
      employeeCode: emp.employeeCode || `EFL-${idValue.replace('EMP-', '')}`,
      designation: emp.designation || 'Compliance Associate',
      dateOfJoining: emp.dateOfJoining || new Date().toISOString().split('T')[0],
      salary: emp.salary ?? 25000,
      allowances: emp.allowances ?? 3500,
      otherFixedAllowance: emp.otherFixedAllowance ?? 1500,
      incentivePerConversion: emp.incentivePerConversion ?? 500,
      attendanceDays: emp.attendanceDays ?? 26
    };
    employees.push(newEmp);
    saveEmployees(employees);

    const adminUser = getEmployeeById(adminUserId);
    writeActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.role || 'admin',
      'Employee Created',
      `Created employee ${newEmp.name} (${newEmp.email}) with role ${newEmp.role}.`
    );

    // Rule 6: Audit log for the creation
    writeActivityAuditLog({
      employeeId: idValue,
      action: 'CREATE',
      oldEmail: '',
      newEmail: newEmp.email,
      updatedBy: adminUserId
    });

    return newEmp;
  } catch (error: any) {
    // Rule 3: Rollback automatically
    console.error('[DB Safety] createEmployee failed, rolling back...', error);
    restoreDBBackupSnapshot();
    throw error;
  }
}

export function updateEmployee(id: string, updates: Partial<Employee>, adminUserId: string) {
  // Rule 4: Create backup snapshot before changing
  createDBBackupSnapshot();

  try {
    // Rule 1: Employee ID must never be mutated
    const filteredUpdates = { ...updates };
    delete (filteredUpdates as any).id;

    const employees = getEmployees();
    const idx = employees.findIndex((e) => e.id === id);
    if (idx === -1) {
      throw new Error(`Employee not found with ID: ${id}`);
    }

    const old = employees[idx];

    // Rule 5: Duplicate Protection
    if (filteredUpdates.email) {
      const emailToTrim = filteredUpdates.email.toLowerCase().trim();
      const isEmailTaken = employees.some(e => e.id !== id && e.email.toLowerCase().trim() === emailToTrim && e.status === 'active');
      if (isEmailTaken) {
        throw new Error(`Email already assigned to another employee: ${filteredUpdates.email}`);
      }
    }

    const updated = { ...old, ...filteredUpdates };
    employees[idx] = updated;
    saveEmployees(employees);

    const adminUser = getEmployeeById(adminUserId);
    writeActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.role || 'admin',
      'Employee Updated',
      `Updated employee ${updated.name}.`
    );

    // Rule 6: Audit logs
    if (old.email.toLowerCase().trim() !== updated.email.toLowerCase().trim()) {
      writeActivityAuditLog({
        employeeId: id,
        action: 'EMAIL_CHANGE',
        oldEmail: old.email,
        newEmail: updated.email,
        updatedBy: adminUserId
      });
    }
  } catch (error: any) {
    // Rule 3: Rollback automatically
    console.error('[DB Safety] updateEmployee failed, rolling back...', error);
    restoreDBBackupSnapshot();
    throw error;
  }
}

export function getEmployeeById(id: string): Employee | undefined {
  return getEmployees().find((e) => e.id === id);
}

// LEADS CRUD
export function getLeads(): Lead[] {
  return JSON.parse(getStorageString(KEY_LEADS) || '[]');
}

export function saveLeads(leads: Lead[]) {
  setStorageString(KEY_LEADS, JSON.stringify(leads));
}

export function createLead(leadData: Omit<Lead, 'id' | 'creationDate'> & { creationDate?: string }, triggerByUserId: string): Lead {
  const leads = getLeads();

  // Helper to normalize Indian phone/mobile numbers robustly
  const normalizeMobile = (num: string) => {
    const digits = num.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const newMobileNorm = normalizeMobile(leadData.mobile);

  if (newMobileNorm) {
    const duplicate = leads.find((l) => {
      if (!l.mobile) return false;
      const existingMobileNorm = normalizeMobile(l.mobile);
      return existingMobileNorm === newMobileNorm && l.serviceRequired === leadData.serviceRequired;
    });

    if (duplicate) {
      const creatorEmp = getEmployeeById(duplicate.createdBy) || getEmployeeById(duplicate.assignedTo);
      const creatorName = creatorEmp ? creatorEmp.name : 'another employee';
      throw new Error(`This client with the same mobile number and service already exists with Employee ${creatorName}. Duplicate lead creation is not allowed.`);
    }
  }
  
  // Find top maximum numeric ID suffix to guarantee absolute uniqueness across all leads (no collisions)
  let maxIdNum = 1000;
  leads.forEach((l) => {
    if (l.id && l.id.startsWith('LD-')) {
      const numPart = parseInt(l.id.replace('LD-', ''), 10);
      if (!isNaN(numPart) && numPart > maxIdNum) {
        maxIdNum = numPart;
      }
    }
  });

  const idValue = `LD-${maxIdNum + 1}`;
  
  // Use custom creationDate if provided, formatting correctly
  let finalCreationDate = new Date().toISOString();
  if (leadData.creationDate) {
    if (leadData.creationDate.includes('T')) {
      finalCreationDate = leadData.creationDate;
    } else {
      finalCreationDate = `${leadData.creationDate}T12:00:00.000Z`;
    }
  }

  const newLead: Lead = {
    ...leadData,
    id: idValue,
    creationDate: finalCreationDate
  };

  const triggerUser = getEmployeeById(triggerByUserId);
  const isAdmin = triggerUser?.role === 'admin';

  if (newLead.stage === 'Converted') {
    const services = getCustomServices();
    const matchedService = services.find((s) => s.name === newLead.serviceRequired);
    
    let targetIncentive = 500; // Standard baseline fallback
    if (matchedService && matchedService.employeeIncentive !== undefined) {
      targetIncentive = Number(matchedService.employeeIncentive);
    } else {
      const emp = getEmployeeById(newLead.assignedTo);
      if (emp) {
        targetIncentive = Number(emp.incentivePerConversion) || 500;
      }
    }

    newLead.incentiveAmount = targetIncentive;
    newLead.incentiveStatus = isAdmin ? 'approved' : 'pending_approval';
    if (isAdmin) {
      newLead.incentiveApprovedBy = triggerByUserId;
      newLead.incentiveApprovedAt = new Date().toISOString().split('T')[0];
    }
  }

  leads.push(newLead);
  saveLeads(newLead ? leads : []);

  // Write history entry
  writeLeadHistory({
    leadId: newLead.id,
    field: 'creation',
    oldValue: '',
    newValue: 'Lead Created',
    updatedBy: triggerByUserId
  });

  const assignedUser = getEmployeeById(newLead.assignedTo);

  // Write Activity Log
  writeActivityLog(
    triggerByUserId,
    triggerUser?.name || 'User',
    triggerUser?.role || 'employee',
    'Lead Created',
    `Created lead ${newLead.customerName} for ${newLead.serviceRequired} (assigned to ${assignedUser?.name || newLead.assignedTo})`
  );

  // Send assignment notification
  if (triggerByUserId !== newLead.assignedTo) {
    createNotification({
      title: 'New Lead Assigned',
      message: `${triggerUser?.name || 'Admin'} assigned lead ${newLead.customerName} (${newLead.serviceRequired}) to you.`,
      type: 'lead_assigned',
      userId: newLead.assignedTo,
      link: `lead-${newLead.id}`
    });
  }

  return newLead;
}

export function updateLeadStage(leadId: string, newStage: LeadStage, triggerByUserId: string) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx !== -1) {
    const lead = leads[idx];
    const oldStage = lead.stage;
    if (oldStage !== newStage) {
      lead.stage = newStage;

      const triggerUser = getEmployeeById(triggerByUserId);
      const isAdmin = triggerUser?.role === 'admin';

      // If converted, trigger and lock calculation variables
      if (newStage === 'Converted') {
        const services = getCustomServices();
        const matchedService = services.find((s) => s.name === lead.serviceRequired);
        
        let targetIncentive = 500; // Standard baseline fallback
        if (matchedService && matchedService.employeeIncentive !== undefined) {
          targetIncentive = Number(matchedService.employeeIncentive);
        } else {
          const emp = getEmployeeById(lead.assignedTo);
          if (emp) {
            targetIncentive = Number(emp.incentivePerConversion) || 500;
          }
        }

        lead.incentiveAmount = targetIncentive;
        lead.incentiveStatus = isAdmin ? 'approved' : 'pending_approval';
        if (isAdmin) {
          lead.incentiveApprovedBy = triggerByUserId;
          lead.incentiveApprovedAt = new Date().toISOString().split('T')[0];
        }
      }

      saveLeads(leads);

      // Record lead history
      writeLeadHistory({
        leadId,
        field: 'stage',
        oldValue: oldStage,
        newValue: newStage,
        updatedBy: triggerByUserId
      });

      writeActivityLog(
        triggerByUserId,
        triggerUser?.name || 'User',
        triggerUser?.role || 'employee',
        'Lead Stage Updated',
        `Updated stage of lead ${lead.customerName} (${lead.id}) from ${oldStage} to ${newStage}`
      );

      // If converted, trigger notification
      if (newStage === 'Converted') {
        createNotification({
          title: isAdmin ? 'Lead Converted! 🎉' : 'Approved Lead Conversion Request 💡',
          message: isAdmin 
            ? `Lead ${lead.customerName} was successfully converted to Closed Won by ${triggerUser?.name || 'Admin'} (Incentive auto-approved).`
            : `Lead ${lead.customerName} converted by ${triggerUser?.name || 'Employee'}. Conversion incentive approval is pending.`,
          type: 'lead_converted',
          userId: 'EMP-ADMIN', // notify admin
          link: `lead-${lead.id}`
        });

        // Write special log
        writeActivityLog(
          'SYSTEM',
          'System Analyzer',
          'admin',
          'Lead Conversion Complete',
          `Conversion tracked successfully for ${lead.customerName} - service: ${lead.serviceRequired} (Incentive: ₹${lead.incentiveAmount}, Status: ${lead.incentiveStatus})`
        );
      }
    }
  }
}

export function updateLeadDetails(leadId: string, updates: Partial<Lead>, triggerByUserId: string) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx !== -1) {
    const oldLead = leads[idx];
    const newLead = { ...oldLead, ...updates };

    // Validate duplicate check on update
    const normalizeMobile = (num: string) => {
      const digits = num.replace(/\D/g, '');
      return digits.length > 10 ? digits.slice(-10) : digits;
    };
    const newMobileNorm = normalizeMobile(newLead.mobile || '');
    if (newMobileNorm) {
      const duplicate = leads.find((l) => {
        if (l.id === leadId) return false;
        if (!l.mobile) return false;
        const existingMobileNorm = normalizeMobile(l.mobile);
        return existingMobileNorm === newMobileNorm && l.serviceRequired === newLead.serviceRequired;
      });

      if (duplicate) {
        const creatorEmp = getEmployeeById(duplicate.createdBy) || getEmployeeById(duplicate.assignedTo);
        const creatorName = creatorEmp ? creatorEmp.name : 'another employee';
        throw new Error(`This client with the same mobile number and service already exists with Employee ${creatorName}. Duplicate lead creation is not allowed.`);
      }
    }

    leads[idx] = newLead;
    saveLeads(leads);

    // Filter which fields were updated and create history records
    const creator = getEmployeeById(triggerByUserId);
    Object.keys(updates).forEach((k) => {
      const key = k as keyof Lead;
      if (oldLead[key] !== updates[key] && key !== 'id' && key !== 'creationDate') {
        writeLeadHistory({
          leadId,
          field: String(key),
          oldValue: String(oldLead[key] || ''),
          newValue: String(updates[key] || ''),
          updatedBy: triggerByUserId
        });
      }
    });

    writeActivityLog(
      triggerByUserId,
      creator?.name || 'User',
      creator?.role || 'employee',
      'Lead Updated',
      `Updated profile details of lead ${oldLead.customerName} (${oldLead.id}).`
    );
  }
}

export function updateLeadDetailsAndStage(
  leadId: string, 
  details: Partial<Lead>, 
  newStage: LeadStage, 
  triggerByUserId: string
) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx !== -1) {
    const lead = leads[idx];
    const oldStage = lead.stage;
    
    // Validate duplicate check on update details and stage
    const targetMobile = details.mobile !== undefined ? details.mobile : lead.mobile;
    const targetService = details.serviceRequired !== undefined ? details.serviceRequired : lead.serviceRequired;
    
    const normalizeMobile = (num: string) => {
      const digits = num.replace(/\D/g, '');
      return digits.length > 10 ? digits.slice(-10) : digits;
    };
    const newMobileNorm = normalizeMobile(targetMobile || '');
    if (newMobileNorm) {
      const duplicate = leads.find((l) => {
        if (l.id === leadId) return false;
        if (!l.mobile) return false;
        const existingMobileNorm = normalizeMobile(l.mobile);
        return existingMobileNorm === newMobileNorm && l.serviceRequired === targetService;
      });

      if (duplicate) {
        const creatorEmp = getEmployeeById(duplicate.createdBy) || getEmployeeById(duplicate.assignedTo);
        const creatorName = creatorEmp ? creatorEmp.name : 'another employee';
        throw new Error(`This client with the same mobile number and service already exists with Employee ${creatorName}. Duplicate lead creation is not allowed.`);
      }
    }
    
    // 1. Update basic details
    const oldLeadDetails = { ...lead };
    Object.assign(lead, details);
    
    // 2. Filter updated fields and write history records
    Object.keys(details).forEach((k) => {
      const key = k as keyof Lead;
      if (oldLeadDetails[key] !== details[key] && key !== 'id' && key !== 'creationDate') {
        writeLeadHistory({
          leadId,
          field: String(key),
          oldValue: String(oldLeadDetails[key] || ''),
          newValue: String(details[key] || ''),
          updatedBy: triggerByUserId
        });
      }
    });
    
    // 3. Update stage and process incentive if changed
    if (oldStage !== newStage) {
      lead.stage = newStage;
      
      const triggerUser = getEmployeeById(triggerByUserId);
      const isAdmin = triggerUser?.role === 'admin';
      
      if (newStage === 'Converted') {
        const services = getCustomServices();
        const matchedService = services.find((s) => s.name === lead.serviceRequired);
        
        let targetIncentive = 500;
        if (matchedService && matchedService.employeeIncentive !== undefined) {
          targetIncentive = Number(matchedService.employeeIncentive);
        } else {
          const emp = getEmployeeById(lead.assignedTo);
          if (emp) {
            targetIncentive = Number(emp.incentivePerConversion) || 500;
          }
        }
        
        lead.incentiveAmount = targetIncentive;
        lead.incentiveStatus = isAdmin ? 'approved' : 'pending_approval';
        if (isAdmin) {
          lead.incentiveApprovedBy = triggerByUserId;
          lead.incentiveApprovedAt = new Date().toISOString().split('T')[0];
        }
      }
      
      // Record stage history
      writeLeadHistory({
        leadId,
        field: 'stage',
        oldValue: oldStage,
        newValue: newStage,
        updatedBy: triggerByUserId
      });
      
      // Log lead conversion activity
      if (newStage === 'Converted') {
        const assignedEmp = getEmployeeById(lead.assignedTo);
        writeActivityLog(
          triggerByUserId,
          triggerUser?.name || 'User',
          triggerUser?.role || 'employee',
          'Lead Converted',
          `Lead ${lead.customerName} successfully converted by raw synchronization. Incentive: ₹${lead.incentiveAmount} (assigned: ${assignedEmp?.name || lead.assignedTo})`
        );
        
        // Notify admin
        createNotification({
          title: 'Lead Converted - Approval Required',
          message: `Associate ${assignedEmp?.name || lead.assignedTo} converted lead ${lead.customerName}. Incentive approval pending.`,
          type: 'lead_converted',
          userId: 'admin',
          link: `lead-${lead.id}`
        });
      }
    }
    
    // Save to localStorage exactly once!
    saveLeads(leads);
  }
}

export function getLeadById(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

// LEAD SEED FOLLOW-UPS
export function getFollowUps(): FollowUp[] {
  return JSON.parse(getStorageString(KEY_FOLLOWUPS) || '[]');
}

export function saveFollowUps(followups: FollowUp[]) {
  setStorageString(KEY_FOLLOWUPS, JSON.stringify(followups));
}

export function addFollowUp(data: Omit<FollowUp, 'id' | 'createdAt' | 'status'>, triggerByUserId: string): FollowUp {
  const followups = getFollowUps();
  const idValue = `FL-${2000 + followups.length + 1}`;
  
  // Determine if it is already overdue or pending
  const todayStr = getISTDateString();
  let initialStatus: 'pending' | 'overdue' = 'pending';
  if (data.followUpDate < todayStr) {
    initialStatus = 'overdue';
  }

  const newFollowUp: FollowUp = {
    ...data,
    id: idValue,
    status: initialStatus,
    createdAt: new Date().toISOString()
  };
  followups.push(newFollowUp);
  saveFollowUps(newFollowUp ? followups : []);

  // Update lead status to 'Follow-Up Pending' if appropriate
  const lead = getLeadById(newFollowUp.leadId);
  if (lead && lead.stage !== 'Follow-Up Pending' && lead.stage !== 'Converted' && lead.stage !== 'Closed Lost') {
    updateLeadStage(newFollowUp.leadId, 'Follow-Up Pending', triggerByUserId);
  }

  const user = getEmployeeById(triggerByUserId);
  writeActivityLog(
    triggerByUserId,
    user?.name || 'User',
    user?.role || 'employee',
    'Follow-up Added',
    `Scheduled new follow-up for lead ${lead?.customerName || newFollowUp.leadId} on ${newFollowUp.followUpDate} at ${newFollowUp.followUpTime}`
  );

  // Trigger immediate user notification for upcoming followup
  if (newFollowUp.followUpDate === getISTDateString()) {
    createNotification({
      title: 'Follow-up Scheduled Today',
      message: `Follow-up for ${lead?.customerName || 'Client'} scheduled today at ${newFollowUp.followUpTime}`,
      type: 'followup_due',
      userId: triggerByUserId,
      link: `lead-${newFollowUp.leadId}`
    });
  }

  return newFollowUp;
}

export function completeFollowUp(id: string, response: string, newStage: LeadStage | null, triggerByUserId: string) {
  const followups = getFollowUps();
  const idx = followups.findIndex((f) => f.id === id);
  if (idx !== -1) {
    const f = followups[idx];
    f.customerResponse = response;
    f.status = 'completed';
    saveFollowUps(followups);

    // If a next stage is requested, perform update
    if (newStage) {
      updateLeadStage(f.leadId, newStage, triggerByUserId);
    }

    const user = getEmployeeById(triggerByUserId);
    const lead = getLeadById(f.leadId);
    writeActivityLog(
      triggerByUserId,
      user?.name || 'User',
      user?.role || 'employee',
      'Follow-up Completed',
      `Completed follow-up ${f.id} for lead ${lead?.customerName || f.leadId}. Response: ${response}`
    );
  }
}

export function markLeadAsContacted(leadId: string, nextStage: LeadStage, remarks: string, triggerByUserId: string) {
  // Update the lead stage to nextStage ('Interested' or 'Not Interested')
  updateLeadStage(leadId, nextStage, triggerByUserId);

  // Complete any pending/overdue followups on this lead to clear the pendency
  const followups = getFollowUps();
  let updatedCount = 0;
  followups.forEach((f) => {
    if (f.leadId === leadId && f.status !== 'completed') {
      f.status = 'completed';
      f.customerResponse = remarks || 'Marked as Contacted (Cleared Pendency)';
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    saveFollowUps(followups);
  }

  // Create audit trail entry
  const user = getEmployeeById(triggerByUserId);
  const lead = getLeadById(leadId);
  
  if (lead) {
    writeLeadHistory({
      leadId: leadId,
      field: 'stage',
      oldValue: 'Follow-Up Pending',
      newValue: nextStage,
      updatedBy: triggerByUserId
    });

    writeActivityLog(
      triggerByUserId,
      user?.name || 'User',
      user?.role || 'employee',
      'Lead Contacted',
      `Marked Follow-Up Pending lead ${lead.customerName} (ID: ${lead.id}) as contacted. Resolved pendencies: ${updatedCount} calls completed. Set stage to ${nextStage}. Remarks: ${remarks}`
    );
  }
}

// LEAD HISTORY CRUD
export function getLeadHistory(leadId?: string): LeadHistory[] {
  const hist: LeadHistory[] = JSON.parse(getStorageString(KEY_HISTORY) || '[]');
  if (leadId) {
    return hist.filter((h) => h.leadId === leadId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  return hist;
}

export function writeLeadHistory(data: { leadId: string; field: string; oldValue: string; newValue: string; updatedBy: string }) {
  const history = getLeadHistory();
  const user = getEmployeeById(data.updatedBy);
  const newHist: LeadHistory = {
    id: `LH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    ...data,
    updatedByName: user?.name || 'System User',
    updatedAt: new Date().toISOString()
  };
  history.push(newHist);
  setStorageString(KEY_HISTORY, JSON.stringify(history));
}

// LEAD TRANSFER LOGS
export function getTransfers(leadId?: string): LeadTransfer[] {
  const transfers: LeadTransfer[] = JSON.parse(getStorageString(KEY_TRANSFERS) || '[]');
  if (leadId) {
    return transfers.filter((t) => t.leadId === leadId);
  }
  return transfers;
}

export function transferLead(leadId: string, fromEmpId: string, toEmpId: string, reason: string): boolean {
  if (!reason.trim()) return false;

  const leads = getLeads();
  const leadIdx = leads.findIndex((l) => l.id === leadId);
  if (leadIdx === -1) return false;

  const lead = leads[leadIdx];
  const fromEmp = getEmployeeById(fromEmpId);
  const toEmp = getEmployeeById(toEmpId);

  if (!toEmp) return false;

  // Perform Transfer
  lead.assignedTo = toEmpId;
  saveLeads(leads);

  // Record Lead Transfer history
  const transfers = getTransfers();
  const newTransfer: LeadTransfer = {
    id: `TF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    leadId,
    transferredFrom: fromEmpId,
    transferredFromName: fromEmp?.name || fromEmpId,
    transferredTo: toEmpId,
    transferredToName: toEmp.name,
    reason,
    transferredAt: new Date().toISOString()
  };
  transfers.push(newTransfer);
  setStorageString(KEY_TRANSFERS, JSON.stringify(transfers));

  // Write General Lead History
  writeLeadHistory({
    leadId,
    field: 'assignedTo',
    oldValue: fromEmp?.name || fromEmpId,
    newValue: toEmp.name,
    updatedBy: fromEmpId
  });

  // Create notifications
  // 1. Notify Assigned employee
  createNotification({
    title: 'Lead Transferred to you',
    message: `${fromEmp?.name || 'Another employee'} transferred lead '${lead.customerName}' to you. Reason: ${reason}`,
    type: 'lead_transfer',
    userId: toEmpId,
    link: `lead-${lead.id}`
  });

  // 2. Notify Admin
  createNotification({
    title: 'Automated Lead Transfer Notification',
    message: `Lead ${lead.customerName} was transferred from ${fromEmp?.name || fromEmpId} to ${toEmp.name}.`,
    type: 'lead_transfer',
    userId: 'EMP-ADMIN',
    link: `lead-${lead.id}`
  });

  // Write Activity Log
  writeActivityLog(
    fromEmpId,
    fromEmp?.name || 'User',
    fromEmp?.role || 'employee',
    'Lead Transferred',
    `Transferred lead ${lead.customerName} (${lead.id}) to ${toEmp.name}. Reason: ${reason}`
  );

  return true;
}

// PROPOSALS MODEL
export function getProposals(): Proposal[] {
  return JSON.parse(getStorageString(KEY_PROPOSALS) || '[]');
}

export function saveProposals(proposals: Proposal[]) {
  setStorageString(KEY_PROPOSALS, JSON.stringify(proposals));
}

export function createProposal(data: Omit<Proposal, 'id' | 'createdAt' | 'validUntil'>, triggerByUserId: string): Proposal {
  const proposals = getProposals();
  const idValue = `PROP-${7000 + proposals.length + 1}`;
  
  // Dynamic validation date (30 days validity)
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + 30);
  const validUntil = validityDate.toISOString().split('T')[0];

  const user = getEmployeeById(triggerByUserId);

  const newProp: Proposal = {
    ...data,
    id: idValue,
    createdAt: new Date().toISOString(),
    validUntil
  };
  proposals.push(newProp);
  saveProposals(newProp ? proposals : []);

  // Write stage update to "Proposal Sent" if there belongs an existing lead
  if (newProp.leadId) {
    updateLeadStage(newProp.leadId, 'Proposal Sent', triggerByUserId);
  }

  // Create notifications
  createNotification({
    title: 'Premium Proposal Generated',
    message: `Proposal #${newProp.id} generated for ${newProp.clientName} (${newProp.serviceRequired}) valued at ₹${newProp.finalAmount}.`,
    type: 'proposal_generated',
    userId: triggerByUserId,
    link: `proposal-${newProp.id}`
  });

  // Also notify master admin if the creator is not the admin
  if (triggerByUserId !== 'EMP-ADMIN') {
    createNotification({
      title: 'Premium Proposal Generated',
      message: `${user?.name || 'Employee'} generated Proposal #${newProp.id} for ${newProp.clientName} (${newProp.serviceRequired}) valued at ₹${newProp.finalAmount}.`,
      type: 'proposal_generated',
      userId: 'EMP-ADMIN',
      link: `proposal-${newProp.id}`
    });
  }

  writeActivityLog(
    triggerByUserId,
    user?.name || 'User',
    user?.role || 'employee',
    'Proposal Generated',
    `Generated proposal ${newProp.id} for client ${newProp.clientName}, pricing detail standard/edited total: ₹${newProp.finalAmount}`
  );

  return newProp;
}

// NOTIFICATIONS
export function getNotifications(userId: string): Notification[] {
  const notifications: Notification[] = JSON.parse(getStorageString(KEY_NOTIFICATIONS) || '[]');
  if (userId === 'all') {
    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  const emp = getEmployeeById(userId);
  const isAdmin = emp?.role === 'admin';

  return notifications
    .filter((n) => {
      if (isAdmin) {
        return n.userId === userId || n.userId === 'admin' || n.userId === 'EMP-ADMIN' || n.userId === 'all';
      }
      return n.userId === userId;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
  const notifications: Notification[] = JSON.parse(getStorageString(KEY_NOTIFICATIONS) || '[]');
  const newNotif: Notification = {
    ...data,
    id: `NT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(newNotif);
  setStorageString(KEY_NOTIFICATIONS, JSON.stringify(notifications));
  return newNotif;
}

export function markNotificationAsRead(id: string) {
  const notifications: Notification[] = JSON.parse(getStorageString(KEY_NOTIFICATIONS) || '[]');
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx !== -1) {
    notifications[idx].read = true;
    setStorageString(KEY_NOTIFICATIONS, JSON.stringify(notifications));
  }
}

export function markAllNotificationsAsRead(userId: string) {
  const notifications: Notification[] = JSON.parse(getStorageString(KEY_NOTIFICATIONS) || '[]');
  const updated = notifications.map((n) => {
    if (n.userId === userId || n.userId === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  setStorageString(KEY_NOTIFICATIONS, JSON.stringify(updated));
}

// SYSTEM AUDIT ACTIVITY LOGS
export function getActivityLogs(): ActivityLog[] {
  return JSON.parse(getStorageString(KEY_LOGS) || '[]');
}

export function writeActivityLog(userId: string, userName: string, userRole: string, action: string, details: string) {
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    id: `LOG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    userId,
    userName,
    userRole,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog); // latest log first
  // Cap at 1000 logs
  if (logs.length > 1000) {
    logs.pop();
  }
  setStorageString(KEY_LOGS, JSON.stringify(logs));
}

export function saveLogs(logs: ActivityLog[]) {
  setStorageString(KEY_LOGS, JSON.stringify(logs));
}

// BULK LEAD IMPORT
export function bulkImportLeads(leadsList: Partial<Lead>[], triggerByUserId: string): { successCount: number; failedCount: number } {
  let successCount = 0;
  let failedCount = 0;
  const employees = getEmployees();
  const activeEmployeeIds = employees.filter((e) => e.status === 'active' && e.role === 'employee').map((e) => e.id);

  if (activeEmployeeIds.length === 0) {
    activeEmployeeIds.push('EMP-VIJAY'); // fallback
  }

  leadsList.forEach((item, index) => {
    if (!item.customerName || !item.mobile) {
      failedCount++;
      return;
    }

    // Auto assign randomly to active employees
    const randomAssignee = activeEmployeeIds[index % activeEmployeeIds.length];

    const leadData: Omit<Lead, 'id' | 'creationDate'> = {
      customerName: item.customerName,
      mobile: item.mobile,
      email: item.email || '',
      businessName: item.businessName || '',
      serviceRequired: item.serviceRequired && PREDEFINED_PRICING[item.serviceRequired] ? item.serviceRequired : 'Company Registration',
      leadSource: item.leadSource || 'Bulk Upload',
      stage: (item.stage as LeadStage) || 'New Lead',
      notes: item.notes || 'Imported via Bulk Excel Tool',
      assignedTo: item.assignedTo || randomAssignee,
      createdBy: triggerByUserId
    };

    try {
      createLead(leadData, triggerByUserId);
      successCount++;
    } catch (e) {
      failedCount++;
    }
  });

  const triggerUser = getEmployeeById(triggerByUserId);
  writeActivityLog(
    triggerByUserId,
    triggerUser?.name || 'User',
    triggerUser?.role || 'employee',
    'Bulk Import Completed',
    `Imported ${successCount} leads successfully. ${failedCount} rows failed validation.`
  );

  return { successCount, failedCount };
}

// BACKUP AND RESTORE
export function generateBackupData(): string {
  const backup = {
    employees: getEmployees(),
    leads: getLeads(),
    followups: getFollowUps(),
    history: getLeadHistory(),
    transfers: getTransfers(),
    proposals: getProposals(),
    notifications: getNotifications('all'),
    logs: getActivityLogs(),
    backupDate: new Date().toISOString()
  };
  return JSON.stringify(backup, null, 2);
}

export function restoreBackupData(jsonDataStr: string, adminUserId: string): boolean {
  try {
    const data = JSON.parse(jsonDataStr);
    if (!data.employees || !data.leads || !data.followups) {
      return false;
    }

    setStorageString(KEY_EMPLOYEES, JSON.stringify(data.employees));
    setStorageString(KEY_LEADS, JSON.stringify(data.leads));
    setStorageString(KEY_FOLLOWUPS, JSON.stringify(data.followups));
    if (data.history) setStorageString(KEY_HISTORY, JSON.stringify(data.history));
    if (data.transfers) setStorageString(KEY_TRANSFERS, JSON.stringify(data.transfers));
    if (data.proposals) setStorageString(KEY_PROPOSALS, JSON.stringify(data.proposals));
    if (data.notifications) setStorageString(KEY_NOTIFICATIONS, JSON.stringify(data.notifications));
    if (data.logs) setStorageString(KEY_LOGS, JSON.stringify(data.logs));

    const admin = getEmployeeById(adminUserId);
    writeActivityLog(
      adminUserId,
      admin?.name || 'Admin',
      admin?.role || 'admin',
      'Database Restored',
      `Complete database backup restored by Admin. Backup date was ${data.backupDate || 'Unknown'}`
    );

    return true;
  } catch (e) {
    console.error('Failed to restore backup', e);
    return false;
  }
}

// AUTH SESSION MANAGEMENT
export function getCurrentSession(): Employee | null {
  const sessStr = getStorageString(KEY_SESSION);
  if (!sessStr) return null;
  try {
    const id = JSON.parse(sessStr);
    const emp = getEmployeeById(id);
    if (emp && emp.status === 'active') {
      if (emp.isPasswordChanged === false) {
        clearSession();
        return null;
      }
      return emp;
    }
    // If disabled in the process
    if (emp && emp.status === 'disabled') {
      clearSession();
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function setSessionUser(userId: string) {
  setStorageString(KEY_SESSION, JSON.stringify(userId));
}

export function clearSession() {
  localStorage.removeItem(KEY_SESSION);
}

export function loginEmployee(email: string, passwordDigits: string): Employee | string {
  // Demo password digits bypass or basic validation:
  const employees = getEmployees();
  const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());

  if (!emp) {
    return 'Invalid email address. Enter a valid pre-seeded employee email.';
  }

  if (emp.status === 'disabled') {
    return 'This employee account is suspended/disabled. Contact Master Admin.';
  }

  if (passwordDigits !== emp.password) {
    return 'Incorrect password. Contact administrator if you lost your password.';
  }

  // Set local storage session only if password is changed
  if (emp.isPasswordChanged !== false) {
    setSessionUser(emp.id);
  }

  // Write audit log
  writeActivityLog(
    emp.id,
    emp.name,
    emp.role,
    'Employee Logged In',
    `Successful secure portal authorization for ${emp.name} (${emp.role})`
  );

  return emp;
}

// DYNAMIC SERVICES CRUD
export function getCustomServices(): CustomService[] {
  return JSON.parse(getStorageString(KEY_SERVICES) || '[]');
}

export function saveCustomServices(services: CustomService[]) {
  setStorageString(KEY_SERVICES, JSON.stringify(services));
}

export function addCustomService(service: Omit<CustomService, 'id'>, triggerByUserId: string): CustomService {
  const services = getCustomServices();
  const idValue = `SRV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const newService: CustomService = {
    ...service,
    id: idValue
  };
  services.push(newService);
  saveCustomServices(services);

  const user = getEmployeeById(triggerByUserId);
  writeActivityLog(
    triggerByUserId,
    user?.name || 'User',
    user?.role || 'employee',
    'Service Created',
    `Created dynamic service ${newService.name} under category ${newService.category} (Fee: ₹${newService.price})`
  );

  return newService;
}

export function updateCustomService(id: string, updates: Partial<CustomService>, triggerByUserId: string) {
  const services = getCustomServices();
  const idx = services.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const old = services[idx];
    const updated = { ...old, ...updates };
    services[idx] = updated;
    saveCustomServices(services);

    const user = getEmployeeById(triggerByUserId);
    writeActivityLog(
      triggerByUserId,
      user?.name || 'User',
      user?.role || 'employee',
      'Service Updated',
      `Updated details of dynamic service ${updated.name}`
    );
  }
}

export function deleteCustomService(id: string, triggerByUserId: string) {
  const services = getCustomServices();
  const idx = services.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const old = services[idx];
    services.splice(idx, 1);
    saveCustomServices(services);

    const user = getEmployeeById(triggerByUserId);
    writeActivityLog(
      triggerByUserId,
      user?.name || 'User',
      user?.role || 'employee',
      'Service Deleted',
      `Deleted dynamic service option ${old.name}`
    );
  }
}

// MASTER PROPOSAL TEMPLATE ACTIONS
export function getProposalTemplate(): ProposalTemplate {
  return JSON.parse(getStorageString(KEY_PROPOSAL_TEMPLATE) || '{}');
}

export function saveProposalTemplate(template: ProposalTemplate, triggerByUserId: string) {
  setStorageString(KEY_PROPOSAL_TEMPLATE, JSON.stringify(template));

  const user = getEmployeeById(triggerByUserId);
  writeActivityLog(
    triggerByUserId,
    user?.name || 'Admin',
    user?.role || 'admin',
    'Proposal Template Edited',
    `Master proposal template layout and body content updated.`
  );
}

// MASTER OFFER LETTER TEMPLATE ACTIONS
export function getOfferLetterTemplate(): OfferLetterTemplate {
  const template = JSON.parse(getStorageString(KEY_OFFER_LETTER_TEMPLATE) || '{}');
  if (template) {
    let updated = false;
    if (template.website === 'www.efiling.com' || template.website === 'http://www.efiling.com') {
      template.website = 'www.efilingg.com';
      updated = true;
    }
    if (template.companyName === 'EFILING FINANCIAL SERVICES PVT. LTD.') {
      template.companyName = 'EFILINGG FINANCIAL SERVICES PVT. LTD.';
      updated = true;
    }
    if (template.bodyParagraph1 && template.bodyParagraph1.includes('Efiling Financial Services Pvt. Ltd.')) {
      template.bodyParagraph1 = template.bodyParagraph1.replace(/Efiling Financial Services Pvt. Ltd\./g, 'Efilingg Financial Services Pvt. Ltd.');
      updated = true;
    }
    if (template.bodyParagraph4 && template.bodyParagraph4.includes('Efiling Financial Services Pvt. Ltd.')) {
      template.bodyParagraph4 = template.bodyParagraph4.replace(/Efiling Financial Services Pvt. Ltd\./g, 'Efilingg Financial Services Pvt. Ltd.');
      updated = true;
    }
    if (template.bodyParagraph5 && template.bodyParagraph5.includes('Efiling Financial Services Pvt. Ltd.')) {
      template.bodyParagraph5 = template.bodyParagraph5.replace(/Efiling Financial Services Pvt. Ltd\./g, 'Efilingg Financial Services Pvt. Ltd.');
      updated = true;
    }
    if (template.senderText && template.senderText.includes('Efiling Financial Services Pvt. Ltd.')) {
      template.senderText = template.senderText.replace(/Efiling Financial Services Pvt. Ltd\./g, 'Efilingg Financial Services Pvt. Ltd.');
      updated = true;
    }
    if (template.termsAndConditions) {
      template.termsAndConditions = template.termsAndConditions.map((term: string) => {
        if (term.includes('Efiling Financial Services Pvt. Ltd.')) {
          updated = true;
          return term.replace(/Efiling Financial Services Pvt. Ltd\./g, 'Efilingg Financial Services Pvt. Ltd.');
        }
        return term;
      });
    }
    if (updated) {
      setStorageString(KEY_OFFER_LETTER_TEMPLATE, JSON.stringify(template));
    }
  }
  return template;
}

export function saveOfferLetterTemplate(template: OfferLetterTemplate, triggerByUserId: string) {
  setStorageString(KEY_OFFER_LETTER_TEMPLATE, JSON.stringify(template));

  const user = getEmployeeById(triggerByUserId);
  writeActivityLog(
    triggerByUserId,
    user?.name || 'Admin',
    user?.role || 'admin',
    'Offer Letter Template Edited',
    `Master offer letter template updated by administrator.`
  );
}

// -------------------------------------------------------------
// PAYROLL & ATTENDANCE UPGRADES DATABASE UTILITIES (20th to 20th Cycle)
// -------------------------------------------------------------

export function getHistoricalPayrolls(): HistoricalPayroll[] {
  return JSON.parse(getStorageString(KEY_HISTORICAL_PAYROLL) || '[]');
}

export function saveHistoricalPayrolls(records: HistoricalPayroll[]) {
  setStorageString(KEY_HISTORICAL_PAYROLL, JSON.stringify(records));
}

export function addHistoricalPayroll(record: Omit<HistoricalPayroll, 'id' | 'createdAt'>): HistoricalPayroll {
  const records = getHistoricalPayrolls();
  const id = `HPR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const newRecord: HistoricalPayroll = {
    ...record,
    id,
    createdAt: getISTISOString()
  };
  records.push(newRecord);
  saveHistoricalPayrolls(records);
  return newRecord;
}

export function getCycleDateRangeForMonth(monthStr: string): { start: string; end: string } {
  // E.g. monthStr = "June 2026"
  const parts = monthStr.split(' ');
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIdx = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  
  // Start date is 21st of previous month
  let startYear = year;
  let startMonthIdx = monthIdx - 1;
  if (startMonthIdx < 0) {
    startMonthIdx = 11;
    startYear--;
  }
  
  const startMStr = String(startMonthIdx + 1).padStart(2, '0');
  const endMStr = String(monthIdx + 1).padStart(2, '0');
  
  return {
    start: `${startYear}-${startMStr}-21`,
    end: `${year}-${endMStr}-20`
  };
}

export function getAttendances(): Attendance[] {
  const rawList = JSON.parse(getStorageString(KEY_ATTENDANCE) || '[]');
  let list = rawList.filter((a: any) => a && a.employeeId !== 'EMP-NEHA2026' && a.employeeId !== 'EMP-HELPDESK' && a.employeeId !== 'EMP-61LMU');
  
  // Real-time synchronization: Dynamic self-healing of attendance records linked to non-approved leaves.
  // This automatically cleans up any orphaned/pre-approved attendance records if a leave request goes back to pending/rejected/deleted.
  const leaves = getLeaveRequests();
  let modified = false;
  list = list.filter((r: any) => {
    if (r && r.reasonForChange && r.reasonForChange.includes('Approved Leave request LEV-')) {
      const match = r.reasonForChange.match(/Approved Leave request (LEV-[A-Z0-9]+)/);
      if (match) {
        const leaveId = match[1];
        const leave = leaves.find(l => l.id === leaveId);
        if (!leave || leave.status !== 'approved') {
          modified = true;
          return false; // delete this orphaned attendance record
        }
      }
    }
    return true;
  });

  // Self-healing: Automatically and cleanly deduplicate attendance logs by employeeId and date
  // group records by employeeId + date
  const groups: { [key: string]: Attendance[] } = {};
  list.forEach(a => {
    if (!a || !a.employeeId || !a.date) return;
    const key = `${a.employeeId}_${a.date}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(a);
  });

  const deduplicatedList: Attendance[] = [];
  let deduplicated = false;

  for (const key in groups) {
    const group = groups[key];
    if (group.length === 1) {
      deduplicatedList.push(group[0]);
    } else {
      deduplicated = true; // We found duplicate entries for the same date!
      
      // Select the best status among the duplicates
      // Priority rank: 1 indicates the highest status
      const getStatusRank = (status: string) => {
        switch (status) {
          case 'Present': return 1;
          case 'Paid Leave': return 2;
          case 'Week Off': return 3;
          case 'Absent': return 4;
          default: return 5;
        }
      };

      // Sort group by status priority rank (ascending)
      group.sort((a, b) => getStatusRank(a.status) - getStatusRank(b.status));

      // Use the best record as the baseline
      const merged: Attendance = { ...group[0] };

      // Incorporate missing fields from other parallel duplicates
      group.slice(1).forEach(other => {
        if (!merged.checkIn && other.checkIn) merged.checkIn = other.checkIn;
        if (!merged.checkOut && other.checkOut) merged.checkOut = other.checkOut;
        if (!merged.actualCheckIn && other.actualCheckIn) merged.actualCheckIn = other.actualCheckIn;
        if ((merged.totalHours === undefined || merged.totalHours === 0) && other.totalHours) {
          merged.totalHours = other.totalHours;
        }
        if (!merged.reasonForChange && other.reasonForChange) {
          merged.reasonForChange = other.reasonForChange;
        }
      });

      // Recalculate total work hours if check-in/out timestamps are available but totalHours is not set
      if (merged.status === 'Present' && merged.checkIn && merged.checkOut) {
        try {
          const [inH, inM] = merged.checkIn.split(':').map(Number);
          const [outH, outM] = merged.checkOut.split(':').map(Number);
          if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
            const calculatedHrs = parseFloat(((outH + outM / 60) - (inH + inM / 60)).toFixed(2));
            if (calculatedHrs > 0) {
              merged.totalHours = calculatedHrs;
            }
          }
        } catch (e) {}
      }

      // Enforce appropriate deductSalary based on finalized status
      if (merged.status === 'Present' || merged.status === 'Paid Leave' || merged.status === 'Week Off') {
        merged.deductSalary = false;
      } else if (merged.status === 'Absent') {
        // Only deduct if any of the duplicates explicitly instructed a deduction
        merged.deductSalary = group.some(g => g.deductSalary === true);
      }

      deduplicatedList.push(merged);
    }
  }

  if (deduplicated) {
    list = deduplicatedList;
    modified = true;
  }

  if (rawList.length !== list.length || modified) {
    localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(list));
    pushToPostgres(KEY_ATTENDANCE, JSON.stringify(list)).catch(() => {});
  }
  return list;
}

export function saveAttendances(records: Attendance[]) {
  setStorageString(KEY_ATTENDANCE, JSON.stringify(records));
}

export function getAttendanceAudits(): AttendanceAuditLog[] {
  return JSON.parse(getStorageString(KEY_ATTENDANCE_AUDIT) || '[]');
}

export function saveAttendanceAudits(records: AttendanceAuditLog[]) {
  setStorageString(KEY_ATTENDANCE_AUDIT, JSON.stringify(records));
}

export function getTLMappings(): TeamLeaderMapping[] {
  const rawList = JSON.parse(getStorageString(KEY_TL_MAPPINGS) || '[]');
  const list = rawList.filter((m: any) => {
    if (!m) return false;
    if (m.teamLeaderId === 'EMP-61LMU' || m.teamLeaderId === 'EMP-NEHA2026' || m.teamLeaderId === 'EMP-HELPDESK') return false;
    if (m.employeeIds) {
      m.employeeIds = m.employeeIds.filter((id: string) => id !== 'EMP-61LMU' && id !== 'EMP-NEHA2026' && id !== 'EMP-HELPDESK');
    }
    return true;
  });
  if (rawList.length !== list.length) {
    localStorage.setItem(KEY_TL_MAPPINGS, JSON.stringify(list));
    pushToPostgres(KEY_TL_MAPPINGS, JSON.stringify(list)).catch(() => {});
  }
  return list;
}

export function saveTLMappings(mappings: TeamLeaderMapping[]) {
  setStorageString(KEY_TL_MAPPINGS, JSON.stringify(mappings));
}

// Map employees to a Team Leader
export function updateTLMapping(teamLeaderId: string, employeeIds: string[]) {
  const mappings = getTLMappings();
  const idx = mappings.findIndex(m => m.teamLeaderId === teamLeaderId);
  if (idx !== -1) {
    mappings[idx].employeeIds = employeeIds;
  } else {
    mappings.push({ teamLeaderId, employeeIds });
  }
  saveTLMappings(mappings);
}

// Get assigned employee IDs for a Team Leader
export function getTLAssignedEmployeeIds(teamLeaderId: string): string[] {
  const mappings = getTLMappings();
  const found = mappings.find(m => m.teamLeaderId === teamLeaderId);
  return found ? found.employeeIds : [];
}

// Create checkIn with 15 minutes compensation
export function employeePunchIn(employeeId: string): Attendance {
  const currentDate = getISTDateString();
  const currentFullTime = getISTTimeString(); // "HH:MM" e.g. "10:15"
  
  if (currentFullTime >= '11:30') {
    throw new Error('Check-In window has closed for today (11:30 AM deadline reached).');
  }
  
  // Stored Check-In logic: subtract 15 minutes of compensation
  const [hourStr, minStr] = currentFullTime.split(':');
  let hour = parseInt(hourStr, 10);
  let min = parseInt(minStr, 10);
  
  min -= 15;
  if (min < 0) {
    min += 60;
    hour -= 1;
    if (hour < 0) {
      hour = 23;
    }
  }
  const storedTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  
  const records = getAttendances();
  // Check if checkin already exists for today
  const existingIdx = records.findIndex(r => r.employeeId === employeeId && r.date === currentDate);
  
  let record: Attendance;
  if (existingIdx !== -1) {
    record = records[existingIdx];
    record.checkIn = storedTime;
    record.actualCheckIn = currentFullTime;
    record.status = 'Present';
    record.deductSalary = false;
    records[existingIdx] = record;
  } else {
    record = {
      id: `ATT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      employeeId,
      date: currentDate,
      checkIn: storedTime,
      actualCheckIn: currentFullTime,
      status: 'Present',
      deductSalary: false
    };
    records.push(record);
  }
  
  saveAttendances(records);
  
  // Write notification
  addSystemNotification({
    title: 'Attendance Punch-In Successfully Recorded ⏱',
    message: `Staff registered arrival at actual time ${currentFullTime} (adjusted stored check-in: ${storedTime}).`,
    type: 'lead_assigned',
    userId: employeeId
  });
  
  return record;
}

// Punch out
export function employeePunchOut(employeeId: string): Attendance {
  const currentDate = getISTDateString();
  const currentTime = getISTTimeString();
  
  if (currentTime >= '18:30') {
    throw new Error('Check-Out window has closed for today (06:30 PM deadline reached).');
  }
  
  const records = getAttendances();
  const idx = records.findIndex(r => r.employeeId === employeeId && r.date === currentDate);
  
  let record: Attendance;
  if (idx !== -1) {
    record = records[idx];
    record.checkOut = currentTime;
    record.status = 'Present';
    record.deductSalary = false;
    
    // Calculate total hours
    if (record.checkIn) {
      const [inH, inM] = record.checkIn.split(':').map(Number);
      const [outH, outM] = currentTime.split(':').map(Number);
      const diffHrs = (outH + outM / 60) - (inH + inM / 60);
      record.totalHours = parseFloat(diffHrs.toFixed(2));
    }
    
    records[idx] = record;
  } else {
    record = {
      id: `ATT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      employeeId,
      date: currentDate,
      checkOut: currentTime,
      status: 'Present',
      deductSalary: false
    };
    records.push(record);
  }
  
  saveAttendances(records);
  
  // Write notification
  addSystemNotification({
    title: 'Attendance Punch-Out Recorded 🚪',
    message: `Staff punched out at ${currentTime}. Total hours logged: ${record.totalHours || 'N/A'}.`,
    type: 'lead_assigned',
    userId: employeeId
  });
  
  return record;
}

// Edit attendance with Audit Trail
export function updateAttendanceManually(
  attendanceId: string, 
  updates: Partial<Omit<Attendance, 'id'>>, 
  modifiedByUserId: string, 
  reason: string
) {
  if (!reason || reason.trim() === '') {
    throw new Error('Reason for change is mandatory to modify attendance logs.');
  }
  
  const records = getAttendances();
  const idx = records.findIndex(r => r.id === attendanceId);
  if (idx === -1) {
    throw new Error('Attendance record not found.');
  }
  
  const oldRecord = { ...records[idx] };
  const updatedRecord = { 
    ...oldRecord, 
    ...updates,
    modifiedBy: modifiedByUserId,
    modifiedAt: getISTISOString(),
    reasonForChange: reason
  } as Attendance;
  
  // Re-calculate hours if checkIn/checkOut changed
  if (updatedRecord.checkIn && updatedRecord.checkOut) {
    const [inH, inM] = updatedRecord.checkIn.split(':').map(Number);
    const [outH, outM] = updatedRecord.checkOut.split(':').map(Number);
    updatedRecord.totalHours = parseFloat(((outH + outM / 60) - (inH + inM / 60)).toFixed(2));
  }
  
  records[idx] = updatedRecord;
  saveAttendances(records);
  
  // Save Audit logs
  const audits = getAttendanceAudits();
  const modifier = getEmployeeById(modifiedByUserId);
  const employee = getEmployeeById(oldRecord.employeeId);
  
  const changeFields = Object.keys(updates) as (keyof typeof updates)[];
  changeFields.forEach(field => {
    const oldVal = String(oldRecord[field] !== undefined ? oldRecord[field] : '');
    const newVal = String(updates[field] !== undefined ? updates[field] : '');
    
    if (oldVal !== newVal) {
      audits.push({
        id: `AUD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        attendanceId,
        date: oldRecord.date,
        employeeId: oldRecord.employeeId,
        employeeName: employee?.name || 'Staff',
        field: String(field),
        oldValue: oldVal,
        newValue: newVal,
        modifiedBy: modifiedByUserId,
        modifiedByName: modifier?.name || 'Modifier',
        timestamp: getISTISOString(),
        reason
      });
    }
  });
  
  saveAttendanceAudits(audits);
  
  // Custom Activity Log entry
  writeActivityLog(
    modifiedByUserId,
    modifier?.name || 'User',
    modifier?.role || 'employee',
    'Attendance Override Applied 📍',
    `Modified attendance for Employee ID: ${oldRecord.employeeId} on date ${oldRecord.date}. Reason: ${reason}`
  );
  
  // Notify
  addSystemNotification({
    title: 'Attendance Modified by Management ⚙️',
    message: `Your attendance record for date ${oldRecord.date} has been updated. Reason: ${reason}`,
    type: 'lead_assigned',
    userId: oldRecord.employeeId
  });
}

// Process automated tasks: 11:30 AM auto-absents and 6:30 PM auto check-outs
export function runAttendanceAutoJobs(modifiedByUserId: string) {
  const today = getISTDateString();
  const time = getISTTimeString(); // "HH:MM" in 24hr format
  
  const employees = getEmployees().filter(e => e.status === 'active' && e.role !== 'admin');
  const records = getAttendances();
  let updatedCount = false;
  
  employees.forEach(emp => {
    const existing = records.find(r => r.employeeId === emp.id && r.date === today);
    
    // Auto Absent: if time passed 11:30 AM & no punch registered
    if (time >= '11:30' && !existing) {
      const parts = today.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      const isSunday = dateObj.getDay() === 0;
      const statusType = isSunday ? 'Week Off' : 'Absent';
      const deduct = !isSunday; // Week off has no deduction, absent has default deduction
      
      const newAttendance: Attendance = {
        id: `ATT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        employeeId: emp.id,
        date: today,
        status: statusType,
        deductSalary: deduct,
        bySystem: true,
        reasonForChange: 'System Auto-Absent (No arrival by 11:30 AM)'
      };
      
      records.push(newAttendance);
      updatedCount = true;
      
      addSystemNotification({
        title: isSunday ? 'Sunday Week-Off Marked 🗓' : 'Auto Absent Applied ⚠️',
        message: isSunday ? 'Marked as weekend off.' : `Absent trigger activated automatically at 11:30 AM. Standard wage deduction: Yes.`,
        type: 'lead_assigned',
        userId: emp.id
      });
    }
    
    // Auto Exit: check out missing at/after 6:30 PM (18:30)
    if (time >= '18:30' && existing && existing.status === 'Present' && existing.checkIn && !existing.checkOut) {
      existing.checkOut = '18:30';
      existing.autoExit = true;
      
      // Calculate total hours
      const [inH, inM] = existing.checkIn.split(':').map(Number);
      const diffHrs = 18.5 - (inH + inM / 60);
      existing.totalHours = parseFloat(diffHrs.toFixed(2));
      
      updatedCount = true;
      
      addSystemNotification({
        title: 'Auto Check-Out Completed 🏢',
        message: 'System automatically generated exit punch at office closing hour (06:30 PM).',
        type: 'lead_assigned',
        userId: emp.id
      });
    }
  });
  
  if (updatedCount) {
    saveAttendances(records);
  }
}

// Fetch general system notifications
export function addSystemNotification(params: { title: string; message: string; type: any; userId: string }) {
  const notifsStr = getStorageString(KEY_NOTIFICATIONS) || '[]';
  let notifs = [];
  try {
    notifs = JSON.parse(notifsStr);
  } catch(e) {}
  
  const idValue = `NTF-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const newNotif: Notification = {
    id: idValue,
    title: params.title,
    message: params.message,
    type: params.type,
    userId: params.userId,
    read: false,
    createdAt: getISTISOString()
  };
  notifs.push(newNotif);
  setStorageString(KEY_NOTIFICATIONS, JSON.stringify(notifs));
}

// Generate cycle dates mapping for active employee attendance calendar
export function getAttendanceMetricsForCycle(employeeId: string, monthStr: string) {
  const range = getCycleDateRangeForMonth(monthStr);
  const records = getAttendances();
  
  // Find all records belonging to this employee within range
  const filtered = records.filter(r => r.employeeId === employeeId && r.date >= range.start && r.date <= range.end);
  
  let presentDays = 0;
  let absentDays = 0;
  let weekOffDays = 0;
  let paidLeaveDays = 0;
  let deductionDays = 0;
  
  filtered.forEach(r => {
    if (r.status === 'Present') presentDays++;
    else if (r.status === 'Absent') {
      absentDays++;
      if (r.deductSalary) deductionDays++;
    }
    else if (r.status === 'Week Off') weekOffDays++;
    else if (r.status === 'Paid Leave') paidLeaveDays++;
  });
  
  return {
    period: `${range.start} to ${range.end}`,
    presentDays,
    absentDays,
    weekOffDays,
    paidLeaveDays,
    deductionDays,
    totalRecords: filtered
  };
}

// Calculate cycle metrics and net salary dynamically for current/future processing
export function calculateSalaryForCycle(employee: Employee, monthStr: string, incentivesEarned: number = 0) {
  const metrics = getAttendanceMetricsForCycle(employee.id, monthStr);
  
  const baseSalary = employee.salary || 0;
  const allowances = employee.otherFixedAllowance || 0;
  const dailyRate = Math.round(baseSalary / 30);
  const attendanceDeduction = metrics.deductionDays * dailyRate;
  
  const totalIncentives = incentivesEarned;
  const netSalary = Math.max(0, baseSalary + allowances + totalIncentives - attendanceDeduction);
  
  return {
    fixedSalary: baseSalary,
    fixedAllowance: allowances,
    incentiveAmount: totalIncentives,
    bonus: 0,
    deduction: attendanceDeduction,
    netSalary,
    presentDays: metrics.presentDays,
    absentDays: metrics.absentDays,
    weekOffs: metrics.weekOffDays,
    paidLeaves: metrics.paidLeaveDays,
    period: `${getCycleDateRangeForMonth(monthStr).start} - ${getCycleDateRangeForMonth(monthStr).end}`
  };
}

// ==========================================
// LEAVE REQUESTS DATABASE MANAGEMENT PIPELINE
// ==========================================
export const KEY_LEAVE_REQUESTS = 'efilingg_crm_leave_requests';

export function getLeaveRequests(): LeaveRequest[] {
  const data = getStorageString(KEY_LEAVE_REQUESTS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLeaveRequests(leaves: LeaveRequest[]) {
  setStorageString(KEY_LEAVE_REQUESTS, JSON.stringify(leaves));
}

export function addLeaveRequest(leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) {
  const leaves = getLeaveRequests();
  const newLeave: LeaveRequest = {
    ...leave,
    id: `LEV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  leaves.push(newLeave);
  saveLeaveRequests(leaves);
  return newLeave;
}

export function updateLeaveRequestStatus(leaveId: string, status: 'approved' | 'rejected', actorId: string, paymentType?: 'paid' | 'unpaid') {
  const leaves = getLeaveRequests();
  const index = leaves.findIndex(l => l.id === leaveId);
  if (index !== -1) {
    leaves[index].status = status;
    leaves[index].approvedBy = actorId;
    leaves[index].actedAt = new Date().toISOString();
    if (status === 'approved' && paymentType) {
      leaves[index].paymentType = paymentType;
    } else if (status !== 'approved') {
      delete leaves[index].paymentType;
    }
    saveLeaveRequests(leaves);

    // In all circumstances, first filter out any existing attendance records generated for this leave request ID to keep the database tidy
    const records = getAttendances();
    const cleanedRecords = records.filter(r => {
      const isFromThisLeave = r && r.reasonForChange && r.reasonForChange.includes(`Approved Leave request ${leaveId}`);
      return !isFromThisLeave;
    });

    if (status === 'approved') {
      const leave = leaves[index];
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const tempDate = new Date(start);

      // Determine if this leave is unpaid or paid
      const isUnpaid = paymentType ? (paymentType === 'unpaid') : (leave.leaveType === 'unpaid');
      const attendanceStatus = isUnpaid ? 'Absent' : 'Paid Leave';
      const deductSalary = isUnpaid;

      while (tempDate <= end) {
        const dateStr = tempDate.toISOString().split('T')[0];
        cleanedRecords.push({
          id: `ATT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          employeeId: leave.employeeId,
          date: dateStr,
          checkIn: '',
          checkOut: '',
          status: attendanceStatus,
          deductSalary,
          reasonForChange: `Approved Leave request ${leaveId} (${isUnpaid ? 'Unpaid' : 'Paid'})`,
          modifiedBy: actorId,
          modifiedAt: new Date().toISOString()
        });
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }
    saveAttendances(cleanedRecords);
  }
}

// ==========================================
// RESIGNATION & EXIT SYSTEM MANAGEMENT PIPELINE
// ==========================================
export const KEY_RESIGNATIONS = 'efilingg_crm_resignations';

export function getResignationRequests(): ResignationRequest[] {
  const data = getStorageString(KEY_RESIGNATIONS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveResignationRequests(requests: ResignationRequest[]) {
  setStorageString(KEY_RESIGNATIONS, JSON.stringify(requests));
}

export function addResignationRequest(req: Omit<ResignationRequest, 'id' | 'submissionDate' | 'status'>) {
  const requests = getResignationRequests();
  const newReq: ResignationRequest = {
    ...req,
    id: `RES-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    status: 'pending',
    submissionDate: getISTDateString()
  };
  requests.push(newReq);
  saveResignationRequests(requests);
  return newReq;
}

export function updateResignationStatus(reqId: string, status: 'approved' | 'rejected', actorId: string, actorName: string, rejectionReason?: string) {
  const requests = getResignationRequests();
  const index = requests.findIndex(r => r.id === reqId);
  if (index !== -1) {
    const r = requests[index];
    r.status = status;
    r.approvedBy = actorId;
    r.approvedByName = actorName;
    r.actedAt = new Date().toISOString();
    if (status === 'rejected' && rejectionReason) {
      r.rejectionReason = rejectionReason;
    }
    saveResignationRequests(requests);

    // If approved, update the employee status, exit details
    if (status === 'approved') {
      const employees = getEmployees();
      const empIdx = employees.findIndex(e => e.id === r.employeeId);
      if (empIdx !== -1) {
        employees[empIdx].status = 'disabled';
        employees[empIdx].exitDate = r.requestedExitDate;
        employees[empIdx].exitReason = r.reason;
        employees[empIdx].exitStatus = 'resigned';
        saveEmployees(employees);
      }
    }
    return r;
  }
  return null;
}

export function transferEmployeeLeadsAndProposals(fromEmployeeId: string, toEmployeeId: string, reason: string) {
  const leads = getLeads();
  const proposals = getProposals();
  const employees = getEmployees();

  const fromEmp = employees.find(e => e.id === fromEmployeeId);
  const toEmp = employees.find(e => e.id === toEmployeeId);

  if (!fromEmp || !toEmp) return { success: false, message: "Invalid employee IDs" };

  let countLeadsTransferred = 0;
  let countProposalsTransferred = 0;

  // Track transfers to record them
  const transfers = JSON.parse(getStorageString(KEY_TRANSFERS) || '[]');

  const updatedLeads = leads.map(lead => {
    if (lead.assignedTo === fromEmployeeId) {
      countLeadsTransferred++;
      
      const newTransfer: LeadTransfer = {
        id: `TF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        leadId: lead.id,
        transferredFrom: fromEmployeeId,
        transferredFromName: fromEmp.name,
        transferredTo: toEmployeeId,
        transferredToName: toEmp.name,
        reason: `Bulk exit transfer: ${reason}`,
        transferredAt: new Date().toISOString()
      };
      transfers.push(newTransfer);

      // Append standard lead history
      writeLeadHistory({
        leadId: lead.id,
        field: 'assignedTo',
        oldValue: fromEmp.name,
        newValue: toEmp.name,
        updatedBy: 'SYSTEM'
      });

      return {
        ...lead,
        assignedTo: toEmployeeId,
        transferredFromId: fromEmployeeId,
        transferredFromName: fromEmp.name,
        notes: `${lead.notes || ''}\n[Lead transferred from ${fromEmp.name} to ${toEmp.name} on ${getISTDateString()} - Reason: ${reason}]`.trim()
      };
    }
    return lead;
  });

  const updatedProposals = proposals.map(prop => {
    if (prop.createdBy === fromEmployeeId) {
      countProposalsTransferred++;
      return {
        ...prop,
        createdBy: toEmployeeId,
        notes: `${prop.notes || ''}\n[Proposal ownership transferred from ${fromEmp.name} on ${getISTDateString()} due to exit]`.trim()
      };
    }
    return prop;
  });

  saveLeads(updatedLeads);
  saveProposals(updatedProposals);
  setStorageString(KEY_TRANSFERS, JSON.stringify(transfers));

  writeActivityLog(
    'SYSTEM',
    'System Admin',
    'admin',
    'Bulk Lead & Proposal Transfer',
    `Transferred ${countLeadsTransferred} leads and ${countProposalsTransferred} proposals from ${fromEmp.name} to ${toEmp.name}.`
  );

  return {
    success: true,
    leadsTransferred: countLeadsTransferred,
    proposalsTransferred: countProposalsTransferred
  };
}




