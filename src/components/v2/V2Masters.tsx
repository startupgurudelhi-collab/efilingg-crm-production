/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import ConfirmModal from './ConfirmModal';
import { 
  V2Auditor, 
  V2TrademarkAttorney, 
  getV2Auditors, 
  addV2Auditor, 
  getV2TrademarkAttorneys, 
  addV2TrademarkAttorney,
  getV2OtherServiceCategories,
  addV2OtherServiceCategory,
  deleteV2OtherServiceCategory,
  updateV2Auditor,
  deleteV2Auditor,
  updateV2TrademarkAttorney,
  deleteV2TrademarkAttorney,
  getV2McaClients,
  getV2Trademarks
} from '../../lib/v2_db';
import { 
  UserCheck, Plus, Mail, MapPin, Award, Tag, Trash2, Edit2, X, 
  Search, Phone, Building2, Scale, GraduationCap, CheckCircle2, 
  Briefcase, ShieldCheck, Filter, Upload, Image as ImageIcon
} from 'lucide-react';

interface V2MastersProps {
  initialTab?: 'auditor' | 'attorney' | 'category';
  onClose?: () => void;
}

export default function V2Masters({ initialTab = 'auditor', onClose }: V2MastersProps) {
  const [activeTab, setActiveTab] = useState<'auditor' | 'attorney' | 'category'>(initialTab);
  const [auditors, setAuditors] = useState<V2Auditor[]>(getV2Auditors());
  const [attorneys, setAttorneys] = useState<V2TrademarkAttorney[]>(getV2TrademarkAttorneys());
  const [categories, setCategories] = useState<string[]>(getV2OtherServiceCategories());
  const [newCategory, setNewCategory] = useState('');
  
  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Linked MCA and TM counts for reference
  const mcaClients = useMemo(() => getV2McaClients(), []);
  const tmClients = useMemo(() => getV2Trademarks(), []);

  // Confirmation Modal
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

  // Edit states
  const [editingAuditor, setEditingAuditor] = useState<V2Auditor | null>(null);
  const [editingAttorney, setEditingAttorney] = useState<V2TrademarkAttorney | null>(null);

  // Auditor form states
  const [showAddAuditor, setShowAddAuditor] = useState(false);
  const [auditType, setAuditType] = useState<'CA' | 'CS' | 'CMA' | 'ADVOCATE'>('CA');
  const [auditName, setAuditName] = useState('');
  const [auditFirm, setAuditFirm] = useState('');
  const [auditMemNo, setAuditMemNo] = useState('');
  const [auditFrn, setAuditFrn] = useState('');
  const [auditAddress, setAuditAddress] = useState('');
  const [auditPan, setAuditPan] = useState('');
  const [auditEmail, setAuditEmail] = useState('');
  const [auditPhone, setAuditPhone] = useState('');
  const [auditStampUrl, setAuditStampUrl] = useState('');

  const handleStampUpload = (file: File | undefined, onSuccess: (dataUrl: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onSuccess(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Attorney form states
  const [showAddAttorney, setShowAddAttorney] = useState(false);
  const [attType, setAttType] = useState<'ATTORNEY' | 'ADVOCATE' | 'CONSULTANT'>('ATTORNEY');
  const [attName, setAttName] = useState('');
  const [attCode, setAttCode] = useState('');
  const [attEmail, setAttEmail] = useState('');
  const [attPhone, setAttPhone] = useState('');
  const [attBarCouncil, setAttBarCouncil] = useState('');
  const [attAddress, setAttAddress] = useState('');

  const handleAddAuditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditName.trim() || !auditFirm.trim() || !auditMemNo.trim() || !auditFrn.trim() || !auditEmail.trim()) {
      alert('Please fill all required fields marked with *');
      return;
    }
    const added = addV2Auditor({
      name: auditName.trim(),
      firmName: auditFirm.trim(),
      membershipNo: auditMemNo.trim(),
      frnNo: auditFrn.trim(),
      address: auditAddress.trim() || 'N/A',
      panNumber: auditPan.trim().toUpperCase() || 'N/A',
      email: auditEmail.trim(),
      phone: auditPhone.trim(),
      professionalType: auditType,
      stampUrl: auditStampUrl || undefined
    });
    setAuditors(getV2Auditors());
    setShowAddAuditor(false);
    showToast(`✅ ${auditType} Auditor "${added.name}" registered successfully!`);

    // Reset form
    setAuditName('');
    setAuditFirm('');
    setAuditMemNo('');
    setAuditFrn('');
    setAuditAddress('');
    setAuditPan('');
    setAuditEmail('');
    setAuditPhone('');
    setAuditStampUrl('');
    setAuditType('CA');
  };

  const handleAddAttorney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attName.trim() || !attCode.trim() || !attEmail.trim()) {
      alert('Please fill all required fields marked with *');
      return;
    }
    const added = addV2TrademarkAttorney({
      name: attName.trim(),
      attorneyCode: attCode.trim().toUpperCase(),
      email: attEmail.trim(),
      phone: attPhone.trim(),
      barCouncilNo: attBarCouncil.trim(),
      address: attAddress.trim() || 'N/A',
      professionalType: attType
    });
    setAttorneys(getV2TrademarkAttorneys());
    setShowAddAttorney(false);
    showToast(`✅ Legal Counsel "${added.name}" registered successfully!`);

    // Reset Form
    setAttName('');
    setAttCode('');
    setAttEmail('');
    setAttPhone('');
    setAttBarCouncil('');
    setAttAddress('');
    setAttType('ATTORNEY');
  };

  // Filtered lists
  const filteredAuditors = useMemo(() => {
    return auditors.filter(aud => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        aud.name.toLowerCase().includes(q) || 
        aud.firmName.toLowerCase().includes(q) || 
        aud.membershipNo.toLowerCase().includes(q) || 
        aud.frnNo.toLowerCase().includes(q) || 
        aud.email.toLowerCase().includes(q) ||
        (aud.panNumber && aud.panNumber.toLowerCase().includes(q));
      
      const type = aud.professionalType || (aud.name.startsWith('CS') ? 'CS' : 'CA');
      const matchesType = typeFilter === 'ALL' || type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [auditors, searchQuery, typeFilter]);

  const filteredAttorneys = useMemo(() => {
    return attorneys.filter(att => {
      const q = searchQuery.toLowerCase();
      return !searchQuery || 
        att.name.toLowerCase().includes(q) || 
        att.attorneyCode.toLowerCase().includes(q) || 
        att.email.toLowerCase().includes(q) ||
        (att.address && att.address.toLowerCase().includes(q));
    });
  }, [attorneys, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-900/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              CA / CS / Advocates & Attorneys Master Directory
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Maintain authorized Chartered Accountants (CA), Company Secretaries (CS), Advocates and Trademark Attorneys. Use these masters to assign statutory auditors for MCA Companies and representing counsels for Trademark filings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-indigo-300">
              {auditors.length} Auditors • {attorneys.length} Attorneys
            </div>
            <div className="text-[10px] text-slate-400">PostgreSQL Auto-Synchronized</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
              title="Close Masters"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('auditor'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-2xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'auditor' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>CA & CS Auditor Registry</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20">
              {auditors.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('attorney'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-2xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'attorney' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Advocate & Trademark Attorney Master</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20">
              {attorneys.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('category'); setSearchQuery(''); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-2xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'category' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Service Categories</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20">
              {categories.length}
            </span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        {(activeTab === 'auditor' || activeTab === 'attorney') && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'auditor' ? 'Search CA, CS, FRN, Member No...' : 'Search Advocate, Code, Email...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {activeTab === 'auditor' && (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold"
              >
                <option value="ALL">All Types</option>
                <option value="CA">Chartered Accountant (CA)</option>
                <option value="CS">Company Secretary (CS)</option>
                <option value="CMA">Cost Accountant (CMA)</option>
              </select>
            )}

            {activeTab === 'auditor' ? (
              <button
                onClick={() => setShowAddAuditor(!showAddAuditor)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddAuditor ? 'Close Form' : 'Add New CA / CS'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddAttorney(!showAddAttorney)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddAttorney ? 'Close Form' : 'Add Advocate / Attorney'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: CA & CS AUDITOR REGISTRY
          ========================================================================= */}
      {activeTab === 'auditor' && (
        <div className="space-y-4">
          {/* Quick Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 font-medium">
              <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Auditors registered here appear directly inside the <strong>MCA & ROC Compliance</strong> module for assigning Statutory Auditors to Private Limited companies and LLPs.
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-indigo-600 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
              Showing {filteredAuditors.length} of {auditors.length}
            </span>
          </div>

          {/* Add Auditor Form */}
          {showAddAuditor && (
            <form onSubmit={handleAddAuditor} className="p-5 bg-slate-50 dark:bg-slate-900 border-2 border-indigo-500/30 rounded-3xl space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-lg">
                    <Plus className="h-4 w-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase">
                    Register Chartered Accountant / Company Secretary / Auditor
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAuditor(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Professional Type */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Professional Type *
                  </label>
                  <select
                    value={auditType}
                    onChange={e => setAuditType(e.target.value as any)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="CA">Chartered Accountant (CA)</option>
                    <option value="CS">Company Secretary (CS)</option>
                    <option value="CMA">Cost Accountant (CMA)</option>
                    <option value="ADVOCATE">Advocate / Legal Auditor</option>
                  </select>
                </div>

                {/* Professional Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    {auditType} Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={auditType === 'CS' ? 'e.g. CS Amit Singhal' : 'e.g. CA Alok Sharma'}
                    value={auditName}
                    onChange={e => setAuditName(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Firm Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Audit Firm / LLP Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma & Associates CPA"
                    value={auditFirm}
                    onChange={e => setAuditFirm(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="audit@firmdomain.com"
                    value={auditEmail}
                    onChange={e => setAuditEmail(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Membership Number */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Membership No. (ICAI / ICSI) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 084725 / FCS-12345"
                    value={auditMemNo}
                    onChange={e => setAuditMemNo(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100 uppercase"
                  />
                </div>

                {/* FRN Number */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Firm Registration No. (FRN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 012975N / N/A"
                    value={auditFrn}
                    onChange={e => setAuditFrn(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100 uppercase"
                  />
                </div>

                {/* PAN Number */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Firm / Personal PAN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAKFS1823G"
                    value={auditPan}
                    onChange={e => setAuditPan(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={auditPhone}
                    onChange={e => setAuditPhone(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Office Address */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                  Head Office / Chamber Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Preet Vihar, Delhi / Gomti Nagar, Lucknow"
                  value={auditAddress}
                  onChange={e => setAuditAddress(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* CA / Auditor Stamp Upload */}
              <div className="space-y-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                      CA Official Stamp / Round Seal (कै स्टैम्प अपलोड करें)
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Upload round digital stamp image (PNG/JPG with transparent/white background) for automatic printing on Balance Sheet & Reports.
                    </p>
                  </div>
                  {auditStampUrl && (
                    <button
                      type="button"
                      onClick={() => setAuditStampUrl('')}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                    >
                      Remove Stamp
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {auditStampUrl ? (
                    <div className="relative group w-20 h-20 rounded-2xl border-2 border-indigo-400 bg-white p-1 flex items-center justify-center shadow-xs">
                      <img src={auditStampUrl} alt="Uploaded Stamp" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <label className="cursor-pointer text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-lg shadow-sm">
                          Change
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={e => handleStampUpload(e.target.files?.[0], setAuditStampUrl)}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 rounded-2xl cursor-pointer bg-white dark:bg-slate-900 transition text-center">
                      <Upload className="h-5 w-5 text-indigo-500 mb-1" />
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Click to Upload Stamp Image</span>
                      <span className="text-[10px] text-slate-400">Supports PNG, JPG (Max 2MB)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => handleStampUpload(e.target.files?.[0], setAuditStampUrl)}
                      />
                    </label>
                  )}
                  {auditStampUrl && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium space-y-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Stamp Ready for Attestation
                      </div>
                      <p className="text-[10.5px] text-slate-500">Will automatically apply whenever "Print with CA Stamp" is checked.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAuditor(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold cursor-pointer text-xs shadow-md shadow-indigo-600/20"
                >
                  Save {auditType} Auditor
                </button>
              </div>
            </form>
          )}

          {/* Auditors Grid */}
          {filteredAuditors.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <GraduationCap className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No CA / CS Auditors match your search criteria.</p>
              <button
                onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); setShowAddAuditor(true); }}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + Register New Auditor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuditors.map(aud => {
                const linkedMcaCompanies = mcaClients.filter(c => c.auditorFirmId === aud.id);
                const professionalType = aud.professionalType || (aud.name.startsWith('CS') ? 'CS' : 'CA');

                return (
                  <div 
                    key={aud.id} 
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl flex flex-col justify-between shadow-xs hover:border-indigo-400/50 transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2.5 rounded-2xl shrink-0 ${
                            professionalType === 'CS' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' 
                              : professionalType === 'CMA'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          }`}>
                            <GraduationCap className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight">
                              {aud.name}
                            </h4>
                            <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                              {aud.firmName}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          professionalType === 'CS'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:border-purple-800'
                            : professionalType === 'CMA'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800'
                        }`}>
                          {professionalType}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-1.5 text-[11px] font-mono">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span className="text-slate-400 text-[9.5px] uppercase">Membership:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{aud.membershipNo}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span className="text-slate-400 text-[9.5px] uppercase">FRN Code:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{aud.frnNo}</span>
                        </div>
                        {aud.panNumber && (
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span className="text-slate-400 text-[9.5px] uppercase">PAN:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{aud.panNumber}</span>
                          </div>
                        )}
                        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 font-sans space-y-1 text-slate-600 dark:text-slate-400 text-[10.5px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{aud.email}</span>
                          </div>
                          {aud.phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="font-mono">{aud.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{aud.address || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* MCA Linkage Badge & Stamp Status */}
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-medium">Assigned Companies:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          linkedMcaCompanies.length > 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {linkedMcaCompanies.length} MCA Entities
                        </span>
                      </div>

                      {/* CA Official Stamp Status & Thumbnail */}
                      <div className="pt-2 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {aud.stampUrl ? (
                            <div className="w-9 h-9 rounded-xl border border-indigo-200 bg-white p-0.5 shadow-2xs shrink-0 flex items-center justify-center">
                              <img src={aud.stampUrl} alt="CA Stamp" className="max-w-full max-h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0 flex items-center justify-center text-slate-400">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div className="leading-tight">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">CA Stamp</span>
                            <span className={`text-[10.5px] font-bold ${aud.stampUrl ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                              {aud.stampUrl ? '✅ Custom Stamp Uploaded' : 'Default Seal'}
                            </span>
                          </div>
                        </div>

                        <label className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 transition">
                          {aud.stampUrl ? 'Change' : '+ Upload Stamp'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={e => {
                              handleStampUpload(e.target.files?.[0], (dataUrl) => {
                                const updated = { ...aud, stampUrl: dataUrl };
                                updateV2Auditor(updated);
                                setAuditors(getV2Auditors());
                                showToast(`✅ Stamp updated for ${aud.name}!`);
                              });
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingAuditor(aud)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 hover:text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Delete ${aud.name}?`,
                            message: `Are you sure you want to permanently delete Auditor "${aud.name}" (${aud.firmName})? Any company mapped to this auditor will show unassigned.`,
                            onConfirm: () => {
                              deleteV2Auditor(aud.id);
                              setAuditors(getV2Auditors());
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              showToast(`🗑️ Auditor "${aud.name}" deleted successfully.`);
                            }
                          });
                        }}
                        className="p-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                        title="Delete Auditor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: TRADEMARK ADVOCATE & ATTORNEY MASTER
          ========================================================================= */}
      {activeTab === 'attorney' && (
        <div className="space-y-4">
          {/* Quick Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 font-medium">
              <Scale className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Advocates and Attorneys registered here appear in the <strong>Trademark & Copyright</strong> module for assigning representing legal counsels to trademark filings.
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-indigo-600 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
              Showing {filteredAttorneys.length} of {attorneys.length}
            </span>
          </div>

          {/* Add Attorney Form */}
          {showAddAttorney && (
            <form onSubmit={handleAddAttorney} className="p-5 bg-slate-50 dark:bg-slate-900 border-2 border-indigo-500/30 rounded-3xl space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-lg">
                    <Plus className="h-4 w-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase">
                    Register Patent & Trademark Attorney / Advocate
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAttorney(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Legal Role */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Counsel Role *
                  </label>
                  <select
                    value={attType}
                    onChange={e => setAttType(e.target.value as any)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="ATTORNEY">Registered Trademark Attorney</option>
                    <option value="ADVOCATE">High Court Advocate</option>
                    <option value="CONSULTANT">IP Legal Consultant</option>
                  </select>
                </div>

                {/* Attorney Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Counsel Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advocate Rajesh Mehra"
                    value={attName}
                    onChange={e => setAttName(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Attorney / Bar Code */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Attorney Code / Bar Reg No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-28491 / MH-19402"
                    value={attCode}
                    onChange={e => setAttCode(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rajesh@chambers.com"
                    value={attEmail}
                    onChange={e => setAttEmail(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98110 00000"
                    value={attPhone}
                    onChange={e => setAttPhone(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Bar Council */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    Bar Council Enrolment / Chamber
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bar Council of Delhi"
                    value={attBarCouncil}
                    onChange={e => setAttBarCouncil(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Chambers Address */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                  Chambers / Law Firm Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chamber 415, High Court of Delhi, New Delhi - 110001"
                  value={attAddress}
                  onChange={e => setAttAddress(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAttorney(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold cursor-pointer text-xs shadow-md shadow-indigo-600/20"
                >
                  Save Counsel / Attorney
                </button>
              </div>
            </form>
          )}

          {/* Attorneys Grid */}
          {filteredAttorneys.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Scale className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Trademark Attorneys match your search criteria.</p>
              <button
                onClick={() => { setSearchQuery(''); setShowAddAttorney(true); }}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + Register New Attorney
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttorneys.map(att => {
                const assignedTmCases = tmClients.filter(t => t.attorneyId === att.id);

                return (
                  <div 
                    key={att.id} 
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl flex flex-col justify-between shadow-xs hover:border-indigo-400/50 transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2.5 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-2xl shrink-0">
                            <Scale className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight">
                              {att.name}
                            </h4>
                            <p className="text-[10.5px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              CODE: {att.attorneyCode}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {att.professionalType || 'ATTORNEY'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{att.email}</span>
                        </div>
                        {att.phone && (
                          <div className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300 font-mono">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{att.phone}</span>
                          </div>
                        )}
                        {att.barCouncilNo && (
                          <div className="flex items-center gap-1.5 truncate text-[10px] text-slate-500 font-mono">
                            <ShieldCheck className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>Bar: {att.barCouncilNo}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{att.address || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Cases count */}
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-400 font-medium">Assigned Trademark Marks:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          assignedTmCases.length > 0 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {assignedTmCases.length} Marks
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingAttorney(att)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-955/20 text-amber-700 hover:text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Counsel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Delete Attorney ${att.name}?`,
                            message: `Are you sure you want to permanently delete Trademark Attorney "${att.name}" (Code: ${att.attorneyCode})?`,
                            onConfirm: () => {
                              deleteV2TrademarkAttorney(att.id);
                              setAttorneys(getV2TrademarkAttorneys());
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              showToast(`🗑️ Attorney "${att.name}" deleted successfully.`);
                            }
                          });
                        }}
                        className="p-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                        title="Delete Attorney"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: OTHER SERVICE CATEGORIES
          ========================================================================= */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 font-medium">
              <Tag className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Configure corporate classifications and categories for registrations and customized client services.</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-indigo-600 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
              {categories.length} Categories
            </span>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newCategory.trim()) return;
            addV2OtherServiceCategory(newCategory.trim());
            setCategories(getV2OtherServiceCategories());
            showToast(`✅ Category "${newCategory.trim()}" added.`);
            setNewCategory('');
          }} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-3 text-xs items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">New Category / Classification *</label>
              <input 
                type="text" 
                required 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)} 
                placeholder="e.g. MSME Udyam Registration, FSSAI License, etc." 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl" 
              />
            </div>
            <button type="submit" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs">
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-200 dark:border-slate-800 text-[10px]">
                  <th className="p-3.5 pl-5">Service Category Classification</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      {cat}
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <button 
                        type="button" 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: 'Delete Service Category?',
                            message: `Are you sure you want to delete category "${cat}"?`,
                            onConfirm: () => {
                              deleteV2OtherServiceCategory(cat);
                              setCategories(getV2OtherServiceCategories());
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              showToast(`🗑️ Category "${cat}" removed.`);
                            }
                          });
                        }} 
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 hover:text-rose-700 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT AUDITOR
          ========================================================================= */}
      {editingAuditor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase">
                  Modify CA / CS Auditor Profile
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingAuditor(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Professional Designation *</label>
                <select
                  value={editingAuditor.professionalType || 'CA'}
                  onChange={e => {
                    const val = e.target.value as any;
                    setEditingAuditor(prev => prev ? { ...prev, professionalType: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="CA">Chartered Accountant (CA)</option>
                  <option value="CS">Company Secretary (CS)</option>
                  <option value="CMA">Cost Accountant (CMA)</option>
                  <option value="ADVOCATE">Advocate / Legal Auditor</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Professional Name *</label>
                <input 
                  type="text" 
                  value={editingAuditor.name}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, name: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Firm / LLP Name *</label>
                <input 
                  type="text" 
                  value={editingAuditor.firmName}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, firmName: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Official Email *</label>
                <input 
                  type="email" 
                  value={editingAuditor.email}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, email: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Membership No. *</label>
                <input 
                  type="text" 
                  value={editingAuditor.membershipNo}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, membershipNo: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Firm Registration No. (FRN) *</label>
                <input 
                  type="text" 
                  value={editingAuditor.frnNo}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, frnNo: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">PAN Number</label>
                <input 
                  type="text" 
                  value={editingAuditor.panNumber || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, panNumber: val.toUpperCase() } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Contact Phone</label>
                <input 
                  type="text" 
                  value={editingAuditor.phone || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, phone: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Office Address</label>
                <input 
                  type="text" 
                  value={editingAuditor.address || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAuditor(prev => prev ? { ...prev, address: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* CA Stamp in Edit Modal */}
              <div className="sm:col-span-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                    CA Round Stamp / Seal Image (डिजिटल स्टैम्प)
                  </label>
                  {editingAuditor.stampUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingAuditor(prev => prev ? { ...prev, stampUrl: undefined } : null)}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                    >
                      Remove Stamp
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {editingAuditor.stampUrl ? (
                    <div className="w-16 h-16 rounded-xl border-2 border-indigo-400 bg-white p-1 flex items-center justify-center shrink-0">
                      <img src={editingAuditor.stampUrl} alt="Stamp" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-indigo-300 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                      <Upload className="h-5 w-5 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="inline-block px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs">
                      {editingAuditor.stampUrl ? 'Change Stamp Image' : 'Upload Official Stamp (PNG/JPG)'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => {
                          handleStampUpload(e.target.files?.[0], (dataUrl) => {
                            setEditingAuditor(prev => prev ? { ...prev, stampUrl: dataUrl } : null);
                          });
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">Recommended transparent or white background round seal image.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={() => setEditingAuditor(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (!editingAuditor.name || !editingAuditor.firmName || !editingAuditor.email || !editingAuditor.membershipNo || !editingAuditor.frnNo) {
                    alert('Required fields must be filled.');
                    return;
                  }
                  updateV2Auditor(editingAuditor);
                  setAuditors(getV2Auditors());
                  setEditingAuditor(null);
                  showToast(`✅ Auditor "${editingAuditor.name}" updated successfully!`);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT TRADEMARK ATTORNEY
          ========================================================================= */}
      {editingAttorney && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase">
                  Modify Trademark Attorney Profile
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingAttorney(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Counsel Designation *</label>
                <select
                  value={editingAttorney.professionalType || 'ATTORNEY'}
                  onChange={e => {
                    const val = e.target.value as any;
                    setEditingAttorney(prev => prev ? { ...prev, professionalType: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="ATTORNEY">Registered Trademark Attorney</option>
                  <option value="ADVOCATE">High Court Advocate</option>
                  <option value="CONSULTANT">IP Legal Consultant</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Attorney Full Name *</label>
                <input 
                  type="text" 
                  value={editingAttorney.name}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, name: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Attorney Code *</label>
                <input 
                  type="text" 
                  value={editingAttorney.attorneyCode}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, attorneyCode: val.toUpperCase() } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Official Email *</label>
                <input 
                  type="email" 
                  value={editingAttorney.email}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, email: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Contact Phone</label>
                <input 
                  type="text" 
                  value={editingAttorney.phone || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, phone: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Bar Council No.</label>
                <input 
                  type="text" 
                  value={editingAttorney.barCouncilNo || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, barCouncilNo: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Chambers Address</label>
                <input 
                  type="text" 
                  value={editingAttorney.address || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingAttorney(prev => prev ? { ...prev, address: val } : null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={() => setEditingAttorney(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (!editingAttorney.name || !editingAttorney.attorneyCode || !editingAttorney.email) {
                    alert('Required fields must be filled.');
                    return;
                  }
                  updateV2TrademarkAttorney(editingAttorney);
                  setAttorneys(getV2TrademarkAttorneys());
                  setEditingAttorney(null);
                  showToast(`✅ Attorney "${editingAttorney.name}" updated successfully!`);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold cursor-pointer shadow-md shadow-indigo-600/20"
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
