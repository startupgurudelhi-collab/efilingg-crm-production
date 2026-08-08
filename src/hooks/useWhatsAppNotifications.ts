import { useState, useEffect, useCallback } from 'react';
import {
  WhatsAppNotificationEngine,
  WhatsAppAlertItem,
  WhatsAppNotificationSettings,
  NotificationAlertState,
} from '../lib/notifications/WhatsAppNotificationEngine';

export function useWhatsAppNotifications() {
  const [settings, setSettings] = useState<WhatsAppNotificationSettings>(() =>
    WhatsAppNotificationEngine.getSettings()
  );
  const [alerts, setAlerts] = useState<WhatsAppAlertItem[]>(() =>
    WhatsAppNotificationEngine.getAlerts()
  );

  useEffect(() => {
    // Subscribe to state changes in WhatsAppNotificationEngine
    const unsubscribe = WhatsAppNotificationEngine.subscribe(() => {
      setSettings(WhatsAppNotificationEngine.getSettings());
      setAlerts(WhatsAppNotificationEngine.getAlerts());
    });
    return unsubscribe;
  }, []);

  const unreadAlerts = alerts.filter((a) => a.state === 'unread');
  const acknowledgedAlerts = alerts.filter((a) => a.state === 'acknowledged');
  const unreadCount = unreadAlerts.length;

  const updateSettings = useCallback(
    (newSettings: Partial<WhatsAppNotificationSettings>) => {
      WhatsAppNotificationEngine.updateSettings(newSettings);
    },
    []
  );

  const triggerInboundAlert = useCallback(
    (params: {
      conversationId: string;
      senderName?: string;
      senderPhone?: string;
      messageText?: string;
    }) => {
      WhatsAppNotificationEngine.triggerInboundAlert(params);
    },
    []
  );

  const acknowledgeAlert = useCallback((conversationId: string) => {
    WhatsAppNotificationEngine.acknowledgeAlert(conversationId);
  }, []);

  const markAlertRead = useCallback((conversationId: string) => {
    WhatsAppNotificationEngine.markAlertRead(conversationId);
  }, []);

  const stopAllAlarms = useCallback(() => {
    WhatsAppNotificationEngine.stopAllAlarms();
  }, []);

  const markAllRead = useCallback(() => {
    WhatsAppNotificationEngine.markAllRead();
  }, []);

  const playTestSound = useCallback(() => {
    WhatsAppNotificationEngine.playChimeSound();
  }, []);

  const playTestVoice = useCallback((customText?: string) => {
    WhatsAppNotificationEngine.speakVoiceAlert(customText);
  }, []);

  const playTestDesktop = useCallback(() => {
    WhatsAppNotificationEngine.triggerDesktopNotification(
      '🔔 WhatsApp Alert Test',
      'Hi, you have a new message.'
    );
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    return await WhatsAppNotificationEngine.requestNotificationPermission();
  }, []);

  const isConversationAlerting = useCallback((conversationId: string) => {
    return WhatsAppNotificationEngine.isConversationAlerting(conversationId);
  }, []);

  const getConversationAlertState = useCallback((conversationId: string): NotificationAlertState | null => {
    return WhatsAppNotificationEngine.getConversationAlertState(conversationId);
  }, []);

  return {
    settings,
    alerts,
    unreadAlerts,
    acknowledgedAlerts,
    unreadCount,
    updateSettings,
    triggerInboundAlert,
    acknowledgeAlert,
    markAlertRead,
    stopAllAlarms,
    markAllRead,
    playTestSound,
    playTestVoice,
    playTestDesktop,
    requestNotificationPermission,
    isConversationAlerting,
    getConversationAlertState,
  };
}
