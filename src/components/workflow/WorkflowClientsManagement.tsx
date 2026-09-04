/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Building2,
  Sparkles,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Layers,
  Flame,
  RefreshCw,
  Download,
  ChevronRight,
  Plus,
  X,
  FileSpreadsheet,
  Edit3,
  Tag,
  AlertCircle,
  Briefcase,
  History,
  ArrowUpRight,
  Shield,
  CheckCircle2,
  TrendingUp,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import {
  WorkflowClient,
  WorkflowClientAuditEntry,
  ClientCategory,
  CLIENT_CATEGORIES,
  CLIENT_SOURCES,
  getWorkflowClients,
  saveWorkflowClients,
  generateWorkflowClientId,
  checkClientDuplicates,
  enrollManualClient,
  enrollFromLeadConversion,
  updateWorkflowClient,
  getClientLinkedTasks,
  getAllWorkflowAuditLogs,
  isValidPan,
  isValidGstin,
  normalizePan,
  normalizeMobile,
  normalizeEmail
} from '../../lib/workflowClients';
import { getWorkOrdersForClient, WorkflowWorkOrder } from '../../lib/workflowWorkOrders';
import WorkflowWorkOrdersManagement from './WorkflowWorkOrdersManagement';
import { getEmployees, getLeads, getCurrentSession, getISTDateString } from '../../lib/db';
import { addV2Task, V2Task } from '../../lib/v2_db';
import { Employee, Lead } from '../../types';

interface WorkflowClientsManagementProps {
  sessionUser: Employee;
  initialTab?: 'directory' | 'manual' | 'lead_conversion' | 'audit_trail' | 'work_orders';
  onNavigateTask?: (taskId: string) => void;
  onOpenEnrollmentWizard?: (lead: Lead) => void;
}

export default function WorkflowClientsManagement({
  sessionUser,
  initialTab = 'directory',
  onNavigateTask,
  onOpenEnrollmentWizard
}: WorkflowClientsManagementProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'manual' | 'lead_conversion' | 'audit_trail' | 'work_orders'>(initialTab);
  const [clients, setClients] = useState<WorkflowClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Search & Filter state for Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedManager, setSelectedManager] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Selected Client for Drawer
  const [selectedClient, setSelectedClient] = useState<WorkflowClient | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'work_orders' | 'workflows' | 'audit' | 'edit'>('overview');
  const [preselectedWorkOrderClientId, setPreselectedWorkOrderClientId] = useState<string | undefined>(undefined);

  // New Workflow Modal for selected client
  const [isNewWorkflowModalOpen, setIsNewWorkflowModalOpen] = useState(false);
  const [workflowTitle, setWorkflowTitle] = useState('');
  const [workflowCategory, setWorkflowCategory] = useState('GST Compliance');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowAssigneeId, setWorkflowAssigneeId] = useState('');
  const [workflowPriority, setWorkflowPriority] = useState<'medium' | 'high' | 'urgent'>('high');
  const [workflowDueDate, setWorkflowDueDate] = useState('');

  // Lead Conversion Modal
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Manual Enrollment Form State
  const [manualForm, setManualForm] = useState({
    clientName: '',
    mobile: '',
    email: '',
    pan: '',
    gstin: '',
    address: '',
    clientCategory: 'Private Limited Company' as ClientCategory,
    source: 'Manual Direct',
    assignedManagerId: ''
  });
  const [manualFormSubmitting, setManualFormSubmitting] = useState(false);
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualFormSuccess, setManualFormSuccess] = useState<string | null>(null);

  // Conversion Form State
  const [conversionForm, setConversionForm] = useState({
    clientName: '',
    mobile: '',
    email: '',
    pan: '',
    gstin: '',
    address: '',
    clientCategory: 'Private Limited Company' as ClientCategory,
    source: 'Lead Conversion',
    assignedManagerId: ''
  });
  const [conversionSubmitting, setConversionSubmitting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Edit Client Form State
  const [editForm, setEditForm] = useState<Partial<WorkflowClient>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Next Client ID Preview
  const nextClientIdPreview = useMemo(() => {
    return generateWorkflowClientId();
  }, [clients]);

  // Load Data
  const loadData = () => {
    const loadedClients = getWorkflowClients();
    const loadedEmps = getEmployees().filter(e => e.status === 'active');
    const loadedLeads = getLeads();
    setClients(loadedClients);
    setEmployees(loadedEmps);
    setLeads(loadedLeads);

    if (loadedEmps.length > 0 && !manualForm.assignedManagerId) {
      setManualForm(prev => ({
        ...prev,
        assignedManagerId: sessionUser.role === 'employee' ? sessionUser.id : (loadedEmps[0]?.id || '')
      }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Live duplicate checking for Manual Form
  const manualDuplicateCheck = useMemo(() => {
    if (!manualForm.pan && !manualForm.mobile && !manualForm.email) {
      return { hasDuplicate: false };
    }
    return checkClientDuplicates({
      pan: manualForm.pan,
      mobile: manualForm.mobile,
      email: manualForm.email
    });
  }, [manualForm.pan, manualForm.mobile, manualForm.email, clients]);

  // Live duplicate checking for Conversion Form
  const conversionDuplicateCheck = useMemo(() => {
    if (!conversionForm.pan && !conversionForm.mobile && !conversionForm.email) {
      return { hasDuplicate: false };
    }
    return checkClientDuplicates({
      pan: conversionForm.pan,
      mobile: conversionForm.mobile,
      email: conversionForm.email
    });
  }, [conversionForm.pan, conversionForm.mobile, conversionForm.email, clients]);

  // Filtered Clients for Directory
  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clients.filter(c => {
      // Search match
      if (query) {
        const matchName = c.clientName.toLowerCase().includes(query);
        const matchId = c.id.toLowerCase().includes(query);
        const matchPan = c.pan.toLowerCase().includes(query);
        const matchMobile = c.mobile.includes(query);
        const matchEmail = c.email.toLowerCase().includes(query);
        const matchGstin = c.gstin ? c.gstin.toLowerCase().includes(query) : false;
        if (!matchName && !matchId && !matchPan && !matchMobile && !matchEmail && !matchGstin) {
          return false;
        }
      }
      // Category filter
      if (selectedCategory !== 'ALL' && c.clientCategory !== selectedCategory) {
        return false;
      }
      // Manager filter
      if (selectedManager !== 'ALL' && c.assignedManagerId !== selectedManager) {
        return false;
      }
      // Source filter
      if (selectedSource !== 'ALL' && c.source !== selectedSource) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [clients, searchQuery, selectedCategory, selectedManager, selectedSource, selectedStatus]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Manual Enrollment
  const handleManualEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);
    setManualFormSuccess(null);

    try {
      if (manualDuplicateCheck.hasDuplicate) {
        throw new Error(manualDuplicateCheck.errorMessage || 'Duplicate client detected.');
      }

      const assignedEmp = employees.find(emp => emp.id === manualForm.assignedManagerId) || sessionUser;

      setManualFormSubmitting(true);
      const newClient = enrollManualClient(
        {
          clientName: manualForm.clientName,
          mobile: manualForm.mobile,
          email: manualForm.email,
          pan: manualForm.pan,
          gstin: manualForm.gstin,
          address: manualForm.address,
          clientCategory: manualForm.clientCategory,
          source: manualForm.source,
          assignedManagerId: assignedEmp.id,
          assignedManagerName: assignedEmp.name
        },
        {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role
        }
      );

      loadData();
      setManualFormSuccess(`Client enrolled successfully! Assigned Client ID: ${newClient.id}`);
      setManualForm({
        clientName: '',
        mobile: '',
        email: '',
        pan: '',
        gstin: '',
        address: '',
        clientCategory: 'Private Limited Company',
        source: 'Manual Direct',
        assignedManagerId: sessionUser.role === 'employee' ? sessionUser.id : (employees[0]?.id || '')
      });
      // Optionally open newly enrolled client in detail
      setSelectedClient(newClient);
      setDrawerTab('overview');
    } catch (err: any) {
      setManualFormError(err.message || 'Failed to enroll client.');
    } finally {
      setManualFormSubmitting(false);
    }
  };

  // Start Lead Conversion
  const handleStartLeadConversion = (lead: Lead) => {
    if (onOpenEnrollmentWizard) {
      onOpenEnrollmentWizard(lead);
      return;
    }
    setConvertingLead(lead);
    const assignedEmp = employees.find(e => e.id === lead.assignedTo) || sessionUser;
    
    // Auto-detect business or customer name
    const clientName = (lead.businessName || lead.customerName || '').trim();

    setConversionForm({
      clientName,
      mobile: lead.mobile || '',
      email: lead.email || '',
      pan: '',
      gstin: '',
      address: '',
      clientCategory: 'Private Limited Company',
      source: 'Lead Conversion',
      assignedManagerId: assignedEmp.id
    });
    setConversionError(null);
  };

  // Submit Lead Conversion
  const handleConversionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;
    setConversionError(null);

    try {
      if (conversionDuplicateCheck.hasDuplicate) {
        throw new Error(conversionDuplicateCheck.errorMessage || 'Duplicate client detected.');
      }

      const assignedEmp = employees.find(emp => emp.id === conversionForm.assignedManagerId) || sessionUser;

      setConversionSubmitting(true);
      const newClient = enrollFromLeadConversion(
        convertingLead.id,
        {
          clientName: conversionForm.clientName,
          mobile: conversionForm.mobile,
          email: conversionForm.email,
          pan: conversionForm.pan,
          gstin: conversionForm.gstin,
          address: conversionForm.address,
          clientCategory: conversionForm.clientCategory,
          source: 'Lead Conversion',
          assignedManagerId: assignedEmp.id,
          assignedManagerName: assignedEmp.name
        },
        {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role
        }
      );

      loadData();
      setConvertingLead(null);
      setSelectedClient(newClient);
      setDrawerTab('overview');
      setActiveTab('directory');
    } catch (err: any) {
      setConversionError(err.message || 'Failed to convert lead.');
    } finally {
      setConversionSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setEditError(null);

    try {
      setEditSubmitting(true);
      const updatedManager = employees.find(e => e.id === editForm.assignedManagerId);

      const updated = updateWorkflowClient(
        selectedClient.id,
        {
          clientName: editForm.clientName,
          mobile: editForm.mobile,
          email: editForm.email,
          pan: editForm.pan,
          gstin: editForm.gstin,
          address: editForm.address,
          clientCategory: editForm.clientCategory,
          source: editForm.source,
          status: editForm.status,
          assignedManagerId: editForm.assignedManagerId,
          assignedManagerName: updatedManager ? updatedManager.name : selectedClient.assignedManagerName
        },
        {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role
        }
      );

      loadData();
      setSelectedClient(updated);
      setDrawerTab('overview');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update client.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Linked Workflow Task for Client
  const handleCreateWorkflowTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!workflowTitle.trim()) {
      alert('Task title is required.');
      return;
    }

    const assignedEmp = employees.find(e => e.id === workflowAssigneeId) || sessionUser;

    const newTask = addV2Task({
      title: workflowTitle.trim(),
      description: workflowDescription.trim() || `Statutory docket for ${selectedClient.clientName} (${selectedClient.id})`,
      assignedTo: assignedEmp.id,
      assignedToName: assignedEmp.name,
      createdBy: sessionUser.id,
      createdByName: sessionUser.name,
      dueDate: workflowDueDate || getISTDateString(),
      status: 'pending',
      priority: workflowPriority,
      category: workflowCategory,
      clientName: selectedClient.clientName,
      clientId: selectedClient.id // Linked directly to Client ID!
    });

    // Also update client audit trail
    loadData();
    // Refresh selected client
    const refreshed = getWorkflowClients().find(c => c.id === selectedClient.id);
    if (refreshed) {
      setSelectedClient(refreshed);
    }

    setIsNewWorkflowModalOpen(false);
    setWorkflowTitle('');
    setWorkflowDescription('');
    alert(`Workflow docket #${newTask.id} successfully created and linked to Client ID ${selectedClient.id}.`);
  };

  // Export Clients to CSV
  const handleExportCSV = () => {
    const headers = ['Client ID', 'Client Name', 'Category', 'PAN', 'GSTIN', 'Mobile', 'Email', 'Address', 'Source', 'Assigned Manager', 'Status', 'Created At'];
    const rows = filteredClients.map(c => [
      c.id,
      `"${c.clientName.replace(/"/g, '""')}"`,
      `"${c.clientCategory}"`,
      c.pan,
      c.gstin || '',
      c.mobile,
      c.email,
      `"${c.address.replace(/"/g, '""')}"`,
      c.source,
      `"${c.assignedManagerName}"`,
      c.status,
      c.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eFilingg_Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit tab in drawer
  const startEditing = (client: WorkflowClient) => {
    setSelectedClient(client);
    setEditForm({
      clientName: client.clientName,
      mobile: client.mobile,
      email: client.email,
      pan: client.pan,
      gstin: client.gstin || '',
      address: client.address,
      clientCategory: client.clientCategory,
      source: client.source,
      status: client.status,
      assignedManagerId: client.assignedManagerId
    });
    setEditError(null);
    setDrawerTab('edit');
  };

  // Unconverted or Ready leads
  const availableLeadsForConversion = useMemo(() => {
    return leads.filter(l => l.stage !== 'Closed Lost' && l.stage !== 'Not Interested');
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Top Stats */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg relative overflow-hidden">
        {/* Background decorative flare */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PHASE 1 ENGINE
              </span>
              <span className="text-xs text-slate-400 font-medium">Standardized Format: <code className="text-emerald-300 font-bold">CL-YEAR-000000</code></span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              WORKFLOW MANAGEMENT · CLIENTS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5">
              Central Client Enrollment Engine with automatic sequential ID generation, strict PAN, Mobile & Email duplicate checking, and immutable audit logs.
            </p>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Clients</span>
              <span className="text-lg font-black font-mono text-white leading-none mt-0.5">{clients.length}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Next ID</span>
              <span className="text-sm font-black font-mono text-emerald-300 leading-none mt-0.5">{nextClientIdPreview}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block">Leads Ready</span>
              <span className="text-lg font-black font-mono text-indigo-200 leading-none mt-0.5">
                {availableLeadsForConversion.filter(l => l.stage === 'Converted' || l.stage === 'Proposal Sent').length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 mt-5 pt-3 border-t border-white/10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Clients Directory ({clients.length})</span>
          </button>

          <button
            onClick={() => {
              setPreselectedWorkOrderClientId(undefined);
              setActiveTab('work_orders');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'work_orders'
                ? 'bg-indigo-500 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-200" />
            <span>Work Orders Engine (Phase 2)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'manual'
                ? 'bg-emerald-500 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Manual Enrollment</span>
          </button>

          <button
            onClick={() => setActiveTab('lead_conversion')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'lead_conversion'
                ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Lead Conversion ({availableLeadsForConversion.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_trail')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'audit_trail'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Global Audit Trail</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          TAB 1: CLIENTS DIRECTORY
          ============================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Controls Bar: Search & Filtering */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Client ID (CL-2026-...), Name, PAN, Mobile, Email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">All Categories</option>
                {CLIENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Assigned Manager Filter */}
              <select
                value={selectedManager}
                onChange={e => setSelectedManager(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">All Managers</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Export filtered directory to CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setActiveTab('manual')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Enroll Client</span>
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4">Client Name & Category</th>
                    <th className="py-3 px-4">PAN & GSTIN</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Assigned Manager</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Workflows</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No clients match your filter criteria.</p>
                        <p className="text-xs mt-0.5 text-slate-400">Try clearing your search query or enroll a new client.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => {
                      const linkedTasks = getClientLinkedTasks(client.id, client.clientName);
                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedClient(client);
                            setDrawerTab('overview');
                          }}
                        >
                          {/* Client ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80">
                                {client.id}
                              </span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleCopy(client.id, client.id);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="Copy Client ID"
                              >
                                {copiedId === client.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>

                          {/* Client Name & Category */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                              {client.clientName}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {client.clientCategory}
                            </span>
                          </td>

                          {/* PAN & GSTIN */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                              <span>{client.pan}</span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleCopy(client.pan, `pan-${client.id}`);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Copy PAN"
                              >
                                {copiedId === `pan-${client.id}` ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                              </button>
                            </div>
                            {client.gstin ? (
                              <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                                GST: {client.gstin}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No GST registered</span>
                            )}
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{client.mobile}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-slate-400 text-[11px] mt-0.5 truncate max-w-[180px]">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          </td>

                          {/* Assigned Manager */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {client.assignedManagerName.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {client.assignedManagerName}
                              </span>
                            </div>
                          </td>

                          {/* Source */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              client.enrollmentType === 'lead_conversion'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {client.enrollmentType === 'lead_conversion' && <Sparkles className="h-2.5 w-2.5 text-amber-500" />}
                              <span>{client.source}</span>
                            </span>
                          </td>

                          {/* Linked Workflows Count */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                              linkedTasks.length > 0
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              <Briefcase className="h-3 w-3" />
                              <span>{linkedTasks.length} Workflows</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedClient(client);
                                  setDrawerTab('overview');
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition"
                                title="View Details & Workflows"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => startEditing(client)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition"
                                title="Edit Profile"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: MANUAL CLIENT ENROLLMENT
          ============================================================== */}
      {activeTab === 'manual' && (
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
          {/* Sequential Client ID Generator Display */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 font-black">
                  AUTOMATED SEQUENCE ENGINE
                </span>
                <span className="text-xs font-medium text-emerald-100">Format: CL-{new Date().getFullYear()}-XXXXXX</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">Manual Client Enrollment</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Every newly enrolled client receives an immutable sequential ID linked to all compliance dockets.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-xs border border-white/20 text-center shrink-0">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Next Sequential ID</span>
              <span className="text-lg sm:text-xl font-black font-mono text-white tracking-wider">{nextClientIdPreview}</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {manualFormSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{manualFormSuccess}</span>
              </div>
            )}

            {manualFormError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center space-x-2.5 text-rose-800 dark:text-rose-200 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{manualFormError}</span>
              </div>
            )}

            {/* Live Duplicate Warning */}
            {manualDuplicateCheck.hasDuplicate && (
              <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 flex items-start space-x-3 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    DUPLICATE DETECTED ({manualDuplicateCheck.duplicateField?.toUpperCase()})
                  </h4>
                  <p className="mt-0.5">{manualDuplicateCheck.errorMessage}</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                    Strict system policy prevents registering duplicates by PAN, Mobile or Email. Please verify records.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleManualEnrollSubmit} className="space-y-4">
              {/* Row 1: Client Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name / Legal Entity Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra / Apex Retails Pvt Ltd"
                    value={manualForm.clientName}
                    onChange={e => setManualForm({ ...manualForm, clientName: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={manualForm.clientCategory}
                    onChange={e => setManualForm({ ...manualForm, clientCategory: e.target.value as ClientCategory })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: PAN & GSTIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Permanent Account Number (PAN) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">10 Characters (ABCDE1234F)</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={manualForm.pan}
                    onChange={e => setManualForm({ ...manualForm, pan: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2.5 text-xs font-mono font-bold uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                      manualForm.pan && !isValidPan(manualForm.pan)
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-250 dark:border-slate-700 focus:ring-emerald-500'
                    } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2`}
                  />
                  {manualForm.pan && !isValidPan(manualForm.pan) && (
                    <p className="text-[10px] text-rose-500 mt-1">Must follow 5 letters, 4 digits, 1 letter format.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      GSTIN (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">15 Characters</span>
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="07AAAAA0000A1Z5"
                    value={manualForm.gstin}
                    onChange={e => setManualForm({ ...manualForm, gstin: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2.5 text-xs font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                      manualForm.gstin && !isValidGstin(manualForm.gstin)
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-250 dark:border-slate-700 focus:ring-emerald-500'
                    } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2`}
                  />
                  {manualForm.gstin && !isValidGstin(manualForm.gstin) && (
                    <p className="text-[10px] text-rose-500 mt-1">Must follow 15-character statutory GSTIN format.</p>
                  )}
                </div>
              </div>

              {/* Row 3: Mobile & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9810234567"
                      value={manualForm.mobile}
                      onChange={e => setManualForm({ ...manualForm, mobile: e.target.value.replace(/\D/g, '') })}
                      className="w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="client@domain.com"
                    value={manualForm.email}
                    onChange={e => setManualForm({ ...manualForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registered / Office Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street, Landmark, City, State, Pincode"
                  value={manualForm.address}
                  onChange={e => setManualForm({ ...manualForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Row 5: Source & Assigned Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enrollment Source
                  </label>
                  <select
                    value={manualForm.source}
                    onChange={e => setManualForm({ ...manualForm, source: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLIENT_SOURCES.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Account Manager <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={manualForm.assignedManagerId}
                    onChange={e => setManualForm({ ...manualForm, assignedManagerId: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setManualForm({
                      clientName: '',
                      mobile: '',
                      email: '',
                      pan: '',
                      gstin: '',
                      address: '',
                      clientCategory: 'Private Limited Company',
                      source: 'Manual Direct',
                      assignedManagerId: employees[0]?.id || ''
                    });
                    setManualFormError(null);
                    setManualFormSuccess(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={manualFormSubmitting || manualDuplicateCheck.hasDuplicate}
                  className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                    manualDuplicateCheck.hasDuplicate
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{manualFormSubmitting ? 'Enrolling...' : `Enroll Client & Assign ${nextClientIdPreview}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: LEAD CONVERSION ENROLLMENT
          ============================================================== */}
      {activeTab === 'lead_conversion' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Info */}
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                Seamless Sales-to-Workflow Conversion Desk
              </h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Convert qualified sales leads into officially enrolled clients with 1 click. Automatically maps client contact information, generates a new Client ID, and updates the CRM lead status to Converted.
              </p>
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ready Leads for Conversion ({availableLeadsForConversion.length})
              </span>
              <span className="text-[11px] text-slate-400">Click &quot;Convert to Client&quot; on any record</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Customer & Business Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Service Required</th>
                    <th className="py-3 px-4">Lead Stage</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {availableLeadsForConversion.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No active leads currently waiting for conversion.
                      </td>
                    </tr>
                  ) : (
                    availableLeadsForConversion.map(lead => {
                      const isAlreadyConverted = lead.stage === 'Converted';
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {lead.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{lead.customerName}</div>
                            {lead.businessName && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{lead.businessName}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono text-slate-700 dark:text-slate-300">{lead.mobile}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{lead.email}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                              {lead.serviceRequired || 'General Advisory'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.stage === 'Converted'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                                : lead.stage === 'Interested'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleStartLeadConversion(lead)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-xs cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                              <span>{isAlreadyConverted ? 'Re-Enroll Client' : 'Convert to Client'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 4: GLOBAL AUDIT TRAIL VAULT
          ============================================================== */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-purple-900 dark:text-purple-200">
                Firm-Wide Workflow Audit Trail Vault
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Every client registration, field modification, manager reassignment, and linked compliance docket is chronologically recorded with actor ID, timestamp, and field-level change history.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Audit Log Entries ({getAllWorkflowAuditLogs().length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Immutable Compliance Log</span>
            </div>

            <div className="space-y-3">
              {getAllWorkflowAuditLogs().length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No audit logs recorded yet.
                </div>
              ) : (
                getAllWorkflowAuditLogs().map((item, idx) => {
                  const entry = item.audit;
                  return (
                    <div
                      key={entry.id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-750 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            entry.action === 'MANUAL_ENROLLMENT'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : entry.action === 'LEAD_CONVERSION'
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                                : entry.action === 'WORKFLOW_LINKED'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                          }`}>
                            {entry.action}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {entry.actionTitle}
                          </span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            [{item.clientId} · {item.clientName}]
                          </span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 mt-1">
                          {entry.description}
                        </p>

                        {/* Changes Diff */}
                        {entry.changes && entry.changes.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-indigo-500/40 space-y-0.5">
                            {entry.changes.map((c, cIdx) => (
                              <div key={cIdx} className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{c.fieldLabel}:</span>{' '}
                                <span className="line-through text-rose-500">{c.oldValue || 'None'}</span>{' '}
                                <span className="text-slate-400">→</span>{' '}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{c.newValue || 'None'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-0.5 text-[11px] text-slate-400">
                        <div className="flex items-center sm:justify-end space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                          <UserPlus className="h-3 w-3" />
                          <span>{entry.performedBy.name}</span>
                        </div>
                        <div className="flex items-center sm:justify-end space-x-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 5: WORK ORDERS ENGINE (PHASE 2)
          ============================================================== */}
      {activeTab === 'work_orders' && (
        <div className="animate-fade-in">
          <WorkflowWorkOrdersManagement
            sessionUser={sessionUser}
            preselectedClientId={preselectedWorkOrderClientId}
            onNavigateToClient={(clientId) => {
              const found = clients.find(c => c.id === clientId);
              if (found) {
                setSelectedClient(found);
                setDrawerTab('overview');
                setActiveTab('directory');
              }
            }}
          />
        </div>
      )}

      {/* ==============================================================
          DRAWER / MODAL: CLIENT DETAIL & LINKED WORKFLOWS
          ============================================================== */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs">
                    {selectedClient.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedClient.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedClient.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white truncate mt-1">
                  {selectedClient.clientName}
                </h2>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setIsNewWorkflowModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Workflow</span>
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tab Navigation */}
            <div className="px-5 border-b border-slate-150 dark:border-slate-800 flex items-center space-x-4 shrink-0 bg-white dark:bg-slate-900">
              <button
                onClick={() => setDrawerTab('overview')}
                className={`py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Client Overview
              </button>

              <button
                onClick={() => setDrawerTab('work_orders')}
                className={`py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  drawerTab === 'work_orders'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Work Orders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  {getWorkOrdersForClient(selectedClient.id).length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('workflows')}
                className={`py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  drawerTab === 'workflows'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Linked Workflows</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {getClientLinkedTasks(selectedClient.id, selectedClient.clientName).length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('audit')}
                className={`py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Audit Trail ({selectedClient.auditTrail.length})
              </button>

              <button
                onClick={() => startEditing(selectedClient)}
                className={`py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'edit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Edit Details
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* SUB-VIEW: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Tax & Identification Grid */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Permanent Account No (PAN)</span>
                      <div className="flex items-center space-x-1.5 mt-0.5 font-mono font-black text-sm text-slate-900 dark:text-white">
                        <span>{selectedClient.pan}</span>
                        <button
                          onClick={() => handleCopy(selectedClient.pan, 'd-pan')}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                        >
                          {copiedId === 'd-pan' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">GSTIN</span>
                      <div className="flex items-center space-x-1.5 mt-0.5 font-mono font-bold text-xs text-slate-900 dark:text-white">
                        <span>{selectedClient.gstin || 'Not Applicable / Unregistered'}</span>
                        {selectedClient.gstin && (
                          <button
                            onClick={() => handleCopy(selectedClient.gstin!, 'd-gstin')}
                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                          >
                            {copiedId === 'd-gstin' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Client Category</span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedClient.clientCategory}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Manager</span>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {selectedClient.assignedManagerName}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Communication & Address</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center space-x-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>Mobile Number:</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedClient.mobile}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center space-x-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>Email Address:</span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClient.email}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-150 dark:border-slate-800">
                        <span className="text-slate-500 flex items-center space-x-1.5 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Office / Billing Address:</span>
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-5">
                          {selectedClient.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Meta */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      <span>Enrolled on: </span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(selectedClient.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span>Source: </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {selectedClient.source}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW: WORK ORDERS */}
              {drawerTab === 'work_orders' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                        Work Orders Lifecycle
                      </h4>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Every Work Order is strictly linked with Client ID: <span className="font-mono font-bold">{selectedClient.id}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPreselectedWorkOrderClientId(selectedClient.id);
                        setSelectedClient(null);
                        setActiveTab('work_orders');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Create Order</span>
                    </button>
                  </div>

                  {getWorkOrdersForClient(selectedClient.id).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <Layers className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        No Work Orders generated for this client yet
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Generate official work orders (e.g. PLC-2026-000001, GST-2026-000001) linked to this client.
                      </p>
                      <button
                        onClick={() => {
                          setPreselectedWorkOrderClientId(selectedClient.id);
                          setSelectedClient(null);
                          setActiveTab('work_orders');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Generate First Work Order</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {getWorkOrdersForClient(selectedClient.id).map(order => (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                                {order.id}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {order.service}
                              </span>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              order.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' :
                              order.status === 'on_hold' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{order.department}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Owner</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{order.ownerName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Priority</span>
                              <span className={`font-bold uppercase ${
                                order.priority === 'urgent' ? 'text-red-600 dark:text-red-400' :
                                order.priority === 'high' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>{order.priority}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{order.dueDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW: LINKED WORKFLOWS */}
              {drawerTab === 'workflows' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Compliance Dockets Linked to {selectedClient.id}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        All future statutory filings, tasks, and advisory items tied to this Client ID.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsNewWorkflowModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Initiate Workflow</span>
                    </button>
                  </div>

                  {getClientLinkedTasks(selectedClient.id, selectedClient.clientName).length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                      <Briefcase className="h-8 w-8 mx-auto text-slate-400" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Linked Workflows Yet</h4>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Initiate a statutory filing docket, return review, or custom task linked to this Client ID.
                      </p>
                      <button
                        onClick={() => setIsNewWorkflowModalOpen(true)}
                        className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
                      >
                        + Create First Workflow Task
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {getClientLinkedTasks(selectedClient.id, selectedClient.clientName).map(task => (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                #{task.id}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {task.title}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                task.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                            <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
                              <span>Due: {task.dueDate}</span>
                              <span>Assignee: {task.assignedToName}</span>
                              {task.category && <span>Category: {task.category}</span>}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold">
                              {selectedClient.id}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW: AUDIT TRAIL */}
              {drawerTab === 'audit' && (
                <div className="space-y-3 animate-fade-in">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Client Audit Trail History
                  </h3>
                  <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-750 space-y-4">
                    {selectedClient.auditTrail.map((entry, idx) => (
                      <div key={entry.id || idx} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                        
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {entry.actionTitle}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300">
                            {entry.description}
                          </p>

                          {entry.changes && entry.changes.length > 0 && (
                            <div className="mt-1.5 pl-2 border-l border-indigo-400/50 space-y-0.5">
                              {entry.changes.map((c, cIdx) => (
                                <div key={cIdx} className="text-[10.5px] font-mono text-slate-500">
                                  <span className="font-bold">{c.fieldLabel}:</span> {c.oldValue || 'None'} → <span className="text-emerald-600 font-bold">{c.newValue}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                            <span>Actor: {entry.performedBy.name}</span>
                            <span className="font-mono uppercase font-bold text-indigo-500">{entry.action}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-VIEW: EDIT DETAILS */}
              {drawerTab === 'edit' && (
                <form onSubmit={handleEditSubmit} className="space-y-4 animate-fade-in">
                  {editError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{editError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.clientName || ''}
                        onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                      <select
                        value={editForm.clientCategory || selectedClient.clientCategory}
                        onChange={e => setEditForm({ ...editForm, clientCategory: e.target.value as ClientCategory })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {CLIENT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">PAN</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={editForm.pan || ''}
                        onChange={e => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={editForm.gstin || ''}
                        onChange={e => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={editForm.mobile || ''}
                        onChange={e => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={editForm.email || ''}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={editForm.address || ''}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Manager</label>
                      <select
                        value={editForm.assignedManagerId || selectedClient.assignedManagerId}
                        onChange={e => setEditForm({ ...editForm, assignedManagerId: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                      <select
                        value={editForm.status || selectedClient.status}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-150 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDrawerTab('overview')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs cursor-pointer"
                    >
                      {editSubmitting ? 'Saving...' : 'Save & Record Audit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: INITIATE NEW WORKFLOW LINKED TO CLIENT ID
          ============================================================== */}
      {isNewWorkflowModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  WORKFLOW LINK ENGINE
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  Initiate Workflow for {selectedClient.id}
                </h3>
              </div>
              <button
                onClick={() => setIsNewWorkflowModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflowTask} className="p-5 space-y-3.5 text-xs">
              {/* Client ID Badge Lock */}
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">Bound Client ID</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{selectedClient.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">Entity Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClient.clientName}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepare GSTR-3B Monthly Return Filing"
                  value={workflowTitle}
                  onChange={e => setWorkflowTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={workflowCategory}
                    onChange={e => setWorkflowCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="GST Compliance">GST Compliance</option>
                    <option value="Income Tax Return">Income Tax Return</option>
                    <option value="MCA & ROC Filing">MCA & ROC Filing</option>
                    <option value="Trademark & IP">Trademark & IP</option>
                    <option value="DSC Issuance">DSC Issuance</option>
                    <option value="Statutory License">Statutory License</option>
                    <option value="General Advisory">General Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={workflowPriority}
                    onChange={e => setWorkflowPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
                  <select
                    value={workflowAssigneeId || selectedClient.assignedManagerId}
                    onChange={e => setWorkflowAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={workflowDueDate || getISTDateString()}
                    onChange={e => setWorkflowDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Workflow Notes & Scope</label>
                <textarea
                  rows={2}
                  placeholder="Provide scope, client instructions, or statutory checklist..."
                  value={workflowDescription}
                  onChange={e => setWorkflowDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewWorkflowModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs cursor-pointer"
                >
                  Create & Link Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: LEAD CONVERSION CONFIRMATION DRAWER
          ============================================================== */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  LEAD CONVERSION ENGINE
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  Convert Lead #{convertingLead.id} to Workflow Client
                </h3>
              </div>
              <button
                onClick={() => setConvertingLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {conversionError && (
              <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{conversionError}</span>
              </div>
            )}

            {/* Live Duplicate Warning */}
            {conversionDuplicateCheck.hasDuplicate && (
              <div className="m-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{conversionDuplicateCheck.errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleConversionSubmit} className="p-5 space-y-3.5 text-xs">
              {/* Target ID Notification */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Generated Client ID</span>
                  <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">{nextClientIdPreview}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Conversion Source</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Sales Lead #{convertingLead.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={conversionForm.clientName}
                    onChange={e => setConversionForm({ ...conversionForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={conversionForm.clientCategory}
                    onChange={e => setConversionForm({ ...conversionForm, clientCategory: e.target.value as ClientCategory })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {CLIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PAN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={conversionForm.pan}
                    onChange={e => setConversionForm({ ...conversionForm, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="07AAAAA0000A1Z5"
                    value={conversionForm.gstin}
                    onChange={e => setConversionForm({ ...conversionForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={conversionForm.mobile}
                    onChange={e => setConversionForm({ ...conversionForm, mobile: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={conversionForm.email}
                    onChange={e => setConversionForm({ ...conversionForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Registered office address..."
                  value={conversionForm.address}
                  onChange={e => setConversionForm({ ...conversionForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Manager</label>
                <select
                  value={conversionForm.assignedManagerId}
                  onChange={e => setConversionForm({ ...conversionForm, assignedManagerId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={conversionSubmitting || conversionDuplicateCheck.hasDuplicate}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                    conversionDuplicateCheck.hasDuplicate
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'
                  }`}
                >
                  {conversionSubmitting ? 'Converting...' : 'Enroll & Update Lead to Converted'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
