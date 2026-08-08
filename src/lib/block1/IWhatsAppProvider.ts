/**
 * WhatsApp Provider Abstraction Interface
 * 
 * Supports parallel co-existence of Meta WhatsApp Cloud API and Legomark CPaaS.
 */

import { AttachmentV2, MessageV2 } from './types';
import { IngestionResult } from './LeadEngineService';
import { WhatsAppWebhookPayload } from './WhatsAppService';

export interface SendOutboundOptions {
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: AttachmentV2[];
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<Record<string, unknown>>;
}

export interface SendTemplateOptions {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
}

export interface SendMediaOptions {
  toPhone: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  mediaUrl: string;
  caption?: string;
  filename?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
}

export type WhatsAppProviderName = 'META_CLOUD_API' | 'LEGOMARK_CPAAS';

export interface IWhatsAppProvider {
  /**
   * Returns identifier for current active provider
   */
  getProviderName(): WhatsAppProviderName;

  /**
   * Verifies incoming webhook challenge (for Meta or CPaaS verification)
   */
  verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): { verified: boolean; challenge?: string; reason?: string };

  /**
   * Processes inbound webhook payload (messages, status updates)
   */
  processWebhook(payload: WhatsAppWebhookPayload): Promise<{
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  }>;

  /**
   * Asynchronously sends an outbound message via the provider
   */
  sendOutboundMessageAsync(options: SendOutboundOptions): Promise<MessageV2>;

  /**
   * Synchronous wrapper for sending an outbound message
   */
  sendOutboundMessage(options: SendOutboundOptions): MessageV2;

  /**
   * Sends structured WhatsApp Template message (for OTP, Invoices, Reminders)
   */
  sendTemplateMessageAsync(options: SendTemplateOptions): Promise<MessageV2>;

  /**
   * Sends media message (Images, Documents, Audio, Video)
   */
  sendMediaMessageAsync(options: SendMediaOptions): Promise<MessageV2>;
}
