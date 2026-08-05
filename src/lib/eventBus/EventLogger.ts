/**
 * Enterprise Event Bus Logger & Performance Metrics Engine
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Provides execution duration measurement, metric aggregation, and dev/prod logging.
 */

import { EnterpriseEvent, EventBusMetrics, EventCategory } from './types';

export class EventLogger {
  private static instance: EventLogger | null = null;
  private isDebugEnabled: boolean = false;

  // Metrics tracking
  private totalPublished = 0;
  private totalDelivered = 0;
  private totalFailed = 0;
  private totalDeadLettered = 0;
  private executionTimesMs: number[] = [];
  private eventsByCategoryCount: Map<EventCategory, number> = new Map();

  private constructor() {
    this.detectDebug();
  }

  public static getInstance(): EventLogger {
    if (!EventLogger.instance) {
      EventLogger.instance = new EventLogger();
    }
    return EventLogger.instance;
  }

  private detectDebug(): void {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        this.isDebugEnabled = params.has('eb_debug') || localStorage.getItem('eb_debug') === 'true';
      }
    } catch {
      this.isDebugEnabled = false;
    }
  }

  public setDebug(enabled: boolean): void {
    this.isDebugEnabled = enabled;
  }

  public logPublish(event: EnterpriseEvent): void {
    this.totalPublished++;
    const currentCategoryCount = this.eventsByCategoryCount.get(event.category) || 0;
    this.eventsByCategoryCount.set(event.category, currentCategoryCount + 1);

    if (this.isDebugEnabled) {
      console.log(
        `[EventBus:Publish] [${event.category}] ${event.name} (ID: ${event.id}, Corr: ${event.context.correlationId})`,
        event.payload
      );
    }
  }

  public logDeliverySuccess(event: EnterpriseEvent, consumerId: string, durationMs: number): void {
    this.totalDelivered++;
    this.recordDuration(durationMs);

    if (this.isDebugEnabled) {
      console.log(
        `[EventBus:Delivered] ${event.name} -> Consumer '${consumerId}' (${durationMs.toFixed(2)}ms)`
      );
    }
  }

  public logDeliveryFailure(event: EnterpriseEvent, consumerId: string, error: Error): void {
    this.totalFailed++;
    console.warn(
      `[EventBus:Error] Handler '${consumerId}' failed on event '${event.name}': ${error.message}`
    );
  }

  public logDeadLetter(event: EnterpriseEvent, consumerId: string): void {
    this.totalDeadLettered++;
    console.error(
      `[EventBus:DeadLetter] Event '${event.name}' (ID: ${event.id}) moved to DLQ for consumer '${consumerId}'`
    );
  }

  private recordDuration(ms: number): void {
    this.executionTimesMs.push(ms);
    if (this.executionTimesMs.length > 500) {
      this.executionTimesMs.shift(); // Keep moving window of last 500 executions
    }
  }

  public getMetrics(activeSubscriptionsCount: number): EventBusMetrics {
    const totalTimes = this.executionTimesMs.reduce((acc, val) => acc + val, 0);
    const averageExecutionTimeMs =
      this.executionTimesMs.length > 0 ? totalTimes / this.executionTimesMs.length : 0;

    const categoryRecord: Record<string, number> = {};
    this.eventsByCategoryCount.forEach((count, cat) => {
      categoryRecord[cat] = count;
    });

    return {
      totalPublished: this.totalPublished,
      totalDelivered: this.totalDelivered,
      totalFailed: this.totalFailed,
      totalDeadLettered: this.totalDeadLettered,
      averageExecutionTimeMs: Math.round(averageExecutionTimeMs * 100) / 100,
      activeSubscriptionsCount,
      eventsByCategory: categoryRecord as Record<EventCategory, number>,
    };
  }

  public resetMetrics(): void {
    this.totalPublished = 0;
    this.totalDelivered = 0;
    this.totalFailed = 0;
    this.totalDeadLettered = 0;
    this.executionTimesMs = [];
    this.eventsByCategoryCount.clear();
  }
}

export const eventLogger = EventLogger.getInstance();
