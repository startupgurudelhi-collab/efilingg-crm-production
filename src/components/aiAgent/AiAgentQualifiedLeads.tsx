/**
 * AI Sales Agent - Module 6: Qualified Leads Management
 * Efilingg CRM
 */

import React, { useState, useEffect } from 'react';
import {
  AiQualifiedLead,
  AiQualifiedLeadStatus,
} from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  PhoneCall,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  MessageSquare,
  History,
  Tag,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

interface AiAgentQualifiedLeadsProps {
  currentUserId?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

export default function AiAgentQualifiedLeads({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  onRefresh,
}: AiAgentQualifiedLeadsProps) {
  const [leads, setLeads] = useState<AiQualifiedLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Detail Modal State
  const [activeLead, setActiveLead] = useState<AiQualifiedLead | null>(null);

  // Status Change Modal State
  const [editingStatusLead, setEditingStatusLead] = useState<AiQualifiedLead | null>(null);
  const [newStatus, setNewStatus] = useState<AiQualifiedLeadStatus>('NEW');
  const [statusNotes, setStatusNotes] = useState('');

  const loadLeads = () => {
    const raw = AiAgentRepository.getQualifiedLeads();
    const sorted = [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLeads(sorted);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatusLead) return;

    AiAgentRepository.updateQualifiedLeadStatus(
      editingStatusLead.id,
      newStatus,
      currentUserName,
      statusNotes.trim()
    );

    setEditingStatusLead(null);
    setStatusNotes('');
    loadLeads();

    // If active detail modal open, sync it
    if (activeLead && activeLead.id === editingStatusLead.id) {
      setActiveLead(AiAgentRepository.getQualifiedLeadById(editingStatusLead.id) || null);
    }

    if (onRefresh) onRefresh();
  };

  const handleDeleteLead = (lead: AiQualifiedLead) => {
    if (confirm(`Are you sure you want to delete lead "${lead.customer_name}"?`)) {
      AiAgentRepository.deleteQualifiedLead(lead.id, currentUserId, currentUserName);
      if (activeLead && activeLead.id === lead.id) setActiveLead(null);
      loadLeads();
      if (onRefresh) onRefresh();
    }
  };

  const getStatusBadge = (status: AiQualifiedLeadStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">NEW</span>;
      case 'CONTACTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">CONTACTED</span>;
      case 'CONVERTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">CONVERTED</span>;
      case 'LOST':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">LOST</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.mobile.includes(searchQuery) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.service_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || l.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span>AI-Qualified Leads Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified customer leads captured automatically via WhatsApp AI Sales Agent forms.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, mobile, email, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">Filter Status:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'LOST'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer ${
                  selectedStatusFilter === status
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No qualified leads found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Lead Name</th>
                  <th className="py-3.5 px-4">Mobile & Email</th>
                  <th className="py-3.5 px-4">Requested Service</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Captured Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Lead Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {lead.customer_name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {lead.conversation_id}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <PhoneCall className="h-3 w-3 text-emerald-500" />
                        <span>+{lead.mobile}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                        {lead.service_name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(lead.status)}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(lead.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setActiveLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="View Full Lead Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingStatusLead(lead);
                          setNewStatus(lead.status);
                          setStatusNotes('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 transition-colors cursor-pointer"
                        title="Change Status"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEAD DETAILS DRAWER / MODAL */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{activeLead.customer_name}</span>
                    {getStatusBadge(activeLead.status)}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Service: {activeLead.service_name} • Ref: {activeLead.conversation_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveLead(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Customer Info Card */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{activeLead.customer_name}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</span>
                  <div className="font-bold font-mono text-slate-900 dark:text-white">+{activeLead.mobile}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{activeLead.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Captured Timestamp</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(activeLead.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Lead Summary */}
              {activeLead.lead_summary && (
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <span>AI Lead Summary</span>
                  </h4>
                  <p className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {activeLead.lead_summary}
                  </p>
                </div>
              )}

              {/* Collected Data Fields */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Tag className="h-3.5 w-3.5 text-teal-500" />
                  <span>Collected Form Data ({Object.keys(activeLead.collected_data || {}).length} Fields)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(activeLead.collected_data || {}).map(([key, val]) => (
                    <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 block">
                        {String(val || 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Status History Timeline</span>
                </h4>

                <div className="space-y-2">
                  {(activeLead.status_history || []).map((hist, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(hist.status)}
                          <span className="font-bold text-slate-700 dark:text-slate-300">{hist.changed_by || 'System'}</span>
                        </div>
                        {hist.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">{hist.notes}</p>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(hist.changed_at).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => {
                  setEditingStatusLead(activeLead);
                  setNewStatus(activeLead.status);
                  setStatusNotes('');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Change Lead Status
              </button>
              <button
                onClick={() => setActiveLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {editingStatusLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Update Status for {editingStatusLead.customer_name}
              </h3>
              <button onClick={() => setEditingStatusLead(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AiQualifiedLeadStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="CONVERTED">CONVERTED</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Change Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spoke with client on phone, agreed to sign proposal..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingStatusLead(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer">
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
