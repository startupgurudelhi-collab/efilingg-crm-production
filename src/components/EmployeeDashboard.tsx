/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  getLeads,
  getFollowUps,
  getProposals,
  createLead,
  getEmployees,
  getISTDateString,
  getISTTimeString,
  completeFollowUp,
  getRelativeISTDateString,
  saveEmployees,
  addLeaveRequest,
  getLeaveRequests,
  getCurrentPayrollMonth,
  getPayrollMonths,
  getCycleDateRangeForMonth,
  getAttendanceMetricsForCycle,
  employeePunchIn,
  employeePunchOut,
  getAttendances,
  runAttendanceAutoJobs,
  markLeadAsContacted,
  getTransfers,
  transferLead,
  addResignationRequest,
  getResignationRequests,
  formatLeadMobileNumberForExport
} from '../lib/db';
import { Lead, FollowUp, Proposal, LeadStage, Employee, LEAD_STAGES, LeaveRequest, ResignationRequest } from '../types';
import {
  Briefcase,
  Calendar,
  AlertTriangle,
  Award,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Bookmark,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  CheckCircle,
  Clock,
  ExternalLink,
  PhoneCall,
  X,
  Printer,
  IdCard,
  User,
  ArrowRightLeft
} from 'lucide-react';
import LeadModal from './LeadModal';
import ProposalBuilder from './ProposalBuilder';
import ServicesManager from './ServicesManager';
import OfferLetterModal from './OfferLetterModal';
import ExitLetterModal from './ExitLetterModal';

interface EmployeeDashboardProps {
  currentUserId: string;
  triggerRefresh: number;
  onRefreshData: () => void;
  onTriggerLeadDetail: (id: string | null) => void;
  onTriggerProposalPreview: (prop: Proposal) => void;
  onTriggerProposalDraft: () => void;
}

export default function EmployeeDashboard({
  currentUserId,
  triggerRefresh,
  onRefreshData,
  onTriggerLeadDetail,
  onTriggerProposalPreview,
  onTriggerProposalDraft
}: EmployeeDashboardProps) {
  // DB States
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);

  // Re-transfer states for Shared Lead
  const [reTransferringLeadId, setReTransferringLeadId] = useState<string | null>(null);
  const [reTransferTargetId, setReTransferTargetId] = useState<string>('');
  const [reTransferReason, setReTransferReason] = useState<string>('');
  const [reTransferError, setReTransferError] = useState<string>('');
  const [reTransferSuccess, setReTransferSuccess] = useState<boolean>(false);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  // Search & Filters inside associate bucket
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterService, setFilterService] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showServicesCatalog, setShowServicesCatalog] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'followups' | 'hr'>('leads');
  const [employeeSelf, setEmployeeSelf] = useState<Employee | null>(null);
  const [attendanceDaysInput, setAttendanceDaysInput] = useState(30);

  // New Category Filters & mark as contacted popup hooks
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INTRESTED' | 'FOLLOWUP PENDING' | 'FINAL DISPOSED' | 'CONVERTED'>('ALL');
  const [visibleLeadsCount, setVisibleLeadsCount] = useState(10);
  const [contactedLeadId, setContactedLeadId] = useState<string | null>(null);
  const [contactedNewStage, setContactedNewStage] = useState<'Interested' | 'Not Interested'>('Interested');
  const [contactedRemarks, setContactedRemarks] = useState('');

  const handleMarkContactedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactedLeadId) return;
    try {
      markLeadAsContacted(contactedLeadId, contactedNewStage, contactedRemarks, currentUserId);
      setContactedLeadId(null);
      setContactedRemarks('');
      onRefreshData();
      alert('Lead marked as Contacted successfully! All outstanding pendencies have been cleared and the category stage updated.');
    } catch (err: any) {
      alert(err.message || 'Failed to update contacted status.');
    }
  };

  useEffect(() => {
    // Run automated attendance checkouts or absents on load
    try {
      runAttendanceAutoJobs(currentUserId);
    } catch (e) {
      console.error('Failed to run auto attendance jobs inside dashboard', e);
    }

    // Load employee self details
    const allEmps = getEmployees();
    const self = allEmps.find((e) => e.id === currentUserId);
    if (self) {
      setEmployeeSelf(self);
    }

    // Support matching all duplicate profiles or emails of this employee to ensure they never lose data
    const matchedEmployeeIds = allEmps
      .filter((e) => {
        if (e.id === currentUserId) return true;
        if (self && e.email && e.email.toLowerCase() === self.email.toLowerCase()) return true;
        return false;
      })
      .map((e) => e.id);

    // Employees can ONLY see their assigned leads unless assigned by Admin
    const allLeads = getLeads();
    const matchedLeads = allLeads.filter((l) => {
      if (!l.assignedTo) return false;
      if (matchedEmployeeIds.includes(l.assignedTo)) return true;
      
      // Additional robust fallback if the lead got assigned by Email or Name instead of raw ID
      if (self) {
        if (l.assignedTo.toLowerCase() === self.id.toLowerCase()) return true;
        if (self.email && l.assignedTo.toLowerCase() === self.email.toLowerCase()) return true;
        if (self.name && l.assignedTo.toLowerCase() === self.name.toLowerCase()) return true;
      }
      return false;
    });
    setAssignedLeads(matchedLeads);

    // Get all followups created by/assigned of these leads
    const myLeadsIds = matchedLeads.map((l) => l.id);
    const allFollowups = getFollowUps();
    setFollowups(allFollowups.filter((f) => myLeadsIds.includes(f.leadId)));

    // Get proposals created by this employee (matching all her alias IDs)
    setProposals(
      getProposals().filter((p) => {
        if (matchedEmployeeIds.includes(p.createdBy)) return true;
        if (self && p.createdBy && p.createdBy.toLowerCase() === self.email.toLowerCase()) return true;
        return false;
      })
    );
  }, [currentUserId, triggerRefresh]);

  // Compute Employee-specific metrics
  const totalMyLeads = assignedLeads.length;
  const myConverted = assignedLeads.filter((l) => l.stage === 'Converted').length;
  const conversionRate = totalMyLeads ? Math.round((myConverted / totalMyLeads) * 100) : 0;

  // Follow-ups segmentation
  const todayStr = getISTDateString(); // Dynamic Delhi, India local date
  const todaysFollowups = followups.filter((f) => f.followUpDate === todayStr && f.status === 'pending');
  const overdueFollowups = followups.filter((f) => f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < todayStr));

  // Category specific calculations for pipeline count cards
  const totalFollowupPending = assignedLeads.filter((l) => l.stage === 'Follow-Up Pending').length;
  const totalInterested = assignedLeads.filter((l) => l.stage !== 'Not Interested').length;
  const totalFinalDisposed = assignedLeads.filter((l) => l.stage === 'Not Interested').length;

  // Shared Leads (received by current employee)
  const allTransfers = getTransfers();
  const sharedLeads = assignedLeads.filter(l => 
    allTransfers.some(t => t.leadId === l.id && t.transferredTo === currentUserId)
  );

  const getLeadTransferDetails = (leadId: string) => {
    const transfersForLead = allTransfers.filter(t => t.leadId === leadId && t.transferredTo === currentUserId);
    if (transfersForLead.length === 0) return null;
    const sorted = [...transfersForLead].sort((a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime());
    return sorted[0];
  };

  const handleReTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reTransferringLeadId || !reTransferTargetId || !reTransferReason.trim()) {
      setReTransferError('Please select a recipient and enter a reason.');
      return;
    }
    const success = transferLead(reTransferringLeadId, currentUserId, reTransferTargetId, reTransferReason);
    if (success) {
      setReTransferSuccess(true);
      setTimeout(() => {
        setReTransferringLeadId(null);
        setReTransferTargetId('');
        setReTransferReason('');
        setReTransferSuccess(false);
        setReTransferError('');
        onRefreshData();
      }, 1500);
    } else {
      setReTransferError('Transfer failed. Please check your inputs.');
    }
  };

  // Filter associate leads output
  const filteredMyLeads = assignedLeads.filter((l) => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.mobile.includes(searchQuery) ||
      (l.businessName && l.businessName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStage = filterStage ? l.stage === filterStage : true;
    const matchesService = filterService ? l.serviceRequired === filterService : true;

    let matchesDate = true;
    const leadDateOnly = l.creationDate ? l.creationDate.split('T')[0] : '';
    if (startDate && leadDateOnly < startDate) matchesDate = false;
    if (endDate && leadDateOnly > endDate) matchesDate = false;

    // Apply the user's category filters mapped correctly
    let matchesCategory = true;
    if (categoryFilter === 'INTRESTED') {
      matchesCategory = l.stage !== 'Not Interested';
    } else if (categoryFilter === 'FOLLOWUP PENDING') {
      matchesCategory = l.stage === 'Follow-Up Pending';
    } else if (categoryFilter === 'FINAL DISPOSED') {
      matchesCategory = l.stage === 'Not Interested';
    } else if (categoryFilter === 'CONVERTED') {
      matchesCategory = l.stage === 'Converted';
    }

    return matchesSearch && matchesStage && matchesService && matchesDate && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Quick Dashboard Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Filing Associate Workspace
          </h2>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`px-3.5 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'leads'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-650 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-805'
              }`}
            >
              💼 My Pipeline Leads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('followups')}
              className={`px-3.5 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'followups'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-650 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-805'
              }`}
            >
              📞 Call Followups List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hr')}
              className={`px-3.5 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'hr'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-650 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-805'
              }`}
            >
              📇 My ID Card & Payroll Slider
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowServicesCatalog(true)}
            className="flex items-center space-x-1 py-2 px-3 hover:bg-indigo-100 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-750 font-bold cursor-pointer transition-all shadow-xs"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Manage Services</span>
          </button>

          <button
            onClick={() => onTriggerProposalDraft()}
            className="flex items-center space-x-1 py-2 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold hover:bg-slate-800 cursor-pointer transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Draft Proposal</span>
          </button>

          <button
            onClick={() => onTriggerLeadDetail(null)}
            className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-555 text-white font-bold cursor-pointer transition-all shadow-md shadow-emerald-500/10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Lead</span>
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <>
          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">My Total Leads Assigned</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalMyLeads}</span>
                <span className="text-xs text-slate-400">Total pipeline catalog</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">Today's Call Checklist</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{todaysFollowups.length}</span>
                <span className="text-xs text-slate-400">{todaysFollowups.length ? 'calls upcoming' : 'zero tasks remaining'}</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-rose-250 dark:border-rose-900/40 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-rose-500 font-mono block animate-pulse">Overdue Follow-ups alert</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-450">{overdueFollowups.length}</span>
                <span className="text-xs text-rose-400">Require action focus</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-105 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">Conversion Rate</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{conversionRate}%</span>
                <span className="text-xs text-slate-400">{myConverted} converted leads</span>
              </div>
            </div>
          </div>

          {/* New Custom Stage & Pendency Boxes: Overdue Followups Alerts bottom boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 pb-1.5">
            {/* Follow-Up Pending Box (Full Content in Red) */}
            <div 
              onClick={() => {
                const nextVal = categoryFilter === 'FOLLOWUP PENDING' ? 'ALL' : 'FOLLOWUP PENDING';
                setCategoryFilter(nextVal);
                if (nextVal !== 'ALL') setFilterStage('');
                setActiveTab('leads');
              }}
              className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                categoryFilter === 'FOLLOWUP PENDING'
                  ? 'bg-rose-100 dark:bg-rose-950/40 border-red-650 text-rose-700 dark:text-rose-300 ring-2 ring-red-500/20'
                  : 'bg-rose-50/80 dark:bg-rose-950/20 border-red-500 text-rose-600 dark:text-rose-450 hover:scale-[1.01]'
              }`}
            >
              <span className="text-[10px] font-black font-mono block uppercase tracking-wider text-rose-650 dark:text-rose-450">Follow-Up Pending alert</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-black">{totalFollowupPending}</span>
                <span className="text-[11px] font-bold">Total Followups Pending is {totalFollowupPending}</span>
              </div>
            </div>
 
            {/* Interested Card */}
            <div 
              onClick={() => {
                const nextVal = categoryFilter === 'INTRESTED' ? 'ALL' : 'INTRESTED';
                setCategoryFilter(nextVal);
                if (nextVal !== 'ALL') setFilterStage('');
                setActiveTab('leads');
              }}
              className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                categoryFilter === 'INTRESTED'
                  ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-600 text-indigo-700 dark:text-slate-100 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-400 hover:scale-[1.01]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase tracking-wider">Interested pipeline</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalInterested}</span>
                <span className="text-xs text-slate-400">Stages except Not Interested</span>
              </div>
            </div>
 
            {/* Final Disposed Card */}
            <div 
              onClick={() => {
                const nextVal = categoryFilter === 'FINAL DISPOSED' ? 'ALL' : 'FINAL DISPOSED';
                setCategoryFilter(nextVal);
                if (nextVal !== 'ALL') setFilterStage('');
                setActiveTab('leads');
              }}
              className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                categoryFilter === 'FINAL DISPOSED'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-600 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-400 hover:scale-[1.01]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase tracking-wider">Final Disposed pipeline</span>
              <div className="flex items-baseline justify-between font-sans">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalFinalDisposed}</span>
                <span className="text-xs text-slate-400">Stage is Not Interested</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Leads Table Area */}
            <div className="lg:col-span-2 space-y-4">
              
              <div className="flex flex-col gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assigned Lead Accounts</h3>
                    {/* Category Filter Dropdown */}
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-[10px] font-extrabold rounded-md p-1 focus:outline-none"
                      >
                        <option value="ALL">🌟 ALL ({assignedLeads.length})</option>
                        <option value="INTRESTED">👍 INTRESTED ({assignedLeads.filter(l => l.stage !== 'Not Interested').length})</option>
                        <option value="FOLLOWUP PENDING">📞 FOLLOWUP PENDING ({assignedLeads.filter(l => l.stage === 'Follow-Up Pending').length})</option>
                        <option value="FINAL DISPOSED">🗑️ FINAL DISPOSED ({assignedLeads.filter(l => l.stage === 'Not Interested').length})</option>
                        <option value="CONVERTED">🎉 CONVERTED ({assignedLeads.filter(l => l.stage === 'Converted').length})</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Excel Lead Export button */}
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Client Name', 'Mobile Number', 'Email', 'Company', 'Service Required', 'Lead Source', 'Stage', 'Creation Date'];
                      const rows = filteredMyLeads.map(l => [
                        l.customerName.replace(/"/g, '""'),
                        formatLeadMobileNumberForExport(l.mobile).replace(/"/g, '""'),
                        l.email.replace(/"/g, '""'),
                        (l.businessName || '').replace(/"/g, '""'),
                        l.serviceRequired.replace(/"/g, '""'),
                        l.leadSource.replace(/"/g, '""'),
                        l.stage.replace(/"/g, '""'),
                        l.creationDate
                      ]);

                      const csvLineContent = [
                        headers.join(','),
                        ...rows.map(row => row.map(val => `"${val}"`).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csvLineContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `efilingg_leads_employee_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    <span>Export ({filteredMyLeads.length})</span>
                  </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="relative flex-1 min-w-[140px]">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-355">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search mobiles, names..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-[11px] rounded-lg text-slate-950 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-505"
                    />
                  </div>

                  {/* Date Filters block */}
                  <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-1 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-slate-400">From</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-[10px] focus:outline-none text-slate-850 dark:text-slate-100 font-mono"
                    />
                    <span className="text-[9px] uppercase font-bold text-slate-400">To</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-[10px] focus:outline-none text-slate-855 dark:text-slate-100 font-mono"
                    />
                    {(startDate || endDate) && (
                      <button
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="text-[9px] text-rose-500 hover:underline font-bold px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="p-1 px-1.5 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] rounded-lg"
                  >
                    <option value="">-- Stages --</option>
                    {assignedLeads.map((l) => l.stage).filter((v, i, a) => a.indexOf(v) === i).map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[480px] overflow-y-auto overflow-x-auto border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs animate-pulse-once">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-505 uppercase tracking-wider text-[9px]">
                      <th className="p-4 px-5">Lead Particulars</th>
                      <th className="p-4">Required registration</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Conversion Stage</th>
                      <th className="p-4 text-center">Filing action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {filteredMyLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 text-xs text-sans">
                          No customer leads available in your operation bucket. Click create lead to initialize.
                        </td>
                      </tr>
                    ) : (
                      filteredMyLeads.slice(0, visibleLeadsCount).map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors">
                          <td className="p-4 px-5 space-y-0.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-150">{l.customerName}</span>
                                {l.transferredFromName && (
                                  <span className="px-1.5 py-0.2 text-[8px] bg-amber-50 text-amber-600 dark:bg-amber-955/40 dark:text-amber-400 border border-amber-150 dark:border-amber-900 rounded font-bold">
                                    Transferred from {l.transferredFromName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-mono">
                              <span>{l.mobile}</span>
                              <span>•</span>
                              <span>ID: {l.id}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                            {l.serviceRequired}
                          </td>
                          <td className="p-4 text-slate-500 font-medium">
                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-md text-[10px]">
                              {l.leadSource}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold ${
                              l.stage === 'Converted' ? 'bg-emerald-500 text-white' : 'bg-slate-105 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-650 dark:text-slate-350'
                            }`}>
                              {l.stage}
                            </span>
                          </td>
                          <td className="p-4 text-center space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => onTriggerLeadDetail(l.id)}
                              className="px-2 py-1 text-[10px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-707 dark:text-slate-300 transition-colors"
                            >
                              Update Status
                            </button>
                            {l.stage === 'Follow-Up Pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setContactedLeadId(l.id);
                                  setContactedNewStage('Interested');
                                  setContactedRemarks('');
                                }}
                                className="px-2 py-1 text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer transition-colors active:scale-95"
                              >
                                Mark as Contacted
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredMyLeads.length > visibleLeadsCount && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleLeadsCount(999999)}
                    className="w-full md:w-auto px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer uppercase tracking-wider font-sans whitespace-nowrap"
                  >
                    View More Leads (+{filteredMyLeads.length - visibleLeadsCount} more)
                  </button>
                </div>
              )}
            </div>

            {/* Side Call Checklist column */}
            <div className="space-y-6">

              {/* Shared LEAD Cabinet */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-150 text-sm flex items-center space-x-1.5 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-once" />
                  <span>Shared LEAD</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full font-mono font-bold">
                    {sharedLeads.length} total
                  </span>
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {sharedLeads.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 italic">
                      No leads have been received via share/transfer to your personal Desk.
                    </div>
                  ) : (
                    sharedLeads.map((l) => {
                      const transferDetails = getLeadTransferDetails(l.id);
                      const isRetransferringThis = reTransferringLeadId === l.id;

                      return (
                        <div
                          key={l.id}
                          className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3 relative"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <span 
                                onClick={() => onTriggerLeadDetail(l.id)}
                                className="font-bold text-xs text-slate-900 dark:text-white hover:underline cursor-pointer"
                              >
                                {l.customerName}
                              </span>
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 px-1 py-0.5 rounded-sm font-mono">
                                ID: {l.id}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                              <p><span className="font-semibold text-slate-600 dark:text-slate-350">Mobile:</span> {l.mobile}</p>
                              <p><span className="font-semibold text-slate-600 dark:text-slate-350">Require:</span> {l.serviceRequired}</p>
                            </div>
                          </div>

                          {transferDetails && (
                            <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/55 dark:border-emerald-950/40 rounded-lg text-[10px] space-y-1">
                              <p className="text-emerald-700 dark:text-emerald-300 font-bold">
                                🤝 Shared by: <span className="font-semibold">{transferDetails.transferredFromName}</span>
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 italic font-medium">
                                " {transferDetails.reason} "
                              </p>
                            </div>
                          )}

                          {/* Action re-transfer */}
                          {!isRetransferringThis ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReTransferringLeadId(l.id);
                                setReTransferTargetId('');
                                setReTransferReason('');
                                setReTransferError('');
                                setReTransferSuccess(false);
                              }}
                              className="w-full py-1 px-2.5 bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors flex items-center justify-center space-x-1"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              <span>Re-Transfer</span>
                            </button>
                          ) : (
                            <form onSubmit={handleReTransferSubmit} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider font-mono">
                                Re-assign lead
                              </span>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-450 font-bold">Recipient *</label>
                                <select
                                  required
                                  value={reTransferTargetId}
                                  onChange={(e) => setReTransferTargetId(e.target.value)}
                                  className="w-full p-1 border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 text-[10px] rounded-md text-slate-905 dark:text-slate-105"
                                >
                                  <option value="">-- Select Recipient --</option>
                                  {getEmployees()
                                    .filter((e) => e.id !== currentUserId && e.status === 'active')
                                    .map((e) => (
                                      <option key={e.id} value={e.id}>
                                        {e.name} ({e.role})
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-450 font-bold block">Reason *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="E.g. Shifting division desk."
                                  value={reTransferReason}
                                  onChange={(e) => setReTransferReason(e.target.value)}
                                  className="w-full p-1 border border-slate-205 dark:border-slate-805 bg-white dark:bg-slate-900 text-[10px] rounded-md text-slate-905 dark:text-slate-105 focus:outline-none"
                                />
                              </div>

                              {reTransferError && (
                                <p className="text-[9px] text-rose-500 font-bold bg-rose-50/50 p-1 rounded-sm">
                                  ⚠️ {reTransferError}
                                </p>
                              )}

                              {reTransferSuccess && (
                                <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50/50 p-1 rounded-sm">
                                  ✓ Done!
                                </p>
                              )}

                              <div className="flex items-center space-x-1 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setReTransferringLeadId(null)}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-450 bg-white border border-slate-200 rounded-md cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2 py-0.5 text-[10px] text-white bg-emerald-600 hover:bg-emerald-555 rounded-md cursor-pointer font-bold"
                                >
                                  Submit
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Todays schedule summary list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-150 text-sm flex items-center space-x-1.5">
                  <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Call Checklist (Today)</span>
                </h3>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {todaysFollowups.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No customer follow-up calls scheduled for today.
                    </div>
                  ) : (
                    todaysFollowups.map((f) => {
                      const lead = assignedLeads.find((l) => l.id === f.leadId);
                      return (
                        <div
                          key={f.id}
                          className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850 space-y-1 cursor-pointer hover:border-emerald-505"
                          onClick={() => onTriggerLeadDetail(f.leadId)}
                        >
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span className="font-bold text-emerald-650">{f.followUpTime}</span>
                            <span>#{f.id}</span>
                          </div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                            {lead?.customerName || 'Client Name'}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {f.remarks}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Overdue Alerts listing with warnings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-rose-650 text-sm flex items-center space-x-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                  <span>Overdue Followups alert</span>
                </h3>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {overdueFollowups.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No pending alerts. All follow-ups are up to date!
                    </div>
                  ) : (
                    overdueFollowups.map((f) => {
                      const lead = assignedLeads.find((l) => l.id === f.leadId);
                      return (
                        <div
                          key={f.id}
                          className="p-3 bg-rose-500/5 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-1 cursor-pointer hover:bg-rose-50/50"
                          onClick={() => onTriggerLeadDetail(f.leadId)}
                        >
                          <div className="flex items-center justify-between text-[10px] text-rose-500">
                            <span className="font-bold">{f.followUpDate}</span>
                            <span>#{f.id}</span>
                          </div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                            {lead?.customerName || 'Client Name'}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {f.remarks}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Dispatched Quote Lists (Associate specific) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-150 text-sm">My Generated Quotations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-400 md:col-span-2">
                  No service proposals prepared yet. Click Draft Proposal.
                </div>
              ) : (
                proposals.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold font-mono tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-sm">
                          PROP #{p.id}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          ₹{p.finalAmount}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">{p.clientName}</span>
                      <p className="text-[10px] text-slate-450">{p.serviceRequired}</p>
                    </div>

                    <button
                      onClick={() => onTriggerProposalPreview(p)}
                      className="flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-205 hover:bg-slate-50 cursor-pointer text-[10px] font-bold transition-colors animate-pulse-once"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-0.5 text-emerald-500" />
                      <span>Preview PDF</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'followups' ? (
        <EmployeeFollowUpsView
          currentUserId={currentUserId}
          assignedLeads={assignedLeads}
          onRefreshData={onRefreshData}
          onTriggerLeadDetail={(leadId) => onTriggerLeadDetail(leadId)}
        />
      ) : (
        <EmployeeHRView 
          employee={employeeSelf}
          convertedLeadsCount={myConverted}
          assignedLeads={assignedLeads}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Dynamic Services Catalog Overlay for Employees */}
      {showServicesCatalog && (
        <div className="fixed inset-0 z-50 bg-slate-600/50 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 rounded-t-3xl flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-500 font-mono tracking-wider">EMPLOYEE COMPLIANCE SERVICES CONTROL PANEL</span>
              <button
                onClick={() => setShowServicesCatalog(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <ServicesManager 
                currentUserId={currentUserId} 
                currentUserRole="employee" 
                onRefreshData={() => {
                  onRefreshData();
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {contactedLeadId && (
        <div className="fixed inset-0 z-55 bg-slate-900/60 dark:bg-slate-950/80 p-4 flex justify-center items-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Mark Lead as Contacted</h3>
              <button 
                type="button"
                onClick={() => setContactedLeadId(null)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMarkContactedSubmit} className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                You are resolving the follow-up pendency for <strong>{assignedLeads.find(l => l.id === contactedLeadId)?.customerName || contactedLeadId}</strong>. Choose the appropriate following pipeline bucket and add an outcome remark:
              </p>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Select Pipeline Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactedNewStage('Interested')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      contactedNewStage === 'Interested'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    👍 Interested Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactedNewStage('Not Interested')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      contactedNewStage === 'Not Interested'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-205 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    🗑️ Final Disposed (Not Interested)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Call Remarks & Response Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={contactedRemarks}
                  onChange={(e) => setContactedRemarks(e.target.value)}
                  placeholder="Spoke with candidate. Enter detailed notes of dialogue outcome..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs placeholder-slate-400 sm:text-[11px] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setContactedLeadId(null)}
                  className="px-3 py-1.5 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs cursor-pointer shadow-sm active:scale-95"
                >
                  Confirm & Clear Pendency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function EmployeeHRView({
  employee,
  convertedLeadsCount,
  assignedLeads,
  onRefreshData
}: {
  employee: Employee | null;
  convertedLeadsCount: number;
  assignedLeads: Lead[];
  onRefreshData: () => void;
}) {
  if (!employee) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
        <p className="text-xs text-slate-500 font-semibold">Associate credentials indexing... Try reloading or adding profile particulars.</p>
      </div>
    );
  }

  const [showOfferLetter, setShowOfferLetter] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPayrollMonth());
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [myResignations, setMyResignations] = useState<ResignationRequest[]>([]);
  const [activeExitLetter, setActiveExitLetter] = useState<ResignationRequest | null>(null);

  useEffect(() => {
    if (employee?.id) {
      const list = getResignationRequests();
      setMyResignations(list.filter(r => r.employeeId === employee.id));
    }
  }, [employee?.id]);

  // Time-zone check and helper for Dates
  const todayStr = getISTDateString();
  const attendances = getAttendances();
  const todayRecord = attendances.find(r => r.employeeId === employee.id && r.date === todayStr);
  const currentTimeStr = getISTTimeString();

  const handleInPunch = () => {
    try {
      const rec = employeePunchIn(employee.id);
      onRefreshData();
      alert(`Shift Session started! Adjusted compensated check-in: ${rec.checkIn}`);
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    }
  };

  const handleOutPunch = () => {
    try {
      const rec = employeePunchOut(employee.id);
      onRefreshData();
      alert(`Shift Session ended! Registered checkout: ${rec.checkOut}`);
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    }
  };

  const code = employee.employeeCode || 'EFG-REC-001';
  const designation = employee.designation || 'Filing Specialist';
  const joiningDate = employee.dateOfJoining || employee.joinedDate || '2026-06-01';
  const basicSalary = Number(employee.salary) || 0;
  const allowances = Number(employee.allowances) || 0;
  const otherFixedAllowance = Number(employee.otherFixedAllowance) || 0;
  const incentiveRate = Number(employee.incentivePerConversion) || 0;

  // Real-time dynamic calculators and database metrics
  const metrics = getAttendanceMetricsForCycle(employee.id, selectedPeriod);
  
  // Calculate cycle-specific conversion bonuses
  const range = getCycleDateRangeForMonth(selectedPeriod);
  const cycleConversions = assignedLeads.filter(l => {
    if (l.stage !== 'Converted') return false;
    const dateStr = l.creationDate ? l.creationDate.split('T')[0] : '';
    if (!dateStr) return true;
    return dateStr >= range.start && dateStr <= range.end;
  });
  const cycleConvertedCount = cycleConversions.length;
  
  const totalIncentive = cycleConvertedCount * incentiveRate;
  const grossFixedEarnings = basicSalary + otherFixedAllowance;

  const dailyRate = Math.round(basicSalary / 30);
  const deductionDays = metrics.deductionDays;
  
  // No salary deduction for Week Offs. Deduction for LOP Absents or unpaid leaves.
  const paidDaysCount = Math.max(0, 30 - deductionDays);
  const cycleProRataMultiplier = paidDaysCount / 30;
  
  const dryEarnedFixedBasic = Math.round(basicSalary * cycleProRataMultiplier);
  const dryEarnedOtherFixed = Math.round(otherFixedAllowance * cycleProRataMultiplier);
  const dryEarnedFixedCombined = dryEarnedFixedBasic + dryEarnedOtherFixed;
  
  const netPayable = dryEarnedFixedCombined + totalIncentive;

  // Generate all dates in selected payroll period cycle for calendar display
  const getDatesInCycleRange = (startDateStr: string, endDateStr: string): string[] => {
    const datesList: string[] = [];
    const startParts = startDateStr.split('-');
    const endParts = endDateStr.split('-');
    if (startParts.length !== 3 || endParts.length !== 3) return [];
    
    const startYear = parseInt(startParts[0], 10);
    const startMonth = parseInt(startParts[1], 10) - 1;
    const startDay = parseInt(startParts[2], 10);
    
    const endYear = parseInt(endParts[0], 10);
    const endMonth = parseInt(endParts[1], 10) - 1;
    const endDay = parseInt(endParts[2], 10);
    
    const startObj = new Date(startYear, startMonth, startDay);
    const endObj = new Date(endYear, endMonth, endDay);
    
    const current = new Date(startObj);
    while (current <= endObj) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      datesList.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return datesList;
  };

  // Print Salary Slip
  const handlePrintSlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const todayStrDisplay = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Nice formatting helper for the period text
    const formatRangeNice = (mStr: string) => {
      const r = getCycleDateRangeForMonth(mStr);
      const formatDateNice = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const day = parseInt(parts[2], 10);
        const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthStr = monthsShort[parseInt(parts[1], 10) - 1];
        const yr = parts[0].slice(2);
        let sfx = 'th';
        if (day === 1 || day === 21 || day === 31) sfx = 'st';
        else if (day === 2 || day === 22) sfx = 'nd';
        else if (day === 3 || day === 23) sfx = 'rd';
        return `${day}${sfx} ${monthStr} ${yr}`;
      };
      return `${formatDateNice(r.start)} to ${formatDateNice(r.end)}`;
    };

    const periodLabel = formatRangeNice(selectedPeriod);

    const content = `
      <html>
        <head>
          <title>Salary Payslip - EFILINGG FINANCIAL SERVICES</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; }
            .slip-card { border: 2px solid #e2e8f0; padding: 35px; border-radius: 16px; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05); }
            .official-header { text-align: center; border-bottom: 4px double #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
            .official-header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0f172a; }
            .official-header h2 { margin: 5px 0 0 0; font-size: 13px; color: #059669; font-weight: bold; }
            .official-header p { margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 500; }
            .title-box { text-align: center; font-weight: 900; background: #f8fafc; padding: 10px; font-size: 14px; text-transform: uppercase; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; color: #1e293b; }
            .meta-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
            .meta-item { display: flex; justify-content: space-between; padding: 4px 0; }
            .meta-label { font-weight: bold; color: #475569; }
            .meta-val { color: #0f172a; font-weight: 600; }
            .ledger-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
            .ledger-table th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; text-align: left; font-weight: 900; color: #334155; }
            .ledger-table td { border: 1px solid #e2e8f0; padding: 12px; }
            .ledger-table tr.total-row { font-weight: bold; background: #f1f5f9; font-size: 13px; }
            .ledger-table tr.total-row td { border-top: 2px solid #0f172a; color: #0f172a; }
            .footer-sig-block { margin-top: 60px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            .sig-placeholder { text-align: center; width: 180px; border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 6px; color: #334155; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .slip-card { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="slip-card">
            <div class="official-header">
              <h1>EFILINGG FINANCIAL SERVICES PRIVATE LIMITED</h1>
              <h2>Helpline Support Desk: 011-45768289, 9217666839</h2>
              <p>Direct Board Lines: +91-9217666235, 9217666084 | Email: efilingghelpdesk@gmail.com</p>
            </div>
            
            <div class="title-box">OFFICIAL COMPLIANCE WAGES STATEMENT INVOICE</div>

            <div class="meta-section">
              <div>
                <div class="meta-item"><span class="meta-label">Employee Code:</span><span class="meta-val">${code}</span></div>
                <div class="meta-item"><span class="meta-label">Designated Designation:</span><span class="meta-val">${designation}</span></div>
                <div class="meta-item"><span class="meta-label">Full Associate Name:</span><span class="meta-val">${employee.name}</span></div>
                <div class="meta-item"><span class="meta-label">Joining Date DOJ:</span><span class="meta-val">${joiningDate}</span></div>
              </div>
              <div>
                <div class="meta-item"><span class="meta-label">Office Contact:</span><span class="meta-val">${employee.mobile}</span></div>
                <div class="meta-item"><span class="meta-label">Corporate Email:</span><span class="meta-val">${employee.email}</span></div>
                <div class="meta-item"><span class="meta-label">Attendance Days factor:</span><span class="meta-val">${metrics.presentDays} Present / 30 Days</span></div>
                <div class="meta-item"><span class="meta-label">Remittance Release Date:</span><span class="meta-val">${todayStrDisplay}</span></div>
              </div>
            </div>

            <div style="font-size: 11.5px; line-height: 1.6; margin-bottom: 20px;">
              <strong>Cycle Attendance Record Particulars:</strong> ${metrics.presentDays} Present days, ${metrics.weekOffDays} Weekly Offs, ${metrics.paidLeaveDays} Approved Paid Leaves. Deduction days (Loss of Pay): ${metrics.deductionDays} Days.
            </div>

            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Description Wages Bracket</th>
                  <th style="text-align: right;">Fixed Slab Allowance</th>
                  <th style="text-align: right;">Actual Cumulative Earned Wages</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 500;">Basic Pay</td>
                  <td style="text-align: right; font-family: monospace;">₹${basicSalary.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 600;">₹${dryEarnedFixedBasic.toLocaleString()}</td>
                </tr>
                ${otherFixedAllowance > 0 ? `
                <tr>
                  <td style="font-weight: 500;">Fixed Allowances</td>
                  <td style="text-align: right; font-family: monospace;">₹${otherFixedAllowance.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 600;">₹${dryEarnedOtherFixed.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-weight: bold; color: #4f46e5;">Auto Calculated Conversion Incentive (${cycleConvertedCount} cases @ ₹${incentiveRate}/converted)</td>
                  <td style="text-align: right; color: #94a3b8; font-style: italic;">Based on conversion volume</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #16a34a;">₹${totalIncentive.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>Sum Gross Wages</td>
                  <td style="text-align: right; font-family: monospace;">₹${grossFixedEarnings.toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace;">₹${dryEarnedFixedCombined.toLocaleString()}</td>
                </tr>
                <tr class="total-row" style="background: #fafafa; font-size: 14px;">
                  <td style="color: #4f46e5; font-weight: 950;">NET REMUNERATION TO DISBURSE</td>
                  <td style="text-align: right; color: #94a3b8;">-</td>
                  <td style="text-align: right; color: #4f46e5; font-family: monospace; font-weight: 900;">₹${netPayable.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sig-block">
              <div>* Payslip is printed online directly by authorized credentials of associate: ${employee.name}.</div>
              <div class="sig-placeholder">Authorized Director Signatory<br/>EFILINGG FINANCIAL SERVICES PVT LTD</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Profile Print Badge Handler
  const handlePrintBadgeCard = () => {
    const badgeWindow = window.open('', '_blank');
    if (!badgeWindow) return;

    const content = `
      <html>
        <head>
          <title>PVC Badge Printable ID Card - EFILINGG</title>
          <style>
            body { background: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
            .badge-pvc { width: 337px; height: 539px; background: #0f172a; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 25px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; color: white; border: 4px solid #10b981; }
            .pic-holder { width: 110px; height: 110px; border-radius: 50%; border: 3px solid #10b981; overflow: hidden; margin: 15px 0; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #10b981; }
            .pic-holder img { width: 100%; height: 100%; object-fit: cover; }
            .org { font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 8px; width: 100%; margin-top: 5px; }
            .name { font-size: 20px; font-weight: 905; margin: 10px 0 2px 0; color: #f8fafc; }
            .role { font-size: 10px; font-weight: 900; background: #10b981; color: white; border-radius: 99px; px: 12px; padding: 4px 10px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
            .detail-container { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; width: 100%; font-size: 11px; text-align: left; box-sizing: border-box; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #cbd5e1; }
            .detail-row:last-child { margin-bottom: 0; }
            .lbl { font-weight: bold; color: #64748b; }
            .val { font-weight: 700; color: #e2e8f0; font-family: monospace; }
            .code-block { border: 1px dashed #334155; padding: 6px; font-family: monospace; font-size: 10px; letter-spacing: 4px; font-weight: bold; color: #94a3b8; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="badge-pvc">
            <div class="org">EFILINGG SERVICES</div>
            <div class="pic-holder">
              ${employee.photo ? `<img src="${employee.photo}" referrerPolicy="no-referrer" />` : employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="name">${employee.name}</div>
              <div class="role">${designation}</div>
            </div>
            <div class="detail-container">
              <div class="detail-row"><span class="lbl">Associate Code</span><span class="val">${code}</span></div>
              <div class="detail-row"><span class="lbl">Joining Date</span><span class="val">${joiningDate}</span></div>
              <div class="detail-row"><span class="lbl">Corporate Email</span><span class="val" style="font-size: 9px;">${employee.email}</span></div>
            </div>
            <div style="width: 100%">
              <div class="code-block">
                *${code.toUpperCase()}*
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    badgeWindow.document.write(content);
    badgeWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse-once">
      
      {/* Dynamic Visual Badges block */}
      <div className="lg:col-span-4 space-y-4">
        
        <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 h-16 w-16 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]" />
          
          <div className="w-full text-center border-b border-slate-800 pb-4 mb-5">
            <span className="text-[10px] font-black tracking-widest text-emerald-400 font-mono block">EFILINGG SERVICES</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase">Corporate Identity ID Card</span>
          </div>

          <div className="relative group mb-4 shrink-0">
            <div className="h-20 w-20 rounded-full bg-slate-850 border-2 border-emerald-500 overflow-hidden flex items-center justify-center font-black text-2xl text-emerald-400 font-mono tracking-tighter shadow-inner text-center relative">
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                employee.name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 p-1 bg-emerald-550 hover:bg-emerald-600 rounded-full text-slate-100 cursor-pointer shadow-md transition-all active:scale-90 flex items-center justify-center border border-slate-900 group-hover:scale-105">
              <Plus className="h-3.5 w-3.5 text-white font-bold" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      const emps = getEmployees();
                      const idx = emps.findIndex(em => em.id === employee.id);
                      if (idx !== -1) {
                        emps[idx].photo = base64;
                        saveEmployees(emps);
                        onRefreshData();
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-center space-y-1 mb-5">
            <span className="text-lg font-black block text-slate-100">{employee.name}</span>
            <span className="inline-block text-[10px] uppercase tracking-wide font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-mono">
              {designation}
            </span>
          </div>

          <div className="w-full bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-2 text-xs mb-5 font-semibold text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Associate Code</span>
              <span className="font-mono font-bold text-slate-205">{code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Corporate Email</span>
              <span className="font-bold text-slate-100 truncate max-w-[130px]">{employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Joining Date</span>
              <span className="font-bold text-slate-205">{joiningDate}</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400">
              <span>Security Access ID</span>
              <span className="font-mono">SYS-EFG-A{employee.id.substring(0, 4).toUpperCase()}</span>
            </div>
          </div>

          <div className="w-full flex flex-col items-center border-t border-slate-855 pt-4">
            <div className="px-6 py-2 border border-slate-850 rounded bg-slate-950/70 text-slate-505 font-mono text-[9px] tracking-[4px] font-extrabold select-none">
              *{code.toUpperCase()}*
            </div>
            <span className="text-[8px] text-slate-550 block font-bold font-mono uppercase tracking-wider mt-1.5">
              PROPRIETARY INTERNAL SECURITY SYSTEM
            </span>
          </div>
        </div>

        <button
          onClick={handlePrintBadgeCard}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4" />
          <span>Print Physical PVC Badge Card</span>
        </button>

        <button
          onClick={() => setShowOfferLetter(true)}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Award className="h-4 w-4" />
          <span>My Official Offer Letter</span>
        </button>

      </div>

      {/* Incentives tracker grid */}
      <div className="lg:col-span-8 space-y-6">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm text-slate-905 dark:text-slate-105 uppercase tracking-wide">Dynamic Conversion Bonuses</h3>
              <p className="text-xs text-slate-400">Incentives credited for successfully converted compliance leads</p>
            </div>
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 font-mono font-bold text-xs px-3.5 py-1 rounded-full border border-indigo-100">
              ₹{totalIncentive.toLocaleString()} Earned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">BONUS PER SERVICE CONVERTED</span>
                <span className="text-xl font-black text-slate-850 dark:text-slate-100">₹{incentiveRate.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-150 font-bold">Admin Managed</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">CONVERSIONS COMPLETED</span>
                <span className="text-xl font-black text-indigo-650 dark:text-indigo-400">{convertedLeadsCount}</span>
              </div>
              <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-150 font-bold">Live Tally</span>
            </div>
          </div>

          {/* List of converted clients */}
          <div className="text-xs space-y-2 max-h-48 overflow-y-auto pr-1">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Conversion Logs for the month:</span>
            {assignedLeads.filter(l => l.stage === 'Converted').length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-center text-slate-400 font-bold">No leads shifted to 'Converted' status inside your workspace yet.</div>
            ) : (
              assignedLeads.filter(l => l.stage === 'Converted').map((l) => (
                <div key={l.id} className="p-3 bg-slate-50 dark:bg-slate-954/30 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-slate-850 dark:text-slate-100">{l.customerName}</span>
                    <div className="flex space-x-2 text-[10px] text-slate-400">
                      <span>Service: {l.serviceRequired}</span>
                      <span>•</span>
                      <span>Source: {l.leadSource}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 font-mono">+₹{incentiveRate.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-400 block">ID #{l.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance ledger card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-905 dark:text-slate-100 uppercase tracking-wide">Salary Calculator & Attendance Slip</h3>
            <p className="text-xs text-slate-400">Dynamic system-audited ledger calculations from real-time punches</p>
          </div>

          {/* Period Selector Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3.5 bg-indigo-50/40 dark:bg-slate-950 border border-indigo-100/50 dark:border-slate-805 rounded-2xl text-[11px] font-semibold">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider font-mono">Select Payroll Period:</span>
              <p className="text-[11px] text-slate-400 font-semibold font-sans">Choose the salary billing cycle to view wage ledger slips</p>
            </div>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="p-2 bg-white dark:bg-slate-900 border border-indigo-150 dark:border-slate-805 rounded-xl text-xs font-bold text-indigo-700 dark:text-slate-205 cursor-pointer focus:ring-2 focus:ring-indigo-550"
            >
              {getPayrollMonths().map(m => {
                const r = getCycleDateRangeForMonth(m);
                const formatDateNice = (dateStr: string) => {
                  const parts = dateStr.split('-');
                  if (parts.length !== 3) return dateStr;
                  const day = parseInt(parts[2], 10);
                  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const monthStr = monthsShort[parseInt(parts[1], 10) - 1];
                  const yr = parts[0].slice(2);
                  let sfx = 'th';
                  if (day === 1 || day === 21 || day === 31) sfx = 'st';
                  else if (day === 2 || day === 22) sfx = 'nd';
                  else if (day === 3 || day === 23) sfx = 'rd';
                  return `${day}${sfx} ${monthStr} ${yr}`;
                };
                return (
                  <option key={m} value={m}>
                    Salary Month: {formatDateNice(r.start)} to {formatDateNice(r.end)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Real-time Punch Controls Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-101 dark:border-slate-800 pb-2">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase font-mono">Real-time Session Punch Controls</span>
              <span className="text-[10.5px] font-bold text-slate-500 font-mono flex items-center gap-1">
                <Clock className="h-3 w-3 text-indigo-505" />
                Today: {todayStr}
              </span>
            </div>

            {/* In / Out Status Ticker */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold py-1">
              <div className="flex flex-col p-2 bg-white dark:bg-slate-900 border rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wide font-sans">Checked-In Status</span>
                <span className="font-bold text-slate-805 dark:text-slate-101 mt-0.5">
                  {todayRecord?.checkIn ? (
                    <span className="text-emerald-650 flex items-center gap-1 font-mono">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                      {todayRecord.actualCheckIn || todayRecord.checkIn} <span className="text-[10px] text-slate-450 font-normal font-sans">(compensated: {todayRecord.checkIn})</span>
                    </span>
                  ) : (todayRecord?.status === 'Absent' && todayRecord?.bySystem) || currentTimeStr >= '11:30' ? (
                    <span className="text-rose-605 font-bold">Absent (Check-in closed)</span>
                  ) : (
                     <span className="text-slate-450 italic">Not Checked-In</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col p-2 bg-white dark:bg-slate-900 border rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wide font-sans">Checked-Out Status</span>
                <span className="font-bold text-slate-805 dark:text-slate-101 mt-0.5 font-mono">
                   {todayRecord?.checkOut ? (
                     <span className="text-indigo-600">{todayRecord.checkOut}</span>
                   ) : todayRecord?.status === 'Absent' && todayRecord?.bySystem ? (
                     <span className="text-slate-455 font-sans italic">Locked</span>
                   ) : currentTimeStr >= '18:30' && todayRecord?.checkIn ? (
                     <span className="text-indigo-650 font-bold flex items-center gap-1 font-sans">
                       18:30 <span className="text-[10px] text-slate-450 font-normal font-sans">(auto check-out)</span>
                     </span>
                   ) : todayRecord?.checkIn ? (
                     <span className="text-amber-500 flex items-center gap-1 font-sans">
                       <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse" />
                       Active Duty
                     </span>
                   ) : (
                     <span className="text-slate-455 italic font-sans font-semibold">Awaiting Check-In</span>
                   )}
                </span>
              </div>
            </div>

            {/* Auto Absent Caution Msg */}
            {((todayRecord?.status === 'Absent' && todayRecord?.bySystem) || (currentTimeStr >= '11:30' && !todayRecord?.checkIn)) && (
              <p className="text-[10px] text-rose-550 bg-rose-50/50 dark:bg-rose-950/10 p-2 rounded-lg border border-rose-100/30 text-center font-bold">
                ⚠️ Present punch window (before 11:30 AM) missed. Automatically marked ABSENT by compliance system. Ask your Admin/Team Leader to manually override with reason if you were on duty.
              </p>
            )}

            {/* Row of Three Dynamic Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleInPunch}
                disabled={!!todayRecord?.checkIn || currentTimeStr >= '11:30' || (todayRecord?.status === 'Absent' && todayRecord?.bySystem)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                  todayRecord?.checkIn
                    ? 'bg-slate-100 border border-slate-205 text-slate-400 cursor-not-allowed'
                    : currentTimeStr >= '11:30' || (todayRecord?.status === 'Absent' && todayRecord?.bySystem)
                    ? 'bg-slate-50 border border-slate-200 text-slate-355 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-555 text-white cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span>{currentTimeStr >= '11:30' && !todayRecord?.checkIn ? 'Closed' : 'In (Punch)'}</span>
              </button>

              <button
                type="button"
                onClick={handleOutPunch}
                disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut || currentTimeStr >= '18:30' || (todayRecord?.status === 'Absent' && todayRecord?.bySystem)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1 transition-all ${
                  todayRecord?.checkOut
                    ? 'bg-slate-100 border border-slate-205 text-slate-400 cursor-not-allowed'
                    : (!todayRecord?.checkIn || currentTimeStr >= '18:30' || (todayRecord?.status === 'Absent' && todayRecord?.bySystem))
                    ? 'bg-slate-50 border border-slate-100 text-slate-355 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-555 text-white cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span>{currentTimeStr >= '18:30' && todayRecord?.checkIn && !todayRecord?.checkOut ? 'Closed' : 'Out (Punch)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCalendarView(true)}
                className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Calendar View</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-855 rounded-2xl gap-2 overflow-x-auto font-semibold">
            <div>
              <span className="text-[10.5px] font-bold text-slate-550 block uppercase tracking-wide">Attd Metrics Tally:</span>
              <p className="text-[10px] text-slate-400 font-medium font-sans">For selected cycle</p>
            </div>
            <div className="flex gap-1.5 font-mono text-[10.5px]">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 rounded-lg font-bold">
                {metrics.presentDays} Present
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-400 rounded-lg font-bold">
                {metrics.weekOffDays} Offs
              </span>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-705 dark:bg-amber-950/25 dark:text-amber-400 rounded-lg font-bold">
                {metrics.paidLeaveDays} Leaves
              </span>
              {metrics.absentDays > 0 && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/25 dark:text-rose-455 rounded-lg font-bold">
                  {metrics.absentDays} LOP ({metrics.deductionDays} Ded)
                </span>
              )}
            </div>
          </div>

          {/* Ledger display table */}
          <div className="border border-slate-150 dark:border-slate-855 rounded-2xl overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 p-3 font-bold border-b border-rose-105 uppercase tracking-wider text-[10px] text-slate-505">
              <span>Earnings bracket</span>
              <span className="text-center">Stand-alone Fixed Rate</span>
              <span className="text-right">Pro-Rata Actual Earned</span>
            </div>
            <div className="divide-y divide-slate-150 dark:divide-slate-800 px-3">
              <div className="grid grid-cols-3 py-3">
                <span className="font-bold text-slate-750 dark:text-slate-350">Basic Pay</span>
                <span className="text-center text-slate-600 dark:text-slate-400">₹{basicSalary.toLocaleString()}</span>
                <span className="text-right font-mono font-bold text-slate-900 dark:text-slate-50">₹{dryEarnedFixedBasic.toLocaleString()}</span>
              </div>
              {otherFixedAllowance > 0 && (
                <div className="grid grid-cols-3 py-3">
                  <span className="font-bold text-slate-750 dark:text-slate-350">Fixed Allowances</span>
                  <span className="text-center text-slate-600 dark:text-slate-400">₹{otherFixedAllowance.toLocaleString()}</span>
                  <span className="text-right font-mono font-bold text-slate-900 dark:text-slate-50">₹{dryEarnedOtherFixed.toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-3 py-3">
                <span className="font-bold text-indigo-700">Incentive (Conversion Bonuses)</span>
                <span className="text-center italic text-slate-400 font-mono text-[10px]">({cycleConvertedCount} cases)</span>
                <span className="text-right font-mono font-black text-emerald-600">+₹{totalIncentive.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 py-3 bg-slate-50 dark:bg-slate-955/40 font-bold border-t border-slate-205">
                <span className="text-slate-805 dark:text-slate-50">NET DISBURSED PAYOUT:</span>
                <span className="text-center italic text-slate-400 text-[10px]">Wages: {Math.round(cycleProRataMultiplier * 100)}%</span>
                <span className="text-right font-mono font-black text-indigo-650 dark:text-indigo-400 font-extrabold">₹{netPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handlePrintSlip}
              className="w-full flex items-center justify-center space-x-1.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-500/10 transition-colors"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>Print / Download Official Salary Slip</span>
            </button>
          </div>
        </div>

        {/* Leave application form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-905 dark:text-slate-100 uppercase tracking-wide">Request Time-Off or Planned Leave</h3>
            <p className="text-xs text-slate-400">Apply for sick, casual or privilege leaves directly with compliance</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);

              const startDate = String(formData.get('startDate'));
              const endDate = String(formData.get('endDate'));
              const leaveType = String(formData.get('leaveType')) as any;
              const reason = String(formData.get('reason'));

              if (!startDate || !endDate || !reason.trim()) {
                alert("Please fill in all required fields.");
                return;
              }

              addLeaveRequest({
                employeeId: employee.id,
                employeeName: employee.name,
                startDate,
                endDate,
                leaveType,
                reason
              });

              alert("Leave request submitted successfully for approval!");
              form.reset();
              onRefreshData();
            }}
            className="space-y-3 text-[11px] font-semibold text-slate-600"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-450 block uppercase text-[9px] font-bold">Start Date *</label>
                <input type="date" name="startDate" required className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-805 rounded-xl text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-450 block uppercase text-[9px] font-bold">End Date *</label>
                <input type="date" name="endDate" required className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-805 rounded-xl text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 block uppercase text-[9px] font-bold">Leave Categorization *</label>
              <select name="leaveType" required className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-805 rounded-xl text-xs">
                <option value="casual">Casual Leave</option>
                <option value="sick">Medical / Sick Leave</option>
                <option value="privilege">Privilege / Annual</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 block uppercase text-[9px] font-bold">Justification Reason *</label>
              <textarea name="reason" placeholder="Explain compliance urgency or personal situation..." required rows={2} className="w-full p-2.5 bg-slate-50 dark:bg-slate-905 border border-slate-150 dark:border-slate-805 rounded-xl text-xs resize-none" />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-xl cursor-pointer text-xs transition-all shadow-sm"
            >
              Submit Leave Verification Request
            </button>
          </form>

          {/* List of their existing leaves */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">My Solicitudes Status History:</span>
            {getLeaveRequests().filter(l => l.employeeId === employee.id).length === 0 ? (
              <p className="text-[10px] text-slate-455 italic text-center py-2 font-medium">No leaves requested yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {getLeaveRequests().filter(l => l.employeeId === employee.id).map(l => (
                  <div key={l.id} className="p-2 bg-slate-50 dark:bg-slate-954/40 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between text-[10.5px]">
                    <div>
                      <span className="font-bold text-slate-805 dark:text-slate-200 capitalize">{l.leaveType}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{l.startDate} to {l.endDate}</span>
                    </div>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                      l.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      l.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resignation & Relief requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-905 dark:text-slate-100 uppercase tracking-wide font-sans">Corporate Relief & Exit Filings</h3>
            <p className="text-xs text-slate-400">File a resignation request, review notice durations, or retrieve corporate relieving PDFs once approved.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const dateVal = (form.elements.namedItem('reqExitDate') as HTMLInputElement).value;
              const reasonVal = (form.elements.namedItem('exitReasonText') as HTMLTextAreaElement).value;

              if (!dateVal || !reasonVal.trim()) {
                alert('Please supply all exit fields.');
                return;
              }

              try {
                addResignationRequest({
                  employeeId: employee.id,
                  employeeName: employee.name,
                  reason: reasonVal,
                  requestedExitDate: dateVal
                });
                alert('Your resignation request has been logged and sent to Team Leaders + Master Admins.');
                form.reset();
                const updatedList = getResignationRequests();
                setMyResignations(updatedList.filter(r => r.employeeId === employee.id));
                onRefreshData();
              } catch (err: any) {
                alert(err.message || 'Failed to file resignation request.');
              }
            }}
            className="space-y-3 text-[11px] font-semibold text-slate-600"
          >
            <div className="space-y-1">
              <label className="text-slate-450 block uppercase text-[9px] font-bold">Planned Exit Effective Date *</label>
              <input 
                type="date" 
                name="reqExitDate" 
                required 
                defaultValue={(() => {
                  const thirtyDays = new Date();
                  thirtyDays.setDate(thirtyDays.getDate() + 30);
                  return thirtyDays.toISOString().split('T')[0];
                })()}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-805 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono" 
              />
              <span className="text-[9px] text-slate-400 font-sans block">Standard employee notice cycle defaults to 30 continuous business days.</span>
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 block uppercase text-[9px] font-bold">Explain / Reason for Resignation *</label>
              <textarea 
                name="exitReasonText" 
                placeholder="Detail explanation or core grounds for exit schedule..." 
                required 
                rows={3} 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-905 border border-slate-150 dark:border-slate-805 rounded-xl text-xs text-slate-900 dark:text-slate-100" 
              />
            </div>

            <button
              type="submit"
              disabled={employee.status === 'disabled'}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 font-bold text-white rounded-xl cursor-pointer text-xs transition-all disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:cursor-not-allowed"
            >
              {employee.status === 'disabled' ? 'Offboarding Already Completed' : 'File Resignation request'}
            </button>
          </form>

          {/* List of their filing requests */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">My Exit Requests status:</span>
            {myResignations.length === 0 ? (
              <p className="text-[10px] text-slate-455 italic text-center py-2 font-medium">No active or approved exit requests filed.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {myResignations.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-155 dark:border-slate-850 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[10px]">
                      <span className="text-slate-500">Filings ID: {r.id}</span>
                      <span className={`px-1.5 py-0.5 rounded uppercase font-mono tracking-wide text-[8.5px] font-extrabold ${
                        r.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300' :
                        r.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-305' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                      }`}>{r.status}</span>
                    </div>
                    <div className="text-[11px] leading-relaxed text-slate-655 dark:text-slate-350 italic">
                      Reason: "{r.reason}"
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-900">
                      <span>Target Date: {r.requestedExitDate}</span>
                      {r.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => setActiveExitLetter(r)}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-305 rounded font-bold uppercase tracking-wider text-[8px] cursor-pointer"
                        >
                          letter pdf
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {showOfferLetter && (
        <OfferLetterModal
          employee={employee}
          onClose={() => setShowOfferLetter(false)}
        />
      )}

      {showCalendarView && (
        <AttendanceCalendarModal
          employee={employee}
          selectedPeriod={selectedPeriod}
          onClose={() => setShowCalendarView(false)}
        />
      )}

      {activeExitLetter && (
        <ExitLetterModal
          resignation={activeExitLetter}
          onClose={() => setActiveExitLetter(null)}
        />
      )}

    </div>
  );
}

interface EmployeeFollowUpsViewProps {
  currentUserId: string;
  assignedLeads: Lead[];
  onRefreshData?: () => void;
  onTriggerLeadDetail: (leadId: string) => void;
}

function EmployeeFollowUpsView({
  currentUserId,
  assignedLeads,
  onRefreshData,
  onTriggerLeadDetail
}: EmployeeFollowUpsViewProps) {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<'pending' | 'overdue' | 'completed' | 'all' | 'yesterday_pending' | 'today_pending' | 'yesterday_completed' | 'today_completed' | 'custom_date'>('pending');
  const [customFilterDate, setCustomFilterDate] = useState<string>(getISTDateString());
  
  // Quick resolution states
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [nextStage, setNextStage] = useState<LeadStage | ''>('');

  const today = getISTDateString();
  const yesterday = getRelativeISTDateString(-1);

  const loadLocalData = () => {
    const myLeadsIds = assignedLeads.map(l => l.id);
    const allFollowups = getFollowUps();
    const sorted = allFollowups
      .filter((f) => myLeadsIds.includes(f.leadId))
      .sort((a, b) => b.followUpDate.localeCompare(a.followUpDate));
    setFollowups(sorted);
  };

  useEffect(() => {
    loadLocalData();
  }, [assignedLeads]);

  const handleQuickResolveSubmit = (f: FollowUp) => {
    if (!outcomeNotes.trim()) {
      alert("Please provide call outcome details.");
      return;
    }
    completeFollowUp(
      f.id,
      outcomeNotes,
      nextStage ? nextStage : null,
      currentUserId
    );
    // Reset states
    setCompletingId(null);
    setOutcomeNotes('');
    setNextStage('');
    
    // Refresh
    loadLocalData();
    if (onRefreshData) onRefreshData();
    alert("Follow-up checked off successfully!");
  };

  // Compute metrics dynamically for the current user's leads
  const countYesterdayPending = followups.filter(f => f.status !== 'completed' && f.followUpDate === yesterday).length;
  const countTodayPending = followups.filter(f => f.status !== 'completed' && f.followUpDate === today).length;
  const countYesterdayCompleted = followups.filter(f => f.status === 'completed' && f.followUpDate === yesterday).length;
  const countTodayCompleted = followups.filter(f => f.status === 'completed' && f.followUpDate === today).length;

  const filtered = followups.filter(f => {
    const lead = assignedLeads.find(l => l.id === f.leadId);
    if (!lead) return false;
    
    // Search filter
    const matchesSearch = 
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.mobile.includes(searchQuery);

    if (!matchesSearch) return false;

    // Segment filter
    if (activeSegment === 'pending') {
      return f.status === 'pending' && f.followUpDate >= today;
    }
    if (activeSegment === 'overdue') {
      return f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < today);
    }
    if (activeSegment === 'completed') {
      return f.status === 'completed';
    }
    if (activeSegment === 'yesterday_pending') {
      return f.status !== 'completed' && f.followUpDate === yesterday;
    }
    if (activeSegment === 'today_pending') {
      return f.status !== 'completed' && f.followUpDate === today;
    }
    if (activeSegment === 'yesterday_completed') {
      return f.status === 'completed' && f.followUpDate === yesterday;
    }
    if (activeSegment === 'today_completed') {
      return f.status === 'completed' && f.followUpDate === today;
    }
    if (activeSegment === 'custom_date') {
      return f.followUpDate === customFilterDate;
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-6">
      
      {/* Dynamic Day-Wise Tracker Header Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Yesterday Pending */}
        <div 
          onClick={() => {
            setActiveSegment('yesterday_pending');
            setCompletingId(null);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
            activeSegment === 'yesterday_pending'
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-rose-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Yesterday Pending</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">कल का पेंडिंग Followups</span>
            </div>
            <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{countYesterdayPending}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9.5px]">
            <span className="text-slate-400 font-mono">Date: {yesterday}</span>
            {activeSegment === 'yesterday_pending' && <span className="text-rose-600 font-bold">Active Filter</span>}
          </div>
          <div className="absolute top-0 right-0 h-1.5 w-full bg-rose-500" />
        </div>

        {/* Yesterday Completed */}
        <div 
          onClick={() => {
            setActiveSegment('yesterday_completed');
            setCompletingId(null);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
            activeSegment === 'yesterday_completed'
              ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-sky-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Yesterday Contacted</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">कल किया कांटेक्ट (Done)</span>
            </div>
            <span className="text-2xl font-black font-mono text-sky-650 dark:text-sky-450">{countYesterdayCompleted}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9.5px]">
            <span className="text-slate-400 font-mono">Date: {yesterday}</span>
            {activeSegment === 'yesterday_completed' && <span className="text-sky-650 font-bold">Active Filter</span>}
          </div>
          <div className="absolute top-0 right-0 h-1.5 w-full bg-sky-500" />
        </div>

        {/* Today Pending */}
        <div 
          onClick={() => {
            setActiveSegment('today_pending');
            setCompletingId(null);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
            activeSegment === 'today_pending'
              ? 'bg-amber-50 dark:bg-amber-955/20 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-amber-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Today Pending</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">आज का पेंडिंग Followups</span>
            </div>
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{countTodayPending}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9.5px]">
            <span className="text-slate-400 font-mono">Date: {today}</span>
            {activeSegment === 'today_pending' && <span className="text-amber-600 font-bold">Active Filter</span>}
          </div>
          <div className="absolute top-0 right-0 h-1.5 w-full bg-amber-500" />
        </div>

        {/* Today Completed */}
        <div 
          onClick={() => {
            setActiveSegment('today_completed');
            setCompletingId(null);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
            activeSegment === 'today_completed'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-emerald-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Today Contacted</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">आज किया कांटेक्ट (Done)</span>
            </div>
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-450">{countTodayCompleted}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9.5px]">
            <span className="text-slate-400 font-mono">Date: {today}</span>
            {activeSegment === 'today_completed' && <span className="text-emerald-600 font-bold">Active Filter</span>}
          </div>
          <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-500" />
        </div>

      </div>

      {/* Search & Segments Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
              <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 uppercase tracking-wider">
                Assigned Follow-ups Ledger
              </h3>
            </div>
            <p className="text-xs text-slate-450 leading-relaxed">Streamlined panel to track call schedules, execute followups, and sync with pipeline</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            
            {/* Custom Date Picker filter block */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl px-2.5 py-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono mr-1.5">Pick Date:</span>
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => {
                  setCustomFilterDate(e.target.value);
                  setActiveSegment('custom_date');
                  setCompletingId(null);
                }}
                className="bg-transparent border-none text-xs font-mono font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Segments */}
        <div className="flex items-center space-x-1 border-b border-slate-100 dark:border-slate-850 pb-1.5 overflow-x-auto">
          {[
            { id: 'pending', label: '📆 Upcoming Pendings', count: followups.filter(f => f.status === 'pending' && f.followUpDate >= today).length },
            { id: 'overdue', label: '⚠️ Overdues', count: followups.filter(f => f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < today)).length, isAlert: true },
            { id: 'completed', label: '✅ Logged / Completed', count: followups.filter(f => f.status === 'completed').length },
            { id: 'all', label: '📁 All Histories', count: followups.length },
            { 
              id: 'custom_date', 
              label: `📅 Date: ${customFilterDate === today ? 'Today' : customFilterDate === yesterday ? 'Yesterday' : customFilterDate}`, 
              count: followups.filter(f => f.followUpDate === customFilterDate).length 
            }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSegment(tab.id as any);
                setCompletingId(null);
              }}
              className={`px-3 py-2 text-xs rounded-lg font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                activeSegment === tab.id
                  ? tab.isAlert 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-200/50'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200/50'
                  : 'hover:bg-slate-50 text-slate-500 dark:hover:bg-slate-805 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] py-0.5 px-2 rounded-full font-mono ${
                activeSegment === tab.id
                  ? tab.isAlert ? 'bg-rose-100 text-rose-700 dark:bg-rose-900' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(f => {
            const lead = assignedLeads.find(l => l.id === f.leadId);
            if (!lead) return null;
            const isOverdue = f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < today);
            
            return (
              <div 
                key={f.id} 
                className={`p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs transition-all flex flex-col justify-between ${
                  isOverdue 
                    ? 'border-rose-100 dark:border-rose-950/40 bg-gradient-to-br from-white to-rose-50/10' 
                    : f.status === 'completed'
                      ? 'border-emerald-50 dark:border-emerald-950/20 opacity-85'
                      : 'border-slate-100 dark:border-slate-850 hover:border-slate-200'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9.5px] font-black text-slate-400 font-mono block uppercase tracking-wider">{lead.id} • {lead.serviceRequired}</span>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-1.5">
                        <span>{lead.customerName}</span>
                        {lead.businessName && (
                          <span className="text-xs font-semibold text-slate-450 dark:text-slate-400 font-sans">
                            ({lead.businessName})
                          </span>
                        )}
                      </h4>
                    </div>
                    
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold rounded-lg font-mono ${
                      isOverdue 
                        ? 'bg-rose-50 text-[#e11d48] dark:bg-rose-950/20 dark:text-rose-455 animate-pulse' 
                        : f.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-455'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-455'
                    }`}>
                      {isOverdue ? 'OVERDUE CALL' : f.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 text-[10.5px]">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-semibold block">Scheduled Date</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1 text-indigo-505 shrink-0" />
                        <span>{f.followUpDate}</span>
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-semibold block">Scheduled Time</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 text-amber-500 shrink-0" />
                        <span>{f.followUpTime || '12:00'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">Follow-up Goal Notes:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 font-medium">
                      {f.remarks || 'No notes defined for this follow-up goal.'}
                    </p>
                  </div>

                  {f.status === 'completed' && f.customerResponse && (
                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        <span>Call Outcome Recorded:</span>
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-350 italic font-medium leading-normal">
                        {f.customerResponse}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <a 
                      href={`tel:${lead.mobile}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-indigo-505" />
                      <span> {lead.mobile}</span>
                    </a>
                    
                    <button
                      onClick={() => onTriggerLeadDetail(lead.id)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg cursor-pointer transition-all"
                      title="Open full Lead details"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  </div>

                  {f.status !== 'completed' && completingId !== f.id && (
                    <button
                      onClick={() => setCompletingId(f.id)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-555 text-white text-[10.5px] font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                    >
                      Complete Call & Log
                    </button>
                  )}
                </div>

                {/* Inline checklist logging panel */}
                {completingId === f.id && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickResolveSubmit(f);
                    }}
                    className="mt-4 pt-4 border-t border-dashed border-indigo-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/5 p-3.5 rounded-2xl text-[11px] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] text-indigo-750 font-mono">🔒 Call Outcome ledger logging</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setCompletingId(null);
                          setOutcomeNotes('');
                          setNextStage('');
                        }}
                        className="text-slate-400 hover:text-slate-650"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Customer Feedback / Conversation Notes *</label>
                      <textarea
                        required
                        placeholder="Add call notes, client interest, next pricing requested, callback goals..."
                        value={outcomeNotes}
                        onChange={(e) => setOutcomeNotes(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Update Pipeline Stage (Optional)</label>
                      <select
                        value={nextStage}
                        onChange={(e) => setNextStage(e.target.value as LeadStage)}
                        className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Retain Standard {lead.stage} --</option>
                        {LEAD_STAGES.map((stg) => (
                          <option key={stg} value={stg}>{stg}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-555 text-white font-bold rounded-lg cursor-pointer text-[10.5px] tracking-wide transition-all"
                    >
                      Publish Call Log & Update Lead
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-2">
          <Calendar className="mx-auto h-8 w-8 text-slate-300" />
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">All Clear! No Followups Pending</h4>
          <p className="text-[10px] text-slate-450 max-w-sm mx-auto">There are no followups recorded matching this segment. Excellent task synchronization!</p>
        </div>
      )}

    </div>
  );
}

function AttendanceCalendarModal({
  employee,
  selectedPeriod,
  onClose
}: {
  employee: Employee;
  selectedPeriod: string;
  onClose: () => void;
}) {
  const attendances = getAttendances();
  const todayStr = getISTDateString();
  const joiningDate = employee.dateOfJoining || employee.joinedDate || '';

  const cycleRange = getCycleDateRangeForMonth(selectedPeriod);
  const cycleDates = getCycleDateRangeForMonth(selectedPeriod) 
    ? (() => {
        const daysList: string[] = [];
        let curr = new Date(cycleRange.start);
        const end = new Date(cycleRange.end);
        while (curr <= end) {
          const yr = curr.getFullYear();
          const mo = String(curr.getMonth() + 1).padStart(2, '0');
          const dy = String(curr.getDate()).padStart(2, '0');
          daysList.push(`${yr}-${mo}-${dy}`);
          curr.setDate(curr.getDate() + 1);
        }
        return daysList;
      })()
    : [];

  // Helper to determine status for each date
  const getDateStatusDetails = (dateStr: string) => {
    // 1. Direct record
    const record = attendances.find(r => r.employeeId === employee.id && r.date === dateStr);
    if (record) {
      return {
        status: record.status, 
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        actualCheckIn: record.actualCheckIn,
        deductSalary: record.deductSalary,
        manualOverride: !!record.modifiedBy,
        overrideReason: record.reasonForChange,
        bySystem: record.bySystem,
        reason: record.bySystem ? 'Closed automatically by system' : record.modifiedBy ? `Overridden: ${record.reasonForChange || ''}` : 'Punched via Client Terminal'
      };
    }

    // 2. Week Off (Default standard weekend: Sunday)
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(yr, m, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday
      if (dayOfWeek === 0) {
        return { status: 'Week Off' as const, reason: 'Sunday Routine Week Off' };
      }
    }

    // 3. Approved leave request
    const leaves = getLeaveRequests().filter(l => l.employeeId === employee.id && l.status === 'approved');
    const leaveReq = leaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
    if (leaveReq) {
      const isPaid = leaveReq.leaveType !== 'unpaid';
      return {
        status: isPaid ? ('Paid Leave' as const) : ('Absent' as const),
        isPaid,
        reason: `Approved Leave (${leaveReq.leaveType}): ${leaveReq.reason || ''}`
      };
    }

    // 4. Default past/current/future
    if (dateStr < todayStr) {
      if (joiningDate && dateStr < joiningDate) {
        return { status: 'Inactive' as const, reason: 'Prior to Joining' };
      }
      return { status: 'Absent' as const, reason: 'Unmarked LOP Absence' };
    } else if (dateStr === todayStr) {
      return { status: 'Pending' as const, reason: 'Duty Session Status' };
    } else {
      return { status: 'Future' as const, reason: 'Upcoming Calendar Date' };
    }
  };

  // Nice formatter
  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { dayNum: 1, monthStr: '', dayName: '' };
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = months[parseInt(parts[1], 10) - 1];
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, day);
    const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = daysShort[dateObj.getDay()];
    return { dayNum: day, monthStr, dayName };
  };

  const handlePrintCalendar = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const metrics = getAttendanceMetricsForCycle(employee.id, selectedPeriod);
    
    let daysHtml = '';
    cycleDates.forEach(dateStr => {
      const details = getDateStatusDetails(dateStr);
      const parts = dateStr.split('-');
      const dayNum = parts[2];
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(dayNum, 10));
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];

      let statusColor = "color: #475569;";
      if (details.status === 'Present') statusColor = "color: #10b981; font-weight: bold;";
      else if (details.status === 'Absent') statusColor = "color: #ef4444; font-weight: bold;";
      else if (details.status === 'Paid Leave') statusColor = "color: #f59e0b; font-weight: bold;";
      else if (details.status === 'Week Off') statusColor = "color: #3b82f6;";

      daysHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${dateStr} (${dayName})</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; ${statusColor}">${details.status}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${details.checkIn || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${details.checkOut || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b;">${details.reason || '-'}</td>
        </tr>
      `;
    });

    const content = `
      <html>
        <head>
          <title>${employee.name} - Attendance Statement</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a; }
            .grid-meta { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px; }
            .meta-item { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .summary-box { background: #f1f5f9; padding: 15px; border-radius: 10px; font-weight: bold; font-size: 14px; margin-bottom: 25px; border-left: 5px solid #4f46e5; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; background: #0f172a; color: white; padding: 12px; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; }
            .sig-area { display: flex; justify-content: space-between; margin-top: 60px; font-weight: bold; font-size: 13px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="title">Personal Attendance Register Document</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Compliance Registry System Document • ${selectedPeriod}</div>
          </div>
          
          <div class="grid-meta">
            <div class="meta-item">
              <strong>Employee Name:</strong> <span style="text-transform: uppercase; font-weight: bold;">${employee.name}</span><br>
              <strong>Employee Code:</strong> ${employee.employeeCode || 'EFG-REC-001'}<br>
              <strong>Designation:</strong> ${employee.designation || 'Filing Specialist'}<br>
              <strong>Date of Joining:</strong> ${joiningDate || '2026-06-01'}
            </div>
            <div class="meta-item">
              <strong>Calculated Cycle Period:</strong> <span style="font-family: monospace;">${cycleRange.start}</span> to <span style="font-family: monospace;">${cycleRange.end}</span><br>
              <strong>Verified Status:</strong> COMPLIANT_IST_METRIC<br>
              <strong>Registered Email:</strong> ${employee.email}
            </div>
          </div>

          <div class="summary-box">
            TALLY METRIC SUMMARY FOR CYCLE: 
            Present: <span style="color: #10b981;">${metrics.presentDays} Days</span> | 
            Absent (LOP): <span style="color: #ef4444;">${metrics.absentDays} Days</span> | 
            Paid Leaves: <span style="color: #f59e0b;">${metrics.paidLeaveDays} Days</span> | 
            Week Offs: <span style="color: #3b82f6;">${metrics.weekOffDays} Days</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date / Day</th>
                <th>Status</th>
                <th>In Punch</th>
                <th>Out Punch</th>
                <th>Remarks / Validation Details</th>
              </tr>
            </thead>
            <tbody>
              ${daysHtml}
            </tbody>
          </table>

          <div class="sig-area">
            <div>
              <p style="margin-bottom: 50px; font-style: italic;">Verified by Associate Employee:</p>
              <div style="border-top: 1px solid #1e293b; width: 220px; padding-top: 6px;">${employee.name} (Digital Sign-off)</div>
            </div>
            <div style="text-align: right;">
              <p style="margin-bottom: 50px; font-style: italic;">Authorized Stamp:</p>
              <div style="border-top: 1px solid #1e293b; width: 220px; padding-top: 6px; display: inline-block;">General HR Director (EFILINGG)</div>
            </div>
          </div>

          <div class="footer">
            Generated securely via Associate Login Terminal. Digital audit trail is active. Access Logged: employee session @ IST.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto w-full">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-150 dark:border-slate-800 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider font-mono">Employee Attendance Directory</span>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{employee.name}'s Attendance History</h2>
            <p className="text-xs text-slate-405">Day-by-day punch breakdown for cycle period: <strong className="text-indigo-600 font-mono">{cycleRange.start} to {cycleRange.end}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCalendar}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer text-xs"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              <span>Print/Download PDF</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-wrap gap-2.5 items-center text-[10.5px] font-bold">
          <span className="text-slate-400 uppercase tracking-wider text-[9px] font-mono shrink-0">Color Legend:</span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-300">Week Off</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-300">Paid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-orange-400" />
            <span className="text-slate-600 dark:text-slate-300">Unpaid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-300">LOP Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-slate-300 dark:bg-slate-700" />
            <span className="text-slate-600 dark:text-slate-300">Future / Inactive</span>
          </div>
        </div>

        {/* Calendar Grid display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {cycleDates.map(dateStr => {
            const d = getDateStatusDetails(dateStr);
            const lbl = formatDateLabel(dateStr);
            
            let cardBg = "bg-slate-50 dark:bg-slate-950 border-slate-205";
            let tagColor = "bg-slate-100 text-slate-500";
            
            if (d.status === 'Present') {
              cardBg = "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900";
              tagColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-905 dark:text-emerald-305";
            } else if (d.status === 'Week Off') {
              cardBg = "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-900";
              tagColor = "bg-blue-105 text-blue-800 dark:bg-blue-905 dark:text-blue-305";
            } else if (d.status === 'Paid Leave') {
              cardBg = "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900";
              tagColor = "bg-amber-100 text-amber-800 dark:bg-amber-905 dark:text-amber-305";
            } else if (d.status === 'Absent') {
              cardBg = "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900";
              tagColor = "bg-rose-100 text-rose-800 dark:bg-rose-905 dark:text-rose-300";
            } else if (d.status === 'Future') {
              cardBg = "bg-white dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-60";
              tagColor = "bg-slate-100 text-slate-400";
            }

            return (
              <div 
                key={dateStr}
                className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 h-26 text-[11px] font-semibold transition-all hover:shadow-xs group hover:scale-[1.02] ${cardBg}`}
              >
                {/* Date header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[9.5px] text-slate-400 block">{lbl.dayName}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">{lbl.dayNum}</span>
                  </div>
                  <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded tracking-wide ${tagColor}`}>
                    {d.status}
                  </span>
                </div>

                {/* Body details / punch times */}
                <div className="space-y-0.5 text-[8.5px] font-mono border-t border-slate-100 dark:border-slate-800/40 pt-1.5 leading-none">
                  {d.status === 'Present' ? (
                    <>
                      <div className="text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                        <span>In:</span>
                        <span className="font-bold">{d.checkIn}</span>
                      </div>
                      <div className="text-slate-450 flex items-center justify-between">
                        <span>Out:</span>
                        <span className="font-bold">{d.checkOut || 'Active'}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 font-sans leading-tight block truncate group-hover:whitespace-normal group-hover:overflow-visible text-[8px] transition-all">
                      {d.reason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info banner */}
        <div className="p-3.5 bg-indigo-50/30 border border-indigo-100/40 rounded-xl text-indigo-750 dark:text-indigo-400 text-[11px] font-semibold flex items-start gap-2">
          <span>ℹ️</span>
          <p className="leading-relaxed">
            Attendance history is compiled and audited automatically inside workspace guidelines. Weekly Offs (Sundays) do not incur salary compensation deductions. Handled by real-time timezone <strong className="font-mono text-indigo-700">Asia/Kolkata (IST)</strong>.
          </p>
        </div>

      </div>
    </div>
  );
}
