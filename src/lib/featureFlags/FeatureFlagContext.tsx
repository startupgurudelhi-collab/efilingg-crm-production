/**
 * Enterprise Feature Flag React Context & Hooks
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.1)
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  FeatureFlagKey,
  FeatureFlagEvaluationResult,
  EvaluationContext,
  FeatureFlagConfig,
} from './types';
import { featureFlagService } from './FeatureFlagService';

export interface FeatureFlagContextValue {
  /** Check if a flag is enabled with current evaluation context */
  isEnabled: (flagKey: FeatureFlagKey) => boolean;
  /** Evaluate a flag and return detailed evaluation result */
  evaluate: (flagKey: FeatureFlagKey) => FeatureFlagEvaluationResult;
  /** Current evaluation context (user, role, department, email) */
  context: EvaluationContext;
  /** Update evaluation context */
  setContext: React.Dispatch<React.SetStateAction<EvaluationContext>>;
  /** All evaluated flags map */
  flags: Record<FeatureFlagKey, FeatureFlagEvaluationResult>;
  /** Dynamic override function for runtime toggle (Admin panel support) */
  setRuntimeOverride: (flagKey: FeatureFlagKey, enabled: boolean) => void;
  /** Clear dynamic runtime override */
  clearRuntimeOverride: (flagKey?: FeatureFlagKey) => void;
  /** Get registered configs */
  configs: FeatureFlagConfig[];
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export interface FeatureFlagProviderProps {
  children: React.ReactNode;
  initialContext?: EvaluationContext;
  /** Optional current session user object for automatic context binding */
  user?: {
    id?: string;
    role?: string;
    department?: string;
    email?: string;
  } | null;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  initialContext,
  user,
}) => {
  // Compute context from user session or initialContext
  const [context, setContext] = useState<EvaluationContext>(() => {
    if (user) {
      return {
        userId: user.id,
        role: user.role,
        department: user.department,
        email: user.email,
        percentageKey: user.id || user.email,
      };
    }
    return initialContext || {};
  });

  // Sync context when user object changes
  useEffect(() => {
    if (user) {
      setContext({
        userId: user.id,
        role: user.role,
        department: user.department,
        email: user.email,
        percentageKey: user.id || user.email,
      });
    }
  }, [user?.id, user?.role, user?.department, user?.email]);

  // State trigger for force re-rendering when flags change dynamically
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = featureFlagService.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  const isEnabled = useCallback(
    (flagKey: FeatureFlagKey) => {
      return featureFlagService.isEnabled(flagKey, context);
    },
    [context, version]
  );

  const evaluate = useCallback(
    (flagKey: FeatureFlagKey) => {
      return featureFlagService.evaluate(flagKey, context);
    },
    [context, version]
  );

  const setRuntimeOverride = useCallback((flagKey: FeatureFlagKey, enabled: boolean) => {
    featureFlagService.setRuntimeOverride(flagKey, enabled);
  }, []);

  const clearRuntimeOverride = useCallback((flagKey?: FeatureFlagKey) => {
    featureFlagService.clearRuntimeOverride(flagKey);
  }, []);

  const flags = useMemo(() => {
    return featureFlagService.getAllEvaluated(context);
  }, [context, version]);

  const configs = useMemo(() => {
    return featureFlagService.getAllConfigs();
  }, [version]);

  const value = useMemo(
    (): FeatureFlagContextValue => ({
      isEnabled,
      evaluate,
      context,
      setContext,
      flags,
      setRuntimeOverride,
      clearRuntimeOverride,
      configs,
    }),
    [isEnabled, evaluate, context, flags, setRuntimeOverride, clearRuntimeOverride, configs]
  );

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
};

/**
 * Hook to access the Feature Flag context
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return ctx;
}

/**
 * Hook to evaluate a single feature flag
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey,
  defaultFallback = false
): {
  enabled: boolean;
  result: FeatureFlagEvaluationResult;
} {
  const ctx = useContext(FeatureFlagContext);

  if (!ctx) {
    // Graceful fallback if used outside provider
    const result = featureFlagService.evaluate(flagKey);
    return {
      enabled: result.enabled ?? defaultFallback,
      result,
    };
  }

  const result = ctx.evaluate(flagKey);
  return {
    enabled: result.enabled,
    result,
  };
}
