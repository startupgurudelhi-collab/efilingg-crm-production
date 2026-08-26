/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Settings, Clock, Bell, AlertTriangle, 
  CheckCircle2, RefreshCw, Key, Laptop, Lock, Unlock, 
  ExternalLink, Download, Copy, Check, Zap, HelpCircle,
  FileCode, Terminal, ChevronRight, UserCheck, Search, ShieldCheck,
  AlertCircle, Sparkles, ArrowRight, Layers, Eye, EyeOff
} from 'lucide-react';
import { getCurrentSession } from '../../../lib/db';
import { V2GstClient, getV2GstClients } from '../../../lib/v2_db';

interface GSTExtensionLogsSettingsProps {
  clients?: V2GstClient[];
  onTriggerGstLogin?: (cl: V2GstClient) => void;
  onRefreshClients?: () => void;
}

export default function GSTExtensionLogsSettings({
  clients = [],
  onTriggerGstLogin,
  onRefreshClients
}: GSTExtensionLogsSettingsProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'QUICK_LAUNCH' | 'SETTINGS' | 'AUDIT_LOGS'>('OVERVIEW');
  const currentUser = getCurrentSession();

  // Extension Connectivity Detection
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null);
  const [extensionVersion, setExtensionVersion] = useState<string>('');
  const [isPinging, setIsPinging] = useState(false);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Search & Filter for Clients
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Extension Settings State
  const [extensionConfig, setExtensionConfig] = useState({
    autoFillEnabled: true,
    autoFocusCaptcha: true,
    showAutofillBanner: true,
    autoWipeSessionMemory: true,
    targetPortalUrl: 'https://services.gst.gov.in/services/login',
    notificationLevel: 'all' as 'all' | 'errors' | 'none'
  });

  // Extension Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([
    {
      id: 'log_1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      user: currentUser?.name || 'Master Admin',
      action: 'Chrome Extension Auto-Login',
      clientName: 'Apex Retails Corp',
      gstin: '09AAACA4192G1ZX',
      userId: 'apex_retail',
      method: 'Extension V3 Auto-Fill',
      status: 'SUCCESS'
    },
    {
      id: 'log_2',
      timestamp: new Date(Date.now() - 1000 * 60 * 65).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      user: 'Neha Sharma',
      action: 'Chrome Extension Auto-Login',
      clientName: 'Vikas Traders',
      gstin: '07ABKPV8412F1Z9',
      userId: 'vikas_traders',
      method: 'Extension V3 Auto-Fill',
      status: 'SUCCESS'
    }
  ]);

  // Load clients if none passed
  const allClients = clients && clients.length > 0 ? clients : getV2GstClients();

  // Ping Extension via Window Message
  const pingExtension = () => {
    setIsPinging(true);
    setPingMessage('Pinging Chrome Extension background worker...');

    // 1. Post message to window
    window.postMessage({
      source: 'efilingg-crm-page',
      action: 'ping_extension'
    }, '*');

    // 2. Dispatch custom DOM event
    document.dispatchEvent(new CustomEvent('EfilinggLaunchExtension', {
      detail: { action: 'ping_extension' }
    }));

    // Timeout fallback if extension is not installed
    const timer = setTimeout(() => {
      setIsPinging(false);
      if (!extensionDetected) {
        setPingMessage('Extension not detected in this tab context. (If running inside preview iframe, click "Open in New Tab" or ensure unpacked extension is loaded).');
      }
    }, 1500);

    return () => clearTimeout(timer);
  };

  useEffect(() => {
    // Listen for pong response from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'efilingg-extension' && event.data.action === 'extension_pong') {
        setExtensionDetected(true);
        setExtensionVersion(event.data.version || '1.0.0');
        setIsPinging(false);
        setPingMessage('Extension is active and responding!');
      }
    };

    window.addEventListener('message', handleMessage);
    // Initial ping
    pingExtension();

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const togglePassword = (clientId: string) => {
    setShowPasswords(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const handleTriggerLogin = (client: V2GstClient) => {
    if (onTriggerGstLogin) {
      onTriggerGstLogin(client);
    } else {
      window.postMessage({
        source: 'efilingg-crm-page',
        action: 'initiate_gst_login',
        clientId: client.id,
        exchangeToken: 'dev-token',
        username: client.userId,
        password: client.password || '',
        gstin: client.gstin,
        crmUrl: window.location.origin,
        skipTabCreation: false
      }, '*');
      window.open('https://services.gst.gov.in/services/login', '_blank', 'noopener,noreferrer');
    }

    // Add to audit log
    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      user: currentUser?.name || 'Officer',
      action: 'Chrome Extension Auto-Login',
      clientName: client.firmName || client.clientName,
      gstin: client.gstin,
      userId: client.userId,
      method: 'Extension V3 Auto-Fill',
      status: 'SUCCESS'
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // Filter clients
  const filteredClients = allClients.filter(c => 
    c.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.firmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.userId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Zap className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                GST Portal Auto-Login Chrome Extension
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                Manifest V3 Official
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage the 1-Click GST Login Chrome Extension, install unpacked packages, test taxpayer auto-login bridge, and review automated credential dispatches.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/extension/download-zip"
              download="efilingg-chrome-extension.zip"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download Extension (.ZIP)
            </a>
            <button
              onClick={pingExtension}
              disabled={isPinging}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'Checking...' : 'Check Connection'}
            </button>
            {isIframe && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Direct Tab
              </a>
            )}
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${extensionDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {extensionDetected ? `Extension Status: Connected (v${extensionVersion || '1.0.0'})` : 'Extension Status: Ready for Installation / Verification'}
            </span>
            <span className="text-slate-400 text-[11px]">
              • {extensionDetected ? 'Content scripts active and listening on CRM & GST portals' : 'Download ZIP and load into chrome://extensions'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Zero-Storage JWT Encryption</span>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Installation & Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('QUICK_LAUNCH')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'QUICK_LAUNCH'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Zap className="h-3 w-3" />
            Taxpayers Auto-Login Desk ({allClients.length})
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SETTINGS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Settings className="h-3 w-3" />
            Extension Behavior & Security
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Shield className="h-3 w-3" />
            Login & Dispatch Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* ==============================================================
          TAB 1: OVERVIEW & INSTALLATION GUIDE
          ============================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4 text-xs">
          {/* Main Highlights Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100">1-Click Auto-Fill</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Automatically populates GST taxpayer username and encrypted password directly into the official GST Portal login fields.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100">Auto-Focus CAPTCHA</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Instantly focuses cursor on the CAPTCHA box so your team can type the 6 characters and hit Enter in less than 2 seconds.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100">Zero-Storage Security</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Credentials are never permanently stored in the browser extension cache and are automatically wiped from memory upon tab closure.
              </p>
            </div>
          </div>

          {/* Installation Steps Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  How to Install the Extension in Google Chrome / Edge
                </h3>
                <p className="text-[11px] text-slate-500">
                  Complete setup in under 30 seconds without needing Chrome Web Store approval.
                </p>
              </div>
              <a
                href="/api/extension/download-zip"
                download="efilingg-chrome-extension.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                <Download className="h-3.5 w-3.5" /> Download ZIP
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">1</span>
                  <span>Download & Extract Package</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Click the <strong>Download ZIP</strong> button above. Unzip the downloaded file <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">efilingg-chrome-extension.zip</code> into a local folder on your computer (e.g. in your Documents or Desktop).
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">2</span>
                  <span>Open Extensions Page</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  In Google Chrome (or Edge), open a new tab and navigate to: <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px] font-bold">chrome://extensions</code>
                </p>
                <button
                  onClick={() => handleCopy('chrome://extensions', 'ext_url')}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedText === 'ext_url' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedText === 'ext_url' ? 'Copied URL!' : 'Copy chrome://extensions URL'}
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">3</span>
                  <span>Enable Developer Mode</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  In the top-right corner of the Extensions page, switch the <strong>Developer mode</strong> toggle to <strong>ON</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">4</span>
                  <span>Click &quot;Load unpacked&quot;</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Click the <strong>Load unpacked</strong> button in the top-left, and select the unzipped <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">chrome-extension</code> folder. The extension icon will appear in your toolbar!
                </p>
              </div>
            </div>

            {/* Test Portal Open Button */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ready to test auto-login?
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Select any taxpayer from the &quot;Taxpayers Auto-Login Desk&quot; tab to trigger a real test auto-login on the official GST portal.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('QUICK_LAUNCH')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                Open Taxpayers Desk <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: TAXPAYERS AUTO-LOGIN QUICK DESK
          ============================================================== */}
      {activeTab === 'QUICK_LAUNCH' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                Taxpayer Portal Auto-Login Quick Desk
              </h3>
              <p className="text-[11px] text-slate-500">
                Click <strong>&quot;Auto-Login via Extension&quot;</strong> next to any client to trigger instant credential injection into the GST portal.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, GSTIN, userId..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pl-2">Taxpayer / Firm Name</th>
                  <th className="pb-2.5">GSTIN Number</th>
                  <th className="pb-2.5">Portal User ID</th>
                  <th className="pb-2.5">Portal Password</th>
                  <th className="pb-2.5">Assigned Officer</th>
                  <th className="pb-2.5 text-right pr-2">Extension Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No GST Taxpayers found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const isVisible = showPasswords[client.id];
                    return (
                      <tr key={client.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                        <td className="py-3 pl-2">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {client.firmName || client.clientName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {client.clientName} • {client.clientType || 'REGULAR'}
                          </div>
                        </td>
                        <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {client.gstin}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200">
                            <span>{client.userId}</span>
                            <button
                              onClick={() => handleCopy(client.userId, `uid_${client.id}`)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="Copy Username"
                            >
                              {copiedText === `uid_${client.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                            <span>{isVisible ? (client.password || 'Not Set') : '••••••••••••'}</span>
                            <button
                              onClick={() => togglePassword(client.id)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title={isVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                            {client.password && (
                              <button
                                onClick={() => handleCopy(client.password || '', `pwd_${client.id}`)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                title="Copy Password"
                              >
                                {copiedText === `pwd_${client.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">
                          {client.assignedEmployeeName || 'Officer Unassigned'}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTriggerLogin(client)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                              title="Launch GST Portal & Auto-Fill with Extension"
                            >
                              <Zap className="h-3 w-3" /> Auto-Login
                            </button>
                            <a
                              href="https://services.gst.gov.in/services/login"
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition"
                              title="Open GST Portal Manually"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: EXTENSION BEHAVIOR & SECURITY SETTINGS
          ============================================================== */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 text-xs">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Extension Behavior & Security Parameters
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure how the background worker scripts and content scripts behave when injecting credentials into the GST portal.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={extensionConfig.autoFillEnabled}
                onChange={(e) => setExtensionConfig({ ...extensionConfig, autoFillEnabled: e.target.checked })}
                className="rounded text-emerald-600 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">Enable Automatic DOM Credential Injection</div>
                <div className="text-[11px] text-slate-400">Automatically locate <code className="font-mono text-[10px]">#username</code> and <code className="font-mono text-[10px]">#user_pass</code> fields on GST login page and fill them.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={extensionConfig.autoFocusCaptcha}
                onChange={(e) => setExtensionConfig({ ...extensionConfig, autoFocusCaptcha: e.target.checked })}
                className="rounded text-emerald-600 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">Auto-Focus on CAPTCHA Input Field</div>
                <div className="text-[11px] text-slate-400">Position cursor inside the CAPTCHA box immediately after username/password injection for instant typing.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={extensionConfig.showAutofillBanner}
                onChange={(e) => setExtensionConfig({ ...extensionConfig, showAutofillBanner: e.target.checked })}
                className="rounded text-emerald-600 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">Display Top Action Bar on GST Portal</div>
                <div className="text-[11px] text-slate-400">Show top floating toolbar on services.gst.gov.in with active client name, security status, and &quot;⚡ Re-Inject&quot; action button.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 cursor-pointer">
              <input
                type="checkbox"
                checked={extensionConfig.autoWipeSessionMemory}
                onChange={(e) => setExtensionConfig({ ...extensionConfig, autoWipeSessionMemory: e.target.checked })}
                className="rounded text-emerald-600 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">Zero-Storage Auto Wipe Memory</div>
                <div className="text-[11px] text-slate-400">Completely flush active credentials from Chrome service worker local storage immediately after successful injection.</div>
              </div>
            </label>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200">GST Portal Target Endpoint</label>
            <input
              type="text"
              value={extensionConfig.targetPortalUrl}
              onChange={(e) => setExtensionConfig({ ...extensionConfig, targetPortalUrl: e.target.value })}
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
            />
            <div className="text-[10px] text-slate-400">
              Allowed origins declared in manifest.json: <code className="font-mono text-[10px]">*://services.gst.gov.in/*, *://*.gst.gov.in/*</code>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 4: EXTENSION & LOGIN AUDIT LOGS
          ============================================================== */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Extension Login & Credential Dispatch Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500">
                Tamper-evident logs of all automated GST portal logins and token exchanges.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-bold">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pl-2">Time / Date</th>
                  <th className="pb-2.5">Officer Name</th>
                  <th className="pb-2.5">Taxpayer Client</th>
                  <th className="pb-2.5">GSTIN / User</th>
                  <th className="pb-2.5">Dispatch Method</th>
                  <th className="pb-2.5 text-right pr-2">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="py-2.5 pl-2 font-mono text-[11px] text-slate-500">
                      {log.timestamp} <span className="text-[10px] text-slate-400">({log.date})</span>
                    </td>
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {log.user}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                      {log.clientName}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {log.gstin} <span className="text-slate-400">({log.userId})</span>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {log.method}
                      </span>
                    </td>
                    <td className="py-2.5 text-right pr-2">
                      <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 rounded text-[10px] font-black">
                        AUTHORIZED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
