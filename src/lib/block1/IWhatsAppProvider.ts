/**
 * WhatsApp Provider Abstraction Interface
 * 
 * Meta WhatsApp Cloud API Provider for Official WhatsApp Business Integration.
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
  headerText?: string;
  bodyParameters?: string[];
}

export interface StandardWhatsAppTemplate {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  description: string;
  bodyText: string;
  parameterCount: number;
  sampleParameters: string[];
}

export interface ConversationWindowStatus {
  is24hWindowActive: boolean;
  lastInboundTimestamp?: string;
  expiresAt?: string;
  remainingMinutes: number;
  formattedRemainingTime: string;
  requiresTemplate: boolean;
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

export interface SendDirectTextOptions {
  toPhone: string;
  message: string;
  senderId?: string;
  senderName?: string;
  conversationId?: string;
}

export type WhatsAppProviderName = 'META_CLOUD_API';

export interface IWhatsAppProvider {
  /**
   * Returns identifier for current active provider
   */
  getProviderName(): WhatsAppProviderName;

  /**
   * Verifies incoming webhook challenge (for Meta Cloud API verification)
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

  /**
   * Sends direct text WhatsApp message to a specific phone number
   */
  sendDirectTextMessageAsync(options: SendDirectTextOptions): Promise<MessageV2>;
}
