/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, AppModuleId, ALL_APP_MODULES } from '../types';

export const ALL_MODULE_IDS: AppModuleId[] = ALL_APP_MODULES.map(m => m.id);

export const DEFAULT_OPS_MODULES: AppModuleId[] = [
  'gst',
  'mca_roc',
  'income_tax',
  'trademark',
  'trust_ngo',
  'dsc',
  'registration_license',
  'client_master'
];

export const DEFAULT_SALES_MODULES: AppModuleId[] = [
  'sales_marketing',
  'client_master'
];

/**
 * Returns the effective list of accessible modules for an employee.
 * Admin role always has all modules.
 * If employee has specific accessibleModules configured, return them.
 * Otherwise, fall back to sensible defaults based on department.
 */
export function getEmployeeAccessibleModules(emp: Employee | null): AppModuleId[] {
  if (!emp) return [];
  if (emp.role === 'admin') return [...ALL_MODULE_IDS];

  if (Array.isArray(emp.accessibleModules) && emp.accessibleModules.length > 0) {
    return emp.accessibleModules;
  }

  // Graceful fallback for existing accounts
  if (emp.department === 'Sales & Marketing') {
    return DEFAULT_SALES_MODULES;
  }
  if (emp.department === 'Operation Management') {
    return DEFAULT_OPS_MODULES;
  }

  return [...ALL_MODULE_IDS];
}

/**
 * Check if the user has access to a specific AppModuleId.
 * Note: Task Manager is ALWAYS accessible to all employees and is not restricted by this function.
 */
export function hasModuleAccess(emp: Employee | null, moduleId: AppModuleId): boolean {
  if (!emp) return false;
  if (emp.role === 'admin') return true;
  const accessible = getEmployeeAccessibleModules(emp);
  return accessible.includes(moduleId);
}

/**
 * Determine if an employee can navigate to a specific NavigationTarget.
 */
export function canAccessNavigationTarget(emp: Employee | null, target: string): boolean {
  if (!emp) return false;
  if (emp.role === 'admin') return true;

  // Task Command Center is ALWAYS allowed for all employees
  if (target === 'ops_tasks' || target.startsWith('ops_tasks_')) {
    return true;
  }

  // Landing page / Overview is accessible to everyone
  if (target === 'landing') {
    return true;
  }

  // Sales Module Targets
  if (target.startsWith('sales_')) {
    return hasModuleAccess(emp, 'sales_marketing');
  }

  // GST Targets
  if (target === 'ops_gst' || target.startsWith('ops_gst_')) {
    return hasModuleAccess(emp, 'gst');
  }

  // MCA Targets
  if (target === 'ops_mca' || target.startsWith('ops_mca_')) {
    return hasModuleAccess(emp, 'mca_roc');
  }

  // Income Tax Targets
  if (target === 'ops_itr' || target.startsWith('ops_itr_')) {
    return hasModuleAccess(emp, 'income_tax');
  }

  // Trademark & Copyright Targets
  if (target.startsWith('ops_tm_') || target.startsWith('ops_copyright_')) {
    return hasModuleAccess(emp, 'trademark');
  }

  // Trust & NGO Targets
  if (target.startsWith('ops_trust_')) {
    return hasModuleAccess(emp, 'trust_ngo');
  }

  // DSC Management Targets
  if (target.startsWith('ops_dsc_')) {
    return hasModuleAccess(emp, 'dsc');
  }

  // Registration & License Targets
  if (target.startsWith('ops_license_')) {
    return hasModuleAccess(emp, 'registration_license');
  }

  // Client Master Targets
  if (target === 'ops_clients' || target.startsWith('ops_clients_')) {
    return hasModuleAccess(emp, 'client_master');
  }

  // HR Module Targets
  if (target.startsWith('hr_') || target === 'tl_my_attendance') {
    return hasModuleAccess(emp, 'hr_workforce');
  }

  // Settings Module Targets
  if (target.startsWith('settings_')) {
    return hasModuleAccess(emp, 'settings_control');
  }

  // Operations Dashboard (Mission Control) requires at least one operations module or task manager
  if (target === 'ops_dashboard') {
    return true;
  }

  return true;
}

import { getEmployees, getCurrentSession } from './db';

/**
 * Returns all active employees who have access/permission to the specified module.
 * Admin and Super Admin are always included.
 */
export function getEmployeesWithModuleAccess(moduleId: AppModuleId | string): Employee[] {
  const allEmps = getEmployees().filter(emp => emp.status === 'active');
  const modKey = (moduleId || '').toLowerCase().trim();

  // Map common strings to standard AppModuleId
  let targetModuleId: AppModuleId = 'gst';
  if (modKey === 'gst') targetModuleId = 'gst';
  else if (modKey === 'mca' || modKey === 'roc' || modKey === 'mca_roc') targetModuleId = 'mca_roc';
  else if (modKey === 'itr' || modKey === 'income_tax' || modKey === 'tax_audit') targetModuleId = 'income_tax';
  else if (modKey === 'trademark' || modKey === 'copyright') targetModuleId = 'trademark';
  else if (modKey === 'trust' || modKey === 'ngo' || modKey === 'trust_ngo') targetModuleId = 'trust_ngo';
  else if (modKey === 'dsc') targetModuleId = 'dsc';
  else if (modKey === 'license' || modKey === 'registration_license' || modKey === 'other') targetModuleId = 'registration_license';
  else if (modKey === 'sales' || modKey === 'sales_marketing') targetModuleId = 'sales_marketing';
  else if (modKey === 'client_master') targetModuleId = 'client_master';
  else targetModuleId = moduleId as AppModuleId;

  const filtered = allEmps.filter(emp => {
    if ((emp.role as string) === 'admin' || (emp.role as string) === 'super_admin') return true;
    return hasModuleAccess(emp, targetModuleId);
  });

  // If no specific match, fallback to all active employees to avoid empty dropdowns
  return filtered.length > 0 ? filtered : allEmps;
}

/**
 * Returns all active employees eligible to handle a specific service category
 * (e.g. GST, MCA, ITR, TRUST, DSC, TRADEMARK, OTHER).
 */
export function getEmployeesForServiceCategory(category: string): Employee[] {
  const cat = (category || '').toUpperCase().trim();
  if (cat.includes('GST')) return getEmployeesWithModuleAccess('gst');
  if (cat.includes('MCA') || cat.includes('ROC') || cat.includes('COMPANY') || cat.includes('LLP')) return getEmployeesWithModuleAccess('mca_roc');
  if (cat.includes('ITR') || cat.includes('INCOME') || cat.includes('TAX') || cat.includes('AUDIT')) return getEmployeesWithModuleAccess('income_tax');
  if (cat.includes('TRUST') || cat.includes('NGO') || cat.includes('SOCIETY') || cat.includes('12A')) return getEmployeesWithModuleAccess('trust_ngo');
  if (cat.includes('DSC') || cat.includes('DIGITAL')) return getEmployeesWithModuleAccess('dsc');
  if (cat.includes('TRADEMARK') || cat.includes('TM') || cat.includes('COPYRIGHT')) return getEmployeesWithModuleAccess('trademark');
  return getEmployeesWithModuleAccess('registration_license');
}

/**
 * Checks if a client/entity record is allotted to the current logged-in employee.
 * Admin and Super Admin always return true (can see everything).
 */
export function isClientAssignedToUser(
  assignedEmployeeId?: string,
  assignedEmployeeName?: string,
  user: Employee | null = getCurrentSession()
): boolean {
  if (!user) return true;
  if ((user.role as string) === 'admin' || (user.role as string) === 'super_admin') return true;

  const currentUserId = (user.id || '').toLowerCase().trim();
  const currentUserName = (user.name || '').toLowerCase().trim();

  const assignedId = (assignedEmployeeId || '').toLowerCase().trim();
  const assignedName = (assignedEmployeeName || '').toLowerCase().trim();

  if (assignedId && currentUserId && assignedId === currentUserId) return true;
  if (assignedName && currentUserName) {
    if (assignedName === currentUserName) return true;
    if (assignedName.includes(currentUserName) || currentUserName.includes(assignedName)) return true;
  }

  return false;
}

