/**
 * Enterprise Event Publisher Service
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Provides typed event publishing options: Async Fire-and-Forget, Synchronous Await,
 * and Transaction Scope Correlation Injection.
 */

import {
  EnterpriseEvent,
  EventCategory,
  EventContext,
  EventPriority,
} from './types';
import { EventAuditHelper } from './EventAudit';
import { eventLogger } from './EventLogger';
import { EventSubscriberManager } from './EventSubscriber';

export class EventPublisher {
  constructor(private subscriberManager: EventSubscriberManager) {}

  /**
   * Create a standardized Enterprise Event object with context
   */
  public createEvent<T>(
    eventName: string,
    category: EventCategory,
    payload: T,
    options?: {
      priority?: EventPriority;
      source?: string;
      contextOverrides?: Partial<EventContext>;
    }
  ): EnterpriseEvent<T> {
    const source = options?.source || 'EfilinggSystem';
    const context = EventAuditHelper.createContext(source, options?.contextOverrides);
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return {
      id: eventId,
      name: eventName,
      category,
      payload,
      context,
      priority: options?.priority || 'NORMAL',
    };
  }

  /**
   * Publish Event - Asynchronous Fire & Forget (non-blocking)
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
    const event = this.createEvent(eventName, category, payload, options);
    eventLogger.logPublish(event as EnterpriseEvent<unknown>);

    // Defer dispatch to microtask / async event loop
    Promise.resolve().then(() => {
      this.subscriberManager.dispatch(event);
    });

    return event;
  }

  /**
   * Publish Event - Synchronous Await (waits for all subscriber handlers to complete)
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
    const event = this.createEvent(eventName, category, payload, options);
    eventLogger.logPublish(event as EnterpriseEvent<unknown>);

    await this.subscriberManager.dispatch(event);
    return event;
  }
}
