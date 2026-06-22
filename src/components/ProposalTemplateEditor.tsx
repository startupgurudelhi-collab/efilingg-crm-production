/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getProposalTemplate, saveProposalTemplate } from '../lib/db';
import { ProposalTemplate } from '../types';
import { 
  Sliders, 
  Save, 
  Eye, 
  Building2, 
  Heart, 
  FileCheck, 
  Plus, 
  Trash2, 
  Info,
  Layers,
  FileText
} from 'lucide-react';

interface ProposalTemplateEditorProps {
  currentUserId: string;
  onRefreshData?: () => void;
}

export default function ProposalTemplateEditor({ currentUserId, onRefreshData }: ProposalTemplateEditorProps) {
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [activeSegment, setActiveSegment] = useState<'branding' | 'value' | 'workflow' | 'footer'>('branding');
  const [alert, setAlert] = useState<{ type: 'success' | 'err'; message: string } | null>(null);

  useEffect(() => {
    setTemplate(getProposalTemplate());
  }, []);

  const triggerAlert = (type: 'success' | 'err', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 400);
  };

  if (!template) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium font-sans">
        Loading Master Template configurations...
      </div>
    );
  }

  // Branding handler
  const handleUpdateField = (key: keyof ProposalTemplate, value: any) => {
    setTemplate({
      ...template,
      [key]: value
    });
  };

  // Testimonials, Stats, Workflow indices updater helpers
  const handleUpdateNestedStat = (idx: number, field: 'value' | 'label', val: string) => {
    const updatedStats = [...template.experienceStats];
    updatedStats[idx] = { ...updatedStats[idx], [field]: val };
    handleUpdateField('experienceStats', updatedStats);
  };

  const handleUpdateFeature = (idx: number, field: 'title' | 'desc', val: string) => {
    const updatedFeatures = [...template.whyChooseFeatures];
    updatedFeatures[idx] = { ...updatedFeatures[idx], [field]: val };
    handleUpdateField('whyChooseFeatures', updatedFeatures);
  };

  const handleUpdateTestimonial = (idx: number, field: 'name' | 'company' | 'text', val: string) => {
    const updatedReviews = [...template.testimonials];
    updatedReviews[idx] = { ...updatedReviews[idx], [field]: val };
    handleUpdateField('testimonials', updatedReviews);
  };

  const handleUpdateStage = (idx: number, field: 'title' | 'desc', val: string) => {
    const updatedStages = [...template.processFlowStages];
    updatedStages[idx] = { ...updatedStages[idx], [field]: val };
    handleUpdateField('processFlowStages', updatedStages);
  };

  // T&C helpers
  const handleUpdateTerm = (idx: number, val: string) => {
    const updatedTerms = [...template.termsAndConditions];
    updatedTerms[idx] = val;
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  const handleAddTermItem = () => {
    const updatedTerms = [...template.termsAndConditions, "New custom compliance engagement condition term."];
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  const handleRemoveTermItem = (idx: number) => {
    const updatedTerms = template.termsAndConditions.filter((_, i) => i !== idx);
    handleUpdateField('termsAndConditions', updatedTerms);
  };

  // Save changes
  const handleSave = () => {
    saveProposalTemplate(template, currentUserId);
    triggerAlert('success', 'Master Proposal Template updated! All live corporate proposal sheets will draw from these custom layouts.');
    if (onRefreshData) {
      onRefreshData();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-850 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Header and Sync indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-420 flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 dark:text-slate-100">Proposal Template Customizer</h3>
              <p className="text-xs text-slate-400">Design cover logos, company profiles, workflows, and global legal policies</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          id="btn-save-template"
          className="flex items-center justify-center space-x-2 py-2.5 px-6 bg-violet-650 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95"
        >
          <Save className="h-4.5 w-4.5" />
          <span>Save Master Design</span>
        </button>
      </div>

      {/* Save Success prompt */}
      {alert && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <Info className="h-4.5 w-4.5 shrink-0" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Tabs segment selection */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveSegment('branding')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSegment === 'branding' 
              ? 'border-violet-650 text-violet-650 dark:border-violet-500 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-855 hover:border-slate-205'
          }`}
        >
          1. Branding & About Us
        </button>
        <button
          onClick={() => setActiveSegment('value')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSegment === 'value' 
              ? 'border-violet-650 text-violet-650 dark:border-violet-500 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-855 hover:border-slate-205'
          }`}
        >
          2. Value Pillars & Reviews
        </button>
        <button
          onClick={() => setActiveSegment('workflow')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSegment === 'workflow' 
              ? 'border-violet-650 text-violet-650 dark:border-violet-500 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-855 hover:border-slate-205'
          }`}
        >
          3. Process Flow & Legal T&Cs
        </button>
        <button
          onClick={() => setActiveSegment('footer')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSegment === 'footer' 
              ? 'border-violet-650 text-violet-650 dark:border-violet-500 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-855 hover:border-slate-205'
          }`}
        >
          4. Contact Coordination Info
        </button>
      </div>

      {/* Section segments panels */}
      <div className="space-y-6 pt-2 text-xs">
        
        {/* SEGMENT 1: BRANDING & PROFILE */}
        {activeSegment === 'branding' && (
          <div className="space-y-5">
            
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Branding Company Name</label>
                <input
                  type="text"
                  value={template.companyName}
                  onChange={(e) => handleUpdateField('companyName', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-505 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Slogan / Tagline</label>
                <input
                  type="text"
                  value={template.tagline}
                  onChange={(e) => handleUpdateField('tagline', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-505 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Logo Shield Initials Text (Max 3 chars)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={template.logoText}
                  onChange={(e) => handleUpdateField('logoText', e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-550 font-mono font-bold"
                />
              </div>

            </div>

            {/* About text blocks */}
            <div className="space-y-3 p-5 border border-slate-150/60 dark:border-slate-850 rounded-2xl">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Chapter 1: About Corporate Profile</span>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">About Section Heading Title</label>
                <input
                  type="text"
                  value={template.aboutHeading}
                  onChange={(e) => handleUpdateField('aboutHeading', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">About Us Paragraph Body Paragraph</label>
                <textarea
                  rows={4}
                  value={template.aboutText}
                  onChange={(e) => handleUpdateField('aboutText', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl leading-relaxed font-sans focus:outline-none"
                />
              </div>
            </div>

            {/* Experience statistics values counter */}
            <div className="space-y-3 p-5 border border-slate-150/60 dark:border-slate-850 rounded-2xl">
              <div>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Corporate Scale Metrics (4 items display)</span>
                <p className="text-[10px] text-slate-450 mt-0.5">Stats showcased in the Chapter 1 metrics grid.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {template.experienceStats.map((stat, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150/50 dark:border-slate-850 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Value (e.g. 10K+)</label>
                      <input
                        type="text"
                        value={stat.value}
                        onChange={(e) => handleUpdateNestedStat(idx, 'value', e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-black font-mono text-sm text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Label</label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => handleUpdateNestedStat(idx, 'label', e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-[10px] text-slate-600 dark:text-slate-300 font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* SEGMENT 2: VALUE PILLARS & REVIEWS */}
        {activeSegment === 'value' && (
          <div className="space-y-6">
            
            {/* Why choose us features */}
            <div className="space-y-4 p-5 border border-slate-155 dark:border-slate-850 rounded-2xl">
              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Page 2: Value Pillars & Feature Offerings</span>
                <input
                  type="text"
                  value={template.whyChooseHeading}
                  onChange={(e) => handleUpdateField('whyChooseHeading', e.target.value)}
                  className="w-full max-w-md p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl font-bold text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.whyChooseFeatures.map((feat, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 space-y-2">
                    <span className="text-[10px] font-mono uppercase bg-violet-50 dark:bg-violet-950/20 text-violet-650 font-bold px-2 py-0.5 rounded">Pillar 0{idx+1}</span>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-350 block text-[10px]">Title</label>
                      <input
                        type="text"
                        value={feat.title}
                        onChange={(e) => handleUpdateFeature(idx, 'title', e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-350 block text-[10px]">Brief</label>
                      <input
                        type="text"
                        value={feat.desc}
                        onChange={(e) => handleUpdateFeature(idx, 'desc', e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-550 leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials edit section */}
            <div className="space-y-4 p-5 border border-slate-155 dark:border-slate-850 rounded-2xl">
              <div>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Customer Testimonials & Reviews (2 featured reviews)</span>
                <p className="text-[10px] text-slate-450 mt-0.5">Showcased beautifully inside Chapter 1's feedback slide block.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.testimonials.map((test, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-xl space-y-3.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 font-bold font-mono uppercase">Author</label>
                        <input
                          type="text"
                          value={test.name}
                          onChange={(e) => handleUpdateTestimonial(idx, 'name', e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg font-extrabold text-slate-800 dark:text-slate-150"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 font-bold font-mono uppercase">Company/Industry</label>
                        <input
                          type="text"
                          value={test.company}
                          onChange={(e) => handleUpdateTestimonial(idx, 'company', e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg font-bold text-slate-550"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-450 font-bold font-mono uppercase">Feedback Text</label>
                      <textarea
                        rows={3}
                        value={test.text}
                        onChange={(e) => handleUpdateTestimonial(idx, 'text', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg italic text-slate-650"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* SEGMENT 3: WORKFLOW PROCESS FLOW AND LEGAL TERMS */}
        {activeSegment === 'workflow' && (
          <div className="space-y-6">
            
            {/* Process Flow Stages (exactly 5 items) */}
            <div className="space-y-4 p-5 border border-slate-155 dark:border-slate-850 rounded-2xl">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Chapter 3: Engagement Workflow Journey</span>
                  <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/20 text-teal-650 font-mono font-bold text-[9px] rounded">5 Stages Required</span>
                </div>
                <input
                  type="text"
                  value={template.processFlowHeading}
                  onChange={(e) => handleUpdateField('processFlowHeading', e.target.value)}
                  className="w-full max-w-sm mt-1.5 p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-2">
                {template.processFlowStages.map((stg, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col justify-between">
                    <span className="font-mono text-2xl font-black text-slate-300 block mb-1">0{idx+1}</span>
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400">Section Title</label>
                        <input
                          type="text"
                          value={stg.title}
                          onChange={(e) => handleUpdateStage(idx, 'title', e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg font-extrabold text-[10px]"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400">Step Detail</label>
                        <textarea
                          rows={3}
                          value={stg.desc}
                          onChange={(e) => handleUpdateStage(idx, 'desc', e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-[9px] leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms and conditions listed details */}
            <div className="space-y-4 p-5 border border-slate-155 dark:border-slate-850 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Terms & Conditions of Engagement Guidelines</span>
                  <p className="text-[10px] text-slate-450 mt-0.5">Each line translates to a full item on proposal policy layout sheet (Chapter 3 bottom).</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTermItem}
                  className="py-1 px-3 bg-violet-50 hover:bg-violet-100 text-violet-650 font-bold rounded-lg cursor-pointer transition-colors"
                >
                  + Add Policy Line
                </button>
              </div>

              <div className="space-y-2.5">
                {template.termsAndConditions.map((term, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150">
                    <span className="font-mono font-bold text-slate-400 self-center shrink-0 w-4">{idx+1}.</span>
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                      className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTermItem(idx)}
                      className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* SEGMENT 4: FOOTER CONTACT BLOCK COORDINATES */}
        {activeSegment === 'footer' && (
          <div className="space-y-4 p-5 border border-slate-155 dark:border-slate-850 rounded-2xl">
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm block">Proposal Page 5: Address and Contact Footer Blocks</span>
              <p className="text-[10px] text-slate-450 mt-0.5">Adjust support hotline channels, office locations, and online links.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Website Domain Url</label>
                <input
                  type="text"
                  value={template.website}
                  onChange={(e) => handleUpdateField('website', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Support Desk Email</label>
                <input
                  type="email"
                  value={template.supportEmail}
                  onChange={(e) => handleUpdateField('supportEmail', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Hotline Number 1 (Local)</label>
                <input
                  type="text"
                  value={template.supportPhone1}
                  onChange={(e) => handleUpdateField('supportPhone1', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Toll-free Hotline Number 2 (International/Direct)</label>
                <input
                  type="text"
                  value={template.supportPhone2}
                  onChange={(e) => handleUpdateField('supportPhone2', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-350 block">Corporate Office HQ Address Text</label>
                <textarea
                  rows={3}
                  value={template.officeAddress}
                  onChange={(e) => handleUpdateField('officeAddress', e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Manual hint */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl flex items-start space-x-2.5 text-[10px] text-slate-500 leading-relaxed max-w-xl border border-dashed border-slate-200">
        <Sliders className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
        <p>All newly created and existing proposal forms will immediately carry these customized headers, values, body chapters, testimonials, and process schedules after saving. These revisions are secured as the master template configurations.</p>
      </div>

    </div>
  );
}
