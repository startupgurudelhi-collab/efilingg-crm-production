/**
 * Enterprise Event Bus Testing & Diagnostics Utilities
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Provides mock publishers, mock subscribers, recorded event history assertions,
 * and test isolation harnesses for unit & integration testing.
 */

import { EnterpriseEvent, EventCategory, EventHandler } from './types';
import { EnterpriseEventBus } from './EventBus';

export class MockEventSubscriber {
  public receivedEvents: EnterpriseEvent[] = [];

  public handler: EventHandler = (event) => {
    this.receivedEvents.push(event);
  };

  public reset(): void {
    this.receivedEvents = [];
  }

  public getCount(): number {
    return this.receivedEvents.length;
  }

  public getLastEvent<T = unknown>(): EnterpriseEvent<T> | undefined {
    return this.receivedEvents[this.receivedEvents.length - 1] as EnterpriseEvent<T> | undefined;
  }
}

export class TestEventBusHarness {
  private testBus: EnterpriseEventBus;
  private publishedHistory: EnterpriseEvent[] = [];

  constructor() {
    this.testBus = EnterpriseEventBus.getInstance();
  }

  /**
   * Record every event published for test inspection
   */
  public startRecording(): () => void {
    const sub = this.testBus.subscribe('*', (event) => {
      this.publishedHistory.push(event);
    });
    return () => sub.unsubscribe();
  }

  public getHistory(): EnterpriseEvent[] {
    return [...this.publishedHistory];
  }

  public findEventsByName(eventName: string): EnterpriseEvent[] {
    return this.publishedHistory.filter((e) => e.name === eventName);
  }

  public findEventsByCategory(category: EventCategory): EnterpriseEvent[] {
    return this.publishedHistory.filter((e) => e.category === category);
  }

  public clearHistory(): void {
    this.publishedHistory = [];
  }

  public resetSystem(): void {
    this.clearHistory();
    this.testBus.reset();
  }
}
