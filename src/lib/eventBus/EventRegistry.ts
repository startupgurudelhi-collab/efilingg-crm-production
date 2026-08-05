/**
 * Enterprise Event Registry
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Central metadata registry holding all registered event schemas, categories,
 * descriptions, versions, producers, and declared consumers across the CRM platform.
 */

import { EventDefinition, EventCategory } from './types';

export class EventRegistry {
  private static instance: EventRegistry | null = null;
  private registry: Map<string, EventDefinition> = new Map();

  private constructor() {}

  public static getInstance(): EventRegistry {
    if (!EventRegistry.instance) {
      EventRegistry.instance = new EventRegistry();
    }
    return EventRegistry.instance;
  }

  /**
   * Register an event definition schema
   */
  public register<T>(definition: EventDefinition<T>): void {
    const key = this.getKey(definition.eventName, definition.version);
    this.registry.set(key, definition as EventDefinition<unknown>);
  }

  /**
   * Retrieve event definition by name and version
   */
  public get(eventName: string, version: string = '1.0'): EventDefinition | undefined {
    return this.registry.get(this.getKey(eventName, version));
  }

  /**
   * Check if an event definition is registered
   */
  public isRegistered(eventName: string, version: string = '1.0'): boolean {
    return this.registry.has(this.getKey(eventName, version));
  }

  /**
   * List all registered event definitions
   */
  public getAll(): EventDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get all registered events in a specific category
   */
  public getByCategory(category: EventCategory): EventDefinition[] {
    return Array.from(this.registry.values()).filter((def) => def.category === category);
  }

  private getKey(eventName: string, version: string): string {
    return `${eventName}:v${version}`;
  }
}

export const eventRegistry = EventRegistry.getInstance();
