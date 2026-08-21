/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Optimistic Concurrency Control (OCC) System
 * Protects critical master data from concurrent overwrite anomalies.
 * Modules protected: Services, Leads, Employees, Proposal Templates, Offer Letter Templates, Attendance.
 */

import { 
  ConcurrencyEntityType, 
  ConcurrencyConflict, 
  FieldDifference, 
  ConcurrencyAuditEntry,
  VersionedRecord 
} from '../types';

// Storage Key for Concurrency Conflict Audits
export const KEY_CONCURRENCY_AUDIT = 'efilingg_crm_concurrency_audit';

/**
 * Human-readable field labels for UI diffing
 */
const FIELD_LABELS: Record<string, string> = {
  name: 'Name / Title',
  customerName: 'Customer Name',
  mobile: 'Mobile Number',
  email: 'Email Address',
  businessName: 'Business Name',
  serviceRequired: 'Service Required',
  leadSource: 'Lead Source',
  stage: 'Lead Stage',
  notes: 'Notes / Remarks',
  assignedTo: 'Assigned Executive',
  price: 'Service Price (₹)',
  category: 'Service Category',
  timeline: 'Fulfillment Timeline',
  packagesIncluded: 'Included Packages',
  documentsRequired: 'Required Documents',
  scope: 'Scope of Work',
  deliverables: 'Deliverables',
  priceBreakup: 'Price Breakup',
  employeeIncentive: 'Employee Incentive (₹)',
  status: 'Status',
  designation: 'Designation',
  salary: 'Fixed Salary (₹)',
  allowances: 'Allowances (₹)',
  otherFixedAllowance: 'Other Fixed Allowance (₹)',
  department: 'Department',
  checkIn: 'Check-In Time',
  actualCheckIn: 'Actual Check-In Time',
  checkOut: 'Check-Out Time',
  deductSalary: 'Salary Deduction',
  reasonForChange: 'Reason for Modification',
  companyName: 'Company Name',
  tagline: 'Tagline',
  logoText: 'Logo Text',
  aboutHeading: 'About Heading',
  aboutText: 'About Description',
  termsAndConditions: 'Terms & Conditions',
  website: 'Website URL',
  supportEmail: 'Support Email',
  supportPhone1: 'Primary Phone',
  supportPhone2: 'Secondary Phone',
  officeAddress: 'Office Address',
  subject: 'Subject Line',
  salutationLine: 'Salutation',
  bodyParagraph1: 'Body Paragraph 1',
  bodyParagraph2: 'Body Paragraph 2',
  bodyParagraph3: 'Body Paragraph 3',
  bodyParagraph4: 'Body Paragraph 4',
  bodyParagraph5: 'Body Paragraph 5',
  closingHeading: 'Closing Heading',
  senderText: 'Sender Designation',
  signatoryName: 'Authorized Signatory Name',
  signatoryTitle: 'Authorized Signatory Title'
};

/**
 * Normalizes version number ensuring baseline >= 1
 */
export function normalizeVersion(record: VersionedRecord | null | undefined): number {
  if (!record || typeof record.version !== 'number' || isNaN(record.version) || record.version < 1) {
    return 1;
  }
  return Math.floor(record.version);
}

/**
 * Stamps a record with an incremented version, current ISO timestamp, and editor userId
 */
export function stampVersion<T extends VersionedRecord>(
  draft: T, 
  currentDbRecord: T | null | undefined, 
  userId: string,
  forcedVersion?: number
): T {
  const baseVersion = Math.max(normalizeVersion(draft), normalizeVersion(currentDbRecord));
  const newVersion = forcedVersion !== undefined ? forcedVersion : (baseVersion + 1);
  const nowIso = new Date().toISOString();

  return {
    ...draft,
    version: newVersion,
    updatedAt: nowIso,
    updatedBy: userId || 'EMP-ADMIN'
  };
}

/**
 * Detects differences between local draft and remote database record
 */
export function detectFieldDifferences(local: any, remote: any): FieldDifference[] {
  if (!local || !remote) return [];
  
  const differences: FieldDifference[] = [];
  const ignoredKeys = new Set(['version', 'updatedAt', 'updatedBy', 'modifiedAt', 'modifiedBy', 'id']);
  const allKeys = Array.from(new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]));

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;

    const localVal = local[key];
    const remoteVal = remote[key];

    const localStr = JSON.stringify(localVal !== undefined ? localVal : null);
    const remoteStr = JSON.stringify(remoteVal !== undefined ? remoteVal : null);

    if (localStr !== remoteStr) {
      differences.push({
        field: key,
        label: FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        localValue: localVal,
        remoteValue: remoteVal
      });
    }
  }

  return differences;
}

/**
 * Inspects whether saving `localDraft` over `remoteRecord` would cause a concurrent write conflict
 */
export function checkOptimisticConflict<T extends VersionedRecord>(
  localDraft: T,
  remoteRecord: T | null | undefined,
  entityType: ConcurrencyEntityType,
  entityId: string,
  entityName: string
): { hasConflict: boolean; differences: FieldDifference[]; localVersion: number; remoteVersion: number } {
  if (!remoteRecord) {
    // New record or first-time creation: no conflict
    return {
      hasConflict: false,
      differences: [],
      localVersion: normalizeVersion(localDraft),
      remoteVersion: 1
    };
  }

  const localVer = normalizeVersion(localDraft);
  const remoteVer = normalizeVersion(remoteRecord);

  // If remote version is strictly greater than local draft's known version, or timestamps indicate remote mutation
  const isVersionMismatch = remoteVer > localVer;
  
  if (isVersionMismatch) {
    const diffs = detectFieldDifferences(localDraft, remoteRecord);
    // If there are real structural differences between the two
    if (diffs.length > 0) {
      console.warn(`[OCC CONFLICT DETECTED] Entity: ${entityType} (${entityId} - ${entityName}). Local Version: v${localVer}, Server Version: v${remoteVer}. Changed fields: ${diffs.map(d => d.field).join(', ')}`);
      return {
        hasConflict: true,
        differences: diffs,
        localVersion: localVer,
        remoteVersion: remoteVer
      };
    }
  }

  return {
    hasConflict: false,
    differences: [],
    localVersion: localVer,
    remoteVersion: remoteVer
  };
}

/**
 * Merges local and remote fields according to user field-by-field choices
 */
export function mergeChanges<T extends VersionedRecord>(
  localDraft: T,
  remoteRecord: T,
  fieldResolutions: Record<string, 'local' | 'remote'>,
  updatedByUserId: string
): T {
  const merged: any = { ...remoteRecord };

  for (const [field, resolution] of Object.entries(fieldResolutions)) {
    if (resolution === 'local') {
      merged[field] = (localDraft as any)[field];
    } else {
      merged[field] = (remoteRecord as any)[field];
    }
  }

  const remoteVer = normalizeVersion(remoteRecord);
  const nextVer = remoteVer + 1;

  merged.version = nextVer;
  merged.updatedAt = new Date().toISOString();
  merged.updatedBy = updatedByUserId || 'EMP-ADMIN';

  return merged as T;
}

/**
 * Dispatches conflict event to the UI system
 */
type ConflictListener = (conflict: ConcurrencyConflict<any>) => void;
const conflictListeners = new Set<ConflictListener>();

export function subscribeToConcurrencyConflicts(listener: ConflictListener): () => void {
  conflictListeners.add(listener);
  return () => conflictListeners.delete(listener);
}

export function triggerConcurrencyConflictUI(conflict: ConcurrencyConflict<any>) {
  conflictListeners.forEach(listener => {
    try {
      listener(conflict);
    } catch (e) {
      console.error('[OCC UI Dispatcher] Error in conflict listener:', e);
    }
  });
}

/**
 * Logs a conflict audit record locally and to the backend server
 */
export async function logConcurrencyAudit(
  entry: Omit<ConcurrencyAuditEntry, 'id' | 'timestamp'>
): Promise<void> {
  const auditId = `OCC-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const fullEntry: ConcurrencyAuditEntry = {
    id: auditId,
    timestamp,
    ...entry
  };

  console.log(`[OCC AUDIT LOG] [${fullEntry.action}] Entity: ${fullEntry.entityType} (${fullEntry.entityId}) | Local v${fullEntry.localVersion} vs Server v${fullEntry.remoteVersion} | User: ${fullEntry.userName} (${fullEntry.userId}) | Details: ${fullEntry.details || 'N/A'}`);

  // 1. Store in client memory/localStorage
  try {
    const raw = localStorage.getItem(KEY_CONCURRENCY_AUDIT);
    let logs: ConcurrencyAuditEntry[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(logs)) logs = [];
    logs.unshift(fullEntry);
    if (logs.length > 500) logs = logs.slice(0, 500);
    localStorage.setItem(KEY_CONCURRENCY_AUDIT, JSON.stringify(logs));
  } catch (e) {
    console.warn('[OCC Audit] Local storage write warning:', e);
  }

  // 2. Transmit to server audit API endpoint
  try {
    await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: fullEntry.action,
        user: fullEntry.userName || fullEntry.userId,
        details: `[OCC ${fullEntry.action}] ${fullEntry.entityType} ${fullEntry.entityId} "${fullEntry.entityName || ''}" (Local v${fullEntry.localVersion} vs Remote v${fullEntry.remoteVersion}). ${fullEntry.details || ''}${fullEntry.resolvedFields ? ` Resolved fields: ${fullEntry.resolvedFields.join(', ')}` : ''}`
      })
    });
  } catch (apiErr) {
    console.warn('[OCC Audit] Remote audit API logging non-fatal warning:', apiErr);
  }
}

/**
 * Fetches all OCC audit logs
 */
export function getConcurrencyAuditLogs(): ConcurrencyAuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY_CONCURRENCY_AUDIT);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
