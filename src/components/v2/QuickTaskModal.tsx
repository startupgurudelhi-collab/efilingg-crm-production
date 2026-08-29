/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, User, Calendar, Tag, AlertCircle, MessageSquare, Send, ShieldCheck, Zap } from 'lucide-react';
import { addV2Task } from '../../lib/v2_db';
import { getEmployees, getISTDateString, getCurrentSession } from '../../lib/db';
import { formatTaskWhatsAppMessage } from '../../lib/taskWhatsAppNotification';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  defaultCategory?: string;
  defaultClientName?: string;
}

export default function QuickTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  defaultCategory = 'General Operations',
  defaultClientName = ''
}: QuickTaskModalProps) {
  const employees = getEmployees().filter(e => e.status === 'active');
  const todayStr = getISTDateString();
  const currentSession = getCurrentSession();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState(defaultClientName);
  const [assignedToId, setAssignedToId] = useState(employees[0]?.id || '');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | 'Critical'>('High');
  const [dueDate, setDueDate] = useState(todayStr);
  const [category, setCategory] = useState(defaultCategory);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === assignedToId);
  }, [employees, assignedToId]);

  const previewMessage = useMemo(() => {
    return formatTaskWhatsAppMessage({
      assigneeName: selectedEmployee?.name || 'Associate',
      creatorName: currentSession?.name || 'Master Admin',
      taskTitle: title || 'Please prepare statutory compliance task',
      taskDescription: description,
      priority,
      clientName,
    });
  }, [selectedEmployee, currentSession, title, description, priority, clientName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }

    setIsSubmitting(true);

    const assignedName = selectedEmployee ? selectedEmployee.name : 'Unassigned';

    addV2Task({
      title: title.trim(),
      description: description.trim() || `Category: ${category}`,
      assignedTo: assignedToId || 'ALL',
      assignedToName: assignedName,
      createdBy: currentSession?.id || 'EMP-ADMIN',
      createdByName: currentSession?.name || 'Master Admin',
      dueDate: dueDate || todayStr,
      status: 'pending',
      priority: priority.toLowerCase() as any,
      category,
      clientName: clientName.trim() || undefined,
    });

    setIsSubmitting(false);
    onTaskCreated();
    onClose();

    // Reset form
    setTitle('');
    setDescription('');
    setClientName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase font-sans">
                Dispatch Operational Task
              </h3>
              <p className="text-xs text-slate-500">Auto WhatsApp Intimation enabled on assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* WhatsApp Auto-Intimation Banner */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
            <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-bold">Live WhatsApp Intimation: </span>
              <span>
                {selectedEmployee?.mobile ? (
                  <>Will notify <strong>{selectedEmployee.name}</strong> at <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded font-mono">{selectedEmployee.mobile}</code></>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">Selected employee has no mobile number registered in profile</span>
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 cursor-pointer"
          >
            {showWhatsAppPreview ? 'Hide Template' : 'View Template'}
          </button>
        </div>

        {/* WhatsApp Template Preview Drawer */}
        {showWhatsAppPreview && (
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono whitespace-pre-wrap border border-slate-800 shadow-inner">
            <div className="text-[10px] text-emerald-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
              <Send className="h-3 w-3" /> WhatsApp Outbound Template Preview
            </div>
            {previewMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Task Title / Statutory Action *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Please prepare Gst Return / File MCA MGT-7"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Client / Company Name (Optional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. V Client / Apex Enterprises"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Task Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
                <option value="Critical">Critical / Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Assign Staff Member *
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.mobile ? `(${emp.mobile})` : ''} - {emp.designation || emp.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Statutory Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Task Notes & Special Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide client details, portal credentials notes, or internal instructions..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Assigned by: <strong className="text-slate-800 dark:text-slate-200">{currentSession?.name || 'Master Admin'}</strong>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Dispatching...' : 'Dispatch & Notify WhatsApp'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
