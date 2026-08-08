import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Mic,
  Clock,
  Bell,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  ShieldAlert,
  Radio,
  Check,
  AlertCircle
} from 'lucide-react';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';
import { WhatsAppNotificationEngine } from '../lib/notifications/WhatsAppNotificationEngine';

interface WhatsAppNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppNotificationSettingsModal({
  isOpen,
  onClose,
}: WhatsAppNotificationSettingsModalProps) {
  const {
    settings,
    updateSettings,
    playTestSound,
    playTestVoice,
    playTestDesktop,
    stopAllAlarms,
    requestNotificationPermission,
  } = useWhatsAppNotifications();

  const [permissionState, setPermissionState] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'not_supported';
  });

  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermissionState(perm);
    if (perm === 'granted') {
      setTestSuccessMessage('Browser Desktop Notifications enabled!');
      setTimeout(() => setTestSuccessMessage(null), 3000);
    }
  };

  const handleTestSoundClick = () => {
    playTestSound();
    setTestSuccessMessage('Played loud notification chime!');
    setTimeout(() => setTestSuccessMessage(null), 3000);
  };

  const handleTestVoiceClick = () => {
    playTestVoice(settings.voiceText);
    setTestSuccessMessage(`Speech Synthesis activated: "${settings.voiceText}"`);
    setTimeout(() => setTestSuccessMessage(null), 4000);
  };

  const handleTestDesktopClick = () => {
    playTestDesktop();
    setTestSuccessMessage('Triggered Browser Desktop Notification');
    setTimeout(() => setTestSuccessMessage(null), 3000);
  };

  const handleTestFullAlertClick = () => {
    const testConvId = `conv_test_${Date.now()}`;
    WhatsAppNotificationEngine.triggerInboundAlert({
      conversationId: testConvId,
      senderName: 'Rahul Sharma (Test Lead)',
      senderPhone: '917530847878',
      messageText: 'Hi, I need assistance with Private Limited Company registration pricing.',
    });
    setTestSuccessMessage('Triggered live full inbound message alert & repeating sound chime!');
    setTimeout(() => setTestSuccessMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-slate-100">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                WhatsApp Voice & Sound Notification Settings
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Enterprise
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure repeating audio, Speech Synthesis, and desktop alerts for inbound WhatsApp messages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {testSuccessMessage && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{testSuccessMessage}</span>
            </div>
          )}

          {/* Toggle Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voice Alert Toggle */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Voice Speech Alert
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.voiceEnabled}
                    onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-400">
                Uses Speech Synthesis API to announce inbound messages out loud.
              </p>
            </div>

            {/* Sound Chime Toggle */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  Loud Chime Tone
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-400">
                Plays loud Web Audio API double-tone chime on alert tick.
              </p>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                {settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
                Notification Volume
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {settings.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Mute (0%)</span>
              <span>50%</span>
              <span>Loud (100%)</span>
            </div>
          </div>

          {/* Repeat Interval & Custom Voice Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Repeat Interval */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Repeat Alert Interval (Seconds)
              </label>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.repeatIntervalSec}
                  onChange={(e) =>
                    updateSettings({
                      repeatIntervalSec: Math.max(1, parseInt(e.target.value, 10) || 5),
                    })
                  }
                  className="w-24 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold p-2 text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">Default: 5 sec</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Repeats audio/voice alert every X seconds until conversation is read or acknowledged.
              </p>
            </div>

            {/* Custom Notification Text */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Mic className="w-4 h-4 text-sky-400" />
                Custom Voice Speech Text
              </label>
              <input
                type="text"
                value={settings.voiceText}
                onChange={(e) => updateSettings({ voiceText: e.target.value })}
                placeholder="e.g. Hi, you have a new message."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500">
                Exact spoken phrasing generated by Speech Synthesis API.
              </p>
            </div>
          </div>

          {/* Desktop Browser Notifications Permission Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Inactive Browser Tab Desktop Notifications
                </span>
                <p className="text-[11px] text-slate-400">
                  Sends desktop system popups when browser tab is hidden or backgrounded.
                </p>
              </div>

              {permissionState === 'granted' ? (
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Enabled
                </span>
              ) : (
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Enable Permission
                </button>
              )}
            </div>
          </div>

          {/* Test Buttons Row */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live Interactive Audio & Voice Test Controls
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={handleTestSoundClick}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Test Sound
              </button>

              <button
                onClick={handleTestVoiceClick}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Test Voice
              </button>

              <button
                onClick={handleTestDesktopClick}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-sky-400" />
                Test Desktop
              </button>

              <button
                onClick={handleTestFullAlertClick}
                className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-500/40 transition cursor-pointer col-span-2 sm:col-span-1"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                Test Popup Alert
              </button>

              <button
                onClick={stopAllAlarms}
                className="py-2 px-3 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-rose-800/60 transition cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                Mute Audio
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Settings automatically saved to local engine storage.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition cursor-pointer"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
