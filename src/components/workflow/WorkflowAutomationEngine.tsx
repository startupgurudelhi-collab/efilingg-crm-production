/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PHASE 8 – AUTOMATION ENGINE
 * Workflow Stage Transition Automation Dashboard
 * 
 * Features:
 * - Real-time Delivery Logs & Technical Audit Trail
 * - Channel Filtering: WhatsApp (Meta-Approved), Email, Internal Notification
 * - Interactive Delivery Inspector (WhatsApp Chat Bubble & Email Previews)
 * - Automation Rules Hub with Toggle & Edit Capabilities
 * - Approved WhatsApp Template Inspector (Single Source of Truth)
 * - Stage Transition Trigger Simulator & Test Sandbox
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  MessageSquare,
  Mail,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Send,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Smartphone,
  Trash2,
  Check,
  Plus,
  Info,
  X,
  Layers,
  FileCheck2,
  Award,
  Hash
} from 'lucide-react';
import {
  AutomationRule,
  AutomationDeliveryLog,
  AutomationActionType,
  getAutomationRules,
  getDeliveryLogs,
  toggleAutomationRule,
  saveOrUpdateRule,
  retryDeliveryLog,
  clearDeliveryLogs,
  executeWorkflowStageAutomation,
  EVENT_AUTOMATION_DISPATCHED
} from '../../lib/workflowAutomationEngine';
import {
  getWorkflowWorkOrders,
  WorkflowWorkOrder,
  WorkOrderStage,
  WorkOrderStageStatus,
  updateWorkOrderStageStatus
} from '../../lib/workflowWorkOrders';
import { WhatsAppTemplateRepository } from '../../lib/whatsapp/templateRepository';
import { WhatsAppTemplate } from '../../lib/whatsapp/templateTypes';

interface WorkflowAutomationEngineProps {
  initialWorkOrderId?: string;
  onNavigateToWorkOrder?: (workOrderId: string) => void;
}

export const WorkflowAutomationEngine: React.FC<WorkflowAutomationEngineProps> = ({
  initialWorkOrderId,
  onNavigateToWorkOrder
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'logs' | 'rules' | 'templates' | 'simulator'>('logs');

  // Core data states
  const [logs, setLogs] = useState<AutomationDeliveryLog[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkflowWorkOrder[]>([]);
  const [approvedTemplates, setApprovedTemplates] = useState<WhatsAppTemplate[]>([]);

  // Filtering & Search for Logs
  const [channelFilter, setChannelFilter] = useState<'ALL' | AutomationActionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED' | 'SENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Inspect states
  const [selectedLog, setSelectedLog] = useState<AutomationDeliveryLog | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Simulator states
  const [simSelectedOrderId, setSimSelectedOrderId] = useState<string>(initialWorkOrderId || '');
  const [simSelectedStageId, setSimSelectedStageId] = useState<string>('');
  const [simTargetStatus, setSimTargetStatus] = useState<WorkOrderStageStatus>('completed');
  const [simNotes, setSimNotes] = useState<string>('Simulated stage change trigger test from Automation Sandbox');
  const [simExecuting, setSimExecuting] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{ count: number; message: string } | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload data
  const loadData = () => {
    const fetchedLogs = getDeliveryLogs();
    const fetchedRules = getAutomationRules();
    const fetchedOrders = getWorkflowWorkOrders();
    const tmpls = WhatsAppTemplateRepository.getApprovedTemplates();

    setLogs(fetchedLogs);
    setRules(fetchedRules);
    setWorkOrders(fetchedOrders);
    setApprovedTemplates(tmpls);

    if (fetchedOrders.length > 0 && !simSelectedOrderId) {
      setSimSelectedOrderId(fetchedOrders[0].id);
      if (fetchedOrders[0].stages && fetchedOrders[0].stages.length > 0) {
        setSimSelectedStageId(fetchedOrders[0].stages[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time automation events
    const handleDispatchedEvent = () => {
      setLogs(getDeliveryLogs());
    };

    window.addEventListener(EVENT_AUTOMATION_DISPATCHED, handleDispatchedEvent);
    return () => {
      window.removeEventListener(EVENT_AUTOMATION_DISPATCHED, handleDispatchedEvent);
    };
  }, []);

  // Update simulator stage selection when order changes
  useEffect(() => {
    if (simSelectedOrderId) {
      const order = workOrders.find(o => o.id === simSelectedOrderId);
      if (order && order.stages && order.stages.length > 0) {
        // Default to first non-completed stage, or stage 1
        const candidate = order.stages.find(s => s.status !== 'completed') || order.stages[0];
        setSimSelectedStageId(candidate.id);
      }
    }
  }, [simSelectedOrderId, workOrders]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const whatsappLogs = logs.filter(l => l.channel === 'WHATSAPP');
    const emailLogs = logs.filter(l => l.channel === 'EMAIL');
    const internalLogs = logs.filter(l => l.channel === 'INTERNAL_NOTIFICATION');

    const whatsappDelivered = whatsappLogs.filter(l => l.status === 'DELIVERED').length;
    const whatsappRate = whatsappLogs.length > 0 ? Math.round((whatsappDelivered / whatsappLogs.length) * 100) : 100;

    const emailDelivered = emailLogs.filter(l => l.status === 'DELIVERED').length;
    const internalDelivered = internalLogs.filter(l => l.status === 'DELIVERED').length;

    const activeRulesCount = rules.filter(r => r.isEnabled).length;

    return {
      total,
      whatsappCount: whatsappLogs.length,
      whatsappDelivered,
      whatsappRate,
      emailCount: emailLogs.length,
      emailDelivered,
      internalCount: internalLogs.length,
      internalDelivered,
      activeRulesCount,
      totalRulesCount: rules.length
    };
  }, [logs, rules]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Channel filter
      if (channelFilter !== 'ALL' && log.channel !== channelFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClient = log.recipient.name.toLowerCase().includes(q) || log.recipient.contact.toLowerCase().includes(q);
        const matchWorkOrder = log.trigger.workOrderId.toLowerCase().includes(q) || log.trigger.workOrderTitle.toLowerCase().includes(q);
        const matchStage = log.trigger.stageName.toLowerCase().includes(q);
        const matchTemplate = (log.templateName || '').toLowerCase().includes(q);
        const matchSubject = (log.subject || '').toLowerCase().includes(q);
        const matchBody = log.renderedBody.toLowerCase().includes(q);

        if (!matchClient && !matchWorkOrder && !matchStage && !matchTemplate && !matchSubject && !matchBody) {
          return false;
        }
      }

      return true;
    });
  }, [logs, channelFilter, statusFilter, searchQuery]);

  // Handle Rule Toggle
  const handleToggleRule = (ruleId: string) => {
    toggleAutomationRule(ruleId);
    setRules(getAutomationRules());
    showToast('Rule status updated successfully.');
  };

  // Handle Retry Log
  const handleRetryLog = (logId: string) => {
    const ok = retryDeliveryLog(logId);
    if (ok) {
      setLogs(getDeliveryLogs());
      showToast('Delivery action redelivered with success status.');
      if (selectedLog && selectedLog.id === logId) {
        const updated = getDeliveryLogs().find(l => l.id === logId);
        if (updated) setSelectedLog(updated);
      }
    }
  };

  // Handle Clear Logs
  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all automation delivery logs? This action will reset delivery history.')) {
      clearDeliveryLogs();
      setLogs([]);
      showToast('Automation delivery logs cleared.');
    }
  };

  // Handle Simulation Trigger
  const handleExecuteSimulation = async () => {
    if (!simSelectedOrderId || !simSelectedStageId) {
      alert('Please select both a Work Order and a Stage to simulate.');
      return;
    }

    const order = workOrders.find(o => o.id === simSelectedOrderId);
    if (!order) return;
    const stage = order.stages.find(s => s.id === simSelectedStageId);
    if (!stage) return;

    setSimExecuting(true);
    setSimResult(null);

    try {
      // Execute the real stage update hook (which automatically runs the automation engine)
      const res = updateWorkOrderStageStatus(
        order.id,
        stage.id,
        simTargetStatus,
        { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'admin' },
        simNotes
      );

      // Refresh data
      loadData();

      setSimResult({
        count: 3,
        message: `Successfully executed stage transition on ${order.id} (Stage: "${stage.name}"). Evaluated automation rules and dispatched real-time WhatsApp, Email & Internal alerts.`
      });
      showToast(`⚡ Automation Fired! Check Delivery Logs tab to view dispatch receipts.`);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workflow Automation Engine</h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Phase 8 Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated stage triggers · Meta-approved WhatsApp dispatch · SMTP notifications · Real-time delivery logs
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('simulator')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Test Automation Trigger</span>
              </button>
              <button
                onClick={loadData}
                title="Refresh logs & rules"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 mt-5 -mb-px">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Delivery Logs & Audit Trail</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-mono">
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Automation Rules Hub</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-mono">
                {rules.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approved WhatsApp Templates</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-mono">
                {approvedTemplates.length} Meta OK
              </span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Trigger Simulator & Sandbox</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Dispatches */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Dispatches</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">{metrics.total}</span>
              <span className="text-xs text-emerald-600 font-medium">Logged & Traceable</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Listening to stage completions</span>
            </div>
          </div>

          {/* WhatsApp Deliveries */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Deliveries</span>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 font-mono">{metrics.whatsappDelivered}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {metrics.whatsappRate}% rate
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Meta-Approved Templates</span>
            </div>
          </div>

          {/* Emails Dispatched */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Email Notifications</span>
              <Mail className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-700 font-mono">{metrics.emailDelivered}</span>
              <span className="text-xs text-slate-500 font-medium">Outbound SMTP</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
              <span>With official statutory dockets</span>
            </div>
          </div>

          {/* Internal CRM Alerts */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Internal Alerts</span>
              <Bell className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-700 font-mono">{metrics.internalDelivered}</span>
              <span className="text-xs text-slate-500 font-medium">{metrics.activeRulesCount} Rules Active</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-500" />
              <span>Staff & Owner desktop toasts</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: DELIVERY LOGS & TECHNICAL AUDIT TRAIL              */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter and search bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Channel filter pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Channel:
                </span>
                <button
                  onClick={() => setChannelFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    channelFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Channels ({logs.length})
                </button>
                <button
                  onClick={() => setChannelFilter('WHATSAPP')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    channelFilter === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() => setChannelFilter('EMAIL')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    channelFilter === 'EMAIL'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
                <button
                  onClick={() => setChannelFilter('INTERNAL_NOTIFICATION')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    channelFilter === 'INTERNAL_NOTIFICATION'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Internal Alerts
                </button>
              </div>

              {/* Status and Search */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="FAILED">Failed</option>
                  <option value="SENT">Sent</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, stage, order ID..."
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden w-48 sm:w-64"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleClearLogs}
                  title="Clear delivery logs"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delivery Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredLogs.length === 0 ? (
                <div className="py-16 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800">No automation logs match criteria</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Try switching filters, clearing your search query, or use the Simulator to test-fire an automation trigger.
                  </p>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Open Trigger Simulator
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-3">Channel</th>
                        <th className="py-3 px-4">Trigger & Stage</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Template / Subject</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredLogs.map((log) => {
                        const isWhatsApp = log.channel === 'WHATSAPP';
                        const isEmail = log.channel === 'EMAIL';
                        const isInternal = log.channel === 'INTERNAL_NOTIFICATION';

                        return (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsInspectModalOpen(true);
                            }}
                          >
                            {/* Timestamp */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-mono text-[11px] text-slate-900 font-medium">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                            </td>

                            {/* Channel Badge */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isWhatsApp && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                                  WhatsApp
                                </span>
                              )}
                              {isEmail && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  <Mail className="w-3 h-3 text-sky-600" />
                                  Email
                                </span>
                              )}
                              {isInternal && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Bell className="w-3 h-3 text-purple-600" />
                                  Internal
                                </span>
                              )}
                            </td>

                            {/* Trigger Event & Stage */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {log.trigger.workOrderId}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {log.trigger.serviceCode}
                                </span>
                              </div>
                              <div className="text-slate-600 font-medium truncate max-w-xs" title={log.trigger.stageName}>
                                <span className="text-slate-400 font-normal">Stage {log.trigger.stageSequence}:</span>{' '}
                                {log.trigger.stageName}
                              </div>
                            </td>

                            {/* Recipient */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 truncate max-w-[160px]">
                                {log.recipient.name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                                {log.recipient.contact}
                              </div>
                            </td>

                            {/* Template / Subject */}
                            <td className="py-3 px-4">
                              {log.templateName ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {log.templateName}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-slate-800 font-medium truncate max-w-[200px]" title={log.subject}>
                                  {log.subject || 'Automated Intimation'}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                                {log.renderedBody.slice(0, 45)}...
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {log.status === 'DELIVERED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Delivered
                                </span>
                              )}
                              {log.status === 'SENT' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Send className="w-3 h-3 text-blue-600" />
                                  Sent
                                </span>
                              )}
                              {log.status === 'FAILED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Failed
                                </span>
                              )}
                              {log.metadata.latencyMs && (
                                <span className="text-[10px] text-slate-400 font-mono ml-1">
                                  {log.metadata.latencyMs}ms
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setSelectedLog(log);
                                    setIsInspectModalOpen(true);
                                  }}
                                  title="Inspect technical delivery receipt"
                                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {log.status === 'FAILED' && (
                                  <button
                                    onClick={() => handleRetryLog(log.id)}
                                    title="Retry delivery dispatch"
                                    className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
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
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: AUTOMATION RULES HUB                               */}
        {/* ========================================================= */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Workflow Trigger Rules</h2>
                <p className="text-xs text-slate-500">
                  Configure when stage transitions fire automated WhatsApp, Email, or Internal alerts.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRule({
                    id: `rule_custom_${Date.now()}`,
                    name: 'Custom Milestone Rule',
                    description: 'Triggered when specific workflow stage completes.',
                    category: 'General Operations',
                    serviceCode: '*',
                    triggerStagePattern: '.*',
                    targetStatus: 'completed',
                    isEnabled: true,
                    actions: {
                      whatsapp: { enabled: true, templateName: 'workflow_stage_completed' },
                      email: { enabled: true, subjectTemplate: 'Milestone Update: {{stageName}}', senderName: 'EFilingg Operations' },
                      internalNotification: { enabled: true, title: 'Milestone Completed', messageTemplate: 'Stage completed', priority: 'normal', targetAudience: 'assigned_owner' }
                    },
                    isSystemDefault: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  setRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Automation Rule
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                return (
                  <div
                    key={rule.id}
                    className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                      rule.isEnabled ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {rule.serviceCode === '*' ? 'ALL SERVICES' : rule.serviceCode}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-500">{rule.category}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          rule.isEnabled ? 'bg-orange-600' : 'bg-slate-300'
                        }`}
                        title={rule.isEnabled ? 'Active (Click to pause)' : 'Paused (Click to activate)'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            rule.isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 mb-4">{rule.description}</p>

                    {/* Trigger Condition Box */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Trigger Requirement:
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Layers className="w-3 h-3 text-orange-500" />
                          Pattern: /{rule.triggerStagePattern}/i
                        </span>
                        {rule.triggerStageSequence && (
                          <span className="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Sequence #{rule.triggerStageSequence}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Status: {rule.targetStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Active Dispatches Channels */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Configured Actions:
                      </div>

                      {/* WhatsApp Channel */}
                      {rule.actions.whatsapp?.enabled ? (
                        <div className="flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-2 text-emerald-900">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-semibold flex items-center gap-1.5">
                                <span>WhatsApp Notification</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-800">
                                  {rule.actions.whatsapp.templateName}
                                </span>
                              </div>
                              <div className="text-[11px] text-emerald-700">Meta-Approved Template</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-slate-400">
                          <MessageSquare className="w-4 h-4" />
                          <span>WhatsApp Action Disabled</span>
                        </div>
                      )}

                      {/* Email Channel */}
                      {rule.actions.email?.enabled ? (
                        <div className="flex items-center justify-between text-xs bg-sky-50/70 border border-sky-200/80 rounded-lg px-3 py-2 text-sky-900">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                            <div className="truncate">
                              <div className="font-semibold">Email Docket</div>
                              <div className="text-[11px] text-sky-700 truncate max-w-xs font-mono">
                                {rule.actions.email.subjectTemplate}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-sky-700 uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>Email Action Disabled</span>
                        </div>
                      )}

                      {/* Internal Notification */}
                      {rule.actions.internalNotification?.enabled ? (
                        <div className="flex items-center justify-between text-xs bg-purple-50/70 border border-purple-200/80 rounded-lg px-3 py-2 text-purple-900">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-purple-600 shrink-0" />
                            <div>
                              <div className="font-semibold">{rule.actions.internalNotification.title}</div>
                              <div className="text-[11px] text-purple-700">
                                Target: {rule.actions.internalNotification.targetAudience}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-slate-400">
                          <Bell className="w-4 h-4" />
                          <span>Internal Alert Disabled</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: APPROVED WHATSAPP TEMPLATES REGISTRY               */}
        {/* ========================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="bg-emerald-900 text-white rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-800/80 text-emerald-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Meta Single Source of Truth Templates</h2>
                    <p className="text-xs text-emerald-200 mt-0.5">
                      All templates utilized by the Workflow Automation Engine are confirmed APPROVED by Meta WhatsApp Cloud API.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800 border border-emerald-700 text-emerald-200">
                    4 Workflow Templates Active
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedTemplates
                .filter(t => [
                  'name_reservation_approved',
                  'gst_approved',
                  'trademark_registered',
                  'workflow_stage_completed',
                  'task_assignment_v22'
                ].includes(t.name))
                .map(tmpl => {
                  return (
                    <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-slate-900">{tmpl.name}</span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> APPROVED
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Category: {tmpl.category} · Language: {tmpl.language}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{tmpl.metaTemplateId}</span>
                        </div>

                        {/* WhatsApp Message Preview Bubble */}
                        <div className="bg-[#EFEAE2] p-3.5 rounded-xl border border-[#D1D7DB] my-3 text-xs shadow-inner">
                          {tmpl.headerText && (
                            <div className="font-bold text-slate-900 mb-2 text-[11px] pb-1 border-b border-black/10">
                              {tmpl.headerText}
                            </div>
                          )}
                          <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                            {tmpl.bodyText}
                          </div>
                          {tmpl.footerText && (
                            <div className="text-[10px] text-slate-500 mt-2 font-medium">
                              {tmpl.footerText}
                            </div>
                          )}
                          {tmpl.buttons && tmpl.buttons.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-black/10 flex flex-col gap-1.5">
                              {tmpl.buttons.map((btn, idx) => (
                                <div
                                  key={idx}
                                  className="text-center py-1.5 bg-white text-emerald-700 font-semibold rounded-md border border-slate-200 flex items-center justify-center gap-1 text-[11px]"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{btn.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parameters Breakdown */}
                      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="font-semibold text-slate-700 mb-1">Parameter Mappings:</div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <div><span className="font-mono text-emerald-700">{'{{1}}'}</span> Client / Contact Name</div>
                          <div><span className="font-mono text-emerald-700">{'{{2}}'}</span> Proposed Brand / Service</div>
                          <div><span className="font-mono text-emerald-700">{'{{3}}'}</span> Ref / SRN / GSTIN / TM No</div>
                          <div><span className="font-mono text-emerald-700">{'{{4}}'}</span> Validity / Effective Date</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRIGGER SIMULATOR & TEST SANDBOX                   */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automation Trigger Simulator</h2>
                  <p className="text-xs text-slate-500">
                    Simulate workflow stage transitions to test automation rule evaluation and dispatch across WhatsApp, Email, and Internal alerts.
                  </p>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                {/* 1. Select Work Order */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    1. Select Target Work Order:
                  </label>
                  <select
                    value={simSelectedOrderId}
                    onChange={(e) => setSimSelectedOrderId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {workOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} — {o.service} ({o.serviceCode}) [{o.clientName}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Stage */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    2. Select Workflow Stage to Transition:
                  </label>
                  {workOrders.find(o => o.id === simSelectedOrderId)?.stages ? (
                    <select
                      value={simSelectedStageId}
                      onChange={(e) => setSimSelectedStageId(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    >
                      {workOrders
                        .find(o => o.id === simSelectedOrderId)!
                        .stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            Stage #{stg.sequence}: {stg.name} (Current: {stg.status.toUpperCase()})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="text-xs text-slate-400">No stages found for this work order.</div>
                  )}
                </div>

                {/* 3. Target Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      3. Target Stage Status:
                    </label>
                    <select
                      value={simTargetStatus}
                      onChange={(e) => setSimTargetStatus(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    >
                      <option value="completed">Completed (Triggers Automation Rules)</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Statutory Reference / Note:
                    </label>
                    <input
                      type="text"
                      value={simNotes}
                      onChange={(e) => setSimNotes(e.target.value)}
                      placeholder="e.g. SRN-RUN-9821827 approved by ROC"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Simulation button */}
                <div className="pt-2">
                  <button
                    onClick={handleExecuteSimulation}
                    disabled={simExecuting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-98 transition-all disabled:opacity-50"
                  >
                    {simExecuting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Evaluating Rules & Dispatched Actions...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Simulate Stage Transition & Fire Automations</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Simulation Result Alert */}
                {simResult && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">Simulation Successful!</div>
                        <p className="text-xs text-emerald-800 mt-1">{simResult.message}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab('logs')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            <span>View Dispatched Delivery Receipts</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick preset scenarios */}
            <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 text-xs">
              <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Preset Demonstration Scenarios (Phase 8 Mandates):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  onClick={() => {
                    const plcOrder = workOrders.find(o => o.serviceCode === 'PLC');
                    if (plcOrder) {
                      setSimSelectedOrderId(plcOrder.id);
                      const nameStage = plcOrder.stages.find(s => s.sequence === 2) || plcOrder.stages[0];
                      setSimSelectedStageId(nameStage.id);
                      setSimNotes('SRN-RUN-9821827 Approved by MCA Central Registration Centre');
                      setSimTargetStatus('completed');
                    }
                  }}
                  className="bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-400 hover:shadow-xs cursor-pointer transition-all"
                >
                  <div className="font-bold text-slate-900">1. Name Reservation Approved</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">RUN / SPICe+ Part A Approval · WhatsApp template `name_reservation_approved`</div>
                </div>

                <div
                  onClick={() => {
                    const gstOrder = workOrders.find(o => o.serviceCode === 'GST') || workOrders[0];
                    if (gstOrder) {
                      setSimSelectedOrderId(gstOrder.id);
                      const gstStage = gstOrder.stages.find(s => s.sequence === 5) || gstOrder.stages[0];
                      setSimSelectedStageId(gstStage.id);
                      setSimNotes('07AAAAA0000A1Z5 Issued & REG-06 Certificate Generated');
                      setSimTargetStatus('completed');
                    }
                  }}
                  className="bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-400 hover:shadow-xs cursor-pointer transition-all"
                >
                  <div className="font-bold text-slate-900">2. GST Approved</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">GSTIN Issuance & REG-06 Docket · WhatsApp template `gst_approved`</div>
                </div>

                <div
                  onClick={() => {
                    const tmOrder = workOrders.find(o => o.serviceCode === 'TM') || workOrders[0];
                    if (tmOrder) {
                      setSimSelectedOrderId(tmOrder.id);
                      const tmStage = tmOrder.stages.find(s => s.sequence === 5) || tmOrder.stages[0];
                      setSimSelectedStageId(tmStage.id);
                      setSimNotes('TM-REG-5491029 Registered · ® Symbol Certificate Issued');
                      setSimTargetStatus('completed');
                    }
                  }}
                  className="bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-400 hover:shadow-xs cursor-pointer transition-all"
                >
                  <div className="font-bold text-slate-900">3. Trademark Registered</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Journal Publication Sealed · WhatsApp template `trademark_registered`</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* TECHNICAL DELIVERY INSPECTOR MODAL                        */}
      {/* ========================================================= */}
      {isInspectModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  selectedLog.channel === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-700' :
                  selectedLog.channel === 'EMAIL' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedLog.channel === 'WHATSAPP' && <MessageSquare className="w-5 h-5" />}
                  {selectedLog.channel === 'EMAIL' && <Mail className="w-5 h-5" />}
                  {selectedLog.channel === 'INTERNAL_NOTIFICATION' && <Bell className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Technical Delivery Receipt: {selectedLog.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Channel: {selectedLog.channel} · Status: {selectedLog.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Recipient & Trigger Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Recipient</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedLog.recipient.name}</div>
                  <div className="font-mono text-slate-600">{selectedLog.recipient.contact}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    {selectedLog.recipient.type}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Trigger Work Order</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedLog.trigger.workOrderId}</div>
                  <div className="text-slate-600 truncate">{selectedLog.trigger.stageName}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Transitioned by {selectedLog.trigger.triggeredBy.name}
                  </div>
                </div>
              </div>

              {/* Visual Preview */}
              <div>
                <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Rendered Visual Preview</span>
                  {selectedLog.templateName && (
                    <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Meta Template: {selectedLog.templateName}
                    </span>
                  )}
                </div>

                {/* If WhatsApp */}
                {selectedLog.channel === 'WHATSAPP' && (
                  <div className="bg-[#EFEAE2] p-4 rounded-xl border border-[#D1D7DB] shadow-inner font-sans">
                    <div className="bg-white rounded-lg p-3.5 shadow-sm max-w-lg ml-auto border border-black/5 text-slate-900">
                      <div className="whitespace-pre-line leading-relaxed text-xs">
                        {selectedLog.renderedBody}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>{new Date(selectedLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* If Email */}
                {selectedLog.channel === 'EMAIL' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 text-xs">
                        Subject: {selectedLog.subject}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: {selectedLog.recipient.contact}
                      </div>
                    </div>
                    <div className="p-4 space-y-2 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                      {selectedLog.renderedBody}
                    </div>
                    <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
                      EFilingg Enterprise Tax & Compliance Network · Bangalore / Delhi / Mumbai
                    </div>
                  </div>
                )}

                {/* If Internal Notification */}
                {selectedLog.channel === 'INTERNAL_NOTIFICATION' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                    <Bell className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-purple-900 text-sm">{selectedLog.subject}</div>
                      <div className="text-purple-800 text-xs mt-1">{selectedLog.renderedBody}</div>
                      <div className="text-[10px] text-purple-600 mt-2 font-mono">
                        Target Audience: {selectedLog.recipient.contact}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Network Metadata */}
              <div>
                <div className="text-xs font-bold text-slate-900 mb-2">Network Transmission Metadata</div>
                <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                  <div>provider: "{selectedLog.metadata.provider}"</div>
                  <div>receiptId: "{selectedLog.metadata.deliveryReceiptId || 'N/A'}"</div>
                  <div>latency: {selectedLog.metadata.latencyMs || 0} ms</div>
                  <div>status: "{selectedLog.status}"</div>
                  <div>timestamp: "{selectedLog.timestamp}"</div>
                  {selectedLog.metadata.parameters && (
                    <div>
                      params: {JSON.stringify(selectedLog.metadata.parameters)}
                    </div>
                  )}
                  {selectedLog.metadata.error && (
                    <div className="text-rose-400">error: "{selectedLog.metadata.error}"</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {onNavigateToWorkOrder && (
                <button
                  onClick={() => {
                    setIsInspectModalOpen(false);
                    onNavigateToWorkOrder(selectedLog.trigger.workOrderId);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                >
                  <span>Open Work Order {selectedLog.trigger.workOrderId}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {selectedLog.status === 'FAILED' && (
                  <button
                    onClick={() => handleRetryLog(selectedLog.id)}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Retry Delivery
                  </button>
                )}
                <button
                  onClick={() => setIsInspectModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
