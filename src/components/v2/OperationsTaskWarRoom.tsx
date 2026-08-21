/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame, CheckSquare, Clock, AlertTriangle, CheckCircle2,
  Hourglass, Building2, UserCheck, ShieldCheck, Plus, Filter,
  ArrowRight, Search, Check, X, Calendar, User
} from 'lucide-react';
import { V2Task, completeV2Task } from '../../lib/v2_db';
import { getISTDateString } from '../../lib/db';

export interface WarRoomMetrics {
  assignedToday: number;
  pending: number;
  dueToday: number;
  overdue: number;
  completedToday: number;
  waitingClient: number;
  waitingGovt: number;
  waitingApproval: number;
}

interface OperationsTaskWarRoomProps {
  metrics: WarRoomMetrics;
  tasks: V2Task[];
  onRefreshTasks: () => void;
  onOpenNewTaskModal: () => void;
}

export default function OperationsTaskWarRoom({
  metrics,
  tasks,
  onRefreshTasks,
  onOpenNewTaskModal
}: OperationsTaskWarRoomProps) {
  // Selected filter filter pill
  const [activeFilter, setActiveFilter] = useState<string>('all_pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<V2Task | null>(null);

  const todayStr = getISTDateString();

  // Filter tasks according to active category
  const filteredTasks = tasks.filter((t) => {
    // Search match
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignedToName.toLowerCase().includes(q);
      if (!match) return false;
    }

    const isDueToday = t.dueDate === todayStr;
    const isOverdue = t.dueDate < todayStr && t.status === 'pending';
    const isCompleted = t.status === 'completed';
    const isPending = t.status === 'pending';
    const descLower = (t.description || '').toLowerCase() + (t.title || '').toLowerCase();

    switch (activeFilter) {
      case 'assigned_today':
        return t.createdAt === todayStr;
      case 'pending':
      case 'all_pending':
        return isPending;
      case 'due_today':
        return isPending && isDueToday;
      case 'overdue':
        return isOverdue;
      case 'completed_today':
        return isCompleted;
      case 'waiting_client':
        return isPending && (descLower.includes('client') || descLower.includes('document') || descLower.includes('otp'));
      case 'waiting_govt':
        return isPending && (descLower.includes('portal') || descLower.includes('mca') || descLower.includes('gst') || descLower.includes('govt'));
      case 'waiting_approval':
        return isPending && (descLower.includes('ca') || descLower.includes('review') || descLower.includes('approval') || descLower.includes('sign'));
      default:
        return true;
    }
  });

  const handleMarkComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeV2Task(taskId);
    onRefreshTasks();
  };

  return (
    <section
      id="operations-task-war-room"
      className="bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 select-none relative overflow-hidden"
    >
      {/* Subtle fire glow background accent */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* War Room Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl shadow-inner">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white tracking-wide font-sans">
                🔥 OPERATIONS TASK WAR ROOM
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full uppercase tracking-wider animate-pulse">
                Live Mission Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Real-time operational dispatching, blockers resolution, and team execution grid
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Create Task */}
          <button
            id="warroom-btn-new-task"
            onClick={onOpenNewTaskModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 8 Clickable Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 relative z-10">
        {/* 1. Tasks Assigned Today (Blue) */}
        <WarRoomMetricCard
          id="warroom-metric-assigned-today"
          label="Assigned Today"
          count={metrics.assignedToday}
          color="blue"
          active={activeFilter === 'assigned_today'}
          onClick={() => setActiveFilter('assigned_today')}
        />

        {/* 2. Tasks Pending (Amber) */}
        <WarRoomMetricCard
          id="warroom-metric-pending"
          label="Tasks Pending"
          count={metrics.pending}
          color="amber"
          active={activeFilter === 'all_pending' || activeFilter === 'pending'}
          onClick={() => setActiveFilter('all_pending')}
        />

        {/* 3. Tasks Due Today (Orange) */}
        <WarRoomMetricCard
          id="warroom-metric-due-today"
          label="Due Today"
          count={metrics.dueToday}
          color="orange"
          highlight={metrics.dueToday > 0}
          active={activeFilter === 'due_today'}
          onClick={() => setActiveFilter('due_today')}
        />

        {/* 4. Tasks Overdue (Red) */}
        <WarRoomMetricCard
          id="warroom-metric-overdue"
          label="Tasks Overdue"
          count={metrics.overdue}
          color="red"
          highlight={metrics.overdue > 0}
          active={activeFilter === 'overdue'}
          onClick={() => setActiveFilter('overdue')}
        />

        {/* 5. Tasks Completed Today (Green) */}
        <WarRoomMetricCard
          id="warroom-metric-completed-today"
          label="Completed Today"
          count={metrics.completedToday}
          color="green"
          active={activeFilter === 'completed_today'}
          onClick={() => setActiveFilter('completed_today')}
        />

        {/* 6. Waiting For Client (Amber/Purple) */}
        <WarRoomMetricCard
          id="warroom-metric-waiting-client"
          label="Waiting Client"
          count={metrics.waitingClient}
          color="purple"
          active={activeFilter === 'waiting_client'}
          onClick={() => setActiveFilter('waiting_client')}
        />

        {/* 7. Waiting For Government Portal (Cyan) */}
        <WarRoomMetricCard
          id="warroom-metric-waiting-govt"
          label="Waiting Govt"
          count={metrics.waitingGovt}
          color="cyan"
          active={activeFilter === 'waiting_govt'}
          onClick={() => setActiveFilter('waiting_govt')}
        />

        {/* 8. Waiting For Internal Approval (Teal) */}
        <WarRoomMetricCard
          id="warroom-metric-waiting-approval"
          label="Waiting Approval"
          count={metrics.waitingApproval}
          color="teal"
          active={activeFilter === 'waiting_approval'}
          onClick={() => setActiveFilter('waiting_approval')}
        />
      </div>

      {/* Filtered War Room Tasks Desk & Interactive List */}
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-3">
        {/* Search & Active Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
              {getFilterTitle(activeFilter)}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredTasks.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="warroom-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks, title, employee..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Task Cards Grid / List */}
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No active tasks found matching this queue filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto custom-scrollbar p-0.5">
            {filteredTasks.map((t) => {
              const isOverdue = t.dueDate < todayStr && t.status === 'pending';
              const isDueToday = t.dueDate === todayStr && t.status === 'pending';
              const isDone = t.status === 'completed';

              return (
                <div
                  key={t.id}
                  id={`warroom-task-card-${t.id}`}
                  onClick={() => setSelectedTask(t)}
                  className={`p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-3xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                    isOverdue
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : isDueToday
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition">
                        {t.title}
                      </h4>
                      {isDone ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          DONE
                        </span>
                      ) : isOverdue ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 animate-pulse">
                          OVERDUE
                        </span>
                      ) : isDueToday ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                          TODAY
                        </span>
                      ) : (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          QUEUED
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <User className="h-3 w-3 text-purple-500" />
                      <span className="font-medium truncate max-w-[110px]">{t.assignedToName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[9px]">Due: {t.dueDate}</span>
                      {!isDone && (
                        <button
                          onClick={(e) => handleMarkComplete(t.id, e)}
                          title="Mark Complete"
                          className="p-1 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-600 transition"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Task ID: {selectedTask.id}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Description</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Assigned Handler</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedTask.assignedToName}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Due Date</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedTask.dueDate}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              {selectedTask.status !== 'completed' && (
                <button
                  onClick={(e) => {
                    handleMarkComplete(selectedTask.id, e);
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark as Completed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getFilterTitle(filter: string): string {
  switch (filter) {
    case 'assigned_today':
      return 'Tasks Assigned Today';
    case 'all_pending':
    case 'pending':
      return 'Active Pending Tasks Queue';
    case 'due_today':
      return 'Critical Tasks Due Today';
    case 'overdue':
      return 'Overdue Escalated Tasks';
    case 'completed_today':
      return 'Tasks Completed Today';
    case 'waiting_client':
      return 'Tasks Waiting For Client Feedback / Documents';
    case 'waiting_govt':
      return 'Tasks Waiting For Government / Departmental Portals';
    case 'waiting_approval':
      return 'Tasks Waiting For Internal Review / CA Signatures';
    default:
      return 'All Operations Tasks';
  }
}

interface WarRoomMetricCardProps {
  id: string;
  label: string;
  count: number;
  color: 'blue' | 'amber' | 'orange' | 'red' | 'green' | 'purple' | 'cyan' | 'teal';
  highlight?: boolean;
  active?: boolean;
  onClick: () => void;
}

function WarRoomMetricCard({
  id,
  label,
  count,
  color,
  highlight = false,
  active = false,
  onClick
}: WarRoomMetricCardProps) {
  let colorStyles = 'border-slate-200 hover:border-slate-300 text-slate-800';

  if (color === 'red') {
    colorStyles = active
      ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100';
  } else if (color === 'orange') {
    colorStyles = active
      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20'
      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100';
  } else if (color === 'blue') {
    colorStyles = active
      ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20'
      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100';
  } else if (color === 'green') {
    colorStyles = active
      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100';
  } else if (color === 'purple') {
    colorStyles = active
      ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
      : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100';
  } else if (color === 'cyan') {
    colorStyles = active
      ? 'bg-cyan-600 text-white border-cyan-700 shadow-md shadow-cyan-600/20'
      : 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100';
  } else if (color === 'teal') {
    colorStyles = active
      ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20'
      : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100';
  } else if (color === 'amber') {
    colorStyles = active
      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20'
      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100';
  }

  return (
    <button
      id={id}
      onClick={onClick}
      className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-1 cursor-pointer shadow-3xs hover:shadow-xs group ${colorStyles} ${
        highlight ? 'ring-2 ring-rose-500/40 animate-pulse' : ''
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-tight line-clamp-1 opacity-90">
        {label}
      </span>
      <div className="flex items-baseline justify-between">
        <strong className="text-xl font-black font-mono leading-none">{count}</strong>
        <ArrowRight className="h-3 w-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
