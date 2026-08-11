/**
 * AI Sales Agent - Module 5: Lead Form Builder
 * Efilingg CRM
 */

import React, { useState, useEffect } from 'react';
import {
  AiLeadForm,
  AiLeadFormField,
  AiService,
  AiFormFieldType,
} from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Briefcase,
  Layers,
  X,
  AlertCircle,
  Eye,
  Check,
  Settings,
} from 'lucide-react';

interface AiAgentLeadFormBuilderProps {
  currentUserId?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

export default function AiAgentLeadFormBuilder({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  onRefresh,
}: AiAgentLeadFormBuilderProps) {
  const [services, setServices] = useState<AiService[]>([]);
  const [forms, setForms] = useState<AiLeadForm[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [activeForm, setActiveForm] = useState<AiLeadForm | null>(null);
  const [fields, setFields] = useState<AiLeadFormField[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Field Edit Modal State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<AiLeadFormField | null>(null);

  // Field Form States
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<AiFormFieldType>('Text');
  const [isRequired, setIsRequired] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [optionsInput, setOptionsInput] = useState('');
  const [formError, setFormError] = useState('');

  // Create Form Modal State
  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);
  const [newFormServiceId, setNewFormServiceId] = useState('');
  const [newFormName, setNewFormName] = useState('');

  const loadData = () => {
    const sList = AiAgentRepository.getServices();
    const fList = AiAgentRepository.getLeadForms();
    setServices(sList);
    setForms(fList);

    if (sList.length > 0 && !selectedServiceId) {
      setSelectedServiceId(sList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync selected service form & fields
  useEffect(() => {
    if (selectedServiceId) {
      const matchForm = forms.find((f) => f.service_id === selectedServiceId);
      if (matchForm) {
        setActiveForm(matchForm);
        setFields(AiAgentRepository.getLeadFields(matchForm.id));
      } else {
        setActiveForm(null);
        setFields([]);
      }
    }
  }, [selectedServiceId, forms]);

  // Create New Lead Form for Service
  const handleCreateNewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormServiceId || !newFormName.trim()) {
      alert('Please select a service and provide a form name.');
      return;
    }

    const created = AiAgentRepository.addLeadForm(
      {
        service_id: newFormServiceId,
        form_name: newFormName.trim(),
        active: true,
      },
      currentUserId,
      currentUserName
    );

    setIsNewFormModalOpen(false);
    loadData();
    setSelectedServiceId(newFormServiceId);
    if (onRefresh) onRefresh();
  };

  // Open Field Modal
  const openAddFieldModal = () => {
    if (!activeForm) return;
    setEditingField(null);
    setFieldName('');
    setFieldLabel('');
    setFieldType('Text');
    setIsRequired(true);
    setDisplayOrder(fields.length + 1);
    setOptionsInput('');
    setFormError('');
    setIsFieldModalOpen(true);
  };

  const openEditFieldModal = (field: AiLeadFormField) => {
    setEditingField(field);
    setFieldName(field.field_name);
    setFieldLabel(field.field_label);
    setFieldType(field.field_type);
    setIsRequired(field.required);
    setDisplayOrder(field.display_order);
    setOptionsInput((field.options || []).join(', '));
    setFormError('');
    setIsFieldModalOpen(true);
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;

    if (!fieldLabel.trim()) {
      setFormError('Field label is required.');
      return;
    }

    const generatedName =
      fieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
      fieldLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const optionsList = optionsInput
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (editingField) {
      AiAgentRepository.updateLeadField(
        editingField.id,
        {
          field_name: generatedName,
          field_label: fieldLabel.trim(),
          field_type: fieldType,
          required: isRequired,
          display_order: Number(displayOrder) || 1,
          options: optionsList,
        },
        currentUserId,
        currentUserName
      );
    } else {
      AiAgentRepository.addLeadField(
        {
          form_id: activeForm.id,
          field_name: generatedName,
          field_label: fieldLabel.trim(),
          field_type: fieldType,
          required: isRequired,
          display_order: Number(displayOrder) || fields.length + 1,
          options: optionsList,
        },
        currentUserId,
        currentUserName
      );
    }

    setIsFieldModalOpen(false);
    setFields(AiAgentRepository.getLeadFields(activeForm.id));
    if (onRefresh) onRefresh();
  };

  const handleDeleteField = (field: AiLeadFormField) => {
    if (!activeForm) return;
    if (confirm(`Delete field "${field.field_label}"?`)) {
      AiAgentRepository.deleteLeadField(field.id, currentUserId, currentUserName);
      setFields(AiAgentRepository.getLeadFields(activeForm.id));
      if (onRefresh) onRefresh();
    }
  };

  const handleMoveOrder = (field: AiLeadFormField, direction: 'UP' | 'DOWN') => {
    if (!activeForm) return;
    const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((f) => f.id === field.id);
    if (idx === -1) return;

    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const swapTarget = sorted[targetIdx];
    const currentOrder = field.display_order;
    const targetOrder = swapTarget.display_order;

    AiAgentRepository.updateLeadField(field.id, { display_order: targetOrder });
    AiAgentRepository.updateLeadField(swapTarget.id, { display_order: currentOrder });

    setFields(AiAgentRepository.getLeadFields(activeForm.id));
  };

  const currentService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="h-4 w-4 text-teal-500" />
            <span>AI Dynamic Lead Form Builder</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure custom field questions collected sequentially by AI WhatsApp Sales Agent.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
              previewMode
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>{previewMode ? 'Exit Live Preview' : 'Live WhatsApp Form Preview'}</span>
          </button>
        </div>
      </div>

      {/* Service Selection Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-emerald-500" />
            <span>Select Service Lead Form</span>
          </label>
          <button
            onClick={() => {
              setNewFormServiceId(selectedServiceId || (services[0]?.id || ''));
              setNewFormName('');
              setIsNewFormModalOpen(true);
            }}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Form Schema</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {services.map((srv) => {
            const hasForm = forms.some((f) => f.service_id === srv.id);
            return (
              <button
                key={srv.id}
                onClick={() => setSelectedServiceId(srv.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  selectedServiceId === srv.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{srv.service_name}</span>
                {hasForm && <CheckCircle2 className="h-3.5 w-3.5 opacity-80" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Editor or Preview */}
      {!activeForm ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Layers className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            No Lead Form Created for {currentService?.service_name || 'Selected Service'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a custom dynamic form schema to capture lead qualification data automatically.
          </p>
          <button
            onClick={() => {
              setNewFormServiceId(selectedServiceId);
              setNewFormName(`${currentService?.service_name || 'Service'} Lead Form`);
              setIsNewFormModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            Initialize Form Schema
          </button>
        </div>
      ) : previewMode ? (
        /* LIVE WHATSAPP FORM PREVIEW */
        <div className="max-w-md mx-auto bg-slate-100 dark:bg-slate-950 rounded-3xl border border-slate-300 dark:border-slate-800 p-4 shadow-xl space-y-3">
          <div className="bg-emerald-700 text-white p-3 rounded-2xl flex items-center space-x-2 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI WhatsApp Form Simulation - {activeForm.form_name}</span>
          </div>

          <div className="space-y-3 p-2 font-sans text-xs">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">AI Sales Agent</span>
              <p className="text-slate-800 dark:text-slate-200 leading-snug">
                Hello! Welcome to Efilingg CRM. Please answer these quick questions to get started with <strong>{currentService?.service_name}</strong>:
              </p>
            </div>

            {fields.map((field, idx) => (
              <div key={field.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 dark:text-white">
                  <span>
                    Q{idx + 1}: {field.field_label} {field.required && <span className="text-rose-500">*</span>}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-mono">
                    {field.field_type}
                  </span>
                </div>

                {field.field_type === 'Dropdown' ? (
                  <select className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-700 dark:text-slate-200">
                    <option value="">Select option...</option>
                    {(field.options || []).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.field_type === 'Textarea' ? (
                  <textarea rows={2} placeholder="Customer input..." className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs" />
                ) : (
                  <input type={field.field_type === 'Number' ? 'number' : field.field_type === 'Date' ? 'date' : 'text'} placeholder={`Enter ${field.field_label.toLowerCase()}...`} className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs" />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FORM FIELD EDITOR TABLE */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {activeForm.form_name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fields.length} dynamic field questions configured for this service
              </p>
            </div>

            <button
              onClick={openAddFieldModal}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Field Question</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No fields added to this form yet. Click "Add Field Question" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Field Label</th>
                    <th className="py-2.5 px-3">Key Name</th>
                    <th className="py-2.5 px-3">Field Type</th>
                    <th className="py-2.5 px-3">Required</th>
                    <th className="py-2.5 px-3">Dropdown Options</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Order Controls */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1">
                          <span className="font-mono font-bold text-slate-400 text-[11px] w-4">{field.display_order}</span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOrder(field, 'UP')}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(field, 'DOWN')}
                              disabled={idx === fields.length - 1}
                              className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Label */}
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                        {field.field_label}
                      </td>

                      {/* Key */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {field.field_name}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[10px] uppercase">
                          {field.field_type}
                        </span>
                      </td>

                      {/* Required */}
                      <td className="py-3 px-3">
                        {field.required ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                            OPTIONAL
                          </span>
                        )}
                      </td>

                      {/* Options */}
                      <td className="py-3 px-3 max-w-xs text-slate-500 text-[11px]">
                        {field.field_type === 'Dropdown' && field.options ? (
                          <span className="line-clamp-1">{field.options.join(', ')}</span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => openEditFieldModal(field)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(field)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Field Modal */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-teal-500" />
                <span>{editingField ? 'Edit Field Question' : 'Add Field Question'}</span>
              </h3>
              <button onClick={() => setIsFieldModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Field Label */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Field Question / Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Annual Business Turnover, Brand Name"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Field Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Key Name (JSON property)
                </label>
                <input
                  type="text"
                  placeholder="e.g., annual_turnover (Auto-generated if empty)"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono"
                />
              </div>

              {/* Field Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Input Type
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as AiFormFieldType)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold"
                  >
                    <option value="Text">Text</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Number">Number</option>
                    <option value="Dropdown">Dropdown</option>
                    <option value="Textarea">Textarea</option>
                    <option value="Date">Date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold"
                  />
                </div>
              </div>

              {/* Dropdown Options */}
              {fieldType === 'Dropdown' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dropdown Options (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={optionsInput}
                    onChange={(e) => setOptionsInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Mark as Required Question
                </span>
                <button
                  type="button"
                  onClick={() => setIsRequired(!isRequired)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    isRequired ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {isRequired ? 'REQUIRED' : 'OPTIONAL'}
                </button>
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setIsFieldModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold">
                  {editingField ? 'Update Field' : 'Add Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Form Modal */}
      {isNewFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Initialize Lead Form Schema
              </h3>
              <button onClick={() => setIsNewFormModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service
                </label>
                <select
                  value={newFormServiceId}
                  onChange={(e) => setNewFormServiceId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.service_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Form Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., GST Registration Qualification Form"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setIsNewFormModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold">
                  Create Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
