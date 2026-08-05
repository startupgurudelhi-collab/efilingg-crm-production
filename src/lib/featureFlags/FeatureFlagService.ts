/**
 * Enterprise Feature Flag Service
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.1)
 *
 * Singleton service providing typed, cached, observable, context-aware feature flag evaluation.
 * Supports runtime overrides, environment variables, percentage rollouts, role-based controls,
 * and dynamic updates for admin operations without restarting application services.
 */

import {
  FeatureFlagKey,
  FeatureFlagConfig,
  FeatureFlagEvaluationResult,
  EvaluationContext,
  FeatureFlagListener,
  IFeatureFlagProviderAdapter,
  InitialFeatureFlagKey,
} from './types';

export const INITIAL_FEATURE_FLAGS: Record<InitialFeatureFlagKey, FeatureFlagConfig> = {
  ENABLE_AI_SALES_WORKSPACE: {
    key: 'ENABLE_AI_SALES_WORKSPACE',
    defaultValue: true,
    description: 'Enables the unified AI Sales Workspace for lead management and AI co-pilot',
    category: 'SALES',
  },
  ENABLE_WHATSAPP_INGESTION: {
    key: 'ENABLE_WHATSAPP_INGESTION',
    defaultValue: true,
    description: 'Enables incoming WhatsApp Cloud API webhooks and channel message processing',
    category: 'INTEGRATION',
  },
  ENABLE_AI_AGENTS: {
    key: 'ENABLE_AI_AGENTS',
    defaultValue: true,
    description: 'Enables multi-agent AI framework (Reception, Qualification, Doc Collection)',
    category: 'AI',
  },
  ENABLE_WORKFLOW_ENGINE: {
    key: 'ENABLE_WORKFLOW_ENGINE',
    defaultValue: true,
    description: 'Enables event-driven automated workflow and SLA engine',
    category: 'WORKFLOW',
  },
  ENABLE_CUSTOMER360: {
    key: 'ENABLE_CUSTOMER360',
    defaultValue: true,
    description: 'Enables Customer 360 view with PAN/GSTIN identity resolution',
    category: 'SALES',
  },
  ENABLE_AI_AUTOMATION: {
    key: 'ENABLE_AI_AUTOMATION',
    defaultValue: true,
    description: 'Enables AI automated responses, recommendations, and document OCR verification',
    category: 'AI',
  },
  ENABLE_SUPERVISOR_DASHBOARD: {
    key: 'ENABLE_SUPERVISOR_DASHBOARD',
    defaultValue: true,
    description: 'Enables Supervisor real-time chat monitoring and SLA metrics',
    category: 'SYSTEM',
  },
};

export class FeatureFlagService {
  private static instance: FeatureFlagService | null = null;

  private flagConfigs: Map<FeatureFlagKey, FeatureFlagConfig> = new Map();
  private runtimeOverrides: Map<FeatureFlagKey, boolean> = new Map();
  private evaluationCache: Map<string, FeatureFlagEvaluationResult> = new Map();
  private listeners: Set<FeatureFlagListener> = new Set();
  private remoteAdapter: IFeatureFlagProviderAdapter | null = null;
  private debugLogging: boolean = false;

  private constructor() {
    this.registerInitialFlags();
    this.detectDebugMode();
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  private detectDebugMode(): void {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugLogging = urlParams.has('ff_debug') || localStorage.getItem('ff_debug') === 'true';
      }
    } catch {
      this.debugLogging = false;
    }
  }

  public setDebugLogging(enabled: boolean): void {
    this.debugLogging = enabled;
  }

  private registerInitialFlags(): void {
    Object.values(INITIAL_FEATURE_FLAGS).forEach((config) => {
      this.flagConfigs.set(config.key, config);
    });
  }

  /**
   * Register or update a feature flag configuration
   */
  public registerFlag(config: FeatureFlagConfig): void {
    this.flagConfigs.set(config.key, config);
    this.clearEvaluationCache();
    this.log(`[FeatureFlagService] Registered flag: ${config.key}`);
  }

  /**
   * Evaluate a feature flag with context
   */
  public isEnabled(flagKey: FeatureFlagKey, context: EvaluationContext = {}): boolean {
    return this.evaluate(flagKey, context).enabled;
  }

  /**
   * Full evaluation method returning detailed result with reason
   */
  public evaluate(flagKey: FeatureFlagKey, context: EvaluationContext = {}): FeatureFlagEvaluationResult {
    const cacheKey = this.getCacheKey(flagKey, context);
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const now = new Date().toISOString();

    // 1. Check Runtime Memory Overrides (highest precedence for admin live updates)
    if (this.runtimeOverrides.has(flagKey)) {
      const enabled = this.runtimeOverrides.get(flagKey)!;
      const result: FeatureFlagEvaluationResult = {
        flag: flagKey,
        enabled,
        reason: 'RUNTIME_OVERRIDE',
        evaluatedAt: now,
        context,
      };
      this.cacheAndLog(cacheKey, result);
      return result;
    }

    // 2. Check Environment Variables (VITE_ENABLE_... or process.env)
    const envValue = this.readEnvVariable(flagKey);
    if (envValue !== null) {
      const result: FeatureFlagEvaluationResult = {
        flag: flagKey,
        enabled: envValue,
        reason: 'ENV_OVERRIDE',
        evaluatedAt: now,
        context,
      };
      this.cacheAndLog(cacheKey, result);
      return result;
    }

    // 3. Get Registered Config or fallback default
    const config = this.flagConfigs.get(flagKey);
    const defaultValue = config?.defaultValue ?? false;

    if (!config || !config.rules) {
      const result: FeatureFlagEvaluationResult = {
        flag: flagKey,
        enabled: defaultValue,
        reason: 'DEFAULT',
        evaluatedAt: now,
        context,
      };
      this.cacheAndLog(cacheKey, result);
      return result;
    }

    // 4. Evaluate Rules (Targeted rules: userIds, roles, departments, percentage rollout)
    const rules = config.rules;

    // 4a. Explicit User ID whitelist
    if (rules.userIds && context.userId) {
      if (rules.userIds.includes(context.userId)) {
        const result: FeatureFlagEvaluationResult = {
          flag: flagKey,
          enabled: true,
          reason: 'USER_RULE',
          evaluatedAt: now,
          context,
        };
        this.cacheAndLog(cacheKey, result);
        return result;
      }
    }

    // 4b. Explicit Role check
    if (rules.roles && context.role) {
      if (!rules.roles.includes(context.role)) {
        const result: FeatureFlagEvaluationResult = {
          flag: flagKey,
          enabled: false,
          reason: 'DISABLED_BY_RULE',
          evaluatedAt: now,
          context,
        };
        this.cacheAndLog(cacheKey, result);
        return result;
      } else {
        const result: FeatureFlagEvaluationResult = {
          flag: flagKey,
          enabled: true,
          reason: 'ROLE_RULE',
          evaluatedAt: now,
          context,
        };
        this.cacheAndLog(cacheKey, result);
        return result;
      }
    }

    // 4c. Explicit Department check
    if (rules.departments && context.department) {
      if (!rules.departments.includes(context.department)) {
        const result: FeatureFlagEvaluationResult = {
          flag: flagKey,
          enabled: false,
          reason: 'DISABLED_BY_RULE',
          evaluatedAt: now,
          context,
        };
        this.cacheAndLog(cacheKey, result);
        return result;
      } else {
        const result: FeatureFlagEvaluationResult = {
          flag: flagKey,
          enabled: true,
          reason: 'DEPARTMENT_RULE',
          evaluatedAt: now,
          context,
        };
        this.cacheAndLog(cacheKey, result);
        return result;
      }
    }

    // 4d. Percentage Rollout calculation
    if (typeof rules.percentageRollout === 'number') {
      const rolloutKey = context.percentageKey || context.userId || context.email || 'anonymous';
      const userHash = this.hashString(rolloutKey + flagKey) % 100;
      const isEnabled = userHash < rules.percentageRollout;
      const result: FeatureFlagEvaluationResult = {
        flag: flagKey,
        enabled: isEnabled,
        reason: 'PERCENTAGE_ROLLOUT',
        evaluatedAt: now,
        context,
      };
      this.cacheAndLog(cacheKey, result);
      return result;
    }

    // Default Fallback
    const result: FeatureFlagEvaluationResult = {
      flag: flagKey,
      enabled: defaultValue,
      reason: 'DEFAULT',
      evaluatedAt: now,
      context,
    };
    this.cacheAndLog(cacheKey, result);
    return result;
  }

  /**
   * Set dynamic runtime override (e.g. from future Admin Panel without app restart)
   */
  public setRuntimeOverride(flagKey: FeatureFlagKey, enabled: boolean): void {
    this.runtimeOverrides.set(flagKey, enabled);
    this.clearEvaluationCache();
    const result = this.evaluate(flagKey);
    this.notifyListeners(flagKey, result);
    this.log(`[FeatureFlagService] Runtime override set for ${flagKey} = ${enabled}`);
  }

  /**
   * Clear dynamic runtime override for a specific flag or all flags
   */
  public clearRuntimeOverride(flagKey?: FeatureFlagKey): void {
    if (flagKey) {
      this.runtimeOverrides.delete(flagKey);
    } else {
      this.runtimeOverrides.clear();
    }
    this.clearEvaluationCache();
    this.log(`[FeatureFlagService] Runtime overrides cleared for ${flagKey || 'ALL'}`);
  }

  /**
   * Get all registered feature flag configurations
   */
  public getAllConfigs(): FeatureFlagConfig[] {
    return Array.from(this.flagConfigs.values());
  }

  /**
   * Get complete status report of all feature flags evaluated against context
   */
  public getAllEvaluated(context: EvaluationContext = {}): Record<FeatureFlagKey, FeatureFlagEvaluationResult> {
    const results: Record<string, FeatureFlagEvaluationResult> = {};
    for (const flagKey of this.flagConfigs.keys()) {
      results[flagKey] = this.evaluate(flagKey, context);
    }
    return results;
  }

  /**
   * Subscribe to feature flag change events
   */
  public subscribe(listener: FeatureFlagListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set remote database provider adapter
   */
  public async setRemoteAdapter(adapter: IFeatureFlagProviderAdapter): Promise<void> {
    this.remoteAdapter = adapter;
    try {
      const remoteFlags = await adapter.loadFlags();
      Object.entries(remoteFlags).forEach(([key, val]) => {
        if (typeof val === 'boolean') {
          this.setRuntimeOverride(key, val);
        } else if (typeof val === 'object' && val !== null) {
          this.registerFlag(val as FeatureFlagConfig);
        }
      });
      this.log(`[FeatureFlagService] Remote adapter '${adapter.name}' loaded successfully.`);
    } catch (err) {
      console.warn(`[FeatureFlagService] Failed to load remote flags from adapter '${adapter.name}':`, err);
    }
  }

  private notifyListeners(flagKey: FeatureFlagKey, result: FeatureFlagEvaluationResult): void {
    this.listeners.forEach((listener) => {
      try {
        listener(flagKey, result);
      } catch (e) {
        console.error('[FeatureFlagService] Error in listener execution:', e);
      }
    });
  }

  private readEnvVariable(flagKey: string): boolean | null {
    try {
      // 1. Check import.meta.env for Vite frontend
      const meta = import.meta as unknown as { env?: Record<string, string> };
      if (meta && meta.env) {
        const viteKey = `VITE_${flagKey}`;
        if (meta.env[viteKey] !== undefined) {
          return meta.env[viteKey] === 'true' || meta.env[viteKey] === '1';
        }
        if (meta.env[flagKey] !== undefined) {
          return meta.env[flagKey] === 'true' || meta.env[flagKey] === '1';
        }
      }
    } catch {
      // Fall through to process.env if available
    }

    try {
      // 2. Check process.env for Node server or bundler replaced envs
      if (typeof process !== 'undefined' && process.env) {
        if (process.env[flagKey] !== undefined) {
          return process.env[flagKey] === 'true' || process.env[flagKey] === '1';
        }
        const viteKey = `VITE_${flagKey}`;
        if (process.env[viteKey] !== undefined) {
          return process.env[viteKey] === 'true' || process.env[viteKey] === '1';
        }
      }
    } catch {
      // Ignore
    }

    return null;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private getCacheKey(flagKey: FeatureFlagKey, context: EvaluationContext): string {
    return `${flagKey}:${context.userId || 'anon'}:${context.role || 'norole'}:${context.department || 'nodept'}:${context.percentageKey || ''}`;
  }

  private cacheAndLog(cacheKey: string, result: FeatureFlagEvaluationResult): void {
    this.evaluationCache.set(cacheKey, result);
    if (this.debugLogging) {
      console.log(`[FF Evaluation] ${result.flag} => ${result.enabled ? 'ENABLED' : 'DISABLED'} (${result.reason})`, result);
    }
  }

  private clearEvaluationCache(): void {
    this.evaluationCache.clear();
  }

  private log(message: string): void {
    if (this.debugLogging) {
      console.log(message);
    }
  }
}

export const featureFlagService = FeatureFlagService.getInstance();
