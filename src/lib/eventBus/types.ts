/**
 * Enterprise Event Bus Framework - Core Types & Interfaces
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 */

export type EventPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type EventCategory =
  | 'LEAD'
  | 'CUSTOMER'
  | 'CONVERSATION'
  | 'TASK'
  | 'WORKFLOW'
  | 'DOCUMENT'
  | 'PROPOSAL'
  | 'PAYMENT'
  | 'NOTIFICATION'
  | 'TIMELINE'
  | 'SYSTEM'
  | 'FEATURE_FLAG'
  | 'AUDIT';

export interface EventContext {
  /** Unique Correlation ID tracing multi-step business transactions */
  correlationId: string;
  /** Request ID associated with current HTTP request or user action */
  requestId?: string;
  /** Distributed Trace ID */
  traceId?: string;
  /** ISO timestamp when the event was generated */
  timestamp: string;
  /** User ID initiating the event */
  userId?: string;
  /** Department context */
  department?: string;
  /** Originating system or component */
  source: string;
  /** Event schema version (e.g. "1.0") */
  version: string;
}

export interface EnterpriseEvent<T = unknown> {
  /** Unique Event Instance ID */
  id: string;
  /** Event Name / Topic (e.g. "LeadCreated") */
  name: string;
  /** Event Category */
  category: EventCategory;
  /** Strongly typed event payload */
  payload: T;
  /** Standard event audit & tracing context */
  context: EventContext;
  /** Priority level for subscriber execution */
  priority: EventPriority;
  /** Internal cancellation token state */
  isCancelled?: boolean;
}

export type EventHandler<T = unknown> = (
  event: EnterpriseEvent<T>
) => Promise<void> | void;

export interface EventFilterPredicate<T = unknown> {
  (event: EnterpriseEvent<T>): boolean;
}

export interface SubscriptionOptions<T = unknown> {
  /** Priority level for execution ordering */
  priority?: EventPriority;
  /** Optional filter predicate; handler executes only if predicate returns true */
  filter?: EventFilterPredicate<T>;
  /** Automatically unsubscribe after first execution */
  once?: boolean;
  /** Retry strategy options */
  retryOptions?: RetryPolicyConfig;
  /** Consumer identifier for metrics and tracing */
  consumerId?: string;
}

export interface Subscription {
  id: string;
  eventName: string;
  unsubscribe: () => void;
  options: SubscriptionOptions;
}

export interface RetryPolicyConfig {
  maxRetries: number;
  strategy: 'IMMEDIATE' | 'FIXED' | 'EXPONENTIAL';
  initialDelayMs: number;
  backoffFactor?: number;
  maxDelayMs?: number;
}

export interface DeadLetterItem<T = unknown> {
  id: string;
  eventId: string;
  eventName: string;
  consumerId: string;
  failedAt: string;
  retryCount: number;
  errorReason: string;
  errorStack?: string;
  originalEvent: EnterpriseEvent<T>;
}

export interface EventDefinition<T = unknown> {
  eventName: string;
  category: EventCategory;
  version: string;
  description: string;
  producer: string;
  consumers: string[];
  schemaExample?: T;
}

export interface EventBusMetrics {
  totalPublished: number;
  totalDelivered: number;
  totalFailed: number;
  totalDeadLettered: number;
  averageExecutionTimeMs: number;
  activeSubscriptionsCount: number;
  eventsByCategory: Record<EventCategory, number>;
}
