/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity, CheckCircle2, FileSpreadsheet, Building2, UserCheck,
  Shield, KeyRound, AlertTriangle, FileText, ArrowRight
} from 'lucide-react';

export interface ActivityEvent {
  id: string;
  type: 'gst' | 'task' | 'client' | 'mca' | 'audit' | 'dsc' | 'itr';
  title: string;
  subtitle: string;
  timestamp: string;
  user?: string;
}

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  onOpenAuditLogs?: () => void;
}

export default function LiveActivityFeed({ events, onOpenAuditLogs }: LiveActivityFeedProps) {
  return (
    <div
      id="live-activity-feed"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Activity className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider font-sans">
              LIVE OPERATIONS FEED
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              Real-time audit trails & action events
            </p>
          </div>
        </div>

        {onOpenAuditLogs && (
          <button
            onClick={onOpenAuditLogs}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Audit Trail</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Activity Items List */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
        {events.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No recent activity events logged.</div>
        ) : (
          events.map((ev) => {
            let icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
            let iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50';

            if (ev.type === 'gst') {
              icon = <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />;
              iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50';
            } else if (ev.type === 'mca') {
              icon = <Building2 className="h-3.5 w-3.5 text-purple-600" />;
              iconBg = 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50';
            } else if (ev.type === 'itr') {
              icon = <Shield className="h-3.5 w-3.5 text-blue-600" />;
              iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50';
            } else if (ev.type === 'dsc') {
              icon = <KeyRound className="h-3.5 w-3.5 text-amber-600" />;
              iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/50';
            } else if (ev.type === 'client') {
              icon = <UserCheck className="h-3.5 w-3.5 text-cyan-600" />;
              iconBg = 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200/50';
            } else if (ev.type === 'audit') {
              icon = <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />;
              iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/50';
            }

            return (
              <div
                key={ev.id}
                id={`activity-event-${ev.id}`}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className={`p-1.5 rounded-xl border shrink-0 mt-0.5 ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {ev.title}
                    </h5>
                    <span className="text-[9.5px] font-mono text-slate-400 shrink-0">
                      {ev.timestamp}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {ev.subtitle}
                  </p>
                  {ev.user && (
                    <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                      By: {ev.user}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
