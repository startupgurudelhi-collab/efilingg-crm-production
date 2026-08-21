/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  V2GstClient, 
  V2GstReturnStatus, 
  saveV2GstReturnStatus,
  exportToCSVFile
} from '../../../lib/v2_db';
import { Employee } from '../../../types';
import { 
  CheckCircle2, Clock, AlertCircle, Search, Filter, 
  Download, Calendar, UserCheck, ExternalLink, Edit3, 
  ShieldCheck, FileSpreadsheet, X, Sparkles, Check, ChevronRight
} from 'lucide-react';

interface GSTMonthlyReturnsProps {
  clients: V2GstClient[];
  returns: V2GstReturnStatus[];
  employees: Employee[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onUpdateReturnStatus: (clientId: string, period: string, updates: Partial<V2GstReturnStatus>) => void;
  onTriggerGstLogin: (client: V2GstClient) => void;
  initialFilter?: string;
  initialEmployeeFilter?: string;
}

export default function GSTMonthlyReturns({
  clients,
  returns,
  employees,
  selectedMonth,
  onMonthChange,
  onUpdateReturnStatus,
  onTriggerGstLogin,
  initialFilter = 'ALL',
  initialEmployeeFilter = 'ALL'
}: GSTMonthlyReturnsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeFilter);

  // Modal state for recording filing ARN / Acknowledgement
  const [filingModal, setFilingModal] = useState<{
    isOpen: boolean;
    client: V2GstClient | null;
    returnRecord: V2GstReturnStatus | null;
    formType: 'gstr1' | 'gstr3b';
    status: V2GstReturnStatus['gstr1'];
    filingDate: string;
    ackNumber: string;
  }>({
    isOpen: false,
    client: null,
    returnRecord: null,
    formType: 'gstr1',
    status: 'FILED',
    filingDate: new Date().toISOString().slice(0, 10),
    ackNumber: ''
  });

  const availableMonths = [
    'May 2026', 'June 2026', 'July 2026', 'August 2026', 
    'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  // Filter to Monthly Clients only
  const monthlyClients = useMemo(() => {
    return clients.filter(c => c.returnsMode === 'MONTHLY');
  }, [clients]);

  // Statistics for top ribbon
  const stats = useMemo(() => {
    let gstr1Filed = 0;
    let gstr3bFiled = 0;
    let totalMonthly = monthlyClients.length;

    monthlyClients.forEach(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedMonth);
      if (ret?.gstr1 === 'FILED') gstr1Filed++;
      if (ret?.gstr3b === 'FILED') gstr3bFiled++;
    });

    const gstr1Pending = totalMonthly - gstr1Filed;
    const gstr3bPending = totalMonthly - gstr3bFiled;
    const totalRequired = totalMonthly * 2;
    const totalFiled = gstr1Filed + gstr3bFiled;
    const complianceRate = totalRequired > 0 ? Math.round((totalFiled / totalRequired) * 100) : 100;

    return { totalMonthly, gstr1Filed, gstr3bFiled, gstr1Pending, gstr3bPending, complianceRate };
  }, [monthlyClients, returns, selectedMonth]);

  // Filtered list
  const filteredList = useMemo(() => {
    return monthlyClients.filter(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedMonth);
      const isG1Filed = ret?.gstr1 === 'FILED';
      const is3bFiled = ret?.gstr3b === 'FILED';

      const q = search.toLowerCase();
      const matchSearch = !search || 
        cl.clientName.toLowerCase().includes(q) ||
        (cl.firmName && cl.firmName.toLowerCase().includes(q)) ||
        (cl.gstin && cl.gstin.toLowerCase().includes(q)) ||
        cl.userId.toLowerCase().includes(q);

      const matchEmployee = employeeFilter === 'ALL' || cl.assignedEmployeeId === employeeFilter;

      let matchStatus = true;
      if (statusFilter === 'both_filed' || statusFilter === 'filed') {
        matchStatus = isG1Filed && is3bFiled;
      } else if (statusFilter === 'gstr1' || statusFilter === 'gstr1_pending') {
        matchStatus = !isG1Filed;
      } else if (statusFilter === 'gstr3b' || statusFilter === 'gstr3b_pending') {
        matchStatus = !is3bFiled;
      } else if (statusFilter === 'gstr1_overdue') {
        matchStatus = !isG1Filed;
      } else if (statusFilter === 'gstr3b_overdue') {
        matchStatus = !is3bFiled;
      } else if (statusFilter === 'critical') {
        matchStatus = !isG1Filed && !is3bFiled;
      } else if (statusFilter === 'pending') {
        matchStatus = !isG1Filed || !is3bFiled;
      }

      return matchSearch && matchEmployee && matchStatus;
    });
  }, [monthlyClients, returns, selectedMonth, search, employeeFilter, statusFilter]);

  // Handle Quick Save Return Filing
  const handleSaveFiling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingModal.client) return;

    const updates: Partial<V2GstReturnStatus> = {};
    if (filingModal.formType === 'gstr1') {
      updates.gstr1 = filingModal.status;
      updates.gstr1Date = filingModal.status === 'FILED' ? filingModal.filingDate : undefined;
    } else {
      updates.gstr3b = filingModal.status;
      updates.gstr3bDate = filingModal.status === 'FILED' ? filingModal.filingDate : undefined;
    }

    onUpdateReturnStatus(filingModal.client.id, selectedMonth, updates);
    setFilingModal(prev => ({ ...prev, isOpen: false }));
  };

  // Export Monthly Roster CSV
  const handleExportCSV = () => {
    const headers = [
      'Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 
      'Period', 'GSTR-1 Status', 'GSTR-1 Date', 'GSTR-3B Status', 'GSTR-3B Date'
    ];
    const rows = filteredList.map(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedMonth);
      return [
        cl.clientName,
        cl.firmName || '',
        cl.gstin || '',
        cl.assignedEmployeeName || 'Unassigned',
        selectedMonth,
        ret?.gstr1 || 'NOT FILED',
        ret?.gstr1Date || '',
        ret?.gstr3b || 'NOT FILED',
        ret?.gstr3bDate || ''
      ];
    });
    exportToCSVFile(`gst_monthly_returns_${selectedMonth.replace(' ', '_')}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Monthly Returns Operations
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                GSTR-1 & GSTR-3B
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live return filing control board for regular monthly GST registered taxpayers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>Month:</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
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

        {/* Mini KPI metrics bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Monthly Clients</span>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">{stats.totalMonthly}</div>
          </div>
          <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">GSTR-1 Filed</span>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {stats.gstr1Filed} <span className="text-xs font-medium text-emerald-600/80">({stats.gstr1Pending} pending)</span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">GSTR-3B Filed</span>
            <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">
              {stats.gstr3bFiled} <span className="text-xs font-medium text-blue-600/80">({stats.gstr3bPending} pending)</span>
            </div>
          </div>
          <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/40">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Month Compliance</span>
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
            placeholder="Search monthly clients by name, GSTIN, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Filing Statuses</option>
            <option value="both_filed">Both Filed (GSTR-1 & 3B)</option>
            <option value="pending">Any Pending</option>
            <option value="gstr1_pending">GSTR-1 Pending</option>
            <option value="gstr3b_pending">GSTR-3B Pending</option>
            <option value="critical">Critical Overdue (Both Pending)</option>
          </select>

          {/* Assigned Officer */}
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

      {/* Monthly Returns Filing Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Client & Firm Name</th>
                <th className="py-3 px-3.5">GSTIN</th>
                <th className="py-3 px-3.5">Assigned Officer</th>
                <th className="py-3 px-3.5 text-center">GSTR-1 Status</th>
                <th className="py-3 px-3.5 text-center">GSTR-3B Status</th>
                <th className="py-3 px-3.5 text-right pr-4">Actions & Filing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold">No monthly returns found matching the active filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try selecting a different month or clearing filters.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((client) => {
                  const ret = returns.find(r => r.gstClientId === client.id && r.period === selectedMonth);
                  const isG1Filed = ret?.gstr1 === 'FILED';
                  const is3bFiled = ret?.gstr3b === 'FILED';

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
                      {/* Client Info */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{client.clientName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {client.firmName || 'Proprietorship'}
                        </div>
                      </td>

                      {/* GSTIN */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {client.gstin || 'N/A'}
                        </span>
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{client.assignedEmployeeName || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* GSTR-1 Status Toggle */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            onClick={() => {
                              setFilingModal({
                                isOpen: true,
                                client,
                                returnRecord: ret || null,
                                formType: 'gstr1',
                                status: isG1Filed ? 'NOT FILED' : 'FILED',
                                filingDate: ret?.gstr1Date || new Date().toISOString().slice(0, 10),
                                ackNumber: ''
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition ${
                              isG1Filed 
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            {isG1Filed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span>{ret?.gstr1 || 'NOT FILED'}</span>
                          </button>
                          {ret?.gstr1Date && (
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {ret.gstr1Date}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* GSTR-3B Status Toggle */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            onClick={() => {
                              setFilingModal({
                                isOpen: true,
                                client,
                                returnRecord: ret || null,
                                formType: 'gstr3b',
                                status: is3bFiled ? 'NOT FILED' : 'FILED',
                                filingDate: ret?.gstr3bDate || new Date().toISOString().slice(0, 10),
                                ackNumber: ''
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition ${
                              is3bFiled 
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                            }`}
                          >
                            {is3bFiled ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span>{ret?.gstr3b || 'NOT FILED'}</span>
                          </button>
                          {ret?.gstr3bDate && (
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {ret.gstr3bDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onTriggerGstLogin(client)}
                            title="1-Click Launch GST Portal"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Filing Update Modal */}
      {filingModal.isOpen && filingModal.client && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveFiling} className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Update {filingModal.formType.toUpperCase()} Filing Record
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedMonth} • {filingModal.client.clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilingModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Filing Status *</label>
                <select
                  value={filingModal.status}
                  onChange={(e) => setFilingModal(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="FILED">FILED (Successfully submitted to GST Portal)</option>
                  <option value="NOT FILED">NOT FILED (Pending)</option>
                  <option value="PENDING WITH CLIENT">PENDING WITH CLIENT (Awaiting Invoices/OTP)</option>
                  <option value="TAX DUE">TAX DUE (Challan generated, awaiting payment)</option>
                </select>
              </div>

              {filingModal.status === 'FILED' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Filing Date *</label>
                    <input
                      type="date"
                      required
                      value={filingModal.filingDate}
                      onChange={(e) => setFilingModal(prev => ({ ...prev, filingDate: e.target.value }))}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">ARN / Ack Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. AA0705260012345"
                      value={filingModal.ackNumber}
                      onChange={(e) => setFilingModal(prev => ({ ...prev, ackNumber: e.target.value }))}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFilingModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
              >
                Save Filing Status
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
