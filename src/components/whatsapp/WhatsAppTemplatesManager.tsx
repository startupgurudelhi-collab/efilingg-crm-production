/**
 * WhatsApp Template Management Module
 * Efilingg CRM Enterprise Layer (Meta WhatsApp Cloud API)
 *
 * Full lifecycle manager for Meta Cloud API Message Templates:
 * - Create, Edit, Delete, Duplicate templates
 * - Real-time sync with Meta Graph API (every 15 mins + on-demand)
 * - Approval Status tracking (APPROVED, PENDING, REJECTED, PAUSED, DRAFT)
 * - Exact Meta rejection reasons & remediation engine
 * - Test send with custom parameter variables
 * - Default task and lead intimation bindings
 * - Audit logs, versioning, and role-based permissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Copy,
  Trash2,
  Edit,
  History,
  Shield,
  Star,
  Smartphone,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Layers,
  MessageSquare,
  Lock,
  PauseCircle,
  FileText,
} from 'lucide-react';
import {
  WhatsAppTemplate,
  WhatsAppTemplateStatus,
  WhatsAppTemplateCategory,
  WhatsAppTemplateAuditLog,
} from '../../lib/whatsapp/templateTypes';
import { WhatsAppTemplateRepository } from '../../lib/whatsapp/templateRepository';
import { MetaTemplateService } from '../../lib/whatsapp/metaTemplateService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { TemplateTestSendModal } from './TemplateTestSendModal';
import { TemplateRejectionViewerModal } from './TemplateRejectionViewerModal';
import { TemplateAuditLogDrawer } from './TemplateAuditLogDrawer';

interface WhatsAppTemplatesManagerProps {
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

export const WhatsAppTemplatesManager: React.FC<WhatsAppTemplatesManagerProps> = ({
  currentUser = {
    id: 'EMP-ADMIN',
    name: 'Master Administrator',
    role: 'Super Admin',
  },
}) => {
  const isSuperAdmin =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Admin' ||
    currentUser.id === 'EMP-ADMIN' ||
    currentUser.id === '1' ||
    currentUser.id === 'admin';

  const isManager = isSuperAdmin || currentUser.role.toLowerCase().includes('manager') || currentUser.role.toLowerCase().includes('lead');

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<WhatsAppTemplateAuditLog[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);

  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<WhatsAppTemplate | null>(null);

  const [isRejectionOpen, setIsRejectionOpen] = useState(false);
  const [rejectedTemplate, setRejectedTemplate] = useState<WhatsAppTemplate | null>(null);

  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // Load data from repository
  const loadData = useCallback(() => {
    const data = WhatsAppTemplateRepository.getTemplates();
    setTemplates([...data]);
    setAuditLogs(WhatsAppTemplateRepository.getAuditLogs());
    setLastSyncedAt(WhatsAppTemplateRepository.getLastSyncedTimestamp());
  }, []);

  useEffect(() => {
    loadData();
    // Initialize 15-minute background sync
    WhatsAppTemplateRepository.initBackgroundSync(currentUser);
  }, [loadData, currentUser]);

  // Sync from Meta
  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    setBannerNotice(null);
    try {
      const res = await WhatsAppTemplateRepository.syncFromMeta(currentUser);
      loadData();
      setBannerNotice({
        type: 'success',
        message: `Synced ${res.syncedCount} templates from Meta Cloud API (${res.statusBreakdown.APPROVED} Approved, ${res.statusBreakdown.PENDING} Pending, ${res.statusBreakdown.REJECTED} Rejected).`,
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to sync templates from Meta Cloud API.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Create or Update template
  const handleSaveTemplate = async (templateData: any, submitToMeta: boolean) => {
    const res = await WhatsAppTemplateRepository.saveTemplate(templateData, currentUser, submitToMeta);
    loadData();
    setBannerNotice({
      type: 'success',
      message: res.message,
    });
  };

  // Duplicate template
  const handleDuplicateTemplate = (tmplId: string) => {
    const res = WhatsAppTemplateRepository.duplicateTemplate(tmplId, currentUser);
    if (res.success) {
      loadData();
      setBannerNotice({
        type: 'success',
        message: `Template duplicated successfully as draft: "${res.template?.name}"`,
      });
    }
  };

  // Delete template
  const handleDeleteTemplate = async (tmplId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}" from CRM and Meta Cloud API?`)) {
      return;
    }
    const res = await WhatsAppTemplateRepository.deleteTemplate(tmplId, currentUser);
    if (res.success) {
      loadData();
      setBannerNotice({
        type: 'success',
        message: res.message,
      });
    }
  };

  // Set default binding (Task / Lead)
  const handleSetDefault = (type: 'TASK' | 'LEAD' | 'COMPLIANCE', tmplId: string) => {
    const res = WhatsAppTemplateRepository.setDefaultBinding(type, tmplId, currentUser);
    if (res.success) {
      loadData();
      setBannerNotice({
        type: 'success',
        message: res.message,
      });
    }
  };

  // Test Send
  const handleSendTestMessage = async (toPhone: string, parameters: string[]) => {
    if (!testingTemplate) return { success: false, error: 'No template selected' };
    const res = await MetaTemplateService.sendTestTemplate({
      toPhone,
      template: testingTemplate,
      parameters,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });

    WhatsAppTemplateRepository.recordAuditLog({
      templateId: testingTemplate.id,
      templateName: testingTemplate.name,
      action: 'TEST_SENT',
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      role: currentUser.role,
      details: `Dispatched test send of "${testingTemplate.name}" to ${toPhone} (Status: ${
        res.success ? 'Delivered' : 'Failed'
      })`,
    });

    loadData();
    return {
      success: res.success,
      messageId: res.messageId,
      error: res.providerErrorMessage,
    };
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bodyText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.headerText && t.headerText.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: templates.length,
    approved: templates.filter((t) => t.status === 'APPROVED').length,
    pending: templates.filter((t) => t.status === 'PENDING').length,
    rejected: templates.filter((t) => t.status === 'REJECTED').length,
    paused: templates.filter((t) => t.status === 'PAUSED').length,
    draft: templates.filter((t) => t.status === 'DRAFT').length,
  };

  const getStatusBadge = (status: WhatsAppTemplateStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>APPROVED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>PENDING META REVIEW</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span>REJECTED</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <PauseCircle className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span>PAUSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>DRAFT</span>
          </span>
        );
    }
  };

  const getQualityBadge = (score?: string) => {
    if (score === 'GREEN') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
          🟢 High Quality
        </span>
      );
    }
    if (score === 'YELLOW') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
          🟡 Medium Quality
        </span>
      );
    }
    if (score === 'RED') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50">
          🔴 Low Quality
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Notice */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {bannerNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerNotice.message}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Module Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    WhatsApp Templates
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Meta Cloud API
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sales & Marketing &bull; Meta WhatsApp Business Message Templates Catalog & Auto-Sync Engine
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Meta Live Connection Status */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">WABA: Connected</span>
              <span className="text-[10px] text-slate-400 font-mono">(15m Auto-Sync Active)</span>
            </div>

            {/* Audit Logs */}
            <button
              type="button"
              onClick={() => setIsAuditDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <History className="h-4 w-4" />
              <span>Audit Logs</span>
            </button>

            {/* Sync from Meta Button */}
            <button
              type="button"
              onClick={handleSyncFromMeta}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync From Meta'}</span>
            </button>

            {/* Create Template Button (Super Admin Only) */}
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Create Template</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold">
                <Lock className="h-3.5 w-3.5" />
                <span>Super Admin Create Only</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Templates</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Approved
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.approved}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Review
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats.pending}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/60">
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Rejected
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{stats.rejected}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60">
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Paused
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{stats.paused}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Synced</div>
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Just now'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters, Search & Categories */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, body text, or parameters..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {['ALL', 'UTILITY', 'MARKETING', 'AUTHENTICATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                selectedStatus === st
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No WhatsApp templates found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search criteria or click "Create Template" to add a new Meta pre-approved message.
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 group"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {template.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        v{template.version}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {template.category}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                      <span className="text-[11px] text-slate-500 font-mono">{template.language || 'en_US'}</span>
                      {getQualityBadge(template.metaQualityScore)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {getStatusBadge(template.status)}
                    {template.metaTemplateId && (
                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[120px]">
                        ID: {template.metaTemplateId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Default Bindings Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {template.isDefaultTaskTemplate && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
                      <span>Default Task Intimation</span>
                    </span>
                  )}
                  {template.isDefaultLeadTemplate && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>Default Lead Welcome</span>
                    </span>
                  )}
                  {template.isDefaultComplianceTemplate && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      <Star className="h-3 w-3 fill-teal-500 text-teal-500" />
                      <span>Default Compliance Filing Alert</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body - Content Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                {template.headerText && (
                  <div className="text-xs font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                    {template.headerText}
                  </div>
                )}

                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {template.bodyText}
                </div>

                {template.footerText && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    {template.footerText}
                  </div>
                )}

                {/* Buttons list */}
                {template.buttons && template.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {template.buttons.map((b, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400"
                      >
                        🔘 {b.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejection Warning Banner */}
              {template.status === 'REJECTED' && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-rose-800 dark:text-rose-300 font-semibold truncate">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span className="truncate">Meta Rejection Feedback Available</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectedTemplate(template);
                      setIsRejectionOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                  >
                    View Reason & Fix
                  </button>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Left Side: Test Send & Duplicate */}
                <div className="flex items-center space-x-1.5">
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setTestingTemplate(template);
                        setIsTestSendOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Test Send</span>
                    </button>
                  )}

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(template.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Duplicate Template"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Right Side: Admin Bindings & Edit/Delete */}
                {isSuperAdmin && (
                  <div className="flex items-center space-x-1.5">
                    {/* Default Task Toggle */}
                    {!template.isDefaultTaskTemplate && template.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault('TASK', template.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        title="Set as default template for task assignments"
                      >
                        Set Default Task
                      </button>
                    )}

                    {/* Default Lead Toggle */}
                    {!template.isDefaultLeadTemplate && template.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault('LEAD', template.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        title="Set as default template for new lead welcome"
                      >
                        Set Default Lead
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(template);
                        setIsEditorOpen(true);
                      }}
                      className="p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                      title="Edit Template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals & Drawers */}
      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        template={editingTemplate}
        onSave={handleSaveTemplate}
        currentUser={currentUser}
        isSuperAdmin={isSuperAdmin}
      />

      <TemplateTestSendModal
        isOpen={isTestSendOpen}
        onClose={() => setIsTestSendOpen(false)}
        template={testingTemplate}
        onSendTest={handleSendTestMessage}
      />

      <TemplateRejectionViewerModal
        isOpen={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        template={rejectedTemplate}
        onFixAndResubmit={(tmpl) => {
          setEditingTemplate(tmpl);
          setIsEditorOpen(true);
        }}
        isSuperAdmin={isSuperAdmin}
      />

      <TemplateAuditLogDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        logs={auditLogs}
      />
    </div>
  );
};
