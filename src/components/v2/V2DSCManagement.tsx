/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Search, Download, AlertTriangle, CheckCircle, 
  Clock, ShieldAlert, Edit2, Trash2, Calendar, Users, X
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { 
  V2DscClient, 
  getV2DscClients, 
  addV2DscClient, 
  updateV2DscClient, 
  deleteV2DscClient,
  exportToCSVFile,
  getV1Employees,
  getV2McaClients
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';

interface V2DSCManagementProps {
  key?: string;
  initialFilter?: string;
  initialShowAdd?: boolean;
  initialShowAddDsc?: boolean;
}

export default function V2DSCManagement({
  initialFilter = 'ALL',
  initialShowAdd = false,
  initialShowAddDsc = false
}: V2DSCManagementProps) {
  const [dscClients, setDscClients] = useState<V2DscClient[]>(getV2DscClients());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allEmployees] = useState(getV1Employees());

  // Search & Filter
  const [dscFilter, setDscFilter] = useState('');
  const [dscFilterDropdown, setDscFilterDropdown] = useState<string>(initialFilter);

  // Form & Modals
  const [showAddDsc, setShowAddDsc] = useState(initialShowAdd || initialShowAddDsc);
  const [editingDscClient, setEditingDscClient] = useState<V2DscClient | null>(null);
  const [transferringDscClient, setTransferringDscClient] = useState<V2DscClient | null>(null);
  const [renewalDscClient, setRenewalDscClient] = useState<V2DscClient | null>(null);
  const [renewalIssueDate, setRenewalIssueDate] = useState('');
  const [renewalExpiryDate, setRenewalExpiryDate] = useState('');

  // Form fields
  const [dscName, setDscName] = useState('');
  const [dscFirm, setDscFirm] = useState('');
  const [dscIssue, setDscIssue] = useState('2026-06-01');
  const [dscExpiry, setDscExpiry] = useState('2028-06-01');
  const [dscIssuer, setDscIssuer] = useState<'Prodigisgn' | 'PentaSign' | 'Sify'>('Prodigisgn');
  const [dscToken, setDscToken] = useState<'Proxkey' | 'MToken'>('Proxkey');
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');

  // Confirm Modal
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

  // Cross-reference directors from MCA
  const mcaClients = getV2McaClients();
  const directorNamesWithDSC = new Set(dscClients.map(d => d.clientName.toLowerCase().trim()));
  const missingDscDirectors: Array<V2DscClient | { id: string; clientName: string; firmName: string; isWarning: boolean; issuerName: string; tokenName: string; issueDate: string; expiryDate: string; assignedEmployeeId?: string; assignedEmployeeName?: string }> = [];

  mcaClients.forEach(m => {
    (m.directors || []).forEach((dir, idx) => {
      const dirName = typeof dir === 'string' ? dir : dir?.name;
      if (dirName && !directorNamesWithDSC.has(dirName.toLowerCase().trim())) {
        missingDscDirectors.push({
          id: `mca_missing_${m.id}_${idx}`,
          clientName: dirName,
          firmName: m.clientName,
          issueDate: 'N/A',
          expiryDate: 'N/A',
          issuerName: 'Not Issued',
          tokenName: 'Pending',
          isWarning: true,
          assignedEmployeeId: m.assignedEmployeeId,
          assignedEmployeeName: m.assignedEmployeeName
        });
      }
    });
  });

  const allDisplayDscList = [...dscClients, ...missingDscDirectors];

  const getDaysLeft = (expiryDateStr: string) => {
    if (!expiryDateStr || expiryDateStr === 'N/A') return -999;
    const diff = new Date(expiryDateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const getDscExpiryAlertBadge = (expiryDateStr: string) => {
    const days = getDaysLeft(expiryDateStr);
    if (days < 0) {
      return (
        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold text-[9px] uppercase rounded-md flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> Expired Token ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 90) {
      return (
        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[9px] uppercase rounded-md flex items-center gap-1">
          <Clock className="h-3 w-3" /> Renew in {days} Days
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px] uppercase rounded-md flex items-center gap-1">
        <CheckCircle className="h-3 w-3" /> Active ({days}d remaining)
      </span>
    );
  };

  const filteredDsc = allDisplayDscList.filter(d => {
    if (!isAdmin && currentUser) {
      if (d.assignedEmployeeId !== currentUser.id) return false;
    }

    const matchesSearch = 
      d.clientName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      d.firmName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      d.issuerName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      d.tokenName.toLowerCase().includes(dscFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (dscFilterDropdown === 'ALL') return true;
    if (dscFilterDropdown === 'RENEWAL_PENDING' || dscFilterDropdown === 'EXPIRED') {
      const days = getDaysLeft(d.expiryDate);
      return days < 0;
    }
    if (dscFilterDropdown === 'UPCOMING_RENEWAL') {
      const days = getDaysLeft(d.expiryDate);
      return days >= 0 && days <= 90;
    }
    if (dscFilterDropdown === 'ACTIVE') {
      const days = getDaysLeft(d.expiryDate);
      return days > 90;
    }

    return true;
  });

  // Summary Metrics
  const totalCount = dscClients.length;
  const expiredCount = dscClients.filter(d => getDaysLeft(d.expiryDate) < 0).length;
  const renewalDueCount = dscClients.filter(d => {
    const days = getDaysLeft(d.expiryDate);
    return days >= 0 && days <= 90;
  }).length;
  const activeCount = totalCount - expiredCount - renewalDueCount;

  const handleCreateDsc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dscName || !dscFirm) {
      alert('Representative Name and Firm Name are required.');
      return;
    }
    const empToAssign = isAdmin ? addAssignedEmpId : currentUser?.id;
    const matchedEmployee = allEmployees.find(emp => emp.id === empToAssign);

    const added = addV2DscClient({
      clientName: dscName,
      issueDate: dscIssue,
      expiryDate: dscExpiry,
      issuerName: dscIssuer,
      tokenName: dscToken,
      firmName: dscFirm,
      assignedEmployeeId: empToAssign || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : (currentUser ? currentUser.name : undefined)
    });

    setDscClients([...dscClients, added]);
    setShowAddDsc(false);
    setDscName(''); setDscFirm(''); setAddAssignedEmpId('');
  };

  const handleExportCSV = () => {
    const headers = ['Signatory Representative', 'Organization / Firm', 'Issuer Name', 'Hardware Token', 'Issue Date', 'Expiry Date', 'Status', 'Assigned Handler'];
    const rows = dscClients.map(d => [
      d.clientName,
      d.firmName,
      d.issuerName,
      d.tokenName,
      d.issueDate,
      d.expiryDate,
      getDaysLeft(d.expiryDate) < 0 ? 'Expired' : getDaysLeft(d.expiryDate) <= 90 ? 'Renewal Due' : 'Active',
      d.assignedEmployeeName || 'Unassigned'
    ]);
    exportToCSVFile('dsc_registry.csv', headers, rows);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
                <Key className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Digital Signature Certificate (DSC) Management & Expiry Alerts
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                Hardware Token Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Maintain active alert lists for director and promoter signatures, token hardware logs (MToken/Proxkey), and renewal alarms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setShowAddDsc(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add DSC Record
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total DSC Records</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{totalCount}</span>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Active Valid (&gt;90d)</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{activeCount}</span>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Renewal Due (&le;90d)</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5 block">{renewalDueCount}</span>
          </div>

          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Expired Tokens</span>
            <span className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5 block">{expiredCount}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDscFilterDropdown('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                dscFilterDropdown === 'ALL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Records ({dscClients.length})
            </button>
            <button
              onClick={() => setDscFilterDropdown('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                dscFilterDropdown === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Active Valid ({activeCount})
            </button>
            <button
              onClick={() => setDscFilterDropdown('UPCOMING_RENEWAL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                dscFilterDropdown === 'UPCOMING_RENEWAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Renewal Due ({renewalDueCount})
            </button>
            <button
              onClick={() => setDscFilterDropdown('RENEWAL_PENDING')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                dscFilterDropdown === 'RENEWAL_PENDING'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={dscFilter}
              onChange={(e) => setDscFilter(e.target.value)}
              placeholder="Search signatory, firm, token..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Add DSC Record Form */}
      {showAddDsc && (
        <form onSubmit={handleCreateDsc} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-md">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-2">
              <Plus className="h-4 w-4 text-amber-600" />
              Register New Digital Signature Certificate (DSC)
            </h4>
            <button type="button" onClick={() => setShowAddDsc(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Representative / Signatory Name *</label>
              <input type="text" required value={dscName} onChange={e => setDscName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Organization / Firm Name *</label>
              <input type="text" required placeholder="e.g. InnoTech Solutions Pvt Ltd" value={dscFirm} onChange={e => setDscFirm(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">CCA Certifying Issuer *</label>
              <select value={dscIssuer} onChange={e => setDscIssuer(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="Prodigisgn">Prodigisgn (CCA Approved)</option>
                <option value="PentaSign">PentaSign (CCA Approved)</option>
                <option value="Sify">Sify SafeScrypt (CCA Approved)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Hardware Crypto Token *</label>
              <select value={dscToken} onChange={e => setDscToken(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="Proxkey">Proxkey (USB Crypto Token)</option>
                <option value="MToken">MToken (USB Crypto Token)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">DSC Issue Date *</label>
              <input type="date" value={dscIssue} onChange={e => setDscIssue(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">DSC Expiry Date *</label>
              <input type="date" value={dscExpiry} onChange={e => setDscExpiry(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            {isAdmin && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Assign Handler</label>
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
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddDsc(false)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
            <button type="submit" className="px-4.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer">Save DSC Record</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-800 text-[10px]">
              <th className="p-3.5 pl-5">Signatory Representative</th>
              <th className="p-3.5">Firm / Corporate Account</th>
              <th className="p-3.5">CCA Certify Issuer</th>
              <th className="p-3.5">Crypto Token</th>
              <th className="p-3.5">Validity & Alerts</th>
              <th className="p-3.5">Custody Handler</th>
              <th className="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredDsc.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No DSC records matching current criteria.
                </td>
              </tr>
            ) : (
              filteredDsc.map(ds => {
                const isFwdWarning = 'isWarning' in ds && ds.isWarning;
                return (
                  <tr key={ds.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition ${isFwdWarning ? 'bg-rose-50/15 dark:bg-rose-950/10' : ''}`}>
                    <td className="p-3.5 pl-5 font-black text-slate-850 dark:text-slate-100">
                      <div>{ds.clientName}</div>
                      {isFwdWarning && (
                        <span className="text-[8.5px] text-rose-500 font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md mt-0.5 inline-block leading-none">
                          Forwarded MCA Director
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-600 dark:text-slate-300">{ds.firmName}</td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{ds.issuerName}</td>
                    <td className={`p-3.5 font-mono font-bold ${isFwdWarning ? 'text-slate-400' : 'text-amber-700 dark:text-amber-400'}`}>{ds.tokenName}</td>
                    <td className="p-3.5 space-y-1">
                      {isFwdWarning ? (
                        <div className="space-y-1.5">
                          <div className="flex bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-extrabold text-[9px] uppercase rounded-lg px-2 py-0.5 items-center gap-1 w-fit">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Missing Active DSC
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setDscName(ds.clientName);
                              setDscFirm(ds.firmName);
                              setDscIssue(new Date().toISOString().split('T')[0]);
                              setDscExpiry(new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().split('T')[0]);
                              setShowAddDsc(true);
                            }}
                            className="text-[9px] text-amber-600 dark:text-amber-400 hover:underline font-bold block cursor-pointer"
                          >
                            + Auto Register DSC
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">{getDscExpiryAlertBadge(ds.expiryDate)}</div>
                          <div className="text-[9.5px] text-slate-400 font-mono font-semibold">Issued: {ds.issueDate} • Exp: {ds.expiryDate}</div>
                        </>
                      )}
                    </td>
                    <td className="p-3.5 space-y-1 text-xs">
                      {isFwdWarning ? (
                        <span className="text-slate-400 italic text-[10px]">Auto detected via MCA</span>
                      ) : (
                        <>
                          <div className="font-bold text-slate-700 dark:text-slate-300">
                            {(ds as any).assignedEmployeeName || '🔴 Unassigned'}
                          </div>
                          {isAdmin && (
                            <button 
                              type="button" 
                              onClick={() => setTransferringDscClient(ds as V2DscClient)} 
                              className="text-[9px] bg-amber-50 dark:bg-amber-950/35 text-amber-700 dark:text-amber-400 font-extrabold uppercase px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 flex items-center gap-1"
                            >
                              <Users className="h-2.5 w-2.5" /> Transfer Custody
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      {!isFwdWarning && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            type="button" 
                            onClick={() => {
                              setRenewalDscClient(ds as V2DscClient);
                              setRenewalIssueDate(ds.issueDate);
                              setRenewalExpiryDate(ds.expiryDate);
                            }} 
                            className="px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold uppercase text-[9px] tracking-wider rounded-lg hover:bg-amber-100 cursor-pointer transition flex items-center gap-1"
                            title="Renew DSC Alert"
                          >
                            <Calendar className="h-2.5 w-2.5" /> Renewed
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingDscClient(ds as V2DscClient)} 
                            className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer transition rounded"
                            title="Modify Client"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete DSC Client',
                                  message: `Are you sure you want to delete DSC client "${ds.clientName}"? This action is permanent.`,
                                  onConfirm: () => {
                                    deleteV2DscClient(ds.id);
                                    setDscClients(getV2DscClients());
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
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RENEWAL MODAL */}
      {renewalDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-600" /> Renew DSC Key & Validity
              </h3>
              <button type="button" onClick={() => setRenewalDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{renewalDscClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{renewalDscClient.firmName} • Token: {renewalDscClient.tokenName}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">New Issue Date *</label>
                <input 
                  type="date" 
                  value={renewalIssueDate} 
                  onChange={e => setRenewalIssueDate(e.target.value)} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">New Expiry Date *</label>
                <input 
                  type="date" 
                  value={renewalExpiryDate} 
                  onChange={e => setRenewalExpiryDate(e.target.value)} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setRenewalDscClient(null)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  renewalDscClient.issueDate = renewalIssueDate;
                  renewalDscClient.expiryDate = renewalExpiryDate;
                  updateV2DscClient(renewalDscClient);
                  setDscClients(getV2DscClients());
                  setRenewalDscClient(null);
                }} 
                className="px-4.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer"
              >
                Save New Validity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferringDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-600" /> Transfer DSC Custody
              </h3>
              <button type="button" onClick={() => setTransferringDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringDscClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{transferringDscClient.firmName} • Token: {transferringDscClient.tokenName}</div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{transferringDscClient.assignedEmployeeName || '🔴 Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pick New DSC Handler *</label>
              <select 
                defaultValue={transferringDscClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = allEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringDscClient.assignedEmployeeId = employee.id;
                    transferringDscClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringDscClient.assignedEmployeeId = undefined;
                    transferringDscClient.assignedEmployeeName = undefined;
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
              <button type="button" onClick={() => setTransferringDscClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2DscClient(transferringDscClient);
                  setDscClients(getV2DscClients());
                  setTransferringDscClient(null);
                }} 
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-amber-600" /> Modify DSC Record
              </h3>
              <button type="button" onClick={() => setEditingDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Signatory Representative Name *</label>
                <input 
                  type="text" 
                  value={editingDscClient.clientName} 
                  onChange={e => setEditingDscClient({ ...editingDscClient, clientName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Firm / Company Account *</label>
                <input 
                  type="text" 
                  value={editingDscClient.firmName} 
                  onChange={e => setEditingDscClient({ ...editingDscClient, firmName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">CCA Certify Issuer</label>
                  <select 
                    value={editingDscClient.issuerName} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, issuerName: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                  >
                    <option value="Prodigisgn">Prodigisgn</option>
                    <option value="PentaSign">PentaSign</option>
                    <option value="Sify">Sify</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Hardware Crypto Token</label>
                  <select 
                    value={editingDscClient.tokenName} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, tokenName: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                  >
                    <option value="Proxkey">Proxkey</option>
                    <option value="MToken">MToken</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Issue Date</label>
                  <input 
                    type="date" 
                    value={editingDscClient.issueDate} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, issueDate: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Expiry Date</label>
                  <input 
                    type="date" 
                    value={editingDscClient.expiryDate} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, expiryDate: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setEditingDscClient(null)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2DscClient(editingDscClient);
                  setDscClients(getV2DscClients());
                  setEditingDscClient(null);
                }} 
                className="px-4.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer"
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
