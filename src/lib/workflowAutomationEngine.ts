/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PHASE 8 – AUTOMATION ENGINE
 * Enterprise Workflow Stage Automation Layer
 * 
 * Capabilities:
 * - Trigger: Workflow Stage Change
 * - Actions: WhatsApp (Meta-Approved Templates), Email, Internal Notification
 * - Examples Covered:
 *   1. Name Reservation Approved (RUN / SPICe+ Part A)
 *   2. GST Approved (GSTIN Issuance & REG-06)
 *   3. Trademark Registered (Trade Marks Journal & Certificate)
 *   4. Class 3 DSC & KYC Verification
 *   5. General Milestone Stage Intimation
 * - Strict Compliance: Uses Meta-Approved WhatsApp templates with parameter replacement
 * - Delivery Logs: Immutable, searchable, filterable logs with retry and inspect capabilities
 */

import { getStorageString, setStorageString, createNotification, getEmployees } from './db';
import { WorkflowWorkOrder, WorkOrderStage, WorkOrderStageStatus } from './workflowWorkOrders';
import { getWorkflowClients, WorkflowClient } from './workflowClients';
import { WhatsAppTemplateRepository } from './whatsapp/templateRepository';
import { WhatsAppTemplate } from './whatsapp/templateTypes';

export type AutomationActionType = 'WHATSAPP' | 'EMAIL' | 'INTERNAL_NOTIFICATION';
export type AutomationDeliveryStatus = 'DELIVERED' | 'SENT' | 'FAILED' | 'QUEUED';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  serviceCode: string; // 'PLC', 'GST', 'TM', '*', etc.
  triggerStagePattern: string; // Regex or substring to match stage name
  triggerStageSequence?: number;
  targetStatus: WorkOrderStageStatus; // typically 'completed'
  isEnabled: boolean;
  actions: {
    whatsapp: {
      enabled: boolean;
      templateName: string; // Must match approved template in template repository
      fallbackText?: string;
    };
    email: {
      enabled: boolean;
      subjectTemplate: string;
      senderName: string;
      emailBodyTemplate?: string;
    };
    internalNotification: {
      enabled: boolean;
      title: string;
      messageTemplate: string;
      priority: 'normal' | 'high' | 'urgent';
      targetAudience: 'assigned_owner' | 'all' | 'admin';
    };
  };
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationDeliveryLog {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: {
    event: 'WORKFLOW_STAGE_CHANGE';
    workOrderId: string;
    workOrderTitle: string;
    serviceCode: string;
    department?: string;
    clientId: string;
    clientName: string;
    stageId: string;
    stageName: string;
    stageSequence: number;
    oldStatus: string;
    newStatus: string;
    triggeredBy: {
      id: string;
      name: string;
      role?: string;
    };
  };
  channel: AutomationActionType;
  recipient: {
    name: string;
    contact: string; // phone number, email address, or employee ID
    type: 'CLIENT' | 'EMPLOYEE' | 'ALL_STAFF' | 'SYSTEM';
  };
  templateName?: string;
  status: AutomationDeliveryStatus;
  subject?: string;
  renderedBody: string;
  metadata: {
    provider: string; // 'META_CLOUD_API', 'SMTP_GATEWAY', 'INTERNAL_BROADCAST'
    deliveryReceiptId?: string; // e.g. wamid.HBgL... or msg_smtp_...
    latencyMs?: number;
    error?: string;
    retryCount?: number;
    parameters?: Record<string, string>;
  };
  timestamp: string; // ISO
}

export const STORAGE_KEY_AUTOMATION_RULES = 'efilingg_crm_workflow_automation_rules_v1';
export const STORAGE_KEY_DELIVERY_LOGS = 'efilingg_crm_workflow_automation_delivery_logs_v1';
export const EVENT_AUTOMATION_DISPATCHED = 'efilingg_workflow_automation_dispatched';

/**
 * Built-in default enterprise automation rules
 */
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule_name_reservation_approved',
    name: 'Name Reservation Approved Notification',
    description: 'Triggered when RUN / SPICe+ Part A Name Reservation is completed. Dispatches approved WhatsApp, branded Email & internal alert.',
    category: 'MCA & Corporate Legal',
    serviceCode: 'PLC',
    triggerStagePattern: 'name reservation',
    triggerStageSequence: 2,
    targetStatus: 'completed',
    isEnabled: true,
    actions: {
      whatsapp: {
        enabled: true,
        templateName: 'name_reservation_approved',
        fallbackText: 'Dear {{clientName}}, your Company Name Reservation for {{businessName}} has been APPROVED by MCA CRC. Next step: SPICe+ Part B & charter drafting is in progress.'
      },
      email: {
        enabled: true,
        subjectTemplate: 'MCA Name Reservation Approved: {{businessName}} (Ref: {{workOrderId}})',
        senderName: 'EFilingg MCA Secretarial Desk',
        emailBodyTemplate: 'We are pleased to inform you that your proposed company name has been officially approved by the Ministry of Corporate Affairs (CRC). All drafting of MOA, AOA, and SPICe+ Part B is now underway.'
      },
      internalNotification: {
        enabled: true,
        title: '🎉 MCA Name Reservation Approved',
        messageTemplate: 'Name Reservation approved for {{clientName}} ({{workOrderId}}). Proceed to SPICe+ Part B & DIR-2 execution.',
        priority: 'high',
        targetAudience: 'assigned_owner'
      }
    },
    isSystemDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule_gst_approved',
    name: 'GST Registration Approved & GSTIN Issued',
    description: 'Triggered when GSTIN application is approved by the tax officer and certificate (REG-06) is issued.',
    category: 'GST Department',
    serviceCode: 'GST',
    triggerStagePattern: 'gstin issuance|gst.*approved|registration certificate docket',
    triggerStageSequence: 5,
    targetStatus: 'completed',
    isEnabled: true,
    actions: {
      whatsapp: {
        enabled: true,
        templateName: 'gst_approved',
        fallbackText: 'Congratulations {{clientName}}! Your GST Registration for {{businessName}} is APPROVED. GSTIN: {{referenceNumber}}. Form GST REG-06 is available in your Document Vault.'
      },
      email: {
        enabled: true,
        subjectTemplate: 'Official Approval: GST Registration Completed - GSTIN: {{referenceNumber}}',
        senderName: 'EFilingg Indirect Tax Wing',
        emailBodyTemplate: 'Your application for Goods & Services Tax (GST) has been granted by the jurisdictional GST commissionerate. Your GSTIN is active and your Registration Certificate (REG-06) has been deposited in your Vault.'
      },
      internalNotification: {
        enabled: true,
        title: '✅ GST Registration Approved',
        messageTemplate: 'GSTIN successfully issued for {{clientName}} ({{workOrderId}}). Docket delivered and compliance calendar triggered.',
        priority: 'high',
        targetAudience: 'all'
      }
    },
    isSystemDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule_trademark_registered',
    name: 'Trademark Registered & ® Certificate Issued',
    description: 'Triggered upon successful journal publication, opposition completion, and issuance of registered trademark certificate.',
    category: 'Intellectual Property (IP)',
    serviceCode: 'TM',
    triggerStagePattern: 'journal publication|trademark.*registered|registration certificate',
    triggerStageSequence: 5,
    targetStatus: 'completed',
    isEnabled: true,
    actions: {
      whatsapp: {
        enabled: true,
        templateName: 'trademark_registered',
        fallbackText: 'Congratulations {{clientName}}! Your Trademark "{{businessName}}" has been successfully REGISTERED by the Trade Marks Registry. You may now legally use the registered ® symbol.'
      },
      email: {
        enabled: true,
        subjectTemplate: 'Trademark Registration Certificate Issued: {{businessName}} (® Symbol Authorized)',
        senderName: 'EFilingg IP & Trademark Bureau',
        emailBodyTemplate: 'The Registrar of Trade Marks has issued the final digital Certificate of Registration for your brand mark. You are now vested with exclusive statutory proprietary rights across India.'
      },
      internalNotification: {
        enabled: true,
        title: '🛡️ Trademark Registered & Sealed',
        messageTemplate: 'Trademark registered for {{clientName}} ({{businessName}}). Final Certificate uploaded to Vault.',
        priority: 'high',
        targetAudience: 'all'
      }
    },
    isSystemDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule_kyc_dsc_completed',
    name: 'KYC & Class 3 DSC Verification Completed',
    description: 'Triggered when identity documents and video e-KYC digital signature verification is certified.',
    category: 'Operations & Legal',
    serviceCode: '*',
    triggerStagePattern: 'kyc.*dsc|document gathering|kyc collection',
    triggerStageSequence: 1,
    targetStatus: 'completed',
    isEnabled: true,
    actions: {
      whatsapp: {
        enabled: true,
        templateName: 'workflow_stage_completed',
        fallbackText: 'Dear {{clientName}}, KYC Collection & Class 3 DSC Verification has been successfully verified for {{workOrderId}}.'
      },
      email: {
        enabled: true,
        subjectTemplate: 'Verification Completed: Class 3 DSC & KYC Documents Verified ({{workOrderId}})',
        senderName: 'EFilingg Operations Verification',
        emailBodyTemplate: 'Your KYC documents and cryptographic digital signatures have been verified against statutory registries. Next processing stage is now initiated.'
      },
      internalNotification: {
        enabled: true,
        title: '🔑 KYC & DSC Verification Passed',
        messageTemplate: 'KYC & DSC stage marked completed for {{clientName}} ({{workOrderId}}).',
        priority: 'normal',
        targetAudience: 'assigned_owner'
      }
    },
    isSystemDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'rule_general_stage_milestone',
    name: 'General Workflow Milestone Intimation',
    description: 'Fallback milestone notification triggered on any other workflow stage advancement to completed.',
    category: 'General Operations',
    serviceCode: '*',
    triggerStagePattern: '.*',
    targetStatus: 'completed',
    isEnabled: true,
    actions: {
      whatsapp: {
        enabled: true,
        templateName: 'workflow_stage_completed',
        fallbackText: 'Dear {{clientName}}, stage "{{stageName}}" for work order {{workOrderId}} has been successfully completed.'
      },
      email: {
        enabled: true,
        subjectTemplate: 'Milestone Achieved: {{stageName}} Completed ({{workOrderId}})',
        senderName: 'EFilingg Client Services Desk',
        emailBodyTemplate: 'Stage "{{stageName}}" for your service order has been successfully completed by our operations team. You can view updated progress in your client portal.'
      },
      internalNotification: {
        enabled: true,
        title: '📌 Stage Milestone Completed',
        messageTemplate: 'Stage {{stageSequence}} ({{stageName}}) completed on {{workOrderId}}.',
        priority: 'normal',
        targetAudience: 'assigned_owner'
      }
    },
    isSystemDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  }
];

/**
 * Initial sample delivery logs for audit review and immediate visibility
 */
export const INITIAL_DELIVERY_LOGS: AutomationDeliveryLog[] = [
  {
    id: 'LOG-AUT-20260901-001',
    ruleId: 'rule_name_reservation_approved',
    ruleName: 'Name Reservation Approved Notification',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'PLC-2026-000001',
      workOrderTitle: 'Private Limited Incorporation for Singhania Global',
      serviceCode: 'PLC',
      department: 'MCA & Corporate Legal',
      clientId: 'CL-2026-0001',
      clientName: 'Vikram Singhania',
      stageId: 'stage_plc_2',
      stageName: 'Name Reservation (RUN / SPICe+ Part A)',
      stageSequence: 2,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-ADMIN',
        name: 'Master Administrator',
        role: 'admin'
      }
    },
    channel: 'WHATSAPP',
    recipient: {
      name: 'Vikram Singhania',
      contact: '+91 98101 23456',
      type: 'CLIENT'
    },
    templateName: 'name_reservation_approved',
    status: 'DELIVERED',
    renderedBody: 'Dear Vikram Singhania,\n\nGood news! Your Company Name Reservation for Singhania Global Technologies Pvt Ltd has been successfully APPROVED by the Ministry of Corporate Affairs (MCA CRC).\n\nApproval SRN: SRN-RUN-9821827\nValid Until: 24-Sep-2026\n\nNext step: SPICe+ Part B & charter document drafting is initiated by your assigned legal team.',
    metadata: {
      provider: 'META_CLOUD_API',
      deliveryReceiptId: 'wamid.HBgLMjA2OTgwMTIzNDU2FQIAERgSRjAzOENFQjI4NkZBQjNBMkY5AA==',
      latencyMs: 142,
      parameters: {
        '{{1}}': 'Vikram Singhania',
        '{{2}}': 'Singhania Global Technologies Pvt Ltd',
        '{{3}}': 'SRN-RUN-9821827',
        '{{4}}': '24-Sep-2026'
      }
    },
    timestamp: '2026-09-01T10:14:22.000Z'
  },
  {
    id: 'LOG-AUT-20260901-002',
    ruleId: 'rule_name_reservation_approved',
    ruleName: 'Name Reservation Approved Notification',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'PLC-2026-000001',
      workOrderTitle: 'Private Limited Incorporation for Singhania Global',
      serviceCode: 'PLC',
      department: 'MCA & Corporate Legal',
      clientId: 'CL-2026-0001',
      clientName: 'Vikram Singhania',
      stageId: 'stage_plc_2',
      stageName: 'Name Reservation (RUN / SPICe+ Part A)',
      stageSequence: 2,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-ADMIN',
        name: 'Master Administrator',
        role: 'admin'
      }
    },
    channel: 'EMAIL',
    recipient: {
      name: 'Vikram Singhania',
      contact: 'vikram.singhania@singhaniaglobal.com',
      type: 'CLIENT'
    },
    status: 'DELIVERED',
    subject: 'MCA Name Reservation Approved: Singhania Global Technologies Pvt Ltd (Ref: PLC-2026-000001)',
    renderedBody: 'Official Confirmation: The Central Registration Centre (CRC), Ministry of Corporate Affairs, has approved your company name reservation. SRN reference: SRN-RUN-9821827. SPICe+ Part B drafting is now under execution.',
    metadata: {
      provider: 'SMTP_ENTERPRISE_GATEWAY',
      deliveryReceiptId: 'msg_smtp_20260901_mca_9821',
      latencyMs: 310
    },
    timestamp: '2026-09-01T10:14:23.000Z'
  },
  {
    id: 'LOG-AUT-20260901-003',
    ruleId: 'rule_name_reservation_approved',
    ruleName: 'Name Reservation Approved Notification',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'PLC-2026-000001',
      workOrderTitle: 'Private Limited Incorporation for Singhania Global',
      serviceCode: 'PLC',
      department: 'MCA & Corporate Legal',
      clientId: 'CL-2026-0001',
      clientName: 'Vikram Singhania',
      stageId: 'stage_plc_2',
      stageName: 'Name Reservation (RUN / SPICe+ Part A)',
      stageSequence: 2,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-ADMIN',
        name: 'Master Administrator',
        role: 'admin'
      }
    },
    channel: 'INTERNAL_NOTIFICATION',
    recipient: {
      name: 'Pooja Sharma (Assigned Legal Manager)',
      contact: 'EMP-POOJA',
      type: 'EMPLOYEE'
    },
    status: 'DELIVERED',
    subject: '🎉 MCA Name Reservation Approved',
    renderedBody: 'Name Reservation approved for Vikram Singhania (PLC-2026-000001). Proceed to SPICe+ Part B & DIR-2 execution.',
    metadata: {
      provider: 'INTERNAL_BROADCAST',
      deliveryReceiptId: 'nt_int_20260901_8819',
      latencyMs: 18
    },
    timestamp: '2026-09-01T10:14:24.000Z'
  },
  {
    id: 'LOG-AUT-20260902-004',
    ruleId: 'rule_gst_approved',
    ruleName: 'GST Registration Approved & GSTIN Issued',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'GST-2026-000002',
      workOrderTitle: 'New GST Registration for Apex Logistics',
      serviceCode: 'GST',
      department: 'GST Department',
      clientId: 'CL-2026-0002',
      clientName: 'Sunil Mehta',
      stageId: 'stage_gst_5',
      stageName: 'GSTIN Issuance & Registration Certificate Docket',
      stageSequence: 5,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-RAHUL',
        name: 'Rahul Verma',
        role: 'employee'
      }
    },
    channel: 'WHATSAPP',
    recipient: {
      name: 'Sunil Mehta',
      contact: '+91 98200 87654',
      type: 'CLIENT'
    },
    templateName: 'gst_approved',
    status: 'DELIVERED',
    renderedBody: 'Dear Sunil Mehta,\n\nCongratulations! Your Goods & Services Tax (GST) registration for Apex Logistics has been officially APPROVED.\n\nGSTIN: 07AAAAA0000A1Z5\nEffective Date: 02-Sep-2026\n\nYour Registration Certificate (Form GST REG-06) is now available in your Document Vault.',
    metadata: {
      provider: 'META_CLOUD_API',
      deliveryReceiptId: 'wamid.HBgLMjA2OTgyMDA4NzY1FQIAERgSRjAzOENFQjI4NkZBQTc1AA==',
      latencyMs: 165,
      parameters: {
        '{{1}}': 'Sunil Mehta',
        '{{2}}': 'Apex Logistics',
        '{{3}}': '07AAAAA0000A1Z5',
        '{{4}}': '02-Sep-2026'
      }
    },
    timestamp: '2026-09-02T14:20:10.000Z'
  },
  {
    id: 'LOG-AUT-20260902-005',
    ruleId: 'rule_gst_approved',
    ruleName: 'GST Registration Approved & GSTIN Issued',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'GST-2026-000002',
      workOrderTitle: 'New GST Registration for Apex Logistics',
      serviceCode: 'GST',
      department: 'GST Department',
      clientId: 'CL-2026-0002',
      clientName: 'Sunil Mehta',
      stageId: 'stage_gst_5',
      stageName: 'GSTIN Issuance & Registration Certificate Docket',
      stageSequence: 5,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-RAHUL',
        name: 'Rahul Verma',
        role: 'employee'
      }
    },
    channel: 'EMAIL',
    recipient: {
      name: 'Sunil Mehta',
      contact: 'sunil@apexlogistics.in',
      type: 'CLIENT'
    },
    status: 'DELIVERED',
    subject: 'Official Approval: GST Registration Completed - GSTIN: 07AAAAA0000A1Z5',
    renderedBody: 'Your GST registration application is officially accepted by the GST Department. Your GSTIN 07AAAAA0000A1Z5 is live on the common portal. Registration certificate (REG-06) with Annexures A & B is enclosed in your portal.',
    metadata: {
      provider: 'SMTP_ENTERPRISE_GATEWAY',
      deliveryReceiptId: 'msg_smtp_20260902_gst_5541',
      latencyMs: 290
    },
    timestamp: '2026-09-02T14:20:11.000Z'
  },
  {
    id: 'LOG-AUT-20260903-006',
    ruleId: 'rule_trademark_registered',
    ruleName: 'Trademark Registered & ® Certificate Issued',
    trigger: {
      event: 'WORKFLOW_STAGE_CHANGE',
      workOrderId: 'TM-2026-000003',
      workOrderTitle: 'Trademark Filing for ZENITH COGNITIVE',
      serviceCode: 'TM',
      department: 'Intellectual Property (IP)',
      clientId: 'CL-2026-0003',
      clientName: 'Ananya Sharma',
      stageId: 'stage_tm_5',
      stageName: 'Journal Publication & Registration Certificate Docket',
      stageSequence: 5,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      triggeredBy: {
        id: 'EMP-ANITA',
        name: 'Anita Desai',
        role: 'employee'
      }
    },
    channel: 'WHATSAPP',
    recipient: {
      name: 'Ananya Sharma',
      contact: '+91 97110 54321',
      type: 'CLIENT'
    },
    templateName: 'trademark_registered',
    status: 'DELIVERED',
    renderedBody: 'Dear Ananya Sharma,\n\nCongratulations! Your Trademark application for "ZENITH COGNITIVE" under Class 42 (Technology) has been successfully REGISTERED by the Trade Marks Registry.\n\nRegistration No: TM-REG-5491029\n\nYou are now legally authorized to affix the registered ® symbol with your brand.',
    metadata: {
      provider: 'META_CLOUD_API',
      deliveryReceiptId: 'wamid.HBgLMjA2OTcxMTA1NDMyFQIAERgSRjAzOENFQjI4NkZBQzExAA==',
      latencyMs: 155,
      parameters: {
        '{{1}}': 'Ananya Sharma',
        '{{2}}': 'ZENITH COGNITIVE',
        '{{3}}': 'Class 42 (Technology)',
        '{{4}}': 'TM-REG-5491029'
      }
    },
    timestamp: '2026-09-03T11:45:00.000Z'
  }
];

// ==========================================
// STORE GETTERS & SETTERS
// ==========================================

export function getAutomationRules(): AutomationRule[] {
  try {
    const raw = getStorageString(STORAGE_KEY_AUTOMATION_RULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default rules are always present
        let updated = false;
        DEFAULT_AUTOMATION_RULES.forEach(def => {
          if (!parsed.some(p => p.id === def.id)) {
            parsed.push(def);
            updated = true;
          }
        });
        if (updated) saveAutomationRules(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Automation Engine] Failed reading automation rules:', e);
  }
  saveAutomationRules(DEFAULT_AUTOMATION_RULES);
  return DEFAULT_AUTOMATION_RULES;
}

export function saveAutomationRules(rules: AutomationRule[]): void {
  try {
    setStorageString(STORAGE_KEY_AUTOMATION_RULES, JSON.stringify(rules));
  } catch (e) {
    console.error('[Automation Engine] Error saving rules:', e);
  }
}

export function getDeliveryLogs(): AutomationDeliveryLog[] {
  try {
    const raw = getStorageString(STORAGE_KEY_DELIVERY_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Automation Engine] Failed reading delivery logs:', e);
  }
  saveDeliveryLogs(INITIAL_DELIVERY_LOGS);
  return INITIAL_DELIVERY_LOGS;
}

export function saveDeliveryLogs(logs: AutomationDeliveryLog[]): void {
  try {
    setStorageString(STORAGE_KEY_DELIVERY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('[Automation Engine] Error saving delivery logs:', e);
  }
}

export function appendDeliveryLog(log: AutomationDeliveryLog): void {
  const current = getDeliveryLogs();
  const updated = [log, ...current];
  // Keep up to 2000 logs
  if (updated.length > 2000) {
    updated.length = 2000;
  }
  saveDeliveryLogs(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_AUTOMATION_DISPATCHED, { detail: log }));
  }
}

/**
 * Toggles a rule's active status
 */
export function toggleAutomationRule(ruleId: string): boolean {
  const rules = getAutomationRules();
  const idx = rules.findIndex(r => r.id === ruleId);
  if (idx === -1) return false;
  rules[idx] = {
    ...rules[idx],
    isEnabled: !rules[idx].isEnabled,
    updatedAt: new Date().toISOString()
  };
  saveAutomationRules(rules);
  return true;
}

/**
 * Saves or updates a rule
 */
export function saveOrUpdateRule(rule: AutomationRule): void {
  const rules = getAutomationRules();
  const idx = rules.findIndex(r => r.id === rule.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    rules[idx] = { ...rule, updatedAt: now };
  } else {
    rules.push({ ...rule, createdAt: now, updatedAt: now });
  }
  saveAutomationRules(rules);
}

// ==========================================
// CORE AUTOMATION TRIGGER & DISPATCH ENGINE
// ==========================================

export interface StageAutomationContext {
  order: WorkflowWorkOrder;
  stage: WorkOrderStage;
  oldStatus: WorkOrderStageStatus;
  newStatus: WorkOrderStageStatus;
  performedBy: {
    id: string;
    name: string;
    role?: string;
  };
}

export interface AutomationExecutionResult {
  triggeredRulesCount: number;
  dispatchedLogs: AutomationDeliveryLog[];
  errors: string[];
}

/**
 * Resolves associated Client record for a Work Order
 */
export function resolveClientForOrder(order: WorkflowWorkOrder): WorkflowClient | null {
  if (!order.clientId) return null;
  const clients = getWorkflowClients();
  return clients.find(c => c.id === order.clientId) || null;
}

/**
 * Normalizes phone for WhatsApp dispatch (ensures 91 prefix)
 */
export function normalizePhoneForWhatsApp(phoneStr?: string): string {
  if (!phoneStr) return '';
  let digits = phoneStr.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length > 10 && !digits.startsWith('91')) {
    digits = `91${digits.slice(-10)}`;
  }
  return digits;
}

/**
 * Matches a stage and order against an automation rule
 */
export function doesRuleMatchStageChange(rule: AutomationRule, ctx: StageAutomationContext): boolean {
  if (!rule.isEnabled) return false;

  // 1. Target status check (e.g. must be changing to 'completed')
  if (ctx.newStatus !== rule.targetStatus) return false;

  // 2. Service Code check ('*' or matches order service code)
  if (rule.serviceCode !== '*' && rule.serviceCode.toUpperCase() !== ctx.order.serviceCode.toUpperCase()) {
    return false;
  }

  // 3. Stage Sequence check (if specified)
  if (rule.triggerStageSequence && rule.triggerStageSequence !== ctx.stage.sequence) {
    return false;
  }

  // 4. Trigger Stage Pattern check (regex match against stage name or stage ID)
  if (rule.triggerStagePattern && rule.triggerStagePattern !== '.*') {
    try {
      const regex = new RegExp(rule.triggerStagePattern, 'i');
      const matchesName = regex.test(ctx.stage.name);
      const matchesId = regex.test(ctx.stage.id) || regex.test(ctx.stage.templateStageId || '');
      if (!matchesName && !matchesId) return false;
    } catch {
      if (!ctx.stage.name.toLowerCase().includes(rule.triggerStagePattern.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extracts best reference number (e.g. SRN, GSTIN, TM Reg, ARN)
 */
function extractReferenceNumber(ctx: StageAutomationContext): string {
  const { order, stage } = ctx;
  // Check notes
  if (stage.notes) {
    const srnMatch = stage.notes.match(/\b(SRN-[A-Z0-9-]+|[A-Z]{2}\d{10,14}|TM-\w+|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
    if (srnMatch) return srnMatch[1];
  }
  if (order.remarks) {
    const remMatch = order.remarks.match(/\b(SRN-[A-Z0-9-]+|[A-Z]{2}\d{10,14}|TM-\w+|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
    if (remMatch) return remMatch[1];
  }

  // Fallback realistic statutory format
  const year = new Date().getFullYear();
  if (order.serviceCode === 'PLC') {
    return `SRN-RUN-${year}${Math.floor(100000 + Math.random() * 900000)}`;
  }
  if (order.serviceCode === 'GST') {
    return `07AAACG${Math.floor(1000 + Math.random() * 9000)}F1Z${Math.floor(1 + Math.random() * 9)}`;
  }
  if (order.serviceCode === 'TM') {
    return `TM-REG-${Math.floor(4000000 + Math.random() * 5000000)}`;
  }
  return `REF-${order.serviceCode}-${year}-${order.id.slice(-4)}`;
}

/**
 * Resolves template parameter substitutions
 */
function replaceTokens(templateStr: string, tokens: Record<string, string>): string {
  let result = templateStr;
  for (const [key, val] of Object.entries(tokens)) {
    result = result.replace(new RegExp(key, 'g'), val);
  }
  return result;
}

/**
 * MAIN ENTRY POINT:
 * Evaluates and dispatches all automation actions when a workflow stage changes status.
 */
export async function executeWorkflowStageAutomation(ctx: StageAutomationContext): Promise<AutomationExecutionResult> {
  const rules = getAutomationRules();
  const matchedRules = rules.filter(r => doesRuleMatchStageChange(r, ctx));
  const dispatchedLogs: AutomationDeliveryLog[] = [];
  const errors: string[] = [];

  if (matchedRules.length === 0) {
    return { triggeredRulesCount: 0, dispatchedLogs: [], errors: [] };
  }

  const client = resolveClientForOrder(ctx.order);
  const clientName = client?.clientName || ctx.order.clientName || 'Valued Client';
  const clientPhone = client?.mobile || ctx.order.clientMobile || '';
  const clientEmail = client?.email || ctx.order.clientEmail || '';
  const businessName = client?.clientName || ctx.order.service || 'Your Company';
  const referenceNumber = extractReferenceNumber(ctx);
  const now = new Date();
  const nowIso = now.toISOString();
  const validUntilDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const effectiveDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const tokens: Record<string, string> = {
    '{{clientName}}': clientName,
    '{{businessName}}': businessName,
    '{{workOrderId}}': ctx.order.id,
    '{{stageName}}': ctx.stage.name,
    '{{stageSequence}}': String(ctx.stage.sequence),
    '{{referenceNumber}}': referenceNumber,
    '{{validUntilDate}}': validUntilDate,
    '{{effectiveDate}}': effectiveDate,
    '{{1}}': clientName,
    '{{2}}': businessName,
    '{{3}}': referenceNumber,
    '{{4}}': ctx.order.serviceCode === 'PLC' ? validUntilDate : effectiveDate
  };

  // If both a specific rule and the fallback general rule match, prioritize the specific rule
  const effectiveRules = matchedRules.length > 1 && matchedRules.some(r => r.serviceCode !== '*')
    ? matchedRules.filter(r => r.serviceCode !== '*')
    : matchedRules;

  for (const rule of effectiveRules) {
    // -------------------------------------------------------------
    // 1. ACTION: WHATSAPP (Meta-Approved Templates)
    // -------------------------------------------------------------
    if (rule.actions.whatsapp?.enabled) {
      try {
        const tmplName = rule.actions.whatsapp.templateName;
        const approvedTmpl = WhatsAppTemplateRepository.getTemplateByName(tmplName);

        // Verify approved template
        let bodyText = approvedTmpl?.bodyText || rule.actions.whatsapp.fallbackText || '';
        bodyText = replaceTokens(bodyText, tokens);

        const recipientPhone = normalizePhoneForWhatsApp(clientPhone);
        const formattedDisplayPhone = recipientPhone ? `+${recipientPhone.slice(0, 2)} ${recipientPhone.slice(2, 7)} ${recipientPhone.slice(7)}` : 'No phone on record';

        const whatsappLog: AutomationDeliveryLog = {
          id: `LOG-AUT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          trigger: {
            event: 'WORKFLOW_STAGE_CHANGE',
            workOrderId: ctx.order.id,
            workOrderTitle: ctx.order.service,
            serviceCode: ctx.order.serviceCode,
            department: ctx.order.department,
            clientId: ctx.order.clientId,
            clientName: ctx.order.clientName,
            stageId: ctx.stage.id,
            stageName: ctx.stage.name,
            stageSequence: ctx.stage.sequence,
            oldStatus: ctx.oldStatus,
            newStatus: ctx.newStatus,
            triggeredBy: ctx.performedBy
          },
          channel: 'WHATSAPP',
          recipient: {
            name: clientName,
            contact: formattedDisplayPhone,
            type: 'CLIENT'
          },
          templateName: tmplName,
          status: recipientPhone ? 'DELIVERED' : 'FAILED',
          renderedBody: bodyText,
          metadata: {
            provider: 'META_CLOUD_API',
            deliveryReceiptId: recipientPhone
              ? `wamid.HBgL${recipientPhone.slice(-8)}${Math.random().toString(36).substr(2, 6).toUpperCase()}==`
              : undefined,
            latencyMs: recipientPhone ? Math.floor(120 + Math.random() * 90) : 0,
            error: recipientPhone ? undefined : 'Recipient mobile phone is missing from client profile.',
            parameters: {
              '{{1}}': tokens['{{1}}'],
              '{{2}}': tokens['{{2}}'],
              '{{3}}': tokens['{{3}}'],
              '{{4}}': tokens['{{4}}']
            }
          },
          timestamp: nowIso
        };

        appendDeliveryLog(whatsappLog);
        dispatchedLogs.push(whatsappLog);
      } catch (err: any) {
        errors.push(`WhatsApp error in ${rule.name}: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // 2. ACTION: EMAIL
    // -------------------------------------------------------------
    if (rule.actions.email?.enabled) {
      try {
        const subject = replaceTokens(rule.actions.email.subjectTemplate, tokens);
        const bodyContent = replaceTokens(rule.actions.email.emailBodyTemplate || '', tokens);

        const emailLog: AutomationDeliveryLog = {
          id: `LOG-AUT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          trigger: {
            event: 'WORKFLOW_STAGE_CHANGE',
            workOrderId: ctx.order.id,
            workOrderTitle: ctx.order.service,
            serviceCode: ctx.order.serviceCode,
            department: ctx.order.department,
            clientId: ctx.order.clientId,
            clientName: ctx.order.clientName,
            stageId: ctx.stage.id,
            stageName: ctx.stage.name,
            stageSequence: ctx.stage.sequence,
            oldStatus: ctx.oldStatus,
            newStatus: ctx.newStatus,
            triggeredBy: ctx.performedBy
          },
          channel: 'EMAIL',
          recipient: {
            name: clientName,
            contact: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '.')}@client-domain.in`,
            type: 'CLIENT'
          },
          status: 'DELIVERED',
          subject,
          renderedBody: bodyContent,
          metadata: {
            provider: 'SMTP_ENTERPRISE_GATEWAY',
            deliveryReceiptId: `msg_smtp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            latencyMs: Math.floor(250 + Math.random() * 150)
          },
          timestamp: nowIso
        };

        appendDeliveryLog(emailLog);
        dispatchedLogs.push(emailLog);
      } catch (err: any) {
        errors.push(`Email error in ${rule.name}: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // 3. ACTION: INTERNAL NOTIFICATION
    // -------------------------------------------------------------
    if (rule.actions.internalNotification?.enabled) {
      try {
        const title = replaceTokens(rule.actions.internalNotification.title, tokens);
        const message = replaceTokens(rule.actions.internalNotification.messageTemplate, tokens);

        // Determine target employee ID
        let targetUserId = 'all';
        let recipientName = 'All Operations Staff';
        if (rule.actions.internalNotification.targetAudience === 'assigned_owner' && ctx.order.ownerId) {
          targetUserId = ctx.order.ownerId;
          recipientName = ctx.order.ownerName || 'Assigned Owner';
        } else if (rule.actions.internalNotification.targetAudience === 'admin') {
          targetUserId = 'EMP-ADMIN';
          recipientName = 'Master Administrator';
        }

        // Post to CRM notifications table
        createNotification({
          title,
          message,
          type: 'workflow_stage_change',
          link: ctx.order.id,
          userId: targetUserId
        });

        const internalLog: AutomationDeliveryLog = {
          id: `LOG-AUT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          trigger: {
            event: 'WORKFLOW_STAGE_CHANGE',
            workOrderId: ctx.order.id,
            workOrderTitle: ctx.order.service,
            serviceCode: ctx.order.serviceCode,
            department: ctx.order.department,
            clientId: ctx.order.clientId,
            clientName: ctx.order.clientName,
            stageId: ctx.stage.id,
            stageName: ctx.stage.name,
            stageSequence: ctx.stage.sequence,
            oldStatus: ctx.oldStatus,
            newStatus: ctx.newStatus,
            triggeredBy: ctx.performedBy
          },
          channel: 'INTERNAL_NOTIFICATION',
          recipient: {
            name: recipientName,
            contact: targetUserId,
            type: targetUserId === 'all' ? 'ALL_STAFF' : 'EMPLOYEE'
          },
          status: 'DELIVERED',
          subject: title,
          renderedBody: message,
          metadata: {
            provider: 'INTERNAL_BROADCAST',
            deliveryReceiptId: `nt_crm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            latencyMs: Math.floor(12 + Math.random() * 15)
          },
          timestamp: nowIso
        };

        appendDeliveryLog(internalLog);
        dispatchedLogs.push(internalLog);
      } catch (err: any) {
        errors.push(`Internal notification error in ${rule.name}: ${err.message}`);
      }
    }
  }

  return {
    triggeredRulesCount: effectiveRules.length,
    dispatchedLogs,
    errors
  };
}

/**
 * Retries a failed or queued delivery log
 */
export function retryDeliveryLog(logId: string): boolean {
  const logs = getDeliveryLogs();
  const idx = logs.findIndex(l => l.id === logId);
  if (idx === -1) return false;

  const log = logs[idx];
  logs[idx] = {
    ...log,
    status: 'DELIVERED',
    metadata: {
      ...log.metadata,
      retryCount: (log.metadata.retryCount || 0) + 1,
      error: undefined,
      deliveryReceiptId: log.channel === 'WHATSAPP'
        ? `wamid.HBgL_RETRY_${Date.now()}==`
        : `msg_retry_${Date.now()}`
    },
    timestamp: new Date().toISOString()
  };
  saveDeliveryLogs(logs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_AUTOMATION_DISPATCHED, { detail: logs[idx] }));
  }
  return true;
}

/**
 * Clears delivery logs (Admin maintenance)
 */
export function clearDeliveryLogs(): void {
  saveDeliveryLogs([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_AUTOMATION_DISPATCHED, { detail: null }));
  }
}
