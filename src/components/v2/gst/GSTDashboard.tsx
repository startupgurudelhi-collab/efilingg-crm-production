/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { V2GstClient, V2GstReturnStatus } from '../../../lib/v2_db';
import { Employee } from '../../../types';
import { getCurrentSession } from '../../../lib/db';
import { 
  Building2, CheckCircle2, Clock, AlertTriangle, Users, 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Filter, Calendar, BarChart3, PieChart, ShieldAlert, Sparkles, ChevronRight
} from 'lucide-react';

interface GSTDashboardProps {
  clients: V2GstClient[];
  returns: V2GstReturnStatus[];
  employees: Employee[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onNavigateToTab: (tab: 'CLIENTS' | 'MONTHLY' | 'QUARTERLY' | 'REPORTS' | 'SETTINGS', filter?: string) => void;
  onSelectEmployeeFilter: (empId: string) => void;
}

export default function GSTDashboard({
  clients,
  returns,
  employees,
  selectedMonth,
  onMonthChange,
  onNavigateToTab,
  onSelectEmployeeFilter
}: GSTDashboardProps) {
  // Available Months List
  const availableMonths = [
    'May 2026', 'June 2026', 'July 2026', 'August 2026', 
    'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  // Helper to determine previous month for comparison
  const previousMonth = useMemo(() => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) return availableMonths[idx - 1];
    return 'June 2026';
  }, [selectedMonth]);

  // Client Categorization
  const clientStats = useMemo(() => {
    const total = clients.length;
    const monthly = clients.filter(c => c.returnsMode === 'MONTHLY').length;
    const quarterly = clients.filter(c => c.returnsMode === 'QUARTERLY').length;
    const composition = clients.filter(c => c.clientType === 'PROPRIETOR' || c.clientType === 'PARTNERSHIP FIRM').length;
    return { total, monthly, quarterly, composition };
  }, [clients]);

  // Current Month Filing Statistics
  const currentMonthStats = useMemo(() => {
    const monthlyClients = clients.filter(c => c.returnsMode === 'MONTHLY');
    const totalRequired = monthlyClients.length;

    let gstr1Filed = 0;
    let gstr3bFiled = 0;
    let gstr1Pending = 0;
    let gstr3bPending = 0;
    let gstr1Overdue = 0;
    let gstr3bOverdue = 0;
    let criticalDelays = 0;

    monthlyClients.forEach(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedMonth);
      const isG1Filed = ret?.gstr1 === 'FILED';
      const is3bFiled = ret?.gstr3b === 'FILED';

      if (isG1Filed) gstr1Filed++;
      else {
        gstr1Pending++;
        gstr1Overdue++;
      }

      if (is3bFiled) gstr3bFiled++;
      else {
        gstr3bPending++;
        gstr3bOverdue++;
      }

      if (!isG1Filed && !is3bFiled) {
        criticalDelays++;
      }
    });

    const totalReturnsCount = totalRequired * 2;
    const totalFiledCount = gstr1Filed + gstr3bFiled;
    const compliancePercent = totalReturnsCount > 0 ? Math.round((totalFiledCount / totalReturnsCount) * 100) : 100;
    const gstr1SuccessRate = totalRequired > 0 ? Math.round((gstr1Filed / totalRequired) * 100) : 100;
    const gstr3bSuccessRate = totalRequired > 0 ? Math.round((gstr3bFiled / totalRequired) * 100) : 100;
    const overduePercent = totalReturnsCount > 0 ? Math.round(((gstr1Overdue + gstr3bOverdue) / totalReturnsCount) * 100) : 0;

    return {
      totalRequired,
      gstr1Filed,
      gstr3bFiled,
      gstr1Pending,
      gstr3bPending,
      gstr1Overdue,
      gstr3bOverdue,
      criticalDelays,
      compliancePercent,
      gstr1SuccessRate,
      gstr3bSuccessRate,
      overduePercent,
      totalFiledCount,
      totalPendingCount: (gstr1Pending + gstr3bPending)
    };
  }, [clients, returns, selectedMonth]);

  // Previous Month Filing Statistics for Comparison (Section 4)
  const previousMonthStats = useMemo(() => {
    const monthlyClients = clients.filter(c => c.returnsMode === 'MONTHLY');
    const totalRequired = monthlyClients.length;

    let gstr1Filed = 0;
    let gstr3bFiled = 0;

    monthlyClients.forEach(cl => {
      const ret = returns.find(r => r.gstClientId === cl.id && r.period === previousMonth);
      if (ret?.gstr1 === 'FILED') gstr1Filed++;
      if (ret?.gstr3b === 'FILED') gstr3bFiled++;
    });

    const totalReturnsCount = totalRequired * 2;
    const totalFiledCount = gstr1Filed + gstr3bFiled;
    const totalPendingCount = totalReturnsCount - totalFiledCount;
    const compliancePercent = totalReturnsCount > 0 ? Math.round((totalFiledCount / totalReturnsCount) * 100) : 100;

    return {
      totalFiledCount,
      totalPendingCount,
      compliancePercent
    };
  }, [clients, returns, previousMonth]);

  // Employee-wise Performance Data (Section 3)
  const employeePerformance = useMemo(() => {
    const sessionUser = getCurrentSession();
    const isAdmin = !sessionUser || (sessionUser.role as string) === 'admin' || (sessionUser.role as string) === 'super_admin';
    const targetEmployees = isAdmin 
      ? employees 
      : employees.filter(emp => emp.id === sessionUser.id || emp.name.toLowerCase().trim() === sessionUser.name.toLowerCase().trim());

    return targetEmployees.map(emp => {
      const empClients = clients.filter(c => (c.assignedEmployeeId === emp.id || c.assignedEmployeeName === emp.name) && c.returnsMode === 'MONTHLY');
      const totalClientsCount = empClients.length;

      let gstr1Filed = 0;
      let gstr3bFiled = 0;
      let pendingReturns = 0;
      let overdueReturns = 0;

      empClients.forEach(cl => {
        const ret = returns.find(r => r.gstClientId === cl.id && r.period === selectedMonth);
        if (ret?.gstr1 === 'FILED') gstr1Filed++;
        else {
          pendingReturns++;
          overdueReturns++;
        }

        if (ret?.gstr3b === 'FILED') gstr3bFiled++;
        else {
          pendingReturns++;
          overdueReturns++;
        }
      });

      const totalRequired = totalClientsCount * 2;
      const totalFiled = gstr1Filed + gstr3bFiled;
      const compliance = totalRequired > 0 ? Math.round((totalFiled / totalRequired) * 100) : 100;

      return {
        id: emp.id,
        name: emp.name,
        code: emp.employeeCode || 'EMP',
        role: emp.role,
        totalClients: totalClientsCount,
        gstr1Filed,
        gstr3bFiled,
        pendingReturns,
        overdueReturns,
        compliance
      };
    }).sort((a, b) => b.totalClients - a.totalClients);
  }, [employees, clients, returns, selectedMonth]);

  // Monthly Trend Data for Charts (Section 5)
  const monthlyTrendData = useMemo(() => {
    const months = ['May 2026', 'June 2026', 'July 2026', 'August 2026'];
    const monthlyClients = clients.filter(c => c.returnsMode === 'MONTHLY');

    return months.map(m => {
      let filed1 = 0;
      let filed3b = 0;
      monthlyClients.forEach(cl => {
        const ret = returns.find(r => r.gstClientId === cl.id && r.period === m);
        if (ret?.gstr1 === 'FILED') filed1++;
        if (ret?.gstr3b === 'FILED') filed3b++;
      });
      const total = monthlyClients.length;
      const avgCompliance = total > 0 ? Math.round(((filed1 + filed3b) / (total * 2)) * 100) : 0;
      return {
        month: m.split(' ')[0],
        fullMonth: m,
        gstr1Filed: filed1,
        gstr3bFiled: filed3b,
        total,
        compliance: avgCompliance
      };
    });
  }, [clients, returns]);

  // Comparison Diff calculations
  const filedDiff = currentMonthStats.totalFiledCount - previousMonthStats.totalFiledCount;
  const complianceDiff = currentMonthStats.compliancePercent - previousMonthStats.compliancePercent;

  return (
    <div className="space-y-6">
      {/* Top Controls & Period Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
              GST Compliance Command Center
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executive filing KPIs, automated compliance scoring, overdue monitoring, and team throughput.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <span>Filing Period:</span>
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {m} {m === 'July 2026' ? '(Previous Month)' : m === 'August 2026' ? '(Current Month)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 : GST OVERVIEW KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total GST Clients */}
        <div 
          onClick={() => onNavigateToTab('CLIENTS')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 p-4 rounded-2xl shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total GST Clients
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50">{clientStats.total}</span>
            <span className="text-xs text-slate-400 font-medium">Registered</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Monthly: <strong className="text-slate-800 dark:text-slate-200">{clientStats.monthly}</strong></span>
            <span className="text-slate-500">Quarterly: <strong className="text-slate-800 dark:text-slate-200">{clientStats.quarterly}</strong></span>
          </div>
        </div>

        {/* Card 2: GSTR-1 Filing Statistics */}
        <div 
          onClick={() => onNavigateToTab('MONTHLY', 'gstr1')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 p-4 rounded-2xl shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GSTR-1 Monthly
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{currentMonthStats.gstr1Filed}</span>
            <span className="text-xs text-slate-400 font-medium">/ {currentMonthStats.totalRequired} Filed</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentMonthStats.gstr1SuccessRate}% Success</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{currentMonthStats.gstr1Pending} Pending</span>
          </div>
        </div>

        {/* Card 3: GSTR-3B Filing Statistics */}
        <div 
          onClick={() => onNavigateToTab('MONTHLY', 'gstr3b')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 p-4 rounded-2xl shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GSTR-3B Monthly
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{currentMonthStats.gstr3bFiled}</span>
            <span className="text-xs text-slate-400 font-medium">/ {currentMonthStats.totalRequired} Filed</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-blue-600 dark:text-blue-400 font-bold">{currentMonthStats.gstr3bSuccessRate}% Success</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{currentMonthStats.gstr3bPending} Pending</span>
          </div>
        </div>

        {/* Card 4: Overall Compliance Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Compliance Score
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${
              currentMonthStats.compliancePercent >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
              currentMonthStats.compliancePercent >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {currentMonthStats.compliancePercent}%
            </span>
            <span className="text-xs text-slate-400 font-medium">{selectedMonth}</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Overdue Risk: <strong className="text-rose-600">{currentMonthStats.overduePercent}%</strong></span>
            <span className="text-slate-500">Status: <strong className="text-emerald-600">{currentMonthStats.compliancePercent >= 80 ? 'Healthy' : 'Action Required'}</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2 : OVERDUE RETURNS & CRITICAL DELAYS
          ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <span>Overdue Returns & Urgent Action Items</span>
          </h3>
          <span className="text-[11px] text-slate-400">Click any card to open the filtered client roster</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Overdue Card 1: GSTR-1 Overdue */}
          <div
            onClick={() => onNavigateToTab('MONTHLY', 'gstr1_overdue')}
            className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl flex items-center justify-between transition hover:border-rose-400 hover:shadow-xs cursor-pointer group"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                GSTR-1 Overdue
              </span>
              <div className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-1">
                {currentMonthStats.gstr1Overdue}
              </div>
              <p className="text-[10px] text-rose-600/90 dark:text-rose-400/80 mt-0.5">
                Sales returns pending filing for {selectedMonth}
              </p>
            </div>
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl group-hover:translate-x-0.5 transition">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* Overdue Card 2: GSTR-3B Overdue */}
          <div
            onClick={() => onNavigateToTab('MONTHLY', 'gstr3b_overdue')}
            className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl flex items-center justify-between transition hover:border-amber-400 hover:shadow-xs cursor-pointer group"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                GSTR-3B Overdue
              </span>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1">
                {currentMonthStats.gstr3bOverdue}
              </div>
              <p className="text-[10px] text-amber-600/90 dark:text-amber-400/80 mt-0.5">
                Tax payment returns pending for {selectedMonth}
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl group-hover:translate-x-0.5 transition">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* Overdue Card 3: Critical Delays */}
          <div
            onClick={() => onNavigateToTab('MONTHLY', 'critical')}
            className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl flex items-center justify-between transition hover:border-purple-400 hover:shadow-xs cursor-pointer group"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Critical Delays (Both Pending)
              </span>
              <div className="text-2xl font-black text-purple-800 dark:text-purple-200 mt-1">
                {currentMonthStats.criticalDelays}
              </div>
              <p className="text-[10px] text-purple-600/90 dark:text-purple-400/80 mt-0.5">
                Both GSTR-1 & 3B pending with high notice risk
              </p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl group-hover:translate-x-0.5 transition">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3 & SECTION 4 : EMPLOYEE PERFORMANCE & MONTH COMPARISON
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 3 : EMPLOYEE PERFORMANCE GRID (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Employee-Wise GST Performance
              </h3>
              <p className="text-[11px] text-slate-400">
                Filing compliance, client throughput, and backlog breakdown for {selectedMonth}
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {employeePerformance.length} Officers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pl-2">Employee Name</th>
                  <th className="pb-2.5 text-center">Total Clients</th>
                  <th className="pb-2.5 text-center">GSTR-1 Filed</th>
                  <th className="pb-2.5 text-center">GSTR-3B Filed</th>
                  <th className="pb-2.5 text-center">Pending</th>
                  <th className="pb-2.5 text-center">Overdue</th>
                  <th className="pb-2.5 text-right pr-2">Compliance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {employeePerformance.map((emp) => (
                  <tr 
                    key={emp.id}
                    onClick={() => {
                      onSelectEmployeeFilter(emp.id);
                      onNavigateToTab('MONTHLY', `emp_${emp.id}`);
                    }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{emp.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                      {emp.totalClients}
                    </td>
                    <td className="py-2.5 text-center text-emerald-600 font-bold">
                      {emp.gstr1Filed}
                    </td>
                    <td className="py-2.5 text-center text-blue-600 font-bold">
                      {emp.gstr3bFiled}
                    </td>
                    <td className="py-2.5 text-center text-amber-600 font-bold">
                      {emp.pendingReturns}
                    </td>
                    <td className="py-2.5 text-center text-rose-600 font-bold">
                      {emp.overdueReturns}
                    </td>
                    <td className="py-2.5 text-right pr-2">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              emp.compliance >= 80 ? 'bg-emerald-500' :
                              emp.compliance >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${emp.compliance}%` }}
                          />
                        </div>
                        <span className={`font-black text-xs ${
                          emp.compliance >= 80 ? 'text-emerald-600' :
                          emp.compliance >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {emp.compliance}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4 : MONTH COMPARISON (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Month-on-Month Trend
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {previousMonth} vs {selectedMonth}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Filed Returns Comparison */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Total Filed Returns</span>
                  <div className="flex items-center gap-1 text-[11px] font-black">
                    {filedDiff >= 0 ? (
                      <span className="flex items-center text-emerald-600">
                        <ArrowUpRight className="h-3.5 w-3.5" /> +{filedDiff}
                      </span>
                    ) : (
                      <span className="flex items-center text-rose-600">
                        <ArrowDownRight className="h-3.5 w-3.5" /> {filedDiff}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {currentMonthStats.totalFiledCount}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">in {selectedMonth}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">
                      {previousMonthStats.totalFiledCount}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">in {previousMonth}</span>
                  </div>
                </div>
              </div>

              {/* Compliance Rate Comparison */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Filing Compliance %</span>
                  <div className="flex items-center gap-1 text-[11px] font-black">
                    {complianceDiff >= 0 ? (
                      <span className="flex items-center text-emerald-600">
                        <TrendingUp className="h-3.5 w-3.5" /> +{complianceDiff}%
                      </span>
                    ) : (
                      <span className="flex items-center text-rose-600">
                        <TrendingDown className="h-3.5 w-3.5" /> {complianceDiff}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {currentMonthStats.compliancePercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">{selectedMonth}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">
                      {previousMonthStats.compliancePercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">{previousMonth}</span>
                  </div>
                </div>
              </div>

              {/* Outstanding Backlog Comparison */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Pending Backlog</span>
                  <span className="text-[11px] font-bold text-amber-600">
                    {currentMonthStats.totalPendingCount} Returns
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, (currentMonthStats.totalPendingCount / (currentMonthStats.totalRequired * 2 || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round((currentMonthStats.totalPendingCount / (currentMonthStats.totalRequired * 2 || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('REPORTS')}
            className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Full Month-on-Month Analytics</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5 : COMPLIANCE TREND CHARTS
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chart 1: Monthly Filing Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Monthly Filing Trend
            </span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400">Historical filing counts across active cycles</p>
          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
            {monthlyTrendData.map((d, i) => {
              const maxVal = Math.max(...monthlyTrendData.map(m => m.total || 1), 1);
              const height1 = Math.round((d.gstr1Filed / maxVal) * 100);
              const height3b = Math.round((d.gstr3bFiled / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-20">
                    <div 
                      title={`GSTR-1: ${d.gstr1Filed}`}
                      className="w-2.5 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600"
                      style={{ height: `${Math.max(8, height1)}%` }}
                    />
                    <div 
                      title={`GSTR-3B: ${d.gstr3bFiled}`}
                      className="w-2.5 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600"
                      style={{ height: `${Math.max(8, height3b)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 truncate">{d.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] pt-1 text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> GSTR-1</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> GSTR-3B</span>
          </div>
        </div>

        {/* Chart 2: Employee Performance Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Officer Efficiency
            </span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400">Team filing completion rates for {selectedMonth}</p>
          <div className="h-32 flex flex-col justify-around py-1 space-y-1.5">
            {employeePerformance.slice(0, 4).map((emp, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{emp.name}</span>
                  <span className="font-bold text-slate-500">{emp.compliance}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      emp.compliance >= 80 ? 'bg-emerald-500' :
                      emp.compliance >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${emp.compliance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-center text-slate-400 pt-1">
            Top performing officers by completion %
          </div>
        </div>

        {/* Chart 3: Pending vs Filed Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pending vs Filed
            </span>
            <PieChart className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400">Filing ratio for current active period</p>
          <div className="h-32 flex items-center justify-center">
            {/* Clean SVG Donut Chart */}
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${currentMonthStats.compliancePercent}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{currentMonthStats.compliancePercent}%</span>
                <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Filed</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500 px-2">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {currentMonthStats.totalFiledCount} Filed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" /> {currentMonthStats.totalPendingCount} Pending</span>
          </div>
        </div>

        {/* Chart 4: Quarterly Return Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quarterly QRMP Status
            </span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400">QRMP client portfolio & return readiness</p>
          <div className="h-32 flex flex-col justify-center space-y-2.5">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Total QRMP Clients</span>
                <span className="text-indigo-600 dark:text-indigo-400">{clientStats.quarterly}</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Active Quarter</span>
                <span className="text-slate-800 dark:text-slate-200">Q2 (Jul - Sep 2026)</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('QUARTERLY')}
            className="w-full py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
          >
            <span>Open Quarterly Roster</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
