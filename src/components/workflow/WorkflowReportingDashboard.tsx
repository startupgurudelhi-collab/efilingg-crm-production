/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PHASE 9 – REPORTING & ANALYTICS DASHBOARD
 * Complete executive suite featuring:
 * 1. Workload by Employee (capacity, bottlenecks, on-time rates)
 * 2. Service Performance (volumes, completion rates, conversions)
 * 3. Turnaround Time (TAT) Analysis (target vs actual, stage durations, SLA adherence)
 * 4. Completed Works Archive (variance, delivery records, certificates)
 * 5. Overdue Works & Escalations (severity, bottleneck stage, contact info)
 * 6. Revenue by Service & Department (gross bookings, realized, pipeline)
 * 7. Multi-Format Exports (Excel, PDF, CSV)
 * 8. Role-Based Visibility (Admin, Team Leader, Employee)
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import {
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Download,
  Filter,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { Employee } from '../../types';
import {
  generateExecutiveReportDataset,
  exportReportToExcel,
  exportReportToPdf,
  exportReportToCsv,
  DateRangePreset,
  ReportFilterOptions,
  EmployeeWorkloadMetric,
  ServicePerformanceMetric,
  TatAnalysisMetric,
  CompletedWorkItem,
  OverdueWorkItem,
  RevenueByServiceMetric
} from '../../lib/workflowReporting';
import { WORKFLOW_DEPARTMENTS, PREDEFINED_WORKFLOW_SERVICES } from '../../lib/workflowWorkOrders';

interface WorkflowReportingDashboardProps {
  sessionUser: Employee;
  onNavigateToWorkOrder?: (workOrderId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
}

type ReportingTab =
  | 'workload'
  | 'service_performance'
  | 'turnaround_time'
  | 'completed_works'
  | 'overdue_works'
  | 'revenue';

export const WorkflowReportingDashboard: React.FC<WorkflowReportingDashboardProps> = ({
  sessionUser,
  onNavigateToWorkOrder,
  onNavigateToClient
}) => {
  // Navigation & Active Tab
  const [activeTab, setActiveTab] = useState<ReportingTab>('workload');

  // Filters State
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Export dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Generate dataset based on session role & active filters
  const filterOptions: ReportFilterOptions = useMemo(() => ({
    dateRange,
    department: departmentFilter,
    serviceCode: serviceFilter
  }), [dateRange, departmentFilter, serviceFilter]);

  const dataset = useMemo(() => {
    return generateExecutiveReportDataset(sessionUser, filterOptions);
  }, [sessionUser, filterOptions]);

  // Trigger temporary export alert feedback
  const triggerExportFeedback = (msg: string) => {
    setExportFeedback(msg);
    setIsExportMenuOpen(false);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleExportExcel = () => {
    exportReportToExcel(dataset, `eFilingg_Workflow_Report_${activeTab}`);
    triggerExportFeedback('Excel report downloaded with 6 sheets!');
  };

  const handleExportPdf = () => {
    exportReportToPdf(dataset, `eFilingg_Executive_Report_${activeTab}`);
    triggerExportFeedback('Executive PDF report generated successfully!');
  };

  const handleExportCsv = (section: 'summary' | 'workload' | 'services' | 'completed' | 'overdue' | 'revenue') => {
    exportReportToCsv(dataset, section, `eFilingg_Report_${section}`);
    triggerExportFeedback(`CSV export for ${section} downloaded!`);
  };

  // Filtered completed works by search
  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return dataset.completedWorks;
    const q = searchQuery.toLowerCase();
    return dataset.completedWorks.filter(
      c =>
        c.id.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.serviceName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q)
    );
  }, [dataset.completedWorks, searchQuery]);

  // Filtered overdue works by search
  const filteredOverdue = useMemo(() => {
    if (!searchQuery.trim()) return dataset.overdueWorks;
    const q = searchQuery.toLowerCase();
    return dataset.overdueWorks.filter(
      o =>
        o.id.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.serviceName.toLowerCase().includes(q) ||
        o.ownerName.toLowerCase().includes(q)
    );
  }, [dataset.overdueWorks, searchQuery]);

  // Colors for charts
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Executive Reporting & Analytics Engine
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                    Phase 9
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time operational business intelligence, SLA turnaround tracking, capacity analytics, and revenue accounting.
                </p>
              </div>
            </div>

            {/* Role-based Visibility Badge */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                Access Scope:
              </span>
              {sessionUser.role === 'admin' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Global Enterprise Visibility (All Staff & Services)
                </span>
              ) : sessionUser.role === 'team_leader' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Department Lead Scope ({sessionUser.department})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Personal Operational Scope ({sessionUser.name})
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar: Filter Controls & Export Menu */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Preset */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
                className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Historical Time</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_quarter">Current Quarter (Q4)</option>
                <option value="this_fy">Financial Year 2025-26</option>
              </select>
            </div>

            {/* Department Filter (Visible to Admin) */}
            {sessionUser.role === 'admin' && (
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {WORKFLOW_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Service Filter */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200">
              <Briefcase className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Services</option>
                {PREDEFINED_WORKFLOW_SERVICES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} · {s.name}</option>
                ))}
              </select>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Report</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Comprehensive Downloads
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Excel Workbook (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">All 6 sheets formatted</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Executive PDF (.pdf)</div>
                      <div className="text-[10px] text-slate-400">Printable KPI brief</div>
                    </div>
                  </button>

                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-700 mt-1">
                    Raw CSV Downloads
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('workload')}
                    className="w-full px-3 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <span>Workload Data CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('services')}
                    className="w-full px-3 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    <span>Service Performance CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('completed')}
                    className="w-full px-3 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Completed Works CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('overdue')}
                    className="w-full px-3 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span>Overdue Escalations CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCsv('revenue')}
                    className="w-full px-3 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 cursor-pointer"
                  >
                    <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
                    <span>Revenue Ledger CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Alert if exported */}
        {exportFeedback && (
          <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-lg flex items-center space-x-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{exportFeedback}</span>
          </div>
        )}
      </div>

      {/* Top Level Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Orders */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Orders
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {dataset.summaryKpis.totalWorkOrders}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{dataset.summaryKpis.activeWorkOrders} active</span> in-flight
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Completion Rate
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {dataset.summaryKpis.overallCompletionRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{dataset.summaryKpis.completedWorkOrders}</span> completed
          </div>
        </div>

        {/* SLA Adherence */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            SLA On-Time Rate
          </div>
          <div className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">
            {dataset.summaryKpis.overallSlaAdherence}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Within Target TAT
          </div>
        </div>

        {/* Avg Turnaround */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Average TAT
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {dataset.summaryKpis.avgEnterpriseTatDays} <span className="text-xs font-normal text-slate-500">Days</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Start to completion
          </div>
        </div>

        {/* Overdue Orders */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Overdue Works
          </div>
          <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
            {dataset.summaryKpis.overdueWorkOrders}
          </div>
          <div className="mt-1 text-[11px] text-rose-500 font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Requires Action</span>
          </div>
        </div>

        {/* Revenue Realized */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Realized Revenue
          </div>
          <div className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">
            ₹{dataset.summaryKpis.realizedRevenue.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Pipeline: ₹{dataset.summaryKpis.pipelineRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar space-x-1">
        <button
          type="button"
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'workload'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Workload by Employee</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full font-semibold">
            {dataset.workloadByEmployee.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('service_performance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'service_performance'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Service Performance</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full font-semibold">
            {dataset.servicePerformance.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('turnaround_time')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'turnaround_time'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Turnaround Time (TAT)</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full font-semibold">
            {dataset.summaryKpis.avgEnterpriseTatDays}d avg
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed_works')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'completed_works'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Completed Works</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
            {dataset.completedWorks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overdue_works')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'overdue_works'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>Overdue Works</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full font-semibold">
            {dataset.overdueWorks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'revenue'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          <span>Revenue by Service</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full font-semibold">
            ₹{Math.round(dataset.summaryKpis.totalEnterpriseRevenue / 1000)}k
          </span>
        </button>
      </div>

      {/* TAB 1: WORKLOAD BY EMPLOYEE */}
      {activeTab === 'workload' && (
        <div className="space-y-6">
          {/* Workload Distribution Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Employee Workload & Capacity Utilization
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active vs Completed vs Overdue assignments per staff member
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleExportCsv('workload')}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Workload CSV</span>
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataset.workloadByEmployee.slice(0, 8)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="employeeName" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="activeOrders" name="Active Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completedOrders" name="Completed Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdueOrders" name="Overdue Orders" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workload Capacity Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Staff Capacity & Bottleneck Risk Matrix
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {dataset.workloadByEmployee.length} staff members assessed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Role & Department</th>
                    <th className="py-3 px-3 text-center">Active Orders</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">Overdue</th>
                    <th className="py-3 px-3 text-center">Tasks (Pending)</th>
                    <th className="py-3 px-4">Capacity Load</th>
                    <th className="py-3 px-3 text-center">Avg TAT</th>
                    <th className="py-3 px-3 text-center">On-Time %</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {dataset.workloadByEmployee.map((emp) => {
                    const isOverloaded = emp.capacityPercentage > 80;
                    const isHealthy = emp.capacityPercentage <= 60;

                    return (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{emp.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{emp.employeeId}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{emp.role.replace('_', ' ')}</div>
                          <div className="text-[10px] text-slate-400">{emp.department}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {emp.activeOrders}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {emp.completedOrders}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {emp.overdueOrders > 0 ? (
                            <span className="font-black text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/70 rounded-md border border-rose-200 dark:border-rose-800">
                              {emp.overdueOrders}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                          {emp.assignedTasks}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap min-w-[140px]">
                          <div className="flex items-center space-x-2">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  emp.capacityPercentage > 85
                                    ? 'bg-rose-500'
                                    : emp.capacityPercentage > 65
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${emp.capacityPercentage}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                              {emp.capacityPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-800 dark:text-slate-200">
                          {emp.avgTatDays > 0 ? `${emp.avgTatDays}d` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-semibold text-xs ${
                              emp.onTimeCompletionRate >= 80 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {emp.onTimeCompletionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {emp.capacityStatus === 'critical' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              CRITICAL LOAD
                            </span>
                          ) : emp.capacityStatus === 'heavy' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              HEAVY LOAD
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              BALANCED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE PERFORMANCE */}
      {activeTab === 'service_performance' && (
        <div className="space-y-6">
          {/* Service Volume & Conversion Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Service Volume & Delivery Efficiency
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total order volume and completion rate across service verticals
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleExportCsv('services')}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Services CSV</span>
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataset.servicePerformance}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="serviceCode" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="totalOrders" name="Total Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completedOrders" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeOrders" name="Active In-Flight" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Performance Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Service Vertical Performance & Conversion Matrix
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {dataset.servicePerformance.length} services configured
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Total Orders</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">In-Flight</th>
                    <th className="py-3 px-3 text-center">Completion Rate</th>
                    <th className="py-3 px-3 text-center">Target TAT</th>
                    <th className="py-3 px-3 text-center">Actual Avg TAT</th>
                    <th className="py-3 px-3 text-center">SLA Adherence</th>
                    <th className="py-3 px-4 text-right">Gross Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {dataset.servicePerformance.map((svc) => (
                    <tr key={svc.serviceCode} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                            {svc.serviceCode}
                          </span>
                          <span>{svc.serviceName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {svc.department}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                        {svc.totalOrders}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {svc.completedOrders}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                        {svc.activeOrders}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {svc.completionRate}%
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {svc.targetTatDays} Days
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {svc.actualAvgTatDays} Days
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-semibold text-xs ${
                            svc.slaAdherenceRate >= 90 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {svc.slaAdherenceRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{svc.totalRevenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TURNAROUND TIME (TAT) */}
      {activeTab === 'turnaround_time' && (
        <div className="space-y-6">
          {/* Target vs Actual TAT Comparison */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Target TAT vs Actual Execution Days
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparison between promised turnaround commitments and actual delivery timelines
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Enterprise Avg: {dataset.summaryKpis.avgEnterpriseTatDays} Days</span>
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataset.tatAnalysis}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="serviceCode" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="d" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="targetDays" name="Target TAT (Days)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualAvgDays" name="Actual Avg Delivery (Days)" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage Bottleneck Analysis */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Stage-by-Stage Operational Bottleneck Breakdown
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Analysis of where delays occur across workflows
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataset.tatAnalysis.slice(0, 6).map((tat) => (
                <div
                  key={tat.serviceCode}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 font-mono text-[10px]">
                        {tat.serviceCode}
                      </span>
                      <span className="truncate max-w-[160px]">{tat.serviceName}</span>
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {tat.actualAvgDays}d / {tat.targetDays}d target
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {tat.stageBreakdown.map((stage) => (
                      <div key={stage.sequence} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate max-w-[180px]">
                          <span className="font-mono text-slate-400">S{stage.sequence}:</span>
                          <span>{stage.stageName}</span>
                        </span>
                        <span className={`font-mono font-semibold ${stage.isBottleneck ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {Math.round(stage.avgDaysTaken * 10) / 10}d
                          {stage.isBottleneck && <span className="ml-1 text-[9px] text-rose-500 font-bold">★</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">SLA Adherence:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {tat.slaAdherencePercentage}% On-Time
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLETED WORKS */}
      {activeTab === 'completed_works' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search completed works, clients, owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500">Showing {filteredCompleted.length} delivered works</span>
              <button
                type="button"
                onClick={() => handleExportCsv('completed')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Completed CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID & Service</th>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Assigned Owner</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Start Date</th>
                    <th className="py-3 px-3 text-center">Completed Date</th>
                    <th className="py-3 px-3 text-center">Actual TAT</th>
                    <th className="py-3 px-3 text-center">SLA Variance</th>
                    <th className="py-3 px-4 text-right">Fee (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredCompleted.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No completed work orders match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCompleted.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onNavigateToWorkOrder && onNavigateToWorkOrder(item.id)}
                            className="font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.id}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.serviceName}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{item.clientName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{item.clientId}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium">
                          {item.ownerName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {item.department}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.startDate}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {item.completedDate}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.actualTatDays} Days
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.isWithinSla ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200">
                              {item.varianceDays <= 0 ? `${Math.abs(item.varianceDays)}d early` : 'On Target'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200">
                              +{item.varianceDays}d delayed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{item.estimatedFee.toLocaleString('en-IN')}
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

      {/* TAB 5: OVERDUE WORKS */}
      {activeTab === 'overdue_works' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search overdue orders, clients, owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-rose-600 font-semibold">{filteredOverdue.length} orders past SLA</span>
              <button
                type="button"
                onClick={() => handleExportCsv('overdue')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Overdue CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID & Service</th>
                    <th className="py-3 px-3">Client Contact</th>
                    <th className="py-3 px-3">Assigned Owner</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Due Date</th>
                    <th className="py-3 px-3 text-center">Days Overdue</th>
                    <th className="py-3 px-3">Stuck Stage</th>
                    <th className="py-3 px-3 text-center">Severity</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredOverdue.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No overdue work orders. All workflows are currently on track!
                      </td>
                    </tr>
                  ) : (
                    filteredOverdue.map((item) => (
                      <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onNavigateToWorkOrder && onNavigateToWorkOrder(item.id)}
                            className="font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.id}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <div className="text-[11px] text-slate-500">{item.serviceName}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{item.clientName}</div>
                          <div className="text-[10px] text-slate-400">{item.clientMobile || item.clientEmail || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                          {item.ownerName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {item.department}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                          {item.dueDate}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-rose-600 dark:text-rose-400 font-mono">
                          +{item.daysOverdue} Days
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Stage {item.currentStageSequence}: {item.currentStageName}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">{item.currentStageStatus.replace('_', ' ')}</div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.severity === 'critical' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse">
                              CRITICAL
                            </span>
                          ) : item.severity === 'high' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              HIGH
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                              MODERATE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onNavigateToWorkOrder && onNavigateToWorkOrder(item.id)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Expedite
                          </button>
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

      {/* TAB 6: REVENUE BY SERVICE */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Distribution Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Revenue Realization & Pipeline Value
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Realized revenue from delivered works vs active in-flight pipeline fees
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleExportCsv('revenue')}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Revenue CSV</span>
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataset.revenueByService}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="serviceCode" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="realizedRevenue" name="Realized Fees (INR)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pipelineRevenue" name="Pipeline In-Flight (INR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Service Line Financial Performance Ledger
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Total Gross Value: ₹{dataset.summaryKpis.totalEnterpriseRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Orders</th>
                    <th className="py-3 px-3 text-center">Delivered</th>
                    <th className="py-3 px-3 text-right">Avg Deal Size</th>
                    <th className="py-3 px-3 text-right">Realized Fees</th>
                    <th className="py-3 px-3 text-right">Pipeline Fees</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-3 text-center">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {dataset.revenueByService.map((rev) => (
                    <tr key={rev.serviceCode} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                            {rev.serviceCode}
                          </span>
                          <span>{rev.serviceName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {rev.department}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                        {rev.orderCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {rev.completedCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{rev.avgDealSize.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{rev.realizedRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        ₹{rev.pipelineRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        ₹{rev.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        {rev.revenueSharePercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
