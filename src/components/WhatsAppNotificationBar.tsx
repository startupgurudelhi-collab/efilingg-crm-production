import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  VolumeX,
  CheckCheck,
  Clock,
  MessageSquare,
  Settings,
  X,
  Volume2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';
import WhatsAppNotificationSettingsModal from './WhatsAppNotificationSettingsModal';

interface WhatsAppNotificationBarProps {
  onSelectConversation?: (conversationId: string) => void;
}

export default function WhatsAppNotificationBar({
  onSelectConversation,
}: WhatsAppNotificationBarProps) {
  const {
    alerts,
    unreadAlerts,
    acknowledgedAlerts,
    unreadCount,
    acknowledgeAlert,
    markAlertRead,
    stopAllAlarms,
    markAllRead,
  } = useWhatsAppNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenConversation = (convId: string) => {
    markAlertRead(convId);
    if (onSelectConversation) {
      onSelectConversation(convId);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
          unreadCount > 0
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 dark:text-rose-400 animate-pulse shadow-lg shadow-rose-500/20'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
        }`}
        title={unreadCount > 0 ? `${unreadCount} Active Unread WhatsApp Alerts` : 'WhatsApp Alerts'}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bounce text-rose-500 dark:text-rose-400' : ''}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-950 animate-pulse shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Portal Popup */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="p-4 px-5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${unreadCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-xs block">
                    WhatsApp Live Alerts
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {unreadCount} Unread • {acknowledgedAlerts.length} Acknowledged
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  title="Notification & Speech Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Global Actions Toolbar if unread > 0 */}
            {unreadCount > 0 && (
              <div className="p-2.5 px-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs">
                <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                  Repeating Audio Active
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={stopAllAlarms}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow transition"
                  >
                    <VolumeX className="h-3 w-3" />
                    Mute Sound
                  </button>
                  <button
                    onClick={markAllRead}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Read All
                  </button>
                </div>
              </div>
            )}

            {/* Alert Items List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center space-y-2">
                  <BellOff className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                  <span className="text-xs">No active WhatsApp notification alerts.</span>
                </div>
              ) : (
                alerts.map((alert) => {
                  const isUnread = alert.state === 'unread';
                  const isAck = alert.state === 'acknowledged';

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 transition-colors ${
                        isUnread
                          ? 'bg-rose-500/10 dark:bg-rose-950/20 border-l-4 border-rose-500'
                          : isAck
                          ? 'bg-amber-500/5 dark:bg-amber-950/10 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-950 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {alert.senderName}
                          </span>
                          {alert.senderPhone && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({alert.senderPhone})
                            </span>
                          )}
                        </div>

                        {/* State Badge */}
                        {isUnread ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-rose-500 text-white animate-pulse">
                            UNREAD ALARM
                          </span>
                        ) : isAck ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            MUTED
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-200 dark:bg-slate-800 text-slate-500">
                            READ
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 font-sans">
                        {alert.messageText}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {new Date(alert.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <button
                              onClick={() => acknowledgeAlert(alert.conversationId)}
                              className="text-amber-500 hover:underline font-bold text-[10px]"
                            >
                              Stop Alarm
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenConversation(alert.conversationId)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Open Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
              >
                <Settings className="h-3.5 w-3.5" />
                Notification Settings
              </button>
              <button
                onClick={markAllRead}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline text-[11px]"
              >
                Clear All Alerts
              </button>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <WhatsAppNotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
