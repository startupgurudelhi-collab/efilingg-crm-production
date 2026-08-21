/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, Clock, UserCheck, ArrowRight, Search, ShieldAlert, Sparkles } from 'lucide-react';

export interface EmployeeWorkloadStat {
  id: string;
  name: string;
  role: string;
  designation?: string;
  assignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  allocatedClients: number;
  productivityPct: number;
  workloadPct: number;
  isOverloaded: boolean;
}

interface EmployeeWorkloadMonitorProps {
  employees: EmployeeWorkloadStat[];
  onSelectEmployee?: (empId: string) => void;
}

export default function EmployeeWorkloadMonitor({
  employees,
  onSelectEmployee
}: EmployeeWorkloadMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOverloaded, setFilterOverloaded] = useState(false);

  const filteredEmployees = employees.filter((e) => {
    if (filterOverloaded && !e.isOverloaded) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return e.name.toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q);
    }
    return true;
  });

  const overloadedCount = employees.filter(e => e.isOverloaded).length;

  return (
    <div
      id="employee-workload-monitor"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 select-none"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider font-sans">
                EMPLOYEE WORKLOAD MONITOR
              </h3>
              {overloadedCount > 0 && (
                <span className="px-2 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overloadedCount} Overloaded
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              Real-time capacity tracking, productivity distribution, and dispatch load balancing
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOverloaded(!filterOverloaded)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              filterOverloaded
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {filterOverloaded ? 'Show All Staff' : 'Filter Overloaded Only'}
          </button>
        </div>
      </div>

      {/* Employees Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <th className="pb-2 pl-2">Employee / Role</th>
              <th className="pb-2 text-center">Assigned</th>
              <th className="pb-2 text-center">Pending</th>
              <th className="pb-2 text-center">Overdue</th>
              <th className="pb-2 text-center">Completed</th>
              <th className="pb-2 text-center">Productivity</th>
              <th className="pb-2 pr-2">Workload Capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredEmployees.map((emp) => {
              // Color for workload capacity bar
              let barColor = 'bg-emerald-500';
              let badgeBg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50';

              if (emp.workloadPct > 85 || emp.isOverloaded) {
                barColor = 'bg-rose-500';
                badgeBg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50';
              } else if (emp.workloadPct > 65) {
                barColor = 'bg-amber-500';
                badgeBg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50';
              }

              return (
                <tr
                  key={emp.id}
                  id={`emp-workload-row-${emp.id}`}
                  onClick={() => onSelectEmployee?.(emp.id)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition cursor-pointer ${
                    emp.isOverloaded ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                  }`}
                >
                  {/* Name & Role */}
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-xs shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {emp.isOverloaded && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-500 text-white uppercase animate-pulse">
                              OVERLOADED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{emp.designation || emp.role}</span>
                      </div>
                    </div>
                  </td>

                  {/* Assigned */}
                  <td className="py-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                    {emp.assignedTasks}
                  </td>

                  {/* Pending */}
                  <td className="py-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                    {emp.pendingTasks}
                  </td>

                  {/* Overdue */}
                  <td className="py-3 text-center font-mono font-bold">
                    {emp.overdueTasks > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-black">{emp.overdueTasks}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  {/* Completed */}
                  <td className="py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {emp.completedTasks}
                  </td>

                  {/* Productivity % */}
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/50">
                      {emp.productivityPct}%
                    </span>
                  </td>

                  {/* Workload % & Progress Bar */}
                  <td className="py-3 pr-2">
                    <div className="space-y-1 min-w-[140px]">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${badgeBg}`}>
                          {emp.workloadPct}% Load
                        </span>
                        <span className="text-slate-400 text-[9px]">
                          {emp.allocatedClients} Clients
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(emp.workloadPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
