/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  getLeadById,
  updateLeadDetails,
  updateLeadStage,
  updateLeadDetailsAndStage,
  getFollowUps,
  addFollowUp,
  completeFollowUp,
  getEmployees,
  transferLead,
  getLeadHistory,
  getCustomServices
} from '../lib/db';
import { Lead, LeadStage, LEAD_STAGES, FollowUp, Employee } from '../types';
import LeadCollaborationPanel from './LeadCollaborationPanel';
import {
  X,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  Milestone,
  HelpCircle,
  Clock,
  Plus,
  Send,
  UserCheck,
  Check,
  ArrowRightLeft,
  AlertTriangle,
  MapPin,
  Bookmark
} from 'lucide-react';
import LeadTimeline from './LeadTimeline';

interface LeadModalProps {
  leadId: string | null;  // null means Create Mode
  currentUserId: string;
  currentUserRole: 'admin' | 'employee' | 'team_leader';
  onClose: () => void;
  onRefreshData: () => void;
  onCreateLeadSubmit?: (leadData: Omit<Lead, 'id' | 'createdBy'>) => void;
}

export default function LeadModal({
  leadId,
  currentUserId,
  currentUserRole,
  onClose,
  onRefreshData,
  onCreateLeadSubmit
}: LeadModalProps) {
  const isCreateMode = !leadId;

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceRequired, setServiceRequired] = useState('Company Registration');
  const [leadSource, setLeadSource] = useState('Google Search');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [stage, setStage] = useState<LeadStage>('New Lead');
  const [creationDateVal, setCreationDateVal] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [transferredFromName, setTransferredFromName] = useState<string | undefined>(undefined);

  // Subsections state
  const [activeTab, setActiveTab] = useState<'details' | 'followup' | 'transfer' | 'timeline' | 'discussion'>('details');

  // Followup States
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  }); // Today default
  const [nextFollowUpTime, setNextFollowUpTime] = useState('10:00');
  const [remarks, setRemarks] = useState('');

  // Complete Followup popup
  const [completingFollowupId, setCompletingFollowupId] = useState<string | null>(null);
  const [completionResponse, setCompletionResponse] = useState('');
  const [completionStage, setCompletionStage] = useState<LeadStage | ''>('');

  // Transfer States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Search filter options
  const [servicesOptions, setServicesOptions] = useState<string[]>([]);

  useEffect(() => {
    setServicesOptions(getCustomServices().map((s) => s.name));
  }, []);

  const sourceOptions = [
    'Google Search',
    'Instagram Ads',
    'Facebook Ads',
    'WhatsApp Campaign',
    'Cold Call',
    'LinkedIn Outreach',
    'Referral',
    'Direct Walk-in',
    'Organic Social',
    'Bulk Upload',
    'Other'
  ];

  useEffect(() => {
    // Load physical list of active employees (except current for transfers)
    const emps = getEmployees().filter((e) => e.status === 'active');
    setEmployees(emps);

    if (leadId) {
      const lead = getLeadById(leadId);
      if (lead) {
        setCustomerName(lead.customerName);
        setMobile(lead.mobile);
        setEmail(lead.email);
        setBusinessName(lead.businessName);
        setServiceRequired(lead.serviceRequired);
        setLeadSource(lead.leadSource);
        setNotes(lead.notes);
        setAssignedTo(lead.assignedTo);
        setStage(lead.stage);
        setTransferredFromName(lead.transferredFromName);
        if (lead.creationDate) {
          setCreationDateVal(lead.creationDate.split('T')[0]);
        }

        // Fetch followups
        const allFollowups = getFollowUps().filter((f) => f.leadId === leadId);
        setFollowups(allFollowups);
      }
    } else {
      // In create mode, defaults assignment to current user
      setAssignedTo(currentUserId);
    }
  }, [leadId, currentUserId]);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !mobile.trim()) {
      alert('Name and Mobile number are mandatory.');
      return;
    }

    try {
      if (isCreateMode) {
        if (onCreateLeadSubmit) {
          onCreateLeadSubmit({
            customerName,
            mobile,
            email,
            businessName,
            serviceRequired,
            leadSource,
            stage,
            notes,
            assignedTo: assignedTo || currentUserId,
            creationDate: creationDateVal ? `${creationDateVal}T12:00:00.000Z` : undefined
          });
        }
      } else if (leadId) {
        updateLeadDetailsAndStage(
          leadId,
          {
            customerName,
            mobile,
            email,
            businessName,
            serviceRequired,
            leadSource,
            notes,
            assignedTo,
            creationDate: creationDateVal ? `${creationDateVal}T12:00:00.000Z` : undefined
          },
          stage,
          currentUserId
        );
        onRefreshData();
        onClose();
        alert('Lead properties synchronized successfully.');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save lead.');
      onClose(); // Automatically return to main dashboard
    }
  };

  const handleAddNewFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim() || !leadId) return;

    addFollowUp(
      {
        leadId,
        followUpDate: nextFollowUpDate,
        followUpTime: nextFollowUpTime,
        remarks,
        customerResponse: 'Pending',
        createdBy: currentUserId
      },
      currentUserId
    );

    // reset fields
    setRemarks('');
    // refresh followups
    setFollowups(getFollowUps().filter((f) => f.leadId === leadId));
    onRefreshData();
  };

  const handleResolveFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFollowupId || !completionResponse.trim()) return;

    completeFollowUp(
      completingFollowupId,
      completionResponse,
      completionStage ? (completionStage as LeadStage) : null,
      currentUserId
    );

    // Reset completing state
    setCompletingFollowupId(null);
    setCompletionResponse('');
    setCompletionStage('');

    if (leadId) {
      // refresh
      setFollowups(getFollowUps().filter((f) => f.leadId === leadId));
      const updatedLead = getLeadById(leadId);
      if (updatedLead) {
        setStage(updatedLead.stage);
      }
    }
    onRefreshData();
  };

  const handleTriggerTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !targetEmployeeId || !transferReason.trim()) {
      alert('Reason and target selection are mandatory.');
      return;
    }

    const success = transferLead(leadId, currentUserId, targetEmployeeId, transferReason);
    if (success) {
      setTransferSuccess(true);
      setTimeout(() => {
        onRefreshData();
        onClose();
      }, 1000);
    } else {
      alert('Execution failed. Verify lead ownership limits.');
    }
  };

  // WhatsApp click to chat
  const handleWhatsAppRedirect = () => {
    // Strip characters, prepend Indian standard prefix if 10-digit
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
    const customMessage = encodeURIComponent(
      `Hello ${customerName}, this is regarding your ${serviceRequired} application at eFilingg compliance desk.`
    );
    window.open(`https://wa.me/${cleanMobile}?text=${customMessage}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 p-4 overflow-y-auto flex justify-center items-start md:items-center">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[550px]">
        {/* Header and Left tabs Panel */}
        <div className="w-full md:w-1/4 bg-slate-50 dark:bg-slate-950 p-6 border-r border-slate-150 dark:border-slate-850 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase font-mono">
                {isCreateMode ? 'Add New Client' : `Lead ID: ${leadId}`}
              </span>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 ${
                  activeTab === 'details'
                    ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 border border-slate-205 dark:border-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                Profile Details
              </button>

              {!isCreateMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('followup')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 flex items-center justify-between ${
                      activeTab === 'followup'
                        ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 border border-slate-205 dark:border-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    <span>Follow-ups ({followups.length})</span>
                    {followups.some((f) => f.status === 'overdue') && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('transfer')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 ${
                      activeTab === 'transfer'
                        ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 border border-slate-205 dark:border-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    Transfer Ownership
                  </button>

                  {leadId && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveTab('timeline')}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 ${
                          activeTab === 'timeline'
                            ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 border border-slate-205 dark:border-slate-800 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                        }`}
                      >
                        Audit Timeline
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('discussion')}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors shrink-0 flex items-center space-x-1.5 ${
                          activeTab === 'discussion'
                            ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 border border-slate-205 dark:border-slate-800 shadow-xs font-bold text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                        <span>Team Discussion</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick Communication Widget */}
          {!isCreateMode && mobile && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-6 md:mt-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">
                Instant Chat Channels
              </span>
              <button
                onClick={handleWhatsAppRedirect}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-emerald-250 dark:border-emerald-900 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-colors text-xs font-semibold"
              >
                <span>WhatsApp click-to-chat</span>
              </button>
              <a
                href={`tel:${mobile}`}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-slate-250 dark:border-slate-800 text-slate-650 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-xs font-semibold"
              >
                <span>One-Click Dial Calling</span>
              </a>
            </div>
          )}
        </div>

        {/* Content Form Panel */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          
          {/* Top Bar with title close */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {isCreateMode ? 'Enroll New Filing Lead' : `Manage Lead : ${customerName}`}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-grow flex-1 overflow-y-auto max-h-[60vh] pr-1">
            
            {transferredFromName && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-450 text-xs font-semibold flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4 shrink-0" />
                <span>Lead data transfer from <strong>{transferredFromName}</strong></span>
              </div>
            )}
            
            {/* TAB: Profile Details Edit */}
            {activeTab === 'details' && (
              <form onSubmit={handleSaveDetails} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Customer Name *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Vijay Shekar"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Mobile field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Email address field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        placeholder="client@mail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Entity business name field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Business Entity Name (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Apex Traders"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Configurable Lead Date field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Date of Lead *
                    </label>
                    <input
                      type="date"
                      required
                      value={creationDateVal}
                      onChange={(e) => setCreationDateVal(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  {/* Services dropdown Required */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Service Required *
                    </label>
                    <select
                      value={serviceRequired}
                      onChange={(e) => setServiceRequired(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {servicesOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lead Sources dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Lead Source *
                    </label>
                    <select
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {sourceOptions.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>

                  {/* Current assigned employee (Admins only can reassign, employees view-only) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Assigned To Employee
                    </label>
                    {(currentUserRole === 'admin' || currentUserRole === 'team_leader') ? (
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-150 text-xs text-slate-700 dark:text-slate-300 rounded-xl font-mono">
                        {employees.find((e) => e.id === assignedTo)?.name || assignedTo} (Associate Lock)
                      </div>
                    )}
                  </div>

                  {/* Stage Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Lead Conversion Stage
                    </label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as LeadStage)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {LEAD_STAGES.map((stg) => (
                        <option key={stg} value={stg}>{stg}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Notes input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block font-sans">
                    Filing Notes, Inbound Requirements, Comments
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide standard registration instructions, key partner data..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Submits */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="submit"
                    className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide transition-all shadow-md cursor-pointer"
                  >
                    {isCreateMode ? 'Enroll Lead Profile' : 'Synchronize Properties'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Follow-up entries */}
            {activeTab === 'followup' && (
              <div className="space-y-6">
                
                {/* Add new follow-up form */}
                <div className="bg-slate-500/5 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span>Schedule Next Follow-up Task</span>
                  </span>

                  <form onSubmit={handleAddNewFollowUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Date *</label>
                        <input
                          type="date"
                          required
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Time *</label>
                        <input
                          type="time"
                          required
                          value={nextFollowUpTime}
                          onChange={(e) => setNextFollowUpTime(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Scheduled Actions Remarks</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Follow up regarding identity proofs and pan signatures."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Schedule Task
                    </button>
                  </form>
                </div>

                {/* Followups listing */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">History Log Checklist</span>
                  
                  {followups.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No follow-ups recorded for this client.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followups.map((f) => (
                        <div
                          key={f.id}
                          className={`p-4 border rounded-2xl flex flex-col justify-between gap-4 ${
                            f.status === 'completed'
                              ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-850 opacity-75'
                              : f.status === 'overdue'
                              ? 'bg-rose-50/10 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40'
                              : 'bg-white dark:bg-slate-900 border-slate-150-dark:border-slate-800'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">
                                  {f.followUpDate} @ {f.followUpTime}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    f.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950'
                                      : f.status === 'overdue'
                                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/45 animate-pulse'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                  }`}
                                >
                                  {f.status}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">#{f.id}</span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                              Remarks: <span className="font-normal">{f.remarks}</span>
                            </p>

                            {f.status === 'completed' && f.customerResponse && (
                              <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed italic bg-slate-100/40 dark:bg-slate-950/40 p-2 rounded-lg mt-1 border border-slate-150/10">
                                Response: {f.customerResponse}
                              </p>
                            )}
                          </div>

                          {f.status !== 'completed' && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => setCompletingFollowupId(f.id)}
                                className="flex items-center space-x-1 py-1 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Mark Task Complete</span>
                              </button>
                            </div>
                          )}

                          {/* Completing followup panel inline dropdown */}
                          {completingFollowupId === f.id && (
                            <form
                              onSubmit={handleResolveFollowUpSubmit}
                              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 mt-2"
                            >
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-250 block">
                                Complete Task Registry
                              </span>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Customer Response *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="E.g. Responded positively, requested quotation email."
                                  value={completionResponse}
                                  onChange={(e) => setCompletionResponse(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-xs"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Update Conversion Stage (Optional)</label>
                                <select
                                  value={completionStage}
                                  onChange={(e) => setCompletionStage(e.target.value as LeadStage)}
                                  className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-xs"
                                >
                                  <option value="">-- Retain Current Stage --</option>
                                  {LEAD_STAGES.map((stg) => (
                                    <option key={stg} value={stg}>{stg}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex justify-end space-x-2 pt-1 border-t border-slate-100 dark:border-slate-900">
                                <button
                                  type="button"
                                  onClick={() => setCompletingFollowupId(null)}
                                  className="px-3 py-1 text-xs text-slate-500"
                                >
                                  Close
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1 bg-emerald-600 text-white font-bold text-xs rounded-md"
                                >
                                  Resolve Task
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Transfer Ownership */}
            {activeTab === 'transfer' && (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-500/5 border border-slate-150 rounded-2xl space-y-2">
                  <span className="flex items-center space-x-2 font-bold text-xs text-slate-850 dark:text-slate-150">
                    <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                    <span>Permanent Lead Resource Handoff</span>
                  </span>
                  <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-sans">
                    Transfer ownership permanently to another associate Desk. Once transferred:
                    <br />
                    1. The client is immediately removed from your active operations bucket.
                    <br />
                    2. The target Associate receives active alerts and takes over followups.
                    <br />
                    3. Lead transfer and audit logs are permanently locked.
                  </p>
                </div>

                {transferSuccess ? (
                  <div className="p-8 text-center bg-emerald-50 rounded-xl text-emerald-600 font-bold text-sm flex flex-col items-center space-y-2">
                    <Check className="h-8 w-8 animate-bounce" />
                    <span>Filing Lead Assigned Successfully! Redirecting...</span>
                  </div>
                ) : (
                  <form onSubmit={handleTriggerTransferSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                        Select Recipient Associate *
                      </label>
                      <select
                        required
                        value={targetEmployeeId}
                        onChange={(e) => setTargetEmployeeId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs"
                      >
                        <option value="">-- Select Active Corporate employee --</option>
                        {employees
                          .filter((e) => e.id !== currentUserId && (e.role === 'employee' || e.role === 'team_leader'))
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.email})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                        Reason for Transfer (Mandatory) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Shifting trademark profile to priority south division desk."
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-slate-400 font-mono">Operations: Transfer locked on submit</span>
                      <button
                        type="submit"
                        className="py-2 px-5 bg-emerald-600 hover:bg-emerald-505 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Confirm Resource Transfer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB: Audit TIMELINE */}
            {activeTab === 'timeline' && leadId && <LeadTimeline leadId={leadId} />}

            {/* TAB: Team Discussion */}
            {activeTab === 'discussion' && leadId && (
              <LeadCollaborationPanel
                leadId={leadId}
                customerName={customerName || 'Lead Profile'}
                currentUserId={currentUserId}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
