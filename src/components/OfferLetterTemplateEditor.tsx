/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getOfferLetterTemplate, saveOfferLetterTemplate } from '../lib/db';
import { OfferLetterTemplate } from '../types';
import { 
  Building2, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  Info,
  Layers,
  FileText,
  Sliders,
  Sparkles,
  Phone,
  Mail,
  Globe,
  Settings,
  PenTool,
  Award
} from 'lucide-react';
import EFilinggLogo from './EFilinggLogo';

interface OfferLetterTemplateEditorProps {
  currentUserId: string;
  onRefreshData?: () => void;
}

export default function OfferLetterTemplateEditor({ currentUserId, onRefreshData }: OfferLetterTemplateEditorProps) {
  const [template, setTemplate] = useState<OfferLetterTemplate | null>(null);
  const [activeSegment, setActiveSegment] = useState<'branding' | 'paragraphs' | 'terms' | 'signatory'>('branding');
  const [alert, setAlert] = useState<{ type: 'success' | 'err'; message: string } | null>(null);

  useEffect(() => {
    setTemplate(getOfferLetterTemplate());
  }, []);

  const triggerAlert = (type: 'success' | 'err', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  if (!template) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium font-sans">
        Loading Offer Letter Master Template configurations...
      </div>
    );
  }

  const replacePreviewPlaceholders = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\[Candidate Name\]/g, 'Rahul Sharma')
      .replace(/\[Designation\]/g, 'Compliance Associate')
      .replace(/\[Joining Date\]/g, '2026-06-15')
      .replace(/\[Basic Pay\]/g, '₹25,000')
      .replace(/\[Allowances\]/g, '₹5,000')
      .replace(/\[Other Fixed Allowances\]/g, '₹3,000')
      .replace(/\[Incentive\]/g, '₹500')
      .replace(/\[Total Salary\]/g, '₹33,000');
  };

  const handleUpdateField = (key: keyof OfferLetterTemplate, value: any) => {
    setTemplate({
      ...template,
      [key]: value
    });
  };

  const handleUpdateTerm = (idx: number, val: string) => {
    const updatedTerms = [...template.termsAndConditions];
    updatedTerms[idx] = val;
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  const handleAddTermItem = () => {
    const updatedTerms = [...template.termsAndConditions, "New custom employment condition term detail."];
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  const handleRemoveTermItem = (idx: number) => {
    const updatedTerms = template.termsAndConditions.filter((_, i) => i !== idx);
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  const handleSave = () => {
    saveOfferLetterTemplate(template, currentUserId);
    triggerAlert('success', 'Offer Letter Template changes saved successfully!');
    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wide">
              Offer Letter Template Editor
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              Customize company headers, paras, terms, and CEO authentication parameters
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-2xl transition duration-150 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer text-xs"
        >
          <Save className="h-4 w-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {alert && (
        <div className={`p-4 rounded-2xl flex items-center space-x-2 border text-xs font-bold leading-relaxed ${
          alert.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' 
            : 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/20\t'
        }`}>
          <Info className="h-4 w-4 shrink-0" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* TWO PANEL BUILDER & LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* EDIT PANEL (LEFT 5 COLS) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* CONTROL SEGMENTS SELECTION */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl">
            <button
              onClick={() => setActiveSegment('branding')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'branding' ? 'bg-white dark:bg-slate-900 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Header
            </button>
            <button
              onClick={() => setActiveSegment('paragraphs')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'paragraphs' ? 'bg-white dark:bg-slate-900 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Body Text
            </button>
            <button
              onClick={() => setActiveSegment('terms')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'terms' ? 'bg-white dark:bg-slate-900 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Terms
            </button>
            <button
              onClick={() => setActiveSegment('signatory')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'signatory' ? 'bg-white dark:bg-slate-900 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              CEO Info
            </button>
          </div>

          {/* BRANDING HEADER FIELDS */}
          {activeSegment === 'branding' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-350 uppercase">Company Contact details</h3>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Corporate Registered Name</label>
                <input
                  type="text"
                  value={template.companyName}
                  onChange={(e) => handleUpdateField('companyName', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Official Mobile Helpline</label>
                  <input
                    type="text"
                    value={template.contactNumber}
                    onChange={(e) => handleUpdateField('contactNumber', e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Official Email Support</label>
                  <input
                    type="text"
                    value={template.email}
                    onChange={(e) => handleUpdateField('email', e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Corporate Website Address</label>
                <input
                  type="text"
                  value={template.website}
                  onChange={(e) => handleUpdateField('website', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Subject Heading Line</label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => handleUpdateField('subject', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* PARAGRAPHS FIELDS */}
          {activeSegment === 'paragraphs' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-350 uppercase">Offer Letter Body Paragraphs</h3>
              <p className="text-[10px] text-indigo-500 font-semibold leading-relaxed">
                Use variables like <span className="p-0.5 px-1 bg-slate-100 font-mono text-indigo-600 rounded">[Candidate Name]</span>, <span className="p-0.5 px-1 bg-slate-100 font-mono text-indigo-600 rounded">[Designation]</span>, and <span className="p-0.5 px-1 bg-slate-100 font-mono text-indigo-600 rounded">[Joining Date]</span> to dynamically pre-fill each employee's details!
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Salutation Greeting Line</label>
                <input
                  type="text"
                  value={template.salutationLine}
                  onChange={(e) => handleUpdateField('salutationLine', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Paragraph 1 (Offer Position Announcement)</label>
                <textarea
                  rows={3}
                  value={template.bodyParagraph1}
                  onChange={(e) => handleUpdateField('bodyParagraph1', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Paragraph 2 (Joining Date, Office Location)</label>
                <textarea
                  rows={3}
                  value={template.bodyParagraph2}
                  onChange={(e) => handleUpdateField('bodyParagraph2', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Paragraph 3 (Compensation Outline & Policies)</label>
                <textarea
                  rows={4}
                  value={template.bodyParagraph3}
                  onChange={(e) => handleUpdateField('bodyParagraph3', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Paragraph 4 (Executive Work Ethics & Vision)</label>
                <textarea
                  rows={4}
                  value={template.bodyParagraph4}
                  onChange={(e) => handleUpdateField('bodyParagraph4', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Paragraph 5 (Closing, Sign-off Instructions)</label>
                <textarea
                  rows={4}
                  value={template.bodyParagraph5}
                  onChange={(e) => handleUpdateField('bodyParagraph5', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-105 font-medium leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TERMS AND CONDITIONS */}
          {activeSegment === 'terms' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-700 dark:text-slate-350 uppercase">Terms & Conditions of Employment</h3>
                <button
                  onClick={handleAddTermItem}
                  className="flex items-center space-x-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Term</span>
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {template.termsAndConditions.map((term, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex gap-2">
                    <span className="font-mono text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-650 h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <textarea
                        rows={4}
                        value={term}
                        onChange={(e) => handleUpdateTerm(i, e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none text-slate-850 dark:text-slate-200 text-xs font-medium leading-relaxed"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRemoveTermItem(i)}
                          className="flex items-center space-x-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete Term</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CEO SIGNATORY PARAMETERS */}
          {activeSegment === 'signatory' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-350 uppercase">Authorized Signatory & Stamp Parameters</h3>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Closing Heading Text</label>
                <input
                  type="text"
                  value={template.closingHeading}
                  onChange={(e) => handleUpdateField('closingHeading', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Sender / On Behalf Of Statement</label>
                <input
                  type="text"
                  value={template.senderText}
                  onChange={(e) => handleUpdateField('senderText', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">CEO / Authorized Signatory Name</label>
                <input
                  type="text"
                  value={template.signatoryName}
                  onChange={(e) => handleUpdateField('signatoryName', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Signatory Corporate Title</label>
                <input
                  type="text"
                  value={template.signatoryTitle}
                  onChange={(e) => handleUpdateField('signatoryTitle', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="p-4 bg-indigo-55/10 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl space-y-1.5 leading-relaxed">
                <span className="text-[10px] font-extrabold uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Stamp & Signature Attached
                </span>
                <p className="text-[10px] text-slate-500">
                  Nomaan Rizvi's vector cursive digital signature and Efilingg Financial Services circular seal are automatically computed and stamped on the generated PDF and employee portal as requested.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* LATEST DYNAMIC PREVIEW PANEL (RIGHT 7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Interactive Template Live Preview
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase animate-pulse">
              ● Rendering Realtime
            </span>
          </div>

          <div className="bg-slate-100 dark:bg-slate-950 outline outline-4 outline-slate-100/50 rounded-3xl p-1 md:p-6 overflow-hidden max-h-[85vh] overflow-y-auto shadow-inner">
            
            {/* SHEET PAGE 1 */}
            <div className="bg-white text-slate-800 p-8 md:p-12 shadow-md border border-slate-200 mx-auto max-w-[210mm] min-h-[297mm] font-serif flex flex-col justify-between text-[11px] leading-relaxed relative">
              
              {/* STAMP WATERMARK OR LETTERHEAD BOUND */}
              <div>
                {/* Header Letterhead - Corporate Letter Pad Style */}
                <div className="flex flex-row justify-between items-center border-b-2 border-indigo-900 pb-4 mb-2 font-sans">
                  <div className="flex items-center gap-3">
                    <EFilinggLogo size="sm" variant="color" className="scale-110 origin-left" />
                  </div>
                  <div className="text-right space-y-0.5 uppercase tracking-wider text-slate-700">
                    <h1 className="text-[11px] font-black tracking-tight text-indigo-950">
                      {template.companyName}
                    </h1>
                    <p className="text-[7.5px] font-extrabold text-indigo-650 /950 uppercase tracking-normal">
                      CIN: U43299DL2026PTC465499
                    </p>
                    <p className="text-[7px] font-bold text-slate-400 normal-case leading-none">
                      Regd. Off: D-561, Pocket 11, DDA Janta Flats, Jasola, New Delhi 110025, India
                    </p>
                    <div className="flex flex-row items-center justify-end gap-x-2 text-[7.5px] font-bold tracking-normal normal-case pt-0.5 text-slate-500">
                      <span className="flex items-center gap-0.5"><Phone className="h-2 w-2 text-indigo-700" /> {template.contactNumber}</span>
                      <span className="flex items-center gap-0.5"><Mail className="h-2 w-2 text-indigo-700" /> {template.email}</span>
                      <span className="flex items-center gap-0.5"><Globe className="h-2 w-2 text-indigo-700" /> {template.website}</span>
                    </div>
                  </div>
                </div>

                {/* Offer title */}
                <div className="text-center my-6">
                  <h2 className="text-base font-black font-sans uppercase tracking-[3px] text-slate-900 border-b-2 border-slate-900 pb-1.5 inline-block">
                    {template.subject}
                  </h2>
                </div>

                {/* Date and Address placeholders */}
                <div className="space-y-4 my-6 font-sans text-[10px] text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="flex justify-between">
                    <span className="font-bold">Date:</span>
                    <span>{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })}</span>
                  </p>
                  <div>
                    <p className="font-bold text-slate-800">To,</p>
                    <p className="font-bold text-indigo-650">[Candidate Name]</p>
                    <p className="italic text-slate-500">[Candidate Address address fields will render here]</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Subject:</span> Offer of Employment as <span className="font-bold text-indigo-600">[Designation]</span>
                  </div>
                </div>

                {/* Main Body */}
                <div className="space-y-4 text-justify font-sans text-[11px] text-slate-750 font-medium">
                  <p className="font-bold">{replacePreviewPlaceholders(template.salutationLine)}</p>
                  
                  <p>{replacePreviewPlaceholders(template.bodyParagraph1)}</p>
                  
                  <p>{replacePreviewPlaceholders(template.bodyParagraph2)}</p>
                  
                  <p>{replacePreviewPlaceholders(template.bodyParagraph3)}</p>

                  <p>{replacePreviewPlaceholders(template.bodyParagraph4)}</p>

                  <p className="whitespace-pre-line">{replacePreviewPlaceholders(template.bodyParagraph5)}</p>
                </div>

                {/* SALARY SCHEDULE SUB-COMPILATION */}
                <div className="mt-4 p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl font-sans shrink-0">
                  <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-wide border-b border-indigo-100 pb-1.5 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Award className="h-3 w-3 text-indigo-600" /> SCHEDULE A — COMPENSATION STRUCTURE</span>
                    <span className="text-[8.5px] text-slate-400 normal-case font-semibold">All figures in INR (₹)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[9px] font-semibold text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Basic Salary (Base Pay):</span>
                      <span className="font-extrabold text-slate-900">₹25,000 / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Travel & House Rent Allowance:</span>
                      <span className="font-extrabold text-slate-900">₹5,000 / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Other Fixed Special Benefits:</span>
                      <span className="font-extrabold text-slate-900">₹3,000 / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Performance File Incentive:</span>
                      <span className="font-extrabold text-indigo-650">₹500 / Conversion</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-1 font-black text-indigo-950 text-[10px] border-t border-indigo-100/60">
                      <span>Total Gross Salary (Monthly base CTC):</span>
                      <span>₹33,000 / Month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* End of Page 1 Signatures inside template */}
              <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-end font-sans">
                <div>
                  <p className="text-[10px] text-slate-500">{template.closingHeading}</p>
                  <p className="font-bold text-slate-800 text-[10px] mb-8">{template.senderText}</p>
                  
                  {/* SIGNATURE & STAMP INTEGRATED WORK */}
                  <div className="relative h-16 w-48 mb-2">
                    {/* SVG Signature of Nomaan Rizvi */}
                    <div className="absolute left-2 top-0 pointer-events-none z-10 select-none">
                      <svg width="150" height="45" viewBox="0 0 150 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 25C25 10 35 5 45 15C55 25 30 35 60 20C90 5 110 30 130 15C135 12 140 22 145 25" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M25 15C40 20 60 5 70 12" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M50 35C80 32 110 33 135 30" stroke="#1c3d5a" strokeWidth="1" strokeDasharray="3 3"/>
                      </svg>
                      <span className="text-[8px] text-blue-800 font-mono -mt-1 block font-semibold text-center italic">Digitally signed by Nomaan Rizvi</span>
                    </div>

                    {/* Red Corporate seal matching logo and user attachment of Efilingg.com */}
                    <div className="absolute left-24 -top-12 pointer-events-none opacity-90 select-none z-0 scale-90">
                      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Outer stamp rings */}
                        <circle cx="60" cy="60" r="54" stroke="#B91C1C" strokeWidth="2.5" />
                        <circle cx="60" cy="60" r="50" stroke="#B91C1C" strokeWidth="0.8" />
                        <circle cx="60" cy="60" r="38" stroke="#B91C1C" strokeWidth="0.8" />
                        
                        {/* Curved Text Paths */}
                        <path id="stampTextTop" d="M18 60 A42 42 0 0 1 102 60" fill="none" />
                        <path id="stampTextBottom" d="M102 60 A42 42 0 0 1 18 60" fill="none" />
                        
                        {/* Text Top: EFILINGG FINANCIAL SERVICES PVT LTD */}
                        <text fill="#B91C1C" fontSize="5.2" fontWeight="900" fontFamily="'Inter', 'Arial', sans-serif" letterSpacing="0.4">
                          <textPath href="#stampTextTop" startOffset="50%" textAnchor="middle">
                            EFILINGG FINANCIAL SERVICES PVT LTD
                          </textPath>
                        </text>
                        
                        {/* Text Bottom: ★ Delhi ★ */}
                        <text fill="#B91C1C" fontSize="6.5" fontWeight="900" fontFamily="'Inter', 'Arial', sans-serif" letterSpacing="1">
                          <textPath href="#stampTextBottom" startOffset="50%" textAnchor="middle">
                            ★ Delhi ★
                          </textPath>
                        </text>
                        
                        {/* Inner Colored Logo elements as seen on attached stamp image */}
                        {/* 1. Gold Circle with Lowercase 'e' (mini) */}
                        <circle cx="32" cy="51" r="4.5" fill="#E5A93B" />
                        <text x="32" y="54.5" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="9" fill="#FFFFFF">e</text>
                        
                        {/* 2. Brand text (mini): Filin and gg.com */}
                        <text x="38" y="54" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="7.5" fill="#0D1321" letterSpacing="-0.2">Filin</text>
                        <text x="66" y="54" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="7.5" fill="#0D1321" letterSpacing="-0.2">gg.com</text>
                        
                        {/* 3. Mini Golden Vertical Arrow */}
                        <rect x="62.5" y="44" width="1.2" height="10" fill="#E5A93B" rx="0.4" />
                        <path d="M60 45 L63.1 41.5 L66.2 45 Z" fill="#E5A93B" />
                        
                        {/* 4. Mini Golden Sweeping Curve Below */}
                        <path d="M25 57.5 Q60 62 95 57.5 Q60 59.2 25 57.5 Z" fill="#E5A93B" />
                        
                        {/* 5. Under-logo "Compliance Made Easy" mini text */}
                        <text x="60" y="66" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="3.5" fill="#1E293B" letterSpacing="0.1">Compliance Made Easy</text>
                      </svg>
                    </div>
                  </div>

                  <p className="font-bold text-slate-800">{template.signatoryName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{template.signatoryTitle}</p>
                </div>

                <div className="text-right text-[10px] text-slate-400">
                  <span>Page 1 of 2</span>
                </div>
              </div>

            </div>

            {/* SPACER BETWEEN PAGES */}
            <div className="h-6 flex items-center justify-center">
              <span className="w-1/3 border-b-2 border-slate-350 border-dashed" />
              <span className="px-3 bg-slate-100 dark:bg-slate-950 text-[10px] text-slate-400 font-mono">Page Break</span>
              <span className="w-1/3 border-b-2 border-slate-350 border-dashed" />
            </div>

            {/* SHEET PAGE 2 (TERMS) */}
            <div className="bg-white text-slate-800 p-8 md:p-12 shadow-md border border-slate-200 mx-auto max-w-[210mm] min-h-[297mm] font-serif flex flex-col justify-between text-[11px] leading-relaxed">
              
              <div>
                {/* Header letterhead simplified */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-6 font-sans">
                  <span className="text-[9px] font-black text-slate-900 uppercase">{template.companyName}</span>
                  <span className="text-[9px] text-indigo-600 font-bold">TERMS & CONDITIONS OF EMPLOYMENT</span>
                </div>

                {/* Terms list */}
                <div className="space-y-4 text-justify font-sans text-[10.5px] leading-relaxed text-slate-755 font-medium">
                  {template.termsAndConditions.map((term, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="font-extrabold text-[10.5px] text-slate-900 block font-mono">
                        {idx + 1}. {term.includes(':') ? term.split(':')[0] : 'CONDITION ' + (idx + 1)}
                      </span>
                      <p className="pl-4 text-slate-600">
                        {term.includes(':') ? term.split(':').slice(1).join(':').trim() : term}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Employee Signoff Accept block on bottom */}
                <div className="mt-10 p-4 border border-slate-300 rounded-2xl bg-slate-50 font-sans space-y-4 text-[10px]">
                  <p className="font-bold uppercase text-slate-850 border-b border-indigo-100 pb-2">Employee Acceptance Statement</p>
                  <p className="italic text-slate-600">
                    I, <span className="underline font-bold px-2 text-indigo-650">[Candidate Name Placeholder]</span>, have read, understood, and accepted the terms and conditions mentioned in this Offer Letter and agree to abide by the policies of {template.companyName}.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-6 pt-4 text-slate-700">
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold">Employee Signature</p>
                      <p className="text-[9px] text-slate-400">Sign manually</p>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold">Candidate Name</p>
                      <p className="text-[9px] text-slate-400">Rahul Sharma</p>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold">Acceptance Date</p>
                      <p className="text-[9px] text-slate-400">____ / ____ / 2026</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 Footer */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center font-sans">
                <span className="text-[9px] text-slate-400 font-mono">EFILINGG Financial Services Pvt. Ltd. • HR Division</span>
                <span className="text-[9px] text-slate-400 font-mono">Page 2 of 2</span>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
