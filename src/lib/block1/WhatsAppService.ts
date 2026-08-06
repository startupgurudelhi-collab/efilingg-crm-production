/**
 * Enterprise WhatsApp Cloud API Integration Engine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Implements Webhook Verification, Webhook Receiver, Inbound Messaging,
 * Outbound Messaging, Delivery/Read Status tracking, and Media Metadata Support.
 */

import { AttachmentV2, DeliveryStatus, MessageV2 } from './types';
import { LeadEngineService, IngestionResult } from './LeadEngineService';
import { WhatsAppMediaService } from './WhatsAppMediaService';
import { LegomarkCPaaSService } from './LegomarkCPaaSService';
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
  public static async processWebhook(payload: WhatsAppWebhookPayload): Promise<{
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  }> {
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

                // Requirement 1: Parse image, document, audio, video, sticker media IDs from incoming webhook
                const msgType = msgObj.type || '';
                const img = msgObj.image;
                const doc = msgObj.document;
                const audio = msgObj.audio || msgObj.voice;
                const video = (msgObj as any).video;
                const sticker = (msgObj as any).sticker;

                let mediaId = '';
                let mimeType = '';
                let filename = '';
                let caption = '';
                let fileTypeCategory = 'DOCUMENT';

                if (img || msgType === 'image') {
                  mediaId = img?.id || (msgObj as any).id || '';
                  mimeType = img?.mime_type || 'image/jpeg';
                  caption = img?.caption || '';
                  messageText = caption || '[Image Received]';
                  fileTypeCategory = 'IMAGE';
                } else if (doc || msgType === 'document') {
                  mediaId = doc?.id || '';
                  mimeType = doc?.mime_type || 'application/pdf';
                  filename = doc?.filename || '';
                  caption = doc?.caption || '';
                  messageText = caption || `[Document: ${filename || 'File'}]`;
                  fileTypeCategory = 'DOCUMENT';
                } else if (audio || msgType === 'audio' || msgType === 'voice') {
                  mediaId = audio?.id || '';
                  mimeType = audio?.mime_type || 'audio/ogg';
                  messageText = '[Voice Note / Audio Message]';
                  fileTypeCategory = 'AUDIO';
                } else if (video || msgType === 'video') {
                  mediaId = video?.id || '';
                  mimeType = video?.mime_type || 'video/mp4';
                  caption = video?.caption || '';
                  messageText = caption || '[Video Received]';
                  fileTypeCategory = 'VIDEO';
                } else if (sticker || msgType === 'sticker') {
                  mediaId = sticker?.id || '';
                  mimeType = sticker?.mime_type || 'image/webp';
                  messageText = '[Sticker Received]';
                  fileTypeCategory = 'IMAGE';
                } else if (msgObj.text?.body) {
                  messageText = msgObj.text.body;
                } else if (typeof msgObj.text === 'string') {
                  messageText = msgObj.text;
                } else if ((msgObj as any).body) {
                  messageText = (msgObj as any).body;
                } else {
                  messageText = `[Media/Interactive Message: ${msgType || 'unknown'}]`;
                }

                // Execute production Media Downloader if mediaId exists
                if (mediaId) {
                  try {
                    const mediaRecord = await WhatsAppMediaService.downloadAndCacheMedia({
                      mediaId,
                      mimeType,
                      filename,
                      caption,
                    });

                    attachments.push({
                      id: `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      fileName: mediaRecord.filename,
                      fileType: fileTypeCategory,
                      mimeType: mediaRecord.mime_type,
                      fileSize: mediaRecord.size,
                      url: mediaRecord.public_url,
                      whatsappMediaId: mediaId,
                    });
                  } catch (mErr) {
                    console.error(`[WhatsAppService] Error downloading media ${mediaId}:`, mErr);
                  }
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
                  srno: (msgObj as any).srno || (value as any).srno || (payload as any).srno,
                  wabaSrno: (msgObj as any).wabaSrno || (value as any).wabaSrno || (payload as any).wabaSrno,
                  wabaNumber: (msgObj as any).wabaNumber || (value as any).wabaNumber || (payload as any).wabaNumber,
                  mobile: senderPhone,
                  contactName: profileName,
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
            srno: pAny.srno || pAny.sr_no,
            wabaSrno: pAny.wabaSrno || pAny.waba_srno,
            wabaNumber: pAny.wabaNumber || pAny.waba_number,
            mobile: String(senderPhone),
            contactName: String(profileName),
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
   * Send Outbound Message to WhatsApp Customer via Legomark CPaaS Official Transport
   */
  public static async sendOutboundMessageAsync(options: {
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    attachments?: AttachmentV2[];
  }): Promise<MessageV2> {
    return LegomarkCPaaSService.sendOutboundMessageAsync(options);
  }

  /**
   * Send Outbound Message to WhatsApp Customer (Sync wrapper)
   */
  public static sendOutboundMessage(options: {
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    attachments?: AttachmentV2[];
  }): MessageV2 {
    return LegomarkCPaaSService.sendOutboundMessage(options);
  }
}
