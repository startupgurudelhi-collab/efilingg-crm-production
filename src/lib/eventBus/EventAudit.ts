/**
 * Enterprise Event Audit & Context Helper
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Enriches every published event with correlation tracing, user context, timestamps, and request tracking.
 */

import { EventContext } from './types';

export class EventAuditHelper {
  private static currentCorrelationId: string | null = null;
  private static currentRequestId: string | null = null;

  /**
   * Set global active correlation context (e.g. during an incoming request lifecycle)
   */
  public static setCorrelationContext(correlationId: string, requestId?: string): void {
    this.currentCorrelationId = correlationId;
    if (requestId) this.currentRequestId = requestId;
  }

  /**
   * Clear active correlation context
   */
  public static clearCorrelationContext(): void {
    this.currentCorrelationId = null;
    this.currentRequestId = null;
  }

  /**
   * Generate robust EventContext with automated correlation and tracing defaults
   */
  public static createContext(
    source: string,
    overrides?: Partial<EventContext>
  ): EventContext {
    const timestamp = new Date().toISOString();
    const correlationId =
      overrides?.correlationId ||
      this.currentCorrelationId ||
      `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const requestId = overrides?.requestId || this.currentRequestId;
    const traceId = overrides?.traceId || `TRC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      correlationId,
      requestId,
      traceId,
      timestamp,
      source,
      version: overrides?.version || '1.0',
      userId: overrides?.userId,
      department: overrides?.department,
    };
  }
}
