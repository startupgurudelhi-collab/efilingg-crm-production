/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  V2GstClient, 
  V2GstReturnStatus, 
  exportToCSVFile
} from '../../../lib/v2_db';
import { Employee } from '../../../types';
import { getCurrentSession } from '../../../lib/db';
import { 
  CheckCircle2, Clock, Calendar, UserCheck, ExternalLink, 
  Edit3, Search, Filter, Download, FileSpreadsheet, X, Check
} from 'lucide-react';

interface GSTQuarterlyReturnsProps {
  clients: V2GstClient[];
  returns: V2GstReturnStatus[];
  employees: Employee[];
  selectedQuarter: string;
  onQuarterChange: (quarter: string) => void;
  onUpdateReturnStatus: (clientId: string, period: string, updates: Partial<V2GstReturnStatus>) => void;
  onTriggerGstLogin: (client: V2GstClient) => void;
}

export default function GSTQuarterlyReturns({
  clients,
  returns,
  employees,
  selectedQuarter,
  onQuarterChange,
  onUpdateReturnStatus,
  onTriggerGstLogin
}: GSTQuarterlyReturnsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');

  const availableQuarters = [
    'April-June 2026', 
    'July-September 2026', 
    'October-December 2026', 
    'January-March 2027'
  ];

  const currentUser = getCurrentSession();
  const isAdminOrTL = currentUser?.role === 'admin' || (currentUser?.role as any) === 'team_leader' || (currentUser?.role as any) === 'super_admin';

  // Filter to Quarterly Clients only (isolated to allotted for standard employees)
  const quarterlyClients = useMemo(() => {
    return clients.filter(c => {
      if (c.returnsMode !== 'QUARTERLY') return false;
      if (!isAdminOrTL && currentUser) {
        const matchesId = c.assignedEmployeeId === currentUser.id || (currentUser.employeeCode && c.assignedEmployeeId === currentUser.employeeCode);
        const matchesName = currentUser.name && (
          c.assignedEmployeeName?.toLowerCase() === currentUser.name.toLowerCase() ||
          c.assignedEmployeeId?.toLowerCase() === currentUser.name.toLowerCase()
        );
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [clients, isAdminOrTL, currentUser]);

  // Quarter filing statistics
  const stats = useMemo(() => {
    let filedCount = 0;
    const total = quarterlyClients.length;

    quarterlyClients.forEach(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedQuarter);
      if (ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED') {
        filedCount++;
      }
    });

    const pendingCount = total - filedCount;
    const complianceRate = total > 0 ? Math.round((filedCount / total) * 100) : 100;

    return { total, filedCount, pendingCount, complianceRate };
  }, [quarterlyClients, returns, selectedQuarter]);

  // Filtered List
  const filteredList = useMemo(() => {
    return quarterlyClients.filter(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedQuarter);
      const isFiled = ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED';

      const q = search.toLowerCase();
      const matchSearch = !search || 
        cl.clientName.toLowerCase().includes(q) ||
        (cl.firmName && cl.firmName.toLowerCase().includes(q)) ||
        (cl.gstin && cl.gstin.toLowerCase().includes(q)) ||
        cl.userId.toLowerCase().includes(q);

      const matchEmployee = employeeFilter === 'ALL' || cl.assignedEmployeeId === employeeFilter;

      let matchStatus = true;
      if (statusFilter === 'FILED') matchStatus = isFiled;
      else if (statusFilter === 'PENDING') matchStatus = !isFiled;

      return matchSearch && matchEmployee && matchStatus;
    });
  }, [quarterlyClients, returns, selectedQuarter, search, employeeFilter, statusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 'Quarter', 'QRMP Status'];
    const rows = filteredList.map(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedQuarter);
      const isFiled = ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED';
      return [
        cl.clientName,
        cl.firmName || '',
        cl.gstin || '',
        cl.assignedEmployeeName || 'Unassigned',
        selectedQuarter,
        isFiled ? 'FILED' : 'PENDING'
      ];
    });
    exportToCSVFile(`gst_quarterly_returns_${selectedQuarter.replace(' ', '_')}.csv`, headers, rows);
  };

  // Toggle QRMP Status
  const handleToggleStatus = (cl: V2GstClient) => {
    const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedQuarter);
    const isCurrentlyFiled = ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED';
    const nextStatus = isCurrentlyFiled ? 'NOT FILED' : 'FILED';
    const now = new Date().toISOString().slice(0, 10);

    onUpdateReturnStatus(cl.id, selectedQuarter, {
      gstr1: nextStatus,
      gstr3b: nextStatus,
      gstr1Date: nextStatus === 'FILED' ? now : undefined,
      gstr3bDate: nextStatus === 'FILED' ? now : undefined
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Quarterly Returns Operations (QRMP)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Quarterly Scheme
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filing status and IFF invoice management for taxpayers enrolled under QRMP scheme.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quarter Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span>Quarter:</span>
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => onQuarterChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                {availableQuarters.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export Roster
            </button>
          </div>
        </div>

        {/* Mini KPI bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total QRMP Clients</span>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Quarter Returns Filed</span>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.filedCount}</div>
          </div>
          <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Pending Filing</span>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats.pendingCount}</div>
          </div>
          <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/40">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Quarter Compliance</span>
            <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">{stats.complianceRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quarterly clients by name, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="FILED">Filed Returns</option>
            <option value="PENDING">Pending Returns</option>
          </select>

          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Officers</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quarterly Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Client & Firm Name</th>
                <th className="py-3 px-3.5">GSTIN</th>
                <th className="py-3 px-3.5">Quarter Period</th>
                <th className="py-3 px-3.5 text-center">QRMP Status</th>
                <th className="py-3 px-3.5">Assigned Officer</th>
                <th className="py-3 px-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold">No quarterly QRMP returns found matching active filters</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((client) => {
                  const ret = returns.find(r => r.gstClientId === client.id && r.period === selectedQuarter);
                  const isFiled = ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED';

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{client.clientName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {client.firmName || 'Proprietorship'}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {client.gstin || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {selectedQuarter}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(client)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition ${
                            isFiled
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {isFiled ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          <span>{isFiled ? 'FILED' : 'PENDING'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                          <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                          <span>{client.assignedEmployeeName || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right pr-4">
                        <button
                          onClick={() => onTriggerGstLogin(client)}
                          title="1-Click Launch GST Portal"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
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
