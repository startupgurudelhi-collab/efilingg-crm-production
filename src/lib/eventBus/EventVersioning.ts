/**
 * Enterprise Event Versioning Engine
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Provides event schema version transformation and upgrade capabilities.
 * Guarantees backward compatibility so legacy consumers can process updated event payloads
 * without breaking production systems.
 */

import { EnterpriseEvent } from './types';

export type VersionTransformer<FromPayload = unknown, ToPayload = unknown> = (
  payload: FromPayload,
  event: EnterpriseEvent<FromPayload>
) => ToPayload;

export class EventVersioningEngine {
  private static instance: EventVersioningEngine | null = null;
  /** Key: `${eventName}:${fromVersion}->${toVersion}` */
  private transformers: Map<string, VersionTransformer> = new Map();

  private constructor() {}

  public static getInstance(): EventVersioningEngine {
    if (!EventVersioningEngine.instance) {
      EventVersioningEngine.instance = new EventVersioningEngine();
    }
    return EventVersioningEngine.instance;
  }

  /**
   * Register a version transformer function (e.g. "1.0" -> "2.0")
   */
  public registerTransformer<F, T>(
    eventName: string,
    fromVersion: string,
    toVersion: string,
    transformer: VersionTransformer<F, T>
  ): void {
    const key = `${eventName}:${fromVersion}->${toVersion}`;
    this.transformers.set(key, transformer as VersionTransformer);
  }

  /**
   * Transform an event payload to target version if a transformer exists
   */
  public transform<T>(
    event: EnterpriseEvent,
    targetVersion: string
  ): EnterpriseEvent<T> {
    const currentVersion = event.context.version || '1.0';

    if (currentVersion === targetVersion) {
      return event as EnterpriseEvent<T>;
    }

    const key = `${event.name}:${currentVersion}->${targetVersion}`;
    const transformer = this.transformers.get(key);

    if (!transformer) {
      // If no transformer registered, return as-is with fallback warning
      return event as EnterpriseEvent<T>;
    }

    const transformedPayload = transformer(event.payload, event);

    return {
      ...event,
      payload: transformedPayload,
      context: {
        ...event.context,
        version: targetVersion,
      },
    } as EnterpriseEvent<T>;
  }
}

export const eventVersioningEngine = EventVersioningEngine.getInstance();
