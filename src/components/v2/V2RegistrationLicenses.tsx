/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, Plus, Search, Download, Users, Edit2, Trash2, 
  X, CheckCircle, FileText, Building2, Store, Phone, Mail, MapPin
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { 
  V2OtherServiceClient, 
  getV2OtherServiceClients, 
  addV2OtherServiceClient, 
  updateV2OtherServiceClient, 
  deleteV2OtherServiceClient,
  exportToCSVFile,
  getV1Employees
} from '../../lib/v2_db';
import { getCurrentSession } from '../../lib/db';
import { isClientAssignedToUser, getEmployeesWithModuleAccess } from '../../lib/permissions';

interface V2RegistrationLicensesProps {
  key?: string;
  initialFilter?: string;
  initialShowAdd?: boolean;
}

export default function V2RegistrationLicenses({
  initialFilter = 'ALL',
  initialShowAdd = false
}: V2RegistrationLicensesProps) {
  const [otherClients, setOtherClients] = useState<V2OtherServiceClient[]>(getV2OtherServiceClients());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allEmployees] = useState(getV1Employees());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>(initialFilter);

  // Modals
  const [showAddOther, setShowAddOther] = useState(initialShowAdd);
  const [editingOtherClient, setEditingOtherClient] = useState<V2OtherServiceClient | null>(null);
  const [transferringOtherClient, setTransferringOtherClient] = useState<V2OtherServiceClient | null>(null);

  // Form
  const [othName, setOthName] = useState('');
  const [othService, setOthService] = useState('MSME Udyam');
  const [othReferred, setOthReferred] = useState('');
  const [othRegDate, setOthRegDate] = useState('2026-06-01');
  const [othAddress, setOthAddress] = useState('');
  const [othEmail, setOthEmail] = useState('');
  const [othMobile, setOthMobile] = useState('');
  const [addAssignedEmpId, setAddAssignedEmpId] = useState('');

  // Expandable contacts
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});

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

  const isAdmin = !currentUser || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const regEmployees = useMemo(() => getEmployeesWithModuleAccess('registration_licenses'), []);

  const accessibleOtherClients = useMemo(() => {
    if (isAdmin) return otherClients;
    return otherClients.filter(c => isClientAssignedToUser(c.assignedEmployeeId, c.assignedEmployeeName, currentUser));
  }, [otherClients, isAdmin, currentUser]);

  const filteredOtherClients = accessibleOtherClients.filter(ot => {
    const matchesSearch = 
      ot.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ot.serviceAvailed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ot.referredBy && ot.referredBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ot.address && ot.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (serviceFilter === 'ALL') return true;
    if (serviceFilter === 'MSME' && ot.serviceAvailed.toLowerCase().includes('msme')) return true;
    if (serviceFilter === 'IEC' && ot.serviceAvailed.toLowerCase().includes('iec')) return true;
    if (serviceFilter === 'FSSAI' && ot.serviceAvailed.toLowerCase().includes('fssai')) return true;
    if (serviceFilter === 'TRADE' && ot.serviceAvailed.toLowerCase().includes('trade')) return true;
    if (serviceFilter === 'LABOUR' && ot.serviceAvailed.toLowerCase().includes('labour')) return true;
    if (serviceFilter === 'DARPAN' && ot.serviceAvailed.toLowerCase().includes('darpan')) return true;

    return ot.serviceAvailed === serviceFilter;
  });

  // Summary Metrics
  const totalCount = accessibleOtherClients.length;
  const msmeCount = accessibleOtherClients.filter(c => c.serviceAvailed.toLowerCase().includes('msme')).length;
  const iecCount = accessibleOtherClients.filter(c => c.serviceAvailed.toLowerCase().includes('iec')).length;
  const fssaiCount = accessibleOtherClients.filter(c => c.serviceAvailed.toLowerCase().includes('fssai')).length;

  const handleCreateOther = (e: React.FormEvent) => {
    e.preventDefault();
    if (!othName || !othService) {
      alert('Client Name and Service chosen are required.');
      return;
    }
    const empToAssign = isAdmin ? addAssignedEmpId : currentUser?.id;
    const matchedEmployee = allEmployees.find(emp => emp.id === empToAssign);

    const added = addV2OtherServiceClient({
      clientName: othName,
      serviceAvailed: othService,
      referredBy: othReferred,
      dateOfRegistration: othRegDate,
      address: othAddress,
      emailId: othEmail,
      mobileNumber: othMobile,
      assignedEmployeeId: empToAssign || undefined,
      assignedEmployeeName: matchedEmployee ? matchedEmployee.name : (currentUser ? currentUser.name : undefined)
    });

    setOtherClients([...otherClients, added]);
    setShowAddOther(false);
    setOthName(''); setOthReferred(''); setOthAddress(''); setOthEmail(''); setOthMobile(''); setAddAssignedEmpId('');
  };

  const handleExportCSV = () => {
    const headers = ['Client Name', 'Service Availed', 'Referred By', 'Date of Registration', 'Assigned Handler', 'Email', 'Mobile', 'Address'];
    const rows = filteredOtherClients.map(c => [
      c.clientName,
      c.serviceAvailed,
      c.referredBy || 'Direct',
      c.dateOfRegistration,
      c.assignedEmployeeName || 'Unassigned',
      c.emailId || '',
      c.mobileNumber || '',
      c.address || ''
    ]);
    exportToCSVFile('licenses_and_registrations.csv', headers, rows);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                <Award className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Registrations, Licenses & Miscellaneous Services
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
                Statutory Licensing Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log and manage MSME Udyam, DGFT Import Export Code (IEC), FSSAI Food Licenses, Trade Licenses, and custom statutory filings.
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
              onClick={() => setShowAddOther(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Log New Application
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registrations</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">{otherClients.length}</span>
          </div>

          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">MSME Udyam</span>
            <span className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5 block">{msmeCount}</span>
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">DGFT IEC Codes</span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5 block">{iecCount}</span>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">FSSAI Licenses</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{fssaiCount}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setServiceFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Licenses ({accessibleOtherClients.length})
            </button>
            <button
              onClick={() => setServiceFilter('MSME')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'MSME'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              MSME Udyam
            </button>
            <button
              onClick={() => setServiceFilter('IEC')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'IEC'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              DGFT IEC
            </button>
            <button
              onClick={() => setServiceFilter('FSSAI')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'FSSAI'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              FSSAI Food
            </button>
            <button
              onClick={() => setServiceFilter('TRADE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'TRADE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Trade License
            </button>
            <button
              onClick={() => setServiceFilter('LABOUR')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                serviceFilter === 'LABOUR'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Labour License
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicant, service, city..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddOther && (
        <form onSubmit={handleCreateOther} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-md">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-2">
              <Plus className="h-4 w-4 text-purple-600" />
              Register New License / Certificate Application
            </h4>
            <button type="button" onClick={() => setShowAddOther(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Client / Business Name *</label>
              <input type="text" required value={othName} onChange={e => setOthName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Service Category *</label>
              <select value={othService} onChange={e => setOthService(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <option value="MSME Udyam">MSME Udyam Registration (Filing)</option>
                <option value="DGFT IEC">Import Export Code (DGFT IEC)</option>
                <option value="FSSAI Basic">FSSAI Food License (Basic/State)</option>
                <option value="Trade License">Municipal Trade License</option>
                <option value="Labour License">Shop & Establishment / Labour License</option>
                <option value="NGO Darpan">NITI Aayog NGO Darpan unique ID</option>
                <option value="12A & 80G">Exemption Certificate (12A/80G special filing)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Referred By</label>
              <input type="text" value={othReferred} onChange={e => setOthReferred(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Registration Date</label>
              <input type="date" value={othRegDate} onChange={e => setOthRegDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Official Email</label>
              <input type="email" value={othEmail} onChange={e => setOthEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Contact Mobile</label>
              <input type="tel" value={othMobile} onChange={e => setOthMobile(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Physical Establishment Address</label>
              <input type="text" value={othAddress} onChange={e => setOthAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
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
                  {regEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddOther(false)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
            <button type="submit" className="px-4.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer">Submit Record</button>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOtherClients.length === 0 ? (
          <div className="col-span-2 p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400">
            No registration / license records found.
          </div>
        ) : (
          filteredOtherClients.map(ot => (
            <div key={ot.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col justify-between space-y-4 font-sans font-medium text-slate-800 shadow-xs">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[9.5px] rounded-md font-bold uppercase font-mono">
                      {ot.serviceAvailed}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm leading-tight">{ot.clientName}</h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setEditingOtherClient(ot)} 
                    className="p-1 px-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg cursor-pointer hover:bg-purple-100"
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
                          title: 'Delete Registration Record',
                          message: `Are you sure you want to delete license record for "${ot.clientName}"? This action is permanent.`,
                          onConfirm: () => {
                            deleteV2OtherServiceClient(ot.id);
                            setOtherClients(getV2OtherServiceClients());
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
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-2xl font-mono text-[10.5px] space-y-1">
                <div className="font-sans flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Referred By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{ot.referredBy || 'Direct Client'}</span>
                </div>
                <div className="font-sans flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Date of Filing:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{ot.dateOfRegistration}</span>
                </div>
                {ot.emailId && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 pt-1">
                    <Mail className="h-3 w-3 text-slate-400" /> {ot.emailId}
                  </div>
                )}
                {ot.mobileNumber && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Phone className="h-3 w-3 text-slate-400" /> {ot.mobileNumber}
                  </div>
                )}
                {ot.address && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin className="h-3 w-3 text-slate-400" /> {ot.address}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Handler Assigned</span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-400">
                    {ot.assignedEmployeeName || '🔴 Unassigned'}
                  </span>
                </div>
                {isAdmin && (
                  <button 
                    type="button" 
                    onClick={() => setTransferringOtherClient(ot)} 
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-700 dark:text-purple-300 font-extrabold text-[10px] cursor-pointer flex items-center gap-1 transition"
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
      {transferringOtherClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" /> Transfer Application Custody
              </h3>
              <button type="button" onClick={() => setTransferringOtherClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="font-extrabold text-slate-800 dark:text-slate-100">{transferringOtherClient.clientName}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{transferringOtherClient.serviceAvailed} • Referral: {transferringOtherClient.referredBy || 'Direct'}</div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Handler:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{transferringOtherClient.assignedEmployeeName || '🔴 Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Pick New Custody Handler *</label>
              <select 
                defaultValue={transferringOtherClient.assignedEmployeeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const employee = regEmployees.find(emp => emp.id === val);
                  if (employee) {
                    transferringOtherClient.assignedEmployeeId = employee.id;
                    transferringOtherClient.assignedEmployeeName = employee.name;
                  } else {
                    transferringOtherClient.assignedEmployeeId = undefined;
                    transferringOtherClient.assignedEmployeeName = undefined;
                  }
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
              >
                <option value="">-- No Assignment --</option>
                {regEmployees.map(emp => (
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
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingOtherClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-purple-600" /> Modify Registration Details
              </h3>
              <button type="button" onClick={() => setEditingOtherClient(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Applicant / Business Name *</label>
                <input 
                  type="text" 
                  value={editingOtherClient.clientName} 
                  onChange={e => setEditingOtherClient({ ...editingOtherClient, clientName: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Service Category</label>
                <select 
                  value={editingOtherClient.serviceAvailed} 
                  onChange={e => setEditingOtherClient({ ...editingOtherClient, serviceAvailed: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                >
                  <option value="MSME Udyam">MSME Udyam Registration (Filing)</option>
                  <option value="DGFT IEC">Import Export Code (DGFT IEC)</option>
                  <option value="FSSAI Basic">FSSAI Food License (Basic/State)</option>
                  <option value="Trade License">Municipal Trade License</option>
                  <option value="Labour License">Shop & Establishment / Labour License</option>
                  <option value="NGO Darpan">NITI Aayog NGO Darpan unique ID</option>
                  <option value="12A & 80G">Exemption Certificate (12A/80G special filing)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Referred By</label>
                  <input 
                    type="text" 
                    value={editingOtherClient.referredBy || ''} 
                    onChange={e => setEditingOtherClient({ ...editingOtherClient, referredBy: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Date of Filing</label>
                  <input 
                    type="date" 
                    value={editingOtherClient.dateOfRegistration} 
                    onChange={e => setEditingOtherClient({ ...editingOtherClient, dateOfRegistration: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Email ID</label>
                  <input 
                    type="email" 
                    value={editingOtherClient.emailId || ''} 
                    onChange={e => setEditingOtherClient({ ...editingOtherClient, emailId: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</label>
                  <input 
                    type="text" 
                    value={editingOtherClient.mobileNumber || ''} 
                    onChange={e => setEditingOtherClient({ ...editingOtherClient, mobileNumber: e.target.value })} 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Address</label>
                <input 
                  type="text" 
                  value={editingOtherClient.address || ''} 
                  onChange={e => setEditingOtherClient({ ...editingOtherClient, address: e.target.value })} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setEditingOtherClient(null)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold cursor-pointer">Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  updateV2OtherServiceClient(editingOtherClient);
                  setOtherClients(getV2OtherServiceClients());
                  setEditingOtherClient(null);
                }} 
                className="px-4.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl cursor-pointer"
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
