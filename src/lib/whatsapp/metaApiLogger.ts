/**
 * Meta WhatsApp Cloud API Request & Response Logger
 * Efilingg CRM Enterprise Layer
 *
 * Captures, stores, and exposes raw HTTP requests and responses
 * for all Meta Graph API interactions (Templates, Messages, Webhooks).
 */

export interface MetaApiLogRecord {
  id: string;
  timestamp: string;
  action: 'CREATE_TEMPLATE' | 'FETCH_TEMPLATES' | 'DELETE_TEMPLATE' | 'TEST_SEND' | 'SYNC_TEMPLATES' | 'GET_TEMPLATE_DETAILS';
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  endpoint: string;
  fullUrl: string;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseStatusText: string;
  responseBody?: any;
  durationMs: number;
  isSuccess: boolean;
  errorMessage?: string;
  curlCommand: string;
  performedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

const KEY_META_API_LOGS = 'efilingg_whatsapp_meta_api_logs_v2';
const MAX_LOGS = 200;

// In-memory store for server-side or fallback
const inMemoryLogs: MetaApiLogRecord[] = [];

export class MetaApiLogger {
  /**
   * Record a Meta Graph API HTTP call with full request and response details
   */
  public static log(entry: Omit<MetaApiLogRecord, 'id' | 'timestamp' | 'curlCommand'>): MetaApiLogRecord {
    const timestamp = new Date().toISOString();
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Generate cURL command representation
    const curlCommand = this.generateCurl(entry.method, entry.fullUrl, entry.requestHeaders, entry.requestBody);

    const record: MetaApiLogRecord = {
      ...entry,
      id,
      timestamp,
      curlCommand,
    };

    // Store in-memory
    inMemoryLogs.unshift(record);
    if (inMemoryLogs.length > MAX_LOGS) {
      inMemoryLogs.length = MAX_LOGS;
    }

    // Store in localStorage if in browser
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = this.getLogs();
        stored.unshift(record);
        const trimmed = stored.slice(0, MAX_LOGS);
        localStorage.setItem(KEY_META_API_LOGS, JSON.stringify(trimmed));
      } catch (e) {
        console.warn('[MetaApiLogger] Error saving log to localStorage', e);
      }
    }

    return record;
  }

  /**
   * Retrieve all Meta API logs
   */
  public static getLogs(): MetaApiLogRecord[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(KEY_META_API_LOGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('[MetaApiLogger] Error reading logs from localStorage', e);
      }
    }
    return [...inMemoryLogs];
  }

  /**
   * Clear all recorded API logs
   */
  public static clearLogs(): void {
    inMemoryLogs.length = 0;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(KEY_META_API_LOGS);
      } catch (e) {}
    }
  }

  /**
   * Helper to format a cURL command string
   */
  private static generateCurl(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any
  ): string {
    let curl = `curl -X ${method} "${url}"`;

    // Add headers
    Object.entries(headers).forEach(([key, val]) => {
      // Mask token for security
      const safeVal = key.toLowerCase() === 'authorization' && val.startsWith('Bearer ')
        ? `Bearer ${val.substring(7, 14)}...${val.substring(val.length - 4)}`
        : val;
      curl += ` \\\n  -H "${key}: ${safeVal}"`;
    });

    // Add body
    if (body && (method === 'POST' || method === 'PUT')) {
      const jsonStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      curl += ` \\\n  -d '${jsonStr.replace(/'/g, "'\\''")}'`;
    }

    return curl;
  }
}
