/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileSpreadsheet, Building2, Shield, Landmark, KeyRound,
  FileCheck2, ChevronDown, ArrowUpRight, TrendingUp, CheckCircle,
  Clock, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Employee } from '../../types';
import { hasModuleAccess } from '../../lib/permissions';

export interface GstGridData {
  totalClients: number;
  gstr1Filed: number;
  gstr1Pending: number;
  gstr3bFiled: number;
  gstr3bPending: number;
  compliancePct: number;
  prevMonthName: string;
  prevMonthFiled: number;
  prevMonthPending: number;
}

export interface McaGridData {
  activeCompanies: number;
  formsFiled: number;
  pendingFilings: number;
  overdueFilings: number;
  compliancePct: number;
  prevMonthFiled: number;
  prevMonthPending: number;
}

export interface ItrGridData {
  totalClients: number;
  itrFiled: number;
  itrPending: number;
  taxAuditCount: number;
  noticeCasesCount: number;
  compliancePct: number;
}

export interface TrustGridData {
  ngoClients: number;
  count12A: number;
  count80G: number;
  form10bPending: number;
  form10bbPending: number;
  compliancePct: number;
}

export interface DscGridData {
  activeDsc: number;
  expiring30Days: number;
  expiredDsc: number;
  renewedDsc: number;
  renewalPct: number;
}

export interface LicenseGridData {
  totalApplications: number;
  completed: number;
  pending: number;
  delayed: number;
  successPct: number;
}

interface ComplianceControlGridProps {
  gstData: GstGridData;
  mcaData: McaGridData;
  itrData: ItrGridData;
  trustData: TrustGridData;
  dscData: DscGridData;
  licenseData: LicenseGridData;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onNavigate: (section: string, subTab?: string, filter?: string) => void;
  sessionUser?: Employee | null;
}

const MONTH_OPTIONS = [
  'July 2026',
  'August 2026',
  'June 2026',
  'May 2026',
  'April 2026',
  'March 2026'
];

export default function ComplianceControlGrid({
  gstData,
  mcaData,
  itrData,
  trustData,
  dscData,
  licenseData,
  selectedMonth,
  onSelectMonth,
  onNavigate,
  sessionUser
}: ComplianceControlGridProps) {
  const canAccessGst = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'gst');
  const canAccessMca = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'mca_roc');
  const canAccessItr = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'income_tax');
  const canAccessTrust = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'trust_ngo');
  const canAccessDsc = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'dsc');
  const canAccessLicense = !sessionUser || sessionUser.role === 'admin' || hasModuleAccess(sessionUser, 'registration_license');
  return (
    <section id="compliance-control-grid" className="space-y-2.5 select-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider font-sans">
            COMPLIANCE CONTROL GRID (2 × 3 EXECUTIVE MATRIX)
          </h2>
          <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
            — High-capacity statutory filing desks with deep drilldown
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-bold">FY 2026–27 Statutory Pipeline</span>
      </div>

      {/* DESKTOP GRID: 2 Rows × 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* =========================================================================
            ROW 1 - CARD 1: GST COMMAND CENTER
            ========================================================================= */}
        {canAccessGst && (
        <div
          id="card-kpi-gst"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            {/* Header with Month Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    GST COMPLIANCE
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">Monthly & Quarterly Returns</span>
                </div>
              </div>
              {/* Working Month Dropdown (Default Previous Month: July 2026) */}
              <select
                id="gst-month-select"
                value={selectedMonth}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold px-2 py-1 outline-none cursor-pointer hover:border-emerald-500 transition"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Clients & Compliance % */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Total GST Clients</span>
                <button
                  onClick={() => onNavigate('gst', 'CLIENTS')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-emerald-600 transition cursor-pointer font-mono"
                  title="View All GST Clients"
                >
                  {gstData.totalClients}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Compliance Score</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {gstData.compliancePct}%
                </span>
              </div>
            </div>

            {/* GSTR-1 and GSTR-3B Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => onNavigate('gst', 'MONTHLY', 'gstr1')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-400/50 cursor-pointer transition group/sub"
              >
                <div className="flex items-center justify-between text-slate-400 font-medium text-[10px] mb-1">
                  <span>GSTR-1 Monthly</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/sub:opacity-100 transition" />
                </div>
                <div className="font-bold flex items-center justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400">{gstData.gstr1Filed} Filed</span>
                  <span className="text-amber-600 dark:text-amber-400">{gstData.gstr1Pending} Pending</span>
                </div>
              </div>

              <div
                onClick={() => onNavigate('gst', 'MONTHLY', 'gstr3b')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-400/50 cursor-pointer transition group/sub"
              >
                <div className="flex items-center justify-between text-slate-400 font-medium text-[10px] mb-1">
                  <span>GSTR-3B Monthly</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/sub:opacity-100 transition" />
                </div>
                <div className="font-bold flex items-center justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400">{gstData.gstr3bFiled} Filed</span>
                  <span className="text-rose-600 dark:text-rose-400">{gstData.gstr3bPending} Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Previous Month Comparison */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Previous Month ({gstData.prevMonthName}):</span>
            <div className="font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">{gstData.prevMonthFiled} Filed</span>
              <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
              <span className="text-amber-500">{gstData.prevMonthPending} Pending</span>
            </div>
          </div>
        </div>
        )}

        {/* =========================================================================
            ROW 1 - CARD 2: MCA & ROC COMMAND CENTER
            ========================================================================= */}
        {canAccessMca && (
        <div
          id="card-kpi-mca"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    MCA & ROC
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">Companies & LLP Statutory</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded border border-purple-200/50">
                FY 25–26
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Active Companies & LLP</span>
                <button
                  onClick={() => onNavigate('mca', 'mca')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-purple-600 transition cursor-pointer font-mono"
                  title="Open MCA Companies"
                >
                  {mcaData.activeCompanies}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Compliance</span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                  {mcaData.compliancePct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
              <div
                onClick={() => onNavigate('mca', 'roc')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Forms Filed</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 font-mono">{mcaData.formsFiled}</div>
              </div>
              <div
                onClick={() => onNavigate('mca', 'roc')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Pending</div>
                <div className="font-black text-amber-500 text-sm mt-0.5 font-mono">{mcaData.pendingFilings}</div>
              </div>
              <div
                onClick={() => onNavigate('mca', 'roc')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Overdue</div>
                <div className="font-black text-rose-500 text-sm mt-0.5 font-mono">{mcaData.overdueFilings}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>ROC Tracking (AOC-4 / MGT-7)</span>
            <button
              onClick={() => onNavigate('mca', 'roc')}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
            >
              Open ROC Desk →
            </button>
          </div>
        </div>
        )}

        {/* =========================================================================
            ROW 1 - CARD 3: INCOME TAX COMMAND CENTER
            ========================================================================= */}
        {canAccessItr && (
        <div
          id="card-kpi-itr"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    INCOME TAX & AUDIT
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">AY 2026–27 Returns & Tax Audits</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded border border-blue-200/50">
                Direct Tax
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Total Taxpayers</span>
                <button
                  onClick={() => onNavigate('itr', 'itr')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-blue-600 transition cursor-pointer font-mono"
                  title="Open ITR Desk"
                >
                  {itrData.totalClients}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Compliance</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  {itrData.compliancePct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => onNavigate('itr', 'itr')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 font-medium text-[10px] mb-1">IT Returns Status</div>
                <div className="font-bold flex items-center justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400">{itrData.itrFiled} Filed</span>
                  <span className="text-rose-500">{itrData.itrPending} Pend</span>
                </div>
              </div>

              <div
                onClick={() => onNavigate('itr', 'audit')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 font-medium text-[10px] mb-1">Tax Audit Form 3CD</div>
                <div className="font-bold text-amber-600 dark:text-amber-400">
                  {itrData.taxAuditCount} Active Cases
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Notice & Scrutiny Cases: <strong className="text-rose-500 font-bold">{itrData.noticeCasesCount}</strong></span>
            <button
              onClick={() => onNavigate('itr', 'itr')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Open Direct Tax →
            </button>
          </div>
        </div>
        )}

        {/* =========================================================================
            ROW 2 - CARD 4: TRUST & NGO COMMAND CENTER
            ========================================================================= */}
        {canAccessTrust && (
        <div
          id="card-kpi-trust"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    TRUST & NGO
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">12A, 80G & Form 10B/10BB</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded border border-teal-200/50">
                Exemptions
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">NGO Entities</span>
                <button
                  onClick={() => onNavigate('trust', 'trust')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-teal-600 transition cursor-pointer font-mono"
                  title="Open NGO Entities"
                >
                  {trustData.ngoClients}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Compliance</span>
                <span className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono">
                  {trustData.compliancePct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => onNavigate('trust', 'trust', '12A')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 font-medium text-[10px] mb-1">12A & 80G Approval</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {trustData.count12A} Certified
                </div>
              </div>

              <div
                onClick={() => onNavigate('trust', 'audit', '10B')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 font-medium text-[10px] mb-1">Form 10B Audit</div>
                <div className="font-bold text-amber-500">
                  {trustData.form10bPending} Pending
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Form 10BB Cases: <strong className="text-emerald-600 font-bold">{trustData.form10bbPending}</strong></span>
            <button
              onClick={() => onNavigate('trust', 'trust')}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
            >
              Exemption Desk →
            </button>
          </div>
        </div>
        )}

        {/* =========================================================================
            ROW 2 - CARD 5: DSC COMMAND CENTER
            ========================================================================= */}
        {canAccessDsc && (
        <div
          id="card-kpi-dsc"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    DSC TOKENS
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">Digital Signatures & Expiry</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-200/50">
                Class 3 Tokens
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Active DSC Inventory</span>
                <button
                  onClick={() => onNavigate('dsc', 'dsc', 'ACTIVE')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-amber-600 transition cursor-pointer font-mono"
                  title="Open Active DSC Tokens"
                >
                  {dscData.activeDsc}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Renewal Rate</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                  {dscData.renewalPct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => onNavigate('dsc', 'dsc', 'RENEWAL')}
                className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800 hover:border-rose-400/50 cursor-pointer transition"
              >
                <div className="text-rose-600 dark:text-rose-400 font-bold text-[10px] mb-1">Due in &lt; 30 Days</div>
                <div className="font-black text-rose-700 dark:text-rose-300 text-sm font-mono">
                  {dscData.expiring30Days} Expiring
                </div>
              </div>

              <div
                onClick={() => onNavigate('dsc', 'dsc', 'EXPIRED')}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 font-medium text-[10px] mb-1">Expired DSC</div>
                <div className="font-bold text-slate-600 dark:text-slate-300 text-sm font-mono">
                  {dscData.expiredDsc} Inactive
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Successfully Renewed: <strong className="text-emerald-600 font-bold">{dscData.renewedDsc}</strong></span>
            <button
              onClick={() => onNavigate('dsc', 'dsc')}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Token Registry →
            </button>
          </div>
        </div>
        )}

        {/* =========================================================================
            ROW 2 - CARD 6: LICENSES & REGISTRATION
            ========================================================================= */}
        {canAccessLicense && (
        <div
          id="card-kpi-license"
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
                    REGISTRATION & LICENSES
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-medium">FSSAI, MSME, IEC, Trade & Labour</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 rounded border border-cyan-200/50">
                Statutory
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">All Applications</span>
                <button
                  onClick={() => onNavigate('license', 'others')}
                  className="text-2xl font-black text-slate-900 dark:text-white hover:text-cyan-600 transition cursor-pointer font-mono"
                  title="Open License Applications"
                >
                  {licenseData.totalApplications}
                </button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">Success Rate</span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {licenseData.successPct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
              <div
                onClick={() => onNavigate('license', 'others')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Completed</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 font-mono">{licenseData.completed}</div>
              </div>
              <div
                onClick={() => onNavigate('license', 'others')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Pending</div>
                <div className="font-black text-amber-500 text-sm mt-0.5 font-mono">{licenseData.pending}</div>
              </div>
              <div
                onClick={() => onNavigate('license', 'others')}
                className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-400/50 cursor-pointer transition"
              >
                <div className="text-slate-400 text-[9.5px] font-medium">Delayed</div>
                <div className="font-black text-rose-500 text-sm mt-0.5 font-mono">{licenseData.delayed}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>FSSAI / IEC / MSME Tracker</span>
            <button
              onClick={() => onNavigate('license', 'others')}
              className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
            >
              All Licenses →
            </button>
          </div>
        </div>
        )}</div>
    </section>
  );
}
