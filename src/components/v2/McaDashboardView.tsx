import React, { useState, useMemo } from 'react';
import { 
  V2McaClient, 
  V2McaRocReturn, 
  V2Auditor
} from '../../lib/v2_db';
import { 
  Building2, 
  Briefcase, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Search, 
  Plus, 
  FileText, 
  UserCheck, 
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';

interface McaDashboardViewProps {
  clients: V2McaClient[];
  returns: V2McaRocReturn[];
  auditors: V2Auditor[];
  allEmployees: Array<{ id: string; name: string; employeeCode?: string; role?: string }>;
  currentUser: any;
  onNavigateTab: (tab: 'dashboard' | 'companies' | 'roc_companies' | 'roc_llp' | 'din_kyc' | 'post_compliance', clientTypeFilter?: string, employeeIdFilter?: string) => void;
  onUpdateClient: (id: string, updates: Partial<V2McaClient>) => void;
  onUpdateRocStatus: (clientId: string, field: string, value: string) => void;
  onOpenAddClient: () => void;
}

export default function McaDashboardView({
  clients,
  returns,
  auditors,
  allEmployees,
  currentUser,
  onNavigateTab,
  onUpdateClient,
  onUpdateRocStatus,
  onOpenAddClient
}: McaDashboardViewProps) {
  const isMasterAdmin = !currentUser || currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // State for employee dashboard filters
  const [empSearch, setEmpSearch] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState<'ALL' | 'PRIVATE LIMITED COMPANY' | 'LLP' | 'SECTION 8 NGO'>('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState<'ALL' | 'PENDING' | 'FILED'>('ALL');

  // Stats computation
  const stats = useMemo(() => {
    const totalCompanies = clients.length;
    const pvtLtdList = clients.filter(c => c.clientType === 'PRIVATE LIMITED COMPANY');
    const llpList = clients.filter(c => c.clientType === 'LLP');
    const section8List = clients.filter(c => c.clientType === 'SECTION 8 NGO');

    // ROC Matrix computations
    const aoc4Filed = returns.filter(r => r.aoc4Status === 'FILED').length;
    const aoc4Pending = (pvtLtdList.length + section8List.length) - aoc4Filed;

    const mgt7Filed = returns.filter(r => r.mgt7Status === 'FILED').length;
    const mgt7Pending = (pvtLtdList.length + section8List.length) - mgt7Filed;

    const form11Filed = returns.filter(r => r.form11Status === 'FILED').length;
    const form11Pending = llpList.length - form11Filed;

    const form8Filed = returns.filter(r => r.form8Status === 'FILED').length;
    const form8Pending = llpList.length - form8Filed;

    const allDirectors = clients.flatMap(c => (c.directors || []).map(d => ({ ...d, clientId: c.id, clientName: c.clientName })));
    const dinApproved = allDirectors.filter(d => d.dinKycStatus === 'Approved').length;
    const dinPendingCa = allDirectors.filter(d => d.dinKycStatus === 'Pending with CA').length;
    const dinPending = allDirectors.filter(d => !d.dinKycStatus || d.dinKycStatus === 'Pending').length;

    // Post Incorporation Outstanding
    const inc20aPendingList = clients.filter(c => 
      (c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'SECTION 8 NGO') && !c.isInc20aFiled
    );
    const adt1PendingList = clients.filter(c => 
      (c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'SECTION 8 NGO') && !c.isAdt1Filed
    );

    // Employee-wise stats
    const employeeStats = allEmployees.map(emp => {
      const assigned = clients.filter(c => c.assignedEmployeeId === emp.id || c.assignedEmployeeName === emp.name);
      const pvtCount = assigned.filter(c => c.clientType === 'PRIVATE LIMITED COMPANY').length;
      const llpCount = assigned.filter(c => c.clientType === 'LLP').length;
      const sec8Count = assigned.filter(c => c.clientType === 'SECTION 8 NGO').length;

      let filedReturns = 0;
      let pendingReturns = 0;

      assigned.forEach(c => {
        const ret = returns.find(r => r.mcaClientId === c.id);
        if (c.clientType === 'LLP') {
          if (ret?.form11Status === 'FILED') filedReturns++; else pendingReturns++;
          if (ret?.form8Status === 'FILED') filedReturns++; else pendingReturns++;
        } else {
          if (ret?.aoc4Status === 'FILED') filedReturns++; else pendingReturns++;
          if (ret?.mgt7Status === 'FILED') filedReturns++; else pendingReturns++;
        }
      });

      const totalReturns = filedReturns + pendingReturns;
      const completionRate = totalReturns > 0 ? Math.round((filedReturns / totalReturns) * 100) : 0;

      return {
        employee: emp,
        totalAssigned: assigned.length,
        pvtCount,
        llpCount,
        sec8Count,
        filedReturns,
        pendingReturns,
        completionRate
      };
    });

    // Unassigned clients
    const unassignedClients = clients.filter(c => !c.assignedEmployeeId);

    // CA Auditor Stats
    const auditorStats = auditors.map(aud => {
      const mappedClients = clients.filter(c => c.auditorFirmId === aud.id || c.auditorFirmId === aud.name);
      const balanceSheetReady = mappedClients.filter(c => {
        const ret = returns.find(r => r.mcaClientId === c.id);
        return ret?.balanceSheetStatus === 'READY';
      }).length;
      const balanceSheetPending = mappedClients.length - balanceSheetReady;

      return {
        auditor: aud,
        mappedClients,
        balanceSheetReady,
        balanceSheetPending
      };
    });

    return {
      totalCompanies,
      pvtLtdCount: pvtLtdList.length,
      llpCount: llpList.length,
      section8Count: section8List.length,
      aoc4Filed,
      aoc4Pending: Math.max(0, aoc4Pending),
      mgt7Filed,
      mgt7Pending: Math.max(0, mgt7Pending),
      form11Filed,
      form11Pending: Math.max(0, form11Pending),
      form8Filed,
      form8Pending: Math.max(0, form8Pending),
      totalDirectors: allDirectors.length,
      dinApproved,
      dinPendingCa,
      dinPending,
      inc20aPendingList,
      adt1PendingList,
      employeeStats,
      unassignedCount: unassignedClients.length,
      auditorStats
    };
  }, [clients, returns, auditors, allEmployees]);

  // Employee-specific dataset
  const myAssignedClients = useMemo(() => {
    if (isMasterAdmin) return [];
    return clients.filter(c => 
      c.assignedEmployeeId === currentUser?.id || 
      c.assignedEmployeeName === currentUser?.name
    );
  }, [clients, currentUser, isMasterAdmin]);

  const myStats = useMemo(() => {
    if (isMasterAdmin) return null;
    const total = myAssignedClients.length;
    const pvt = myAssignedClients.filter(c => c.clientType === 'PRIVATE LIMITED COMPANY').length;
    const llp = myAssignedClients.filter(c => c.clientType === 'LLP').length;
    const sec8 = myAssignedClients.filter(c => c.clientType === 'SECTION 8 NGO').length;

    let filed = 0;
    let pending = 0;

    myAssignedClients.forEach(c => {
      const ret = returns.find(r => r.mcaClientId === c.id);
      if (c.clientType === 'LLP') {
        if (ret?.form11Status === 'FILED') filed++; else pending++;
        if (ret?.form8Status === 'FILED') filed++; else pending++;
      } else {
        if (ret?.aoc4Status === 'FILED') filed++; else pending++;
        if (ret?.mgt7Status === 'FILED') filed++; else pending++;
      }
    });

    return { total, pvt, llp, sec8, filed, pending };
  }, [myAssignedClients, returns, isMasterAdmin]);

  const filteredMyClients = useMemo(() => {
    return myAssignedClients.filter(c => {
      const matchesSearch = c.clientName.toLowerCase().includes(empSearch.toLowerCase()) ||
        c.incomeTaxId.toLowerCase().includes(empSearch.toLowerCase()) ||
        c.clientState.toLowerCase().includes(empSearch.toLowerCase());
      
      const matchesType = empTypeFilter === 'ALL' || c.clientType === empTypeFilter;

      let matchesStatus = true;
      if (empStatusFilter !== 'ALL') {
        const ret = returns.find(r => r.mcaClientId === c.id);
        const isComplete = c.clientType === 'LLP' 
          ? (ret?.form11Status === 'FILED' && ret?.form8Status === 'FILED')
          : (ret?.aoc4Status === 'FILED' && ret?.mgt7Status === 'FILED');
        
        matchesStatus = empStatusFilter === 'FILED' ? isComplete : !isComplete;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [myAssignedClients, empSearch, empTypeFilter, empStatusFilter, returns]);

  const getRocRow = (mcaClientId: string) => {
    const rId = `${mcaClientId}_2025-26`;
    return returns.find(r => r.id === rId) || {
      id: rId,
      mcaClientId,
      financialYear: '2025-26',
      form11Status: 'NOT FILED' as const,
      form8Status: 'NOT FILED' as const,
      balanceSheetStatus: 'PENDING' as const,
      itrStatus: 'NOT FILED' as const,
      dinKycStatus: 'NOT FILED' as const,
      adt1Status: 'NOT FILED' as const,
      aoc4Status: 'NOT FILED' as const,
      mgt7Status: 'NOT FILED' as const,
      caName: ''
    };
  };

  // =========================================================================
  // VIEW A: MASTER ADMIN COMPANIES DASHBOARD
  // =========================================================================
  if (isMasterAdmin) {
    return (
      <div className="space-y-6 font-sans">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-xs border border-purple-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Master Admin Control Desk
                </span>
                <span className="text-[10px] text-purple-300 font-mono">FY 2025-26</span>
              </div>
              <h1 className="text-xl font-black mt-1 text-white flex items-center gap-2">
                <Building2 className="h-6 w-6 text-purple-400" /> MCA & ROC Companies Command Center
              </h1>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Centralized registry monitoring, statutory filing matrix, staff allocations, and auditor mapping.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAddClient}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <Plus className="h-4 w-4" /> Add Company / LLP
              </button>
            </div>
          </div>
        </div>

        {/* 1. TOP STATS CARDS (Clickable quick filters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Pvt Ltd */}
          <div 
            onClick={() => onNavigateTab('companies', 'PRIVATE LIMITED COMPANY')}
            className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-md transition cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Private Limited
              </span>
              <span className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.pvtLtdCount}
              </span>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded-lg">
                Companies
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>View Corporate Registry</span>
              <ChevronRight className="h-3.5 w-3.5 text-purple-500 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: LLP */}
          <div 
            onClick={() => onNavigateTab('companies', 'LLP')}
            className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                LLP Clients
              </span>
              <span className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                <Briefcase className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.llpCount}
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-lg">
                Partnerships
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>View LLP Ledger</span>
              <ChevronRight className="h-3.5 w-3.5 text-blue-500 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Section 8 */}
          <div 
            onClick={() => onNavigateTab('companies', 'SECTION 8 NGO')}
            className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Section 8 Co.
              </span>
              <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.section8Count}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-lg">
                Non-Profits
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>View Section 8 Registry</span>
              <ChevronRight className="h-3.5 w-3.5 text-emerald-500 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Total Registered Entities */}
          <div 
            onClick={() => onNavigateTab('companies', 'ALL')}
            className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md transition cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Companies Base
              </span>
              <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalCompanies}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-lg">
                Total Entities
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>Full Master Registry</span>
              <ChevronRight className="h-3.5 w-3.5 text-indigo-500 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>

        {/* 2. ROC FILING MATRIX (Interactive / Clickable) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" /> ROC Statutory Filing Matrix
              </h2>
              <p className="text-[10px] text-slate-400">
                Click any filing form card below to instantly view filtered filings ledger.
              </p>
            </div>
            <div className="text-[10px] font-bold text-slate-500">
              ⚡ Live Synchronized Status
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* AOC-4 Card */}
            <div 
              onClick={() => onNavigateTab('roc_companies')}
              className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 hover:border-purple-400 transition cursor-pointer hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase">AOC-4</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold">Financials</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {stats.aoc4Filed} Filed
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {stats.aoc4Pending} Pending
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-400" />
              </div>
            </div>

            {/* MGT-7 Card */}
            <div 
              onClick={() => onNavigateTab('roc_companies')}
              className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-400 transition cursor-pointer hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase">MGT-7</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold">Annual Return</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {stats.mgt7Filed} Filed
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {stats.mgt7Pending} Pending
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </div>
            </div>

            {/* Form 11 (LLP) Card */}
            <div 
              onClick={() => onNavigateTab('roc_llp')}
              className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 hover:border-blue-400 transition cursor-pointer hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase">Form 11</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">LLP Return</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {stats.form11Filed} Filed
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {stats.form11Pending} Pending
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400" />
              </div>
            </div>

            {/* Form 8 (LLP) Card */}
            <div 
              onClick={() => onNavigateTab('roc_llp')}
              className="p-3.5 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 hover:border-sky-400 transition cursor-pointer hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-sky-900 dark:text-sky-300 uppercase">Form 8</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold">LLP Accounts</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {stats.form8Filed} Filed
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {stats.form8Pending} Pending
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-sky-400" />
              </div>
            </div>

            {/* DIN KYC Card */}
            <div 
              onClick={() => onNavigateTab('din_kyc')}
              className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 hover:border-amber-400 transition cursor-pointer hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase">DIN KYC</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold">Directors ({stats.totalDirectors})</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {stats.dinApproved} Approved
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {stats.dinPending + stats.dinPendingCa} Pending
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. POST INCORPORATION COMPLIANCE PENDING (ADT-1 & INC-20A) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* INC-20A Pending Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    INC-20A Commencement Pending ({stats.inc20aPendingList.length})
                  </h3>
                  <p className="text-[9.5px] text-slate-400">Mandatory filing within 180 days of incorporation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('post_compliance')}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {stats.inc20aPendingList.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-600 font-bold bg-emerald-50/40 rounded-2xl">
                ✅ Zero INC-20A filings pending! All companies compliant.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stats.inc20aPendingList.map(cl => (
                  <div key={cl.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{cl.clientName}</div>
                      <div className="text-[10px] text-slate-400">Reg: {cl.dateOfRegistration} • {cl.clientState}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateClient(cl.id, { isInc20aFiled: true })}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-[10px] cursor-pointer transition"
                    >
                      Mark Filed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ADT-1 Pending Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    ADT-1 Auditor Appt Pending ({stats.adt1PendingList.length})
                  </h3>
                  <p className="text-[9.5px] text-slate-400">Mandatory filing within 30 days of first board meeting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('post_compliance')}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {stats.adt1PendingList.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-600 font-bold bg-emerald-50/40 rounded-2xl">
                ✅ Zero ADT-1 filings pending! All statutory auditors appointed.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stats.adt1PendingList.map(cl => (
                  <div key={cl.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{cl.clientName}</div>
                      <div className="text-[10px] text-slate-400">Reg: {cl.dateOfRegistration} • {cl.clientState}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateClient(cl.id, { isAdt1Filed: true })}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-[10px] cursor-pointer transition"
                    >
                      Mark Filed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. EMPLOYEE WISE ASSIGNED COMPANIES */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" /> Employee-Wise Assigned Companies
              </h2>
              <p className="text-[10px] text-slate-400">
                Staff workload balance, allotted companies portfolio, and ROC filing completion rate.
              </p>
            </div>
            <div className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl">
              {stats.unassignedCount > 0 ? `⚠️ ${stats.unassignedCount} Unassigned Companies` : '✅ All Companies Assigned'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[9.5px] font-black border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 pl-4">Staff Member</th>
                  <th className="p-3 text-center">Total Assigned</th>
                  <th className="p-3 text-center">Pvt Ltd</th>
                  <th className="p-3 text-center">LLP</th>
                  <th className="p-3 text-center">Section 8</th>
                  <th className="p-3 text-center">Returns Status</th>
                  <th className="p-3 text-center">Completion %</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {stats.employeeStats.map(({ employee, totalAssigned, pvtCount, llpCount, sec8Count, filedReturns, pendingReturns, completionRate }) => (
                  <tr key={employee.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-slate-900 dark:text-white">{employee.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{employee.employeeCode || employee.id}</div>
                    </td>
                    <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">
                        {totalAssigned}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-purple-600 dark:text-purple-400">
                      {pvtCount}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">
                      {llpCount}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {sec8Count}
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-[10px] font-bold space-x-1.5">
                        <span className="text-emerald-600">{filedReturns} Filed</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-600">{pendingReturns} Pending</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-24 mx-auto">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-0.5">
                          <span>{completionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${completionRate >= 80 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right pr-4">
                      <button
                        type="button"
                        onClick={() => onNavigateTab('companies', 'ALL', employee.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 rounded-xl font-bold text-[10px] transition cursor-pointer"
                      >
                        View Companies
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. CHARTERED ACCOUNTANT (CA) WISE COMPANIES */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" /> Chartered Accountant (Auditor) Allocation Matrix
              </h2>
              <p className="text-[10px] text-slate-400">
                Auditor firm details, mapped corporate clients, and financial audit readiness status.
              </p>
            </div>
            <div className="text-[10px] font-bold text-slate-500">
              Total {auditors.length} Chartered Accountants Registered
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.auditorStats.map(({ auditor, mappedClients, balanceSheetReady, balanceSheetPending }) => (
              <div key={auditor.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase">{auditor.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono">
                      FRN: {auditor.frnNo || 'N/A'} • M.No: {auditor.membershipNo}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    {mappedClients.length} Companies Mapped
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-850 pt-2 space-y-1">
                  <div>📍 {auditor.address}</div>
                  <div>📧 {auditor.email}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[10px] font-bold">
                  <div className="space-x-2">
                    <span className="text-emerald-600">📗 {balanceSheetReady} BS Ready</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-600">📙 {balanceSheetPending} BS Pending</span>
                  </div>
                </div>

                {mappedClients.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {mappedClients.map(c => (
                      <span key={c.id} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9.5px] font-bold text-slate-700 dark:text-slate-300">
                        {c.clientName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: EMPLOYEE COMPANIES DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Banner for Employee */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 rounded-3xl shadow-xs border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Staff Operations Desk
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">Assigned Portfolio</span>
            </div>
            <h1 className="text-xl font-black mt-1 text-white flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-indigo-400" /> Welcome {currentUser?.name || 'Associate'} · My Companies
            </h1>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Manage your assigned corporate accounts, file annual ROC forms, and update director KYC statuses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddClient}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <Plus className="h-4 w-4" /> Add Manual Client
            </button>
          </div>
        </div>
      </div>

      {/* 1. EMPLOYEE STATS CARDS (My Assigned Portfolio) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Assigned */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Total Assigned</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {myStats?.total || 0}
          </div>
          <span className="text-[9px] text-indigo-600 font-bold">Allotted Companies</span>
        </div>

        {/* Card 2: Pvt Ltd */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Pvt Ltd</span>
          <div className="text-xl font-black text-purple-600 mt-1">
            {myStats?.pvt || 0}
          </div>
          <span className="text-[9px] text-purple-500 font-bold">Companies</span>
        </div>

        {/* Card 3: LLP */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">LLP Clients</span>
          <div className="text-xl font-black text-blue-600 mt-1">
            {myStats?.llp || 0}
          </div>
          <span className="text-[9px] text-blue-500 font-bold">Partnerships</span>
        </div>

        {/* Card 4: Section 8 */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Section 8</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {myStats?.sec8 || 0}
          </div>
          <span className="text-[9px] text-emerald-500 font-bold">NGOs</span>
        </div>

        {/* Card 5: Returns Filed */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Returns Filed</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {myStats?.filed || 0}
          </div>
          <span className="text-[9px] text-emerald-500 font-bold">Completed</span>
        </div>

        {/* Card 6: Returns Pending */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Returns Pending</span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {myStats?.pending || 0}
          </div>
          <span className="text-[9px] text-rose-500 font-bold">Action Required</span>
        </div>
      </div>

      {/* 2. MY ASSIGNED COMPANIES INTERACTIVE DESK */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl w-full md:max-w-xs text-xs">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search your companies or PAN..."
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="bg-transparent border-0 w-full focus:ring-0 p-0 text-xs text-slate-700 dark:text-slate-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Type Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
              {(['ALL', 'PRIVATE LIMITED COMPANY', 'LLP', 'SECTION 8 NGO'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEmpTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    empTypeFilter === t 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t === 'PRIVATE LIMITED COMPANY' ? 'Pvt Ltd' : t === 'SECTION 8 NGO' ? 'Section 8' : 'LLP'}
                </button>
              ))}
            </div>

            {/* Filing Status Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
              {(['ALL', 'PENDING', 'FILED'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEmpStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    empStatusFilter === s 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s === 'ALL' ? 'All Filings' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Table */}
        <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[9.5px] font-black border-b border-slate-100 dark:border-slate-800">
                <th className="p-3 pl-4">Company Details</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">PAN & State</th>
                <th className="p-3">Statutory Returns (ROC)</th>
                <th className="p-3">DIN KYC</th>
                <th className="p-3">Post Inc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredMyClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    No assigned companies matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMyClients.map(cl => {
                  const r = getRocRow(cl.id);
                  const isLlp = cl.clientType === 'LLP';

                  return (
                    <tr key={cl.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-slate-900 dark:text-white">{cl.clientName}</div>
                        <div className="text-[10px] text-slate-400">Reg: {cl.dateOfRegistration}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                          cl.clientType === 'LLP' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : cl.clientType === 'SECTION 8 NGO' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {cl.clientType === 'PRIVATE LIMITED COMPANY' ? 'PVT LTD' : cl.clientType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                        <div>{cl.incomeTaxId}</div>
                        <div className="text-[9px] text-slate-400">{cl.clientState}</div>
                      </td>
                      <td className="p-3">
                        {isLlp ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-bold text-slate-500 w-14">Form 11:</span>
                              <select
                                value={r.form11Status || 'NOT FILED'}
                                onChange={e => onUpdateRocStatus(cl.id, 'form11Status', e.target.value)}
                                className={`text-[9.5px] font-bold p-1 rounded-lg border ${
                                  r.form11Status === 'FILED' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                <option value="NOT FILED">Not Filed</option>
                                <option value="FILED">Filed</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-bold text-slate-500 w-14">Form 8:</span>
                              <select
                                value={r.form8Status || 'NOT FILED'}
                                onChange={e => onUpdateRocStatus(cl.id, 'form8Status', e.target.value)}
                                className={`text-[9.5px] font-bold p-1 rounded-lg border ${
                                  r.form8Status === 'FILED' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                <option value="NOT FILED">Not Filed</option>
                                <option value="FILED">Filed</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-bold text-slate-500 w-12">AOC-4:</span>
                              <select
                                value={r.aoc4Status || 'NOT FILED'}
                                onChange={e => onUpdateRocStatus(cl.id, 'aoc4Status', e.target.value)}
                                className={`text-[9.5px] font-bold p-1 rounded-lg border ${
                                  r.aoc4Status === 'FILED' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                <option value="NOT FILED">Not Filed</option>
                                <option value="PENDING">Pending</option>
                                <option value="FILED">Filed</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-bold text-slate-500 w-12">MGT-7:</span>
                              <select
                                value={r.mgt7Status || 'NOT FILED'}
                                onChange={e => onUpdateRocStatus(cl.id, 'mgt7Status', e.target.value)}
                                className={`text-[9.5px] font-bold p-1 rounded-lg border ${
                                  r.mgt7Status === 'FILED' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                <option value="NOT FILED">Not Filed</option>
                                <option value="PENDING">Pending</option>
                                <option value="FILED">Filed</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-[10px] space-y-0.5">
                          {(cl.directors || []).map((dir, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-xs">{dir.name}:</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase ${
                                dir.dinKycStatus === 'Approved' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : dir.dinKycStatus === 'Pending with CA' 
                                  ? 'bg-amber-50 text-amber-700' 
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {dir.dinKycStatus || 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {!isLlp ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => onUpdateClient(cl.id, { isInc20aFiled: !cl.isInc20aFiled })}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold block w-full text-center ${
                                cl.isInc20aFiled 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              INC-20A: {cl.isInc20aFiled ? 'Filed' : 'Pending'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateClient(cl.id, { isAdt1Filed: !cl.isAdt1Filed })}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold block w-full text-center ${
                                cl.isAdt1Filed 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              ADT-1: {cl.isAdt1Filed ? 'Filed' : 'Pending'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">N/A (LLP)</span>
                        )}
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
  );
}
