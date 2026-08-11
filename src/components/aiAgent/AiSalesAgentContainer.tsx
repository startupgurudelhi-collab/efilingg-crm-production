/**
 * AI Sales Agent - Master Tabbed Workspace Container
 * Module 1 Implementation
 * Efilingg CRM
 */

import React, { useState } from 'react';
import AiAgentDashboard from './AiAgentDashboard';
import AiAgentKnowledgeBase from './AiAgentKnowledgeBase';
import AiAgentFaqTraining from './AiAgentFaqTraining';
import AiAgentLeadFormBuilder from './AiAgentLeadFormBuilder';
import AiAgentQualifiedLeads from './AiAgentQualifiedLeads';
import AiAgentSettingsComponent from './AiAgentSettings';
import {
  LayoutDashboard,
  Briefcase,
  HelpCircle,
  FileSpreadsheet,
  Users,
  Settings,
  Bot,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export type AiAgentTab =
  | 'dashboard'
  | 'knowledge_base'
  | 'faq_training'
  | 'lead_forms'
  | 'qualified_leads'
  | 'settings';

interface AiSalesAgentContainerProps {
  currentUserId?: string;
  currentUserName?: string;
  initialTab?: AiAgentTab;
}

export default function AiSalesAgentContainer({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  initialTab = 'dashboard',
}: AiSalesAgentContainerProps) {
  const [activeTab, setActiveTab] = useState<AiAgentTab>(initialTab);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleTriggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const navItems: { id: AiAgentTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge_base', label: 'Knowledge Base', icon: Briefcase },
    { id: 'faq_training', label: 'FAQ Training', icon: HelpCircle },
    { id: 'lead_forms', label: 'Lead Forms', icon: FileSpreadsheet },
    { id: 'qualified_leads', label: 'Qualified Leads', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black text-slate-900 dark:text-white">
                Sales & Marketing / AI Sales Agent
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                V1 FOUNDATION
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              WhatsApp Sales Agent Admin Platform — Knowledge Base, FAQ Training, Lead Form Builder, & Qualified Lead Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Admin Access: {currentUserName}</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center space-x-1 overflow-x-auto p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View Content */}
      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && (
          <AiAgentDashboard
            onNavigateToTab={(tab) => setActiveTab(tab)}
            triggerRefresh={refreshTrigger}
          />
        )}
        {activeTab === 'knowledge_base' && (
          <AiAgentKnowledgeBase
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={handleTriggerRefresh}
          />
        )}
        {activeTab === 'faq_training' && (
          <AiAgentFaqTraining
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={handleTriggerRefresh}
          />
        )}
        {activeTab === 'lead_forms' && (
          <AiAgentLeadFormBuilder
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={handleTriggerRefresh}
          />
        )}
        {activeTab === 'qualified_leads' && (
          <AiAgentQualifiedLeads
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={handleTriggerRefresh}
          />
        )}
        {activeTab === 'settings' && (
          <AiAgentSettingsComponent
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={handleTriggerRefresh}
          />
        )}
      </div>
    </div>
  );
}
