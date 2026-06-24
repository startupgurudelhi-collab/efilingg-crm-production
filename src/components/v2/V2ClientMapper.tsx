import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { 
  getV1Employees,
  getV2GstClients,
  updateV2GstClient,
  getV2McaClients,
  updateV2McaClient,
  getV2ItrClients,
  updateV2ItrClient,
  getV2TrustClients,
  updateV2TrustClient,
  getV2DscClients,
  updateV2DscClient,
  getV2OtherServiceClients,
  updateV2OtherServiceClient,
  getV2Trademarks,
  updateV2TrademarkClient
} from '../../lib/v2_db';
import { 
  Users, Search, HelpCircle, Check, ShieldAlert, Layers, AppWindow, ArrowRightLeft, Database, CheckCircle2
} from 'lucide-react';

type ServiceType = 'GST' | 'MCA' | 'ITR' | 'TRUST' | 'DSC' | 'TRADEMARK' | 'OTHER';

interface MappedClient {
  id: string;
  name: string;
  registrationNumber: string; // GSTIN, CIN, PAN, etc.
  serviceType: ServiceType;
  entityType?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  originalObject: any;
}

export default function V2ClientMapper() {
  const [activeService, setActiveService] = useState<ServiceType>('GST');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  // Load operation employees
  const opsEmployees = getV1Employees();

  // Load and normalize clients based on services
  const loadClients = (): MappedClient[] => {
    switch (activeService) {
      case 'GST':
        return getV2GstClients().map(c => ({
          id: c.id,
          name: c.clientName || c.firmName || 'GST Client',
          registrationNumber: c.gstin || 'N/A',
          serviceType: 'GST',
          entityType: c.clientType,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'MCA':
        return getV2McaClients().map(c => ({
          id: c.id,
          name: c.clientName || 'MCA Corporate Client',
          registrationNumber: c.incomeTaxId || 'N/A',
          serviceType: 'MCA',
          entityType: c.clientType,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'ITR':
        return getV2ItrClients().map(c => ({
          id: c.id,
          name: c.taxpayerName,
          registrationNumber: c.panNumber,
          serviceType: 'ITR',
          entityType: c.taxpayerType,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'TRUST':
        return getV2TrustClients().map(c => ({
          id: c.id,
          name: c.entityName,
          registrationNumber: c.itPortalUsername || 'N/A',
          serviceType: 'TRUST',
          entityType: c.typeOfEntity,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'DSC':
        return getV2DscClients().map(c => ({
          id: c.id,
          name: c.clientName,
          registrationNumber: c.firmName || 'N/A',
          serviceType: 'DSC',
          entityType: c.tokenName,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'TRADEMARK':
        return getV2Trademarks().map(c => ({
          id: c.id,
          name: c.clientName,
          registrationNumber: c.applNo || 'N/A',
          serviceType: 'TRADEMARK',
          entityType: `Class ${c.classNumber}`,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      case 'OTHER':
        return getV2OtherServiceClients().map(c => ({
          id: c.id,
          name: c.clientName,
          registrationNumber: c.emailId || 'N/A',
          serviceType: 'OTHER',
          entityType: c.serviceAvailed,
          assignedEmployeeId: c.assignedEmployeeId,
          assignedEmployeeName: c.assignedEmployeeName,
          originalObject: c
        }));
      default:
        return [];
    }
  };

  const allClients = loadClients();

  // Search & Status filters
  const filteredClients = allClients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.entityType || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isAssigned = !!c.assignedEmployeeId;
    if (assignmentFilter === 'unassigned') {
      return matchesSearch && !isAssigned;
    }
    if (assignmentFilter === 'assigned') {
      return matchesSearch && isAssigned;
    }
    return matchesSearch;
  });

  // Calculate high-quality analytics for mapping
  const totalInService = allClients.length;
  const unassignedCount = allClients.filter(c => !c.assignedEmployeeId).length;
  const assignedCount = allClients.filter(c => !!c.assignedEmployeeId).length;
  const assignmentPercentage = totalInService > 0 ? Math.round((assignedCount / totalInService) * 100) : 100;

  // Handle updates directly
  const handleAssignEmployee = (client: MappedClient, employeeId: string) => {
    setSavingId(client.id);
    const selectedEmp = opsEmployees.find(e => e.id === employeeId);
    
    // Create updated shallow copy
    const targetObj = { ...client.originalObject };
    
    if (selectedEmp) {
      targetObj.assignedEmployeeId = selectedEmp.id;
      targetObj.assignedEmployeeName = selectedEmp.name;
    } else {
      targetObj.assignedEmployeeId = undefined;
      targetObj.assignedEmployeeName = undefined;
    }

    // Call service-specific database updater
    switch (client.serviceType) {
      case 'GST':
        updateV2GstClient(targetObj);
        break;
      case 'MCA':
        updateV2McaClient(targetObj);
        break;
      case 'ITR':
        updateV2ItrClient(targetObj);
        break;
      case 'TRUST':
        updateV2TrustClient(targetObj);
        break;
      case 'DSC':
        updateV2DscClient(targetObj);
        break;
      case 'TRADEMARK':
        updateV2TrademarkClient(targetObj);
        break;
      case 'OTHER':
        updateV2OtherServiceClient(targetObj);
        break;
    }

    setTimeout(() => {
      setSavingId(null);
      setSuccessMessage(`Mapped ${client.name} to ${selectedEmp ? selectedEmp.name : 'No Assignment'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 450);
  };

  const handleBulkAssign = (employeeId: string) => {
    if (!employeeId) return;
    const selectedEmp = opsEmployees.find(e => e.id === employeeId);
    if (!selectedEmp) return;

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Map Clients',
      message: `Are you sure you want to map ALL (${filteredClients.length}) visible ${activeService} clients to ${selectedEmp.name}?`,
      onConfirm: () => {
        filteredClients.forEach(client => {
          const targetObj = { ...client.originalObject };
          targetObj.assignedEmployeeId = selectedEmp.id;
          targetObj.assignedEmployeeName = selectedEmp.name;

          switch (client.serviceType) {
            case 'GST': updateV2GstClient(targetObj); break;
            case 'MCA': updateV2McaClient(targetObj); break;
            case 'ITR': updateV2ItrClient(targetObj); break;
            case 'TRUST': updateV2TrustClient(targetObj); break;
            case 'DSC': updateV2DscClient(targetObj); break;
            case 'TRADEMARK': updateV2TrademarkClient(targetObj); break;
            case 'OTHER': updateV2OtherServiceClient(targetObj); break;
          }
        });

        setSuccessMessage(`Bulk mapped ${filteredClients.length} clients to ${selectedEmp.name} successfully!`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section with instructions */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 to-indigo-950 text-white rounded-3xl border border-amber-500/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 bg-amber-400/10 border border-amber-400/25 text-amber-400 rounded-2xl">
            <Database className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              ADMIN CLIENT MAPPING CONSOLE <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-400 text-emerald-950 rounded uppercase font-sans">Master Admin</span>
            </h2>
            <p className="text-xs text-emerald-100/70 max-w-2xl leading-relaxed">
              Accelerate your onboarding workflow! Upload clients service-wise as Master Admin, and map/re-assign client custody to Operation Team employees instantly from this single unified screen.
            </p>
          </div>
        </div>
      </div>

      {/* Floating alert banner */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn shadow-sm">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 animate-bounce" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Statistics & Overview ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-1">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Service Category</span>
          <span className="text-sm font-black text-indigo-650 dark:text-indigo-400">{activeService} Active Clients</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-1">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Onboarded Base</span>
          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{totalInService} Profile Records</span>
        </div>
        <div className="p-3 bg-rose-50/40 dark:bg-rose-955/10 rounded-xl space-y-1 border border-rose-100/50 dark:border-rose-950/30">
          <span className="text-[9px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider block">Pending Mapping</span>
          <span className="text-sm font-black text-rose-650 dark:text-rose-400 flex items-center gap-1.5">
            {unassignedCount} Clients <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-650 dark:text-rose-400 text-[8px] rounded border border-rose-500/20 font-sans tracking-tight">CUSTODY GAP</span>
          </span>
        </div>
        <div className="p-3 bg-emerald-50/40 dark:bg-emerald-955/10 rounded-xl space-y-1 border border-emerald-100/50 dark:border-emerald-950/30">
          <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider block">Completed Mapping</span>
          <span className="text-sm font-black text-emerald-650 dark:text-emerald-400">
            {assignedCount} / {totalInService} ({assignmentPercentage}%)
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Services menu list */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Sub-systems</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1.5">
            {(['GST', 'MCA', 'ITR', 'TRUST', 'DSC', 'TRADEMARK', 'OTHER'] as ServiceType[]).map((srv) => {
              const active = activeService === srv;
              return (
                <button
                  key={srv}
                  onClick={() => {
                    setActiveService(srv);
                    setSearchQuery('');
                    setAssignmentFilter('all');
                  }}
                  className={`px-4 py-2.5 rounded-xl font-extrabold uppercase text-left text-xs tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    active
                      ? 'bg-indigo-650 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {srv === 'GST' && '📅 GST Clients'}
                    {srv === 'MCA' && '🏢 MCA / ROC'}
                    {srv === 'ITR' && '💰 ITR Taxpayers'}
                    {srv === 'TRUST' && '🌱 NGO / Trust'}
                    {srv === 'DSC' && '🔑 DSC Tokens'}
                    {srv === 'TRADEMARK' && '🏷️ Trademarks'}
                    {srv === 'OTHER' && '📦 Misc Registrations'}
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>

          {/* Bulk Assign Tool */}
          {filteredClients.length > 0 && (
            <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl mt-4 space-y-3">
              <div className="text-[10px] font-extrabold text-[#111] dark:text-[#fff] uppercase tracking-wider">
                ⚡ Bulk Allocation ({filteredClients.length} clients)
              </div>
              <p className="text-[9.5px] text-slate-500 leading-snug">
                Map all currently matched clients below to a single handler instantly.
              </p>
              <select
                onChange={(e) => handleBulkAssign(e.target.value)}
                defaultValue=""
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl font-bold font-sans text-[11px]"
              >
                <option value="">-- Choose Hand --</option>
                {opsEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Tabular client display and mapper dropdowns */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-3xs overflow-hidden">
          
          {/* Controls: Search & Mapped filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by client, brand or details..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-sans text-xs font-medium placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  assignmentFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-102 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('unassigned')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                  assignmentFilter === 'unassigned' ? 'bg-red-500 text-white shadow-2xs' : 'text-red-500 hover:bg-red-500/5'
                }`}
              >
                <ShieldAlert className="h-3 w-3" /> Unassigned ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('assigned')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  assignmentFilter === 'assigned' ? 'bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-102 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Assigned
              </button>
            </div>
          </div>

          {/* Client Table Grid */}
          <div className="overflow-x-auto">
            {filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-sans space-y-2">
                <Users className="h-8 w-8 mx-auto opacity-30 text-amber-500" />
                <p className="text-xs font-bold font-sans">No clients matched your criteria / search terms.</p>
                <p className="text-[10px] opacity-75 leading-relaxed">Try choosing another service on the left sidebar or clearing filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 font-bold uppercase select-none text-[9.5px] border-b border-slate-150 dark:border-slate-800">
                    <th className="p-3 pl-4">Client Detail / Legal Name</th>
                    <th className="p-3">Ref ID / Reg Registration</th>
                    <th className="p-3">Entity Type / Scope</th>
                    <th className="p-3">Custody Status</th>
                    <th className="p-3 text-right pr-4">Map To Operational Handler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/60 dark:divide-slate-800/60 text-xs">
                  {filteredClients.map((client) => {
                    const isSaving = savingId === client.id;
                    const isUnassigned = !client.assignedEmployeeId;
                    return (
                      <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        {/* Legal Name */}
                        <td className="p-3 pl-4">
                          <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            {client.name}
                          </div>
                          <div className="text-[9.5px] text-slate-400 uppercase font-sans tracking-wide">
                            {client.id} • V2 Database Record
                          </div>
                        </td>

                        {/* ID */}
                        <td className="p-3 font-mono text-[10.5px] font-bold text-slate-600 dark:text-slate-350">
                          {client.registrationNumber}
                        </td>

                        {/* Entity scope */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold rounded-lg uppercase tracking-wide">
                            {client.entityType || activeService}
                          </span>
                        </td>

                        {/* Mapping Status */}
                        <td className="p-3">
                          {isUnassigned ? (
                            <span className="px-2 py-1 bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 text-[9px] font-black uppercase rounded-lg border border-red-200 flex items-center gap-1 w-max">
                              <ShieldAlert className="h-3 w-3" /> Unassigned
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{client.assignedEmployeeName}</span>
                              <span className="text-[8px] text-emerald-500 font-extrabold uppercase tracking-widest flex items-center gap-0.5 mt-0.5">
                                <Check className="h-2.5 w-2.5" /> Client Assigned
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Dropdown Allocator */}
                        <td className="p-3 text-right pr-4">
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={client.assignedEmployeeId || ""}
                              onChange={(e) => handleAssignEmployee(client, e.target.value)}
                              disabled={isSaving}
                              className={`p-1.5 rounded-xl text-xs font-bold border ${
                                isUnassigned 
                                  ? 'bg-red-50/30 border-red-300 text-red-750 dark:bg-red-955/20 dark:border-red-900 dark:text-red-300'
                                  : 'bg-slate-50 border-slate-205 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              } cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44`}
                            >
                              <option value="">-- Click To Select Handler --</option>
                              {opsEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'STF'})</option>
                              ))}
                            </select>
                            
                            {isSaving && (
                              <span className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

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
