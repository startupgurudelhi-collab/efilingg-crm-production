/**
 * Enterprise Dead Letter Queue (DLQ)
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Stores event handler execution failures after retry attempts are exhausted.
 * Provides diagnostics, replay capabilities, and error auditing.
 */

import { DeadLetterItem, EnterpriseEvent } from './types';

export class DeadLetterQueue {
  private static instance: DeadLetterQueue | null = null;
  private items: Map<string, DeadLetterItem> = new Map();
  private maxCapacity: number = 1000; // Memory safety cap

  private constructor() {}

  public static getInstance(): DeadLetterQueue {
    if (!DeadLetterQueue.instance) {
      DeadLetterQueue.instance = new DeadLetterQueue();
    }
    return DeadLetterQueue.instance;
  }

  /**
   * Add a failed event handler execution to the Dead Letter Queue
   */
  public enqueue<T>(
    event: EnterpriseEvent<T>,
    consumerId: string,
    retryCount: number,
    error: Error
  ): DeadLetterItem<T> {
    const id = `DLQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dlqItem: DeadLetterItem<T> = {
      id,
      eventId: event.id,
      eventName: event.name,
      consumerId,
      failedAt: new Date().toISOString(),
      retryCount,
      errorReason: error.message || 'Unknown handler error',
      errorStack: error.stack,
      originalEvent: event,
    };

    // Enforce memory safety cap (FIFO eviction if over capacity)
    if (this.items.size >= this.maxCapacity) {
      const oldestKey = this.items.keys().next().value;
      if (oldestKey) this.items.delete(oldestKey);
    }

    this.items.set(id, dlqItem as DeadLetterItem<unknown>);
    console.error(`[DeadLetterQueue] Enqueued failed event ${event.name} (ID: ${event.id}, DLQ ID: ${id}): ${error.message}`);
    return dlqItem;
  }

  /**
   * Retrieve all items in DLQ
   */
  public getAll(): DeadLetterItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get DLQ item by ID
   */
  public getById(id: string): DeadLetterItem | undefined {
    return this.items.get(id);
  }

  /**
   * Remove item from DLQ
   */
  public remove(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * Clear all DLQ items
   */
  public clear(): void {
    this.items.clear();
  }

  /**
   * Get DLQ size
   */
  public size(): number {
    return this.items.size;
  }
}

export const deadLetterQueue = DeadLetterQueue.getInstance();
