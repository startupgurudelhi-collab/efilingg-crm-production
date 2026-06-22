/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { bulkImportLeads, generateBackupData, restoreBackupData, getLeads, getFollowUps, getEmployees, getActivityLogs, getStorageString } from '../lib/db';
import { Upload, Download, FileSpreadsheet, ServerCrash, CheckCircle2, AlertCircle, FileText, Database, Shield, Radio, Code, Clipboard, Check } from 'lucide-react';
import { LeadStage } from '../types';
import { subscribeToSync, pullFromPostgres, pushToPostgres, SYNC_KEYS, getSyncMeta, detectPostgresStatus } from '../lib/postgresSync';

interface ImportExportWizardProps {
  currentUserId: string;
  onRefreshData: () => void;
}

export default function ImportExportWizard({ currentUserId, onRefreshData }: ImportExportWizardProps) {
  const csvContent = ''; // Defined dynamically if needed, as state below:
  const [actualCsvContent, setCsvContent] = useState('');
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // PostgreSQL States as single source of truth
  const [postgresEnabled, setPostgresEnabled] = useState(false);
  const [postgresConnected, setPostgresConnected] = useState(false);
  const [postgresError, setPostgresError] = useState<string | null>(null);
  const [isMigratingPostgres, setIsMigratingPostgres] = useState(false);
  const [postgresParsedHost, setPostgresParsedHost] = useState<string | null>(null);

  // Sync state metadata
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error' | 'no_table'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncingAction, setIsSyncingAction] = useState(false);

  useEffect(() => {
    // Subscribe to live PostgreSQL database status updates
    const unsubscribe = subscribeToSync((meta) => {
      setSyncStatus(meta.status);
      setSyncError(meta.errorMessage);
      setLastSyncedAt(meta.lastSyncedAt);
    });

    const checkPostgresStatus = async () => {
      try {
        const res = await fetch('/api/postgres/status');
        const data = await res.json();
        if (data && data.success) {
          setPostgresEnabled(data.enabled);
          setPostgresConnected(data.isConnected);
          setPostgresError(data.errorMessage);
          setPostgresParsedHost(data.parsedHost);
        }
      } catch (err) {
        console.error('Failed to grab PostgreSQL status:', err);
      }
    };

    checkPostgresStatus();

    return () => unsubscribe();
  }, []);

  const handleMigrateToPostgres = async () => {
    setIsMigratingPostgres(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // 1. Pack all local keys matching our SYNC_KEYS
      const payload: Record<string, string> = {};
      let keysFound = 0;
      
      for (const key of SYNC_KEYS) {
        const val = getStorageString(key);
        if (val) {
          payload[key] = val;
          keysFound++;
        }
      }
      
      if (keysFound === 0) {
        throw new Error('No client storage data found to migrate. Populate database first, then start migration.');
      }
      
      // 2. Transmit bulk payload to database backup import
      const res = await fetch('/api/admin/backup-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: { files: payload } })
      });
      
      const resData = await res.json();
      if (resData && resData.success) {
        setSuccessMessage(`Migration Completed Successfully! Transferred all data collections directly into your active PostgreSQL database.`);
        
        // Refresh states
        const statusRes = await fetch('/api/postgres/status');
        const statusData = await statusRes.json();
        if (statusData && statusData.success) {
          setPostgresEnabled(statusData.enabled);
          setPostgresConnected(statusData.isConnected);
          setPostgresError(statusData.errorMessage);
          setPostgresParsedHost(statusData.parsedHost);
        }
        
        await detectPostgresStatus();
        onRefreshData();
      } else {
        setErrorMessage(resData.error || 'Failed migrating data to PostgreSQL database.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'PostgreSQL database migration failed.');
    } finally {
      setIsMigratingPostgres(false);
    }
  };

  const handleManualUploadToPostgres = async () => {
    setIsSyncingAction(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let successCount = 0;
      for (const key of SYNC_KEYS) {
        const val = getStorageString(key);
        if (val) {
          const ok = await pushToPostgres(key, val);
          if (ok) successCount++;
        }
      }
      if (successCount > 0) {
        setSuccessMessage(`Successfully backed up all ${successCount} collections to the cloud PostgreSQL database.`);
        onRefreshData();
      } else {
        setErrorMessage('Failed to push data. Please verify database connection or firewall configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Manual backup upload failed.');
    } finally {
      setIsSyncingAction(false);
    }
  };

  const handleManualDownloadFromPostgres = async () => {
    setIsSyncingAction(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const ok = await pullFromPostgres();
      if (ok) {
        setSuccessMessage('Successfully retrieved and restored full crm state from the cloud PostgreSQL database.');
        onRefreshData();
      } else {
        setErrorMessage('Failed to retrieve PostgreSQL state.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'PostgreSQL retrieve failed.');
    } finally {
      setIsSyncingAction(false);
    }
  };

  // Sample CSV string to let them test instantly
  const sampleCsv = `customerName,mobile,email,businessName,serviceRequired,leadSource,stage,notes
Suresh Kumar,9823456789,suresh@invests.com,Suresh Enterprises,GST Registration,Referral,New Lead,Wants GST filed before 15th
Neha Agarwal,9134567890,neha@decor.in,Neha Home Decor,Trademark Registration,Instagram Ads,Interested,Needs logo trademark search in class 24
Rahul Roy,8823456711,rahul@royco.in,Roy Logistics,Company Registration,LinkedIn Outreach,New Lead,E-commerce logistics setup advice required`;

  const handlePrefillTemplate = () => {
    setCsvContent(sampleCsv);
    setErrorMessage(null);
    setImportResults(null);
  };

  const parseCsvToLeads = (text: string) => {
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length <= 1) {
      throw new Error('CSV is empty or missing data lines.');
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/['"]/g, ''));
    const rows = lines.slice(1);

    const matchHeaderIndex = (name: string) => {
      return headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    };

    const nameIdx = matchHeaderIndex('customerName');
    const mobileIdx = matchHeaderIndex('mobile');
    const emailIdx = matchHeaderIndex('email');
    const bizIdx = matchHeaderIndex('businessName');
    const serviceIdx = matchHeaderIndex('serviceRequired');
    const sourceIdx = matchHeaderIndex('leadSource');
    const stageIdx = matchHeaderIndex('stage');
    const notesIdx = matchHeaderIndex('notes');

    if (nameIdx === -1 || mobileIdx === -1) {
      throw new Error('CSV must contain minimally "customerName" and "mobile" columns.');
    }

    return rows.map((row) => {
      // Split by comma but respect basic comma-quoting if any (standard split)
      const cols = row.split(',').map((c) => c.trim().replace(/['"]/g, ''));
      return {
        customerName: cols[nameIdx] || '',
        mobile: cols[mobileIdx] || '',
        email: emailIdx !== -1 ? cols[emailIdx] || '' : '',
        businessName: bizIdx !== -1 ? cols[bizIdx] || '' : '',
        serviceRequired: serviceIdx !== -1 ? cols[serviceIdx] || '' : '',
        leadSource: sourceIdx !== -1 ? cols[sourceIdx] || '' : '',
        stage: stageIdx !== -1 ? (cols[stageIdx] as LeadStage) || ('New Lead' as LeadStage) : ('New Lead' as LeadStage),
        notes: notesIdx !== -1 ? cols[notesIdx] || '' : ''
      };
    });
  };

  const handleBulkImport = () => {
    try {
      setErrorMessage(null);
      setImportResults(null);
      if (!csvContent.trim()) {
        setErrorMessage('CSV input can not be blank.');
        return;
      }
      const parsed = parseCsvToLeads(csvContent);
      const results = bulkImportLeads(parsed, currentUserId);
      setImportResults({ success: results.successCount, failed: results.failedCount });
      setCsvContent('');
      onRefreshData();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error parsing CSV file text. Please check standard layout.');
    }
  };

  const handleTriggerBackupDownload = () => {
    try {
      const backupStr = generateBackupData();
      const blob = new Blob([backupStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `efilingg_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Workspace backup generated and downloaded successfully.');
    } catch {
      setErrorMessage('Generating state backup failed.');
    }
  };

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const ok = await restoreBackupData(text, currentUserId);
      if (ok) {
        setSuccessMessage('Database state successfully loaded and synchronised on central server.');
        onRefreshData();
      } else {
        setErrorMessage('File signature is invalid or corrupt. Restoration skipped.');
      }
    };
    reader.readAsText(file);
  };

  // Standard reports exporter helper
  const handleExportTable = (reportType: 'leads' | 'followups' | 'logs') => {
    let csvStr = '';
    let filename = '';

    if (reportType === 'leads') {
      const list = getLeads();
      csvStr = 'Lead ID,Customer Name,Mobile,Email,Business Name,Service,Source,Stage,Creation Date,Assigned Employee ID\n';
      list.forEach((l) => {
        csvStr += `${l.id},"${l.customerName}",${l.mobile},${l.email},"${l.businessName}","${l.serviceRequired}","${l.leadSource}","${l.stage}","${l.creationDate}",${l.assignedTo}\n`;
      });
      filename = 'leads_conversion';
    } else if (reportType === 'followups') {
      const list = getFollowUps();
      csvStr = 'Follow-Up ID,Lead ID,Scheduled Date,Time,Status,Remarks,Response\n';
      list.forEach((f) => {
        csvStr += `${f.id},${f.leadId},${f.followUpDate},${f.followUpTime},${f.status},"${f.remarks}","${f.customerResponse}"\n`;
      });
      filename = 'followups_audit';
    } else {
      const list = getActivityLogs();
      csvStr = 'Log ID,User ID,Name,Role,Action,Details,Timestamp\n';
      list.forEach((log) => {
        csvStr += `${log.id},${log.userId},"${log.userName}",${log.userRole},"${log.action}","${log.details}",${log.timestamp}\n`;
      });
      filename = 'system_activity_trail';
    }

    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `efilingg_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CSV Excel Bulk Import Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Bulk Lead Import (Excel / CSV)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add dozens of leads concurrently in seconds</p>
              </div>
            </div>
            <button
              onClick={handlePrefillTemplate}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-705 cursor-pointer transition-colors"
            >
              Fill Sample Template
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Comma-Separated Grid Content
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="customerName,mobile,email,businessName,serviceRequired,leadSource,stage,notes&#10;Arun,9944488833,arun@gmail.com,Arun Trades,ITR Filing,Google,New Lead,needs standard audit file"
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-505">
              💡 First row serves as heading keys. CustomerName & mobile are mandatory fields. System auto-assigns leads in round-robin fashion to active employees.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {importResults && (
                <div className="p-2 py-1 bg-emerald-50 dark:bg-emerald-955/35 rounded-lg border border-emerald-200 text-xs text-emerald-600 dark:text-emerald-405 font-medium flex items-center space-x-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Success: {importResults.success} | Failed: {importResults.failed}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleBulkImport}
              className="flex items-center space-x-2 py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Import Leads</span>
            </button>
          </div>
        </div>

        {/* Database Backup & Sync Panel */}
        <div className="space-y-6">
          {/* Section A: Offline Disaster Recovery */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="h-10 w-10 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-450 rounded-xl flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Disaster Recovery</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Local data storage backups</p>
              </div>
            </div>

            {/* Backup Download */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">Backup Database</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Export the whole JSON relational state, including Lead Histories, Proposals, Audit Logs and Followups.
              </p>
              <button
                onClick={handleTriggerBackupDownload}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-100 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                <Download className="h-4 w-4 text-emerald-555" />
                <span>Download State JSON</span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">Restore State</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Caution: loading backup state overwrites current stored items permanently.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full py-3 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors pointer-events-none">
                  <Upload className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                  <span>Upload *.json Database File</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Enterprise PostgreSQL Connection Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Enterprise PostgreSQL Database</h3>
                  {postgresConnected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Secure corporate relational sync</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Connection Status block */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono font-semibold">POSTGRES CONFIGURATION</span>
                  <div className="flex items-center space-x-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${postgresConnected ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-600 dark:text-slate-400">
                      {postgresConnected ? 'Connected & Active' : postgresEnabled ? 'Connecting...' : 'Not Configured'}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Integration State:</span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {postgresEnabled ? 'DATABASE_URL (Active)' : 'Filesystem Fallback Enabled'}
                    </span>
                  </div>
                  {postgresParsedHost && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">Database Server:</span>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono truncate max-w-[200px]" title={postgresParsedHost}>
                        {postgresParsedHost}
                      </span>
                    </div>
                  )}
                  {postgresConnected ? (
                    <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold font-mono flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-1">
                      <span>Database Shield:</span>
                      <span className="uppercase bg-indigo-500/10 px-1 py-0.5 rounded text-[8px]">ACTIVE & SECURE</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-400 font-mono flex justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-1">
                      <span>Sync Server Proxy:</span>
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error messages if any */}
              {postgresEnabled && !postgresConnected && postgresError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-xs flex items-start space-x-2 leading-relaxed">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="break-words w-full animate-shake">
                    <strong className="font-bold">Database error:</strong> {postgresError}
                  </div>
                </div>
              )}

              {/* Informational Guidance regarding Secrets */}
              {!postgresEnabled && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs leading-relaxed">
                  <p className="font-bold mb-1 col-span-2">How to enable PostgreSQL Database:</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Insert your PostgreSQL Connection String into the <strong>Secrets Settings panel</strong> as <code>DATABASE_URL</code> variable. The app will automatically connect and verify database structures synchronously on next boot.
                  </p>
                </div>
              )}

              {/* Safe, Interruption-Free Migrator Action block */}
              {postgresConnected && (
                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">1-Click Safe Migration</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Click the button below to pack all current local data from your browser safely, shifting and loading them directly into your PostgreSQL database instance instantly with <strong>zero data loss</strong>.
                    </p>
                  </div>

                  <button
                    onClick={handleMigrateToPostgres}
                    disabled={isMigratingPostgres}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50 transition-colors"
                  >
                    <Database className={`h-4 w-4 ${isMigratingPostgres ? 'animate-spin' : ''}`} />
                    <span>{isMigratingPostgres ? 'Migrating Database State...' : 'Migrate Now (Zero Data Loss)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Advanced Reports Export Tables */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Enterprise Reports Exporter</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Generate system performance tables and save them in native spreadsheet formats immediately for secondary billing, performance calculation or presentation layers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Leads & Stage Report</span>
              <p className="text-xs text-slate-400 dark:text-slate-500">Includes sources and assignments</p>
            </div>
            <button
              onClick={() => handleExportTable('leads')}
              className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 flex items-center justify-center hover:bg-emerald-100 cursor-pointer transition-colors"
              title="Export Lead Excel"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Follow-up Audits</span>
              <p className="text-xs text-slate-400 dark:text-slate-500">Logs status and customer response</p>
            </div>
            <button
              onClick={() => handleExportTable('followups')}
              className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 flex items-center justify-center hover:bg-emerald-100 cursor-pointer transition-colors"
              title="Export Follow-ups Excel"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Internal Activity Logs</span>
              <p className="text-xs text-slate-400 dark:text-slate-500">Security team access logs</p>
            </div>
            <button
              onClick={() => handleExportTable('logs')}
              className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 flex items-center justify-center hover:bg-emerald-100 cursor-pointer transition-colors"
              title="Export Audit Logs Excel"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
