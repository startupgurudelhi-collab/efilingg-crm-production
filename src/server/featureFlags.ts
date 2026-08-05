/**
 * Enterprise Feature Flag Middleware & Node.js Service
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.1)
 *
 * Provides Node.js Express server middleware and REST endpoints for evaluating
 * and managing feature flags dynamically.
 */

import { Request, Response, NextFunction } from 'express';

export interface ServerFeatureFlagConfig {
  key: string;
  defaultValue: boolean;
  description: string;
}

export const SERVER_INITIAL_FLAGS: Record<string, ServerFeatureFlagConfig> = {
  ENABLE_AI_SALES_WORKSPACE: {
    key: 'ENABLE_AI_SALES_WORKSPACE',
    defaultValue: false,
    description: 'Enables AI Sales Workspace backend APIs',
  },
  ENABLE_WHATSAPP_INGESTION: {
    key: 'ENABLE_WHATSAPP_INGESTION',
    defaultValue: false,
    description: 'Enables WhatsApp webhook endpoints',
  },
  ENABLE_AI_AGENTS: {
    key: 'ENABLE_AI_AGENTS',
    defaultValue: false,
    description: 'Enables AI Multi-Agent execution endpoints',
  },
  ENABLE_WORKFLOW_ENGINE: {
    key: 'ENABLE_WORKFLOW_ENGINE',
    defaultValue: false,
    description: 'Enables Workflow Engine trigger endpoints',
  },
  ENABLE_CUSTOMER360: {
    key: 'ENABLE_CUSTOMER360',
    defaultValue: false,
    description: 'Enables Customer 360 lookup endpoints',
  },
  ENABLE_AI_AUTOMATION: {
    key: 'ENABLE_AI_AUTOMATION',
    defaultValue: false,
    description: 'Enables automated AI cron/background handlers',
  },
  ENABLE_SUPERVISOR_DASHBOARD: {
    key: 'ENABLE_SUPERVISOR_DASHBOARD',
    defaultValue: false,
    description: 'Enables Supervisor oversight APIs',
  },
};

class ServerFeatureFlagManager {
  private runtimeOverrides: Map<string, boolean> = new Map();

  /**
   * Check if a feature flag is enabled on the server
   */
  public isEnabled(flagKey: string): boolean {
    // 1. Runtime override
    if (this.runtimeOverrides.has(flagKey)) {
      return this.runtimeOverrides.get(flagKey)!;
    }

    // 2. Process Environment Variable
    if (process.env[flagKey] !== undefined) {
      return process.env[flagKey] === 'true' || process.env[flagKey] === '1';
    }
    const viteKey = `VITE_${flagKey}`;
    if (process.env[viteKey] !== undefined) {
      return process.env[viteKey] === 'true' || process.env[viteKey] === '1';
    }

    // 3. Initial default
    const config = SERVER_INITIAL_FLAGS[flagKey];
    return config ? config.defaultValue : false;
  }

  /**
   * Set dynamic runtime override on server without restart
   */
  public setOverride(flagKey: string, enabled: boolean): void {
    this.runtimeOverrides.set(flagKey, enabled);
    console.log(`[Server Feature Flags] Updated ${flagKey} = ${enabled}`);
  }

  /**
   * Clear dynamic runtime override
   */
  public clearOverride(flagKey?: string): void {
    if (flagKey) {
      this.runtimeOverrides.delete(flagKey);
    } else {
      this.runtimeOverrides.clear();
    }
  }

  /**
   * Get all flags status
   */
  public getAllStatus(): Record<string, { enabled: boolean; description: string; source: string }> {
    const status: Record<string, { enabled: boolean; description: string; source: string }> = {};

    Object.keys(SERVER_INITIAL_FLAGS).forEach((flagKey) => {
      let source = 'DEFAULT';
      if (this.runtimeOverrides.has(flagKey)) {
        source = 'RUNTIME_OVERRIDE';
      } else if (process.env[flagKey] !== undefined || process.env[`VITE_${flagKey}`] !== undefined) {
        source = 'ENV_VAR';
      }

      status[flagKey] = {
        enabled: this.isEnabled(flagKey),
        description: SERVER_INITIAL_FLAGS[flagKey].description,
        source,
      };
    });

    return status;
  }
}

export const serverFeatureFlagManager = new ServerFeatureFlagManager();

/**
 * Express Middleware to guard API routes using a feature flag
 */
export function requireFeatureFlag(flagKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!serverFeatureFlagManager.isEnabled(flagKey)) {
      return res.status(503).json({
        error: `Feature flag '${flagKey}' is disabled.`,
        code: 'FEATURE_DISABLED',
        flag: flagKey,
      });
    }
    next();
  };
}
