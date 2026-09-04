/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmployeeRole = 'admin' | 'employee' | 'team_leader';
export type EmployeeStatus = 'active' | 'disabled';

export type AppModuleId =
  | 'sales_marketing'       // Sales & Marketing
  | 'gst'                   // GST
  | 'mca_roc'               // MCA & ROC
  | 'income_tax'            // INCOME TAX RETURN
  | 'trademark'             // TRADEMARK & COPYRIGHT
  | 'trust_ngo'             // TRUST AND NGO
  | 'dsc'                   // DSC MANAGEMENT
  | 'registration_license'  // REGISTRATION & LICENSE
  | 'client_master'         // CLIENT MASTER
  | 'hr_workforce'          // HR & WORKFORCE
  | 'settings_control';     // SETTING & CONTROLL CENTER

export interface AppModuleInfo {
  id: AppModuleId;
  label: string;
  category: 'Sales' | 'Operations' | 'Management' | 'Admin';
  description: string;
  shortTitle: string;
  defaultIcon: string;
}

export const ALL_APP_MODULES: AppModuleInfo[] = [
  {
    id: 'sales_marketing',
    label: 'Sales & Marketing',
    category: 'Sales',
    description: 'Leads Pipeline, Followups, Proposals, AI Sales & Rate Master',
    shortTitle: 'Sales Desk',
    defaultIcon: 'TrendingUp'
  },
  {
    id: 'gst',
    label: 'GST',
    category: 'Operations',
    description: 'GSTR-1, GSTR-3B, Monthly & Quarterly Returns, Client Portfolio',
    shortTitle: 'GST Compliance',
    defaultIcon: 'FileSpreadsheet'
  },
  {
    id: 'mca_roc',
    label: 'MCA & ROC',
    category: 'Operations',
    description: 'Pvt Ltd, LLP, Section 8, DIN KYC, Post Inc & Annual ROC (AOC-4/MGT-7)',
    shortTitle: 'MCA & ROC',
    defaultIcon: 'Building2'
  },
  {
    id: 'income_tax',
    label: 'INCOME TAX RETURN',
    category: 'Operations',
    description: 'Individual & Business ITR, Direct Tax Clearance & Tax Audit 3CD',
    shortTitle: 'Income Tax',
    defaultIcon: 'Shield'
  },
  {
    id: 'trademark',
    label: 'TRADEMARK & COPYRIGHT',
    category: 'Operations',
    description: 'Applications, Objections, Hearings, Registrations & Copyrights',
    shortTitle: 'Trademark & IP',
    defaultIcon: 'Award'
  },
  {
    id: 'trust_ngo',
    label: 'TRUST AND NGO',
    category: 'Operations',
    description: 'NGOs & Trusts, Section 12A & 80G, Form 10B & 10BB Audits',
    shortTitle: 'Trust & NGO',
    defaultIcon: 'Landmark'
  },
  {
    id: 'dsc',
    label: 'DSC MANAGEMENT',
    category: 'Operations',
    description: 'Class 3 Digital Signatures, Renewals (<30 Days) & Expired Tokens',
    shortTitle: 'DSC Management',
    defaultIcon: 'KeyRound'
  },
  {
    id: 'registration_license',
    label: 'REGISTRATION & LICENSE',
    category: 'Operations',
    description: 'FSSAI, MSME / Udyam, IEC, Trade & Labour Statutory Licenses',
    shortTitle: 'Statutory Licenses',
    defaultIcon: 'FileCheck2'
  },
  {
    id: 'client_master',
    label: 'CLIENT MASTER',
    category: 'Operations',
    description: 'Central Client Directory, Allocation Desk & Service Mapping',
    shortTitle: 'Client Master',
    defaultIcon: 'Users'
  },
  {
    id: 'hr_workforce',
    label: 'HR & WORKFORCE',
    category: 'Management',
    description: 'Employees Roster, Payroll Approvals, Leaves & Attendance Logs',
    shortTitle: 'HR & Workforce',
    defaultIcon: 'Users'
  },
  {
    id: 'settings_control',
    label: 'SETTING & CONTROLL CENTER',
    category: 'Admin',
    description: 'Security Telemetry, AI Sales Agent, Recovery Center & WhatsApp Gateway',
    shortTitle: 'Control Center',
    defaultIcon: 'ShieldCheck'
  }
];

export interface VersionedRecord {
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Employee extends VersionedRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  joinedDate: string;
  lastLogin?: string;
  photo?: string; // Optional employee profile photo Base64 string
  address?: string; // Candidate address for Offer Letter
  
  // Custom credential field
  password?: string;
  isPasswordChanged?: boolean;

  // Custom payroll and HR fields
  employeeCode: string;
  designation: string;
  dateOfJoining: string;
  salary: number;
  allowances: number;
  otherFixedAllowance: number;
  incentivePerConversion: number; // Set by admin only
  attendanceDays?: number; // e.g. out of 30 days
  monthlyAttendance?: Record<string, number>; // Monthwise attendance, e.g. {"April 2026": 26}
  department?: 'Sales & Marketing' | 'Operation Management' | string;
  exitDate?: string;
  exitReason?: string;
  exitStatus?: 'resigned' | 'terminated' | 'none';
  shift?: string;

  // Module Access Control (Task Manager is enabled for all employees by default)
  accessibleModules?: AppModuleId[];
}

export type LeadStage =
  | 'New Lead'
  | 'Contacted'
  | 'Follow-Up Pending'
  | 'Interested'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Converted'
  | 'Not Interested'
  | 'Closed Lost'
  | 'Closed Won';

export const LEAD_STAGES: LeadStage[] = [
  'New Lead',
  'Contacted',
  'Follow-Up Pending',
  'Interested',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Not Interested',
  'Closed Lost',
  'Closed Won'
];

export interface Lead extends VersionedRecord {
  id: string;
  customerName: string;
  mobile: string;
  email: string;
  businessName: string;
  serviceRequired: string;
  leadSource: string;
  stage: LeadStage;
  creationDate: string;
  notes: string;
  assignedTo: string; // Employee ID
  createdBy: string;  // Employee ID
  incentiveStatus?: 'none' | 'pending_approval' | 'approved' | 'rejected';
  incentiveAmount?: number;
  incentiveApprovedBy?: string;
  incentiveApprovedAt?: string;
  transferredFromId?: string;
  transferredFromName?: string;
  // Phase 4: Permanent Lead -> Client -> Work Order Linkage
  linkedClientId?: string;
  linkedClientName?: string;
  linkedWorkOrderId?: string;
  convertedAt?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  assignedTo?: string; // Optional employee ID
  followUpDate: string; // YYYY-MM-DD
  followUpTime: string; // HH:MM
  remarks: string;
  customerResponse: string;
  status: 'pending' | 'completed' | 'overdue';
  createdBy: string;  // Employee ID
  createdAt: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  field: string; // e.g. 'stage', 'assignedTo', 'notes', etc.
  oldValue: string;
  newValue: string;
  updatedBy: string; // Employee ID
  updatedByName: string;
  updatedAt: string;
}

export interface LeadTransfer {
  id: string;
  leadId: string;
  transferredFrom: string;
  transferredFromName: string;
  transferredTo: string;
  transferredToName: string;
  reason: string;
  transferredAt: string;
}

export interface Proposal {
  id: string;
  leadId?: string;
  clientName: string;
  clientEmail: string;
  clientMobile: string;
  clientBusiness?: string;
  serviceRequired: string;
  amount: number;
  taxes: number;
  finalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  validUntil: string;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'followup_due' | 'lead_assigned' | 'lead_transfer' | 'proposal_generated' | 'lead_converted' | 'workflow_stage_change' | 'automation_alert';
  link?: string; // target ID or route
  userId: string; // Employee ID or 'admin' or 'all'
  read: boolean;
  createdAt: string;
}

export interface CustomService extends VersionedRecord {
  id: string;
  name: string;
  category: string;
  price: number;
  packagesIncluded: string[]; // e.g. ["PAN", "TAN", "Digital Signature Certificate"]
  documentsRequired: string[]; // e.g. ["Aadhaar", "PAN", "Rent Agreement"]
  timeline: string; // e.g. "5 Working Days"
  scope: string[]; // detailed task scopes
  deliverables: string[]; // physical or electronic documents produced
  priceBreakup?: { name: string; amount: number; discount?: number }[]; // custom itemized pricing split
  employeeIncentive?: number; // Service-specific employee incentive amount
}

export interface ProposalTemplate extends VersionedRecord {
  companyName: string;
  tagline: string;
  logoText: string;
  aboutHeading: string;
  aboutText: string;
  experienceStats: { value: string; label: string }[];
  whyChooseHeading: string;
  whyChooseFeatures: { title: string; desc: string }[];
  testimonials: { name: string; company: string; text: string }[];
  processFlowHeading: string;
  processFlowStages: { title: string; desc: string }[]; // expects exactly 5 stages
  termsAndConditions: string[];
  website: string;
  supportEmail: string;
  supportPhone1: string;
  supportPhone2: string;
  officeAddress: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export const PREDEFINED_PRICING: Record<string, { price: number; code: string; scope: string[]; deliverables: string[]; timeline: string }> = {
  'GST Registration': {
    price: 999,
    code: 'GST-REG',
    scope: [
      'Document gathering & compliance verification',
      'Filing of Application in GST Portal',
      'Replying to clarifications or queries raised by department officers',
      'Generation of GSTIN with Registration Certificate'
    ],
    deliverables: ['GST Registration Certificate (Form GST REG-06)', 'GST Login Credentials details'],
    timeline: '3 - 5 Working Days'
  },
  'Trademark Registration': {
    price: 1499,
    code: 'TM-REG',
    scope: [
      'Comprehensive Search in Trademark Registry database',
      'Advice on Logo / Brand Class selection',
      'Drafting of TM-A application',
      'Filing of application & generation of TM Application Number'
    ],
    deliverables: ['TM Application Filing Receipt', 'Form TM-A PDF Copy', 'Official TM Search Report'],
    timeline: '1 - 2 Working Days (Filing Receipt)'
  },
  'Company Registration': {
    price: 6999,
    code: 'CO-REG',
    scope: [
      'Applying for 2 Digital Signature Certificates (DSC)',
      'RUN Name Approval Reservation',
      'Drafting MOA and AOA on SPICe+ form',
      'Filing Spice+ with MCA & PAN/TAN generation'
    ],
    deliverables: ['Certificate of Incorporation (COI)', 'PAN & TAN of the Company', 'Approved MOA & AOA', 'Digital Signatures (2)'],
    timeline: '7 - 10 Working Days'
  },
  'LLP Registration': {
    price: 4999,
    code: 'LLP-REG',
    scope: [
      'Partner DSC approval (2 partners)',
      'LLP Name Reservation in FiLLiP',
      'Drafting LLP Agreement',
      'Filing FiLLiP and LLP Agreement on MCA portal'
    ],
    deliverables: ['LLP Certificate of Incorporation', 'Approved LLP Agreement Copy', 'Partner DSC details'],
    timeline: '8 - 12 Working Days'
  },
  'ITR Filing': {
    price: 1299,
    code: 'ITR-FILE',
    scope: [
      'Analysis of Form 16, 26AS, AIS/TIS statement',
      'Computation of income under applicable heads',
      'Filing of ITR-1, ITR-2 or ITR-3 on Income Tax Portal',
      'E-verification assistance'
    ],
    deliverables: ['ITR Acknowledgement Form (V)', 'Tax Computation Sheet', 'Tax filing submission report'],
    timeline: '2 - 3 Working Days'
  },
  'ISO Certification': {
    price: 3500,
    code: 'ISO-CERT',
    scope: [
      'Consultation & determination of ISO Standard (e.g., 9001:2015)',
      'Gap analysis and documentation standards template',
      'Filing with certification body & audit coordination',
      'Issuance of ISO Audit & Certificate'
    ],
    deliverables: ['ISO Certificate softcopy and registered record', 'Core QMS Manual Documents'],
    timeline: '5 - 7 Working Days'
  },
  'FSSAI Registration': {
    price: 1999,
    code: 'FSSAI-REG',
    scope: [
      'FSSAI Eligibility evaluation (Basic, State, central)',
      'Filing form-A or Form-B in FoSCoS portal',
      'Documentation & validation with food authority',
      'Handling comments and approval process'
    ],
    deliverables: ['FSSAI 14-digit Registration License Certificate', 'GST / Identity link mapping'],
    timeline: '4 - 8 Working Days'
  },
  'MSME Registration': {
    price: 499,
    code: 'MSME-UDY',
    scope: [
      'Filing Udyam Registration application online',
      'Assigned NIC code classifications matching operations',
      'Verification with Aadhaar & PAN system',
      'Generation of Registered Certificate'
    ],
    deliverables: ['Udyam MSME Registration Certificate'],
    timeline: '1 - 2 Working Days'
  },
  'Website Development': {
    price: 15000,
    code: 'WEB-DEV',
    scope: [
      'Standard UI custom design layout in Figma/React',
      'Full Responsive development (Desktop, Tablet, Mobile)',
      'Integration of Contact Form, Database/Email notifications, Analytics',
      'Speed optimization & basic SEO setup'
    ],
    deliverables: ['Full Source Code access & Deployment details', '1-Year Hosting and SSL setup Assistance', 'CMS Admin training guide'],
    timeline: '15 - 20 Working Days'
  },
  'Accounting Services': {
    price: 4000,
    code: 'ACC-SRV',
    scope: [
      'Monthly bookkeeping and transactions categorization',
      'Bank reconciliation checks',
      'GST returns filing assistance and preparation',
      'P&L and Balance Sheet monthly compliance previews'
    ],
    deliverables: ['Monthly Trial Balance & Ledger Report', 'Monthly P&L Preview', 'GSTR returns receipt records'],
    timeline: 'Recurring Monthly'
  },
  'Other': {
    price: 1999,
    code: 'OTH-SRV',
    scope: [
      'Custom consultations on selected requirements',
      'Professional document verification',
      'Preparation and filing with respective government portals',
      'Consistent status updates and query support'
    ],
    deliverables: ['Service Completion confirmation', 'Respective agency filing slips'],
    timeline: 'Based on Requirement'
  }
};

export interface OfferLetterTemplate extends VersionedRecord {
  companyName: string;
  tagline?: string;
  officeAddress?: string;
  contactNumber: string;
  email: string;
  website: string;
  subject: string;
  salutationLine: string;
  bodyParagraph1: string;
  bodyParagraph2: string;
  bodyParagraph3: string;
  bodyParagraph4: string;
  bodyParagraph5: string;
  closingHeading: string;
  senderText: string;
  signatoryName: string;
  signatoryTitle: string;
  termsAndConditions: string[];
}

export interface Attendance extends VersionedRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM
  actualCheckIn?: string; // HH:MM actual
  checkOut?: string; // HH:MM
  status: 'Present' | 'Absent' | 'Week Off' | 'Paid Leave';
  deductSalary: boolean;
  autoExit?: boolean; // True if system auto-checked them out
  bySystem?: boolean; // True if system marked absent
  reasonForChange?: string; // Reason for manual edit
  modifiedBy?: string; // ID of editor
  modifiedAt?: string; // ISO date
  totalHours?: number; 
}

export interface AttendanceAuditLog {
  id: string;
  attendanceId: string;
  date: string;
  employeeId: string;
  employeeName: string;
  field: string; // 'status' | 'checkIn' | 'checkOut' | 'deductSalary' etc.
  oldValue: string;
  newValue: string;
  modifiedBy: string; // User ID
  modifiedByName: string; // User name
  timestamp: string;
  reason: string;
}

export interface TeamLeaderMapping {
  teamLeaderId: string; // Employee ID
  employeeIds: string[]; // List of employee IDs mapped to this TL
}

export interface HistoricalPayroll {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // e.g. "20 April 2026 - 20 May 2026"
  workingDays: number;
  presentDays: number;
  weekOffs: number;
  paidLeaves: number;
  absents: number;
  fixedSalary: number;
  fixedAllowance: number;
  incentiveAmount: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  remarks: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveType: 'casual' | 'sick' | 'privilege' | 'unpaid' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  actedAt?: string;
  paymentType?: 'paid' | 'unpaid';
}

export interface ResignationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  submissionDate: string; // YYYY-MM-DD
  requestedExitDate: string; // YYYY-MM-DD
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // ID of TL or Admin
  approvedByName?: string;
  actedAt?: string; // date-time
  rejectionReason?: string;
}

export type ConcurrencyEntityType = 
  | 'Service' 
  | 'Lead' 
  | 'Employee' 
  | 'ProposalTemplate' 
  | 'OfferLetterTemplate' 
  | 'Attendance';

export interface FieldDifference {
  field: string;
  label: string;
  localValue: any;
  remoteValue: any;
  baseValue?: any;
}

export interface ConcurrencyConflict<T = any> {
  entityType: ConcurrencyEntityType;
  entityId: string;
  entityName: string;
  localDraft: T;
  remoteRecord: T;
  localVersion: number;
  remoteVersion: number;
  remoteUpdatedAt?: string;
  remoteUpdatedBy?: string;
  differences: FieldDifference[];
  onReloadLatest: () => void | Promise<void>;
  onForceOverwrite: () => void | Promise<void>;
  onMergeChanges: (mergedRecord: T) => void | Promise<void>;
  onCancel?: () => void;
}

export interface ConcurrencyAuditEntry {
  id: string;
  timestamp: string;
  action: 'WRITE_CONFLICT_DETECTED' | 'WRITE_CONFLICT_OVERWRITE_FORCED' | 'WRITE_CONFLICT_MERGED' | 'WRITE_CONFLICT_RELOADED';
  entityType: ConcurrencyEntityType;
  entityId: string;
  entityName?: string;
  localVersion: number;
  remoteVersion: number;
  userId: string;
  userName: string;
  userRole: string;
  details?: string;
  resolvedFields?: string[];
}



