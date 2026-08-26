/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, Plus, Search, Filter, Download, Users, 
  ShieldCheck, AlertCircle, KeyRound, CheckCircle, Clock,
  Eye, EyeOff, Edit2, Trash2, ArrowRight, UserCheck, BarChart3,
  X, Check, AlertTriangle, FileSpreadsheet, Briefcase, User, Landmark
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { 
  V2ItrClient, 
  getV2ItrClients, 
  addV2ItrClient, 
  updateV2ItrClient, 
  deleteV2ItrClient,
  getV2TaxAuditClients,
  saveV2TaxAuditOverride,
  getV2TaxAuditOverrides,
  exportToCSVFile,
  getV1Employees
} from '../../lib/v2_db';
import { getCurrentSession, setStorageString } from '../../lib/db';

interface V2ITRProps {
  key?: string;
  initialSubTab?: 'dashboard' | 'itr' | 'individual' | 'business' | 'audit';
  initialShowAddItr?: boolean;
}

export default function V2ITR({
  initialSubTab = 'dashboard',
  initialShowAddItr = false
}: V2ITRProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'filing' | 'audit'>(
    initialSubTab === 'audit' ? 'audit' : initialSubTab === 'dashboard' ? 'dashboard' : 'filing'
  );
  const [itrCategoryFilter, setItrCategoryFilter] = useState<'ALL' | 'INDIVIDUAL' | 'BUSINESS'>(
    initialSubTab === 'individual' ? 'INDIVIDUAL' : initialSubTab === 'business' ? 'BUSINESS' : 'ALL'
  );

  const [itrClients, setItrClients] = useState<V2ItrClient[]>(getV2ItrClients());
  const [taxAuditOverrides, setTaxAuditOverrides] = useState<Record<string, any>>(getV2TaxAuditOverrides());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allEmployees] = useState(getV1Employees());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('ALL');

  // Modals & Forms
  const [showAddItr, setShowAddItr] = useState(initialShowAddItr);
  const [editingItrClient, setEditingItrClient] = useState<V2ItrClient | null>(null);
  const [transferringItrClient, setTransferringItrClient] = useState<V2ItrClient | null>(null);

  // Add ITR Form
  const [itrName, setItrName] = useState('');
  const [itrTypeCategory, setItrTypeCategory] = useState<'INDIVIDUAL' | 'COMPANY' | 'FIRM' | 'HUF'>('INDIVIDUAL');
  const [itrPan, setItrPan] = useState('');
  const [itrItrType, setItrItrType] = useState<V2ItrClient['typeOfItr']>('ITR-1');
  const [itrAddress, setItrAddress] = useState('');
  const [itrITPass, setItrITPass] = useState('');
  const [itrIsAudit, setItrIsAudit] = useState(false);
  const [itrEmail, setItrEmail] = useState('');
  const [itrMobile, setItrMobile] = useState('');
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');

  // Expandable views
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const taxAudits = getV2TaxAuditClients();

  // Role-based filtering: Master Admin sees all (with optional employee filter), Employee strictly sees allotted clients
  const roleBaseFilteredClients = itrClients.filter(c => {
    if (!isAdmin && currentUser) {
      // Employee strict filter
      return c.assignedEmployeeId === currentUser.id;
    }
    // Admin filter
    if (selectedEmployeeFilter !== 'ALL') {
      if (selectedEmployeeFilter === 'UNASSIGNED') {
        return !c.assignedEmployeeId;
      }
      return c.assignedEmployeeId === selectedEmployeeFilter;
    }
    return true;
  });

  // Category & Status filtered ITR list
  const filteredItrClients = roleBaseFilteredClients.filter(c => {
    // Search
    const matchesSearch = 
      c.taxpayerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.panNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.typeOfItr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.assignedEmployeeName && c.assignedEmployeeName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Category Tab
    if (itrCategoryFilter === 'INDIVIDUAL') {
      const isIndividual = ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4'].includes(c.typeOfItr) || c.taxpayerType === 'INDIVIDUAL' || c.taxpayerType === 'HUF';
      if (!isIndividual) return false;
    } else if (itrCategoryFilter === 'BUSINESS') {
      const isBusiness = ['ITR-5', 'ITR-6', 'ITR-7'].includes(c.typeOfItr) || ['COMPANY', 'FIRM', 'TRUST', 'SOCIETY'].includes(c.taxpayerType);
      if (!isBusiness) return false;
    }

    // Status Filter
    if (statusFilter !== 'ALL' && c.itrStatus !== statusFilter) {
      return false;
    }

    return true;
  });

  // Filtered Tax Audits
  const filteredTaxAudits = taxAudits.filter(a => {
    if (!isAdmin && currentUser) {
      if (a.assignedEmployeeId !== currentUser.id) return false;
    } else if (selectedEmployeeFilter !== 'ALL') {
      if (selectedEmployeeFilter === 'UNASSIGNED') {
        if (a.assignedEmployeeId) return false;
      } else if (a.assignedEmployeeId !== selectedEmployeeFilter) {
        return false;
      }
    }

    const matchesSearch = 
      a.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.auditForm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.assignedEmployeeName && a.assignedEmployeeName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (auditStatusFilter !== 'ALL' && a.status !== auditStatusFilter) {
      return false;
    }

    return true;
  });

  // Metrics Calculations
  const totalClientsCount = roleBaseFilteredClients.length;
  const totalFiledCount = roleBaseFilteredClients.filter(c => c.itrStatus === 'FILED').length;
  const totalPendingCount = roleBaseFilteredClients.filter(c => c.itrStatus === 'NOT FILED' || !c.itrStatus).length;
  const totalEVerifyPending = roleBaseFilteredClients.filter(c => c.itrStatus === 'PENDING FOR E-VERIFY').length;
  const totalTaxAuditPendingItr = roleBaseFilteredClients.filter(c => c.itrStatus === 'PENDING FOR TAX AUDIT' || c.isAuditApplicable).length;

  const totalAuditsCount = filteredTaxAudits.length;
  const auditsCompletedCount = filteredTaxAudits.filter(a => a.status === 'COMPLETED').length;
  const auditsPendingCount = totalAuditsCount - auditsCompletedCount;

  // Employee-wise stats mapping for Master Admin
  const employeeWorkloadStats = allEmployees.map(emp => {
    const assignedClients = itrClients.filter(c => c.assignedEmployeeId === emp.id);
    const filed = assignedClients.filter(c => c.itrStatus === 'FILED').length;
    const pending = assignedClients.filter(c => c.itrStatus === 'NOT FILED' || !c.itrStatus).length;
    const auditCount = taxAudits.filter(a => a.assignedEmployeeId === emp.id).length;
    const auditFiled = taxAudits.filter(a => a.assignedEmployeeId === emp.id && a.status === 'COMPLETED').length;
    const completionRate = assignedClients.length > 0 ? Math.round((filed / assignedClients.length) * 100) : 0;

    return {
      employee: emp,
      totalAssigned: assignedClients.length,
      filed,
      pending,
      auditCount,
      auditFiled,
      completionRate
    };
  });

  const unassignedCount = itrClients.filter(c => !c.assignedEmployeeId).length;

  // Handlers
  const handleCreateItr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itrName || !itrPan) {
      alert('Taxpayer Name and PAN Card Number are required.');
      return;
    }

    const empToAssign = isAdmin ? addAssignedEmpId : currentUser?.id;
    const matchedEmployee = allEmployees.find(emp => emp.id === empToAssign);

    const added = addV2ItrClient({
      taxpayerName: itrName,
      taxpayerType: itrTypeCategory,
      panNumber: itrPan.toUpperCase(),
      typeOfItr: itrItrType,
      address: itrAddress,
      itPortalPassword: itrITPass,
      isAuditApplicable: itrIsAudit,
      itrStatus: 'NOT FILED',
      assignedEmployeeId: empToAssign || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : (currentUser ? currentUser.name : undefined),
      emailId: itrEmail || undefined,
      mobileNumber: itrMobile || undefined
    });

    setItrClients([...itrClients, added]);
    setShowAddItr(false);
    // Reset form
    setItrName(''); setItrPan(''); setItrAddress(''); setItrITPass(''); setItrIsAudit(false); setAddAssignedEmpId('');
    setItrEmail(''); setItrMobile('');
  };

  const handleUpdateItrStatus = (id: string, newStatus: V2ItrClient['itrStatus']) => {
    const list = [...itrClients];
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx].itrStatus = newStatus;
      setItrClients(list);
      setStorageString('efilingg_crm_v2_itr_clients', JSON.stringify(list));
    }
  };

  const handleUpdateTaxAuditStatus = (id: string, status: string, empId?: string, empName?: string) => {
    saveV2TaxAuditOverride(id, status, empId, empName);
    setTaxAuditOverrides(getV2TaxAuditOverrides());
  };

  const handleExportItrCSV = () => {
    const headers = ['Taxpayer Name', 'Type/Category', 'PAN Number', 'ITR Form', 'Filing Status', 'Assigned Handler', 'Audit Applicable', 'Email', 'Mobile', 'Address'];
    const rows = filteredItrClients.map(c => [
      c.taxpayerName,
      c.taxpayerType,
      c.panNumber,
      c.typeOfItr,
      c.itrStatus,
      c.assignedEmployeeName || 'Unassigned',
      c.isAuditApplicable ? 'YES (44AB)' : 'NO',
      c.emailId || '',
      c.mobileNumber || '',
      c.address || ''
    ]);
    exportToCSVFile('income_tax_returns_registry.csv', headers, rows);
  };

  const handleExportAuditCSV = () => {
    const headers = ['Taxpayer Client Name', 'Audit Form Schema', 'Taxpayer Code', 'Compliance Status', 'Allocated CA/Staff'];
    const rows = filteredTaxAudits.map(a => [
      a.clientName,
      a.auditForm,
      a.taxpayerType,
      a.status,
      a.assignedEmployeeName || 'Unassigned'
    ]);
    exportToCSVFile('tax_audit_3cd_register.csv', headers, rows);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Income Tax Compliance & E-Filing Management
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                {isAdmin ? 'Master Admin Control Desk' : `Employee Desk · ${currentUser?.name || 'Staff'}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdmin 
                ? 'Centralized Income Tax operations desk: Employee-wise client allocation, ITR filing monitoring, and Tax Audit (Form 3CD) tracking.'
                : 'Your allotted Income Tax returns, manual client registrations, filing status trackers, and Tax Audit filings.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={activeTab === 'audit' ? handleExportAuditCSV : handleExportItrCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export Register
            </button>
            <button
              onClick={() => setShowAddItr(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Manual Client
            </button>
          </div>
        </div>

        {/* Primary Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isAdmin ? 'Total ITR Clients' : 'My Allotted Clients'}
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{totalClientsCount}</span>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">ITR Filed</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{totalFiledCount}</span>
          </div>

          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">ITR Pending</span>
            <span className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5 block">{totalPendingCount}</span>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Tax Audit Required</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5 block">{totalAuditsCount}</span>
          </div>

          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Audit Filed / Pending</span>
            <span className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 block">
              <span className="text-emerald-600 dark:text-emerald-400">{auditsCompletedCount}</span> / <span className="text-rose-600 dark:text-rose-400">{auditsPendingCount}</span>
            </span>
          </div>
        </div>

        {/* View Mode Switching Tabs (Clean 3-way toggle: Dashboard, ITR Filing Desk, Tax Audit Desk) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Employee-Wise Allocation Deck
              </button>
            )}
            <button
              onClick={() => setActiveTab('filing')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'filing'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" /> ITR Filing Registry ({roleBaseFilteredClients.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Tax Audit Management (Form 3CD) ({totalAuditsCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search taxpayer name, PAN, handler..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* MASTER ADMIN: EMPLOYEE-WISE TRACKING & WORKLOAD ALLOCATION DECK */}
      {isAdmin && activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" /> Employee-Wise Client Tracking & Allocation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time visibility into client distribution across staff members, completion rates, and active Tax Audits.
                </p>
              </div>

              {unassignedCount > 0 && (
                <div className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> {unassignedCount} Unassigned Clients Pending Allocation
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-400 uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 pl-4">Staff Member / CA</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Assigned Clients</th>
                    <th className="p-3">Filed</th>
                    <th className="p-3">Pending</th>
                    <th className="p-3">Tax Audits</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3 pr-4 text-right">Quick Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {employeeWorkloadStats.map(({ employee, totalAssigned, filed, pending, auditCount, auditFiled, completionRate }) => (
                    <tr 
                      key={employee.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition ${
                        selectedEmployeeFilter === employee.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 pl-4">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-[10px]">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <div>{employee.name}</div>
                            <span className="text-[9px] font-mono text-slate-400 font-semibold">{employee.employeeCode || 'EMP-STF'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                        {employee.designation || (employee.role === 'admin' ? 'Managing Director' : 'Compliance Associate')}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black rounded-md font-mono text-xs">
                          {totalAssigned}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold rounded-md font-mono text-[11px]">
                          {filed}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold rounded-md font-mono text-[11px]">
                          {pending}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold rounded-md font-mono text-[11px]">
                          {auditFiled}/{auditCount}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-500">{completionRate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeFilter(selectedEmployeeFilter === employee.id ? 'ALL' : employee.id);
                            setActiveTab('filing');
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          View Clients &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Unassigned row */}
                  {unassignedCount > 0 && (
                    <tr className="bg-rose-50/30 dark:bg-rose-950/20">
                      <td className="p-3 pl-4 font-bold text-rose-700 dark:text-rose-400">🔴 Unassigned Pool</td>
                      <td className="p-3 text-slate-500">Unallocated</td>
                      <td className="p-3 font-bold font-mono text-rose-700">{unassignedCount}</td>
                      <td className="p-3 font-mono text-slate-500">-</td>
                      <td className="p-3 font-mono text-rose-700">{unassignedCount}</td>
                      <td className="p-3 font-mono text-slate-500">-</td>
                      <td className="p-3 font-mono text-rose-700">0%</td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeFilter('UNASSIGNED');
                            setActiveTab('filing');
                          }}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Allocate Now &rarr;
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ITR FILING REGISTRY */}
      {activeTab === 'filing' && (
        <div className="space-y-4">
          {/* Sub-Filters: Category & Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setItrCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  itrCategoryFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Taxpayers
              </button>
              <button
                onClick={() => setItrCategoryFilter('INDIVIDUAL')}
                className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                  itrCategoryFilter === 'INDIVIDUAL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <User className="h-3 w-3" /> Individual (ITR-1/2/3/4)
              </button>
              <button
                onClick={() => setItrCategoryFilter('BUSINESS')}
                className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                  itrCategoryFilter === 'BUSINESS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Briefcase className="h-3 w-3" /> Business & Corporate (ITR-5/6/7)
              </button>
            </div>

            {/* Status dropdown & Employee filter */}
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Staff:</span>
                  <select
                    value={selectedEmployeeFilter}
                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                  >
                    <option value="ALL">All Staff Members</option>
                    <option value="UNASSIGNED">🔴 Unassigned Only</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="ALL">All Filing Statuses</option>
                  <option value="NOT FILED">Not Filed (Pending)</option>
                  <option value="FILED">Filed</option>
                  <option value="PENDING FOR E-VERIFY">Pending for E-Verify</option>
                  <option value="PENDING FOR TAX AUDIT">Pending for Tax Audit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Taxpayers Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-400 uppercase text-[10px] border-b border-slate-100 dark:border-slate-800 select-none">
                  <th className="p-3.5 pl-5">Taxpayer Client</th>
                  <th className="p-3.5">PAN Number</th>
                  <th className="p-3.5">ITR Form</th>
                  <th className="p-3.5">Filing Status</th>
                  <th className="p-3.5">Assigned Handler</th>
                  <th className="p-3.5">Portal Credentials</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItrClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No ITR client records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredItrClients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/30 transition">
                      <td className="p-3.5 pl-5">
                        <div className="font-black text-slate-900 dark:text-slate-100">{c.taxpayerName}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-bold">
                            {c.taxpayerType}
                          </span>
                          {c.isAuditApplicable && (
                            <span className="text-[8.5px] uppercase font-bold px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded">
                              44AB Audit
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {c.panNumber}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md border border-indigo-200/60 dark:border-indigo-900/60">
                          {c.typeOfItr}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <select
                          value={c.itrStatus}
                          onChange={(e) => handleUpdateItrStatus(c.id, e.target.value as any)}
                          className={`p-1 font-bold text-[10.5px] rounded-lg border focus:ring-0 cursor-pointer ${
                            c.itrStatus === 'FILED' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' 
                              : c.itrStatus === 'PENDING FOR E-VERIFY'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                              : c.itrStatus === 'PENDING FOR TAX AUDIT'
                              ? 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
                              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                          }`}
                        >
                          <option value="NOT FILED">🔴 Not Filed (Pending)</option>
                          <option value="FILED">🟢 Filed</option>
                          <option value="PENDING FOR E-VERIFY">🟡 Pending for E-Verify</option>
                          <option value="PENDING FOR TAX AUDIT">🟣 Pending for Tax Audit</option>
                        </select>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {c.assignedEmployeeName || '🔴 Unassigned'}
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setTransferringItrClient(c)}
                            className="text-[9.5px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold mt-0.5 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Users className="h-2.5 w-2.5" /> Transfer Custody
                          </button>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[9.5px] cursor-pointer"
                          >
                            <KeyRound className="h-3 w-3 text-slate-400" />
                            {visiblePasswords[c.id] ? 'Hide' : 'View Pass'}
                          </button>

                          {visiblePasswords[c.id] && (
                            <div className="absolute left-0 mt-1 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 font-mono text-[10px] space-y-1 min-w-[170px]">
                              <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-400 text-[8px] uppercase">User / PAN:</span>
                                <span className="font-bold text-indigo-600">{c.panNumber}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-[8px] uppercase">IT Password:</span>
                                <span className="font-bold text-emerald-600">{c.itPortalPassword || '••••••••'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItrClient(c)}
                            className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer transition rounded"
                            title="Edit Taxpayer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete ITR Client',
                                  message: `Are you sure you want to delete taxpayer "${c.taxpayerName}" (${c.panNumber})? This action is permanent.`,
                                  onConfirm: () => {
                                    deleteV2ItrClient(c.id);
                                    setItrClients(getV2ItrClients());
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition rounded"
                              title="Delete Client"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAX AUDIT MANAGEMENT DESK (FORM 3CD) */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Section 44AB Tax Audit Registry (Form 3CD / 3CA / 3CB)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track corporate & business audit readiness, balance sheet clearance, and Chartered Accountant allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Audit Status:</span>
              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                <option value="ALL">All Audit Statuses</option>
                <option value="PENDING">Pending (Not Filed)</option>
                <option value="COMPLETED">Completed (Filed)</option>
                <option value="PENDING WITH CA">Pending with CA</option>
                <option value="BALANCE SHEET PENDING">Balance Sheet Pending</option>
                <option value="FORM PENDING">Form Pending</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-400 uppercase text-[10px] border-b border-slate-100 dark:border-slate-800 select-none">
                  <th className="p-3.5 pl-5">Audit Client Name</th>
                  <th className="p-3.5">Taxpayer Type</th>
                  <th className="p-3.5">Audit Form</th>
                  <th className="p-3.5">Allocated CA / Staff</th>
                  <th className="p-3.5">Audit Filing Status</th>
                  <th className="p-3.5 pr-5 text-right">Portal Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTaxAudits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No tax audit files matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTaxAudits.map(aud => (
                    <tr key={aud.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/30 transition">
                      <td className="p-3.5 pl-5 font-black text-slate-900 dark:text-slate-100">
                        {aud.clientName}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-500 uppercase font-mono">{aud.taxpayerType}</span>
                      </td>
                      <td className="p-3.5">
                        {aud.auditForm === 'Form 10B' || aud.auditForm === '10B/10BB' ? (
                          <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900 rounded-md font-extrabold font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Landmark className="h-3 w-3 text-teal-600" />
                            Form 10B (NGO / Trust)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 rounded-md font-extrabold font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Briefcase className="h-3 w-3 text-indigo-600" />
                            Form 3CD (Commercial)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isAdmin ? (
                          <select
                            value={aud.assignedEmployeeId || ''}
                            onChange={e => {
                              const matched = allEmployees.find(emp => emp.id === e.target.value);
                              handleUpdateTaxAuditStatus(aud.id, aud.status, e.target.value, matched ? matched.name : undefined);
                            }}
                            className="p-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-bold"
                          >
                            <option value="">🔴 Unassigned</option>
                            {allEmployees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {aud.assignedEmployeeName || 'Assigned to You'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <select
                          value={aud.status}
                          onChange={e => handleUpdateTaxAuditStatus(aud.id, e.target.value, aud.assignedEmployeeId, aud.assignedEmployeeName)}
                          className="p-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-bold"
                        >
                          <option value="PENDING">🔴 Pending (Not Filed)</option>
                          <option value="COMPLETED">🟢 Completed (Filed)</option>
                          <option value="PENDING WITH CA">🟡 Pending with CA</option>
                          <option value="BALANCE SHEET PENDING">🟣 Balance Sheet Pending</option>
                          <option value="FORM PENDING">🔵 Form Pending</option>
                        </select>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [aud.id]: !prev[aud.id] }))}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[9.5px] cursor-pointer ml-auto"
                          >
                            <KeyRound className="h-3 w-3 text-slate-400" />
                            {visiblePasswords[aud.id] ? 'Hide' : 'Credentials'}
                          </button>

                          {visiblePasswords[aud.id] && (
                            <div className="absolute right-0 mt-1 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 font-mono text-[10px] space-y-1 min-w-[170px] text-left">
                              <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-400 text-[8px] uppercase">User:</span>
                                <span className="font-bold text-indigo-600">{aud.username || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-[8px] uppercase">Password:</span>
                                <span className="font-bold text-emerald-600">{aud.password || '••••••••'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD MANUAL CLIENT MODAL */}
      {showAddItr && (
        <form onSubmit={handleCreateItr} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-md">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Register New Taxpayer Client
            </h4>
            <button type="button" onClick={() => setShowAddItr(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Taxpayer / Entity Name *</label>
              <input type="text" required value={itrName} onChange={e => setItrName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">PAN Card Number *</label>
              <input type="text" required placeholder="ABCDE1234F" maxLength={10} value={itrPan} onChange={e => setItrPan(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Taxpayer Entity Category</label>
              <select value={itrTypeCategory} onChange={e => setItrTypeCategory(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="INDIVIDUAL">Individual Taxpayer</option>
                <option value="FIRM">Partnership Firm / LLP</option>
                <option value="COMPANY">Private Limited / Company</option>
                <option value="HUF">Hindu Undivided Family (HUF)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">ITR Form Schema *</label>
              <select value={itrItrType} onChange={e => setItrItrType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="ITR-1">ITR-1 (Sahaj - Salary / 1 House)</option>
                <option value="ITR-2">ITR-2 (Capital Gains & Multiple Houses)</option>
                <option value="ITR-3">ITR-3 (Proprietorship & Business PGBP)</option>
                <option value="ITR-4">ITR-4 (Sugam - Presumptive 44AD/AE)</option>
                <option value="ITR-5">ITR-5 (LLP, AOP, BOI, Firm)</option>
                <option value="ITR-6">ITR-6 (Corporate / Companies)</option>
                <option value="ITR-7">ITR-7 (Trusts, Societies, Section 8)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Password</label>
              <input type="text" value={itrITPass} onChange={e => setItrITPass(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Email ID</label>
              <input type="email" value={itrEmail} onChange={e => setItrEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</label>
              <input type="tel" value={itrMobile} onChange={e => setItrMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            {isAdmin && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Assign Handler / CA</label>
                <select 
                  value={addAssignedEmpId} 
                  onChange={e => setAddAssignedEmpId(e.target.value)} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="">-- Choose Handler --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-5">
              <input 
                type="checkbox" 
                id="auditCheckModal" 
                checked={itrIsAudit} 
                onChange={e => setItrIsAudit(e.target.checked)} 
                className="h-4 w-4 rounded text-indigo-600" 
              />
              <label htmlFor="auditCheckModal" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Requires Section 44AB Tax Audit
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Residential / Office Address</label>
            <input type="text" value={itrAddress} onChange={e => setItrAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddItr(false)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
            <button type="submit" className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Save Taxpayer</button>
          </div>
        </form>
      )}

      {/* TRANSFER ITR CUSTODY MODAL */}
      {transferringItrClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" /> Transfer ITR Client Custody
              </h3>
              <button type="button" onClick={() => setTransferringItrClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringItrClient.taxpayerName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">PAN: {transferringItrClient.panNumber} • Form: {transferringItrClient.typeOfItr}</div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{transferringItrClient.assignedEmployeeName || '🔴 Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pick New ITR Handler *</label>
              <select 
                defaultValue={transferringItrClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = allEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringItrClient.assignedEmployeeId = employee.id;
                    transferringItrClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringItrClient.assignedEmployeeId = undefined;
                    transferringItrClient.assignedEmployeeName = undefined;
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                <option value="">-- No Assignment --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setTransferringItrClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2ItrClient(transferringItrClient);
                  setItrClients(getV2ItrClients());
                  setTransferringItrClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITR CLIENT MODAL */}
      {editingItrClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-600" /> Modify ITR Client Profile
              </h3>
              <button type="button" onClick={() => setEditingItrClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Taxpayer Name *</label>
                <input 
                  type="text" 
                  value={editingItrClient.taxpayerName} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, taxpayerName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">PAN Card Number *</label>
                <input 
                  type="text" 
                  value={editingItrClient.panNumber} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, panNumber: e.target.value.toUpperCase() })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Password</label>
                <input 
                  type="text" 
                  value={editingItrClient.itPortalPassword || ''} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, itPortalPassword: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Contact Email ID</label>
                <input 
                  type="email" 
                  value={editingItrClient.emailId || ''} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, emailId: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Contact Mobile Number</label>
                <input 
                  type="text" 
                  value={editingItrClient.mobileNumber || ''} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, mobileNumber: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Residential Address</label>
                <input 
                  type="text" 
                  value={editingItrClient.address || ''} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, address: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">ITR Filing Status *</label>
                <select 
                  value={editingItrClient.itrStatus} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, itrStatus: e.target.value as any })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="NOT FILED">Not Filed</option>
                  <option value="FILED">Filed</option>
                  <option value="PENDING FOR E-VERIFY">Pending for E-Verify</option>
                  <option value="PENDING FOR TAX AUDIT">Pending for Tax Audit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Type of ITR Form</label>
                <select 
                  value={editingItrClient.typeOfItr} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, typeOfItr: e.target.value as any })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="ITR-1">ITR-1 (Sahaj)</option>
                  <option value="ITR-2">ITR-2 (Capital Gains)</option>
                  <option value="ITR-3">ITR-3 (Proprietorship)</option>
                  <option value="ITR-4">ITR-4 (Sugam)</option>
                  <option value="ITR-5">ITR-5 (Firms/LLPs)</option>
                  <option value="ITR-6">ITR-6 (Companies)</option>
                  <option value="ITR-7">ITR-7 (Trusts/NGOs)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:col-span-2">
                <input 
                  type="checkbox" 
                  id="edit_audit_applicable" 
                  checked={editingItrClient.isAuditApplicable} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, isAuditApplicable: e.target.checked })} 
                  className="h-4 w-4 rounded text-indigo-600" 
                />
                <label htmlFor="edit_audit_applicable" className="text-xs font-bold text-slate-700 dark:text-slate-300">Requires Tax Audit (44AB)?</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setEditingItrClient(null)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2ItrClient(editingItrClient);
                  setItrClients(getV2ItrClients());
                  setEditingItrClient(null);
                }} 
                className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
