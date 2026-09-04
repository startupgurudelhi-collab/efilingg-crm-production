import {
  WorkflowClient,
  getWorkflowClients,
  saveWorkflowClients,
  generateWorkflowClientId,
  appendClientAuditEntry,
  normalizePan,
  isValidPan,
  isValidGstin,
  checkClientDuplicates
} from './workflowClients';
import {
  WorkflowWorkOrder,
  getWorkflowWorkOrders,
  saveWorkflowWorkOrders,
  generateNextWorkOrderId,
  PREDEFINED_WORKFLOW_SERVICES,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderAuditEntry
} from './workflowWorkOrders';
import {
  WorkflowTemplate,
  WorkOrderStage,
  getWorkflowTemplateForService,
  getWorkflowTemplateById,
  instantiateStagesFromTemplate
} from './workflowTemplates';
import {
  getLeads,
  saveLeads,
  writeLeadHistory,
  writeActivityLog,
  getEmployeeById,
  createNotification
} from './db';
import { Lead } from '../types';

/**
 * Normalizes a phone number to the last 10 digits.
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Checks if a Client already exists for a given Lead by:
 * 1. Previously converted lead ID link (convertedFromLeadId)
 * 2. PAN match (if valid 10-char PAN is provided)
 * 3. Normalized 10-digit mobile number match
 * 4. Case-insensitive email match
 */
export function findExistingClientForLead(
  lead: Partial<Lead> & { id: string }
): WorkflowClient | null {
  const clients = getWorkflowClients();
  const leadMobileNorm = normalizePhone(lead.mobile || '');
  const leadEmailNorm = (lead.email || '').trim().toLowerCase();

  // Check 1: Direct link from past conversion
  const byLeadId = clients.find(c => c.convertedFromLeadId === lead.id);
  if (byLeadId) return byLeadId;

  // Check 2: Mobile number match
  if (leadMobileNorm && leadMobileNorm.length === 10) {
    const byMobile = clients.find(c => normalizePhone(c.mobile) === leadMobileNorm);
    if (byMobile) return byMobile;
  }

  // Check 3: Email match
  if (leadEmailNorm && leadEmailNorm.includes('@')) {
    const byEmail = clients.find(c => c.email.trim().toLowerCase() === leadEmailNorm);
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Retrieves all existing Work Orders linked to a Client.
 */
export function getWorkOrdersForClient(clientId: string): WorkflowWorkOrder[] {
  const allOrders = getWorkflowWorkOrders();
  return allOrders.filter(o => o.clientId === clientId);
}

/**
 * Retrieves any existing Work Order linked to a specific Lead.
 */
export function getWorkOrderForLead(leadId: string): WorkflowWorkOrder | null {
  const allOrders = getWorkflowWorkOrders();
  return allOrders.find(o => o.leadId === leadId) || null;
}

export interface ClientEnrollmentData {
  clientName: string;
  mobile: string;
  email: string;
  pan?: string;
  gstin?: string;
  address?: string;
  clientCategory?: string;
  assignedManagerId: string;
  assignedManagerName: string;
}

export interface WorkOrderCreationData {
  service: string;
  serviceCode?: string;
  templateId?: string;
  customStages?: WorkOrderStage[];
  ownerId: string;
  ownerName: string;
  department?: string;
  priority?: WorkOrderPriority;
  startDate?: string;
  dueDate?: string;
  remarks?: string;
  estimatedFee?: number;
}

export interface LeadToWorkflowConversionPayload {
  lead: Lead;
  // If true, forces use of existing client if found
  existingClientId?: string;
  // Data for client enrollment (used if creating new client or updating)
  clientData: ClientEnrollmentData;
  // Data for work order generation
  workOrderData: WorkOrderCreationData;
  // Actor performing the conversion
  performedBy: {
    id: string;
    name: string;
    role?: string;
  };
}

export interface LeadToWorkflowConversionResult {
  success: boolean;
  client?: WorkflowClient;
  workOrder?: WorkflowWorkOrder;
  lead?: Lead;
  isExistingClient: boolean;
  errorMessage?: string;
}

/**
 * PHASE 4 CORE AUTOMATION:
 * When Lead Status changes to CONVERTED:
 * 1. Open Enrollment Wizard (handled by UI via callback/modal)
 * 2. Create Client if not existing
 * 3. If Client already exists: Ask "Create New Work Order?" (handled by wizard UI, confirmed via payload)
 * 4. Create Work Order
 * 5. Load Service Workflow Template
 * 6. Assign Work Owner
 * 7. Permanently Link Lead + Client + Work Order
 */
export function executeLeadToWorkflowConversion(
  payload: LeadToWorkflowConversionPayload
): LeadToWorkflowConversionResult {
  const { lead, existingClientId, clientData, workOrderData, performedBy } = payload;
  const nowIso = new Date().toISOString();

  try {
    const allClients = getWorkflowClients();
    let targetClient: WorkflowClient | null = null;
    let isExisting = false;

    // STEP 2 & 3: Check if Client already exists
    if (existingClientId) {
      targetClient = allClients.find(c => c.id === existingClientId) || null;
      if (targetClient) {
        isExisting = true;
      }
    }

    if (!targetClient) {
      const detected = findExistingClientForLead(lead);
      if (detected) {
        targetClient = detected;
        isExisting = true;
      }
    }

    // If Client does not exist, create a new Client
    if (!targetClient) {
      if (!clientData.clientName || !clientData.clientName.trim()) {
        return { success: false, isExistingClient: false, errorMessage: 'Client business / individual name is required.' };
      }
      if (!clientData.mobile || !clientData.mobile.trim()) {
        return { success: false, isExistingClient: false, errorMessage: 'Client mobile number is required.' };
      }

      // PAN formatting & duplicate check
      const cleanPan = clientData.pan ? normalizePan(clientData.pan) : '';
      if (cleanPan && !isValidPan(cleanPan)) {
        return { success: false, isExistingClient: false, errorMessage: 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).' };
      }

      const dupCheck = checkClientDuplicates({
        pan: cleanPan,
        mobile: clientData.mobile,
        email: clientData.email
      });

      if (dupCheck.hasDuplicate) {
        return { success: false, isExistingClient: false, errorMessage: dupCheck.errorMessage || 'Duplicate client detected.' };
      }

      // Generate sequential Client ID: CL-{YEAR}-{SEQUENCE}
      const newClientId = generateWorkflowClientId();

      const newClientAudit: any = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: nowIso,
        action: 'LEAD_CONVERSION',
        actionTitle: `Enrolled via Lead Conversion (${newClientId})`,
        description: `Client enrolled from Sales Lead #${lead.id} (${lead.customerName}). Managed by ${clientData.assignedManagerName}. Enrolled by ${performedBy.name}.`,
        performedBy: {
          id: performedBy.id,
          name: performedBy.name,
          role: performedBy.role
        },
        metadata: {
          leadId: lead.id,
          leadCustomerName: lead.customerName,
          leadBusinessName: lead.businessName,
          leadSource: lead.leadSource
        }
      };

      const freshClient: WorkflowClient = {
        id: newClientId,
        clientName: clientData.clientName.trim(),
        mobile: clientData.mobile.trim(),
        email: (clientData.email || '').trim().toLowerCase(),
        pan: cleanPan,
        gstin: (clientData.gstin || '').trim().toUpperCase(),
        address: (clientData.address || '').trim(),
        clientCategory: (clientData.clientCategory as any) || 'Private Limited Company',
        source: 'Lead Conversion',
        assignedManagerId: clientData.assignedManagerId || performedBy.id,
        assignedManagerName: clientData.assignedManagerName || performedBy.name,
        status: 'active',
        enrollmentType: 'lead_conversion',
        convertedFromLeadId: lead.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: {
          id: performedBy.id,
          name: performedBy.name
        },
        auditTrail: [newClientAudit]
      };

      allClients.unshift(freshClient);
      saveWorkflowClients(allClients);
      targetClient = freshClient;
      isExisting = false;
    } else {
      // If client exists, ensure convertedFromLeadId is linked if not already set
      if (!targetClient.convertedFromLeadId) {
        targetClient.convertedFromLeadId = lead.id;
        targetClient.updatedAt = nowIso;
        saveWorkflowClients(allClients);
      }
    }

    // STEP 5: Resolve Service & Load Service Workflow Template
    const serviceName = workOrderData.service.trim();
    let serviceCode = (workOrderData.serviceCode || '').trim().toUpperCase();
    if (!serviceCode) {
      const predefined = PREDEFINED_WORKFLOW_SERVICES.find(
        s => s.name.toLowerCase() === serviceName.toLowerCase()
      );
      serviceCode = predefined ? predefined.code : 'WRK';
    }

    const template: WorkflowTemplate | null = workOrderData.templateId
      ? getWorkflowTemplateById(workOrderData.templateId)
      : getWorkflowTemplateForService(serviceName, serviceCode);

    const startDate = workOrderData.startDate || nowIso.split('T')[0];

    // Load stages automatically from template with dependencies and checklists
    let loadedStages: WorkOrderStage[] = [];
    if (workOrderData.customStages && workOrderData.customStages.length > 0) {
      loadedStages = workOrderData.customStages;
    } else if (template) {
      loadedStages = instantiateStagesFromTemplate(template, startDate);
    }

    // Calculate Due Date from template SLA if not provided
    let calculatedDueDate = workOrderData.dueDate;
    if (!calculatedDueDate) {
      const totalTatDays = template?.stages.reduce((acc, stg) => acc + (stg.expectedDurationDays || 1), 0) || 15;
      const dueD = new Date(startDate);
      dueD.setDate(dueD.getDate() + totalTatDays);
      calculatedDueDate = dueD.toISOString().split('T')[0];
    }

    // STEP 4: Generate sequential Work ID: {SERVICECODE}-{YEAR}-{SEQUENCE}
    const workOrderId = generateNextWorkOrderId(serviceCode);

    // STEP 6: Assign Work Owner & Department
    const ownerId = workOrderData.ownerId || lead.assignedTo || performedBy.id;
    const ownerName = workOrderData.ownerName || 'Unassigned Executive';
    const department = workOrderData.department || template?.department || 'Operations Command';
    const priority: WorkOrderPriority = workOrderData.priority || 'high';

    // Work Order Audit Log
    const initialWorkAudit: WorkOrderAuditEntry = {
      id: `WOA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      action: 'CREATED',
      actionTitle: `Work Order Created from Lead Conversion (${workOrderId})`,
      description: `Permanent linkage created: Sales Lead #${lead.id} (${lead.customerName}) converted into Client ${targetClient.id} and Work Order ${workOrderId} for service "${serviceName}". Loaded ${loadedStages.length} stages from template "${template?.serviceName || 'Standard'}". Assigned to ${ownerName} (${department}). Priority: ${priority.toUpperCase()}. Due Date: ${calculatedDueDate}.`,
      performedBy: {
        id: performedBy.id,
        name: performedBy.name,
        role: performedBy.role
      },
      metadata: {
        leadId: lead.id,
        leadCustomerName: lead.customerName,
        leadBusinessName: lead.businessName,
        clientId: targetClient.id,
        clientName: targetClient.clientName,
        templateId: template?.id,
        templateName: template?.serviceName,
        stagesCount: loadedStages.length
      }
    };

    const newWorkOrder: WorkflowWorkOrder = {
      id: workOrderId,
      clientId: targetClient.id,
      clientName: targetClient.clientName,
      clientMobile: targetClient.mobile,
      clientEmail: targetClient.email,
      clientPan: targetClient.pan,
      clientCategory: targetClient.clientCategory,
      service: serviceName,
      serviceCode,
      templateId: template?.id,
      stages: loadedStages,
      ownerId,
      ownerName,
      department,
      priority,
      startDate,
      dueDate: calculatedDueDate,
      status: 'assigned',
      remarks: workOrderData.remarks?.trim() || `Automated conversion from Sales Lead #${lead.id} (${lead.serviceRequired})`,
      estimatedFee: workOrderData.estimatedFee || 0,
      leadId: lead.id,
      leadCustomerName: lead.customerName,
      leadBusinessName: lead.businessName,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: {
        id: performedBy.id,
        name: performedBy.name
      },
      auditTrail: [initialWorkAudit]
    };

    // Save Work Order
    const allOrders = getWorkflowWorkOrders();
    allOrders.unshift(newWorkOrder);
    saveWorkflowWorkOrders(allOrders);

    // STEP 7: PERMANENT CROSS-LINKING
    // 7A: Append permanent audit link to Client
    appendClientAuditEntry(targetClient.id, {
      action: 'WORKFLOW_LINKED',
      actionTitle: `Work Order Linked from Lead #${lead.id} (${workOrderId})`,
      description: `Permanent triple-link established: Lead #${lead.id} converted into Client ${targetClient.id} and Work Order ${workOrderId} (${serviceName}). Assigned Work Owner: ${ownerName}.`,
      performedBy: {
        id: performedBy.id,
        name: performedBy.name,
        role: performedBy.role
      },
      metadata: {
        leadId: lead.id,
        workOrderId,
        service: serviceName,
        ownerId,
        ownerName
      }
    });

    // 7B: Update Lead permanently
    const leads = getLeads();
    const leadIdx = leads.findIndex(l => l.id === lead.id);
    let updatedLead: Lead = {
      ...lead,
      stage: 'Converted',
      linkedClientId: targetClient.id,
      linkedClientName: targetClient.clientName,
      linkedWorkOrderId: workOrderId,
      convertedAt: nowIso,
      notes: `${lead.notes || ''}\n[CONVERTED TO WORKFLOW - ${new Date().toLocaleDateString()}]: Permanently linked to Client ID ${targetClient.id} and Work Order ${workOrderId} (${serviceName}). Assigned Owner: ${ownerName} (${department}). Enrolled by ${performedBy.name}.`
    };

    if (leadIdx !== -1) {
      const oldStage = leads[leadIdx].stage;
      leads[leadIdx] = updatedLead;
      saveLeads(leads);

      // Write lead history record
      writeLeadHistory({
        leadId: lead.id,
        field: 'stage',
        oldValue: oldStage,
        newValue: `Converted (Linked: CL:${targetClient.id} | WO:${workOrderId})`,
        updatedBy: performedBy.id
      });
    }

    // 7C: Audit log and notification
    writeActivityLog(
      performedBy.id,
      performedBy.name,
      performedBy.role || 'executive',
      'Lead Converted to Workflow 🚀',
      `Lead ${lead.customerName} (#${lead.id}) permanently linked to Client ${targetClient.id} and Work Order ${workOrderId} (${serviceName}). Work owner: ${ownerName}.`
    );

    createNotification({
      title: 'Lead Converted to Workflow! 🎉',
      message: `Lead ${lead.customerName} (#${lead.id}) converted into Client ${targetClient.id} and Work Order ${workOrderId}.`,
      type: 'lead_converted',
      userId: 'EMP-ADMIN',
      link: `work-order-${workOrderId}`
    });

    return {
      success: true,
      client: targetClient,
      workOrder: newWorkOrder,
      lead: updatedLead,
      isExistingClient: isExisting
    };
  } catch (err: any) {
    console.error('Failed to execute lead to workflow conversion:', err);
    return {
      success: false,
      isExistingClient: false,
      errorMessage: err.message || 'An unexpected error occurred during lead-to-workflow conversion.'
    };
  }
}
