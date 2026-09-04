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

interface WorkflowTemplatesManagementProps {
  sessionUser: {
    id: string;
    name: string;
    role?: string;
  };
  onUseTemplateInWorkOrder?: (templateId: string, serviceName: string) => void;
}

export default function WorkflowTemplatesManagement({
  sessionUser: _sessionUser,
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
    if (template) {
      setEditingTemplate({ ...template });
      setEditorStages(JSON.parse(JSON.stringify(template.stages)));
    } else {
      setEditingTemplate({
        id: `TMPL-CUSTOM-${Date.now()}`,
        serviceName: '',
        serviceCode: '',
        department: 'MCA & Corporate Legal',
        category: 'mca',
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
    if (!editingTemplate?.serviceName?.trim() || !editingTemplate?.serviceCode?.trim()) {
      alert('Service Name and Service Code are required.');
      return;
    }

    const totalDays = editorStages.reduce((acc, s) => acc + (Number(s.expectedDurationDays) || 1), 0);
    const finalTemplate: WorkflowTemplate = {
      id: editingTemplate.id || `TMPL-${Date.now()}`,
      serviceName: editingTemplate.serviceName.trim(),
      serviceCode: editingTemplate.serviceCode.trim().toUpperCase(),
      department: editingTemplate.department || 'Operations Command',
      category: editingTemplate.category || 'mca',
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

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FSSAI State License Renewal"
                  value={editingTemplate.serviceName || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, serviceName: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Code (Prefix) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FSS, MCA, GST"
                  value={editingTemplate.serviceCode || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, serviceCode: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department
                </label>
                <select
                  value={editingTemplate.department || 'Operations Command'}
                  onChange={e => setEditingTemplate({ ...editingTemplate, department: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={editingTemplate.category || 'mca'}
                  onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="mca">MCA / Incorporation</option>
                  <option value="gst">GST Registration & Returns</option>
                  <option value="ip">Trademark & IP</option>
                  <option value="license">Licenses & FSSAI</option>
                  <option value="itr">Income Tax Returns</option>
                  <option value="accounting">Accounting & Bookkeeping</option>
                  <option value="other">Other Regulatory</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Template Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline statutory basis and procedural steps..."
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
    </div>
  );
}
