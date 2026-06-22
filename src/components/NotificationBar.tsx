/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/db';
import { Notification } from '../types';
import { Bell, Check, Clock, X, BellOff } from 'lucide-react';

interface NotificationBarProps {
  userId: string;
  triggerRefresh: number;
}

export default function NotificationBar({ userId, triggerRefresh }: NotificationBarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setNotifications(getNotifications(userId));
  }, [userId, triggerRefresh, isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications(getNotifications(userId));
  };

  const handleClearAll = () => {
    markAllNotificationsAsRead(userId);
    setNotifications(getNotifications(userId));
  };

  return (
    <div className="relative">
      {/* Flag / Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        id="notification-trigger-id"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Portal Popup */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-850">
            {/* Header */}
            <div className="p-4 px-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4.5 w-4.5 text-emerald-555" />
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
                  Alert Registry ({unreadCount} unread)
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center space-y-2">
                  <BellOff className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                  <span className="text-xs">No active notification logs today.</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors ${
                      !n.read ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-3">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight block">
                          {n.title}
                        </span>
                        <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="h-5 w-5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200 cursor-pointer"
                          title="Mark Read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-2 bg-slate-50 dark:bg-slate-950 text-center text-[10px] text-slate-404 font-semibold tracking-wide">
              Showing notifications in current timezone
            </div>
          </div>
        </>
      )}
    </div>
  );
}
