/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  V2GstClient, 
  deleteV2GstClient, 
  deleteV2GstClients,
  exportToCSVFile
} from '../../../lib/v2_db';
import { Employee } from '../../../types';
import { 
  Building2, Plus, Search, Filter, Download, UploadCloud, 
  Edit2, Trash2, Eye, EyeOff, UserCheck, Shield, Key, 
  ExternalLink, Phone, Mail, MapPin, CheckCircle2, ChevronRight, X, ArrowRightLeft
} from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

interface GSTClientsPortfolioProps {
  clients: V2GstClient[];
  employees: Employee[];
  onAddClient: () => void;
  onEditClient: (client: V2GstClient) => void;
  onBulkImport: () => void;
  onRefreshClients: () => void;
  onTriggerGstLogin: (client: V2GstClient) => void;
  onTransferToItr: (client: V2GstClient) => void;
  initialSearch?: string;
  initialEmployeeFilter?: string;
}

export default function GSTClientsPortfolio({
  clients,
  employees,
  onAddClient,
  onEditClient,
  onBulkImport,
  onRefreshClients,
  onTriggerGstLogin,
  onTransferToItr,
  initialSearch = '',
  initialEmployeeFilter = ''
}: GSTClientsPortfolioProps) {
  const [search, setSearch] = useState(initialSearch);
  const [returnTypeFilter, setReturnTypeFilter] = useState<'ALL' | 'MONTHLY' | 'QUARTERLY'>('ALL');
  const [structureFilter, setStructureFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeFilter || 'ALL');

  // Selected clients for bulk operations
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  
  // Client Details Drawer
  const [viewingClient, setViewingClient] = useState<V2GstClient | null>(null);

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Filtered Client List
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !search || 
        c.clientName.toLowerCase().includes(q) ||
        (c.firmName && c.firmName.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        c.clientMobile.includes(q) ||
        c.clientEmail.toLowerCase().includes(q) ||
        c.userId.toLowerCase().includes(q);

      const matchReturnType = returnTypeFilter === 'ALL' || c.returnsMode === returnTypeFilter;
      const matchStructure = structureFilter === 'ALL' || c.clientType === structureFilter;
      const matchEmployee = employeeFilter === 'ALL' || c.assignedEmployeeId === employeeFilter;

      return matchSearch && matchReturnType && matchStructure && matchEmployee;
    });
  }, [clients, search, returnTypeFilter, structureFilter, employeeFilter]);

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedClientIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete GST Clients',
      message: `Are you sure you want to permanently delete ${selectedClientIds.length} GST clients? This action cannot be undone.`,
      onConfirm: () => {
        deleteV2GstClients(selectedClientIds);
        setSelectedClientIds([]);
        onRefreshClients();
      }
    });
  };

  // Single Delete
  const handleDeleteClient = (client: V2GstClient) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete GST Client',
      message: `Are you sure you want to delete ${client.clientName} (${client.firmName || client.gstin || 'Taxpayer'})?`,
      onConfirm: () => {
        deleteV2GstClient(client.id);
        onRefreshClients();
      }
    });
  };

  // Export Clients Master CSV
  const handleExportClients = () => {
    const headers = [
      'Client ID', 'Client Name', 'Firm Name', 'Structure', 'GSTIN', 
      'Return Mode', 'Username', 'Date of Reg', 'Contact Mobile', 
      'Email', 'State', 'Assigned Officer'
    ];
    const rows = filteredClients.map(c => [
      c.id,
      c.clientName,
      c.firmName || '',
      c.clientType,
      c.gstin || '',
      c.returnsMode,
      c.userId,
      c.dateOfRegistration,
      c.clientMobile,
      c.clientEmail,
      c.clientState,
      c.assignedEmployeeName || 'Unassigned'
    ]);
    exportToCSVFile(`gst_clients_portfolio_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
              GST Clients Portfolio
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {filteredClients.length} of {clients.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Master taxpayer registry, assigned officer management, credential vault, and service onboarding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add GST Client
          </button>
          <button
            onClick={onBulkImport}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            <UploadCloud className="h-4 w-4 text-indigo-500" /> Bulk Import
          </button>
          <button
            onClick={handleExportClients}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, firm name, GSTIN, mobile, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Return Mode */}
          <select
            value={returnTypeFilter}
            onChange={(e) => setReturnTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Return Types</option>
            <option value="MONTHLY">Monthly Return Clients</option>
            <option value="QUARTERLY">Quarterly QRMP Clients</option>
          </select>

          {/* Client Structure */}
          <select
            value={structureFilter}
            onChange={(e) => setStructureFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Business Structures</option>
            <option value="PROPRIETOR">Proprietor</option>
            <option value="PRIVATE LIMITED COMPANY">Private Limited</option>
            <option value="LLP">LLP</option>
            <option value="PARTNERSHIP FIRM">Partnership Firm</option>
            <option value="TRUST">Trust / NGO</option>
          </select>

          {/* Assigned Employee */}
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

      {/* Bulk Selection Ribbon */}
      {selectedClientIds.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
            <span>{selectedClientIds.length} Clients Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedClientIds([])}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
            >
              Deselect All
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Master Client Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredClients.length > 0 && selectedClientIds.length === filteredClients.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedClientIds(filteredClients.map(c => c.id));
                      else setSelectedClientIds([]);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Client Name & Firm</th>
                <th className="py-3 px-3">GSTIN & Type</th>
                <th className="py-3 px-3">Contact Person & Mobile</th>
                <th className="py-3 px-3">Return Type</th>
                <th className="py-3 px-3">Assigned Officer</th>
                <th className="py-3 px-3">Credentials</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold">No GST clients found matching your filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search or adding a new client.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientIds.includes(client.id);
                  const isPassVisible = visiblePasswords[client.id];
                  return (
                    <tr 
                      key={client.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedClientIds(prev => [...prev, client.id]);
                            else setSelectedClientIds(prev => prev.filter(id => id !== client.id));
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Client Name & Firm */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                            {client.clientName.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() => setViewingClient(client)}
                              className="font-black text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition text-left cursor-pointer"
                            >
                              {client.clientName}
                            </button>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {client.firmName || 'Proprietorship'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* GSTIN & Type */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {client.gstin || 'GSTIN Pending'}
                        </div>
                        <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {client.clientType}
                        </span>
                      </td>

                      {/* Contact & Mobile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{client.clientMobile || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.clientEmail || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Return Type */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          client.returnsMode === 'MONTHLY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            client.returnsMode === 'MONTHLY' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                          {client.returnsMode}
                        </span>
                      </td>

                      {/* Assigned Employee */}
                      <td className="py-3 px-3">
                        {client.assignedEmployeeName ? (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                            <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{client.assignedEmployeeName}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Credentials Vault */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="text-slate-600 dark:text-slate-400">
                          ID: <strong className="text-slate-800 dark:text-slate-200">{client.userId}</strong>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                          <span>PW: {isPassVisible ? (client.password || 'N/A') : '••••••••'}</span>
                          <button
                            onClick={() => togglePasswordVisibility(client.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {isPassVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* One-Click Login Trigger */}
                          <button
                            onClick={() => onTriggerGstLogin(client)}
                            title="Launch 1-Click GST Portal Login"
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>

                          {/* View Client Details */}
                          <button
                            onClick={() => setViewingClient(client)}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Client */}
                          <button
                            onClick={() => onEditClient(client)}
                            title="Edit Taxpayer"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Transfer to ITR */}
                          <button
                            onClick={() => onTransferToItr(client)}
                            title="Transfer Client to Income Tax Module"
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteClient(client)}
                            title="Delete Client"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Client Details Modal / Drawer */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-emerald-600/20">
                  {viewingClient.clientName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    {viewingClient.clientName}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {viewingClient.firmName || 'Proprietorship'} • {viewingClient.clientType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingClient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">GSTIN</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {viewingClient.gstin || 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Filing Mode</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {viewingClient.returnsMode} Return
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Mobile Connection</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {viewingClient.clientMobile}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Email Address</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {viewingClient.clientEmail}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Assigned Officer</span>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {viewingClient.assignedEmployeeName || 'Unassigned'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold uppercase text-slate-400">State / Territory</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {viewingClient.clientState || 'Delhi'}
                  </div>
                </div>
              </div>

              {/* Physical Address */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-bold uppercase text-slate-400">Principal Place of Business</span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {viewingClient.clientAddress || 'No address specified'}
                </p>
              </div>

              {/* Portal Credentials Section */}
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" /> Portal Credentials
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(viewingClient.id)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {visiblePasswords[viewingClient.id] ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <div>Username: <strong className="text-slate-900 dark:text-slate-100">{viewingClient.userId}</strong></div>
                  <div>Password: <strong className="text-slate-900 dark:text-slate-100">{visiblePasswords[viewingClient.id] ? (viewingClient.password || 'N/A') : '••••••••'}</strong></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <button
                onClick={() => {
                  const target = viewingClient;
                  setViewingClient(null);
                  onTriggerGstLogin(target);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Launch GST Portal
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const target = viewingClient;
                    setViewingClient(null);
                    onEditClient(target);
                  }}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setViewingClient(null)}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
