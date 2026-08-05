/**
 * Enterprise Event Bus Core Singleton
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Central facade bringing together Event Publisher, Subscriber Manager,
 * Event Registry, Dead Letter Queue, Logging, and Diagnostics.
 */

import {
  EnterpriseEvent,
  EventCategory,
  EventContext,
  EventHandler,
  EventPriority,
  Subscription,
  SubscriptionOptions,
  EventBusMetrics,
} from './types';
import { EventSubscriberManager } from './EventSubscriber';
import { EventPublisher } from './EventPublisher';
import { eventLogger } from './EventLogger';
import { deadLetterQueue } from './DeadLetterQueue';
import { eventRegistry } from './EventRegistry';

export class EnterpriseEventBus {
  private static instance: EnterpriseEventBus | null = null;

  private subscriberManager: EventSubscriberManager;
  private publisher: EventPublisher;

  private constructor() {
    this.subscriberManager = new EventSubscriberManager();
    this.publisher = new EventPublisher(this.subscriberManager);
  }

  public static getInstance(): EnterpriseEventBus {
    if (!EnterpriseEventBus.instance) {
      EnterpriseEventBus.instance = new EnterpriseEventBus();
    }
    return EnterpriseEventBus.instance;
  }

  /**
   * Subscribe to an event topic
   */
  public subscribe<T = unknown>(
    eventName: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions<T>
  ): Subscription {
    return this.subscriberManager.subscribe(eventName, handler, options);
  }

  /**
   * Subscribe once - unbinds automatically after first execution
   */
  public once<T = unknown>(
    eventName: string,
    handler: EventHandler<T>,
    options?: Omit<SubscriptionOptions<T>, 'once'>
  ): Subscription {
    return this.subscriberManager.subscribe(eventName, handler, {
      ...options,
      once: true,
    });
  }

  /**
   * Publish event asynchronously (Fire & Forget)
   */
  public publishAsync<T>(
    eventName: string,
    category: EventCategory,
    payload: T,
    options?: {
      priority?: EventPriority;
      source?: string;
      contextOverrides?: Partial<EventContext>;
    }
  ): EnterpriseEvent<T> {
    return this.publisher.publishAsync(eventName, category, payload, options);
  }

  /**
   * Publish event synchronously (Awaits all handlers)
   */
  public async publishSync<T>(
    eventName: string,
    category: EventCategory,
    payload: T,
    options?: {
      priority?: EventPriority;
      source?: string;
      contextOverrides?: Partial<EventContext>;
    }
  ): Promise<EnterpriseEvent<T>> {
    return this.publisher.publishSync(eventName, category, payload, options);
  }

  /**
   * Broadcast an event to all subscribers without waiting (Convenience alias for publishAsync)
   */
  public broadcast<T>(
    eventName: string,
    category: EventCategory,
    payload: T
  ): EnterpriseEvent<T> {
    return this.publishAsync(eventName, category, payload);
  }

  /**
   * Get system performance metrics
   */
  public getMetrics(): EventBusMetrics {
    const activeSubs = this.subscriberManager.getActiveCount();
    return eventLogger.getMetrics(activeSubs);
  }

  /**
   * Clear all subscriptions and reset metrics (useful for testing & resets)
   */
  public reset(): void {
    this.subscriberManager.clearAll();
    eventLogger.resetMetrics();
    deadLetterQueue.clear();
  }
}

export const eventBus = EnterpriseEventBus.getInstance();
