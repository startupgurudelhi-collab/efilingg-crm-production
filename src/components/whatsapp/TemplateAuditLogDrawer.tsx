/**
 * WhatsApp Template Audit Log & Version History Drawer
 * Displays chronological activity log of all template lifecycle events
 */

import React, { useState } from 'react';
import {
  X,
  History,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  RefreshCw,
  Edit,
  Copy,
  Star,
} from 'lucide-react';
import { WhatsAppTemplateAuditLog } from '../../lib/whatsapp/templateTypes';

interface TemplateAuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WhatsAppTemplateAuditLog[];
}

export const TemplateAuditLogDrawer: React.FC<TemplateAuditLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Created
          </span>
        );
      case 'SUBMITTED_TO_META':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Submitted to Meta
          </span>
        );
      case 'UPDATED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            Updated
          </span>
        );
      case 'DELETED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Deleted
          </span>
        );
      case 'SYNCED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            Meta Synced
          </span>
        );
      case 'TEST_SENT':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Test Sent
          </span>
        );
      case 'DUPLICATED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Duplicated
          </span>
        );
      case 'SET_DEFAULT':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300">
            Default Set
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Template Audit Logs & History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enterprise compliance log for all Meta template operations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs by template name, user, or action..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter:</span>
            {['ALL', 'CREATED', 'SUBMITTED_TO_META', 'UPDATED', 'SYNCED', 'TEST_SENT', 'SET_DEFAULT'].map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                  filterAction === act
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {act.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Log Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No audit logs found matching the filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {log.templateName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {log.details}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">
                    By: {log.performedByName} ({log.role})
                  </span>
                  <span className="font-mono">{log.performedBy}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
