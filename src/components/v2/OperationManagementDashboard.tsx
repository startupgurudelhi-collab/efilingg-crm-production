/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getCurrentSession } from '../../lib/db';
import V2Masters from './V2Masters';
import V2GST from './V2GST';
import V2MCA from './V2MCA';
import V2ITR from './V2ITR';
import V2Tasks from './V2Tasks';
import V2ClientMapper from './V2ClientMapper';
import { 
  getV2GstClients,
  getV2GstReturnStatuses,
  getV2McaClients,
  getV2McaRocReturns,
  getV2ItrClients,
  getV2TaxAuditClients,
  getV2TrustClients,
  getV2DscClients,
  getV2Trademarks,
  getV2Tasks
} from '../../lib/v2_db';
import { 
  ShieldCheck, HelpCircle, FileText, ClipboardList, Settings, Briefcase, Award,
  ChevronDown, LayoutDashboard, Building2, Users, FileSpreadsheet, UserPlus,
  TrendingUp, CheckCircle, Clock, AlertCircle, RefreshCw, Calendar, Search, 
  Shield, Download, CheckSquare, Sparkles, BookOpen, Layers, ArrowRight, ArrowUpRight
} from 'lucide-react';

export default function OperationManagementDashboard() {
  const sessionUser = getCurrentSession();
  const isAdmin = sessionUser?.role === 'admin';
  const [activeSegment, setActiveSegment] = useState<'dashboard' | 'masters' | 'gst' | 'mca' | 'itr' | 'dockets' | 'mapping'>('dashboard');
  
  // Track configurations to reset / parameterize children when selected from header drop-downs
  const [activeConfig, setActiveConfig] = useState<{
    gstSubTab?: 'MONTHLY' | 'QUARTERLY';
    gstShowAddForm?: boolean;
    gstShowImport?: boolean;
    gstSearch?: string;
    
    itrSubTab?: 'itr' | 'audit' | 'trust' | 'dsc' | 'others';
    itrShowAddItr?: boolean;
    itrShowAddTrust?: boolean;
    itrShowAddDsc?: boolean;

    mcaActiveTab?: 'mca' | 'roc';
    mcaShowAddForm?: boolean;
    mcaShowImport?: boolean;
    mcaClientTypeFilter?: 'PRIVATE LIMITED COMPANY' | 'LLP' | 'SECTION 8 NGO';
  }>({});

  // Trigger state keys to force component re-mounts on navigation selection clicks
  const [navigationKey, setNavigationKey] = useState<number>(0);
  
  // Header Dropdown Open States
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load real storage stats dynamically
  const gstClients = getV2GstClients();
  const gstReturns = getV2GstReturnStatuses();
  const mcaClients = getV2McaClients();
  const mcaReturns = getV2McaRocReturns();
  const itrClients = getV2ItrClients();
  const taxAuditClients = getV2TaxAuditClients();
  const trustClients = getV2TrustClients();
  const dscClients = getV2DscClients();
  const trademarks = getV2Trademarks();
  const tasks = getV2Tasks();

  // Statistics Computations
  const pendingGstReturnsCount = gstReturns.filter(r => r.gstr1 !== 'FILED' || r.gstr3b !== 'FILED').length;
  const pendingItrCount = itrClients.filter(i => i.itrStatus !== 'FILED').length;
  
  const pendingDinKycCount = mcaReturns.filter(r => r.dinKycStatus === 'NOT FILED' || r.dinKycStatus === 'PENDING').length;
  const pendingAdt1Count = mcaReturns.filter(r => r.adt1Status === 'NOT FILED' || r.adt1Status === 'PENDING').length;
  const pendingAoc4Count = mcaReturns.filter(r => r.aoc4Status === 'NOT FILED' || r.aoc4Status === 'PENDING').length;
  const pendingMgt7Count = mcaReturns.filter(r => r.mgt7Status === 'NOT FILED' || r.mgt7Status === 'PENDING').length;
  const totalPendingRocsCount = pendingDinKycCount + pendingAdt1Count + pendingAoc4Count + pendingMgt7Count;

  const pendingTaxAuditsCount = taxAuditClients.filter(a => a.status !== 'FILED').length;
  
  // DSC Renewal within 1 year or current date
  const pendingDscRenewalCount = dscClients.filter(d => {
    const exp = new Date(d.expiryDate);
    return exp <= new Date('2027-06-15'); // Current date is 2026-06-15, warning flags for 1-year window
  }).length;

  // Calculation of No DSC Associates count
  const noDscAssociatesCount = mcaClients
    .filter(c => c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'LLP' || c.clientType === 'SECTION 8 NGO')
    .flatMap(c => c.directors || [])
    .filter(dir => {
      const hasDsc = dscClients.some(dsc => 
        dsc.clientName.toLowerCase().trim() === dir.name.toLowerCase().trim()
      );
      return !hasDsc;
    }).length;

  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const pendingTrademarksCount = trademarks.filter(t => t.stage !== 'Approved').length;

  // Totals for bento grid
  const totalGstCount = gstClients.length;
  const totalITRCount = itrClients.length;
  const totalMcaCount = mcaClients.length;
  const totalTrustsCount = trustClients.length;
  const totalDscCount = dscClients.length;
  const totalTrademarkPortfolioCount = trademarks.length;
  const overallActiveClientsCount = totalGstCount + totalITRCount + totalMcaCount + totalTrustsCount + totalDscCount + totalTrademarkPortfolioCount;

  // Custom Navigation deep-link switcher
  const handleNavigate = (
    segment: 'dashboard' | 'masters' | 'gst' | 'mca' | 'itr' | 'dockets' | 'mapping',
    config: typeof activeConfig = {}
  ) => {
    setActiveSegment(segment);
    setActiveConfig(config);
    setNavigationKey(prev => prev + 1);
    setOpenDropdown(null);
  };

  const toggleDropdown = (key: string) => {
    if (openDropdown === key) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(key);
    }
  };

  // Close dropdown helper
  const handleMouseLeaveDropdown = () => {
    setOpenDropdown(null);
  };

  return (
    <div className="space-y-6">

      {/* Robust Backdrop layer for closing dropdowns when clicking outside */}
      {openDropdown && (
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={() => setOpenDropdown(null)} 
        />
      )}

      {/* V2 Header: Simple, Modern & Highly Attractive - Green, White, and Gold Theme */}
      <div className="bg-emerald-950 border border-amber-500/30 text-white rounded-3xl py-4 px-6 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-[52px] sm:top-[56px] md:top-[57px] z-50">
        {/* Subtle golden decorative glow in header */}
        <div className="absolute right-0 top-0 w-32 h-12 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 select-none">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/25 text-amber-400 rounded-2xl shadow-inner">
            <Layers className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-widest uppercase font-sans text-white">STATUTORY WORKSPACE</span>
              <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-400 text-emerald-950 rounded leading-none">V2</span>
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-none">Operations & Real-time statutory filings tracker</p>
          </div>
        </div>

        {/* Flat navigation header with dropdown selectors */}
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] relative">
          
          {/* Dashboard Button */}
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider relative z-50 ${
              activeSegment === 'dashboard'
                ? 'bg-amber-400 text-emerald-950 shadow-md border border-amber-300'
                : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </button>

          {/* GST Management Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => toggleDropdown('gst')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider ${
                activeSegment === 'gst' 
                  ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md' 
                  : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
              }`}
            >
              GST
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openDropdown === 'gst' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-emerald-950 border border-amber-500/40 text-emerald-100 shadow-2xl p-2.5 space-y-1 z-50">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 px-2 py-1 border-b border-emerald-900 mb-1">
                  GST Operations Menu
                </div>
                
                <button
                  onClick={() => handleNavigate('gst', { gstSubTab: 'CLIENTS' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>📇 GST CLIENTS</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>

                <button
                  onClick={() => handleNavigate('gst', { gstSubTab: 'MONTHLY' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>📅 Monthly Returns</span>
                  <Clock className="h-3 w-3 text-amber-500" />
                </button>

                <button
                  onClick={() => handleNavigate('gst', { gstSubTab: 'QUARTERLY' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span className="text-emerald-400 font-extrabold">🗓️ Quarterly Returns</span>
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                </button>
              </div>
            )}
          </div>

          {/* ITR Management Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => toggleDropdown('itr')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider ${
                activeSegment === 'itr' && !activeConfig.itrSubTab?.match(/trust|dsc/) 
                  ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md' 
                  : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
              }`}
            >
              ITR & Audit
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openDropdown === 'itr' && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-emerald-950 border border-amber-500/40 text-emerald-100 shadow-2xl p-2.5 space-y-1 z-50">
                <button
                  onClick={() => handleNavigate('itr', { itrSubTab: 'itr' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>🛡️ ITR Clients Directory</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('itr', { itrSubTab: 'itr' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>📅 Real-time ITR Returns</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('itr', { itrSubTab: 'audit' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span className="text-amber-400">🏢 Tax Audit (3CD/10B)</span>
                  <Clock className="h-3 w-3 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('itr', { itrSubTab: 'itr', itrShowAddItr: true })}
                  className="w-full text-left font-medium text-xs text-emerald-200 hover:bg-emerald-900 px-2.5 py-1.5 rounded-xl block text-[11px]"
                >
                  ➕ Register New ITR Client
                </button>
              </div>
            )}
          </div>

          {/* Trust & Societies Single Link */}
          <button
            onClick={() => handleNavigate('itr', { itrSubTab: 'trust' })}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider relative z-50 ${
              activeSegment === 'itr' && activeConfig.itrSubTab === 'trust'
                ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md'
                : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
            }`}
          >
            🏫 Trust & NGO
          </button>

          {/* MCA Management Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => toggleDropdown('mca')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider ${
                activeSegment === 'mca' 
                  ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md' 
                  : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
              }`}
            >
              MCA & ROC
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openDropdown === 'mca' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-emerald-950 border border-amber-500/40 text-emerald-100 shadow-2xl p-2.5 space-y-1 z-50">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 px-2 py-1 border-b border-emerald-900 mb-1">
                  CLIENT DIRECTORY
                </div>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'mca', mcaClientTypeFilter: 'PRIVATE LIMITED COMPANY' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>🏢 Pvt Ltd Companies</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'mca', mcaClientTypeFilter: 'LLP' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>🤝 LLP Partnerships</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'mca', mcaClientTypeFilter: 'SECTION 8 NGO' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>🌱 Section 8 NGO Entities</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'mca', mcaShowAddForm: true })}
                  className="w-full text-left font-medium text-xs text-emerald-200 hover:bg-emerald-900 px-2.5 py-1.5 rounded-xl block text-[11px]"
                >
                  ➕ Registered New Corporated
                </button>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'mca', mcaShowImport: true })}
                  className="w-full text-left font-medium text-xs text-emerald-300 hover:bg-emerald-900 px-2.5 py-1.5 rounded-xl block text-[11px]"
                >
                  📊 Excel Import ROC Master
                </button>

                <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 px-2 py-1 border-b border-emerald-900 my-1 pt-1 border-t border-emerald-900">
                  ANNUAL ROC FILINGS
                </div>
                <button
                  onClick={() => handleNavigate('mca', { mcaActiveTab: 'roc' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between text-yellow-400"
                >
                  <span>📑 ROC Tracker (AOC-4, MGT-7)</span>
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                </button>
              </div>
            )}
          </div>

          {/* DSC Management Button */}
          <button
            onClick={() => handleNavigate('itr', { itrSubTab: 'dsc' })}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider relative z-50 ${
              activeSegment === 'itr' && activeConfig.itrSubTab === 'dsc'
                ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md'
                : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
            }`}
          >
            🛡️ DSC
          </button>

          {/* CA Masters Button */}
          <button
            onClick={() => handleNavigate('masters')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider relative z-50 ${
              activeSegment === 'masters'
                ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md'
                : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
            }`}
          >
            🎓 Partners
          </button>

          {/* Admin Client Mapper Button */}
          {isAdmin && (
            <button
              onClick={() => handleNavigate('mapping')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-extrabold uppercase tracking-wider relative z-50 ${
                activeSegment === 'mapping'
                  ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md scale-105'
                  : 'bg-indigo-600/35 text-indigo-100 border border-indigo-500/35 hover:bg-indigo-600 hover:text-white'
              }`}
            >
              🗺️ MAP clients
            </button>
          )}

          {/* Miscellaneous Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => toggleDropdown('misc')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider ${
                activeSegment === 'dockets' || (activeSegment === 'itr' && activeConfig.itrSubTab === 'others')
                  ? 'bg-amber-400 text-emerald-950 border border-amber-300 shadow-md' 
                  : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-amber-300'
              }`}
            >
              MISC
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openDropdown === 'misc' && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-emerald-950 border border-amber-500/40 text-emerald-100 shadow-2xl p-2.5 space-y-1 z-50">
                <button
                  onClick={() => handleNavigate('dockets')}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>🏷️ Trademark Portfolios</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('dockets')}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>📋 Custom Tasks Desk</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
                <button
                  onClick={() => handleNavigate('itr', { itrSubTab: 'others' })}
                  className="w-full text-left font-bold text-xs hover:bg-emerald-900 hover:text-amber-300 px-2.5 py-2 rounded-xl flex items-center justify-between"
                >
                  <span>📦 Other Registrations</span>
                  <ArrowRight className="h-3 w-3 opacity-50 text-amber-400" />
                </button>
              </div>
            )}
          </div>

        </nav>
      </div>

      {/* Main Container View Switcher Area */}
      <div className="bg-slate-50 dark:bg-slate-950/20 p-1 rounded-3xl">
        {activeSegment === 'dashboard' && renderMainDashboard()}
        
        {activeSegment === 'masters' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2Masters key={`masters_${navigationKey}`} />
          </div>
        )}
        
        {activeSegment === 'gst' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2GST 
              key={`gst_${navigationKey}`}
              initialSubTab={activeConfig.gstSubTab}
              initialShowAddForm={activeConfig.gstShowAddForm}
              initialShowImport={activeConfig.gstShowImport}
              initialSearch={activeConfig.gstSearch}
            />
          </div>
        )}
        
        {activeSegment === 'mca' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2MCA 
              key={`mca_${navigationKey}`}
              initialActiveTab={activeConfig.mcaActiveTab}
              initialShowAddForm={activeConfig.mcaShowAddForm}
              initialShowImport={activeConfig.mcaShowImport}
              initialClientTypeFilter={activeConfig.mcaClientTypeFilter}
            />
          </div>
        )}
        
        {activeSegment === 'itr' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2ITR 
              key={`itr_${navigationKey}`}
              initialSubTab={activeConfig.itrSubTab}
              initialShowAddItr={activeConfig.itrShowAddItr}
              initialShowAddTrust={activeConfig.itrShowAddTrust}
              initialShowAddDsc={activeConfig.itrShowAddDsc}
            />
          </div>
        )}
        
        {activeSegment === 'dockets' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2Tasks key={`dockets_${navigationKey}`} />
          </div>
        )}

        {activeSegment === 'mapping' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xs">
            <V2ClientMapper key={`mapping_${navigationKey}`} />
          </div>
        )}
      </div>

    </div>
  );

  // Dynamic wow-factor dashboard rendering
  function renderMainDashboard() {
    return (
      <div className="space-y-8 animate-fadeIn">
        
        {/* Dynamic Statutory Banner with active totals - Green, White, and Gold Styled */}
        <div className="relative overflow-hidden bg-emerald-950 border border-amber-500/25 text-white p-6 sm:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row items-stretch justify-between gap-6">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10 max-w-2xl flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 text-amber-300 rounded-full border border-amber-400/25 text-[9px] font-black uppercase tracking-wider select-none">
                ⚙️ Live Filing Pipelines Calibrated
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase font-sans">
                Statutory Operations Hub <span className="text-amber-400 font-extrabold">V.2</span>
              </h1>
              <p className="text-[11px] text-emerald-100/70 leading-relaxed max-w-lg">
                Manage automated statutory lifecycles including GST, Income Tax return e-verify cycles, corporate MCA filings, brand trademarks, and DSC token state machinery.
              </p>
            </div>
            
            {/* Real Stats Overview pill badges */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <div className="px-3 py-1.5 bg-emerald-900/55 border border-emerald-800/60 rounded-xl text-[10px] font-bold text-white">
                👤 Active Engagements: <strong className="text-amber-400 font-black text-xs">{overallActiveClientsCount}</strong>
              </div>
              <div className="px-3 py-1.5 bg-emerald-900/55 border border-emerald-800/60 rounded-xl text-[10px] font-bold text-white">
                📁 GST portfolios: <strong className="text-amber-400 font-black text-xs">{totalGstCount}</strong>
              </div>
              <div className="px-3 py-1.5 bg-emerald-900/55 border border-emerald-800/60 rounded-xl text-[10px] font-bold text-white">
                🏢 Corporates MCA: <strong className="text-amber-400 font-black text-xs">{totalMcaCount}</strong>
              </div>
              <div className="px-3 py-1.5 bg-emerald-900/55 border border-emerald-800/60 rounded-xl text-[10px] font-bold text-white">
                🏫 Trusts: <strong className="text-amber-400 font-black text-xs">{totalTrustsCount}</strong>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center md:items-end justify-between md:justify-end gap-x-6 relative z-10">
            <div className="hidden lg:flex items-center pr-4">
              <div className="p-4 bg-amber-400/10 border border-amber-400/25 rounded-2xl text-amber-400">
                <Briefcase className="h-8 w-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Quick healthy dashboard summary */}
            <div className="bg-slate-950/45 p-4 rounded-2xl border border-slate-800/60 flex flex-col justify-between max-w-sm w-full md:w-56 shrink-0">
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Overall Health Index</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black font-sans text-emerald-400">94.8%</span>
                <span className="text-[9px] text-emerald-500 font-extrabold">▲ Stable</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94.8%' }} />
              </div>
              <div className="text-[9px] text-slate-500 mt-2 font-medium">calculated over all 2026 pending schedules</div>
            </div>
          </div>
        </div>

        {/* Admin Mapping Callout */}
        {isAdmin && (
          <div className="p-5 bg-gradient-to-r from-emerald-900/15 via-indigo-950/5 to-indigo-950/20 border border-indigo-500/25 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xs animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-600/10 border border-indigo-400/20 text-indigo-650 dark:text-indigo-400 rounded-2xl">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs flex items-center gap-1.5">
                  Onboarding & Allocation Queue <span className="px-1.5 py-0.2 bg-amber-400 text-emerald-950 text-[8px] font-black rounded uppercase">PENDING MAPPING</span>
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal max-w-xl">
                  You are identified as Master Admin. We detected uploaded client profiles. Open the Allocation Desk to seamlessly map or transfer client accounts to Operation Team employees.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNavigate('mapping')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 transition shadow-xs"
            >
              ALLOCATION DESK <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Real-time Pending Filing Actions Panels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-101 tracking-tight">Active Statutory Backlogs & Alerts</h2>
              <p className="text-[10px] text-slate-400 font-medium">Critical reminders requiring processing workflow or documentation from legal teams</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 dark:text-red-400 rounded-full border border-red-500/20 text-[9px] font-bold uppercase tracking-wider select-none animate-pulse">
              ● STATUTORY DEADLINES
            </div>
          </div>

          {/* KPI Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Pending GST Returns */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-3 top-3 p-1.5 group-hover:bg-amber-100/40 dark:group-hover:bg-slate-800 rounded-lg text-amber-500 transition-colors">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">GST Backlog</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-slate-101">{pendingGstReturnsCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Monthly & Quarterly GSTR returns pending clients confirmation</p>
              </div>
              <button
                onClick={() => handleNavigate('gst', { gstSubTab: 'MONTHLY' })}
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full text-left text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between hover:underline group cursor-pointer"
              >
                <span>Track Returns Desk</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 2: Pending ITR Filing */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-3 top-3 p-1.5 group-hover:bg-red-100/40 dark:group-hover:bg-slate-800 rounded-lg text-red-500 transition-colors">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ITR Backlog</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-slate-101">{pendingItrCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">ITR tax registrations waiting for system e-verify or submission</p>
              </div>
              <button
                onClick={() => handleNavigate('itr', { itrSubTab: 'itr' })}
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full text-left text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between hover:underline group cursor-pointer"
              >
                <span>Open ITR Panel</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 3: Pending MCA / ROC Filings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-3 top-3 p-1.5 group-hover:bg-amber-100/30 dark:group-hover:bg-slate-800 rounded-lg text-amber-500 transition-colors">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ROC Compliance Backlog</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-slate-101">{totalPendingRocsCount}</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5">
                  <div className="text-[8px] bg-slate-50 dark:bg-slate-950 font-bold p-1 rounded border border-slate-150/40 dark:border-slate-800">
                    DIR-KYC: <strong className="text-amber-500">{pendingDinKycCount}</strong>
                  </div>
                  <div className="text-[8px] bg-slate-50 dark:bg-slate-950 font-bold p-1 rounded border border-slate-150/40 dark:border-slate-800">
                    ADT-1: <strong className="text-emerald-600">{pendingAdt1Count}</strong>
                  </div>
                  <div className="text-[8px] bg-slate-50 dark:bg-slate-950 font-bold p-1 rounded border border-slate-150/40 dark:border-slate-800">
                    AOC-4: <strong className="text-red-500">{pendingAoc4Count}</strong>
                  </div>
                  <div className="text-[8px] bg-slate-50 dark:bg-slate-950 font-bold p-1 rounded border border-slate-150/40 dark:border-slate-800">
                    MGT-7/7A: <strong className="text-pink-500">{pendingMgt7Count}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('mca', { mcaActiveTab: 'roc' })}
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full text-left text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between hover:underline group cursor-pointer"
              >
                <span>Deploy ROC Filings</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 4: Tax Audit Pending */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-3 top-3 p-1.5 group-hover:bg-emerald-100/45 dark:group-hover:bg-slate-800 rounded-lg text-emerald-500 transition-colors">
                <Award className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tax Audit (3CD/10B)</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-slate-101">{pendingTaxAuditsCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">CA review signatures pending validation for local partners linkage</p>
              </div>
              <button
                onClick={() => handleNavigate('itr', { itrSubTab: 'audit' })}
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full text-left text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between hover:underline group cursor-pointer"
              >
                <span>Verify Audits Registry</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 5: DSC Expirations */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-slate-950 text-amber-500 rounded-xl">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">DSC Renewals Overdue</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-850 dark:text-slate-101">{pendingDscRenewalCount}</span>
                      <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded leading-none text-amber-500">Active Warning</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-tight flex items-center gap-1">
                    ⚠️ No DSC Associates
                  </span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-lg">
                    {noDscAssociatesCount} Directors
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('itr', { itrSubTab: 'dsc' })}
                className="mt-4 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left block cursor-pointer"
              >
                Manage Digital Signatures →
              </button>
            </div>

            {/* Card 6: Operations Tasks Pending */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Pending Tasks Count</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-850 dark:text-slate-101">{pendingTasksCount}</span>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded leading-none">Queued</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('dockets')}
                className="mt-4 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left block cursor-pointer"
              >
                Open Tasks desk →
              </button>
            </div>

            {/* Card 7: Pending Trademarks */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-slate-950 text-amber-500 rounded-xl">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Pending Trademarks</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-850 dark:text-slate-101">{pendingTrademarksCount}</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded leading-none">Live Stages</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('dockets')}
                className="mt-4 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left block cursor-pointer"
              >
                View Brand Trademark stages →
              </button>
            </div>

          </div>
        </div>

        {/* Dynamic Compliance Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-3">
          
          {/* Column 1: Compliances Deadlines Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-101 tracking-tight">V2 statutory Compliance Calendar</h3>
                  <p className="text-[9.5px] text-slate-400 font-bold leading-none">Active Month: June-July 2026</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wider rounded-xl border border-emerald-100/50">
                FY 2026-27
              </span>
            </div>

            <div className="space-y-3">
              
              {/* Deadline Item 1 */}
              <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-mono text-[9px] font-extrabold rounded">JUNE 15</span>
                    <strong className="font-extrabold text-slate-800 dark:text-slate-200">EPF & ESIC Monthly Remittances</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1">Provident Fund and Employee State Insurance deposits for May 2026 payroll</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wider rounded-full border border-emerald-150/40">
                  ✔ COMPLETED
                </span>
              </div>

              {/* Deadline Item 2 */}
              <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono text-[9px] font-extrabold rounded">JUNE 20</span>
                    <strong className="font-extrabold text-slate-800 dark:text-slate-200">GSTR-3B May Filing Deadline</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1">Primary Monthly dynamic tax returns for high-volume corporate accounts</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider rounded-full border border-amber-100">
                    ⚠️ {pendingGstReturnsCount} PENDING
                  </span>
                </div>
              </div>

              {/* Deadline Item 3 */}
              <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100/60 text-amber-800 font-mono text-[9px] font-extrabold rounded">JUNE 30</span>
                    <strong className="font-extrabold text-slate-800 dark:text-slate-200">DIR-3 KYC Web Filing (DIN KYC)</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1">Compliance mandatory check for registered MCA directors to prevent DIN lockouts</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-[9px] uppercase tracking-wider rounded-full border border-red-100">
                  ⌛ {pendingDinKycCount} ACTIVE
                </span>
              </div>

              {/* Deadline Item 4 */}
              <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] font-extrabold rounded">JULY 15</span>
                    <strong className="font-extrabold text-slate-800 dark:text-slate-200">Quarter 1 TCS Return Submission</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1">Tax collected at source statements processing of June accounts</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold text-[9px] uppercase tracking-wider rounded-full border border-slate-200/60">
                  UPCOMING
                </span>
              </div>

              {/* Deadline Item 5 */}
              <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-mono text-[9px] font-extrabold rounded">JULY 31</span>
                    <strong className="font-extrabold text-slate-800 dark:text-slate-200">Non-Audit Individual ITR Filing</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1">Deadline for taxpayers not covered under statutory CA tax audit systems</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold text-[9px] uppercase tracking-wider rounded-full border border-slate-200/60">
                  UPCOMING
                </span>
              </div>

            </div>
          </div>

          {/* Column 2: Dashboard Bento Shortcuts ("land on service pages") */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-101 tracking-tight">Direct Client Portals</h3>
              <p className="text-[10px] text-slate-400 font-medium">Click to instantly launch into dedicated modules and view masters</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Shortcut: GST Client Master */}
              <button
                onClick={() => handleNavigate('gst', { })}
                className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl hover:border-amber-400/50 dark:hover:border-amber-400/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-101">GST Client Ledger</h4>
                    <p className="text-[9.5px] text-slate-400">Manage {totalGstCount} registrants & returns</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-450 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Shortcut: MCA Registry */}
              <button
                onClick={() => handleNavigate('mca')}
                className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl hover:border-emerald-400/50 dark:hover:border-emerald-400/35 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-550 rounded-lg">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-101">Corporate MCA Hub</h4>
                    <p className="text-[9.5px] text-slate-400">Pvt Ltd, LLP, Section 8 structures</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Shortcut: ITR Directory */}
              <button
                onClick={() => handleNavigate('itr', { itrSubTab: 'itr' })}
                className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl hover:border-pink-400/50 dark:hover:border-pink-400/35 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-101">ITR & Audit Registry</h4>
                    <p className="text-[9.5px] text-slate-400">Track ITR tax filings and Audits</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-pink-500 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Shortcut: NGO exemption registry */}
              <button
                onClick={() => handleNavigate('itr', { itrSubTab: 'trust' })}
                className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150/40 dark:border-slate-800 rounded-xl hover:border-emerald-400/50 dark:hover:border-emerald-400/35 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-101">Trust & Societies Exemption</h4>
                    <p className="text-[9.5px] text-slate-400">12A & 80G dynamic certification status</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
              </button>

            </div>
          </div>

        </div>

      </div>
    );
  }
}
