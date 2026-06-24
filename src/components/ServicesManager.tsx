/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getCustomServices, addCustomService, updateCustomService, deleteCustomService } from '../lib/db';
import ConfirmModal from './v2/ConfirmModal';
import { CustomService } from '../types';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Folder, 
  DollarSign, 
  Clock, 
  FileText, 
  ChevronRight, 
  Search, 
  Tag, 
  Info,
  X,
  PlusCircle
} from 'lucide-react';

interface ServicesManagerProps {
  currentUserId: string;
  currentUserRole: string;
  onRefreshData?: () => void;
}

const POPULAR_PACKAGES = [
  'Certificate of Incorporation',
  'PAN Card Generation',
  'TAN Card Registration',
  'EPF & ESIC Setup',
  'GSTIN Registration',
  'MSME Udyam Certificate',
  'Director Identification Number (DIN)',
  'Digital Signature Certificate (DSC)',
  'Company Name Reservation',
  'Partnership Deed Drafting',
  'Trademark Class Search Check',
  'FSSAI Food License Paper'
];

const STANDARD_CATEGORIES = [
  'Business Registration',
  'Taxation',
  'Intellectual Property',
  'Compliance',
  'Certification',
  'Technology',
  'Accounting Services',
  'Other'
];

export default function ServicesManager({ currentUserId, currentUserRole, onRefreshData }: ServicesManagerProps) {
  const [services, setServices] = useState<CustomService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Managing edit/create Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Business Registration');
  const [price, setPrice] = useState(1999);
  const [employeeIncentive, setEmployeeIncentive] = useState<number>(200);
  const [timeline, setTimeline] = useState('5 - 7 Working Days');
  const [packagesIncluded, setPackagesIncluded] = useState<string[]>([]);
  const [customPackageInput, setCustomPackageInput] = useState('');
  const [documentsRequired, setDocumentsRequired] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [customScopeInput, setCustomScopeInput] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [customDeliverableInput, setCustomDeliverableInput] = useState('');

  // Price Breakup State
  const [priceBreakup, setPriceBreakup] = useState<{ name: string; amount: number; discount?: number }[]>([]);
  const [breakupName, setBreakupName] = useState('');
  const [breakupAmount, setBreakupAmount] = useState<number | string>('');
  const [breakupDiscount, setBreakupDiscount] = useState<number | string>('');

  // Status message
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = () => {
    setServices(getCustomServices());
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setCategory('Business Registration');
    setPrice(1999);
    setEmployeeIncentive(300);
    setTimeline('5 - 7 Working Days');
    setPackagesIncluded([]);
    setDocumentsRequired(['Aadhaar Card of Applicant', 'PAN Card of Applicant', 'Address Proof Electricity Bill']);
    setScope([
      'Verification of documents and compliance alignment check',
      'Filing of standard registration portal documents form',
      'Continuous updates and officer dispute resolution reply'
    ]);
    setDeliverables(['Government Granted Certificate of Registration', 'Portal Official Login Credentials']);
    setPriceBreakup([]);
    setBreakupName('');
    setBreakupAmount('');
    setBreakupDiscount('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (srv: CustomService) => {
    setEditingId(srv.id);
    setName(srv.name);
    setCategory(srv.category || 'Compliance');
    setPrice(srv.price);
    setEmployeeIncentive(srv.employeeIncentive !== undefined ? srv.employeeIncentive : Math.round(srv.price * 0.15) || 200);
    setTimeline(srv.timeline || '5 - 7 Working Days');
    setPackagesIncluded(srv.packagesIncluded || []);
    setDocumentsRequired(srv.documentsRequired || []);
    setScope(srv.scope || []);
    setDeliverables(srv.deliverables || []);
    setPriceBreakup(srv.priceBreakup || []);
    setBreakupName('');
    setBreakupAmount('');
    setBreakupDiscount('');
    setIsFormOpen(true);
  };

  // Delete Service
  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Compliance Service',
      message: 'Are you holding consent to remove this compliance service from the catalog? This action is permanent.',
      onConfirm: () => {
        deleteCustomService(id, currentUserId);
        loadServices();
        if (onRefreshData) onRefreshData();
        triggerAlert('success', 'Service option eliminated successfully!');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Toggle checklist packages
  const handleTogglePackage = (pkg: string) => {
    if (packagesIncluded.includes(pkg)) {
      setPackagesIncluded(packagesIncluded.filter((p) => p !== pkg));
    } else {
      setPackagesIncluded([...packagesIncluded, pkg]);
    }
  };

  // Adding Custom list items
  const addCustomPackage = () => {
    if (customPackageInput.trim()) {
      if (!packagesIncluded.includes(customPackageInput.trim())) {
        setPackagesIncluded([...packagesIncluded, customPackageInput.trim()]);
      }
      setCustomPackageInput('');
    }
  };

  const addCustomDoc = () => {
    if (customDocInput.trim()) {
      if (!documentsRequired.includes(customDocInput.trim())) {
        setDocumentsRequired([...documentsRequired, customDocInput.trim()]);
      }
      setCustomDocInput('');
    }
  };

  const addCustomScope = () => {
    if (customScopeInput.trim()) {
      setScope([...scope, customScopeInput.trim()]);
      setCustomScopeInput('');
    }
  };

  const addCustomDeliverable = () => {
    if (customDeliverableInput.trim()) {
      setDeliverables([...deliverables, customDeliverableInput.trim()]);
      setCustomDeliverableInput('');
    }
  };

  // Save Service handler
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerAlert('error', 'Please define a valid service name.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      price: Number(price) || 0,
      employeeIncentive: Number(employeeIncentive) || 0,
      packagesIncluded,
      documentsRequired,
      timeline,
      scope,
      deliverables,
      priceBreakup: priceBreakup.length > 0 ? priceBreakup : undefined
    };

    if (editingId) {
      updateCustomService(editingId, payload, currentUserId);
      triggerAlert('success', 'Service updated successfully!');
    } else {
      addCustomService(payload, currentUserId);
      triggerAlert('success', 'New service added successfully to live catalog!');
      setTimeout(async () => {
        try {
          const { waitForPendingPushes } = await import('../lib/postgresSync');
          await waitForPendingPushes();
        } catch (e) {
          console.warn('Failed to wait for pending pushes in ServicesManager:', e);
        }
        window.location.reload();
      }, 1000);
    }

    setIsFormOpen(false);
    loadServices();
    if (onRefreshData) onRefreshData();
  };

  // Filtering services lists
  const filteredServices = services.filter((srv) => {
    const matchesSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (srv.category && srv.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-850 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Dynamic Header actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 dark:text-slate-100">Live Services Catalog</h3>
              <p className="text-xs text-slate-400">Dynamic setup of packages, price points, and mandatory documentation</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          id="btn-add-service"
          className="flex items-center justify-center space-x-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Add Custom Service</span>
        </button>
      </div>

      {/* Alert notifier banner */}
      {alertMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          alertMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-750 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
        }`}>
          <Info className="h-4 w-4 shrink-0" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Filter and search utilities rail */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850">
        
        {/* Search */}
        <div className="md:col-span-2 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search service name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-805 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
          />
        </div>

        {/* Category filtering */}
        <div className="md:col-span-2 flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider shrink-0">Category</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-505"
          >
            <option value="All">All Categories ({services.length})</option>
            {STANDARD_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Catalog Display List Table */}
      <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
              <th className="p-4">Service Details</th>
              <th className="p-4">Classification</th>
              <th className="p-4">Standard Price</th>
              <th className="p-4">Regulatory Timeline</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-450 font-medium">
                  No services found matching search coordinates.
                </td>
              </tr>
            ) : (
              filteredServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors">
                  
                  {/* Name and package badges summary */}
                  <td className="p-4 space-y-1">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 tracking-tight text-sm block">
                      {srv.name}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {srv.packagesIncluded && srv.packagesIncluded.slice(0, 3).map((pkg, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-650 dark:text-slate-350 font-bold rounded-md">
                          {pkg}
                        </span>
                      ))}
                      {srv.packagesIncluded && srv.packagesIncluded.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-bold self-center">
                          +{srv.packagesIncluded.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50/60 dark:bg-indigo-950/10 text-indigo-750 dark:text-indigo-405 font-bold text-[10px] rounded-full">
                      <Folder className="h-3 w-3" />
                      <span>{srv.category || 'General'}</span>
                    </span>
                  </td>

                  {/* Price */}
                  <td className="p-4 space-y-1">
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm block">
                      ₹{srv.price.toLocaleString()}
                    </span>
                    {currentUserRole === 'admin' && (
                      <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-[#e11d48] dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-bold rounded font-mono">
                        Inc: ₹{(srv.employeeIncentive !== undefined ? srv.employeeIncentive : Math.round(srv.price * 0.15) || 200).toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Timeline */}
                  <td className="p-4">
                    <span className="flex items-center space-x-1 text-slate-500 font-medium font-mono text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{srv.timeline}</span>
                    </span>
                  </td>

                  {/* Operations actions */}
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center space-x-1.5 justify-end">
                      <button
                        onClick={() => handleOpenEdit(srv)}
                        title="Edit Service Details"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors active:scale-95"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(srv.id)}
                        title="Remove Service"
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE & EDIT OVERLAY MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-600/50 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                  {editingId ? `Amend Service Details: ${name}` : 'Introduce New Compliance Service'}
                </h4>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 rounded-xl cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body content */}
            <form onSubmit={handleSaveService} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Service Info Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Private Limited Registration"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Classification Category */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Service Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505"
                  >
                    {STANDARD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Standard Fee Amount (INR, Base) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-550 font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Employee Incentive */}
                {currentUserRole === 'admin' && (
                  <div className="space-y-1">
                    <label className="font-bold text-[#e11d48] dark:text-[#f43f5e] flex items-center block">
                      <span>Internal Employee Incentive (INR) *</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold">₹</span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={employeeIncentive}
                        onChange={(e) => setEmployeeIncentive(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-bold text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-snug">
                      Secured internally. This incentive is credited in employee payroll upon conversion approval, and is **strictly confidential** (never shown in proposals).
                    </p>
                  </div>
                )}

                {/* Price Breakup Module */}
                <div className="space-y-3 bg-slate-50/60 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850 md:col-span-2">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">Itemized Fee Breakup Component (Optional)</span>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400">
                      Specify custom breakdown (e.g. Government Fee, Filing, stamp duties). Sum automatically overrides/populates the base price field.
                    </p>
                  </div>

                  {priceBreakup && priceBreakup.length > 0 && (
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2.5 text-[11px] font-mono">
                      {/* Table headers */}
                      <div className="flex justify-between items-center text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 px-1">
                        <span className="flex-1 text-left">ITEM DESCRIPTION</span>
                        <span className="w-20 text-right">STANDARD</span>
                        <span className="w-20 text-right">DISCOUNT</span>
                        <span className="w-20 text-right">NET PRICE</span>
                        <span className="w-6"></span>
                      </div>
                      
                      {priceBreakup.map((bk, bIdx) => {
                        const discountAmt = bk.discount || 0;
                        const netPrice = bk.amount - discountAmt;
                        return (
                          <div key={bIdx} className="flex justify-between items-center text-slate-700 dark:text-slate-300 py-1 px-1 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 rounded-md">
                            <span className="flex-1 text-left truncate pr-2" title={bk.name}>{bk.name}</span>
                            <span className="w-20 text-right text-slate-500">₹{bk.amount.toLocaleString()}</span>
                            <span className="w-20 text-right text-emerald-650 dark:text-emerald-450">
                              {discountAmt > 0 ? `-₹${discountAmt.toLocaleString()}` : '₹0'}
                            </span>
                            <span className="w-20 text-right font-bold text-slate-900 dark:text-slate-100">
                              ₹{netPrice.toLocaleString()}
                            </span>
                            <div className="w-6 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const list = priceBreakup.filter((_, i) => i !== bIdx);
                                  setPriceBreakup(list);
                                  const totalNet = list.reduce((sum, item) => sum + (item.amount - (item.discount || 0)), 0);
                                  setPrice(totalNet);
                                }}
                                className="text-rose-550 hover:text-rose-700 font-extrabold cursor-pointer transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Summary calculations */}
                      <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800 space-y-1.5 px-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Total Standard Price</span>
                          <span>₹{priceBreakup.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                        </div>
                        
                        {priceBreakup.some(b => (b.discount || 0) > 0) && (
                          <div className="flex justify-between text-emerald-650 dark:text-emerald-450 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/40 dark:border-emerald-900/30">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                              YOUR TOTAL SAVING
                            </span>
                            <span>₹{priceBreakup.reduce((sum, item) => sum + (item.discount || 0), 0).toLocaleString()}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <span>Final Price (Sum Net Price)</span>
                          <span>
                            ₹{priceBreakup.reduce((sum, item) => sum + (item.amount - (item.discount || 0)), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Government Fee, Prof Fee"
                      value={breakupName}
                      onChange={(e) => setBreakupName(e.target.value)}
                      className="w-full sm:flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <div className="relative w-full sm:w-28">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-mono text-[10px]">₹</span>
                      <input
                        type="number"
                        placeholder="Standard"
                        value={breakupAmount}
                        onChange={(e) => setBreakupAmount(e.target.value)}
                        className="w-full pl-6 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl font-mono text-center text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="relative w-full sm:w-36">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-emerald-500 font-mono text-[10px]">₹</span>
                      <input
                        type="number"
                        placeholder="Discount (Opt)"
                        value={breakupDiscount}
                        onChange={(e) => setBreakupDiscount(e.target.value)}
                        className="w-full pl-6 pr-2 py-2 bg-white dark:bg-slate-900 border border-emerald-250 dark:border-emerald-900/50 rounded-xl font-mono text-center text-emerald-700 dark:text-emerald-450 placeholder-emerald-400/70"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (breakupName.trim() && Number(breakupAmount) > 0) {
                          const amt = Number(breakupAmount);
                          const disc = Number(breakupDiscount) || 0;
                          
                          if (disc > amt) {
                            alert("Discount cannot be greater than the Standard Amount");
                            return;
                          }
                          
                          const list = [...priceBreakup, { 
                            name: breakupName.trim(), 
                            amount: amt, 
                            discount: disc 
                          }];
                          setPriceBreakup(list);
                          
                          const totalNet = list.reduce((sum, item) => sum + (item.amount - (item.discount || 0)), 0);
                          setPrice(totalNet);
                          
                          setBreakupName('');
                          setBreakupAmount('');
                          setBreakupDiscount('');
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-[10px] cursor-pointer hover:border hover:border-indigo-200 transition-all flex items-center justify-center animate-none"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Completion Timeline Template *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 - 7 Business Days"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

              </div>

              {/* Package Inclusions (Multi selection checkboxes + write custom inputs) */}
              <div className="space-y-3 bg-slate-50/60 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Standard Package Inclusions (Tick all that apply)</span>
                  <p className="text-[10px] text-slate-450">These benefits are explicitly highlighted in quotation sheets under features list.</p>
                </div>

                {/* Grid checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-medium">
                  {POPULAR_PACKAGES.map((pkg) => {
                    const selected = packagesIncluded.includes(pkg);
                    return (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => handleTogglePackage(pkg)}
                        className={`p-2.5 text-left rounded-xl border text-[10px] tracking-tight cursor-pointer transition-all flex items-center space-x-2 ${
                          selected 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-750 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400 font-extrabold' 
                            : 'bg-white border-slate-200 text-slate-650 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100/55'
                        }`}
                      >
                        <div className={`h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0 border ${
                          selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {selected && <Check className="h-3 w-3 stroke-[3px]" />}
                        </div>
                        <span className="truncate">{pkg}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Inclusion */}
                <div className="flex space-x-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type customized benefit item (e.g. Free GST consultation ledger Audit)"
                    value={customPackageInput}
                    onChange={(e) => setCustomPackageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomPackage(); } }}
                    className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomPackage}
                    className="px-3.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-305 dark:hover:bg-indigo-950 rounded-xl font-bold transition-all"
                  >
                    + Add Inclusion
                  </button>
                </div>

                {/* Additional manual tags display list */}
                {packagesIncluded.filter(p => !POPULAR_PACKAGES.includes(p)).length > 0 && (
                  <div className="space-y-1 pt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block font-mono">Custom Inclusions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {packagesIncluded.filter(p => !POPULAR_PACKAGES.includes(p)).map((cPkg) => (
                        <span key={cPkg} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px]">
                          <span>{cPkg}</span>
                          <button type="button" onClick={() => handleTogglePackage(cPkg)} className="text-slate-400 hover:text-rose-500 cursor-pointer">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Mandatory Documents Required from client (Tags entry) */}
              <div className="space-y-3 p-4 border border-slate-150/60 dark:border-slate-850 rounded-2xl">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Required Onboarding Documents</span>
                  <p className="text-[10px] text-slate-450">These files are demanded from the applicant prior to submitting client portal briefs.</p>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl min-h-[48px] border border-slate-150/40 dark:border-slate-850">
                  {documentsRequired.length === 0 ? (
                    <span className="text-[11px] text-slate-400 self-center">No compliance documents listed. Add document triggers below.</span>
                  ) : (
                    documentsRequired.map((doc, dIdx) => (
                      <span key={dIdx} className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold rounded-full">
                        <span>{doc}</span>
                        <button 
                          type="button" 
                          onClick={() => setDocumentsRequired(documentsRequired.filter((_, i) => i !== dIdx))} 
                          className="text-slate-400 hover:text-rose-500 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Cancelled Cheque Leaf, Partnership Stamp Paper"
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDoc(); } }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomDoc}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
                  >
                    + Add Document
                  </button>
                </div>
              </div>

              {/* ADVANCED PROPOSAL STRUCTURE (Scope bullets & Deliverables lists) */}
              <div className="space-y-4 border-t border-slate-150 dark:border-slate-800 pt-5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block">Proposal PDF Scope Customisation</span>
                
                {/* 1. Scope and Operations bullets details */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Scope of Operations (Quotation Chapter 2)</label>
                  <div className="space-y-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 border border-slate-150/40 dark:border-slate-850 text-[11px]">
                      {scope.map((scp, sIdx) => (
                        <div key={sIdx} className="flex justify-between items-start space-x-2 text-slate-650 dark:text-slate-350">
                          <span className="leading-relaxed">• {scp}</span>
                          <button 
                            type="button" 
                            onClick={() => setScope(scope.filter((_, i) => i !== sIdx))}
                            className="text-slate-401 hover:text-rose-500 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Define operational scope line item bullet"
                        value={customScopeInput}
                        onChange={(e) => setCustomScopeInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomScope(); } }}
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={addCustomScope}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-sandbox-950 rounded-xl font-semibold"
                      >
                        + Add Bullet
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Deliverables list */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Deliverables Generated (Verification Certificates)</label>
                  <div className="space-y-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2 border border-slate-150/40 dark:border-slate-850 text-[11px]">
                      {deliverables.map((del, dIdx) => (
                        <div key={dIdx} className="flex justify-between items-start space-x-2 text-slate-650 dark:text-slate-350">
                          <span className="leading-relaxed">✓ {del}</span>
                          <button 
                            type="button" 
                            onClick={() => setDeliverables(deliverables.filter((_, i) => i !== dIdx))}
                            className="text-slate-401 hover:text-rose-500 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Define certificate/credentials deliverability bullet"
                        value={customDeliverableInput}
                        onChange={(e) => setCustomDeliverableInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDeliverable(); } }}
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={addCustomDeliverable}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-sandbox-950 rounded-xl font-semibold"
                      >
                        + Add Bullet
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Form trigger submission CTA */}
              <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-slate-150 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Publish Service Option'}
                </button>
              </div>

            </form>

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
