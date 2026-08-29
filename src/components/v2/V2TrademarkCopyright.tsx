/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  V2TrademarkClient, 
  getV2Trademarks, 
  addV2Trademark, 
  getV2TrademarkAttorneys, 
  getV1Employees 
} from '../../lib/v2_db';
import { getCurrentSession, setStorageString, getStorageString } from '../../lib/db';
import { isClientAssignedToUser, getEmployeesWithModuleAccess } from '../../lib/permissions';
import { 
  ShieldCheck, Award, FileText, Search, Plus, Filter, 
  Calendar, CheckCircle2, Clock, AlertTriangle, Scale, 
  Building2, User, ChevronRight, Download, RefreshCw, X, Tag
} from 'lucide-react';

export interface V2TrademarkCopyrightProps {
  key?: React.Key;
  initialSubTab?: 'dashboard' | 'applications' | 'objections' | 'hearings' | 'registrations' | 'copyrights';
  initialSearch?: string;
  initialClassFilter?: string;
}

export interface CopyrightRecord {
  id: string;
  workTitle: string;
  category: 'Software Code' | 'Artistic Logo' | 'Literary Work' | 'Cinematograph' | 'Sound Recording' | 'Website UI';
  authorName: string;
  ownerName: string;
  diaryNumber: string;
  filingDate: string;
  status: 'Diary Number Issued' | 'Formalities Check Pass' | 'Awaiting Objection' | 'Scrutiny In Progress' | 'Registered Certificate Issued';
  assignedCounsel?: string;
}

const STORAGE_KEY_COPYRIGHTS = 'efilingg_crm_v2_copyrights';

export default function V2TrademarkCopyright({
  initialSubTab = 'dashboard',
  initialSearch = '',
  initialClassFilter = 'ALL'
}: V2TrademarkCopyrightProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'objections' | 'hearings' | 'registrations' | 'copyrights'>(initialSubTab);

  // Synchronize when initialSubTab changes from parent navigation
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Load masters & databases
  const [trademarks, setTrademarks] = useState<V2TrademarkClient[]>(getV2Trademarks());
  const attorneys = getV2TrademarkAttorneys();
  const rawEmployees = getV1Employees();

  // Copyright records state
  const [copyrights, setCopyrights] = useState<CopyrightRecord[]>(() => {
    try {
      const stored = getStorageString(STORAGE_KEY_COPYRIGHTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: 'CP-101',
        workTitle: 'E-Filingg NextGen Cloud ERP Engine',
        category: 'Software Code',
        authorName: 'Rohan Sharma & Tech Team',
        ownerName: 'Apex Financial Services LLP',
        diaryNumber: '14820/2026-CO/SW',
        filingDate: '2026-05-12',
        status: 'Registered Certificate Issued',
        assignedCounsel: 'Adv. Vikas Verma'
      },
      {
        id: 'CP-102',
        workTitle: 'Zenith Logistics Monogram & Vector Art',
        category: 'Artistic Logo',
        authorName: 'Zenith Design Studio',
        ownerName: 'Zenith Logistics Solutions Pvt Ltd',
        diaryNumber: '15910/2026-CO/A',
        filingDate: '2026-06-18',
        status: 'Awaiting Objection',
        assignedCounsel: 'Adv. Meenakshi Sundaram'
      },
      {
        id: 'CP-103',
        workTitle: 'Statutory GST Master Manual & Handbook',
        category: 'Literary Work',
        authorName: 'CA Rajesh Singhania',
        ownerName: 'Rajesh Singhania & Co',
        diaryNumber: '16200/2026-CO/L',
        filingDate: '2026-07-02',
        status: 'Scrutiny In Progress',
        assignedCounsel: 'Adv. Vikas Verma'
      }
    ];
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Form states - Trademark Modal
  const [showAddTm, setShowAddTm] = useState(false);
  const [tmClient, setTmClient] = useState('');
  const [tmBrand, setTmBrand] = useState('');
  const [tmClass, setTmClass] = useState('35');
  const [tmApplNo, setTmApplNo] = useState('');
  const [tmStage, setTmStage] = useState<V2TrademarkClient['stage']>('Applied');
  const [tmApplyDate, setTmApplyDate] = useState('2026-06-01');
  const [tmAttorneyId, setTmAttorneyId] = useState('');

  // Form states - Copyright Modal
  const [showAddCp, setShowAddCp] = useState(false);
  const [cpTitle, setCpTitle] = useState('');
  const [cpCategory, setCpCategory] = useState<CopyrightRecord['category']>('Software Code');
  const [cpAuthor, setCpAuthor] = useState('');
  const [cpOwner, setCpOwner] = useState('');
  const [cpDiary, setCpDiary] = useState('');
  const [cpDate, setCpDate] = useState('2026-07-15');
  const [cpStatus, setCpStatus] = useState<CopyrightRecord['status']>('Diary Number Issued');
  const [cpCounsel, setCpCounsel] = useState('');

  // Selected item for drawer/details
  const [selectedTm, setSelectedTm] = useState<V2TrademarkClient | null>(null);
  const [selectedCp, setSelectedCp] = useState<CopyrightRecord | null>(null);

  const isAdmin = !currentUser || currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const tmEmployees = useMemo(() => getEmployeesWithModuleAccess('trademark_ip'), []);

  const accessibleTrademarks = useMemo(() => {
    if (isAdmin) return trademarks;
    return trademarks.filter(tm => isClientAssignedToUser(tm.assignedEmployeeId, tm.assignedEmployeeName, currentUser));
  }, [trademarks, currentUser, isAdmin]);

  const accessibleCopyrights = useMemo(() => {
    if (isAdmin) return copyrights;
    return copyrights.filter(cp => isClientAssignedToUser((cp as any).assignedEmployeeId, (cp as any).assignedEmployeeName || cp.assignedCounsel, currentUser));
  }, [copyrights, currentUser, isAdmin]);

  // Compute live trademark stats
  const stats = useMemo(() => {
    const total = accessibleTrademarks.length;
    const applied = accessibleTrademarks.filter(t => t.stage === 'Applied').length;
    const objected = accessibleTrademarks.filter(t => t.stage === 'Objected').length;
    const hearings = accessibleTrademarks.filter(t => t.stage === 'Hearing').length;
    const approved = accessibleTrademarks.filter(t => t.stage === 'Approved').length;
    const totalCopyrights = accessibleCopyrights.length;
    const copyrightsRegistered = accessibleCopyrights.filter(c => c.status === 'Registered Certificate Issued').length;

    return {
      total,
      applied,
      objected,
      hearings,
      approved,
      totalCopyrights,
      copyrightsRegistered,
      successRate: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  }, [accessibleTrademarks, accessibleCopyrights]);

  // Filtered Trademark list
  const filteredTrademarks = useMemo(() => {
    return accessibleTrademarks.filter(tm => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          tm.brandName.toLowerCase().includes(q) ||
          tm.clientName.toLowerCase().includes(q) ||
          tm.applNo.toLowerCase().includes(q) ||
          tm.classNumber.includes(q)
        );
        if (!matches) return false;
      }

      // Class filter
      if (classFilter !== 'ALL' && tm.classNumber !== classFilter) {
        return false;
      }

      // Stage filter
      if (stageFilter !== 'ALL' && tm.stage !== stageFilter) {
        return false;
      }

      return true;
    });
  }, [accessibleTrademarks, searchQuery, classFilter, stageFilter]);

  // Objections subset
  const objectedTrademarks = useMemo(() => {
    return accessibleTrademarks.filter(tm => tm.stage === 'Objected');
  }, [accessibleTrademarks]);

  // Hearings subset
  const hearingTrademarks = useMemo(() => {
    return accessibleTrademarks.filter(tm => tm.stage === 'Hearing');
  }, [accessibleTrademarks]);

  // Approved subset
  const registeredTrademarks = useMemo(() => {
    return accessibleTrademarks.filter(tm => tm.stage === 'Approved');
  }, [accessibleTrademarks]);

  // Actions
  const handleCreateTrademark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmClient.trim() || !tmBrand.trim() || !tmApplNo.trim()) {
      alert('Client Name, Brand Name, and Application Number are required.');
      return;
    }
    const added = addV2Trademark({
      clientName: tmClient.trim(),
      brandName: tmBrand.trim(),
      classNumber: tmClass,
      applNo: tmApplNo.trim(),
      stage: tmStage,
      dateOfApply: tmApplyDate,
      attorneyId: tmAttorneyId
    });
    setTrademarks(prev => [...prev, added]);
    setShowAddTm(false);
    // Reset Form
    setTmClient(''); setTmBrand(''); setTmApplNo(''); setTmAttorneyId('');
  };

  const handleUpdateTmStage = (id: string, newStage: V2TrademarkClient['stage']) => {
    const list = [...trademarks];
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx].stage = newStage;
      setTrademarks(list);
      // Save in persistent storage
      setStorageString('efilingg_crm_v2_trademarks', JSON.stringify(list));
      if (selectedTm && selectedTm.id === id) {
        setSelectedTm({ ...selectedTm, stage: newStage });
      }
    }
  };

  const handleCreateCopyright = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpTitle.trim() || !cpOwner.trim() || !cpDiary.trim()) {
      alert('Work Title, Owner Name, and Diary Number are required.');
      return;
    }
    const newRecord: CopyrightRecord = {
      id: `CP-${Date.now().toString().slice(-4)}`,
      workTitle: cpTitle.trim(),
      category: cpCategory,
      authorName: cpAuthor.trim() || cpOwner.trim(),
      ownerName: cpOwner.trim(),
      diaryNumber: cpDiary.trim(),
      filingDate: cpDate,
      status: cpStatus,
      assignedCounsel: cpCounsel.trim() || 'Internal IP Legal Team'
    };
    const updated = [newRecord, ...copyrights];
    setCopyrights(updated);
    setStorageString(STORAGE_KEY_COPYRIGHTS, JSON.stringify(updated));
    setShowAddCp(false);
    // Reset form
    setCpTitle(''); setCpAuthor(''); setCpOwner(''); setCpDiary('');
  };

  const handleUpdateCpStatus = (id: string, newStatus: CopyrightRecord['status']) => {
    const updated = copyrights.map(c => c.id === id ? { ...c, status: newStatus } : c);
    setCopyrights(updated);
    setStorageString(STORAGE_KEY_COPYRIGHTS, JSON.stringify(updated));
  };

  const getStageBadgeColor = (stage: V2TrademarkClient['stage']) => {
    switch (stage) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Objected':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'Hearing':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-5 font-sans select-none text-xs text-slate-800 dark:text-slate-200">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-wide">TRADEMARK & COPYRIGHT REGISTRAR</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                IP INDIA STATUTORY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Autonomous Intellectual Property Registry for Brand Marks, TM Class Filings, Examination Objections, Hearings, and Copyright Dockets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddTm(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Trademark</span>
          </button>
          <button
            onClick={() => setShowAddCp(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Copyright</span>
          </button>
        </div>
      </div>

      {/* 2. Top Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Trademark Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Trademark Applications</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            activeTab === 'applications' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('objections')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'objections'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>Objection Cases</span>
          {stats.objected > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold animate-pulse">
              {stats.objected}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('hearings')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'hearings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="h-4 w-4 text-amber-500" />
          <span>Trademark Hearings</span>
          {stats.hearings > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
              {stats.hearings}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="h-4 w-4 text-emerald-500" />
          <span>Registrations</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            activeTab === 'registrations' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            {stats.approved}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('copyrights')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'copyrights'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="h-4 w-4 text-cyan-500" />
          <span>Copyright Registrations</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            activeTab === 'copyrights' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {stats.totalCopyrights}
          </span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: TRADEMARK DASHBOARD
          ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div 
              onClick={() => { setActiveTab('applications'); setStageFilter('ALL'); }}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-indigo-400 transition cursor-pointer"
            >
              <div className="text-[10px] font-black uppercase text-slate-400">Total Applications</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
              <div className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Active IP Files</div>
            </div>

            <div 
              onClick={() => { setActiveTab('applications'); setStageFilter('Applied'); }}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-blue-400 transition cursor-pointer"
            >
              <div className="text-[10px] font-black uppercase text-slate-400">Applied (In Process)</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.applied}</div>
              <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">Under examination</div>
            </div>

            <div 
              onClick={() => setActiveTab('objections')}
              className="p-3.5 bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 rounded-2xl shadow-2xs hover:border-rose-400 transition cursor-pointer bg-rose-50/10"
            >
              <div className="text-[10px] font-black uppercase text-rose-500">Objection Cases</div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.objected}</div>
              <div className="text-[9.5px] text-rose-500 font-bold mt-0.5">Replies required</div>
            </div>

            <div 
              onClick={() => setActiveTab('hearings')}
              className="p-3.5 bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 rounded-2xl shadow-2xs hover:border-amber-400 transition cursor-pointer bg-amber-50/10"
            >
              <div className="text-[10px] font-black uppercase text-amber-500">Hearings Scheduled</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.hearings}</div>
              <div className="text-[9.5px] text-amber-500 font-bold mt-0.5">Counsel board listed</div>
            </div>

            <div 
              onClick={() => setActiveTab('registrations')}
              className="p-3.5 bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/60 rounded-2xl shadow-2xs hover:border-emerald-400 transition cursor-pointer bg-emerald-50/10"
            >
              <div className="text-[10px] font-black uppercase text-emerald-500">Registered ® Marks</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</div>
              <div className="text-[9.5px] text-emerald-600 font-bold mt-0.5">Certificates granted</div>
            </div>

            <div 
              onClick={() => setActiveTab('copyrights')}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-cyan-400 transition cursor-pointer"
            >
              <div className="text-[10px] font-black uppercase text-cyan-500">Copyright Dockets</div>
              <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{stats.totalCopyrights}</div>
              <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">Software & Literary</div>
            </div>
          </div>

          {/* Trademark Pipeline & Class Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left 2 Columns: Trademark Application Stage Pipeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Statutory Trademark Filing Pipeline</h3>
                  <p className="text-[10.5px] text-slate-400">Progression from Initial Filing (Form TM-A) to Registered Certificate Grant (Form TM-R).</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {stats.total} Active Cases
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase">1. Applied</span>
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-blue-800 dark:text-blue-200 mt-1.5">{stats.applied}</div>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1">Form TM-A verified & allocation to Examiner.</p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase">2. Objected</span>
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-rose-800 dark:text-rose-200 mt-1.5">{stats.objected}</div>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1">Sec 9 / 11 report issued; response within 30 days.</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase">3. Hearing</span>
                    <Scale className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1.5">{stats.hearings}</div>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1">Oral submission before Registrar of Trademarks.</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase">4. Approved ®</span>
                    <Award className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1.5">{stats.approved}</div>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1">TM Journal published & Certificate sealed.</p>
                </div>
              </div>

              {/* Recent Applications Quick Glance */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">Recent Trademark Applications</h4>
                  <button 
                    onClick={() => setActiveTab('applications')}
                    className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All ({trademarks.length})</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trademarks.slice(0, 4).map(tm => {
                    const counsel = attorneys.find(a => a.id === tm.attorneyId);
                    return (
                      <div key={tm.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                            {tm.classNumber}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{tm.brandName}</span>
                              <span className="font-mono text-[9.5px] text-slate-400 font-normal">({tm.applNo})</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Applicant: <span className="font-semibold text-slate-600 dark:text-slate-300">{tm.clientName}</span> • Counsel: {counsel ? counsel.name : 'Unassigned'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 border rounded-lg text-[9.5px] font-bold ${getStageBadgeColor(tm.stage)}`}>
                            {tm.stage}
                          </span>
                          <button
                            onClick={() => { setSelectedTm(tm); setActiveTab('applications'); }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Trademark Counsel Registry & Class Breakdown */}
            <div className="space-y-4">
              {/* Trademark Attorneys Registry */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-indigo-500" />
                    <span>Representing Counsels</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {attorneys.length} Attorneys
                  </span>
                </div>

                <div className="space-y-2">
                  {attorneys.map(att => {
                    const assignedCases = trademarks.filter(t => t.attorneyId === att.id).length;
                    return (
                      <div key={att.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{att.name}</div>
                          <div className="text-[9.5px] text-slate-400 font-mono">Code: {att.attorneyCode} • {att.email}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
                            {assignedCases} Cases
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Class Categories Summary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2.5">
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Popular Trademark Classes</h3>
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Class 35</span>
                    <p className="text-[9px] text-slate-400">Advertising & Business</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Class 42</span>
                    <p className="text-[9px] text-slate-400">SaaS & Technology</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Class 9</span>
                    <p className="text-[9px] text-slate-400">Software & Electronics</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Class 25</span>
                    <p className="text-[9px] text-slate-400">Clothing & Apparel</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: TRADEMARK APPLICATIONS
          ========================================================================= */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search brand, client, app no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-60"
                />
              </div>

              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="ALL">All Stages</option>
                <option value="Applied">Applied</option>
                <option value="Objected">Objected</option>
                <option value="Hearing">Hearing</option>
                <option value="Approved">Approved / Registered</option>
              </select>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="ALL">All Classes (1-45)</option>
                <option value="35">Class 35 (Business/Ad)</option>
                <option value="42">Class 42 (Software/Tech)</option>
                <option value="9">Class 9 (Electronics)</option>
                <option value="25">Class 25 (Apparel)</option>
                <option value="5">Class 5 (Pharma)</option>
                <option value="41">Class 41 (Education)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddTm(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create Trademark Case</span>
            </button>
          </div>

          {/* Applications Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-200/80 dark:border-slate-800 text-[10px]">
                    <th className="p-3.5 pl-5">Brand & Client Profile</th>
                    <th className="p-3.5">IP Class</th>
                    <th className="p-3.5">Application No</th>
                    <th className="p-3.5">Filing Date</th>
                    <th className="p-3.5">Assigned Attorney</th>
                    <th className="p-3.5">Current Stage</th>
                    <th className="p-3.5 pr-5 text-right">Quick Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                  {filteredTrademarks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No trademark records match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTrademarks.map(tm => {
                      const counsel = attorneys.find(a => a.id === tm.attorneyId);
                      return (
                        <tr key={tm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 pl-5">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs">{tm.brandName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">Applicant: {tm.clientName}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50">
                              Class {tm.classNumber}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {tm.applNo}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">
                            {tm.dateOfApply}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">
                              {counsel ? counsel.name : 'Unassigned'}
                            </div>
                            {counsel && (
                              <div className="text-[9.5px] text-slate-400 font-mono">Code: {counsel.attorneyCode}</div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 border rounded-lg text-[9.5px] font-bold ${getStageBadgeColor(tm.stage)}`}>
                              {tm.stage}
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <select
                              value={tm.stage}
                              onChange={e => handleUpdateTmStage(tm.id, e.target.value as any)}
                              className="px-2 py-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Objected">Objected</option>
                              <option value="Hearing">Hearing</option>
                              <option value="Approved">Approved</option>
                            </select>
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

      {/* =========================================================================
          VIEW 3: TRADEMARK OBJECTION CASES
          ========================================================================= */}
      {activeTab === 'objections' && (
        <div className="space-y-4">
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-900 dark:text-rose-100 uppercase">Active Trademark Examination Objections</h3>
                <p className="text-[10.5px] text-rose-700 dark:text-rose-300">
                  Total {objectedTrademarks.length} marks under Section 9 (Absolute Grounds) or Section 11 (Relative Conflict with existing marks). Reply timeline: 30 days from Examination Report.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {objectedTrademarks.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold">No Pending Trademark Objections</p>
                <p className="text-[10px]">All trademark files are either clear or awaiting examination report.</p>
              </div>
            ) : (
              objectedTrademarks.map(tm => {
                const counsel = attorneys.find(a => a.id === tm.attorneyId);
                return (
                  <div key={tm.id} className="p-4 bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/60 rounded-3xl shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{tm.brandName}</span>
                          <span className="px-2 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                            Class {tm.classNumber}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          Applicant: <span className="font-semibold text-slate-700 dark:text-slate-300">{tm.clientName}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-500 text-white animate-pulse">
                        Objected
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Govt Application No:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tm.applNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Assigned Legal Counsel:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{counsel ? counsel.name : 'Unassigned Counsel'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Filing Submission Date:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">{tm.dateOfApply}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <select
                        value={tm.stage}
                        onChange={e => handleUpdateTmStage(tm.id, e.target.value as any)}
                        className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <option value="Objected">Objected (Awaiting Reply)</option>
                        <option value="Hearing">Move to Hearing</option>
                        <option value="Approved">Mark Approved / Clear</option>
                        <option value="Applied">Revert to Applied</option>
                      </select>

                      <button
                        onClick={() => alert(`Examination response draft opened for ${tm.brandName} (${tm.applNo})`)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer"
                      >
                        Draft Reply Notice
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: TRADEMARK HEARINGS
          ========================================================================= */}
      {activeTab === 'hearings' && (
        <div className="space-y-4">
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-100 uppercase">Trademark Hearing Cause List</h3>
                <p className="text-[10.5px] text-amber-700 dark:text-amber-300">
                  Virtual & Physical appearance schedule before the Assistant Registrar / Senior Examiner of Trademarks.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hearingTrademarks.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold">No Scheduled Trademark Hearings</p>
                <p className="text-[10px]">No cases currently listed on the show-cause hearing board.</p>
              </div>
            ) : (
              hearingTrademarks.map(tm => {
                const counsel = attorneys.find(a => a.id === tm.attorneyId);
                return (
                  <div key={tm.id} className="p-4 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{tm.brandName}</span>
                          <span className="px-2 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                            Class {tm.classNumber}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          Applicant: <span className="font-semibold text-slate-700 dark:text-slate-300">{tm.clientName}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500 text-white font-mono">
                        Hearing Board
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Govt Application No:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tm.applNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Attending Legal Counsel:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{counsel ? `${counsel.name} (${counsel.attorneyCode})` : 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Jurisdiction Registry:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">TM Registry Delhi / Virtual Board</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <select
                        value={tm.stage}
                        onChange={e => handleUpdateTmStage(tm.id, e.target.value as any)}
                        className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <option value="Hearing">Hearing Scheduled</option>
                        <option value="Approved">Hearing Concluded (Approved)</option>
                        <option value="Objected">Adjourned / Further Reply</option>
                      </select>

                      <button
                        onClick={() => alert(`Attorney hearing briefing bundle generated for ${tm.brandName}`)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer"
                      >
                        Hearing Briefing Sheet
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: TRADEMARK REGISTRATIONS
          ========================================================================= */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 uppercase">Registered Trademark Certificates (® Marks)</h3>
                <p className="text-[10.5px] text-emerald-700 dark:text-emerald-300">
                  Total {registeredTrademarks.length} certified brand marks with active 10-year statutory protection under the Trade Marks Act, 1999.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registeredTrademarks.map(tm => (
              <div key={tm.id} className="p-4 bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 rounded-3xl shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 dark:text-white text-sm">{tm.brandName}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">®</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Registered to: <span className="font-semibold text-slate-700 dark:text-slate-300">{tm.clientName}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                    Class {tm.classNumber}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration Certificate No:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tm.applNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date of Grant / Registration:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{tm.dateOfApply}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next 10-Year Renewal:</span>
                    <span className="font-mono font-bold text-emerald-600">2036 (Active)</span>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading Certificate Dossier for ${tm.brandName}`)}
                  className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-xl font-bold text-[10.5px] transition cursor-pointer flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Registration Certificate</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 6: COPYRIGHT REGISTRATIONS
          ========================================================================= */}
      {activeTab === 'copyrights' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Copyright & Intellectual Property Works</h3>
              <p className="text-[10.5px] text-slate-400">Statutory copyright dockets under the Copyright Act, 1957 for Software Code, Logos, Literary, and Media assets.</p>
            </div>

            <button
              onClick={() => setShowAddCp(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Copyright Filing</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-200/80 dark:border-slate-800 text-[10px]">
                    <th className="p-3.5 pl-5">Work Title & Category</th>
                    <th className="p-3.5">Owner / Applicant</th>
                    <th className="p-3.5">Author / Creator</th>
                    <th className="p-3.5">Diary Number</th>
                    <th className="p-3.5">Filing Date</th>
                    <th className="p-3.5">Current ROC Status</th>
                    <th className="p-3.5 pr-5 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                  {accessibleCopyrights.map(cp => (
                    <tr key={cp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5 pl-5">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">{cp.workTitle}</div>
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {cp.category}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {cp.ownerName}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {cp.authorName}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {cp.diaryNumber}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {cp.filingDate}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${
                          cp.status === 'Registered Certificate Issued'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {cp.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <select
                          value={cp.status}
                          onChange={e => handleUpdateCpStatus(cp.id, e.target.value as any)}
                          className="px-2 py-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          <option value="Diary Number Issued">Diary Number Issued</option>
                          <option value="Formalities Check Pass">Formalities Check Pass</option>
                          <option value="Awaiting Objection">Awaiting Objection</option>
                          <option value="Scrutiny In Progress">Scrutiny In Progress</option>
                          <option value="Registered Certificate Issued">Registered Certificate Issued</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE TRADEMARK CASE
          ========================================================================= */}
      {showAddTm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateTrademark} className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Create New Trademark Case File</h3>
              </div>
              <button type="button" onClick={() => setShowAddTm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Applicant / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Financial Solutions LLP"
                  value={tmClient}
                  onChange={e => setTmClient(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Brand / Mark Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APEXFLOW"
                  value={tmBrand}
                  onChange={e => setTmBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Class Number (1-45) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 35 or 42"
                  value={tmClass}
                  onChange={e => setTmClass(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Govt Application No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TM-1941294"
                  value={tmApplNo}
                  onChange={e => setTmApplNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Application Stage *</label>
                <select
                  value={tmStage}
                  onChange={e => setTmStage(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="Applied">Applied (Under Process)</option>
                  <option value="Objected">Objected (Examination Report Issued)</option>
                  <option value="Hearing">Hearing Scheduled (Active Show-Cause)</option>
                  <option value="Approved">Approved / Registered ®</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Representing Attorney</label>
                <select
                  value={tmAttorneyId}
                  onChange={e => setTmAttorneyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="">-- Choose Attorney --</option>
                  {attorneys.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Code: {a.attorneyCode})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Filing / Submission Date</label>
                <input
                  type="date"
                  value={tmApplyDate}
                  onChange={e => setTmApplyDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddTm(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Save Trademark Docket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CREATE COPYRIGHT FILING
          ========================================================================= */}
      {showAddCp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCopyright} className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-cyan-600" />
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Create New Copyright Filing Docket</h3>
              </div>
              <button type="button" onClick={() => setShowAddCp(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Title of Work *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Microservices Accounting Backend Engine"
                  value={cpTitle}
                  onChange={e => setCpTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Work Category *</label>
                <select
                  value={cpCategory}
                  onChange={e => setCpCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="Software Code">Software Code / Source Scripts</option>
                  <option value="Artistic Logo">Artistic Logo / Graphic Design</option>
                  <option value="Literary Work">Literary Work / Manual / Book</option>
                  <option value="Cinematograph">Cinematograph / Video Presentation</option>
                  <option value="Sound Recording">Sound Recording / Audio</option>
                  <option value="Website UI">Website UI & Layout Architecture</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Diary Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 17290/2026-CO/SW"
                  value={cpDiary}
                  onChange={e => setCpDiary(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Owner / Applicant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Digital Corp Pvt Ltd"
                  value={cpOwner}
                  onChange={e => setCpOwner(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Author / Creator Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Engineer / Designer"
                  value={cpAuthor}
                  onChange={e => setCpAuthor(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Filing Date</label>
                <input
                  type="date"
                  value={cpDate}
                  onChange={e => setCpDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Current Status</label>
                <select
                  value={cpStatus}
                  onChange={e => setCpStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="Diary Number Issued">Diary Number Issued</option>
                  <option value="Formalities Check Pass">Formalities Check Pass</option>
                  <option value="Awaiting Objection">Awaiting Objection</option>
                  <option value="Scrutiny In Progress">Scrutiny In Progress</option>
                  <option value="Registered Certificate Issued">Registered Certificate Issued</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddCp(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Save Copyright Docket
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
