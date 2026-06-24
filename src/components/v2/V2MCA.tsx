/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  V2McaClient, 
  V2McaRocReturn, 
  getV2McaClients, 
  addV2McaClient, 
  updateV2McaClient,
  getV2McaRocReturns, 
  saveV2McaRocReturn, 
  getV2Auditors, 
  parseCSVData, 
  exportToCSVFile,
  getV1Employees,
  deleteV2McaClient
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';
import ConfirmModal from './ConfirmModal';
import { 
  Building2, Users, Receipt, Calendar, Plus, Download, UploadCloud, Search, Check, AlertTriangle, ShieldAlert,
  Edit2, UserCheck, X, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function V2MCA({
  initialActiveTab = 'mca',
  initialRocSubTab,
  initialShowAddForm = false,
  initialShowImport = false,
  initialClientTypeFilter
}: {
  key?: any;
  initialActiveTab?: 'mca' | 'roc';
  initialRocSubTab?: 'NGO' | 'PVT' | 'LLP';
  initialShowAddForm?: boolean;
  initialShowImport?: boolean;
  initialClientTypeFilter?: 'PRIVATE LIMITED COMPANY' | 'LLP' | 'SECTION 8 NGO';
} = {}) {
  const [activeTab, setActiveTab] = useState<'mca' | 'roc'>(initialActiveTab);
  const [clients, setClients] = useState<V2McaClient[]>(getV2McaClients());
  const [returns, setReturns] = useState<V2McaRocReturn[]>(getV2McaRocReturns());
  const [search, setSearch] = useState('');
  
  // ROC specific states
  const [selectedFY, setSelectedFY] = useState('25-26');
  const [rocSubTab, setRocSubTab] = useState<'NGO' | 'PVT' | 'LLP'>(initialRocSubTab || 'PVT');

  const auditors = getV2Auditors();

  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');
  const [transferringClient, setTransferringClient] = useState<V2McaClient | null>(null);
  const [selectedMcaClients, setSelectedMcaClients] = useState<string[]>([]);
  const [editingMcaClient, setEditingMcaClient] = useState<V2McaClient | null>(null);
  const [allEmployees] = useState(getV1Employees());
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  // Reusable custom confirm modal state
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

  // New MCA client form states
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [showImport, setShowImport] = useState(initialShowImport);
  const [importText, setImportText] = useState('');

  // Form parameters
  const [name, setName] = useState('');
  const [type, setType] = useState<V2McaClient['clientType']>(initialClientTypeFilter || 'PRIVATE LIMITED COMPANY');
  const [regDate, setRegDate] = useState('2025-10-01');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Delhi');
  const [itId, setItId] = useState('');
  const [itPass, setItPass] = useState('');
  const [selectedAuditorId, setSelectedAuditorId] = useState('');
  const [isInc20aFiled, setIsInc20aFiled] = useState(false);
  const [isAdt1Filed, setIsAdt1Filed] = useState(false);

  // Directors subform state
  interface FormDirectorInput {
    name: string;
    dinNumber: string;
    mcaId: string;
    mcaPassword?: string;
    email: string;
    mobile: string;
    dinKycStatus: 'Pending' | 'Pending with CA' | 'Approved';
  }

  const [formDirectors, setFormDirectors] = useState<FormDirectorInput[]>([
    { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending' },
    { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending' }
  ]);

  const handleExportMcaClients = () => {
    const headers = [
      'Company Name',
      'Client Type',
      'Registration Date',
      'Email',
      'Mobile',
      'Address',
      'State',
      'IT PAN',
      'IT Password',
      'Auditor ID',
      'Is INC20A Filed',
      'Is ADT1 Filed',
      'Director 1 Name',
      'Director 1 DIN',
      'Director 1 MCA ID',
      'Director 1 MCA Password',
      'Director 1 Email',
      'Director 1 Mobile',
      'Director 1 KYC Status',
      'Director 2 Name',
      'Director 2 DIN',
      'Director 2 MCA ID',
      'Director 2 MCA Password',
      'Director 2 Email',
      'Director 2 Mobile',
      'Director 2 KYC Status'
    ];
    const rows = clients.map(c => {
      const d1 = c.directors[0] || {};
      const d2 = c.directors[1] || {};
      return [
        c.clientName,
        c.clientType,
        c.dateOfRegistration,
        c.clientEmail,
        c.clientMobile,
        c.clientAddress,
        c.clientState,
        c.incomeTaxId,
        c.incomeTaxPassword || '',
        c.auditorFirmId || '',
        c.isInc20aFiled ? 'TRUE' : 'FALSE',
        c.isAdt1Filed ? 'TRUE' : 'FALSE',
        // Director 1
        d1.name || '',
        d1.dinNumber || '',
        d1.mcaId || '',
        d1.mcaPassword || '',
        d1.email || '',
        d1.mobile || '',
        d1.dinKycStatus || 'Pending',
        // Director 2
        d2.name || '',
        d2.dinNumber || '',
        d2.mcaId || '',
        d2.mcaPassword || '',
        d2.email || '',
        d2.mobile || '',
        d2.dinKycStatus || 'Pending'
      ];
    });
    exportToCSVFile('efilingg_v2_mca_clients.csv', headers, rows);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !itId) {
      alert('Business Name, Email and Income Tax ID are required.');
      return;
    }

    const directors = formDirectors
      .filter(fd => fd.name.trim() !== '')
      .map(fd => ({
        name: fd.name,
        dinNumber: fd.dinNumber || 'PENDING',
        dinStatus: 'ACTIVE' as const,
        mcaId: fd.mcaId || 'N/A',
        mcaPassword: fd.mcaPassword,
        email: fd.email,
        mobile: fd.mobile,
        dinKycStatus: fd.dinKycStatus
      }));

    const matchedEmployee = allEmployees.find(emp => emp.id === addAssignedEmpId);
    const added = addV2McaClient({
      clientName: name,
      clientType: type,
      dateOfRegistration: regDate,
      clientEmail: email,
      clientMobile: mobile,
      clientAddress: address,
      clientState: state,
      incomeTaxId: itId,
      incomeTaxPassword: itPass,
      auditorFirmId: (type === 'PRIVATE LIMITED COMPANY' || type === 'SECTION 8 NGO') ? selectedAuditorId : undefined,
      isInc20aFiled: (type === 'PRIVATE LIMITED COMPANY' || type === 'SECTION 8 NGO') ? isInc20aFiled : undefined,
      isAdt1Filed: (type === 'PRIVATE LIMITED COMPANY' || type === 'SECTION 8 NGO') ? isAdt1Filed : undefined,
      directors,
      assignedEmployeeId: addAssignedEmpId || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : undefined
    });

    setClients([...clients, added]);
    setShowAddForm(false);
    
    // Reset Form
    setName('');
    setEmail('');
    setMobile('');
    setAddress('');
    setRegDate('2025-10-01');
    setItId('');
    setItPass('');
    setSelectedAuditorId('');
    setIsInc20aFiled(false);
    setIsAdt1Filed(false);
    setAddAssignedEmpId('');
    setFormDirectors([
      { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending' },
      { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending' }
    ]);
  };

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rows = parseCSVData(importText.trim());
      if (rows.length < 2) {
        alert('Paste rows with headers to parse properly.');
        return;
      }
      const imported: V2McaClient[] = [];

      const parseBoolVal = (str: string | undefined): boolean => {
        if (!str) return false;
        const clean = str.trim().toUpperCase();
        return clean === 'TRUE' || clean === 'YES' || clean === '1' || clean === 'Y';
      };

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length >= 8) {
          const clientType = (r[1] || 'PRIVATE LIMITED COMPANY').trim().toUpperCase() as 'LLP' | 'PRIVATE LIMITED COMPANY' | 'SECTION 8 NGO';
          let isInc20aFiledVal = false;
          let isAdt1FiledVal = false;
          const directorsList: any[] = [];

          // Determine if they used the new comprehensive layout or the legacy short layout
          const isNewFormat = r.length > 13;

          if (isNewFormat) {
            isInc20aFiledVal = parseBoolVal(r[10]);
            isAdt1FiledVal = parseBoolVal(r[11]);

            // Director 1 (Index 12 to 18)
            if (r[12] && r[12].trim() !== '') {
              directorsList.push({
                name: r[12].trim(),
                dinNumber: r[13] || 'PENDING',
                dinStatus: 'ACTIVE' as const,
                mcaId: r[14] || 'N/A',
                mcaPassword: r[15] || undefined,
                email: r[16] || undefined,
                mobile: r[17] || undefined,
                dinKycStatus: (r[18] as any) || 'Pending'
              });
            }
            // Director 2 (Index 19 to 25)
            if (r[19] && r[19].trim() !== '') {
              directorsList.push({
                name: r[19].trim(),
                dinNumber: r[20] || 'PENDING',
                dinStatus: 'ACTIVE' as const,
                mcaId: r[21] || 'N/A',
                mcaPassword: r[22] || undefined,
                email: r[23] || undefined,
                mobile: r[24] || undefined,
                dinKycStatus: (r[25] as any) || 'Pending'
              });
            }
          } else {
            // Legacy layout where indices 10, 11, 12 represented Director 1 Details
            if (r[10] && r[10].trim() !== '') {
              directorsList.push({
                name: r[10].trim(),
                dinNumber: r[11] || 'PENDING',
                dinStatus: 'ACTIVE' as const,
                mcaId: r[12] || 'N/A',
                dinKycStatus: 'Pending' as const
              });
            }
          }

          const added = addV2McaClient({
            clientName: r[0],
            clientType,
            dateOfRegistration: r[2] || '2025-10-01',
            clientEmail: r[3] || 'N/A',
            clientMobile: r[4] || 'N/A',
            clientAddress: r[5] || 'N/A',
            clientState: r[6] || 'Delhi',
            incomeTaxId: r[7] || `IT-ID-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            incomeTaxPassword: r[8] || 'GatePass@11',
            auditorFirmId: r[9] || undefined,
            isInc20aFiled: (clientType === 'PRIVATE LIMITED COMPANY' || clientType === 'SECTION 8 NGO') ? isInc20aFiledVal : undefined,
            isAdt1Filed: (clientType === 'PRIVATE LIMITED COMPANY' || clientType === 'SECTION 8 NGO') ? isAdt1FiledVal : undefined,
            directors: directorsList
          });
          imported.push(added);
        }
      }
      setClients([...clients, ...imported]);
      setShowImport(false);
      setImportText('');
      alert(`Imported ${imported.length} Enterprise accounts from excel rows!`);
    } catch (err: any) {
      alert('Import parse error: ' + err.message);
    }
  };

  const handleUpdateRocStatus = (mcaClientId: string, field: keyof V2McaRocReturn, value: string) => {
    const id = `${mcaClientId}_2025-26`;
    const match = returns.find(r => r.id === id);
    const existing: V2McaRocReturn = match || {
      id,
      mcaClientId,
      financialYear: '2025-26'
    };
    
    const updated = {
      ...existing,
      [field]: value
    };

    saveV2McaRocReturn(updated);
    setReturns(getV2McaRocReturns());
  };

  const handleUpdateClient = (updatedId: string, updatedFields: Partial<V2McaClient>) => {
    const updated = clients.map(c => {
      if (c.id === updatedId) {
        return { ...c, ...updatedFields };
      }
      return c;
    });
    setClients(updated);
    localStorage.setItem('efilingg_crm_v2_mca_clients', JSON.stringify(updated));
  };

  const handleUpdateDirectorKycStatus = (clientId: string, directorIndex: number, newStatus: 'Pending' | 'Pending with CA' | 'Approved') => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        const updatedDirs = [...(c.directors || [])];
        if (updatedDirs[directorIndex]) {
          updatedDirs[directorIndex] = {
            ...updatedDirs[directorIndex],
            dinKycStatus: newStatus
          };
        }
        return { ...c, directors: updatedDirs };
      }
      return c;
    });
    setClients(updated);
    localStorage.setItem('efilingg_crm_v2_mca_clients', JSON.stringify(updated));
  };

  const handleExportRocReport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    const targetedReturns = returns.filter(ret => {
      const cl = clients.find(c => c.id === ret.mcaClientId);
      if (!cl) return false;
      if (rocSubTab === 'NGO') return cl.clientType === 'SECTION 8 NGO';
      if (rocSubTab === 'PVT') return cl.clientType === 'PRIVATE LIMITED COMPANY';
      return cl.clientType === 'LLP';
    });

    if (rocSubTab === 'LLP') {
      headers = ['LLP Name', 'Form 11 Status', 'Form 11 SRN', 'Form 8 Status', 'Form 8 SRN', 'Balance Sheet', 'ITR Status', 'Ack No'];
      rows = targetedReturns.map(r => {
        const cl = clients.find(c => c.id === r.mcaClientId);
        return [
          cl?.clientName || 'N/A',
          r.form11Status || 'NOT FILED', r.form11Srn || '',
          r.form8Status || 'NOT FILED', r.form8Srn || '',
          r.balanceSheetStatus || 'PENDING', r.itrStatus || 'PENDING', r.itrAckNo || ''
        ];
      });
    } else {
      // NGO or PVT LTD
      headers = ['Company Name', 'DIN KYC Status', 'ADT-1 Status', 'ADT-1 SRN', 'AOC-4 Status', 'AOC-4 SRN', 'MGT-7 Status', 'MGT-7 SRN', 'Balance Sheet', 'ITR Status', 'CA Auditor'];
      rows = targetedReturns.map(r => {
        const cl = clients.find(c => c.id === r.mcaClientId);
        return [
          cl?.clientName || 'N/A',
          r.dinKycStatus || 'NOT FILED',
          r.adt1Status || 'NOT FILED', r.adt1Srn || '',
          r.aoc4Status || 'NOT FILED', r.aoc4Srn || '',
          r.mgt7Status || 'NOT FILED', r.mgt7Srn || '',
          r.balanceSheetStatus || 'PENDING', r.itrStatus || 'PENDING', r.caName || ''
        ];
      });
    }

    exportToCSVFile(`roc_report_fy_${selectedFY}_sub_${rocSubTab}.csv`, headers, rows);
  };

  // Searching clients
  const filteredMcaClients = clients.filter(c => 
    c.clientName.toLowerCase().includes(search.toLowerCase()) || 
    c.clientType.toLowerCase().includes(search.toLowerCase()) ||
    c.incomeTaxId.toLowerCase().includes(search.toLowerCase())
  );

  const getRocRow = (mcaClientId: string) => {
    const rId = `${mcaClientId}_2025-26`;
    return returns.find(r => r.id === rId) || {
      id: rId,
      mcaClientId,
      financialYear: '2025-26',
      form11Status: 'NOT FILED' as const,
      form8Status: 'NOT FILED' as const,
      balanceSheetStatus: 'PENDING' as const,
      itrStatus: 'NOT FILED' as const,
      dinKycStatus: 'NOT FILED' as const,
      adt1Status: 'NOT FILED' as const,
      aoc4Status: 'NOT FILED' as const,
      mgt7Status: 'NOT FILED' as const,
      caName: ''
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('mca')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === 'mca' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          🏙️ MCA Client Registry (LLP / Private Ltd)
        </button>
        <button
          onClick={() => setActiveTab('roc')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === 'roc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          📜 ROC Annual Filings Ledger (PVT / LLP)
        </button>
        <button
          onClick={() => setActiveTab('din_kyc' as any)}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === ('din_kyc' as any) ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          🆔 DIN KYC Panel
        </button>
        <button
          onClick={() => setActiveTab('post_compliance' as any)}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === ('post_compliance' as any) ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          ⚓ Post Incorporation Compliance
        </button>
      </div>

      {activeTab === 'mca' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">Company & LLP Directory (MCA)</h2>
              <p className="text-[10px] text-slate-400">Add enterprise client files, configure Director profiles, attach CA Auditors, and synchronize with ITR pipelines.</p>
            </div>
             <div className="flex flex-wrap gap-2 text-xs">
               {selectedMcaClients.length > 0 && (
                 <button
                   type="button"
                   onClick={() => {
                     setConfirmModal({
                       isOpen: true,
                       title: 'Confirm Bulk Deletion',
                       message: `Are you sure you want to bulk-delete ${selectedMcaClients.length} selected corporate accounts? This action is permanent.`,
                       onConfirm: () => {
                         selectedMcaClients.forEach(id => deleteV2McaClient(id));
                         setClients(getV2McaClients());
                         setSelectedMcaClients([]);
                         setConfirmModal(prev => ({ ...prev, isOpen: false }));
                       }
                     });
                   }}
                   className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded-xl cursor-pointer shadow-3xs"
                 >
                   <Trash2 className="h-4 w-4" /> Bulk Delete ({selectedMcaClients.length})
                 </button>
               )}
               <button onClick={() => { setShowAddForm(true); setShowImport(false); }} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                 <Plus className="h-4 w-4" /> Add Enterprise
               </button>
               <button onClick={() => { setShowImport(true); setShowAddForm(false); }} className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                 <UploadCloud className="h-4 w-4" /> Import Excel
               </button>
              <button onClick={handleExportMcaClients} className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                <Download className="h-4 w-4" /> Export Excel
              </button>
            </div>
          </div>

          {/* Creation Form */}
          {showAddForm && (
            <form onSubmit={handleCreateClient} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 text-xs font-sans">
              <h3 className="font-extrabold text-indigo-700 uppercase">Register Pvt Ltd, LLP or Section 8 Client</h3>
              
              {/* Core Company Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Business / Corporate Name *</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Shell Type *</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <option value="PRIVATE LIMITED COMPANY">Private Limited Company</option>
                    <option value="LLP">LLP (Limited Liability Partnership)</option>
                    <option value="SECTION 8 NGO">Section 8 NGO (Non Profit Company)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Date of Incorporation</label>
                  <input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Email ID *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Mobile</label>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Income Tax PAN / ID *</label>
                  <input type="text" required placeholder="e.g. AAACX1289K" value={itId} onChange={e => setItId(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Income Tax Portal Password</label>
                  <input type="text" value={itPass} onChange={e => setItPass(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Auditor / CA firm link</label>
                  <select 
                    disabled={type === 'LLP'}
                    value={selectedAuditorId} 
                    onChange={e => setSelectedAuditorId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl disabled:bg-slate-100 disabled:opacity-50"
                  >
                    <option value="">-- No Auditor (Only private Ltd/NGO Audits) --</option>
                    {auditors.map(a => <option key={a.id} value={a.id}>{a.name} (FRN {a.frnNo})</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Registered State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Assign to Employee / CA</label>
                  <select 
                    value={addAssignedEmpId} 
                    onChange={e => setAddAssignedEmpId(e.target.value)} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="">-- Select Handler --</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Directors Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-205 dark:border-slate-850 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <Users className="h-4 w-4" /> Director Credentials ({formDirectors.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFormDirectors([...formDirectors, { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending' }])}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-200/50 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Another Director
                  </button>
                </div>

                {formDirectors.map((fd, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3 relative group">
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400">
                      <span>Director #{index + 1} Profile</span>
                      {formDirectors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formDirectors];
                            updated.splice(index, 1);
                            setFormDirectors(updated);
                          }}
                          className="text-red-500 hover:text-red-700 hover:underline text-[9px]"
                        >
                          Remove Director
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Director Name {index === 0 && '*'}</label>
                        <input
                          type="text"
                          required={index === 0}
                          placeholder="e.g. Rahul Sharma"
                          value={fd.name}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].name = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Director DIN {index === 0 && '*'}</label>
                        <input
                          type="text"
                          required={index === 0}
                          placeholder="e.g. 08412491"
                          value={fd.dinNumber}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].dinNumber = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">MCA V3 ID</label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={fd.mcaId}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].mcaId = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">DIN V3 Password</label>
                        <input
                          type="text"
                          placeholder="Password"
                          value={fd.mcaPassword}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].mcaPassword = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Email Contact</label>
                        <input
                          type="email"
                          placeholder="director@company.com"
                          value={fd.email}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].email = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Mobile Contact</label>
                        <input
                          type="tel"
                          placeholder="e.g. 9812450255"
                          value={fd.mobile}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].mobile = e.target.value;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">DIN KYC Status</label>
                        <select
                          value={fd.dinKycStatus || 'Pending'}
                          onChange={e => {
                            const updated = [...formDirectors];
                            updated[index].dinKycStatus = e.target.value as any;
                            setFormDirectors(updated);
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Pending with CA">Pending with CA</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Registered Office address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
              </div>

              {/* Compliance Checkboxes for Pvt Ltd / Section 8 NGO */}
              {(type === 'PRIVATE LIMITED COMPANY' || type === 'SECTION 8 NGO') && (
                <div className="flex flex-wrap items-center gap-6 p-4 bg-indigo-50/40 dark:bg-slate-950 border border-indigo-100/50 dark:border-slate-800 rounded-2xl">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isInc20aFiled} 
                      onChange={e => setIsInc20aFiled(e.target.checked)} 
                      className="h-4 w-4 bg-white dark:bg-slate-950 text-indigo-655 border-slate-350 dark:border-slate-755 rounded focus:ring-0 cursor-pointer text-indigo-600" 
                    />
                    <span>Is INC-20A Filed</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isAdt1Filed} 
                      onChange={e => setIsAdt1Filed(e.target.checked)} 
                      className="h-4 w-4 bg-white dark:bg-slate-950 text-indigo-655 border-slate-350 dark:border-slate-755 rounded focus:ring-0 cursor-pointer text-indigo-600" 
                    />
                    <span>Is ADT-1 Filed</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-550 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Save Corporate Profile</button>
              </div>
            </form>
          )}

          {showImport && (
            <form onSubmit={handlePasteImport} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850 text-xs">
                <h3 className="font-extrabold text-indigo-750 uppercase">MCA Accounts Bulk Excel Importer</h3>
                <button 
                  type="button" 
                  onClick={() => {
                    const sample = "Company Name,Client Type,Registration Date,Email,Mobile,Address,State,IT PAN,IT Password,Auditor ID,Is INC20A Filed,Is ADT1 Filed,"
                      + "Director 1 Name,Director 1 DIN,Director 1 MCA ID,Director 1 MCA Password,Director 1 Email,Director 1 Mobile,Director 1 KYC Status,"
                      + "Director 2 Name,Director 2 DIN,Director 2 MCA ID,Director 2 MCA Password,Director 2 Email,Director 2 Mobile,Director 2 KYC Status\n"
                      + "InnoTech Pvt Ltd,PRIVATE LIMITED COMPANY,2025-08-12,info@innotech.com,9001284910,Sohna Road Gurugram,Haryana,AABC1923K,ITPass@20,AUD-1,TRUE,FALSE,"
                      + "Amit Singhal,08412948,amit.mca,AmitPass@12,amit@innotech.com,9812345678,Approved,"
                      + "Rahul Sharma,08412949,rahul.mca,,,rahul@innotech.com,,Pending";
                    const blob = new Blob([sample], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('href', url);
                    a.setAttribute('download', 'mca_clients_bulk_sample.csv');
                    a.click();
                  }}
                  className="text-[10px] text-indigo-600 hover:underline font-bold font-mono"
                >
                  ⬇️ Download MCA CSV Model File
                </button>
              </div>
              <textarea
                rows={5}
                placeholder="InnoTech Pvt Ltd&#9;PRIVATE LIMITED COMPANY&#9;2025-08-12&#9;info@innotech.com&#9;9001284910&#9;Gurugram&#9;Haryana&#9;AABC1923K&#9;ITPass@20&#9;AUD-1&#9;TRUE&#9;FALSE&#9;Amit Singhal&#9;08412948&#9;amit.mca&#9;AmitPass@12&#9;amit@innotech.com&#9;9812345678&#9;Approved"
                value={importText}
                onChange={e => setImportText(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl text-xs font-mono"
              />

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Or upload Excel / CSV File (.xlsx, .xls, .csv)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <UploadCloud className="h-6 w-6 text-indigo-500 mb-1" />
                      <p className="text-[10px] text-slate-500 font-semibold">Click to upload spreadsheet or drag & drop</p>
                      <p className="text-[9px] text-slate-400 font-mono">Supports XLSX, XLS, or CSV formats</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = new Uint8Array(event.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[sheetName];
                            const json = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
                            
                            if (json.length < 2) {
                              alert('Spreadsheet has insufficient rows. Must contain a header row and at least one data row.');
                              return;
                            }
                            
                            // Convert sheet 2D array to CSV text format for text field representation
                            const csvText = json.map(r => r.join(',')).join('\n');
                            setImportText(csvText);
                            alert(`Successfully imported ${json.length - 1} records from spreadsheet. Please verify below and click "Ingest Accounts"!`);
                          } catch (err) {
                            console.error(err);
                            alert('Failed to parse Excel file. Please make sure it is a valid Excel or CSV document.');
                          }
                        };
                        reader.readAsArrayBuffer(file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowImport(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-550 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Ingest Accounts</button>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl max-w-md text-xs">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input type="text" placeholder="Search companies, PAN IDs, structural type..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-0 w-full focus:ring-0 p-0" />
          </div>

          {/* Grid Layout of Company Files */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMcaClients.map(cl => {
              const aud = auditors.find(a => a.id === cl.auditorFirmId);
              return (
                <div key={cl.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl space-y-3 shadow-3xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-700">
                        <input 
                          type="checkbox"
                          checked={selectedMcaClients.includes(cl.id)}
                          onChange={() => {
                            setSelectedMcaClients(prev => 
                              prev.includes(cl.id) ? prev.filter(id => id !== cl.id) : [...prev, cl.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-black uppercase select-none text-slate-450">Select Corporate</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Delete Corporate Client',
                            message: `Are you sure you want to delete corporate account "${cl.clientName}"? This action is permanent.`,
                            onConfirm: () => {
                              deleteV2McaClient(cl.id);
                              setClients(getV2McaClients());
                              setSelectedMcaClients(prev => prev.filter(id => id !== cl.id));
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="p-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/25 text-rose-600 hover:text-rose-700 rounded-lg transition"
                        title="Delete Client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-start pt-1">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight">{cl.clientName}</h4>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap text-slate-500 shrink-0 select-none">{cl.clientType.replace(' COMPANY', '')}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold font-mono tracking-wide uppercase">Inc: {cl.dateOfRegistration} • State: {cl.clientState}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-105 dark:border-slate-850">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Income Tax ID</span>
                      <span className="font-extrabold text-slate-700 dark:text-slate-200">{cl.incomeTaxId}</span>
                      {cl.incomeTaxPassword && <span className="text-[9px] text-slate-400 block">PW: {cl.incomeTaxPassword}</span>}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Auditor CA Link</span>
                      <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{aud ? aud.name : 'N/A'}</span>
                    </div>
                  </div>

                  {cl.directors.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-slate-450 block tracking-wider font-mono">Board & Director Accesses ({cl.directors.length})</span>
                      <div className="space-y-1">
                        {cl.directors.map((dir, dIdx) => (
                          <div key={dir.dinNumber} className="flex justify-between items-center text-[10px] bg-slate-50/50 dark:bg-slate-850/20 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-650 dark:text-slate-350">{dir.name}</span>
                            <span className="font-mono text-slate-400 text-[9.5px]">DIN: {dir.dinNumber} | MCA: {dir.mcaId} {dir.mcaPassword ? `(PW: ${dir.mcaPassword})` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-450 font-bold uppercase tracking-wider">Handler:</span>
                      <span className="font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                        {cl.assignedEmployeeName || '🔴 Unassigned'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMcaClient(cl)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold py-2 px-3 rounded-2xl text-xs transition cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-amber-500" /> Modify
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferringClient(cl)}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-205 font-extrabold py-2 px-3 rounded-2xl text-xs transition cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-indigo-500" /> Transfer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'roc' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 text-xs">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">Annual ROC Filings Management</h2>
              <p className="text-[10px] text-slate-400">Track and log statutory annual returns including Form 11, Form 8, AOC-4, MGT-7, and Balance Sheets.</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-2 py-1 rounded-xl">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                <span className="font-bold">F.Y:</span>
                <select value={selectedFY} onChange={e => setSelectedFY(e.target.value)} className="bg-transparent border-0 p-0 pr-2 py-0.5 font-bold text-xs">
                  <option value="25-26">2025-26</option>
                  <option value="26-27">2026-27</option>
                </select>
              </div>
              <button onClick={handleExportRocReport} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                <Download className="h-4 w-4" /> Export ROC Excel Report
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setRocSubTab('PVT')} className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
              rocSubTab === 'PVT' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>🏢 Private Limited Companies</button>
            <button onClick={() => setRocSubTab('NGO')} className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
              rocSubTab === 'NGO' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>🤝 Section 8 NGOs</button>
            <button onClick={() => setRocSubTab('LLP')} className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition ${
              rocSubTab === 'LLP' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>📜 LLPs Annuals</button>
          </div>

          {/* Conditional tables */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-xs">
            {rocSubTab === 'LLP' ? (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                      <th className="p-3 pl-5">LLP Company</th>
                      <th className="p-3">Form 11 (Annual Return)</th>
                      <th className="p-3">Form 8 (Accounts)</th>
                      <th className="p-3">Balance Sheet</th>
                      <th className="p-3">ITR Record Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {clients.filter(c => c.clientType === 'LLP').map(cl => {
                      const r = getRocRow(cl.id);
                      return (
                        <tr key={cl.id} className="hover:bg-slate-50/50">
                          <td className="p-3 pl-5 font-black text-slate-800 dark:text-slate-150">{cl.clientName}</td>
                          <td className="p-3 space-y-1">
                            <select value={r.form11Status || 'NOT FILED'} onChange={e => handleUpdateRocStatus(cl.id, 'form11Status', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="SRN No" value={r.form11Srn || ''} onChange={e => handleUpdateRocStatus(cl.id, 'form11Srn', e.target.value)} className="block w-28 p-1 border border-slate-150 rounded text-[9.5px] font-mono uppercase bg-slate-50" />
                          </td>
                          <td className="p-3 space-y-1">
                            <select value={r.form8Status || 'NOT FILED'} onChange={e => handleUpdateRocStatus(cl.id, 'form8Status', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="SRN No" value={r.form8Srn || ''} onChange={e => handleUpdateRocStatus(cl.id, 'form8Srn', e.target.value)} className="block w-28 p-1 border border-slate-150 rounded text-[9.5px] font-mono uppercase bg-slate-50" />
                          </td>
                          <td className="p-3">
                            <select value={r.balanceSheetStatus || 'PENDING'} onChange={e => handleUpdateRocStatus(cl.id, 'balanceSheetStatus', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="PENDING">Pending</option>
                              <option value="READY">Ready</option>
                            </select>
                          </td>
                          <td className="p-3 space-y-1">
                            <select value={r.itrStatus || 'PENDING'} onChange={e => handleUpdateRocStatus(cl.id, 'itrStatus', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="PENDING">Pending</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="Ack/ReceiptNo" value={r.itrAckNo || ''} onChange={e => handleUpdateRocStatus(cl.id, 'itrAckNo', e.target.value)} className="block w-28 p-1 border border-slate-150 rounded text-[9.5px] font-mono uppercase bg-slate-50" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // PVT LTD or SECTION 8 NGO Company (requires ADT-1, DIN KYC, AOC-4, MGT-7)
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                      <th className="p-3 pl-5">Business Corporate</th>
                      <th className="p-3">DIN KYC</th>
                      <th className="p-3">ADT-1 (Auditor appt)</th>
                      <th className="p-3">AOC-4 (Accounts filing)</th>
                      <th className="p-3">MGT-7/7A (Returns filing)</th>
                      <th className="p-3">Balance Sheet</th>
                      <th className="p-3">CA Auditor Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {clients.filter(c => rocSubTab === 'NGO' ? c.clientType === 'SECTION 8 NGO' : c.clientType === 'PRIVATE LIMITED COMPANY').map(cl => {
                      const r = getRocRow(cl.id);
                      const aud = auditors.find(a => a.id === cl.auditorFirmId);
                      return (
                        <tr key={cl.id} className="hover:bg-slate-50/50">
                          <td className="p-3 pl-5 font-black text-slate-800 dark:text-slate-150">
                            <div>{cl.clientName}</div>
                            {cl.directors.length > 0 && <span className="text-[9px] text-indigo-620 uppercase font-mono block">D1 DIN: {cl.directors[0].dinNumber} ({cl.directors[0].name})</span>}
                          </td>
                          <td className="p-3 max-w-[220px]">
                            {cl.directors.length === 0 ? (
                              <span className="text-slate-405 italic text-[10px]">No Directors</span>
                            ) : (
                              <div className="space-y-1.5">
                                {cl.directors.map((dir, dIdx) => (
                                  <div key={dIdx} className="bg-slate-55 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
                                    <div className="font-extrabold text-[10px] text-slate-755 dark:text-slate-300 leading-tight">
                                      {dir.name}
                                    </div>
                                    <div className="text-[8.5px] text-slate-400 font-mono">DIN: {dir.dinNumber}</div>
                                    <select
                                      value={dir.dinKycStatus || 'Pending'}
                                      onChange={e => handleUpdateDirectorKycStatus(cl.id, dIdx, e.target.value as any)}
                                      className="w-full text-[9px] font-bold py-0.5 px-1 border border-slate-205 dark:border-slate-800 rounded bg-white dark:bg-slate-900 cursor-pointer text-slate-705 dark:text-slate-305"
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Pending with CA">Pending with CA</option>
                                      <option value="Approved">Approved</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3 space-y-1">
                            <select value={r.adt1Status || 'NOT FILED'} onChange={e => handleUpdateRocStatus(cl.id, 'adt1Status', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="SRN No" value={r.adt1Srn || ''} onChange={e => handleUpdateRocStatus(cl.id, 'adt1Srn', e.target.value)} className="block w-24 p-1 border border-slate-150 rounded text-[9px] font-mono bg-slate-50" />
                          </td>
                          <td className="p-3 space-y-1">
                            <select value={r.aoc4Status || 'NOT FILED'} onChange={e => handleUpdateRocStatus(cl.id, 'aoc4Status', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="SRN No" value={r.aoc4Srn || ''} onChange={e => handleUpdateRocStatus(cl.id, 'aoc4Srn', e.target.value)} className="block w-24 p-1 border border-slate-150 rounded text-[9px] font-mono bg-slate-50" />
                          </td>
                          <td className="p-3 space-y-1">
                            <select value={r.mgt7Status || 'NOT FILED'} onChange={e => handleUpdateRocStatus(cl.id, 'mgt7Status', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="NOT FILED">Not Filed</option>
                              <option value="FILED">Filed</option>
                            </select>
                            <input type="text" placeholder="SRN No" value={r.mgt7Srn || ''} onChange={e => handleUpdateRocStatus(cl.id, 'mgt7Srn', e.target.value)} className="block w-24 p-1 border border-slate-150 rounded text-[9px] font-mono bg-slate-50" />
                          </td>
                          <td className="p-3">
                            <select value={r.balanceSheetStatus || 'PENDING'} onChange={e => handleUpdateRocStatus(cl.id, 'balanceSheetStatus', e.target.value)} className="p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                              <option value="PENDING">Pending</option>
                              <option value="READY">Ready</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input type="text" placeholder="CA Auditor" value={r.caName || (aud ? aud.name : '')} onChange={e => handleUpdateRocStatus(cl.id, 'caName', e.target.value)} className="w-28 p-1 border border-slate-250 rounded text-[9px] font-semibold bg-indigo-50/50" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === ('din_kyc' as any) && (
        <div className="space-y-4 font-sans">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
            <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">🆔 DIN KYC Management Control Tower</h2>
            <p className="text-[10px] text-slate-400">Centrally monitor DIN status, update verification levels (Pending, Pending with CA, Approved) for directors of LLP, Section 8, and Private Limited enterprises.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 px-3 py-1.5 rounded-2xl w-full sm:max-w-xs">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search Director Name or DIN..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="bg-transparent border-0 w-full focus:ring-0 p-0 text-xs text-slate-705 dark:text-slate-305" 
              />
            </div>
            
            {/* Status counts pills */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="p-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-300 rounded-lg">
                Total: {
                  clients.flatMap(c => c.directors || []).length
                }
              </span>
              <span className="p-1 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                Approved: {
                  clients.flatMap(c => c.directors || []).filter(d => d.dinKycStatus === 'Approved').length
                }
              </span>
              <span className="p-1 px-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                Pending with CA: {
                  clients.flatMap(c => c.directors || []).filter(d => d.dinKycStatus === 'Pending with CA').length
                }
              </span>
              <span className="p-1 px-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 rounded-lg">
                Pending: {
                  clients.flatMap(c => c.directors || []).filter(d => !d.dinKycStatus || d.dinKycStatus === 'Pending').length
                }
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Director Details</th>
                  <th className="p-3">DIN Number</th>
                  <th className="p-3">Associated corporate</th>
                  <th className="p-3">KYC Status Match</th>
                  <th className="p-3">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                {(() => {
                  const allDirs = clients.flatMap(c => 
                    (c.directors || []).map((d, dIdx) => ({
                      ...d,
                      clientId: c.id,
                      clientName: c.clientName,
                      clientType: c.clientType,
                      directorIndex: dIdx
                    }))
                  ).filter(d => 
                    d.name.toLowerCase().includes(search.toLowerCase()) || 
                    d.dinNumber.toLowerCase().includes(search.toLowerCase()) ||
                    d.clientName.toLowerCase().includes(search.toLowerCase())
                  );

                  if (allDirs.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No directors matching search filters found.</td>
                      </tr>
                    );
                  }

                  return allDirs.map((dir, idx) => (
                    <tr key={`${dir.dinNumber}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-5">
                        <div className="font-black text-slate-800 dark:text-slate-150 text-sm">{dir.name}</div>
                        <div className="text-[10px] text-slate-450 space-y-0.5 mt-0.5">
                          {dir.email && <div className="font-mono">📧 {dir.email}</div>}
                          {dir.mobile && <div className="font-mono">📱 {dir.mobile}</div>}
                          {!dir.email && !dir.mobile && <div className="italic text-slate-400 font-sans">No Contact Information</div>}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs">
                        {dir.dinNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-black text-slate-700 dark:text-slate-350">{dir.clientName}</div>
                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold px-1 rounded uppercase tracking-wider leading-none mt-1 inline-block">
                          {dir.clientType}
                        </span>
                      </td>
                      <td className="p-3">
                        {(() => {
                          const st = dir.dinKycStatus || 'Pending';
                          if (st === 'Approved') {
                            return <span className="px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">Approved</span>;
                          } else if (st === 'Pending with CA') {
                            return <span className="px-2 py-0.5 text-[9px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg">Pending with CA</span>;
                          } else {
                            return <span className="px-2 py-0.5 text-[9px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg">Pending</span>;
                          }
                        })()}
                      </td>
                      <td className="p-3">
                        <select
                          value={dir.dinKycStatus || 'Pending'}
                          onChange={e => handleUpdateDirectorKycStatus(dir.clientId, dir.directorIndex, e.target.value as any)}
                          className="text-[10px] font-bold p-1 border border-slate-205 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 cursor-pointer text-slate-700 dark:text-slate-300"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Pending with CA">Pending with CA</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === ('post_compliance' as any) && (
        <div className="space-y-4 font-sans">
          <div className="bg-rose-50/55 dark:bg-slate-955 p-4 rounded-3xl border border-rose-105/40 dark:border-slate-850">
            <h2 className="text-sm font-black uppercase text-rose-850 dark:text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> ⚓ Post-Incorporation Compliance Control
            </h2>
            <p className="text-[10px] text-slate-500">Track newborn Private Limited companies and Section 8 NGOs requiring mandatory initial statutory filings (INC-20A Commencement of Business within 180 days, and ADT-1 Auditor Appointment within 30 days).</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Corporate Entity</th>
                  <th className="p-3">ID / State</th>
                  <th className="p-3 text-center">Commencement (INC-20A)</th>
                  <th className="p-3 text-center">Auditor Appt (ADT-1)</th>
                  <th className="p-3">Outstanding Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                {(() => {
                  const pendingList = clients.filter(c => 
                    (c.clientType === 'PRIVATE LIMITED COMPANY' || c.clientType === 'SECTION 8 NGO') &&
                    (c.isInc20aFiled !== true || c.isAdt1Filed !== true)
                  ).filter(c => 
                    c.clientName.toLowerCase().includes(search.toLowerCase())
                  );

                  if (pendingList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-450 italic bg-green-50/10">All corporate entities are completely up to date with initial Post-Incorporation files! ⚓ Zero files pending.</td>
                      </tr>
                    );
                  }

                  return pendingList.map(cl => (
                    <tr key={cl.id} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-5">
                        <div className="font-black text-slate-850 dark:text-slate-100 text-sm">{cl.clientName}</div>
                        <div className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">{cl.clientType}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-550 space-y-0.5">
                        <div>ID: {cl.incomeTaxId}</div>
                        <div className="text-[9.5px]">Reg: {cl.dateOfRegistration} • {cl.clientState}</div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateClient(cl.id, { isInc20aFiled: !cl.isInc20aFiled })}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase cursor-pointer transition ${
                            cl.isInc20aFiled 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-250' 
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-250 animate-pulse'
                          }`}
                        >
                          {cl.isInc20aFiled ? '✅ INC-20A Filed' : '❌ INC-20A Pending'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateClient(cl.id, { isAdt1Filed: !cl.isAdt1Filed })}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase cursor-pointer transition ${
                            cl.isAdt1Filed 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-250' 
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-250 animate-pulse'
                          }`}
                        >
                          {cl.isAdt1Filed ? '✅ ADT-1 Filed' : '❌ ADT-1 Pending'}
                        </button>
                      </td>
                      <td className="p-3 text-slate-550">
                        <div className="text-[10px] font-bold space-y-0.5 max-w-xs leading-snug">
                          {cl.isInc20aFiled !== true && <div className="text-rose-600 font-extrabold">• INC-20A Form Filings outstanding</div>}
                          {cl.isAdt1Filed !== true && <div className="text-rose-600 font-extrabold">• ADT-1 Auditor Appointment form outstanding</div>}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferringClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] text-xs uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-650" /> Transfer Client Custody (MCA)
              </h3>
              <button 
                type="button" 
                onClick={() => setTransferringClient(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-1.5 text-xs">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wide">{transferringClient.id} • {transferringClient.clientType}</div>
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
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-sans text-xs"
              >
                <option value="">-- No Assignment (Remove handler) --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
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
                  updateV2McaClient(transferringClient);
                  setClients(getV2McaClients());
                  setTransferringClient(null);
                }} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Client Modal */}
      {editingMcaClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-4xl p-6 space-y-4 shadow-xl my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-amber-500" /> Modify Corporate Client Profile
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingMcaClient(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-655"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Enterprise Legal Name *</label>
                <input 
                  type="text" 
                  value={editingMcaClient.clientName}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, clientName: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Corporate Structure *</label>
                <select 
                  value={editingMcaClient.clientType}
                  onChange={e => {
                    const val = e.target.value as any;
                    setEditingMcaClient(prev => prev ? { ...prev, clientType: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="PRIVATE LIMITED COMPANY">Private Limited Company</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="SECTION 8 NGO">Section 8 NGO / Non-Profit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Date of Incorporation</label>
                <input 
                  type="date" 
                  value={editingMcaClient.dateOfRegistration}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, dateOfRegistration: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Client Email ID</label>
                <input 
                  type="email" 
                  value={editingMcaClient.clientEmail || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, clientEmail: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Client Mobile Contact</label>
                <input 
                  type="text" 
                  value={editingMcaClient.clientMobile || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, clientMobile: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Registered Address</label>
                <input 
                  type="text" 
                  value={editingMcaClient.clientAddress || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, clientAddress: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">ROC Jurisdiction State</label>
                <input 
                  type="text" 
                  value={editingMcaClient.clientState}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, clientState: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-indigo-500 block">Income Tax Portal ID / PAN</label>
                <input 
                  type="text" 
                  value={editingMcaClient.incomeTaxId}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, incomeTaxId: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-indigo-950/30 rounded-xl font-mono font-bold uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-indigo-500 block">Income Tax Portal Password</label>
                <input 
                  type="text" 
                  value={editingMcaClient.incomeTaxPassword || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, incomeTaxPassword: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-indigo-950/30 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Auditor firm link</label>
                <select 
                  value={editingMcaClient.auditorFirmId || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingMcaClient(prev => prev ? { ...prev, auditorFirmId: val } : null);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-sans text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Choose Connected CA Auditor --</option>
                  {auditors.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.firmName || 'CA Firm'})</option>
                  ))}
                </select>
              </div>

              {/* Directors Section */}
              <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-955/60 rounded-2xl border border-slate-205 dark:border-slate-850 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <Users className="h-4 w-4" /> Board of Directors ({ (editingMcaClient.directors || []).length })
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const currentDirs = editingMcaClient.directors || [];
                      setEditingMcaClient({
                        ...editingMcaClient,
                        directors: [...currentDirs, { name: '', dinNumber: '', mcaId: '', mcaPassword: '', email: '', mobile: '', dinKycStatus: 'Pending', dinStatus: 'ACTIVE' }]
                      });
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase bg-indigo-50 dark:bg-indigo-955/40 hover:bg-indigo-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200/50 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="h-3 w-3" /> Add New Director
                  </button>
                </div>

                {(editingMcaClient.directors || []).map((fd, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3 relative group">
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400">
                      <span>Director #{index + 1} Profile</span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentDirs = [...(editingMcaClient.directors || [])];
                          currentDirs.splice(index, 1);
                          setEditingMcaClient({
                            ...editingMcaClient,
                            directors: currentDirs
                          });
                        }}
                        className="text-red-500 hover:text-red-700 hover:underline text-[9px] font-bold cursor-pointer"
                      >
                        Remove Director
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Director Name {index === 0 && '*'}</label>
                        <input
                          type="text"
                          required={index === 0}
                          placeholder="e.g. Rahul Sharma"
                          value={fd.name}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], name: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-855 dark:text-slate-100 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">Director DIN {index === 0 && '*'}</label>
                        <input
                          type="text"
                          required={index === 0}
                          placeholder="e.g. 08412491"
                          value={fd.dinNumber}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], dinNumber: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-855 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">MCA V3 ID</label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={fd.mcaId}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], mcaId: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-855 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">DIN V3 Password</label>
                        <input
                          type="text"
                          placeholder="Password"
                          value={fd.mcaPassword || ''}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], mcaPassword: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-855 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Email Contact</label>
                        <input
                          type="email"
                          placeholder="director@company.com"
                          value={fd.email || ''}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], email: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-855 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-450">Mobile Contact</label>
                        <input
                          type="tel"
                          placeholder="e.g. 9812450255"
                          value={fd.mobile || ''}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], mobile: e.target.value };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-855 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-455">DIN KYC Status</label>
                        <select
                          value={fd.dinKycStatus || 'Pending'}
                          onChange={e => {
                            const currentDirs = [...(editingMcaClient.directors || [])];
                            currentDirs[index] = { ...currentDirs[index], dinKycStatus: e.target.value as any };
                            setEditingMcaClient({ ...editingMcaClient, directors: currentDirs });
                          }}
                          className="w-full p-1.5 bg-slate-50/50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-855 dark:text-slate-100"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Pending with CA">Pending with CA</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={editingMcaClient.isInc20aFiled}
                    onChange={e => {
                      const val = e.target.checked;
                      setEditingMcaClient(prev => prev ? { ...prev, isInc20aFiled: val } : null);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold select-none text-[10.5px]">INC-20A Commencement Filed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={editingMcaClient.isAdt1Filed}
                    onChange={e => {
                      const val = e.target.checked;
                      setEditingMcaClient(prev => prev ? { ...prev, isAdt1Filed: val } : null);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold select-none text-[10.5px]">ADT-1 Auditor Appointed</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-850">
              <button 
                type="button" 
                onClick={() => setEditingMcaClient(null)} 
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2McaClient(editingMcaClient);
                  setClients(getV2McaClients());
                  setEditingMcaClient(null);
                  alert('Corporate profile and director details updated successfully!');
                }} 
                className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold cursor-pointer shadow-xs transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reusable Confirmation Modal */}
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
