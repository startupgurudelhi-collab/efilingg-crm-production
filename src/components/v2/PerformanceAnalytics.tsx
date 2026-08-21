/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3, TrendingUp, PieChart, Activity, ShieldCheck,
  Building2, FileSpreadsheet, Shield, Landmark, KeyRound
} from 'lucide-react';

export interface AnalyticsProps {
  overallHealthScore: number;
  totalPending: number;
  totalCompleted: number;
  deptMetrics: {
    name: string;
    filed: number;
    pending: number;
    pct: number;
    color: string;
  }[];
  monthlyTrends: {
    month: string;
    filed: number;
    pending: number;
  }[];
}

export default function PerformanceAnalytics({
  overallHealthScore,
  totalPending,
  totalCompleted,
  deptMetrics,
  monthlyTrends
}: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'depts'>('trends');

  const totalAll = totalPending + totalCompleted;
  const completedPct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

  return (
    <div
      id="performance-analytics-widget"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 select-none"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider font-sans">
              PERFORMANCE & COMPLIANCE HEALTH
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              Departmental efficiency, statutory velocity, and health indexes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'trends'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Filing Velocity
          </button>
          <button
            onClick={() => setActiveTab('depts')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'depts'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Department Breakdown
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Health Score Card */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between items-center text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              COMPLIANCE HEALTH INDEX
            </span>
            <div className="text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {overallHealthScore}%
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Calculated across GST, MCA, ITR, and DSC obligations
            </p>
          </div>

          {/* Pending vs Completed Bar */}
          <div className="w-full space-y-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">{totalCompleted} Completed ({completedPct}%)</span>
              <span className="text-amber-500">{totalPending} Pending</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${completedPct}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${100 - completedPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Center Graph / Breakdown Panel */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          {activeTab === 'trends' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span>Monthly Return Filings (Last 6 Months)</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Filed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending
                  </span>
                </div>
              </div>

              {/* Monthly Visual Bars */}
              <div className="grid grid-cols-6 gap-2 items-end h-36 pt-4 px-2">
                {monthlyTrends.map((t, idx) => {
                  const maxTotal = 150;
                  const filedHeight = Math.min(Math.round((t.filed / maxTotal) * 100), 100);
                  const pendingHeight = Math.min(Math.round((t.pending / maxTotal) * 100), 100);

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-28">
                        <div
                          className="w-3.5 bg-emerald-500 rounded-t-md transition-all hover:opacity-80"
                          style={{ height: `${filedHeight}%` }}
                          title={`${t.filed} Filed`}
                        />
                        <div
                          className="w-3.5 bg-amber-500 rounded-t-md transition-all hover:opacity-80"
                          style={{ height: `${pendingHeight}%` }}
                          title={`${t.pending} Pending`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">
                        {t.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Departmental Filing Efficiencies
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {deptMetrics.map((dept, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{dept.name}</span>
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                        {dept.filed} Filed / {dept.pending} Pend ({dept.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dept.color}`}
                        style={{ width: `${dept.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
