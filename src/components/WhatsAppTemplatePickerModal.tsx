import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  Phone,
} from 'lucide-react';
import { STANDARD_WHATSAPP_TEMPLATES } from '../lib/block1/whatsappTemplates';
import { WhatsAppTemplateRepository } from '../lib/whatsapp/templateRepository';
import { ConversationV2 } from '../lib/block1/types';

interface WhatsAppTemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationV2;
  currentUserId: string;
  currentUserName: string;
  onTemplateSent: () => void;
}

export default function WhatsAppTemplatePickerModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  currentUserName,
  onTemplateSent,
}: WhatsAppTemplatePickerModalProps) {
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('hello_world');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({
    '1': conversation.customerName || '',
    '2': conversation.serviceCategory || 'Compliance Update',
    '3': 'Active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableTemplates = React.useMemo(() => {
    const fromRepo = WhatsAppTemplateRepository.getApprovedTemplates();
    return fromRepo.length > 0 ? fromRepo : STANDARD_WHATSAPP_TEMPLATES;
  }, []);

  const selectedTemplate = availableTemplates.find((t) => t.name === selectedTemplateName) || availableTemplates[0];

  // Build real-time preview
  const previewTemplateBody = () => {
    if (!selectedTemplate) return 'Select a template.';
    let text = selectedTemplate.bodyText;
    if (templateParams['1']) text = text.replace(/\{\{1\}\}/g, templateParams['1']);
    if (templateParams['2']) text = text.replace(/\{\{2\}\}/g, templateParams['2']);
    if (templateParams['3']) text = text.replace(/\{\{3\}\}/g, templateParams['3']);
    return text;
  };

  const handleSendTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsSubmitting(true);

    try {
      let components: any[] = [];
      if (selectedTemplate && selectedTemplate.parameterCount > 0) {
        const paramsArray = [];
        for (let i = 1; i <= selectedTemplate.parameterCount; i++) {
          const val = templateParams[String(i)] || selectedTemplate.sampleParameters[i - 1] || 'Valued User';
          paramsArray.push({ type: 'text', text: val });
        }
        components = [
          {
            type: 'body',
            parameters: paramsArray,
          },
        ];
      }

      const res = await fetch('/api/v2/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: conversation.contactNumber,
          templateName: selectedTemplateName,
          languageCode: selectedTemplate?.language || 'en_US',
          components,
          conversationId: conversation.id,
          senderId: currentUserId || 'EMP-ADMIN',
          senderName: currentUserName || 'Executive',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to dispatch WhatsApp template.');
        setIsSubmitting(false);
        return;
      }

      setSuccessInfo('WhatsApp template dispatched successfully! Re-engaging customer...');
      setTimeout(() => {
        onTemplateSent();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error sending template:', err);
      setErrorMessage(err.message || 'Network error sending template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>Dispatch Approved WhatsApp Template</span>
              </h2>
              <p className="text-[10px] text-slate-400">
                To: <span className="text-slate-200 font-bold">{conversation.customerName}</span> (+{conversation.contactNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendTemplate} className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="text-[11px] p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Sending a Meta pre-approved template bypasses the 24-hour window restriction and restarts standard two-way customer messaging.
            </span>
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1">
              <Layers className="h-3 w-3 text-emerald-400" />
              <span>Choose Approved Template:</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {availableTemplates.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => setSelectedTemplateName(tmpl.name)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedTemplateName === tmpl.name
                      ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100 font-mono">{tmpl.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{tmpl.bodyText}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters Input */}
          {selectedTemplate && selectedTemplate.parameterCount > 0 && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[10.5px] font-bold text-slate-300">Fill Template Variables:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: selectedTemplate.parameterCount }, (_, i) => {
                  const pIdx = String(i + 1);
                  return (
                    <div key={pIdx}>
                      <label className="text-[9.5px] text-slate-400 block mb-0.5">
                        Variable &#123;&#123;{pIdx}&#125;&#125;
                      </label>
                      <input
                        type="text"
                        placeholder={selectedTemplate.sampleParameters[i] || `Param ${pIdx}`}
                        value={templateParams[pIdx] || ''}
                        onChange={(e) =>
                          setTemplateParams((prev) => ({
                            ...prev,
                            [pIdx]: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WhatsApp Preview Card */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 mb-1">Message Preview:</div>
            <div className="p-3 rounded-xl bg-[#efeae2] border border-slate-300">
              <div className="bg-white rounded-xl rounded-tl-none p-2.5 shadow-xs text-xs text-slate-900">
                <p className="whitespace-pre-wrap leading-relaxed">{previewTemplateBody()}</p>
                <div className="mt-1 flex items-center justify-end text-[8.5px] text-slate-400">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#00a884] hover:bg-[#008f70] transition-all cursor-pointer flex items-center space-x-1.5 shadow-md disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? 'Sending...' : 'Dispatch Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
