/**
 * Enterprise Retry Engine
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Configurable retry policy handler supporting immediate retries, fixed delays,
 * and exponential backoff with jitter to ensure system stability under temporary failures.
 */

import { RetryPolicyConfig } from './types';

export class RetryEngine {
  /**
   * Execute an async operation with specified retry policy
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    policy: RetryPolicyConfig,
    onRetryAttempt?: (attempt: number, error: Error, delayMs: number) => void
  ): Promise<T> {
    let attempt = 0;
    const maxRetries = policy.maxRetries ?? 3;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        const err = error instanceof Error ? error : new Error(String(error));

        if (attempt > maxRetries) {
          throw err;
        }

        const delayMs = this.calculateDelay(attempt, policy);
        if (onRetryAttempt) {
          onRetryAttempt(attempt, err, delayMs);
        }

        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
      }
    }
  }

  /**
   * Calculate delay for a retry attempt based on strategy
   */
  public static calculateDelay(attempt: number, policy: RetryPolicyConfig): number {
    const { strategy, initialDelayMs, backoffFactor = 2, maxDelayMs = 30000 } = policy;

    if (strategy === 'IMMEDIATE') {
      return 0;
    }

    if (strategy === 'FIXED') {
      return Math.min(initialDelayMs, maxDelayMs);
    }

    if (strategy === 'EXPONENTIAL') {
      // Exponential backoff with small random jitter (±10%)
      const calculated = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = calculated * 0.1 * (Math.random() - 0.5);
      const delay = Math.round(calculated + jitter);
      return Math.min(Math.max(delay, 0), maxDelayMs);
    }

    return 0;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
