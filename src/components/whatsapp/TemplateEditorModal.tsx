/**
 * WhatsApp Template Editor Modal
 * Create, Edit, or Duplicate Meta Cloud API Message Templates
 * Includes Live Smartphone Mockup Preview with dynamic variable resolution
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Smartphone,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Layers,
  Send,
  Save,
  Link,
  Phone,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import {
  WhatsAppTemplate,
  WhatsAppTemplateCategory,
  WhatsAppHeaderType,
  WhatsAppTemplateButton,
} from '../../lib/whatsapp/templateTypes';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: WhatsAppTemplate | null;
  onSave: (templateData: any, submitToMeta: boolean) => Promise<void>;
  currentUser: { id: string; name: string; role: string };
  isSuperAdmin: boolean;
}

const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi_IN', label: 'Hindi (India)' },
  { code: 'es_ES', label: 'Spanish' },
  { code: 'ar_SA', label: 'Arabic' },
  { code: 'fr_FR', label: 'French' },
];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
  currentUser,
  isSuperAdmin,
}) => {
  const isEditing = !!template;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<WhatsAppTemplateCategory>('UTILITY');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<WhatsAppHeaderType>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<WhatsAppTemplateButton[]>([]);
  const [sampleParams, setSampleParams] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset on open
  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setLanguage(template.language || 'en_US');
      setHeaderType(template.headerType || 'NONE');
      setHeaderText(template.headerText || '');
      setHeaderMediaUrl(template.headerMediaUrl || '');
      setBodyText(template.bodyText || '');
      setFooterText(template.footerText || '');
      setButtons(template.buttons ? JSON.parse(JSON.stringify(template.buttons)) : []);
      setSampleParams(template.sampleParameters ? [...template.sampleParameters] : []);
    } else {
      setName('');
      setCategory('UTILITY');
      setLanguage('en_US');
      setHeaderType('NONE');
      setHeaderText('');
      setHeaderMediaUrl('');
      setBodyText('');
      setFooterText('EFilingg Compliance Gateway');
      setButtons([]);
      setSampleParams([]);
    }
    setErrorMsg(null);
  }, [template, isOpen]);

  // Detect variable tokens {{1}}, {{2}}, etc.
  const detectedParams: string[] = React.useMemo(() => {
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueTokens = Array.from(new Set(matches));
    return uniqueTokens.sort((a, b) => {
      const numA = parseInt(a.replace(/[{}]/g, ''), 10);
      const numB = parseInt(b.replace(/[{}]/g, ''), 10);
      return numA - numB;
    });
  }, [bodyText]);

  // Adjust sample parameters size to match detected tokens
  useEffect(() => {
    if (detectedParams.length > sampleParams.length) {
      const newSamples = [...sampleParams];
      for (let i = sampleParams.length; i < detectedParams.length; i++) {
        newSamples.push(`Sample Value ${i + 1}`);
      }
      setSampleParams(newSamples);
    }
  }, [detectedParams.length]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    // Only lowercase alphanumeric and underscores
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setName(sanitized);
  };

  const handleAddButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
    if (buttons.length >= 3) {
      setErrorMsg('Meta permits a maximum of 3 buttons per template.');
      return;
    }
    if (type === 'QUICK_REPLY') {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: `Option ${buttons.length + 1}` }]);
    } else if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Visit Website', url: 'https://efilingg.com' }]);
    } else {
      setButtons([...buttons, { type: 'PHONE_NUMBER', text: 'Call Desk', phoneNumber: '+919876543210' }]);
    }
    setErrorMsg(null);
  };

  const handleRemoveButton = (idx: number) => {
    setButtons(buttons.filter((_, i) => i !== idx));
  };

  const handleButtonChange = (idx: number, field: string, val: string) => {
    const updated = [...buttons];
    updated[idx] = { ...updated[idx], [field]: val };
    setButtons(updated);
  };

  const handleSampleParamChange = (idx: number, val: string) => {
    const updated = [...sampleParams];
    updated[idx] = val;
    setSampleParams(updated);
  };

  const insertVariableToken = () => {
    const nextIndex = detectedParams.length + 1;
    setBodyText((prev) => `${prev} {{${nextIndex}}}`);
  };

  const getResolvedPreviewBody = () => {
    let result = bodyText;
    detectedParams.forEach((token, idx) => {
      const sampleVal = sampleParams[idx] || `[Param ${idx + 1}]`;
      result = result.split(token).join(sampleVal);
    });
    return result;
  };

  const handleSubmit = async (submitToMeta: boolean) => {
    if (!name.trim()) {
      setErrorMsg('Template name is required.');
      return;
    }
    if (!bodyText.trim()) {
      setErrorMsg('Template body text is required.');
      return;
    }

    if (headerType === 'TEXT' && !headerText.trim()) {
      setErrorMsg('Header text is required when Header Type is set to TEXT.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSave(
        {
          id: template?.id,
          name: name.trim(),
          category,
          language,
          headerType,
          headerText: headerType === 'TEXT' ? headerText.trim() : undefined,
          headerMediaUrl: ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerType) ? headerMediaUrl.trim() : undefined,
          bodyText: bodyText.trim(),
          footerText: footerText.trim() || undefined,
          buttons,
          sampleParameters: sampleParams.slice(0, detectedParams.length),
        },
        submitToMeta
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Sparkles className="h-5.5 w-5.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {isEditing ? `Edit Template: ${template?.name}` : 'Create WhatsApp Message Template'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Meta Cloud API
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Design and submit official pre-approved WhatsApp templates for 100% reliable 24h window compliance.
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

        {/* Modal Body - 2 Columns (Form + Phone Mockup) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Template Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. task_assignment_v2"
                  disabled={isEditing && template?.status === 'APPROVED'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="UTILITY">UTILITY (Transactional, Tasks, Filing Updates, Alerts)</option>
                  <option value="MARKETING">MARKETING (Lead Outreach, Promotions, Offers)</option>
                  <option value="AUTHENTICATION">AUTHENTICATION (OTP, Verification Codes)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Utility messages have near-instant approval.</p>
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Language Code <span className="text-rose-500">*</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Header Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Header (Optional)</span>
                </label>
                <span className="text-[10px] text-slate-400">Bold title or media preview</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['NONE', 'TEXT', 'IMAGE', 'DOCUMENT'] as WhatsAppHeaderType[]).map((ht) => (
                  <button
                    key={ht}
                    type="button"
                    onClick={() => setHeaderType(ht)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      headerType === ht
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ht}
                  </button>
                ))}
              </div>

              {headerType === 'TEXT' && (
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Urgent Notification / Task Assignment"
                  maxLength={60}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              )}

              {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerType) && (
                <input
                  type="url"
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  placeholder="https://example.com/sample_media.pdf or sample URL"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* Body Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Body Message Text <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={insertVariableToken}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Variable {`{{${detectedParams.length + 1}}}`}</span>
                </button>
              </div>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={5}
                placeholder="Dear {{1}}, you have a new task assigned: {{2}}. Priority: {{3}}..."
                maxLength={1024}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Use {`{{1}}`}, {`{{2}}`} for dynamic parameters (e.g. client name, task name).</span>
                <span>{bodyText.length} / 1024 characters</span>
              </div>
            </div>

            {/* Sample Parameters for Meta Review */}
            {detectedParams.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-3">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Sample Parameters (Required for Meta Approval)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Meta requires realistic sample values for all variables during compliance review.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {detectedParams.map((token, idx) => (
                    <div key={token} className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold rounded-md">
                        {token}
                      </span>
                      <input
                        type="text"
                        value={sampleParams[idx] || ''}
                        onChange={(e) => handleSampleParamChange(idx, e.target.value)}
                        placeholder={`Sample for ${token}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Footer Text (Optional)
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. EFilingg CRM Operational Task Desk"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Buttons Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Interactive Buttons ({buttons.length}/3)
                </label>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddButton('QUICK_REPLY')}
                    disabled={buttons.length >= 3}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    + Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('URL')}
                    disabled={buttons.length >= 3}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    + URL Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('PHONE_NUMBER')}
                    disabled={buttons.length >= 3}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    + Call Phone
                  </button>
                </div>
              </div>

              {buttons.map((btn, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-2"
                >
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {btn.type === 'QUICK_REPLY' ? 'Reply' : btn.type === 'URL' ? 'URL' : 'Call'}
                  </span>

                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                    placeholder="Button Title (e.g. Acknowledge)"
                    maxLength={25}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-transparent"
                  />

                  {btn.type === 'URL' && (
                    <input
                      type="url"
                      value={btn.url || ''}
                      onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-transparent"
                    />
                  )}

                  {btn.type === 'PHONE_NUMBER' && (
                    <input
                      type="tel"
                      value={btn.phoneNumber || ''}
                      onChange={(e) => handleButtonChange(idx, 'phoneNumber', e.target.value)}
                      placeholder="+91..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-transparent"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveButton(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Mobile Mockup Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span>Live WhatsApp Preview</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Recipient View</span>
            </div>

            {/* Smartphone Chassis */}
            <div className="w-full max-w-[320px] rounded-[36px] border-[6px] border-slate-800 dark:border-slate-700 bg-slate-900 p-2.5 shadow-2xl">
              {/* Speaker & Camera Notch */}
              <div className="h-4 w-28 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                <div className="h-1 w-8 rounded-full bg-slate-700" />
              </div>

              {/* WhatsApp App Screen */}
              <div className="rounded-[24px] bg-[#EFEAE2] dark:bg-[#0B141A] overflow-hidden flex flex-col min-h-[440px] text-slate-900 dark:text-slate-100">
                {/* Chat Top Bar */}
                <div className="bg-[#008069] dark:bg-[#202C33] px-3 py-2.5 flex items-center space-x-2 text-white">
                  <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    E
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">EFilingg CRM Official</div>
                    <div className="text-[9px] text-emerald-100 truncate">Verified Business Account</div>
                  </div>
                </div>

                {/* Chat Body Canvas */}
                <div className="p-3 flex-1 flex flex-col justify-end space-y-2">
                  {/* WhatsApp Message Bubble */}
                  <div className="bg-white dark:bg-[#1F2C34] rounded-2xl rounded-tl-xs p-3 shadow-md max-w-[95%] space-y-2 border border-slate-200/50 dark:border-slate-800">
                    {/* Header preview */}
                    {headerType === 'TEXT' && headerText && (
                      <div className="font-bold text-xs text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                        {headerText}
                      </div>
                    )}
                    {['IMAGE', 'DOCUMENT'].includes(headerType) && (
                      <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                        {headerType === 'IMAGE' ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                      </div>
                    )}

                    {/* Body Text */}
                    <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {getResolvedPreviewBody() || 'Your template message preview will appear here...'}
                    </div>

                    {/* Footer */}
                    {footerText && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                        {footerText}
                      </div>
                    )}

                    {/* Timestamp & double tick */}
                    <div className="flex justify-end items-center space-x-1 text-[9px] text-slate-400">
                      <span>12:00 PM</span>
                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                    </div>
                  </div>

                  {/* Button Pills Preview */}
                  {buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-white/90 dark:bg-[#1F2C34]/90 backdrop-blur-xs rounded-xl p-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800 flex items-center justify-center space-x-1.5"
                    >
                      {btn.type === 'URL' ? (
                        <Link className="h-3 w-3" />
                      ) : btn.type === 'PHONE_NUMBER' ? (
                        <Phone className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      <span>{btn.text || 'Button Action'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save as Draft</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span className="animate-spin mr-1">⏳</span>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Submit to Meta for Approval</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
