/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  WorkflowTask,
  WorkflowTaskPriority,
  WorkflowTaskStatus,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTaskProgress,
  updateWorkflowTaskStatus,
  toggleWorkflowTaskChecklist,
  addWorkflowTaskChecklistItem,
  reassignWorkflowTask,
  deleteWorkflowTask,
  computeWorkflowTaskSLA
} from '../../lib/workflowTasks';
import { getWorkflowWorkOrders, WorkflowWorkOrder } from '../../lib/workflowWorkOrders';
import { getWorkflowClients } from '../../lib/workflowClients';
import { getEmployees } from '../../lib/db';
import { Employee } from '../../types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Users,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Sliders,
  Bell,
  RefreshCw,
  Send,
  X,
  ChevronRight,
  Sparkles,
  Shield,
  HelpCircle,
  AlertCircle,
  Eye,
  Check,
  UserCheck,
  Building2,
  FileText,
  Activity,
  ArrowUpRight,
  ListTodo,
  TrendingUp,
  Percent
} from 'lucide-react';

interface WorkflowTasksIntegrationProps {
  sessionUser: Employee;
  initialScope?: 'my_assigned' | 'my_delegated' | 'team_tasks';
  initialWorkOrderId?: string;
  onNavigateToWorkOrder?: (workOrderId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
}

export default function WorkflowTasksIntegration({
  sessionUser,
  initialScope = 'my_assigned',
  initialWorkOrderId,
  onNavigateToWorkOrder,
  onNavigateToClient
}: WorkflowTasksIntegrationProps) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [activeScope, setActiveScope] = useState<'my_assigned' | 'my_delegated' | 'team_tasks'>(initialScope);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkflowTaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | WorkflowTaskPriority>('ALL');
  const [workOrderFilter, setWorkOrderFilter] = useState<string>(initialWorkOrderId || 'ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<WorkflowTask | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // New Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<WorkflowTaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [newAssigneeId, setNewAssigneeId] = useState<string>(sessionUser.id);
  const [newWorkOrderId, setNewWorkOrderId] = useState<string>(initialWorkOrderId || '');
  const [newStageId, setNewStageId] = useState<string>('');
  const [newDelegationNotes, setNewDelegationNotes] = useState('');
  const [checklistInputs, setChecklistInputs] = useState<string[]>(['', '']);

  // Dynamic lists from DB
  const rawEmployees = useMemo(() => getEmployees().filter(e => e.status === 'active'), []);
  const workOrders = useMemo(() => getWorkflowWorkOrders(), []);

  // Show temporary toast notification
  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3800);
  };

  const loadData = () => {
    setTasks(getWorkflowTasks());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('efilingg_workflow_tasks_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('efilingg_workflow_tasks_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Selected Work Order stages for modal
  const selectedOrderForCreate = useMemo(() => {
    if (!newWorkOrderId) return null;
    return workOrders.find(o => o.id === newWorkOrderId) || null;
  }, [newWorkOrderId, workOrders]);

  // Handle Work Order selection in modal to auto populate client & stages
  const handleSelectWorkOrderInModal = (woId: string) => {
    setNewWorkOrderId(woId);
    setNewStageId('');
  };

  // Create Task Handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please enter a task title', 'warn');
      return;
    }

    const assignee = rawEmployees.find(e => e.id === newAssigneeId);
    const wo = workOrders.find(o => o.id === newWorkOrderId);
    const stg = wo?.stages?.find(s => s.id === newStageId);

    const validChecklist = checklistInputs.filter(t => t.trim().length > 0);

    const created = createWorkflowTask(
      {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        dueDate: newDueDate,
        assignedToId: newAssigneeId,
        assignedToName: assignee?.name || (newAssigneeId === sessionUser.id ? sessionUser.name : 'Unassigned'),
        assignedToDepartment: assignee?.department,
        assignedToRole: assignee?.role,
        workOrderId: wo?.id,
        workOrderService: wo?.service,
        stageId: stg?.id,
        stageName: stg?.name,
        clientId: wo?.clientId,
        clientName: wo?.clientName,
        delegationNotes: newDelegationNotes.trim() || undefined,
        checklistTitles: validChecklist
      },
      sessionUser
    );

    showToast(`Task ${created.id} created successfully!`, 'success');
    setShowCreateModal(false);

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewAssigneeId(sessionUser.id);
    setNewWorkOrderId('');
    setNewStageId('');
    setNewDelegationNotes('');
    setChecklistInputs(['', '']);

    loadData();
  };

  // Scope Filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Scope Filter
      if (activeScope === 'my_assigned') {
        const isMe =
          task.assignedToId === sessionUser.id ||
          task.assignedToName?.toLowerCase() === sessionUser.name?.toLowerCase() ||
          task.assignedToId === 'ALL';
        if (!isMe) return false;
      } else if (activeScope === 'my_delegated') {
        const isDelegatedByMe =
          (task.createdById === sessionUser.id && task.assignedToId !== sessionUser.id) ||
          task.delegatedBy === sessionUser.id;
        if (!isDelegatedByMe) return false;
      } else if (activeScope === 'team_tasks') {
        // Team Tasks: visible across the team/department or all for admin/managers
        if (sessionUser.role !== 'admin' && sessionUser.role !== 'team_leader') {
          const isSameDept = task.assignedToDepartment === sessionUser.department;
          const isMine = task.assignedToId === sessionUser.id || task.createdById === sessionUser.id;
          if (!isSameDept && !isMine) return false;
        }
      }

      // Status Filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

      // Priority Filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

      // Work Order Filter
      if (workOrderFilter !== 'ALL' && task.workOrderId !== workOrderFilter) return false;

      // Assignee Filter (Team view)
      if (assigneeFilter !== 'ALL' && task.assignedToId !== assigneeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.id.toLowerCase().includes(q) ||
          task.assignedToName.toLowerCase().includes(q) ||
          task.createdByName.toLowerCase().includes(q) ||
          (task.workOrderId && task.workOrderId.toLowerCase().includes(q)) ||
          (task.workOrderService && task.workOrderService.toLowerCase().includes(q)) ||
          (task.stageName && task.stageName.toLowerCase().includes(q)) ||
          (task.clientName && task.clientName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [tasks, activeScope, statusFilter, priorityFilter, workOrderFilter, assigneeFilter, searchQuery, sessionUser]);

  // Metrics for Scope Badges & Header
  const scopeMetrics = useMemo(() => {
    const myAssigned = tasks.filter(
      t =>
        t.assignedToId === sessionUser.id ||
        t.assignedToName?.toLowerCase() === sessionUser.name?.toLowerCase() ||
        t.assignedToId === 'ALL'
    );
    const myDelegated = tasks.filter(
      t => (t.createdById === sessionUser.id && t.assignedToId !== sessionUser.id) || t.delegatedBy === sessionUser.id
    );

    const pendingDelegated = myDelegated.filter(t => t.status !== 'completed');
    const overdueDelegated = pendingDelegated.filter(t => computeWorkflowTaskSLA(t).urgency === 'overdue');
    const avgDelegatedCompletion =
      myDelegated.length > 0
        ? Math.round(myDelegated.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / myDelegated.length)
        : 0;

    const myPending = myAssigned.filter(t => t.status !== 'completed');
    const myOverdue = myPending.filter(t => computeWorkflowTaskSLA(t).urgency === 'overdue');
    const myAvgCompletion =
      myAssigned.length > 0
        ? Math.round(myAssigned.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / myAssigned.length)
        : 0;

    return {
      myAssignedTotal: myAssigned.length,
      myAssignedPending: myPending.length,
      myAssignedOverdue: myOverdue.length,
      myAvgCompletion,

      myDelegatedTotal: myDelegated.length,
      myDelegatedPending: pendingDelegated.length,
      myDelegatedOverdue: overdueDelegated.length,
      avgDelegatedCompletion,

      teamTotal: tasks.length
    };
  }, [tasks, sessionUser]);

  // Quick progress adjustment handler
  const handleAdjustProgress = (taskId: string, newPct: number) => {
    const success = updateWorkflowTaskProgress(taskId, newPct, sessionUser);
    if (success) {
      showToast(`Progress updated to ${newPct}%`);
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => (prev ? { ...prev, completionPercentage: newPct, status: newPct === 100 ? 'completed' : prev.status } : null));
      }
    }
  };

  // Quick status adjustment handler
  const handleAdjustStatus = (taskId: string, newStatus: WorkflowTaskStatus) => {
    const success = updateWorkflowTaskStatus(taskId, newStatus, sessionUser);
    if (success) {
      showToast(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => (prev ? { ...prev, status: newStatus, completionPercentage: newStatus === 'completed' ? 100 : prev.completionPercentage } : null));
      }
    }
  };

  // Reassign Task submit
  const handleReassignSubmit = (taskId: string, newEmpId: string, notes: string) => {
    const targetEmp = rawEmployees.find(e => e.id === newEmpId);
    if (!targetEmp) return;

    const success = reassignWorkflowTask(taskId, targetEmp.id, targetEmp.name, sessionUser, notes);
    if (success) {
      showToast(`Task reassigned to ${targetEmp.name}`);
      setShowReassignModal(null);
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => (prev ? { ...prev, assignedToId: targetEmp.id, assignedToName: targetEmp.name } : null));
      }
    }
  };

  // Nudge Assignee (Manager delegation monitoring)
  const handleNudgeAssignee = (task: WorkflowTask) => {
    showToast(`Follow-up nudge sent to ${task.assignedToName} for "${task.title}"`, 'info');
  };

  return (
    <div className="space-y-5">
      {/* Toast banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'warn'
              ? 'bg-amber-900/95 text-amber-100 border-amber-700'
              : 'bg-indigo-900/95 text-indigo-100 border-indigo-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : toastMessage.type === 'warn' ? (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-indigo-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ========================================================
          HEADER & KPI METRICS BAR
      ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                Phase 6 · Workflow Task Engine
              </span>
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Synchronized with Work Orders & Stages</span>
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
              <span>Task Command & Delegation Center</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Track assigned operations, monitor delegated tasks with live SLA and completion percentages, and link subtasks directly with active client Work Orders and Workflow Stages.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Refresh Tasks"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create / Delegate Task</span>
            </button>
          </div>
        </div>

        {/* Manager & Execution Monitoring KPI Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-900/50">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>My Assigned</span>
              <User className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-white">{scopeMetrics.myAssignedTotal}</span>
              <span className="text-[11px] text-amber-400 font-medium">({scopeMetrics.myAssignedPending} active)</span>
            </div>
            <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span>Avg Done:</span>
              <span className="font-semibold text-emerald-400">{scopeMetrics.myAvgCompletion}%</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>My Delegated</span>
              <Send className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-white">{scopeMetrics.myDelegatedTotal}</span>
              <span className="text-[11px] text-indigo-300 font-medium">({scopeMetrics.myDelegatedPending} open)</span>
            </div>
            <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-slate-400">
              <span>Team Progress:</span>
              <span className="font-semibold text-purple-300">{scopeMetrics.avgDelegatedCompletion}%</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Delegated Overdue</span>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-xl font-bold ${scopeMetrics.myDelegatedOverdue > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {scopeMetrics.myDelegatedOverdue}
              </span>
              <span className="text-[11px] text-slate-400">tasks</span>
            </div>
            <div className="mt-1.5 text-[11px] text-rose-300">
              {scopeMetrics.myDelegatedOverdue > 0 ? 'Requires manager nudge' : 'All SLAs on schedule'}
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Linked to Work Orders</span>
              <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-white">
                {tasks.filter(t => t.workOrderId).length}
              </span>
              <span className="text-[11px] text-emerald-400">stages synced</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              Connected with active filings
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          THREE SCOPES NAVIGATION TABS (My Assigned, My Delegated, Team)
      ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs">
        <div className="flex items-center space-x-1.5">
          {/* TAB 1: MY ASSIGNED TASKS */}
          <button
            onClick={() => setActiveScope('my_assigned')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'my_assigned'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            <span>My Assigned Tasks</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeScope === 'my_assigned'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {scopeMetrics.myAssignedTotal}
            </span>
          </button>

          {/* TAB 2: MY DELEGATED TASKS (Manager view) */}
          <button
            onClick={() => setActiveScope('my_delegated')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'my_delegated'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>My Delegated Tasks</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeScope === 'my_delegated'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
              }`}
            >
              {scopeMetrics.myDelegatedTotal}
            </span>
            {scopeMetrics.myDelegatedOverdue > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold animate-pulse">
                {scopeMetrics.myDelegatedOverdue} Overdue
              </span>
            )}
          </button>

          {/* TAB 3: TEAM TASKS */}
          <button
            onClick={() => setActiveScope('team_tasks')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScope === 'team_tasks'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team Tasks</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeScope === 'team_tasks'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {scopeMetrics.teamTotal}
            </span>
          </button>
        </div>

        {/* Manager Guidance Note for Delegated Tab */}
        {activeScope === 'my_delegated' && (
          <div className="hidden xl:flex items-center space-x-2 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60">
            <Shield className="h-3.5 w-3.5 text-purple-600" />
            <span>
              <strong>Manager View:</strong> Always monitor <em>Assigned To</em>, <em>Status</em>, <em>Due Date</em>, and <em>Completion %</em>.
            </span>
          </div>
        )}
      </div>

      {/* ========================================================
          SEARCH & MULTI-DIMENSIONAL FILTERS
      ======================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, task ID, assignee, client, work order or stage..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'pending', 'in_progress', 'completed'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL'
                  ? 'All Status'
                  : st === 'pending'
                  ? 'Pending'
                  : st === 'in_progress'
                  ? 'In Progress'
                  : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Linked Work Order Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 shrink-0 font-medium flex items-center space-x-1">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              <span>Work Order:</span>
            </span>
            <select
              value={workOrderFilter}
              onChange={e => setWorkOrderFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Work Orders & Unlinked</option>
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.id} · {wo.clientName} ({wo.serviceCode})
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 shrink-0 font-medium flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Priority:</span>
            </span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assignee Filter (especially for Team / Delegated) */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 shrink-0 font-medium flex items-center space-x-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Assignee:</span>
            </span>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Team Members</option>
              {rawEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department || emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          TASK CARDS / LIST TABLE VIEW
          Enforcing: "Task Creator must always see: Assigned To, Status, Due Date, Completion %"
      ======================================================== */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-4">
            <ListTodo className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Tasks Match Selected Filters
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
            {activeScope === 'my_delegated'
              ? 'You have not delegated any tasks matching current filters. Click "Create / Delegate Task" above to allocate tasks to team members.'
              : activeScope === 'my_assigned'
              ? 'You currently have no pending assigned tasks under these criteria.'
              : 'No team tasks found.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Task</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Task Details & Linked Order</th>
                  {/* The 4 Mandatory fields for Task Creator & Manager monitoring */}
                  <th className="py-3 px-4">
                    <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400">
                      <User className="h-3 w-3" />
                      <span>Assigned To</span>
                    </span>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date & SLA</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                      <Percent className="h-3 w-3" />
                      <span>Completion %</span>
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredTasks.map(task => {
                  const sla = computeWorkflowTaskSLA(task);
                  const isDelegatedByMe =
                    (task.createdById === sessionUser.id && task.assignedToId !== sessionUser.id) ||
                    task.delegatedBy === sessionUser.id;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* 1. Task Details & Linked Order */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="flex items-start space-x-2.5">
                          {/* Priority Indicator */}
                          <div className="mt-0.5">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                task.priority === 'urgent'
                                  ? 'bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-900'
                                  : task.priority === 'high'
                                  ? 'bg-amber-500'
                                  : task.priority === 'medium'
                                  ? 'bg-blue-500'
                                  : 'bg-slate-400'
                              }`}
                              title={`Priority: ${task.priority.toUpperCase()}`}
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[10px] text-slate-400 font-bold">{task.id}</span>
                              <span
                                onClick={() => setSelectedTask(task)}
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1"
                              >
                                {task.title}
                              </span>
                            </div>

                            <p className="text-slate-500 text-[11px] line-clamp-1">{task.description}</p>

                            {/* Linked Work Order & Stage Badges */}
                            {task.workOrderId ? (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span
                                  onClick={() => onNavigateToWorkOrder && onNavigateToWorkOrder(task.workOrderId!)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 cursor-pointer"
                                  title={`Linked to Work Order ${task.workOrderId}`}
                                >
                                  <Briefcase className="h-2.5 w-2.5 text-indigo-500" />
                                  <span>{task.workOrderId}</span>
                                  {task.clientName && <span>· {task.clientName}</span>}
                                </span>

                                {task.stageName && (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                                    title={`Linked to Stage: ${task.stageName}`}
                                  >
                                    <Layers className="h-2.5 w-2.5 text-purple-500" />
                                    <span className="max-w-[150px] truncate">{task.stageName}</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Unlinked standalone task</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. ASSIGNED TO (Mandatory Field 1) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                            {task.assignedToName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {task.assignedToName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {task.assignedToDepartment || task.assignedToRole || 'Operations Team'}
                            </div>
                          </div>
                        </div>
                        {isDelegatedByMe && (
                          <div className="mt-1 text-[9px] text-purple-600 dark:text-purple-400 font-semibold">
                            Delegated by you
                          </div>
                        )}
                      </td>

                      {/* 3. STATUS (Mandatory Field 2) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : task.status === 'in_progress'
                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                : task.status === 'on_hold'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500'
                                  : task.status === 'in_progress'
                                  ? 'bg-indigo-500 animate-pulse'
                                  : task.status === 'on_hold'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>
                              {task.status === 'in_progress'
                                ? 'In Progress'
                                : task.status === 'on_hold'
                                ? 'On Hold'
                                : task.status.toUpperCase()}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* 4. DUE DATE & SLA (Mandatory Field 3) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{task.dueDate}</span>
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.2 rounded text-[10px] font-bold ${
                                sla.urgency === 'overdue'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 animate-pulse'
                                  : sla.urgency === 'due_today'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : sla.urgency === 'due_soon'
                                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                                  : sla.urgency === 'completed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              <span>{sla.label}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. COMPLETION % (Mandatory Field 4) */}
                      <td className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {task.completionPercentage}%
                            </span>
                            {task.checklist && task.checklist.length > 0 && (
                              <span className="text-[10px] text-slate-400">
                                {task.checklist.filter(c => c.completed).length}/{task.checklist.length} items
                              </span>
                            )}
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.completionPercentage === 100
                                  ? 'bg-emerald-500'
                                  : task.completionPercentage >= 60
                                  ? 'bg-indigo-600'
                                  : task.completionPercentage >= 25
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${task.completionPercentage}%` }}
                            />
                          </div>

                          {/* Quick Progress adjustment buttons for assignee */}
                          {(task.assignedToId === sessionUser.id || sessionUser.role === 'admin') && task.status !== 'completed' && (
                            <div className="flex items-center space-x-1 pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  onClick={() => handleAdjustProgress(task.id, pct)}
                                  className={`px-1 py-0.2 rounded text-[9px] font-mono transition cursor-pointer ${
                                    task.completionPercentage === pct
                                      ? 'bg-indigo-600 text-white font-bold'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Actions / Delegation Controls */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Manager Nudge / Ping Button */}
                          {(isDelegatedByMe || sessionUser.role === 'admin') && task.status !== 'completed' && (
                            <button
                              onClick={() => handleNudgeAssignee(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                              title="Nudge / Ping Assignee"
                            >
                              <Bell className="h-4 w-4" />
                            </button>
                          )}

                          {/* Reassign Modal Trigger */}
                          {(isDelegatedByMe || sessionUser.role === 'admin' || sessionUser.role === 'team_leader') && (
                            <button
                              onClick={() => setShowReassignModal(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                              title="Reassign Task"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {/* View Detail Drawer */}
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: CREATE / DELEGATE WORKFLOW TASK
      ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-indigo-600" />
                  <span>Create / Delegate Workflow Task</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate tasks to yourself or team members, and link with active Work Orders & Workflow Stages.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 pt-4 text-xs">
              {/* Task Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Draft MOA/AOA Clauses for SPICe+ Part B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Instructions & Scope
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Provide detailed execution guidelines for the assignee..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Assign To (Employee / Self) <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={e => setNewAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={sessionUser.id}>Assign to Myself ({sessionUser.name})</option>
                    {rawEmployees
                      .filter(e => e.id !== sessionUser.id)
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.department || emp.role}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Target Due Date <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map(pr => (
                    <button
                      type="button"
                      key={pr}
                      onClick={() => setNewPriority(pr)}
                      className={`py-1.5 px-2 rounded-xl text-center font-bold text-xs capitalize transition cursor-pointer border ${
                        newPriority === pr
                          ? pr === 'urgent'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : pr === 'high'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : pr === 'medium'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========================================================
                  WORKFLOW LINKAGE: WORK ORDER & STAGE
              ======================================================== */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span>Workflow Integration Link (Optional but Recommended)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Work Order */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Link with Active Work Order
                    </label>
                    <select
                      value={newWorkOrderId}
                      onChange={e => handleSelectWorkOrderInModal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- No Linked Work Order (Standalone) --</option>
                      {workOrders.map(wo => (
                        <option key={wo.id} value={wo.id}>
                          {wo.id} · {wo.clientName} ({wo.serviceCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Stage */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Link with Workflow Stage
                    </label>
                    <select
                      value={newStageId}
                      onChange={e => setNewStageId(e.target.value)}
                      disabled={!selectedOrderForCreate}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="">
                        {selectedOrderForCreate ? '-- Link to Entire Order or Select Stage --' : 'Select Work Order first'}
                      </option>
                      {selectedOrderForCreate?.stages?.map((stg, idx) => (
                        <option key={stg.id} value={stg.id}>
                          Stage {idx + 1}: {stg.name} ({stg.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedOrderForCreate && (
                  <div className="text-[11px] text-slate-500 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <strong>Linked Client:</strong> {selectedOrderForCreate.clientName} ({selectedOrderForCreate.clientId}) · <strong>Service:</strong> {selectedOrderForCreate.service}
                  </div>
                )}
              </div>

              {/* Manager Delegation Notes (if delegating to another person) */}
              {newAssigneeId !== sessionUser.id && (
                <div>
                  <label className="block font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center space-x-1">
                    <Send className="h-3.5 w-3.5" />
                    <span>Manager Delegation Directives & Notes</span>
                  </label>
                  <input
                    type="text"
                    value={newDelegationNotes}
                    onChange={e => setNewDelegationNotes(e.target.value)}
                    placeholder="Specific priorities or reminders for the assignee..."
                    className="w-full px-3 py-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Subtask / Checklist Builder */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Subtask Checklist (Calculates Completion %)</span>
                  <button
                    type="button"
                    onClick={() => setChecklistInputs(prev => [...prev, ''])}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </label>
                <div className="space-y-1.5">
                  {checklistInputs.map((val, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={val}
                        onChange={e => {
                          const updated = [...checklistInputs];
                          updated[idx] = e.target.value;
                          setChecklistInputs(updated);
                        }}
                        placeholder={`Checklist item #${idx + 1}`}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                      />
                      {checklistInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setChecklistInputs(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  {newAssigneeId === sessionUser.id ? 'Create Self Task' : 'Delegate Task to Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: REASSIGN TASK (MANAGER DELEGATION)
      ======================================================== */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <span>Reassign Task</span>
              </h3>
              <button
                onClick={() => setShowReassignModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-slate-100">{showReassignModal.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Current Assignee: <strong>{showReassignModal.assignedToName}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select New Assignee
                </label>
                <select
                  id="reassign-select-emp"
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500"
                >
                  <option value="" disabled>-- Select Team Member --</option>
                  {rawEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reassignment Reason / Directives
                </label>
                <input
                  type="text"
                  id="reassign-notes"
                  placeholder="e.g., Workload reallocation / specialist handover"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = (document.getElementById('reassign-select-emp') as HTMLSelectElement)?.value;
                    const notes = (document.getElementById('reassign-notes') as HTMLInputElement)?.value;
                    if (sel) {
                      handleReassignSubmit(showReassignModal.id, sel, notes);
                    } else {
                      showToast('Please select a new team member', 'warn');
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                >
                  Confirm Reassignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DRAWER: TASK DETAIL & MANAGER MONITORING CONSOLE
      ======================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between sticky top-0 z-10">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedTask.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTask.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : selectedTask.priority === 'high'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {selectedTask.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedTask.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* ========================================================
                  MANDATORY 4 METRICS FOR CREATOR & MANAGER
              ======================================================== */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Key Lifecycle & Delegation Metrics</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Assigned To */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] text-slate-400 font-semibold block">ASSIGNED TO</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center space-x-1.5">
                      <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        {selectedTask.assignedToName?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate">{selectedTask.assignedToName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {selectedTask.assignedToDepartment || selectedTask.assignedToRole || 'Operations'}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] text-slate-400 font-semibold block">STATUS</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 capitalize">
                      {selectedTask.status.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Created by {selectedTask.createdByName}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] text-slate-400 font-semibold block">DUE DATE</span>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedTask.dueDate}
                    </div>
                    <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                      {computeWorkflowTaskSLA(selectedTask).label}
                    </div>
                  </div>

                  {/* Completion % */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] text-slate-400 font-semibold block">COMPLETION %</span>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {selectedTask.completionPercentage}%
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${selectedTask.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Description */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Description & Scope</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedTask.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Linked Work Order Card */}
              {selectedTask.workOrderId && (
                <div className="bg-indigo-50/40 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span>Linked Workflow Engagement</span>
                    </span>
                    {onNavigateToWorkOrder && (
                      <button
                        onClick={() => {
                          onNavigateToWorkOrder(selectedTask.workOrderId!);
                          setSelectedTask(null);
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <span>Open Work Order</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <div>
                      <strong>Work Order ID:</strong> {selectedTask.workOrderId}
                    </div>
                    <div>
                      <strong>Client:</strong> {selectedTask.clientName || 'N/A'} ({selectedTask.clientId || ''})
                    </div>
                    <div>
                      <strong>Service:</strong> {selectedTask.workOrderService || 'Standard Filings'}
                    </div>
                    {selectedTask.stageName && (
                      <div>
                        <strong>Workflow Stage:</strong>{' '}
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                          {selectedTask.stageName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delegation Notes if present */}
              {selectedTask.delegationNotes && (
                <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 space-y-1">
                  <span className="font-bold text-[11px] flex items-center space-x-1">
                    <Send className="h-3 w-3" />
                    <span>Manager Instructions ({selectedTask.delegatedByName || selectedTask.createdByName}):</span>
                  </span>
                  <p className="text-xs">{selectedTask.delegationNotes}</p>
                </div>
              )}

              {/* Interactive Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                    <span>Checklist & Deliverables</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {selectedTask.checklist?.filter(c => c.completed).length || 0} of {selectedTask.checklist?.length || 0} completed
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedTask.checklist?.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        toggleWorkflowTaskChecklist(selectedTask.id, item.id, !item.completed, sessionUser);
                        loadData();
                        setSelectedTask(prev =>
                          prev
                            ? {
                                ...prev,
                                checklist: prev.checklist.map(c => (c.id === item.id ? { ...c, completed: !item.completed } : c))
                              }
                            : null
                        );
                      }}
                      className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                        item.completed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-slate-500 line-through'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded mt-0.5 flex items-center justify-center ${
                          item.completed
                            ? 'bg-emerald-500 text-white'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {item.completed && <Check className="h-3 w-3" />}
                      </div>
                      <span className="flex-1 text-xs">{item.title}</span>
                    </div>
                  ))}
                </div>

                {/* Add new checklist item */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    id="new-chk-item-input"
                    placeholder="Add new deliverable item..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          addWorkflowTaskChecklistItem(selectedTask.id, val, sessionUser);
                          (e.target as HTMLInputElement).value = '';
                          loadData();
                          const updated = getWorkflowTasks().find(t => t.id === selectedTask.id);
                          if (updated) setSelectedTask(updated);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-chk-item-input') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        addWorkflowTaskChecklistItem(selectedTask.id, input.value.trim(), sessionUser);
                        input.value = '';
                        loadData();
                        const updated = getWorkflowTasks().find(t => t.id === selectedTask.id);
                        if (updated) setSelectedTask(updated);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Interactive Progress Slider */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Adjust Completion Progress</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedTask.completionPercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selectedTask.completionPercentage}
                  onChange={e => handleAdjustProgress(selectedTask.id, parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>0% (Not Started)</span>
                  <span>50% (In Progress)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Update Status</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'in_progress', 'completed'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleAdjustStatus(selectedTask.id, st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                        selectedTask.status === st
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit & Activity Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span>Audit Trail & Activity Log</span>
                </h4>
                <div className="space-y-2">
                  {selectedTask.activityLog?.map(act => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{act.authorName}</span>
                        <span>{new Date(act.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{act.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Task Option */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Task Lifecycle Administration</span>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete task "${selectedTask.title}"?`)) {
                      deleteWorkflowTask(selectedTask.id);
                      setSelectedTask(null);
                      loadData();
                      showToast('Task deleted');
                    }
                  }}
                  className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
