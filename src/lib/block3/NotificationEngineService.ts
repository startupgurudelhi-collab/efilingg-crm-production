/**
 * Enterprise Event-Driven Notification Engine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3 - Module 4)
 *
 * Subscribes to Event Bus and dispatches real-time alerts without polling.
 */

import { eventBus } from '../eventBus';

export interface EnterpriseNotification {
  id: string;
  type:
    | 'NEW_LEAD'
    | 'NEW_MESSAGE'
    | 'EXECUTIVE_ASSIGNED'
    | 'HUMAN_TAKEOVER'
    | 'RETURN_TO_AI'
    | 'AI_ESCALATION'
    | 'PAYMENT_RECEIVED'
    | 'CONVERSATION_CLOSED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export class NotificationEngineService {
  private static activeQueue: EnterpriseNotification[] = [];
  private static maxQueueSize = 200;
  private static isSubscribed = false;

  public static initialize(): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    // 1. New Lead
    eventBus.subscribe('LeadCreated', (data) => {
      const payload = data.payload as any;
      this.pushNotification({
        type: 'NEW_LEAD',
        title: '🎯 New Lead Ingested',
        message: `Lead ${payload?.name || 'Inbound Contact'} created via ${payload?.campaignSource || 'WhatsApp'}.`,
        metadata: payload,
      });
    });

    // 2. New Message
    eventBus.subscribe('ConversationCreated', (data) => {
      const payload = data.payload as any;
      this.pushNotification({
        type: 'NEW_MESSAGE',
        title: '💬 Inbound WhatsApp Message',
        message: `New message received from ${payload?.contactNumber || 'Customer'}.`,
        metadata: payload,
      });
    });

    // 3. Executive Assigned / Human Takeover
    eventBus.subscribe('ConversationAssigned', (data) => {
      const payload = data.payload as any;
      const isHuman = payload?.assignedType === 'HUMAN_EXECUTIVE';
      this.pushNotification({
        type: isHuman ? 'HUMAN_TAKEOVER' : 'RETURN_TO_AI',
        title: isHuman ? '👤 Executive Takeover' : '🤖 Handed to AI Assistant',
        message: isHuman
          ? `Conversation ${payload?.conversationId} assigned to executive ${payload?.assignedTo || 'Staff'}.`
          : `Conversation ${payload?.conversationId} returned to automated AI bot handling.`,
        metadata: payload,
      });
    });

    // 4. Conversation State Changed
    eventBus.subscribe('ConversationStateChanged', (data) => {
      const payload = data.payload as any;
      if (payload?.newState === 'PAYMENT_RECEIVED') {
        this.pushNotification({
          type: 'PAYMENT_RECEIVED',
          title: '💳 Payment Received',
          message: `Payment confirmed for conversation ${payload?.conversationId}.`,
          metadata: payload,
        });
      } else if (payload?.newState === 'CLOSED') {
        this.pushNotification({
          type: 'CONVERSATION_CLOSED',
          title: '🔒 Conversation Closed',
          message: `Conversation ${payload?.conversationId} closed.`,
          metadata: payload,
        });
      }
    });

    console.log('[NotificationEngineService] Initialized and subscribed to EventBus.');
  }

  private static pushNotification(item: Omit<EnterpriseNotification, 'id' | 'timestamp' | 'read'>): void {
    const notif: EnterpriseNotification = {
      ...item,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.activeQueue.unshift(notif);
    if (this.activeQueue.length > this.maxQueueSize) {
      this.activeQueue.pop();
    }
  }

  public static getNotifications(): EnterpriseNotification[] {
    return [...this.activeQueue];
  }

  public static markAsRead(id: string): void {
    const item = this.activeQueue.find((n) => n.id === id);
    if (item) item.read = true;
  }

  public static getQueueStatus(): 'HEALTHY' | 'DEGRADED' | 'PAUSED' {
    return this.activeQueue.length < this.maxQueueSize ? 'HEALTHY' : 'DEGRADED';
  }
}
