import React, { useState, useEffect } from 'react';
import {
  Webhook,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
  Clock,
  Database,
  Terminal,
  Globe,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  Layers,
  FileCode,
  Sparkles,
  ArrowRight,
  Volume2,
  Mic,
  Bell,
  VolumeX,
} from 'lucide-react';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';
import WhatsAppNotificationSettingsModal from './WhatsAppNotificationSettingsModal';
import { WhatsAppNotificationEngine } from '../lib/notifications/WhatsAppNotificationEngine';
import { LeadEngineService } from '../lib/block1/LeadEngineService';

export interface WebhookLogItem {
  id: string;
  timestamp: string;
  sender_number?: string;
  message_id?: string;
  provider_name?: string;
  payload: any;
  created_at: string;
}

export interface WebhookSettingsData {
  callbackUrl: string;
  aliasCallbackUrls: string[];
  verifyToken: string;
  verificationStatus: string;
  lastWebhookReceivedTime: string | null;
  totalWebhookLogsCount: number;
  activeProvider: string;
  metaPhoneNumberId: string;
  metaWabaId: string;
}

export default function WhatsAppWebhookSettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [settings, setSettings] = useState<WebhookSettingsData | null>(null);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);

  const {
    settings: notifSettings,
    playTestSound,
    playTestVoice,
    stopAllAlarms,
    unreadCount,
  } = useWhatsAppNotifications();

  // Verification test state
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    challengeReceived?: string;
    statusText?: string;
    message?: string;
  } | null>(null);

  // Simulation state
  const [simType, setSimType] = useState<'message' | 'status'>('message');
  const [simPhone, setSimPhone] = useState<string>('917530847878');
  const [simName, setSimName] = useState<string>('Rahul Sharma');
  const [simText, setSimText] = useState<string>('Hello! Inquiry about GST registration filing services.');
  const [simStatus, setSimStatus] = useState<'sent' | 'delivered' | 'read' | 'failed'>('read');
  const [simMsgId, setSimMsgId] = useState<string>('wamid.HBgMOTE3NTMwODQ3ODc4FQIAERgSQjM0RTY5');
  const [sendingSim, setSendingSim] = useState<boolean>(false);
  const [simResponse, setSimResponse] = useState<string | null>(null);

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchWebhookData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch Settings
      const resSettings = await fetch('/api/v2/whatsapp/webhook/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.success) {
          setSettings(data.settings);
        }
      }

      // Fetch Logs
      const resLogs = await fetch('/api/v2/whatsapp/webhook/logs');
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        if (dataLogs.success) {
          setLogs(dataLogs.logs || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load webhook settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWebhookData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchWebhookData();
    }, 6000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleCopy = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const testWebhookVerification = async () => {
    setVerifying(true);
    setVerificationResult(null);
    const challenge = `CHALLENGE_${Math.floor(100000 + Math.random() * 900000)}`;
    const verifyToken = settings?.verifyToken || 'efilingg_whatsapp_verify_token_2026';
    const testUrl = `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
      verifyToken
    )}&hub.challenge=${challenge}`;

    try {
      const res = await fetch(testUrl);
      const text = await res.text();
      if (res.status === 200 && text === challenge) {
        setVerificationResult({
          success: true,
          challengeReceived: text,
          statusText: `200 OK (${res.headers.get('content-type') || 'text/plain'})`,
          message: 'Webhook challenge matched expected response token perfectly.',
        });
      } else {
        setVerificationResult({
          success: false,
          statusText: `${res.status} ${res.statusText}`,
          message: `Verification check returned: "${text}"`,
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || 'Network error during verification test',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSendingSim(true);
    setSimResponse(null);

    let payload: any = {};
    if (simType === 'message') {
      const wamid = `wamid.HBgM${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: settings?.metaWabaId || '987654321098765',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+91 92176 66839',
                    phone_number_id: settings?.metaPhoneNumberId || '109283746501234',
                  },
                  contacts: [
                    {
                      profile: { name: simName },
                      wa_id: simPhone,
                    },
                  ],
                  messages: [
                    {
                      from: simPhone,
                      id: wamid,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: simText },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
    } else {
      payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: settings?.metaWabaId || '987654321098765',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+91 92176 66839',
                    phone_number_id: settings?.metaPhoneNumberId || '109283746501234',
                  },
                  statuses: [
                    {
                      id: simMsgId,
                      status: simStatus,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: simPhone,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
    }

    try {
      const res = await fetch('/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSimResponse(JSON.stringify(data, null, 2));

      if (simType === 'message') {
        const cleanPhone = simPhone.replace(/\D/g, '') || '919876543210';
        const convId = `conv_${cleanPhone}`;

        // Ingest message into local client storage
        LeadEngineService.processInboundMessage({
          channel: 'WHATSAPP',
          senderPhone: simPhone,
          senderName: simName || 'WhatsApp Customer',
          messageText: simText || 'New message received',
          mobile: simPhone,
          contactName: simName || 'WhatsApp Customer',
        });

        // Trigger immediate sound, speech, popup and repeating alarm
        WhatsAppNotificationEngine.triggerInboundAlert({
          conversationId: convId,
          senderName: simName || 'WhatsApp Customer',
          senderPhone: simPhone,
          messageText: simText || 'New message received',
        });
      }

      // Refresh log table after simulation
      setTimeout(() => {
        fetchWebhookData();
      }, 500);
    } catch (err: any) {
      setSimResponse(`Error: ${err.message}`);
    } finally {
      setSendingSim(false);
    }
  };

  const callbackUrlDisplay =
    settings?.callbackUrl || `${window.location.origin}/api/webhooks/whatsapp`;
  const verifyTokenDisplay =
    settings?.verifyToken || 'efilingg_whatsapp_verify_token_2026';

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900 rounded-xl border border-slate-800 text-slate-300">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-3" />
        <span>Loading WhatsApp Webhook System...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Webhook className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Webhook className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  WhatsApp Cloud API Webhook Engine
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    Live Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Meta Graph API Webhook endpoint handler, real-time message receiver & status sync
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWebhookData}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh Status
            </button>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold">Verified & Listening</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Active Provider
            </div>
            <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {settings?.activeProvider || 'META_CLOUD_API'}
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Last Received
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate">
              {settings?.lastWebhookReceivedTime
                ? new Date(settings.lastWebhookReceivedTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'No webhooks received yet'}
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Table Records
            </div>
            <div className="text-sm font-bold text-slate-100">
              {settings?.totalWebhookLogsCount || logs.length} logs in DB
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              Primary Route
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-400 truncate">
              /api/webhooks/whatsapp
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Webhook Configuration Details & Verification Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Cards (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Webhook Callback URL Card */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                1. Webhook Callback URL
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                HTTPS Mandatory
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter this Callback URL in Meta Developer Portal under{' '}
              <span className="text-slate-200 font-medium">WhatsApp &gt; Configuration &gt; Webhook</span>.
            </p>

            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={callbackUrlDisplay}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-3 pr-24 rounded-lg border border-slate-800 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(callbackUrlDisplay, 'url')}
                className="absolute right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Alias Endpoint Listeners */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Active Alias Listeners (All registered & active):
              </span>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 bg-slate-950 rounded border border-slate-800 text-slate-300">
                  GET & POST /api/webhooks/whatsapp
                </span>
                <span className="px-2.5 py-1 bg-slate-950 rounded border border-slate-800 text-slate-400">
                  GET & POST /api/whatsapp/webhook
                </span>
                <span className="px-2.5 py-1 bg-slate-950 rounded border border-slate-800 text-slate-400">
                  GET & POST /api/v2/whatsapp/webhook
                </span>
              </div>
            </div>
          </div>

          {/* Webhook Verification Token Card */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                2. Verify Token (<code className="text-indigo-300 font-normal">WHATSAPP_VERIFY_TOKEN</code>)
              </h3>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showToken ? 'Hide' : 'Reveal'}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Meta transmits this string during GET webhook verification. The server verifies this token and responds with the exact <code className="text-slate-300 font-mono">hub.challenge</code> string.
            </p>

            <div className="relative flex items-center">
              <input
                type={showToken ? 'text' : 'password'}
                readOnly
                value={verifyTokenDisplay}
                className="w-full bg-slate-950 text-indigo-300 font-mono text-xs p-3 pr-24 rounded-lg border border-slate-800 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(verifyTokenDisplay, 'token')}
                className="absolute right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Live Test Box (1 Col) */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Webhook Verification Test
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Executes a live challenge verification against <code className="text-emerald-300 font-mono text-[11px]">GET /api/webhooks/whatsapp</code> using the configured token to confirm server readiness.
            </p>

            <button
              onClick={testWebhookVerification}
              disabled={verifying}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing Challenge Verification...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  Run Challenge Test
                </>
              )}
            </button>
          </div>

          {/* Verification Result Display */}
          {verificationResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                verificationResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  {verificationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  {verificationResult.success ? 'Verification Passed' : 'Verification Failed'}
                </span>
                {verificationResult.statusText && (
                  <span className="font-mono text-[11px] opacity-80">
                    {verificationResult.statusText}
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90">{verificationResult.message}</p>
              {verificationResult.challengeReceived && (
                <div className="pt-1 font-mono text-[10px] bg-black/30 p-1.5 rounded text-emerald-300 border border-emerald-900/50">
                  Challenge Echo: "{verificationResult.challengeReceived}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enterprise Voice & Sound Notification System Settings Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 p-5 rounded-xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Enterprise Persistent Voice & Audio Notification System
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                    {unreadCount} Active Alarm{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Loud sound chime, Speech Synthesis voice alerts ("{notifSettings.voiceText}"), repeating every {notifSettings.repeatIntervalSec}s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playTestVoice()}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              Test Voice
            </button>
            <button
              onClick={() => playTestSound()}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              Test Sound
            </button>
            <button
              onClick={() => setShowVoiceModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md"
            >
              Configure Voice Alerts
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">Speech Voice</span>
            <span className={notifSettings.voiceEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {notifSettings.voiceEnabled ? 'ACTIVE ("' + notifSettings.voiceText + '")' : 'DISABLED'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Chime Sound</span>
            <span className={notifSettings.soundEnabled ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
              {notifSettings.soundEnabled ? 'ENABLED (' + notifSettings.volume + '%)' : 'DISABLED'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Repeat Interval</span>
            <span className="text-amber-400 font-bold">Every {notifSettings.repeatIntervalSec} Seconds</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Desktop Popups</span>
            <span className={notifSettings.browserNotificationsEnabled ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              {notifSettings.browserNotificationsEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Inbound Webhook Payload Simulator */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Inbound Webhook Payload Simulator
          </h3>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSimType('message')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                simType === 'message'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inbound Text Message
            </button>
            <button
              onClick={() => setSimType('status')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                simType === 'status'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Delivery Status Update
            </button>
          </div>
        </div>

        {simType === 'message' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Sender Phone / wa_id
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="e.g. 917530847878"
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Message Content
              </label>
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="Message text..."
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Message WAMID / ID
              </label>
              <input
                type="text"
                value={simMsgId}
                onChange={(e) => setSimMsgId(e.target.value)}
                placeholder="Message ID"
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Recipient Number
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="e.g. 917530847878"
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Status Event
              </label>
              <select
                value={simStatus}
                onChange={(e) => setSimStatus(e.target.value as any)}
                className="w-full bg-slate-950 text-slate-100 text-xs p-2.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="sent">SENT</option>
                <option value="delivered">DELIVERED</option>
                <option value="read">READ</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-400">
            Fires exact Meta Cloud API payload structure to <code className="text-amber-300 font-mono">POST /api/webhooks/whatsapp</code>.
          </p>
          <button
            onClick={handleSimulateWebhook}
            disabled={sendingSim}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {sendingSim ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Sending Webhook...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Trigger Simulated Webhook
              </>
            )}
          </button>
        </div>

        {simResponse && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
            <span className="text-slate-400 block text-[10px] font-semibold">
              Server Ingestion Response:
            </span>
            <pre className="whitespace-pre-wrap overflow-x-auto">{simResponse}</pre>
          </div>
        )}
      </div>

      {/* Raw Webhook Logs Table (whatsapp_webhook_logs) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Raw Payload Logs (<code className="text-sky-300 font-mono">whatsapp_webhook_logs</code>)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {logs.length} Recent Records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
              Auto-refresh (6s)
            </label>
            <button
              onClick={fetchWebhookData}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Log ID / Provider</th>
                <th className="p-3">Received Time</th>
                <th className="p-3">Sender / Recipient</th>
                <th className="p-3">Message WAMID</th>
                <th className="p-3 text-right">Raw Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                    No webhook logs recorded yet. Send a test message or trigger simulation above!
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-850/50 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-200">{log.id}</div>
                          <div className="text-[10px] text-emerald-400 font-sans">
                            {log.provider_name || 'WhatsApp Cloud API'}
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] font-sans">
                          {new Date(log.created_at || log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 text-sky-300">
                          {log.sender_number || 'N/A'}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] truncate max-w-[180px]">
                          {log.message_id || 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans transition"
                          >
                            {isExpanded ? 'Hide Payload' : 'View JSON'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-4 bg-slate-950 border-y border-slate-800">
                            <div className="space-y-1">
                              <div className="text-[10px] font-semibold text-slate-400 font-sans flex items-center justify-between">
                                <span>Raw JSON Payload ({log.id})</span>
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      JSON.stringify(log.payload, null, 2)
                                    )
                                  }
                                  className="text-emerald-400 hover:underline text-[10px] font-sans"
                                >
                                  Copy JSON
                                </button>
                              </div>
                              <pre className="p-3 bg-black/50 rounded-lg border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WhatsAppNotificationSettingsModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />
    </div>
  );
}
