import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Briefcase,
  Shield,
  Users,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  DollarSign,
  Activity,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  PhoneCall,
  CheckCircle,
  FileText,
  Lock,
  ArrowUpRight,
  ChevronRight,
  ListTodo,
  CheckSquare,
  ExternalLink,
  Building2,
  Award,
  Tag,
  Check,
  KeyRound,
  Download,
  Printer,
  Settings,
  HelpCircle,
  FileCheck2,
  BadgePercent,
  Landmark,
  Scale
} from 'lucide-react';
import { Employee, Lead, FollowUp, Proposal, ActivityLog } from '../types';
import { hasModuleAccess } from '../lib/permissions';
import { 
  getV2GstClients,
  getV2GstReturnStatuses,
  getV2McaClients,
  getV2ItrClients,
  getV2TrustClients,
  getV2DscClients,
  getV2Trademarks,
  getV2OtherServiceClients,
  getV2Tasks,
  completeV2Task,
  V2Task
} from '../lib/v2_db';
import { getAttendances, getISTDateString, getLeaveRequests } from '../lib/db';
import {
  BusinessOperationsIllustration,
  TeamCollaborationIllustration,
  AnalyticsIllustration,
  ComplianceSecurityIllustration
} from './ExecutiveIllustrations';
import {
  GSTServiceLogo,
  IncomeTaxServiceLogo,
  MCAServiceLogo,
  NGOServiceLogo,
  DSCServiceLogo,
  TrademarkServiceLogo,
  TaskCommandLogo,
  SalesCRMLogo
} from './ServiceLogos';

interface MasterExecutiveLandingProps {
  sessionUser: Employee;
  employees: Employee[];
  leads: Lead[];
  followups: FollowUp[];
  proposals: Proposal[];
  syncStatus: 'syncing' | 'connected' | 'error' | 'no_table' | 'idle';
  onNavigateModule: (module: 'sales' | 'ops' | 'settings' | 'hr', specificTab?: string) => void;
  onRefreshData: () => void;
  onTriggerLeadDetail?: (id: string | null) => void;
  onTriggerProposalDraft?: () => void;
  onOpenProfileSettings?: () => void;
}

export default function MasterExecutiveLanding({
  sessionUser,
  employees,
  leads,
  followups,
  proposals,
  syncStatus,
  onNavigateModule,
  onRefreshData,
  onTriggerLeadDetail,
  onTriggerProposalDraft,
  onOpenProfileSettings
}: MasterExecutiveLandingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTaskIdLocal, setCompletedTaskIdLocal] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickCompleteTask = (taskId: string) => {
    try {
      completeV2Task(taskId);
      setCompletedTaskIdLocal(taskId);
      setTimeout(() => {
        onRefreshData();
        setCompletedTaskIdLocal(null);
      }, 500);
    } catch (e) {
      console.error('Error completing task:', e);
    }
  };

  // Compute key stats
  const totalEmployees = employees.length;
  const activeEmployeesCount = employees.filter((e) => e.status === 'active').length;

  const totalLeads = leads.length;
  const convertedLeadsCount = leads.filter((l) => l.stage === 'Converted').length;
  const conversionRate = totalLeads ? Math.round((convertedLeadsCount / totalLeads) * 100) : 0;
  const pendingFollowupsCount = followups.filter((f) => f.status === 'pending').length;

  // Operations stats
  const gstClients = getV2GstClients();
  const mcaClients = getV2McaClients();
  const itrClients = getV2ItrClients();
  const trustClients = getV2TrustClients();
  const dscClients = getV2DscClients();
  const trademarkClients = getV2Trademarks();
  const otherClients = getV2OtherServiceClients();
  const v2Tasks = getV2Tasks();
  const gstReturns = getV2GstReturnStatuses();

  const isAssignedToUser = (assignedId?: string, assignedName?: string) => {
    if (!assignedId && !assignedName) return false;
    return (
      (assignedId && (
        assignedId === sessionUser.id || 
        assignedId.toLowerCase() === sessionUser.id.toLowerCase() ||
        (sessionUser.employeeCode && assignedId.toLowerCase() === sessionUser.employeeCode.toLowerCase())
      )) ||
      (sessionUser.name && assignedName && assignedName.toLowerCase() === sessionUser.name.toLowerCase()) ||
      (sessionUser.name && assignedId && assignedId.toLowerCase() === sessionUser.name.toLowerCase())
    );
  };

  const myGstClients = gstClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myMcaClients = mcaClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myItrClients = itrClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myTrustClients = trustClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myDscClients = dscClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myTrademarkClients = trademarkClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));
  const myOtherClients = otherClients.filter(c => isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName));

  const myAllottedClientsList = [
    ...myGstClients.map(c => ({ id: c.id, name: c.clientName, subtitle: c.firmName || c.gstin || 'GST Regular Account', category: 'GST Filing', status: c.returnsMode, phone: c.clientMobile, target: 'gst' })),
    ...myMcaClients.map(c => ({ id: c.id, name: c.clientName, subtitle: c.clientType, category: 'MCA / ROC', status: c.isInc20aFiled ? 'Inc-20A Filed' : 'Pending', phone: c.clientMobile, target: 'mca' })),
    ...myItrClients.map(c => ({ id: c.id, name: c.taxpayerName, subtitle: c.panNumber ? `PAN: ${c.panNumber}` : c.typeOfItr, category: 'Income Tax', status: c.itrStatus, phone: c.mobileNumber || '', target: 'itr' })),
    ...myTrustClients.map(c => ({ id: c.id, name: c.entityName, subtitle: c.typeOfEntity, category: 'Trust & NGO', status: c.complianceStatus, phone: c.mobileNumber || '', target: 'trust' })),
    ...myDscClients.map(c => ({ id: c.id, name: c.clientName, subtitle: `${c.issuerName} • ${c.tokenName}`, category: 'DSC Token', status: `Exp: ${c.expiryDate}`, phone: '', target: 'dsc' })),
    ...myTrademarkClients.map(c => ({ id: c.id, name: c.clientName, subtitle: `${c.brandName} (Class ${c.classNumber})`, category: 'Trademark', status: c.stage, phone: '', target: 'trademark' })),
    ...myOtherClients.map(c => ({ id: c.id, name: c.clientName, subtitle: c.serviceAvailed, category: 'Other Licenses', status: 'Active', phone: c.mobileNumber || '', target: 'license' }))
  ];

  const myAllottedClientsCount = myAllottedClientsList.length;

  const myTasksList = v2Tasks.filter((t) => {
    return (
      t.assignedTo === sessionUser.id ||
      t.assignedTo === 'ALL' ||
      (t.assignedToName && sessionUser.name && t.assignedToName.toLowerCase() === sessionUser.name.toLowerCase()) ||
      (t.assignedTo && sessionUser.name && t.assignedTo.toLowerCase() === sessionUser.name.toLowerCase())
    );
  });

  // Today string for calculations
  const todayStr = getISTDateString();

  const myPendingV2TasksList = myTasksList.filter(t => t.status === 'pending');
  const myCompletedV2TasksList = myTasksList.filter(t => t.status === 'completed');
  const myTodayDueV2TasksList = myTasksList.filter(t => t.dueDate === todayStr && t.status !== 'completed');

  // Unique clients count across CRM
  const totalClientsCount = new Set([
    ...gstClients.map((c) => c.firmName || c.clientName),
    ...mcaClients.map((c) => c.clientName),
    ...itrClients.map((c) => c.taxpayerName),
    ...leads.filter((l) => l.stage === 'Converted').map((l) => l.businessName || l.customerName)
  ]).size;

  const pendingGstCount = gstReturns.filter((r) => r.gstr1 !== 'FILED' || r.gstr3b !== 'FILED').length;
  const pendingItrCount = itrClients.filter((i) => i.itrStatus !== 'FILED').length;
  const pendingTasksCount = v2Tasks.filter((t) => t.status === 'pending').length;
  const totalPendingOps = pendingGstCount + pendingItrCount + pendingTasksCount;
  const completedOpsCount = v2Tasks.filter((t) => t.status === 'completed').length + gstReturns.filter((r) => r.gstr1 === 'FILED' && r.gstr3b === 'FILED').length;
  const todayDueCount = v2Tasks.filter((t) => t.dueDate === todayStr && t.status !== 'completed').length;

  // Total pending tasks (leads + ops)
  const totalExecutivePendingTasks = pendingFollowupsCount + totalPendingOps;

  // Monthly Revenue Calculation
  const convertedRevenue = proposals
    .filter((p) => p.status === 'accepted' || p.status === 'sent')
    .reduce((sum, p) => sum + (p.finalAmount || 0), 0);

  // Attendance summary for today
  const allAttendances = getAttendances().filter((a) => a.date === todayStr);
  const presentTodayCount = allAttendances.filter((a) => a.status === 'Present').length;
  const leavesTodayCount = getLeaveRequests().filter((l) => l.status === 'approved' && todayStr >= l.startDate && todayStr <= l.endDate).length;

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Funnel calculations
  const funnelStages = [
    { label: 'New Inbound', count: leads.filter((l) => l.stage === 'New Lead').length, color: 'from-blue-500 to-indigo-500' },
    { label: 'Contacted', count: leads.filter((l) => l.stage === 'Contacted').length, color: 'from-indigo-500 to-purple-500' },
    { label: 'Interested / In Negotiation', count: leads.filter((l) => l.stage === 'Interested' || l.stage === 'Negotiation').length, color: 'from-purple-500 to-pink-500' },
    { label: 'Proposal Sent', count: leads.filter((l) => l.stage === 'Proposal Sent').length, color: 'from-amber-500 to-orange-500' },
    { label: 'Converted Client', count: convertedLeadsCount, color: 'from-emerald-500 to-teal-500' }
  ];

  const isMasterOrTL = sessionUser.role === 'admin' || sessionUser.role === 'team_leader';

  const joiningDateDisplay = sessionUser.dateOfJoining
    ? new Date(sessionUser.dateOfJoining).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '15 Jan 2026';

  const getTenureString = (doj?: string) => {
    if (!doj) return '6 months active';
    const start = new Date(doj);
    const now = new Date();
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (diffMonths <= 0) return 'New Joiner (< 1 month)';
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    const years = Math.floor(diffMonths / 12);
    const rem = diffMonths % 12;
    return `${years} yr${years > 1 ? 's' : ''} ${rem ? `${rem} mo` : ''}`;
  };

  // Employee personal metrics (so employees only see their assigned work, never company-wide sensitive financials or telemetry)
  const myAssignedLeads = leads.filter((l) => {
    if (!l.assignedTo) return false;
    return (
      l.assignedTo === sessionUser.id ||
      l.assignedTo.toLowerCase() === sessionUser.id.toLowerCase() ||
      (sessionUser.email && l.assignedTo.toLowerCase() === sessionUser.email.toLowerCase()) ||
      (sessionUser.name && l.assignedTo.toLowerCase() === sessionUser.name.toLowerCase())
    );
  });
  const myConvertedLeads = myAssignedLeads.filter((l) => l.stage === 'Converted').length;
  const myConversionRate = myAssignedLeads.length ? Math.round((myConvertedLeads / myAssignedLeads.length) * 100) : 0;
  const myPendingFollowups = followups.filter((f) => f.status === 'pending' && myAssignedLeads.some((l) => l.id === f.leadId)).length;
  const myV2Tasks = v2Tasks.filter((t) => t.assignedTo === sessionUser.id && t.status === 'pending').length;
  const myPendingTasksCount = myPendingFollowups + myV2Tasks;
  const isMyAttendancePresent = allAttendances.some((a) => a.employeeId === sessionUser.id && a.status === 'Present');

  return (
    <div className="space-y-4 sm:space-y-4.5 animate-fade-in pb-8 font-sans">
      {/* ==============================================================
          1. WELCOME HERO SECTION (EXECUTIVE COMPACT)
          ============================================================== */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-3.5 sm:p-4 md:p-5 shadow-xl border border-slate-700/50">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2.5">
          {/* Header Title & Subtitle + Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="space-y-1 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                  <Sparkles className="h-3 w-3" />
                  <span>{isMasterOrTL ? 'Executive Command Center' : 'Employee Workspace Portal'}</span>
                </div>
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white leading-tight">
                Welcome to Legomark & Efilingg Office Management
              </h1>
              <p className="text-slate-300 text-[11px] sm:text-xs leading-normal line-clamp-1">
                {isMasterOrTL
                  ? 'Unified Business Operations, Sales Intelligence, Compliance Management & Workforce Control Center'
                  : 'Assigned Workspaces, Task Queue & Department Operations'}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onRefreshData}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/50 text-[11px] font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
                title="Refresh Workspace Metrics"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                <span>Sync Live Data</span>
              </button>
              {onTriggerLeadDetail && hasModuleAccess(sessionUser, 'sales_marketing') && (
                <button
                  onClick={() => onTriggerLeadDetail(null)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>+ Quick New Lead</span>
                </button>
              )}
            </div>
          </div>

          {/* Executive Summary Cards (6 Key Operational Pills - Compact) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-white/10">
            {/* 1. Date */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <Calendar className="h-3 w-3 text-indigo-400 shrink-0" />
                <span>Current Date</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-tight mt-0.5">{formattedDate}</p>
            </div>

            {/* 2. Time */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <Clock className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>IST Clock</span>
              </div>
              <p className="text-xs sm:text-sm font-bold font-mono text-emerald-300 tracking-tight leading-tight mt-0.5">{formattedTime}</p>
            </div>

            {/* 3. Logged In User */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <UserCheck className="h-3 w-3 text-amber-400 shrink-0" />
                <span>Logged In</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-tight mt-0.5" title={sessionUser.name}>
                {sessionUser.name}
              </p>
            </div>

            {/* 4. Active Employees / My Attendance Status */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <Users className="h-3 w-3 text-cyan-400 shrink-0" />
                <span>{isMasterOrTL ? 'Active Force' : 'My Attendance'}</span>
              </div>
              {isMasterOrTL ? (
                <div className="flex items-baseline space-x-1 leading-tight mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-white">{activeEmployeesCount}</span>
                  <span className="text-[9.5px] text-slate-400">/ {totalEmployees} Total</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-bold text-emerald-300 tracking-tight leading-tight mt-0.5 truncate">
                  {isMyAttendancePresent ? 'Present On Duty' : 'Shift Active'}
                </p>
              )}
            </div>

            {/* 5. Total Clients / My Allotted Clients */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <Briefcase className="h-3 w-3 text-purple-400 shrink-0" />
                <span>{isMasterOrTL ? 'Total Clients' : hasModuleAccess(sessionUser, 'sales_marketing') ? 'My Leads' : 'My Allotted Clients'}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight mt-0.5">
                {isMasterOrTL 
                  ? (totalClientsCount || totalLeads) 
                  : hasModuleAccess(sessionUser, 'sales_marketing') 
                    ? myAssignedLeads.length 
                    : myAllottedClientsCount}
              </p>
            </div>

            {/* 6. Pending Tasks */}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-center min-h-[46px]">
              <div className="flex items-center space-x-1 text-slate-400 text-[9.5px] font-medium leading-none truncate">
                <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                <span>{isMasterOrTL ? 'Pending Tasks' : 'My Pending Tasks'}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-rose-300 tracking-tight leading-tight mt-0.5">
                {isMasterOrTL 
                  ? totalExecutivePendingTasks 
                  : (myPendingV2TasksList.length + (hasModuleAccess(sessionUser, 'sales_marketing') ? myPendingFollowups : 0))}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          2. PRIMARY MODULE SELECTION (4 COMPACT VISUAL CARDS)
          ============================================================== */}
      {isMasterOrTL && (
        <section className="space-y-2">
        <div className="flex items-center justify-between pb-0.5">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Primary Executive Modules
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
              Select a specialized command workspace to manage operations, teams, compliance and growth
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline font-bold">4 CORE DIVISIONS ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          
          {/* MODULE 1: SALES & MARKETING */}
          {hasModuleAccess(sessionUser, 'sales_marketing') && (
            <div
              onClick={() => onNavigateModule('sales')}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

              <div className="space-y-2.5">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <TrendingUp className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    MODULE 1
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                    SALES & MARKETING
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    Lead Pipeline, Followups, Proposals, Service Catalogue, Proposal Designer, AI Qualified Leads
                  </p>
                </div>

                {/* Lightweight SVG Visual Accent (Compact) */}
                <div className="h-14 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-1 overflow-hidden flex items-center justify-center">
                  <AnalyticsIllustration className="h-full w-auto" />
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Total Leads' : 'My Leads'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 font-mono leading-tight">
                      {isMasterOrTL ? totalLeads : myAssignedLeads.length}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Converted' : 'My Conv.'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
                      {isMasterOrTL ? convertedLeadsCount : myConvertedLeads}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Conversion' : 'Conv. Rate'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 font-mono leading-tight">
                      {isMasterOrTL ? conversionRate : myConversionRate}%
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Pending F/U' : 'My F/U'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-500 font-mono leading-tight">
                      {isMasterOrTL ? pendingFollowupsCount : myPendingFollowups}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2 mt-1">
                <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                  <span>Open Sales Command</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: OPERATION MANAGEMENT (VISIBLE IF ANY OPS MODULE OR TASK COMMAND CENTER IS ACTIVE) */}
          {(sessionUser.role === 'admin' ||
            hasModuleAccess(sessionUser, 'gst') ||
            hasModuleAccess(sessionUser, 'mca_roc') ||
            hasModuleAccess(sessionUser, 'income_tax') ||
            hasModuleAccess(sessionUser, 'trademark') ||
            hasModuleAccess(sessionUser, 'trust_ngo') ||
            hasModuleAccess(sessionUser, 'dsc') ||
            hasModuleAccess(sessionUser, 'registration_license') ||
            hasModuleAccess(sessionUser, 'client_master')) && (
            <div
              onClick={() => onNavigateModule('ops')}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-400" />

              <div className="space-y-2.5">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <Briefcase className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    MODULE 2
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                    OPERATION MANAGEMENT
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    GST Filings, ITR Operations, MCA Compliance, Tasks Processing, Delivery Tracking
                  </p>
                </div>

                {/* Lightweight SVG Visual Accent (Compact) */}
                <div className="h-14 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-1 overflow-hidden flex items-center justify-center">
                  <BusinessOperationsIllustration className="h-full w-auto" />
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Active Clients' : 'My Clients'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 font-mono leading-tight">
                      {isMasterOrTL ? (gstClients.length + mcaClients.length + itrClients.length) : myAllottedClientsCount}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Pending Ops' : 'My Tasks'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-500 font-mono leading-tight">
                      {isMasterOrTL ? totalPendingOps : myPendingV2TasksList.length}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                      {isMasterOrTL ? 'Completed' : 'My Done'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono leading-tight">
                      {isMasterOrTL ? completedOpsCount : myCompletedV2TasksList.length}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Due Today</span>
                    <span className="text-xs sm:text-sm font-black text-amber-500 font-mono leading-tight">
                      {isMasterOrTL ? todayDueCount : myTodayDueV2TasksList.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2 mt-1">
                <div className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                  <span>Open Operations Center</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* MODULE 3: SETTINGS & CONTROL CENTER */}
          {hasModuleAccess(sessionUser, 'settings_control') && (
            <div
              onClick={() => onNavigateModule('settings')}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />

              <div className="space-y-2.5">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    MODULE 3
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                    SETTINGS & CONTROL CENTER
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    System Controls, AI Sales Agent, Recovery Center, WhatsApp Webhook, Security Telemetry
                  </p>
                </div>

                {/* Lightweight SVG Visual Accent (Compact) */}
                <div className="h-14 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-1 overflow-hidden flex items-center justify-center">
                  <ComplianceSecurityIllustration className="h-full w-auto" />
                </div>

                {/* Sub-items list tags */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">AI Sales Agent</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">WhatsApp</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">Recovery</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">Security</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Health</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2 mt-1">
                <div className="w-full py-1.5 px-3 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                  <span>Open Control Center</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* MODULE 4: HR & WORKFORCE MANAGEMENT */}
          {hasModuleAccess(sessionUser, 'hr_workforce') && (
            <div
              onClick={() => onNavigateModule('hr')}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-400" />

              <div className="space-y-2.5">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    MODULE 4
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight">
                    HR & WORKFORCE
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    Employees Roster, Payroll Approvals, Leaves, Attendance Audit & Time Logs
                  </p>
                </div>

                {/* Lightweight SVG Visual Accent (Compact) */}
                <div className="h-14 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-1 overflow-hidden flex items-center justify-center">
                  <TeamCollaborationIllustration className="h-full w-auto" />
                </div>

                {/* Sub-items list tags */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">Staff ({totalEmployees})</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Payroll</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">Attendance</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">Leave Requests</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2 mt-1">
                <div className="w-full py-1.5 px-3 rounded-lg bg-purple-600 group-hover:bg-purple-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                  <span>Open HR Center</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
      )}

      {/* ==============================================================
          3. EMPLOYEE DEDICATED WORKSPACE & SERVICE LOGO GRID (FOR EMPLOYEES)
          ============================================================== */}
      {!isMasterOrTL && (
        <div className="space-y-4">
          {/* A. EMPLOYEE PROFILE & HR CREDENTIALS BAR */}
          <section className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-base text-white shadow-inner shrink-0 border border-indigo-400/40">
                  {sessionUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-tight">{sessionUser.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 font-mono">
                      {sessionUser.employeeCode || 'EMP-EXEC'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {sessionUser.department || 'Operations'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Joined: <strong>{joiningDateDisplay}</strong></span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-300 font-medium">Tenure: {getTenureString(sessionUser.dateOfJoining)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Shift: {sessionUser.shift || 'General (10 AM - 7 PM)'}</span>
                  </div>
                </div>
              </div>

              {/* Quick HR Document Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenProfileSettings && onOpenProfileSettings()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
                  title="View Offer Letter PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Offer Letter</span>
                </button>
                <button
                  onClick={() => onOpenProfileSettings && onOpenProfileSettings()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
                  title="Generate and Download Salary Slip"
                >
                  <Printer className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Salary Slip</span>
                </button>
                <button
                  onClick={() => onOpenProfileSettings && onOpenProfileSettings()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
                  title="Change Password"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  <span>Change Password</span>
                </button>
                <button
                  onClick={() => onOpenProfileSettings && onOpenProfileSettings()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  title="Account Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </section>

          {/* B. DEPARTMENT SERVICES LOGO DASHBOARD GRID (PUBLISHER DESIGN) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
                  <Landmark className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Department Services & Compliance Dashboards</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click on any service logo below to instantly access its dedicated live workspace & client records
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full w-fit">
                QUICK SERVICE PORTALS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* SERVICE 1: GST DASHBOARD */}
              <div
                onClick={() => onNavigateModule('ops', 'gst')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-slate-200 to-emerald-600" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <GSTServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      GSTR-1 & 3B
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                      GST Services Portal
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      GST Returns (GSTR-1, GSTR-3B), Invoicing, GSTIN Registration & ITC Reconciliation
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Portfolio:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myGstClients.length} Clients</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open GST Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 2: INCOME TAX DASHBOARD */}
              <div
                onClick={() => onNavigateModule('ops', 'itr')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <IncomeTaxServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      ITR 1-7 & AUDIT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                      Income Tax & ITR
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      ITR Filing, Form 16, Tax Audit 3CD, AIS/TIS Scrutiny & Computation Statements
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Portfolio:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myItrClients.length} Taxpayers</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open Income Tax Hub</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 3: MCA & ROC DASHBOARD */}
              <div
                onClick={() => onNavigateModule('ops', 'mca')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <MCAServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      ROC & DIN
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight">
                      MCA & ROC Portal
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Pvt Ltd, LLP, Section 8 NGO, DIN KYC, AOC-4, MGT-7 & Incorporation Compliance
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Companies:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myMcaClients.length} Entities</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-purple-600 group-hover:bg-purple-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open MCA Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 4: NGO & TRUST DASHBOARD */}
              <div
                onClick={() => onNavigateModule('ops', 'trust')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <NGOServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      12A & 80G
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                      NGO & Trust Foundation
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      12A / 80G Tax Exemption, CSR-1, NGO Darpan, Form 10B/10BB & Trust Audits
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Trusts:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myTrustClients.length} Trusts</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open NGO Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 5: DIGITAL SIGNATURE (DSC) */}
              <div
                onClick={() => onNavigateModule('ops', 'dsc')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <DSCServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      CLASS 3 TOKEN
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-tight">
                      DSC Management
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Class 3 Signing & Encryption Tokens, USB Dongles, Validity Tracker & Renewals
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Active Tokens:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myDscClients.length} Keys</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 group-hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open DSC Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 6: TRADEMARK & IP */}
              <div
                onClick={() => onNavigateModule('ops', 'trademark')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-600 to-purple-600" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <TrademarkServiceLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">
                      IP & REGISTRY
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors leading-tight">
                      Trademark & IP Registry
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Trademark Search, TM Application Filing, Examination Reports, Objections & Hearings
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Brands:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{myTrademarkClients.length} Cases</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-fuchsia-600 group-hover:bg-fuchsia-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open Trademark Hub</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 7: TASK COMMAND CENTER */}
              <div
                onClick={() => onNavigateModule('ops', 'tasks')}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-violet-600" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <TaskCommandLogo className="h-12 w-12" />
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      DAILY WORKLOAD
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                      Task Command Center
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Daily Assigned Tasks, Priority Queue, Due Deliverables & Client Milestones
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Pending Tasks:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{myPendingV2TasksList.length} Tasks Due</span>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                    <span>Open Task Command</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* SERVICE 8: SALES & MARKETING (IF PERMITTED) */}
              {hasModuleAccess(sessionUser, 'sales_marketing') && (
                <div
                  onClick={() => onNavigateModule('sales', 'leads')}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <SalesCRMLogo className="h-12 w-12" />
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        LEADS & SALES
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                        Sales & Client CRM
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Inbound Leads, Followups, Proposals & Client Conversion Pipeline
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Leads:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{myAssignedLeads.length} Leads</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-between shadow-xs transition-all">
                      <span>Open Sales CRM</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* C. EMPLOYEE ASSIGNED WORKLOAD & PRIORITY TASKS */}
          <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
                <ListTodo className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>My Assigned Workload & Priority Tasks</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your live operational task queue and clients allotted specifically to your portfolio
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateModule('ops', 'tasks')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Open Task Command Center</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* PANEL 1: Dedicated Task Queue (Shows pending tasks & who assigned them) */}
            <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 ${
              hasModuleAccess(sessionUser, 'sales_marketing') ? 'lg:col-span-6' : 'lg:col-span-7'
            }`}>
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Assigned Task Queue</h4>
                    <p className="text-[10px] text-slate-400">Pending tasks assigned to you by Management & TLs</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full font-mono">
                  {myPendingV2TasksList.length} Pending
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {myPendingV2TasksList.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                    <CheckCircle className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Tasks Completed!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No pending task queue assigned to you right now.</p>
                  </div>
                ) : (
                  myPendingV2TasksList.map((task) => {
                    const isCompleting = completedTaskIdLocal === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/70 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isCompleting ? 'opacity-50 scale-98' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                              task.priority === 'urgent' || (task.priority as any) === 'CRITICAL' 
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                                : task.priority === 'high' || (task.priority as any) === 'HIGH' 
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}>
                              {task.priority || 'Normal'}
                            </span>
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {task.category || 'General'}
                            </span>
                            {task.dueDate && (
                              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span>Due: {task.dueDate}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {task.title}
                          </p>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                              <UserCheck className="h-3 w-3" />
                              <span>Assigned by: <strong>{task.createdByName || 'Master Admin'}</strong></span>
                            </span>
                            {task.clientName && (
                              <span className="truncate">
                                Client: <strong>{task.clientName}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleQuickCompleteTask(task.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                            title="Mark as Completed"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Done</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => onNavigateModule('ops', 'tasks')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>View Full Task Management Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* PANEL 2: My Allotted Clients Portfolio (Isolated to this employee) */}
            <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 ${
              hasModuleAccess(sessionUser, 'sales_marketing') ? 'lg:col-span-6' : 'lg:col-span-5'
            }`}>
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">My Allotted Clients</h4>
                    <p className="text-[10px] text-slate-400">Clients allotted to your account across departments</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full font-mono">
                  {myAllottedClientsCount} Total
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {myAllottedClientsCount === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                    <Building2 className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Clients Allotted Yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Your manager/admin will allot specific clients to your account.</p>
                  </div>
                ) : (
                  myAllottedClientsList.slice(0, 7).map((client) => (
                    <div
                      key={`${client.category}-${client.id}`}
                      onClick={() => onNavigateModule('ops', client.target)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-100 dark:border-slate-750"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {client.name}
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                            {client.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {client.subtitle} {client.phone ? `• ${client.phone}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded-lg shrink-0 flex items-center space-x-1">
                        <span>Open</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => onNavigateModule('ops')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Open Operations Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </section>
      </div>
      )}

      {/* ==============================================================
          3. QUICK INSIGHT BAR (BUSINESS SNAPSHOT - COMPACT)
          ============================================================== */}
      {isMasterOrTL && (
        <section className="space-y-2">
          <div className="flex items-center justify-between pb-0.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Business Snapshot
            </h3>
            <span className="text-[10px] text-slate-400 font-mono font-semibold">Live KPIs & Performance Gauges</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            
            {/* Card 1: Total Leads */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Total Leads</span>
                <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono leading-tight">{totalLeads}</p>
                <div className="flex items-center space-x-0.5 text-[9px] text-emerald-600 font-semibold mt-0.5 truncate">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span>+14.2% MoM</span>
                </div>
              </div>
            </div>

            {/* Card 2: Active Clients */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Active Clients</span>
                <div className="h-6 w-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono leading-tight">{totalClientsCount || totalLeads}</p>
                <div className="flex items-center space-x-0.5 text-[9px] text-indigo-600 font-semibold mt-0.5 truncate">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span>+8.5% Growth</span>
                </div>
              </div>
            </div>

            {/* Card 3: Monthly Revenue */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Monthly Rev.</span>
                <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate leading-tight">
                  ₹{convertedRevenue ? (convertedRevenue / 1000).toFixed(1) + 'k' : '1.4M'}
                </p>
                <div className="flex items-center space-x-0.5 text-[9px] text-emerald-600 font-semibold mt-0.5 truncate">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span>+22.8% Target</span>
                </div>
              </div>
            </div>

            {/* Card 4: Pending Operations */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Pending Ops</span>
                <div className="h-6 w-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                  <Activity className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono leading-tight">{totalPendingOps}</p>
                <div className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                  {pendingGstCount} GST • {pendingItrCount} ITR
                </div>
              </div>
            </div>

            {/* Card 5: Employees Online */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Duty Online</span>
                <div className="h-6 w-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 font-mono leading-tight">{presentTodayCount || activeEmployeesCount}</p>
                <div className="text-[9px] text-emerald-600 font-semibold mt-0.5 truncate">
                  ● Active Shifts
                </div>
              </div>
            </div>

            {/* Card 6: Today's Tasks */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono truncate">Today's Tasks</span>
                <div className="h-6 w-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono leading-tight">{todayDueCount || pendingTasksCount}</p>
                <div className="text-[9px] text-amber-600 font-medium mt-0.5 truncate">
                  Scheduled Today
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ==============================================================
          4. EXECUTIVE DASHBOARD WIDGETS
          ============================================================== */}
      {isMasterOrTL && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Executive Analytics & System Telemetry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time conversion pipeline, operational health, workforce rosters, compliance milestones & cloud resilience
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* WIDGET 1: Sales Performance (Conversion Funnel) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sales Performance</h4>
                    <p className="text-[10px] text-slate-400">Lead Conversion Funnel</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full font-mono">
                  {conversionRate}% Conv.
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {funnelStages.map((stage, idx) => {
                  const maxCount = totalLeads || 1;
                  const ratio = Math.max(8, Math.round((stage.count / maxCount) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>{stage.label}</span>
                        <span className="font-mono">{stage.count} Leads</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${stage.color} transition-all duration-500`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => onNavigateModule('sales', 'leads')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Inspect Full Sales Pipeline</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* WIDGET 2: Operations Health (Pending vs Completed) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Operations Health</h4>
                    <p className="text-[10px] text-slate-400">Processing & Delivery Queue</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full font-mono">
                  {completedOpsCount} Done
                </span>
              </div>

              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Pending Queue</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{totalPendingOps}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Completed / Filed</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{completedOpsCount}</span>
                  </div>
                </div>

                {/* Progress Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>GST Return Compliance</span>
                    <span className="font-bold text-slate-900 dark:text-white">{gstReturns.length ? Math.round(((gstReturns.length - pendingGstCount) / gstReturns.length) * 100) : 100}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${gstReturns.length ? Math.max(10, ((gstReturns.length - pendingGstCount) / gstReturns.length) * 100) : 100}%` }} />
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1">
                    <span>ITR Direct Tax Clearance</span>
                    <span className="font-bold text-slate-900 dark:text-white">{itrClients.length ? Math.round(((itrClients.length - pendingItrCount) / itrClients.length) * 100) : 100}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${itrClients.length ? Math.max(10, ((itrClients.length - pendingItrCount) / itrClients.length) * 100) : 100}%` }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateModule('ops')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Access Operations Control</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* WIDGET 3: Employee Activity (Attendance Summary) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Employee Activity</h4>
                    <p className="text-[10px] text-slate-400">Attendance Roster Today</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full font-mono">
                  {activeEmployeesCount} Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 flex items-center space-x-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Present On Duty</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{presentTodayCount || activeEmployeesCount}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 flex items-center space-x-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Approved Leave</span>
                    <span className="text-base font-black text-blue-700 dark:text-blue-300 font-mono">{leavesTodayCount}</span>
                  </div>
                </div>
              </div>

              {/* Quick Leaderboard Snippet */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Top Performers This Cycle</span>
                <div className="space-y-1.5">
                  {employees.slice(0, 3).map((emp, i) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center">
                          #{i + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        {emp.role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigateModule('hr', 'employees')}
                className="w-full py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Manage Associates & Payroll</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

          {/* BOTTOM ROW: Compliance Calendar & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Compliance Calendar */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Compliance Calendar</h4>
                    <p className="text-[10px] text-slate-400">Statutory Deadlines & Filing Windows</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full font-mono uppercase">
                  Indian Tax Cycle
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/40 dark:bg-amber-955/20 border border-amber-200/60 dark:border-amber-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white font-bold text-xs flex flex-col items-center justify-center leading-none shadow-xs">
                      <span className="text-[9px] uppercase font-semibold">DAY</span>
                      <span className="text-sm font-black">11</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">GSTR-1 Monthly Return Filing</h5>
                      <p className="text-[10px] text-slate-500">Outward supplies summary for regular taxpayers</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Monthly
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-955/20 border border-blue-200/60 dark:border-blue-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex flex-col items-center justify-center leading-none shadow-xs">
                      <span className="text-[9px] uppercase font-semibold">DAY</span>
                      <span className="text-sm font-black">20</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">GSTR-3B Summary Return & Tax Pay</h5>
                      <p className="text-[10px] text-slate-500">Monthly tax liability discharge and ITC reconciliation</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    Critical
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/40 dark:bg-purple-955/20 border border-purple-200/60 dark:border-purple-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-600 text-white font-bold text-xs flex flex-col items-center justify-center leading-none shadow-xs">
                      <span className="text-[9px] uppercase font-semibold">ANNUAL</span>
                      <span className="text-sm font-black">ROC</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">MCA AOC-4 & MGT-7 Annual Filing</h5>
                      <p className="text-[10px] text-slate-500">Company financial statements and Director KYC returns</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    Annual
                  </span>
                </div>
              </div>
            </div>

            {/* System Health & Cloud Architecture Telemetry */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">System & Cloud Resilience</h4>
                    <p className="text-[10px] text-slate-400">Zero Data Loss Telemetry</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full font-mono">
                  99.9% Uptime
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Postgres Sync</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Connected'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active Replica Node</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Recovery Status</span>
                    <Lock className="h-3 w-3 text-blue-500" />
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    Protected
                  </span>
                  <span className="text-[10px] text-blue-500 font-semibold">SHA-256 Checksums</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">OCC Concurrency</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                    Active (vN)
                  </span>
                  <span className="text-[10px] text-slate-400">Multi-user collision guard</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Database Firewall</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                    Enforced
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">20% Drop Protection</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateModule('settings', 'recovery_center')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Open Recovery Center & Snapshots</span>
              </button>
            </div>

          </div>
        </section>
      )}
    </div>
  );
}
