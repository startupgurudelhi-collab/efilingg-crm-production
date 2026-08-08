import React from 'react';
import {
  Bell,
  MessageSquare,
  VolumeX,
  X,
  Clock,
  Sparkles,
  Volume2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';
import { eventBus } from '../lib/eventBus';

export default function WhatsAppIncomingMessagePopup() {
  const {
    unreadAlerts,
    unreadCount,
    acknowledgeAlert,
    markAlertRead,
    stopAllAlarms,
  } = useWhatsAppNotifications();

  if (unreadCount === 0 || unreadAlerts.length === 0) {
    return null;
  }

  // Active floating alert (most recent unread message)
  const activeAlert = unreadAlerts[0];

  const handleOpenChat = () => {
    if (!activeAlert) return;
    markAlertRead(activeAlert.conversationId);

    // Emit global event to navigate to AI Sales Inbox and select conversation
    eventBus.publishAsync('NavigateToWhatsAppInbox', 'NOTIFICATION', {
      conversationId: activeAlert.conversationId,
    });
    eventBus.publishAsync('OpenWhatsAppConversation', 'CONVERSATION', {
      conversationId: activeAlert.conversationId,
    });
  };

  const handleMuteAndClose = () => {
    if (!activeAlert) return;
    acknowledgeAlert(activeAlert.conversationId);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-96 max-w-[calc(100vw-2.5rem)] animate-bounce-subtle">
      <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl shadow-2xl p-4 text-slate-100 overflow-hidden relative backdrop-blur-md ring-4 ring-rose-500/20">
        {/* Animated pulse background glow */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none animate-pulse" />

        {/* Popup Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 animate-pulse">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                  New WhatsApp Message
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold animate-pulse">
                  {unreadCount} UNREAD
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                Repeating audio alarm playing...
              </span>
            </div>
          </div>

          <button
            onClick={handleMuteAndClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Silence Alarm & Close Popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Content Body */}
        <div className="py-3 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-white truncate">
              {activeAlert.senderName}
            </span>
            {activeAlert.senderPhone && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                {activeAlert.senderPhone}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 line-clamp-3 leading-relaxed font-sans">
            "{activeAlert.messageText}"
          </p>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              {new Date(activeAlert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className="text-amber-400 font-bold">Action Required</span>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          {/* Read / Open Chat Button */}
          <button
            onClick={handleOpenChat}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Read & Open Chat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Mute / Close Button */}
          <button
            onClick={handleMuteAndClose}
            className="py-2 px-3 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Silence audio chime and close popup"
          >
            <VolumeX className="w-4 h-4 text-rose-400" />
            <span>Mute Alarm</span>
          </button>
        </div>
      </div>
    </div>
  );
}
