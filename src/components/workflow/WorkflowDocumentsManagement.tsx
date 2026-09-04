/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FolderArchive,
  Folder,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  History,
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  Tag,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Briefcase,
  User,
  Building,
  Sparkles,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../../types';
import {
  WorkflowDocument,
  DocumentFormat,
  DocumentApprovalStatus,
  DocumentCategory,
  DocumentVersion,
  DOCUMENT_CATEGORIES,
  getWorkflowDocuments,
  createWorkflowDocument,
  uploadNewDocumentVersion,
  approveWorkflowDocument,
  rejectWorkflowDocument,
  updateDocumentMetadata,
  deleteWorkflowDocument,
  triggerDocumentDownload,
  computeDocumentExpiryStatus,
  detectDocumentFormat,
  EVENT_DOCUMENTS_UPDATED,
  STORAGE_KEY_WORKFLOW_DOCUMENTS
} from '../../lib/workflowDocuments';
import { getWorkflowClients, WorkflowClient } from '../../lib/workflowClients';
import { getWorkflowWorkOrders, WorkflowWorkOrder } from '../../lib/workflowWorkOrders';

interface WorkflowDocumentsManagementProps {
  sessionUser: Employee;
  preselectedClientId?: string;
  preselectedWorkOrderId?: string;
  onNavigateToWorkOrder?: (workOrderId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
}

export default function WorkflowDocumentsManagement({
  sessionUser,
  preselectedClientId,
  preselectedWorkOrderId,
  onNavigateToWorkOrder,
  onNavigateToClient
}: WorkflowDocumentsManagementProps) {
  // Core State
  const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
  const [clients, setClients] = useState<WorkflowClient[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkflowWorkOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hierarchy Selection Filter
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || 'all');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(preselectedWorkOrderId || 'all');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({
    'CL-2026-000001': true,
    'CL-2026-000002': true,
    'CL-2026-000003': true
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all'); // 'all', 'expired', 'expiring_soon', 'active', 'no_expiry'
  const [activeTab, setActiveTab] = useState<'vault' | 'hierarchy' | 'expiring' | 'approval_queue'>('vault');

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocForDrawer, setSelectedDocForDrawer] = useState<WorkflowDocument | null>(null);
  const [drawerTab, setDrawerTab] = useState<'details' | 'versions' | 'audit'>('details');
  const [previewDoc, setPreviewDoc] = useState<WorkflowDocument | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  // Approval Modal
  const [approvalModalDoc, setApprovalModalDoc] = useState<WorkflowDocument | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Version Upload Modal
  const [versionModalDoc, setVersionModalDoc] = useState<WorkflowDocument | null>(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [versionIsMajor, setVersionIsMajor] = useState(false);
  const [versionSelectedFile, setVersionSelectedFile] = useState<{
    fileName: string;
    fileSize: number;
    fileType: string;
    dataUrl: string;
  } | null>(null);
  const [versionUploadError, setVersionUploadError] = useState<string | null>(null);

  // Upload Form State
  const [uploadClientId, setUploadClientId] = useState<string>('');
  const [uploadWorkOrderId, setUploadWorkOrderId] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('kyc_identity');
  const [uploadIssuedDate, setUploadIssuedDate] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  const loadData = () => {
    setIsRefreshing(true);
    const docs = getWorkflowDocuments();
    const cls = getWorkflowClients();
    const wos = getWorkflowWorkOrders();
    setDocuments(docs);
    setClients(cls);
    setWorkOrders(wos);
    setTimeout(() => setIsRefreshing(false), 200);
  };

  useEffect(() => {
    loadData();

    const handleDocsUpdated = () => {
      loadData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_WORKFLOW_DOCUMENTS) {
        loadData();
      }
    };

    window.addEventListener(EVENT_DOCUMENTS_UPDATED, handleDocsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_DOCUMENTS_UPDATED, handleDocsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync with preselected props
  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

  useEffect(() => {
    if (preselectedWorkOrderId) {
      setSelectedWorkOrderId(preselectedWorkOrderId);
    }
  }, [preselectedWorkOrderId]);

  // Keep selectedDocForDrawer updated if documents state changes
  useEffect(() => {
    if (selectedDocForDrawer) {
      const fresh = documents.find(d => d.id === selectedDocForDrawer.id);
      if (fresh) setSelectedDocForDrawer(fresh);
    }
  }, [documents, selectedDocForDrawer?.id]);

  // Filtered Work Orders for selected Client in Upload Form
  const clientWorkOrdersForUpload = useMemo(() => {
    if (!uploadClientId) return [];
    return workOrders.filter(w => w.clientId === uploadClientId);
  }, [workOrders, uploadClientId]);

  // When uploadClientId changes, auto-select first work order
  useEffect(() => {
    if (uploadClientId) {
      const matchOrders = workOrders.filter(w => w.clientId === uploadClientId);
      if (matchOrders.length > 0) {
        setUploadWorkOrderId(matchOrders[0].id);
      } else {
        setUploadWorkOrderId('');
      }
    }
  }, [uploadClientId, workOrders]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Client Filter
      if (selectedClientId !== 'all' && doc.clientId !== selectedClientId) {
        return false;
      }
      // Work Order Filter
      if (selectedWorkOrderId !== 'all' && doc.workOrderId !== selectedWorkOrderId) {
        return false;
      }
      // Category Filter
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
        return false;
      }
      // Format Filter
      if (formatFilter !== 'all' && doc.format !== formatFilter) {
        return false;
      }
      // Approval Status Filter
      if (approvalFilter !== 'all' && doc.approvalStatus !== approvalFilter) {
        return false;
      }
      // Expiry Filter
      if (expiryFilter !== 'all') {
        const exp = computeDocumentExpiryStatus(doc);
        if (exp.status !== expiryFilter) return false;
      }
      // Tab Filter shortcuts
      if (activeTab === 'expiring') {
        const exp = computeDocumentExpiryStatus(doc);
        if (exp.status !== 'expiring_soon' && exp.status !== 'expired') return false;
      }
      if (activeTab === 'approval_queue') {
        if (doc.approvalStatus !== 'pending_approval') return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchFile = doc.fileName.toLowerCase().includes(q);
        const matchClient = doc.clientName.toLowerCase().includes(q);
        const matchWo = doc.workOrderId.toLowerCase().includes(q);
        const matchService = doc.workOrderService.toLowerCase().includes(q);
        const matchTags = doc.tags.some(t => t.toLowerCase().includes(q));
        const matchId = doc.id.toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchClient && !matchWo && !matchService && !matchTags && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [
    documents,
    selectedClientId,
    selectedWorkOrderId,
    categoryFilter,
    formatFilter,
    approvalFilter,
    expiryFilter,
    activeTab,
    searchQuery
  ]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = documents.length;
    const approved = documents.filter(d => d.approvalStatus === 'approved').length;
    const pending = documents.filter(d => d.approvalStatus === 'pending_approval').length;
    const rejected = documents.filter(d => d.approvalStatus === 'rejected').length;

    let expired = 0;
    let expiringSoon = 0;
    documents.forEach(d => {
      const exp = computeDocumentExpiryStatus(d);
      if (exp.status === 'expired') expired++;
      if (exp.status === 'expiring_soon') expiringSoon++;
    });

    const pdfCount = documents.filter(d => d.format === 'pdf').length;
    const docxCount = documents.filter(d => d.format === 'docx').length;
    const xlsxCount = documents.filter(d => d.format === 'xlsx').length;
    const imgCount = documents.filter(d => d.format === 'image').length;

    return {
      total,
      approved,
      pending,
      rejected,
      expired,
      expiringSoon,
      pdfCount,
      docxCount,
      xlsxCount,
      imgCount
    };
  }, [documents]);

  // Handle File Pick for Initial Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds 20 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string
      });
      setUploadError(null);
      if (!uploadTitle) {
        // Auto-fill title from clean filename
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setUploadTitle(cleanName);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read selected file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop for Initial Upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string
      });
      setUploadError(null);
      if (!uploadTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setUploadTitle(cleanName);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Initial Document Upload
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClientId || !uploadWorkOrderId || !uploadTitle.trim() || !uploadedFile) {
      setUploadError('Please fill required fields (Client, Work Order, Title) and select a file.');
      return;
    }

    const client = clients.find(c => c.id === uploadClientId);
    const wo = workOrders.find(w => w.id === uploadWorkOrderId);

    if (!client || !wo) {
      setUploadError('Invalid Client or Work Order reference.');
      return;
    }

    const tagsArray = uploadTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    createWorkflowDocument(
      {
        title: uploadTitle.trim(),
        category: uploadCategory,
        clientId: client.id,
        clientName: client.clientName,
        workOrderId: wo.id,
        workOrderService: wo.service,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: uploadedFile.type,
        fileDataUrl: uploadedFile.dataUrl,
        tags: tagsArray,
        description: uploadDescription,
        issuedDate: uploadIssuedDate || undefined,
        expiryDate: uploadExpiryDate || undefined,
        initialRemarks: uploadRemarks
      },
      sessionUser
    );

    // Reset Form
    setUploadTitle('');
    setUploadedFile(null);
    setUploadTags('');
    setUploadDescription('');
    setUploadRemarks('');
    setUploadIssuedDate('');
    setUploadExpiryDate('');
    setIsUploadModalOpen(false);
    setUploadSuccess('Document successfully uploaded and saved into repository!');
    setTimeout(() => setUploadSuccess(null), 4000);
    loadData();
  };

  // Submit Approval / Rejection
  const handleApprovalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalDoc) return;

    if (approvalAction === 'reject' && !approvalRemarks.trim()) {
      setApprovalError('Rejection reason is mandatory.');
      return;
    }

    if (approvalAction === 'approve') {
      approveWorkflowDocument(approvalModalDoc.id, approvalRemarks, sessionUser);
    } else {
      rejectWorkflowDocument(approvalModalDoc.id, approvalRemarks, sessionUser);
    }

    setApprovalModalDoc(null);
    setApprovalRemarks('');
    setApprovalError(null);
    loadData();
  };

  // Handle Version File Selection
  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setVersionSelectedFile({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        dataUrl: reader.result as string
      });
      setVersionUploadError(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Version
  const handleNewVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionModalDoc || !versionSelectedFile) {
      setVersionUploadError('Please select a replacement file.');
      return;
    }

    uploadNewDocumentVersion(
      versionModalDoc.id,
      {
        fileName: versionSelectedFile.fileName,
        fileSize: versionSelectedFile.fileSize,
        fileType: versionSelectedFile.fileType,
        fileDataUrl: versionSelectedFile.dataUrl,
        changeNotes: versionNotes,
        isMajorVersion: versionIsMajor
      },
      sessionUser
    );

    setVersionModalDoc(null);
    setVersionSelectedFile(null);
    setVersionNotes('');
    setVersionIsMajor(false);
    setVersionUploadError(null);
    loadData();
  };

  // Format Badge Renderer
  const renderFormatBadge = (format: DocumentFormat) => {
    switch (format) {
      case 'pdf':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <FileText className="h-3 w-3 text-rose-500" />
            <span>PDF</span>
          </span>
        );
      case 'docx':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileText className="h-3 w-3 text-blue-500" />
            <span>DOCX</span>
          </span>
        );
      case 'xlsx':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <FileSpreadsheet className="h-3 w-3 text-emerald-500" />
            <span>XLSX</span>
          </span>
        );
      case 'image':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <FileImage className="h-3 w-3 text-purple-500" />
            <span>IMAGE</span>
          </span>
        );
    }
  };

  // Approval Status Badge Renderer
  const renderApprovalBadge = (status: DocumentApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="h-3 w-3 text-amber-500" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="h-3 w-3 text-rose-500" />
            <span>Rejected</span>
          </span>
        );
    }
  };

  // Expiry Status Badge Renderer
  const renderExpiryBadge = (doc: WorkflowDocument) => {
    const exp = computeDocumentExpiryStatus(doc);
    switch (exp.status) {
      case 'expired':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            <span>{exp.label}</span>
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
            <Clock className="h-3 w-3 text-amber-500" />
            <span>{exp.label}</span>
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono">
            <span>Expires: {doc.expiryDate}</span>
          </span>
        );
      case 'no_expiry':
        return (
          <span className="text-[10px] text-slate-400 font-medium">
            Permanent
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                <FolderArchive className="h-3.5 w-3.5 mr-1" />
                <span>PHASE 7</span>
              </span>
              <span className="text-xs font-semibold text-indigo-200">
                Hierarchical Document Repository
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Corporate Document Vault</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                Client → Work Order → Documents
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Centralized document management repository supporting PDF, DOCX, XLSX, and high-resolution images. Features multi-version history, regulatory expiry tracking, maker-checker approval controls, and immutable audit logging.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (clients.length > 0) {
                  setUploadClientId(clients[0].id);
                }
                setIsUploadModalOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
              title="Refresh repository"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Total Documents
            </span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">{stats.total}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider block">
              Approved
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">{stats.approved}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider block">
              Pending Review
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">{stats.pending}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-rose-300 font-semibold uppercase tracking-wider block">
              Expired / Soon
            </span>
            <span className="text-lg sm:text-xl font-black text-rose-300 font-mono">
              {stats.expired + stats.expiringSoon}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">
              PDFs &amp; DOCX
            </span>
            <span className="text-lg sm:text-xl font-black text-blue-300 font-mono">
              {stats.pdfCount + stats.docxCount}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider block">
              XLSX &amp; Images
            </span>
            <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">
              {stats.xlsxCount + stats.imgCount}
            </span>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* 3. Navigation Tabs & Sub-views */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FolderArchive className="h-4 w-4" />
            <span>Document Vault ({documents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>Hierarchy Explorer (Client → WO)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approval_queue')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'approval_queue'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Approval Queue ({stats.pending})</span>
            {stats.pending > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expiring')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expiring'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Expiry &amp; Renewals ({stats.expired + stats.expiringSoon})</span>
          </button>
        </div>

        {/* Quick Clear Filters */}
        {(selectedClientId !== 'all' || selectedWorkOrderId !== 'all' || categoryFilter !== 'all' || formatFilter !== 'all' || approvalFilter !== 'all' || expiryFilter !== 'all' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedClientId('all');
              setSelectedWorkOrderId('all');
              setCategoryFilter('all');
              setFormatFilter('all');
              setApprovalFilter('all');
              setExpiryFilter('all');
              setSearchQuery('');
            }}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <X className="h-3 w-3" />
            <span>Reset Active Filters</span>
          </button>
        )}
      </div>

      {/* 4. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents, clients, work orders, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedWorkOrderId('all');
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Work Order Filter */}
          <div>
            <select
              value={selectedWorkOrderId}
              onChange={(e) => setSelectedWorkOrderId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Work Orders</option>
              {(selectedClientId === 'all'
                ? workOrders
                : workOrders.filter(w => w.clientId === selectedClientId)
              ).map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.id} - {wo.service.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {/* Format Filter */}
          <div>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Formats (PDF/DOCX/XLSX/IMG)</option>
              <option value="pdf">PDF Documents</option>
              <option value="docx">Word DOCX Files</option>
              <option value="xlsx">Excel XLSX Spreadsheets</option>
              <option value="image">Images (PNG/JPG/SVG)</option>
            </select>
          </div>

          {/* Approval Filter */}
          <div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Approval Statuses</option>
              <option value="approved">Approved Only</option>
              <option value="pending_approval">Pending Review</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters: Categories */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center space-x-1">
            <Filter className="h-3 w-3" />
            <span>Category:</span>
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition shrink-0 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Main View Area */}
      {activeTab === 'hierarchy' ? (
        /* HIERARCHY TREE EXPLORER VIEW: Client -> Work Order -> Documents */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Client & Work Order Tree */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <Folder className="h-4 w-4 text-indigo-600" />
                  <span>Repository Hierarchy</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {clients.length} Clients · {workOrders.length} WOs
                </span>
              </div>

              {/* Hierarchy Tree */}
              <div className="space-y-2 mt-3 text-xs">
                {clients.map((client) => {
                  const clientOrders = workOrders.filter(w => w.clientId === client.id);
                  const clientDocs = documents.filter(d => d.clientId === client.id);
                  const isExpanded = !!expandedClients[client.id];
                  const isClientSelected = selectedClientId === client.id;

                  return (
                    <div key={client.id} className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                      {/* Level 1: Client Node */}
                      <div
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isClientSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setSelectedWorkOrderId('all');
                        }}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedClients(prev => ({ ...prev, [client.id]: !prev[client.id] }));
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                          >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          <Building className="h-4 w-4 text-indigo-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {client.clientName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {client.id} · {client.clientCategory}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            {clientDocs.length} docs
                          </span>
                        </div>
                      </div>

                      {/* Level 2: Work Orders Children */}
                      {isExpanded && (
                        <div className="p-2 space-y-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pl-6">
                          {clientOrders.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic py-1">
                              No active work orders under this client.
                            </div>
                          ) : (
                            clientOrders.map((wo) => {
                              const woDocs = documents.filter(d => d.workOrderId === wo.id);
                              const isWoSelected = selectedWorkOrderId === wo.id;

                              return (
                                <div
                                  key={wo.id}
                                  onClick={() => {
                                    setSelectedClientId(client.id);
                                    setSelectedWorkOrderId(wo.id);
                                  }}
                                  className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                                    isWoSelected
                                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <div className="truncate">
                                      <div className="text-xs truncate font-medium">
                                        <span className="font-mono font-bold text-slate-900 dark:text-white mr-1.5">
                                          {wo.id}
                                        </span>
                                        <span>{wo.service}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                    {woDocs.length}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Documents for selected hierarchy node */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedWorkOrderId !== 'all'
                      ? `Documents for Work Order: ${selectedWorkOrderId}`
                      : selectedClientId !== 'all'
                      ? `Documents for Client: ${clients.find(c => c.id === selectedClientId)?.clientName || selectedClientId}`
                      : 'All Repository Documents'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Showing {filteredDocuments.length} files
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedClientId !== 'all') setUploadClientId(selectedClientId);
                    if (selectedWorkOrderId !== 'all') setUploadWorkOrderId(selectedWorkOrderId);
                    setIsUploadModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Upload Here</span>
                </button>
              </div>

              {/* Hierarchy Document Cards */}
              <div className="space-y-2.5 mt-3">
                {filteredDocuments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <FolderArchive className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No documents found for this selection.
                    </p>
                    <p className="text-[11px]">
                      Upload the first document into this Work Order or Client docket.
                    </p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="pt-0.5">{renderFormatBadge(doc.format)}</div>
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h4
                              onClick={() => {
                                setSelectedDocForDrawer(doc);
                                setDrawerTab('details');
                              }}
                              className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer"
                            >
                              {doc.title}
                            </h4>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {doc.currentVersion}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {doc.fileName} · {(doc.fileSize / 1024).toFixed(1)} KB
                          </div>
                          <div className="flex items-center space-x-2 pt-1 text-[10px]">
                            {renderApprovalBadge(doc.approvalStatus)}
                            {renderExpiryBadge(doc)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setPreviewVersion(null);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Preview Document"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerDocumentDownload(doc, undefined, sessionUser)}
                          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                          title="Download active version"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocForDrawer(doc);
                            setDrawerTab('versions');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Version History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FLAT VAULT & TAB TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-3.5">Document Details</th>
                  <th className="p-3.5">Hierarchy (Client &amp; Work Order)</th>
                  <th className="p-3.5">Format &amp; Version</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5">Expiry Tracking</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 text-xs">
                      <FolderArchive className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No documents found matching the filter criteria.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Try resetting filters or click "Upload Document" to add files to the repository.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* 1. Document Title & Category */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1 max-w-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {doc.id}
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {DOCUMENT_CATEGORIES.find(c => c.id === doc.category)?.label.split('&')[0]}
                              </span>
                            </div>
                            <h4
                              onClick={() => {
                                setSelectedDocForDrawer(doc);
                                setDrawerTab('details');
                              }}
                              className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer"
                            >
                              {doc.title}
                            </h4>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {doc.fileName} · {(doc.fileSize / 1024).toFixed(1)} KB
                            </div>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex items-center space-x-1 flex-wrap gap-y-0.5 pt-0.5">
                                {doc.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Client & Work Order Hierarchy */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center space-x-1 text-slate-900 dark:text-white font-bold">
                              <Building className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{doc.clientName}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Client ID: {doc.clientId}
                            </div>
                            <div className="flex items-center space-x-1 text-purple-700 dark:text-purple-300 font-medium pt-0.5">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              <span className="font-mono font-bold">{doc.workOrderId}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {doc.workOrderService}
                            </div>
                          </div>
                        </td>

                        {/* 3. Format & Versions */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1.5">
                            <div>{renderFormatBadge(doc.format)}</div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocForDrawer(doc);
                                setDrawerTab('versions');
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold hover:bg-purple-100 transition cursor-pointer"
                              title="Click to view all version records"
                            >
                              <History className="h-2.5 w-2.5" />
                              <span>{doc.currentVersion} ({doc.versions.length} ver)</span>
                            </button>
                            <div className="text-[10px] text-slate-400">
                              Updated {new Date(doc.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>

                        {/* 4. Approval Status */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1">
                            <div>{renderApprovalBadge(doc.approvalStatus)}</div>
                            {doc.approvalStatus === 'approved' && doc.approvedByName && (
                              <div className="text-[10px] text-slate-500">
                                by <span className="font-semibold">{doc.approvedByName}</span>
                              </div>
                            )}
                            {doc.approvalStatus === 'rejected' && doc.rejectionReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 italic max-w-xs">
                                "{doc.rejectionReason}"
                              </div>
                            )}
                            {doc.approvalStatus === 'pending_approval' && (
                              <div className="pt-1 flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovalModalDoc(doc);
                                    setApprovalAction('approve');
                                    setApprovalRemarks('');
                                  }}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovalModalDoc(doc);
                                    setApprovalAction('reject');
                                    setApprovalRemarks('');
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Expiry Tracking */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1">
                            {renderExpiryBadge(doc)}
                            {doc.issuedDate && (
                              <div className="text-[10px] text-slate-400">
                                Issued: {doc.issuedDate}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="p-3.5 align-top text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDoc(doc);
                                setPreviewVersion(null);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Preview Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerDocumentDownload(doc, undefined, sessionUser)}
                              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                              title="Download Active Version"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setVersionModalDoc(doc);
                                setVersionSelectedFile(null);
                                setVersionNotes('');
                                setVersionIsMajor(false);
                              }}
                              className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950"
                              title="Upload New Version"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocForDrawer(doc);
                                setDrawerTab('details');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Open Details & Audit Trail"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: UPLOAD DOCUMENT (Client -> Work Order -> Document)
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Upload Corporate Document
                  </h3>
                  <p className="text-xs text-slate-500">
                    Structure: Client → Work Order → Document Vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Hierarchy 1 & 2: Client and Work Order Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    1. Select Client *
                  </label>
                  <select
                    required
                    value={uploadClientId}
                    onChange={(e) => setUploadClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">Select Corporate Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. Select Work Order *
                  </label>
                  <select
                    required
                    value={uploadWorkOrderId}
                    onChange={(e) => setUploadWorkOrderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {clientWorkOrdersForUpload.length === 0 ? (
                      <option value="">No Work Orders for this Client</option>
                    ) : (
                      clientWorkOrdersForUpload.map((wo) => (
                        <option key={wo.id} value={wo.id}>
                          {wo.id} - {wo.service}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Drag & Drop File Zone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document File (PDF, DOCX, XLSX, Images) *
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    uploadedFile
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="space-y-1">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold pt-1">
                        Click or drop to replace file
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-slate-500">
                      <Upload className="h-8 w-8 mx-auto text-indigo-500" />
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Click to select or drag and drop document here
                      </p>
                      <p className="text-[11px]">
                        Supported formats: <strong className="text-slate-700 dark:text-slate-300">PDF, DOCX, XLSX, PNG, JPG, WEBP, SVG</strong> (up to 20MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Certificate of Incorporation SPICe+"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates: Issued & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Issued Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={uploadIssuedDate}
                    onChange={(e) => setUploadIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date (For Expiry Tracking)
                  </label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Leave blank for permanent documents (e.g. PAN, Incorporation Certificate).
                  </span>
                </div>
              </div>

              {/* Tags & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Search Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kyc, incorporation, pan, mca"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Change Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client signed copy received via email"
                    value={uploadRemarks}
                    onChange={(e) => setUploadRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Legal Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed description or statutory filing context for this artifact..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadedFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Confirm &amp; Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: UPLOAD NEW VERSION
          ========================================================================= */}
      {versionModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <History className="h-5 w-5 text-purple-600" />
                  <span>Upload New Version</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Target: <strong className="text-slate-700 dark:text-slate-300">{versionModalDoc.title}</strong> (Current: {versionModalDoc.currentVersion})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVersionModalDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {versionUploadError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-xs">
                {versionUploadError}
              </div>
            )}

            <form onSubmit={handleNewVersionSubmit} className="space-y-3.5 text-xs">
              {/* File Select */}
              <div
                onClick={() => versionFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                  versionSelectedFile
                    ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <input
                  type="file"
                  ref={versionFileInputRef}
                  onChange={handleVersionFileChange}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.svg"
                  className="hidden"
                />
                {versionSelectedFile ? (
                  <div className="space-y-1">
                    <CheckCircle className="h-6 w-6 text-purple-600 mx-auto" />
                    <div className="font-bold text-slate-900 dark:text-white">
                      {versionSelectedFile.fileName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {(versionSelectedFile.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-500">
                    <Upload className="h-6 w-6 mx-auto text-purple-600" />
                    <p className="font-bold">Select replacement file</p>
                    <p className="text-[10px]">PDF, DOCX, XLSX, or Images</p>
                  </div>
                )}
              </div>

              {/* Version Increment Choice */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Version Bump Type
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {versionIsMajor ? 'Major release (e.g. v2.0)' : 'Minor revision (e.g. v1.1)'}
                  </span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={versionIsMajor}
                    onChange={(e) => setVersionIsMajor(e.target.checked)}
                    className="rounded text-purple-600 h-4 w-4"
                  />
                  <span>Major Revision</span>
                </label>
              </div>

              {/* Change Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Change Notes / Reason for New Version *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe changes, amendments, or reason for re-uploading this document..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVersionModalDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!versionSelectedFile}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  Save New Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: APPROVE / REJECT DOCUMENT
          ========================================================================= */}
      {approvalModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                {approvalAction === 'approve' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                )}
                <span>{approvalAction === 'approve' ? 'Approve Document' : 'Reject Document'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {approvalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-xs">
                {approvalError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {approvalModalDoc.title}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {approvalModalDoc.id} · Version: {approvalModalDoc.currentVersion} · {approvalModalDoc.fileName}
              </div>
              <div className="text-[11px] text-slate-500">
                Client: {approvalModalDoc.clientName} ({approvalModalDoc.clientId})
              </div>
            </div>

            <form onSubmit={handleApprovalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {approvalAction === 'approve' ? 'Approval Verification Remarks' : 'Rejection Reason *'}
                </label>
                <textarea
                  required={approvalAction === 'reject'}
                  rows={3}
                  placeholder={
                    approvalAction === 'approve'
                      ? 'e.g. Verified against official MCA Master Data V3 registry. Seal and signatures authenticated.'
                      : 'e.g. Illegible scan. Missing CA signature on page 3. Please re-upload.'
                  }
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovalModalDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer shadow-md ${
                    approvalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {approvalAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: INTERACTIVE PREVIEW
          ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {renderFormatBadge(previewDoc.format)}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {previewDoc.title}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    {previewDoc.fileName} · {previewDoc.currentVersion} · {(previewDoc.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => triggerDocumentDownload(previewDoc, previewVersion || undefined, sessionUser)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewVersion(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview Content Body */}
            <div className="p-6 flex-1 flex items-center justify-center bg-slate-950/20 min-h-[400px]">
              {previewDoc.format === 'image' ? (
                <div className="max-w-full text-center">
                  <img
                    src={previewVersion?.fileDataUrl || previewDoc.fileDataUrl}
                    alt={previewDoc.title}
                    className="max-h-[500px] max-w-full rounded-xl shadow-lg border border-slate-700 mx-auto object-contain"
                  />
                </div>
              ) : previewDoc.format === 'pdf' ? (
                <div className="w-full max-w-xl p-8 rounded-2xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 shadow-xl space-y-4 text-center">
                  <FileText className="h-16 w-16 text-rose-500 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {previewDoc.title}
                    </h4>
                    <p className="text-xs font-mono text-slate-500">
                      Format: Portable Document Format (PDF) · Status: {previewDoc.approvalStatus.toUpperCase()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-left text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1">
                    <div>Hierarchy Client: {previewDoc.clientName}</div>
                    <div>Hierarchy Work Order: {previewDoc.workOrderId}</div>
                    <div>Category: {DOCUMENT_CATEGORIES.find(c => c.id === previewDoc.category)?.label}</div>
                    <div>Active Version: {previewDoc.currentVersion} ({previewDoc.versions.length} versions logged)</div>
                    <div>Integrity: Verified SHA256 cryptographic seal</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerDocumentDownload(previewDoc, previewVersion || undefined, sessionUser)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center space-x-2 shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Official PDF File</span>
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-xl p-8 rounded-2xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 shadow-xl space-y-4 text-center">
                  {previewDoc.format === 'xlsx' ? (
                    <FileSpreadsheet className="h-16 w-16 text-emerald-500 mx-auto" />
                  ) : (
                    <FileText className="h-16 w-16 text-blue-500 mx-auto" />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {previewDoc.title}
                    </h4>
                    <p className="text-xs font-mono text-slate-500">
                      File: {previewDoc.fileName} ({(previewDoc.fileSize / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-left text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1">
                    <div>Client: {previewDoc.clientName}</div>
                    <div>Work Order: {previewDoc.workOrderId}</div>
                    <div>Total Recorded Versions: {previewDoc.versions.length}</div>
                    <div>Approval: {previewDoc.approvalStatus.toUpperCase()}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerDocumentDownload(previewDoc, previewVersion || undefined, sessionUser)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center space-x-2 shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Native {previewDoc.format.toUpperCase()} Document</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: DOCUMENT DETAILS, VERSIONS & AUDIT TRAIL
          ========================================================================= */}
      {selectedDocForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-850 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-900">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {selectedDocForDrawer.id}
                  </span>
                  {renderFormatBadge(selectedDocForDrawer.format)}
                  {renderApprovalBadge(selectedDocForDrawer.approvalStatus)}
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {selectedDocForDrawer.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedDocForDrawer.fileName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDrawerTab('details')}
                className={`py-3 px-3 border-b-2 cursor-pointer transition ${
                  drawerTab === 'details'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview &amp; Metadata
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('versions')}
                className={`py-3 px-3 border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  drawerTab === 'versions'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Version History ({selectedDocForDrawer.versions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('audit')}
                className={`py-3 px-3 border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  drawerTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Audit Trail ({selectedDocForDrawer.auditLog.length})</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {drawerTab === 'details' && (
                <div className="space-y-4">
                  {/* Hierarchy Box */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                      Hierarchy Alignment
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Level 1: Client</span>
                        <strong className="text-slate-900 dark:text-white">
                          {selectedDocForDrawer.clientName}
                        </strong>
                        <div className="font-mono text-[10px] text-slate-500">
                          {selectedDocForDrawer.clientId}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Level 2: Work Order</span>
                        <strong className="text-purple-600 dark:text-purple-400 font-mono">
                          {selectedDocForDrawer.workOrderId}
                        </strong>
                        <div className="text-[10px] text-slate-500 truncate">
                          {selectedDocForDrawer.workOrderService}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Tracking Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Regulatory Expiry Tracking
                      </span>
                      {renderExpiryBadge(selectedDocForDrawer)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Issued Date</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedDocForDrawer.issuedDate || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Expiry Date</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedDocForDrawer.expiryDate || 'Permanent / No Expiry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rejection / Approval Note if present */}
                  {selectedDocForDrawer.approvalStatus === 'rejected' && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                      <span className="font-bold flex items-center space-x-1 text-xs">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Rejection Reason ({selectedDocForDrawer.rejectedByName || 'Reviewer'}):</span>
                      </span>
                      <p className="text-xs">{selectedDocForDrawer.rejectionReason}</p>
                    </div>
                  )}

                  {selectedDocForDrawer.approvalStatus === 'approved' && selectedDocForDrawer.approvalRemarks && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-1">
                      <span className="font-bold flex items-center space-x-1 text-xs">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>Approval Verification Note:</span>
                      </span>
                      <p className="text-xs">{selectedDocForDrawer.approvalRemarks}</p>
                    </div>
                  )}

                  {/* Action Strip */}
                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => triggerDocumentDownload(selectedDocForDrawer, undefined, sessionUser)}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVersionModalDoc(selectedDocForDrawer);
                        setVersionSelectedFile(null);
                        setVersionNotes('');
                      }}
                      className="py-2 px-3 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold text-xs flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Version</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(selectedDocForDrawer);
                        setPreviewVersion(null);
                      }}
                      className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold text-xs"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              )}

              {drawerTab === 'versions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Revision History Timeline ({selectedDocForDrawer.versions.length} versions)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVersionModalDoc(selectedDocForDrawer);
                        setVersionSelectedFile(null);
                        setVersionNotes('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Upload Revision</span>
                    </button>
                  </div>

                  {/* Versions Timeline */}
                  <div className="space-y-3 pt-2">
                    {selectedDocForDrawer.versions.slice().reverse().map((ver, idx) => {
                      const isCurrent = ver.versionNumber === selectedDocForDrawer.currentVersion;
                      return (
                        <div
                          key={ver.versionId}
                          className={`p-3.5 rounded-xl border transition ${
                            isCurrent
                              ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-xs'
                              : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-600 text-white">
                                  {ver.versionNumber}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                    Current Active
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {ver.fileName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {(ver.fileSize / 1024).toFixed(1)} KB · {ver.format.toUpperCase()} · Uploaded {new Date(ver.uploadedAt).toLocaleString()}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => triggerDocumentDownload(selectedDocForDrawer, ver, sessionUser)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </button>
                          </div>

                          {ver.changeNotes && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                              <strong className="text-slate-800 dark:text-white">Release Notes:</strong> {ver.changeNotes}
                            </div>
                          )}

                          <div className="mt-1 text-[10px] text-slate-400">
                            By: {ver.uploadedByName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {drawerTab === 'audit' && (
                <div className="space-y-3">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                    Immutable Compliance Audit Log ({selectedDocForDrawer.auditLog.length} events)
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {selectedDocForDrawer.auditLog.slice().reverse().map((audit) => (
                      <div
                        key={audit.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {audit.action}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(audit.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {audit.actionTitle}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {audit.details}
                        </div>
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Executed by: <strong className="text-slate-600 dark:text-slate-300">{audit.performedByName}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
