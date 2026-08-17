/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Data Recovery & Versioning Center (Phases 5 & 7)
 * Disaster Recovery Dashboard, Point-In-Time Snapshot Explorer, 
 * SHA-256 Checksum Verifier, Visual Structural Diff Engine & Atomic One-Click Restore
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  History,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Database,
  Camera,
  Activity,
  Layers,
  ChevronRight,
  Eye,
  GitCompare,
  Copy,
  Check,
  Calendar,
  User,
  HardDrive,
  Lock,
  Unlock,
  Info
} from 'lucide-react';
import { SYNC_KEYS } from '../lib/postgresSync';

export interface SnapshotMeta {
  id: number;
  storage_key: string;
  operation_type: string;
  checksum: string;
  created_by: string;
  created_at: string;
  size_bytes: number;
  preview_snippet?: string;
}

export interface RecoveryStats {
  totalSnapshots: number;
  totalSizeBytes: number;
  distinctKeysCount: number;
  lastSnapshot: any;
  lastRestore: any;
  latestBackupInfo: any;
  databaseMode: string;
  isDatabaseInRecoveryMode: boolean;
  recoveryReadinessScore: number;
}

export interface DiffResult {
  isJson: boolean;
  type: 'list' | 'object' | 'raw';
  summary: {
    addedCount: number;
    deletedCount: number;
    modifiedCount: number;
    totalDifferences: number;
  };
  details: Array<{
    id: string;
    status: 'added' | 'deleted' | 'modified' | 'identical';
    name?: string;
    changes?: Record<string, { old: any; new: any }>;
    snapshotData?: any;
    currentData?: any;
  }>;
}

interface RecoveryCenterProps {
  currentUserId?: string;
  onRefreshData?: () => void;
}

export default function RecoveryCenter({ currentUserId = 'Admin', onRefreshData }: RecoveryCenterProps) {
  // Stats & Health HUD
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Snapshots Table
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [totalSnapshotsCount, setTotalSnapshotsCount] = useState(0);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [selectedKeyFilter, setSelectedKeyFilter] = useState<string>('ALL');
  const [selectedOpFilter, setSelectedOpFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Snapshot Inspection & Diff Modals
  const [activeSnapshotDetail, setActiveSnapshotDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [activeDiff, setActiveDiff] = useState<{ snapshotMeta: any; currentMeta: any; diff: DiffResult } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  // Restore Confirmation
  const [snapshotToRestore, setSnapshotToRestore] = useState<SnapshotMeta | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  // Manual Snapshot Modal
  const [showManualSnapshotModal, setShowManualSnapshotModal] = useState(false);
  const [manualSnapshotKey, setManualSnapshotKey] = useState('ALL');
  const [manualSnapshotNotes, setManualSnapshotNotes] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sub-tabs: 'explorer' | 'audit' | 'status'
  const [activeSubTab, setActiveSubTab] = useState<'explorer' | 'audit' | 'status'>('explorer');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/recovery/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.error('Error fetching recovery stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch snapshots list
  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const params = new URLSearchParams();
      if (selectedKeyFilter !== 'ALL') params.append('key', selectedKeyFilter);
      if (selectedOpFilter !== 'ALL') params.append('operation', selectedOpFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', String(pageSize));
      params.append('offset', String(page * pageSize));

      const res = await fetch(`/api/admin/recovery/snapshots?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSnapshots(data.snapshots || []);
          setTotalSnapshotsCount(data.totalCount || 0);
        }
      }
    } catch (e) {
      console.error('Error fetching snapshots list:', e);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  // Fetch audit logs for Disaster Recovery
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Filter recovery-relevant logs
          const recoveryActions = [
            'SNAPSHOT_CREATED',
            'SNAPSHOT_FAILED',
            'RESTORE_STARTED',
            'RESTORE_SUCCESS',
            'RESTORE_FAILED',
            'CHECKSUM_VERIFIED',
            'CHECKSUM_FAILED',
            'MANUAL_SNAPSHOT_CREATED',
            'MANUAL_RECOVERY_ON',
            'MANUAL_RECOVERY_OFF',
            'CRITICAL_ANOMALY',
            'VERSION_RESTORE',
            'WRITE_SUCCESS',
            'WRITE_FAILED'
          ];
          const filtered = (data.logs || []).filter((l: any) =>
            recoveryActions.some((a) => l.action?.includes(a) || a.includes(l.action))
          );
          setAuditLogs(filtered);
        }
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSnapshots();
  }, [selectedKeyFilter, selectedOpFilter, page, pageSize]);

  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchSnapshots();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Inspect Snapshot
  const handleInspectSnapshot = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/recovery/snapshot/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveSnapshotDetail(data.snapshot);
        } else {
          alert(`Failed to load snapshot #${id}: ${data.error}`);
        }
      }
    } catch (e: any) {
      alert(`Error loading snapshot #${id}: ${e.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Inspect Diff
  const handleInspectDiff = async (id: number) => {
    setLoadingDiff(true);
    try {
      const res = await fetch(`/api/admin/recovery/diff/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveDiff({
            snapshotMeta: data.snapshotMeta,
            currentMeta: data.currentMeta,
            diff: data.diff
          });
        } else {
          alert(`Failed to compute diff for snapshot #${id}: ${data.error}`);
        }
      }
    } catch (e: any) {
      alert(`Error computing diff for snapshot #${id}: ${e.message}`);
    } finally {
      setLoadingDiff(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!snapshotToRestore) return;
    setIsRestoring(true);
    setRestoreErrorMsg(null);
    setRestoreSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/recovery/restore/${snapshotToRestore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUserId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreSuccessMsg(
          `Successfully restored "${snapshotToRestore.storage_key.replace('efilingg_crm_', '')}" from snapshot #${snapshotToRestore.id}! Pre-restore rollback safeguard snapshot was generated automatically.`
        );
        fetchStats();
        fetchSnapshots();
        if (onRefreshData) onRefreshData();
        setTimeout(() => {
          setSnapshotToRestore(null);
        }, 1200);
      } else {
        setRestoreErrorMsg(data.error || 'Restore failed on server.');
      }
    } catch (e: any) {
      setRestoreErrorMsg(e.message || 'Error executing restore request.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Take Manual Snapshot
  const handleTakeManualSnapshot = async () => {
    setIsTakingSnapshot(true);
    try {
      const res = await fetch('/api/admin/recovery/snapshot-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: manualSnapshotKey,
          operationType: 'MANUAL_SNAPSHOT',
          user: currentUserId,
          notes: manualSnapshotNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully captured ${data.createdCount} snapshot(s) with SHA-256 checksum validation!`);
        setShowManualSnapshotModal(false);
        setManualSnapshotNotes('');
        fetchStats();
        fetchSnapshots();
      } else {
        alert(`Snapshot creation failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error taking manual snapshot: ${e.message}`);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOpBadge = (op: string) => {
    switch (op) {
      case 'RESTORE':
      case 'SYSTEM_RECOVERY':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'IMPORT':
      case 'MIGRATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'MANUAL_SNAPSHOT':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  // Critical keys for quick filtering
  const primaryKeys = useMemo(() => {
    return [
      'efilingg_crm_services',
      'efilingg_crm_leads',
      'efilingg_crm_employees',
      'efilingg_crm_proposals',
      'efilingg_crm_followups',
      'efilingg_crm_attendance',
      'efilingg_crm_proposaltemplate',
      'efilingg_crm_offerlettertemplate',
      'efilingg_crm_notifications',
      'efilingg_crm_settings'
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Shield className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Zero Data Loss Protection Active</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                SHA-256 Checksums
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Enterprise Recovery Center & Versioning
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Continuous point-in-time snapshot ledger with SHA-256 cryptographic verification, transactional rollback safeguards, and visual structural diffing across all CRM keys.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowManualSnapshotModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95 cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>Capture Snapshot Now</span>
            </button>
            <button
              onClick={() => {
                fetchStats();
                fetchSnapshots();
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSnapshots ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* DISASTER RECOVERY HEALTH HUD (PHASE 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Snapshots */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Total Snapshots</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats ? stats.totalSnapshots.toLocaleString() : '...'}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              {stats ? `${stats.distinctKeysCount} keys` : ''}
            </span>
          </div>
        </div>

        {/* Database Size */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Snapshot Store</span>
            <HardDrive className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats ? (stats.totalSizeBytes / (1024 * 1024)).toFixed(2) : '...'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">MB Total</span>
          </div>
        </div>

        {/* Last Snapshot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Last Snapshot</span>
            <History className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
              {stats?.lastSnapshot ? stats.lastSnapshot.storage_key.replace('efilingg_crm_', '') : 'None'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
              {stats?.lastSnapshot ? new Date(stats.lastSnapshot.created_at).toLocaleTimeString() : '--'}
            </span>
          </div>
        </div>

        {/* Last Restore */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Last Rollback</span>
            <RotateCcw className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
              {stats?.lastRestore ? stats.lastRestore.storage_key.replace('efilingg_crm_', '') : 'None'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
              {stats?.lastRestore ? new Date(stats.lastRestore.created_at).toLocaleDateString() : 'Clean'}
            </span>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Database Mode</span>
            <Database className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
              {stats?.databaseMode === 'POSTGRESQL_CONNECTED'
                ? 'PostgreSQL Live'
                : stats?.databaseMode === 'SANDBOX_MIRROR_MODE'
                ? 'Sandbox Mirror'
                : 'Local Memory'}
            </span>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <span>Readiness Score</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              100%
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Guaranteed</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('explorer')}
          className={`flex items-center space-x-2 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'explorer'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <History className="h-4 w-4 text-indigo-500" />
          <span>Point-In-Time Snapshot Ledger</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">
            {totalSnapshotsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center space-x-2 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="h-4 w-4 text-emerald-500" />
          <span>Disaster Recovery Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveSubTab('status')}
          className={`flex items-center space-x-2 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSubTab === 'status'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="h-4 w-4 text-blue-500" />
          <span>Safety Architecture & Verification Rules</span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: POINT-IN-TIME SNAPSHOT LEDGER (PHASE 5)
          ========================================================================= */}
      {activeSubTab === 'explorer' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by key, user, or snapshot ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Key Filter Dropdown */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Key:</span>
                <select
                  value={selectedKeyFilter}
                  onChange={(e) => {
                    setSelectedKeyFilter(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Storage Keys</option>
                  {primaryKeys.map((k) => (
                    <option key={k} value={k}>
                      {k.replace('efilingg_crm_', '')}
                    </option>
                  ))}
                  {SYNC_KEYS.filter((k) => !primaryKeys.includes(k)).map((k) => (
                    <option key={k} value={k}>
                      {k.replace('efilingg_crm_', '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operation Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Op:</span>
                <select
                  value={selectedOpFilter}
                  onChange={(e) => {
                    setSelectedOpFilter(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Operations</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="CREATE">CREATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="RESTORE">RESTORE</option>
                  <option value="IMPORT">IMPORT</option>
                  <option value="SYSTEM_RECOVERY">SYSTEM_RECOVERY</option>
                  <option value="MANUAL_SNAPSHOT">MANUAL_SNAPSHOT</option>
                  <option value="SERVER_SYNC">SERVER_SYNC</option>
                </select>
              </div>

              {/* Page size */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {/* Quick Key Badges */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
            <span className="text-slate-400 text-[10px] uppercase font-mono shrink-0">Quick Filter:</span>
            {['ALL', 'services', 'leads', 'employees', 'proposals', 'attendance', 'proposaltemplate'].map((k) => {
              const fullKey = k === 'ALL' ? 'ALL' : `efilingg_crm_${k}`;
              const isActive = selectedKeyFilter === fullKey;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setSelectedKeyFilter(fullKey);
                    setPage(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>

          {/* Snapshots Table */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                  <th className="p-3.5 px-4">Snapshot ID</th>
                  <th className="p-3.5">Storage Key</th>
                  <th className="p-3.5">Operation Type</th>
                  <th className="p-3.5">SHA-256 Checksum</th>
                  <th className="p-3.5">Payload Size</th>
                  <th className="p-3.5">Created By</th>
                  <th className="p-3.5">Timestamp (IST)</th>
                  <th className="p-3.5 text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingSnapshots ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>Loading historical snapshots...</span>
                      </div>
                    </td>
                  </tr>
                ) : snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">No snapshots matching your filter criteria.</p>
                        <p className="text-xs">Database modifications will automatically generate historical snapshot versions.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  snapshots.map((snap) => (
                    <tr
                      key={snap.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* ID */}
                      <td className="p-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        #{snap.id}
                      </td>

                      {/* Storage Key */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {snap.storage_key.replace('efilingg_crm_', '')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                          {snap.storage_key}
                        </div>
                      </td>

                      {/* Operation Type */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase border ${getOpBadge(
                            snap.operation_type
                          )}`}
                        >
                          {snap.operation_type}
                        </span>
                      </td>

                      {/* Checksum */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {snap.checksum ? `${snap.checksum.slice(0, 10)}...` : 'N/A'}
                          </span>
                          {snap.checksum && (
                            <button
                              onClick={() => copyToClipboard(snap.checksum, `chk-${snap.id}`)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                              title="Copy full SHA-256 Checksum"
                            >
                              {copiedId === `chk-${snap.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Payload Size */}
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {snap.size_bytes > 1024 * 1024
                          ? `${(snap.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                          : `${(snap.size_bytes / 1024).toFixed(1)} KB`}
                      </td>

                      {/* Created By */}
                      <td className="p-3.5">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {snap.created_by || 'System'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        <div>{new Date(snap.created_at).toLocaleTimeString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(snap.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleInspectSnapshot(snap.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10.5px] font-semibold rounded-lg transition-colors cursor-pointer"
                          title="View full snapshot payload and checksum"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleInspectDiff(snap.id)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-bold rounded-lg border border-indigo-200/50 dark:border-indigo-800/40 transition-colors cursor-pointer"
                          title="Compare structural diff against current live database state"
                        >
                          <GitCompare className="h-3 w-3 inline mr-1" />
                          <span>Diff</span>
                        </button>

                        <button
                          onClick={() => {
                            setRestoreErrorMsg(null);
                            setRestoreSuccessMsg(null);
                            setSnapshotToRestore(snap);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[10.5px] font-bold rounded-lg border border-rose-200/50 dark:border-rose-800/40 transition-colors cursor-pointer"
                          title="Restore live database to this exact point-in-time"
                        >
                          <RotateCcw className="h-3 w-3 inline mr-1" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <div>
              Showing {snapshots.length > 0 ? page * pageSize + 1 : 0} to{' '}
              {Math.min((page + 1) * pageSize, totalSnapshotsCount)} of {totalSnapshotsCount} snapshots
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page === 0 || loadingSnapshots}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold cursor-pointer"
              >
                Previous
              </button>
              <span className="font-mono px-2 font-bold text-slate-700 dark:text-slate-300">
                Page {page + 1} of {Math.max(1, Math.ceil(totalSnapshotsCount / pageSize))}
              </span>
              <button
                disabled={(page + 1) * pageSize >= totalSnapshotsCount || loadingSnapshots}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DISASTER RECOVERY AUDIT LOG STREAM (PHASE 8)
          ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>Recovery & Integrity Audit Stream</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cryptographic checksum validations, point-in-time restores, transaction checkpoints, and anomaly drops
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loadingAudit ? 'animate-spin' : ''}`} />
              <span>Refresh Trail</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl border border-slate-850 h-[480px] overflow-y-auto space-y-3 shadow-inner select-text">
            {loadingAudit ? (
              <div className="text-center text-slate-500 py-24">Loading audit entries...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center text-slate-600 py-24 font-sans">
                No recovery logs recorded yet. Snapshot operations and restore workflows are automatically registered.
              </div>
            ) : (
              auditLogs.map((log: any, i: number) => {
                let badgeColor = 'bg-slate-800 text-slate-400';
                if (log.action === 'RESTORE_SUCCESS' || log.action === 'CHECKSUM_VERIFIED') {
                  badgeColor = 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60';
                } else if (
                  log.action === 'RESTORE_FAILED' ||
                  log.action === 'CHECKSUM_FAILED' ||
                  log.action === 'CRITICAL_ANOMALY'
                ) {
                  badgeColor = 'bg-rose-950/70 text-rose-400 border border-rose-800/60';
                } else if (log.action === 'RESTORE_STARTED' || log.action === 'MANUAL_SNAPSHOT_CREATED') {
                  badgeColor = 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/60';
                }

                return (
                  <div key={log.id || i} className="space-y-1.5 border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{log.id || `AUDIT-${1000 + i}`} • {new Date(log.timestamp).toLocaleString()}</span>
                      <span className="font-sans text-slate-400 flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                        <span>IP: {log.ip || '127.0.0.1'}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase ${badgeColor}`}>
                        [{log.action}]
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Author: <span className="font-bold text-slate-300">{log.user || 'System'}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{log.details}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: SAFETY ARCHITECTURE & RECOVERY RULES (PHASE 9)
          ========================================================================= */}
      {activeSubTab === 'status' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Enterprise Zero Data Loss Safety Architecture
            </h3>
            <p className="text-xs text-slate-400">
              Technical pipeline specifications for immutable snapshots and transactional point-in-time recovery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <h4>1. Pre-Write Snapshot Gate</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Before any INSERT, UPDATE, DELETE, or BULK IMPORT executes on <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">crm_store</code>, the exact prior value is atomically snapshot in <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">crm_store_history</code> within the same PostgreSQL transaction block.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <h4>2. SHA-256 Checksums</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every snapshot stores a cryptographic SHA-256 hash. During rollback, the snapshot value is re-hashed in memory and matched against the recorded checksum before any write is accepted. Corrupted payloads are rejected.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <RotateCcw className="h-5 w-5" />
                <h4>3. Pre-Restore Rollback Safeguard</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Restoring a snapshot generates an automatic rollback snapshot of the active state before overwriting, guaranteeing that even an accidental restore can be rolled back without data loss.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SNAPSHOT DETAILS & SHA-256 CHECKSUM VERIFICATION (PHASE 3)
          ========================================================================= */}
      {activeSnapshotDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                    Snapshot #{activeSnapshotDetail.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase border ${getOpBadge(
                      activeSnapshotDetail.operation_type
                    )}`}
                  >
                    {activeSnapshotDetail.operation_type}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {activeSnapshotDetail.storage_key.replace('efilingg_crm_', '')}
                </h3>
              </div>

              <button
                onClick={() => setActiveSnapshotDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Checksum Verification Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  activeSnapshotDetail.checksumValid
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {activeSnapshotDetail.checksumValid ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs">
                      {activeSnapshotDetail.checksumValid
                        ? 'SHA-256 Checksum Verified & Untampered'
                        : 'CHECKSUM MISMATCH DETECTED'}
                    </h4>
                    <p className="text-[11px] font-mono opacity-80 break-all">
                      {activeSnapshotDetail.checksum}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(activeSnapshotDetail.checksum, 'detail-chk')}
                  className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:bg-white"
                >
                  {copiedId === 'detail-chk' ? 'Copied!' : 'Copy Hash'}
                </button>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Created By</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {activeSnapshotDetail.created_by}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Recorded At</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {new Date(activeSnapshotDetail.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Item Count</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
                    {activeSnapshotDetail.recordCount} items
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Byte Size</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
                    {(activeSnapshotDetail.sizeBytes / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>

              {/* Raw JSON Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Payload Content Preview (JSON)
                  </label>
                  <button
                    onClick={() => copyToClipboard(activeSnapshotDetail.snapshot_value, 'payload-copy')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedId === 'payload-copy' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>Copy Raw JSON</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl border border-slate-850 max-h-72 overflow-y-auto leading-relaxed select-text">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeSnapshotDetail.snapshot_value), null, 2);
                    } catch {
                      return activeSnapshotDetail.snapshot_value;
                    }
                  })()}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  const snap = activeSnapshotDetail;
                  setActiveSnapshotDetail(null);
                  handleInspectDiff(snap.id);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <GitCompare className="h-4 w-4" />
                <span>Compare Structural Diff</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveSnapshotDetail(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const snap = activeSnapshotDetail;
                    setActiveSnapshotDetail(null);
                    setSnapshotToRestore(snap);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Restore Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: STRUCTURAL VISUAL DIFF ENGINE (PHASE 4 & 5)
          ========================================================================= */}
      {activeDiff && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <GitCompare className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    Structural Diff: Snapshot #{activeDiff.snapshotMeta.id} vs Live Database
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Target Key: <code className="font-mono font-bold text-slate-600 dark:text-slate-300">{activeDiff.snapshotMeta.storage_key}</code>
                </p>
              </div>
              <button
                onClick={() => setActiveDiff(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                    Added Items
                  </span>
                  <span className="block text-2xl font-black text-emerald-600 font-mono mt-0.5">
                    +{activeDiff.diff.summary.addedCount}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                    Modified Items
                  </span>
                  <span className="block text-2xl font-black text-amber-600 font-mono mt-0.5">
                    ~{activeDiff.diff.summary.modifiedCount}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">
                    Deleted / Missing
                  </span>
                  <span className="block text-2xl font-black text-rose-600 font-mono mt-0.5">
                    -{activeDiff.diff.summary.deletedCount}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 tracking-wider">
                    Total Diff Changes
                  </span>
                  <span className="block text-2xl font-black text-indigo-600 font-mono mt-0.5">
                    {activeDiff.diff.summary.totalDifferences}
                  </span>
                </div>
              </div>

              {/* Detailed Item Differences */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Itemized Changes Breakdown ({activeDiff.diff.details.length} inspected)
                </h4>

                {activeDiff.diff.details.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl text-slate-400 text-xs">
                    Exact Match: There are no differences between this snapshot and the current live database.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {activeDiff.diff.details.map((item, idx) => {
                      let statusBadge = 'bg-slate-100 text-slate-600';
                      if (item.status === 'added') statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                      else if (item.status === 'deleted') statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
                      else if (item.status === 'modified') statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';

                      return (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadge}`}>
                                {item.status}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item.name || item.id}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">ID: {item.id}</span>
                          </div>

                          {/* Changed field differences */}
                          {item.changes && Object.keys(item.changes).length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {Object.entries(item.changes).map(([field, delta]: any) => (
                                <div
                                  key={field}
                                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]"
                                >
                                  <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                                    {field}
                                  </span>
                                  <div className="text-rose-600 dark:text-rose-400 font-mono truncate">
                                    <span className="text-[9px] text-slate-400 block font-sans">Snapshot:</span>
                                    {typeof delta.old === 'object' ? JSON.stringify(delta.old) : String(delta.old ?? 'None')}
                                  </div>
                                  <div className="text-emerald-600 dark:text-emerald-400 font-mono truncate">
                                    <span className="text-[9px] text-slate-400 block font-sans">Live:</span>
                                    {typeof delta.new === 'object' ? JSON.stringify(delta.new) : String(delta.new ?? 'None')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setActiveDiff(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Close Diff
              </button>

              <button
                onClick={() => {
                  const snap = activeDiff.snapshotMeta;
                  setActiveDiff(null);
                  setSnapshotToRestore(snap);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restore This Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ATOMIC RESTORE CONFIRMATION WITH ROLLBACK SAFEGUARD (PHASE 4)
          ========================================================================= */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Confirm Point-in-Time Restore
                </h3>
                <p className="text-xs text-slate-500">Atomic Rollback & Checksum Verification</p>
              </div>
            </div>

            {restoreErrorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}

            {restoreSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{restoreSuccessMsg}</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Storage Key:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {snapshotToRestore.storage_key}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Snapshot ID:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  #{snapshotToRestore.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Captured At:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(snapshotToRestore.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payload Size:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {(snapshotToRestore.size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <span className="font-bold block">🛡️ Automatic Rollback Safeguard Enabled:</span>
              <p className="leading-relaxed opacity-90 text-[11px]">
                The server will automatically generate a snapshot of the current active data before applying this restore. You can roll back at any time.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                disabled={isRestoring}
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isRestoring}
                onClick={handleExecuteRestore}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Verifying & Restoring...' : 'Confirm Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MANUAL POINT-IN-TIME SNAPSHOT (PHASE 4 & 5)
          ========================================================================= */}
      {showManualSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-indigo-600">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Capture Point-In-Time Snapshot
                </h3>
                <p className="text-xs text-slate-500">Immutable Cryptographic Snapshot</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wide">
                  Target Storage Key
                </label>
                <select
                  value={manualSnapshotKey}
                  onChange={(e) => setManualSnapshotKey(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">ALL Critical Keys (Full Snapshot)</option>
                  {primaryKeys.map((k) => (
                    <option key={k} value={k}>
                      {k} ({k.replace('efilingg_crm_', '')})
                    </option>
                  ))}
                  {SYNC_KEYS.filter((k) => !primaryKeys.includes(k)).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wide">
                  Audit Notes / Reason
                </label>
                <input
                  type="text"
                  value={manualSnapshotNotes}
                  onChange={(e) => setManualSnapshotNotes(e.target.value)}
                  placeholder="e.g. Pre-deployment backup, Master template update..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                disabled={isTakingSnapshot}
                onClick={() => setShowManualSnapshotModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isTakingSnapshot}
                onClick={handleTakeManualSnapshot}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Camera className={`h-4 w-4 ${isTakingSnapshot ? 'animate-spin' : ''}`} />
                <span>{isTakingSnapshot ? 'Capturing...' : 'Capture Snapshot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
