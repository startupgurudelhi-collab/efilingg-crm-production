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
  exportToCSVFile 
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db'; // Correct reference
import { 
  Building2, Plus, Download, UploadCloud, Search, Calendar, CheckCircle, Clock, AlertCircle, RefreshCw,
  Edit2, UserCheck, Shield, Lock, Mail, Phone, MapPin, Globe, ExternalLink, X, Users, Eye, EyeOff, FileText, Settings, Key
} from 'lucide-react';

export default function V2GST({
  initialSubTab,
  initialShowAddForm = false,
  initialShowImport = false,
  initialSearch = ''
}: {
  key?: any;
  initialSubTab?: 'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'EXTENSION_ADMIN';
  initialShowAddForm?: boolean;
  initialShowImport?: boolean;
  initialSearch?: string;
} = {}) {
  const [clients, setClients] = useState<V2GstClient[]>(getV2GstClients());
  const [returns, setReturns] = useState<V2GstReturnStatus[]>(getV2GstReturnStatuses());
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Return month option starting May 2026 and onwards
  const [selectedMonth, setSelectedMonth] = useState('May 2026');
  const [returnsSubTab, setReturnsSubTab] = useState<'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'EXTENSION_ADMIN'>(initialSubTab || 'CLIENTS');

  // Chrome Extension Integration & Audit state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [extensionLogs, setExtensionLogs] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState({
    allowEmployeeLogins: true,
    restrictedClients: [] as string[]
  });
  const [extError, setExtError] = useState<string | null>(null);

  // Sync state data to Express Server on mount/changes
  const syncDataToBackend = async (clientsList: V2GstClient[]) => {
    try {
      setSyncStatus('syncing');
      const response = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: clientsList,
          employees: getV1Employees()
        })
      });
      if (response.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('failed');
      }
    } catch (err) {
      console.error('Failed syncing to extension DB backend:', err);
      setSyncStatus('failed');
    }
  };

  // Fetch admin settings & logs
  const fetchAdminRequirements = async () => {
    const user = getCurrentSession();
    if (!user || user.role === 'employee') return;

    try {
      const logRes = await fetch(`/api/admin/audit-logs?role=${user.role}`);
      if (logRes.ok) {
        const data = await logRes.json();
        setExtensionLogs(data.logs || []);
      }

      const setRes = await fetch('/api/admin/settings');
      if (setRes.ok) {
        const data = await setRes.json();
        setAdminSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncDataToBackend(clients);
    fetchAdminRequirements();
  }, [clients]);

  // Listener for extension errors
  useEffect(() => {
    const handleExtError = (e: any) => {
      if (e.detail && e.detail.error) {
        setExtError(e.detail.error);
        alert(`Extension Error: ${e.detail.error}`);
      }
    };
    window.addEventListener('EfilinggExtensionError' as any, handleExtError);
    return () => window.removeEventListener('EfilinggExtensionError' as any, handleExtError);
  }, []);

  // Modals / Dialog States for Action Buttons inside Box-Wise Client Directory
  const [editingClient, setEditingClient] = useState<V2GstClient | null>(null);
  const [transferringClient, setTransferringClient] = useState<V2GstClient | null>(null);
  const [allEmployees] = useState(getV1Employees());

  // Load current session user to respect roles
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const togglePasswordVisibility = (clientId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

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

      if (!response.ok) {
        const errData = await response.json();
        alert(`Access Denied: ${errData.error || 'Server rejected credential access.'}`);
        return;
      }

      const data = await response.json();
      if (data.success && data.token) {
        // Fetch decrypted credentials securely using the newly generated exchange-token from the user's authenticated CRM page session.
        // This makes retrieval 100% immune to Google AI Studio gateway obstacles while respecting security, auditing, and single-use token policies!
        const credsResponse = await fetch(`/api/extension/get-credentials?clientId=${cl.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!credsResponse.ok) {
          const errData = await credsResponse.json();
          alert(`Secure Retrieval Failed: ${errData.error || 'Could not verify workstation permissions.'}`);
          return;
        }

        const creds = await credsResponse.json();
        if (!creds.success || !creds.username) {
          alert('Failed to retrieve client credentials from secure repository.');
          return;
        }

        // Chrome Extension secure triggering with direct payload
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

        const stringifiedDetail = JSON.stringify({
          clientId: cl.id,
          exchangeToken: data.token,
          username: creds.username,
          password: creds.password,
          gstin: creds.gstin,
          crmUrl: window.location.origin,
          skipTabCreation: true
        });
        document.dispatchEvent(new CustomEvent('EfilinggLaunchExtension', {
          detail: stringifiedDetail
        }));

        // Also trigger visual portal helper center modal as browser fallback
        setPortalLoginHelperClient(cl);
        
        // Open GST Portal securely in normal browser tab (no passwords in URL fragment!)
        window.open('https://services.gst.gov.in/services/login', '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('Failed generating exchange token, loading manual clipboard fallback:', err);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cl.userId || '');
        setCopiedField('username');
      }
      setPortalLoginHelperClient(cl);
      window.open('https://services.gst.gov.in/services/login', '_blank');
    }
  };

  // Contacts visibility & portal logins helper
  const [viewingContactClient, setViewingContactClient] = useState<V2GstClient | null>(null);
  const [portalLoginHelperClient, setPortalLoginHelperClient] = useState<V2GstClient | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Chrome Extension Connectivity State Variables
  const [extensionStatus, setExtensionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [extensionVersion, setExtensionVersion] = useState<string>('');
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    let receivedPong = false;

    const checkExtensionConnection = () => {
      receivedPong = false;
      window.postMessage({
        source: 'efilingg-crm-page',
        action: 'ping_extension'
      }, '*');

      // Set timeout to mark disconnected if no response within 1200ms
      setTimeout(() => {
        if (!receivedPong) {
          setExtensionStatus('disconnected');
        }
      }, 1200);
    };

    const handleExtensionReply = (event: MessageEvent) => {
      if (event.data && event.data.source === 'efilingg-extension' && event.data.action === 'extension_pong') {
        receivedPong = true;
        setExtensionStatus('connected');
        if (event.data.version) {
          setExtensionVersion(event.data.version);
        }
      }
    };

    window.addEventListener('message', handleExtensionReply);
    checkExtensionConnection();

    const timer = setInterval(checkExtensionConnection, 5000);

    return () => {
      window.removeEventListener('message', handleExtensionReply);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (copiedField) {
      const timer = setTimeout(() => setCopiedField(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedField]);

  // New Client stats form
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [showImport, setShowImport] = useState(initialShowImport);
  const [importText, setImportText] = useState('');

  // Form Fields
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

  const gstMonths = ['May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'];
  const gstQuarters = ['April-June 2026', 'July-September 2026', 'October-December 2026', 'January-March 2027'];

  useEffect(() => {
    // If we switch subtab, auto adjust month/quarter selection
    if (returnsSubTab === 'MONTHLY') {
      setSelectedMonth('May 2026');
    } else {
      setSelectedMonth('April-June 2026');
    }
  }, [returnsSubTab]);

  const handleExportClients = () => {
    const headers = ['Client ID', 'Client Name', 'Firm Name', 'Client Type', 'Reg Date', 'Email', 'Mobile', 'Address', 'State', 'GSTIN', 'Username', 'Password', 'Returns Mode'];
    const rows = clients.map(c => [
      c.id, c.clientName, c.firmName || '', c.clientType, c.dateOfRegistration, c.clientEmail, c.clientMobile, c.clientAddress, c.clientState, c.gstin || '', c.userId, c.password || '', c.returnsMode
    ]);
    exportToCSVFile('efilingg_v2_gst_clients.csv', headers, rows);
  };

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
      // Skip header row
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

  const handleUpdateStatus = (
    clientId: string, 
    typeOfReturn: 'gstr1' | 'gstr3b', 
    newStatus: V2GstReturnStatus['gstr1']
  ) => {
    const id = `${clientId}_2026_${selectedMonth}`;
    const match = returns.find(r => r.id === id);
    const existing: V2GstReturnStatus = match || {
      id,
      gstClientId: clientId,
      year: '2026',
      period: selectedMonth,
      gstr1: 'NOT FILED',
      gstr3b: 'NOT FILED'
    };

    const updated = {
      ...existing,
      [typeOfReturn]: newStatus,
      [`${typeOfReturn}Date`]: newStatus === 'FILED' ? new Date().toISOString().split('T')[0] : undefined
    };

    saveV2GstReturnStatus(updated);
    
    // Refresh returns state
    setReturns(getV2GstReturnStatuses());
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.clientName.toLowerCase().includes(search.toLowerCase()) || 
      (c.firmName || '').toLowerCase().includes(search.toLowerCase()) || 
      c.userId.toLowerCase().includes(search.toLowerCase());
    const matchesMode = returnsSubTab === 'CLIENTS' || c.returnsMode === returnsSubTab;
    return matchesSearch && matchesMode;
  });

  const getReturnRow = (clientId: string) => {
    const rId = `${clientId}_2026_${selectedMonth}`;
    return returns.find(r => r.id === rId) || {
      id: rId,
      gstClientId: clientId,
      year: '2026',
      period: selectedMonth,
      gstr1: 'NOT FILED' as const,
      gstr3b: 'NOT FILED' as const
    };
  };

  const renderStatusBadge = (status: V2GstReturnStatus['gstr1']) => {
    switch (status) {
      case 'FILED':
        return <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg font-bold border border-emerald-200">FILED</span>;
      case 'TAX DUE':
        return <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-lg font-bold border border-rose-200">TAX DUE</span>;
      case 'PENDING WITH CLIENT':
        return <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-955/15 text-amber-600 rounded-lg font-bold border border-amber-200">PENDING CLIENT</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-bold">NOT FILED</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {isIframe && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-950 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">
                AI Studio Sandbox Active (Desktop Loopback Blocked)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                You are currently running the CRM inside the sandboxed AI Studio preview frame. Browsers strictly block local secure handshakes (<code className="font-mono bg-white/50 px-1 py-0.2 rounded text-indigo-550 dark:bg-slate-900">http://127.0.0.1:12112</code>) inside secure frame sandboxes.
                <br />
                <strong className="text-amber-700 dark:text-amber-400">To enable full offline Windows Agent connectivity and workstation pairing, click the button on the right to open the CRM in a New Tab!</strong>
              </p>
            </div>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-750 hover:to-indigo-850 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/10 shrink-0 self-stretch md:self-auto text-center justify-center"
          >
            <ExternalLink className="h-4 w-4" /> Open CRM in New Tab
          </a>
        </div>
      )}
      
      {/* Upper Action Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
        <div>
          <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">GST Compliance Ledger</h2>
          <p className="text-[10px] text-slate-400 font-medium">Create client rosters, log GSTR-1 & GSTR-3B filed audits, and perform bulk uploads.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => { setShowAddForm(true); setShowImport(false); }}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add GST Client
          </button>
          <button
            onClick={() => { setShowImport(true); setShowAddForm(false); }}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" /> Bulk Import
          </button>
          <button
            onClick={handleExportClients}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Clients
          </button>
        </div>
      </div>

      {/* Manual Creation Form Form Block */}
      {showAddForm && (
        <form onSubmit={handleCreateClient} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <h3 className="font-extrabold text-xs text-indigo-700 uppercase">Register New GST Taxpayer</h3>
          
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
              <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Employee</label>
              <select value={addAssignedEmpId} onChange={e => setAddAssignedEmpId(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="">-- Select Employee --</option>
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
            <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Save Taxpayer</button>
          </div>
        </form>
      )}

      {/* Copy Paste Excel Import Blocks */}
      {showImport && (
        <form onSubmit={handlePasteImport} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
            <h3 className="font-extrabold text-xs text-indigo-700 uppercase">Excel Copy-Paste Bulk client Parser</h3>
            <button 
              type="button" 
              onClick={() => {
                const sample = "Client Name,Firm Name,Client Type,Registration Date,Email,Mobile,Address,State,GSTIN,Username,Password,Filing Mode\n"
                  + "Aditya Gupta,Apex Retails Corp,PROPRIETOR,2026-05-12,aditya@apexretails.com,9910492810,Sadar Bazar Delhi,Delhi,07ABVPK4912A1ZX,aditya_apex,Pass@123,MONTHLY\n"
                  + "Vijay Singh,Vijay Traders LLP,LLP,2026-06-01,admin@vijaytraders.com,8212491204,Sector 4 Noida,Uttar Pradesh,09AAKFG2941F1ZS,vijay_trader,Pass$g11,QUARTERLY";
                const blob = new Blob([sample], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', 'gst_clients_import_sample.csv');
                a.click();
              }}
              className="text-[10px] text-indigo-600 hover:underline font-bold font-mono"
            >
              ⬇️ Download Sample CSV Excel File
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Copy data columns from your worksheet (inclusive of columns) and paste below inside the text area:</p>
          <textarea
            rows={5}
            placeholder="Client Name&#9;Firm Name&#9;Type&#9;Reg Date&#9;Email&#9;Mobile&#9;Address&#9;State&#9;GSTIN&#9;Username&#9;Password&#9;Filing Mode&#10;Aditya Gupta&#9;Apex Retails Corp&#9;PROPRIETOR&#9;22/05/2026&#9;compliance@apexretails.com&#9;9812492102&#9;Plot 4 Sector 62 Noida&#9;Uttar Pradesh&#9;09AAACA4192G1ZX&#9;apex_retail&#9;GstPassword@2026&#9;MONTHLY"
            value={importText}
            onChange={e => setImportText(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl text-xs font-mono"
          />
          <div className="flex justify-end gap-2 text-xs">
            <button type="button" onClick={() => setShowImport(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-550 rounded-xl cursor-pointer">Close</button>
            <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Verify & Launch Accounts</button>
          </div>
        </form>
      )}

      {/* Main GST grid & Filing list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Header toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-105 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReturnsSubTab('CLIENTS')}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
                returnsSubTab === 'CLIENTS' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              📂 GST Client Directory
            </button>
            <button
              onClick={() => setReturnsSubTab('MONTHLY')}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
                returnsSubTab === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              📅 GSTR Monthly filing Ledger
            </button>
            <button
              onClick={() => setReturnsSubTab('QUARTERLY')}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
                returnsSubTab === 'QUARTERLY' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              📊 QRMP Quarterly filing Ledger
            </button>
            {currentUser?.role !== 'employee' && (
              <button
                onClick={() => setReturnsSubTab('EXTENSION_ADMIN')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
                  returnsSubTab === 'EXTENSION_ADMIN' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                ⚙️ Extension Logs & Settings
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {returnsSubTab !== 'CLIENTS' && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2 py-1 rounded-xl">
                <Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-0 font-bold text-xs pr-2 py-0.5 focus:ring-0 text-slate-800 dark:text-slate-100"
                >
                  {returnsSubTab === 'MONTHLY' 
                    ? gstMonths.map(mon => <option key={mon} value={mon}>{mon}</option>)
                    : gstQuarters.map(qtr => <option key={qtr} value={qtr}>{qtr}</option>)
                  }
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-2 py-1 rounded-xl w-48 sm:w-64">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search business, tax ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-0 text-xs w-full focus:ring-0 p-0"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Return filing compliance table */}
        {returnsSubTab === 'CLIENTS' ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850">
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center text-slate-450 space-y-2">
                <p className="font-extrabold text-sm uppercase tracking-widest text-emerald-700">No Register matching search query</p>
                <p className="text-xs">Try searching with a different client name, business entity or GSTIN credential.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(cl => (
                  <div 
                    key={cl.id} 
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Accent Strip */}
                    <div className="h-2 bg-gradient-to-r from-emerald-600 via-amber-400 to-emerald-700" />
                    
                    {/* Card Body */}
                    <div className="p-5 space-y-4 flex-1">
                      {/* Name and Entity Badge */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-lg text-[9px] font-extrabold uppercase tracking-wide">
                            {cl.clientType}
                          </span>
                          <span className={`px-2 py-0.5 border text-[9px] font-black rounded-lg ${
                            cl.returnsMode === 'MONTHLY' 
                              ? 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 border-amber-200' 
                              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200'
                          }`}>
                            {cl.returnsMode}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight pt-1">
                          {cl.firmName || cl.clientName}
                        </h4>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                          <span>Primary Contact:</span> 
                          <span className="text-slate-600 dark:text-slate-300">{cl.clientName}</span>
                        </p>
                      </div>

                      {/* GST Credentials Section */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Shield className="h-3 w-3 text-emerald-500" /> GSTIN
                          </span>
                          <span className="font-mono font-black text-[10.5px] hover:text-emerald-600 text-slate-700 dark:text-slate-200 uppercase select-all tracking-wide">
                            {cl.gstin || cl.userId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-850">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Shield className="h-3 w-3 text-indigo-500" /> Username
                          </span>
                          <span className="font-mono font-bold text-[10.5px] text-slate-700 dark:text-slate-250 select-all">
                            {cl.userId}
                          </span>
                        </div>
                        {cl.password && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-850">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <Lock className="h-3 w-3 text-amber-500" /> GST Password
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(cl.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                                title={visiblePasswords[cl.id] ? "Hide Password" : "Show Password"}
                              >
                                {visiblePasswords[cl.id] ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-slate-400" />}
                              </button>
                              <span className="font-mono font-bold text-[10.5px] text-slate-705 dark:text-slate-200 bg-amber-50 dark:bg-amber-955/25 px-1 rounded-sm select-all">
                                {visiblePasswords[cl.id] ? cl.password : '••••••••'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact Details */}
                      <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-350 font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{cl.clientMobile || 'Not Provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate select-all">{cl.clientEmail}</span>
                        </div>
                        {cl.clientAddress && (
                          <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[10.5px] line-clamp-1 text-slate-400" title={cl.clientAddress}>{cl.clientAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Employee Tag */}
                      {currentUser?.role !== 'employee' && (
                        <div className="pt-2 border-t border-slate-150 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1 font-bold">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Assigned Hand:</span>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900 text-xs">
                            {cl.assignedEmployeeName || '🔴 Unassigned'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-150 dark:border-slate-850 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingClient(cl);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-1.5 px-2 rounded-xl text-xs transition duration-200 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-amber-500" /> Modify Client
                      </button>
                      <button
                        onClick={() => {
                          setTransferringClient(cl);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold py-1.5 px-2 rounded-xl text-xs transition duration-200 cursor-pointer"
                      >
                        <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Transfer Hand
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : returnsSubTab === 'EXTENSION_ADMIN' ? (
          <div className="p-6 space-y-8 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850">
            {/* COMPLIANCE WARNING & INSTALLATION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Settings and Sync status */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-150 flex items-center gap-1.5 border-b border-slate-10 rounded-none pb-2.5">
                    <Settings className="h-4 w-4 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} /> Extension Permissions
                  </h3>
                  
                  {/* Master Login Control */}
                  <div className="space-y-4">
                    <div className="flex border border-slate-100 dark:border-slate-850 p-2.5 rounded-2xl items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
                      <div>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-250">General Employee Logins</div>
                        <div className="text-[10px] text-slate-405">Enable autofill for general hands</div>
                      </div>
                      <button
                        onClick={async () => {
                          const user = getCurrentSession();
                          const updatedVal = !adminSettings.allowEmployeeLogins;
                          try {
                            const res = await fetch('/api/admin/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ role: user?.role, allowEmployeeLogins: updatedVal })
                            });
                            if (res.ok) {
                              setAdminSettings(prev => ({ ...prev, allowEmployeeLogins: updatedVal }));
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`text-[9px] uppercase font-black tracking-wide px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                          adminSettings.allowEmployeeLogins 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 border-emerald-200 font-bold' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-650 border-rose-200 font-bold'
                        }`}
                      >
                        {adminSettings.allowEmployeeLogins ? '● Allowed' : '○ Disabled'}
                      </button>
                    </div>

                    {/* Sync diagnostic status */}
                    <div className="flex border border-slate-100 dark:border-slate-850 p-2.5 rounded-2xl items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-250">Express Backend Sync</div>
                        <div className="text-[10px] text-slate-405">Secure credentials sync</div>
                      </div>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-lg border ${
                        syncStatus === 'synced' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-205'
                          : syncStatus === 'syncing'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-400 border-amber-205'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-955/20 dark:text-rose-450 border-rose-205'
                      }`}>
                        {syncStatus}
                      </span>
                    </div>
                  </div>

                  {/* Restrict Selected Clients block */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block pb-1">Exclude Clients from Extension Autofill</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                      {clients.map(cl => {
                        const isRestricted = adminSettings.restrictedClients.includes(cl.id);
                        return (
                          <div key={cl.id} className="flex items-center justify-between text-xs py-1.5 first:pt-0">
                            <span className="truncate max-w-[150px] font-bold text-slate-700 dark:text-slate-350" title={cl.firmName || cl.clientName}>{cl.firmName || cl.clientName}</span>
                            <button
                              onClick={async () => {
                                const user = getCurrentSession();
                                let updatedList = [...adminSettings.restrictedClients];
                                if (isRestricted) {
                                  updatedList = updatedList.filter(id => id !== cl.id);
                                } else {
                                  updatedList.push(cl.id);
                                }
                                try {
                                  const res = await fetch('/api/admin/settings', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ role: user?.role, restrictedClients: updatedList })
                                  });
                                  if (res.ok) {
                                    setAdminSettings(prev => ({ ...prev, restrictedClients: updatedList }));
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                                isRestricted
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : 'bg-slate-100 text-slate-655 border-slate-200'
                              }`}
                            >
                              {isRestricted ? 'Restricted' : 'Allow Fill'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Installation Quick Guide Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-150 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-emerald-500 animate-pulse" /> Chrome Extension Package
                  </h3>
                  <p className="text-[11px] text-slate-400">Load our Manifest V3 auto-login tool onto employee browsers to bypass clipboard steps entirely.</p>
                  
                  <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/55 dark:border-indigo-900/10 text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
                    <div className="font-extrabold pb-0.5">🚀 Unpacked Developer Setup Guide:</div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1 font-medium">
                      <li>Create an empty folder named <code className="font-mono bg-indigo-100 dark:bg-indigo-950 px-1 rounded">efilingg-ext</code>.</li>
                      <li>Save the 5 files (listed in instruction center below) manually inside this folder.</li>
                      <li>Go to <code className="underline">chrome://extensions/</code>.</li>
                      <li>Turn on <span className="font-bold">"Developer mode"</span> in the top right.</li>
                      <li>Click <span className="font-bold">"Load unpacked"</span> and select the folder you created!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Right Column: Audit Logs & Activity lists */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Audit Logs Table Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-85 pb-2.5">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-150 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-500" /> GST Portal Login Audit logs
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Chronological record of secret credential access attempts via Chrome extension.</p>
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!confirm('Are you absolutely sure you want to clear secure login history?')) return;
                        const user = getCurrentSession();
                        try {
                          await fetch('/api/admin/clear-logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: user?.role })
                          });
                          setExtensionLogs([]);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 rounded-lg text-[9px] uppercase font-black tracking-wide cursor-pointer transition border border-rose-100 dark:border-rose-909"
                    >
                      Wipe History
                    </button>
                  </div>

                  {extensionLogs.length === 0 ? (
                    <div className="p-10 text-center text-slate-450 text-xs border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
                      No GST login attempts recorded yet. Extension auto-fill logs appear here immediately.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] border border-slate-100 dark:border-slate-850 rounded-2xl">
                      <table className="w-full text-left text-xs text-slate-655 dark:text-slate-350 divide-y divide-slate-100 dark:divide-slate-850">
                        <thead className="bg-slate-50 dark:bg-slate-950">
                          <tr className="text-[9px] uppercase font-bold text-slate-400 select-none">
                            <th className="p-2.5 pl-3.5">Timestamp</th>
                            <th className="p-2.5">User Handle</th>
                            <th className="p-2.5">Target Client</th>
                            <th className="p-2.5">Action Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                          {extensionLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-855/10 font-medium">
                              <td className="p-2.5 pl-3.5 text-slate-400 text-[10.5px] font-mono whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <div className="font-extrabold text-slate-800 dark:text-slate-200">{log.employeeName}</div>
                                <div className="text-[9px] text-indigo-500 font-bold uppercase">{log.employeeRole}</div>
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-800 dark:text-slate-250 truncate max-w-[120px]" title={log.clientName}>{log.clientName}</div>
                                <div className="text-[10px] font-mono font-bold text-slate-455 uppercase">{log.clientGstin}</div>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md border tracking-wide uppercase ${
                                  log.status === 'SUCCESS' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' 
                                    : 'bg-rose-50 text-rose-600 border-rose-250 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900'
                                }`}>
                                  {log.status === 'SUCCESS' ? 'SUCCESS ✔' : 'REJECTED ✘'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sub-Card: Chrome Extension Connection Center */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 dark:border-slate-850 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <Globe className="h-4 w-4" />
                        </span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-150">
                          Chrome Extension Connection Center
                        </h3>
                        <span className="px-2 py-0.5 text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-extrabold rounded uppercase tracking-wide">
                          V1.0.0 MV3
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                        Deploy our highly-secure, Manifest V3 compliant Chrome Extension to enable safe credential transfers directly in your browser. All inputs require manual user confirmation to prevent automated bot flags.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href="/api/extension/download-zip"
                        className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition shadow-md hover:shadow-indigo-500/20"
                      >
                        <Download className="h-4 w-4 text-indigo-200" /> Download Chrome Extension (.ZIP)
                      </a>
                    </div>
                  </div>

                  {/* Connection Status Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Status Box */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-105 dark:border-slate-850 space-y-3">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Extension State</div>
                      <div className="flex items-center gap-2.5">
                        <span className={`h-3 w-3 rounded-full ${
                          extensionStatus === 'connected' 
                            ? 'bg-emerald-500 animate-pulse' 
                            : extensionStatus === 'checking'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-rose-500'
                        }`} />
                        <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          {extensionStatus === 'connected' 
                            ? `Active & Connected (V${extensionVersion || '1.0.0'})` 
                            : extensionStatus === 'checking'
                              ? 'Checking Connection...'
                              : 'Extension Disconnected'
                          }
                        </div>
                      </div>
                      <div className="text-[10.5px] text-slate-455 leading-relaxed font-semibold font-medium">
                        {extensionStatus === 'connected' 
                          ? 'Real-time secure messaging channel is successfully handshook.' 
                          : extensionStatus === 'checking'
                            ? 'Pinging browser extension. Make sure Efilingg Assistant is loaded.'
                            : 'Install and enable the Efilingg Assistant extension to connect automatically.'
                        }
                      </div>
                    </div>

                    {/* Operational Safety */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-105 dark:border-slate-850 space-y-3">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Zero-Automation Lock</div>
                      <div className="flex items-center gap-2.5">
                        <span className="h-3.5 w-3.5 text-emerald-500 font-extrabold">🛡</span>
                        <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          100% Anti-Bot Safeguard
                        </div>
                      </div>
                      <div className="text-[10.5px] text-slate-455 leading-relaxed font-semibold font-medium">
                        Credentials are ONLY filled after explicit human interaction to prevent automated bot / automation flags by government servers.
                      </div>
                    </div>
                  </div>

                  {/* Deployment Guide */}
                  <div className="p-4.5 bg-indigo-50/40 dark:bg-slate-950/30 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/20 space-y-3">
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Extension Installation & Activation Guide:
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-705 dark:text-slate-350">1. Download ZIP</div>
                        <div>Click the download button above to download the Chrome Extension package.</div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-705 dark:text-slate-350">2. Extract Package</div>
                        <div>Extract the downloaded <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-indigo-500">efilingg-chrome-extension.zip</code> file onto an accessible directory.</div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-705 dark:text-slate-350">3. Load Unpacked</div>
                        <div>Open Google Chrome, navigate to <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-indigo-500">chrome://extensions</code>, turn on <strong className="text-indigo-500 uppercase">Developer mode</strong> (top right), and click <strong className="text-indigo-500 uppercase">Load unpacked</strong> (top left).</div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-705 dark:text-slate-350">4. Connection Status</div>
                        <div>Select the extracted directory folder. The extension is instantly active and connection status turns green!</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 border-b border-slate-100 dark:border-slate-850 font-bold select-none text-[10px] uppercase">
                  <th className="p-3 pl-5">Corporate / Entity Account</th>
                  <th className="p-3">GSTIN & Username</th>
                  <th className="p-3">GSTR-1 File (Due date: {returnsSubTab === 'MONTHLY' ? '11th' : '13th'})</th>
                  <th className="p-3">GSTR-3B File (Due date: {returnsSubTab === 'MONTHLY' ? '20nd' : '22nd'})</th>
                  <th className="p-3">Period Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No active GST returns registered under the selected search/returns mode filters.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(cl => {
                    const ret = getReturnRow(cl.id);
                    return (
                      <tr key={cl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all">
                         <td className="p-3 pl-5">
                          <div className="font-extrabold text-slate-800 dark:text-slate-150">{cl.firmName || cl.clientName}</div>
                          <div className="text-[10px] text-slate-450 uppercase font-mono font-bold">{cl.clientType} • Contact: {cl.clientName}</div>
                          <button
                            type="button"
                            onClick={() => setViewingContactClient(cl)}
                            className="mt-1.5 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-extrabold text-[9px] uppercase tracking-wide px-2 py-1 rounded-lg cursor-pointer transition"
                          >
                            <Phone className="h-2.5 w-2.5 text-emerald-500" /> View Contact
                          </button>
                        </td>
                        <td className="p-3">
                          <span className="font-bold font-mono text-slate-705 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg text-[10.5px] tracking-wide block w-fit" title="GSTIN">{cl.gstin || cl.userId}</span>
                          <div className="text-[9px] text-slate-400 font-semibold mt-1 select-all">
                            User: {cl.userId} {cl.password ? `• PW: ${cl.password}` : ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTriggerGstLogin(cl)}
                            className="mt-1.5 flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-indigo-650 hover:from-emerald-700 hover:to-indigo-700 text-white font-extrabold text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-sm cursor-pointer transition shadow-xs"
                            title="Launches Chrome Extension and official GST login page dynamically"
                          >
                            <Globe className="h-2.5 w-2.5 animate-pulse text-emerald-300" /> Login to GST Portal
                          </button>
                        </td>
                        
                        <td className="p-3 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {renderStatusBadge(ret.gstr1)}
                            <select
                              value={ret.gstr1}
                              onChange={e => handleUpdateStatus(cl.id, 'gstr1', e.target.value as any)}
                              className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold focus:ring-0"
                            >
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed (Cleared)</option>
                              <option value="PENDING WITH CLIENT">Pending Client</option>
                              <option value="TAX DUE">Tax Due</option>
                            </select>
                          </div>
                          {ret.gstr1Date && <div className="text-[9px] text-emerald-500 font-mono font-bold">✔ Audited at {ret.gstr1Date}</div>}
                        </td>

                        <td className="p-3 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {renderStatusBadge(ret.gstr3b)}
                            <select
                              value={ret.gstr3b}
                              onChange={e => handleUpdateStatus(cl.id, 'gstr3b', e.target.value as any)}
                              className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold focus:ring-0"
                            >
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed (Cleared)</option>
                              <option value="PENDING WITH CLIENT">Pending Client</option>
                              <option value="TAX DUE">Tax Due</option>
                            </select>
                          </div>
                          {ret.gstr3bDate && <div className="text-[9px] text-emerald-500 font-mono font-bold">✔ Audited at {ret.gstr3bDate}</div>}
                        </td>

                        <td className="p-3 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1.5 font-mono">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{selectedMonth}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: TRANSFER TO OTHER EMPLOYEE */}
      {transferringClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setTransferringClient(null)} 
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Transfer Client Custody
              </h3>
              <p className="text-[11px] text-slate-450">Re-assign management responsibility for the selected GST folder.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-1.5 text-xs">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringClient.firmName || transferringClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wide">{transferringClient.userId} • {transferringClient.clientType}</div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-between">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {transferringClient.assignedEmployeeName || '🔴 Unassigned'}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] uppercase font-bold text-slate-500">Choose New Managed Hand *</label>
              <select 
                defaultValue={transferringClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = allEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringClient.assignedEmployeeId = employee.id;
                    transferringClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringClient.assignedEmployeeId = undefined;
                    transferringClient.assignedEmployeeName = undefined;
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                <option value="">-- No Assignment (Remove handler) --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button 
                type="button" 
                onClick={() => setTransferringClient(null)} 
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Keep Current
              </button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2GstClient(transferringClient);
                  setClients(getV2GstClients());
                  setTransferringClient(null);
                }} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MODIFY GST CLIENT MASTER */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative space-y-4 my-8">
            <button 
              onClick={() => setEditingClient(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-amber-500 flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-amber-500" /> Modify Client Profile Master
              </h3>
              <p className="text-[11px] text-slate-450 font-medium">Identify and update register details for selected taxpayer account.</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateV2GstClient(editingClient);
              setClients(getV2GstClients());
              setEditingClient(null);
            }} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Contact / Client Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={editingClient.clientName} 
                    onChange={e => setEditingClient({ ...editingClient, clientName: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Firm / Business Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={editingClient.firmName || ''} 
                    onChange={e => setEditingClient({ ...editingClient, firmName: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-850 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Client Structure Type *</label>
                  <select 
                    value={editingClient.clientType} 
                    onChange={e => setEditingClient({ ...editingClient, clientType: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold"
                  >
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
                  <input 
                    type="text" 
                    required 
                    value={editingClient.gstin || ''} 
                    onChange={e => setEditingClient({ ...editingClient, gstin: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase font-bold text-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Username *</label>
                  <input 
                    type="text" 
                    required 
                    value={editingClient.userId} 
                    onChange={e => setEditingClient({ ...editingClient, userId: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">GST Password</label>
                  <input 
                    type="text" 
                    value={editingClient.password || ''} 
                    onChange={e => setEditingClient({ ...editingClient, password: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Filing Mode Slab *</label>
                  <select 
                    value={editingClient.returnsMode} 
                    onChange={e => setEditingClient({ ...editingClient, returnsMode: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="MONTHLY">Monthly (GSTR-1 & 3B)</option>
                    <option value="QUARTERLY">Quarterly (QRMP GSTR-1 & 3B)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Primary Mobile Connection</label>
                  <input 
                    type="tel" 
                    value={editingClient.clientMobile || ''} 
                    onChange={e => setEditingClient({ ...editingClient, clientMobile: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Official Email Master *</label>
                  <input 
                    type="email" 
                    required 
                    value={editingClient.clientEmail} 
                    onChange={e => setEditingClient({ ...editingClient, clientEmail: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Tax State Jurisdiction</label>
                  <input 
                    type="text" 
                    value={editingClient.clientState} 
                    onChange={e => setEditingClient({ ...editingClient, clientState: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Registration Date</label>
                  <input 
                    type="date" 
                    value={editingClient.dateOfRegistration} 
                    onChange={e => setEditingClient({ ...editingClient, dateOfRegistration: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Business Physical Office Address</label>
                <textarea 
                  rows={2}
                  value={editingClient.clientAddress || ''} 
                  onChange={e => setEditingClient({ ...editingClient, clientAddress: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingClient(null)} 
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer font-bold"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-xl font-black transition cursor-pointer shadow-xs"
                >
                  Save Account Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW CONTACT DETAILS */}
      {viewingContactClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setViewingContactClient(null)} 
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> Client Contact Information
              </h3>
              <p className="text-[11px] text-slate-400">Verified primary contact details for {viewingContactClient.firmName || viewingContactClient.clientName}.</p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Firm Name</span>
                  <span className="col-span-2 font-extrabold text-slate-800 dark:text-slate-200">{viewingContactClient.firmName || 'Proprietorship'}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Contact Person</span>
                  <span className="col-span-2 font-extrabold text-slate-800 dark:text-slate-200">{viewingContactClient.clientName}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mobile Number</span>
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingContactClient.clientMobile || 'Not Provided'}</span>
                    {viewingContactClient.clientMobile && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(viewingContactClient.clientMobile || '');
                            setCopiedField('mobile');
                          }
                        }}
                        className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md hover:bg-indigo-100 transition cursor-pointer"
                      >
                        {copiedField === 'mobile' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Email Address</span>
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <span className="font-mono truncate text-slate-800 dark:text-slate-200 max-w-[150px]" title={viewingContactClient.clientEmail}>{viewingContactClient.clientEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(viewingContactClient.clientEmail || '');
                          setCopiedField('email');
                        }
                      }}
                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md hover:bg-indigo-100 transition cursor-pointer"
                    >
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {viewingContactClient.clientAddress && (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-850">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Office Address</span>
                    <span className="col-span-2 text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-xs">{viewingContactClient.clientAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingContactClient(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer font-bold text-xs text-center"
              >
                Close Information
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PORTAL AUTOFILL LOGIN ASSISTANT */}
      {portalLoginHelperClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setPortalLoginHelperClient(null)} 
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4 animate-spin text-indigo-500" style={{ animationDuration: '4s' }} /> GST Portal Auto-Login Assistant
              </h3>
              <p className="text-[11px] text-slate-400">We opened the Government GST filing webpage in a new tab details for you.</p>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300 pl-3.5 space-y-1.5">
              <div className="flex gap-2 items-start">
                <span className="text-[14px] leading-none shrink-0">✨</span>
                <p className="font-semibold leading-snug">
                  <span className="underline">Clipboard Copied</span>: We copied the **Username** automatically. Simply click on the GST Portal username input field and press <kbd className="bg-indigo-100 dark:bg-indigo-950 px-1 border border-indigo-300 rounded text-[10px] font-bold font-mono">Ctrl + V</kbd> to autofill!
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Credential Clipboard Center</label>
                
                {/* GSTIN Panel */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5 col-span-2">
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
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-250 rounded-lg transition"
                  >
                    {copiedField === 'helper-gstin' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                {/* Username Panel */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5 col-span-2">
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
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer"
                  >
                    {copiedField === 'helper-user' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                {/* Password Panel */}
                <div className="p-3 bg-amber-50/25 dark:bg-amber-955/10 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl flex items-center justify-between text-xs gap-3">
                  <div className="space-y-0.5 col-span-2">
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
                    className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg transition cursor-pointer"
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
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-xl transition font-bold text-center flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 text-indigo-500" /> Re-open GST Portal
              </a>
              <button
                onClick={() => setPortalLoginHelperClient(null)}
                className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition font-black text-center cursor-pointer"
              >
                Close Helper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
