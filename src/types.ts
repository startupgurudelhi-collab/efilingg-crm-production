/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmployeeRole = 'admin' | 'employee' | 'team_leader';
export type EmployeeStatus = 'active' | 'disabled';

export interface Employee {
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
  department?: 'Sales & Marketing' | 'Operation Management';
  exitDate?: string;
  exitReason?: string;
  exitStatus?: 'resigned' | 'terminated' | 'none';
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

export interface Lead {
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
}

export interface FollowUp {
  id: string;
  leadId: string;
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
  type: 'followup_due' | 'lead_assigned' | 'lead_transfer' | 'proposal_generated' | 'lead_converted';
  link?: string; // target ID or route
  userId: string; // Employee ID or 'admin' or 'all'
  read: boolean;
  createdAt: string;
}

export interface CustomService {
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

export interface ProposalTemplate {
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

export interface OfferLetterTemplate {
  companyName: string;
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

export interface Attendance {
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


