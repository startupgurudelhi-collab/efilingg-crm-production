/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Settings, Clock, Bell, AlertTriangle, 
  CheckCircle2, RefreshCw, Key, Laptop, Lock, Unlock, 
  ExternalLink, Plus, Trash2, Check, FileText
} from 'lucide-react';
import { getCurrentSession } from '../../../lib/db';

interface DueDateExtension {
  id: string;
  formType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'IFF';
  period: string;
  originalDueDate: string;
  extendedDueDate: string;
  notificationNo: string;
  stateApplicability: string;
  remarks: string;
}

export default function GSTExtensionLogsSettings() {
  const [activeTab, setActiveTab] = useState<'EXTENSIONS' | 'RULES' | 'REMINDERS' | 'AUDIT_LOGS'>('EXTENSIONS');
  const currentUser = getCurrentSession();

  // Due Date Extensions State
  const [extensions, setExtensions] = useState<DueDateExtension[]>([
    {
      id: 'ext_1',
      formType: 'GSTR-1',
      period: 'July 2026',
      originalDueDate: '2026-08-11',
      extendedDueDate: '2026-08-14',
      notificationNo: 'CBIC Notif 18/2026-CT',
      stateApplicability: 'All India',
      remarks: 'Extended due to GSTN portal technical glitch'
    },
    {
      id: 'ext_2',
      formType: 'GSTR-3B',
      period: 'July 2026',
      originalDueDate: '2026-08-20',
      extendedDueDate: '2026-08-23',
      notificationNo: 'CBIC Notif 19/2026-CT',
      stateApplicability: 'All India (Category A States)',
      remarks: 'Statutory extension approved by GST Council'
    }
  ]);

  // New Extension Form
  const [showAddExtModal, setShowAddExtModal] = useState(false);
  const [newExt, setNewExt] = useState<Partial<DueDateExtension>>({
    formType: 'GSTR-1',
    period: 'August 2026',
    originalDueDate: '2026-09-11',
    extendedDueDate: '2026-09-15',
    notificationNo: 'CBIC Notif /2026-CT',
    stateApplicability: 'All India',
    remarks: 'Extension order'
  });

  // Settings State
  const [settings, setSettings] = useState({
    autoReminderDays: 3,
    enableWhatsAppAlerts: true,
    enableEmailDigest: true,
    lockOldPeriods: false,
    requireArnForMarkingFiled: true,
    restrictEmployeeCredentialView: true
  });

  // Extension Connectivity & Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentUser || currentUser.role === 'employee') return;
      setIsLoadingLogs(true);
      try {
        const res = await fetch(`/api/admin/audit-logs?role=${currentUser.role}`);
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch (err) {
        console.error('Failed fetching audit logs', err);
      } finally {
        setIsLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [currentUser]);

  const handleAddExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExt.period || !newExt.extendedDueDate) return;
    const added: DueDateExtension = {
      id: `ext_${Date.now()}`,
      formType: newExt.formType as any || 'GSTR-1',
      period: newExt.period || 'August 2026',
      originalDueDate: newExt.originalDueDate || '',
      extendedDueDate: newExt.extendedDueDate || '',
      notificationNo: newExt.notificationNo || 'N/A',
      stateApplicability: newExt.stateApplicability || 'All India',
      remarks: newExt.remarks || ''
    };
    setExtensions([added, ...extensions]);
    setShowAddExtModal(false);
  };

  const handleDeleteExtension = (id: string) => {
    setExtensions(extensions.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
            GST Settings, Due Dates & Extension Audit Logs
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Configuration Center
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Statutory due date extensions, compliance rules, reminder automation, and Chrome extension security audit trail.
        </p>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('EXTENSIONS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'EXTENSIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Due Date Extensions
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'RULES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Compliance Rules & Limits
          </button>
          <button
            onClick={() => setActiveTab('REMINDERS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'REMINDERS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Auto Reminder Rules
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Extension & Credential Audit Logs
          </button>
        </div>
      </div>

      {/* 1. DUE DATE EXTENSIONS */}
      {activeTab === 'EXTENSIONS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Statutory Return Due Date Extensions
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure official CBIC / GST Council date extensions for calculation of overdue status
              </p>
            </div>
            <button
              onClick={() => setShowAddExtModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Extension Notification
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pl-2">Form Type</th>
                  <th className="pb-2.5">Period</th>
                  <th className="pb-2.5">Original Due Date</th>
                  <th className="pb-2.5">Extended Due Date</th>
                  <th className="pb-2.5">Notification No.</th>
                  <th className="pb-2.5">Applicability</th>
                  <th className="pb-2.5 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {extensions.map((ext) => (
                  <tr key={ext.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="py-3 pl-2">
                      <span className="font-black text-indigo-600 dark:text-indigo-400">{ext.formType}</span>
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{ext.period}</td>
                    <td className="py-3 font-mono text-slate-500 line-through">{ext.originalDueDate}</td>
                    <td className="py-3 font-mono font-black text-emerald-600">{ext.extendedDueDate}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{ext.notificationNo}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{ext.stateApplicability}</td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => handleDeleteExtension(ext.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. COMPLIANCE RULES & LIMITS */}
      {activeTab === 'RULES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Statutory GST Compliance Rules & Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-600">GSTR-1 Monthly Rules</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                • Standard Due Date: <strong>11th of succeeding month</strong><br />
                • Mandatory for all regular taxpayers not opted in QRMP.<br />
                • Invoices above ₹2.5 Lakh B2C interstate require detailed state-wise declaration.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-600">GSTR-3B Payment Rules</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                • Standard Due Date: <strong>20th of succeeding month</strong><br />
                • Late fee: ₹50/day (₹20/day for NIL returns).<br />
                • Interest on delayed tax payment: 18% p.a. on net cash tax liability.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-black uppercase text-blue-600">QRMP Scheme Parameters</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                • Turnover limit: Aggregate turnover up to <strong>₹5.00 Crores</strong> in preceding financial year.<br />
                • Quarterly GSTR-1 and GSTR-3B due date: 13th and 22nd/24th after quarter end.<br />
                • Optional IFF invoice uploading in Month 1 & Month 2.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-[10px] font-black uppercase text-purple-600">GSTR-9 Annual Audit Threshold</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                • GSTR-9 mandatory for taxpayers with turnover &gt; ₹2.00 Crores.<br />
                • GSTR-9C Self-certified reconciliation mandatory for turnover &gt; ₹5.00 Crores.<br />
                • Due date: 31st December following the end of financial year.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. AUTO REMINDER RULES */}
      {activeTab === 'REMINDERS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Automated Client Reminder Settings
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableWhatsAppAlerts}
                onChange={(e) => setSettings({ ...settings, enableWhatsAppAlerts: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Send WhatsApp reminders to clients with pending returns</div>
                <div className="text-[11px] text-slate-400">Trigger automatic dispatch 3 days before statutory due date</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableEmailDigest}
                onChange={(e) => setSettings({ ...settings, enableEmailDigest: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Daily Employee Filing Digest</div>
                <div className="text-[11px] text-slate-400">Email daily pending return summaries to assigned officers at 09:00 AM</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.restrictEmployeeCredentialView}
                onChange={(e) => setSettings({ ...settings, restrictEmployeeCredentialView: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Require Exchange-Token Audit for Portal Passwords</div>
                <div className="text-[11px] text-slate-400">Log employee identity, timestamp and client ID whenever a portal login is triggered</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Extension Workstation & Credential Exchange Audit Trail
              </h3>
              <p className="text-[11px] text-slate-400">
                Tamper-proof audit logs of all automated GST portal logins and token exchanges
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pl-2">Timestamp</th>
                  <th className="pb-2.5">User / Officer</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Client / Target</th>
                  <th className="pb-2.5 text-right pr-2">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No credential exchange security violations or audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                      <td className="py-2.5 pl-2 font-mono text-[10px] text-slate-500">{log.timestamp || 'Live'}</td>
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{log.user || log.employeeName || 'Officer'}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{log.action || 'GST Portal Auto-Login'}</td>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{log.clientId || 'Client Record'}</td>
                      <td className="py-2.5 text-right pr-2">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-[10px] font-black">
                          AUTHORIZED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Extension Modal */}
      {showAddExtModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddExtension} className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Add Due Date Extension Notification
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Return Form *</label>
              <select
                value={newExt.formType}
                onChange={(e) => setNewExt({ ...newExt, formType: e.target.value as any })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                <option value="GSTR-1">GSTR-1 (Monthly Sales Return)</option>
                <option value="GSTR-3B">GSTR-3B (Monthly Summary & Tax Return)</option>
                <option value="GSTR-9">GSTR-9 (Annual Return)</option>
                <option value="IFF">IFF (Invoice Furnishing Facility)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Filing Period *</label>
              <input
                type="text"
                required
                value={newExt.period}
                onChange={(e) => setNewExt({ ...newExt, period: e.target.value })}
                placeholder="e.g. August 2026"
                className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Original Due Date</label>
                <input
                  type="date"
                  value={newExt.originalDueDate}
                  onChange={(e) => setNewExt({ ...newExt, originalDueDate: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Extended Due Date *</label>
                <input
                  type="date"
                  required
                  value={newExt.extendedDueDate}
                  onChange={(e) => setNewExt({ ...newExt, extendedDueDate: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Notification No.</label>
              <input
                type="text"
                value={newExt.notificationNo}
                onChange={(e) => setNewExt({ ...newExt, notificationNo: e.target.value })}
                placeholder="e.g. CBIC Notif 24/2026-CT"
                className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExtModal(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
              >
                Save Extension
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
