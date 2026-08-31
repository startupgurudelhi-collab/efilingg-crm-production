/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Task Assignment WhatsApp Intimation Dispatcher
 * Automatically notifies assigned employees via WhatsApp when a new compliance or operational task is assigned.
 */

import { Employee } from '../types';
import { getEmployees, getCurrentSession } from './db';
import { V2Task } from './v2_db';

export interface TaskNotificationPayload {
  taskTitle: string;
  taskDescription?: string;
  assignedToId: string;
  assignedToName?: string;
  assigneePhone?: string;
  createdById?: string;
  createdByName?: string;
  priority?: string;
  clientName?: string;
  dueDate?: string;
}

/**
 * Formats name with clean professional salutation
 */
export function formatSalutation(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Associate';
  return trimmed.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Adv\.|CA\.|CS\.)\s*/i, '');
}

/**
 * Formats the exact WhatsApp task intimation message matching approved Meta template task_assignment_v22
 */
export function formatTaskWhatsAppMessage(params: {
  assigneeName: string;
  creatorName: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: string;
  clientName?: string;
}): string {
  const recipientName = formatSalutation(params.assigneeName);
  const creatorName = formatSalutation(params.creatorName);

  // Normalize Priority
  let formattedPriority = 'HIGH';
  const rawPriority = (params.priority || '').toUpperCase();
  if (rawPriority.includes('CRIT') || rawPriority.includes('URG')) {
    formattedPriority = 'URGENT';
  } else if (rawPriority.includes('LOW')) {
    formattedPriority = 'LOW';
  } else if (rawPriority.includes('MED')) {
    formattedPriority = 'MEDIUM';
  } else {
    formattedPriority = 'HIGH';
  }

  // Build clean task details
  let details = params.taskTitle.trim();
  if (params.clientName && !details.toLowerCase().includes(params.clientName.toLowerCase())) {
    details = `${details} (${params.clientName})`;
  }
  if (params.taskDescription && params.taskDescription.trim()) {
    const cleanDesc = params.taskDescription
      .replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW|URGENT)\]\s*/i, '')
      .replace(/^Category:\s*[^;\n]+/i, '')
      .trim();
    if (cleanDesc && !details.includes(cleanDesc)) {
      details = `${details} - ${cleanDesc}`;
    }
  }

  return `Dear Mr. ${recipientName},

Mr. ${creatorName} has assigned a task for you, kindly complete within the time limit.

Task Details: ${details}
Priority: ${formattedPriority}

If task completed, then Mark as Done in your CRM.`;
}

/**
 * Dispatches WhatsApp Notification to the assigned employee(s) using Meta-Approved Template task_assignment_v22
 */
export async function dispatchTaskWhatsAppNotification(
  payload: TaskNotificationPayload
): Promise<{ success: boolean; dispatchedCount: number; recipientPhones?: string[]; errors?: string[]; details?: any[] }> {
  try {
    const allEmployees = getEmployees();
    const currentSession = getCurrentSession();

    const creatorName =
      payload.createdByName ||
      currentSession?.name ||
      (payload.createdById ? allEmployees.find(e => e.id === payload.createdById)?.name : 'Master Admin') ||
      'Master Admin';

    // Determine target recipients
    interface TargetRecipient {
      name: string;
      phone: string;
      employeeId?: string;
    }

    let targetRecipients: TargetRecipient[] = [];

    // If direct phone is explicitly passed
    if (payload.assigneePhone && payload.assigneePhone.replace(/\D/g, '').length >= 10) {
      targetRecipients.push({
        name: payload.assignedToName || 'Associate',
        phone: payload.assigneePhone.replace(/\D/g, ''),
        employeeId: payload.assignedToId,
      });
    } else if (payload.assignedToId === 'ALL' || !payload.assignedToId) {
      // Notify all active operations staff
      const activeStaff = allEmployees.filter(
        e => e.status === 'active' && e.mobile && e.mobile.replace(/\D/g, '').length >= 10
      );
      targetRecipients = activeStaff.map(e => ({
        name: e.name,
        phone: e.mobile.replace(/\D/g, ''),
        employeeId: e.id,
      }));
    } else {
      const matched = allEmployees.find(
        e =>
          e.id === payload.assignedToId ||
          (e.employeeCode && e.employeeCode.toLowerCase() === payload.assignedToId.toLowerCase()) ||
          (e.name && e.name.toLowerCase() === payload.assignedToId.toLowerCase()) ||
          (payload.assignedToName && e.name.toLowerCase() === payload.assignedToName.toLowerCase())
      );
      if (matched && matched.mobile && matched.mobile.replace(/\D/g, '').length >= 10) {
        targetRecipients.push({
          name: matched.name,
          phone: matched.mobile.replace(/\D/g, ''),
          employeeId: matched.id,
        });
      }
    }

    if (targetRecipients.length === 0) {
      console.warn(
        `[Task WhatsApp Dispatch] No valid phone number found for assignee "${payload.assignedToName || payload.assignedToId}". Intimation skipped.`
      );
      return { success: false, dispatchedCount: 0, errors: ['No active mobile number found for employee.'] };
    }

    let sentCount = 0;
    const errors: string[] = [];
    const dispatchedPhones: string[] = [];
    const detailsList: any[] = [];

    for (const recipient of targetRecipients) {
      let cleanPhone = recipient.phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }

      try {
        console.log(`[Task WhatsApp Dispatch] Sending approved template task_assignment_v22 to ${recipient.name} (${cleanPhone})...`);
        const response = await fetch('/api/v2/whatsapp/send-task-intimation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneePhone: cleanPhone,
            assigneeName: recipient.name,
            creatorName,
            taskTitle: payload.taskTitle,
            taskDescription: payload.taskDescription,
            priority: payload.priority || 'High',
            clientName: payload.clientName,
            senderId: currentSession?.id || 'EMP-ADMIN',
          }),
        });

        const resJson = await response.json().catch(() => ({}));
        if (response.ok && resJson.success) {
          sentCount++;
          dispatchedPhones.push(cleanPhone);
          detailsList.push(resJson);
          console.log(`[Task WhatsApp Sent] Successfully sent task intimation WhatsApp (task_assignment_v22) to ${recipient.name} (${cleanPhone}).`);
        } else {
          console.warn(`[Task WhatsApp Warning] Failed to send intimation to ${recipient.name}:`, resJson);
          errors.push(`${recipient.name}: ${resJson.error || resJson.message?.providerErrorMessage || 'Dispatch error'}`);
        }
      } catch (err: any) {
        console.error(`[Task WhatsApp Error] Network failure sending to ${recipient.name}:`, err);
        errors.push(`${recipient.name}: ${err.message}`);
      }
    }

    return {
      success: sentCount > 0,
      dispatchedCount: sentCount,
      recipientPhones: dispatchedPhones,
      errors: errors.length > 0 ? errors : undefined,
      details: detailsList,
    };
  } catch (error: any) {
    console.error('[Task WhatsApp Dispatch Error]:', error);
    return { success: false, dispatchedCount: 0, errors: [error.message] };
  }
}
