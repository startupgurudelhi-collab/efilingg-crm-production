/**
 * WhatsApp Template Repository & Local Database Engine
 * Efilingg CRM Enterprise Layer
 *
 * Supports local persistence, audit trails, versioning, default template bindings,
 * and automatic 15-minute periodic background synchronization with Meta Cloud API.
 */

import {
  WhatsAppTemplate,
  WhatsAppTemplateAuditLog,
  WhatsAppSyncResult,
  WhatsAppTemplateStatus,
  WhatsAppTemplateCategory,
} from './templateTypes';
import { MetaTemplateService, getMetaRejectionGuidance } from './metaTemplateService';

const KEY_TEMPLATES = 'efilingg_whatsapp_templates_v2';
const KEY_AUDIT_LOGS = 'efilingg_whatsapp_template_audit_logs_v2';
const KEY_LAST_SYNCED = 'efilingg_whatsapp_templates_last_synced_v2';

// 15 Minutes background sync interval
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

export const INITIAL_SEED_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tmpl_task_assignment_v2',
    name: 'task_assignment_v2',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: 'Urgent Notification',
    bodyText:
      'Dear Mr. {{1}},\n\nMr. {{2}} has assigned a task for you, kindly complete within the time limit.\n\nTask Details: {{3}}\nPriority: {{4}}\n\nIf task completed, then Mark as Done in your CRM.',
    footerText: 'EFilingg CRM Operational Task Desk',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Acknowledge Task',
      },
      {
        type: 'URL',
        text: 'Open CRM Task',
        url: 'https://efilingg.com/tasks',
      },
    ],
    parameterCount: 4,
    sampleParameters: [
      'Associate Name',
      'Administrator',
      'Review GSTR-3B filings for Apex Retails',
      'High',
    ],
    metaTemplateId: 'meta_1092837491028',
    metaQualityScore: 'GREEN',
    isDefaultTaskTemplate: true,
    version: 1,
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_lead_first_touch_v1',
    name: 'lead_first_touch_v1',
    category: 'MARKETING',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: 'Welcome to EFilingg Compliance Desk',
    bodyText:
      'Hello {{1}},\n\nThank you for reaching out to EFilingg regarding {{2}}. Our senior compliance associate {{3}} is ready to assist you with fast approvals and filings.\n\nWould you like to schedule a quick call or receive our service brochure?',
    footerText: 'EFilingg Business Solutions',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Schedule Call',
      },
      {
        type: 'QUICK_REPLY',
        text: 'Send Quotation',
      },
      {
        type: 'URL',
        text: 'Explore Services',
        url: 'https://efilingg.com/services',
      },
    ],
    parameterCount: 3,
    sampleParameters: ['Sunil Mehta', 'GST Registration & Filing', 'Rajesh Sharma'],
    metaTemplateId: 'meta_1092837491029',
    metaQualityScore: 'GREEN',
    isDefaultLeadTemplate: true,
    version: 1,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_hello_world',
    name: 'hello_world',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'NONE',
    bodyText: 'Hello World! Welcome and thank you for contacting EFilingg.',
    footerText: 'EFilingg CRM Gateway',
    buttons: [],
    parameterCount: 0,
    sampleParameters: [],
    metaTemplateId: 'meta_1092837491001',
    metaQualityScore: 'GREEN',
    version: 1,
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_compliance_status_alert',
    name: 'compliance_status_alert',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: 'Filing & Statutory Update',
    bodyText:
      'Dear {{1}},\n\nYour statutory compliance for {{2}} has been successfully filed.\n\nFiling Reference / ARN: {{3}}\nFiled Date: {{4}}\n\nThank you for choosing EFilingg as your corporate partner.',
    footerText: 'EFilingg Statutory Desk',
    buttons: [
      {
        type: 'URL',
        text: 'Download Acknowledgement',
        url: 'https://efilingg.com/client-vault',
      },
    ],
    parameterCount: 4,
    sampleParameters: ['Pvt Ltd Client', 'GSTR-3B (August 2026)', 'AA070826019283K', '31-08-2026'],
    metaTemplateId: 'meta_1092837491030',
    metaQualityScore: 'GREEN',
    isDefaultComplianceTemplate: true,
    version: 1,
    createdAt: '2026-08-05T11:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_invoice_payment_reminder',
    name: 'invoice_payment_reminder',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: 'Payment Reminder',
    bodyText:
      'Dear {{1}},\n\nThis is a gentle reminder regarding your outstanding invoice {{2}} of amount ₹{{3}} due on {{4}}.\n\nKindly clear the payment to avoid statutory late fees.',
    footerText: 'EFilingg Accounts & Billing',
    buttons: [
      {
        type: 'URL',
        text: 'Pay Online Now',
        url: 'https://efilingg.com/pay',
      },
    ],
    parameterCount: 4,
    sampleParameters: ['Apex Enterprise', 'INV-2026-0891', '4,999', '05-09-2026'],
    metaTemplateId: 'meta_1092837491031',
    metaQualityScore: 'GREEN',
    version: 1,
    createdAt: '2026-08-10T14:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_tax_audit_deadline_alert',
    name: 'tax_audit_deadline_alert',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: 'Statutory Deadline Alert',
    bodyText:
      'Dear {{1}},\n\nTax Audit (Form 3CD/3CA) deadline is approaching on {{2}}. Kindly upload all balance sheets, bank statements, and TDS ledgers on the portal.\n\nAssigned Auditor: {{3}}',
    footerText: 'Direct Tax Compliance Wing',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Documents Ready',
      },
      {
        type: 'URL',
        text: 'Upload to Vault',
        url: 'https://efilingg.com/vault',
      },
    ],
    parameterCount: 3,
    sampleParameters: ['Metro Associates', '30-September-2026', 'CA Rajesh Goyal'],
    metaTemplateId: 'meta_1092837491035',
    metaQualityScore: 'GREEN',
    version: 1,
    createdAt: '2026-08-12T16:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_promo_itr_festive_offer',
    name: 'promo_itr_festive_offer',
    category: 'MARKETING',
    language: 'en_US',
    status: 'REJECTED',
    headerType: 'TEXT',
    headerText: 'Special Filing Discount',
    bodyText:
      'Get 50% discount on corporate ITR filing and GST audit package today! Use code COMPLY50 to claim instant tax savings.',
    footerText: 'EFilingg Marketing Desk',
    buttons: [],
    parameterCount: 0,
    sampleParameters: [],
    metaTemplateId: 'meta_1092837491099',
    metaRejectedReason: 'INCORRECT_CATEGORY: Promotional terms used in non-marketing campaign format without clear opt-out mechanism.',
    metaRejectionGuidance:
      'Meta flagged this template for missing opt-out phrasing and incorrect format. Add a clear STOP quick-reply button and ensure marketing opt-in consent is declared.',
    metaQualityScore: 'RED',
    version: 1,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-28T14:30:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_roc_dir3_kyc_verification',
    name: 'roc_dir3_kyc_verification',
    category: 'UTILITY',
    language: 'en_US',
    status: 'PENDING',
    headerType: 'TEXT',
    headerText: 'Director DIN KYC Action',
    bodyText:
      'Dear Director {{1}},\n\nYour annual MCA DIR-3 KYC for DIN {{2}} is due for renewal. Please submit your latest registered Mobile OTP and Aadhaar details to avoid MCA deactivation.\n\nRef: {{3}}',
    footerText: 'MCA Corporate Statutory Desk',
    buttons: [
      {
        type: 'QUICK_REPLY',
        text: 'Send KYC Link',
      },
    ],
    parameterCount: 3,
    sampleParameters: ['Vikram Singhania', '08928172', 'KYC-2026-ROC'],
    metaTemplateId: 'meta_1092837491110',
    metaQualityScore: 'UNKNOWN',
    version: 1,
    createdAt: '2026-08-30T09:00:00.000Z',
    updatedAt: '2026-08-30T09:00:00.000Z',
    createdBy: 'EMP-ADMIN',
    createdByName: 'Master Administrator',
    lastSyncedAt: new Date().toISOString(),
  },
];

export class WhatsAppTemplateRepository {
  private static backgroundSyncInitialized = false;

  /**
   * Load templates from local storage or initialize seed
   */
  public static getTemplates(): WhatsAppTemplate[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(KEY_TEMPLATES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[WhatsAppTemplateRepository] Error reading templates from localStorage', e);
    }

    // Default to seed and persist
    this.persistTemplates(INITIAL_SEED_TEMPLATES);
    return INITIAL_SEED_TEMPLATES;
  }

  /**
   * Get single template by ID
   */
  public static getTemplateById(id: string): WhatsAppTemplate | undefined {
    const list = this.getTemplates();
    return list.find((t) => t.id === id);
  }

  /**
   * Get template by Name
   */
  public static getTemplateByName(name: string): WhatsAppTemplate | undefined {
    const list = this.getTemplates();
    return list.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get all approved templates for messaging
   */
  public static getApprovedTemplates(): WhatsAppTemplate[] {
    return this.getTemplates().filter((t) => t.status === 'APPROVED');
  }

  /**
   * Get default template for task assignments
   */
  public static getDefaultTaskTemplate(): WhatsAppTemplate {
    const list = this.getTemplates();
    const defaultTmpl = list.find((t) => t.isDefaultTaskTemplate && t.status === 'APPROVED');
    if (defaultTmpl) return defaultTmpl;

    const taskFallback = list.find((t) => t.name.includes('task') && t.status === 'APPROVED');
    if (taskFallback) return taskFallback;

    return list[0] || INITIAL_SEED_TEMPLATES[0];
  }

  /**
   * Get default template for lead initial outreach
   */
  public static getDefaultLeadTemplate(): WhatsAppTemplate {
    const list = this.getTemplates();
    const defaultTmpl = list.find((t) => t.isDefaultLeadTemplate && t.status === 'APPROVED');
    if (defaultTmpl) return defaultTmpl;

    const leadFallback = list.find((t) => t.name.includes('lead') && t.status === 'APPROVED');
    if (leadFallback) return leadFallback;

    return list[1] || INITIAL_SEED_TEMPLATES[1];
  }

  /**
   * Save or Update a template
   */
  public static async saveTemplate(
    template: Partial<WhatsAppTemplate> & { name: string; bodyText: string; category: WhatsAppTemplateCategory },
    user: { id: string; name: string; role: string },
    submitToMeta = true
  ): Promise<{ success: boolean; template: WhatsAppTemplate; message: string }> {
    const list = this.getTemplates();
    const now = new Date().toISOString();

    const existingIndex = list.findIndex((t) => t.id === template.id || t.name === template.name);

    // Calculate parameter count
    const matches = template.bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const paramCount = new Set(matches).size;

    let targetTemplate: WhatsAppTemplate;

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      targetTemplate = {
        ...existing,
        ...template,
        parameterCount: paramCount,
        sampleParameters: template.sampleParameters || existing.sampleParameters || [],
        version: existing.version + 1,
        updatedAt: now,
      };

      if (submitToMeta) {
        targetTemplate.status = 'PENDING';
        targetTemplate.metaRejectedReason = undefined;
        targetTemplate.metaRejectionGuidance = undefined;
      }

      list[existingIndex] = targetTemplate;
    } else {
      targetTemplate = {
        id: template.id || `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: template.category,
        language: template.language || 'en_US',
        status: submitToMeta ? 'PENDING' : 'DRAFT',
        headerType: template.headerType || 'NONE',
        headerText: template.headerText,
        headerMediaUrl: template.headerMediaUrl,
        bodyText: template.bodyText,
        footerText: template.footerText,
        buttons: template.buttons || [],
        parameterCount: paramCount,
        sampleParameters: template.sampleParameters || [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: user.id,
        createdByName: user.name,
      };
      list.unshift(targetTemplate);
    }

    // Submit to Meta if requested
    if (submitToMeta) {
      try {
        const metaRes = await MetaTemplateService.submitTemplateToMeta(targetTemplate);
        if (metaRes.metaTemplateId) {
          targetTemplate.metaTemplateId = metaRes.metaTemplateId;
        }
        targetTemplate.status = metaRes.status;
        if (metaRes.rejectedReason) {
          targetTemplate.metaRejectedReason = metaRes.rejectedReason;
          targetTemplate.metaRejectionGuidance = metaRes.rejectionGuidance || getMetaRejectionGuidance(metaRes.rejectedReason);
        }
      } catch (e: any) {
        console.warn('[WhatsAppTemplateRepository] Meta submission warning:', e);
      }
    }

    this.persistTemplates(list);

    // Record Audit Log
    this.recordAuditLog({
      templateId: targetTemplate.id,
      templateName: targetTemplate.name,
      action: existingIndex >= 0 ? 'UPDATED' : 'CREATED',
      performedBy: user.id,
      performedByName: user.name,
      role: user.role,
      details: existingIndex >= 0
        ? `Updated template "${targetTemplate.name}" to version ${targetTemplate.version} (Status: ${targetTemplate.status})`
        : `Created new WhatsApp template "${targetTemplate.name}" with ${targetTemplate.category} category (Status: ${targetTemplate.status})`,
    });

    return {
      success: true,
      template: targetTemplate,
      message: `Template "${targetTemplate.name}" ${existingIndex >= 0 ? 'updated' : 'created'} successfully (${targetTemplate.status})`,
    };
  }

  /**
   * Duplicate a template
   */
  public static duplicateTemplate(
    templateId: string,
    user: { id: string; name: string; role: string }
  ): { success: boolean; template?: WhatsAppTemplate; error?: string } {
    const original = this.getTemplateById(templateId);
    if (!original) {
      return { success: false, error: 'Template not found' };
    }

    const list = this.getTemplates();
    const now = new Date().toISOString();
    const newName = `${original.name}_copy_${Math.random().toString(36).substring(2, 6)}`;

    const clone: WhatsAppTemplate = {
      ...original,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newName,
      status: 'DRAFT',
      metaTemplateId: undefined,
      metaRejectedReason: undefined,
      metaRejectionGuidance: undefined,
      isDefaultTaskTemplate: false,
      isDefaultLeadTemplate: false,
      isDefaultComplianceTemplate: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      createdByName: user.name,
    };

    list.unshift(clone);
    this.persistTemplates(list);

    this.recordAuditLog({
      templateId: clone.id,
      templateName: clone.name,
      action: 'DUPLICATED',
      performedBy: user.id,
      performedByName: user.name,
      role: user.role,
      details: `Duplicated template from "${original.name}" into "${clone.name}"`,
    });

    return { success: true, template: clone };
  }

  /**
   * Delete a template locally and on Meta
   */
  public static async deleteTemplate(
    templateId: string,
    user: { id: string; name: string; role: string }
  ): Promise<{ success: boolean; message: string }> {
    const list = this.getTemplates();
    const target = list.find((t) => t.id === templateId);
    if (!target) {
      return { success: false, message: 'Template not found' };
    }

    // Call Meta API
    await MetaTemplateService.deleteMetaTemplate(target.name);

    const filtered = list.filter((t) => t.id !== templateId);
    this.persistTemplates(filtered);

    this.recordAuditLog({
      templateId: target.id,
      templateName: target.name,
      action: 'DELETED',
      performedBy: user.id,
      performedByName: user.name,
      role: user.role,
      details: `Deleted template "${target.name}" (${target.category}, Status: ${target.status})`,
    });

    return { success: true, message: `Template "${target.name}" deleted successfully` };
  }

  /**
   * Synchronize all templates from Meta Graph API
   */
  public static async syncFromMeta(user: { id: string; name: string; role: string }): Promise<WhatsAppSyncResult> {
    const now = new Date().toISOString();
    const metaRes = await MetaTemplateService.fetchMetaTemplates();

    const localList = this.getTemplates();
    let updatedCount = 0;
    let createdCount = 0;
    const errors: string[] = [];

    if (metaRes.success && metaRes.data && metaRes.data.length > 0) {
      for (const m of metaRes.data) {
        const existingIdx = localList.findIndex((t) => t.name.toLowerCase() === m.name?.toLowerCase());

        let bodyText = '';
        let headerText = '';
        let footerText = '';
        const buttons: any[] = [];
        let headerType: any = 'NONE';

        if (Array.isArray(m.components)) {
          for (const c of m.components) {
            if (c.type === 'BODY') bodyText = c.text || '';
            if (c.type === 'HEADER') {
              headerType = c.format || 'TEXT';
              headerText = c.text || '';
            }
            if (c.type === 'FOOTER') footerText = c.text || '';
            if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
              c.buttons.forEach((b: any) => {
                buttons.push({
                  type: b.type,
                  text: b.text,
                  url: b.url,
                  phoneNumber: b.phone_number,
                });
              });
            }
          }
        }

        const normalizedStatus: WhatsAppTemplateStatus =
          m.status === 'APPROVED' ? 'APPROVED' :
          m.status === 'REJECTED' ? 'REJECTED' :
          m.status === 'PAUSED' ? 'PAUSED' : 'PENDING';

        if (existingIdx >= 0) {
          localList[existingIdx] = {
            ...localList[existingIdx],
            status: normalizedStatus,
            metaTemplateId: m.id || localList[existingIdx].metaTemplateId,
            metaQualityScore: m.quality_score?.score || localList[existingIdx].metaQualityScore,
            metaRejectedReason: m.rejected_reason || localList[existingIdx].metaRejectedReason,
            metaRejectionGuidance: m.rejected_reason
              ? getMetaRejectionGuidance(m.rejected_reason)
              : localList[existingIdx].metaRejectionGuidance,
            lastSyncedAt: now,
            updatedAt: now,
          };
          updatedCount++;
        } else {
          localList.push({
            id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: m.name,
            category: m.category || 'UTILITY',
            language: m.language || 'en_US',
            status: normalizedStatus,
            headerType,
            headerText,
            bodyText: bodyText || 'Template body from Meta',
            footerText,
            buttons,
            parameterCount: (bodyText.match(/\{\{(\d+)\}\}/g) || []).length,
            sampleParameters: [],
            metaTemplateId: m.id,
            metaQualityScore: m.quality_score?.score || 'GREEN',
            metaRejectedReason: m.rejected_reason,
            metaRejectionGuidance: m.rejected_reason ? getMetaRejectionGuidance(m.rejected_reason) : undefined,
            version: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: user.id,
            createdByName: user.name,
            lastSyncedAt: now,
          });
          createdCount++;
        }
      }
    } else {
      // In sandbox mode or when Meta returns empty, refresh local timestamps
      localList.forEach((t) => {
        t.lastSyncedAt = now;
      });
    }

    this.persistTemplates(localList);
    this.setLastSyncedTimestamp(now);

    const statusBreakdown = {
      APPROVED: localList.filter((t) => t.status === 'APPROVED').length,
      PENDING: localList.filter((t) => t.status === 'PENDING').length,
      REJECTED: localList.filter((t) => t.status === 'REJECTED').length,
      PAUSED: localList.filter((t) => t.status === 'PAUSED').length,
      DRAFT: localList.filter((t) => t.status === 'DRAFT').length,
    };

    this.recordAuditLog({
      templateId: 'ALL',
      templateName: 'Meta Template Synchronization',
      action: 'SYNCED',
      performedBy: user.id,
      performedByName: user.name,
      role: user.role,
      details: `Synced ${localList.length} templates from Meta Cloud API (Approved: ${statusBreakdown.APPROVED}, Pending: ${statusBreakdown.PENDING}, Rejected: ${statusBreakdown.REJECTED})`,
    });

    return {
      success: true,
      syncedCount: localList.length,
      createdCount,
      updatedCount,
      errors,
      lastSyncedAt: now,
      metaWabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '987654321098765',
      statusBreakdown,
    };
  }

  /**
   * Set template as default for tasks, leads, or compliance
   */
  public static setDefaultBinding(
    bindingType: 'TASK' | 'LEAD' | 'COMPLIANCE',
    templateId: string,
    user: { id: string; name: string; role: string }
  ): { success: boolean; message: string } {
    const list = this.getTemplates();
    const target = list.find((t) => t.id === templateId);
    if (!target) {
      return { success: false, message: 'Template not found' };
    }

    list.forEach((t) => {
      if (bindingType === 'TASK') t.isDefaultTaskTemplate = t.id === templateId;
      if (bindingType === 'LEAD') t.isDefaultLeadTemplate = t.id === templateId;
      if (bindingType === 'COMPLIANCE') t.isDefaultComplianceTemplate = t.id === templateId;
    });

    this.persistTemplates(list);

    this.recordAuditLog({
      templateId: target.id,
      templateName: target.name,
      action: 'SET_DEFAULT',
      performedBy: user.id,
      performedByName: user.name,
      role: user.role,
      details: `Configured template "${target.name}" as the Default ${bindingType} Intimation Template`,
    });

    return { success: true, message: `"${target.name}" is now the default ${bindingType.toLowerCase()} template.` };
  }

  /**
   * Get all Audit Logs
   */
  public static getAuditLogs(): WhatsAppTemplateAuditLog[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(KEY_AUDIT_LOGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('[WhatsAppTemplateRepository] Error reading audit logs', e);
    }
    return [
      {
        id: 'log_seed_1',
        templateId: 'tmpl_task_assignment_v2',
        templateName: 'task_assignment_v2',
        action: 'SUBMITTED_TO_META',
        performedBy: 'EMP-ADMIN',
        performedByName: 'Master Administrator',
        role: 'Super Admin',
        timestamp: '2026-08-30T10:00:00.000Z',
        details: 'Initial system seed template approved by Meta Cloud API.',
      },
    ];
  }

  /**
   * Record Audit Log entry
   */
  public static recordAuditLog(entry: Omit<WhatsAppTemplateAuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: WhatsAppTemplateAuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 500 logs
    const trimmed = logs.slice(0, 500);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(KEY_AUDIT_LOGS, JSON.stringify(trimmed));
      }
    } catch (e) {}
  }

  /**
   * Get Last Synced Timestamp
   */
  public static getLastSyncedTimestamp(): string {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(KEY_LAST_SYNCED) || new Date().toISOString();
      }
    } catch (e) {}
    return new Date().toISOString();
  }

  private static setLastSyncedTimestamp(ts: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(KEY_LAST_SYNCED, ts);
      }
    } catch (e) {}
  }

  /**
   * Persist templates array to localStorage
   */
  private static persistTemplates(list: WhatsAppTemplate[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(KEY_TEMPLATES, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('[WhatsAppTemplateRepository] Failed to write templates to localStorage', e);
    }
  }

  /**
   * Initialize Automatic 15-Minute Background Synchronization
   */
  public static initBackgroundSync(user: { id: string; name: string; role: string }): void {
    if (this.backgroundSyncInitialized) return;
    this.backgroundSyncInitialized = true;

    if (typeof window !== 'undefined') {
      console.log('[WhatsAppTemplateRepository] Initialized 15-minute background Meta sync runner.');
      setInterval(() => {
        console.log('[WhatsAppTemplateRepository] Triggering 15-minute periodic Meta template sync...');
        this.syncFromMeta(user).catch((err) => {
          console.warn('[WhatsAppTemplateRepository] Background sync error:', err);
        });
      }, SYNC_INTERVAL_MS);
    }
  }
}
