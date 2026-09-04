/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorageString, setStorageString } from './db';
import { getWorkflowClients } from './workflowClients';
import { getWorkflowWorkOrders } from './workflowWorkOrders';
import { Employee } from '../types';

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'image';

export type DocumentApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

export type DocumentExpiryStatus = 'active' | 'expiring_soon' | 'expired' | 'no_expiry';

export type DocumentCategory =
  | 'kyc_identity'
  | 'incorporation_legal'
  | 'tax_statutory'
  | 'financial_banking'
  | 'compliance_filing'
  | 'intellectual_property'
  | 'other_supporting';

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string; description: string }[] = [
  { id: 'kyc_identity', label: 'KYC & Identity Documents', description: 'PAN, Aadhaar, Passport, Voter ID, Director DIN KYC' },
  { id: 'incorporation_legal', label: 'Incorporation & Legal Deeds', description: 'Certificate of Incorporation, MOA, AOA, Partnership Deed, Bylaws' },
  { id: 'tax_statutory', label: 'Tax & Statutory Licenses', description: 'GSTIN REG-06, MSME Udyam, 12A/80G, FSSAI, Trade License, IEC' },
  { id: 'financial_banking', label: 'Financial & Banking Records', description: 'Bank Statements, Cancelled Cheques, Balance Sheets, Audit Reports' },
  { id: 'compliance_filing', label: 'Statutory Filings & Receipts', description: 'MCA Challans, DIR-3 KYC receipts, GSTR-1/3B acknowledgments, Tax Audit' },
  { id: 'intellectual_property', label: 'IP & Trademark Artifacts', description: 'Trademark specimens, TM-A acknowledgments, TM-48 POA, Examination replies' },
  { id: 'other_supporting', label: 'Supporting NOC & Premises', description: 'Rent agreements, Electricity bills, Municipal NOC, Board resolutions' }
];

export interface DocumentVersion {
  versionId: string;
  versionNumber: string; // e.g. 'v1.0', 'v1.1', 'v2.0'
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // MIME type
  format: DocumentFormat;
  fileDataUrl?: string; // base64 or object url for download/preview
  uploadedAt: string; // ISO string
  uploadedById: string;
  uploadedByName: string;
  changeNotes?: string;
  checksum?: string;
}

export interface DocumentAuditEntry {
  id: string;
  timestamp: string; // ISO string
  action:
    | 'UPLOAD'
    | 'NEW_VERSION'
    | 'APPROVE'
    | 'REJECT'
    | 'DOWNLOAD'
    | 'EDIT_METADATA'
    | 'EXPIRY_CHANGED'
    | 'DELETE';
  actionTitle: string;
  performedById: string;
  performedByName: string;
  performedByRole?: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface WorkflowDocument {
  id: string; // e.g. DOC-2026-0001
  title: string;
  category: DocumentCategory;
  clientId: string; // Hierarchy 1: Client
  clientName: string;
  workOrderId: string; // Hierarchy 2: Work Order
  workOrderService: string;
  currentVersion: string; // e.g. 'v1.0', 'v2.0'
  format: DocumentFormat;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileDataUrl?: string;
  tags: string[];
  description?: string;
  issuedDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  approvalStatus: DocumentApprovalStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  rejectionReason?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  versions: DocumentVersion[];
  auditLog: DocumentAuditEntry[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdById: string;
  createdByName: string;
}

export const STORAGE_KEY_WORKFLOW_DOCUMENTS = 'efilingg_crm_workflow_documents';
export const EVENT_DOCUMENTS_UPDATED = 'efilingg_workflow_documents_updated';

// Format detector from filename or MIME type
export function detectDocumentFormat(fileName: string, mimeType: string = ''): DocumentFormat {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) {
    return 'pdf';
  }
  if (
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument.wordprocessingml')
  ) {
    return 'docx';
  }
  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('excel') ||
    lowerMime.includes('csv')
  ) {
    return 'xlsx';
  }
  if (
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.svg') ||
    lowerName.endsWith('.gif') ||
    lowerMime.startsWith('image/')
  ) {
    return 'image';
  }

  return 'pdf';
}

// Compute document expiry status
export function computeDocumentExpiryStatus(doc: WorkflowDocument): {
  status: DocumentExpiryStatus;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  daysRemaining?: number;
} {
  if (!doc.expiryDate) {
    return {
      status: 'no_expiry',
      label: 'Permanent / No Expiry',
      badgeColor: 'slate'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(doc.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      badgeColor: 'rose',
      daysRemaining: diffDays
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: diffDays === 0 ? 'Expires Today' : `Expiring Soon (${diffDays}d left)`,
      badgeColor: 'amber',
      daysRemaining: diffDays
    };
  }

  return {
    status: 'active',
    label: `Valid (${diffDays}d remaining)`,
    badgeColor: 'emerald',
    daysRemaining: diffDays
  };
}

// Generate fallback sample base64 data URL for mock initial documents
function createSampleDataUrl(format: DocumentFormat, title: string): string {
  if (format === 'image') {
    // A clean SVG data URI rendered as image/svg+xml
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#0f172a"/>
      <rect x="20" y="20" width="560" height="360" rx="16" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="300" cy="150" r="50" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="3"/>
      <text x="300" y="160" font-family="sans-serif" font-size="32" font-weight="bold" fill="#60a5fa" text-anchor="middle">eFilingg</text>
      <text x="300" y="230" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${title.replace(/&/g, '&amp;')}</text>
      <text x="300" y="265" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Verified Corporate Document Artifact</text>
      <text x="300" y="320" font-family="monospace" font-size="12" fill="#38bdf8" text-anchor="middle">SECURE WORKFLOW REPOSITORY HASH #2026-VAL</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  if (format === 'pdf') {
    // Clean text representation formatted as text/plain or octet-stream for demo download
    const textContent = `%PDF-1.4\n%eFilingg Corporate Document Vault\nDocument: ${title}\nGenerated for eFilingg CRM Workflows.`;
    return `data:application/pdf;base64,${btoa(unescape(encodeURIComponent(textContent)))}`;
  }

  if (format === 'xlsx') {
    const csvContent = `ID,Document Title,Category,Status,Generated\nDOC-2026,${title},Financial Record,Verified,2026-09-04`;
    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${btoa(unescape(encodeURIComponent(csvContent)))}`;
  }

  // docx
  const docContent = `eFilingg Legal Document Drafting\nTitle: ${title}\nConfidential MCA/Statutory draft.`;
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${btoa(unescape(encodeURIComponent(docContent)))}`;
}

// Initial seed documents establishing Client -> Work Order -> Documents hierarchy
function getInitialSeedDocuments(): WorkflowDocument[] {
  const clients = getWorkflowClients();
  const workOrders = getWorkflowWorkOrders();

  const c1 = clients.find(c => c.id === 'CL-2026-000001') || {
    id: 'CL-2026-000001',
    clientName: 'Apex Retails Corp'
  };
  const c2 = clients.find(c => c.id === 'CL-2026-000002') || {
    id: 'CL-2026-000002',
    clientName: 'Zenith Logistics LLP'
  };
  const c3 = clients.find(c => c.id === 'CL-2026-000003') || {
    id: 'CL-2026-000003',
    clientName: 'Vanguard HealthTech Pvt Ltd'
  };

  const wo1 = workOrders.find(w => w.id === 'PLC-2026-000001') || {
    id: 'PLC-2026-000001',
    service: 'Private Limited Company Incorporation'
  };
  const wo2 = workOrders.find(w => w.id === 'GST-2026-000001') || {
    id: 'GST-2026-000001',
    service: 'GST Registration & Compliance'
  };
  const wo3 = workOrders.find(w => w.id === 'TM-2026-000001') || {
    id: 'TM-2026-000001',
    service: 'Trademark Application & IP Filing'
  };

  return [
    {
      id: 'DOC-2026-0001',
      title: 'Certificate of Incorporation SPICe+ (INC-11)',
      category: 'incorporation_legal',
      clientId: c1.id,
      clientName: c1.clientName,
      workOrderId: wo1.id,
      workOrderService: wo1.service,
      currentVersion: 'v2.0',
      format: 'pdf',
      fileName: 'Apex_Retails_SPICe_Certificate_Incorporation.pdf',
      fileSize: 428000,
      fileType: 'application/pdf',
      fileDataUrl: createSampleDataUrl('pdf', 'Certificate of Incorporation SPICe+ (INC-11)'),
      tags: ['incorporation', 'mca', 'cin', 'pan_tan'],
      description: 'Official MCA Registrar of Companies Certificate of Incorporation with permanent CIN, PAN, and TAN embedded.',
      issuedDate: '2026-02-12',
      expiryDate: undefined, // Permanent
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2026-02-13T11:00:00.000Z',
      approvalRemarks: 'Verified against MCA Master Data V3 registry. Corporate CIN matches perfectly.',
      versions: [
        {
          versionId: 'v1-0001',
          versionNumber: 'v1.0',
          fileName: 'Apex_Retails_Draft_COI_Preliminary.pdf',
          fileSize: 382000,
          fileType: 'application/pdf',
          format: 'pdf',
          fileDataUrl: createSampleDataUrl('pdf', 'Preliminary Draft COI'),
          uploadedAt: '2026-02-10T14:30:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial ROC provisional draft receipt.'
        },
        {
          versionId: 'v2-0001',
          versionNumber: 'v2.0',
          fileName: 'Apex_Retails_SPICe_Certificate_Incorporation.pdf',
          fileSize: 428000,
          fileType: 'application/pdf',
          format: 'pdf',
          fileDataUrl: createSampleDataUrl('pdf', 'Certificate of Incorporation SPICe+ (INC-11)'),
          uploadedAt: '2026-02-12T16:45:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Official digitally signed INC-11 certificate issued by RoC Central Registration Centre.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-001-1',
          timestamp: '2026-02-10T14:30:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0 (Apex_Retails_Draft_COI_Preliminary.pdf).'
        },
        {
          id: 'aud-doc-001-2',
          timestamp: '2026-02-12T16:45:00.000Z',
          action: 'NEW_VERSION',
          actionTitle: 'New Version Added (v2.0)',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Replaced with official digitally stamped CRC Certificate of Incorporation.'
        },
        {
          id: 'aud-doc-001-3',
          timestamp: '2026-02-13T11:00:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Verified against MCA Master Data V3 registry. Corporate CIN matches perfectly.'
        }
      ],
      createdAt: '2026-02-10T14:30:00.000Z',
      updatedAt: '2026-02-13T11:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0002',
      title: 'Executed Memorandum & Articles of Association (MOA & AOA)',
      category: 'incorporation_legal',
      clientId: c1.id,
      clientName: c1.clientName,
      workOrderId: wo1.id,
      workOrderService: wo1.service,
      currentVersion: 'v1.0',
      format: 'docx',
      fileName: 'Apex_Retails_Executed_MOA_AOA_Final.docx',
      fileSize: 845000,
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileDataUrl: createSampleDataUrl('docx', 'Executed MOA & AOA Final'),
      tags: ['moa', 'aoa', 'charter', 'capital_clause'],
      description: 'Fully executed e-MOA (INC-33) and e-AOA (INC-34) with subscribers sheet and main object clauses.',
      issuedDate: '2026-02-08',
      expiryDate: undefined,
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2026-02-09T10:00:00.000Z',
      approvalRemarks: 'Subscribers digital signatures and stamp duty verified successfully.',
      versions: [
        {
          versionId: 'v1-0002',
          versionNumber: 'v1.0',
          fileName: 'Apex_Retails_Executed_MOA_AOA_Final.docx',
          fileSize: 845000,
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          format: 'docx',
          fileDataUrl: createSampleDataUrl('docx', 'Executed MOA & AOA Final'),
          uploadedAt: '2026-02-08T17:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Final signed charter documents.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-002-1',
          timestamp: '2026-02-08T17:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0 (Apex_Retails_Executed_MOA_AOA_Final.docx).'
        },
        {
          id: 'aud-doc-002-2',
          timestamp: '2026-02-09T10:00:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Subscribers digital signatures and stamp duty verified successfully.'
        }
      ],
      createdAt: '2026-02-08T17:00:00.000Z',
      updatedAt: '2026-02-09T10:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0003',
      title: 'Class 3 Digital Signature Certificate (Token Issuance)',
      category: 'compliance_filing',
      clientId: c1.id,
      clientName: c1.clientName,
      workOrderId: wo1.id,
      workOrderService: wo1.service,
      currentVersion: 'v1.0',
      format: 'pdf',
      fileName: 'Director_DSC_Class3_Cryptographic_Receipt.pdf',
      fileSize: 215000,
      fileType: 'application/pdf',
      fileDataUrl: createSampleDataUrl('pdf', 'Class 3 DSC Cryptographic Receipt'),
      tags: ['dsc', 'class_3', 'usb_token', 'video_kyc'],
      description: 'Paperless e-KYC video verification Class 3 signing and encryption token receipt.',
      issuedDate: '2024-09-18',
      expiryDate: '2026-09-18', // Expiring in ~14 days (triggers Expiring Soon alert!)
      approvalStatus: 'pending_approval',
      versions: [
        {
          versionId: 'v1-0003',
          versionNumber: 'v1.0',
          fileName: 'Director_DSC_Class3_Cryptographic_Receipt.pdf',
          fileSize: 215000,
          fileType: 'application/pdf',
          format: 'pdf',
          fileDataUrl: createSampleDataUrl('pdf', 'Class 3 DSC Cryptographic Receipt'),
          uploadedAt: '2026-09-01T09:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial token receipt.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-003-1',
          timestamp: '2026-09-01T09:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0 (Director_DSC_Class3_Cryptographic_Receipt.pdf).'
        }
      ],
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0004',
      title: 'GST Registration Certificate Form REG-06',
      category: 'tax_statutory',
      clientId: c2.id,
      clientName: c2.clientName,
      workOrderId: wo2.id,
      workOrderService: wo2.service,
      currentVersion: 'v1.0',
      format: 'pdf',
      fileName: 'Zenith_Logistics_GSTIN_REG06_Certificate.pdf',
      fileSize: 520000,
      fileType: 'application/pdf',
      fileDataUrl: createSampleDataUrl('pdf', 'GST Registration Certificate Form REG-06'),
      tags: ['gst', 'reg_06', 'gstin', 'tax_license'],
      description: 'Official GSTIN registration certificate issued by CBIC along with Annexure A & B showing principal and additional places of business.',
      issuedDate: '2026-01-20',
      expiryDate: undefined,
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2026-01-21T15:10:00.000Z',
      approvalRemarks: 'Verified on GST Portal. Status Active.',
      versions: [
        {
          versionId: 'v1-0004',
          versionNumber: 'v1.0',
          fileName: 'Zenith_Logistics_GSTIN_REG06_Certificate.pdf',
          fileSize: 520000,
          fileType: 'application/pdf',
          format: 'pdf',
          fileDataUrl: createSampleDataUrl('pdf', 'GST Registration Certificate Form REG-06'),
          uploadedAt: '2026-01-20T12:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial CBIC REG-06 issuance.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-004-1',
          timestamp: '2026-01-20T12:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0.'
        },
        {
          id: 'aud-doc-004-2',
          timestamp: '2026-01-21T15:10:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Verified on GST Portal. Status Active.'
        }
      ],
      createdAt: '2026-01-20T12:00:00.000Z',
      updatedAt: '2026-01-21T15:10:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0005',
      title: 'Cancelled Cheque & Bank Account Statement Verification',
      category: 'financial_banking',
      clientId: c2.id,
      clientName: c2.clientName,
      workOrderId: wo2.id,
      workOrderService: wo2.service,
      currentVersion: 'v1.0',
      format: 'image',
      fileName: 'Zenith_Logistics_Cancelled_Cheque_HDFC.png',
      fileSize: 680000,
      fileType: 'image/png',
      fileDataUrl: createSampleDataUrl('image', 'Cancelled Cheque & Bank Verification'),
      tags: ['bank', 'cheque', 'ifsc', 'account_verification'],
      description: 'HDFC Bank Current Account cancelled cheque leaf with printed firm name and MICR code.',
      issuedDate: '2026-01-15',
      expiryDate: undefined,
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2026-01-16T11:00:00.000Z',
      approvalRemarks: 'IFSC and Account Holder Name match client master record.',
      versions: [
        {
          versionId: 'v1-0005',
          versionNumber: 'v1.0',
          fileName: 'Zenith_Logistics_Cancelled_Cheque_HDFC.png',
          fileSize: 680000,
          fileType: 'image/png',
          format: 'image',
          fileDataUrl: createSampleDataUrl('image', 'Cancelled Cheque & Bank Verification'),
          uploadedAt: '2026-01-15T10:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial scan uploaded.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-005-1',
          timestamp: '2026-01-15T10:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0.'
        },
        {
          id: 'aud-doc-005-2',
          timestamp: '2026-01-16T11:00:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'IFSC and Account Holder Name match client master record.'
        }
      ],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-16T11:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0006',
      title: 'GSTR-3B Monthly Input Tax Credit Computation & Reconciliation',
      category: 'compliance_filing',
      clientId: c2.id,
      clientName: c2.clientName,
      workOrderId: wo2.id,
      workOrderService: wo2.service,
      currentVersion: 'v2.1',
      format: 'xlsx',
      fileName: 'Zenith_GSTR3B_ITC_Reconciliation_Aug2026.xlsx',
      fileSize: 340000,
      fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileDataUrl: createSampleDataUrl('xlsx', 'GSTR-3B Monthly ITC Computation Sheet'),
      tags: ['gst', 'gstr_3b', 'itc', 'tax_reconciliation'],
      description: 'Comprehensive 2B vs Purchase Register 100% matched input tax credit reconciliation sheet.',
      issuedDate: '2026-08-30',
      expiryDate: undefined,
      approvalStatus: 'pending_approval',
      versions: [
        {
          versionId: 'v1-0006',
          versionNumber: 'v1.0',
          fileName: 'Zenith_GSTR3B_Preliminary_Draft.xlsx',
          fileSize: 310000,
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          format: 'xlsx',
          fileDataUrl: createSampleDataUrl('xlsx', 'Draft GSTR-3B Sheet'),
          uploadedAt: '2026-08-25T11:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial raw purchase ledger data.'
        },
        {
          versionId: 'v2-0006',
          versionNumber: 'v2.0',
          fileName: 'Zenith_GSTR3B_Reconciled.xlsx',
          fileSize: 335000,
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          format: 'xlsx',
          fileDataUrl: createSampleDataUrl('xlsx', 'Reconciled Sheet'),
          uploadedAt: '2026-08-28T16:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Matched against August GSTR-2B JSON.'
        },
        {
          versionId: 'v21-0006',
          versionNumber: 'v2.1',
          fileName: 'Zenith_GSTR3B_ITC_Reconciliation_Aug2026.xlsx',
          fileSize: 340000,
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          format: 'xlsx',
          fileDataUrl: createSampleDataUrl('xlsx', 'GSTR-3B Monthly ITC Computation Sheet'),
          uploadedAt: '2026-08-30T14:20:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Corrected RCM liability in Table 3.1(d).'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-006-1',
          timestamp: '2026-08-25T11:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded (v1.0)',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded draft reconciliation.'
        },
        {
          id: 'aud-doc-006-2',
          timestamp: '2026-08-28T16:00:00.000Z',
          action: 'NEW_VERSION',
          actionTitle: 'New Version Added (v2.0)',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Updated with portal GSTR-2B comparison.'
        },
        {
          id: 'aud-doc-006-3',
          timestamp: '2026-08-30T14:20:00.000Z',
          action: 'NEW_VERSION',
          actionTitle: 'New Version Added (v2.1)',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Corrected RCM liability in Table 3.1(d).'
        }
      ],
      createdAt: '2026-08-25T11:00:00.000Z',
      updatedAt: '2026-08-30T14:20:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0007',
      title: 'Trademark Wordmark & Device Specimen Logo',
      category: 'intellectual_property',
      clientId: c3.id,
      clientName: c3.clientName,
      workOrderId: wo3.id,
      workOrderService: wo3.service,
      currentVersion: 'v1.0',
      format: 'image',
      fileName: 'Vanguard_HealthTech_Logo_Specimen.png',
      fileSize: 720000,
      fileType: 'image/png',
      fileDataUrl: createSampleDataUrl('image', 'Vanguard HealthTech Trademark Logo Specimen'),
      tags: ['trademark', 'device_mark', 'class_44', 'specimen'],
      description: 'High resolution digital specimen of Vanguard HealthTech brand logo in Class 44 medical software.',
      issuedDate: '2026-02-01',
      expiryDate: undefined,
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2026-02-02T16:00:00.000Z',
      approvalRemarks: 'Meets 8x8 cm IP India dimensions and transparency requirements.',
      versions: [
        {
          versionId: 'v1-0007',
          versionNumber: 'v1.0',
          fileName: 'Vanguard_HealthTech_Logo_Specimen.png',
          fileSize: 720000,
          fileType: 'image/png',
          format: 'image',
          fileDataUrl: createSampleDataUrl('image', 'Vanguard HealthTech Trademark Logo Specimen'),
          uploadedAt: '2026-02-01T15:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial high-res PNG specimen.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-007-1',
          timestamp: '2026-02-01T15:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0.'
        },
        {
          id: 'aud-doc-007-2',
          timestamp: '2026-02-02T16:00:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Meets 8x8 cm IP India dimensions and transparency requirements.'
        }
      ],
      createdAt: '2026-02-01T15:00:00.000Z',
      updatedAt: '2026-02-02T16:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0008',
      title: 'Power of Attorney (Form TM-48) on Stamp Paper',
      category: 'intellectual_property',
      clientId: c3.id,
      clientName: c3.clientName,
      workOrderId: wo3.id,
      workOrderService: wo3.service,
      currentVersion: 'v1.0',
      format: 'docx',
      fileName: 'Vanguard_Form_TM48_Power_Of_Attorney.docx',
      fileSize: 450000,
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileDataUrl: createSampleDataUrl('docx', 'Form TM-48 Power Of Attorney'),
      tags: ['tm_48', 'power_of_attorney', 'advocate_authorization'],
      description: 'Statutory TM-48 authorization executed in favor of eFilingg registered trademark attorney.',
      issuedDate: '2026-02-05',
      expiryDate: undefined,
      approvalStatus: 'rejected',
      rejectedById: 'EMP-ADMIN',
      rejectedByName: 'Master Admin',
      rejectedAt: '2026-02-06T14:30:00.000Z',
      rejectionReason: 'Notarization seal is missing on page 2. Please execute on ₹100 non-judicial e-stamp paper and re-upload.',
      versions: [
        {
          versionId: 'v1-0008',
          versionNumber: 'v1.0',
          fileName: 'Vanguard_Form_TM48_Power_Of_Attorney.docx',
          fileSize: 450000,
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          format: 'docx',
          fileDataUrl: createSampleDataUrl('docx', 'Form TM-48 Power Of Attorney'),
          uploadedAt: '2026-02-05T12:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial scan copy from client.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-008-1',
          timestamp: '2026-02-05T12:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0.'
        },
        {
          id: 'aud-doc-008-2',
          timestamp: '2026-02-06T14:30:00.000Z',
          action: 'REJECT',
          actionTitle: 'Document Rejected',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Notarization seal is missing on page 2. Please execute on ₹100 non-judicial e-stamp paper and re-upload.'
        }
      ],
      createdAt: '2026-02-05T12:00:00.000Z',
      updatedAt: '2026-02-06T14:30:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    },
    {
      id: 'DOC-2026-0009',
      title: 'Prior Lease Agreement & Commercial Site NOC',
      category: 'other_supporting',
      clientId: c1.id,
      clientName: c1.clientName,
      workOrderId: wo1.id,
      workOrderService: wo1.service,
      currentVersion: 'v1.0',
      format: 'pdf',
      fileName: 'Prior_Okhla_Premises_Lease_Agreement_2025.pdf',
      fileSize: 980000,
      fileType: 'application/pdf',
      fileDataUrl: createSampleDataUrl('pdf', 'Prior Lease Agreement Okhla Premises'),
      tags: ['rent_agreement', 'lease', 'noc', 'premises'],
      description: 'Previous commercial lease agreement for Okhla Industrial Area premises.',
      issuedDate: '2025-08-15',
      expiryDate: '2026-08-15', // Expired ~20 days ago (triggers Expired alert!)
      approvalStatus: 'approved',
      approvedById: 'EMP-ADMIN',
      approvedByName: 'Master Admin',
      approvedAt: '2025-08-20T10:00:00.000Z',
      approvalRemarks: 'Valid at time of incorporation filing.',
      versions: [
        {
          versionId: 'v1-0009',
          versionNumber: 'v1.0',
          fileName: 'Prior_Okhla_Premises_Lease_Agreement_2025.pdf',
          fileSize: 980000,
          fileType: 'application/pdf',
          format: 'pdf',
          fileDataUrl: createSampleDataUrl('pdf', 'Prior Lease Agreement Okhla Premises'),
          uploadedAt: '2025-08-18T10:00:00.000Z',
          uploadedById: 'EMP-ADMIN',
          uploadedByName: 'Master Admin',
          changeNotes: 'Initial executed 11-month lease.'
        }
      ],
      auditLog: [
        {
          id: 'aud-doc-009-1',
          timestamp: '2025-08-18T10:00:00.000Z',
          action: 'UPLOAD',
          actionTitle: 'Document Uploaded',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Uploaded version v1.0.'
        },
        {
          id: 'aud-doc-009-2',
          timestamp: '2025-08-20T10:00:00.000Z',
          action: 'APPROVE',
          actionTitle: 'Document Approved',
          performedById: 'EMP-ADMIN',
          performedByName: 'Master Admin',
          details: 'Valid at time of incorporation filing.'
        }
      ],
      createdAt: '2025-08-18T10:00:00.000Z',
      updatedAt: '2025-08-20T10:00:00.000Z',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin'
    }
  ];
}

// Get all documents
export function getWorkflowDocuments(): WorkflowDocument[] {
  try {
    const raw = getStorageString(STORAGE_KEY_WORKFLOW_DOCUMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse workflow documents from storage:', err);
  }
  const initial = getInitialSeedDocuments();
  saveWorkflowDocuments(initial);
  return initial;
}

// Save all documents
export function saveWorkflowDocuments(docs: WorkflowDocument[]): void {
  setStorageString(STORAGE_KEY_WORKFLOW_DOCUMENTS, JSON.stringify(docs));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_DOCUMENTS_UPDATED, { detail: { count: docs.length } }));
  }
}

// Filter documents by Client ID
export function getDocumentsByClient(clientId: string): WorkflowDocument[] {
  return getWorkflowDocuments().filter(d => d.clientId === clientId);
}

// Filter documents by Work Order ID
export function getDocumentsByWorkOrder(workOrderId: string): WorkflowDocument[] {
  return getWorkflowDocuments().filter(d => d.workOrderId === workOrderId);
}

// Generate new Document ID
export function generateNextDocumentId(docs: WorkflowDocument[]): string {
  const year = new Date().getFullYear();
  const prefix = `DOC-${year}-`;
  const existingIds = docs
    .map(d => d.id)
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const numStr = id.replace(prefix, '');
      const parsed = parseInt(numStr, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

  const maxSeq = existingIds.length > 0 ? Math.max(...existingIds) : docs.length;
  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// Create & upload new Document
export interface CreateDocumentInput {
  title: string;
  category: DocumentCategory;
  clientId: string;
  clientName: string;
  workOrderId: string;
  workOrderService: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileDataUrl?: string;
  tags?: string[];
  description?: string;
  issuedDate?: string;
  expiryDate?: string;
  initialRemarks?: string;
}

export function createWorkflowDocument(
  input: CreateDocumentInput,
  sessionUser: Employee
): WorkflowDocument {
  const docs = getWorkflowDocuments();
  const id = generateNextDocumentId(docs);
  const now = new Date().toISOString();
  const format = detectDocumentFormat(input.fileName, input.fileType);

  const initialVersion: DocumentVersion = {
    versionId: `v1-${id.toLowerCase()}`,
    versionNumber: 'v1.0',
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileType: input.fileType,
    format,
    fileDataUrl: input.fileDataUrl || createSampleDataUrl(format, input.title),
    uploadedAt: now,
    uploadedById: sessionUser.id,
    uploadedByName: sessionUser.name,
    changeNotes: input.initialRemarks || 'Initial document upload (v1.0).'
  };

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: 'UPLOAD',
    actionTitle: 'Document Uploaded',
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Uploaded ${input.fileName} (${format.toUpperCase()}, ${(input.fileSize / 1024).toFixed(1)} KB) under Client ${input.clientName} and Work Order ${input.workOrderId}.`,
    metadata: {
      version: 'v1.0',
      fileName: input.fileName,
      category: input.category,
      expiryDate: input.expiryDate
    }
  };

  const newDoc: WorkflowDocument = {
    id,
    title: input.title.trim(),
    category: input.category,
    clientId: input.clientId,
    clientName: input.clientName,
    workOrderId: input.workOrderId,
    workOrderService: input.workOrderService,
    currentVersion: 'v1.0',
    format,
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileType: input.fileType,
    fileDataUrl: initialVersion.fileDataUrl,
    tags: input.tags || [],
    description: input.description?.trim(),
    issuedDate: input.issuedDate,
    expiryDate: input.expiryDate,
    approvalStatus: 'pending_approval',
    versions: [initialVersion],
    auditLog: [auditEntry],
    createdAt: now,
    updatedAt: now,
    createdById: sessionUser.id,
    createdByName: sessionUser.name
  };

  const updated = [newDoc, ...docs];
  saveWorkflowDocuments(updated);
  return newDoc;
}

// Upload New Version for existing Document
export function uploadNewDocumentVersion(
  documentId: string,
  versionData: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileDataUrl?: string;
    changeNotes: string;
    isMajorVersion?: boolean;
  },
  sessionUser: Employee
): WorkflowDocument | null {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return null;

  const doc = docs[index];
  const now = new Date().toISOString();
  const format = detectDocumentFormat(versionData.fileName, versionData.fileType);

  // Compute next version number
  const currentNumMatch = doc.currentVersion.match(/^v?(\d+)\.(\d+)$/);
  let nextVersionNumber = 'v2.0';
  if (currentNumMatch) {
    const major = parseInt(currentNumMatch[1], 10);
    const minor = parseInt(currentNumMatch[2], 10);
    if (versionData.isMajorVersion) {
      nextVersionNumber = `v${major + 1}.0`;
    } else {
      nextVersionNumber = `v${major}.${minor + 1}`;
    }
  }

  const newVersion: DocumentVersion = {
    versionId: `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    versionNumber: nextVersionNumber,
    fileName: versionData.fileName,
    fileSize: versionData.fileSize,
    fileType: versionData.fileType,
    format,
    fileDataUrl: versionData.fileDataUrl || createSampleDataUrl(format, doc.title),
    uploadedAt: now,
    uploadedById: sessionUser.id,
    uploadedByName: sessionUser.name,
    changeNotes: versionData.changeNotes.trim() || `Uploaded ${nextVersionNumber} revision.`
  };

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: 'NEW_VERSION',
    actionTitle: `New Version Added (${nextVersionNumber})`,
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Uploaded revision ${nextVersionNumber} (${versionData.fileName}). Notes: ${versionData.changeNotes || 'None'}`,
    metadata: {
      oldVersion: doc.currentVersion,
      newVersion: nextVersionNumber,
      fileName: versionData.fileName
    }
  };

  const updatedDoc: WorkflowDocument = {
    ...doc,
    currentVersion: nextVersionNumber,
    format,
    fileName: versionData.fileName,
    fileSize: versionData.fileSize,
    fileType: versionData.fileType,
    fileDataUrl: newVersion.fileDataUrl,
    approvalStatus: 'pending_approval', // Reset to pending approval on new version
    approvalRemarks: undefined,
    approvedById: undefined,
    approvedByName: undefined,
    approvedAt: undefined,
    rejectionReason: undefined,
    versions: [...doc.versions, newVersion],
    auditLog: [...doc.auditLog, auditEntry],
    updatedAt: now
  };

  docs[index] = updatedDoc;
  saveWorkflowDocuments(docs);
  return updatedDoc;
}

// Approve Document
export function approveWorkflowDocument(
  documentId: string,
  remarks: string,
  sessionUser: Employee
): WorkflowDocument | null {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return null;

  const doc = docs[index];
  const now = new Date().toISOString();

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: 'APPROVE',
    actionTitle: 'Document Approved',
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Approved ${doc.title} (${doc.currentVersion}). Remarks: ${remarks || 'Approved without additional notes.'}`,
    metadata: {
      version: doc.currentVersion,
      approvalRemarks: remarks
    }
  };

  const updatedDoc: WorkflowDocument = {
    ...doc,
    approvalStatus: 'approved',
    approvedById: sessionUser.id,
    approvedByName: sessionUser.name,
    approvedAt: now,
    approvalRemarks: remarks.trim() || undefined,
    rejectionReason: undefined,
    rejectedById: undefined,
    rejectedByName: undefined,
    rejectedAt: undefined,
    auditLog: [...doc.auditLog, auditEntry],
    updatedAt: now
  };

  docs[index] = updatedDoc;
  saveWorkflowDocuments(docs);
  return updatedDoc;
}

// Reject Document
export function rejectWorkflowDocument(
  documentId: string,
  rejectionReason: string,
  sessionUser: Employee
): WorkflowDocument | null {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return null;

  const doc = docs[index];
  const now = new Date().toISOString();

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: 'REJECT',
    actionTitle: 'Document Rejected',
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Rejected ${doc.title} (${doc.currentVersion}). Reason: ${rejectionReason}`,
    metadata: {
      version: doc.currentVersion,
      rejectionReason
    }
  };

  const updatedDoc: WorkflowDocument = {
    ...doc,
    approvalStatus: 'rejected',
    rejectionReason: rejectionReason.trim(),
    rejectedById: sessionUser.id,
    rejectedByName: sessionUser.name,
    rejectedAt: now,
    approvalRemarks: undefined,
    approvedById: undefined,
    approvedByName: undefined,
    approvedAt: undefined,
    auditLog: [...doc.auditLog, auditEntry],
    updatedAt: now
  };

  docs[index] = updatedDoc;
  saveWorkflowDocuments(docs);
  return updatedDoc;
}

// Update Document Metadata & Expiry Date
export function updateDocumentMetadata(
  documentId: string,
  updates: {
    title?: string;
    category?: DocumentCategory;
    description?: string;
    tags?: string[];
    issuedDate?: string;
    expiryDate?: string;
  },
  sessionUser: Employee
): WorkflowDocument | null {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return null;

  const doc = docs[index];
  const now = new Date().toISOString();

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: updates.expiryDate !== doc.expiryDate ? 'EXPIRY_CHANGED' : 'EDIT_METADATA',
    actionTitle: updates.expiryDate !== doc.expiryDate ? 'Expiry Date Updated' : 'Metadata Updated',
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Updated document attributes: ${Object.keys(updates).join(', ')}`,
    metadata: updates
  };

  const updatedDoc: WorkflowDocument = {
    ...doc,
    title: updates.title !== undefined ? updates.title.trim() : doc.title,
    category: updates.category !== undefined ? updates.category : doc.category,
    description: updates.description !== undefined ? updates.description.trim() : doc.description,
    tags: updates.tags !== undefined ? updates.tags : doc.tags,
    issuedDate: updates.issuedDate !== undefined ? updates.issuedDate : doc.issuedDate,
    expiryDate: updates.expiryDate !== undefined ? updates.expiryDate : doc.expiryDate,
    auditLog: [...doc.auditLog, auditEntry],
    updatedAt: now
  };

  docs[index] = updatedDoc;
  saveWorkflowDocuments(docs);
  return updatedDoc;
}

// Record Document Download
export function recordDocumentDownload(
  documentId: string,
  versionNumber: string,
  sessionUser: Employee
): void {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return;

  const doc = docs[index];
  const now = new Date().toISOString();

  const auditEntry: DocumentAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now,
    action: 'DOWNLOAD',
    actionTitle: 'Document Downloaded',
    performedById: sessionUser.id,
    performedByName: sessionUser.name,
    performedByRole: sessionUser.role,
    details: `Downloaded version ${versionNumber} of ${doc.title} (${doc.fileName}).`,
    metadata: {
      version: versionNumber,
      fileName: doc.fileName
    }
  };

  doc.auditLog.push(auditEntry);
  saveWorkflowDocuments(docs);
}

// Delete / Archive Document
export function deleteWorkflowDocument(
  documentId: string,
  sessionUser: Employee
): boolean {
  const docs = getWorkflowDocuments();
  const index = docs.findIndex(d => d.id === documentId);
  if (index === -1) return false;

  const doc = docs[index];
  const remaining = docs.filter(d => d.id !== documentId);
  saveWorkflowDocuments(remaining);
  return true;
}

// Trigger browser download of document or specific version
export function triggerDocumentDownload(
  doc: WorkflowDocument,
  version?: DocumentVersion,
  sessionUser?: Employee
): void {
  const targetVersion = version || doc.versions[doc.versions.length - 1];
  const fileName = targetVersion?.fileName || doc.fileName;
  const fileDataUrl = targetVersion?.fileDataUrl || doc.fileDataUrl || createSampleDataUrl(doc.format, doc.title);

  if (sessionUser) {
    recordDocumentDownload(doc.id, targetVersion?.versionNumber || doc.currentVersion, sessionUser);
  }

  const link = document.createElement('a');
  link.href = fileDataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
