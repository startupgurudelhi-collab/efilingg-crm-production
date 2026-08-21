/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  PlusCircle, FileSpreadsheet, Building2, Shield, Landmark,
  UserCheck, Users, FilePlus, Zap, Sparkles
} from 'lucide-react';

interface QuickActionDockProps {
  onAction: (action: string) => void;
}

export default function QuickActionDock({ onAction }: QuickActionDockProps) {
  return (
    <div
      id="quick-action-dock"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs select-none space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider font-sans">
              QUICK ACTION DOCK
            </h3>
            <p className="text-[10px] text-slate-400">One-click operational triggers & rapid dispatches</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
          Instant Launch
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* 1. New GST Task */}
        <button
          id="dock-btn-gst-task"
          onClick={() => onAction('new_gst_task')}
          className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 hover:border-emerald-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">New GST Task</span>
        </button>

        {/* 2. New MCA Task */}
        <button
          id="dock-btn-mca-task"
          onClick={() => onAction('new_mca_task')}
          className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 hover:bg-purple-100 hover:border-purple-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">New MCA Task</span>
        </button>

        {/* 3. New ITR Task */}
        <button
          id="dock-btn-itr-task"
          onClick={() => onAction('new_itr_task')}
          className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 hover:border-blue-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">New ITR Task</span>
        </button>

        {/* 4. New NGO Task */}
        <button
          id="dock-btn-ngo-task"
          onClick={() => onAction('new_ngo_task')}
          className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 hover:border-teal-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">New NGO Task</span>
        </button>

        {/* 5. Assign Employee */}
        <button
          id="dock-btn-assign-employee"
          onClick={() => onAction('assign_employee')}
          className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 hover:border-indigo-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">Assign Staff</span>
        </button>

        {/* 6. Open Client Master */}
        <button
          id="dock-btn-open-clients"
          onClick={() => onAction('open_clients')}
          className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 hover:border-amber-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <Users className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">Client Master</span>
        </button>

        {/* 7. Create Service Request */}
        <button
          id="dock-btn-create-service-request"
          onClick={() => onAction('create_service_request')}
          className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 hover:bg-rose-100 hover:border-rose-300 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group shadow-3xs"
        >
          <FilePlus className="h-4 w-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10.5px] font-extrabold leading-tight">Service Request</span>
        </button>
      </div>
    </div>
  );
}
