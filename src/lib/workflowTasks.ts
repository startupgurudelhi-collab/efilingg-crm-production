/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorageString, setStorageString } from './db';
import { Employee } from '../types';
import { getWorkflowWorkOrders, WorkflowWorkOrder } from './workflowWorkOrders';
import { getWorkflowClients } from './workflowClients';

export type WorkflowTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkflowTaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export interface WorkflowTaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface WorkflowTaskActivity {
  id: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  action: string;
  comment?: string;
  previousPercentage?: number;
  newPercentage?: number;
  previousStatus?: WorkflowTaskStatus;
  newStatus?: WorkflowTaskStatus;
}

export interface WorkflowTask {
  id: string; // TSK-2026-000001
  title: string;
  description: string;
  priority: WorkflowTaskPriority;
  status: WorkflowTaskStatus;

  // Completion percentage - Task Creator must always see this!
  completionPercentage: number; // 0 - 100

  // SLA & Dates
  dueDate: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  completedAt?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String

  // Assigned To (Who is executing the task)
  assignedToId: string;
  assignedToName: string;
  assignedToDepartment?: string;
  assignedToRole?: string;
  assignedToAvatar?: string;

  // Task Creator (Who created / delegated the task)
  createdById: string;
  createdByName: string;
  createdByRole?: string;
  createdByDepartment?: string;

  // Delegation Metadata (For Managers monitoring delegated tasks)
  delegatedBy?: string; // Manager who delegated
  delegatedByName?: string;
  delegationNotes?: string;
  delegatedAt?: string;

  // Workflow Linkage: Work Order & Workflow Stage
  workOrderId?: string; // e.g. "PLC-2026-000001"
  workOrderService?: string; // e.g. "Private Limited Company Incorporation"
  stageId?: string; // e.g. "STG-1" or "PLC-S2"
  stageName?: string; // e.g. "Name Approval (RUN)"
  clientId?: string; // e.g. "CL-2026-000001"
  clientName?: string; // e.g. "TechNova Solutions Pvt Ltd"

  // Checklists & Activity
  checklist: WorkflowTaskChecklistItem[];
  activityLog: WorkflowTaskActivity[];
}

export const STORAGE_KEY_WORKFLOW_TASKS = 'efilingg_crm_workflow_tasks';
export const EVENT_TASKS_UPDATED = 'efilingg_workflow_tasks_updated';

// Helper to calculate SLA & Urgency
export function computeWorkflowTaskSLA(task: WorkflowTask): {
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'on_track' | 'completed';
  label: string;
  daysRemaining: number;
} {
  if (task.status === 'completed') {
    return { urgency: 'completed', label: 'Completed', daysRemaining: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      urgency: 'overdue',
      label: `${overdueDays}d Overdue`,
      daysRemaining: diffDays
    };
  } else if (diffDays === 0) {
    return {
      urgency: 'due_today',
      label: 'Due Today',
      daysRemaining: 0
    };
  } else if (diffDays <= 2) {
    return {
      urgency: 'due_soon',
      label: `${diffDays}d Left`,
      daysRemaining: diffDays
    };
  } else {
    return {
      urgency: 'on_track',
      label: `${diffDays}d Left`,
      daysRemaining: diffDays
    };
  }
}

// Generate sample initial tasks linked with existing Work Orders & Stages
function getInitialWorkflowTasks(): WorkflowTask[] {
  const workOrders = getWorkflowWorkOrders();
  const clients = getWorkflowClients();

  const plcOrder = workOrders.find(o => o.serviceCode === 'PLC') || workOrders[0];
  const gstOrder = workOrders.find(o => o.serviceCode === 'GST') || workOrders[1] || workOrders[0];
  const tmOrder = workOrders.find(o => o.serviceCode === 'TM') || workOrders[2] || workOrders[0];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const dueIn2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dueIn5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dueInYesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'TSK-2026-000001',
      title: 'Draft SPICe+ Part B & Director Declarations',
      description: 'Prepare final Memorandum of Association (MOA) and Articles of Association (AOA) annexures according to approved RUN name.',
      priority: 'high',
      status: 'in_progress',
      completionPercentage: 65,
      dueDate: dueIn2Days,
      startDate: todayStr,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToId: 'EMP-ADMIN',
      assignedToName: 'Master Admin',
      assignedToDepartment: 'MCA & Corporate Legal',
      assignedToRole: 'admin',
      createdById: 'EMP-001',
      createdByName: 'Vikas Sharma',
      createdByRole: 'Senior Associate',
      createdByDepartment: 'MCA & Corporate Legal',
      delegatedBy: 'EMP-001',
      delegatedByName: 'Vikas Sharma',
      delegationNotes: 'Please review clauses 3(a) carefully before attaching digital signatures.',
      workOrderId: plcOrder?.id || 'PLC-2026-000001',
      workOrderService: plcOrder?.service || 'Private Limited Company Incorporation',
      stageId: plcOrder?.stages?.[1]?.id || 'STG-2',
      stageName: plcOrder?.stages?.[1]?.name || 'SPICe+ Part B Drafting',
      clientId: plcOrder?.clientId || 'CL-2026-000001',
      clientName: plcOrder?.clientName || 'TechNova Solutions Pvt Ltd',
      checklist: [
        { id: 'CHK-1', title: 'Verify RUN Approval Letter reference', completed: true },
        { id: 'CHK-2', title: 'Draft Clause 3 Main Business Objects', completed: true },
        { id: 'CHK-3', title: 'Collect INC-9 Director declarations', completed: true },
        { id: 'CHK-4', title: 'Affix CA Digital Signature Token', completed: false }
      ],
      activityLog: [
        {
          id: 'ACT-1',
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-001',
          authorName: 'Vikas Sharma',
          action: 'CREATED_AND_DELEGATED',
          comment: 'Task delegated to Master Admin linked with Work Order PLC-2026-000001 Stage 2'
        },
        {
          id: 'ACT-2',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'PROGRESS_UPDATE',
          comment: 'Clause 3 drafted and INC-9 declarations obtained from directors.',
          previousPercentage: 25,
          newPercentage: 65,
          previousStatus: 'pending',
          newStatus: 'in_progress'
        }
      ]
    },
    {
      id: 'TSK-2026-000002',
      title: 'Aadhaar Biometric Authentication for Signatory',
      description: 'Follow up with primary authorized signatory regarding OTP or nearest GST Seva Kendra appointment link.',
      priority: 'urgent',
      status: 'pending',
      completionPercentage: 20,
      dueDate: todayStr,
      startDate: todayStr,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToId: 'EMP-002',
      assignedToName: 'Neha Verma',
      assignedToDepartment: 'GST Department',
      assignedToRole: 'team_leader',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdByRole: 'admin',
      createdByDepartment: 'Management',
      delegatedBy: 'EMP-ADMIN',
      delegatedByName: 'Master Admin',
      delegationNotes: 'Urgent: GST portal SLA expires tomorrow. Nudge client via WhatsApp or phone.',
      workOrderId: gstOrder?.id || 'GST-2026-000001',
      workOrderService: gstOrder?.service || 'GST Registration & Compliance',
      stageId: gstOrder?.stages?.[0]?.id || 'STG-1',
      stageName: gstOrder?.stages?.[0]?.name || 'Document Verification & Signatory KYC',
      clientId: gstOrder?.clientId || 'CL-2026-000002',
      clientName: gstOrder?.clientName || 'GreenLeaf Agro Industries',
      checklist: [
        { id: 'CHK-21', title: 'Verify Aadhaar-linked mobile active', completed: true },
        { id: 'CHK-22', title: 'Send GSTN Biometric Link to client', completed: false },
        { id: 'CHK-23', title: 'Confirm ARN generated in portal', completed: false }
      ],
      activityLog: [
        {
          id: 'ACT-21',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'DELEGATED_TASK',
          comment: 'Manager delegated task to Neha Verma with high SLA priority.'
        }
      ]
    },
    {
      id: 'TSK-2026-000003',
      title: 'Conduct Trademark Similarity Search Class 35 & 42',
      description: 'Generate comprehensive phonetic and visual similarity search report across TM classes 35 and 42 for brand clearance.',
      priority: 'medium',
      status: 'in_progress',
      completionPercentage: 80,
      dueDate: dueIn5Days,
      startDate: todayStr,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToId: 'EMP-003',
      assignedToName: 'Amit Gupta',
      assignedToDepartment: 'IP & Trademarks',
      assignedToRole: 'associate',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdByRole: 'admin',
      createdByDepartment: 'Management',
      delegatedBy: 'EMP-ADMIN',
      delegatedByName: 'Master Admin',
      delegationNotes: 'Ensure examination guidelines under Section 9 & 11 are cross-checked.',
      workOrderId: tmOrder?.id || 'TM-2026-000001',
      workOrderService: tmOrder?.service || 'Trademark Filing Class 35 & 42',
      stageId: tmOrder?.stages?.[0]?.id || 'STG-1',
      stageName: tmOrder?.stages?.[0]?.name || 'Pre-filing Search & Clearance',
      clientId: tmOrder?.clientId || 'CL-2026-000003',
      clientName: tmOrder?.clientName || 'Aura Health & Diagnostics LLP',
      checklist: [
        { id: 'CHK-31', title: 'Run exact match keyword query on IP India portal', completed: true },
        { id: 'CHK-32', title: 'Phonetic similarity check for prefixes', completed: true },
        { id: 'CHK-33', title: 'Compile PDF clearance summary report for client', completed: true },
        { id: 'CHK-34', title: 'Obtain client sign-off on Form TM-A', completed: false }
      ],
      activityLog: [
        {
          id: 'ACT-31',
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'DELEGATED_TASK',
          comment: 'Assigned to Amit Gupta.'
        },
        {
          id: 'ACT-32',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-003',
          authorName: 'Amit Gupta',
          action: 'PROGRESS_UPDATE',
          comment: 'Search report finalized. Sent to client for sign-off.',
          previousPercentage: 30,
          newPercentage: 80
        }
      ]
    },
    {
      id: 'TSK-2026-000004',
      title: 'Collect Electricity Bill & NOC for Registered Office',
      description: 'Obtain latest utility bill (not older than 2 months) and signed NOC from property owner for registered office address.',
      priority: 'urgent',
      status: 'pending',
      completionPercentage: 0,
      dueDate: dueInYesterday,
      startDate: todayStr,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToId: 'EMP-004',
      assignedToName: 'Priya Nair',
      assignedToDepartment: 'MCA & Corporate Legal',
      assignedToRole: 'associate',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdByRole: 'admin',
      createdByDepartment: 'Management',
      delegatedBy: 'EMP-ADMIN',
      delegatedByName: 'Master Admin',
      delegationNotes: 'Overdue task: Client delayed sending NOC. Need telephonic follow-up immediately.',
      workOrderId: plcOrder?.id || 'PLC-2026-000001',
      workOrderService: plcOrder?.service || 'Private Limited Company Incorporation',
      stageId: plcOrder?.stages?.[0]?.id || 'STG-1',
      stageName: plcOrder?.stages?.[0]?.name || 'Document Verification & KYC',
      clientId: plcOrder?.clientId || 'CL-2026-000001',
      clientName: plcOrder?.clientName || 'TechNova Solutions Pvt Ltd',
      checklist: [
        { id: 'CHK-41', title: 'Request utility bill from landlord', completed: false },
        { id: 'CHK-42', title: 'Prepare bilingual NOC draft', completed: false },
        { id: 'CHK-43', title: 'Verify municipal ward and pin code', completed: false }
      ],
      activityLog: [
        {
          id: 'ACT-41',
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'DELEGATED_TASK',
          comment: 'Task delegated to Priya Nair.'
        }
      ]
    },
    {
      id: 'TSK-2026-000005',
      title: 'Download MCA Certificate of Incorporation & PAN/TAN',
      description: 'Check MCA V3 portal for approval status. Download issued COI, PAN and TAN allotment letters and upload to client document vault.',
      priority: 'low',
      status: 'completed',
      completionPercentage: 100,
      dueDate: dueInYesterday,
      startDate: dueInYesterday,
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedToId: 'EMP-ADMIN',
      assignedToName: 'Master Admin',
      assignedToDepartment: 'MCA & Corporate Legal',
      assignedToRole: 'admin',
      createdById: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdByRole: 'admin',
      createdByDepartment: 'Management',
      workOrderId: plcOrder?.id || 'PLC-2026-000001',
      workOrderService: plcOrder?.service || 'Private Limited Company Incorporation',
      stageId: plcOrder?.stages?.[3]?.id || 'STG-4',
      stageName: plcOrder?.stages?.[3]?.name || 'Certificate of Incorporation & Post-Setup',
      clientId: plcOrder?.clientId || 'CL-2026-000001',
      clientName: plcOrder?.clientName || 'TechNova Solutions Pvt Ltd',
      checklist: [
        { id: 'CHK-51', title: 'Download digital COI with CIN', completed: true },
        { id: 'CHK-52', title: 'Download e-PAN and e-TAN letters', completed: true },
        { id: 'CHK-53', title: 'Notify client on completion', completed: true }
      ],
      activityLog: [
        {
          id: 'ACT-51',
          timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'CREATED_TASK',
          comment: 'Task created.'
        },
        {
          id: 'ACT-52',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          authorId: 'EMP-ADMIN',
          authorName: 'Master Admin',
          action: 'COMPLETED_TASK',
          comment: 'All deliverables downloaded and archived.',
          previousPercentage: 80,
          newPercentage: 100,
          previousStatus: 'in_progress',
          newStatus: 'completed'
        }
      ]
    }
  ];
}

// Retrieve all workflow tasks
export function getWorkflowTasks(): WorkflowTask[] {
  try {
    const raw = getStorageString(STORAGE_KEY_WORKFLOW_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading workflow tasks:', err);
  }

  // Seed default initial tasks
  const initial = getInitialWorkflowTasks();
  saveWorkflowTasks(initial);
  return initial;
}

// Save all workflow tasks
export function saveWorkflowTasks(tasks: WorkflowTask[]): void {
  try {
    setStorageString(STORAGE_KEY_WORKFLOW_TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(EVENT_TASKS_UPDATED, { detail: { count: tasks.length } }));
  } catch (err) {
    console.error('Error saving workflow tasks:', err);
  }
}

// Generate next unique task ID
export function generateNextWorkflowTaskId(): string {
  const tasks = getWorkflowTasks();
  const year = new Date().getFullYear();
  let maxSeq = 0;

  tasks.forEach(t => {
    const match = t.id.match(/^TSK-\d{4}-(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(6, '0');
  return `TSK-${year}-${nextSeq}`;
}

// Create new Workflow Task
export function createWorkflowTask(
  data: {
    title: string;
    description: string;
    priority: WorkflowTaskPriority;
    dueDate: string;
    startDate?: string;
    assignedToId: string;
    assignedToName: string;
    assignedToDepartment?: string;
    assignedToRole?: string;
    workOrderId?: string;
    workOrderService?: string;
    stageId?: string;
    stageName?: string;
    clientId?: string;
    clientName?: string;
    delegationNotes?: string;
    checklistTitles?: string[];
  },
  sessionUser: Employee
): WorkflowTask {
  const tasks = getWorkflowTasks();
  const newId = generateNextWorkflowTaskId();
  const now = new Date().toISOString();

  // Build checklist
  const checklist: WorkflowTaskChecklistItem[] = (data.checklistTitles || []).map((t, idx) => ({
    id: `CHK-${Date.now()}-${idx}`,
    title: t.trim(),
    completed: false
  }));

  const isDelegating = data.assignedToId !== sessionUser.id;

  const newTask: WorkflowTask = {
    id: newId,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: 'pending',
    completionPercentage: 0,
    dueDate: data.dueDate,
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    createdAt: now,
    updatedAt: now,
    assignedToId: data.assignedToId,
    assignedToName: data.assignedToName,
    assignedToDepartment: data.assignedToDepartment,
    assignedToRole: data.assignedToRole,
    createdById: sessionUser.id,
    createdByName: sessionUser.name,
    createdByRole: sessionUser.role,
    createdByDepartment: sessionUser.department,
    delegatedBy: isDelegating ? sessionUser.id : undefined,
    delegatedByName: isDelegating ? sessionUser.name : undefined,
    delegationNotes: data.delegationNotes,
    delegatedAt: isDelegating ? now : undefined,
    workOrderId: data.workOrderId,
    workOrderService: data.workOrderService,
    stageId: data.stageId,
    stageName: data.stageName,
    clientId: data.clientId,
    clientName: data.clientName,
    checklist,
    activityLog: [
      {
        id: `ACT-${Date.now()}-0`,
        timestamp: now,
        authorId: sessionUser.id,
        authorName: sessionUser.name,
        action: isDelegating ? 'TASK_DELEGATED' : 'TASK_CREATED',
        comment: isDelegating
          ? `Delegated to ${data.assignedToName}${data.workOrderId ? ` (Linked: ${data.workOrderId})` : ''}`
          : `Created self task${data.workOrderId ? ` (Linked: ${data.workOrderId})` : ''}`
      }
    ]
  };

  tasks.unshift(newTask);
  saveWorkflowTasks(tasks);
  return newTask;
}

// Update Workflow Task Progress (%)
export function updateWorkflowTaskProgress(
  taskId: string,
  newPercentage: number,
  sessionUser: Employee,
  comment?: string
): boolean {
  const tasks = getWorkflowTasks();
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return false;

  const task = tasks[idx];
  const oldPct = task.completionPercentage;
  const oldStatus = task.status;
  const clampedPct = Math.max(0, Math.min(100, Math.round(newPercentage)));

  let newStatus: WorkflowTaskStatus = task.status;
  if (clampedPct === 100) {
    newStatus = 'completed';
    task.completedAt = new Date().toISOString();
  } else if (clampedPct > 0 && task.status === 'pending') {
    newStatus = 'in_progress';
  }

  task.completionPercentage = clampedPct;
  task.status = newStatus;
  task.updatedAt = new Date().toISOString();

  task.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    authorId: sessionUser.id,
    authorName: sessionUser.name,
    action: 'PROGRESS_UPDATED',
    comment: comment || `Progress updated from ${oldPct}% to ${clampedPct}%`,
    previousPercentage: oldPct,
    newPercentage: clampedPct,
    previousStatus: oldStatus,
    newStatus
  });

  saveWorkflowTasks(tasks);
  return true;
}

export const updateWorkflowTaskCompletion = updateWorkflowTaskProgress;

// Update Workflow Task Status
export function updateWorkflowTaskStatus(
  taskId: string,
  newStatus: WorkflowTaskStatus,
  sessionUser: Employee,
  comment?: string
): boolean {
  const tasks = getWorkflowTasks();
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return false;

  const task = tasks[idx];
  const oldStatus = task.status;
  const oldPct = task.completionPercentage;

  task.status = newStatus;
  task.updatedAt = new Date().toISOString();

  if (newStatus === 'completed') {
    task.completionPercentage = 100;
    task.completedAt = new Date().toISOString();
    // Also complete all checklists
    task.checklist.forEach(c => {
      c.completed = true;
      c.completedAt = new Date().toISOString();
      c.completedBy = sessionUser.name;
    });
  } else if (newStatus === 'pending' && oldPct === 100) {
    task.completionPercentage = 0;
    task.completedAt = undefined;
  }

  task.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    authorId: sessionUser.id,
    authorName: sessionUser.name,
    action: 'STATUS_CHANGED',
    comment: comment || `Status shifted from ${oldStatus} to ${newStatus}`,
    previousStatus: oldStatus,
    newStatus,
    previousPercentage: oldPct,
    newPercentage: task.completionPercentage
  });

  saveWorkflowTasks(tasks);
  return true;
}

// Toggle Checklist Item and optionally auto-adjust %
export function toggleWorkflowTaskChecklist(
  taskId: string,
  checklistItemId: string,
  completed: boolean,
  sessionUser: Employee
): boolean {
  const tasks = getWorkflowTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;

  const item = task.checklist.find(c => c.id === checklistItemId);
  if (!item) return false;

  item.completed = completed;
  item.completedAt = completed ? new Date().toISOString() : undefined;
  item.completedBy = completed ? sessionUser.name : undefined;

  // Recalculate completion % based on checklist items if present
  if (task.checklist.length > 0) {
    const doneCount = task.checklist.filter(c => c.completed).length;
    const computedPct = Math.round((doneCount / task.checklist.length) * 100);
    const oldPct = task.completionPercentage;
    task.completionPercentage = computedPct;

    if (computedPct === 100) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    } else if (computedPct > 0 && task.status === 'pending') {
      task.status = 'in_progress';
    }

    task.activityLog.unshift({
      id: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      authorId: sessionUser.id,
      authorName: sessionUser.name,
      action: 'CHECKLIST_TOGGLED',
      comment: `${completed ? 'Completed' : 'Unchecked'} "${item.title}". Progress auto-calculated to ${computedPct}%`,
      previousPercentage: oldPct,
      newPercentage: computedPct
    });
  }

  task.updatedAt = new Date().toISOString();
  saveWorkflowTasks(tasks);
  return true;
}

// Add Checklist item
export function addWorkflowTaskChecklistItem(
  taskId: string,
  title: string,
  sessionUser: Employee
): boolean {
  const tasks = getWorkflowTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;

  task.checklist.push({
    id: `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: title.trim(),
    completed: false
  });

  // Re-weigh completion %
  const doneCount = task.checklist.filter(c => c.completed).length;
  task.completionPercentage = Math.round((doneCount / task.checklist.length) * 100);
  task.updatedAt = new Date().toISOString();

  saveWorkflowTasks(tasks);
  return true;
}

// Reassign Task (Manager delegation or transfer)
export function reassignWorkflowTask(
  taskId: string,
  newAssigneeId: string,
  newAssigneeName: string,
  sessionUser: Employee,
  notes?: string
): boolean {
  const tasks = getWorkflowTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;

  const prevAssigneeName = task.assignedToName;
  task.assignedToId = newAssigneeId;
  task.assignedToName = newAssigneeName;
  task.delegatedBy = sessionUser.id;
  task.delegatedByName = sessionUser.name;
  task.delegatedAt = new Date().toISOString();
  if (notes) task.delegationNotes = notes;
  task.updatedAt = new Date().toISOString();

  task.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    authorId: sessionUser.id,
    authorName: sessionUser.name,
    action: 'TASK_REASSIGNED',
    comment: `Reassigned from ${prevAssigneeName} to ${newAssigneeName}. ${notes ? `Note: ${notes}` : ''}`
  });

  saveWorkflowTasks(tasks);
  return true;
}

// Delete Task
export function deleteWorkflowTask(taskId: string): boolean {
  const tasks = getWorkflowTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  if (filtered.length === tasks.length) return false;
  saveWorkflowTasks(filtered);
  return true;
}

// Helper: Query tasks linked with a Work Order
export function getTasksForWorkOrder(workOrderId: string): WorkflowTask[] {
  const tasks = getWorkflowTasks();
  return tasks.filter(t => t.workOrderId === workOrderId);
}

// Helper: Query tasks linked with a Workflow Stage
export function getTasksForStage(workOrderId: string, stageId: string): WorkflowTask[] {
  const tasks = getWorkflowTasks();
  return tasks.filter(t => t.workOrderId === workOrderId && t.stageId === stageId);
}
