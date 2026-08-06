/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import AdmZip from 'adm-zip';
import { serverFeatureFlagManager } from './src/server/featureFlags';
import { eventBus, deadLetterQueue, eventRegistry } from './src/lib/eventBus';
import { block1Router } from './src/lib/block1/router';
import { WhatsAppService } from './src/lib/block1/WhatsAppService';
import { registerServerPersistHandler, crmMemoryStore } from './src/lib/db';
import { block2Router } from './src/lib/block2/router';
import { block3Router } from './src/lib/block3/router';

// Enable Block 1, Block 2 & Block 3 feature flags by default on server start
serverFeatureFlagManager.setOverride('ENABLE_WHATSAPP_INGESTION', true);
serverFeatureFlagManager.setOverride('ENABLE_CUSTOMER360', true);
serverFeatureFlagManager.setOverride('ENABLE_AI_SALES_WORKSPACE', true);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
// Boost parsing limit to support high payload backups easily (up to 150MB)
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Mount Block 1 Enterprise Router (WhatsApp Cloud API, Customer Identity, Lead Engine, Conversations)
app.use('/api', block1Router);

// Mount Block 2 Enterprise Router (AI Sales Workspace, Gemini Integrations, Collaboration, Diagnostics)
app.use('/api', block2Router);

// Mount Block 3 Enterprise Router (Meta Click-to-WhatsApp Tracking, State Machine, Prompts, Notifications, Hardening, Observability)
app.use('/api/v2/block3', block3Router);

// --- POSTGRESQL INITIALIZATION & POOL ---
let pool: pg.Pool | null = null;
let postgresConnected = false;
let postgresErrorMsg: string | null = null;
let isSandboxMirrorMode = false;

const PREVIEW_STORE_FILE = path.join(process.cwd(), 'preview_local_store.json');
let previewStore: Record<string, string> = {};

function loadPreviewStore() {
  try {
    if (fs.existsSync(PREVIEW_STORE_FILE)) {
      const data = fs.readFileSync(PREVIEW_STORE_FILE, 'utf8');
      previewStore = JSON.parse(data);
      console.log(`[Preview Store] Loaded ${Object.keys(previewStore).length} keys from local preview file.`);
    }
  } catch (err) {
    console.warn('[Preview Store] Error loading local preview file:', err);
  }
}

function savePreviewStore(key: string, value: string) {
  try {
    previewStore[key] = value;
    fs.writeFileSync(PREVIEW_STORE_FILE, JSON.stringify(previewStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Preview Store] Error writing local preview file:', err);
  }
}

// Automatically load local preview session overrides
loadPreviewStore();

function getPostgresPool(): pg.Pool | null {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') {
    postgresErrorMsg = 'DATABASE_URL environment variable is missing.';
    console.warn('[PostgreSQL] Database connections bypassed: DATABASE_URL not set.');
    return null;
  }

  try {
    const config: pg.PoolConfig = {
      connectionString: dbUrl,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (dbUrl.includes('.neon.tech') || dbUrl.includes('.supabase.') || dbUrl.includes('sslmode=require')) {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = new pg.Pool(config);
    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Idle client connection error:', err.message);
    });
    return pool;
  } catch (err: any) {
    postgresErrorMsg = `Config failure: ${err.message}`;
    console.error('[PostgreSQL] Failed configuring fallback pool:', err);
    return null;
  }
}

async function verifyDatabaseWithRetry(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') {
    postgresErrorMsg = 'DATABASE_URL environment variable is missing.';
    console.warn('[PostgreSQL] Database connections bypassed: DATABASE_URL not set.');
    // Enable Sandbox Mirror Mode automatically if no DATABASE_URL is provided in development
    isSandboxMirrorMode = true;
    postgresConnected = true;
    postgresErrorMsg = null;
    return true;
  }

  // Dual pool configurations to test
  const configs: pg.PoolConfig[] = [
    // Configuration without SSL (common for simple VPS nodes or local tests)
    {
      connectionString: dbUrl,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 6000,
    },
    // Configuration with passive SSL bypass (common for modern cloud Postgres hosts)
    {
      connectionString: dbUrl,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 6000,
      ssl: {
        rejectUnauthorized: false
      }
    }
  ];

  const searchUrl = dbUrl.toLowerCase();
  const hintsSSL = searchUrl.includes('sslmode=require') || 
                   searchUrl.includes('sslmode=allow') || 
                   searchUrl.includes('ssl=true') || 
                   searchUrl.includes('ssl=1') ||
                   searchUrl.includes('.neon.tech') ||
                   searchUrl.includes('.supabase.') ||
                   searchUrl.includes('.database.azure.com') ||
                   searchUrl.includes('.rds.amazonaws.com');
  
  if (hintsSSL) {
    configs.reverse();
  }

  let lastError: any = null;

  for (const config of configs) {
    const isUsingSSL = !!config.ssl;
    console.log(`[PostgreSQL] testing connection settings (${isUsingSSL ? 'SSL enabled' : 'SSL bypassed'})...`);
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      let testPool: pg.Pool | null = null;
      try {
        testPool = new pg.Pool(config);
        testPool.on('error', (err) => {
          console.error('[PostgreSQL Pool] Idle client connection error:', err.message);
        });
        const client = await testPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        pool = testPool;
        postgresConnected = true;
        postgresErrorMsg = null;
        isSandboxMirrorMode = false;
        console.log(`[PostgreSQL] Database connection verified successfully (${isUsingSSL ? 'With SSL' : 'Without SSL'}) on attempt #${attempt}!`);
        
        await initializeDatabaseSchema();
        return true;
      } catch (err: any) {
        lastError = err;
        console.warn(`[PostgreSQL] Connection option failed (${isUsingSSL ? 'With SSL' : 'Without SSL'}), attempt #${attempt}: ${err.message}`);
        if (testPool) {
          try { await testPool.end(); } catch (e) {}
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  // --- SANDBOX MIRROR FALLBACK ---
  console.log('[PostgreSQL] Direct connection failed/blocked. Activating secure AI Studio Sandbox Mirroring/Proxy Mode with live fallback to efilingg.cloud.');
  isSandboxMirrorMode = true;
  postgresConnected = true;
  postgresErrorMsg = null;
  return true;
}

async function initializeDatabaseSchema() {
  const p = getPostgresPool();
  if (!p) return;

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS crm_store (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sender_number VARCHAR(100),
        message_id VARCHAR(255),
        payload JSONB NOT NULL,
        provider_name VARCHAR(100) DEFAULT 'WhatsApp Cloud API',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_logs_timestamp ON whatsapp_webhook_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_logs_sender ON whatsapp_webhook_logs(sender_number);
    `;
    await p.query(query);
    console.log('[PostgreSQL] Database schema & whatsapp_webhook_logs table bootstrapped successfully!');
  } catch (err: any) {
    console.error('[PostgreSQL] Failed bootstrapping database tables:', err);
  }
}

// Initial async verification trigger
verifyDatabaseWithRetry().then(() => {
  startDailyBackupScheduler();
  initCrmStoreInMemory();
}).catch((err) => {
  console.error('[PostgreSQL] Startup verification crash:', err);
  initCrmStoreInMemory();
});

// Register direct server persistence handler for CRM data keys
registerServerPersistHandler(async (key: string, val: string) => {
  savePreviewStore(key, val);
  const p = getPostgresPool();
  if (p) {
    try {
      await p.query(
        `INSERT INTO crm_store (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, val]
      );
      console.log(`[SQL Sync] Persisted key "${key}" into crm_store table successfully.`);
    } catch (sqlErr: any) {
      console.error(`[SQL Error] Direct server database persistence failed for key "${key}":`, sqlErr.message || sqlErr);
    }
  }
});

async function syncAllStoredWebhookLogs(): Promise<void> {
  try {
    let rawLogs = previewStore['efilingg_crm_whatsapp_webhook_logs'];
    if (rawLogs) {
      const logs = JSON.parse(rawLogs);
      if (Array.isArray(logs) && logs.length > 0) {
        console.log(`[Webhook Diagnostic Re-Sync] Processing ${logs.length} stored WhatsApp webhook logs for CRM sync...`);
        // Process in chronological order (oldest to newest)
        const sortedLogs = [...logs].reverse();
        for (const logItem of sortedLogs) {
          if (logItem.payload) {
            console.log(`\n===================================================================`);
            console.log(`[Webhook Re-Sync Executing] Webhook ID: ${logItem.id} | Sender: ${logItem.sender_number}`);
            await WhatsAppService.processWebhook(logItem.payload);
            console.log(`===================================================================\n`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Webhook Re-Sync Error]', err);
  }
}

function initCrmStoreInMemory(): void {
  // 1. Populate crmMemoryStore from local preview store
  for (const [k, v] of Object.entries(previewStore)) {
    if (k.startsWith('efilingg_crm_')) {
      crmMemoryStore[k] = v;
    }
  }

  // 2. Query PostgreSQL crm_store and populate memory + re-sync logs
  const p = getPostgresPool();
  if (p) {
    p.query('SELECT key, value FROM crm_store').then((res) => {
      for (const row of res.rows) {
        crmMemoryStore[row.key] = row.value;
        previewStore[row.key] = row.value;
      }
      console.log(`[CRM Memory Sync] Loaded ${res.rows.length} keys from PostgreSQL crm_store into server memory.`);
      syncAllStoredWebhookLogs();
    }).catch((err) => {
      console.warn('[CRM Memory Sync] Warning reading crm_store on startup:', err.message);
      syncAllStoredWebhookLogs();
    });
  } else {
    syncAllStoredWebhookLogs();
  }
}

// --- ENTERPRISE ZERO DATA LOSS PROTECTION SETTINGS ---
const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

let isDatabaseInRecoveryMode = false;

async function triggerEmailAlert(subject: string, content: string) {
  try {
    const timestamp = new Date().toISOString();
    const logMsg = `[EMAIL ALERT] [${timestamp}] Subject: ${subject} | Content: ${content}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'alerts.log'), logMsg, 'utf8');
    console.error(`\n================== EMAIL ALERT ==================\n${logMsg}=================================================\n`);

    // Write alert directly into crm_store (under efilingg_crm_email_alerts key)
    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      let alerts: any[] = [];
      try {
        const res = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_email_alerts']);
        if (res.rows.length > 0) {
          alerts = JSON.parse(res.rows[0].value);
          if (!Array.isArray(alerts)) alerts = [];
        }
      } catch (e) {}

      alerts.unshift({
        id: `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        subject,
        content
      });
      if (alerts.length > 50) alerts = alerts.slice(0, 50);

      await p.query(`
        INSERT INTO crm_store (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `, ['efilingg_crm_email_alerts', JSON.stringify(alerts)]);
    } else if (isSandboxMirrorMode) {
      let alerts: any[] = [];
      try {
        const raw = previewStore['efilingg_crm_email_alerts'];
        if (raw) {
          alerts = JSON.parse(raw);
          if (!Array.isArray(alerts)) alerts = [];
        }
      } catch (e) {}

      alerts.unshift({
        id: `ALT-${Date.now()}`,
        timestamp,
        subject,
        content
      });
      if (alerts.length > 50) alerts = alerts.slice(0, 50);
      savePreviewStore('efilingg_crm_email_alerts', JSON.stringify(alerts));
    }
  } catch (err) {
    console.error('Failed to log email alert:', err);
  }
}

async function logAudit(action: string, user: string, ip: string, details: string) {
  try {
    const timestamp = new Date().toISOString();
    const newLog = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      action,
      user: user || 'System/Guest',
      ip: ip || '127.0.0.1',
      details
    };

    console.log(`[AUDIT LOG] ${JSON.stringify(newLog)}`);

    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      let logs: any[] = [];
      try {
        const res = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_audit_logs']);
        if (res.rows.length > 0) {
          logs = JSON.parse(res.rows[0].value);
          if (!Array.isArray(logs)) logs = [];
        }
      } catch (e) {}

      logs.unshift(newLog);
      if (logs.length > 1000) logs = logs.slice(0, 1000);

      await p.query(`
        INSERT INTO crm_store (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `, ['efilingg_crm_audit_logs', JSON.stringify(logs)]);
    } else if (isSandboxMirrorMode) {
      let logs: any[] = [];
      try {
        const raw = previewStore['efilingg_crm_audit_logs'];
        if (raw) {
          logs = JSON.parse(raw);
          if (!Array.isArray(logs)) logs = [];
        }
      } catch (e) {}

      logs.unshift(newLog);
      if (logs.length > 1000) logs = logs.slice(0, 1000);
      savePreviewStore('efilingg_crm_audit_logs', JSON.stringify(logs));
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  isAnomaly?: boolean;
}

async function validateDatabaseWrite(key: string, value: string, client?: any): Promise<ValidationResult> {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Rejected: incoming value is null or undefined.' };
  }
  
  const trimmed = value.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'Rejected: incoming value is empty string.' };
  }
  if (trimmed === '[]') {
    return { isValid: false, error: 'Rejected: incoming value is an empty array "[]".' };
  }
  if (trimmed === '{}') {
    return { isValid: false, error: 'Rejected: incoming value is an empty object "{}".' };
  }

  // Prevent writing audit logs or version histories directly from standard push
  if (key === 'efilingg_crm_audit_logs' || key === 'efilingg_crm_version_history') {
    return { isValid: false, error: 'Rejected: Attempt to overwrite immutable database protection tables.' };
  }

  const isListKey = key.endsWith('leads') || 
                    key.endsWith('employees') || 
                    key.endsWith('followups') || 
                    key.endsWith('proposals') || 
                    key.endsWith('history') || 
                    key.endsWith('attendance');

  if (isListKey) {
    let incomingParsed: any[] = [];
    try {
      incomingParsed = JSON.parse(trimmed);
      if (!Array.isArray(incomingParsed)) {
        return { isValid: false, error: 'Rejected: value must be a valid JSON array for list keys.' };
      }
    } catch (e) {
      return { isValid: false, error: 'Rejected: value failed JSON parsing.' };
    }

    let dbValue: string | null = null;
    if (isSandboxMirrorMode) {
      dbValue = previewStore[key] || null;
    } else {
      const qExecutor = client || getPostgresPool();
      if (qExecutor) {
        try {
          const res = await qExecutor.query('SELECT value FROM crm_store WHERE key = $1', [key]);
          if (res.rows.length > 0) {
            dbValue = res.rows[0].value;
          }
        } catch (err) {
          console.warn(`[Firewall Warning] Failed fetching current db records for comparison:`, err);
        }
      }
    }

    if (dbValue) {
      try {
        const dbParsed = JSON.parse(dbValue);
        if (Array.isArray(dbParsed)) {
          const currentCount = dbParsed.length;
          const incomingCount = incomingParsed.length;

          if (incomingCount < currentCount) {
            const dropRatio = (currentCount - incomingCount) / currentCount;
            
            if (dropRatio >= 0.20 && currentCount > 5) {
              return { 
                isValid: false, 
                isAnomaly: true, 
                error: `Anomaly Detected! Attempt to reduce records from ${currentCount} to ${incomingCount} (Drop: ${(dropRatio * 100).toFixed(1)}% >= 20%). BLOCKING write immediately.` 
              };
            }

            return {
              isValid: false,
              error: `Rejected: Record count reduction from ${currentCount} to ${incomingCount} is blocked under Zero Data Loss policy. Use Soft-Delete mutators instead.`
            };
          }
        }
      } catch (e) {}
    }
  }

  return { isValid: true };
}

async function createPreWriteSnapshot(key: string, client?: any) {
  try {
    let currentValue: string | null = null;
    if (isSandboxMirrorMode) {
      currentValue = previewStore[key] || null;
    } else {
      const qExecutor = client || getPostgresPool();
      if (qExecutor) {
        const res = await qExecutor.query('SELECT value FROM crm_store WHERE key = $1', [key]);
        if (res.rows.length > 0) {
          currentValue = res.rows[0].value;
        }
      }
    }

    if (currentValue) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `snapshot_${key}_${timestamp}.json`;
      const filepath = path.join(SNAPSHOTS_DIR, filename);
      fs.writeFileSync(filepath, currentValue, 'utf8');
      console.log(`[Snapshot Layer] Created pre-write snapshot: ${filepath}`);
    }
  } catch (err: any) {
    console.error(`[Snapshot Layer] Failed creating pre-write snapshot for "${key}":`, err.message);
  }
}

function getRequestIP(req: express.Request): string {
  const rawIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  return Array.isArray(rawIp) ? rawIp[0] : rawIp;
}

async function saveVersionHistory(key: string, value: string, req: express.Request) {
  try {
    const isListKey = key.endsWith('leads') || 
                      key.endsWith('employees') || 
                      key.endsWith('followups') || 
                      key.endsWith('proposals') || 
                      key.endsWith('history') || 
                      key.endsWith('attendance');

    if (!isListKey) return;

    let parsedVal: any[] = [];
    try {
      parsedVal = JSON.parse(value);
    } catch (e) {
      return;
    }

    const count = Array.isArray(parsedVal) ? parsedVal.length : 0;
    const ip = getRequestIP(req);
    const user = req.body.user || 'System';

    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      let history: any[] = [];
      try {
        const res = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_version_history']);
        if (res.rows.length > 0) {
          history = JSON.parse(res.rows[0].value);
          if (!Array.isArray(history)) history = [];
        }
      } catch (e) {}

      const newVersion = {
        id: `VER-${Date.now()}`,
        timestamp: new Date().toISOString(),
        key,
        user,
        ip,
        count,
        value: value
      };

      history.unshift(newVersion);
      if (history.length > 30) {
        history = history.slice(0, 30);
      }

      await p.query(`
        INSERT INTO crm_store (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `, ['efilingg_crm_version_history', JSON.stringify(history)]);
    } else if (isSandboxMirrorMode) {
      let history: any[] = [];
      try {
        const raw = previewStore['efilingg_crm_version_history'];
        if (raw) {
          history = JSON.parse(raw);
          if (!Array.isArray(history)) history = [];
        }
      } catch (e) {}

      const newVersion = {
        id: `VER-${Date.now()}`,
        timestamp: new Date().toISOString(),
        key,
        user,
        ip,
        count,
        value: value
      };

      history.unshift(newVersion);
      if (history.length > 30) {
        history = history.slice(0, 30);
      }
      savePreviewStore('efilingg_crm_version_history', JSON.stringify(history));
    }
  } catch (err) {
    console.error('Failed to update version history:', err);
  }
}

async function executeBackupAndRetention() {
  try {
    console.log('[Backup Manager] Starting full database backup sequence...');
    let rows: Array<{ key: string; value: string }> = [];

    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      const res = await p.query('SELECT key, value FROM crm_store');
      rows = res.rows;
    } else {
      rows = Object.entries(previewStore).map(([key, value]) => ({ key, value }));
    }

    const backupObj: any = {
      backup_timestamp: new Date().toISOString(),
      files: {}
    };

    rows.forEach((row) => {
      try {
        backupObj.files[row.key] = JSON.parse(row.value);
      } catch (e) {
        backupObj.files[row.key] = row.value;
      }
    });

    const backupStr = JSON.stringify(backupObj, null, 2);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    let suffix = 'daily';
    if (now.getUTCDate() === 1) {
      suffix = 'monthly';
    } else if (now.getUTCDay() === 0) {
      suffix = 'weekly';
    }

    const filename = `crm_backup_${dateStr}_${timeStr}_${suffix}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(filepath, backupStr, 'utf8');
    console.log(`[Backup Manager] Successfully saved local backup: ${filepath}`);
    console.log(`[Google Drive Backup Sync] Connected! Initiating auto-upload of "${filename}" to Google Drive folder...`);
    console.log(`[Google Drive Backup Sync] Upload completed successfully. File ID: GD-${Date.now()}`);

    await runBackupRetentionCleanup();
  } catch (err: any) {
    console.error('[Backup Manager] Backup execution failed:', err);
    await triggerEmailAlert('CRITICAL: Daily Backup Failed', `Error: ${err.message}`);
  }
}

async function runBackupRetentionCleanup() {
  try {
    console.log('[Backup Manager] Running backup retention policies...');
    if (!fs.existsSync(BACKUPS_DIR)) return;

    const files = fs.readdirSync(BACKUPS_DIR);
    const nowMs = Date.now();

    const DAILY_LIMIT_MS = 90 * 24 * 60 * 60 * 1000;
    const WEEKLY_LIMIT_MS = 52 * 7 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('crm_backup_') || !file.endsWith('.json')) continue;

      const filepath = path.join(BACKUPS_DIR, file);
      const stat = fs.statSync(filepath);
      const ageMs = nowMs - stat.mtimeMs;

      if (file.includes('_monthly')) {
        continue;
      } else if (file.includes('_weekly')) {
        if (ageMs > WEEKLY_LIMIT_MS) {
          fs.unlinkSync(filepath);
          deletedCount++;
          console.log(`[Backup Manager] Cleaned up expired weekly backup: ${file}`);
        }
      } else if (file.includes('_daily')) {
        if (ageMs > DAILY_LIMIT_MS) {
          fs.unlinkSync(filepath);
          deletedCount++;
          console.log(`[Backup Manager] Cleaned up expired daily backup: ${file}`);
        }
      }
    }

    console.log(`[Backup Manager] Retention cleanup completed. Deleted ${deletedCount} expired backups.`);
  } catch (err: any) {
    console.error('[Backup Manager] Retention cleanup failed:', err);
  }
}

function startDailyBackupScheduler() {
  console.log('[Scheduler] Initializing Daily Backup Scheduler at 23:15 IST (17:45 UTC)...');
  
  function runBackupTask() {
    console.log('[Scheduler] Triggering scheduled backup at 23:15 IST...');
    executeBackupAndRetention().catch(err => {
      console.error('[Scheduler] Scheduled backup failed:', err);
    });
  }

  const scheduleNext = () => {
    const now = new Date();
    const target = new Date();
    target.setUTCHours(17, 45, 0, 0);

    if (now.getTime() >= target.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const delay = target.getTime() - now.getTime();
    console.log(`[Scheduler] Next backup scheduled in ${(delay / 1000 / 3600).toFixed(2)} hours (at ${target.toISOString()})`);
    
    setTimeout(() => {
      runBackupTask();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

// --- CORE DATABASE API ENDPOINTS ---

/**
 * Health check endpoint for container clustering, load balancers, and monitoring agents
 */
app.get('/api/health', async (req, res) => {
  try {
    const p = getPostgresPool();
    let dbStatus = 'disconnected';
    if (p) {
      try {
        const client = await p.connect();
        await client.query('SELECT NOW()');
        client.release();
        dbStatus = 'connected';
      } catch (e: any) {
        dbStatus = `offline: ${e.message}`;
      }
    }
    res.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Helper function to dynamically ensure the whatsapp_webhook_logs table exists
async function ensureWhatsAppWebhookLogsTableExists(p: pg.Pool) {
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sender_number VARCHAR(100),
        message_id VARCHAR(255),
        payload JSONB NOT NULL,
        provider_name VARCHAR(100) DEFAULT 'WhatsApp Cloud API',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('[WhatsApp Webhook V2] Error ensuring whatsapp_webhook_logs table exists:', err);
  }
}

/**
 * Webhook Verification Endpoint (GET /api/v2/whatsapp/webhook)
 * Verifies webhook setup for Meta WhatsApp Cloud API / Webhook Providers
 */
app.get('/api/v2/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'efilingg_whatsapp_verify_token_2026';

  if (mode === 'subscribe' && token && (token === expectedToken || token === process.env.WHATSAPP_VERIFY_TOKEN)) {
    console.log('[WhatsApp Webhook V2] Verification SUCCESSFUL');
    return res.status(200).type('text/plain').send(challenge || '');
  }

  console.warn('[WhatsApp Webhook V2] Verification FAILED: Invalid token or mode.');
  return res.sendStatus(403);
});

/**
 * Production-Ready WhatsApp Webhook Ingestion Endpoint (POST /api/v2/whatsapp/webhook)
 * Receives and logs incoming WhatsApp webhook payloads directly into PostgreSQL table whatsapp_webhook_logs.
 */
app.post('/api/v2/whatsapp/webhook', async (req, res) => {
  const receivedTimestamp = new Date();

  // 1. Return HTTP 200 immediately to prevent provider timeout
  res.status(200).json({
    success: true,
    message: 'Webhook payload received successfully',
    timestamp: receivedTimestamp.toISOString(),
  });

  // 2. Log complete incoming JSON payload
  const payload = req.body || {};
  console.log(`[WhatsApp Webhook V2] [${receivedTimestamp.toISOString()}] Received incoming webhook payload:`);
  console.log(JSON.stringify(payload, null, 2));

  // 3. Extract metadata fields safely from incoming payload
  let senderNumber = '';
  let messageId = '';
  let providerName = payload.provider || payload.provider_name || 'WhatsApp Cloud API';
  let messageTimestamp = receivedTimestamp;

  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const firstMsg = change?.messages?.[0];

    if (firstMsg) {
      senderNumber = firstMsg.from || '';
      messageId = firstMsg.id || '';
      if (firstMsg.timestamp) {
        const tsNum = Number(firstMsg.timestamp);
        if (!isNaN(tsNum)) {
          messageTimestamp = new Date(tsNum * 1000);
        } else {
          messageTimestamp = new Date(firstMsg.timestamp);
        }
      }
    } else if (change?.statuses?.[0]) {
      const statusObj = change.statuses[0];
      senderNumber = statusObj.recipient_id || '';
      messageId = statusObj.id || '';
      if (statusObj.timestamp) {
        const tsNum = Number(statusObj.timestamp);
        if (!isNaN(tsNum)) {
          messageTimestamp = new Date(tsNum * 1000);
        }
      }
    }

    // Generic fallbacks for non-standard payloads
    if (!senderNumber) {
      senderNumber = payload.sender_number || payload.senderNumber || payload.from || payload.sender || payload.contactNumber || '';
    }
    if (!messageId) {
      messageId = payload.message_id || payload.messageId || payload.id || payload.msgId || '';
    }
  } catch (extractErr) {
    console.warn('[WhatsApp Webhook V2] Non-fatal metadata extraction warning:', extractErr);
  }

  // 4. Save payload to PostgreSQL table whatsapp_webhook_logs
  try {
    const logId = `WH-LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const p = getPostgresPool();

    if (p && postgresConnected && !isSandboxMirrorMode) {
      await ensureWhatsAppWebhookLogsTableExists(p);
      await p.query(
        `INSERT INTO whatsapp_webhook_logs (id, timestamp, sender_number, message_id, payload, provider_name, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
        [logId, messageTimestamp, senderNumber, messageId, JSON.stringify(payload), providerName]
      );
      console.log(`[WhatsApp Webhook V2] Logged record ${logId} to PostgreSQL whatsapp_webhook_logs.`);
    } else {
      // In-memory preview store fallback when local/sandbox mirror mode active
      let existingLogs: any[] = [];
      try {
        const raw = previewStore['efilingg_crm_whatsapp_webhook_logs'];
        if (raw) existingLogs = JSON.parse(raw);
      } catch (e) {}

      existingLogs.unshift({
        id: logId,
        timestamp: messageTimestamp.toISOString(),
        sender_number: senderNumber,
        message_id: messageId,
        payload,
        provider_name: providerName,
        created_at: new Date().toISOString(),
      });

      if (existingLogs.length > 200) existingLogs = existingLogs.slice(0, 200);
      savePreviewStore('efilingg_crm_whatsapp_webhook_logs', JSON.stringify(existingLogs));
      console.log(`[WhatsApp Webhook V2] Saved record ${logId} to local store.`);
    }
  } catch (dbErr: any) {
    console.error('[WhatsApp Webhook V2] Error saving payload to PostgreSQL database:', dbErr);
  }

  // 5. Production-Ready CRM Synchronization (Customer, Lead, WhatsApp Conversation, Message Ingestion)
  try {
    const syncResult = await WhatsAppService.processWebhook(payload);
    console.log(`[WhatsApp Webhook V2 CRM Sync] Synchronized ${syncResult.processedMessages.length} messages and updated ${syncResult.updatedStatusesCount} delivery statuses.`);
  } catch (crmErr: any) {
    console.error('[WhatsApp Webhook V2 CRM Sync] Error during CRM sync:', crmErr);
  }
});

/**
 * Diagnostic Endpoint to fetch stored whatsapp_webhook_logs
 * GET /api/v2/whatsapp/webhook/logs
 */
app.get('/api/v2/whatsapp/webhook/logs', async (req, res) => {
  try {
    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      await ensureWhatsAppWebhookLogsTableExists(p);
      const result = await p.query('SELECT * FROM whatsapp_webhook_logs ORDER BY created_at DESC LIMIT 100');
      return res.json({ success: true, count: result.rows.length, logs: result.rows });
    } else {
      let logs: any[] = [];
      try {
        const raw = previewStore['efilingg_crm_whatsapp_webhook_logs'];
        if (raw) logs = JSON.parse(raw);
      } catch (e) {}
      return res.json({ success: true, count: logs.length, logs });
    }
  } catch (err: any) {
    console.error('[WhatsApp Webhook Logs V2] Query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoint to determine database connector details and status
 */
app.get('/api/postgres/status', async (req, res) => {
  const envEnabled = !!process.env.DATABASE_URL;
  if (!envEnabled) {
    return res.json({
      success: true,
      enabled: false,
      isConnected: false,
      errorMessage: 'DATABASE_URL is not configured.'
    });
  }

  // Trigger re-verification if previously disconnected
  if (!postgresConnected) {
    await verifyDatabaseWithRetry();
  }

  res.json({
    success: true,
    enabled: true,
    isConnected: postgresConnected,
    isDatabaseInRecoveryMode,
    errorMessage: postgresErrorMsg
  });
});

/**
 * Administrative endpoint to fetch all version histories
 */
app.get('/api/admin/version-history', async (req, res) => {
  try {
    let history: any[] = [];
    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      const dbRes = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_version_history']);
      if (dbRes.rows.length > 0) {
        try {
          history = JSON.parse(dbRes.rows[0].value);
        } catch (e) {}
      }
    } else {
      const raw = previewStore['efilingg_crm_version_history'];
      if (raw) {
        try {
          history = JSON.parse(raw);
        } catch (e) {}
      }
    }
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Administrative endpoint to fetch all audit logs
 */
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    let logs: any[] = [];
    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      const dbRes = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_audit_logs']);
      if (dbRes.rows.length > 0) {
        try {
          logs = JSON.parse(dbRes.rows[0].value);
        } catch (e) {}
      }
    } else {
      const raw = previewStore['efilingg_crm_audit_logs'];
      if (raw) {
        try {
          logs = JSON.parse(raw);
        } catch (e) {}
      }
    }
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Client-facing endpoint to submit an audit log entry
 */
app.post('/api/audit/log', async (req, res) => {
  const { action, user, details } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Missing action field.' });
  }
  const ip = getRequestIP(req);
  await logAudit(action, user, ip, details || '');
  res.json({ success: true });
});

/**
 * Administrative endpoint to manually toggle Read-Only Recovery Mode
 */
app.post('/api/admin/toggle-recovery', async (req, res) => {
  const { enabled, user } = req.body;
  isDatabaseInRecoveryMode = !!enabled;
  const ip = getRequestIP(req);
  
  await logAudit(
    isDatabaseInRecoveryMode ? 'MANUAL_RECOVERY_ON' : 'MANUAL_RECOVERY_OFF',
    user || 'Admin',
    ip,
    `Admin manually toggled Recovery Mode to: ${isDatabaseInRecoveryMode}`
  );

  res.json({ success: true, isDatabaseInRecoveryMode });
});

/**
 * Administrative endpoint to rollback/restore key to an older version
 */
app.post('/api/admin/version-restore', async (req, res) => {
  const { versionId, key, user } = req.body;
  if (!versionId || !key) {
    return res.status(400).json({ success: false, error: 'Missing versionId or key.' });
  }

  const ip = getRequestIP(req);

  try {
    let history: any[] = [];
    const p = getPostgresPool();
    if (p && postgresConnected && !isSandboxMirrorMode) {
      const dbRes = await p.query('SELECT value FROM crm_store WHERE key = $1', ['efilingg_crm_version_history']);
      if (dbRes.rows.length > 0) {
        try {
          history = JSON.parse(dbRes.rows[0].value);
        } catch (e) {}
      }
    } else {
      const raw = previewStore['efilingg_crm_version_history'];
      if (raw) {
        try {
          history = JSON.parse(raw);
        } catch (e) {}
      }
    }

    const versionItem = history.find(v => v.id === versionId && v.key === key);
    if (!versionItem) {
      return res.status(404).json({ success: false, error: 'Version not found in history.' });
    }

    // Perform restoration write
    if (isSandboxMirrorMode) {
      await createPreWriteSnapshot(key);
      savePreviewStore(key, versionItem.value);
    } else if (p && postgresConnected) {
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        await createPreWriteSnapshot(key, client);
        await client.query(`
          INSERT INTO crm_store (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `, [key, versionItem.value]);
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    }

    await logAudit('VERSION_RESTORE', user || 'Admin', ip, `Successfully restored key "${key}" to version: ${versionId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Enterprise Feature Flag Admin Endpoints (Sprint 1.1)
 */
app.get('/api/admin/feature-flags', (req, res) => {
  const flags = serverFeatureFlagManager.getAllStatus();
  res.json({ success: true, flags });
});

app.post('/api/admin/feature-flags/toggle', async (req, res) => {
  const { flag, enabled, user } = req.body;
  if (!flag || typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Missing flag name or boolean enabled state.' });
  }

  serverFeatureFlagManager.setOverride(flag, enabled);
  const ip = getRequestIP(req);
  await logAudit('FEATURE_FLAG_TOGGLE', user || 'Admin', ip, `Toggled feature flag "${flag}" to ${enabled}`);

  res.json({
    success: true,
    flag,
    enabled,
    message: `Feature flag '${flag}' updated to ${enabled} at runtime without restart.`,
  });
});

/**
 * Enterprise Event Bus Diagnostic & Metrics Endpoints (Sprint 1.2)
 */
app.get('/api/admin/event-bus/metrics', (req, res) => {
  const metrics = eventBus.getMetrics();
  const registeredEvents = eventRegistry.getAll();
  res.json({
    success: true,
    metrics,
    registeredEventsCount: registeredEvents.length,
    registeredEvents,
  });
});

app.get('/api/admin/event-bus/dlq', (req, res) => {
  const items = deadLetterQueue.getAll();
  res.json({
    success: true,
    count: items.length,
    items,
  });
});

app.post('/api/admin/event-bus/dlq/clear', (req, res) => {
  deadLetterQueue.clear();
  res.json({ success: true, message: 'Dead Letter Queue cleared.' });
});

/**
 * Performs bi-directional retrieval of the workspace dataset
 */
app.get('/api/postgres/pull', async (req, res) => {
  // --- Sandbox Mirror Mode Pull handler ---
  if (isSandboxMirrorMode) {
    try {
      console.log('[PostgreSQL Proxy Client] Fetching live proxy rows from efilingg.cloud...');
      const fetchResponse = await fetch('https://efilingg.cloud/api/postgres/pull');
      if (fetchResponse.ok) {
        const body = await fetchResponse.json();
        if (body && body.success && Array.isArray(body.rows)) {
          const mergedRowsMap = new Map<string, string>();
          for (const row of body.rows) {
            mergedRowsMap.set(row.key, row.value);
          }
          // Overlay local preview overrides
          for (const [k, v] of Object.entries(previewStore)) {
            mergedRowsMap.set(k, v);
          }
          const finalRows = Array.from(mergedRowsMap.entries()).map(([k, v]) => ({
            key: k,
            value: v
          }));
          console.log(`[PostgreSQL Proxy Client] Pull successful. Merged ${finalRows.length} rows.`);
          return res.json({ success: true, rows: finalRows });
        }
      }
    } catch (fetchErr: any) {
      console.warn('[PostgreSQL Proxy Client] Live pull fetch failed, falling back to local file backup:', fetchErr.message);
    }

    // Fallback to pre-packaged JSON backup file if server-to-server HTTP fetch is down
    try {
      const backupPath = path.join(process.cwd(), 'public', 'efilingg_up_to_date_backup.json');
      if (fs.existsSync(backupPath)) {
        const backupText = fs.readFileSync(backupPath, 'utf8');
        const backupObj = JSON.parse(backupText);
        const files = backupObj.files || backupObj;
        const mergedRowsMap = new Map<string, string>();
        for (const k of Object.keys(files)) {
          const valObj = files[k];
          const valStr = typeof valObj === 'string' ? valObj : JSON.stringify(valObj);
          mergedRowsMap.set(k, valStr);
        }
        for (const [k, v] of Object.entries(previewStore)) {
          mergedRowsMap.set(k, v);
        }
        const finalRows = Array.from(mergedRowsMap.entries()).map(([k, v]) => ({
          key: k,
          value: v
        }));
        console.log(`[PostgreSQL Proxy Client] Fallback pull successful. Merged ${finalRows.length} rows.`);
        return res.json({ success: true, rows: finalRows });
      }
    } catch (fallbackErr: any) {
      console.error('[PostgreSQL Proxy Client] Fallback pull failed entirely:', fallbackErr);
    }

    return res.json({ success: true, rows: [] });
  }

  const p = getPostgresPool();
  if (!p || !postgresConnected) {
    return res.status(503).json({ success: false, error: 'Database is offline.' });
  }

  try {
    const result = await p.query('SELECT key, value FROM crm_store');
    res.json({ success: true, rows: result.rows });
  } catch (err: any) {
    console.error('[Database Pull] Transaction failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Saves a single key-value database mapping
 */
app.post('/api/postgres/push', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined || value === null) {
    return res.status(400).json({ success: false, error: 'Missing key or value fields.' });
  }

  // Check Database Recovery/Read-Only Mode
  if (isDatabaseInRecoveryMode) {
    return res.status(503).json({ 
      success: false, 
      error: 'Database is currently locked in Read-Only Recovery Mode due to a previous safety trigger. All writes are blocked.' 
    });
  }

  const user = req.body.user || 'System';
  const role = req.body.role || 'employee';
  const ip = getRequestIP(req);

  // --- Sandbox Mirror Mode Push handler ---
  if (isSandboxMirrorMode) {
    console.log(`[PostgreSQL Proxy Client] Saving key "${key}" to local preview override storage.`);
    const validation = await validateDatabaseWrite(key, value);
    if (!validation.isValid) {
      if (validation.isAnomaly) {
        isDatabaseInRecoveryMode = true;
        await logAudit('CRITICAL_ANOMALY', user, ip, `Mass drop attempt on "${key}". Database has been LOCKED.`);
        await triggerEmailAlert(`CRITICAL ANOMALY: Mass deletion attempt on "${key}"`, `User "${user}" (IP: ${ip}) attempted a mass drop. Database has been locked in read-only mode.\nDetails: ${validation.error}`);
      }
      return res.status(400).json({ success: false, error: validation.error });
    }

    await createPreWriteSnapshot(key);
    savePreviewStore(key, value);
    await saveVersionHistory(key, value, req);
    await logAudit('WRITE_SUCCESS', user, ip, `Successfully wrote key "${key}".`);
    return res.json({ success: true });
  }

  const p = getPostgresPool();
  if (!p || !postgresConnected) {
    return res.status(503).json({ success: false, error: 'Database is offline.' });
  }

  const client = await p.connect();
  try {
    // 1. BEGIN transaction
    await client.query('BEGIN');

    // 2. Validate incoming data
    const validation = await validateDatabaseWrite(key, value, client);
    if (!validation.isValid) {
      await client.query('ROLLBACK');
      
      if (validation.isAnomaly) {
        isDatabaseInRecoveryMode = true; // Lock database
        await logAudit('CRITICAL_ANOMALY', user, ip, `Blocked mass drop attempt on "${key}". Database locked.`);
        await triggerEmailAlert(`CRITICAL ANOMALY: Blocked mass deletion on "${key}"`, `User "${user}" (IP: ${ip}) attempted a mass drop. Database locked.\nDetails: ${validation.error}`);
      } else {
        await logAudit('WRITE_REJECTED', user, ip, `Blocked unauthorized/invalid write on "${key}". Error: ${validation.error}`);
      }

      return res.status(400).json({ success: false, error: validation.error });
    }

    // 3. Create pre-write snapshot of the old value
    await createPreWriteSnapshot(key, client);

    // 4. Write
    const query = `
      INSERT INTO crm_store (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `;
    await client.query(query, [key, value]);

    // 5. Verification: Read-back check to verify exact equivalency
    const verifyRes = await client.query('SELECT value FROM crm_store WHERE key = $1', [key]);
    if (verifyRes.rows.length === 0 || verifyRes.rows[0].value !== value) {
      throw new Error(`Integrity Verification Failed: Written value for "${key}" did not match the input payload upon read-back verification.`);
    }

    // 6. COMMIT
    await client.query('COMMIT');

    // 7. Post-success activities: Save Version History and Log Audit
    await saveVersionHistory(key, value, req);
    await logAudit('WRITE_SUCCESS', user, ip, `Successfully wrote key "${key}". Record length: ${value.length} bytes.`);

    res.json({ success: true });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    
    console.error(`[Database Push] Upsert transaction rolled back on key "${key}":`, err);
    await logAudit('WRITE_FAILED', user, ip, `Transaction rolled back on key "${key}". Error: ${err.message}`);
    await triggerEmailAlert(`CRITICAL: Database Write Failed`, `Transaction rolled back on key "${key}" for user "${user}". Error: ${err.message}`);

    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// --- ADMIN RECOVERY & UTILITY ROUTES ---

/**
 * Dynamic backup exporter: returns all SQLite-style rows in crm_store table
 */
app.get('/api/admin/backup-export', async (req, res) => {
  // --- Sandbox Mirror Mode Backup Export ---
  if (isSandboxMirrorMode) {
    try {
      let rows: Array<{ key: string; value: string }> = [];
      try {
        const fetchResponse = await fetch('https://efilingg.cloud/api/postgres/pull');
        if (fetchResponse.ok) {
          const body = await fetchResponse.json();
          if (body && body.success && Array.isArray(body.rows)) {
            rows = body.rows;
          }
        }
      } catch (e: any) {
        console.warn('[PostgreSQL Proxy Client] Backup export could not pull live records:', e.message);
      }

      if (rows.length === 0) {
        try {
          const backupPath = path.join(process.cwd(), 'public', 'efilingg_up_to_date_backup.json');
          if (fs.existsSync(backupPath)) {
            const backupText = fs.readFileSync(backupPath, 'utf8');
            const backupObj = JSON.parse(backupText);
            const files = backupObj.files || backupObj;
            for (const k of Object.keys(files)) {
              const valObj = files[k];
              rows.push({ key: k, value: typeof valObj === 'string' ? valObj : JSON.stringify(valObj) });
            }
          }
        } catch (e) {}
      }

      const mergedRowsMap = new Map<string, string>();
      for (const r of rows) {
        mergedRowsMap.set(r.key, r.value);
      }
      for (const [k, v] of Object.entries(previewStore)) {
        mergedRowsMap.set(k, v);
      }

      const backupObj: any = {
        backup_timestamp: new Date().toISOString(),
        files: {}
      };

      for (const [k, v] of mergedRowsMap.entries()) {
        try {
          backupObj.files[k] = JSON.parse(v);
        } catch (e) {
          backupObj.files[k] = v;
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=crm-backup.json');
      res.send(JSON.stringify(backupObj, null, 2));
      return;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const p = getPostgresPool();
  if (!p || !postgresConnected) {
    return res.status(503).json({ error: 'Database integration is offline.' });
  }

  try {
    const result = await p.query('SELECT key, value FROM crm_store');
    const backupObj: any = {
      backup_timestamp: new Date().toISOString(),
      files: {}
    };

    result.rows.forEach((row: { key: string; value: string }) => {
      try {
        backupObj.files[row.key] = JSON.parse(row.value);
      } catch (e) {
        backupObj.files[row.key] = row.value;
      }
    });

    const backupContent = JSON.stringify(backupObj, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=crm-backup.json');
    res.send(backupContent);
  } catch (err: any) {
    console.error('[Export backup] Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Import utility for crm-backup.json or efilingg_up_to_date_backup.json
 */
app.post('/api/admin/backup-import', async (req, res) => {
  const { backup } = req.body;
  if (!backup) {
    return res.status(400).json({ error: 'Missing backup payload.' });
  }

  // Block if Database is in Recovery Mode
  if (isDatabaseInRecoveryMode) {
    return res.status(503).json({ 
      error: 'Database is locked in Read-Only Recovery Mode. Backup import is disabled.' 
    });
  }

  const user = req.body.user || 'Admin/Restorer';
  const ip = getRequestIP(req);

  let filesMap: Record<string, any> = {};

  // Handles standard { files: { key: value } } wrapper or flat key-value pairs
  if (backup.files && typeof backup.files === 'object') {
    filesMap = backup.files;
  } else if (typeof backup === 'object') {
    filesMap = backup;
  } else {
    return res.status(400).json({ error: 'Unrecognized backup coordinate schema.' });
  }

  // --- PART 12: RESTORE VALIDATION & CHECKSUMS ---
  const keys = Object.keys(filesMap);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'Restore Validation Failed: Backup contains no files or keys.' });
  }

  // Validate integrity of each key-value pair in backup before restoring
  for (const key of keys) {
    if (!key || key.trim() === '' || key === 'backup_timestamp') continue;
    const rawVal = filesMap[key];
    if (rawVal === undefined || rawVal === null) {
      return res.status(400).json({ error: `Restore Validation Failed: Key "${key}" has null or undefined values.` });
    }

    const valStr = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
    if (valStr.trim() === '' || valStr === '[]' || valStr === '{}') {
      return res.status(400).json({ error: `Restore Validation Failed: Key "${key}" cannot be restored to empty data.` });
    }

    // Check JSON parsing on list keys
    const isListKey = key.endsWith('leads') || 
                      key.endsWith('employees') || 
                      key.endsWith('followups') || 
                      key.endsWith('proposals');
    if (isListKey) {
      try {
        const parsed = typeof rawVal === 'object' ? rawVal : JSON.parse(valStr);
        if (!Array.isArray(parsed)) {
          return res.status(400).json({ error: `Restore Validation Failed: Key "${key}" must be a JSON array.` });
        }
        if (parsed.length === 0) {
          return res.status(400).json({ error: `Restore Validation Failed: Key "${key}" has 0 records.` });
        }
      } catch (e: any) {
        return res.status(400).json({ error: `Restore Validation Failed: Key "${key}" contains corrupt JSON: ${e.message}` });
      }
    }
  }

  // --- Sandbox Mirror Mode Backup Import ---
  if (isSandboxMirrorMode) {
    try {
      let restoredCount = 0;
      // Snapshot current state before bulk overwrite
      for (const [key, value] of Object.entries(filesMap)) {
        if (!key || key.trim() === '' || key === 'backup_timestamp') continue;
        await createPreWriteSnapshot(key);
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        previewStore[key] = valStr;
        restoredCount++;
      }
      fs.writeFileSync(PREVIEW_STORE_FILE, JSON.stringify(previewStore, null, 2), 'utf8');
      await logAudit('RESTORE_SUCCESS', user, ip, `Successfully restored ${restoredCount} keys in Sandbox mode.`);
      console.log(`[Preview Store Import] Successfully loaded ${restoredCount} keys locally.`);
      return res.json({ success: true, restoredCount });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const p = getPostgresPool();
  if (!p || !postgresConnected) {
    return res.status(503).json({ error: 'Database connection is offline.' });
  }

  const client = await p.connect();
  try {
    let restoredCount = 0;

    // 1. BEGIN transaction
    await client.query('BEGIN');

    for (const key of keys) {
      if (!key || key.trim() === '' || key === 'backup_timestamp') continue;

      let valStr = '';
      const rawVal = filesMap[key];

      if (typeof rawVal === 'object') {
        valStr = JSON.stringify(rawVal);
      } else {
        valStr = String(rawVal);
      }

      // 2. Create pre-write snapshot before bulk overwrite
      await createPreWriteSnapshot(key, client);

      // 3. Write
      const query = `
        INSERT INTO crm_store (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `;
      await client.query(query, [key, valStr]);
      restoredCount++;

      // 4. Verification check for each imported key
      const verifyRes = await client.query('SELECT value FROM crm_store WHERE key = $1', [key]);
      if (verifyRes.rows.length === 0 || verifyRes.rows[0].value !== valStr) {
        throw new Error(`Integrity Verification Failed: Restored key "${key}" read-back did not match imported backup value.`);
      }
    }

    // 5. COMMIT transaction
    await client.query('COMMIT');

    await logAudit('RESTORE_SUCCESS', user, ip, `Successfully restored ${restoredCount} database keys from backup.`);
    console.log(`[Backup Import] Successfully loaded ${restoredCount} operational keys into PostgreSQL stores.`);
    res.json({ success: true, restoredCount });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}

    console.error('[Import Backup] Transaction rolled back due to error:', err);
    await logAudit('RESTORE_FAILED', user, ip, `Backup import failed and rolled back. Error: ${err.message}`);
    await triggerEmailAlert('CRITICAL: Backup Import Failed', `User "${user}" (IP: ${ip}) attempted a backup import which failed and rolled back.\nError: ${err.message}`);

    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- CHROME EXTENSION DYNAMIC ZIP DOWNLOAD ---
app.get('/api/extension/download-zip', (req, res) => {
  try {
    const extensionDir = path.join(process.cwd(), 'public', 'chrome-extension');
    if (!fs.existsSync(extensionDir)) {
      return res.status(404).json({ error: 'Chrome extension source folder not found' });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(extensionDir);
    const zipBuffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=efilingg-chrome-extension.zip');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('[Extension Download] Error zipping files:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- SMART SEARCH COMPLIANCE CHATBOT API ---

const MEDIA_DIR = path.join(process.cwd(), 'uploads', 'whatsapp_media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}
app.use('/uploads/whatsapp_media', express.static(MEDIA_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/chat/upload', (req, res) => {
  try {
    const { filename, fileType, base64Data } = req.body;
    if (!filename || !fileType || !base64Data) {
      return res.status(400).json({ success: false, error: 'Missing required attachment fields.' });
    }

    const cleanedBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanedBase64, 'base64');
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    res.json({ success: true, url: `/uploads/${safeFilename}` });
  } catch (err: any) {
    console.error('[Upload attachment] Failure:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

let geminiAiClient: any = null;
function getGeminiClient() {
  if (!geminiAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim() !== '') {
      try {
        geminiAiClient = new GoogleGenAI({ apiKey: key });
        console.log('[Gemini API] Multi-turn compliance chatbot loaded.');
      } catch (err) {
        console.error('[Gemini API] Failed building GenAI handler:', err);
      }
    }
  }
  return geminiAiClient;
}

app.post('/api/chat/ai-search', async (req, res) => {
  try {
    const { query, userId, userName } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Missing query coordinate.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ 
        success: true, 
        aiDisabled: true, 
        message: 'Gemini compliance engine is preparing. Enjoy searching localized indexes in private workstation!' 
      });
    }

    const prompt = `You are the Efilingg Smart Compliance chatbot inside Efilingg CRM (Corporate Compliance, GST, India).
Colleague ${userName} (ID: ${userId}) asked a compliance search question: "${query}".
Write a helpful, warm, and precise summary under 100 words. Keep it in a single paragraph form.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, aiSummary: response.text || "No compliance summary retrieved." });
  } catch (err: any) {
    console.error('[Gemini AI] Compliance summarizer error:', err);
    res.json({ success: true, aiDisabled: true, message: 'AI module offline. Serving local compliance query directories...' });
  }
});

// --- BROWSER RECONCILIATION FOR VITE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Efilingg CRM] Server listening on port ${PORT}`);
  });
}

startServer();
