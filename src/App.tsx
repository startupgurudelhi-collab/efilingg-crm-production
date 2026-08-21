/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  initializeDB,
  getCurrentSession,
  clearSession,
  createLead,
  getEmployeeById,
  getEmployees,
  getLeads,
  getFollowUps,
  getProposals
} from './lib/db';
import { getV2Tasks } from './lib/v2_db';
import { Employee, Lead, Proposal } from './types';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import OperationManagementDashboard from './components/v2/OperationManagementDashboard';
import MasterExecutiveLanding from './components/MasterExecutiveLanding';
import ExecutiveSidebar, { NavigationTarget } from './components/ExecutiveSidebar';
import LeadModal from './components/LeadModal';
import ProposalBuilder from './components/ProposalBuilder';
import ProposalPdf from './components/ProposalPdf';
import NotificationBar from './components/NotificationBar';
import WhatsAppNotificationBar from './components/WhatsAppNotificationBar';
import WhatsAppIncomingMessagePopup from './components/WhatsAppIncomingMessagePopup';
import TeamConnectWidget from './components/TeamConnectWidget';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { FeatureFlagProvider } from './lib/featureFlags';
import { 
  LogOut, User, Sun, Moon, Sparkles, Building2, Shield, Eye, Database, 
  ListTodo, FileText, Lightbulb, CalendarDays, CheckCircle2, X, Menu, 
  ChevronRight, ArrowLeft, Home, Layers, TrendingUp, DollarSign
} from 'lucide-react';
import EFilinggLogo from './components/EFilinggLogo';
import ConflictResolutionModal from './components/ConflictResolutionModal';
import { subscribeToConcurrencyConflicts } from './lib/concurrencyControl';
import { ConcurrencyConflict } from './types';

function AppContent() {
  const [sessionUser, setSessionUser] = useState<Employee | null>(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [showGoodPracticeModal, setShowGoodPracticeModal] = useState(false);
  
  // Executive Navigation State for Master Admin & Team Leader
  const [adminNavTarget, setAdminNavTarget] = useState<NavigationTarget>('landing');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Concurrency Conflict Modal State
  const [activeConflict, setActiveConflict] = useState<ConcurrencyConflict<any> | null>(null);

  // Overlay portaling states
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [activeProposalPreview, setActiveProposalPreview] = useState<Proposal | null>(null);

  const { theme, toggleTheme } = useTheme();

  // Supabase Live Sync states
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'connected' | 'error' | 'no_table' | 'idle'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // 1. Initial Local Setup and Supabase Sync pull ONCE on mount
  useEffect(() => {
    let active = true;
    const runSyncAndInit = async () => {
      // Check if this is a fresh device before we initialize standard seed databases
      const isFreshDevice = localStorage.getItem('efilingg_crm_employees') === null;
      if (isFreshDevice) {
        localStorage.setItem('efilingg_crm_is_fresh_load', 'true');
      }

      // 1. Prioritize PostgreSQL initialization first so it becomes the primary source of truth
      try {
        const { initializePostgresSync, subscribeToSync } = await import('./lib/postgresSync');
        if (!active) return;
        
        // Subscribe to live meta status updates
        subscribeToSync((meta) => {
          if (!active) return;
          setSyncStatus(meta.status);
          setSyncError(meta.errorMessage);
        });

        // Initialize and hydrate the memory cache with remote Postgres values BEFORE checking session/initializing
        await initializePostgresSync();
      } catch (err) {
        console.warn('PostgreSQL sync initialization deferred/failed:', err);
        // Fallback: Initialize with local defaults immediately in case of networking issues
        initializeDB();
      }

      if (!active) return;
      // 2. Finalize local definitions with fallback seeds on uninitialized keys, then load session user
      initializeDB();
      setSessionUser(getCurrentSession());
      handleRefreshAllData();
    };

    runSyncAndInit();

    // Background periodic poll every 30 seconds to pull and merge live teammate additions
    const interval = setInterval(async () => {
      try {
        const { pullFromPostgres } = await import('./lib/postgresSync');
        const updated = await pullFromPostgres();
        if (updated && active) {
          handleRefreshAllData();
        }
      } catch (e) {
        console.warn('Background periodic poll failed:', e);
      }
    }, 30000);

    // Concurrency conflict subscription
    const unsubscribeConflicts = subscribeToConcurrencyConflicts((conflict) => {
      setActiveConflict(conflict);
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeConflicts();
    };
  }, []);

  // 2. Local reactive refresh when triggerRefresh changes (No heavy/repetitive Supabase pulls!)
  useEffect(() => {
    setSessionUser(getCurrentSession());
  }, [triggerRefresh]);

  // Trigger Good Practice Pop up modal on login/refresh
  useEffect(() => {
    if (sessionUser && (sessionUser.role === 'employee' || sessionUser.role === 'team_leader')) {
      const key = `good_practice_shown_${sessionUser.id}`;
      const shown = sessionStorage.getItem(key);
      if (!shown) {
        setShowGoodPracticeModal(true);
        sessionStorage.setItem(key, 'true');
      }
    } else {
      setShowGoodPracticeModal(false);
    }
  }, [sessionUser]);

  const handleRefreshAllData = () => {
    setTriggerRefresh((prev) => prev + 1);
  };

  const handleVerifyVpsConnection = async () => {
    try {
      const { detectPostgresStatus, pullFromPostgres } = await import('./lib/postgresSync');
      await detectPostgresStatus();
      await pullFromPostgres();
      handleRefreshAllData();
    } catch (e: any) {
      console.warn('Manual VPS sync check failed:', e);
    }
  };

  const handleLoginSuccess = (user: Employee) => {
    setSessionUser(user);
    handleRefreshAllData();
  };

  const handleLogout = () => {
    clearSession();
    setSessionUser(null);
    handleRefreshAllData();
  };

  const handleCreateLeadSubmit = async (leadData: Omit<Lead, 'id' | 'createdBy'>) => {
    if (!sessionUser) return;
    
    try {
      createLead(
        {
          ...leadData,
          createdBy: sessionUser.id
        },
        sessionUser.id
      );

      setIsCreatingLead(false);
      handleRefreshAllData();

      try {
        const { waitForPendingPushes } = await import('./lib/postgresSync');
        await waitForPendingPushes();
      } catch (e) {
        console.warn('Failed to wait for pending pushes:', e);
      }

      alert('Lead successfully registered and assigned.');
    } catch (error: any) {
      alert(error.message || 'Failed to create lead.');
      // Automatically return to main dashboard by closing the modal
      setIsCreatingLead(false);
      setActiveLeadId(null);
    }
  };

  // Navigation helpers for Executive Dashboard
  const getModuleForTarget = (target: NavigationTarget): 'landing' | 'sales' | 'ops' | 'settings' | 'hr' => {
    if (target.startsWith('sales_')) return 'sales';
    if (target.startsWith('ops_')) return 'ops';
    if (target.startsWith('settings_')) return 'settings';
    if (target.startsWith('hr_') || target.startsWith('tl_')) return 'hr';
    return 'landing';
  };

  const getAdminDashboardTab = (target: NavigationTarget): string => {
    switch (target) {
      case 'sales_dashboard': return 'analytics';
      case 'sales_leads': return 'leads';
      case 'sales_followups': return 'leads';
      case 'sales_proposals': return 'proposals';
      case 'sales_ai_inbox': return 'ai_sales_inbox';
      case 'sales_ai_agent': return 'ai_sales_agent';
      case 'settings_recovery': return 'recovery_center';
      case 'settings_ai': return 'ai_sales_agent';
      case 'settings_whatsapp': return 'whatsapp_webhook';
      case 'settings_audit': return 'logs';
      case 'settings_security': return 'logs';
      case 'settings_backup': return 'backup';
      case 'hr_employees': return 'employees';
      case 'hr_payroll': return 'payroll';
      case 'hr_attendance': return 'payroll';
      case 'hr_leaves': return 'payroll';
      case 'hr_services': return 'services';
      case 'hr_templates': return 'templates';
      case 'tl_my_attendance': return 'my_attendance';
      default: return 'analytics';
    }
  };

  const getAdminDashboardPayrollSubTab = (target: NavigationTarget): 'calc' | 'history' | 'attendance' | 'leaves' | undefined => {
    if (target === 'hr_attendance') return 'attendance';
    if (target === 'hr_leaves') return 'leaves';
    if (target === 'hr_payroll') return 'calc';
    return undefined;
  };

  const getAdminDashboardCategoryFilter = (target: NavigationTarget): 'ALL' | 'INTRESTED' | 'FOLLOWUP PENDING' | 'FINAL DISPOSED' | 'CONVERTED' | undefined => {
    if (target === 'sales_followups') return 'FOLLOWUP PENDING';
    if (target === 'sales_leads') return 'ALL';
    return undefined;
  };

  const getOpsDashboardSegment = (target: NavigationTarget): 'dashboard' | 'masters' | 'gst' | 'mca' | 'itr' | 'dockets' | 'mapping' => {
    switch (target) {
      case 'ops_dashboard': return 'dashboard';
      case 'ops_gst': return 'gst';
      case 'ops_itr': return 'itr';
      case 'ops_mca': return 'mca';
      case 'ops_tasks': return 'dockets';
      case 'ops_clients': return 'mapping';
      default: return 'dashboard';
    }
  };

  const getBreadcrumbs = (target: NavigationTarget) => {
    switch (target) {
      case 'sales_dashboard': return { group: 'Sales & Marketing', title: 'Sales Performance & Analytics' };
      case 'sales_leads': return { group: 'Sales & Marketing', title: 'Leads Pipeline Management' };
      case 'sales_followups': return { group: 'Sales & Marketing', title: 'Pending Followups & Client Calls' };
      case 'sales_proposals': return { group: 'Sales & Marketing', title: 'Proposals, Quotations & Estimates' };
      case 'sales_ai_inbox': return { group: 'Sales & Marketing', title: 'AI Sales Inbox & Automated Chats' };
      case 'sales_ai_agent': return { group: 'Sales & Marketing', title: 'AI Sales Agent Telemetry' };
      
      // Operations & Accordion Navigation Targets
      case 'ops_dashboard': return { group: 'Operation Management', title: 'Operations Command Center (Mission Control)' };
      case 'ops_tasks_my': return { group: 'Operation Management', title: 'Task Command Center · My Assigned Tasks' };
      case 'ops_tasks_team': return { group: 'Operation Management', title: 'Task Command Center · Team Queue' };
      case 'ops_tasks_assigned': return { group: 'Operation Management', title: 'Task Command Center · Assigned Tasks' };
      case 'ops_tasks_duetoday': return { group: 'Operation Management', title: 'Task Command Center · Due Today' };
      case 'ops_tasks_overdue': return { group: 'Operation Management', title: 'Task Command Center · Overdue Tasks' };
      case 'ops_tasks_completed': return { group: 'Operation Management', title: 'Task Command Center · Completed Archive' };
      
      case 'ops_gst_dashboard': return { group: 'Operation Management', title: 'GST Compliance · Filing Dashboard' };
      case 'ops_gst_clients': return { group: 'Operation Management', title: 'GST Compliance · Client Master' };
      case 'ops_gst_gstr1': return { group: 'Operation Management', title: 'GST Compliance · GSTR-1 Monthly' };
      case 'ops_gst_gstr3b': return { group: 'Operation Management', title: 'GST Compliance · GSTR-3B Monthly' };
      case 'ops_gst_quarterly': return { group: 'Operation Management', title: 'GST Compliance · Quarterly Returns' };
      case 'ops_gst_notices': return { group: 'Operation Management', title: 'GST Compliance · Notices & Scrutiny' };
      case 'ops_gst_reports': return { group: 'Operation Management', title: 'GST Compliance · Reports & MIS' };

      case 'ops_itr_dashboard': return { group: 'Operation Management', title: 'Income Tax · ITR Clearance Dashboard' };
      case 'ops_itr_individual': return { group: 'Operation Management', title: 'Income Tax · Individual ITR Desk' };
      case 'ops_itr_business': return { group: 'Operation Management', title: 'Income Tax · Business & Corporate ITR' };
      case 'ops_itr_audit': return { group: 'Operation Management', title: 'Income Tax · Tax Audit Form 3CD' };
      case 'ops_itr_notices': return { group: 'Operation Management', title: 'Income Tax · Notice Cases & Rectification' };

      case 'ops_mca_dashboard': return { group: 'Operation Management', title: 'MCA & ROC · Company Dashboard' };
      case 'ops_mca_roc': return { group: 'Operation Management', title: 'MCA & ROC · ROC Statutory Forms' };
      case 'ops_mca_llp': return { group: 'Operation Management', title: 'MCA & ROC · LLP Statutory Filings' };
      case 'ops_mca_kyc': return { group: 'Operation Management', title: 'MCA & ROC · Director KYC Desk' };
      case 'ops_mca_aoc4': return { group: 'Operation Management', title: 'MCA & ROC · Financials AOC-4' };
      case 'ops_mca_mgt7': return { group: 'Operation Management', title: 'MCA & ROC · Annual Return MGT-7' };
      case 'ops_mca_inc20a': return { group: 'Operation Management', title: 'MCA & ROC · Commencement INC-20A' };

      case 'ops_trust_dashboard': return { group: 'Operation Management', title: 'Trust & NGO · Exemption Dashboard' };
      case 'ops_trust_12a': return { group: 'Operation Management', title: 'Trust & NGO · Section 12A Certification' };
      case 'ops_trust_80g': return { group: 'Operation Management', title: 'Trust & NGO · Section 80G Exemption' };
      case 'ops_trust_10b': return { group: 'Operation Management', title: 'Trust & NGO · Form 10B Audit' };
      case 'ops_trust_10bb': return { group: 'Operation Management', title: 'Trust & NGO · Form 10BB Audit' };

      case 'ops_dsc_active': return { group: 'Operation Management', title: 'DSC Management · Active Digital Signatures' };
      case 'ops_dsc_renewal': return { group: 'Operation Management', title: 'DSC Management · Renewal Due (< 30 Days)' };
      case 'ops_dsc_expired': return { group: 'Operation Management', title: 'DSC Management · Expired Tokens' };

      case 'ops_license_fssai': return { group: 'Operation Management', title: 'Licenses · FSSAI Food License' };
      case 'ops_license_msme': return { group: 'Operation Management', title: 'Licenses · MSME / Udyam' };
      case 'ops_license_iec': return { group: 'Operation Management', title: 'Licenses · Import Export Code (IEC)' };
      case 'ops_license_trade': return { group: 'Operation Management', title: 'Licenses · Municipal Trade License' };
      case 'ops_license_labour': return { group: 'Operation Management', title: 'Licenses · Labour Law Registrations' };

      case 'ops_clients_master': return { group: 'Operation Management', title: 'Client Master · Central Directory' };
      case 'ops_clients_allocation': return { group: 'Operation Management', title: 'Client Master · Allocation Desk' };
      case 'ops_clients_mapping': return { group: 'Operation Management', title: 'Client Master · Service Mapping' };

      case 'ops_gst': return { group: 'Operation Management', title: 'GST Monthly & Quarterly Filings' };
      case 'ops_itr': return { group: 'Operation Management', title: 'ITR Direct Tax Clearance' };
      case 'ops_mca': return { group: 'Operation Management', title: 'MCA & ROC Compliance Records' };
      case 'ops_tasks': return { group: 'Operation Management', title: 'Workflow Tasks & Client Delivery' };
      case 'ops_clients': return { group: 'Operation Management', title: 'Client Master & Service Mapping' };

      case 'settings_recovery': return { group: 'Settings & Control', title: 'Recovery Center & Snapshot Vault' };
      case 'settings_ai': return { group: 'Settings & Control', title: 'AI Automation & Inference Settings' };
      case 'settings_whatsapp': return { group: 'Settings & Control', title: 'WhatsApp Webhook & API Gateway' };
      case 'settings_audit': return { group: 'Settings & Control', title: 'Security Audit Logs' };
      case 'settings_security': return { group: 'Settings & Control', title: 'Security Telemetry & Health' };
      case 'settings_backup': return { group: 'Settings & Control', title: 'Data Imports, Backups & Recovery' };
      case 'hr_employees': return { group: 'HR & Workforce', title: 'Employees Directory & Roster' };
      case 'hr_payroll': return { group: 'HR & Workforce', title: 'Payroll Control & Salary Approvals' };
      case 'hr_attendance': return { group: 'HR & Workforce', title: 'Attendance Audit & Logs' };
      case 'hr_leaves': return { group: 'HR & Workforce', title: 'Leave Requests & Approvals' };
      case 'hr_services': return { group: 'HR & Workforce', title: 'Service Catalogue & Pricing' };
      case 'hr_templates': return { group: 'HR & Workforce', title: 'Proposal & Offer Letter Designer' };
      case 'tl_my_attendance': return { group: 'HR & Workforce', title: 'My Punch & Calendar' };
      default: return { group: 'Executive Command Center', title: 'Executive Overview' };
    }
  };

  const handleNavigateModule = (module: 'sales' | 'ops' | 'settings' | 'hr', specificTab?: string) => {
    if (module === 'sales') {
      setAdminNavTarget(specificTab === 'leads' ? 'sales_leads' : specificTab === 'followups' ? 'sales_followups' : specificTab === 'proposals' ? 'sales_proposals' : 'sales_dashboard');
    } else if (module === 'ops') {
      setAdminNavTarget(specificTab === 'gst' ? 'ops_gst' : specificTab === 'itr' ? 'ops_itr' : specificTab === 'mca' ? 'ops_mca' : specificTab === 'tasks' ? 'ops_tasks' : specificTab === 'clients' ? 'ops_clients' : 'ops_dashboard');
    } else if (module === 'settings') {
      setAdminNavTarget(specificTab === 'recovery_center' ? 'settings_recovery' : specificTab === 'ai' ? 'settings_ai' : specificTab === 'whatsapp' ? 'settings_whatsapp' : specificTab === 'audit' ? 'settings_audit' : specificTab === 'backup' ? 'settings_backup' : 'settings_recovery');
    } else if (module === 'hr') {
      setAdminNavTarget(specificTab === 'employees' ? 'hr_employees' : specificTab === 'payroll' ? 'hr_payroll' : specificTab === 'attendance' ? 'hr_attendance' : specificTab === 'leaves' ? 'hr_leaves' : specificTab === 'services' ? 'hr_services' : specificTab === 'templates' ? 'hr_templates' : 'hr_employees');
    }
  };

  // Login Gate
  if (!sessionUser) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} syncStatus={syncStatus} />;
  }

  const isMasterOrTL = sessionUser.role === 'admin' || sessionUser.role === 'team_leader';
  const isOpsTarget = adminNavTarget.startsWith('ops_');
  const breadcrumbInfo = getBreadcrumbs(adminNavTarget);

  return (
    <FeatureFlagProvider user={sessionUser}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850 shadow-xs px-4 sm:px-6 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 animate-fade-in">
          {/* Mobile sidebar hamburger */}
          {isMasterOrTL && (
            <button
              onClick={() => setIsSidebarMobileOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          )}

          <EFilinggLogo variant={theme === 'dark' ? 'dark' : 'color'} size="md" className="-ml-1 sm:-ml-3" />
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 font-mono bg-emerald-500/10 p-1 py-0.5 rounded-md hidden sm:inline">CRM</span>
          
          {/* PostgreSQL VPS Live Sync Status indicator */}
          <button
            onClick={handleVerifyVpsConnection}
            title="Click to force check VPS connection status and synchronize workspace data manually."
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[9px] font-mono leading-none cursor-pointer transition-colors"
          >
            {syncStatus === 'syncing' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase">VPS Syncing</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-600 dark:text-rose-400 font-semibold uppercase font-bold" title={syncError || 'Sync failed'}>VPS Error</span>
              </>
            ) : syncStatus === 'no_table' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase" title={syncError || ''}>Setup Required</span>
              </>
            ) : syncStatus === 'idle' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase">VPS Offline</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase font-bold">VPS Synced</span>
              </>
            )}
          </button>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          
          {/* User profile card badge */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-205 dark:border-slate-850">
            <div className="h-5 w-5 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-black text-[10px]">
              {sessionUser.name.charAt(0)}
            </div>
            <div className="text-left leading-none space-y-0.5">
              <span className="font-bold text-[11px] block text-slate-800 dark:text-slate-200">{sessionUser.name}</span>
              <span className="text-[9px] font-bold text-slate-400 capitalize block">{sessionUser.role} Gateway</span>
            </div>
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-505 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Switch Theme"
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
          </button>

          {/* Enterprise WhatsApp Notification & Voice Alert Engine Bell */}
          <WhatsAppNotificationBar />

          {/* Real-time Notifications Bell */}
          <NotificationBar userId={sessionUser.id} triggerRefresh={triggerRefresh} />

          {/* Signout key */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 py-2.5 px-3 sm:px-4 rounded-xl border border-rose-250 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 transition-all font-bold cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>

        </div>
      </header>

      {/* Main Core View Area with Sidebar for Admin / Team Leader */}
      <div className="flex-1 flex w-full">
        {isMasterOrTL ? (
          <>
            {/* Enterprise Isolated Left Sidebar (Only visible when inside a module) */}
            {adminNavTarget !== 'landing' && (
              <ExecutiveSidebar
                activeModule={getModuleForTarget(adminNavTarget)}
                currentTab={adminNavTarget}
                onSelectTab={(target) => setAdminNavTarget(target)}
                onBackToLanding={() => setAdminNavTarget('landing')}
                sessionUser={sessionUser}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                isOpenMobile={isSidebarMobileOpen}
                onCloseMobile={() => setIsSidebarMobileOpen(false)}
                leadCount={getLeads().length}
                followupCount={getFollowUps().filter((f) => f.status === 'pending').length}
                proposalCount={getProposals().length}
                opsPendingCount={getV2Tasks().filter((t) => t.status === 'pending').length}
                employeeCount={getEmployees().length}
              />
            )}

            {/* Content Viewport */}
            <main className={`flex-1 min-w-0 w-full ${isOpsTarget ? 'p-2 sm:p-4 lg:p-5 max-w-none' : 'p-4 sm:p-6 md:p-8 max-w-7xl mx-auto'}`}>
              {adminNavTarget === 'landing' ? (
                <MasterExecutiveLanding
                  sessionUser={sessionUser}
                  employees={getEmployees()}
                  leads={getLeads()}
                  followups={getFollowUps()}
                  proposals={getProposals()}
                  syncStatus={syncStatus}
                  onNavigateModule={handleNavigateModule}
                  onRefreshData={handleRefreshAllData}
                  onTriggerLeadDetail={(id) => {
                    if (id === null) {
                      setIsCreatingLead(true);
                    } else {
                      setActiveLeadId(id);
                    }
                  }}
                  onTriggerProposalDraft={() => setIsCreatingProposal(true)}
                />
              ) : (
                <div className="space-y-4 animate-fade-in">
                  {/* Modern Executive Breadcrumbs & Context Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        onClick={() => setAdminNavTarget('landing')}
                        className="inline-flex items-center space-x-1.5 font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <Home className="h-3.5 w-3.5" />
                        <span>Command Center</span>
                      </button>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold text-slate-400">{breadcrumbInfo.group}</span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-900 dark:text-white truncate">{breadcrumbInfo.title}</span>
                    </div>

                    <button
                      onClick={() => setAdminNavTarget('landing')}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Overview</span>
                    </button>
                  </div>

                  {/* Active Isolated Workspace Rendering */}
                  {isOpsTarget ? (
                    <OperationManagementDashboard
                      initialSegment={getOpsDashboardSegment(adminNavTarget)}
                      activeNavTarget={adminNavTarget}
                      onNavigateTarget={(target) => setAdminNavTarget(target as any)}
                    />
                  ) : (
                    <AdminDashboard
                      currentUserId={sessionUser.id}
                      onRefreshData={handleRefreshAllData}
                      triggerRefresh={triggerRefresh}
                      activeTabOverride={getAdminDashboardTab(adminNavTarget)}
                      hideTabBar={true}
                      activePayrollSubTab={getAdminDashboardPayrollSubTab(adminNavTarget)}
                      activeCategoryFilter={getAdminDashboardCategoryFilter(adminNavTarget)}
                      onTriggerLeadDetail={(id) => {
                        if (id === null) {
                          setIsCreatingLead(true);
                        } else {
                          setActiveLeadId(id);
                        }
                      }}
                      onTriggerProposalPreview={(p) => setActiveProposalPreview(p)}
                      onTriggerProposalDraft={() => setIsCreatingProposal(true)}
                    />
                  )}
                </div>
              )}
            </main>
          </>
        ) : sessionUser.department === 'OPERATION MANAGEMENT' ? (
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <OperationManagementDashboard />
          </main>
        ) : (
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <EmployeeDashboard
              currentUserId={sessionUser.id}
              triggerRefresh={triggerRefresh}
              onRefreshData={handleRefreshAllData}
              onTriggerLeadDetail={(id) => {
                if (id === null) {
                  setIsCreatingLead(true);
                } else {
                  setActiveLeadId(id);
                }
              }}
              onTriggerProposalPreview={(p) => setActiveProposalPreview(p)}
              onTriggerProposalDraft={() => setIsCreatingProposal(true)}
            />
          </main>
        )}
      </div>

      {/* ==============================================================
          PORTALS OVERLAYS: modals management
          ============================================================== */}

      {/* OVERLAY 1: Lead Details edit or create modal */}
      {(activeLeadId || isCreatingLead) && (
        <LeadModal
          leadId={activeLeadId}
          currentUserId={sessionUser.id}
          currentUserRole={sessionUser.role}
          onClose={() => {
            setActiveLeadId(null);
            setIsCreatingLead(false);
          }}
          onRefreshData={handleRefreshAllData}
          onCreateLeadSubmit={handleCreateLeadSubmit}
        />
      )}

      {/* OVERLAY 2: Proposal Builder workflow */}
      {isCreatingProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 p-4 overflow-y-auto flex justify-center items-center">
          <ProposalBuilder
            currentUserId={sessionUser.id}
            onRefreshData={handleRefreshAllData}
            onClose={() => setIsCreatingProposal(false)}
            onProposalCreated={(prop) => {
              setIsCreatingProposal(false);
              setActiveProposalPreview(prop);
            }}
          />
        </div>
      )}

      {/* OVERLAY 3: High Fidelity Proposal PDF Preview and printing page */}
      {activeProposalPreview && (
        <ProposalPdf
          proposal={activeProposalPreview}
          onClose={() => setActiveProposalPreview(null)}
        />
      )}

      {/* OVERLAY 4: Employee/TL Good Practice Bulletins Pop-up */}
      {showGoodPracticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 flex justify-center items-center animate-fade-in print:hidden">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative"
            id="good-practice-popup"
          >
            {/* Top decorative badge bar */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600" />
            
            <button 
              onClick={() => setShowGoodPracticeModal(false)}
              className="absolute right-4 top-5 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Bulletin"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-955/30 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-500">
                  <Lightbulb className="h-5.5 w-5.5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">EFilingg CRM Compliance</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Good Practice Guidelines</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-50 dark:border-emerald-950/30 p-3 rounded-2xl">
                  <span className="h-6 w-6 font-mono font-black text-xs text-white bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs">1</span>
                  <div className="text-xs text-slate-705 dark:text-slate-350 leading-relaxed font-semibold">
                    <span className="font-extrabold text-slate-900 dark:text-white block uppercase text-[11px] tracking-wide text-emerald-600 dark:text-emerald-400">Always Punch Attendance Timely</span>
                    Verify your working hours and perform check-in & check-out daily through your client terminal.
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-50 dark:border-indigo-950/30 p-3 rounded-2xl">
                  <span className="h-6 w-6 font-mono font-black text-xs text-white bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs">2</span>
                  <div className="text-xs text-slate-705 dark:text-slate-350 leading-relaxed font-semibold">
                    <span className="font-extrabold text-slate-900 dark:text-white block uppercase text-[11px] tracking-wide text-indigo-600 dark:text-indigo-400">Contact Your Team Leader For Any Modification</span>
                    All manual overrides, corrections, and calendar adjustments require a valid system reason.
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-amber-50/20 dark:bg-amber-955/5 border border-amber-50 dark:border-amber-950/30 p-3 rounded-2xl">
                  <span className="h-6 w-6 font-mono font-black text-xs text-white bg-amber-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs">3</span>
                  <div className="text-xs text-slate-705 dark:text-slate-350 leading-relaxed font-semibold">
                    <span className="font-extrabold text-slate-900 dark:text-white block uppercase text-[11px] tracking-wide text-amber-600 dark:text-amber-400">Always Clear Follow-ups Pending Before Starting Work</span>
                    Prioritize finishing your outstanding interactions to maintain pristine CRM lead stages.
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-purple-50/20 dark:bg-purple-955/5 border border-purple-50 dark:border-purple-950/30 p-3 rounded-2xl">
                  <span className="h-6 w-6 font-mono font-black text-xs text-white bg-purple-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs">4</span>
                  <div className="text-xs text-slate-705 dark:text-slate-350 leading-relaxed font-semibold">
                    <span className="font-extrabold text-slate-900 dark:text-white block uppercase text-[11px] tracking-wide text-purple-650 dark:text-purple-400">Only Two Leaves Per Month & Remain Week Off</span>
                    Adhere strictly to the maximum limit of 2 leaves per payroll cycle and standard Sunday rest routines.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowGoodPracticeModal(false)}
                  className="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer font-sans"
                >
                  Understood & Continue to Work ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionUser && (
        <TeamConnectWidget currentUser={sessionUser} />
      )}
      <WhatsAppIncomingMessagePopup />

      {/* Optimistic Concurrency Control Conflict Resolution Dialog */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onClose={() => {
            setActiveConflict(null);
            handleRefreshAllData();
          }}
        />
      )}

      {/* Simple Footer and operational information */}
      <footer className="py-6 border-t border-slate-150 dark:border-slate-850 text-center text-xs text-slate-450 dark:text-slate-550 flex flex-col sm:flex-row items-center justify-between px-8 bg-white dark:bg-slate-900 mt-12 gap-2 print:hidden">
        <span>© 2026 EFILINGG FINANCIAL SERVICES PRIVATE LIMITED • Secure Corporate Compliance Desk</span>
        <span>Standard Indian GST (18%) taxation calculations verified</span>
      </footer>

      </div>
    </FeatureFlagProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
