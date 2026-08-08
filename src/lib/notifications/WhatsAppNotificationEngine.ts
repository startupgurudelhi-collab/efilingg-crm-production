/**
 * Enterprise Persistent WhatsApp Notification Engine
 *
 * Requirements Met:
 * 1. Immediate Loud Sound Chime & Speech Synthesis ("Hi, you have a new message.") on inbound message.
 * 2. Repeat alert loop every 5 seconds (configurable) until message is marked as read.
 * 3. Stop conditions: user opens conversation, clicks "Mark as Read" / "Acknowledge", or read status becomes true.
 * 4. Notification States: 'unread', 'acknowledged', 'read'.
 * 5. Visual Indicators: Flashing bell icon, red unread badge, flashing conversation row.
 * 6. Browser Tab Inactive Handling: Browser Desktop Notification API + repeating audio.
 * 7. Admin Settings: Enable/Disable voice, Volume slider (0-100%), Repeat interval (1-30s), Custom voice text.
 */

import { eventBus } from '../eventBus';

export type NotificationAlertState = 'unread' | 'acknowledged' | 'read';

export interface WhatsAppAlertItem {
  id: string;
  conversationId: string;
  senderName: string;
  senderPhone: string;
  messageText: string;
  timestamp: string;
  state: NotificationAlertState;
  acknowledgedAt?: string;
  readAt?: string;
}

export interface WhatsAppNotificationSettings {
  voiceEnabled: boolean;
  soundEnabled: boolean;
  volume: number; // 0-100
  repeatIntervalSec: number; // default 5
  voiceText: string; // default "Hi, you have a new message."
  browserNotificationsEnabled: boolean;
}

const SETTINGS_STORAGE_KEY = 'efilingg_whatsapp_notification_settings_v2';
const ALERTS_STORAGE_KEY = 'efilingg_whatsapp_active_alerts_v2';

const DEFAULT_SETTINGS: WhatsAppNotificationSettings = {
  voiceEnabled: true,
  soundEnabled: true,
  volume: 100,
  repeatIntervalSec: 5,
  voiceText: 'Hi, you have a new message.',
  browserNotificationsEnabled: true,
};

type Listener = () => void;

class WhatsAppNotificationEngineClass {
  private settings: WhatsAppNotificationSettings = { ...DEFAULT_SETTINGS };
  private alerts: Map<string, WhatsAppAlertItem> = new Map();
  private listeners: Set<Listener> = new Set();
  private intervalTimer: any = null;
  private originalDocumentTitle: string = document.title;
  private titleFlashTimer: any = null;
  private isTitleFlashing: boolean = false;

  private sharedAudioCtx: AudioContext | null = null;
  private isAudioUnlocked: boolean = false;
  private seenMessageIds: Set<string> = new Set();

  constructor() {
    this.loadSettings();
    this.loadAlerts();
    this.initEventBusListeners();
    this.startRepeatLoop();
    this.initAudioUnlocker();
    this.initStorageAndServerPoller();

    // Auto-request notification permission if browser notifications enabled
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Permission can be requested on first user interaction
    }
  }

  /**
   * Pre-populate seen messages and periodically poll for unhandled inbound messages and server webhooks
   */
  private initStorageAndServerPoller(): void {
    if (typeof window === 'undefined') return;

    // 1. Mark existing messages in localStorage as seen on boot
    try {
      const raw = localStorage.getItem('efilingg_crm_messages_v2');
      if (raw) {
        const msgs: any[] = JSON.parse(raw);
        msgs.forEach((m) => {
          if (m?.id) this.seenMessageIds.add(m.id);
        });
      }
    } catch (e) {}

    // 2. Background polling loop (every 2s) to check both local storage and server endpoints
    setInterval(async () => {
      // Check 2a: Client Local Storage
      try {
        const rawMsgs = localStorage.getItem('efilingg_crm_messages_v2');
        if (rawMsgs) {
          const msgs: any[] = JSON.parse(rawMsgs);
          const inboundMsgs = msgs.filter(
            (m) => (m.direction === 'INBOUND' || !m.direction) && m.id
          );

          inboundMsgs.forEach((msg) => {
            if (!this.seenMessageIds.has(msg.id)) {
              this.seenMessageIds.add(msg.id);
              const convId = msg.conversationId || `conv_${msg.senderPhone || Date.now()}`;
              this.triggerInboundAlert({
                conversationId: convId,
                senderName: msg.senderName || 'WhatsApp Contact',
                senderPhone: msg.senderPhone || '',
                messageText: msg.content || 'New message received',
              });
            }
          });
        }
      } catch (e) {}

      // Check 2b: Real Server Conversations Endpoint (/api/v2/conversations)
      try {
        const res = await fetch('/api/v2/conversations');
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && Array.isArray(data.conversations)) {
            data.conversations.forEach((conv: any) => {
              if (conv.unreadCount > 0 && conv.lastMessageText) {
                const alertKey = `server_conv_${conv.id}_${conv.lastMessageTimestamp || conv.updatedAt || conv.unreadCount}`;
                if (!this.seenMessageIds.has(alertKey)) {
                  this.seenMessageIds.add(alertKey);

                  console.log('[NOTIFICATION_EVENT_RECEIVED]', {
                    source: 'SERVER_POLL',
                    conversationId: conv.id,
                    customerName: conv.customerName || conv.contactName,
                    lastMessageText: conv.lastMessageText,
                    unreadCount: conv.unreadCount,
                  });

                  this.triggerInboundAlert({
                    conversationId: conv.id,
                    senderName: conv.customerName || conv.contactName || conv.contactNumber || 'WhatsApp Lead',
                    senderPhone: conv.contactNumber || conv.mobile || '',
                    messageText: conv.lastMessageText || 'New inbound WhatsApp message received',
                  });
                }
              }
            });
          }
        }
      } catch (e) {}
    }, 2000);
  }

  /**
   * Unlock Web Audio & Speech Synthesis on first user interaction
   */
  private initAudioUnlocker(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        if (!this.sharedAudioCtx) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.sharedAudioCtx = new AudioContextClass();
          }
        }

        if (this.sharedAudioCtx && this.sharedAudioCtx.state === 'suspended') {
          this.sharedAudioCtx.resume().then(() => {
            this.isAudioUnlocked = true;
          }).catch(() => {});
        } else if (this.sharedAudioCtx) {
          this.isAudioUnlocked = true;
        }

        if ('speechSynthesis' in window) {
          window.speechSynthesis.getVoices();
        }
      } catch (e) {
        console.warn('[WhatsApp Notification Engine] Audio unlock listener error:', e);
      }
    };

    const events = ['pointerdown', 'touchstart', 'click', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlock, { passive: true });
    });
  }

  // =========================================================================
  // SETTINGS MANAGEMENT
  // =========================================================================

  public getSettings(): WhatsAppNotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<WhatsAppNotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.restartRepeatLoop();
    this.notifyListeners();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  // =========================================================================
  // ALERTS & STATE MANAGEMENT
  // =========================================================================

  public getAlerts(): WhatsAppAlertItem[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getUnreadAlerts(): WhatsAppAlertItem[] {
    return this.getAlerts().filter((a) => a.state === 'unread');
  }

  public getAcknowledgedAlerts(): WhatsAppAlertItem[] {
    return this.getAlerts().filter((a) => a.state === 'acknowledged');
  }

  public getUnreadCount(): number {
    return this.getUnreadAlerts().length;
  }

  public isConversationAlerting(conversationId: string): boolean {
    const alert = this.alerts.get(conversationId);
    return !!alert && alert.state === 'unread';
  }

  public getConversationAlertState(conversationId: string): NotificationAlertState | null {
    const alert = this.alerts.get(conversationId);
    return alert ? alert.state : null;
  }

  /**
   * Trigger a new inbound WhatsApp message alert
   */
  public triggerInboundAlert(params: {
    conversationId: string;
    senderName?: string;
    senderPhone?: string;
    messageText?: string;
  }): void {
    const { conversationId, senderName = 'WhatsApp Customer', senderPhone = '', messageText = 'New message' } = params;

    console.log('[NOTIFICATION_EVENT_RECEIVED]', {
      conversationId,
      senderName,
      senderPhone,
      messageText,
      timestamp: new Date().toISOString(),
    });

    console.log('[POPUP_TRIGGERED]', {
      conversationId,
      senderName,
      messageText,
      status: 'DISPLAYING_IN_UI',
    });

    const alertId = `alert_${conversationId}_${Date.now()}`;
    const newItem: WhatsAppAlertItem = {
      id: alertId,
      conversationId,
      senderName,
      senderPhone,
      messageText,
      timestamp: new Date().toISOString(),
      state: 'unread',
    };

    this.alerts.set(conversationId, newItem);
    this.saveAlerts();
    this.notifyListeners();

    // Execute immediate sound, speech, and desktop popup
    this.playImmediateAlert(newItem);
  }

  /**
   * Acknowledge Alert (Stops audio/speech for this conversation, sets state to 'acknowledged')
   */
  public acknowledgeAlert(conversationId: string): void {
    const alert = this.alerts.get(conversationId);
    if (alert && alert.state === 'unread') {
      alert.state = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      this.alerts.set(conversationId, alert);
      this.saveAlerts();
      this.notifyListeners();
      this.checkAndStopAudioIfCleared();
    }
  }

  /**
   * Mark Alert as Read (Fully clears alert state to 'read')
   */
  public markAlertRead(conversationId: string): void {
    const alert = this.alerts.get(conversationId);
    if (alert) {
      alert.state = 'read';
      alert.readAt = new Date().toISOString();
      this.alerts.set(conversationId, alert);
      this.saveAlerts();
      this.notifyListeners();
      this.checkAndStopAudioIfCleared();
    }
  }

  /**
   * Stop All Active Alarms (Acknowledges all unread alerts immediately)
   */
  public stopAllAlarms(): void {
    this.stopSpeech();
    let changed = false;
    this.alerts.forEach((alert) => {
      if (alert.state === 'unread') {
        alert.state = 'acknowledged';
        alert.acknowledgedAt = new Date().toISOString();
        changed = true;
      }
    });

    if (changed) {
      this.saveAlerts();
      this.notifyListeners();
    }
    this.restoreDocumentTitle();
  }

  /**
   * Mark All as Read (Fully reads all alerts)
   */
  public markAllRead(): void {
    this.stopSpeech();
    let changed = false;
    this.alerts.forEach((alert) => {
      if (alert.state !== 'read') {
        alert.state = 'read';
        alert.readAt = new Date().toISOString();
        changed = true;
      }
    });

    if (changed) {
      this.saveAlerts();
      this.notifyListeners();
    }
    this.restoreDocumentTitle();
  }

  private loadAlerts(): void {
    try {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (raw) {
        const parsed: WhatsAppAlertItem[] = JSON.parse(raw);
        parsed.forEach((item) => this.alerts.set(item.conversationId, item));
      }
    } catch (e) {}
  }

  private saveAlerts(): void {
    try {
      const list = Array.from(this.alerts.values()).slice(0, 50); // keep recent 50
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // =========================================================================
  // EVENT BUS SUBSCRIBER
  // =========================================================================

  private initEventBusListeners(): void {
    // Subscribe to real-time events published across the application
    eventBus.subscribe('NewMessage', (data) => {
      const payload = (data as any)?.payload || {};
      // Check if message is INBOUND
      const direction = payload.direction || payload.message?.direction || 'INBOUND';
      if (direction === 'INBOUND' || !payload.direction) {
        const convId = payload.conversationId || payload.conversation_id || payload.message?.conversationId;
        if (convId) {
          const senderName = payload.senderName || payload.contactName || payload.senderPhone || 'WhatsApp Contact';
          const senderPhone = payload.senderPhone || payload.contactNumber || '';
          const messageText = payload.messageText || payload.content || payload.message?.content || 'New WhatsApp message';

          this.triggerInboundAlert({
            conversationId: convId,
            senderName,
            senderPhone,
            messageText,
          });
        }
      }
    });

    eventBus.subscribe('ConversationCreated', (data) => {
      const payload = (data as any)?.payload || {};
      const convId = payload.id || payload.conversationId;
      if (convId) {
        this.triggerInboundAlert({
          conversationId: convId,
          senderName: payload.contactName || payload.customerName || 'New WhatsApp Contact',
          senderPhone: payload.contactNumber || payload.customerPhone || '',
          messageText: payload.lastMessage || 'New inbound conversation created',
        });
      }
    });
  }

  // =========================================================================
  // AUDIO & SPEECH SYNTHESIS ENGINE
  // =========================================================================

  /**
   * Immediate play upon new message
   */
  private playImmediateAlert(alert: WhatsAppAlertItem): void {
    if (this.settings.soundEnabled) {
      console.log('[SOUND_TRIGGERED]', {
        conversationId: alert.conversationId,
        soundEnabled: this.settings.soundEnabled,
        volume: this.settings.volume,
        timestamp: new Date().toISOString(),
      });
      this.playChimeSound();
    }
    if (this.settings.voiceEnabled) {
      console.log('[VOICE_TRIGGERED]', {
        conversationId: alert.conversationId,
        voiceEnabled: this.settings.voiceEnabled,
        spokenText: this.settings.voiceText,
        timestamp: new Date().toISOString(),
      });
      this.speakVoiceAlert(this.settings.voiceText);
    }
    if (this.settings.browserNotificationsEnabled) {
      this.triggerDesktopNotification(
        `WhatsApp from ${alert.senderName}`,
        alert.messageText
      );
    }
    this.updateDocumentTitleFlashing();
  }

  /**
   * Persistent repeat tick execution
   */
  private executeRepeatTick(): void {
    const unreadCount = this.getUnreadCount();
    if (unreadCount === 0) {
      this.restoreDocumentTitle();
      return;
    }

    // Play chime sound
    if (this.settings.soundEnabled) {
      this.playChimeSound();
    }

    // Speak voice alert
    if (this.settings.voiceEnabled) {
      this.speakVoiceAlert(this.settings.voiceText);
    }

    // Desktop notification if document is hidden / tab inactive
    if (document.hidden && this.settings.browserNotificationsEnabled) {
      const latest = this.getUnreadAlerts()[0];
      if (latest) {
        this.triggerDesktopNotification(
          `🔔 (${unreadCount}) Unread WhatsApp Messages`,
          `${latest.senderName}: ${latest.messageText}`
        );
      }
    }

    this.updateDocumentTitleFlashing();
  }

  /**
   * Web Audio API synthesized bright loud double-chime tone
   */
  public playChimeSound(customVolume?: number): void {
    try {
      const vol = (customVolume !== undefined ? customVolume : this.settings.volume) / 100;
      if (vol <= 0) return;

      if (!this.sharedAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.sharedAudioCtx = new AudioContextClass();
        }
      }

      if (!this.sharedAudioCtx) return;

      const ctx = this.sharedAudioCtx;

      const runOscillators = () => {
        try {
          const now = ctx.currentTime;

          // Master Gain Node
          const master = ctx.createGain();
          master.gain.setValueAtTime(vol * 0.9, now);
          master.connect(ctx.destination);

          // Note 1: High E6 (1318.51 Hz)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(1318.51, now);
          gain1.gain.setValueAtTime(0.8, now);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(master);
          osc1.start(now);
          osc1.stop(now + 0.4);

          // Note 2: Higher B6 (1975.53 Hz)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1975.53, now + 0.12);
          gain2.gain.setValueAtTime(0.9, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
          osc2.connect(gain2);
          gain2.connect(master);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.7);

          // Note 3: High E7 (2637.02 Hz) accent chime
          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(2637.02, now + 0.25);
          gain3.gain.setValueAtTime(0.8, now + 0.25);
          gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
          osc3.connect(gain3);
          gain3.connect(master);
          osc3.start(now + 0.25);
          osc3.stop(now + 0.85);
        } catch (err) {
          console.warn('[WhatsApp Notification Engine] Audio execution error:', err);
        }
      };

      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => runOscillators())
          .catch(() => runOscillators());
      } else {
        runOscillators();
      }
    } catch (e) {
      console.warn('[WhatsApp Notification Engine] Web Audio API error:', e);
    }
  }

  /**
   * Speech Synthesis Voice Alert ("Hi, you have a new message.")
   */
  public speakVoiceAlert(customText?: string, customVolume?: number): void {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const text = customText || this.settings.voiceText || 'Hi, you have a new message.';
      const vol = (customVolume !== undefined ? customVolume : this.settings.volume) / 100;

      if (vol <= 0) return;

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Cancel previous speech if still talking
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = vol;
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.lang = 'en-US';

      // Select female/natural clear voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const match = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Zira') ||
              v.name.includes('Victoria'))
        ) || voices.find((v) => v.lang.startsWith('en'));

        if (match) {
          utterance.voice = match;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[WhatsApp Notification Engine] Speech synthesis error:', e);
    }
  }

  public stopSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  /**
   * Browser Desktop Notification Trigger
   */
  public triggerDesktopNotification(title: string, body: string): void {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'whatsapp-alert',
          renotify: true,
        } as any);

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (e) {
      console.warn('[WhatsApp Notification Engine] Desktop notification error:', e);
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notifyListeners();
      return permission;
    }
    return 'denied';
  }

  // =========================================================================
  // REPEAT TIMER & DOCUMENT TITLE FLASHING
  // =========================================================================

  private startRepeatLoop(): void {
    this.stopRepeatLoop();
    const intervalMs = Math.max(1, this.settings.repeatIntervalSec) * 1000;
    this.intervalTimer = setInterval(() => {
      this.executeRepeatTick();
    }, intervalMs);
  }

  private stopRepeatLoop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private restartRepeatLoop(): void {
    this.startRepeatLoop();
  }

  private checkAndStopAudioIfCleared(): void {
    if (this.getUnreadCount() === 0) {
      this.stopSpeech();
      this.restoreDocumentTitle();
    }
  }

  private updateDocumentTitleFlashing(): void {
    const unreadCount = this.getUnreadCount();
    if (unreadCount === 0) {
      this.restoreDocumentTitle();
      return;
    }

    if (!this.titleFlashTimer) {
      this.titleFlashTimer = setInterval(() => {
        this.isTitleFlashing = !this.isTitleFlashing;
        if (this.getUnreadCount() === 0) {
          this.restoreDocumentTitle();
          return;
        }
        document.title = this.isTitleFlashing
          ? `🔔 (${unreadCount}) NEW WHATSAPP MESSAGE!`
          : `💬 (${unreadCount}) Message Alert - Efilingg CRM`;
      }, 1000);
    }
  }

  private restoreDocumentTitle(): void {
    if (this.titleFlashTimer) {
      clearInterval(this.titleFlashTimer);
      this.titleFlashTimer = null;
    }
    document.title = this.originalDocumentTitle || 'Efilingg CRM Enterprise';
  }

  // =========================================================================
  // SUBSCRIBER LISTENERS
  // =========================================================================

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('[WhatsApp Notification Engine] Listener error:', e);
      }
    });
  }
}

export const WhatsAppNotificationEngine = new WhatsAppNotificationEngineClass();
