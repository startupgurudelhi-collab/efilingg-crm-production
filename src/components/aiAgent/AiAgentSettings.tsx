/**
 * AI Sales Agent - Module 7: Settings
 * Efilingg CRM
 */

import React, { useState, useEffect } from 'react';
import { AiAgentSettings } from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  Settings,
  Bot,
  MessageSquare,
  HelpCircle,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sliders,
} from 'lucide-react';

interface AiAgentSettingsComponentProps {
  currentUserId?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

const DEFAULT_HANDOVER_MESSAGE = `Thank you for sharing the information.\nOur team will connect with you shortly.`;

export default function AiAgentSettingsComponent({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  onRefresh,
}: AiAgentSettingsComponentProps) {
  const [settings, setSettings] = useState<AiAgentSettings>(AiAgentRepository.getSettings());
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [maxMessages, setMaxMessages] = useState(20);
  const [handoverMessage, setHandoverMessage] = useState(DEFAULT_HANDOVER_MESSAGE);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const curr = AiAgentRepository.getSettings();
    setSettings(curr);
    setAgentEnabled(curr.agent_enabled);
    setMaxQuestions(curr.max_questions);
    setMaxMessages(curr.max_messages);
    setHandoverMessage(curr.handover_message || DEFAULT_HANDOVER_MESSAGE);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = AiAgentRepository.updateSettings(
      {
        agent_enabled: agentEnabled,
        max_questions: Number(maxQuestions) || 5,
        max_messages: Number(maxMessages) || 20,
        handover_message: handoverMessage,
      },
      currentUserId,
      currentUserName
    );

    setSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (onRefresh) onRefresh();
  };

  const handleResetHandover = () => {
    setHandoverMessage(DEFAULT_HANDOVER_MESSAGE);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              AI Sales Agent Configuration & Automation Parameters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control AI conversational boundaries, message caps, and executive takeover defaults.
            </p>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>AI Agent Configuration successfully saved and deployed to workspace storage.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable AI Agent Switch Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Enable AI Sales Agent
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-lg">
                When enabled, incoming WhatsApp customer inquiries are processed by the AI Agent using trained Knowledge Base and FAQs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAgentEnabled(!agentEnabled)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                agentEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  agentEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Question & Message Caps */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            <span>Conversational Limits & Safety Guardrails</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Questions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Max Questions per Session
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="text-[11px] text-slate-500">
                Maximum lead form questions asked before handing over to human executive.
              </p>
            </div>

            {/* Max Messages */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Max Total Messages per Conversation
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMessages}
                onChange={(e) => setMaxMessages(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="text-[11px] text-slate-500">
                Total combined messages allowed in a single session before automatic takeover.
              </p>
            </div>
          </div>
        </div>

        {/* Handover Message */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-teal-500" />
              <span>Default Human Executive Handover Message</span>
            </h3>

            <button
              type="button"
              onClick={handleResetHandover}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Default Text</span>
            </button>
          </div>

          <div>
            <textarea
              rows={4}
              value={handoverMessage}
              onChange={(e) => setHandoverMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter handover closing message..."
              required
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Sent automatically after lead form completion or when customer requests human assistance.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
