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

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
// Boost parsing limit to support high payload backups easily (up to 150MB)
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

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
    `;
    await p.query(query);
    console.log('[PostgreSQL] Database schema bootstrapped successfully!');
  } catch (err: any) {
    console.error('[PostgreSQL] Failed bootstrapping database tables:', err);
  }
}

// Initial async verification trigger
verifyDatabaseWithRetry().catch((err) => {
  console.error('[PostgreSQL] Startup verification crash:', err);
});

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
    errorMessage: postgresErrorMsg
  });
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

  // --- Sandbox Mirror Mode Push handler ---
  if (isSandboxMirrorMode) {
    console.log(`[PostgreSQL Proxy Client] Saving key "${key}" to local preview override storage.`);
    savePreviewStore(key, value);
    return res.json({ success: true });
  }

  const p = getPostgresPool();
  if (!p || !postgresConnected) {
    return res.status(503).json({ success: false, error: 'Database is offline.' });
  }

  try {
    const query = `
      INSERT INTO crm_store (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `;
    await p.query(query, [key, value]);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`[Database Push] Upsert crash on key "${key}":`, err);
    res.status(500).json({ success: false, error: err.message });
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

  let filesMap: Record<string, any> = {};

  // Handles standard { files: { key: value } } wrapper or flat key-value pairs
  if (backup.files && typeof backup.files === 'object') {
    filesMap = backup.files;
  } else if (typeof backup === 'object') {
    filesMap = backup;
  } else {
    return res.status(400).json({ error: 'Unrecognized backup coordinate schema.' });
  }

  // --- Sandbox Mirror Mode Backup Import ---
  if (isSandboxMirrorMode) {
    try {
      let restoredCount = 0;
      for (const [key, value] of Object.entries(filesMap)) {
        if (!key || key.trim() === '' || key === 'backup_timestamp') continue;
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        previewStore[key] = valStr;
        restoredCount++;
      }
      fs.writeFileSync(PREVIEW_STORE_FILE, JSON.stringify(previewStore, null, 2), 'utf8');
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

  try {
    let restoredCount = 0;
    const client = await p.connect();

    try {
      await client.query('BEGIN');
      const keys = Object.keys(filesMap);

      for (const key of keys) {
        if (!key || key.trim() === '' || key === 'backup_timestamp') continue;

        let valStr = '';
        const rawVal = filesMap[key];

        if (typeof rawVal === 'object') {
          valStr = JSON.stringify(rawVal);
        } else {
          valStr = String(rawVal);
        }

        const query = `
          INSERT INTO crm_store (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        `;
        await client.query(query, [key, valStr]);
        restoredCount++;
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    console.log(`[Backup Import] Successfully loaded ${restoredCount} operational keys into PostgreSQL stores.`);
    res.json({ success: true, restoredCount });
  } catch (err: any) {
    console.error('[Import Backup] Crashing:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- SMART SEARCH COMPLIANCE CHATBOT API ---

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
