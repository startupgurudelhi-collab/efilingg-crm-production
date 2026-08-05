/**
 * Production Hardening & Reliability Service
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3 - Module 5)
 *
 * Implements:
 * 1. Webhook HMAC SHA-256 signature verification
 * 2. Webhook idempotency cache for duplicate event deduplication
 * 3. In-memory Rate Limiter
 * 4. API Timeout wrapper & retry mechanism
 * 5. Structured logging with Correlation IDs
 */

import crypto from 'crypto';

export class ProductionHardeningService {
  private static processedMessageIds: Set<string> = new Set();
  private static maxCacheSize = 10000;
  private static rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Verify WhatsApp/Meta Webhook HMAC SHA-256 signature
   */
  public static verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader?: string,
    appSecret: string = process.env.META_APP_SECRET || 'efilingg_meta_app_secret_3000'
  ): boolean {
    if (!signatureHeader) {
      // If signature missing in dev mode, log warning but allow
      return process.env.NODE_ENV !== 'production';
    }

    try {
      const parts = signatureHeader.split('=');
      const signatureHash = parts[1] || parts[0];

      const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
    } catch {
      return false;
    }
  }

  /**
   * Idempotency Check: Returns true if message already processed, false if new.
   */
  public static checkAndMarkIdempotency(messageId: string): boolean {
    if (!messageId) return false;

    if (this.processedMessageIds.has(messageId)) {
      return true; // Already processed!
    }

    this.processedMessageIds.add(messageId);
    if (this.processedMessageIds.size > this.maxCacheSize) {
      const oldestKey = this.processedMessageIds.values().next().value;
      if (oldestKey) this.processedMessageIds.delete(oldestKey);
    }

    return false;
  }

  /**
   * Simple Rate Limiter (e.g. 60 requests / minute per IP or Phone)
   */
  public static isRateLimited(key: string, limit = 60, windowMs = 60000): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
      this.rateLimitMap.set(key, entry);
      return false;
    }

    entry.count += 1;
    this.rateLimitMap.set(key, entry);
    return entry.count > limit;
  }

  /**
   * Execute async operation with timeout
   */
  public static async withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * Execute async function with retry policy
   */
  public static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, delayMs * attempt));
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate Correlation ID for tracing
   */
  public static generateCorrelationId(): string {
    return `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
