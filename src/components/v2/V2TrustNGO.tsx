/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Landmark, Plus, Search, Download, Award, Users, Edit2, 
  Trash2, X, CheckCircle, AlertTriangle, ShieldCheck, HeartHandshake,
  KeyRound, Phone, Mail, MapPin, Eye, EyeOff, Calendar, CheckCircle2, FileCheck
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { 
  V2TrustClient, 
  getV2TrustClients, 
  addV2TrustClient, 
  updateV2TrustClient, 
  deleteV2TrustClient,
  exportToCSVFile,
  getV1Employees
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';

interface V2TrustNGOProps {
  key?: string;
  initialFilter?: string;
  initialShowAdd?: boolean;
  initialShowAddTrust?: boolean;
}

export default function V2TrustNGO({
  initialFilter = 'ALL',
  initialShowAdd = false,
  initialShowAddTrust = false
}: V2TrustNGOProps) {
  const [trustClients, setTrustClients] = useState<V2TrustClient[]>(getV2TrustClients());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allEmployees] = useState(getV1Employees());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<string>(
    (initialFilter === '12A' || initialFilter === '80G' || initialFilter === '12A_80G') ? '12A_80G' : initialFilter
  );

  // Form & Modals
  const [showAddTrust, setShowAddTrust] = useState(initialShowAdd || initialShowAddTrust);
  const [editingTrustClient, setEditingTrustClient] = useState<V2TrustClient | null>(null);
  const [transferringTrustClient, setTransferringTrustClient] = useState<V2TrustClient | null>(null);

  // Form State
  const [tName, setTName] = useState('');
  const [tType, setTType] = useState<'Trust' | 'Society'>('Trust');
  const [tAddress, setTAddress] = useState('');
  const [tSign, setTSign] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tMobile, setTMobile] = useState('');
  const [t12a80g, setT12a80g] = useState(false);
  const [t12a80gExpired, setT12a80gExpired] = useState(false);
  const [tRegDate12A80G, setTRegDate12A80G] = useState('');
  const [tExpiryDate12A80G, setTExpiryDate12A80G] = useState('');
  const [tUser, setTUser] = useState('');
  const [tPass, setTPass] = useState('');
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');

  // Expandable toggles
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (initialFilter === '12A' || initialFilter === '80G' || initialFilter === '12A_80G') {
      setActiveFilterTab('12A_80G');
    } else if (initialFilter) {
      setActiveFilterTab(initialFilter);
    }
  }, [initialFilter]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isAdminOrTL = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.role === 'super_admin' || 
    currentUser.role === 'team_leader' || 
    currentUser.role === 'team_lead'
  );

  const isAssignedToUser = (assignedId?: string, assignedName?: string) => {
    if (!assignedId && !assignedName) return false;
    return (
      (assignedId && (
        assignedId === currentUser?.id || 
        assignedId.toLowerCase() === (currentUser?.id || '').toLowerCase() ||
        (currentUser?.employeeCode && assignedId.toLowerCase() === currentUser.employeeCode.toLowerCase())
      )) ||
      (currentUser?.name && assignedName && assignedName.toLowerCase() === currentUser.name.toLowerCase()) ||
      (currentUser?.name && assignedId && assignedId.toLowerCase() === currentUser.name.toLowerCase())
    );
  };

  // Strict role filtering: Employee only sees allotted clients
  const filteredTrustClients = trustClients.filter(c => {
    if (!isAdminOrTL && currentUser) {
      if (!isAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName)) return false;
    }

    // Search query filter
    const matchesSearch = 
      c.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.authSignatory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.typeOfEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.itPortalUsername && c.itPortalUsername.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter tab
    if (activeFilterTab === '12A_80G' || activeFilterTab === '12A' || activeFilterTab === '80G') {
      return c.has12A80G;
    }
    if (activeFilterTab === 'EXPIRED') {
      return c.has12A80G && (c.is12a80gExpired || (c.expiryDate12A80G && new Date(c.expiryDate12A80G) < new Date()));
    }
    if (activeFilterTab === 'BASIC') return !c.has12A80G;

    return true;
  });

  // Summary Metrics
  const totalCount = filteredTrustClients.length;
  const count12A80G = filteredTrustClients.filter(c => c.has12A80G && !c.is12a80gExpired).length;
  const countExpired = filteredTrustClients.filter(c => c.has12A80G && (c.is12a80gExpired || (c.expiryDate12A80G && new Date(c.expiryDate12A80G) < new Date()))).length;
  const countBasic = filteredTrustClients.filter(c => !c.has12A80G).length;
  const avgHealth = totalCount > 0 
    ? Math.round(filteredTrustClients.reduce((acc, curr) => acc + (curr.healthScore || 85), 0) / totalCount)
    : 85;

  const handleCreateTrust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName || !tSign || !tEmail) {
      alert('Required trust details (Entity Name, Signatory, Email) not provided.');
      return;
    }
    const empToAssign = isAdmin ? addAssignedEmpId : currentUser?.id;
    const matchedEmployee = allEmployees.find(emp => emp.id === empToAssign);

    const added = addV2TrustClient({
      entityName: tName,
      typeOfEntity: tType,
      address: tAddress,
      authSignatory: tSign,
      emailId: tEmail,
      mobileNumber: tMobile,
      has12A80G: t12a80g,
      is12a80gExpired: t12a80g ? t12a80gExpired : false,
      regDate12A80G: t12a80g ? tRegDate12A80G : undefined,
      expiryDate12A80G: t12a80g ? tExpiryDate12A80G : undefined,
      itPortalUsername: tUser,
      itPortalPassword: tPass,
      assignedEmployeeId: empToAssign || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : (currentUser ? currentUser.name : undefined)
    });

    setTrustClients([...trustClients, added]);
    setShowAddTrust(false);
    setTName(''); setTSign(''); setTEmail(''); setTMobile(''); setTAddress(''); setTUser(''); setTPass(''); setT12a80g(false); setT12a80gExpired(false); setTRegDate12A80G(''); setTExpiryDate12A80G(''); setAddAssignedEmpId('');
  };

  const handleExportCSV = () => {
    const headers = ['Entity Name', 'Type of Entity', 'Auth Signatory', '12A/80G Status', '12A/80G Reg Date', '12A/80G Expiry Date', 'Tax Audit Form', 'Health Score', 'Assigned Handler', 'Email', 'Mobile', 'Address'];
    const rows = filteredTrustClients.map(c => [
      c.entityName,
      c.typeOfEntity,
      c.authSignatory,
      c.has12A80G ? (c.is12a80gExpired ? '12A/80G Expired' : 'Active 12A/80G') : 'Standard NGO',
      c.regDate12A80G || 'N/A',
      c.expiryDate12A80G || 'N/A',
      c.has12A80G ? 'Form 10B' : 'N/A',
      `${c.healthScore}%`,
      c.assignedEmployeeName || 'Unassigned',
      c.emailId || '',
      c.mobileNumber || '',
      c.address || ''
    ]);
    exportToCSVFile('trusts_societies_registry.csv', headers, rows);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
                <Landmark className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Trusts, Societies & NGO Compliance Command Center
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
                12A & 80G Exempt Registry
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordinate non-profit entity records, monitor Section 12A/80G statutory registrations, Form 10B/10BB audit dockets, and Income Tax portal credentials.
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
              onClick={() => setShowAddTrust(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add NGO / Trust Client
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total NGO Clients</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{totalCount}</span>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">12A & 80G Certified</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{count12A80G}</span>
          </div>

          <div className="p-3 bg-teal-50/60 dark:bg-teal-950/20 rounded-2xl border border-teal-100 dark:border-teal-900/40">
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">Basic Exempt NGOs</span>
            <span className="text-xl font-black text-teal-700 dark:text-teal-300 mt-0.5 block">{countBasic}</span>
          </div>

          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Avg Health Score</span>
            <span className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 block">{avgHealth}%</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs ${
                activeFilterTab === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All NGO Files ({trustClients.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('12A_80G')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                activeFilterTab === '12A_80G'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              12A & 80G ({trustClients.filter(c => c.has12A80G && !c.is12a80gExpired).length})
            </button>
            <button
              onClick={() => setActiveFilterTab('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                activeFilterTab === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              12A & 80G Expired ({trustClients.filter(c => c.has12A80G && (c.is12a80gExpired || (c.expiryDate12A80G && new Date(c.expiryDate12A80G) < new Date()))).length})
            </button>
            <button
              onClick={() => setActiveFilterTab('BASIC')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs ${
                activeFilterTab === 'BASIC'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Basic NGO ({trustClients.filter(c => !c.has12A80G).length})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NGO, signatory, portal ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Add NGO Form Modal */}
      {showAddTrust && (
        <form onSubmit={handleCreateTrust} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-md text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-2">
              <Plus className="h-4 w-4 text-teal-600" />
              Register New NGO / Trust Client
            </h4>
            <button type="button" onClick={() => setShowAddTrust(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Entity Name *</label>
              <input type="text" required value={tName} onChange={e => setTName(e.target.value)} placeholder="e.g. Hope India Welfare Trust" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Entity Structure *</label>
              <select value={tType} onChange={e => setTType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="Trust">Trust Registered File (Exempt)</option>
                <option value="Society">Co-operative Society (Exempt)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Authorized Signatory *</label>
              <input type="text" required value={tSign} onChange={e => setTSign(e.target.value)} placeholder="Trustee / President name" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Official Email ID *</label>
              <input type="email" required value={tEmail} onChange={e => setTEmail(e.target.value)} placeholder="ngo@organization.org" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</label>
              <input type="tel" value={tMobile} onChange={e => setTMobile(e.target.value)} placeholder="9876543210" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
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
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal User ID</label>
              <input type="text" value={tUser} onChange={e => setTUser(e.target.value)} placeholder="PAN or Portal ID" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">IT Portal Password</label>
              <input type="text" value={tPass} onChange={e => setTPass(e.target.value)} placeholder="••••••••" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Registered Office Address</label>
              <input type="text" value={tAddress} onChange={e => setTAddress(e.target.value)} placeholder="Address line" className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
            </div>
          </div>

          {/* 12A & 80G Statutory Section */}
          <div className="p-4 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/50 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="trust12aCheckModal" 
                checked={t12a80g} 
                onChange={e => setT12a80g(e.target.checked)} 
                className="h-4 w-4 rounded text-teal-600 cursor-pointer accent-teal-600" 
              />
              <label htmlFor="trust12aCheckModal" className="font-extrabold text-slate-800 dark:text-slate-200 cursor-pointer text-xs">
                Has Active 12A, 80G Exemption
              </label>
            </div>

            {/* Conditional fields displayed when 12A / 80G is checked */}
            {t12a80g && (
              <div className="pt-3 border-t border-teal-200/60 dark:border-teal-900/40 space-y-3">
                {/* Expired Checkbox at the top */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trust12aExpiredModal"
                      checked={t12a80gExpired}
                      onChange={e => setT12a80gExpired(e.target.checked)}
                      className="h-4 w-4 rounded text-rose-600 cursor-pointer accent-rose-600"
                    />
                    <label htmlFor="trust12aExpiredModal" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer text-xs flex items-center gap-1.5">
                      <span>12A 80G Expired</span>
                      {t12a80gExpired && (
                        <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold rounded">
                          Renewal Required
                        </span>
                      )}
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">Mark if certificate validity has lapsed</span>
                </div>

                {/* 2 Date Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-teal-600" />
                      12A & 80G Registration Date
                    </label>
                    <input
                      type="date"
                      value={tRegDate12A80G}
                      onChange={e => setTRegDate12A80G(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-rose-500" />
                      12A & 80G Expiry
                    </label>
                    <input
                      type="date"
                      value={tExpiryDate12A80G}
                      onChange={e => setTExpiryDate12A80G(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Compliance Auto-routing Notice */}
                <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Statutory Rule:</strong> NGOs with active 12A & 80G are automatically routed to the <strong>Tax Audit Module</strong> under <strong>Form 10B</strong> (Trust / Society / Section 8).
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddTrust(false)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
            <button type="submit" className="px-4.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer">Save NGO Record</button>
          </div>
        </form>
      )}

      {/* NGO Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrustClients.length === 0 ? (
          <div className="col-span-2 p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400">
            No NGO / Trust records found.
          </div>
        ) : (
          filteredTrustClients.map(tr => (
            <div key={tr.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col justify-between space-y-4 font-sans font-medium text-slate-800 shadow-xs">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm leading-tight">{tr.entityName}</h4>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Exempt Category: {tr.typeOfEntity}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setEditingTrustClient(tr)} 
                    className="p-1 px-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg cursor-pointer hover:bg-teal-100"
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
                          title: 'Delete Trust Client',
                          message: `Are you sure you want to delete NGO trust "${tr.entityName}"? This action is permanent.`,
                          onConfirm: () => {
                            deleteV2TrustClient(tr.id);
                            setTrustClients(getV2TrustClients());
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }} 
                      className="p-1 px-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer hover:bg-rose-100"
                      title="Delete Client"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="text-right border-l pl-2 border-slate-150 dark:border-slate-800">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Health Score</div>
                    <div className="text-lg font-black text-teal-600 dark:text-teal-400">{tr.healthScore || 85}%</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-2xl font-mono text-[10.5px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Auth Signatory</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{tr.authSignatory}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Exemptions Status</span>
                  {tr.has12A80G ? (
                    tr.is12a80gExpired || (tr.expiryDate12A80G && new Date(tr.expiryDate12A80G) < new Date()) ? (
                      <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-[9px] font-bold rounded flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-2.5 w-2.5" /> 12A & 80G EXPIRED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold rounded flex items-center gap-1 w-fit">
                        <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" /> 12A & 80G ACTIVE
                      </span>
                    )
                  ) : (
                    <span className="px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold rounded">BASIC NGO</span>
                  )}
                </div>
              </div>

              {/* 12A & 80G Detailed Information & Tax Audit Status */}
              {tr.has12A80G && (
                <div className="p-2.5 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl text-[10px] space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Calendar className="h-3 w-3 text-teal-600" />
                      <span>Reg: <strong className="font-mono">{tr.regDate12A80G || 'Not Recorded'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Calendar className="h-3 w-3 text-rose-500" />
                      <span>Expiry: <strong className="font-mono">{tr.expiryDate12A80G || 'Not Recorded'}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-teal-200/50 dark:border-teal-900/40">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Tax Audit Docket:</span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[9.5px] font-extrabold rounded-md flex items-center gap-1">
                      <FileCheck className="h-3 w-3 text-indigo-600" /> Form 10B Applicable
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-actions for Contact Detail and Credentials Viewing */}
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => setExpandedContacts(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                  className="p-1 px-2.5 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                >
                  {expandedContacts[tr.id] ? 'Hide Contacts' : 'View Contacts'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setVisiblePasswords(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                  className="p-1 px-2.5 text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                >
                  {visiblePasswords[tr.id] ? 'Hide Credentials' : 'View Credentials'}
                </button>
              </div>

              {/* Expandable panels */}
              {expandedContacts[tr.id] && (
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900 rounded-2xl text-[10px] space-y-1">
                  <div className="font-bold text-slate-500 text-[8.5px] uppercase">Signatory Contact Details:</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">Email: {tr.emailId || 'ngo.society.sign@org.in'}</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">Mobile: {tr.mobileNumber || '9876543210'}</div>
                  {tr.address && <div className="text-slate-500">Address: {tr.address}</div>}
                </div>
              )}

              {visiblePasswords[tr.id] && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl text-[10px] space-y-1">
                  <div className="font-bold text-slate-500 text-[8.5px] uppercase font-sans">Income Tax Portal Access:</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">Username: <span className="font-extrabold text-teal-700 dark:text-teal-400">{tr.itPortalUsername || 'NGO_USER'}</span></div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">Password: <span className="font-extrabold text-teal-700 dark:text-teal-400">{tr.itPortalPassword || '••••••••'}</span></div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Handler Assigned</span>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">
                    {tr.assignedEmployeeName || '🔴 Unassigned'}
                  </span>
                </div>
                {isAdmin && (
                  <button 
                    type="button" 
                    onClick={() => setTransferringTrustClient(tr)} 
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-700 dark:text-teal-300 font-extrabold text-[10px] cursor-pointer flex items-center gap-1 transition"
                  >
                    <Users className="h-3 w-3" /> Transfer Custody
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TRANSFER MODAL */}
      {transferringTrustClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-teal-600" /> Transfer NGO/Trust Custody
              </h3>
              <button type="button" onClick={() => setTransferringTrustClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringTrustClient.entityName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{transferringTrustClient.typeOfEntity} • Health: {transferringTrustClient.healthScore}%</div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px]">
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
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
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
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTrustClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-teal-600" /> Modify NGO Trust Profile
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
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, typeOfEntity: e.target.value as 'Trust' | 'Society' })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="Trust">Trust Registered File (Exempt)</option>
                  <option value="Society">Co-operative Society (Exempt)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Authorized Signatory *</label>
                <input 
                  type="text" 
                  value={editingTrustClient.authSignatory} 
                  onChange={e => setEditingTrustClient({ ...editingTrustClient, authSignatory: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Email ID *</label>
                  <input 
                    type="email" 
                    value={editingTrustClient.emailId} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, emailId: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</label>
                  <input 
                    type="text" 
                    value={editingTrustClient.mobileNumber} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, mobileNumber: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
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
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Portal Password</label>
                  <input 
                    type="text" 
                    value={editingTrustClient.itPortalPassword || ''} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, itPortalPassword: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/50 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="edit_12a_active" 
                    checked={editingTrustClient.has12A80G} 
                    onChange={e => setEditingTrustClient({ ...editingTrustClient, has12A80G: e.target.checked })} 
                    className="h-4 w-4 rounded text-teal-600 cursor-pointer accent-teal-600" 
                  />
                  <label htmlFor="edit_12a_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Has Active 12A, 80G Exemption
                  </label>
                </div>

                {editingTrustClient.has12A80G && (
                  <div className="pt-2 border-t border-teal-200/50 dark:border-teal-900/40 space-y-2.5">
                    {/* Expired Checkbox */}
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit_12a_expired"
                          checked={editingTrustClient.is12a80gExpired || false}
                          onChange={e => setEditingTrustClient({ ...editingTrustClient, is12a80gExpired: e.target.checked })}
                          className="h-4 w-4 rounded text-rose-600 cursor-pointer accent-rose-600"
                        />
                        <label htmlFor="edit_12a_expired" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          12A 80G Expired
                        </label>
                      </div>
                      <span className="text-[10px] text-slate-400">Mark if lapsed</span>
                    </div>

                    {/* 2 Date Fields */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-teal-600" /> Reg Date
                        </label>
                        <input
                          type="date"
                          value={editingTrustClient.regDate12A80G || ''}
                          onChange={e => setEditingTrustClient({ ...editingTrustClient, regDate12A80G: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-rose-500" /> Expiry Date
                        </label>
                        <input
                          type="date"
                          value={editingTrustClient.expiryDate12A80G || ''}
                          onChange={e => setEditingTrustClient({ ...editingTrustClient, expiryDate12A80G: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Form 10B Tax Audit is linked to this entity.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setEditingTrustClient(null)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2TrustClient(editingTrustClient);
                  setTrustClients(getV2TrustClients());
                  setEditingTrustClient(null);
                }} 
                className="px-4.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl cursor-pointer"
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
