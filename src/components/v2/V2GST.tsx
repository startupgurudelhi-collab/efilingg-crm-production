/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  V2GstClient, 
  V2GstReturnStatus, 
  getV2GstClients, 
  addV2GstClient, 
  updateV2GstClient,
  getV1Employees,
  getV2GstReturnStatuses, 
  saveV2GstReturnStatus, 
  parseCSVData, 
  exportToCSVFile,
  deleteV2GstClient,
  deleteV2GstClients,
  addV2ItrClient
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';
import { 
  LayoutDashboard, Users, Calendar, FileSpreadsheet, 
  Settings, ExternalLink, X, Globe, Key, AlertCircle, Plus, UploadCloud, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ConfirmModal from './ConfirmModal';

// Subcomponents
import GSTDashboard from './gst/GSTDashboard';
import GSTClientsPortfolio from './gst/GSTClientsPortfolio';
import GSTMonthlyReturns from './gst/GSTMonthlyReturns';
import GSTQuarterlyReturns from './gst/GSTQuarterlyReturns';
import GSTReports from './gst/GSTReports';
import GSTExtensionLogsSettings from './gst/GSTExtensionLogsSettings';

export default function V2GST({
  initialSubTab,
  initialShowAddForm = false,
  initialShowImport = false,
  initialSearch = ''
}: {
  key?: any;
  initialSubTab?: 'DASHBOARD' | 'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'REPORTS' | 'EXTENSION_ADMIN' | 'SETTINGS';
  initialShowAddForm?: boolean;
  initialShowImport?: boolean;
  initialSearch?: string;
} = {}) {
  const [clients, setClients] = useState<V2GstClient[]>(getV2GstClients());
  const [returns, setReturns] = useState<V2GstReturnStatus[]>(getV2GstReturnStatuses());
  const [allEmployees] = useState(getV1Employees());
  
  // Default to July 2026 (previous month if current is August 2026)
  const [selectedMonth, setSelectedMonth] = useState('July 2026');
  const [selectedQuarter, setSelectedQuarter] = useState('April-June 2026');
  
  // Active Navigation Subtab
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'REPORTS' | 'SETTINGS'>(
    initialSubTab === 'EXTENSION_ADMIN' ? 'SETTINGS' :
    initialSubTab === 'REPORTS' ? 'REPORTS' :
    initialSubTab === 'QUARTERLY' ? 'QUARTERLY' :
    initialSubTab === 'MONTHLY' ? 'MONTHLY' :
    initialSubTab === 'CLIENTS' ? 'CLIENTS' : 'DASHBOARD'
  );

  // Cross-filter drilldown states
  const [monthlyFilter, setMonthlyFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [clientSearch, setClientSearch] = useState<string>(initialSearch);

  // Modals & UI States
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [showImport, setShowImport] = useState(initialShowImport);
  const [importText, setImportText] = useState('');
  const [editingClient, setEditingClient] = useState<V2GstClient | null>(null);
  const [transferToItrClient, setTransferToItrClient] = useState<V2GstClient | null>(null);
  const [isAuditApplicableForItr, setIsAuditApplicableForItr] = useState(false);
  const [portalLoginHelperClient, setPortalLoginHelperClient] = useState<V2GstClient | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form Fields for Add Client
  const [name, setName] = useState('');
  const [addFirmName, setAddFirmName] = useState('');
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');
  const [type, setType] = useState<V2GstClient['clientType']>('PROPRIETOR');
  const [regDate, setRegDate] = useState('2026-05-01');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Delhi');
  const [gstin, setGstin] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');

  // Reusable confirmation modal state
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

  // Current session & sandbox warning
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(
        initialSubTab === 'EXTENSION_ADMIN' ? 'SETTINGS' :
        initialSubTab === 'SETTINGS' ? 'SETTINGS' :
        initialSubTab === 'REPORTS' ? 'REPORTS' :
        initialSubTab === 'QUARTERLY' ? 'QUARTERLY' :
        initialSubTab === 'MONTHLY' ? 'MONTHLY' :
        initialSubTab === 'CLIENTS' ? 'CLIENTS' : 'DASHBOARD'
      );
    }
  }, [initialSubTab]);

  useEffect(() => {
    setCurrentUser(getCurrentSession());
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  useEffect(() => {
    if (copiedField) {
      const timer = setTimeout(() => setCopiedField(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedField]);

  // Sync state data to Express Server on mount/changes
  const syncDataToBackend = async (clientsList: V2GstClient[]) => {
    try {
      await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: clientsList,
          employees: getV1Employees()
        })
      });
    } catch (err) {
      console.warn('Sync notice:', err);
    }
  };

  useEffect(() => {
    syncDataToBackend(clients);
  }, [clients]);

  // Handlers for Returns Updates
  const handleUpdateReturnStatus = (clientId: string, period: string, updates: Partial<V2GstReturnStatus>) => {
    const id = `${clientId}_2026_${period}`;
    const match = returns.find(r => r.id === id);
    const existing: V2GstReturnStatus = match || {
      id,
      gstClientId: clientId,
      year: '2026',
      period: period,
      gstr1: 'NOT FILED',
      gstr3b: 'NOT FILED'
    };

    const updated: V2GstReturnStatus = {
      ...existing,
      ...updates
    };

    saveV2GstReturnStatus(updated);
    setReturns(getV2GstReturnStatuses());
  };

  // 1-Click Launch GST Portal & Token Exchange
  const handleTriggerGstLogin = async (cl: V2GstClient) => {
    try {
      const user = getCurrentSession();
      const response = await fetch('/api/auth/generate-exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: cl.id,
          employeeId: user?.id || 'admin',
          employeeName: user?.name || 'Master Admin',
          employeeEmail: user?.email || 'admin@efilingg.com',
          employeeRole: user?.role || 'admin'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          const credsResponse = await fetch(`/api/extension/get-credentials?clientId=${cl.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${data.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (credsResponse.ok) {
            const creds = await credsResponse.json();
            if (creds.success && creds.username) {
              window.postMessage({
                source: 'efilingg-crm-page',
                action: 'initiate_gst_login',
                clientId: cl.id,
                exchangeToken: data.token,
                username: creds.username,
                password: creds.password,
                gstin: creds.gstin,
                crmUrl: window.location.origin,
                skipTabCreation: true
              }, '*');
            }
          }
        }
      }
    } catch (err) {
      console.warn('Manual fallback triggered', err);
    } finally {
      if (navigator.clipboard && cl.userId) {
        navigator.clipboard.writeText(cl.userId);
        setCopiedField('username');
      }
      setPortalLoginHelperClient(cl);
      window.open('https://services.gst.gov.in/services/login', '_blank', 'noopener,noreferrer');
    }
  };

  // Add Client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !userId || !email) {
      alert('Required client fields must be provided.');
      return;
    }
    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2GstClient({
      clientName: name,
      firmName: addFirmName || name + " (Firm)",
      clientType: type,
      dateOfRegistration: regDate,
      clientEmail: email,
      clientMobile: mobile,
      clientAddress: address,
      clientState: state,
      gstin: gstin,
      userId,
      password,
      returnsMode: mode,
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });
    setClients([...clients, added]);
    setShowAddForm(false);
    
    // Reset Form
    setName('');
    setAddFirmName('');
    setAddAssignedEmpId('');
    setEmail('');
    setMobile('');
    setAddress('');
    setGstin('');
    setUserId('');
    setPassword('');
  };

  // Edit Client Submit
  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const matchedEmployee = allEmployees.find(emp => emp.id === editingClient.assignedEmployeeId);
    const updatedClient: V2GstClient = {
      ...editingClient,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : editingClient.assignedEmployeeName
    };
    updateV2GstClient(updatedClient);
    setClients(getV2GstClients());
    setEditingClient(null);
  };

  // Bulk Import CSV/Excel
  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    try {
      const rows = parseCSVData(importText.trim());
      if (rows.length < 2) {
        alert('Invalid data pasted. Expecting header row and data rows separated by comma or tabs.');
        return;
      }
      
      const newClients: V2GstClient[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length >= 7) {
          const added = addV2GstClient({
            clientName: r[0],
            firmName: r[1] || r[0] + " (Firm)",
            clientType: (r[2] || 'PROPRIETOR') as V2GstClient['clientType'],
            dateOfRegistration: r[3] || '2026-05-01',
            clientEmail: r[4] || 'N/A',
            clientMobile: r[5] || 'N/A',
            clientAddress: r[6] || 'N/A',
            clientState: r[7] || 'Delhi',
            gstin: r[8] || `GSTIN-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            userId: r[9] || `user_${Math.random().toString(36).substr(2, 5).toLowerCase()}`,
            password: r[10] || 'GstPassword@2026',
            returnsMode: (r[11] === 'QUARTERLY' ? 'QUARTERLY' : 'MONTHLY')
          });
          newClients.push(added);
        }
      }
      setClients([...clients, ...newClients]);
      setShowImport(false);
      setImportText('');
      alert(`Successfully imported ${newClients.length} GST Clients!`);
    } catch (err: any) {
      alert('Parsing failed: ' + err.message);
    }
  };

  // Drilldown navigation helper from dashboard
  const handleDashboardNavigate = (tab: 'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'REPORTS' | 'SETTINGS', filter?: string) => {
    setActiveTab(tab);
    if (tab === 'MONTHLY' && filter) {
      setMonthlyFilter(filter);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Sandbox Loopback Notice */}
      {isIframe && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 p-3.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-800 dark:text-amber-200">
                GST Workstation Bridge Ready
              </span>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                To launch automated background GST logins with the Chrome extension, open the CRM in a dedicated browser tab.
              </p>
            </div>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer text-xs shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
          </a>
        </div>
      )}

      {/* Manual Creation Form Block */}
      {showAddForm && (
        <form onSubmit={handleCreateClient} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Register New GST Taxpayer
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Business / Client Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Firm Name *</label>
              <input type="text" required value={addFirmName} onChange={e => setAddFirmName(e.target.value)} placeholder="e.g. Sharma Logistics Private Limited" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Client Structure *</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <option value="PROPRIETOR">Proprietor</option>
                <option value="PARTNERSHIP FIRM">Partnership Firm</option>
                <option value="LLP">LLP</option>
                <option value="PRIVATE LIMITED COMPANY">Private Limited Company</option>
                <option value="TRUST">Trust</option>
                <option value="SOCIETY">Society</option>
                <option value="SECTION 8 NGO">Section 8 NGO</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">GSTIN *</label>
              <input type="text" required placeholder="e.g. 07AAAAA0000A1Z0" value={gstin} onChange={e => setGstin(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Username *</label>
              <input type="text" required placeholder="e.g. rahul_sharma" value={userId} onChange={e => setUserId(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">GST Portal Password</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Filing Slabs *</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <option value="MONTHLY">Monthly Return Register (GSTR-1 & 3B Monthly)</option>
                <option value="QUARTERLY">Quarterly QRMP Return (GSTR-1 & 3B Quarterly)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Date of Registration</label>
              <input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Email Address *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Connection</label>
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">State Location</label>
              <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Officer</label>
              <select value={addAssignedEmpId} onChange={e => setAddAssignedEmpId(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="">-- Select Officer --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'DEP-F'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Business Physical Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-550 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-xs">Save Taxpayer</button>
          </div>
        </form>
      )}

      {/* Direct Excel / CSV Client Importer */}
      {showImport && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
            <h3 className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4" /> Bulk Import GST Taxpayers
            </h3>
            <button 
              onClick={() => setShowImport(false)} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500">Paste your CSV or spreadsheet rows below. Expecting columns in order:</p>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto">
              Client Name, Firm Name, Structure, Date of Reg, Email, Mobile, Address, State, GSTIN, Username, Password, Returns Mode
            </div>
            
            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste raw CSV data with header..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button 
              onClick={() => setShowImport(false)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handlePasteImport}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
            >
              Process Import
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: GST DASHBOARD (EXECUTIVE VIEW)
          ========================================================================= */}
      {activeTab === 'DASHBOARD' && (
        <GSTDashboard
          clients={clients}
          returns={returns}
          employees={allEmployees}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onNavigateToTab={handleDashboardNavigate}
          onSelectEmployeeFilter={(empId) => setEmployeeFilter(empId)}
        />
      )}

      {/* =========================================================================
          TAB 2: CLIENTS PORTFOLIO
          ========================================================================= */}
      {activeTab === 'CLIENTS' && (
        <GSTClientsPortfolio
          clients={clients}
          employees={allEmployees}
          onAddClient={() => setShowAddForm(true)}
          onEditClient={(client) => setEditingClient(client)}
          onBulkImport={() => setShowImport(true)}
          onRefreshClients={() => setClients(getV2GstClients())}
          onTriggerGstLogin={handleTriggerGstLogin}
          onTransferToItr={(client) => setTransferToItrClient(client)}
          initialSearch={clientSearch}
          initialEmployeeFilter={employeeFilter}
        />
      )}

      {/* =========================================================================
          TAB 3: MONTHLY RETURNS
          ========================================================================= */}
      {activeTab === 'MONTHLY' && (
        <GSTMonthlyReturns
          clients={clients}
          returns={returns}
          employees={allEmployees}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onUpdateReturnStatus={handleUpdateReturnStatus}
          onTriggerGstLogin={handleTriggerGstLogin}
          initialFilter={monthlyFilter}
          initialEmployeeFilter={employeeFilter}
        />
      )}

      {/* =========================================================================
          TAB 4: QUARTERLY RETURNS
          ========================================================================= */}
      {activeTab === 'QUARTERLY' && (
        <GSTQuarterlyReturns
          clients={clients}
          returns={returns}
          employees={allEmployees}
          selectedQuarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          onUpdateReturnStatus={handleUpdateReturnStatus}
          onTriggerGstLogin={handleTriggerGstLogin}
        />
      )}

      {/* =========================================================================
          TAB 5: GST REPORTS
          ========================================================================= */}
      {activeTab === 'REPORTS' && (
        <GSTReports
          clients={clients}
          returns={returns}
          employees={allEmployees}
          selectedMonth={selectedMonth}
        />
      )}

      {/* =========================================================================
          TAB 6: EXTENSION LOGS & SETTINGS
          ========================================================================= */}
      {activeTab === 'SETTINGS' && (
        <GSTExtensionLogsSettings />
      )}

      {/* =========================================================================
          MODAL: EDIT CLIENT PROFILE
          ========================================================================= */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEditClient} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                Edit GST Taxpayer Profile
              </h3>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Client Name *</label>
                <input
                  type="text"
                  required
                  value={editingClient.clientName}
                  onChange={(e) => setEditingClient({ ...editingClient, clientName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Firm Name</label>
                <input
                  type="text"
                  value={editingClient.firmName || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, firmName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">GSTIN</label>
                <input
                  type="text"
                  value={editingClient.gstin || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, gstin: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Portal Username</label>
                <input
                  type="text"
                  value={editingClient.userId}
                  onChange={(e) => setEditingClient({ ...editingClient, userId: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Portal Password</label>
                <input
                  type="text"
                  value={editingClient.password || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, password: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Return Mode</label>
                <select
                  value={editingClient.returnsMode}
                  onChange={(e) => setEditingClient({ ...editingClient, returnsMode: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="MONTHLY">Monthly Return Register</option>
                  <option value="QUARTERLY">Quarterly QRMP Return</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Mobile</label>
                <input
                  type="tel"
                  value={editingClient.clientMobile}
                  onChange={(e) => setEditingClient({ ...editingClient, clientMobile: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Email</label>
                <input
                  type="email"
                  value={editingClient.clientEmail}
                  onChange={(e) => setEditingClient({ ...editingClient, clientEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Assign Officer</label>
                <select
                  value={editingClient.assignedEmployeeId || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, assignedEmployeeId: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="">-- Unassigned --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: PORTAL AUTOFILL LOGIN ASSISTANT
          ========================================================================= */}
      {portalLoginHelperClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setPortalLoginHelperClient(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4 animate-spin text-indigo-500" style={{ animationDuration: '4s' }} /> GST Portal Auto-Login Assistant
              </h3>
              <p className="text-[11px] text-slate-400">GST filing webpage opened in your active tab.</p>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300 space-y-1.5">
              <div className="flex gap-2 items-start">
                <span className="text-[14px] leading-none shrink-0">✨</span>
                <p className="font-semibold leading-snug">
                  <span className="underline">Clipboard Copied</span>: We copied the **Username** automatically. Click into the username box and press <kbd className="bg-indigo-100 dark:bg-indigo-950 px-1 border border-indigo-300 rounded text-[10px] font-bold font-mono">Ctrl + V</kbd> to autofill!
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Credential Clipboard Center</label>
                
                {/* GSTIN Panel */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">GSTIN</span>
                    <p className="font-mono font-black text-slate-700 dark:text-slate-200 select-all uppercase">{portalLoginHelperClient.gstin || portalLoginHelperClient.userId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(portalLoginHelperClient.gstin || portalLoginHelperClient.userId);
                        setCopiedField('helper-gstin');
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition"
                  >
                    {copiedField === 'helper-gstin' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                {/* Username Panel */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-indigo-500">Username</span>
                    <p className="font-mono font-extrabold text-slate-800 dark:text-slate-100 select-all">{portalLoginHelperClient.userId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(portalLoginHelperClient.userId || '');
                        setCopiedField('helper-user');
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer"
                  >
                    {copiedField === 'helper-user' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                {/* Password Panel */}
                <div className="p-3 bg-amber-50/25 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-amber-500">Password</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-100 select-all">{portalLoginHelperClient.password}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(portalLoginHelperClient.password || '');
                        setCopiedField('helper-pass');
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition cursor-pointer"
                  >
                    {copiedField === 'helper-pass' ? 'Copied ✓' : 'Copy Password'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 text-xs">
              <a
                href="https://services.gst.gov.in/services/login"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition font-bold text-center flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 text-indigo-500" /> Re-open GST Portal
              </a>
              <button
                onClick={() => setPortalLoginHelperClient(null)}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-black text-center cursor-pointer"
              >
                Close Helper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TRANSFER TO ITR MODULE
          ========================================================================= */}
      {transferToItrClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="text-sm font-black text-indigo-700 uppercase flex items-center gap-1.5">
                💼 Transfer Taxpayer to ITR Module
              </h3>
              <button 
                onClick={() => setTransferToItrClient(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 leading-relaxed">
                You are about to register and sync <strong className="text-slate-800 dark:text-white">"{transferToItrClient.clientName}"</strong> in the core <strong>Income Tax Returns (ITR)</strong> ledger. This maps credential indices, business state, and custody handlers automatically.
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Taxpayer Name</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{transferToItrClient.clientName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Entity Type</span>
                    <span className="font-extrabold text-slate-600 dark:text-slate-300">{transferToItrClient.clientType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Inferred PAN</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">{transferToItrClient.gstin ? transferToItrClient.gstin.substring(2, 12).toUpperCase() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/50 rounded-2xl cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition">
                <input 
                  type="checkbox" 
                  checked={isAuditApplicableForItr}
                  onChange={(e) => setIsAuditApplicableForItr(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">Is Tax Audit Applicable?</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">Tick this if the enterprise requires statutory filing of Form 3CD (Tax Audit Section 44AB).</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button 
                type="button" 
                onClick={() => setTransferToItrClient(null)} 
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  let taxpayerType: 'INDIVIDUAL' | 'LLP' | 'PRIVATE LIMITED' | 'TRUST & SOCIETY' | 'SECTION 8' = 'INDIVIDUAL';
                  let typeOfItr: 'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4' | 'ITR-5' | 'ITR-6' | 'ITR-7' = 'ITR-3';
                  
                  const typeUpper = transferToItrClient.clientType.toUpperCase();
                  if (typeUpper.includes('LLP') || typeUpper.includes('PARTNERSHIP')) {
                    taxpayerType = 'LLP';
                    typeOfItr = 'ITR-5';
                  } else if (typeUpper.includes('PRIVATE LIMITED') || typeUpper.includes('COMPANY') || typeUpper.includes('LTD')) {
                    taxpayerType = 'PRIVATE LIMITED';
                    typeOfItr = 'ITR-6';
                  } else if (typeUpper.includes('TRUST') || typeUpper.includes('SOCIETY')) {
                    taxpayerType = 'TRUST & SOCIETY';
                    typeOfItr = 'ITR-7';
                  } else if (typeUpper.includes('SECTION 8') || typeUpper.includes('NGO')) {
                    taxpayerType = 'SECTION 8';
                    typeOfItr = 'ITR-7';
                  } else {
                    taxpayerType = 'INDIVIDUAL';
                    typeOfItr = 'ITR-3';
                  }

                  const derivedPan = transferToItrClient.gstin && transferToItrClient.gstin.length >= 12
                    ? transferToItrClient.gstin.substring(2, 12).toUpperCase()
                    : 'BBMXJ1928D';

                  addV2ItrClient({
                    taxpayerName: transferToItrClient.firmName || transferToItrClient.clientName,
                    taxpayerType: taxpayerType,
                    panNumber: derivedPan,
                    typeOfItr: typeOfItr,
                    address: transferToItrClient.clientAddress || '',
                    itPortalPassword: transferToItrClient.password || 'Pass@123',
                    isAuditApplicable: isAuditApplicableForItr,
                    itrStatus: isAuditApplicableForItr ? 'PENDING FOR TAX AUDIT' : 'NOT FILED',
                    assignedEmployeeId: transferToItrClient.assignedEmployeeId,
                    assignedEmployeeName: transferToItrClient.assignedEmployeeName,
                    emailId: transferToItrClient.clientEmail || '',
                    mobileNumber: transferToItrClient.clientMobile || ''
                  });

                  alert(`Successfully registered "${transferToItrClient.firmName || transferToItrClient.clientName}" in ITR Ledger.\n\nAssigned Form: ${typeOfItr}\nTax Audit Status: ${isAuditApplicableForItr ? 'REQUIRED' : 'NO'}`);
                  setTransferToItrClient(null);
                }}
                className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-xs transition"
              >
                Proceed & Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
