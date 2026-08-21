/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Clock, CheckCircle, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

export interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  dotColor: 'red' | 'orange' | 'green' | 'blue';
  count: number;
  label: string;
  sublabel?: string;
  onClick: () => void;
}

interface ExecutiveAlertCenterProps {
  alerts: AlertItem[];
}

export default function ExecutiveAlertCenter({ alerts }: ExecutiveAlertCenterProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <section id="executive-alert-center" className="space-y-1.5 select-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            EXECUTIVE COMPLIANCE RADAR
          </span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            — Real-time statutory triggers & deadlines
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          {alerts.length} Actionable Items
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {alerts.map((alert) => {
          let dotBg = 'bg-red-500';
          let badgeBg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60';

          if (alert.dotColor === 'orange') {
            dotBg = 'bg-amber-500';
            badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60';
          } else if (alert.dotColor === 'green') {
            dotBg = 'bg-emerald-500';
            badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60';
          } else if (alert.dotColor === 'blue') {
            dotBg = 'bg-blue-500';
            badgeBg = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60';
          }

          return (
            <button
              key={alert.id}
              id={`alert-badge-${alert.id}`}
              onClick={alert.onClick}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer shadow-3xs hover:shadow-xs group ${badgeBg}`}
            >
              <span className={`h-2 w-2 rounded-full ${dotBg} shrink-0 animate-pulse`} />
              <div className="flex items-baseline gap-1">
                <strong className="font-black text-[12px]">{alert.count}</strong>
                <span className="text-[11px] font-semibold">{alert.label}</span>
              </div>
              <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-0.5" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
