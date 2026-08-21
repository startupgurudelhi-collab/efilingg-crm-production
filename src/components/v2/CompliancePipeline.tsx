/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Filter, ArrowRight, Clock, CheckCircle2, UserCheck, Building2, Hourglass } from 'lucide-react';

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  pct: number;
  color: 'blue' | 'amber' | 'purple' | 'cyan' | 'emerald';
}

interface CompliancePipelineProps {
  stages: PipelineStage[];
  onSelectStage?: (stageId: string) => void;
  activeStage?: string;
}

export default function CompliancePipeline({
  stages,
  onSelectStage,
  activeStage
}: CompliancePipelineProps) {
  return (
    <div
      id="compliance-pipeline-funnel"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 select-none"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider font-sans">
              COMPLIANCE PIPELINE FUNNEL
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              End-to-end statutory lifecycle stage distribution
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-slate-400">Live Stage Dispatch</span>
      </div>

      {/* Visual Pipeline Funnel Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
        {stages.map((stage, idx) => {
          let stepBg = 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-100';
          let badgeColor = 'bg-blue-600 text-white';

          if (stage.color === 'amber') {
            stepBg = 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-100';
            badgeColor = 'bg-amber-500 text-slate-950';
          } else if (stage.color === 'purple') {
            stepBg = 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60 text-purple-900 dark:text-purple-100';
            badgeColor = 'bg-purple-600 text-white';
          } else if (stage.color === 'cyan') {
            stepBg = 'bg-cyan-50/60 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/60 text-cyan-900 dark:text-cyan-100';
            badgeColor = 'bg-cyan-600 text-white';
          } else if (stage.color === 'emerald') {
            stepBg = 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100';
            badgeColor = 'bg-emerald-600 text-white';
          }

          const isSelected = activeStage === stage.id;

          return (
            <button
              key={stage.id}
              id={`pipeline-stage-${stage.id}`}
              onClick={() => onSelectStage?.(stage.id)}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer relative shadow-3xs hover:shadow-xs group ${stepBg} ${
                isSelected ? 'ring-2 ring-emerald-500 shadow-md' : ''
              }`}
            >
              {/* Stage Step Indicator */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>Stage 0{idx + 1}</span>
                <span className="font-mono text-slate-400">{stage.pct}%</span>
              </div>

              {/* Stage Title */}
              <div>
                <h4 className="font-bold text-xs line-clamp-1">{stage.name}</h4>
                <div className="text-xl font-black font-mono mt-0.5">{stage.count}</div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${badgeColor}`}
                  style={{ width: `${Math.min(stage.pct, 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
