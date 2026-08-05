/**
 * Enterprise Feature Flag Framework - Types & Interfaces
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.1)
 */

export type InitialFeatureFlagKey =
  | 'ENABLE_AI_SALES_WORKSPACE'
  | 'ENABLE_WHATSAPP_INGESTION'
  | 'ENABLE_AI_AGENTS'
  | 'ENABLE_WORKFLOW_ENGINE'
  | 'ENABLE_CUSTOMER360'
  | 'ENABLE_AI_AUTOMATION'
  | 'ENABLE_SUPERVISOR_DASHBOARD';

export type FeatureFlagKey = InitialFeatureFlagKey | (string & {});

export type RoleType = 'admin' | 'employee' | 'manager' | 'ops' | 'sales' | string;

export interface EvaluationContext {
  userId?: string;
  role?: RoleType;
  department?: string;
  email?: string;
  percentageKey?: string;
  attributes?: Record<string, unknown>;
}

export interface FeatureFlagRule {
  /** Allowed roles for canary/role-based release */
  roles?: string[];
  /** Allowed departments */
  departments?: string[];
  /** Explicit whitelist of user IDs */
  userIds?: string[];
  /** Percentage of users enabled (0 to 100) */
  percentageRollout?: number;
}

export interface FeatureFlagConfig {
  key: FeatureFlagKey;
  defaultValue: boolean;
  description: string;
  rules?: FeatureFlagRule;
  category?: 'SALES' | 'AI' | 'WORKFLOW' | 'INTEGRATION' | 'SYSTEM';
}

export type EvaluationReason =
  | 'RUNTIME_OVERRIDE'
  | 'ENV_OVERRIDE'
  | 'USER_RULE'
  | 'ROLE_RULE'
  | 'DEPARTMENT_RULE'
  | 'PERCENTAGE_ROLLOUT'
  | 'DISABLED_BY_RULE'
  | 'DEFAULT';

export interface FeatureFlagEvaluationResult {
  flag: FeatureFlagKey;
  enabled: boolean;
  reason: EvaluationReason;
  evaluatedAt: string;
  context?: EvaluationContext;
}

export type FeatureFlagListener = (
  flag: FeatureFlagKey,
  result: FeatureFlagEvaluationResult
) => void;

export interface IFeatureFlagProviderAdapter {
  name: string;
  loadFlags(): Promise<Record<FeatureFlagKey, boolean | FeatureFlagConfig>>;
  saveFlagOverride?(flag: FeatureFlagKey, enabled: boolean): Promise<void>;
}

export interface FeatureFlagState {
  flags: Record<FeatureFlagKey, FeatureFlagEvaluationResult>;
  context: EvaluationContext;
  isLoaded: boolean;
}
