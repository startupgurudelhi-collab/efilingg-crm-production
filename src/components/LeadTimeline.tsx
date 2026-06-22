/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { getLeadHistory, getTransfers } from '../lib/db';
import { LeadHistory, LeadTransfer } from '../types';
import { Clock, RefreshCcw, UserPlus, Milestone, HelpCircle, User } from 'lucide-react';

interface LeadTimelineProps {
  leadId: string;
}

export default function LeadTimeline({ leadId }: LeadTimelineProps) {
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [transfers, setTransfers] = useState<LeadTransfer[]>([]);

  useEffect(() => {
    setHistory(getLeadHistory(leadId));
    setTransfers(getTransfers(leadId));
  }, [leadId]);

  // Combine history logs and transfers into a single chronologically sorted history array
  const combinedTimeline = [
    ...history.map((h) => ({
      type: 'history',
      timestamp: h.updatedAt,
      id: h.id,
      title: h.field === 'creation' ? 'Lead Initiated' : `Field Edited: ${h.field}`,
      details: h.field === 'creation' 
        ? 'Lead was seeded or entered via manual employee intake form.' 
        : `Changed '${h.field}' from "${h.oldValue}" to "${h.newValue}".`,
      employee: h.updatedByName
    })),
    ...transfers.map((t) => ({
      type: 'transfer',
      timestamp: t.transferredAt,
      id: t.id,
      title: 'Structural Ownership Handoff',
      details: `Transferred permanently from ${t.transferredFromName} to ${t.transferredToName}. Reason: "${t.reason}"`,
      employee: t.transferredFromName
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: string, title: string) => {
    if (type === 'transfer') return <RefreshCcw className="h-4 w-4 text-emerald-500" />;
    if (title === 'Lead Initiated') return <UserPlus className="h-4 w-4 text-emerald-500" />;
    if (title.includes('stage')) return <Milestone className="h-4 w-4 text-emerald-555" />;
    return <Clock className="h-4 w-4 text-slate-450" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <Clock className="h-5 w-5 text-slate-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Audit Trails & Lead History</h3>
      </div>

      {combinedTimeline.length === 0 ? (
        <div className="text-center p-8 text-slate-400 text-xs">
          No records captured for this lead yet.
        </div>
      ) : (
        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
          {combinedTimeline.map((item) => (
            <div key={item.id} className="relative">
              {/* Timeline dot icon */}
              <div className="absolute -left-10 top-0.5 h-8 w-8 rounded-full bg-slate-150 dark:bg-slate-850 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs">
                {getIcon(item.type, item.title)}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-150">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed bg-slate-500/5 p-2 rounded-lg border border-slate-150/10">
                  {item.details}
                </p>

                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  <User className="h-3 w-3" />
                  <span>Logged by: <span className="font-semibold">{item.employee}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
