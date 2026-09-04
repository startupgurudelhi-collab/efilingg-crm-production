/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  Building2,
  FileCheck,
  AlertCircle,
  History,
  X,
  Eye,
  SlidersHorizontal,
  FolderKanban,
  Check,
  RefreshCw,
  Zap,
  Phone,
  Mail,
  CreditCard,
  GitBranch,
  Lock,
  Unlock,
  CheckSquare,
  ListOrdered,
  Sparkles,
  Tag,
  FolderArchive
} from 'lucide-react';
import { Employee } from '../../types';
import { getEmployees } from '../../lib/db';
import {
  WorkflowWorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  PREDEFINED_WORKFLOW_SERVICES,
  WORKFLOW_DEPARTMENTS,
  getWorkflowWorkOrders,
  createWorkflowWorkOrder,
  updateWorkOrderStatus,
  reassignWorkOrderOwner,
  generateNextWorkOrderId,
  updateWorkOrderStageStatus,
  toggleWorkOrderStageChecklist,
  saveWorkflowWorkOrders,
  computeWorkOrderExecutionMetrics
} from '../../lib/workflowWorkOrders';
import {
  WorkflowTemplate,
  WorkOrderStage,
  WorkOrderStageStatus,
  getWorkflowTemplateForService,
  getWorkflowTemplateById,
  checkStageDependencyStatus,
  instantiateStagesFromTemplate
} from '../../lib/workflowTemplates';
import {
  getWorkflowClients,
  WorkflowClient
} from '../../lib/workflowClients';
import { getWorkflowDocuments } from '../../lib/workflowDocuments';
import WorkflowTemplatesManagement from './WorkflowTemplatesManagement';
import WorkExecutionDashboard from './WorkExecutionDashboard';
import WorkflowTasksIntegration from './WorkflowTasksIntegration';
import WorkflowDocumentsManagement from './WorkflowDocumentsManagement';

interface WorkflowWorkOrdersManagementProps {
  sessionUser: Employee;
  initialTab?: 'orders' | 'create' | 'kanban' | 'templates' | 'audit' | 'execution' | 'tasks' | 'documents';
  preselectedClientId?: string;
  onNavigateToClient?: (clientId: string) => void;
}

export default function WorkflowWorkOrdersManagement({
  sessionUser,
  initialTab = 'orders',
  preselectedClientId,
  onNavigateToClient
}: WorkflowWorkOrdersManagementProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'kanban' | 'templates' | 'audit' | 'execution' | 'tasks' | 'documents'>(initialTab);
  const [workOrders, setWorkOrders] = useState<WorkflowWorkOrder[]>([]);
  const [clients, setClients] = useState<WorkflowClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'stages' | 'overview' | 'audit'>('stages');
  const [stageActionError, setStageActionError] = useState<string | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>(preselectedClientId || 'all');

  // Selected Order for Drawer / Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<WorkflowWorkOrder | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<WorkflowWorkOrder | null>(null);

  // Status Change Dialog
  const [statusChangeModal, setStatusChangeModal] = useState<{
    order: WorkflowWorkOrder;
    targetStatus: WorkOrderStatus;
  } | null>(null);
  const [statusRemarks, setStatusRemarks] = useState('');

  // Reassign Dialog
  const [reassignModal, setReassignModal] = useState<WorkflowWorkOrder | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Form State for "Create Work Order"
  const [formClientId, setFormClientId] = useState(preselectedClientId || '');
  const [clientSearchText, setClientSearchText] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [formServiceCode, setFormServiceCode] = useState('PLC');
  const [formServiceName, setFormServiceName] = useState('Private Limited Company Incorporation');
  const [formCustomServiceName, setFormCustomServiceName] = useState('');
  const [formDepartment, setFormDepartment] = useState('MCA & Corporate Legal');
  const [formOwnerId, setFormOwnerId] = useState(sessionUser.id);
  const [formPriority, setFormPriority] = useState<WorkOrderPriority>('medium');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [formRemarks, setFormRemarks] = useState('');
  const [formEstimatedFee, setFormEstimatedFee] = useState<number>(12000);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Reload data
  const loadData = () => {
    const loadedOrders = getWorkflowWorkOrders();
    const loadedClients = getWorkflowClients();
    const loadedEmployees = getEmployees();
    setWorkOrders(loadedOrders);
    setClients(loadedClients);
    setEmployees(loadedEmployees);
  };

  useEffect(() => {
    loadData();

    const handleOrdersUpdated = () => {
      loadData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'efilingg_crm_workflow_work_orders') {
        loadData();
      }
    };

    window.addEventListener('efilingg_workflow_work_orders_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('efilingg_workflow_work_orders_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (preselectedClientId) {
      setClientFilter(preselectedClientId);
      setFormClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

  // When initialTab changes from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle service dropdown selection in form
  const handleServiceChange = (code: string) => {
    setFormServiceCode(code);
    if (code === 'CUSTOM') {
      setFormServiceName('');
    } else {
      const predefined = PREDEFINED_WORKFLOW_SERVICES.find(s => s.code === code);
      if (predefined) {
        setFormServiceName(predefined.name);
        setFormDepartment(predefined.department);
        // compute default due date
        const d = new Date();
        d.setDate(d.getDate() + predefined.defaultTatDays);
        setFormDueDate(d.toISOString().split('T')[0]);
      }
    }
  };

  // Live Work ID preview for the form
  const liveWorkIdPreview = useMemo(() => {
    const code = formServiceCode === 'CUSTOM' ? (formCustomServiceName.slice(0, 4).toUpperCase() || 'WRK') : formServiceCode;
    return generateNextWorkOrderId(code);
  }, [formServiceCode, formCustomServiceName, workOrders]);

  // Filtered Client Selection for Form
  const filteredClientsForForm = useMemo(() => {
    if (!clientSearchText.trim()) return clients.slice(0, 8);
    const q = clientSearchText.toLowerCase();
    return clients.filter(
      c =>
        c.id.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.pan.toLowerCase().includes(q)
    );
  }, [clients, clientSearchText]);

  const selectedClientForForm = useMemo(() => {
    return clients.find(c => c.id === formClientId);
  }, [clients, formClientId]);

  // Filtered Work Orders for table/kanban
  const filteredOrders = useMemo(() => {
    return workOrders.filter(order => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          order.id.toLowerCase().includes(q) ||
          order.clientId.toLowerCase().includes(q) ||
          order.clientName.toLowerCase().includes(q) ||
          order.service.toLowerCase().includes(q) ||
          order.ownerName.toLowerCase().includes(q) ||
          order.department.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Status
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'all' && order.priority !== priorityFilter) return false;

      // Department
      if (departmentFilter !== 'all' && order.department !== departmentFilter) return false;

      // Service
      if (serviceFilter !== 'all' && order.serviceCode !== serviceFilter) return false;

      // Client
      if (clientFilter !== 'all' && order.clientId !== clientFilter) return false;

      return true;
    });
  }, [workOrders, searchQuery, statusFilter, priorityFilter, departmentFilter, serviceFilter, clientFilter]);

  // Status Metrics
  const stats = useMemo(() => {
    const total = workOrders.length;
    const inProgress = workOrders.filter(o => o.status === 'in_progress').length;
    const review = workOrders.filter(o => o.status === 'review').length;
    const completed = workOrders.filter(o => o.status === 'completed').length;
    const assigned = workOrders.filter(o => o.status === 'assigned').length;
    const urgent = workOrders.filter(o => o.priority === 'urgent' && o.status !== 'completed').length;
    return { total, inProgress, review, completed, assigned, urgent };
  }, [workOrders]);

  // Handle Form Submission
  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    // Validate client
    if (!formClientId) {
      setFormError('Every Work Order must be linked with a Client. Please select a Client from the list.');
      return;
    }

    const resolvedService = formServiceCode === 'CUSTOM' ? formCustomServiceName.trim() : formServiceName;
    if (!resolvedService) {
      setFormError('Please provide a valid service name.');
      return;
    }

    const assignedOwner = employees.find(emp => emp.id === formOwnerId);
    const ownerName = assignedOwner ? assignedOwner.name : sessionUser.name;

    const result = createWorkflowWorkOrder(
      {
        clientId: formClientId,
        service: resolvedService,
        serviceCode: formServiceCode === 'CUSTOM' ? 'WRK' : formServiceCode,
        ownerId: formOwnerId,
        ownerName,
        department: formDepartment,
        priority: formPriority,
        startDate: formStartDate,
        dueDate: formDueDate,
        remarks: formRemarks,
        estimatedFee: formEstimatedFee
      },
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      }
    );

    if (!result.success) {
      setFormError(result.errorMessage || 'Failed to create work order.');
      return;
    }

    // Success
    loadData();
    setFormSuccessMessage(`Work Order ${result.workOrder?.id} successfully generated & linked to Client ${selectedClientForForm?.clientName}!`);
    setFormRemarks('');
    
    // Auto switch to orders tab after brief delay
    setTimeout(() => {
      setActiveTab('orders');
      if (result.workOrder) {
        setSelectedOrder(result.workOrder);
      }
    }, 1200);
  };

  // Quick Status Transition
  const executeStatusChange = () => {
    if (!statusChangeModal) return;
    const success = updateWorkOrderStatus(
      statusChangeModal.order.id,
      statusChangeModal.targetStatus,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      },
      statusRemarks.trim() || undefined
    );

    if (success) {
      loadData();
      if (selectedOrder && selectedOrder.id === statusChangeModal.order.id) {
        setSelectedOrder(prev => (prev ? { ...prev, status: statusChangeModal.targetStatus } : null));
      }
      setStatusChangeModal(null);
      setStatusRemarks('');
    }
  };

  // Reassign Owner
  const executeReassignment = () => {
    if (!reassignModal || !newOwnerId) return;
    const targetEmp = employees.find(e => e.id === newOwnerId);
    if (!targetEmp) return;

    const success = reassignWorkOrderOwner(
      reassignModal.id,
      targetEmp.id,
      targetEmp.name,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      },
      reassignReason.trim() || undefined
    );

    if (success) {
      loadData();
      if (selectedOrder && selectedOrder.id === reassignModal.id) {
        setSelectedOrder(prev => (prev ? { ...prev, ownerId: targetEmp.id, ownerName: targetEmp.name } : null));
      }
      setReassignModal(null);
      setNewOwnerId('');
      setReassignReason('');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Work ID',
      'Client ID',
      'Client Name',
      'Client Mobile',
      'Service',
      'Service Code',
      'Owner',
      'Department',
      'Priority',
      'Start Date',
      'Due Date',
      'Status',
      'Estimated Fee'
    ];

    const rows = filteredOrders.map(o => [
      `"${o.id}"`,
      `"${o.clientId}"`,
      `"${o.clientName.replace(/"/g, '""')}"`,
      `"${o.clientMobile}"`,
      `"${o.service.replace(/"/g, '""')}"`,
      `"${o.serviceCode}"`,
      `"${o.ownerName}"`,
      `"${o.department}"`,
      `"${o.priority.toUpperCase()}"`,
      `"${o.startDate}"`,
      `"${o.dueDate}"`,
      `"${o.status.toUpperCase()}"`,
      `"${o.estimatedFee || 0}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eFilingg_Work_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Priority badge styling helper
  const getPriorityBadge = (priority: WorkOrderPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'medium':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'low':
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'in_progress':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'review':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'assigned':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'on_hold':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'draft':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  // Stage lifecycle handlers
  const handleStageStatusUpdate = (stageId: string, newStatus: WorkOrderStageStatus, notes?: string) => {
    if (!selectedOrder) return;
    setStageActionError(null);
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
      setStageActionError(result.message || 'Failed to update stage status.');
      return;
    }

    loadData();
    if (result.workOrder) {
      setSelectedOrder(result.workOrder);
    }
  };

  const handleStageChecklistToggle = (stageId: string, checklistId: string) => {
    if (!selectedOrder) return;
    setStageActionError(null);
    const stage = selectedOrder.stages.find(s => s.id === stageId);
    const item = stage?.checklist.find(c => c.id === checklistId);
    const nextCompleted = !item?.completed;

    const ok = toggleWorkOrderStageChecklist(
      selectedOrder.id,
      stageId,
      checklistId,
      nextCompleted,
      {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role
      }
    );

    if (!ok) {
      setStageActionError('Failed to toggle checklist item.');
      return;
    }

    loadData();
    const refreshedOrders = getWorkflowWorkOrders();
    const refreshed = refreshedOrders.find(o => o.id === selectedOrder.id);
    if (refreshed) {
      setSelectedOrder(refreshed);
    }
  };

  const handleLoadStagesFromTemplate = () => {
    if (!selectedOrder) return;
    const tmpl = getWorkflowTemplateForService(selectedOrder.service, selectedOrder.serviceCode);
    if (!tmpl) {
      setStageActionError('No template found matching this service.');
      return;
    }
    const instantiatedStages = instantiateStagesFromTemplate(tmpl, selectedOrder.startDate);
    const orders = getWorkflowWorkOrders();
    const idx = orders.findIndex(o => o.id === selectedOrder.id);
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        templateId: tmpl.id,
        stages: instantiatedStages
      };
      saveWorkflowWorkOrders(orders);
      loadData();
      setSelectedOrder(orders[idx]);
    }
  };

  // Consolidated audit trail entries
  const allAuditEntries = useMemo(() => {
    const list: { orderId: string; clientName: string; entry: any }[] = [];
    workOrders.forEach(o => {
      (o.auditTrail || []).forEach(e => {
        list.push({
          orderId: o.id,
          clientName: o.clientName,
          entry: e
        });
      });
    });
    return list.sort((a, b) => new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime());
  }, [workOrders]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Header Banner & Quick Action */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono font-bold tracking-wider uppercase">
                PHASE 2 ENGINE
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-indigo-200 text-xs font-mono">Format: {'{SERVICECODE}-{YEAR}-{SEQUENCE}'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-indigo-400" />
              <span>Work Order Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every Work Order is strictly linked to an enrolled Client ID (<span className="text-indigo-300 font-mono">CL-YYYY-SEQ</span>) with automated Service Code generation, SLA due dates, owner assignment, and complete audit tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setActiveTab('create');
                setFormSuccessMessage(null);
                setFormError(null);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Work Order</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
              title="Export filtered work orders to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
              title="Refresh Work Orders"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Work Orders</span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">Assigned / Queue</span>
            <span className="text-lg sm:text-xl font-black text-blue-300 font-mono">{stats.assigned}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider block">In Progress</span>
            <span className="text-lg sm:text-xl font-black text-indigo-300 font-mono">{stats.inProgress}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider block">Under Review</span>
            <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">{stats.review}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider block">Completed</span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">{stats.completed}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-red-300 font-semibold uppercase tracking-wider block">Urgent / Critical</span>
            <span className="text-lg sm:text-xl font-black text-red-300 font-mono">{stats.urgent}</span>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('execution')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'execution'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Briefcase className="h-4 w-4 text-indigo-400" />
            <span>Work Execution (Phase 5)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-white font-mono font-bold">
              LIVE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <CheckSquare className="h-4 w-4 text-purple-400" />
            <span>Tasks Integration (Phase 6)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500 text-white font-mono font-bold">
              NEW
            </span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FolderArchive className="h-4 w-4 text-blue-400" />
            <span>Document Vault (Phase 7)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500 text-white font-mono font-bold">
              VAULT
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Work Orders Directory ({filteredOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Lifecycle Kanban</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('create');
              setFormSuccessMessage(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Generate Work Order</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Audit Vault ({allAuditEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>Workflow Templates</span>
          </button>
        </div>

        {/* Client filter indicator if active */}
        {clientFilter !== 'all' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs">
            <span className="font-semibold">Filtering Client:</span>
            <span className="font-mono font-bold">{clientFilter}</span>
            <button
              onClick={() => setClientFilter('all')}
              className="ml-1 hover:text-red-500 cursor-pointer"
              title="Clear client filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          PHASE 5: WORK EXECUTION DASHBOARD (MY WORKS, TEAM WORKS, ALL WORKS)
      ======================================================== */}
      {activeTab === 'execution' && (
        <WorkExecutionDashboard
          sessionUser={sessionUser}
          initialScope="my"
          initialView="list"
          onNavigateToClient={onNavigateToClient}
          onOpenCreateModal={() => {
            setActiveTab('create');
            setFormSuccessMessage(null);
          }}
        />
      )}

      {/* ========================================================
          PHASE 6: TASK INTEGRATION (MY ASSIGNED, MY DELEGATED, TEAM TASKS)
      ======================================================== */}
      {activeTab === 'tasks' && (
        <WorkflowTasksIntegration
          sessionUser={sessionUser}
          initialScope="my_assigned"
          onNavigateToWorkOrder={(_woId) => {
            setActiveTab('execution');
          }}
          onNavigateToClient={onNavigateToClient}
        />
      )}

      {/* ========================================================
          PHASE 7: DOCUMENT MANAGEMENT REPOSITORY (CLIENT -> WORK ORDER -> DOCUMENTS)
      ======================================================== */}
      {activeTab === 'documents' && (
        <WorkflowDocumentsManagement
          sessionUser={sessionUser}
          preselectedClientId={clientFilter !== 'all' ? clientFilter : undefined}
          preselectedWorkOrderId={selectedOrder?.id}
          onNavigateToWorkOrder={(_woId) => {
            setActiveTab('execution');
          }}
          onNavigateToClient={onNavigateToClient}
        />
      )}

      {/* ========================================================
          TAB 1: WORK ORDERS DIRECTORY (TABLE & FILTER VIEW)
      ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Multi-Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Work ID (e.g. PLC-2026-000001), Client ID, Client Name, Service, Owner..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {WORKFLOW_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Service Filter */}
                <select
                  value={serviceFilter}
                  onChange={e => setServiceFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <option value="all">All Services</option>
                  {PREDEFINED_WORKFLOW_SERVICES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Work Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">Work ID & Service</th>
                    <th className="py-3 px-3.5">Linked Client (CL-ID)</th>
                    <th className="py-3 px-3.5">Owner & Dept</th>
                    <th className="py-3 px-3.5">Priority</th>
                    <th className="py-3 px-3.5">Timeline (Due Date)</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Layers className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">No Work Orders Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting search filters or create a new Work Order.
                        </p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Generate Work Order</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr
                        key={order.id}
                        className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* 1. Work ID & Service */}
                        <td className="py-3 px-3.5 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                                {order.id}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                {order.serviceCode}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {order.service}
                            </p>
                            {order.estimatedFee ? (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                ₹{order.estimatedFee.toLocaleString('en-IN')}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        {/* 2. Linked Client */}
                        <td className="py-3 px-3.5 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                                {order.clientId}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                              <span>{order.clientName}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {order.clientMobile}
                            </p>
                          </div>
                        </td>

                        {/* 3. Owner & Department */}
                        <td className="py-3 px-3.5 align-top">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <User className="h-3 w-3 text-indigo-500" />
                              <span>{order.ownerName}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">
                              {order.department}
                            </span>
                          </div>
                        </td>

                        {/* 4. Priority */}
                        <td className="py-3 px-3.5 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadge(
                              order.priority
                            )}`}
                          >
                            {order.priority}
                          </span>
                        </td>

                        {/* 5. Timeline (Start -> Due) */}
                        <td className="py-3 px-3.5 align-top">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>Due: {order.dueDate}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Started: {order.startDate}
                            </span>
                          </div>
                        </td>

                        {/* 6. Status */}
                        <td className="py-3 px-3.5 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* 7. Actions */}
                        <td
                          className="py-3 px-3.5 align-top text-right"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setOrderToPrint(order);
                                setIsPrintModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Print Work Order Slip"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                              title="View Full Work Order Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: WORK ORDER LIFECYCLE KANBAN
      ======================================================== */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Work Order Stage Board</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track and move work orders across execution lifecycle stages</p>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">{filteredOrders.length} Total Orders</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              { id: 'assigned', title: 'Assigned / Queue', color: 'border-blue-400', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300' },
              { id: 'in_progress', title: 'In Progress', color: 'border-indigo-500', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300' },
              { id: 'review', title: 'Under Review', color: 'border-purple-500', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300' },
              { id: 'completed', title: 'Completed', color: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' },
              { id: 'on_hold', title: 'On Hold / Paused', color: 'border-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' }
            ].map(col => {
              const colOrders = filteredOrders.filter(o => o.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3 border-t-4 ${col.color} border border-slate-200/80 dark:border-slate-800 space-y-2.5 flex flex-col min-h-[450px]`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${col.badge}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {colOrders.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs text-center p-2">
                        No orders in this stage
                      </div>
                    ) : (
                      colOrders.map(order => (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-750 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px]">
                              {order.id}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${getPriorityBadge(
                                order.priority
                              )}`}
                            >
                              {order.priority}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2">
                              {order.service}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {order.clientName} ({order.clientId})
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="truncate max-w-[100px]">{order.ownerName}</span>
                            <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                              Due: {order.dueDate}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: CREATE WORK ORDER FORM (HIGH SPEED ENROLLMENT)
      ======================================================== */}
      {activeTab === 'create' && (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold border border-indigo-200 dark:border-indigo-800">
                  WORK ID GENERATOR
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Every Work Order must be linked with a Client</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Generate New Work Order
              </h2>
            </div>

            {/* Real-time Work ID sequence Preview */}
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned Work ID Preview</span>
              <span className="font-mono font-black text-lg sm:text-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 inline-block shadow-xs">
                {liveWorkIdPreview}
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {/* Form Card */}
          <form onSubmit={handleCreateWorkOrder} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6">
            {/* SECTION 1: MANDATORY CLIENT LINKING */}
            <div className="space-y-3 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>1. Linked Client (Mandatory Requirement)</span>
                  <span className="text-red-500">*</span>
                </label>
                {selectedClientForForm && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>Client Linked: {selectedClientForForm.id}</span>
                  </span>
                )}
              </div>

              {/* Client Selector with search dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Client by CL-ID (e.g. CL-2026-000001), Client Name, Mobile, PAN..."
                      value={clientSearchText}
                      onChange={e => {
                        setClientSearchText(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Direct Dropdown of enrolled clients */}
                  <select
                    value={formClientId}
                    onChange={e => {
                      setFormClientId(e.target.value);
                      setIsClientDropdownOpen(false);
                    }}
                    className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer max-w-[220px]"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.id} - {c.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Autocomplete Dropdown popup */}
                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Matching Enrolled Clients ({filteredClientsForForm.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsClientDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {filteredClientsForForm.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No clients matched "{clientSearchText}". Please enroll client first in Workflow Management.
                      </div>
                    ) : (
                      filteredClientsForForm.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setFormClientId(c.id);
                            setClientSearchText(`${c.id} - ${c.clientName}`);
                            setIsClientDropdownOpen(false);
                          }}
                          className={`p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors flex items-center justify-between ${
                            formClientId === c.id ? 'bg-indigo-50/70 dark:bg-indigo-950/60' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                {c.id}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {c.clientName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                              <span>Mobile: {c.mobile}</span>
                              <span>•</span>
                              <span>PAN: {c.pan}</span>
                              <span>•</span>
                              <span>{c.clientCategory}</span>
                            </div>
                          </div>
                          {formClientId === c.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Client Card Preview */}
              {selectedClientForForm ? (
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300">
                        {selectedClientForForm.id}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {selectedClientForForm.clientName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {selectedClientForForm.clientCategory}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Phone: {selectedClientForForm.mobile}</span>
                      <span>Email: {selectedClientForForm.email}</span>
                      <span>PAN: {selectedClientForForm.pan}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormClientId('');
                      setClientSearchText('');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold self-start sm:self-auto cursor-pointer"
                  >
                    Change Client
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Note: A Work Order cannot be generated without an enrolled Client ID.
                </p>
              )}
            </div>

            {/* SECTION 2: SERVICE & SERVICE CODE SELECTION */}
            <div className="space-y-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>2. Service Details & Code Assignment</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Standard Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formServiceCode}
                    onChange={e => handleServiceChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                  >
                    {PREDEFINED_WORKFLOW_SERVICES.map(s => (
                      <option key={s.code} value={s.code}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                    <option value="CUSTOM">[OTHER] Custom Service...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formDepartment}
                    onChange={e => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                  >
                    {WORKFLOW_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formServiceCode === 'CUSTOM' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Custom Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter custom service title (e.g. Legal Due Diligence, ISO 9001 Certification)"
                    value={formCustomServiceName}
                    onChange={e => setFormCustomServiceName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              )}
            </div>

            {/* SECTION 3: ASSIGNMENT, PRIORITY & DATES */}
            <div className="space-y-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>3. Owner, Priority & SLA Deadlines</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignee / Owner <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={e => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as WorkOrderPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date (SLA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Professional Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={formEstimatedFee}
                    onChange={e => setFormEstimatedFee(Number(e.target.value))}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Special Instructions / Operational Remarks
                  </label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={e => setFormRemarks(e.target.value)}
                    placeholder="e.g. Urgent filing required before month-end ROC board meeting"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: AUTO-LOADED WORKFLOW TEMPLATE PREVIEW */}
            {(() => {
              const matchedTemplate = getWorkflowTemplateForService(
                formServiceCode === 'CUSTOM' ? formCustomServiceName : formServiceName,
                formServiceCode
              );

              return (
                <div className="space-y-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>4. Automated Workflow Stages Engine</span>
                    </label>
                    {matchedTemplate && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                        ⚡ Template Matched: {matchedTemplate.stages.length} Stages Preloaded
                      </span>
                    )}
                  </div>

                  {matchedTemplate ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{matchedTemplate.serviceName}</span>
                        <span className="font-mono text-slate-500">
                          Expected SLA: {matchedTemplate.totalExpectedDurationDays} Days TAT
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {matchedTemplate.stages
                          .slice()
                          .sort((a, b) => a.sequence - b.sequence)
                          .map((stg, sIdx) => (
                            <div
                              key={stg.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300 shadow-xs"
                            >
                              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center">
                                {stg.sequence}
                              </span>
                              <span className="font-medium truncate max-w-[160px]">{stg.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({stg.expectedDurationDays}d)</span>
                              {sIdx < matchedTemplate.stages.length - 1 && (
                                <span className="text-slate-300 dark:text-slate-600 ml-1">→</span>
                              )}
                            </div>
                          ))}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                        ✓ All stages, sequential dependencies, SLA durations, and quality checklists will be automatically attached to this Work Order upon generation.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No predefined workflow template matches this custom service name. You can attach stages manually after generation or choose a standard service.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Submission Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Generate & Link Work Order ({liveWorkIdPreview})</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 4: AUDIT TRAIL VAULT
      ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Work Order Immutable Audit Trail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full chronological logs of Work Order creation, stage changes, owner assignments, and timeline revisions.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {allAuditEntries.length} Recorded Events
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {allAuditEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recorded audit entries yet.
              </div>
            ) : (
              allAuditEntries.map((item, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                          {item.orderId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.entry.actionTitle}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.entry.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.entry.description}
                      </p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>By: {item.entry.performedBy.name}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono">{new Date(item.entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: WORKFLOW TEMPLATES MANAGEMENT
      ======================================================== */}
      {activeTab === 'templates' && (
        <WorkflowTemplatesManagement
          sessionUser={sessionUser}
          onUseTemplateInWorkOrder={(templateId, _serviceName) => {
            setActiveTab('create');
            const tmpl = getWorkflowTemplateById(templateId);
            if (tmpl) {
              setFormServiceCode(tmpl.serviceCode);
              setFormServiceName(tmpl.serviceName);
              setFormDepartment(tmpl.department);
              const d = new Date(formStartDate);
              d.setDate(d.getDate() + (tmpl.totalExpectedDurationDays || 7));
              setFormDueDate(d.toISOString().split('T')[0]);
            }
          }}
        />
      )}

      {/* ========================================================
          MODAL: WORK ORDER DETAILS DRAWER / INSPECTOR
      ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                    {selectedOrder.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityBadge(
                      selectedOrder.priority
                    )}`}
                  >
                    {selectedOrder.priority}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedOrder.service}
                </h3>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setOrderToPrint(selectedOrder);
                    setIsPrintModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  title="Print Slip"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setStageActionError(null);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="px-5 pt-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerActiveTab('stages')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  drawerActiveTab === 'stages'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Workflow Stages & Tasks ({selectedOrder.stages?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerActiveTab('overview')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  drawerActiveTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Client & Assignment</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerActiveTab('audit')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  drawerActiveTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Lifecycle Log ({selectedOrder.auditTrail?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('documents');
                }}
                className="pb-2 px-3 text-xs font-bold border-b-2 border-transparent text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                title="Jump to Document Vault for this Work Order"
              >
                <FolderArchive className="h-3.5 w-3.5" />
                <span>Open Document Vault (Phase 7)</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Error Banner */}
              {stageActionError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="font-semibold">{stageActionError}</span>
                  </div>
                  <button
                    onClick={() => setStageActionError(null)}
                    className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* ========================================================
                  DRAWER TAB 1: WORKFLOW STAGES & CHECKLISTS
              ======================================================== */}
              {drawerActiveTab === 'stages' && (
                <div className="space-y-4">
                  {/* Progress Header */}
                  {selectedOrder.stages && selectedOrder.stages.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Stage Completion Progress</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedOrder.stages.filter(s => s.status === 'completed').length} of {selectedOrder.stages.length} Stages Completed ({Math.round(
                            (selectedOrder.stages.filter(s => s.status === 'completed').length / selectedOrder.stages.length) * 100
                          )}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round(
                              (selectedOrder.stages.filter(s => s.status === 'completed').length / selectedOrder.stages.length) * 100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Empty Stages Notice */}
                  {(!selectedOrder.stages || selectedOrder.stages.length === 0) ? (
                    <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                      <Layers className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No workflow stages loaded for this order yet
                      </p>
                      <p className="text-slate-500 max-w-md mx-auto text-xs">
                        Load the standard stages, dependencies, and checklists from the predefined template for {selectedOrder.service}.
                      </p>
                      <button
                        onClick={handleLoadStagesFromTemplate}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Load Template Stages Now</span>
                      </button>
                    </div>
                  ) : (
                    /* Stage Cards List */
                    <div className="space-y-3">
                      {selectedOrder.stages
                        .slice()
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((stage, idx) => {
                          const depStatus = checkStageDependencyStatus(stage, selectedOrder.stages);
                          const blockersText = depStatus.unmetDependencies
                            .map(d => `Stage #${d.sequence} (${d.name})`)
                            .join(', ');
                          const depReason = depStatus.isBlocked
                            ? `Blocked: Prerequisite ${blockersText} must be completed first.`
                            : '';
                          const isBlocked = depStatus.isBlocked && stage.status !== 'completed';
                          const completedChecklists = (stage.checklist || []).filter(c => c.completed).length;
                          const totalChecklists = (stage.checklist || []).length;

                          return (
                            <div
                              key={stage.id}
                              className={`p-4 rounded-xl border transition-all ${
                                stage.status === 'completed'
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : stage.status === 'in_progress'
                                  ? 'bg-white dark:bg-slate-850 border-indigo-300 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-500/20'
                                  : isBlocked
                                  ? 'bg-slate-50/80 dark:bg-slate-900/60 border-rose-200 dark:border-rose-900/40 opacity-90'
                                  : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                              }`}
                            >
                              {/* Stage Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center space-x-2.5">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                      stage.status === 'completed'
                                        ? 'bg-emerald-600 text-white'
                                        : stage.status === 'in_progress'
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {stage.sequence}
                                  </span>
                                  <div>
                                    <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                                      {stage.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                      <span className="flex items-center gap-1 font-mono">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        <span>{stage.expectedDurationDays} Days SLA</span>
                                      </span>
                                      {stage.dependencies && stage.dependencies.length > 0 && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono">
                                            Depends on: Stage #{stage.dependencies.map(dId => {
                                              const parent = selectedOrder.stages.find(s => s.id === dId);
                                              return parent ? parent.sequence : dId;
                                            }).join(', #')}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Badge & Actions */}
                                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                      stage.status === 'completed'
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                        : stage.status === 'in_progress'
                                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 animate-pulse'
                                        : isBlocked
                                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {stage.status.replace(/_/g, ' ')}
                                  </span>

                                  {/* Transition Action Buttons */}
                                  {stage.status !== 'completed' && (
                                    <>
                                      {stage.status !== 'in_progress' && (
                                        <button
                                          onClick={() => handleStageStatusUpdate(stage.id, 'in_progress')}
                                          disabled={isBlocked}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            isBlocked
                                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                                          }`}
                                          title={isBlocked ? depReason : 'Start stage execution'}
                                        >
                                          Start Stage
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleStageStatusUpdate(stage.id, 'completed')}
                                        disabled={isBlocked}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                          isBlocked
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                        }`}
                                        title={isBlocked ? depReason : 'Mark stage completed'}
                                      >
                                        Mark Done
                                      </button>
                                    </>
                                  )}

                                  {stage.status === 'completed' && (
                                    <button
                                      onClick={() => handleStageStatusUpdate(stage.id, 'in_progress')}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                      title="Reopen this stage"
                                    >
                                      Reopen
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Stage Body */}
                              <div className="pt-2.5 space-y-2.5">
                                {stage.description && (
                                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                                    {stage.description}
                                  </p>
                                )}

                                {/* Dependency Notice */}
                                {isBlocked && (
                                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                    <span>{depReason}</span>
                                  </div>
                                )}

                                {!depStatus.isBlocked && stage.dependencies && stage.dependencies.length > 0 && stage.status !== 'completed' && (
                                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                                    <Unlock className="h-3 w-3 text-emerald-500" />
                                    <span>Prerequisite stages completed. Ready for execution.</span>
                                  </div>
                                )}

                                {/* Checklist Items */}
                                {stage.checklist && stage.checklist.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                      <span>Quality & Compliance Tasks</span>
                                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                        {completedChecklists}/{totalChecklists} done
                                      </span>
                                    </div>
                                    <div className="space-y-1 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                      {stage.checklist.map(item => (
                                        <div
                                          key={item.id}
                                          onClick={() => handleStageChecklistToggle(stage.id, item.id)}
                                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                                            item.completed
                                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <div
                                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                                item.completed
                                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                              }`}
                                            >
                                              {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>
                                            <span className={item.completed ? 'line-through opacity-70' : 'font-medium'}>
                                              {item.title}
                                            </span>
                                          </div>

                                          {item.completed && item.completedAt && (
                                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                              {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Mandatory Documents */}
                                {stage.mandatoryDocuments && stage.mandatoryDocuments.length > 0 && (
                                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                    <span className="font-bold text-slate-400">Statutory Documents:</span>
                                    {stage.mandatoryDocuments.map((doc, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                                      >
                                        {doc}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Completed Footer Info */}
                                {stage.status === 'completed' && stage.completedDate && (
                                  <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                                    <span>Completed on: {new Date(stage.completedDate).toLocaleString()}</span>
                                    <span>{stage.completedBy ? `By: ${stage.completedBy.name}` : ''}</span>
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

              {/* ========================================================
                  DRAWER TAB 2: OVERVIEW & CLIENT / ASSIGNMENT
              ======================================================== */}
              {drawerActiveTab === 'overview' && (
                <div className="space-y-4">
                  {/* Client & Ownership Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Client Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Linked Client
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {selectedOrder.clientId}
                        </span>
                        {onNavigateToClient && (
                          <button
                            onClick={() => onNavigateToClient(selectedOrder.clientId)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>View Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedOrder.clientName}
                      </p>
                      <p className="text-slate-500 font-mono">Phone: {selectedOrder.clientMobile}</p>
                      <p className="text-slate-500 font-mono">Email: {selectedOrder.clientEmail}</p>
                    </div>

                    {/* Operations & Owner Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Execution Assignee
                        </span>
                        <button
                          onClick={() => {
                            setReassignModal(selectedOrder);
                            setNewOwnerId(selectedOrder.ownerId);
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          Reassign
                        </button>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span>{selectedOrder.ownerName}</span>
                      </p>
                      <p className="text-slate-500">Dept: {selectedOrder.department}</p>
                      <div className="pt-1 flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono">
                        <span>Started: {selectedOrder.startDate}</span>
                        <span className="font-bold text-red-600 dark:text-red-400">Due: {selectedOrder.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Overall Work Order Status Transition
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['assigned', 'in_progress', 'review', 'completed', 'on_hold'] as WorkOrderStatus[]).map(st => (
                        <button
                          key={st}
                          disabled={selectedOrder.status === st}
                          onClick={() =>
                            setStatusChangeModal({
                              order: selectedOrder,
                              targetStatus: st
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                            selectedOrder.status === st
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  {selectedOrder.remarks && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Operational Notes & Remarks
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedOrder.remarks}
                      </p>
                    </div>
                  )}

                  {/* Financial Details */}
                  {selectedOrder.estimatedFee ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Estimated Professional Fee</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        ₹{selectedOrder.estimatedFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ========================================================
                  DRAWER TAB 3: AUDIT VAULT / LIFECYCLE LOG
              ======================================================== */}
              {drawerActiveTab === 'audit' && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Work Order Lifecycle Audit Trail ({selectedOrder.auditTrail?.length || 0})
                  </span>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {(selectedOrder.auditTrail || []).map((entry, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-900 text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{entry.actionTitle}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">{entry.description}</p>
                        <span className="text-[10px] text-indigo-500 font-medium">Actor: {entry.performedBy.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-mono">
                {selectedOrder.stages?.length || 0} Stages Configured
              </span>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setStageActionError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-bold text-xs cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: STATUS CHANGE CONFIRMATION
      ======================================================== */}
      {statusChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-600" />
              <span>Update Work Order Status</span>
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Moving <span className="font-mono font-bold text-indigo-600">{statusChangeModal.order.id}</span> from{' '}
              <span className="font-bold uppercase">{statusChangeModal.order.status}</span> to{' '}
              <span className="font-bold uppercase text-indigo-600">{statusChangeModal.targetStatus}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Status Remark / Progress Note
              </label>
              <textarea
                value={statusRemarks}
                onChange={e => setStatusRemarks(e.target.value)}
                placeholder="e.g. Document scrutiny verified. Form submitted on government portal."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusChangeModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeStatusChange}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm & Log Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REASSIGN OWNER
      ======================================================== */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>Reassign Work Order Assignee</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select New Owner
              </label>
              <select
                value={newOwnerId}
                onChange={e => setNewOwnerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role} - {emp.department || 'Operations'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Reassignment
              </label>
              <input
                type="text"
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                placeholder="e.g. Workload balancing / Specialized legal expertise required"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeReassignment}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Transfer & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRINTABLE WORK ORDER SLIP (OFFICIAL RECORD)
      ======================================================== */}
      {isPrintModalOpen && orderToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header / Printable Logo */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-600">
                  EFILINGG ENTERPRISE WORK ORDER
                </span>
                <h2 className="text-xl font-black text-slate-900">Work Execution Slip</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">WORK ORDER ID</span>
                <span className="font-mono font-black text-base text-indigo-600">{orderToPrint.id}</span>
              </div>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Information</span>
                <p className="font-bold text-slate-900">{orderToPrint.clientName}</p>
                <p className="font-mono text-slate-600">ID: {orderToPrint.clientId}</p>
                <p className="text-slate-600">Phone: {orderToPrint.clientMobile}</p>
                {orderToPrint.clientPan && <p className="font-mono text-slate-600">PAN: {orderToPrint.clientPan}</p>}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Service & Department</span>
                <p className="font-bold text-slate-900">{orderToPrint.service}</p>
                <p className="text-slate-600">Dept: {orderToPrint.department}</p>
                <p className="font-mono text-indigo-600 font-bold">Code: {orderToPrint.serviceCode}</p>
                <p className="text-emerald-700 font-bold">Fee: ₹{(orderToPrint.estimatedFee || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assignee & SLA</span>
                <p className="font-bold text-slate-900">{orderToPrint.ownerName}</p>
                <p className="text-slate-600">Start: {orderToPrint.startDate}</p>
                <p className="font-bold text-red-600">Due: {orderToPrint.dueDate}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Status & Priority</span>
                <p className="font-bold uppercase text-indigo-600">{orderToPrint.status.replace(/_/g, ' ')}</p>
                <p className="font-bold uppercase text-amber-600">Priority: {orderToPrint.priority}</p>
                <p className="text-[10px] text-slate-400">Created: {new Date(orderToPrint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {orderToPrint.remarks && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Remarks</span>
                <p className="text-slate-700">{orderToPrint.remarks}</p>
              </div>
            )}

            {/* Print Signature Block */}
            <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs text-slate-500">
              <div className="border-t border-slate-300 pt-2">
                <span>Authorized Signatory</span>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <span>Assigned Executive Signature</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Work Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
