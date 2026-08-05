/**
 * Enterprise Event Subscriber Manager
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Manages subscriber execution, priority sorting, filtering, single-use handlers,
 * isolated error handling, retry policies, and dead letter queue routing.
 */

import {
  EnterpriseEvent,
  EventHandler,
  Subscription,
  SubscriptionOptions,
  EventPriority,
} from './types';
import { RetryEngine } from './RetryEngine';
import { deadLetterQueue } from './DeadLetterQueue';
import { eventLogger } from './EventLogger';

interface InternalSubscription<T = unknown> {
  id: string;
  eventName: string;
  handler: EventHandler<T>;
  options: SubscriptionOptions<T>;
}

const PRIORITY_ORDER: Record<EventPriority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

export class EventSubscriberManager {
  private subscriptions: Map<string, InternalSubscription[]> = new Map();

  /**
   * Register a subscriber for an event
   */
  public subscribe<T = unknown>(
    eventName: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions<T> = {}
  ): Subscription {
    const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const internalSub: InternalSubscription<T> = {
      id: subscriptionId,
      eventName,
      handler,
      options: {
        priority: options.priority || 'NORMAL',
        consumerId: options.consumerId || `Consumer-${subscriptionId}`,
        ...options,
      },
    };

    const existing = this.subscriptions.get(eventName) || [];
    existing.push(internalSub as InternalSubscription<unknown>);

    // Sort by priority
    existing.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.options.priority || 'NORMAL'];
      const pB = PRIORITY_ORDER[b.options.priority || 'NORMAL'];
      return pA - pB;
    });

    this.subscriptions.set(eventName, existing);

    return {
      id: subscriptionId,
      eventName,
      options: internalSub.options,
      unsubscribe: () => this.unsubscribe(eventName, subscriptionId),
    };
  }

  /**
   * Unsubscribe by ID
   */
  public unsubscribe(eventName: string, subscriptionId: string): void {
    const existing = this.subscriptions.get(eventName);
    if (!existing) return;

    const filtered = existing.filter((sub) => sub.id !== subscriptionId);
    if (filtered.length > 0) {
      this.subscriptions.set(eventName, filtered);
    } else {
      this.subscriptions.delete(eventName);
    }
  }

  /**
   * Get count of active subscriptions
   */
  public getActiveCount(): number {
    let count = 0;
    this.subscriptions.forEach((subs) => {
      count += subs.length;
    });
    return count;
  }

  /**
   * Dispatch an event to all matching subscribers with error isolation
   */
  public async dispatch<T>(event: EnterpriseEvent<T>): Promise<void> {
    const eventSubs = this.subscriptions.get(event.name);
    const wildcardSubs = this.subscriptions.get('*');

    const allSubs = [...(eventSubs || []), ...(wildcardSubs || [])];
    if (allSubs.length === 0) return;

    const subsToProcess = [...allSubs];

    for (const sub of subsToProcess) {
      if (event.isCancelled) {
        break;
      }

      // 1. Check filter predicate
      if (sub.options.filter) {
        try {
          if (!sub.options.filter(event)) {
            continue;
          }
        } catch (filterErr) {
          console.warn(`[EventSubscriber] Filter check failed for consumer '${sub.options.consumerId}':`, filterErr);
          continue;
        }
      }

      // 2. Execute subscriber with Retry Engine & Error Isolation
      const startTime = performance.now();
      const consumerId = sub.options.consumerId || sub.id;

      try {
        if (sub.options.retryOptions) {
          await RetryEngine.executeWithRetry(
            () => Promise.resolve(sub.handler(event)),
            sub.options.retryOptions,
            (attempt, err) => {
              console.warn(
                `[EventSubscriber] Retry attempt ${attempt} for consumer '${consumerId}' on event '${event.name}': ${err.message}`
              );
            }
          );
        } else {
          await Promise.resolve(sub.handler(event));
        }

        const duration = performance.now() - startTime;
        eventLogger.logDeliverySuccess(event as EnterpriseEvent<unknown>, consumerId, duration);
      } catch (handlerErr) {
        const error = handlerErr instanceof Error ? handlerErr : new Error(String(handlerErr));
        eventLogger.logDeliveryFailure(event as EnterpriseEvent<unknown>, consumerId, error);

        // Move to Dead Letter Queue
        deadLetterQueue.enqueue(
          event,
          consumerId,
          sub.options.retryOptions?.maxRetries || 0,
          error
        );
        eventLogger.logDeadLetter(event as EnterpriseEvent<unknown>, consumerId);
      }

      // 3. Handle 'once' option auto-unsubscription
      if (sub.options.once) {
        this.unsubscribe(event.name, sub.id);
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  public clearAll(): void {
    this.subscriptions.clear();
  }
}
