/**
 * WhatsApp Template Types and Definitions
 * Efilingg CRM Enterprise Layer (Meta Cloud API)
 */

export type WhatsAppTemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DRAFT';

export type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

export type WhatsAppHeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';

export type WhatsAppButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface WhatsAppTemplateButton {
  type: WhatsAppButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
  example?: {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  status: WhatsAppTemplateStatus;
  headerType: WhatsAppHeaderType;
  headerText?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  buttons: WhatsAppTemplateButton[];
  parameterCount: number;
  sampleParameters: string[];
  metaTemplateId?: string;
  metaRejectedReason?: string;
  metaRejectionGuidance?: string;
  metaQualityScore?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  isDefaultTaskTemplate?: boolean;
  isDefaultLeadTemplate?: boolean;
  isDefaultComplianceTemplate?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  lastSyncedAt?: string;
}

export interface WhatsAppTemplateAuditLog {
  id: string;
  templateId: string;
  templateName: string;
  action:
    | 'CREATED'
    | 'SUBMITTED_TO_META'
    | 'UPDATED'
    | 'DELETED'
    | 'SYNCED'
    | 'TEST_SENT'
    | 'STATUS_CHANGED'
    | 'DUPLICATED'
    | 'SET_DEFAULT';
  performedBy: string;
  performedByName: string;
  role: string;
  timestamp: string;
  details: string;
  meta?: Record<string, any>;
}

export interface WhatsAppSyncResult {
  success: boolean;
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: string[];
  lastSyncedAt: string;
  metaWabaId: string;
  statusBreakdown: {
    APPROVED: number;
    PENDING: number;
    REJECTED: number;
    PAUSED: number;
    DRAFT: number;
  };
}
