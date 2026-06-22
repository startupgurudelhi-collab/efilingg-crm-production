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
  getEmployees
} from './lib/db';
import { Employee, Lead, Proposal } from './types';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import OperationManagementDashboard from './components/v2/OperationManagementDashboard';
import LeadModal from './components/LeadModal';
import ProposalBuilder from './components/ProposalBuilder';
import ProposalPdf from './components/ProposalPdf';
import NotificationBar from './components/NotificationBar';
import TeamConnectWidget from './components/TeamConnectWidget';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { LogOut, User, Sun, Moon, Sparkles, Building2, Shield, Eye, Database, ListTodo, FileText, Lightbulb, CalendarDays, CheckCircle2, X } from 'lucide-react';
import EFilinggLogo from './components/EFilinggLogo';

function AppContent() {
  const [sessionUser, setSessionUser] = useState<Employee | null>(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [showGoodPracticeModal, setShowGoodPracticeModal] = useState(false);
  const [selectedDepartmentView, setSelectedDepartmentView] = useState<'sales' | 'ops'>('sales');

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

      // 1. Initial Local Setup so DB is ready instantly
      initializeDB();
      if (!active) return;
      setSessionUser(getCurrentSession());

      // 2. Perform background pull from PostgreSQL database to load synced cloud data
      try {
        const { initializePostgresSync, subscribeToSync } = await import('./lib/postgresSync');
        if (!active) return;
        
        // Subscribe to live meta status updates
        subscribeToSync((meta) => {
          if (!active) return;
          setSyncStatus(meta.status);
          setSyncError(meta.errorMessage);
        });

        await initializePostgresSync();
        if (!active) return;
        
        // Refresh session user in case employee passwords/details changed on cloud
        setSessionUser(getCurrentSession());
        handleRefreshAllData();
      } catch (err) {
        console.warn('Supabase cloud sync background initialization deferred:', err);
      }
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

    return () => {
      active = false;
      clearInterval(interval);
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

  // Login Gate
  if (!sessionUser) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} syncStatus={syncStatus} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850 shadow-xs px-6 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 animate-fade-in">
          <EFilinggLogo variant={theme === 'dark' ? 'dark' : 'color'} size="md" className="-ml-3" />
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 font-mono bg-emerald-500/10 p-1 py-0.5 rounded-md hidden sm:inline">CRM</span>
          
          {/* PostgreSQL VPS Live Sync Status indicator */}
          <button
            onClick={handleVerifyVpsConnection}
            title="Click to force check VPS connection status and synchronize workspace data manually."
            className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[9px] font-mono leading-none cursor-pointer transition-colors"
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
        <div className="flex items-center space-x-3 text-xs">
          
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

          {/* Real-time Notifications Bell */}
          <NotificationBar userId={sessionUser.id} triggerRefresh={triggerRefresh} />

          {/* Signout key */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 py-2.5 px-4 rounded-xl border border-rose-250 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 transition-all font-bold cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>

        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {sessionUser.role === 'admin' || sessionUser.role === 'team_leader' ? (
          <div className="space-y-6">
            
            {/* Dynamic Segmented Department Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedDepartmentView('sales')}
                  className={`px-4 py-2 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedDepartmentView === 'sales'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  💼 SALES & MARKETING COMPLIANCE (V1)
                </button>
                <button
                  onClick={() => setSelectedDepartmentView('ops')}
                  className={`px-4 py-2 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedDepartmentView === 'ops'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ⚙️ OPERATION MANAGEMENT SYSTEM (V2)
                </button>
              </div>
              <div className="text-[9.5px] font-black font-mono uppercase tracking-widest text-slate-400">
                🛡️ LEVEL AUTHORITY: {sessionUser.role.toUpperCase()}
              </div>
            </div>

            {selectedDepartmentView === 'sales' ? (
              <AdminDashboard
                currentUserId={sessionUser.id}
                onRefreshData={handleRefreshAllData}
                triggerRefresh={triggerRefresh}
                onTriggerLeadDetail={(id) => {
                  if (id === null) {
                    setIsCreatingLead(true);
                  } else {
                    setActiveLeadId(id);
                  }
                }}
                onTriggerProposalPreview={(p) => setActiveProposalPreview(p)}
              />
            ) : (
              <OperationManagementDashboard />
            )}
          </div>
        ) : sessionUser.department === 'OPERATION MANAGEMENT' ? (
          <OperationManagementDashboard />
        ) : (
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
        )}
      </main>

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

      {/* Simple Footer and operational information */}
      <footer className="py-6 border-t border-slate-150 dark:border-slate-850 text-center text-xs text-slate-450 dark:text-slate-550 flex flex-col sm:flex-row items-center justify-between px-8 bg-white dark:bg-slate-900 mt-12 gap-2 print:hidden">
        <span>© 2026 EFILINGG FINANCIAL SERVICES PRIVATE LIMITED • Secure Corporate Compliance Desk</span>
        <span>Standard Indian GST (18%) taxation calculations verified</span>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
