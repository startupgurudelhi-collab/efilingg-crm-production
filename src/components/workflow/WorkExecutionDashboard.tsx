/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  User,
  Users,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Kanban,
  List,
  BarChart2,
  ArrowRight,
  X,
  CheckSquare,
  Square,
  History,
  Download,
  Building2,
  Phone,
  Tag,
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  GitBranch,
  FolderArchive
} from 'lucide-react';
import { Employee } from '../../types';
import {
  WorkflowWorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderStage,
  WorkOrderStageStatus,
  getWorkflowWorkOrders,
  saveWorkflowWorkOrders,
  updateWorkOrderStatus,
  reassignWorkOrderOwner,
  updateWorkOrderStageStatus,
  toggleWorkOrderStageChecklist,
  computeWorkOrderExecutionMetrics,
  calculateWorkOrderPendingDays,
  WorkOrderExecutionMetrics,
  PREDEFINED_WORKFLOW_SERVICES
} from '../../lib/workflowWorkOrders';
import { getWorkflowClients, WorkflowClient } from '../../lib/workflowClients';
import { getEmployees } from '../../lib/db';
import {
  WorkflowTask,
  WorkflowTaskPriority,
  WorkflowTaskStatus,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTaskStatus,
  updateWorkflowTaskCompletion,
  toggleWorkflowTaskChecklist,
  EVENT_TASKS_UPDATED,
  STORAGE_KEY_WORKFLOW_TASKS
} from '../../lib/workflowTasks';
import {
  WorkflowDocument,
  getWorkflowDocuments,
  EVENT_DOCUMENTS_UPDATED,
  STORAGE_KEY_WORKFLOW_DOCUMENTS
} from '../../lib/workflowDocuments';
import WorkflowDocumentsManagement from './WorkflowDocumentsManagement';

export type WorkScope = 'my' | 'team' | 'all';
export type WorkViewMode = 'list' | 'kanban' | 'timeline';

interface WorkExecutionDashboardProps {
  sessionUser: Employee;
  initialScope?: WorkScope;
  initialView?: WorkViewMode;
  onNavigateToClient?: (clientId: string) => void;
  onOpenCreateModal?: () => void;
}

export default function WorkExecutionDashboard({
  sessionUser,
  initialScope = 'my',
  initialView = 'list',
  onNavigateToClient,
  onOpenCreateModal
}: WorkExecutionDashboardProps) {
  // Scopes & Views
  const [scope, setScope] = useState<WorkScope>(initialScope);
  const [viewMode, setViewMode] = useState<WorkViewMode>(initialView);

  // Core Data State
  const [workOrders, setWorkOrders] = useState<WorkflowWorkOrder[]>([]);
  const [clients, setClients] = useState<WorkflowClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Selected Order Drawer / Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'stages' | 'tasks' | 'documents' | 'details' | 'audit'>('stages');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Workflow Tasks State
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([]);
  const [workflowDocuments, setWorkflowDocuments] = useState<WorkflowDocument[]>([]);
  const [isAddingTaskOpen, setIsAddingTaskOpen] = useState(false);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDescription, setTaskFormDescription] = useState('');
  const [taskFormAssigneeId, setTaskFormAssigneeId] = useState('');
  const [taskFormPriority, setTaskFormPriority] = useState<WorkflowTaskPriority>('medium');
  const [taskFormDueDate, setTaskFormDueDate] = useState('');
  const [taskFormStageId, setTaskFormStageId] = useState('');
  const [taskFormChecklist, setTaskFormChecklist] = useState<string[]>(['']);
  const [taskFormDelegationNotes, setTaskFormDelegationNotes] = useState('');
  const [taskFormSuccess, setTaskFormSuccess] = useState<string | null>(null);

  // Quick Reassign Modal
  const [reassignOrder, setReassignOrder] = useState<WorkflowWorkOrder | null>(null);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');

  // Quick Status Modal
  const [quickStatusOrder, setQuickStatusOrder] = useState<WorkflowWorkOrder | null>(null);
  const [newTargetStatus, setNewTargetStatus] = useState<WorkOrderStatus>('in_progress');

  // Load latest data from storage
  const reloadData = useCallback(() => {
    setIsRefreshing(true);
    const loadedOrders = getWorkflowWorkOrders();
    const loadedClients = getWorkflowClients();
    const loadedEmployees = getEmployees();
    const loadedTasks = getWorkflowTasks();
    const loadedDocs = getWorkflowDocuments();
    setWorkOrders(loadedOrders);
    setClients(loadedClients);
    setEmployees(loadedEmployees);
    setWorkflowTasks(loadedTasks);
    setWorkflowDocuments(loadedDocs);
    setLastSyncTime(new Date());
    setTimeout(() => setIsRefreshing(false), 250);
  }, []);

  // Initialize and register Realtime Update Listeners
  useEffect(() => {
    reloadData();

    // 1. Custom event listener for in-app real-time broadcasts
    const handleWorkOrdersUpdated = () => {
      reloadData();
    };
    const handleTasksUpdated = () => {
      reloadData();
    };
    const handleDocumentsUpdated = () => {
      reloadData();
    };

    // 2. Storage event listener for multi-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'efilingg_crm_workflow_work_orders' ||
        e.key === STORAGE_KEY_WORKFLOW_TASKS ||
        e.key === STORAGE_KEY_WORKFLOW_DOCUMENTS
      ) {
        reloadData();
      }
    };

    // 3. Periodic polling interval (3 seconds) for live pending days and active transitions
    const pollTimer = window.setInterval(() => {
      reloadData();
    }, 3000);

    window.addEventListener('efilingg_workflow_work_orders_updated', handleWorkOrdersUpdated);
    window.addEventListener(EVENT_TASKS_UPDATED, handleTasksUpdated);
    window.addEventListener(EVENT_DOCUMENTS_UPDATED, handleDocumentsUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('efilingg_workflow_work_orders_updated', handleWorkOrdersUpdated);
      window.removeEventListener(EVENT_TASKS_UPDATED, handleTasksUpdated);
      window.removeEventListener(EVENT_DOCUMENTS_UPDATED, handleDocumentsUpdated);
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(pollTimer);
    };
  }, [reloadData]);

  // Copy helper
  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pre-calculate metrics for every work order for fast lookup
  const enrichedOrders = useMemo(() => {
    return workOrders.map(order => {
      const metrics = computeWorkOrderExecutionMetrics(order);
      return {
        ...order,
        metrics
      };
    });
  }, [workOrders]);

  // Filter by Scope: My Works vs Team Works vs All Works
  const scopedOrders = useMemo(() => {
    return enrichedOrders.filter(order => {
      if (scope === 'my') {
        return order.ownerId === sessionUser.id;
      }
      if (scope === 'team') {
        // Team works: works assigned to same department or team
        const isSameDept = sessionUser.department && order.department === sessionUser.department;
        const isSessionOwner = order.ownerId === sessionUser.id;
        const isSupervisorRole = sessionUser.role === 'admin' || sessionUser.role === 'team_leader';
        return isSameDept || isSessionOwner || isSupervisorRole;
      }
      // 'all' scope returns all orders
      return true;
    });
  }, [enrichedOrders, scope, sessionUser]);

  // Filter by Search, Status, Service, Urgency, Department
  const filteredOrders = useMemo(() => {
    return scopedOrders.filter(order => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          order.id.toLowerCase().includes(q) ||
          order.clientId.toLowerCase().includes(q) ||
          order.clientName.toLowerCase().includes(q) ||
          order.service.toLowerCase().includes(q) ||
          order.ownerName.toLowerCase().includes(q) ||
          order.department.toLowerCase().includes(q) ||
          order.metrics.currentStage.name.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Status
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Service
      if (serviceFilter !== 'all' && order.serviceCode !== serviceFilter) {
        return false;
      }

      // Urgency (pending days)
      if (urgencyFilter !== 'all' && order.metrics.pendingDays.urgency !== urgencyFilter) {
        return false;
      }

      // Department
      if (departmentFilter !== 'all' && order.department !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [scopedOrders, searchQuery, statusFilter, serviceFilter, urgencyFilter, departmentFilter]);

  // Selected Order for the detail drawer
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return enrichedOrders.find(o => o.id === selectedOrderId) || null;
  }, [enrichedOrders, selectedOrderId]);

  // Tasks linked with the selected Work Order
  const selectedOrderTasks = useMemo(() => {
    if (!selectedOrder) return [];
    return workflowTasks.filter(t => t.workOrderId === selectedOrder.id);
  }, [workflowTasks, selectedOrder]);

  // Documents linked with the selected Work Order (Phase 7)
  const selectedOrderDocuments = useMemo(() => {
    if (!selectedOrder) return [];
    return workflowDocuments.filter(d => d.workOrderId === selectedOrder.id);
  }, [workflowDocuments, selectedOrder]);

  // Create linked task handler
  const handleCreateLinkedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !taskFormTitle.trim() || !taskFormDueDate) {
      setActionError('Please specify task title and due date.');
      return;
    }

    const assignee = employees.find(emp => emp.id === taskFormAssigneeId) || sessionUser;
    const stage = selectedOrder.stages?.find(s => s.id === taskFormStageId);

    createWorkflowTask(
      {
        title: taskFormTitle.trim(),
        description: taskFormDescription.trim(),
        priority: taskFormPriority,
        dueDate: taskFormDueDate,
        assignedToId: assignee.id,
        assignedToName: assignee.name,
        assignedToDepartment: assignee.department,
        assignedToRole: assignee.role,
        workOrderId: selectedOrder.id,
        workOrderService: selectedOrder.service,
        stageId: stage?.id,
        stageName: stage ? `Stage ${stage.sequence}: ${stage.name}` : undefined,
        clientId: selectedOrder.clientId,
        clientName: selectedOrder.clientName,
        delegationNotes: taskFormDelegationNotes.trim(),
        checklistTitles: taskFormChecklist.filter(c => c.trim().length > 0)
      },
      sessionUser
    );

    // Reset form
    setTaskFormTitle('');
    setTaskFormDescription('');
    setTaskFormAssigneeId('');
    setTaskFormDueDate('');
    setTaskFormStageId('');
    setTaskFormChecklist(['']);
    setTaskFormDelegationNotes('');
    setIsAddingTaskOpen(false);
    setTaskFormSuccess('Workflow task successfully linked and assigned!');
    setTimeout(() => setTaskFormSuccess(null), 4000);
    reloadData();
  };

  // Aggregated Summary Statistics
  const stats = useMemo(() => {
    const total = scopedOrders.length;
    const inProgress = scopedOrders.filter(o => o.status === 'in_progress').length;
    const assigned = scopedOrders.filter(o => o.status === 'assigned').length;
    const completed = scopedOrders.filter(o => o.status === 'completed').length;
    const overdue = scopedOrders.filter(o => o.metrics.pendingDays.urgency === 'overdue').length;
    const dueToday = scopedOrders.filter(o => o.metrics.pendingDays.urgency === 'due_today').length;

    const avgProgress = total > 0
      ? Math.round(scopedOrders.reduce((acc, cur) => acc + cur.metrics.progressPercentage, 0) / total)
      : 0;

    return {
      total,
      inProgress,
      assigned,
      completed,
      overdue,
      dueToday,
      avgProgress
    };
  }, [scopedOrders]);

  // Counts for Scopes tab badges
  const scopeCounts = useMemo(() => {
    const myCount = enrichedOrders.filter(o => o.ownerId === sessionUser.id).length;
    const teamCount = enrichedOrders.filter(o => {
      const isSameDept = sessionUser.department && o.department === sessionUser.department;
      return isSameDept || o.ownerId === sessionUser.id || sessionUser.role === 'admin' || sessionUser.role === 'team_leader';
    }).length;
    const allCount = enrichedOrders.length;
    return { myCount, teamCount, allCount };
  }, [enrichedOrders, sessionUser]);

  // Stage Action Handlers
  const handleStageStatusUpdate = (stageId: string, newStatus: WorkOrderStageStatus, notes?: string) => {
    if (!selectedOrder) return;
    setActionError(null);
    const result = updateWorkOrderStageStatus(
      selectedOrder.id,
      stageId,
      newStatus,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      },
      notes
    );

    if (!result.success) {
      setActionError(result.message || 'Unable to update stage.');
      return;
    }
    reloadData();
  };

  const handleToggleChecklist = (stageId: string, checklistId: string) => {
    if (!selectedOrder) return;
    setActionError(null);
    const stage = selectedOrder.stages.find(s => s.id === stageId);
    const item = stage?.checklist?.find(c => c.id === checklistId);
    if (!item) return;

    const ok = toggleWorkOrderStageChecklist(
      selectedOrder.id,
      stageId,
      checklistId,
      !item.completed,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      }
    );

    if (!ok) {
      setActionError('Failed to toggle checklist item.');
      return;
    }
    reloadData();
  };

  const handleConfirmReassign = () => {
    if (!reassignOrder || !selectedNewOwnerId) return;
    const target = employees.find(e => e.id === selectedNewOwnerId);
    if (!target) return;

    reassignWorkOrderOwner(
      reassignOrder.id,
      target.id,
      target.name,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      },
      'Reassigned from Work Execution Dashboard'
    );
    setReassignOrder(null);
    setSelectedNewOwnerId('');
    reloadData();
  };

  const handleConfirmStatusChange = () => {
    if (!quickStatusOrder) return;
    updateWorkOrderStatus(
      quickStatusOrder.id,
      newTargetStatus,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      },
      'Updated via Work Execution Dashboard quick action'
    );
    setQuickStatusOrder(null);
    reloadData();
  };

  // Helper styling for urgency badge
  const renderPendingDaysBadge = (pendingDays: WorkOrderExecutionMetrics['pendingDays']) => {
    switch (pendingDays.urgency) {
      case 'overdue':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{pendingDays.label}</span>
          </span>
        );
      case 'due_today':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{pendingDays.label}</span>
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">{pendingDays.label}</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="whitespace-nowrap">{pendingDays.label}</span>
          </span>
        );
    }
  };

  // Helper styling for status badge
  const renderStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            COMPLETED
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            IN PROGRESS
          </span>
        );
      case 'review':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            REVIEW
          </span>
        );
      case 'assigned':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            ASSIGNED
          </span>
        );
      case 'on_hold':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ON HOLD
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fade-in" id="work-execution-dashboard">
      {/* 1. Header Banner & Realtime Status Indicator */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-radial from-indigo-500/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono font-bold tracking-wider uppercase">
                PHASE 5 EXECUTION
              </span>
              <span className="text-slate-400 text-xs">•</span>
              {/* Realtime Pulsing Status */}
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>REALTIME ACTIVE</span>
                <span className="text-emerald-400/70 font-normal">
                  ({lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-indigo-400" />
              <span>Work Execution Dashboard</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Unified operational command tracking <span className="text-indigo-200 font-semibold">My Works</span>, <span className="text-indigo-200 font-semibold">Team Works</span>, and <span className="text-indigo-200 font-semibold">All Works</span> across List, Kanban, and Timeline views with live stage progression, % progress, and SLA countdowns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Work Order</span>
              </button>
            )}

            <button
              type="button"
              onClick={reloadData}
              className={`inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${
                isRefreshing ? 'opacity-60' : ''
              }`}
              title="Manual Realtime Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* 2. Top Metric KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Scope Total</span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider block">In Progress</span>
            <span className="text-lg sm:text-xl font-black text-indigo-300 font-mono">{stats.inProgress}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">Assigned / Queue</span>
            <span className="text-lg sm:text-xl font-black text-blue-300 font-mono">{stats.assigned}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider block">Due Today</span>
            <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">{stats.dueToday}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-rose-300 font-semibold uppercase tracking-wider block">Overdue Pending</span>
            <span className="text-lg sm:text-xl font-black text-rose-400 font-mono">{stats.overdue}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider block">Average Progress</span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">{stats.avgProgress}%</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Controls: Scope Selector (My Works, Team Works, All Works) + View Mode Switcher (List, Kanban, Timeline) */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Scope Selector: My Works | Team Works | All Works */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setScope('my')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              scope === 'my'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>My Works</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              scope === 'my' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {scopeCounts.myCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScope('team')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              scope === 'team'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team Works</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              scope === 'team' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {scopeCounts.teamCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              scope === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Works</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              scope === 'all' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {scopeCounts.allCount}
            </span>
          </button>
        </div>

        {/* View Mode Switcher: List View | Kanban View | Timeline View */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 rotate-90" />
            <span>Timeline View</span>
          </button>
        </div>
      </div>

      {/* 4. Search & Multi-Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Client, Work ID (e.g. PLC-2026-000001), Service, Owner, Current Stage..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">All Services</option>
              {PREDEFINED_WORKFLOW_SERVICES.map(s => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name.slice(0, 24)}...
                </option>
              ))}
            </select>

            {/* Pending Days Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">All Pending Days</option>
              <option value="overdue">Overdue Only</option>
              <option value="due_today">Due Today Only</option>
              <option value="due_soon">Due Soon (≤ 2 days)</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>

            {(statusFilter !== 'all' || serviceFilter !== 'all' || urgencyFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setServiceFilter('all');
                  setUrgencyFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: LIST VIEW
          Explicitly showing: Client, Work ID, Service, Owner, Current Stage, Progress %, Pending Days
      ========================================================================= */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <List className="h-4 w-4 text-indigo-500" />
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{filteredOrders.length}</strong> Works in {scope === 'my' ? 'My Works' : scope === 'team' ? 'Team Works' : 'All Works'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Click any row to open Stage Progression &amp; Checklist Drawer
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching works found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active work execution orders match your scope ({scope}) and filter criteria. Try clearing search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Work ID</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4 text-center">Progress %</th>
                    <th className="py-3 px-4">Pending Days</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                  {filteredOrders.map(order => {
                    const { currentStage, progressPercentage, pendingDays } = order.metrics;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                      >
                        {/* 1. Client */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {order.clientName}
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">
                              {order.clientId}
                            </span>
                            {order.clientCategory && (
                              <span className="truncate max-w-[120px] text-[10px] text-slate-400">
                                &bull; {order.clientCategory}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Work ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <div className="flex items-center space-x-1.5">
                            <span>{order.id}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(order.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-opacity"
                              title="Copy Work ID"
                            >
                              {copiedId === order.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div className="mt-0.5">
                            {renderStatusBadge(order.status)}
                          </div>
                        </td>

                        {/* 3. Service */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px]" title={order.service}>
                            {order.service}
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {order.serviceCode}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                              {order.department}
                            </span>
                          </div>
                        </td>

                        {/* 4. Owner */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {order.ownerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {order.ownerName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {order.ownerId === sessionUser.id ? (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">You (Assignee)</span>
                                ) : (
                                  order.department
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 5. Current Stage */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                              {currentStage.sequence}/{currentStage.totalStages}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[180px]" title={currentStage.name}>
                              {currentStage.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              currentStage.status === 'completed'
                                ? 'bg-emerald-500'
                                : currentStage.status === 'in_progress'
                                ? 'bg-indigo-500 animate-pulse'
                                : 'bg-slate-400'
                            }`} />
                            <span className="capitalize">{currentStage.status.replace(/_/g, ' ')}</span>
                          </div>
                        </td>

                        {/* 6. Progress % */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center w-28">
                            <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold mb-1">
                              <span className="text-slate-500">Progress</span>
                              <span className={progressPercentage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}>
                                {progressPercentage}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  progressPercentage === 100
                                    ? 'bg-emerald-500'
                                    : progressPercentage >= 60
                                    ? 'bg-indigo-600'
                                    : 'bg-indigo-400'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Pending Days */}
                        <td className="py-3.5 px-4">
                          <div>
                            {renderPendingDaysBadge(pendingDays)}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            Target: {order.dueDate}
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderId(order.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Advance Stages & Checklists"
                            >
                              Stages &rarr;
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassignOrder(order);
                                setSelectedNewOwnerId(order.ownerId);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                              title="Reassign Owner"
                            >
                              <Users className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: KANBAN VIEW
          Columns grouped by Status: Assigned, In Progress, Review, Completed, On Hold
          Cards explicitly displaying: Client, Work ID, Service, Owner, Current Stage, Progress %, Pending Days
      ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          {[
            { id: 'assigned', title: 'Assigned / Queue', color: 'border-blue-500 bg-blue-50/20' },
            { id: 'in_progress', title: 'In Progress', color: 'border-indigo-500 bg-indigo-50/20' },
            { id: 'review', title: 'Under Review', color: 'border-purple-500 bg-purple-50/20' },
            { id: 'completed', title: 'Completed', color: 'border-emerald-500 bg-emerald-50/20' },
            { id: 'on_hold', title: 'On Hold', color: 'border-amber-500 bg-amber-50/20' }
          ].map(col => {
            const columnOrders = filteredOrders.filter(o => o.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[820px] shadow-xs"
              >
                {/* Column Header */}
                <div className={`p-3 border-b-2 ${col.color} border-b-slate-200 dark:border-b-slate-800 flex items-center justify-between`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{col.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {columnOrders.length}
                    </span>
                  </div>
                </div>

                {/* Column Body / Cards List */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {columnOrders.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No works in this state
                    </div>
                  ) : (
                    columnOrders.map(order => {
                      const { currentStage, progressPercentage, pendingDays } = order.metrics;
                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                        >
                          {/* Card Top: Work ID & Pending Days */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {order.id}
                            </span>
                            <div>
                              {renderPendingDaysBadge(pendingDays)}
                            </div>
                          </div>

                          {/* Client & Service */}
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {order.clientName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {order.clientId}
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 line-clamp-1">
                              {order.service}
                            </div>
                          </div>

                          {/* Current Stage */}
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                              <span>Current Stage ({currentStage.sequence}/{currentStage.totalStages})</span>
                              <span className="capitalize font-semibold text-indigo-600 dark:text-indigo-400">
                                {currentStage.status}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {currentStage.name}
                            </div>
                          </div>

                          {/* Progress % Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                              <span className="text-slate-400">Execution Progress</span>
                              <span className={progressPercentage === 100 ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400'}>
                                {progressPercentage}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  progressPercentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Card Footer: Owner & Action */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1.5">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                                {order.ownerName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
                                {order.ownerName}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickStatusOrder(order);
                                setNewTargetStatus(order.status);
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center space-x-0.5"
                            >
                              <span>Move</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: TIMELINE VIEW
          Chronological Gantt-style schedule view
          Explicitly showing: Client, Work ID, Service, Owner, Current Stage, Progress %, Pending Days
      ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <BarChart2 className="h-4 w-4 text-indigo-500 rotate-90" />
              <span>
                Timeline &amp; SLA Schedule ({filteredOrders.length} Works)
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Completed</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>In Progress</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                <span>Pending</span>
              </span>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs italic">
              No works available to plot on timeline.
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredOrders.map(order => {
                const { currentStage, progressPercentage, pendingDays } = order.metrics;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer space-y-3"
                  >
                    {/* Top Row: Client, Work ID, Service, Owner, Pending Days */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {order.id}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {order.clientName}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({order.clientId})
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {order.service}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {renderPendingDaysBadge(pendingDays)}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          <User className="h-3 w-3 text-indigo-500" />
                          <span className="font-semibold">{order.ownerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Stage info & Schedule dates */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Current Stage:</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                          Stage {currentStage.sequence}/{currentStage.totalStages}: {currentStage.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] font-mono">
                        <span>Start: <strong>{order.startDate}</strong></span>
                        <span>&bull;</span>
                        <span>Due Target: <strong>{order.dueDate}</strong></span>
                        <span>&bull;</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Progress: {progressPercentage}%</span>
                      </div>
                    </div>

                    {/* Timeline Visual Track: Stage Sequence Segments & Overall Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            progressPercentage === 100
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>

                      {/* Stage Pip Markers */}
                      {order.stages && order.stages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 pt-1">
                          {order.stages.map((st) => (
                            <div
                              key={st.id}
                              className={`p-1.5 rounded text-[10px] font-mono border transition-all ${
                                st.status === 'completed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  : st.status === 'in_progress'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>S{st.sequence}</span>
                                <span className="capitalize">{st.status}</span>
                              </div>
                              <div className="truncate text-[9px] font-sans font-medium mt-0.5" title={st.name}>
                                {st.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DRAWER / DETAIL MODAL: STAGE PROGRESSION, CHECKLIST & AUDIT
      ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-left overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-black text-indigo-400">
                    {selectedOrder.id}
                  </span>
                  {renderStatusBadge(selectedOrder.status)}
                  {renderPendingDaysBadge(selectedOrder.metrics.pendingDays)}
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {selectedOrder.clientName}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-indigo-200">
                  <span>Client ID: <strong className="font-mono">{selectedOrder.clientId}</strong></span>
                  <span>&bull;</span>
                  <span>Service: <strong>{selectedOrder.service}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error banner if action blocked */}
            {actionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="p-1 hover:text-rose-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab('stages')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'stages'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Execution Stages ({selectedOrder.stages?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('tasks')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  drawerTab === 'tasks'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5 text-purple-500" />
                <span>Linked Tasks ({selectedOrderTasks.length})</span>
                {selectedOrderTasks.some(t => t.status !== 'completed' && new Date(t.dueDate) < new Date(new Date().toISOString().split('T')[0])) && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('documents')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  drawerTab === 'documents'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FolderArchive className="h-3.5 w-3.5 text-blue-500" />
                <span>Documents ({selectedOrderDocuments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('details')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'details'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Work &amp; Client Overview
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('audit')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Audit Trail ({selectedOrder.auditTrail?.length || 0})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {drawerTab === 'stages' && (
                <div className="space-y-4">
                  {/* Progress Header Card */}
                  <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        Overall Execution Progress
                      </span>
                      <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 font-mono">
                        {selectedOrder.metrics.progressPercentage}%
                      </div>
                    </div>
                    <div className="text-right text-xs text-indigo-800 dark:text-indigo-300">
                      <div>Assigned to: <strong>{selectedOrder.ownerName}</strong></div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Target Due Date: {selectedOrder.dueDate}
                      </div>
                    </div>
                  </div>

                  {/* Stages List */}
                  <div className="space-y-3">
                    {(!selectedOrder.stages || selectedOrder.stages.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No workflow stages loaded for this work order.
                      </div>
                    ) : (
                      selectedOrder.stages.map(stage => {
                        const isCompleted = stage.status === 'completed';
                        const isInProgress = stage.status === 'in_progress';
                        const stageTasks = selectedOrderTasks.filter(t => t.stageId === stage.id);
                        return (
                          <div
                            key={stage.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isCompleted
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : isInProgress
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {/* Stage Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                    Stage {stage.sequence}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                    {stage.name}
                                  </h4>
                                  {stageTasks.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setDrawerTab('tasks')}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 cursor-pointer"
                                      title="View linked tasks for this stage"
                                    >
                                      <CheckSquare className="h-2.5 w-2.5" />
                                      <span>{stageTasks.length} {stageTasks.length === 1 ? 'task' : 'tasks'}</span>
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {stage.description}
                                </p>
                              </div>

                              {/* Stage Status Control Buttons */}
                              <div className="flex items-center space-x-1 shrink-0">
                                {stage.status !== 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStageStatusUpdate(stage.id, 'completed')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center space-x-1"
                                    title="Mark stage as completed"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>Complete</span>
                                  </button>
                                )}

                                {stage.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStageStatusUpdate(stage.id, 'in_progress')}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                                  >
                                    Start Stage
                                  </button>
                                )}

                                {stage.status === 'completed' && (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center space-x-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Completed</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Checklist Items */}
                            {stage.checklist && stage.checklist.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Verification Checklist:
                                </span>
                                {stage.checklist.map(item => (
                                  <label
                                    key={item.id}
                                    className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={() => handleToggleChecklist(stage.id, item.id)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className={item.completed ? 'line-through text-slate-400' : 'font-medium'}>
                                      {item.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* Mandatory Documents */}
                            {stage.mandatoryDocuments && stage.mandatoryDocuments.length > 0 && (
                              <div className="mt-2 text-[10px] text-slate-500">
                                <strong>Required Documents:</strong> {stage.mandatoryDocuments.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'tasks' && (
                <div className="space-y-4 text-xs">
                  {/* Tasks Metric Strip & Actions */}
                  <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Tasks Linked to Work Order {selectedOrder.id}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedOrder.clientName}</span> · Service: <span className="font-semibold">{selectedOrder.service}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                        <span className="text-slate-500">Tasks:</span>
                        <strong className="text-purple-600 dark:text-purple-400">{selectedOrderTasks.length}</strong>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-emerald-600 font-bold">{selectedOrderTasks.filter(t => t.status === 'completed').length} Done</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingTaskOpen(!isAddingTaskOpen);
                          setTaskFormAssigneeId(selectedOrder.ownerId || sessionUser.id);
                          setTaskFormDueDate(selectedOrder.dueDate || new Date().toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer flex items-center space-x-1 shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isAddingTaskOpen ? 'Close Form' : 'Link New Task'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Success Alert */}
                  {taskFormSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>{taskFormSuccess}</span>
                    </div>
                  )}

                  {/* Inline Form: Create & Link Task */}
                  {isAddingTaskOpen && (
                    <form
                      onSubmit={handleCreateLinkedTask}
                      className="p-4 rounded-xl bg-white dark:bg-slate-850 border-2 border-purple-300 dark:border-purple-700 shadow-md space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <Plus className="h-4 w-4 text-purple-600" />
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                            Create &amp; Link Task to Work Order ({selectedOrder.id})
                          </h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingTaskOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Task Title *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Verify Director DINs and PAN documentation"
                            value={taskFormTitle}
                            onChange={(e) => setTaskFormTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Link to Workflow Stage
                          </label>
                          <select
                            value={taskFormStageId}
                            onChange={(e) => setTaskFormStageId(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          >
                            <option value="">Entire Work Order (General)</option>
                            {selectedOrder.stages?.map((stg) => (
                              <option key={stg.id} value={stg.id}>
                                Stage {stg.sequence}: {stg.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Assign To *
                          </label>
                          <select
                            required
                            value={taskFormAssigneeId}
                            onChange={(e) => setTaskFormAssigneeId(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            <option value="">Select Employee...</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.role.toUpperCase()} · {emp.department})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Priority
                          </label>
                          <select
                            value={taskFormPriority}
                            onChange={(e) => setTaskFormPriority(e.target.value as WorkflowTaskPriority)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="urgent">Urgent SLA</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Due Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={taskFormDueDate}
                            onChange={(e) => setTaskFormDueDate(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Delegation Notes / Instructions for Assignee
                          </label>
                          <input
                            type="text"
                            placeholder="Specific notes or instructions for the team member executing this task..."
                            value={taskFormDelegationNotes}
                            onChange={(e) => setTaskFormDelegationNotes(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                      </div>

                      {/* Checklist Items */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Checklist Items (Optional)
                        </label>
                        {taskFormChecklist.map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder={`Checklist item ${idx + 1}`}
                              value={item}
                              onChange={(e) => {
                                const next = [...taskFormChecklist];
                                next[idx] = e.target.value;
                                setTaskFormChecklist(next);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            />
                            {taskFormChecklist.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setTaskFormChecklist(taskFormChecklist.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setTaskFormChecklist([...taskFormChecklist, ''])}
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer flex items-center space-x-1 mt-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add another checklist item</span>
                        </button>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsAddingTaskOpen(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                        >
                          Save &amp; Link Task
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-3">
                    {selectedOrderTasks.length === 0 ? (
                      <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
                        <CheckSquare className="h-8 w-8 text-slate-400 mx-auto" />
                        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          No tasks linked to this Work Order yet
                        </h5>
                        <p className="text-slate-500 text-xs max-w-sm mx-auto">
                          Break down Work Order {selectedOrder.id} into actionable tasks and assign them to your team members or specific workflow stages.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingTaskOpen(true);
                            setTaskFormAssigneeId(selectedOrder.ownerId || sessionUser.id);
                            setTaskFormDueDate(selectedOrder.dueDate || new Date().toISOString().split('T')[0]);
                          }}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center space-x-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Link First Task</span>
                        </button>
                      </div>
                    ) : (
                      selectedOrderTasks.map((task) => {
                        const isOverdue =
                          task.status !== 'completed' &&
                          new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]);
                        const isDueToday =
                          task.status !== 'completed' &&
                          task.dueDate === new Date().toISOString().split('T')[0];

                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all ${
                              task.status === 'completed'
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : isOverdue
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 shadow-xs'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 shadow-xs'
                            }`}
                          >
                            {/* Card Top: Title & Stage Link */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {task.id}
                                  </span>

                                  {task.stageName ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                                      <GitBranch className="h-2.5 w-2.5" />
                                      <span>{task.stageName}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      Work Order Level
                                    </span>
                                  )}

                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                      task.priority === 'urgent'
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                        : task.priority === 'high'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>

                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Status Badge with Quick Shift */}
                              <div className="shrink-0 flex items-center space-x-1.5">
                                <select
                                  value={task.status}
                                  onChange={(e) => {
                                    updateWorkflowTaskStatus(
                                      task.id,
                                      e.target.value as WorkflowTaskStatus,
                                      sessionUser,
                                      `Status modified via Work Order ${selectedOrder.id} drawer`
                                    );
                                    reloadData();
                                  }}
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                                    task.status === 'completed'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                                      : task.status === 'in_progress'
                                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300'
                                      : task.status === 'on_hold'
                                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300'
                                      : task.status === 'cancelled'
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                                  }`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="on_hold">On Hold</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>

                            {/* Mandatory 4 Creator Fields Row */}
                            <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* 1. Assigned To */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Assigned To
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <div className="h-6 w-6 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                                    {task.assignedToName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                      {task.assignedToName}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {task.assignedToRole?.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Due Date */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Due Date &amp; SLA
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {task.dueDate}
                                  </span>
                                  {isOverdue && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono">
                                      OVERDUE
                                    </span>
                                  )}
                                  {isDueToday && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                                      DUE TODAY
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 3. Completion % */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Completion %
                                  </span>
                                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                    {task.completionPercentage}%
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      task.completionPercentage === 100
                                        ? 'bg-emerald-500'
                                        : task.completionPercentage >= 50
                                        ? 'bg-purple-600'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${task.completionPercentage}%` }}
                                  />
                                </div>

                                {/* Quick % Clickers */}
                                <div className="flex items-center justify-between pt-0.5">
                                  {[0, 25, 50, 75, 100].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() => {
                                        updateWorkflowTaskCompletion(task.id, pct, sessionUser);
                                        reloadData();
                                      }}
                                      className={`text-[9px] font-mono px-1 py-0.2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ${
                                        task.completionPercentage === pct
                                          ? 'font-bold text-purple-600 dark:text-purple-400 underline'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Delegation Notes if present */}
                            {task.delegationNotes && (
                              <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-1.5">
                                <span className="font-bold shrink-0">Delegation Note ({task.delegatedByName || 'Manager'}):</span>
                                <span>{task.delegationNotes}</span>
                              </div>
                            )}

                            {/* Checklist if present */}
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-slate-150 dark:border-slate-800 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 block">
                                  Action Checklist ({task.checklist.filter(c => c.completed).length}/{task.checklist.length})
                                </span>
                                <div className="space-y-1">
                                  {task.checklist.map((item) => (
                                    <label
                                      key={item.id}
                                      className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => {
                                          toggleWorkflowTaskChecklist(task.id, item.id, !item.completed, sessionUser);
                                          reloadData();
                                        }}
                                        className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                      />
                                      <span className={item.completed ? 'line-through text-slate-400' : ''}>
                                        {item.title}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'documents' && (
                <div className="space-y-4">
                  <WorkflowDocumentsManagement
                    sessionUser={sessionUser}
                    preselectedClientId={selectedOrder.clientId}
                    preselectedWorkOrderId={selectedOrder.id}
                  />
                </div>
              )}

              {drawerTab === 'details' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      <span>Client Details</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block">Client Name:</span>
                        <strong className="text-slate-900 dark:text-white">{selectedOrder.clientName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Client ID:</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedOrder.clientId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Mobile Phone:</span>
                        <span>{selectedOrder.clientMobile}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Email Address:</span>
                        <span>{selectedOrder.clientEmail}</span>
                      </div>
                      {selectedOrder.clientPan && (
                        <div>
                          <span className="text-slate-400 block">PAN Number:</span>
                          <span className="font-mono">{selectedOrder.clientPan}</span>
                        </div>
                      )}
                      {selectedOrder.clientCategory && (
                        <div>
                          <span className="text-slate-400 block">Client Category:</span>
                          <span>{selectedOrder.clientCategory}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span>Work Order Assignment</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block">Assigned Owner:</span>
                        <strong>{selectedOrder.ownerName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Department:</span>
                        <span>{selectedOrder.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Start Date:</span>
                        <span>{selectedOrder.startDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SLA Target Due Date:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedOrder.dueDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Estimated Fee:</span>
                        <span>₹{selectedOrder.estimatedFee?.toLocaleString('en-IN') || '0'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Priority:</span>
                        <span className="uppercase font-bold">{selectedOrder.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lead Linkage if present */}
                  {selectedOrder.leadId && (
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                      <div className="flex items-center space-x-1.5 text-indigo-900 dark:text-indigo-200 font-bold">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span>Originated from Lead (Phase 4 Linkage)</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 text-xs">
                        Lead ID: <strong className="font-mono">{selectedOrder.leadId}</strong>
                        {selectedOrder.leadCustomerName && (
                          <span> &bull; Customer: {selectedOrder.leadCustomerName}</span>
                        )}
                        {selectedOrder.leadBusinessName && (
                          <span> &bull; Business: {selectedOrder.leadBusinessName}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'audit' && (
                <div className="space-y-2.5">
                  {(!selectedOrder.auditTrail || selectedOrder.auditTrail.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No audit history entries recorded.
                    </div>
                  ) : (
                    selectedOrder.auditTrail.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                            {entry.actionTitle}
                          </strong>
                          <span className="text-slate-400 font-mono">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          {entry.description}
                        </p>
                        <div className="text-[10px] text-slate-400">
                          By: {entry.performedBy.name} ({entry.performedBy.role || 'Staff'})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setReassignOrder(selectedOrder);
                  setSelectedNewOwnerId(selectedOrder.ownerId);
                }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Reassign Owner
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REASSIGN MODAL
      ========================================================================= */}
      {reassignOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Reassign Work Order: <span className="font-mono text-indigo-600">{reassignOrder.id}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select an employee to take ownership of this work order and its execution stages:
            </p>

            <select
              value={selectedNewOwnerId}
              onChange={(e) => setSelectedNewOwnerId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department} &bull; {emp.role})
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          QUICK STATUS MOVE MODAL
      ========================================================================= */}
      {quickStatusOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Move Work Order Status: <span className="font-mono text-indigo-600">{quickStatusOrder.id}</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Target Status:
              </label>
              <select
                value={newTargetStatus}
                onChange={(e) => setNewTargetStatus(e.target.value as WorkOrderStatus)}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
              >
                <option value="assigned">Assigned / Queue</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickStatusOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
