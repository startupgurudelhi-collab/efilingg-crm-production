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
  createdById?: string;
  createdByName?: string;
  priority?: string;
  clientName?: string;
  dueDate?: string;
}

/**
 * Formats name with respectful Indian professional salutation (e.g., Mr. / Ms.)
 */
export function formatSalutation(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Associate';
  if (/^(Mr\.|Ms\.|Mrs\.|Dr\.|Adv\.|CA\.|CS\.)\s/i.test(trimmed)) {
    return trimmed;
  }
  return `Mr. ${trimmed}`;
}

/**
 * Formats the exact WhatsApp task intimation message matching user specification
 */
export function formatTaskWhatsAppMessage(params: {
  assigneeName: string;
  creatorName: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: string;
  clientName?: string;
}): string {
  const recipientGreeting = formatSalutation(params.assigneeName);
  const creatorGreeting = formatSalutation(params.creatorName);

  // Normalize Priority
  let formattedPriority = 'Medium';
  const rawPriority = (params.priority || '').toLowerCase();
  if (rawPriority.includes('crit') || rawPriority.includes('urg') || rawPriority.includes('high')) {
    formattedPriority = 'High';
  } else if (rawPriority.includes('low')) {
    formattedPriority = 'Low';
  } else {
    formattedPriority = 'Medium';
  }

  // Build clean task details
  let details = params.taskTitle.trim();
  if (params.clientName && !details.toLowerCase().includes(params.clientName.toLowerCase())) {
    details = `${details} of ${params.clientName}`;
  }
  if (params.taskDescription && params.taskDescription.trim()) {
    const cleanDesc = params.taskDescription
      .replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW|URGENT)\]\s*/i, '')
      .replace(/^Category:\s*[^;\n]+/i, '')
      .trim();
    if (cleanDesc && !details.includes(cleanDesc)) {
      details = `${details} (${cleanDesc})`;
    }
  }

  return `Dear ${recipientGreeting} 

Urgent Notification

${creatorGreeting} has assign a task for you, kindly compile within the time limit.

task details: ${details}
Priority: ${formattedPriority}

If task completed, then Mark as Done in your crm.`;
}

/**
 * Dispatches WhatsApp Notification to the assigned employee(s)
 */
export async function dispatchTaskWhatsAppNotification(
  payload: TaskNotificationPayload
): Promise<{ success: boolean; dispatchedCount: number; errors?: string[] }> {
  try {
    const allEmployees = getEmployees();
    const currentSession = getCurrentSession();

    const creatorName =
      payload.createdByName ||
      currentSession?.name ||
      (payload.createdById ? allEmployees.find(e => e.id === payload.createdById)?.name : 'Master Admin') ||
      'Master Admin';

    // Determine target recipients
    let targetEmployees: Employee[] = [];

    if (payload.assignedToId === 'ALL' || !payload.assignedToId) {
      // Notify active operations staff
      targetEmployees = allEmployees.filter(
        e => e.status === 'active' && e.mobile && e.mobile.trim().length >= 10
      );
    } else {
      const matched = allEmployees.find(
        e =>
          e.id === payload.assignedToId ||
          (e.employeeCode && e.employeeCode.toLowerCase() === payload.assignedToId.toLowerCase()) ||
          (e.name && e.name.toLowerCase() === payload.assignedToId.toLowerCase()) ||
          (payload.assignedToName && e.name.toLowerCase() === payload.assignedToName.toLowerCase())
      );
      if (matched && matched.mobile && matched.mobile.trim().length >= 10) {
        targetEmployees = [matched];
      }
    }

    if (targetEmployees.length === 0) {
      console.warn(
        `[Task WhatsApp Dispatch] No valid phone number found for assignee "${payload.assignedToName || payload.assignedToId}". Intimation skipped.`
      );
      return { success: false, dispatchedCount: 0, errors: ['No active mobile number found for employee.'] };
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const emp of targetEmployees) {
      const cleanPhone = (emp.mobile || '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      try {
        const response = await fetch('/api/v2/whatsapp/send-task-intimation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneePhone: cleanPhone,
            assigneeName: emp.name,
            creatorName,
            taskTitle: payload.taskTitle,
            taskDescription: payload.taskDescription,
            priority: payload.priority || 'High',
            clientName: payload.clientName,
            senderId: currentSession?.id || 'EMP-ADMIN',
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`[Task WhatsApp Sent] Successfully sent task intimation WhatsApp to ${emp.name} (${cleanPhone}).`);
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[Task WhatsApp Warning] Failed to send intimation to ${emp.name}:`, errData);
          errors.push(`${emp.name}: ${errData.error || 'Dispatch error'}`);
        }
      } catch (err: any) {
        console.error(`[Task WhatsApp Error] Network failure sending to ${emp.name}:`, err);
        errors.push(`${emp.name}: ${err.message}`);
      }
    }

    return {
      success: sentCount > 0,
      dispatchedCount: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('[Task WhatsApp Dispatch Error]:', error);
    return { success: false, dispatchedCount: 0, errors: [error.message] };
  }
}
