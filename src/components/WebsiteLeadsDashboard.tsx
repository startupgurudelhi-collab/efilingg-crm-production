import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Sparkles,
  ArrowRight,
  Shield,
  Send,
  Building2,
  Calendar,
  MessageSquare,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { Employee, Lead, LeadStage, LEAD_STAGES } from '../types';
import { getEmployees, updateLeadStage, saveLeads, getLeads } from '../lib/db';
import {
  getWebsiteLeads,
  ensureSampleWebsiteLeads,
  ingestWebsiteLead,
  DEFAULT_WEBSITE_API_KEY
} from '../lib/websiteLeads';
import { pushToPostgres } from '../lib/postgresSync';

interface WebsiteLeadsDashboardProps {
  sessionUser: Employee;
  onRefreshData: () => void;
  triggerRefresh: number;
  onTriggerLeadDetail: (id: string | null) => void;
  onOpenEnrollmentWizard: (lead: Lead) => void;
}

export default function WebsiteLeadsDashboard({
  sessionUser,
  onRefreshData,
  triggerRefresh,
  onTriggerLeadDetail,
  onOpenEnrollmentWizard
}: WebsiteLeadsDashboardProps) {
  // Ensure sample leads (e.g. Samita #f1af6d40 and Rajesh Kumar from legomarkindia.com) are present
  useEffect(() => {
    ensureSampleWebsiteLeads();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Test simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState<string | null>(null);
  const [testName, setTestName] = useState('Ananya Sen');
  const [testPhone] = useState('9831123456');
  const [testEmail] = useState('ananya.sen@legomarkclient.com');
  const [testCity] = useState('Kolkata');
  const [testService, setTestService] = useState('Trademark Registration');
  const [testSource, setTestSource] = useState('Website');
  const [testPackage, setTestPackage] = useState('Trademark Search & Filing (Express - ₹9,999)');
  const [testFee] = useState(9999);

  const employees = useMemo(() => getEmployees(), [triggerRefresh]);
  const websiteLeads = useMemo(() => {
    return getWebsiteLeads();
  }, [triggerRefresh]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = websiteLeads.length;
    const newLeads = websiteLeads.filter(l => l.stage === 'New Lead').length;
    const inProgress = websiteLeads.filter(l => ['Contacted', 'Follow-Up Pending', 'Interested', 'Proposal Sent', 'Negotiation'].includes(l.stage)).length;
    const converted = websiteLeads.filter(l => ['Converted', 'Closed Won'].includes(l.stage)).length;
    const totalPipelineValue = websiteLeads.reduce((acc, l) => acc + (l.packageFee || 0), 0);

    return { total, newLeads, inProgress, converted, totalPipelineValue };
  }, [websiteLeads]);

  // Unique service and source filters
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    websiteLeads.forEach(l => {
      if (l.serviceRequired) set.add(l.serviceRequired);
    });
    return Array.from(set);
  }, [websiteLeads]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    websiteLeads.forEach(l => {
      if (l.source) set.add(l.source);
      if (l.leadSource) set.add(l.leadSource);
    });
    return Array.from(set);
  }, [websiteLeads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return websiteLeads.filter(lead => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (lead.customerName || '').toLowerCase().includes(query);
        const matchesPhone = (lead.mobile || '').toLowerCase().includes(query);
        const matchesEmail = (lead.email || '').toLowerCase().includes(query);
        const matchesCity = (lead.city || '').toLowerCase().includes(query);
        const matchesExtId = (lead.externalLeadId || '').toLowerCase().includes(query);
        const matchesService = (lead.serviceRequired || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity && !matchesExtId && !matchesService) {
          return false;
        }
      }

      // Stage
      if (selectedStage !== 'ALL' && lead.stage !== selectedStage) {
        return false;
      }

      // Source
      if (selectedSource !== 'ALL') {
        const leadSrc = lead.source || lead.leadSource || '';
        if (!leadSrc.toLowerCase().includes(selectedSource.toLowerCase())) {
          return false;
        }
      }

      // Service
      if (selectedService !== 'ALL' && lead.serviceRequired !== selectedService) {
        return false;
      }

      return true;
    });
  }, [websiteLeads, searchTerm, selectedStage, selectedSource, selectedService]);

  const handleStageChange = (leadId: string, newStage: LeadStage) => {
    try {
      updateLeadStage(leadId, newStage, sessionUser.id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update stage');
    }
  };

  const handleAssignChange = (leadId: string, newAssigneeId: string) => {
    try {
      const allLeads = getLeads();
      const idx = allLeads.findIndex(l => l.id === leadId);
      if (idx !== -1) {
        allLeads[idx] = {
          ...allLeads[idx],
          assignedTo: newAssigneeId,
          updatedAt: new Date().toISOString(),
          updatedBy: sessionUser.id
        };
        saveLeads(allLeads);
        pushToPostgres('efilingg_crm_leads', JSON.stringify(allLeads)).catch(console.warn);
        onRefreshData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign lead');
    }
  };

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulateSuccess(null);

    try {
      // Direct ingestion via helper
      const newLead = ingestWebsiteLead({
        customerName: testName,
        mobile: testPhone,
        email: testEmail,
        city: testCity,
        serviceRequired: testService,
        source: testSource,
        leadSource: `${testSource} (LEGOMARK INDIA)`,
        submissionChannel: 'service_landing_page_application_form',
        packageDetails: testPackage,
        packageFee: testFee,
        externalLeadId: `lego-${Date.now().toString(36).slice(-6)}`,
        websiteUrl: 'legomarkindia.com',
        notes: `Simulated inbound submission from legomarkindia.com: ${testPackage}`
      }, sessionUser.name);

      setSimulateSuccess(`Lead created successfully with ID: ${newLead.id} (#${newLead.externalLeadId})`);
      onRefreshData();
      setTimeout(() => {
        setSimulateSuccess(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to simulate lead');
    } finally {
      setIsSimulating(false);
    }
  };

  // Sample code snippets for API documentation
  const sampleCurl = `curl -X POST https://efilingg.cloud/api/leads/website \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${DEFAULT_WEBSITE_API_KEY}" \\
  -d '{
    "customerName": "Samita",
    "mobile": "6294685285",
    "email": "samaakhambenrai@gmail.com",
    "city": "Siliguri",
    "state": "West Bengal",
    "serviceRequired": "Trademark Registration",
    "source": "Website",
    "submissionChannel": "service_landing_page_application_form",
    "packageDetails": "Service application initiated for Trademark Registration (Growth & Compliance - ₹11,999)",
    "packageFee": 11999,
    "externalLeadId": "f1af6d40",
    "websiteUrl": "legomarkindia.com",
    "notes": "Client submitted service landing page form"
  }'`;

  const sampleJson = `{
  "customerName": "Samita",
  "mobile": "6294685285",
  "email": "samaakhambenrai@gmail.com",
  "city": "Siliguri",
  "state": "West Bengal",
  "serviceRequired": "Trademark Registration",
  "source": "Website",
  "submissionChannel": "service_landing_page_application_form",
  "packageDetails": "Service application initiated for Trademark Registration (Growth & Compliance - ₹11,999)",
  "packageFee": 11999,
  "externalLeadId": "f1af6d40",
  "websiteUrl": "legomarkindia.com",
  "notes": "Client requested trademark filing assistance."
}`;

  const sampleResponse = `{
  "success": true,
  "message": "Website lead created successfully in eFilingg CRM",
  "lead": {
    "id": "LD-2241",
    "externalLeadId": "f1af6d40",
    "customerName": "Samita",
    "mobile": "6294685285",
    "email": "samaakhambenrai@gmail.com",
    "city": "Siliguri",
    "serviceRequired": "Trademark Registration",
    "leadSource": "Website (LEGOMARK INDIA)",
    "source": "Website",
    "packageDetails": "Service application initiated for Trademark Registration (Growth & Compliance - ₹11,999)",
    "packageFee": 11999,
    "stage": "New Lead",
    "creationDate": "2026-09-10T12:29:00.000Z"
  }
}`;

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Globe className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Realtime Live Ingestion</span>
              <span className="text-slate-400">·</span>
              <span>legomarkindia.com Webhook Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Globe className="h-7 w-7 text-emerald-400" />
              Website Leads Pipeline
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Instant capture and conversion of leads coming from <strong className="text-white">legomarkindia.com</strong> frontend forms, Google Ads, and service landing pages directly into eFilingg CRM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsApiModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <Code2 className="h-4 w-4 text-emerald-400" />
              <span>API Endpoint & Credentials</span>
            </button>

            <button
              onClick={() => onTriggerLeadDetail(null)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead Manually</span>
            </button>

            <button
              onClick={onRefreshData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh leads list"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Website Leads</span>
            <Globe className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">From all online funnels</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>New / Uncontacted</span>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.newLeads}</p>
          <p className="text-[11px] text-rose-500 font-medium mt-1">Immediate action required</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>In Consultation</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.inProgress}</p>
          <p className="text-[11px] text-slate-400 mt-1">Followup / Proposals active</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Converted / Won</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.converted}</p>
          <p className="text-[11px] text-slate-400 mt-1">Clients & Work Orders</p>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span>Retainer Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
            ₹{metrics.totalPipelineValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Identified potential fee</p>
        </div>
      </div>

      {/* Quick Ingestion Test Card */}
      {simulateSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold">{simulateSuccess}</span>
          </div>
          <button
            onClick={() => setSimulateSuccess(null)}
            className="text-xs text-emerald-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, phone, email, external ID (#f1af6d40), or city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stage Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500">Stage:</span>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Stages ({websiteLeads.length})</option>
                {LEAD_STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                <option value="Website">Website (legomarkindia.com)</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Landing Page">Landing Page Application Form</option>
                {availableSources.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Service Filter */}
            {availableServices.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500">Service:</span>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Services</option>
                  {availableServices.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {(searchTerm || selectedStage !== 'ALL' || selectedSource !== 'ALL' || selectedService !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStage('ALL');
                  setSelectedSource('ALL');
                  setSelectedService('ALL');
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table / Cards List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Globe className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Website Leads Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchTerm || selectedStage !== 'ALL'
                  ? 'No leads matched your specific search filters.'
                  : 'Start receiving live leads from legomarkindia.com by integrating the webhook API endpoint.'}
              </p>
            </div>
            <button
              onClick={() => setIsApiModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm"
            >
              <Code2 className="h-4 w-4" />
              <span>View API Endpoint & Documentation</span>
            </button>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSamitaScreenshotLead = lead.externalLeadId === 'f1af6d40';
            const cleanPhone = (lead.mobile || '').replace(/\D/g, '');
            const assignedEmp = employees.find(e => e.id === lead.assignedTo);

            return (
              <div
                key={lead.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md ${
                  isSamitaScreenshotLead
                    ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Lead Identification */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* External ID badge */}
                      {lead.externalLeadId && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                          #{lead.externalLeadId}
                        </span>
                      )}

                      {/* Source badge */}
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[10px] border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {lead.leadSource || lead.source || 'Website'}
                      </span>

                      {/* Submission channel */}
                      {lead.submissionChannel && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium text-[10px] border border-indigo-200 dark:border-indigo-800">
                          {lead.submissionChannel}
                        </span>
                      )}

                      {/* Date received */}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                        <Calendar className="h-3 w-3" />
                        {lead.creationDate ? new Date(lead.creationDate).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recent'}
                      </span>
                    </div>

                    {/* Customer Name & Business */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {lead.customerName || 'Anonymous Visitor'}
                      </h4>
                      {lead.businessName && (
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {lead.businessName}
                        </span>
                      )}
                      {lead.city && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          {lead.city}{lead.state ? `, ${lead.state}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Contact Quick Triggers */}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5">
                      {lead.mobile && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                            title="Direct Phone Call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{lead.mobile}</span>
                          </a>

                          <a
                            href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=Hello%20${encodeURIComponent(lead.customerName)},%20thank%20you%20for%20contacting%20us%20regarding%20${encodeURIComponent(lead.serviceRequired || 'your enquiry')}.%20How%20can%20we%20assist%20you?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                            title="Open WhatsApp Chat"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}

                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs transition-colors"
                          title="Send Email"
                        >
                          <Mail className="h-3 w-3 text-slate-500" />
                          <span className="truncate max-w-[200px]">{lead.email}</span>
                        </a>
                      )}
                    </div>

                    {/* Service & Package Details */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          {lead.serviceRequired || 'General Service Enquiry'}
                        </span>
                        {lead.packageFee ? (
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{lead.packageFee.toLocaleString('en-IN')}
                          </span>
                        ) : null}
                      </div>

                      {lead.packageDetails && (
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          {lead.packageDetails}
                        </p>
                      )}

                      {lead.notes && lead.notes !== lead.packageDetails && (
                        <p className="text-[11px] text-slate-500 italic mt-1 border-t border-slate-200/60 dark:border-slate-800 pt-1">
                          Client Requirement: "{lead.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Status Pipeline & Work Order Conversion Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                    {/* Stage Dropdown Selector */}
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Stage</span>
                      <select
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                        className={`w-full sm:w-44 px-3 py-1.5 rounded-xl text-xs font-bold border focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                          lead.stage === 'New Lead'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900'
                            : lead.stage === 'Contacted' || lead.stage === 'Interested'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900'
                            : lead.stage === 'Converted' || lead.stage === 'Closed Won'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {LEAD_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Sales Executive */}
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Executive</span>
                      <select
                        value={lead.assignedTo || 'EMP-ADMIN'}
                        onChange={(e) => handleAssignChange(lead.id, e.target.value)}
                        className="w-full sm:w-44 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action Triggers */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto pt-1">
                      <button
                        onClick={() => onTriggerLeadDetail(lead.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        title="View Full Profile & Activity History"
                      >
                        Edit / History
                      </button>

                      <button
                        onClick={() => onOpenEnrollmentWizard(lead)}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
                        title="Convert into Client Master & Generate Work Order"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Enroll Client</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==============================================================
          API INTEGRATION MODAL / DRAWER
          ============================================================== */}
      {isApiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    Official Integration Gateway
                  </span>
                  <span className="text-xs text-slate-400">Server-to-Server Webhook</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-emerald-600" />
                  LEGOMARK INDIA Website Leads API Integration
                </h2>
              </div>
              <button
                onClick={() => setIsApiModalOpen(false)}
                className="h-8 w-8 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Quick Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">HTTP Method</span>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">POST</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Auth Type</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-200">Bearer Token / API Key</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Live & Accepting Leads
                  </p>
                </div>
              </div>

              {/* API Endpoint & Token Credentials */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  1. API Endpoint URL & Authentication
                </h3>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500">API Endpoint URL (Production):</label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-800">
                    <span className="select-all">https://efilingg.cloud/api/leads/website</span>
                    <button
                      onClick={() => handleCopy('https://efilingg.cloud/api/leads/website', 'endpoint')}
                      className="ml-2 flex items-center space-x-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
                    >
                      {copiedSection === 'endpoint' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="text-[10px]">{copiedSection === 'endpoint' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Alternative local/development URL: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 font-mono">{window.location.origin}/api/leads/website</code>
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-bold text-slate-500">Server-to-Server API Key / Bearer Token:</label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs border border-slate-800">
                    <span className="select-all">{DEFAULT_WEBSITE_API_KEY}</span>
                    <button
                      onClick={() => handleCopy(DEFAULT_WEBSITE_API_KEY, 'token')}
                      className="ml-2 flex items-center space-x-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
                    >
                      {copiedSection === 'token' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="text-[10px]">{copiedSection === 'token' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Send as header: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 font-mono">Authorization: Bearer {DEFAULT_WEBSITE_API_KEY}</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 font-mono">x-api-key: {DEFAULT_WEBSITE_API_KEY}</code>.
                  </p>
                </div>
              </div>

              {/* Supported Request Fields Table */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  2. Request Fields Specification
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">Field Name</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">Type</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">Requirement</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">Description / Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">customerName</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 font-bold text-rose-600">Required</td>
                        <td className="p-2.5">Full name of the lead (e.g. "Samita", "Rajesh Kumar")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">mobile</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 font-bold text-rose-600">Required</td>
                        <td className="p-2.5">Contact mobile number (e.g. "6294685285", "+91 75308 47878")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">email</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Business or personal email (e.g. "samaakhambenrai@gmail.com")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">serviceRequired</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Service of interest (e.g. "Trademark Registration", "Company Registration")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">source</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Marketing source tag: <strong>"Website"</strong>, <strong>"Google Ads"</strong>, or custom campaign</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">submissionChannel</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">e.g. "service_landing_page_application_form", "footer_contact"</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">city</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Jurisdiction / Location (e.g. "Siliguri", "New Delhi")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">packageDetails</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Package breakdown (e.g. "Growth & Compliance - ₹11,999")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">packageFee</td>
                        <td className="p-2.5 font-mono">number</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Amount in INR (e.g. 11999 or 29999)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">externalLeadId</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">ID from LEGOMARK admin panel (e.g. "f1af6d40")</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200">websiteUrl</td>
                        <td className="p-2.5 font-mono">string</td>
                        <td className="p-2.5 text-slate-400">Optional</td>
                        <td className="p-2.5">Origin domain (e.g. "legomarkindia.com")</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* cURL Request Sample */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">3. Sample cURL Request</h3>
                  <button
                    onClick={() => handleCopy(sampleCurl, 'curl')}
                    className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
                  >
                    {copiedSection === 'curl' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSection === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {sampleCurl}
                </pre>
              </div>

              {/* JSON Request Body */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">4. Sample JSON Payload</h3>
                  <button
                    onClick={() => handleCopy(sampleJson, 'json')}
                    className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
                  >
                    {copiedSection === 'json' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSection === 'json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {sampleJson}
                </pre>
              </div>

              {/* Success Response */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">5. Sample 201 Success Response</h3>
                  <button
                    onClick={() => handleCopy(sampleResponse, 'response')}
                    className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
                  >
                    {copiedSection === 'response' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedSection === 'response' ? 'Copied' : 'Copy Response'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-indigo-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {sampleResponse}
                </pre>
              </div>

              {/* Interactive Ingestion Simulator */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>Test Inbound Webhook Live</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Test the integration directly from your browser by firing a test lead payload:
                </p>

                <form onSubmit={handleSimulateLead} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Customer Name</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Source Tag</label>
                    <select
                      value={testSource}
                      onChange={(e) => setTestSource(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="Website">Website</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Landing Page">Landing Page</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400">Package Requirement</label>
                    <input
                      type="text"
                      value={testPackage}
                      onChange={(e) => setTestPackage(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isSimulating}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSimulating ? 'Sending Test Lead...' : 'Send Live Test Lead Now'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                eFilingg CRM · LEGOMARK INDIA Secure Ingestion Engine
              </span>
              <button
                onClick={() => setIsApiModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
