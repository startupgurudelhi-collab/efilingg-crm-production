import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Briefcase,
  GitBranch,
  Sparkles,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  Lock,
  Tag,
  Building2,
  ExternalLink,
  Edit3,
  Trash2,
  HelpCircle,
  X,
  ListOrdered
} from 'lucide-react';
import {
  WorkflowTemplate,
  WorkflowTemplateStage,
  getWorkflowTemplates,
  saveWorkflowTemplates,
  resetWorkflowTemplatesToDefault,
  BUILT_IN_WORKFLOW_TEMPLATES
} from '../../lib/workflowTemplates';
import {
  getCustomServices,
  getDefaultPredefinedServices,
  addCustomService
} from '../../lib/db';
import { CustomService } from '../../types';

interface WorkflowTemplatesManagementProps {
  sessionUser: {
    id: string;
    name: string;
    role?: string;
  };
  onUseTemplateInWorkOrder?: (templateId: string, serviceName: string) => void;
}

// Helpers to automatically derive standard metadata from service catalogue
function deriveServiceCode(serviceName: string, category?: string): string {
  if (!serviceName) return 'SRV';
  const clean = serviceName.trim().toUpperCase();
  if (clean.includes('PRIVATE LIMITED') || clean.includes('PVT LTD')) return 'PLC';
  if (clean.includes('LLP') || clean.includes('LIMITED LIABILITY')) return 'LLP';
  if (clean.includes('OPC') || clean.includes('ONE PERSON')) return 'OPC';
  if (clean.includes('SECTION 8')) return 'SEC8';
  if (clean.includes('GST')) return 'GST';
  if (clean.includes('TRADEMARK') || clean.includes('TM')) return 'TM';
  if (clean.includes('FSSAI') || clean.includes('FOOD')) return 'FSSAI';
  if (clean.includes('MSME') || clean.includes('UDYAM')) return 'MSME';
  if (clean.includes('ISO')) return 'ISO';
  if (clean.includes('IMPORT EXPORT') || clean.includes('IEC')) return 'IEC';
  if (clean.includes('SHOP') || clean.includes('GUMASTA')) return 'SHOP';
  if (clean.includes('ITR') || clean.includes('INCOME TAX')) return 'ITR';
  if (clean.includes('TDS')) return 'TDS';
  if (clean.includes('AUDIT')) return 'AUD';
  if (clean.includes('ROC')) return 'ROC';
  if (clean.includes('WEBSITE') || clean.includes('WEB')) return 'WEB';

  const words = clean.split(/\s+/).filter(w => !['AND', '&', 'OF', 'FOR', 'THE', 'IN', 'REGISTRATION'].includes(w));
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').slice(0, 4);
  }
  return clean.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SRV';
}

function deriveDepartment(category?: string, serviceName?: string): string {
  const cat = (category || '').toLowerCase();
  const srv = (serviceName || '').toLowerCase();
  if (cat.includes('mca') || srv.includes('company') || srv.includes('llp') || srv.includes('pvt') || srv.includes('incorporation') || srv.includes('roc')) {
    return 'MCA & Corporate Legal';
  }
  if (cat.includes('gst') || srv.includes('gst')) {
    return 'GST Department';
  }
  if (cat.includes('ip') || cat.includes('trademark') || srv.includes('trademark') || srv.includes('copyright') || srv.includes('patent')) {
    return 'Intellectual Property (IP)';
  }
  if (cat.includes('license') || cat.includes('fssai') || srv.includes('fssai') || srv.includes('food') || srv.includes('drug') || srv.includes('ayush')) {
    return 'Food & Licensing Authority';
  }
  if (cat.includes('itr') || cat.includes('tax') || srv.includes('income tax') || srv.includes('tds')) {
    return 'Direct Tax & ITR Filing';
  }
  if (cat.includes('accounting') || srv.includes('accounting') || srv.includes('bookkeeping') || srv.includes('payroll') || srv.includes('audit')) {
    return 'Accounting & Financials';
  }
  return 'Operations Command';
}

function deriveCategory(category?: string, serviceName?: string): string {
  const cat = (category || '').toLowerCase();
  const srv = (serviceName || '').toLowerCase();
  if (cat.includes('mca') || srv.includes('company') || srv.includes('incorporation') || srv.includes('pvt') || srv.includes('llp')) return 'mca';
  if (cat.includes('gst') || srv.includes('gst')) return 'gst';
  if (cat.includes('ip') || cat.includes('trademark') || srv.includes('trademark')) return 'ip';
  if (cat.includes('license') || cat.includes('fssai') || srv.includes('fssai')) return 'license';
  if (cat.includes('itr') || cat.includes('tax') || srv.includes('tax')) return 'itr';
  if (cat.includes('accounting') || srv.includes('accounting')) return 'accounting';
  return 'other';
}

export default function WorkflowTemplatesManagement({
  sessionUser,
  onUseTemplateInWorkOrder
}: WorkflowTemplatesManagementProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(() => getWorkflowTemplates());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(() => {
    const list = getWorkflowTemplates();
    return list[0] || null;
  });

  // Service Catalogue State
  const [catalogueServices, setCatalogueServices] = useState<CustomService[]>(() => {
    const custom = getCustomServices();
    return custom && custom.length > 0 ? custom : getDefaultPredefinedServices();
  });

  const refreshCatalogue = () => {
    const custom = getCustomServices();
    const list = custom && custom.length > 0 ? custom : getDefaultPredefinedServices();
    setCatalogueServices(list);
    return list;
  };

  // Add New Service to Catalogue State
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    category: 'Company Incorporation',
    price: 4999,
    timeline: '5-7 Working Days',
    department: 'MCA & Corporate Legal'
  });
  const [newServiceError, setNewServiceError] = useState<string | null>(null);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WorkflowTemplate> | null>(null);
  const [editorStages, setEditorStages] = useState<WorkflowTemplateStage[]>([]);
  const [newChecklistText, setNewChecklistText] = useState<{ [stageIndex: number]: string }>({});
  const [newDocText, setNewDocText] = useState<{ [stageIndex: number]: string }>({});

  const refreshTemplates = () => {
    const updated = getWorkflowTemplates();
    setTemplates(updated);
    if (selectedTemplate) {
      const freshSelected = updated.find(t => t.id === selectedTemplate.id) || updated[0] || null;
      setSelectedTemplate(freshSelected);
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(tmpl => {
      const matchesSearch =
        tmpl.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.serviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.stages.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || tmpl.category === selectedCategory;
      const matchesDept = selectedDepartment === 'all' || tmpl.department === selectedDepartment;

      return matchesSearch && matchesCat && matchesDept;
    });
  }, [templates, searchQuery, selectedCategory, selectedDepartment]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalTemplates = templates.length;
    const totalStages = templates.reduce((acc, t) => acc + t.stages.length, 0);
    const avgDuration =
      totalTemplates > 0
        ? Math.round(templates.reduce((acc, t) => acc + t.totalExpectedDurationDays, 0) / totalTemplates)
        : 0;
    const totalChecklists = templates.reduce(
      (acc, t) => acc + t.stages.reduce((sAcc, s) => sAcc + (s.checklist?.length || 0), 0),
      0
    );

    return { totalTemplates, totalStages, avgDuration, totalChecklists };
  }, [templates]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => set.add(t.department));
    return Array.from(set);
  }, [templates]);

  // Open Template Editor (Create or Edit)
  const handleOpenEditor = (template?: WorkflowTemplate) => {
    const currentCatalogue = refreshCatalogue();
    if (template) {
      setEditingTemplate({ ...template });
      setEditorStages(JSON.parse(JSON.stringify(template.stages)));
    } else {
      const firstSrv = currentCatalogue[0];
      const initialName = firstSrv ? firstSrv.name : '';
      const initialCode = firstSrv ? deriveServiceCode(firstSrv.name, firstSrv.category) : 'SRV';
      const initialDept = firstSrv ? deriveDepartment(firstSrv.category, firstSrv.name) : 'MCA & Corporate Legal';
      const initialCat = firstSrv ? deriveCategory(firstSrv.category, firstSrv.name) : 'mca';

      setEditingTemplate({
        id: `TMPL-CUSTOM-${Date.now()}`,
        serviceName: initialName,
        serviceCode: initialCode,
        department: initialDept,
        category: initialCat,
        description: '',
        totalExpectedDurationDays: 7
      });
      setEditorStages([
        {
          id: 'stage_1',
          sequence: 1,
          name: 'Documentation & KYC Ingestion',
          description: 'Collect and verify client statutory credentials.',
          expectedDurationDays: 2,
          dependencies: [],
          checklist: ['Collect Identity and Address proofs', 'Verify active mobile OTP'],
          mandatoryDocuments: ['PAN Card', 'Aadhaar Card']
        }
      ]);
    }
    setNewChecklistText({});
    setNewDocText({});
    setIsEditorOpen(true);
  };

  // Create New Service on the fly & add to Service Catalogue
  const handleCreateNewService = (e: React.FormEvent) => {
    e.preventDefault();
    setNewServiceError(null);
    const trimmedName = newServiceForm.name.trim();
    if (!trimmedName) {
      setNewServiceError('Service Name is required.');
      return;
    }

    // Check if already in catalogue
    const alreadyExists = catalogueServices.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (alreadyExists) {
      setNewServiceError(`"${trimmedName}" already exists in the Service Catalogue.`);
      return;
    }

    try {
      const priceNum = Math.max(0, Number(newServiceForm.price) || 0);
      const created = addCustomService({
        name: trimmedName,
        category: newServiceForm.category,
        price: priceNum,
        timeline: newServiceForm.timeline || '5-7 Working Days',
        packagesIncluded: ['Official Statutory Filing', 'Expert Consultation Certifications'],
        documentsRequired: ['Aadhaar Card of Applicant', 'PAN Card of Applicant', 'Business Entity Proof / Address Details'],
        scope: ['Client document verification', 'Statutory application preparation', 'Government portal filing & approval tracking'],
        deliverables: ['Official Govt Registration Certificate / Filing Receipt'],
        employeeIncentive: Math.round(priceNum * 0.15) || 200
      }, sessionUser?.id || 'EMP-ADMIN');

      refreshCatalogue();

      // Automatically select into the active editing template
      if (editingTemplate) {
        const derivedCode = deriveServiceCode(created.name, created.category);
        const derivedDept = newServiceForm.department || deriveDepartment(created.category, created.name);
        const derivedCat = deriveCategory(created.category, created.name);
        setEditingTemplate({
          ...editingTemplate,
          serviceName: created.name,
          serviceCode: derivedCode,
          department: derivedDept,
          category: derivedCat
        });
      }

      setIsNewServiceModalOpen(false);
      setNewServiceForm({
        name: '',
        category: 'Company Incorporation',
        price: 4999,
        timeline: '5-7 Working Days',
        department: 'MCA & Corporate Legal'
      });
    } catch (err: any) {
      setNewServiceError(err?.message || 'Failed to save new service into catalogue.');
    }
  };

  // Add Stage in Editor
  const handleAddStage = () => {
    const nextSeq = editorStages.length + 1;
    const newStage: WorkflowTemplateStage = {
      id: `stage_${Date.now()}`,
      sequence: nextSeq,
      name: `Stage ${nextSeq}: Process Step`,
      description: 'Define specific procedural compliance activities for this stage.',
      expectedDurationDays: 2,
      dependencies: nextSeq > 1 ? [editorStages[nextSeq - 2].id] : [],
      checklist: ['Execute mandatory verification', 'Upload acknowledgement receipt'],
      mandatoryDocuments: []
    };
    setEditorStages([...editorStages, newStage]);
  };

  // Remove Stage in Editor
  const handleRemoveStage = (index: number) => {
    if (editorStages.length <= 1) {
      alert('A workflow template must contain at least one stage.');
      return;
    }
    const filtered = editorStages.filter((_, idx) => idx !== index);
    // Re-sequence
    const resequenced = filtered.map((s, idx) => ({
      ...s,
      sequence: idx + 1
    }));
    setEditorStages(resequenced);
  };

  // Save Template
  const handleSaveTemplate = () => {
    if (!editingTemplate?.serviceName?.trim()) {
      alert('Please select a Service Name from the dropdown or add a new service.');
      return;
    }

    const trimmedName = editingTemplate.serviceName.trim();
    const matchedSrv = catalogueServices.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    const finalCode = editingTemplate.serviceCode?.trim().toUpperCase() || deriveServiceCode(trimmedName, matchedSrv?.category);
    const finalDept = editingTemplate.department || (matchedSrv ? deriveDepartment(matchedSrv.category, trimmedName) : 'Operations Command');
    const finalCat = editingTemplate.category || (matchedSrv ? deriveCategory(matchedSrv.category, trimmedName) : 'mca');

    const totalDays = editorStages.reduce((acc, s) => acc + (Number(s.expectedDurationDays) || 1), 0);
    const finalTemplate: WorkflowTemplate = {
      id: editingTemplate.id || `TMPL-${Date.now()}`,
      serviceName: trimmedName,
      serviceCode: finalCode,
      department: finalDept,
      category: finalCat,
      description: editingTemplate.description || '',
      totalExpectedDurationDays: totalDays,
      stages: editorStages,
      isSystemDefault: editingTemplate.isSystemDefault ?? false,
      createdAt: editingTemplate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const currentList = getWorkflowTemplates();
    const existingIndex = currentList.findIndex(t => t.id === finalTemplate.id);
    let updated: WorkflowTemplate[];
    if (existingIndex >= 0) {
      updated = [...currentList];
      updated[existingIndex] = finalTemplate;
    } else {
      updated = [finalTemplate, ...currentList];
    }

    saveWorkflowTemplates(updated);
    setTemplates(updated);
    setSelectedTemplate(finalTemplate);
    setIsEditorOpen(false);
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (window.confirm('Reset all workflow templates to standardized default Indian legal service configurations? Custom changes will be restored.')) {
      resetWorkflowTemplatesToDefault();
      refreshTemplates();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Layers className="h-3.5 w-3.5" />
                Phase 3 Engine
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Automatic Stages · Sequence · Dependencies · Duration
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              Workflow Template Engine
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Standardized, battle-tested statutory workflow templates for Indian regulatory services. When a Work Order is created, its sequence, SLAs, and dependency chains are loaded automatically.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              title="Reset templates to standard legal presets"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Standards</span>
            </button>
            <button
              onClick={() => handleOpenEditor()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Service Templates</span>
              <Briefcase className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics.totalTemplates}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              100% Pre-Configured
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Standardized Stages</span>
              <ListOrdered className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics.totalStages}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Across all categories
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Duration</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics.avgDuration} Days
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              End-to-end statutory SLA
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quality Checklists</span>
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics.totalChecklists} Items
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Strict audit compliance
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar List + Stage Visualizer Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Navigator & Filters */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates, services, stages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'mca', label: 'MCA / PLC' },
                { id: 'gst', label: 'GST' },
                { id: 'ip', label: 'Trademark' },
                { id: 'license', label: 'FSSAI' },
                { id: 'itr', label: 'ITR' },
                { id: 'accounting', label: 'Accounting' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Department Filter */}
            <div className="pt-1">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                aria-label="Filter templates by department"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Departments ({departments.length})</option>
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template Cards List */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No templates match your query
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedDepartment('all');
                  }}
                  className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplate?.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`cursor-pointer transition-all rounded-2xl border p-4 text-left ${
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700/80 shadow-xs ring-1 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {tmpl.serviceCode}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {tmpl.department}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <Clock className="h-3 w-3 text-amber-500" />
                        {tmpl.totalExpectedDurationDays}d SLA
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2 leading-snug">
                      {tmpl.serviceName}
                    </h4>

                    {/* Progress dots representation */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1">
                        {tmpl.stages.map((stg, sIdx) => (
                          <div
                            key={stg.id || sIdx}
                            className="h-1.5 w-5 rounded-full bg-indigo-500/70 dark:bg-indigo-400/80"
                            title={`Stage ${stg.sequence}: ${stg.name} (${stg.expectedDurationDays}d)`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 ml-auto">
                        {tmpl.stages.length} Stages
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                          isSelected ? 'translate-x-0.5 text-indigo-500' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Template Detailed Inspector & Visual Stage Sequence */}
        <div className="lg:col-span-8 space-y-5">
          {selectedTemplate ? (
            <div className="space-y-5">
              {/* Template Banner Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-600 text-white shadow-xs">
                        {selectedTemplate.serviceCode}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {selectedTemplate.department}
                      </span>
                      {selectedTemplate.isSystemDefault && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Official Standard Template
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                      {selectedTemplate.serviceName}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  {/* Actions for this template */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditor(selectedTemplate)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Template</span>
                    </button>
                    {onUseTemplateInWorkOrder && (
                      <button
                        onClick={() =>
                          onUseTemplateInWorkOrder(
                            selectedTemplate.id,
                            selectedTemplate.serviceName
                          )
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>Use in Work Order</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Metadata Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Total Execution Duration
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      {selectedTemplate.totalExpectedDurationDays} Calendar Days
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Sequence Breakdown
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                      <ListOrdered className="h-3.5 w-3.5 text-blue-500" />
                      {selectedTemplate.stages.length} Distinct Stages
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Dependency Enforcements
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                      <GitBranch className="h-3.5 w-3.5" />
                      {selectedTemplate.stages.filter(s => s.dependencies && s.dependencies.length > 0).length} Stages Blocked
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Auto-Loading Engine
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Active on Work Order
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Workflow Stage Sequence Engine */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-indigo-500" />
                      Workflow Stage Chain & Dependencies
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Stages must be completed in order. Each stage calculates expected SLA dates and blocks execution until prerequisite dependencies are cleared.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {selectedTemplate.stages.length} Sequential Steps
                  </span>
                </div>

                {/* Stage Steps Container */}
                <div className="space-y-4 relative before:absolute before:left-5 before:top-8 before:bottom-8 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {selectedTemplate.stages.map((stage, idx) => {
                    const hasDependencies = stage.dependencies && stage.dependencies.length > 0;
                    const dependentStages = hasDependencies
                      ? selectedTemplate.stages.filter(s => stage.dependencies.includes(s.id))
                      : [];

                    return (
                      <div
                        key={stage.id}
                        className="relative pl-12 group transition-all"
                      >
                        {/* Sequence circle */}
                        <div className="absolute left-2.5 top-3.5 -translate-x-1/2 flex items-center justify-center h-7 w-7 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs shadow-xs z-10">
                          {stage.sequence}
                        </div>

                        {/* Stage Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {stage.name}
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <Clock className="h-3 w-3" />
                                {stage.expectedDurationDays} {stage.expectedDurationDays === 1 ? 'Day' : 'Days'} Duration
                              </span>
                            </div>

                            {/* Dependencies Pill */}
                            <div>
                              {hasDependencies ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                  <Lock className="h-3 w-3" />
                                  Depends on Stage {dependentStages.map(d => d.sequence).join(', ')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Root Stage (Unblocked)
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {stage.description}
                          </p>

                          {/* Stage Checklist & Statutory Documents */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                            {/* Checklist */}
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                                <CheckSquare className="h-3 w-3 text-indigo-500" />
                                Procedural Checklist ({stage.checklist?.length || 0})
                              </span>
                              <div className="space-y-1">
                                {stage.checklist && stage.checklist.length > 0 ? (
                                  stage.checklist.map((item, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300"
                                    >
                                      <div className="h-3 w-3 rounded-xs border border-slate-300 dark:border-slate-600 mt-0.5 shrink-0 bg-white dark:bg-slate-800" />
                                      <span>{item}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No checklist items</span>
                                )}
                              </div>
                            </div>

                            {/* Required Documents */}
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-amber-500" />
                                Required Documents ({stage.mandatoryDocuments?.length || 0})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {stage.mandatoryDocuments && stage.mandatoryDocuments.length > 0 ? (
                                  stage.mandatoryDocuments.map((doc, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                      <Tag className="h-2.5 w-2.5 text-slate-400" />
                                      {doc}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Standard statutory records</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Select a Template to inspect
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Choose any service from the left menu to visualize its full stage sequence, duration, checklists, and dependency hierarchy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Template Editor Modal */}
      {isEditorOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  {editingTemplate.id?.startsWith('TMPL-CUSTOM') ? 'Create Custom Workflow Template' : 'Edit Workflow Template'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure stages, SLA durations, sequence, and predecessor dependencies.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Basic Info Fields: Service selected directly from Service Catalogue */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Select Service from Catalogue *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewServiceError(null);
                      setIsNewServiceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add New Service</span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={editingTemplate.serviceName || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__ADD_NEW__') {
                        setNewServiceError(null);
                        setIsNewServiceModalOpen(true);
                        return;
                      }
                      const matched = catalogueServices.find(s => s.name === val);
                      const derivedCode = matched ? deriveServiceCode(matched.name, matched.category) : deriveServiceCode(val);
                      const derivedDept = matched ? deriveDepartment(matched.category, matched.name) : 'Operations Command';
                      const derivedCat = matched ? deriveCategory(matched.category, matched.name) : 'mca';
                      setEditingTemplate({
                        ...editingTemplate,
                        serviceName: val,
                        serviceCode: derivedCode,
                        department: derivedDept,
                        category: derivedCat
                      });
                    }}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Service from Catalogue --</option>
                    {catalogueServices.map(srv => (
                      <option key={srv.id || srv.name} value={srv.name}>
                        {srv.name} • ₹{(srv.price || 0).toLocaleString('en-IN')} {srv.category ? `(${srv.category})` : ''}
                      </option>
                    ))}
                    <option value="__ADD_NEW__" className="text-indigo-600 font-bold bg-indigo-50 dark:bg-slate-800">
                      + Add New Service to Catalogue...
                    </option>
                  </select>
                </div>

                {/* Auto-synced catalogue metadata indicator */}
                {editingTemplate.serviceName && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(() => {
                      const matched = catalogueServices.find(s => s.name === editingTemplate.serviceName);
                      return matched?.price ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 font-mono">
                          Standard Fee: ₹{matched.price.toLocaleString('en-IN')}
                        </span>
                      ) : null;
                    })()}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                      (Auto-synced from Catalogue)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Template Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline statutory basis, regulatory rules, and procedural overview..."
                  value={editingTemplate.description || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Stages Builder */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-indigo-500" />
                    Configure Stages & Dependencies ({editorStages.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total Duration:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {editorStages.reduce((a, s) => a + (Number(s.expectedDurationDays) || 1), 0)} Days
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Stage</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {editorStages.map((stage, sIdx) => (
                  <div
                    key={stage.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={e => {
                            const copy = [...editorStages];
                            copy[sIdx].name = e.target.value;
                            setEditorStages(copy);
                          }}
                          placeholder="Stage Name"
                          className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white w-64 sm:w-80"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={stage.expectedDurationDays}
                            onChange={e => {
                              const copy = [...editorStages];
                              copy[sIdx].expectedDurationDays = Math.max(1, parseInt(e.target.value) || 1);
                              setEditorStages(copy);
                            }}
                            className="w-14 text-xs font-semibold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 text-slate-900 dark:text-white"
                          />
                          <span className="text-[11px] text-slate-500">Days</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStage(sIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete stage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Dependencies Select */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Depends on Stage
                        </label>
                        {sIdx === 0 ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 italic">
                            Root stage (No dependencies)
                          </span>
                        ) : (
                          <select
                            value={stage.dependencies[0] || ''}
                            onChange={e => {
                              const copy = [...editorStages];
                              copy[sIdx].dependencies = e.target.value ? [e.target.value] : [];
                              setEditorStages(copy);
                            }}
                            className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300"
                          >
                            <option value="">No dependency</option>
                            {editorStages.slice(0, sIdx).map(prev => (
                              <option key={prev.id} value={prev.id}>
                                Stage {prev.sequence}: {prev.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Stage Description */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Stage Objective / Instructions
                        </label>
                        <input
                          type="text"
                          value={stage.description}
                          onChange={e => {
                            const copy = [...editorStages];
                            copy[sIdx].description = e.target.value;
                            setEditorStages(copy);
                          }}
                          placeholder="Brief compliance notes..."
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Add New Service to Catalogue */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-500" />
                  Add New Service to Catalogue
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This service will automatically be saved into the Service Catalogue and selected in your template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewServiceModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {newServiceError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{newServiceError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Import Export Code (IEC) Registration"
                  value={newServiceForm.name}
                  onChange={e => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Standard Fee / Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 2999"
                    value={newServiceForm.price || ''}
                    onChange={e => setNewServiceForm({ ...newServiceForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Service Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newServiceForm.category}
                    onChange={e => {
                      const cat = e.target.value;
                      const dept = deriveDepartment(cat, newServiceForm.name);
                      setNewServiceForm({ ...newServiceForm, category: cat, department: dept });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Company Incorporation">MCA / Company Incorporation</option>
                    <option value="GST Services">GST Registration & Returns</option>
                    <option value="Trademark & IP">Trademark & IP</option>
                    <option value="Licenses & Approvals">Licenses & FSSAI</option>
                    <option value="Direct Tax & Compliance">Direct Tax & ITR Filing</option>
                    <option value="Accounting & Audit">Accounting & Bookkeeping</option>
                    <option value="General Regulatory">Other Regulatory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={newServiceForm.department}
                    onChange={e => setNewServiceForm({ ...newServiceForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="MCA & Corporate Legal">MCA & Corporate Legal</option>
                    <option value="GST Department">GST Department</option>
                    <option value="Intellectual Property (IP)">Intellectual Property (IP)</option>
                    <option value="Food & Licensing Authority">Food & Licensing Authority</option>
                    <option value="Direct Tax & ITR Filing">Direct Tax & ITR Filing</option>
                    <option value="Accounting & Financials">Accounting & Financials</option>
                    <option value="Operations Command">Operations Command</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated SLA Timeline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3-5 Working Days"
                    value={newServiceForm.timeline}
                    onChange={e => setNewServiceForm({ ...newServiceForm, timeline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Save &amp; Add to Catalogue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
