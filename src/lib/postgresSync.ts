/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PostgreSQL Database Single-Source-of-Truth Sync Client
 * 100% Client-side in-memory cache sync logic - NO LOCALSTORAGE BACKUPS!
 */

import { crmMemoryStore, initializeDB } from './db';

// Database synchronization properties
export let usePostgresSync = false;
export let postgresConfigured = false;
export let postgresConnected = false;
export let postgresErrorMsg: string | null = null;

export async function detectPostgresStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/postgres/status');
    const data = await res.json();
    if (data && data.success) {
      postgresConfigured = data.enabled;
      postgresConnected = data.isConnected;
      postgresErrorMsg = data.errorMessage;
      usePostgresSync = data.enabled;
      console.log(`[Database Sync Checker] Configured: ${postgresConfigured}, Connected: ${postgresConnected}.`);
      
      if (!postgresConfigured) {
        updateSyncMeta({ status: 'idle', errorMessage: null });
      } else if (!postgresConnected) {
        updateSyncMeta({ status: 'error', errorMessage: postgresErrorMsg || 'Failed to connect to PostgreSQL database.' });
      } else {
        updateSyncMeta({ status: 'connected', errorMessage: null });
      }
      return usePostgresSync;
    }
  } catch (err: any) {
    console.error('[Database Sync Checker] Failed to verify state:', err);
    updateSyncMeta({ status: 'error', errorMessage: err.message || 'Verification request failed' });
  }
  return false;
}

// Define storage keys to be synchronized
const STORAGE_PREFIX = 'efilingg_crm_';
export const SYNC_KEYS = [
  `${STORAGE_PREFIX}employees`,
  `${STORAGE_PREFIX}leads`,
  `${STORAGE_PREFIX}followups`,
  `${STORAGE_PREFIX}history`,
  `${STORAGE_PREFIX}transfers`,
  `${STORAGE_PREFIX}proposals`,
  `${STORAGE_PREFIX}notifications`,
  `${STORAGE_PREFIX}logs`,
  `${STORAGE_PREFIX}services`,
  `${STORAGE_PREFIX}proposaltemplate`,
  `${STORAGE_PREFIX}offerlettertemplate`,
  `${STORAGE_PREFIX}historical_payroll`,
  `${STORAGE_PREFIX}attendance`,
  `${STORAGE_PREFIX}attendance_audit`,
  `${STORAGE_PREFIX}team_leader_mappings`,
  `${STORAGE_PREFIX}leave_requests`,
  `${STORAGE_PREFIX}resignations`,
  `${STORAGE_PREFIX}chat_conversations`,
  `${STORAGE_PREFIX}chat_messages`,
  `${STORAGE_PREFIX}chat_announcements`,
  `${STORAGE_PREFIX}chat_tasks`,
  `${STORAGE_PREFIX}chat_notifications`,
  `${STORAGE_PREFIX}chat_audit_logs`,
  // V2 Storage Keys as well
  `${STORAGE_PREFIX}v2_auditors`,
  `${STORAGE_PREFIX}v2_attorneys`,
  `${STORAGE_PREFIX}v2_gst_clients`,
  `${STORAGE_PREFIX}v2_gst_returns`,
  `${STORAGE_PREFIX}v2_mca_clients`,
  `${STORAGE_PREFIX}v2_mca_roc_returns`,
  `${STORAGE_PREFIX}v2_itr_clients`,
  `${STORAGE_PREFIX}v2_trust_clients`,
  `${STORAGE_PREFIX}v2_dsc_clients`,
  `${STORAGE_PREFIX}v2_other_services`,
  `${STORAGE_PREFIX}v2_trademarks`,
  `${STORAGE_PREFIX}v2_tasks`
];

// Status tracker for live connection
export interface PostgresSyncMeta {
  status: 'idle' | 'syncing' | 'connected' | 'error' | 'no_table';
  errorMessage: string | null;
  lastSyncedAt: string | null;
}

// Strict gate to prevent initial memory-state seeds from overwriting remote database until we've pulled
export let isCloudPullCompleted = false;

let activePushesCount = 0;
const pushCompletedListeners = new Set<() => void>();

export function hasPendingPushes(): boolean {
  return activePushesCount > 0;
}

export async function waitForPendingPushes(): Promise<void> {
  if (activePushesCount <= 0) return;
  return new Promise<void>((resolve) => {
    const listener = () => {
      if (activePushesCount <= 0) {
        pushCompletedListeners.delete(listener);
        resolve();
      }
    };
    pushCompletedListeners.add(listener);
  });
}

let syncMeta: PostgresSyncMeta = {
  status: 'idle',
  errorMessage: null,
  lastSyncedAt: null,
};

// Listeners for UI components to respond when sync state changes
const listeners = new Set<(meta: PostgresSyncMeta) => void>();

export function subscribeToSync(listener: (meta: PostgresSyncMeta) => void) {
  listeners.add(listener);
  listener({ ...syncMeta });
  return () => {
    listeners.delete(listener);
  };
}

function updateSyncMeta(updates: Partial<PostgresSyncMeta>) {
  syncMeta = { ...syncMeta, ...updates };
  listeners.forEach((listener) => listener({ ...syncMeta }));
}

export function getSyncMeta(): PostgresSyncMeta {
  return { ...syncMeta };
}

/**
 * Pushes a single key-value update to PostgreSQL database
 */
export async function pushToPostgres(key: string, value: string): Promise<boolean> {
  if (!postgresConfigured) {
    await detectPostgresStatus();
  }

  if (!usePostgresSync) {
    console.log(`[Database Sync] pushToPostgres bypassed for "${key}" because Database is offline.`);
    return true;
  }

  if (!isCloudPullCompleted) {
    console.log(`[Database Sync] pushToPostgres blocked for "${key}". Pull has not completed yet.`);
    return false;
  }

  activePushesCount++;
  try {
    const res = await fetch('/api/postgres/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    const data = await res.json();
    if (data && data.success) {
      updateSyncMeta({ status: 'connected', errorMessage: null, lastSyncedAt: new Date().toLocaleTimeString() });
      return true;
    } else {
      updateSyncMeta({ status: 'error', errorMessage: data.error || 'Server push failed' });
      return false;
    }
  } catch (err: any) {
    console.error(`Error pushing key ${key}:`, err);
    updateSyncMeta({ status: 'error', errorMessage: err.message || 'Database connection error' });
    return false;
  } finally {
    activePushesCount--;
    if (activePushesCount <= 0) {
      pushCompletedListeners.forEach((listener) => {
        try {
          listener();
        } catch (e) {
          console.error('[Database Sync] Listener error:', e);
        }
      });
    }
  }
}

export function mergeEmployeeLists(localList: any[], cloudList: any[]): any[] {
  const mergedMap = new Map<string, any>();

  const isDefaultPassword = (pw: string) => {
    if (!pw) return true;
    const lower = pw.toLowerCase();
    return lower === 'login@123' || lower === 'efilingg@123';
  };

  cloudList.forEach(e => {
    if (e && e.id) {
      mergedMap.set(e.id, { ...e });
    }
  });

  localList.forEach(localItem => {
    if (localItem && localItem.id) {
      const cloudItem = mergedMap.get(localItem.id);
      if (cloudItem) {
        let merged = { ...cloudItem, ...localItem };

        const isLocalChanged = localItem.isPasswordChanged === true;
        const isCloudChanged = cloudItem.isPasswordChanged === true;

        if (isLocalChanged || isCloudChanged) {
          merged.isPasswordChanged = true;
        }

        const localPw = localItem.password;
        const cloudPw = cloudItem.password;

        if (!isDefaultPassword(localPw) && isDefaultPassword(cloudPw)) {
          merged.password = localPw;
        } else if (isDefaultPassword(localPw) && !isDefaultPassword(cloudPw)) {
          merged.password = cloudPw;
        } else if (!isDefaultPassword(localPw) && !isDefaultPassword(cloudPw)) {
          if (isLocalChanged && !isCloudChanged) {
            merged.password = localPw;
          } else if (!isLocalChanged && isCloudChanged) {
            merged.password = cloudPw;
          } else {
            merged.password = localPw || cloudPw;
          }
        }
        
        mergedMap.set(localItem.id, merged);
      } else {
        mergedMap.set(localItem.id, localItem);
      }
    }
  });

  // ENFORCE password policy for designated employees
  const list = Array.from(mergedMap.values());
  list.forEach(e => {
    if (e && e.email) {
      const emailL = e.email.toLowerCase().trim();
      if (emailL === 'neha2026@efilingg.com' || emailL === 'khatib@efilingg.com') {
        e.password = 'Win@2026';
        e.isPasswordChanged = true;
      }
    }
  });

  return list;
}

function mergeArraysCloudWins<T extends { id?: string; teamLeaderId?: string }>(localArr: T[], cloudArr: T[]): T[] {
  const mergedMap = new Map<string, T>();
  localArr.forEach((item) => {
    const itemId = item ? (item.id || item.teamLeaderId) : undefined;
    if (itemId) {
      mergedMap.set(itemId, item);
    }
  });

  cloudArr.forEach((cloudItem) => {
    const itemId = cloudItem ? (cloudItem.id || cloudItem.teamLeaderId) : undefined;
    if (itemId) {
      const localItem = mergedMap.get(itemId);
      if (localItem) {
        let merged = { ...localItem, ...cloudItem };
        mergedMap.set(itemId, merged);
      } else {
        mergedMap.set(itemId, cloudItem);
      }
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Pulls all keys from PostgreSQL crm_store table and restores them to active in-memory cache
 */
export async function pullFromPostgres(): Promise<boolean> {
  if (!postgresConfigured) {
    await detectPostgresStatus();
  }

  if (!usePostgresSync) {
    console.log('[Database Sync] pullFromPostgres bypassed because Database is offline.');
    isCloudPullCompleted = true; // Unlock so app serves standard default/in-memory template operations
    initializeDB();
    updateSyncMeta({ status: 'idle', errorMessage: 'Database Offline', lastSyncedAt: 'N/A' });
    return true;
  }

  updateSyncMeta({ status: 'syncing', errorMessage: null });
  try {
    const res = await fetch('/api/postgres/pull');
    const apiResult = await res.json();
    if (!apiResult.success) {
      updateSyncMeta({ status: 'error', errorMessage: apiResult.error || 'Pull transaction failed' });
      isCloudPullCompleted = true;
      initializeDB();
      return false;
    }
    
    const rows = apiResult.rows || [];
    isCloudPullCompleted = true; // Unlock pushing state

    // Match PostgreSQL table rows to key-value maps
    const dbRowMap = new Map<string, string>();
    rows.forEach((row: { key: string; value: string }) => {
      dbRowMap.set(row.key, row.value);
    });

    console.log(`[Database Sync] Pulled ${rows.length} rows. Starting comparison for ${SYNC_KEYS.length} keys.`);

    for (const key of SYNC_KEYS) {
      const cloudVal = dbRowMap.get(key);
      const localVal = crmMemoryStore[key] || null;

      if (cloudVal !== undefined && cloudVal !== null) {
        // Hydrate the in-memory cache with cloud value
        try {
          if (localVal && localVal !== cloudVal) {
            try {
              const cloudParsed = JSON.parse(cloudVal);
              const localParsed = JSON.parse(localVal);
              if (Array.isArray(cloudParsed) && Array.isArray(localParsed)) {
                if (key.endsWith('employees')) {
                  const merged = mergeEmployeeLists(localParsed, cloudParsed);
                  crmMemoryStore[key] = JSON.stringify(merged);
                } else {
                  const merged = mergeArraysCloudWins(localParsed as any[], cloudParsed as any[]);
                  crmMemoryStore[key] = JSON.stringify(merged);
                }
              } else {
                crmMemoryStore[key] = cloudVal;
              }
            } catch (e) {
              crmMemoryStore[key] = cloudVal;
            }
          } else {
            crmMemoryStore[key] = cloudVal;
          }
        } catch (e) {
          console.error(`Failed to restore key ${key}:`, e);
        }
      }
    }

    // Now seed any fields that are still uninitialized or blank
    initializeDB();

    // Trigger check-and-push for keys initialized by initializeDB()
    for (const key of SYNC_KEYS) {
      const cloudVal = dbRowMap.get(key);
      const currentVal = crmMemoryStore[key];
      if ((cloudVal === undefined || cloudVal === null) && currentVal) {
        console.log(`[Database Sync] Auto-seeding uninitialized template key "${key}" to database...`);
        await pushToPostgres(key, currentVal);
      }
    }

    try {
      const { repairDuplicateEmployeesAndLeads } = await import('./db');
      repairDuplicateEmployeesAndLeads();
    } catch (e) {
      console.error('[Database Sync Repair] failed:', e);
    }

    updateSyncMeta({ status: 'connected', errorMessage: null, lastSyncedAt: new Date().toLocaleTimeString() });
    return true;
  } catch (err: any) {
    console.error('Unexpected error pulling from database:', err);
    updateSyncMeta({ status: 'error', errorMessage: err.message || 'Database connection error' });
    isCloudPullCompleted = true;
    initializeDB();
    return false;
  }
}

/**
 * Performs a bi-directional startup synchronization
 */
export async function initializePostgresSync() {
  console.log('[Database Sync] Sync initialization started...');
  await detectPostgresStatus();
  await pullFromPostgres();
}
