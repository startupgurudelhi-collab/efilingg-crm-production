/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorageString, setStorageString, getLeads, saveLeads, writeLeadHistory } from './db';
import {
  getV2Tasks,
  V2Task,
  getV2GstClients,
  getV2ItrClients,
  getV2McaClients,
  getV2TrustClients,
  getV2OtherServiceClients,
  getV2Trademarks,
  getV2DscClients
} from './v2_db';

export type ClientCategory =
  | 'Individual'
  | 'Sole Proprietorship'
  | 'Partnership Firm'
  | 'LLP (Limited Liability Partnership)'
  | 'Private Limited Company'
  | 'Public Limited Company'
  | 'Trust / Section 8 NGO'
  | 'Society'
  | 'HUF (Hindu Undivided Family)'
  | 'Other Enterprise';

export const CLIENT_CATEGORIES: ClientCategory[] = [
  'Individual',
  'Sole Proprietorship',
  'Partnership Firm',
  'LLP (Limited Liability Partnership)',
  'Private Limited Company',
  'Public Limited Company',
  'Trust / Section 8 NGO',
  'Society',
  'HUF (Hindu Undivided Family)',
  'Other Enterprise'
];

export const CLIENT_SOURCES = [
  'Manual Direct',
  'Lead Conversion',
  'Website Inquiry',
  'Referral / CA Network',
  'Inbound Phone Call',
  'WhatsApp Official',
  'Walk-in Client',
  'Corporate Partner',
  'Social Media Campaign'
];

export type WorkflowAuditAction =
  | 'MANUAL_ENROLLMENT'
  | 'LEAD_CONVERSION'
  | 'CLIENT_UPDATED'
  | 'MANAGER_REASSIGNED'
  | 'STATUS_CHANGED'
  | 'WORKFLOW_LINKED';

export interface WorkflowClientAuditEntry {
  id: string;
  timestamp: string; // ISO string
  action: WorkflowAuditAction;
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

export interface WorkflowClient {
  id: string; // Format: CL-{YEAR}-{SEQUENCE}, e.g. CL-2026-000001
  clientName: string;
  authorisedSignatoryName?: string;
  serviceRequired?: string;
  cataloguePrice?: number;
  finalQuotedAmount?: number;
  dateOfEnrollment?: string;
  whatsAppStatus?: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';
  mobile: string;
  email: string;
  pan: string; // 10-char Indian PAN (e.g. ABCDE1234F) or empty if omitted
  gstin?: string; // 15-char GSTIN
  address: string;
  clientCategory: ClientCategory;
  source: string;
  assignedManagerId: string;
  assignedManagerName: string;
  status: 'active' | 'inactive' | 'suspended';
  enrollmentType: 'manual' | 'lead_conversion';
  convertedFromLeadId?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy: {
    id: string;
    name: string;
  };
  auditTrail: WorkflowClientAuditEntry[];
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateField?: 'PAN' | 'Mobile' | 'Email';
  matchedClient?: WorkflowClient;
  errorMessage?: string;
}

const STORAGE_KEY_WORKFLOW_CLIENTS = 'efilingg_crm_workflow_clients';

/**
 * Normalizes an Indian PAN to 10 uppercase characters.
 */
export function normalizePan(pan: string): string {
  return (pan || '').trim().toUpperCase();
}

/**
 * Normalizes phone numbers to last 10 digits for accurate duplicate matching.
 */
export function normalizeMobile(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes email address for duplicate matching.
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Unified CRM Client Interface (Aggregates GST, Income Tax, MCA, NGO, and Other Clients)
 * Strictly excludes unconverted Sales & Marketing leads.
 */
export interface UnifiedCrmClient {
  id: string; // Unique Identifier (CL-..., GST-..., MCA-..., ITR-..., etc.)
  clientName: string;
  authorisedSignatoryName?: string;
  sourceModule: 'GST' | 'Income Tax' | 'MCA' | 'NGO' | 'Others' | 'Workflow';
  category: string;
  mobile: string;
  email: string;
  pan: string;
  gstin?: string;
  address: string;
  rawClient?: any;
}

/**
 * Initial Seed Workflow Clients - Kept clean with no sample/dummy clients
 */
const SEED_WORKFLOW_CLIENTS: WorkflowClient[] = [];

/**
 * Retrieve all workflow clients from storage
 * Automatically filters out any old sample dummy records.
 */
export function getWorkflowClients(): WorkflowClient[] {
  try {
    const raw = getStorageString(STORAGE_KEY_WORKFLOW_CLIENTS);
    if (!raw) {
      setStorageString(STORAGE_KEY_WORKFLOW_CLIENTS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove any previous dummy sample records
      const cleaned = parsed.filter(c =>
        c.clientName !== 'Apex Retails Corp' &&
        c.clientName !== 'Innogeek Technologies Pvt Ltd' &&
        c.clientName !== 'Prerna Education Foundation' &&
        c.clientName !== 'Apex Retails Pvt Ltd' &&
        c.clientName !== 'Horizon Tech Innovations LLP' &&
        c.clientName !== 'Bharat Logistics & Cargo'
      );
      if (cleaned.length !== parsed.length) {
        saveWorkflowClients(cleaned);
        return cleaned;
      }
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Failed to parse workflow clients:', err);
    return [];
  }
}

/**
 * Delete a Workflow Client permanently from storage
 */
export function deleteWorkflowClient(clientId: string): boolean {
  try {
    const clients = getWorkflowClients();
    const updated = clients.filter(c => c.id !== clientId);
    if (updated.length !== clients.length) {
      saveWorkflowClients(updated);
      window.dispatchEvent(new CustomEvent('efilingg_workflow_clients_updated'));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to delete workflow client:', err);
    return false;
  }
}

/**
 * Retrieve all clients across eFilingg CRM modules (GST, Income Tax, MCA, NGO, Others, Workflow)
 * Strictly excludes unconverted Sales & Marketing leads.
 */
export function getUnifiedCrmClients(): UnifiedCrmClient[] {
  const unified: UnifiedCrmClient[] = [];
  const seenKeys = new Set<string>();

  const registerClient = (item: UnifiedCrmClient) => {
    const dedupeKey = (item.pan && item.pan.length === 10 ? `PAN:${item.pan}` : `${item.sourceModule}:${item.id}`).toLowerCase();
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      unified.push(item);
    }
  };

  // 1. Enrolled Workflow Clients
  try {
    const workflowClients = getWorkflowClients();
    for (const c of workflowClients) {
      registerClient({
        id: c.id,
        clientName: c.clientName,
        authorisedSignatoryName: c.authorisedSignatoryName || c.clientName,
        sourceModule: 'Workflow',
        category: c.clientCategory || 'Workflow Client',
        mobile: c.mobile || '',
        email: c.email || '',
        pan: c.pan || '',
        gstin: c.gstin || '',
        address: c.address || '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading workflow clients:', err);
  }

  // 2. GST Clients (Operational GST module)
  try {
    const gstClients = getV2GstClients();
    for (const c of gstClients) {
      const name = c.clientName || c.firmName || 'GST Client';
      registerClient({
        id: c.id,
        clientName: name,
        authorisedSignatoryName: c.clientName,
        sourceModule: 'GST',
        category: c.clientType ? `${c.clientType} (GST)` : 'GST Registered Entity',
        mobile: c.clientMobile || '',
        email: c.clientEmail || '',
        pan: c.gstin && c.gstin.length >= 12 ? c.gstin.substring(2, 12) : '',
        gstin: c.gstin || '',
        address: c.clientAddress ? `${c.clientAddress}${c.clientState ? ', ' + c.clientState : ''}` : (c.clientState || ''),
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading GST clients:', err);
  }

  // 3. Income Tax / ITR Clients
  try {
    const itrClients = getV2ItrClients();
    for (const c of itrClients) {
      registerClient({
        id: c.id,
        clientName: c.taxpayerName,
        authorisedSignatoryName: c.taxpayerName,
        sourceModule: 'Income Tax',
        category: c.taxpayerType ? `${c.taxpayerType} (ITR)` : 'Income Tax Client',
        mobile: c.mobileNumber || '',
        email: c.emailId || '',
        pan: c.panNumber || '',
        address: c.address || '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading ITR clients:', err);
  }

  // 4. MCA / ROC Corporate Clients
  try {
    const mcaClients = getV2McaClients();
    for (const c of mcaClients) {
      registerClient({
        id: c.id,
        clientName: c.clientName,
        authorisedSignatoryName: c.directors?.[0]?.name || c.clientName,
        sourceModule: 'MCA',
        category: c.clientType ? `${c.clientType} (ROC)` : 'Corporate / ROC',
        mobile: c.clientMobile || c.directors?.[0]?.mobile || '',
        email: c.clientEmail || c.directors?.[0]?.email || '',
        pan: '',
        address: c.clientAddress ? `${c.clientAddress}${c.clientState ? ', ' + c.clientState : ''}` : (c.clientState || ''),
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading MCA clients:', err);
  }

  // 5. Trust / NGO Clients
  try {
    const trustClients = getV2TrustClients();
    for (const c of trustClients) {
      registerClient({
        id: c.id,
        clientName: c.entityName,
        authorisedSignatoryName: c.authSignatory || c.entityName,
        sourceModule: 'NGO',
        category: c.typeOfEntity ? `${c.typeOfEntity} (12A/80G NGO)` : 'Trust / Section 8 NGO',
        mobile: c.mobileNumber || '',
        email: c.emailId || '',
        pan: '',
        address: c.address || '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading Trust clients:', err);
  }

  // 6. Other Service Clients
  try {
    const otherClients = getV2OtherServiceClients();
    for (const c of otherClients) {
      registerClient({
        id: c.id,
        clientName: c.clientName,
        authorisedSignatoryName: c.clientName,
        sourceModule: 'Others',
        category: c.serviceAvailed || 'Other Compliance Service',
        mobile: c.mobileNumber || '',
        email: c.emailId || '',
        pan: '',
        address: c.address || '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading Other service clients:', err);
  }

  // 7. Trademark / IP Clients
  try {
    const tmClients = getV2Trademarks();
    for (const c of tmClients) {
      registerClient({
        id: c.id,
        clientName: `${c.clientName} [${c.brandName}]`,
        authorisedSignatoryName: c.clientName,
        sourceModule: 'Others',
        category: `Trademark Class ${c.classNumber || 'General'} (${c.stage})`,
        mobile: '',
        email: '',
        pan: '',
        address: '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading Trademark clients:', err);
  }

  // 8. DSC Clients
  try {
    const dscClients = getV2DscClients();
    for (const c of dscClients) {
      registerClient({
        id: c.id,
        clientName: `${c.clientName} (${c.firmName || 'Digital Signature'})`,
        authorisedSignatoryName: c.clientName,
        sourceModule: 'Others',
        category: `DSC (${c.issuerName || 'Prodigisgn'})`,
        mobile: '',
        email: '',
        pan: '',
        address: '',
        rawClient: c
      });
    }
  } catch (err) {
    console.warn('Error reading DSC clients:', err);
  }

  return unified;
}

/**
 * Ensures that a selected CRM client (e.g. from GST, ITR, MCA, NGO, Others)
 * is recorded in Workflow Clients so that Work Orders link seamlessly.
 */
export function ensureWorkflowClientForOrder(
  crmClient: UnifiedCrmClient,
  performedBy?: { id: string; name: string; role?: string }
): WorkflowClient {
  const existingClients = getWorkflowClients();
  const found = existingClients.find(
    c =>
      c.id === crmClient.id ||
      (crmClient.pan && c.pan && c.pan.length === 10 && c.pan.toUpperCase() === crmClient.pan.toUpperCase()) ||
      c.clientName.trim().toLowerCase() === crmClient.clientName.trim().toLowerCase()
  );
  if (found) {
    return found;
  }

  // Map category to a valid ClientCategory
  let mappedCategory: ClientCategory = 'Private Limited Company';
  const catLower = (crmClient.category || '').toLowerCase();
  if (catLower.includes('proprietor') || catLower.includes('individual')) {
    mappedCategory = 'Sole Proprietorship';
  } else if (catLower.includes('llp')) {
    mappedCategory = 'LLP (Limited Liability Partnership)';
  } else if (catLower.includes('partnership')) {
    mappedCategory = 'Partnership Firm';
  } else if (catLower.includes('trust') || catLower.includes('ngo') || catLower.includes('section 8')) {
    mappedCategory = 'Trust / Section 8 NGO';
  } else if (catLower.includes('society')) {
    mappedCategory = 'Society';
  } else if (catLower.includes('public')) {
    mappedCategory = 'Public Limited Company';
  } else if (catLower.includes('huf')) {
    mappedCategory = 'HUF (Hindu Undivided Family)';
  }

  const now = new Date().toISOString();
  const performer = performedBy || { id: 'EMP-SYS', name: 'System' };
  const clientId = crmClient.id.startsWith('CL-') ? crmClient.id : generateWorkflowClientId();

  const newClient: WorkflowClient = {
    id: clientId,
    clientName: crmClient.clientName,
    authorisedSignatoryName: crmClient.authorisedSignatoryName || crmClient.clientName,
    mobile: crmClient.mobile || '9999999999',
    email: crmClient.email || `${clientId.toLowerCase()}@client.efilingg.com`,
    pan: crmClient.pan || '',
    gstin: crmClient.gstin || '',
    address: crmClient.address || 'Address recorded on portal',
    clientCategory: mappedCategory,
    source: `eFilingg CRM (${crmClient.sourceModule})`,
    assignedManagerId: performer.id,
    assignedManagerName: performer.name,
    status: 'active',
    enrollmentType: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy: {
      id: performer.id,
      name: performer.name
    },
    auditTrail: [
      {
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'WORKFLOW_LINKED',
        actionTitle: `Linked from ${crmClient.sourceModule} CRM Portfolio`,
        description: `Client seamlessly integrated into Workflow Management from eFilingg ${crmClient.sourceModule} portfolio (Ref: ${crmClient.id}).`,
        performedBy: performer
      }
    ]
  };

  existingClients.unshift(newClient);
  saveWorkflowClients(existingClients);
  window.dispatchEvent(new CustomEvent('efilingg_workflow_clients_updated'));
  return newClient;
}

/**
 * Persist workflow clients to storage
 */
export function saveWorkflowClients(clients: WorkflowClient[]): void {
  try {
    setStorageString(STORAGE_KEY_WORKFLOW_CLIENTS, JSON.stringify(clients));
  } catch (err) {
    console.error('Failed to save workflow clients:', err);
  }
}

/**
 * Generate a sequential Client ID in format: CL-{YEAR}-{SEQUENCE}
 * Example: CL-2026-000001
 */
export function generateWorkflowClientId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const prefix = `CL-${currentYear}-`;
  const clients = getWorkflowClients();

  let maxSequence = 0;

  for (const client of clients) {
    if (client.id && client.id.startsWith(prefix)) {
      const seqStr = client.id.substring(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSequence) {
        maxSequence = seqNum;
      }
    }
  }

  const nextSequence = maxSequence + 1;
  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}

/**
 * Prevent duplicates by PAN, Mobile, and Email
 */
export function checkClientDuplicates(
  data: { pan?: string; mobile?: string; email?: string },
  excludeClientId?: string
): DuplicateCheckResult {
  const clients = getWorkflowClients();
  const targetPan = normalizePan(data.pan || '');
  const targetMobile = normalizeMobile(data.mobile || '');
  const targetEmail = normalizeEmail(data.email || '');

  for (const client of clients) {
    if (excludeClientId && client.id === excludeClientId) {
      continue;
    }

    // 1. Check PAN Duplicate (Exact match on normalized 10 characters)
    if (targetPan && targetPan.length >= 5 && normalizePan(client.pan) === targetPan) {
      return {
        hasDuplicate: true,
        duplicateField: 'PAN',
        matchedClient: client,
        errorMessage: `Duplicate PAN: A client with PAN "${targetPan}" is already registered (${client.id} - ${client.clientName}).`
      };
    }

    // 2. Check Mobile Duplicate (Match on last 10 digits)
    if (targetMobile && targetMobile.length === 10 && normalizeMobile(client.mobile) === targetMobile) {
      return {
        hasDuplicate: true,
        duplicateField: 'Mobile',
        matchedClient: client,
        errorMessage: `Duplicate Mobile: A client with Mobile number "${data.mobile}" is already registered (${client.id} - ${client.clientName}).`
      };
    }

    // 3. Check Email Duplicate (Case-insensitive trimmed match)
    if (targetEmail && normalizeEmail(client.email) === targetEmail) {
      return {
        hasDuplicate: true,
        duplicateField: 'Email',
        matchedClient: client,
        errorMessage: `Duplicate Email: A client with Email "${data.email}" is already registered (${client.id} - ${client.clientName}).`
      };
    }
  }

  return { hasDuplicate: false };
}

/**
 * Validate PAN format (5 uppercase letters, 4 digits, 1 uppercase letter)
 */
export function isValidPan(pan: string): boolean {
  const clean = normalizePan(pan);
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(clean);
}

/**
 * Validate GSTIN format (15 characters)
 */
export function isValidGstin(gstin: string): boolean {
  if (!gstin || !gstin.trim()) return true; // GSTIN is optional
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(clean);
}

export interface EnrollClientPayload {
  serviceRequired?: string;
  cataloguePrice?: number;
  finalQuotedAmount?: number;
  dateOfEnrollment?: string;
  authorisedSignatoryName?: string;
  clientName?: string;
  mobile: string;
  email: string;
  pan?: string;
  gstin?: string;
  address: string;
  clientCategory?: ClientCategory;
  source: string;
  assignedManagerId: string;
  assignedManagerName: string;
}

/**
 * Manual Client Enrollment
 */
export function enrollManualClient(
  payload: EnrollClientPayload,
  performedBy: { id: string; name: string; role?: string }
): WorkflowClient {
  // 1. Mandatory validation
  const effectiveName = (payload.authorisedSignatoryName || payload.clientName || '').trim();
  if (!effectiveName) {
    throw new Error('Authorised Signatory Name is required.');
  }
  if (!payload.mobile || !payload.mobile.trim()) {
    throw new Error('Mobile number is required.');
  }
  if (!payload.email || !payload.email.trim()) {
    throw new Error('Email address is required.');
  }
  if (!payload.address || !payload.address.trim()) {
    throw new Error('Address is required.');
  }

  const cleanPan = payload.pan ? normalizePan(payload.pan) : '';
  if (cleanPan && !isValidPan(cleanPan)) {
    throw new Error('Invalid PAN format. Standard format is 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).');
  }

  if (payload.gstin && payload.gstin.trim() && !isValidGstin(payload.gstin)) {
    throw new Error('Invalid GSTIN format. Standard format is 15 alphanumeric characters (e.g. 07AAAAA0000A1Z5).');
  }

  // 2. Strict Duplicate Prevention Check (PAN only checked if provided)
  const dupCheck = checkClientDuplicates({
    pan: cleanPan,
    mobile: payload.mobile,
    email: payload.email
  });

  if (dupCheck.hasDuplicate) {
    throw new Error(dupCheck.errorMessage || 'Duplicate client detected.');
  }

  // 3. Generate sequential Client ID: CL-{YEAR}-{SEQUENCE}
  const clientId = generateWorkflowClientId();
  const now = new Date().toISOString();

  // 4. Create Initial Audit Entry
  const initialAudit: WorkflowClientAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now,
    action: 'MANUAL_ENROLLMENT',
    actionTitle: `Client Enrolled (${clientId})`,
    description: `Manually enrolled into Workflow Management by ${performedBy.name} (${performedBy.role || 'Executive'}). Service: ${payload.serviceRequired || 'Standard'}. Signatory: ${effectiveName}. Quoted: ₹${payload.finalQuotedAmount ?? 0}. Date: ${payload.dateOfEnrollment || now.split('T')[0]}. Assigned Manager: ${payload.assignedManagerName}.`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    metadata: {
      source: payload.source,
      category: payload.clientCategory || 'Private Limited Company',
      pan: cleanPan,
      serviceRequired: payload.serviceRequired,
      cataloguePrice: payload.cataloguePrice,
      finalQuotedAmount: payload.finalQuotedAmount,
      dateOfEnrollment: payload.dateOfEnrollment,
      authorisedSignatoryName: effectiveName
    }
  };

  const newClient: WorkflowClient = {
    id: clientId,
    clientName: effectiveName,
    authorisedSignatoryName: effectiveName,
    serviceRequired: (payload.serviceRequired || '').trim(),
    cataloguePrice: payload.cataloguePrice,
    finalQuotedAmount: payload.finalQuotedAmount,
    dateOfEnrollment: payload.dateOfEnrollment,
    whatsAppStatus: 'PENDING',
    mobile: payload.mobile.trim(),
    email: payload.email.trim().toLowerCase(),
    pan: cleanPan,
    gstin: (payload.gstin || '').trim().toUpperCase(),
    address: (payload.address || '').trim(),
    clientCategory: payload.clientCategory || 'Private Limited Company',
    source: payload.source || 'Manual Direct',
    assignedManagerId: payload.assignedManagerId,
    assignedManagerName: payload.assignedManagerName,
    status: 'active',
    enrollmentType: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy: {
      id: performedBy.id,
      name: performedBy.name
    },
    auditTrail: [initialAudit]
  };

  const clients = getWorkflowClients();
  clients.unshift(newClient);
  saveWorkflowClients(clients);

  return newClient;
}

/**
 * Lead Conversion Enrollment
 */
export function enrollFromLeadConversion(
  leadId: string,
  payload: EnrollClientPayload,
  performedBy: { id: string; name: string; role?: string }
): WorkflowClient {
  // 1. Mandatory validation
  if (!payload.clientName || !payload.clientName.trim()) {
    throw new Error('Client Name is required.');
  }
  if (!payload.mobile || !payload.mobile.trim()) {
    throw new Error('Mobile number is required.');
  }
  if (!payload.email || !payload.email.trim()) {
    throw new Error('Email address is required.');
  }
  if (!payload.pan || !payload.pan.trim()) {
    throw new Error('PAN is required for enrollment.');
  }

  const cleanPan = normalizePan(payload.pan);
  if (!isValidPan(cleanPan)) {
    throw new Error('Invalid PAN format. Standard format is 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).');
  }

  if (payload.gstin && payload.gstin.trim() && !isValidGstin(payload.gstin)) {
    throw new Error('Invalid GSTIN format. Standard format is 15 alphanumeric characters.');
  }

  // 2. Strict Duplicate Prevention Check
  const dupCheck = checkClientDuplicates({
    pan: cleanPan,
    mobile: payload.mobile,
    email: payload.email
  });

  if (dupCheck.hasDuplicate) {
    throw new Error(dupCheck.errorMessage || 'Duplicate client detected.');
  }

  // 3. Generate sequential Client ID: CL-{YEAR}-{SEQUENCE}
  const clientId = generateWorkflowClientId();
  const now = new Date().toISOString();

  // 4. Create Audit Entry with Lead Reference
  const initialAudit: WorkflowClientAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now,
    action: 'LEAD_CONVERSION',
    actionTitle: `Lead Converted to Client (${clientId})`,
    description: `Successfully converted Sales Lead #${leadId} into Client ${clientId}. Managed by ${payload.assignedManagerName}. Enrolled by ${performedBy.name}.`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    metadata: {
      leadId,
      source: 'Lead Conversion',
      category: payload.clientCategory,
      pan: cleanPan
    }
  };

  const newClient: WorkflowClient = {
    id: clientId,
    clientName: payload.clientName.trim(),
    mobile: payload.mobile.trim(),
    email: payload.email.trim().toLowerCase(),
    pan: cleanPan,
    gstin: (payload.gstin || '').trim().toUpperCase(),
    address: (payload.address || '').trim(),
    clientCategory: payload.clientCategory,
    source: payload.source || 'Lead Conversion',
    assignedManagerId: payload.assignedManagerId,
    assignedManagerName: payload.assignedManagerName,
    status: 'active',
    enrollmentType: 'lead_conversion',
    convertedFromLeadId: leadId,
    createdAt: now,
    updatedAt: now,
    createdBy: {
      id: performedBy.id,
      name: performedBy.name
    },
    auditTrail: [initialAudit]
  };

  // 5. Update CRM Lead stage to "Converted" & add history
  try {
    const leads = getLeads();
    const existingIndex = leads.findIndex(l => l.id === leadId);
    if (existingIndex !== -1) {
      const oldStage = leads[existingIndex].stage;
      leads[existingIndex] = {
        ...leads[existingIndex],
        stage: 'Converted',
        notes: `${leads[existingIndex].notes || ''}\n[Client Enrolled]: Successfully converted to Workflow Client ID: ${clientId} on ${new Date().toLocaleDateString()}`
      };
      saveLeads(leads);
      writeLeadHistory({
        leadId,
        field: 'stage',
        oldValue: oldStage,
        newValue: 'Converted (Workflow Client Enrolled)',
        updatedBy: performedBy.name || performedBy.id
      });
    }
  } catch (leadErr) {
    console.warn('Failed to update CRM lead stage to converted:', leadErr);
  }

  const clients = getWorkflowClients();
  clients.unshift(newClient);
  saveWorkflowClients(clients);

  return newClient;
}

/**
 * Update an existing Workflow Client with complete change tracking and duplicate prevention
 */
export function updateWorkflowClient(
  clientId: string,
  updates: Partial<Omit<WorkflowClient, 'id' | 'createdAt' | 'createdBy' | 'auditTrail'>>,
  performedBy: { id: string; name: string; role?: string }
): WorkflowClient {
  const clients = getWorkflowClients();
  const idx = clients.findIndex(c => c.id === clientId);
  if (idx === -1) {
    throw new Error(`Client with ID ${clientId} not found.`);
  }

  const existing = clients[idx];

  // 1. If PAN, Mobile, or Email are being changed, re-validate duplicates
  const panToCheck = updates.pan !== undefined ? normalizePan(updates.pan) : existing.pan;
  const mobileToCheck = updates.mobile !== undefined ? updates.mobile : existing.mobile;
  const emailToCheck = updates.email !== undefined ? updates.email : existing.email;

  if (updates.pan && !isValidPan(panToCheck)) {
    throw new Error('Invalid PAN format.');
  }
  if (updates.gstin && updates.gstin.trim() && !isValidGstin(updates.gstin)) {
    throw new Error('Invalid GSTIN format.');
  }

  const dupCheck = checkClientDuplicates(
    {
      pan: panToCheck,
      mobile: mobileToCheck,
      email: emailToCheck
    },
    clientId
  );

  if (dupCheck.hasDuplicate) {
    throw new Error(dupCheck.errorMessage || 'Duplicate constraint violation.');
  }

  // 2. Track Field-Level Differences
  const changes: { field: string; fieldLabel: string; oldValue: any; newValue: any }[] = [];

  const fieldLabels: Record<string, string> = {
    clientName: 'Client Name',
    authorisedSignatoryName: 'Authorised Signatory Name',
    serviceRequired: 'Service Required',
    mobile: 'Mobile Number',
    email: 'Email Address',
    pan: 'PAN',
    gstin: 'GSTIN',
    address: 'Address',
    clientCategory: 'Client Category',
    source: 'Source',
    assignedManagerName: 'Assigned Manager',
    status: 'Account Status'
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    const k = key as keyof WorkflowClient;
    if (updates[k] !== undefined && updates[k] !== existing[k]) {
      changes.push({
        field: key,
        fieldLabel: label,
        oldValue: existing[k],
        newValue: updates[k]
      });
    }
  }

  if (changes.length === 0) {
    return existing; // No change needed
  }

  const now = new Date().toISOString();
  let actionType: WorkflowAuditAction = 'CLIENT_UPDATED';
  let actionTitle = 'Client Profile Updated';

  if (updates.assignedManagerId && updates.assignedManagerId !== existing.assignedManagerId) {
    actionType = 'MANAGER_REASSIGNED';
    actionTitle = `Manager Reassigned to ${updates.assignedManagerName}`;
  } else if (updates.status && updates.status !== existing.status) {
    actionType = 'STATUS_CHANGED';
    actionTitle = `Status Changed to ${updates.status.toUpperCase()}`;
  }

  const auditEntry: WorkflowClientAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now,
    action: actionType,
    actionTitle,
    description: `Updated by ${performedBy.name}: ${changes.map(c => `${c.fieldLabel} (${c.oldValue || 'None'} → ${c.newValue || 'None'})`).join(', ')}`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    changes
  };

  const updatedClient: WorkflowClient = {
    ...existing,
    ...updates,
    pan: panToCheck,
    updatedAt: now,
    auditTrail: [auditEntry, ...existing.auditTrail]
  };

  clients[idx] = updatedClient;
  saveWorkflowClients(clients);

  return updatedClient;
}

/**
 * Record a linked workflow task event on the Client's audit trail
 */
export function recordWorkflowLinkToClient(
  clientId: string,
  taskId: string,
  taskTitle: string,
  performedBy: { id: string; name: string; role?: string }
): void {
  const clients = getWorkflowClients();
  const idx = clients.findIndex(c => c.id === clientId);
  if (idx === -1) return;

  const client = clients[idx];
  const auditEntry: WorkflowClientAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    action: 'WORKFLOW_LINKED',
    actionTitle: 'Workflow Task Linked',
    description: `Workflow docket #${taskId} ("${taskTitle}") linked to Client ID ${clientId}.`,
    performedBy: {
      id: performedBy.id,
      name: performedBy.name,
      role: performedBy.role
    },
    metadata: {
      taskId,
      taskTitle
    }
  };

  client.auditTrail = [auditEntry, ...client.auditTrail];
  client.updatedAt = new Date().toISOString();
  saveWorkflowClients(clients);
}

/**
 * Append an arbitrary audit entry to a client's audit trail
 */
export function appendClientAuditEntry(
  clientId: string,
  entry: Omit<WorkflowClientAuditEntry, 'id' | 'timestamp'>
): void {
  const clients = getWorkflowClients();
  const idx = clients.findIndex(c => c.id === clientId);
  if (idx === -1) return;

  const client = clients[idx];
  const auditEntry: WorkflowClientAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  client.auditTrail = [auditEntry, ...(client.auditTrail || [])];
  client.updatedAt = new Date().toISOString();
  saveWorkflowClients(clients);
}

/**
 * Get all linked tasks for a specific client
 */
export function getClientLinkedTasks(clientId: string, clientName?: string): V2Task[] {
  const tasks = getV2Tasks();
  const targetName = (clientName || '').trim().toLowerCase();

  return tasks.filter(t => {
    if (t.clientId && t.clientId === clientId) return true;
    if (targetName && t.clientName && t.clientName.trim().toLowerCase() === targetName) return true;
    return false;
  });
}

/**
 * Flat aggregated firm-wide audit logs from all clients
 */
export function getAllWorkflowAuditLogs(): {
  clientId: string;
  clientName: string;
  audit: WorkflowClientAuditEntry;
}[] {
  const clients = getWorkflowClients();
  const logs: {
    clientId: string;
    clientName: string;
    audit: WorkflowClientAuditEntry;
  }[] = [];

  for (const client of clients) {
    if (Array.isArray(client.auditTrail)) {
      for (const entry of client.auditTrail) {
        logs.push({
          clientId: client.id,
          clientName: client.clientName,
          audit: entry
        });
      }
    }
  }

  // Sort newest first
  return logs.sort((a, b) => new Date(b.audit.timestamp).getTime() - new Date(a.audit.timestamp).getTime());
}
