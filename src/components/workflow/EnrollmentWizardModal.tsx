import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Calendar,
  Clock,
  AlertTriangle,
  Layers,
  FileText,
  ExternalLink,
  Lock,
  Check,
  Search,
  Users,
  HelpCircle,
  X,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Workflow
} from 'lucide-react';
import { Lead, Employee } from '../../types';
import {
  WorkflowClient,
  getWorkflowClients,
  isValidPan,
  isValidGstin,
  generateWorkflowClientId,
  ClientCategory
} from '../../lib/workflowClients';
import {
  WorkflowWorkOrder,
  PREDEFINED_WORKFLOW_SERVICES,
  WorkOrderPriority,
  generateNextWorkOrderId
} from '../../lib/workflowWorkOrders';
import {
  WorkflowTemplate,
  getWorkflowTemplates,
  getWorkflowTemplateForService,
  instantiateStagesFromTemplate
} from '../../lib/workflowTemplates';
import {
  findExistingClientForLead,
  getWorkOrdersForClient,
  executeLeadToWorkflowConversion,
  LeadToWorkflowConversionResult
} from '../../lib/workflowLeadAutomation';
import { getEmployees } from '../../lib/db';

interface EnrollmentWizardModalProps {
  lead: Lead;
  sessionUser: { id: string; name: string; role?: string };
  onClose: () => void;
  onSuccess: (result: LeadToWorkflowConversionResult, navigateTarget?: 'work_order' | 'client' | 'leads') => void;
}

export default function EnrollmentWizardModal({
  lead,
  sessionUser,
  onClose,
  onSuccess
}: EnrollmentWizardModalProps) {
  const employees = useMemo(() => getEmployees(), []);
  const allTemplates = useMemo(() => getWorkflowTemplates(), []);

  // Wizard Navigation: Steps 1 to 4 + Success screen (step 5)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // STEP 1: CLIENT IDENTIFICATION
  // Auto-detect if Client exists
  const detectedExistingClient = useMemo(() => {
    return findExistingClientForLead(lead);
  }, [lead]);

  const [useExistingClient, setUseExistingClient] = useState<boolean>(!!detectedExistingClient);
  const [selectedClientId, setSelectedClientId] = useState<string>(detectedExistingClient ? detectedExistingClient.id : '');
  
  // Prompt answer when client already exists: "Create New Work Order?"
  const [confirmCreateNewWorkOrderForExisting, setConfirmCreateNewWorkOrderForExisting] = useState<boolean>(true);

  // Client form states (if creating new or editing)
  const defaultClientName = (lead.businessName || lead.customerName || '').trim();
  const assignedEmp = employees.find(e => e.id === lead.assignedTo) || sessionUser;

  const [clientForm, setClientForm] = useState({
    clientName: defaultClientName,
    mobile: lead.mobile || '',
    email: lead.email || '',
    pan: '',
    gstin: '',
    address: '',
    clientCategory: 'Private Limited Company' as ClientCategory,
    assignedManagerId: assignedEmp.id,
    assignedManagerName: assignedEmp.name
  });

  const nextClientIdPreview = useMemo(() => {
    if (useExistingClient && selectedClientId) {
      return selectedClientId;
    }
    return generateWorkflowClientId();
  }, [useExistingClient, selectedClientId]);

  // STEP 2: SERVICE & WORKFLOW TEMPLATE ENGINE
  const [selectedService, setSelectedService] = useState<string>(() => {
    if (lead.serviceRequired && lead.serviceRequired.trim()) {
      return lead.serviceRequired.trim();
    }
    return 'Private Limited Company Registration';
  });

  const [selectedServiceCode, setSelectedServiceCode] = useState<string>(() => {
    const match = PREDEFINED_WORKFLOW_SERVICES.find(
      s => s.name.toLowerCase() === (lead.serviceRequired || '').toLowerCase()
    );
    return match ? match.code : 'PLC';
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Auto-detect template whenever service changes
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId) {
      return allTemplates.find(t => t.id === selectedTemplateId) || null;
    }
    return getWorkflowTemplateForService(selectedService, selectedServiceCode);
  }, [selectedService, selectedServiceCode, selectedTemplateId, allTemplates]);

  // Sync service code and template when service changes
  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    const predefined = PREDEFINED_WORKFLOW_SERVICES.find(
      s => s.name.toLowerCase() === serviceName.toLowerCase()
    );
    const code = predefined ? predefined.code : 'WRK';
    setSelectedServiceCode(code);
    setSelectedTemplateId('');
  };

  // STEP 3: WORK OWNER & OPERATIONAL PARAMETERS
  const [assignedWorkOwnerId, setAssignedWorkOwnerId] = useState<string>(assignedEmp.id);
  const [department, setDepartment] = useState<string>(activeTemplate?.department || 'Operations Command');
  const [priority, setPriority] = useState<WorkOrderPriority>('high');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [estimatedFee, setEstimatedFee] = useState<number>(14999);
  const [remarks, setRemarks] = useState<string>(`Automated conversion from Sales Lead #${lead.id} (${lead.serviceRequired})`);

  // Auto-update department and calculated due date when template changes
  useEffect(() => {
    if (activeTemplate) {
      setDepartment(activeTemplate.department || 'Operations Command');
      const totalTat = activeTemplate.stages.reduce((sum, stg) => sum + (stg.expectedDurationDays || 1), 0);
      const start = new Date(startDate || new Date());
      start.setDate(start.getDate() + totalTat);
      setDueDate(start.toISOString().split('T')[0]);
    }
  }, [activeTemplate, startDate]);

  // Preview next Work ID
  const nextWorkIdPreview = useMemo(() => {
    return generateNextWorkOrderId(selectedServiceCode);
  }, [selectedServiceCode]);

  // Loaded stages preview from template
  const previewStages = useMemo(() => {
    if (!activeTemplate) return [];
    return instantiateStagesFromTemplate(activeTemplate, startDate);
  }, [activeTemplate, startDate]);

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<LeadToWorkflowConversionResult | null>(null);

  // Existing client's active orders
  const existingClientOrders = useMemo(() => {
    if (!detectedExistingClient) return [];
    return getWorkOrdersForClient(detectedExistingClient.id);
  }, [detectedExistingClient]);

  // Handle final submission: Execute Triple Linkage
  const handleExecuteConversion = () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const assignedOwnerEmp = employees.find(e => e.id === assignedWorkOwnerId) || sessionUser;
      const managerEmp = employees.find(e => e.id === clientForm.assignedManagerId) || sessionUser;

      const result = executeLeadToWorkflowConversion({
        lead,
        existingClientId: useExistingClient ? selectedClientId : undefined,
        clientData: {
          clientName: clientForm.clientName,
          mobile: clientForm.mobile,
          email: clientForm.email,
          pan: clientForm.pan,
          gstin: clientForm.gstin,
          address: clientForm.address,
          clientCategory: clientForm.clientCategory,
          assignedManagerId: managerEmp.id,
          assignedManagerName: managerEmp.name
        },
        workOrderData: {
          service: selectedService,
          serviceCode: selectedServiceCode,
          templateId: activeTemplate?.id,
          ownerId: assignedOwnerEmp.id,
          ownerName: assignedOwnerEmp.name,
          department,
          priority,
          startDate,
          dueDate,
          remarks,
          estimatedFee
        },
        performedBy: {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role
        }
      });

      if (!result.success) {
        setSubmissionError(result.errorMessage || 'Failed to complete conversion.');
        setIsSubmitting(false);
        return;
      }

      setConversionResult(result);
      setCurrentStep(5); // Show success celebration screen
    } catch (err: any) {
      setSubmissionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto flex justify-center items-center animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-5 px-6 border-b border-slate-150 dark:border-slate-800 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white">Lead to Workflow Automation</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Phase 4 Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Converting Sales Lead <span className="font-mono font-bold text-amber-300">#{lead.id}</span> ({lead.customerName}) into an Enrolled Client &amp; Live Work Order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead Context Pill Banner */}
        <div className="p-3 px-6 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span>{lead.customerName}</span>
              {lead.businessName && (
                <span className="text-slate-400">({lead.businessName})</span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{lead.mobile}</span>
            </div>
            {lead.email && (
              <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                <Mail className="h-3 w-3 text-slate-400" />
                <span>{lead.email}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">Target Service:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
              {lead.serviceRequired || 'General Advisory'}
            </span>
          </div>
        </div>

        {/* Wizard Progress Stepper (Only visible on steps 1-4) */}
        {currentStep < 5 && (
          <div className="p-3 px-6 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="grid grid-cols-4 gap-2 text-xs">
              
              {/* Step 1 Tab */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`p-2 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer ${
                  currentStep === 1
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                    : currentStep > 1
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  currentStep > 1 ? 'bg-emerald-500 text-white' : currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {currentStep > 1 ? <Check className="h-3 w-3" /> : '1'}
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400">Step 1</div>
                  <div className="truncate font-bold">Client Verification</div>
                </div>
              </button>

              {/* Step 2 Tab */}
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 2 || (useExistingClient && confirmCreateNewWorkOrderForExisting) || (!useExistingClient && clientForm.clientName.trim())) {
                    setCurrentStep(2);
                  }
                }}
                className={`p-2 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer ${
                  currentStep === 2
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                    : currentStep > 2
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  currentStep > 2 ? 'bg-emerald-500 text-white' : currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {currentStep > 2 ? <Check className="h-3 w-3" /> : '2'}
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400">Step 2</div>
                  <div className="truncate font-bold">Workflow Template</div>
                </div>
              </button>

              {/* Step 3 Tab */}
              <button
                type="button"
                onClick={() => {
                  if (currentStep >= 3) setCurrentStep(3);
                }}
                className={`p-2 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer ${
                  currentStep === 3
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                    : currentStep > 3
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  currentStep > 3 ? 'bg-emerald-500 text-white' : currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {currentStep > 3 ? <Check className="h-3 w-3" /> : '3'}
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400">Step 3</div>
                  <div className="truncate font-bold">Assign Work Owner</div>
                </div>
              </button>

              {/* Step 4 Tab */}
              <button
                type="button"
                onClick={() => {
                  if (currentStep >= 4) setCurrentStep(4);
                }}
                className={`p-2 rounded-xl flex items-center space-x-2 transition text-left cursor-pointer ${
                  currentStep === 4
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-400'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  currentStep === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  4
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400">Step 4</div>
                  <div className="truncate font-bold">Permanent Linkage</div>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Error Banner */}
          {submissionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* ==============================================================
              STEP 1: CLIENT IDENTIFICATION (Create vs Existing Check)
              ============================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Step 1: Client Verification &amp; Registry Check
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every Work Order in Workflow Management must strictly originate from an Enrolled Client ID (<span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">CL-YYYY-XXXXXX</span>).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Target ID: {nextClientIdPreview}
                </span>
              </div>

              {/* Check Result Card: Client Already Exists! */}
              {detectedExistingClient ? (
                <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-amber-900 dark:text-amber-200 text-sm">
                          Client Already Exists in Database!
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 font-mono font-bold text-[10px]">
                          {detectedExistingClient.id}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        A client profile matching this lead&apos;s mobile (<span className="font-mono">{lead.mobile}</span>) or email was located.
                      </p>
                    </div>
                  </div>

                  {/* Client Snapshot */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/40 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Client Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{detectedExistingClient.clientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">PAN &amp; GSTIN</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detectedExistingClient.pan || 'N/A'}</span>
                      {detectedExistingClient.gstin && (
                        <span className="text-[11px] text-slate-500 font-mono block">{detectedExistingClient.gstin}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Work Orders</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{existingClientOrders.length} Linked Dockets</span>
                    </div>
                  </div>

                  {/* USER PROMPT MANDATE: "If Client already exists: Ask: Create New Work Order?" */}
                  <div className="p-4 rounded-xl bg-indigo-900 text-white space-y-3">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="h-5 w-5 text-amber-300" />
                      <span className="font-black text-sm text-white">
                        Client already exists. Create New Work Order?
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200">
                      Would you like to generate a new Work Order under existing Client <span className="font-mono font-bold text-white">{detectedExistingClient.id}</span>, or enroll a separate new client profile?
                    </p>

                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUseExistingClient(true);
                          setSelectedClientId(detectedExistingClient.id);
                          setConfirmCreateNewWorkOrderForExisting(true);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                          useExistingClient
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Yes, Create New Work Order (Recommended)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUseExistingClient(false);
                          setSelectedClientId('');
                          setConfirmCreateNewWorkOrderForExisting(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          !useExistingClient
                            ? 'bg-white text-slate-900 font-bold shadow-md'
                            : 'bg-indigo-800/60 text-indigo-300 hover:bg-indigo-800'
                        }`}
                      >
                        <span>Enroll as New Separate Client</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                      No Existing Client Record Found
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                      Client details have been pre-filled from this Sales Lead. Review and complete the enrollment properties below to generate new sequential Client ID.
                    </p>
                  </div>
                </div>
              )}

              {/* Client Details Form (Rendered if creating new client or reviewing) */}
              {(!useExistingClient || !detectedExistingClient) && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Client / Entity Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={clientForm.clientName}
                        onChange={e => setClientForm({ ...clientForm, clientName: e.target.value })}
                        placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Client Category *
                      </label>
                      <select
                        value={clientForm.clientCategory}
                        onChange={e => setClientForm({ ...clientForm, clientCategory: e.target.value as any })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="Private Limited Company">Private Limited Company</option>
                        <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="Individual">Individual</option>
                        <option value="Section 8 / Trust / NGO">Section 8 / Trust / NGO</option>
                        <option value="One Person Company (OPC)">One Person Company (OPC)</option>
                        <option value="Public Limited Company">Public Limited Company</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={clientForm.mobile}
                        onChange={e => setClientForm({ ...clientForm, mobile: e.target.value })}
                        placeholder="10-digit mobile"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                        placeholder="client@company.com"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        PAN Number (Optional / Format: ABCDE1234F)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={clientForm.pan}
                        onChange={e => setClientForm({ ...clientForm, pan: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Assigned Client Manager *
                      </label>
                      <select
                        value={clientForm.assignedManagerId}
                        onChange={e => {
                          const emp = employees.find(x => x.id === e.target.value);
                          setClientForm({
                            ...clientForm,
                            assignedManagerId: e.target.value,
                            assignedManagerName: emp?.name || 'Manager'
                          });
                        }}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Registered Office / Billing Address
                      </label>
                      <input
                        type="text"
                        value={clientForm.address}
                        onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                        placeholder="Plot / Street / City / State / Pincode"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* Action Button: Next */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!useExistingClient && !clientForm.clientName.trim()) {
                      alert('Client Name is required.');
                      return;
                    }
                    if (!useExistingClient && !clientForm.mobile.trim()) {
                      alert('Client Mobile Number is required.');
                      return;
                    }
                    if (!useExistingClient && clientForm.pan.trim() && !isValidPan(clientForm.pan.trim())) {
                      alert('Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                >
                  <span>Continue to Workflow Template</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 2: SERVICE & WORKFLOW TEMPLATE ENGINE
              ============================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Step 2: Service Workflow Template Loading
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The system automatically queries the Workflow Template Engine to match the service and instantiate all sequential compliance stages.
                </p>
              </div>

              {/* Service Selector */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Target Service Catalog *
                    </label>
                    <select
                      value={selectedService}
                      onChange={e => handleServiceChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      {PREDEFINED_WORKFLOW_SERVICES.map(svc => (
                        <option key={svc.code} value={svc.name}>
                          {svc.name} ({svc.code}) - {svc.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Associated Workflow Template
                    </label>
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-indigo-950 dark:text-indigo-200">
                          {activeTemplate ? activeTemplate.serviceName : 'Standard Generic Workflow'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-mono text-[10px] font-bold">
                        {previewStages.length} Stages Loaded
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stages List Loaded Automatically */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Instantiated Compliance Stages Preview ({previewStages.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Total Expected TAT: {previewStages.reduce((sum, s) => sum + (s.expectedDurationDays || 1), 0)} Days
                    </span>
                  </div>

                  <div className="divide-y divide-slate-150 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 max-h-56 overflow-y-auto">
                    {previewStages.map((stage, idx) => (
                      <div key={stage.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{stage.name}</span>
                              {stage.mandatoryDocuments && stage.mandatoryDocuments.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  {stage.mandatoryDocuments.length} Mandatory Doc(s)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-3">
                              <span>Duration: {stage.expectedDurationDays} days</span>
                              {stage.dependencies && stage.dependencies.length > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Depends on Stage {stage.dependencies.join(', ')}
                                </span>
                              )}
                              <span>Checklist: {stage.checklist?.length || 0} items</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500">
                          Due: {stage.dueDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                >
                  <span>Continue to Owner Assignment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 3: ASSIGN WORK OWNER & OPERATIONAL PARAMETERS
              ============================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Step 3: Assign Work Owner &amp; Schedule Parameters
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate responsible executive, department, priority SLA, and operational filing remarks.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Owner Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Assigned Work Owner *
                    </label>
                    <select
                      value={assignedWorkOwnerId}
                      onChange={e => setAssignedWorkOwnerId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.role} ({emp.department || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Handling Department *
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Work Order Priority *
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="urgent">Urgent (Immediate Attention)</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Normal / Medium</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  {/* Estimated Fee */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Professional Service Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={estimatedFee}
                      onChange={e => setEstimatedFee(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Commencement Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Target Completion Due Date *
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Operational Remarks &amp; Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                >
                  <span>Review Triple Linkage</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 4: PERMANENT TRIPLE-LINKAGE VERIFICATION & CONFIRMATION
              ============================================================== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Step 4: Permanent Linkage Verification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the permanent bidirectional links between Sales Lead, Workflow Client, and Work Order before final execution.
                </p>
              </div>

              {/* Linkage Diagram Banner */}
              <div className="p-4 rounded-2xl bg-indigo-950 border border-indigo-800 text-white">
                <div className="text-[11px] font-mono text-indigo-300 uppercase tracking-wider text-center font-bold mb-3">
                  Permanent Relational Architecture
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  
                  {/* Entity 1: Lead */}
                  <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-amber-300">Originating Lead</div>
                    <div className="font-mono font-bold text-sm text-white">{lead.id}</div>
                    <div className="text-xs text-slate-200 truncate">{lead.customerName}</div>
                    <div className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Stage &rarr; CONVERTED
                    </div>
                  </div>

                  {/* Entity 2: Client */}
                  <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-indigo-300">Enrolled Client</div>
                    <div className="font-mono font-bold text-sm text-white">{nextClientIdPreview}</div>
                    <div className="text-xs text-slate-200 truncate">
                      {useExistingClient && detectedExistingClient ? detectedExistingClient.clientName : clientForm.clientName}
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {useExistingClient ? 'Existing Profile Linked' : 'New Client Generated'}
                    </div>
                  </div>

                  {/* Entity 3: Work Order */}
                  <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-emerald-300">Workflow Work Order</div>
                    <div className="font-mono font-bold text-sm text-white">{nextWorkIdPreview}</div>
                    <div className="text-xs text-slate-200 truncate">{selectedService}</div>
                    <div className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {previewStages.length} Stages Preloaded
                    </div>
                  </div>

                </div>
              </div>

              {/* Execution Summary Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Client &amp; Contact Specifications</span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client ID:</span>
                      <span className="font-mono font-bold">{nextClientIdPreview}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entity Name:</span>
                      <span className="font-bold">{useExistingClient && detectedExistingClient ? detectedExistingClient.clientName : clientForm.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile Phone:</span>
                      <span className="font-mono">{lead.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Manager:</span>
                      <span>{clientForm.assignedManagerName}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    <span>Workflow &amp; Operations Parameters</span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Work Order ID:</span>
                      <span className="font-mono font-bold">{nextWorkIdPreview}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Service &amp; Code:</span>
                      <span>{selectedService} ({selectedServiceCode})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Owner:</span>
                      <span className="font-bold">{employees.find(e => e.id === assignedWorkOwnerId)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Due Date:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{dueDate}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Owner</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteConversion}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>{isSubmitting ? 'Linking Triple Records...' : 'Execute Conversion & Permanent Linkage'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 5: CONVERSION SUCCESS & CELEBRATION
              ============================================================== */}
          {currentStep === 5 && conversionResult && (
            <div className="py-6 text-center space-y-6 animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Lead Successfully Converted &amp; Linked!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Sales Lead <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{lead.id}</span> has been permanently converted and synchronized across CRM, Client Registry, and Workflow Management.
                </p>
              </div>

              {/* Permanent Linkage Badges */}
              <div className="max-w-xl mx-auto grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Lead Status</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">CONVERTED</span>
                  <span className="font-mono text-[10px] text-slate-400 block mt-0.5">{lead.id}</span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Client ID</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {conversionResult.client?.id}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    {conversionResult.client?.clientName}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Work Order ID</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {conversionResult.workOrder?.id}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {conversionResult.workOrder?.stages.length} Stages Live
                  </span>
                </div>
              </div>

              {/* Quick Navigation CTAs */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onSuccess(conversionResult, 'work_order')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Open Work Order in Workflow Management</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSuccess(conversionResult, 'client')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Building2 className="h-4 w-4" />
                  <span>View Client Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSuccess(conversionResult, 'leads')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                >
                  <span>Return to Leads Pipeline</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
