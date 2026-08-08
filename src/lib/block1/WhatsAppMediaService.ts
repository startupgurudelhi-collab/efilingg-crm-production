import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { maskToken } from './MetaWhatsAppProvider';

export interface WhatsAppMediaRecord {
  media_id: string;
  mime_type: string;
  filename: string;
  size: number;
  public_url: string;
  thumbnail_url: string;
  storage_path: string;
  download_url?: string;
  media_url?: string;
  http_status?: number;
  downloaded_at: string;
  first_32_hex?: string;
  magic_header_valid?: boolean;
  magic_header_type?: string;
  fallback_triggered?: boolean;
  fallback_reason?: string;
  failure_stage?: string;
  meta_metadata_response?: any;
  media_status?: 'downloaded' | 'download_failed';
}

export interface MagicHeaderInfo {
  isValid: boolean;
  type: 'jpeg' | 'png' | 'gif' | 'webp' | 'pdf' | 'text/html' | 'unknown';
  first32Hex: string;
}

const MEDIA_STORAGE_DIR = path.join(process.cwd(), 'uploads', 'whatsapp_media');
const MEDIA_INDEX_FILE = path.join(MEDIA_STORAGE_DIR, 'media_index.json');

// Ensure directory exists
if (!fs.existsSync(MEDIA_STORAGE_DIR)) {
  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });
}

// In-memory cache map (media_id -> WhatsAppMediaRecord)
let mediaCache: Record<string, WhatsAppMediaRecord> = {};

function loadMediaIndex() {
  try {
    if (fs.existsSync(MEDIA_INDEX_FILE)) {
      const raw = fs.readFileSync(MEDIA_INDEX_FILE, 'utf-8');
      mediaCache = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[WhatsAppMediaService] Failed to load media_index.json:', e);
  }
}

function saveMediaIndex() {
  try {
    fs.writeFileSync(MEDIA_INDEX_FILE, JSON.stringify(mediaCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[WhatsAppMediaService] Failed to save media_index.json:', e);
  }
}

// Initialize index on startup
loadMediaIndex();

export class WhatsAppMediaService {
  /**
   * Inspect magic header bytes of a buffer
   */
  public static inspectMagicHeader(buffer: Buffer): MagicHeaderInfo {
    const first32Hex = buffer.subarray(0, 32).toString('hex');
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, type: 'jpeg', first32Hex };
    }
    if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { isValid: true, type: 'png', first32Hex };
    }
    if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return { isValid: true, type: 'gif', first32Hex };
    }
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return { isValid: true, type: 'webp', first32Hex };
    }
    if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { isValid: true, type: 'pdf', first32Hex };
    }

    const textHead = buffer.toString('utf8', 0, Math.min(buffer.length, 100)).trim().toLowerCase();
    if (textHead.startsWith('<') || textHead.startsWith('{') || textHead.startsWith('error')) {
      return { isValid: false, type: 'text/html', first32Hex };
    }

    return { isValid: false, type: 'unknown', first32Hex };
  }

  /**
   * Returns cached media record if present & valid
   */
  public static getCachedMedia(mediaId: string): WhatsAppMediaRecord | undefined {
    const cached = mediaCache[mediaId];
    if (cached && fs.existsSync(cached.storage_path)) {
      try {
        const fileBuf = fs.readFileSync(cached.storage_path);
        const magicInfo = WhatsAppMediaService.inspectMagicHeader(fileBuf);

        // Self-healing: if an image file (jpg/png) accidentally contains text or invalid magic, purge it
        if (cached.mime_type.startsWith('image/') && (!magicInfo.isValid || magicInfo.type === 'text/html' || fileBuf.length < 1000)) {
          console.warn(`[WhatsApp Media Service] Purging invalid/corrupt image cached at ${cached.storage_path} (Type: ${magicInfo.type}, Size: ${fileBuf.length}b)`);
          try { fs.unlinkSync(cached.storage_path); } catch (uErr) {}
          delete mediaCache[mediaId];
          saveMediaIndex();
          return undefined;
        }
      } catch (readErr) {
        return undefined;
      }
      return cached;
    }
    return undefined;
  }

  /**
   * Download and persistent cache WhatsApp Media item with forensic audit logs
   */
  public static async downloadAndCacheMedia(options: {
    mediaId: string;
    mimeType?: string;
    filename?: string;
    caption?: string;
  }): Promise<WhatsAppMediaRecord> {
    const { mediaId } = options;

    const cached = WhatsAppMediaService.getCachedMedia(mediaId);
    if (cached) {
      console.log(`\n-------------------------------------------------------------------`);
      console.log(`[WhatsApp Media Cache HIT] Skipping duplicate Meta API request.`);
      console.log(`[MEDIA_ID]: ${cached.media_id}`);
      console.log(`[MEDIA_TYPE]: ${cached.mime_type}`);
      console.log(`[MEDIA_METADATA_RESPONSE]: ${JSON.stringify(cached.meta_metadata_response || { cached: true })}`);
      console.log(`[MEDIA_URL]: ${cached.download_url || 'N/A'}`);
      console.log(`[MEDIA_DOWNLOAD_HTTP_STATUS]: ${cached.http_status || 200}`);
      console.log(`[MEDIA_DOWNLOAD_CONTENT_TYPE]: ${cached.mime_type}`);
      console.log(`[MEDIA_DOWNLOAD_SIZE]: ${cached.size}`);
      console.log(`[FALLBACK_TRIGGERED]: ${cached.fallback_triggered || false}`);
      console.log(`[FALLBACK_REASON]: ${cached.fallback_reason || 'NONE'}`);
      console.log(`[SAVED_FILE_SIZE]: ${cached.size}`);
      console.log(`-------------------------------------------------------------------\n`);
      return cached;
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v25.0';

    const now = new Date().toISOString();
    let downloadUrl = '';
    let httpStatus = 0;
    let metaJsonResponse: any = null;
    let downloadedSize = 0;
    let detectedMimeType = options.mimeType || 'application/octet-stream';
    let fileBuffer: Buffer | null = null;
    let downloadContentType = detectedMimeType;
    let failureStage = 'NONE';
    let fallbackReason = 'NONE';

    console.log(`\n===================================================================`);
    console.log(`[WhatsApp Media Download INITIATED]`);
    console.log(`[MEDIA_ID]: ${mediaId}`);
    console.log(`[MASKED_TOKEN]: ${maskToken(token)}`);

    // Stage 1: Token Verification
    if (!token || token.trim() === '' || token.includes('SANDBOX') || token.includes('DEMO')) {
      failureStage = 'STAGE_1_TOKEN_INVALID';
      fallbackReason = `Stage 1 Failure: WHATSAPP_ACCESS_TOKEN is missing or contains sandbox/demo token (${maskToken(token)}). Live Meta Cloud API access requires a valid access token.`;
      console.warn(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
    } else {
      // Stage 2: Meta Graph API Request -> GET https://graph.facebook.com/v25.0/{mediaId}
      try {
        const metaApiUrl = `https://graph.facebook.com/${version}/${mediaId}`;
        console.log(`Stage 2: Calling Meta Graph API -> GET ${metaApiUrl}`);

        const metaRes = await fetch(metaApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'EfilinggCRM-WhatsAppMediaDownloader/1.0',
          },
        });

        httpStatus = metaRes.status;
        if (!metaRes.ok) {
          const errText = await metaRes.text();
          try {
            metaJsonResponse = JSON.parse(errText);
          } catch (pErr) {
            metaJsonResponse = { raw_error: errText, http_status: metaRes.status };
          }
          failureStage = 'STAGE_2_META_GRAPH_API_ERROR';
          fallbackReason = `Stage 2 Failure: Meta Graph API returned HTTP ${metaRes.status}. Error: ${JSON.stringify(metaJsonResponse)}`;
          console.error(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
        } else {
          metaJsonResponse = await metaRes.json();
          downloadUrl = metaJsonResponse.url || '';
          if (metaJsonResponse.mime_type) detectedMimeType = metaJsonResponse.mime_type;

          if (!downloadUrl) {
            failureStage = 'STAGE_2_MISSING_MEDIA_URL';
            fallbackReason = 'Stage 2 Failure: Meta Graph API returned HTTP 200 OK but the response did not contain a valid media download URL.';
            console.error(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
          } else {
            // Stage 3: Meta CDN Binary Payload Request -> GET {downloadUrl} with Authorization Bearer
            console.log(`Stage 3: Downloading binary image payload from Meta CDN -> ${downloadUrl}`);
            const binaryRes = await fetch(downloadUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'curl/7.68.0',
              },
            });

            httpStatus = binaryRes.status;
            downloadContentType = binaryRes.headers.get('content-type') || detectedMimeType;

            if (!binaryRes.ok) {
              const cdnErrText = await binaryRes.text();
              failureStage = 'STAGE_3_META_CDN_DOWNLOAD_ERROR';
              fallbackReason = `Stage 3 Failure: Meta CDN binary download returned HTTP ${binaryRes.status}. Error: ${cdnErrText}`;
              console.error(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
            } else {
              const arrayBuf = await binaryRes.arrayBuffer();
              const downloadedBuf = Buffer.from(arrayBuf);
              const magicCheck = WhatsAppMediaService.inspectMagicHeader(downloadedBuf);
              downloadedSize = downloadedBuf.length;

              // Stage 4: Binary Signature & File Size Validation
              const isImage = detectedMimeType.startsWith('image/') || options.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              if (isImage && (!magicCheck.isValid || magicCheck.type === 'text/html' || downloadedBuf.length < 1000)) {
                const textSnippet = downloadedBuf.toString('utf8', 0, Math.min(downloadedBuf.length, 500));
                failureStage = 'STAGE_4_SIGNATURE_VALIDATION_FAILED';
                fallbackReason = `Stage 4 Failure: Signature validation failed for downloaded image! Detected type: ${magicCheck.type}, Size: ${downloadedBuf.length}b, Hex: ${magicCheck.first32Hex}. Content snippet: ${textSnippet}`;
                console.error(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
                fileBuffer = null;
              } else {
                fileBuffer = downloadedBuf;
              }
            }
          }
        }
      } catch (fetchErr) {
        const error = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr));
        failureStage = 'STAGE_FETCH_EXCEPTION';
        fallbackReason = `Stage Exception: Network or runtime failure during Meta API/CDN request: ${error.message}`;
        console.error(`[WhatsApp Media Forensic Audit] ${fallbackReason}`);
      }
    }

    const ext = WhatsAppMediaService.getExtensionFromMime(detectedMimeType, options.filename);
    const cleanFilename = WhatsAppMediaService.sanitizeFilename(
      options.filename || `whatsapp_media_${mediaId}${ext}`
    );
    const finalFilename = `${mediaId}_${cleanFilename}`;
    const storagePath = path.join(MEDIA_STORAGE_DIR, finalFilename);

    let savedFileSize = 0;
    let first32Hex = '';
    let magicValid = false;
    let magicType = 'NONE';

    // DO NOT GENERATE PLACEHOLDER IMAGES IF META MEDIA DOWNLOAD FAILS
    if (fileBuffer && fileBuffer.length > 0) {
      fs.writeFileSync(storagePath, fileBuffer);
      savedFileSize = fileBuffer.length;
      const magicInfo = WhatsAppMediaService.inspectMagicHeader(fileBuffer);
      first32Hex = magicInfo.first32Hex;
      magicValid = magicInfo.isValid;
      magicType = magicInfo.type;
    } else {
      console.warn(`[WhatsApp Media Service] Meta media download failed or rejected (${failureStage}). PLACEHOLDER GENERATION IS STRICTLY DISABLED.`);
    }

    // REQUIRED FORENSIC AUDIT LOG FORMAT
    console.log(`[MEDIA_ID]: ${mediaId}`);
    console.log(`[MEDIA_TYPE]: ${detectedMimeType}`);
    console.log(`[MEDIA_METADATA_RESPONSE]: ${JSON.stringify(metaJsonResponse || { error: 'No Meta response received' })}`);
    console.log(`[MEDIA_URL]: ${downloadUrl || 'NONE'}`);
    console.log(`[MEDIA_DOWNLOAD_HTTP_STATUS]: ${httpStatus}`);
    console.log(`[MEDIA_DOWNLOAD_STATUS]: ${httpStatus}`);
    console.log(`[MEDIA_DOWNLOAD_CONTENT_TYPE]: ${downloadContentType}`);
    console.log(`[MEDIA_DOWNLOAD_SIZE]: ${downloadedSize}`);
    console.log(`[MEDIA_BINARY_SIGNATURE]: ${first32Hex || 'NONE'}`);
    console.log(`[FALLBACK_TRIGGERED]: false`);
    console.log(`[FALLBACK_REASON]: ${fallbackReason}`);
    console.log(`[SAVED_FILE_PATH]: ${savedFileSize > 0 ? storagePath : 'NONE'}`);
    console.log(`[SAVED_FILE_SIZE]: ${savedFileSize}`);
    console.log(`===================================================================\n`);

    const publicUrl = savedFileSize > 0 ? `/uploads/whatsapp_media/${finalFilename}` : '';
    const thumbnailUrl = publicUrl;

    const record: WhatsAppMediaRecord = {
      media_id: mediaId,
      mime_type: detectedMimeType,
      filename: cleanFilename,
      size: savedFileSize,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: savedFileSize > 0 ? storagePath : '',
      download_url: downloadUrl,
      http_status: httpStatus,
      downloaded_at: now,
      first_32_hex: first32Hex,
      magic_header_valid: magicValid,
      magic_header_type: magicType,
      fallback_triggered: false,
      fallback_reason: fallbackReason,
      failure_stage: failureStage,
      meta_metadata_response: metaJsonResponse,
      media_status: savedFileSize > 0 ? 'downloaded' : 'download_failed',
    };

    mediaCache[mediaId] = record;
    saveMediaIndex();

    return record;
  }

  /**
   * Retrieve all cached media records
   */
  public static getAllCachedRecords(): WhatsAppMediaRecord[] {
    return Object.values(mediaCache);
  }

  private static sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private static getExtensionFromMime(mime: string, filename?: string): string {
    if (filename && filename.includes('.')) {
      const parts = filename.split('.');
      const ext = `.${parts[parts.length - 1]}`;
      if (ext.length <= 6) return ext;
    }
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('audio') || mime.includes('ogg') || mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('video') || mime.includes('mp4')) return '.mp4';
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '.xlsx';
    if (mime.includes('word') || mime.includes('document')) return '.docx';
    return '.bin';
  }
}

