/**
 * Enterprise Feature Flag Guard Component & HOC
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.1)
 *
 * Provides declarative UI protection, route protection, and component hiding based on
 * feature flags, role permissions, and department restrictions.
 */

import React from 'react';
import { FeatureFlagKey } from './types';
import { useFeatureFlags } from './FeatureFlagContext';

export interface FeatureFlagGuardProps {
  /** Feature flag key to check */
  flag?: FeatureFlagKey;
  flagKey?: FeatureFlagKey;
  /** Optional role constraint(s) required to render */
  requiredRole?: string | string[];
  /** Optional department constraint(s) required to render */
  requiredDepartment?: string | string[];
  /** Optional fallback UI rendered when feature flag is disabled */
  fallback?: React.ReactNode;
  /** Component content rendered when feature flag is enabled and constraints pass */
  children: React.ReactNode;
}

export const FeatureFlagGuard: React.FC<FeatureFlagGuardProps> = ({
  flag,
  flagKey,
  requiredRole,
  requiredDepartment,
  fallback = null,
  children,
}) => {
  const { isEnabled, context } = useFeatureFlags();

  const keyToUse = flag || flagKey;
  if (!keyToUse) {
    return <>{fallback}</>;
  }

  // 1. Evaluate Feature Flag state
  const enabled = isEnabled(keyToUse);
  if (!enabled) {
    return <>{fallback}</>;
  }

  // 2. Evaluate Role constraints if specified
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = context.role;
    if (!userRole || !roles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  // 3. Evaluate Department constraints if specified
  if (requiredDepartment) {
    const departments = Array.isArray(requiredDepartment) ? requiredDepartment : [requiredDepartment];
    const userDept = context.department;
    if (!userDept || !departments.includes(userDept)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * Higher-Order Component wrapper for feature flag protection
 */
export function withFeatureFlagGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flag: FeatureFlagKey,
  FallbackComponent: React.ComponentType<P> | null = null
): React.FC<P> {
  const GuardedComponent: React.FC<P> = (props) => {
    return (
      <FeatureFlagGuard
        flag={flag}
        fallback={FallbackComponent ? <FallbackComponent {...props} /> : null}
      >
        <WrappedComponent {...props} />
      </FeatureFlagGuard>
    );
  };

  GuardedComponent.displayName = `withFeatureFlagGuard(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return GuardedComponent;
}
