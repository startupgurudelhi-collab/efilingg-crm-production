/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, ArrowRightLeft, UserCheck, ShieldCheck, CheckCircle2, 
  AlertTriangle, Building2, Layers, FileText, Send, Sparkles
} from 'lucide-react';
import { getEmployees, getCurrentSession, writeActivityLog, createNotification } from '../../lib/db';
import { transferClientAcrossServices } from '../../lib/v2_db';
import { getEmployeesForServiceCategory } from '../../lib/permissions';

export interface ClientTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    subtitle?: string;
    serviceCategory: string; // 'GST' | 'MCA' | 'ITR' | 'TRUST' | 'DSC' | 'TRADEMARK' | 'OTHER' | string
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
  } | null;
  onSuccess?: () => void;
}

export default function ClientTransferModal({
  isOpen,
  onClose,
  client,
  onSuccess
}: ClientTransferModalProps) {
  if (!isOpen || !client) return null;

  const sessionUser = getCurrentSession();
  
  // Get all active employees who have permission for this client's service category
  const availableEmployees = useMemo(() => {
    return getEmployeesForServiceCategory(client.serviceCategory);
  }, [client.serviceCategory]);

  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(() => {
    const firstOther = availableEmployees.find(e => e.id !== client.assignedEmployeeId);
    return firstOther ? firstOther.id : (availableEmployees[0]?.id || '');
  });

  const [transferReason, setTransferReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickReasons = [
    'Workload Rebalancing & Capacity Optimization',
    'Specialized Compliance / Filing Review',
    'Staff Leave / Temporary Handover',
    'Client Account Manager Reassignment',
    'Departmental Restructuring'
  ];

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId) {
      setErrorMessage('Please select a target employee for this client transfer.');
      return;
    }

    const targetEmp = availableEmployees.find(e => e.id === targetEmployeeId) || getEmployees().find(e => e.id === targetEmployeeId);
    if (!targetEmp) {
      setErrorMessage('Selected employee not found.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const finalReason = transferReason.trim() || 'Workload reallocation and client account transfer';

    const result = transferClientAcrossServices(
      client.serviceCategory,
      client.id,
      targetEmp.id,
      targetEmp.name,
      finalReason,
      sessionUser ? { id: sessionUser.id, name: sessionUser.name } : undefined
    );

    if (result.success) {
      // 1. Log Activity
      writeActivityLog(
        sessionUser?.id || 'SYSTEM',
        sessionUser?.name || 'User',
        sessionUser?.role || 'employee',
        'Client Custody Handover',
        `Transferred client "${client.name}" (${client.serviceCategory}) from ${client.assignedEmployeeName || 'Unassigned'} to ${targetEmp.name}. Reason: ${finalReason}`
      );

      // 2. Add Notification for Target Employee
      createNotification({
        userId: targetEmp.id,
        title: 'New Client Allotted to Your Desk',
        message: `Client "${client.name}" (${client.serviceCategory}) has been transferred to you by ${sessionUser?.name || 'Manager'}. Reason: ${finalReason}`,
        type: 'lead_transferred' as any,
        link: 'ops_dashboard'
      });

      // 3. Success state
      setSuccessMessage(result.message);
      setIsSubmitting(false);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSuccessMessage(null);
      }, 1400);
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                Client Transfer Handover
              </h3>
              <p className="text-[11px] text-indigo-200/80">Reassign client custody & portfolio management to another employee</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {successMessage ? (
            <div className="py-8 text-center space-y-3 animate-fadeIn">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Client Transfer Complete!</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              
              {/* Client Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Client</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase font-mono">
                    {client.serviceCategory}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {client.name}
                  </h4>
                  {client.subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {client.subtitle}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Current Custodian:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                    {client.assignedEmployeeName || 'Unassigned / Open Desk'}
                  </span>
                </div>
              </div>

              {/* Target Employee Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Transfer Client To Employee *
                </label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  <option value="">-- Select Target Employee Desk --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.designation || emp.role} {emp.id === client.assignedEmployeeId ? '(Current Assignee)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Handover Reason / Remarks
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                  placeholder="Enter reason for handover or specific handling instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
                
                {/* Quick Reason Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {quickReasons.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => setTransferReason(qr)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    >
                      + {qr}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !targetEmployeeId}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Transferring...' : 'Confirm Handover'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
