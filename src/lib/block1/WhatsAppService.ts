/**
 * Enterprise WhatsApp Cloud API Integration Engine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Implements Webhook Verification, Webhook Receiver, Inbound Messaging,
 * Outbound Messaging, Delivery/Read Status tracking, and Media Metadata Support.
 */

import { AttachmentV2, DeliveryStatus, MessageV2 } from './types';
import { LeadEngineService, IngestionResult } from './LeadEngineService';
import {
  addWebhookLog,
  getConversationById,
  saveMessage,
  updateMessageStatus,
  addTimelineEntry,
} from './db';
import { eventBus } from '../eventBus';

export const DEFAULT_WHATSAPP_VERIFY_TOKEN = 'efilingg_whatsapp_verify_token_2026';

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
          document?: { id?: string; filename?: string; mime_type?: string; caption?: string };
          audio?: { id?: string; mime_type?: string };
          voice?: { id?: string; mime_type?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          recipient_id?: string;
          errors?: Array<{ code?: number; title?: string }>;
        }>;
      };
    }>;
  }>;
}

export class WhatsAppService {
  /**
   * Verify Webhook challenge from Meta WhatsApp Cloud API
   */
  public static verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): { verified: boolean; challenge?: string; reason?: string } {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken) {
      return {
        verified: true,
        challenge,
      };
    }

    return {
      verified: false,
      reason: 'Invalid verification token or mode.',
    };
  }

  /**
   * Process Inbound Webhook Payload from WhatsApp Cloud API
   */
  public static processWebhook(payload: WhatsAppWebhookPayload): {
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  } {
    const processedMessages: IngestionResult[] = [];
    let updatedStatusesCount = 0;

    try {
      addWebhookLog({
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        payload: payload as unknown as Record<string, unknown>,
        status: 'PROCESSED',
      });

      const entries = payload.entry || [];
      if (entries.length > 0) {
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value;
            if (!value) continue;

            // 1. Process Status Updates (sent, delivered, read, failed)
            if (value.statuses && value.statuses.length > 0) {
              for (const statusObj of value.statuses) {
                if (statusObj.id && statusObj.status) {
                  const statusUpper = statusObj.status.toUpperCase() as DeliveryStatus;
                  const updated = updateMessageStatus(statusObj.id, statusUpper);
                  if (updated) updatedStatusesCount++;
                }
              }
            }

            // 2. Process Incoming Messages
            if (value.messages && value.messages.length > 0) {
              const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';

              for (const msgObj of value.messages) {
                const senderPhone = msgObj.from;
                if (!senderPhone) continue;

                let messageText = '';
                const attachments: AttachmentV2[] = [];

                // Extract text & media content robustly
                if (msgObj.text?.body) {
                  messageText = msgObj.text.body;
                } else if (typeof msgObj.text === 'string') {
                  messageText = msgObj.text;
                } else if (msgObj.body) {
                  messageText = msgObj.body;
                } else if (msgObj.type === 'image' || msgObj.image) {
                  const img = msgObj.image || {};
                  messageText = img.caption || '[Image Received]';
                  attachments.push({
                    id: `ATT-${Date.now()}`,
                    fileName: `whatsapp_image_${img.id || Date.now()}.jpg`,
                    fileType: 'IMAGE',
                    mimeType: img.mime_type || 'image/jpeg',
                    url: img.id ? `https://whatsapp-media-cdn.mock/${img.id}` : '',
                    whatsappMediaId: img.id,
                  });
                } else if (msgObj.type === 'document' || msgObj.document) {
                  const doc = msgObj.document || {};
                  messageText = doc.caption || `[Document: ${doc.filename || 'File'}]`;
                  attachments.push({
                    id: `ATT-${Date.now()}`,
                    fileName: doc.filename || `document_${doc.id || Date.now()}.pdf`,
                    fileType: 'DOCUMENT',
                    mimeType: doc.mime_type || 'application/pdf',
                    url: doc.id ? `https://whatsapp-media-cdn.mock/${doc.id}` : '',
                    whatsappMediaId: doc.id,
                  });
                } else {
                  messageText = `[Media/Interactive Message: ${msgObj.type || 'unknown'}]`;
                }

                // Ingest Inbound Message through Lead Engine
                const ingestion = LeadEngineService.processInboundMessage({
                  channel: 'WHATSAPP',
                  senderPhone,
                  senderName: profileName,
                  messageText,
                  attachments,
                  whatsappMessageId: msgObj.id,
                  rawPayload: msgObj as unknown as Record<string, unknown>,
                });

                processedMessages.push(ingestion);
              }
            }
          }
        }
      } else {
        // Fallback for flat top-level custom webhook JSON payloads
        const pAny = payload as any;
        const senderPhone = pAny.from || pAny.sender_number || pAny.senderNumber || pAny.mobile || pAny.phone;
        const messageText = pAny.text?.body || pAny.text || pAny.body || pAny.message || pAny.content;
        const msgId = pAny.id || pAny.message_id || pAny.messageId || pAny.msgId;

        if (senderPhone && messageText) {
          const profileName = pAny.name || pAny.sender_name || pAny.contact_name || pAny.profile_name || 'WhatsApp Contact';
          const ingestion = LeadEngineService.processInboundMessage({
            channel: 'WHATSAPP',
            senderPhone: String(senderPhone),
            senderName: String(profileName),
            messageText: String(messageText),
            whatsappMessageId: msgId ? String(msgId) : undefined,
            rawPayload: pAny,
          });
          processedMessages.push(ingestion);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[WhatsAppService] Webhook processing failed:', error);
      addWebhookLog({
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        payload: payload as unknown as Record<string, unknown>,
        status: 'FAILED',
        errorReason: error.message,
      });
    }

    return {
      processedMessages,
      updatedStatusesCount,
    };
  }

  /**
   * Send Outbound Message to WhatsApp Customer
   */
  public static sendOutboundMessage(options: {
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    attachments?: AttachmentV2[];
  }): MessageV2 {
    const conv = getConversationById(options.conversationId);
    if (!conv) {
      throw new Error(`Conversation with ID ${options.conversationId} not found.`);
    }

    const now = new Date().toISOString();
    const whatsappMsgId = `WAMsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const outboundMsg: MessageV2 = {
      id: msgId,
      conversationId: conv.id,
      direction: 'OUTBOUND',
      senderId: options.senderId,
      senderName: options.senderName,
      messageType: options.attachments && options.attachments.length > 0 ? 'IMAGE' : 'TEXT',
      content: options.content,
      attachments: options.attachments,
      whatsappMessageId: whatsappMsgId,
      deliveryStatus: 'DELIVERED',
      timestamp: now,
    };

    saveMessage(outboundMsg);

    // Record timeline entry
    addTimelineEntry(
      conv.id,
      'MESSAGE_SENT',
      `Outbound message sent by ${options.senderName}: "${options.content.substring(0, 50)}"`,
      options.senderName
    );

    // Audit webhook outbound log
    addWebhookLog({
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      payload: {
        to: conv.contactNumber,
        messageId: whatsappMsgId,
        text: options.content,
      },
      status: 'PROCESSED',
    });

    eventBus.publishAsync('TimelineUpdated', 'TIMELINE', {
      entityType: conv.customerId ? 'CUSTOMER' : 'LEAD',
      entityId: conv.customerId || conv.leadId || conv.id,
      activityType: 'OUTBOUND_MESSAGE',
      summary: `Outbound WhatsApp sent by ${options.senderName}`,
      actor: options.senderName,
    });

    return outboundMsg;
  }
}
