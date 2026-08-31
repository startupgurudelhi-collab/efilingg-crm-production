/**
 * WhatsApp Template Test Send Modal
 * Dispatches test template message via Meta Cloud API with live parameter mapping
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Sparkles,
  Info,
} from 'lucide-react';
import { WhatsAppTemplate } from '../../lib/whatsapp/templateTypes';

interface TemplateTestSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsAppTemplate | null;
  onSendTest: (toPhone: string, parameters: string[]) => Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export const TemplateTestSendModal: React.FC<TemplateTestSendModalProps> = ({
  isOpen,
  onClose,
  template,
  onSendTest,
}) => {
  const [toPhone, setToPhone] = useState('+919876543210');
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);

  // Initialize parameter values from sampleParameters
  React.useEffect(() => {
    if (template) {
      setParamValues(template.sampleParameters ? [...template.sampleParameters] : []);
      setResult(null);
    }
  }, [template, isOpen]);

  if (!isOpen || !template) return null;

  const detectedParamsCount = template.parameterCount || (template.bodyText.match(/\{\{(\d+)\}\}/g) || []).length;

  const handleParamChange = (idx: number, val: string) => {
    const updated = [...paramValues];
    updated[idx] = val;
    setParamValues(updated);
  };

  const handleQuickRecipient = (phone: string, name: string) => {
    setToPhone(phone);
    if (paramValues.length > 0) {
      const updated = [...paramValues];
      updated[0] = name;
      setParamValues(updated);
    }
  };

  const handleDispatch = async () => {
    if (!toPhone.trim()) return;
    setIsSending(true);
    setResult(null);

    try {
      const res = await onSendTest(toPhone.trim(), paramValues.slice(0, detectedParamsCount));
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Failed to dispatch test message' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Test Send: {template.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatch an official test WhatsApp template message via Meta Cloud API.
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

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Target Phone Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Destination WhatsApp Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={toPhone}
                onChange={(e) => setToPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-[10px] text-slate-400">Quick Test Targets:</span>
              <button
                type="button"
                onClick={() => handleQuickRecipient('+919876543210', 'Master Admin')}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Super Admin (+9198765...)
              </button>
              <button
                type="button"
                onClick={() => handleQuickRecipient('+919123456789', 'Rajesh Sharma')}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Lead Test (+9191234...)
              </button>
            </div>
          </div>

          {/* Template Parameter Mapping */}
          {detectedParamsCount > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Dynamic Parameter Values ({detectedParamsCount})
                </span>
                <span className="text-[10px] text-slate-400">Values replace {`{{1}}`}, {`{{2}}`} in message</span>
              </div>

              {Array.from({ length: detectedParamsCount }).map((_, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold rounded-lg shrink-0">
                    {`{{${idx + 1}}}`}
                  </span>
                  <input
                    type="text"
                    value={paramValues[idx] || ''}
                    onChange={(e) => handleParamChange(idx, e.target.value)}
                    placeholder={`Parameter ${idx + 1} value`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Result Alert */}
          {result && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start space-x-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {result.success ? 'Test Template Dispatched Successfully!' : 'Dispatch Failed'}
                  </div>
                  {result.messageId && (
                    <div className="mt-1 font-mono text-[10px] opacity-80">
                      Meta Message ID (WAMID): {result.messageId}
                    </div>
                  )}
                  {result.error && <div className="mt-1 text-[11px]">{result.error}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDispatch}
            disabled={isSending || !toPhone.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
          >
            {isSending ? (
              <span className="animate-spin mr-1">⏳</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send Test WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
