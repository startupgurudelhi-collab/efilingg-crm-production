/**
 * AI Sales Agent - Module 8: Dashboard Component
 * Efilingg CRM
 */

import React, { useEffect, useState } from 'react';
import {
  AiDashboardMetrics,
  AiQualifiedLead,
  AiTrainingLog,
} from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  Briefcase,
  HelpCircle,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Bot,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  XCircle,
  PhoneCall,
  UserCheck,
} from 'lucide-react';

interface AiAgentDashboardProps {
  onNavigateToTab: (tab: 'knowledge_base' | 'faq_training' | 'lead_forms' | 'qualified_leads' | 'settings') => void;
  triggerRefresh?: number;
}

export default function AiAgentDashboard({ onNavigateToTab, triggerRefresh = 0 }: AiAgentDashboardProps) {
  const [metrics, setMetrics] = useState<AiDashboardMetrics>(AiAgentRepository.getDashboardMetrics());
  const [recentLeads, setRecentLeads] = useState<AiQualifiedLead[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<AiQualifiedLead[]>([]);
  const [recentLogs, setRecentLogs] = useState<AiTrainingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getLeadAge = (createdAt: string): string => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const loadData = () => {
    setIsLoading(true);
    try {
      const currentMetrics = AiAgentRepository.getDashboardMetrics();
      const allLeads = AiAgentRepository.getQualifiedLeads();
      const recent = allLeads.slice(0, 5);
      const pending = allLeads.filter((l) => l.status === 'PENDING_FOLLOWUP' || l.status === 'NEW');
      const logs = AiAgentRepository.getTrainingLogs().slice(0, 6);

      setMetrics(currentMetrics);
      setRecentLeads(recent);
      setPendingFollowups(pending);
      setRecentLogs(logs);
    } catch (err) {
      console.error('Error loading AI Agent Dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [triggerRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_FOLLOWUP':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">PENDING FOLLOWUP</span>;
      case 'NEW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">NEW</span>;
      case 'CONTACTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">CONTACTED</span>;
      case 'CONVERTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">CONVERTED</span>;
      case 'LOST':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">LOST</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Status */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        metrics.agentEnabled
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20'
          : 'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
            metrics.agentEnabled ? 'bg-emerald-600' : 'bg-amber-600'
          }`}>
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                AI WhatsApp Sales Agent Engine V1
              </h2>
              <span className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md ${
                metrics.agentEnabled ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {metrics.agentEnabled ? 'ACTIVE & READY' : 'DISABLED / PAUSED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Foundation schema, knowledge base, FAQs, and lead form builder operational.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigateToTab('settings')}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
          >
            <span>Agent Settings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Services */}
        <div
          onClick={() => onNavigateToTab('knowledge_base')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Services</span>
            <Briefcase className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalServices}
          </div>
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.activeServices} Active Knowledge Bases
          </div>
        </div>

        {/* Total FAQs */}
        <div
          onClick={() => onNavigateToTab('faq_training')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">FAQ Training</span>
            <HelpCircle className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalFaqs}
          </div>
          <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.activeFaqs} Trained Answers
          </div>
        </div>

        {/* Lead Forms */}
        <div
          onClick={() => onNavigateToTab('lead_forms')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lead Forms</span>
            <FileSpreadsheet className="h-4 w-4 text-teal-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalLeadForms}
          </div>
          <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 mt-1">
            {metrics.activeLeadForms} Active Form Schemas
          </div>
        </div>

        {/* Qualified Leads */}
        <div
          onClick={() => onNavigateToTab('qualified_leads')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Qualified Leads</span>
            <Users className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalQualifiedLeads}
          </div>
          <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
            {metrics.newLeads} New Uncontacted
          </div>
        </div>

        {/* Today's Leads */}
        <div
          onClick={() => onNavigateToTab('qualified_leads')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Leads</span>
            <Clock className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.todaysLeads}
          </div>
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
            Captured Today
          </div>
        </div>

        {/* Converted Leads */}
        <div
          onClick={() => onNavigateToTab('qualified_leads')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Converted</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.convertedLeads}
          </div>
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.conversionRate}% Conversion Rate
          </div>
        </div>
      </div>

      {/* 🔥 AI Pending Followups Queue Widget */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl border border-amber-500/30 dark:border-amber-500/20 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="text-base">🔥</span>
              <span>AI Pending Followups Queue</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs">
                {pendingFollowups.length} PENDING
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Qualified leads requiring human executive contact after AI conversation completion
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('qualified_leads')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center space-x-1 cursor-pointer"
          >
            <span>Open Followup Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {pendingFollowups.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
            ✅ No pending followups! All AI leads have been attended to.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-amber-200/50 dark:border-amber-800/30 text-amber-900/60 dark:text-amber-300/60 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Created Time</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60 dark:divide-amber-900/20 font-medium text-slate-800 dark:text-slate-200">
                {pendingFollowups.map((lead) => (
                  <tr key={lead.id} className="hover:bg-amber-500/10 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {lead.customer_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      +{lead.mobile}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                        {lead.service_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                      {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                    </td>
                    <td className="py-3 px-3 font-extrabold text-[11px] text-amber-600 dark:text-amber-400">
                      {getLeadAge(lead.created_at)}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {lead.assigned_to || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Grid Section: Funnel & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Qualified Leads Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Users className="h-4 w-4 text-emerald-500" />
                <span>Recent AI-Qualified Leads</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest customer leads gathered via WhatsApp AI conversational forms
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('qualified_leads')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({metrics.totalQualifiedLeads})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
              No qualified leads recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Lead Name</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {lead.customer_name}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">+{lead.mobile}</div>
                        {lead.email && <div className="text-[10px] text-slate-400">{lead.email}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                          {lead.service_name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[10.5px] text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Funnel Breakdown & Recent Training Logs */}
        <div className="space-y-6">
          {/* Status Breakdown Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span>Lead Conversion Pipeline</span>
            </h3>

            <div className="space-y-3 text-xs font-semibold">
              {/* NEW */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">NEW LEADS</span>
                  <span className="text-slate-500">{metrics.newLeads} ({metrics.totalQualifiedLeads ? Math.round((metrics.newLeads / metrics.totalQualifiedLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${metrics.totalQualifiedLeads ? (metrics.newLeads / metrics.totalQualifiedLeads) * 100 : 0}%` }} />
                </div>
              </div>

              {/* CONTACTED */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">CONTACTED</span>
                  <span className="text-slate-500">{metrics.contactedLeads} ({metrics.totalQualifiedLeads ? Math.round((metrics.contactedLeads / metrics.totalQualifiedLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metrics.totalQualifiedLeads ? (metrics.contactedLeads / metrics.totalQualifiedLeads) * 100 : 0}%` }} />
                </div>
              </div>

              {/* CONVERTED */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">CONVERTED</span>
                  <span className="text-slate-500">{metrics.convertedLeads} ({metrics.totalQualifiedLeads ? Math.round((metrics.convertedLeads / metrics.totalQualifiedLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.totalQualifiedLeads ? (metrics.convertedLeads / metrics.totalQualifiedLeads) * 100 : 0}%` }} />
                </div>
              </div>

              {/* LOST */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">LOST</span>
                  <span className="text-slate-500">{metrics.lostLeads} ({metrics.totalQualifiedLeads ? Math.round((metrics.lostLeads / metrics.totalQualifiedLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${metrics.totalQualifiedLeads ? (metrics.lostLeads / metrics.totalQualifiedLeads) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="h-4 w-4 text-teal-500" />
              <span>Recent Training Logs</span>
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentLogs.length === 0 ? (
                <div className="text-slate-400 text-xs py-4 text-center">No logs found.</div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{log.action_type}</span>
                      <span className="font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium leading-snug">
                      {log.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
