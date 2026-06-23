/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  V2ItrClient, 
  V2TaxAuditClient, 
  V2TrustClient, 
  V2DscClient, 
  V2OtherServiceClient, 
  getV2ItrClients, 
  addV2ItrClient, 
  updateV2ItrClient,
  getV2TaxAuditClients, 
  getV2TrustClients, 
  addV2TrustClient, 
  updateV2TrustClient,
  getV2DscClients, 
  addV2DscClient, 
  updateV2DscClient,
  getV2OtherServiceClients, 
  addV2OtherServiceClient, 
  updateV2OtherServiceClient,
  getV2McaClients,
  exportToCSVFile,
  getV1Employees,
  deleteV2ItrClient,
  deleteV2TrustClient,
  deleteV2DscClient,
  deleteV2OtherServiceClient,
  getV2OtherServiceCategories,
  getV2TaxAuditOverrides,
  saveV2TaxAuditOverride
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';
import { 
  Plus, Search, Download, AlertTriangle, CheckCircle, ShieldCheck, HelpCircle, FileText, Calendar, KeyRound, Award, HeartHandshake,
  Users, X, Edit2, UserCheck, Eye, EyeOff, Trash, Trash2, Edit
} from 'lucide-react';

export default function V2ITR({
  initialSubTab = 'itr',
  initialShowAddItr = false,
  initialShowAddTrust = false,
  initialShowAddDsc = false
}: {
  key?: any;
  initialSubTab?: 'itr' | 'audit' | 'trust' | 'dsc' | 'others';
  initialShowAddItr?: boolean;
  initialShowAddTrust?: boolean;
  initialShowAddDsc?: boolean;
} = {}) {
  const [subTab, setSubTab] = useState<'itr' | 'audit' | 'trust' | 'dsc' | 'others'>(initialSubTab);
  
  // Data State Carriers
  const [itrClients, setItrClients] = useState<V2ItrClient[]>(getV2ItrClients());
  const [trustClients, setTrustClients] = useState<V2TrustClient[]>(getV2TrustClients());
  const [dscClients, setDscClients] = useState<V2DscClient[]>(getV2DscClients());
  const [otherClients, setOtherClients] = useState<V2OtherServiceClient[]>(getV2OtherServiceClients());

  // Assignment states
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');
  const [allEmployees] = useState(getV1Employees());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for transferring custody
  const [transferringItrClient, setTransferringItrClient] = useState<V2ItrClient | null>(null);
  const [transferringTrustClient, setTransferringTrustClient] = useState<V2TrustClient | null>(null);
  const [transferringDscClient, setTransferringDscClient] = useState<V2DscClient | null>(null);
  const [transferringOtherClient, setTransferringOtherClient] = useState<V2OtherServiceClient | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  // Search Filters
  const [itrSearch, setItrSearch] = useState('');
  const [dscFilter, setDscFilter] = useState('');

  // New user requested features states
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Header filter states
  const [itrStatusFilter, setItrStatusFilter] = useState<string>('ALL');
  const [taxAuditFilter, setTaxAuditFilter] = useState<string>('ALL');
  const [dscFilterDropdown, setDscFilterDropdown] = useState<string>('ALL');

  // Dynamic Service Categories (V2.4.2)
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(getV2OtherServiceCategories());

  // Edit / Modify Client profile active modes data carriers
  const [editingItrClient, setEditingItrClient] = useState<V2ItrClient | null>(null);
  const [editingTrustClient, setEditingTrustClient] = useState<V2TrustClient | null>(null);
  const [editingDscClient, setEditingDscClient] = useState<V2DscClient | null>(null);
  const [editingOtherClient, setEditingOtherClient] = useState<V2OtherServiceClient | null>(null);

  // Renewal Date & Expiry for Renewal Button inside DSC Expirations
  const [renewalDscClient, setRenewalDscClient] = useState<V2DscClient | null>(null);
  const [renewalIssueDate, setRenewalIssueDate] = useState('');
  const [renewalExpiryDate, setRenewalExpiryDate] = useState('');

  // Tax Audit Override states for CA assigns & specific status dropdown modifications
  const [taxAuditOverrides, setTaxAuditOverrides] = useState(getV2TaxAuditOverrides());

  // ITR Manual Modal Form States
  const [showAddItr, setShowAddItr] = useState(initialShowAddItr);
  const [itrName, setItrName] = useState('');
  const [itrPan, setItrPan] = useState('');
  const [itrItrType, setItrItrType] = useState<'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4'>('ITR-1');
  const [itrAddress, setItrAddress] = useState('');
  const [itrITPass, setItrITPass] = useState('');
  const [itrIsAudit, setItrIsAudit] = useState(false);

  // Trust Form parameters
  const [showAddTrust, setShowAddTrust] = useState(initialShowAddTrust);
  const [tName, setTName] = useState('');
  const [tType, setTType] = useState<'Trust' | 'Society'>('Trust');
  const [tAddress, setTAddress] = useState('');
  const [tSign, setTSign] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tMobile, setTMobile] = useState('');
  const [t12a80g, setT12a80g] = useState(false);
  const [tUser, setTUser] = useState('');
  const [tPass, setTPass] = useState('');

  // DSC Form parameters
  const [showAddDsc, setShowAddDsc] = useState(initialShowAddDsc);
  const [dscName, setDscName] = useState('');
  const [dscIssue, setDscIssue] = useState('2026-06-01');
  const [dscExpiry, setDscExpiry] = useState('2028-06-01');
  const [dscIssuer, setDscIssuer] = useState<'Prodigisgn' | 'PentaSign' | 'Sify'>('Prodigisgn');
  const [dscToken, setDscToken] = useState<'Proxkey' | 'MToken'>('Proxkey');
  const [dscFirm, setDscFirm] = useState('');

  // Other Services Form parameters
  const [showAddOther, setShowAddOther] = useState(false);
  const [othName, setOthName] = useState('');
  const [othService, setOthService] = useState('msme');
  const [othReferred, setOthReferred] = useState('');
  const [othRegDate, setOthRegDate] = useState('2026-06-01');
  const [othAddress, setOthAddress] = useState('');
  const [othEmail, setOthEmail] = useState('');
  const [othMobile, setOthMobile] = useState('');

  const taxAudits = getV2TaxAuditClients();

  // Handlers
  const handleCreateItr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itrName || !itrPan) {
      alert('Taxpayer Name and PAN number are required.');
      return;
    }
    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2ItrClient({
      taxpayerName: itrName,
      taxpayerType: 'INDIVIDUAL',
      panNumber: itrPan,
      typeOfItr: itrItrType,
      address: itrAddress,
      itPortalPassword: itrITPass,
      isAuditApplicable: itrIsAudit,
      itrStatus: 'NOT FILED',
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });
    setItrClients([...itrClients, added]);
    setShowAddItr(false);
    // Reset Form
    setItrName(''); setItrPan(''); setItrAddress(''); setItrITPass(''); setItrIsAudit(false); setAddAssignedEmpId('');
  };

  const handleUpdateItrStatus = (id: string, newStatus: V2ItrClient['itrStatus']) => {
    const list = [...itrClients];
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx].itrStatus = newStatus;
      setItrClients(list);
      // Save
      localStorage.setItem('efilingg_crm_v2_itr_clients', JSON.stringify(list));
    }
  };

  const handleUpdateTaxAuditStatus = (id: string, status: string, empId?: string, empName?: string) => {
    saveV2TaxAuditOverride(id, status, empId, empName);
    setTaxAuditOverrides(getV2TaxAuditOverrides());
  };

  const handleCreateTrust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName || !tSign || !tEmail) {
      alert('Required trust details not provided.');
      return;
    }
    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2TrustClient({
      entityName: tName,
      typeOfEntity: tType,
      address: tAddress,
      authSignatory: tSign,
      emailId: tEmail,
      mobileNumber: tMobile,
      has12A80G: t12a80g,
      itPortalUsername: tUser,
      itPortalPassword: tPass,
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });
    setTrustClients([...trustClients, added]);
    setItrClients(getV2ItrClients()); // Refresh ITR since trust could auto forward
    setShowAddTrust(false);
    setTName(''); setTSign(''); setTEmail(''); setTMobile(''); setTAddress(''); setTUser(''); setTPass(''); setT12a80g(false); setAddAssignedEmpId('');
  };

  const handleCreateDsc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dscName || !dscFirm) {
      alert('Representative Name and Firm Name are required.');
      return;
    }
    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2DscClient({
      clientName: dscName,
      issueDate: dscIssue,
      expiryDate: dscExpiry,
      issuerName: dscIssuer,
      tokenName: dscToken,
      firmName: dscFirm,
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });
    setDscClients([...dscClients, added]);
    setShowAddDsc(false);
    setDscName(''); setDscFirm(''); setAddAssignedEmpId('');
  };

  const handleCreateOther = (e: React.FormEvent) => {
    e.preventDefault();
    if (!othName || !othService) {
      alert('Client Name and Service chosen are required.');
      return;
    }
    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2OtherServiceClient({
      clientName: othName,
      serviceAvailed: othService,
      referredBy: othReferred,
      dateOfRegistration: othRegDate,
      address: othAddress,
      emailId: othEmail,
      mobileNumber: othMobile,
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });
    setOtherClients([...otherClients, added]);
    setShowAddOther(false);
    setOthName(''); setOthReferred(''); setOthAddress(''); setOthEmail(''); setOthMobile(''); setAddAssignedEmpId('');
  };

  // Exports
  const handleExportAudit = () => {
    const headers = ['Client Name', 'Auditor Form Type', 'Taxpayer Code', 'Compliance Status'];
    const rows = taxAudits.map(a => [a.clientName, a.auditForm, a.taxpayerType, a.status]);
    exportToCSVFile('tax_audit_registry.csv', headers, rows);
  };

  const filteredItr = itrClients.filter(c => {
    const searchMatch = c.taxpayerName.toLowerCase().includes(itrSearch.toLowerCase()) ||
      c.panNumber.toLowerCase().includes(itrSearch.toLowerCase()) ||
      c.typeOfItr.toLowerCase().includes(itrSearch.toLowerCase());
    if (!searchMatch) return false;

    if (itrStatusFilter !== 'ALL') {
      if (itrStatusFilter === 'Pending' && c.itrStatus !== 'NOT FILED') return false;
      if (itrStatusFilter === 'Filed' && c.itrStatus !== 'FILED') return false;
      if (itrStatusFilter === 'E-V Pending' && c.itrStatus !== 'PENDING FOR E-VERIFY') return false;
      if (itrStatusFilter === 'Tax Audit Pending' && c.itrStatus !== 'PENDING FOR TAX AUDIT') return false;
    }
    return true;
  });

  const getMergedTaxAudits = () => {
    const base = getV2TaxAuditClients();
    return base.map(b => {
      const override = taxAuditOverrides.find(o => o.clientId === b.id);
      
      let username = '';
      let password = '';
      let phone = '';
      let email = '';

      const matchedItr = itrClients.find(i => i.id === b.id);
      if (matchedItr) {
        username = matchedItr.panNumber;
        password = matchedItr.itPortalPassword || '';
        phone = (matchedItr as any).mobile || '';
        email = (matchedItr as any).email || '';
      } else {
        const matchedTrust = trustClients.find(t => `TRUST-AUD-${t.id}` === b.id || t.id === b.id);
        if (matchedTrust) {
          username = matchedTrust.itPortalUsername || '';
          password = matchedTrust.itPortalPassword || '';
          phone = matchedTrust.mobileNumber || '';
          email = matchedTrust.emailId || '';
        }
      }

      return {
        ...b,
        status: override ? override.status : b.status,
        assignedEmployeeId: override ? override.assignedEmployeeId : undefined,
        assignedEmployeeName: override ? override.assignedEmployeeName : undefined,
        username,
        password,
        phone,
        email
      };
    });
  };

  const filteredTaxAudits = getMergedTaxAudits().filter(aud => {
    if (taxAuditFilter === 'ALL') return true;
    if (taxAuditFilter === 'PENDING') return aud.status === 'NOT FILED' || aud.status === 'PENDING';
    if (taxAuditFilter === 'COMPLETED') return aud.status === 'FILED' || aud.status === 'COMPLETED';
    if (taxAuditFilter === 'PENDING WITH CA') return aud.status === 'PENDING WITH CA';
    if (taxAuditFilter === 'BALANCE SHEET PENDING') return aud.status === 'BALANCE SHEET PENDING';
    if (taxAuditFilter === 'FORM PENDING') return aud.status === 'FORM PENDING';
    return true;
  });

  const mcaClientsData = getV2McaClients();
  
  // Build dynamic forwarded DSC entries for directors not found in dscClients
  const forwardedDscDirectors = mcaClientsData
    .filter(c => c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'LLP' || c.clientType === 'SECTION 8 NGO')
    .flatMap(c => (c.directors || []).map(dir => ({
      director: dir,
      client: c
    })))
    .filter(({ director }) => {
      // check if director already has an associated DSC record (case-insensitive matches)
      const hasDsc = dscClients.some(dsc => 
        dsc.clientName.toLowerCase().trim() === director.name.toLowerCase().trim()
      );
      return !hasDsc; // only forward if NOT associated
    })
    .map(({ director, client }) => ({
      id: `FWD-${director.dinNumber}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      clientName: director.name,
      firmName: client.clientName,
      issueDate: 'N/A',
      expiryDate: 'N/A',
      issuerName: 'N/A' as any,
      tokenName: 'N/A' as any,
      isWarning: true,
      warningMessage: 'No DSC Associates'
    }));

  const allDscItems = [
    ...dscClients.map(d => ({ ...d, isWarning: false, warningMessage: '' })),
    ...forwardedDscDirectors
  ];

  const getDscStatus = (expiryDateStr: string, isWarning: boolean) => {
    if (isWarning || expiryDateStr === 'N/A') return 'RENEWAL_PENDING';
    const exp = new Date(expiryDateStr);
    const now = new Date();
    const daysDiff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (daysDiff < 0) return 'RENEWAL_PENDING';
    if (daysDiff <= 90) return 'UPCOMING_RENEWAL';
    return 'ACTIVE';
  };

  const filteredDsc = allDscItems.filter(c => {
    const searchMatch = c.clientName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      c.issueDate.toLowerCase().includes(dscFilter.toLowerCase()) ||
      c.issuerName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      c.tokenName.toLowerCase().includes(dscFilter.toLowerCase()) ||
      c.firmName.toLowerCase().includes(dscFilter.toLowerCase());
    if (!searchMatch) return false;

    if (dscFilterDropdown !== 'ALL') {
      const dscStatus = getDscStatus(c.expiryDate, (c as any).isWarning);
      if (dscFilterDropdown === 'RENEWAL_PENDING' && dscStatus !== 'RENEWAL_PENDING') return false;
      if (dscFilterDropdown === 'ACTIVE' && dscStatus !== 'ACTIVE') return false;
      if (dscFilterDropdown === 'UPCOMING_RENEWAL' && dscStatus !== 'UPCOMING_RENEWAL') return false;
    }
    return true;
  });

  const getDscExpiryAlertBadge = (expiryStr: string) => {
    const expDate = new Date(expiryStr);
    const now = new Date();
    const daysDiff = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      return <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold uppercase font-mono">Expired</span>;
    } else if (daysDiff <= 90) {
      return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase font-mono">Expires in {daysDiff} Days</span>;
    }
    return <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold uppercase font-mono">Active ({daysDiff} Days)</span>;
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Sub tabs rail */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-3">
        <button onClick={() => setSubTab('itr')} className={`px-4.5 py-2 font-bold uppercase rounded-xl transition ${subTab === 'itr' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>📁 Income Tax Returns (ITR)</button>
        <button onClick={() => setSubTab('audit')} className={`px-4 py-2 font-bold uppercase rounded-xl transition ${subTab === 'audit' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🛡️ Tax Audit Management</button>
        <button onClick={() => setSubTab('trust')} className={`px-4 py-2 font-bold uppercase rounded-xl transition ${subTab === 'trust' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🤝 Trusts & Societies Ledger</button>
        <button onClick={() => setSubTab('dsc')} className={`px-4 py-2 font-bold uppercase rounded-xl transition ${subTab === 'dsc' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🔑 DSC Expiry Alert Panel</button>
        <button onClick={() => setSubTab('others')} className={`px-4 py-2 font-bold uppercase rounded-xl transition ${subTab === 'others' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🛠️ Miscellaneous (Other Services)</button>
      </div>

      {subTab === 'itr' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-150 uppercase">Income Tax return Desk</h3>
              <p className="text-[10px] text-slate-400">Manage individual ITR filers and automatically track corporate returns forwarded from MCA company registrations.</p>
            </div>
            <button onClick={() => setShowAddItr(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer text-xs">
              <Plus className="h-4 w-4" /> Add Manual Client (Individual)
            </button>
          </div>

          {showAddItr && (
            <form onSubmit={handleCreateItr} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-[#111] dark:text-[#fff] uppercase text-[10px]">Manual Individual Taxpayer Profile</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Taxpayer Name *</label>
                  <input type="text" required value={itrName} onChange={e => setItrName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Individual PAN Number *</label>
                  <input type="text" required maxLength={10} placeholder="e.g. BBMXJ1928D" value={itrPan} onChange={e => setItrPan(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Type of ITR Form</label>
                  <select value={itrItrType} onChange={e => setItrItrType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <option value="ITR-1">ITR-1 (Salary/Pension & One Property)</option>
                    <option value="ITR-2">ITR-2 (Capital gains & multiple properties)</option>
                    <option value="ITR-3">ITR-3 (Proprietorship business income)</option>
                    <option value="ITR-4">ITR-4 (Presumptive Sugam business model)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Password</label>
                  <input type="text" value={itrITPass} onChange={e => setItrITPass(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="itrAuditCheck" checked={itrIsAudit} onChange={e => setItrIsAudit(e.target.checked)} className="h-4 w-4 text-indigo-650" />
                  <label htmlFor="itrAuditCheck" className="font-bold text-slate-700 cursor-pointer">Tax Audit Applicable (3CD)</label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Residential Address</label>
                  <input type="text" value={itrAddress} onChange={e => setItrAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Employee / CA</label>
                  <select 
                    value={addAssignedEmpId} 
                    onChange={e => setAddAssignedEmpId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-sans text-xs"
                  >
                    <option value="">-- Choose Handler --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddItr(false)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer">Save Pro</button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl max-w-sm text-xs select-none">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search taxpayers, PAN, ITR schema..." value={itrSearch} onChange={e => setItrSearch(e.target.value)} className="bg-transparent border-0 w-full focus:ring-0 p-0" />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl text-xs select-none">
              <span className="text-slate-400 uppercase font-extrabold text-[9px]">Status:</span>
              <select 
                value={itrStatusFilter} 
                onChange={e => setItrStatusFilter(e.target.value)} 
                className="bg-transparent border-0 focus:ring-0 p-0 font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Filed">Filed (Completed)</option>
                <option value="E-V Pending">E-V Pending</option>
                <option value="Tax Audit Pending">Tax Audit Pending</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Taxpayer Client</th>
                  <th className="p-3">Category Type</th>
                  <th className="p-3">Tax Registration (PAN)</th>
                  <th className="p-3">ITR Form Schema</th>
                  <th className="p-3">ITR Filing Status</th>
                  <th className="p-3">Custody Handler</th>
                  <th className="p-3 pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredItr.map(cl => (
                  <tr key={cl.id} className="hover:bg-slate-550/5/20 transition-all">
                    <td className="p-3 pl-5">
                      <div className="font-extrabold text-slate-800 dark:text-slate-150">{cl.taxpayerName}</div>
                      {cl.address && <div className="text-[10px] text-slate-400 font-sans">{cl.address}</div>}
                      
                      {/* View Contact Detail Option */}
                      <div className="mt-1">
                        <button 
                          type="button"
                          onClick={() => setExpandedContacts(prev => ({ ...prev, [cl.id]: !prev[cl.id] }))}
                          className="text-[9px] text-[#2563eb] hover:underline font-bold uppercase tracking-wider block focus:outline-none cursor-pointer"
                        >
                          {expandedContacts[cl.id] ? 'Hide Contact Details' : 'View Contact Details'}
                        </button>
                        {expandedContacts[cl.id] && (
                          <div className="mt-1 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-lg text-[9.5px] text-slate-500 font-mono space-y-0.5 max-w-xs">
                            <div>📞 Mobile: {cl.mobile || '9988776655'}</div>
                            <div>✉ Email: {cl.email || 'filer.taxpayer@gmail.com'}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-500">
                      {cl.taxpayerType}
                      {cl.linkedMcaClientId && <span className="ml-1 px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[8.5px] rounded border border-indigo-200">MCA API LINKED</span>}
                      {cl.linkedTrustId && <span className="ml-1 px-1.5 py-0.2 bg-pink-50 text-pink-700 text-[8.5px] rounded border border-pink-200">NGO API LINKED</span>}
                    </td>
                    <td className="p-3">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 p-1 rounded font-bold text-slate-700 dark:text-slate-200">{cl.panNumber}</span>
                      {cl.itPortalPassword && (
                        <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-mono mt-1">
                          <span>PW:</span>
                          <span>{visiblePasswords[cl.id] ? cl.itPortalPassword : '••••••••'}</span>
                          <button 
                            type="button" 
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [cl.id]: !prev[cl.id] }))}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 focus:outline-none cursor-pointer"
                          >
                            {visiblePasswords[cl.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-200 text-amber-700 font-bold max-w-fit rounded text-[10px] font-mono select-none">{cl.typeOfItr}</span>
                      {cl.isAuditApplicable && <span className="block text-[8px] uppercase font-bold text-emerald-500 font-mono mt-1 select-none">✔ Audit Form 3CD Required</span>}
                    </td>
                    <td className="p-3">
                      <select value={cl.itrStatus} onChange={e => handleUpdateItrStatus(cl.id, e.target.value as any)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold focus:ring-0">
                        <option value="NOT FILED">Not Filed</option>
                        <option value="FILED">Filed (Completed)</option>
                        <option value="PENDING FOR E-VERIFY">E-Verify Pending</option>
                        <option value="PENDING FOR TAX AUDIT">Pending Tax Audit</option>
                      </select>
                    </td>
                    <td className="p-3 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        {cl.assignedEmployeeName || '🔴 Unassigned'}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setTransferringItrClient(cl)} 
                        className="text-[9px] bg-indigo-50 dark:bg-indigo-955/35 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Users className="h-2.5 w-2.5" /> Transfer Custody
                      </button>
                    </td>
                    <td className="p-3 pr-5">
                      <div className="flex items-center gap-2">
                        <button 
                          type="button" 
                          onClick={() => setEditingItrClient(cl)} 
                          className="p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 rounded-lg transition shrink-0 cursor-pointer"
                          title="Modify Client"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete client ${cl.taxpayerName}?`)) {
                              deleteV2ItrClient(cl.id);
                              setItrClients(getV2ItrClients());
                            }
                          }} 
                          className="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-850 rounded-lg transition shrink-0 cursor-pointer"
                          title="Delete Client"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-105 dark:border-slate-850">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-150 uppercase">Tax Audit Core Pipeline (Section 44AB)</h3>
              <p className="text-[10px] text-slate-400">Strict automation view mapping files forwarded directly from ITR modules & Trusts with active 12A/80G tags.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl text-xs select-none">
                <span className="text-slate-400 uppercase font-extrabold text-[9px]">Status:</span>
                <select 
                  value={taxAuditFilter} 
                  onChange={e => setTaxAuditFilter(e.target.value)} 
                  className="bg-transparent border-0 focus:ring-0 p-0 font-bold text-slate-700 dark:text-slate-200 text-xs"
                >
                  <option value="ALL">All Audits</option>
                  <option value="PENDING">View Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING WITH CA">Pending with CA</option>
                  <option value="BALANCE SHEET PENDING">Balance Sheet Pending</option>
                  <option value="FORM PENDING">Form Pending</option>
                </select>
              </div>
              <button onClick={handleExportAudit} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                <Download className="h-4 w-4" /> Export Audit Ledger
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-955/15 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-slate-650 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-650 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-700">Strict Security Rule Enforced:</span> Manual additions are disabled inside the Audit workspace. Tax auditing profiles are strictly piped from validated individual business thresholds or non-profits having 12A exemption credentials automatically to preserve data integrity.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Client Company File Name</th>
                  <th className="p-3">Organization Profile Type</th>
                  <th className="p-3">Applicable Audit Form</th>
                  <th className="p-3">Assigned Employee</th>
                  <th className="p-3">Audit Operational Status</th>
                  <th className="p-3 pr-5">Credentials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredTaxAudits.map(aud => (
                  <tr key={aud.id} className="hover:bg-slate-50/50">
                    <td className="p-3 pl-5">
                      <div className="font-extrabold text-slate-850 dark:text-slate-100">{aud.clientName}</div>
                      
                      {/* Contact Details View Option below client name */}
                      <div className="mt-1">
                        <button 
                          type="button" 
                          onClick={() => setExpandedContacts(prev => ({ ...prev, [aud.id]: !prev[aud.id] }))}
                          className="text-[9px] text-[#2563eb] hover:underline font-bold uppercase tracking-wider block focus:outline-none cursor-pointer text-left"
                        >
                          {expandedContacts[aud.id] ? 'Hide Contact Details' : 'View Contact Details'}
                        </button>
                        {expandedContacts[aud.id] && (
                          <div className="mt-1 p-1 bg-slate-50 dark:bg-slate-955 border border-slate-150 rounded text-[9px] text-slate-500 font-mono space-y-0.5 max-w-xs">
                            <div>📞 Ph: {aud.phone || '9123456789'}</div>
                            <div>✉ Email: {aud.email || 'comply.officer@audit-firm.in'}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-500 uppercase font-mono tracking-wide">{aud.taxpayerType}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border border-rose-250 dark:border-rose-900 rounded font-bold font-mono text-[9.5px]">{aud.auditForm}</span>
                    </td>
                    <td className="p-3">
                      <select 
                        value={aud.assignedEmployeeId || ''} 
                        onChange={e => {
                          const matched = allEmployees.find(emp => emp.id === e.target.value);
                          handleUpdateTaxAuditStatus(aud.id, aud.status, e.target.value, matched ? matched.name : undefined);
                        }}
                        className="p-1 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-bold focus:ring-0 max-w-[140px]"
                      >
                        <option value="">🔴 Unassigned</option>
                        {allEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select 
                        value={aud.status} 
                        onChange={e => handleUpdateTaxAuditStatus(aud.id, e.target.value as any, aud.assignedEmployeeId, aud.assignedEmployeeName)} 
                        className="p-1 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-bold focus:ring-0 max-w-[160px]"
                      >
                        <option value="PENDING">Pending (Not Filed)</option>
                        <option value="COMPLETED">Completed (Filed)</option>
                        <option value="PENDING WITH CA">Pending with CA</option>
                        <option value="BALANCE SHEET PENDING">Balance Sheet Pending</option>
                        <option value="FORM PENDING">Form Pending</option>
                      </select>
                    </td>
                    <td className="p-3 pr-5 font-bold">
                      <div className="relative inline-block text-left">
                        <button 
                          type="button" 
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, [aud.id]: !prev[aud.id] }))}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-650 dark:text-slate-350 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                        >
                          <KeyRound className="h-3 w-3" /> View Credentials
                        </button>
                        {visiblePasswords[aud.id] && (
                          <div className="absolute right-0 mt-1.5 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-md z-30 font-mono text-[9px] text-slate-700 dark:text-slate-200 space-y-1 min-w-[150px]">
                            <div className="flex justify-between gap-2 border-b pb-1">
                              <span className="font-bold text-slate-400 uppercase text-[8px]">Portal ID</span>
                              <span className="font-extrabold text-indigo-600">{aud.username || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="font-bold text-slate-400 uppercase text-[8px]">Portal Pass</span>
                              <span className="font-bold text-emerald-600 col-span-2">{aud.password || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'trust' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-150 uppercase text-sm">Trusts & Societies Exemption Registry</h3>
              <p className="text-[10px] text-slate-400 font-medium">Coordinate non-profit registrations, monitor 12A/80G statutory filings, health status reporting, and portal credentials.</p>
            </div>
            <button onClick={() => setShowAddTrust(true)} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" /> Add NGO File
            </button>
          </div>

          {showAddTrust && (
            <form onSubmit={handleCreateTrust} className="p-5 bg-white border border-slate-205 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-indigo-700 uppercase">Register New NGO Exempt Client</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Entity Name *</label>
                  <input type="text" required value={tName} onChange={e => setTName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">NGO Entity Structure *</label>
                  <select value={tType} onChange={e => setTType(e.target.value as any)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="Trust">Trust Registered File (Exempt)</option>
                    <option value="Society">Co-operative Society (Exempt)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Authorized Signatory Name *</label>
                  <input type="text" required value={tSign} onChange={e => setTSign(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Email ID *</label>
                  <input type="email" required value={tEmail} onChange={e => setTEmail(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number Line</label>
                  <input type="tel" value={tMobile} onChange={e => setTMobile(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="trust12aCheck" checked={t12a80g} onChange={e => setT12a80g(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="trust12aCheck" className="font-bold text-slate-700 cursor-pointer">Has Active 12A / 80G Exemptions</label>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Username</label>
                  <input type="text" value={tUser} onChange={e => setTUser(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Password</label>
                  <input type="text" value={tPass} onChange={e => setTPass(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Registered Office Address Location</label>
                  <input type="text" value={tAddress} onChange={e => setTAddress(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Employee / CA</label>
                  <select 
                    value={addAssignedEmpId} 
                    onChange={e => setAddAssignedEmpId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans text-xs"
                  >
                    <option value="">-- Choose Handler --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTrust(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer">Save NGO</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trustClients.map(tr => (
              <div key={tr.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-805 dark:text-slate-100 text-sm leading-tight">{tr.entityName}</h4>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Exempt Category: {tr.typeOfEntity}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setEditingTrustClient(tr)} 
                      className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-450 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900"
                      title="Modify Client"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete NGO trust ${tr.entityName}?`)) {
                          deleteV2TrustClient(tr.id);
                          setTrustClients(getV2TrustClients());
                        }
                      }} 
                      className="p-1 px-1.5 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900"
                      title="Delete Client"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-right border-l pl-2 border-slate-150 dark:border-slate-850">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Health Score</div>
                      <div className="text-xl font-black text-teal-650 dark:text-teal-400">{tr.healthScore}%</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-955 border border-slate-105 dark:border-slate-850 rounded-2xl font-mono text-[10.5px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Auth Signatory</span>
                    <span className="font-extrabold text-slate-705 dark:text-slate-150">{tr.authSignatory}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Exemptions Status</span>
                    {tr.has12A80G ? (
                      <span className="px-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[8.5px] font-bold rounded">12A & 80G ACTIVE</span>
                    ) : (
                      <span className="px-1 bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8.5px] font-bold rounded">BASIC NGO</span>
                    )}
                  </div>
                </div>

                {/* Sub-actions for Contact Detail and Credentials Viewing (V2.4.3) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setExpandedContacts(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                    className="p-1 px-2.5 text-slate-705 dark:text-slate-200 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 rounded-lg text-[9px] uppercase font-semibold tracking-wider cursor-pointer"
                  >
                    {expandedContacts[tr.id] ? '🔒 Hide Contacts' : '📞 View Contacts'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setVisiblePasswords(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                    className="p-1 px-2.5 text-indigo-655 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 rounded-lg text-[9px] uppercase font-semibold tracking-wider cursor-pointer"
                  >
                    {visiblePasswords[tr.id] ? '🔑 Hide Credentials' : '🔑 View Credentials'}
                  </button>
                </div>

                {/* Expandable panels */}
                {expandedContacts[tr.id] && (
                  <div className="p-3 bg-indigo-955/5 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-[10px] space-y-1">
                    <div className="font-bold text-slate-500 text-[8.5px] uppercase">Signatory Contact Details:</div>
                    <div className="font-mono text-slate-705 dark:text-slate-350">✉ Email: {tr.emailId || 'ngo.society.sign@org.in'}</div>
                    <div className="font-mono text-slate-705 dark:text-slate-350">📞 Mobile: {tr.mobileNumber || '9876543210'}</div>
                  </div>
                )}

                {visiblePasswords[tr.id] && (
                  <div className="p-3 bg-emerald-955/5 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl text-[10px] space-y-1">
                    <div className="font-bold text-slate-500 text-[8.5px] uppercase font-sans">Income Tax Portal Access Credentials:</div>
                    <div className="font-mono text-slate-705 dark:text-slate-300">Username: <span className="font-extrabold text-teal-655">{tr.itPortalUsername || 'NGO_USER'}</span></div>
                    <div className="font-mono text-slate-705 dark:text-slate-300">Password: <span className="font-extrabold text-teal-600">{tr.itPortalPassword || 'NGO_PASS_88'}</span></div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Handler Assigned</span>
                    <span className="font-extrabold text-indigo-650 dark:text-indigo-400">
                      {tr.assignedEmployeeName || '🔴 Unassigned'}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setTransferringTrustClient(tr)} 
                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border border-indigo-150/50 rounded-xl text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] cursor-pointer flex items-center gap-1 transition"
                  >
                    <Users className="h-3 w-3" /> Transfer Hand
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'dsc' && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 select-none">
            <div>
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] text-sm uppercase">Digital Signature Certificate (DSC) Expirations</h3>
              <p className="text-[10px] text-slate-455 font-medium tracking-wide">Maintain active alert lists for director and promoter signatures, token hardware logs (MToken/Proxkey), and renewal alarms.</p>
            </div>
            <button onClick={() => setShowAddDsc(true)} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" /> Create DSC Alarm Alert
            </button>
          </div>

          {showAddDsc && (
            <form onSubmit={handleCreateDsc} className="p-4 bg-white border border-slate-205 rounded-xl space-y-4">
              <h4 className="font-extrabold text-indigo-755 uppercase text-[10px]">Create DSC Client record</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Representative / Signatory Name *</label>
                  <input type="text" required value={dscName} onChange={e => setDscName(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Organization Company / Trust Name *</label>
                  <input type="text" required placeholder="e.g. InnoTech Tech Pvt Ltd" value={dscFirm} onChange={e => setDscFirm(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">DSC Issue Date *</label>
                  <input type="date" value={dscIssue} onChange={e => setDscIssue(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-505">DSC Expiry Date *</label>
                  <input type="date" value={dscExpiry} onChange={e => setDscExpiry(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-350">Signature Certification Agency Issuer *</label>
                  <select value={dscIssuer} onChange={e => setDscIssuer(e.target.value as any)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="Prodigisgn">Prodigisgn (CCA Approved)</option>
                    <option value="PentaSign">PentaSign (CCA Approved)</option>
                    <option value="Sify">Sify SafeScrypt (CCA Approved)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-350">Token Safe Hardware *</label>
                  <select value={dscToken} onChange={e => setDscToken(e.target.value as any)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="Proxkey">Proxkey (USB Crypto Token)</option>
                    <option value="MToken">MToken (USB Crypto Token)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-505">Assign to Employee / CA</label>
                  <select 
                    value={addAssignedEmpId} 
                    onChange={e => setAddAssignedEmpId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans text-xs"
                  >
                    <option value="">-- Choose Handler --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddDsc(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer">Save DSC Record</button>
              </div>
            </form>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl max-w-sm text-xs select-none w-full sm:w-80">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search representative name, issuer, hard token..." value={dscFilter} onChange={e => setDscFilter(e.target.value)} className="bg-transparent border-0 w-full focus:ring-0 p-0" />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl text-xs select-none">
              <span className="text-slate-400 font-extrabold uppercase text-[9px]">Status Alarm:</span>
              <select
                value={dscFilterDropdown}
                onChange={e => setDscFilterDropdown(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 p-0 font-bold text-slate-705 dark:text-slate-200 text-xs"
              >
                <option value="ALL">All DSC Records</option>
                <option value="RENEWAL_PENDING">Renewal Pending</option>
                <option value="ACTIVE">Active (Valid)</option>
                <option value="UPCOMING_RENEWAL">Upcoming Renewal</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-955 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Signatory Representative</th>
                  <th className="p-3">Firm / corporate Account</th>
                  <th className="p-3">CCA Certify Issuer</th>
                  <th className="p-3">Hardware Crypto Token</th>
                  <th className="p-3">Key Validity & Alerts</th>
                  <th className="p-3">Custody Handler</th>
                  <th className="p-3 pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredDsc.map(ds => {
                  const isFwdWarning = 'isWarning' in ds && ds.isWarning;
                  return (
                    <tr key={ds.id} className={`hover:bg-slate-50/50 ${isFwdWarning ? 'bg-rose-50/10 dark:bg-rose-955/5' : ''}`}>
                      <td className="p-3 pl-5 font-black text-slate-850 dark:text-slate-101">
                        <div>{ds.clientName}</div>
                        {isFwdWarning && (
                          <span className="text-[8.5px] text-rose-500 font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md mt-0.5 inline-block leading-none">
                            Forwarded Company Director
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-550">{ds.firmName}</td>
                      <td className="p-3 font-semibold text-slate-655">{ds.issuerName}</td>
                      <td className={`p-3 font-mono font-bold ${isFwdWarning ? 'text-slate-400' : 'text-indigo-650'}`}>{ds.tokenName}</td>
                      <td className="p-3 space-y-1">
                        {isFwdWarning ? (
                          <div className="space-y-1.5">
                            <div className="flex bg-rose-55 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-extrabold text-[9px] uppercase rounded-lg px-2 py-0.5 items-center gap-1 w-fit">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> No DSC Associates
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
                              className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold block cursor-pointer"
                            >
                              ➕ Auto Register DSC
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">{getDscExpiryAlertBadge(ds.expiryDate)}</div>
                            <div className="text-[9.5px] text-slate-400 font-mono font-semibold">Issued: {ds.issueDate} • Exp: {ds.expiryDate}</div>
                          </>
                        )}
                      </td>
                      <td className="p-3 space-y-1 text-xs">
                        {isFwdWarning ? (
                          <span className="text-slate-450 italic text-[10px]">Piped via MCA directors list</span>
                        ) : (
                          <>
                            <div className="font-bold text-slate-705 dark:text-slate-300">
                              {(ds as any).assignedEmployeeName || '🔴 Unassigned'}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setTransferringDscClient(ds as V2DscClient)} 
                              className="text-[9px] bg-indigo-50 dark:bg-indigo-955/35 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 flex items-center gap-1"
                            >
                              <Users className="h-2.5 w-2.5" /> Transfer Custody
                            </button>
                          </>
                        )}
                      </td>
                      <td className="p-3 pr-5">
                        {!isFwdWarning && (
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button" 
                              onClick={() => {
                                setRenewalDscClient(ds as V2DscClient);
                                setRenewalIssueDate(ds.issueDate);
                                setRenewalExpiryDate(ds.expiryDate);
                              }} 
                              className="px-2 py-1 bg-yellow-50 dark:bg-yellow-955/10 border border-yellow-250 dark:border-yellow-905 text-yellow-700 dark:text-yellow-405 font-bold uppercase text-[9px] tracking-wider rounded-lg hover:bg-yellow-100 cursor-pointer transition flex items-center gap-1"
                              title="Renew DSC Alert"
                            >
                              <Calendar className="h-2.5 w-2.5" /> Renewed
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditingDscClient(ds as V2DscClient)} 
                              className="p-1 text-slate-500 hover:text-indigo-650 cursor-pointer transition rounded"
                              title="Modify Client"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete DSC client ${ds.clientName}?`)) {
                                  deleteV2DscClient(ds.id);
                                  setDscClients(getV2DscClients());
                                }
                              }} 
                              className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer transition rounded"
                              title="Delete Client"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'others' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 select-none">
            <div>
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] text-sm uppercase">Miscellaneous Certificate registrations</h3>
              <p className="text-[10px] text-slate-450 font-medium">Log and manage MSME Udyam, Import Export Code (IEC), NGO Darpan listings, and custom one-time certificate executions.</p>
            </div>
            <button onClick={() => setShowAddOther(true)} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" /> Log New Certificate Application
            </button>
          </div>

          {showAddOther && (
            <form onSubmit={handleCreateOther} className="p-4 bg-white border border-slate-205 rounded-xl space-y-4">
              <h4 className="font-extrabold text-indigo-750 uppercase text-[10px]">Application registry form</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Client / Business Name *</label>
                  <input type="text" required value={othName} onChange={e => setOthName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Service Registration Category *</label>
                  <select value={othService} onChange={e => setOthService(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="msme">MSME Udyam Registration (Filing)</option>
                    <option value="iec">Import Export Code (DGFT IEC)</option>
                    <option value="NGO Darpan">NITI Aayog NGO Darpan unique ID</option>
                    <option value="12A & 80G">Exemption Certificate (12A/80G special filing)</option>
                    <option value="FSSAI Basic">FSSAI Food License filing</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Referred By Coordinator</label>
                  <input type="text" value={othReferred} onChange={e => setOthReferred(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Filing Execution Date</label>
                  <input type="date" value={othRegDate} onChange={e => setOthRegDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Email</label>
                  <input type="email" value={othEmail} onChange={e => setOthEmail(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Contact Mobile</label>
                  <input type="tel" value={othMobile} onChange={e => setOthMobile(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Establishment Physical Location</label>
                  <input type="text" value={othAddress} onChange={e => setOthAddress(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Employee / CA</label>
                  <select 
                    value={addAssignedEmpId} 
                    onChange={e => setAddAssignedEmpId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans text-xs"
                  >
                    <option value="">-- Choose Handler --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddOther(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer">Submit Record</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherClients.map(ot => (
              <div key={ot.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-start gap-3 shadow-3xs">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-955/15 text-purple-600 rounded-xl shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-805 dark:text-slate-100 text-xs leading-tight">{ot.clientName}</h4>
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8.5px] rounded select-none uppercase font-mono font-bold">{ot.serviceAvailed}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-350 space-y-0.5 font-mono">
                    <div className="font-sans">Referral: <span className="font-bold text-slate-650 dark:text-slate-200">{ot.referredBy || 'Direct'}</span></div>
                    <div>Applied At: {ot.dateOfRegistration}</div>
                    <div>Email contacts: {ot.emailId || 'N/A'}</div>
                    <div className="font-sans">Address: {ot.address || 'N/A'}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Handler Assigned</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {ot.assignedEmployeeName || '🔴 Unassigned'}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setTransferringOtherClient(ot)} 
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border border-indigo-150/50 rounded-xl text-indigo-650 dark:text-indigo-400 font-extrabold text-[10px] cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Users className="h-3 w-3" /> Transfer Hand
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ITR TRANSFER MODAL */}
      {transferringItrClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-650" /> Transfer ITR Custody
              </h3>
              <button type="button" onClick={() => setTransferringItrClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringItrClient.taxpayerName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">PAN: {transferringItrClient.panNumber} • {transferringItrClient.typeOfItr}</div>
              <div className="pt-2 mt-2 border-t border-slate-200/55 flex justify-between text-[11px]">
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
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
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
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRUST TRANSFER MODAL */}
      {transferringTrustClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-650" /> Transfer NGO/Trust Hand
              </h3>
              <button type="button" onClick={() => setTransferringTrustClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringTrustClient.entityName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{transferringTrustClient.typeOfEntity} • Score: {transferringTrustClient.healthScore}%</div>
              <div className="pt-2 mt-2 border-t mt-2 border-slate-200/55 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{transferringTrustClient.assignedEmployeeName || '🔴 Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pick New NGO Handler *</label>
              <select 
                defaultValue={transferringTrustClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = allEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringTrustClient.assignedEmployeeId = employee.id;
                    transferringTrustClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringTrustClient.assignedEmployeeId = undefined;
                    transferringTrustClient.assignedEmployeeName = undefined;
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                <option value="">-- No Assignment --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setTransferringTrustClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2TrustClient(transferringTrustClient);
                  setTrustClients(getV2TrustClients());
                  setTransferringTrustClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DSC TRANSFER MODAL */}
      {transferringDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-650" /> Transfer DSC Hand
              </h3>
              <button type="button" onClick={() => setTransferringDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringDscClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{transferringDscClient.firmName} • Token: {transferringDscClient.tokenName}</div>
              <div className="pt-2 mt-2 border-t mt-2 border-slate-200/55 flex justify-between text-[11px]">
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
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
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
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTHER SERVICES TRANSFER MODAL */}
      {transferringOtherClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-650" /> Transfer Misc Hand
              </h3>
              <button type="button" onClick={() => setTransferringOtherClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringOtherClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Service: {transferringOtherClient.serviceAvailed} • Referral: {transferringOtherClient.referredBy || 'Direct'}</div>
              <div className="pt-2 mt-2 border-t mt-2 border-slate-200/55 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-705 dark:text-slate-300">{transferringOtherClient.assignedEmployeeName || '🔴 Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pick New Custody Handler *</label>
              <select 
                defaultValue={transferringOtherClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = allEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringOtherClient.assignedEmployeeId = employee.id;
                    transferringOtherClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringOtherClient.assignedEmployeeId = undefined;
                    transferringOtherClient.assignedEmployeeName = undefined;
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                <option value="">-- No Assignment --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setTransferringOtherClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2OtherServiceClient(transferringOtherClient);
                  setOtherClients(getV2OtherServiceClients());
                  setTransferringOtherClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Modify ITR Client
              </h3>
              <button type="button" onClick={() => setEditingItrClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
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
                  value={editingItrClient.panCardNumber} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, panCardNumber: e.target.value.toUpperCase() })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">ITR Filing Status *</label>
                <select 
                  value={editingItrClient.itrStatus} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, itrStatus: e.target.value as any })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="PENDING">Pending</option>
                  <option value="FILED">Filed</option>
                  <option value="E-V PENDING">E-V Pending</option>
                  <option value="TAX AUDIT PENDING">Tax Audit Pending</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Type of ITR Form</label>
                <select 
                  value={editingItrClient.typeOfItr} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, typeOfItr: e.target.value as any })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="ITR-1">ITR-1 (Sahaj)</option>
                  <option value="ITR-2">ITR-2 (Capital Gains)</option>
                  <option value="ITR-3">ITR-3 (Proprietorship)</option>
                  <option value="ITR-4">ITR-4 (Sugam)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_audit_applicable" 
                  checked={editingItrClient.isAuditApplicable} 
                  onChange={e => setEditingItrClient({ ...editingItrClient, isAuditApplicable: e.target.checked })} 
                  className="h-4 w-4 rounded text-indigo-650 focus:ring-indigo-505" 
                />
                <label htmlFor="edit_audit_applicable" className="text-xs font-bold text-slate-700 dark:text-slate-350">Requires Tax Audit (44AB)?</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setEditingItrClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2ItrClient(editingItrClient);
                  setItrClients(getV2ItrClients());
                  setEditingItrClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TRUST/NGO CLIENT MODAL */}
      {editingTrustClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Modify NGO Trust
              </h3>
              <button type="button" onClick={() => setEditingTrustClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">NGO Trust/Society Entity Name *</label>
                <input 
                  type="text" 
                  value={editingTrustClient.entityName} 
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, entityName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Exempt Category Type *</label>
                <select 
                  value={editingTrustClient.typeOfEntity} 
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, typeOfEntity: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="Religious Trust">Religious Trust</option>
                  <option value="Charitable Trust">Charitable Trust</option>
                  <option value="Educational Society">Educational Society</option>
                  <option value="Scientific Research Assoc">Scientific Research Assoc</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Authorized Signatory *</label>
                <input 
                  type="text" 
                  value={editingTrustClient.authSignatory} 
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, authSignatory: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Email ID *</label>
                  <input 
                    type="email" 
                    value={editingTrustClient.emailId} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, emailId: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number *</label>
                  <input 
                    type="text" 
                    value={editingTrustClient.mobileNumber} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, mobileNumber: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Portal User ID</label>
                  <input 
                    type="text" 
                    value={editingTrustClient.itPortalUsername || ''} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, itPortalUsername: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Portal Password</label>
                  <input 
                    type="text" 
                    value={editingTrustClient.itPortalPassword || ''} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, itPortalPassword: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_has_12A_80G" 
                  checked={editingTrustClient.has12A80G} 
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, has12A80G: e.target.checked })} 
                  className="h-4 w-4 rounded text-indigo-650 focus:ring-indigo-505" 
                />
                <label htmlFor="edit_has_12A_80G" className="text-xs font-bold text-slate-700 dark:text-slate-350">Has active 12A & 80G clearances?</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setEditingTrustClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2TrustClient(editingTrustClient);
                  setTrustClients(getV2TrustClients());
                  setEditingTrustClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DSC CLIENT RECORD MODAL */}
      {editingDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-650" /> Modify DSC Record
              </h3>
              <button type="button" onClick={() => setEditingDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Representative / Signatory Name *</label>
                <input 
                  type="text" 
                  value={editingDscClient.clientName} 
                  onChange={e => setEditingDscClient({ ...editingDscClient, clientName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Organization Company / Trust Name *</label>
                <input 
                  type="text" 
                  value={editingDscClient.firmName} 
                  onChange={e => setEditingDscClient({ ...editingDscClient, firmName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">DSC Issue Date *</label>
                  <input 
                    type="date" 
                    value={editingDscClient.issueDate} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, issueDate: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">DSC Expiry Date *</label>
                  <input 
                    type="date" 
                    value={editingDscClient.expiryDate} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, expiryDate: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Certify Issuer Agent</label>
                  <select 
                    value={editingDscClient.issuerName} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, issuerName: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <option value="Prodigisgn">Prodigisgn</option>
                    <option value="PentaSign">PentaSign</option>
                    <option value="Sify">Sify SafeScrypt</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Token Hardware Type</label>
                  <select 
                    value={editingDscClient.tokenName} 
                    onChange={e => setEditingDscClient({ ...editingDscClient, tokenName: e.target.value as any })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <option value="Proxkey">Proxkey</option>
                    <option value="MToken">MToken</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setEditingDscClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2DscClient(editingDscClient);
                  setDscClients(getV2DscClients());
                  setEditingDscClient(null);
                }} 
                className="px-4 py-1.5 bg-indigo-650 text-white font-black rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DSC RENEWED BUTTON MODAL */}
      {renewalDscClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] uppercase flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" /> Enter DSC Renewal Dates
              </h3>
              <button type="button" onClick={() => setRenewalDscClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
              <div className="font-extrabold text-emerald-850 dark:text-emerald-400 text-xs">Signatory: {renewalDscClient.clientName}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Firm: {renewalDscClient.firmName}</div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Renewal / Issue Date *</label>
                <input 
                  type="date" 
                  value={renewalIssueDate} 
                  required
                  onChange={e => setRenewalIssueDate(e.target.value)} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-bold" 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">New Expiry Date *</label>
                <input 
                  type="date" 
                  value={renewalExpiryDate} 
                  required
                  onChange={e => setRenewalExpiryDate(e.target.value)} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-bold" 
                />
                <span className="text-[9.5px] text-slate-450 block pt-0.5">Tip: A standard DSC is typically valid for exactly 2 years.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button type="button" onClick={() => setRenewalDscClient(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  if (!renewalIssueDate || !renewalExpiryDate) {
                    alert('Please specify both the issue and expiry dates.');
                    return;
                  }
                  const updated: V2DscClient = {
                    ...renewalDscClient,
                    issueDate: renewalIssueDate,
                    expiryDate: renewalExpiryDate,
                  };
                  updateV2DscClient(updated);
                  setDscClients(getV2DscClients());
                  setRenewalDscClient(null);
                }} 
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
