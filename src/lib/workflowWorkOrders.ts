/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorageString, setStorageString } from './db';
import { getWorkflowClients, appendClientAuditEntry, WorkflowClient } from './workflowClients';
import { executeWorkflowStageAutomation } from './workflowAutomationEngine';
import {
  WorkOrderStage,
  WorkOrderStageStatus,
  WorkflowTemplate,
  instantiateStagesFromTemplate,
  getWorkflowTemplateForService,
  getWorkflowTemplateById,
  checkStageDependencyStatus
} from './workflowTemplates';

export type {
  WorkOrderStage,
  WorkOrderStageStatus,
  WorkflowTemplate
};

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkOrderStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export interface PredefinedServiceConfig {
  name: string;
  code: string;
  department: string;
  defaultTatDays: number;
  description: string;
}

export const PREDEFINED_WORKFLOW_SERVICES: PredefinedServiceConfig[] = [
  {
    name: 'Private Limited Company Incorporation',
    code: 'PLC',
    department: 'MCA & Corporate Legal',
    defaultTatDays: 10,
    description: 'Complete end-to-end Pvt Ltd incorporation including RUN name approval, SPICe+ Part A & B, MOA/AOA, PAN, TAN & Bank AC.'
  },
  {
    name: 'GST Registration & Compliance',
    code: 'GST',
    department: 'GST Department',
    defaultTatDays: 7,
    description: 'New GSTIN registration, ARN tracking, monthly GSTR-1, GSTR-3B filings and annual reconciliation.'
  },
  {
    name: 'Trademark Application & IP Filing',
    code: 'TM',
    department: 'Intellectual Property (IP)',
    defaultTatDays: 14,
    description: 'Trademark search, Vienna codification, Class 1-45 filing, Form TM-A submission, Examination report tracking.'
  },
  {
    name: 'Income Tax Return & Tax Audit',
    code: 'ITR',
    department: 'Income Tax & Audit',
    defaultTatDays: 5,
    description: 'Filing ITR-1 to ITR-7, computation of total income, Form 26AS/AIS reconciliation, 44AB tax audit.'
  },
  {
    name: 'MCA Annual Filing & ROC Compliance',
    code: 'MCA',
    department: 'MCA & Corporate Legal',
    defaultTatDays: 15,
    description: 'AOC-4, MGT-7/7A, DIR-3 KYC annual filings, board resolutions, statutory registers maintenance.'
  },
  {
    name: 'Trust, Society & Section 8 NGO Formation',
    code: 'NGO',
    department: 'NGO & Trust Management',
    defaultTatDays: 21,
    description: 'Trust deed registration, 12A & 80G provisional/final approvals, CSR-1 filing, Darpan portal enrollment.'
  },
  {
    name: 'Class 3 Digital Signature Certificate',
    code: 'DSC',
    department: 'Digital Credentials & DSC',
    defaultTatDays: 2,
    description: 'Paperless e-KYC video verification Class 3 signing and encryption USB cryptographic token issuance.'
  },
  {
    name: 'Government Licensing & Registrations',
    code: 'LIC',
    department: 'Licensing & Registrations',
    defaultTatDays: 8,
    description: 'FSSAI food license, MSME / Udyam registration, Shop & Establishment Act trade license.'
  },
  {
    name: 'Accounting, Bookkeeping & Payroll',
    code: 'ACC',
    department: 'Accounts & Financial Services',
    defaultTatDays: 30,
    description: 'Monthly Tally/Zoho bookkeeping, bank reconciliation, TDS withholding compliance, pay slip generation.'
  }
];

export const WORKFLOW_DEPARTMENTS = [
  'MCA & Corporate Legal',
  'GST Department',
  'Intellectual Property (IP)',
  'Income Tax & Audit',
  'NGO & Trust Management',
  'Digital Credentials & DSC',
  'Licensing & Registrations',
  'Accounts & Financial Services',
  'Operations Command'
];

export interface WorkOrderAuditEntry {
  id: string;
  timestamp: string; // ISO string
  action:
    | 'CREATED'
    | 'STATUS_UPDATED'
    | 'OWNER_REASSIGNED'
    | 'DETAILS_EDITED'
    | 'NOTE_ADDED'
    | 'SLA_CHANGED'
    | 'STAGE_UPDATED'
    | 'STAGE_CHECKLIST_TOGGLED';
  actionTitle: string;
  description: string;
  performedBy: {
    id: string;
    name: string;
    role?: string;
  };
  changes?: {
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

export interface WorkflowWorkOrder {
  id: string; // Format: {SERVICECODE}-{YEAR}-{SEQUENCE}, e.g. PLC-2026-000001, GST-2026-000001, TM-2026-000001
  clientId: string; // Linked Client ID, e.g. CL-2026-000001
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  clientPan?: string;
  clientCategory?: string;
  service: string;
  serviceCode: string; // e.g. PLC, GST, TM
  templateId?: string; // ID of workflow template from which stages were loaded
  stages: WorkOrderStage[]; // Loaded and sequenced stages with dependencies and duration
  ownerId: string; // Assigned employee ID
  ownerName: string; // Assigned employee name
  department: string;
  priority: WorkOrderPriority;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: WorkOrderStatus;
  remarks?: string;
  estimatedFee?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy: {
    id: string;
    name: string;
  };
  auditTrail: WorkOrderAuditEntry[];
  // Phase 4: Permanent Lead Linkage
  leadId?: string; // e.g. LEAD-101
  leadCustomerName?: string;
  leadBusinessName?: string;
}

const STORAGE_KEY_WORK_ORDERS = 'efilingg_crm_workflow_work_orders';

/**
 * Default initial seed work orders matching user specification:
 * PLC-2026-000001, GST-2026-000001, TM-2026-000001
 */
function getInitialSeedWorkOrders(): WorkflowWorkOrder[] {
  const clients = getWorkflowClients();
  const c1 = clients.find(c => c.id === 'CL-2026-000001') || clients[0] || {
    id: 'CL-2026-000001',
    clientName: 'Apex Retails Pvt Ltd',
    mobile: '9876543210',
    email: 'contact@apexretails.com',
    pan: 'AABCA1234F',
    clientCategory: 'Private Limited Company'
  };

  const c2 = clients.find(c => c.id === 'CL-2026-000002') || clients[1] || {
    id: 'CL-2026-000002',
    clientName: 'Horizon Tech Innovations LLP',
    mobile: '9811223344',
    email: 'billing@horizoninnovations.in',
    pan: 'BBAPA5678K',
    clientCategory: 'LLP (Limited Liability Partnership)'
  };

  const c3 = clients.find(c => c.id === 'CL-2026-000003') || clients[2] || {
    id: 'CL-2026-000003',
    clientName: 'Bharat Logistics & Cargo',
    mobile: '9988776655',
    email: 'info@bharatlogistics.org',
    pan: 'CCBPB9012M',
    clientCategory: 'Sole Proprietorship'
  };

  const plcTmpl = getWorkflowTemplateForService('PLC');
  const gstTmpl = getWorkflowTemplateForService('GST');
  const tmTmpl = getWorkflowTemplateForService('TM');

  const plcStages = plcTmpl ? instantiateStagesFromTemplate(plcTmpl, '2026-01-15') : [];
  if (plcStages.length > 0) {
    plcStages[0].status = 'completed';
    plcStages[0].completedDate = '2026-01-17T14:30:00.000Z';
    if (plcStages[0].checklist) {
      plcStages[0].checklist.forEach(c => { c.completed = true; });
    }
    if (plcStages[1]) plcStages[1].status = 'in_progress';
  }

  const gstStages = gstTmpl ? instantiateStagesFromTemplate(gstTmpl, '2026-02-01') : [];
  const tmStages = tmTmpl ? instantiateStagesFromTemplate(tmTmpl, '2026-02-10') : [];

  return [
    {
      id: 'PLC-2026-000001',
      clientId: c1.id,
      clientName: c1.clientName,
      clientMobile: c1.mobile,
      clientEmail: c1.email,
      clientPan: c1.pan,
      clientCategory: c1.clientCategory,
      service: 'Private Limited Company Incorporation',
      serviceCode: 'PLC',
      templateId: plcTmpl?.id,
      stages: plcStages,
      ownerId: 'EMP-001',
      ownerName: 'Vikas Sharma',
      department: 'MCA & Corporate Legal',
      priority: 'high',
      startDate: '2026-01-15',
      dueDate: '2026-01-25',
      status: 'in_progress',
      remarks: 'Name reservation RUN approved. SPICe+ Part B filed with ROC Delhi.',
      estimatedFee: 14500,
      createdAt: '2026-01-15T09:30:00.000Z',
      updatedAt: '2026-01-15T09:30:00.000Z',
      createdBy: {
        id: 'EMP-001',
        name: 'Vikas Sharma'
      },
      auditTrail: [
        {
          id: 'WOA-001',
          timestamp: '2026-01-15T09:30:00.000Z',
          action: 'CREATED',
          actionTitle: 'Work Order Initialized (PLC-2026-000001)',
          description: `Work Order created for Client ${c1.clientName} (${c1.id}) under MCA & Corporate Legal. Loaded ${plcStages.length} stages from template "${plcTmpl?.serviceName}". Assigned to Vikas Sharma.`,
          performedBy: {
            id: 'EMP-001',
            name: 'Vikas Sharma',
            role: 'Senior Associate'
          }
        }
      ]
    },
    {
      id: 'GST-2026-000001',
      clientId: c2.id,
      clientName: c2.clientName,
      clientMobile: c2.mobile,
      clientEmail: c2.email,
      clientPan: c2.pan,
      clientCategory: c2.clientCategory,
      service: 'GST Registration & Compliance',
      serviceCode: 'GST',
      templateId: gstTmpl?.id,
      stages: gstStages,
      ownerId: 'EMP-002',
      ownerName: 'Neha Verma',
      department: 'GST Department',
      priority: 'medium',
      startDate: '2026-02-01',
      dueDate: '2026-02-08',
      status: 'assigned',
      remarks: 'Primary authorized signatory Aadhaar authentication initiated.',
      estimatedFee: 3500,
      createdAt: '2026-02-01T10:15:00.000Z',
      updatedAt: '2026-02-01T10:15:00.000Z',
      createdBy: {
        id: 'EMP-002',
        name: 'Neha Verma'
      },
      auditTrail: [
        {
          id: 'WOA-002',
          timestamp: '2026-02-01T10:15:00.000Z',
          action: 'CREATED',
          actionTitle: 'Work Order Initialized (GST-2026-000001)',
          description: `Work Order created for Client ${c2.clientName} (${c2.id}) under GST Department. Loaded ${gstStages.length} stages from template "${gstTmpl?.serviceName}". Assigned to Neha Verma.`,
          performedBy: {
            id: 'EMP-002',
            name: 'Neha Verma',
            role: 'GST Team Leader'
          }
        }
      ]
    },
    {
      id: 'TM-2026-000001',
      clientId: c3.id,
      clientName: c3.clientName,
      clientMobile: c3.mobile,
      clientEmail: c3.email,
      clientPan: c3.pan,
      clientCategory: c3.clientCategory,
      service: 'Trademark Application & IP Filing',
      serviceCode: 'TM',
      templateId: tmTmpl?.id,
      stages: tmStages,
      ownerId: 'EMP-003',
      ownerName: 'Rahul Patel',
      department: 'Intellectual Property (IP)',
      priority: 'urgent',
      startDate: '2026-02-10',
      dueDate: '2026-02-24',
      status: 'review',
      remarks: 'Class 39 search clearance complete. Drafting User Affidavit Form TM-A.',
      estimatedFee: 9000,
      createdAt: '2026-02-10T11:45:00.000Z',
      updatedAt: '2026-02-10T11:45:00.000Z',
      createdBy: {
        id: 'EMP-003',
        name: 'Rahul Patel'
      },
      auditTrail: [
        {
          id: 'WOA-003',
          timestamp: '2026-02-10T11:45:00.000Z',
          action: 'CREATED',
          actionTitle: 'Work Order Initialized (TM-2026-000001)',
          description: `Work Order created for Client ${c3.clientName} (${c3.id}) under Intellectual Property (IP). Loaded ${tmStages.length} stages from template "${tmTmpl?.serviceName}". Assigned to Rahul Patel.`,
          performedBy: {
            id: 'EMP-003',
            name: 'Rahul Patel',
            role: 'IP Attorney'
          }
        }
      ]
    }
  ];
}

/**
 * Retrieves all workflow work orders from persistent storage.
 */
export function getWorkflowWorkOrders(): WorkflowWorkOrder[] {
  const raw = getStorageString(STORAGE_KEY_WORK_ORDERS);
  let list: WorkflowWorkOrder[] = [];
  if (!raw) {
    list = getInitialSeedWorkOrders();
    setStorageString(STORAGE_KEY_WORK_ORDERS, JSON.stringify(list));
    return list;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      list = parsed;
    }
  } catch (err) {
    console.error('Failed to parse workflow work orders from storage:', err);
  }

  // Ensure every existing order has stages populated
  let needsResave = false;
  list.forEach(order => {
    if (!order.stages || !Array.isArray(order.stages) || order.stages.length === 0) {
      const tmpl = order.templateId
        ? getWorkflowTemplateById(order.templateId)
        : getWorkflowTemplateForService(order.service || order.serviceCode);
      if (tmpl) {
        order.stages = instantiateStagesFromTemplate(tmpl, order.startDate);
        order.templateId = tmpl.id;
        needsResave = true;
      } else {
        order.stages = [];
      }
    }
  });

  if (needsResave) {
    setStorageString(STORAGE_KEY_WORK_ORDERS, JSON.stringify(list));
  }

  return list;
}

/**
 * Saves workflow work orders to storage and broadcasts update event for realtime listeners.
 */
export function saveWorkflowWorkOrders(orders: WorkflowWorkOrder[]): void {
  setStorageString(STORAGE_KEY_WORK_ORDERS, JSON.stringify(orders));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('efilingg_workflow_work_orders_updated', {
        detail: { count: orders.length, timestamp: Date.now() }
      })
    );
  }
}

export interface WorkOrderExecutionMetrics {
  currentStage: {
    sequence: number;
    name: string;
    status: WorkOrderStageStatus;
    totalStages: number;
    isLastStage: boolean;
  };
  progressPercentage: number;
  pendingDays: {
    days: number;
    label: string;
    urgency: 'overdue' | 'due_today' | 'due_soon' | 'on_track' | 'completed';
  };
}

/**
 * Calculates pending days until target SLA due date with urgency classification.
 */
export function calculateWorkOrderPendingDays(
  dueDateStr: string,
  status: WorkOrderStatus
): {
  days: number;
  label: string;
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'on_track' | 'completed';
} {
  if (status === 'completed') {
    return {
      days: 0,
      label: 'Completed',
      urgency: 'completed'
    };
  }

  if (!dueDateStr) {
    return {
      days: 0,
      label: 'No Due Date',
      urgency: 'on_track'
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      days: diffDays,
      label: `Overdue by ${abs} ${abs === 1 ? 'day' : 'days'}`,
      urgency: 'overdue'
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      label: 'Due Today',
      urgency: 'due_today'
    };
  } else if (diffDays <= 2) {
    return {
      days: diffDays,
      label: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`,
      urgency: 'due_soon'
    };
  } else {
    return {
      days: diffDays,
      label: `${diffDays} days left`,
      urgency: 'on_track'
    };
  }
}

/**
 * Computes live execution metrics for a work order: Current Stage, Progress %, Pending Days.
 */
export function computeWorkOrderExecutionMetrics(order: WorkflowWorkOrder): WorkOrderExecutionMetrics {
  const stages = order.stages || [];
  
  // 1. Identify current stage
  let currentStageObj = stages.find(s => s.status === 'in_progress');
  if (!currentStageObj) {
    currentStageObj = stages.find(s => s.status === 'pending');
  }
  if (!currentStageObj && stages.length > 0) {
    currentStageObj = stages[stages.length - 1];
  }

  const currentStage = currentStageObj
    ? {
        sequence: currentStageObj.sequence,
        name: currentStageObj.name,
        status: currentStageObj.status,
        totalStages: stages.length,
        isLastStage: currentStageObj.sequence === stages.length
      }
    : {
        sequence: 1,
        name: 'Initiation & Document Verification',
        status: 'pending' as WorkOrderStageStatus,
        totalStages: 1,
        isLastStage: true
      };

  // 2. Compute dynamic Progress %
  let progressPercentage = 0;
  if (order.status === 'completed') {
    progressPercentage = 100;
  } else if (stages.length > 0) {
    let completedWeight = 0;
    const stageWeight = 100 / stages.length;
    stages.forEach(s => {
      if (s.status === 'completed' || s.status === 'skipped') {
        completedWeight += stageWeight;
      } else if (s.status === 'in_progress') {
        const checklist = s.checklist || [];
        if (checklist.length > 0) {
          const doneCount = checklist.filter(c => c.completed).length;
          completedWeight += stageWeight * (doneCount / checklist.length);
        } else {
          completedWeight += stageWeight * 0.35;
        }
      }
    });
    progressPercentage = Math.min(99, Math.max(0, Math.round(completedWeight)));
  }

  // 3. Pending Days
  const pendingDays = calculateWorkOrderPendingDays(order.dueDate, order.status);

  return {
    currentStage,
    progressPercentage,
    pendingDays
  };
}

/**
 * Generates next sequential Work Order ID matching format:
 * {SERVICECODE}-{YEAR}-{SEQUENCE}
 *
 * Example:
 * PLC-2026-000001
 * GST-2026-000001
 * TM-2026-000001
 */
export function generateNextWorkOrderId(serviceCode: string, year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const cleanCode = (serviceCode || 'WRK').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'WRK';
  const prefix = `${cleanCode}-${currentYear}-`;

  const orders = getWorkflowWorkOrders();
  let maxSeq = 0;

  for (const order of orders) {
    if (order.id && order.id.startsWith(prefix)) {
      const seqPart = order.id.slice(prefix.length);
      const seqNum = parseInt(seqPart, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');
  return `${prefix}${paddedSeq}`;
}

export interface CreateWorkOrderPayload {
  clientId: string; // REQUIRED - Every Work Order must be linked with a Client
  service: string;
  serviceCode: string; // e.g. PLC, GST, TM
  templateId?: string; // Optional specific template to load stages from
  customStages?: WorkOrderStage[]; // Optional pre-customized stages
  ownerId: string;
  ownerName: string;
  department: string;
  priority: WorkOrderPriority;
  startDate: string;
  dueDate: string;
  status?: WorkOrderStatus;
  remarks?: string;
  estimatedFee?: number;
  leadId?: string;
  leadCustomerName?: string;
  leadBusinessName?: string;
}

export interface CreateWorkOrderResult {
  success: boolean;
  workOrder?: WorkflowWorkOrder;
  errorMessage?: string;
}

/**
 * Creates a new Work Order linked to an existing Client.
 * Automatically enforces Client linking, generates Work ID, loads stages from Workflow Template,
 * and appends audit trails to both Work Order and Client.
 */
export function createWorkflowWorkOrder(
  payload: CreateWorkOrderPayload,
  performedBy: { id: string; name: string; role?: string }
): CreateWorkOrderResult {
  // 1. Validation: Every Work Order must be linked with a valid Client
  if (!payload.clientId || !payload.clientId.trim()) {
    return {
      success: false,
      errorMessage: 'Every Work Order must be linked with a Client. Please select a valid Client.'
    };
  }

  const clients = getWorkflowClients();
  const client = clients.find(c => c.id === payload.clientId.trim());
  if (!client) {
    return {
      success: false,
      errorMessage: `Client with ID "${payload.clientId}" was not found. Please select an active enrolled client.`
    };
  }

  if (!payload.service || !payload.service.trim()) {
    return {
      success: false,
      errorMessage: 'Service name is required.'
    };
  }

  if (!payload.ownerId || !payload.ownerName) {
    return {
      success: false,
      errorMessage: 'Owner / Assignee must be assigned.'
    };
  }

  if (!payload.startDate || !payload.dueDate) {
    return {
      success: false,
      errorMessage: 'Start date and Due date are required.'
    };
  }

  // 2. Resolve Service Code & Department
  let serviceCode = (payload.serviceCode || '').trim().toUpperCase();
  if (!serviceCode) {
    const predefined = PREDEFINED_WORKFLOW_SERVICES.find(
      s => s.name.toLowerCase() === payload.service.toLowerCase()
    );
    serviceCode = predefined ? predefined.code : 'WRK';
  }

  // 3. Resolve Template & Load Stages Automatically
  const template = payload.templateId
    ? getWorkflowTemplateById(payload.templateId)
    : getWorkflowTemplateForService(payload.service || serviceCode);

  let loadedStages: WorkOrderStage[] = [];
  if (payload.customStages && Array.isArray(payload.customStages) && payload.customStages.length > 0) {
    loadedStages = payload.customStages;
  } else if (template) {
    loadedStages = instantiateStagesFromTemplate(template, payload.startDate);
  }

  // 4. Generate Work ID: {SERVICECODE}-{YEAR}-{SEQUENCE}
  const workId = generateNextWorkOrderId(serviceCode);
  const nowIso = new Date().toISOString();

  // 5. Initial Audit Entry for Work Order
  const initialWorkOrderAudit: WorkOrderAuditEntry = {
    id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    action: 'CREATED',
    actionTitle: `Work Order Initialized (${workId})`,
    description: `Work order created for Client ${client.clientName} (${client.id}) for service "${payload.service}". Loaded ${loadedStages.length} stages from template "${template?.serviceName || 'Custom'}". Department: ${payload.department}. Assigned to ${payload.ownerName}. Priority: ${payload.priority.toUpperCase()}. Due Date: ${payload.dueDate}.`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    metadata: {
      templateId: template?.id,
      templateName: template?.serviceName,
      stagesCount: loadedStages.length
    }
  };

  const newOrder: WorkflowWorkOrder = {
    id: workId,
    clientId: client.id,
    clientName: client.clientName,
    clientMobile: client.mobile,
    clientEmail: client.email,
    clientPan: client.pan,
    clientCategory: client.clientCategory,
    service: payload.service.trim(),
    serviceCode,
    templateId: template?.id,
    stages: loadedStages,
    ownerId: payload.ownerId,
    ownerName: payload.ownerName,
    department: payload.department || 'Operations Command',
    priority: payload.priority || 'medium',
    startDate: payload.startDate,
    dueDate: payload.dueDate,
    status: payload.status || 'assigned',
    remarks: payload.remarks?.trim() || '',
    estimatedFee: payload.estimatedFee || 0,
    leadId: payload.leadId,
    leadCustomerName: payload.leadCustomerName,
    leadBusinessName: payload.leadBusinessName,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: {
      id: performedBy.id,
      name: performedBy.name
    },
    auditTrail: [initialWorkOrderAudit]
  };

  // 6. Save Work Order
  const orders = getWorkflowWorkOrders();
  orders.unshift(newOrder);
  saveWorkflowWorkOrders(orders);

  // 7. Append audit entry to linked Client's audit trail
  try {
    appendClientAuditEntry(client.id, {
      action: 'WORKFLOW_LINKED',
      actionTitle: `Work Order Created (${workId})`,
      description: `New Work Order ${workId} generated for service "${payload.service}" with ${loadedStages.length} sequential workflow stages loaded from template. Assigned to ${payload.ownerName} (${payload.department}). Priority: ${payload.priority.toUpperCase()}. Due: ${payload.dueDate}.`,
      performedBy: {
        id: performedBy.id,
        name: performedBy.name,
        role: performedBy.role
      },
      metadata: {
        workOrderId: workId,
        service: payload.service,
        serviceCode,
        templateId: template?.id,
        stagesCount: loadedStages.length,
        ownerName: payload.ownerName,
        priority: payload.priority,
        dueDate: payload.dueDate
      }
    });
  } catch (clientAuditErr) {
    console.warn('Could not link audit entry to client record:', clientAuditErr);
  }

  return {
    success: true,
    workOrder: newOrder
  };
}

/**
 * Updates a Work Order status with audit logging.
 */
export function updateWorkOrderStatus(
  orderId: string,
  newStatus: WorkOrderStatus,
  performedBy: { id: string; name: string; role?: string },
  remarks?: string
): boolean {
  const orders = getWorkflowWorkOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) return false;

  const order = orders[index];
  const oldStatus = order.status;
  if (oldStatus === newStatus && !remarks) return true;

  const nowIso = new Date().toISOString();
  const auditEntry: WorkOrderAuditEntry = {
    id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    action: 'STATUS_UPDATED',
    actionTitle: `Status Changed to ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
    description: `Status transitioned from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()}.${remarks ? ` Note: "${remarks}"` : ''}`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    changes: [
      {
        field: 'status',
        fieldLabel: 'Status',
        oldValue: oldStatus,
        newValue: newStatus
      }
    ]
  };

  orders[index] = {
    ...order,
    status: newStatus,
    remarks: remarks ? `${order.remarks ? order.remarks + '\n' : ''}[${new Date().toLocaleDateString()}]: ${remarks}` : order.remarks,
    updatedAt: nowIso,
    auditTrail: [auditEntry, ...(order.auditTrail || [])]
  };

  saveWorkflowWorkOrders(orders);
  return true;
}

/**
 * Reassigns Work Order owner with audit trail logging.
 */
export function reassignWorkOrderOwner(
  orderId: string,
  newOwnerId: string,
  newOwnerName: string,
  performedBy: { id: string; name: string; role?: string },
  reason?: string
): boolean {
  const orders = getWorkflowWorkOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) return false;

  const order = orders[index];
  const oldOwner = order.ownerName;
  const nowIso = new Date().toISOString();

  const auditEntry: WorkOrderAuditEntry = {
    id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    action: 'OWNER_REASSIGNED',
    actionTitle: `Owner Reassigned to ${newOwnerName}`,
    description: `Ownership transferred from ${oldOwner} to ${newOwnerName}.${reason ? ` Reason: ${reason}` : ''}`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    changes: [
      {
        field: 'ownerId',
        fieldLabel: 'Owner ID',
        oldValue: order.ownerId,
        newValue: newOwnerId
      },
      {
        field: 'ownerName',
        fieldLabel: 'Owner Name',
        oldValue: oldOwner,
        newValue: newOwnerName
      }
    ]
  };

  orders[index] = {
    ...order,
    ownerId: newOwnerId,
    ownerName: newOwnerName,
    updatedAt: nowIso,
    auditTrail: [auditEntry, ...(order.auditTrail || [])]
  };

  saveWorkflowWorkOrders(orders);
  return true;
}

/**
 * Returns all work orders linked with a specific Client ID.
 */
export function getWorkOrdersForClient(clientId: string): WorkflowWorkOrder[] {
  if (!clientId) return [];
  const orders = getWorkflowWorkOrders();
  return orders.filter(o => o.clientId === clientId.trim());
}

/**
 * Updates a specific stage status inside a Work Order, enforcing dependency validations.
 */
export function updateWorkOrderStageStatus(
  orderId: string,
  stageId: string,
  newStatus: WorkOrderStageStatus,
  performedBy: { id: string; name: string; role?: string },
  notes?: string
): { success: boolean; message?: string; workOrder?: WorkflowWorkOrder } {
  const orders = getWorkflowWorkOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    return { success: false, message: 'Work order not found.' };
  }

  const order = orders[orderIndex];
  const stageIndex = order.stages.findIndex(s => s.id === stageId);
  if (stageIndex === -1) {
    return { success: false, message: 'Stage not found in this work order.' };
  }

  const stage = order.stages[stageIndex];
  const nowIso = new Date().toISOString();

  // Dependency Validation:
  // If attempting to advance to 'in_progress' or 'completed', verify that all predecessor dependencies are finished
  if (newStatus === 'in_progress' || newStatus === 'completed') {
    const depCheck = checkStageDependencyStatus(stage, order.stages);
    if (depCheck.isBlocked) {
      const blockers = depCheck.unmetDependencies.map(d => `Stage ${d.sequence} (${d.name})`).join(', ');
      return {
        success: false,
        message: `Stage ${stage.sequence} is blocked. Preceding dependencies must be completed first: ${blockers}`
      };
    }
  }

  const oldStatus = stage.status;
  const updatedStage: WorkOrderStage = {
    ...stage,
    status: newStatus,
    completedDate: newStatus === 'completed' ? nowIso : (newStatus === 'pending' ? undefined : stage.completedDate),
    completedBy: newStatus === 'completed' ? { id: performedBy.id, name: performedBy.name, role: performedBy.role } : stage.completedBy,
    notes: notes ? (stage.notes ? `${stage.notes}\n[${new Date().toLocaleDateString()}]: ${notes}` : notes) : stage.notes
  };

  const updatedStages = [...order.stages];
  updatedStages[stageIndex] = updatedStage;

  // Check if all stages are now completed
  const allCompleted = updatedStages.length > 0 && updatedStages.every(s => s.status === 'completed' || s.status === 'skipped');
  let targetOrderStatus = order.status;
  if (allCompleted && order.status !== 'completed') {
    targetOrderStatus = 'completed';
  } else if (newStatus === 'in_progress' && order.status === 'assigned') {
    targetOrderStatus = 'in_progress';
  }

  const auditEntry: WorkOrderAuditEntry = {
    id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    action: 'STAGE_UPDATED',
    actionTitle: `Stage ${stage.sequence}: ${stage.name} -> ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
    description: `Stage ${stage.sequence} (${stage.name}) status transitioned from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()}.${notes ? ` Remarks: "${notes}"` : ''}${allCompleted ? ' All stages completed; Work Order marked as COMPLETED.' : ''}`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    metadata: {
      stageId: stage.id,
      stageSequence: stage.sequence,
      stageName: stage.name,
      oldStatus,
      newStatus
    }
  };

  orders[orderIndex] = {
    ...order,
    status: targetOrderStatus,
    stages: updatedStages,
    updatedAt: nowIso,
    auditTrail: [auditEntry, ...(order.auditTrail || [])]
  };

  saveWorkflowWorkOrders(orders);

  // PHASE 8: Invoke Workflow Stage Automation Engine for stage transitions
  try {
    executeWorkflowStageAutomation({
      order: orders[orderIndex],
      stage: updatedStage,
      oldStatus,
      newStatus,
      performedBy
    }).catch(err => {
      console.warn('[Workflow Automation] Async dispatch warning:', err);
    });
  } catch (automationErr) {
    console.warn('[Workflow Automation] Engine invocation error:', automationErr);
  }

  return { success: true, workOrder: orders[orderIndex] };
}

/**
 * Toggles a stage checklist item.
 */
export function toggleWorkOrderStageChecklist(
  orderId: string,
  stageId: string,
  checklistId: string,
  completed: boolean,
  performedBy: { id: string; name: string; role?: string }
): boolean {
  const orders = getWorkflowWorkOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return false;

  const order = orders[orderIndex];
  const stageIndex = order.stages.findIndex(s => s.id === stageId);
  if (stageIndex === -1) return false;

  const stage = order.stages[stageIndex];
  const itemIndex = stage.checklist.findIndex(c => c.id === checklistId);
  if (itemIndex === -1) return false;

  const nowIso = new Date().toISOString();
  const updatedChecklist = [...stage.checklist];
  const item = updatedChecklist[itemIndex];

  updatedChecklist[itemIndex] = {
    ...item,
    completed,
    completedAt: completed ? nowIso : undefined,
    completedBy: completed ? performedBy.name : undefined
  };

  const updatedStages = [...order.stages];
  updatedStages[stageIndex] = {
    ...stage,
    checklist: updatedChecklist
  };

  const auditEntry: WorkOrderAuditEntry = {
    id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    action: 'STAGE_CHECKLIST_TOGGLED',
    actionTitle: `Checklist ${completed ? 'Completed' : 'Reset'}: ${item.title}`,
    description: `Stage ${stage.sequence} item "${item.title}" marked as ${completed ? 'Completed' : 'Pending'}.`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    }
  };

  orders[orderIndex] = {
    ...order,
    stages: updatedStages,
    updatedAt: nowIso,
    auditTrail: [auditEntry, ...(order.auditTrail || [])]
  };

  saveWorkflowWorkOrders(orders);
  return true;
}
