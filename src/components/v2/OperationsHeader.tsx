/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Building2, Users, ClipboardList, AlertTriangle, Activity } from 'lucide-react';
import { getISTDateString } from '../../lib/db';

interface OperationsHeaderProps {
  totalClients: number;
  activeEmployees: number;
  activeTasks: number;
  overdueCases: number;
  onMetricClick?: (metric: 'clients' | 'employees' | 'tasks' | 'overdue') => void;
}

export default function OperationsHeader({
  totalClients,
  activeEmployees,
  activeTasks,
  overdueCases,
  onMetricClick
}: OperationsHeaderProps) {
  // Live clock state updating every second
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateFormatted, setDateFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in IST (e.g. 10:45:20 AM IST)
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      };
      const formattedTime = new Intl.DateTimeFormat('en-IN', options).format(now);
      setTimeStr(formattedTime);

      // Date formatted: e.g. Monday, 17 August 2026
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      };
      const formattedDate = new Intl.DateTimeFormat('en-IN', dateOptions).format(now);
      setDateFormatted(formattedDate);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      id="operations-executive-banner"
      className="relative overflow-hidden bg-gradient-to-r from-[#0B1727] via-[#0D1F38] to-[#0A1628] border border-slate-750/80 text-white rounded-2xl shadow-xl px-5 py-3 max-h-[120px] flex flex-col justify-center select-none shrink-0"
    >
      {/* Background glow highlights */}
      <div className="absolute top-0 right-1/4 w-72 h-16 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 right-10 w-48 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 relative z-10">
        {/* Title & Subtitle */}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase font-sans truncate">
              Welcome to Legomark & Efilingg Office Management
            </h1>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded uppercase tracking-wider">
              Control Tower
            </span>
          </div>
          <p className="text-[11px] text-slate-300/80 font-medium truncate max-w-2xl">
            Unified Compliance Operations, Workflow Intelligence & Workforce Management Platform
          </p>
        </div>

        {/* Live Metrics Grid (Date, Time, Clients, Employees, Tasks, Overdue) */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Date & Live Clock */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold">{dateFormatted || '17 Aug 2026'}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-[11px]">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>{timeStr || '10:30:00 AM'}</span>
            </div>
          </div>

          {/* Total Clients */}
          <button
            id="header-kpi-clients"
            onClick={() => onMetricClick?.('clients')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs transition cursor-pointer"
            title="View Total Client Master"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[11px] text-slate-300">Clients:</span>
            <strong className="text-white font-extrabold font-mono text-[12px]">{totalClients}</strong>
          </button>

          {/* Active Employees */}
          <button
            id="header-kpi-employees"
            onClick={() => onMetricClick?.('employees')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs transition cursor-pointer"
            title="View Employee Workload"
          >
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[11px] text-slate-300">Staff:</span>
            <strong className="text-white font-extrabold font-mono text-[12px]">{activeEmployees}</strong>
          </button>

          {/* Active Tasks */}
          <button
            id="header-kpi-tasks"
            onClick={() => onMetricClick?.('tasks')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs transition cursor-pointer"
            title="Open Task War Room"
          >
            <ClipboardList className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-300">Tasks:</span>
            <strong className="text-amber-400 font-extrabold font-mono text-[12px]">{activeTasks}</strong>
          </button>

          {/* Overdue Cases */}
          <button
            id="header-kpi-overdue"
            onClick={() => onMetricClick?.('overdue')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer border ${
              overdueCases > 0
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-300 hover:bg-rose-900/80 animate-pulse'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            title="Filter Overdue Actions"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-[11px]">Overdue:</span>
            <strong className="font-extrabold font-mono text-[12px] text-rose-400">{overdueCases}</strong>
          </button>
        </div>
      </div>
    </header>
  );
}
