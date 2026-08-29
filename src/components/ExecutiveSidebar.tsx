import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Briefcase,
  Shield,
  Users,
  LayoutDashboard,
  FileSpreadsheet,
  Layers,
  Sparkles,
  PhoneCall,
  FileText,
  DollarSign,
  Calendar,
  Lock,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Building2,
  Receipt,
  FileCheck,
  Award,
  X,
  ShieldCheck,
  ArrowLeft,
  Flame,
  Landmark,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Employee } from '../types';
import { hasModuleAccess } from '../lib/permissions';
import {
  getV2GstClients,
  getV2GstReturnStatuses,
  getV2McaClients,
  getV2McaRocReturns,
  getV2ItrClients,
  getV2TaxAuditClients,
  getV2TrustClients,
  getV2DscClients,
  getV2OtherServiceClients,
  getV2Tasks,
  getV2Trademarks
} from '../lib/v2_db';
import { getISTDateString } from '../lib/db';
import { AiAgentRepository } from '../lib/aiAgent/db';

export type ActiveModule = 'landing' | 'sales' | 'ops' | 'settings' | 'hr';

export type NavigationTarget =
  | 'landing'
  // Sales & Marketing
  | 'sales_dashboard'
  | 'sales_leads'
  | 'sales_followups'
  | 'sales_proposals'
  | 'sales_services'
  | 'sales_templates'
  | 'sales_ai_inbox'
  | 'sales_ai_qualified_leads'
  | 'sales_ai_agent'
  // Operations & Accordions
  | 'ops_dashboard'
  // Task Command Center
  | 'ops_tasks_my'
  | 'ops_tasks_team'
  | 'ops_tasks_assigned'
  | 'ops_tasks_duetoday'
  | 'ops_tasks_overdue'
  | 'ops_tasks_completed'
  // Trademark & Copyright
  | 'ops_tm_dashboard'
  | 'ops_tm_applications'
  | 'ops_tm_objections'
  | 'ops_tm_hearings'
  | 'ops_tm_registrations'
  | 'ops_copyright_registrations'
  // GST Compliance
  | 'ops_gst_dashboard'
  | 'ops_gst_clients'
  | 'ops_gst_monthly'
  | 'ops_gst_gstr1'
  | 'ops_gst_gstr3b'
  | 'ops_gst_quarterly'
  | 'ops_gst_notices'
  | 'ops_gst_reports'
  | 'ops_gst_settings'
  // Income Tax
  | 'ops_itr_dashboard'
  | 'ops_itr_individual'
  | 'ops_itr_business'
  | 'ops_itr_audit'
  // MCA & ROC
  | 'ops_mca_dashboard'
  | 'ops_mca_pvt_ltd'
  | 'ops_mca_llp_clients'
  | 'ops_mca_section8'
  | 'ops_mca_kyc'
  | 'ops_mca_post_inc'
  | 'ops_mca_roc'
  | 'ops_mca_roc_companies'
  | 'ops_mca_roc_llp'
  | 'ops_mca_llp'
  | 'ops_mca_aoc4'
  | 'ops_mca_mgt7'
  | 'ops_mca_inc20a'
  // Trust & NGO
  | 'ops_trust_dashboard'
  | 'ops_trust_12a_80g'
  | 'ops_trust_12a'
  | 'ops_trust_80g'
  | 'ops_trust_10b'
  | 'ops_trust_10bb'
  // DSC Management
  | 'ops_dsc_active'
  | 'ops_dsc_renewal'
  | 'ops_dsc_expired'
  // Registration & License
  | 'ops_license_fssai'
  | 'ops_license_msme'
  | 'ops_license_iec'
  | 'ops_license_trade'
  | 'ops_license_labour'
  // Client Master
  | 'ops_clients_master'
  | 'ops_clients_allocation'
  | 'ops_clients_mapping'
  // Legacy aliases
  | 'ops_gst'
  | 'ops_itr'
  | 'ops_mca'
  | 'ops_tasks'
  | 'ops_clients'
  | 'ops_trademark'
  // Settings & Control
  | 'settings_recovery'
  | 'settings_ai'
  | 'settings_whatsapp'
  | 'settings_audit'
  | 'settings_security'
  | 'settings_backup'
  // HR & Workforce
  | 'hr_employees'
  | 'hr_payroll'
  | 'hr_attendance'
  | 'hr_leaves'
  | 'hr_offer_letter'
  // TL Specific
  | 'tl_my_attendance';

export interface ModuleSidebarItem {
  id: NavigationTarget;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
}

export interface ModuleConfig {
  id: ActiveModule;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: {
    text: string;
    border: string;
    bgBadge: string;
    bgAccent: string;
    activeTabClass: string;
  };
  items: ModuleSidebarItem[];
}

interface ExecutiveSidebarProps {
  activeModule: ActiveModule;
  currentTab: NavigationTarget;
  onSelectTab: (tab: NavigationTarget) => void;
  onBackToLanding: () => void;
  sessionUser: Employee;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  leadCount?: number;
  followupCount?: number;
  proposalCount?: number;
  opsPendingCount?: number;
  employeeCount?: number;
}

export default function ExecutiveSidebar({
  activeModule,
  currentTab,
  onSelectTab,
  onBackToLanding,
  sessionUser,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  leadCount,
  followupCount,
  proposalCount,
  opsPendingCount,
  employeeCount
}: ExecutiveSidebarProps) {
  const isTeamLeader = sessionUser.role === 'team_leader';

  // Accordion open states for Operations Module
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    tasks: true,
    trademark: true,
    gst: false,
    itr: false,
    mca: false,
    trust: false,
    dsc: false,
    license: false,
    clients: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Live Operations Counts computation
  const opsCounts = useMemo(() => {
    try {
      const gstClients = getV2GstClients();
      const gstReturns = getV2GstReturnStatuses();
      const mcaClients = getV2McaClients();
      const mcaReturns = getV2McaRocReturns();
      const itrClients = getV2ItrClients();
      const taxAuditClients = getV2TaxAuditClients();
      const trustClients = getV2TrustClients();
      const dscClients = getV2DscClients();
      const otherClients = getV2OtherServiceClients();
      const tasks = getV2Tasks();
      const trademarks = getV2Trademarks();
      const todayStr = getISTDateString();

      const myTasks = tasks.filter(t => t.assignedTo === sessionUser.id && t.status === 'pending').length;
      const teamTasks = tasks.filter(t => t.status === 'pending').length;
      const dueTodayTasks = tasks.filter(t => t.status === 'pending' && t.dueDate === todayStr).length;
      const overdueTasks = tasks.filter(t => t.status === 'pending' && t.dueDate < todayStr).length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;

      const tmTotal = trademarks.length;
      const tmApplied = trademarks.filter(t => t.stage === 'Applied').length;
      const tmObjected = trademarks.filter(t => t.stage === 'Objected').length;
      const tmHearings = trademarks.filter(t => t.stage === 'Hearing').length;
      const tmApproved = trademarks.filter(t => t.stage === 'Approved').length;

      const gstr1Pending = gstReturns.filter(r => r.gstr1 !== 'FILED').length;
      const gstr3bPending = gstReturns.filter(r => r.gstr3b !== 'FILED').length;
      const gstQuarterly = gstClients.filter(c => c.returnsMode === 'QUARTERLY').length;

      const itrIndividual = itrClients.filter(c => c.taxpayerType === 'INDIVIDUAL').length;
      const itrBusiness = itrClients.filter(c => c.taxpayerType === 'PRIVATE LIMITED' || c.taxpayerType === 'LLP').length;
      const taxAudits = taxAuditClients.filter(a => a.status !== 'FILED').length;
      const scrutinyCases = itrClients.filter(c => c.typeOfItr === 'ITR-7' || c.isAuditApplicable).length;

      const mcaActiveCompanies = mcaClients.length;
      const mcaPvtLtd = mcaClients.filter(c => c.clientType === 'PRIVATE LIMITED COMPANY').length;
      const mcaLlp = mcaClients.filter(c => c.clientType === 'LLP').length;
      const mcaSection8 = mcaClients.filter(c => c.clientType === 'SECTION 8 NGO').length;
      const rocPending = mcaReturns.filter(r => r.aoc4Status !== 'FILED' || r.mgt7Status !== 'FILED' || r.form11Status !== 'FILED' || r.form8Status !== 'FILED').length;
      const llpCount = mcaClients.filter(c => c.clientType === 'LLP').length;
      const dinKycPending = mcaClients.flatMap(c => c.directors || []).filter(d => d.dinKycStatus !== 'Approved').length;
      const aoc4Pending = mcaReturns.filter(r => r.aoc4Status !== 'FILED').length;
      const mgt7Pending = mcaReturns.filter(r => r.mgt7Status !== 'FILED').length;
      const inc20aPending = mcaClients.filter(c => !c.isInc20aFiled).length;
      const postIncPending = mcaClients.filter(c => (c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'SECTION 8 NGO') && (!c.isInc20aFiled || !c.isAdt1Filed)).length;
      
      const rocCompaniesPending = mcaReturns.filter(r => {
        const c = mcaClients.find(cl => cl.id === r.mcaClientId);
        return c && c.clientType !== 'LLP' && (r.aoc4Status !== 'FILED' || r.mgt7Status !== 'FILED');
      }).length;
      const rocLlpPending = mcaReturns.filter(r => {
        const c = mcaClients.find(cl => cl.id === r.mcaClientId);
        return c && c.clientType === 'LLP' && (r.form11Status !== 'FILED' || r.form8Status !== 'FILED');
      }).length;

      const ngoClients = trustClients.length;
      const count12A = trustClients.filter(t => t.has12A80G).length;
      const form10bPending = taxAuditClients.filter(a => a.auditForm === '10B/10BB' && a.status !== 'FILED').length;

      const now = new Date();
      const dscActive = dscClients.filter(d => new Date(d.expiryDate) >= now).length;
      const dscRenewalDue = dscClients.filter(d => {
        const diff = (new Date(d.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 30;
      }).length;
      const dscExpired = dscClients.filter(d => new Date(d.expiryDate) < now).length;

      const fssaiCount = otherClients.filter(o => o.serviceAvailed.toLowerCase().includes('fssai')).length;
      const msmeCount = otherClients.filter(o => o.serviceAvailed.toLowerCase().includes('msme') || o.serviceAvailed.toLowerCase().includes('udyam')).length;
      const iecCount = otherClients.filter(o => o.serviceAvailed.toLowerCase().includes('iec')).length;
      const tradeLicenseCount = otherClients.filter(o => o.serviceAvailed.toLowerCase().includes('trade')).length;
      const labourLicenseCount = otherClients.filter(o => o.serviceAvailed.toLowerCase().includes('labour')).length;

      const totalClients = gstClients.length + mcaClients.length + itrClients.length + trustClients.length + dscClients.length + otherClients.length;
      const unmappedClients = gstClients.filter(c => !c.assignedEmployeeId).length + mcaClients.filter(c => !c.assignedEmployeeId).length + itrClients.filter(c => !c.assignedEmployeeId).length;

      return {
        myTasks, teamTasks, assignedTasks: tasks.length, dueTodayTasks, overdueTasks, completedTasks,
        tmTotal, tmApplied, tmObjected, tmHearings, tmApproved,
        gstClients: gstClients.length, gstr1Pending, gstr3bPending, gstQuarterly, gstNotices: 2,
        itrIndividual, itrBusiness, taxAudits, scrutinyCases,
        mcaActiveCompanies, mcaPvtLtd, mcaLlp, mcaSection8, rocPending, rocCompaniesPending, rocLlpPending, llpCount, dinKycPending, aoc4Pending, mgt7Pending, inc20aPending, postIncPending,
        ngoClients, count12A, count80G: count12A, form10bPending,
        dscActive, dscRenewalDue, dscExpired,
        fssaiCount, msmeCount, iecCount, tradeLicenseCount, labourLicenseCount,
        totalClients, unmappedClients
      };
    } catch (e) {
      return {
        myTasks: 0, teamTasks: 0, assignedTasks: 0, dueTodayTasks: 0, overdueTasks: 0, completedTasks: 0,
        tmTotal: 0, tmApplied: 0, tmObjected: 0, tmHearings: 0, tmApproved: 0,
        gstClients: 0, gstr1Pending: 0, gstr3bPending: 0, gstQuarterly: 0, gstNotices: 0,
        itrIndividual: 0, itrBusiness: 0, taxAudits: 0, scrutinyCases: 0,
        mcaActiveCompanies: 0, mcaPvtLtd: 0, mcaLlp: 0, mcaSection8: 0, rocPending: 0, rocCompaniesPending: 0, rocLlpPending: 0, llpCount: 0, dinKycPending: 0, aoc4Pending: 0, mgt7Pending: 0, inc20aPending: 0, postIncPending: 0,
        ngoClients: 0, count12A: 0, count80G: 0, form10bPending: 0,
        dscActive: 0, dscRenewalDue: 0, dscExpired: 0,
        fssaiCount: 0, msmeCount: 0, iecCount: 0, tradeLicenseCount: 0, labourLicenseCount: 0,
        totalClients: 0, unmappedClients: 0
      };
    }
  }, [sessionUser.id]);

  // Standard Module Configurations
  const salesModuleConfig: ModuleConfig = {
    id: 'sales',
    title: 'SALES & MARKETING',
    shortTitle: 'Sales Desk',
    subtitle: 'Pipeline & Client Acquisition',
    icon: TrendingUp,
    theme: {
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      bgBadge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      bgAccent: 'bg-emerald-500/10',
      activeTabClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
    },
    items: [
      { id: 'sales_dashboard', label: 'Sales Dashboard', icon: LayoutDashboard },
      { id: 'sales_leads', label: 'Leads Pipeline', icon: TrendingUp, badge: leadCount },
      { id: 'sales_followups', label: 'Pending Followups', icon: PhoneCall, badge: followupCount },
      { id: 'sales_proposals', label: 'Proposals & Quotes', icon: FileText, badge: proposalCount },
      { id: 'sales_services', label: 'Service Catalogue', icon: Award },
      ...(!isTeamLeader ? [{ id: 'sales_templates' as const, label: 'Proposal Designer', icon: FileText }] : []),
      { id: 'sales_ai_inbox', label: 'AI Sales Inbox', icon: Sparkles, highlight: true },
      { id: 'sales_ai_qualified_leads', label: 'AI Qualified Leads', icon: UserCheck, badge: AiAgentRepository.getQualifiedLeads().length, highlight: true }
    ]
  };

  const settingsModuleConfig: ModuleConfig = {
    id: 'settings',
    title: 'SETTINGS & CONTROL',
    shortTitle: 'Settings & Security',
    subtitle: 'Backups, OCC & Gateway',
    icon: Shield,
    theme: {
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      bgBadge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      bgAccent: 'bg-blue-500/10',
      activeTabClass: 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
    },
    items: [
      { id: 'settings_ai', label: 'AI Sales Agent', icon: ShieldCheck, highlight: true },
      { id: 'settings_whatsapp', label: 'WhatsApp Settings', icon: PhoneCall },
      { id: 'settings_recovery', label: 'Recovery Center', icon: Lock },
      { id: 'settings_audit', label: 'Audit Logs', icon: Database },
      { id: 'settings_security', label: 'Security Telemetry', icon: Shield },
      { id: 'settings_backup', label: 'Data Import Export', icon: FileSpreadsheet }
    ]
  };

  const hrModuleConfig: ModuleConfig = {
    id: 'hr',
    title: 'HR & WORKFORCE',
    shortTitle: 'Workforce Hub',
    subtitle: 'Roster, Payroll & Leaves',
    icon: Users,
    theme: {
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      bgBadge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      bgAccent: 'bg-purple-500/10',
      activeTabClass: 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
    },
    items: [
      { id: 'hr_employees', label: 'Employees & Roster', icon: Users, badge: employeeCount },
      { id: 'hr_payroll', label: 'Payroll & Approvals', icon: DollarSign },
      { id: 'hr_attendance', label: 'Attendance Audit', icon: Calendar },
      { id: 'hr_leaves', label: 'Leave Requests', icon: UserCheck },
      ...(!isTeamLeader ? [{ id: 'hr_offer_letter' as const, label: 'Offer Letter Template', icon: FileText }] : []),
      ...(isTeamLeader ? [{ id: 'tl_my_attendance' as const, label: 'My Punch & Calendar', icon: Calendar }] : [])
    ]
  };

  const isOps = activeModule === 'ops';

  // Helper for item click
  const handleItemClick = (target: NavigationTarget) => {
    onSelectTab(target);
    onCloseMobile();
  };

  // Helper for rendering an accordion sub-item
  const renderOpsSubItem = (
    id: NavigationTarget,
    label: string,
    badge?: number,
    highlight?: 'red' | 'amber' | 'green' | 'default'
  ) => {
    const isActive = currentTab === id;
    let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    if (highlight === 'red') {
      badgeColor = 'bg-rose-500 text-white animate-pulse';
    } else if (highlight === 'amber') {
      badgeColor = 'bg-amber-500 text-white font-bold';
    } else if (highlight === 'green') {
      badgeColor = 'bg-emerald-600 text-white';
    }

    return (
      <button
        key={id}
        onClick={() => handleItemClick(id)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all cursor-pointer text-left ${
          isActive
            ? 'bg-emerald-600 text-white font-bold shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span className="truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            isActive ? 'bg-white/20 text-white' : badgeColor
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 select-none">
      {/* 1. Top Navigation: Back to Command Center & Module Header */}
      <div className="p-3 border-b border-slate-150 dark:border-slate-800 space-y-2 shrink-0">
        <button
          onClick={() => {
            onBackToLanding();
            onCloseMobile();
          }}
          className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
          title="Return to Executive Overview"
        >
          <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/60 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="text-left truncate">
              <span className="text-[11px] block leading-tight">Overview</span>
              <span className="text-[9.5px] text-slate-400 font-normal">Command Center</span>
            </div>
          )}
        </button>

        {/* Active Module Header Banner */}
        <div className={`p-2.5 rounded-2xl ${isOps ? 'bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'} flex items-center justify-between`}>
          <div className="flex items-center space-x-2.5 truncate">
            <div className={`h-7 w-7 rounded-xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-center shrink-0 ${isOps ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {isOps ? <Briefcase className="h-4 w-4" /> : activeModule === 'sales' ? <TrendingUp className="h-4 w-4" /> : activeModule === 'settings' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            {!isCollapsed && (
              <div className="truncate text-left leading-tight">
                <span className={`text-[10px] font-black uppercase tracking-wider block font-mono ${isOps ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {isOps ? 'OPERATIONS' : activeModule === 'sales' ? 'SALES DESK' : activeModule === 'settings' ? 'SETTINGS' : 'HR HUB'}
                </span>
                <span className="text-[9px] text-slate-400 truncate block">
                  {isOps ? 'Single Primary Nav' : 'Module Navigation'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. ACCORDION NAVIGATION SYSTEM (FOR OPERATIONS) */}
      {isOps ? (
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {/* Main Mission Control Overview Link */}
          <button
            onClick={() => handleItemClick('ops_dashboard')}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer font-bold ${
              currentTab === 'ops_dashboard'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LayoutDashboard className="h-4 w-4 text-emerald-500" />
              {!isCollapsed && <span>Mission Control</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                LIVE
              </span>
            )}
          </button>

          {/* ACCORDION 1: TASK COMMAND CENTER (ALWAYS ACCESSIBLE TO ALL EMPLOYEES) */}
          <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
            <button
              onClick={() => toggleAccordion('tasks')}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                {!isCollapsed && <span>TASK COMMAND CENTER</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.tasks ? 'rotate-180' : ''}`} />
              )}
            </button>

            {(!isCollapsed && openAccordions.tasks) && (
              <div className="space-y-0.5 pl-2 border-l border-amber-500/20 ml-2">
                {renderOpsSubItem('ops_tasks_my', 'My Tasks', opsCounts.myTasks)}
                {(sessionUser.role === 'admin' || sessionUser.role === 'team_leader') && renderOpsSubItem('ops_tasks_team', 'Team Tasks', opsCounts.teamTasks)}
                {renderOpsSubItem('ops_tasks_assigned', 'Assigned Tasks', opsCounts.assignedTasks)}
                {renderOpsSubItem('ops_tasks_duetoday', 'Due Today', opsCounts.dueTodayTasks, 'amber')}
                {renderOpsSubItem('ops_tasks_overdue', 'Overdue Tasks', opsCounts.overdueTasks, 'red')}
                {renderOpsSubItem('ops_tasks_completed', 'Completed Tasks', opsCounts.completedTasks, 'green')}
              </div>
            )}
          </div>

          {/* ACCORDION 2: TRADEMARK & COPYRIGHT */}
          {hasModuleAccess(sessionUser, 'trademark') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('trademark')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-indigo-500" />
                  {!isCollapsed && <span>TRADEMARK & COPYRIGHT</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.trademark ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.trademark) && (
                <div className="space-y-0.5 pl-2 border-l border-indigo-500/20 ml-2">
                  {renderOpsSubItem('ops_tm_dashboard', 'Trademark Dashboard')}
                  {renderOpsSubItem('ops_tm_applications', 'Trademark Applications', opsCounts.tmTotal)}
                  {renderOpsSubItem('ops_tm_objections', 'Trademark Objection Cases', opsCounts.tmObjected, opsCounts.tmObjected > 0 ? 'red' : 'default')}
                  {renderOpsSubItem('ops_tm_hearings', 'Trademark Hearings', opsCounts.tmHearings, opsCounts.tmHearings > 0 ? 'amber' : 'default')}
                  {renderOpsSubItem('ops_tm_registrations', 'Trademark Registrations', opsCounts.tmApproved, 'green')}
                  {renderOpsSubItem('ops_copyright_registrations', 'Copyright Registrations')}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 3: GST COMPLIANCE */}
          {hasModuleAccess(sessionUser, 'gst') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('gst')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  {!isCollapsed && <span>GST COMPLIANCE</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.gst ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.gst) && (
                <div className="space-y-0.5 pl-2 border-l border-emerald-500/20 ml-2">
                  {renderOpsSubItem('ops_gst_dashboard', 'GST Dashboard')}
                  {renderOpsSubItem('ops_gst_clients', 'Clients Portfolio', opsCounts.gstClients)}
                  {renderOpsSubItem('ops_gst_monthly', 'Monthly Returns', opsCounts.gstr1Pending + opsCounts.gstr3bPending, (opsCounts.gstr1Pending + opsCounts.gstr3bPending) > 0 ? 'amber' : 'default')}
                  {renderOpsSubItem('ops_gst_quarterly', 'Quarterly Returns', opsCounts.gstQuarterly)}
                  {renderOpsSubItem('ops_gst_reports', 'GST Reports')}
                  {renderOpsSubItem('ops_gst_settings', 'GST Chrome Extension')}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 4: INCOME TAX */}
          {hasModuleAccess(sessionUser, 'income_tax') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('itr')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  {!isCollapsed && <span>INCOME TAX</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.itr ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.itr) && (
                <div className="space-y-0.5 pl-2 border-l border-blue-500/20 ml-2">
                  {renderOpsSubItem('ops_itr_dashboard', 'ITR Dashboard')}
                  {renderOpsSubItem('ops_itr_individual', 'Individual ITR', opsCounts.itrIndividual)}
                  {renderOpsSubItem('ops_itr_business', 'Business ITR', opsCounts.itrBusiness)}
                  {renderOpsSubItem('ops_itr_audit', 'Tax Audit', opsCounts.taxAudits)}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 5: MCA & ROC */}
          {hasModuleAccess(sessionUser, 'mca_roc') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('mca')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-500" />
                  {!isCollapsed && <span>MCA & ROC</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.mca ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.mca) && (
                <div className="space-y-0.5 pl-2 border-l border-purple-500/20 ml-2">
                  {renderOpsSubItem('ops_mca_dashboard', 'Dashboard', opsCounts.mcaActiveCompanies)}
                  {renderOpsSubItem('ops_mca_pvt_ltd', 'Private Limited Co.', opsCounts.mcaPvtLtd)}
                  {renderOpsSubItem('ops_mca_llp_clients', 'LLP Clients', opsCounts.mcaLlp)}
                  {renderOpsSubItem('ops_mca_section8', 'Section 8 Co.', opsCounts.mcaSection8)}
                  {renderOpsSubItem('ops_mca_kyc', 'DIN KYC Panel', opsCounts.dinKycPending, opsCounts.dinKycPending > 0 ? 'amber' : 'default')}
                  {renderOpsSubItem('ops_mca_post_inc', 'Post Incorporation Compliances', opsCounts.postIncPending, opsCounts.postIncPending > 0 ? 'red' : 'default')}
                  
                  {/* ROC Filing Group with 2 sub-menus: Companies ROC & LLP Compliances */}
                  <div className="pt-1">
                    <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      ROC Filing
                    </div>
                    <div className="space-y-0.5 pl-1.5 border-l border-purple-500/30 ml-1 mt-0.5">
                      {renderOpsSubItem('ops_mca_roc_companies', 'Companies ROC', opsCounts.rocCompaniesPending, opsCounts.rocCompaniesPending > 0 ? 'amber' : 'default')}
                      {renderOpsSubItem('ops_mca_roc_llp', 'LLP Compliances', opsCounts.rocLlpPending, opsCounts.rocLlpPending > 0 ? 'amber' : 'default')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 6: TRUST & NGO */}
          {hasModuleAccess(sessionUser, 'trust_ngo') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('trust')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-teal-500" />
                  {!isCollapsed && <span>TRUST & NGO</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.trust ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.trust) && (
                <div className="space-y-0.5 pl-2 border-l border-teal-500/20 ml-2">
                  {renderOpsSubItem('ops_trust_dashboard', 'NGO Dashboard', opsCounts.ngoClients)}
                  {renderOpsSubItem('ops_trust_12a_80g', '12A & 80G', opsCounts.count12A)}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 7: DSC MANAGEMENT */}
          {hasModuleAccess(sessionUser, 'dsc') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('dsc')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                  {!isCollapsed && <span>DSC MANAGEMENT</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.dsc ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.dsc) && (
                <div className="space-y-0.5 pl-2 border-l border-amber-500/20 ml-2">
                  {renderOpsSubItem('ops_dsc_active', 'Active DSC', opsCounts.dscActive)}
                  {renderOpsSubItem('ops_dsc_renewal', 'Renewal Due', opsCounts.dscRenewalDue, opsCounts.dscRenewalDue > 0 ? 'amber' : 'default')}
                  {renderOpsSubItem('ops_dsc_expired', 'Expired DSC', opsCounts.dscExpired, opsCounts.dscExpired > 0 ? 'red' : 'default')}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 8: REGISTRATION & LICENSE */}
          {hasModuleAccess(sessionUser, 'registration_license') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('license')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-cyan-500" />
                  {!isCollapsed && <span>REGISTRATION & LICENSE</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.license ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.license) && (
                <div className="space-y-0.5 pl-2 border-l border-cyan-500/20 ml-2">
                  {renderOpsSubItem('ops_license_fssai', 'FSSAI', opsCounts.fssaiCount)}
                  {renderOpsSubItem('ops_license_msme', 'MSME', opsCounts.msmeCount)}
                  {renderOpsSubItem('ops_license_iec', 'IEC', opsCounts.iecCount)}
                  {renderOpsSubItem('ops_license_trade', 'Trade License', opsCounts.tradeLicenseCount)}
                  {renderOpsSubItem('ops_license_labour', 'Labour License', opsCounts.labourLicenseCount)}
                </div>
              )}
            </div>
          )}

          {/* ACCORDION 9: CLIENT MASTER */}
          {hasModuleAccess(sessionUser, 'client_master') && (
            <div className="space-y-0.5 border-t border-slate-150 dark:border-slate-800 pt-1.5">
              <button
                onClick={() => toggleAccordion('clients')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  {!isCollapsed && <span>CLIENT MASTER</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${openAccordions.clients ? 'rotate-180' : ''}`} />
                )}
              </button>

              {(!isCollapsed && openAccordions.clients) && (
                <div className="space-y-0.5 pl-2 border-l border-indigo-500/20 ml-2">
                  {renderOpsSubItem('ops_clients_master', 'Client Master', opsCounts.totalClients)}
                  {renderOpsSubItem('ops_clients_allocation', 'Allocation Desk', opsCounts.unmappedClients)}
                  {renderOpsSubItem('ops_clients_mapping', 'Service Mapping')}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD MODULES (SALES, SETTINGS, HR) */
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {((activeModule === 'sales' ? salesModuleConfig : activeModule === 'settings' ? settingsModuleConfig : hrModuleConfig).items).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : (item.highlight ? 'text-indigo-500 animate-pulse' : 'text-slate-400')}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 hidden md:flex items-center justify-between shrink-0">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[11px]">Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block transition-all duration-300 shrink-0 ${isCollapsed ? 'w-18' : 'w-64'}`}>
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 h-full bg-white dark:bg-slate-900 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
