/**
 * WhatsApp Template Rejection Viewer Modal
 * Displays Meta rejection reasons and actionable remediation guidance
 */

import React from 'react';
import {
  X,
  AlertTriangle,
  FileEdit,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { WhatsAppTemplate } from '../../lib/whatsapp/templateTypes';

interface TemplateRejectionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate | null;
  onFixAndResubmit: (template: WhatsAppTemplate) => void;
  isSuperAdmin: boolean;
}

export const TemplateRejectionViewerModal: React.FC<TemplateRejectionViewerModalProps> = ({
  isOpen,
  onClose,
  template,
  onFixAndResubmit,
  isSuperAdmin,
}) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/30">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Meta Rejection Reason: {template.name}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                Official Meta WhatsApp Cloud API Review Feedback
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Main Error Box */}
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Exact Meta Graph API Error / Reason:</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900 leading-relaxed">
              {template.metaRejectedReason || 'INCORRECT_CATEGORY: Content violates Meta WhatsApp messaging category rules.'}
            </div>
          </div>

          {/* Actionable Guidance */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              <span>Remediation Advice:</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              {template.metaRejectionGuidance ||
                'Ensure all variable parameters like {{1}} have realistic samples, the category matches the intent (Utility vs. Marketing), and no prohibited policy terms are present.'}
            </p>
          </div>

          {/* Template Body Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Template Content:</span>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
              {template.bodyText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Dismiss
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onFixAndResubmit(template);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <FileEdit className="h-4 w-4" />
              <span>Fix in Editor & Resubmit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
