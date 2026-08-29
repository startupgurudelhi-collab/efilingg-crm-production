/**
 * Meta WhatsApp Cloud API Provider Implementation
 * 
 * Official Meta WhatsApp Graph API integration.
 * Supports Text, Templates (OTP, Invoices, Reminders), Media (Images, Documents, Audio, Video),
 * Webhook Verification, and Delivery Status Callbacks.
 */

import {
  IWhatsAppProvider,
  SendMediaOptions,
  SendOutboundOptions,
  SendTemplateOptions,
  WhatsAppProviderName,
} from './IWhatsAppProvider';
import { AttachmentV2, DeliveryStatus, MessageV2 } from './types';
import { LeadEngineService, IngestionResult } from './LeadEngineService';
import { WhatsAppMediaService } from './WhatsAppMediaService';
import { WhatsAppWebhookPayload } from './WhatsAppService';
import { isForbiddenCPaaSPayload, isForbiddenCPaaSPhone } from './cpaasFilter';
import {
  addWebhookLog,
  getConversationById,
  saveConversation,
  saveMessage,
  updateMessageStatus,
  addTimelineEntry,
  getConversations,
} from './db';
import { eventBus } from '../eventBus';

export const DEFAULT_META_GRAPH_VERSION = 'v25.0';
export const DEFAULT_META_VERIFY_TOKEN = 'efilingg_whatsapp_verify_token_2026';

export function maskToken(token?: string): string {
  if (!token || token.trim() === '') return 'MISSING';
  const trimmed = token.trim();
  if (trimmed.length <= 8) return '****';
  const start = trimmed.substring(0, 4);
  const end = trimmed.substring(trimmed.length - 4);
  return `${start}****************${end}`;
}

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  public getProviderName(): WhatsAppProviderName {
    return 'META_CLOUD_API';
  }

  /**
   * Meta Webhook Verification (GET hub.verify_token)
   */
  public verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): { verified: boolean; challenge?: string; reason?: string } {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_META_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WHATSAPP WEBHOOK VERIFIED] Meta Cloud API Webhook challenge verified successfully.');
      return {
        verified: true,
        challenge,
      };
    }

    console.warn('[WHATSAPP WEBHOOK VERIFICATION FAILED] Token mismatch or mode invalid.');
    return {
      verified: false,
      reason: 'Invalid verification token or mode.',
    };
  }

  /**
   * Process incoming Webhook payload from Meta WhatsApp Cloud API
   */
  public async processWebhook(payload: WhatsAppWebhookPayload): Promise<{
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  }> {
    console.log('[WHATSAPP WEBHOOK RECEIVED] Processing incoming Meta Cloud API webhook payload.');
    const processedMessages: IngestionResult[] = [];
    let updatedStatusesCount = 0;

    // Reject any legacy CPaaS payloads or CPaaS numbers
    if (isForbiddenCPaaSPayload(payload)) {
      console.warn('[MetaWhatsAppProvider] Ignored legacy CPaaS webhook payload to prevent CPaaS number collision.');
      return { processedMessages: [], updatedStatusesCount: 0 };
    }

    try {
      addWebhookLog({
        channel: 'WHATSAPP_META',
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
                  const errObj = statusObj.errors?.[0];
                  const errTitle = errObj?.title || (errObj as { message?: string })?.message;
                  const errCode = errObj?.code;
                  const failureReason = errTitle ? `${errTitle}${errCode ? ` (Code ${errCode})` : ''}` : undefined;

                  const updated = updateMessageStatus(statusObj.id, statusUpper, {
                    timestamp: statusObj.timestamp,
                    failure_reason: failureReason,
                    errorCode: errCode,
                    raw_status_payload: statusObj,
                  });
                  if (updated) updatedStatusesCount++;
                  console.log(`[WHATSAPP STATUS UPDATED] Message ID "${statusObj.id}" delivery status updated to "${statusUpper}" (Recipient: ${statusObj.recipient_id || 'N/A'})`);
                }
              }
            }

            // 2. Process Incoming Messages
            if (value.messages && value.messages.length > 0) {
              const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';

              for (const msgObj of value.messages) {
                const senderPhone = msgObj.from;
                if (!senderPhone) continue;

                // Ignore if sender is legacy CPaaS test number
                if (isForbiddenCPaaSPhone(senderPhone)) {
                  console.warn('[MetaWhatsAppProvider] Ignored message from legacy CPaaS number:', senderPhone);
                  continue;
                }

                let messageText = '';
                const attachments: AttachmentV2[] = [];

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
                  mediaId = img?.id || (msgObj as any).image?.id || (msgObj as any).media_id || '';
                  mimeType = img?.mime_type || 'image/jpeg';
                  caption = img?.caption || '';
                  messageText = caption || '[Image Received]';
                  fileTypeCategory = 'IMAGE';
                  filename = filename || `whatsapp_image_${mediaId || Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;
                  console.log('[WEBHOOK_INBOUND_IMAGE_RECEIVED]', { msgType: 'image', senderPhone, wamid: msgObj.id, mediaId, mimeType, caption, timestamp: new Date().toISOString() });
                  console.log('[MEDIA WEBHOOK RECEIVED]', { msgType: 'image', senderPhone, wamid: msgObj.id, timestamp: new Date().toISOString() });
                  console.log('[MEDIA ID EXTRACTED]', { mediaId, mimeType, caption, timestamp: new Date().toISOString() });
                } else if (doc || msgType === 'document') {
                  mediaId = doc?.id || (msgObj as any).document?.id || '';
                  mimeType = doc?.mime_type || 'application/pdf';
                  filename = doc?.filename || `whatsapp_doc_${mediaId || Date.now()}.${mimeType.includes('pdf') ? 'pdf' : 'bin'}`;
                  caption = doc?.caption || '';
                  messageText = caption || `[Document: ${filename || 'File'}]`;
                  fileTypeCategory = 'DOCUMENT';
                  console.log('[MEDIA WEBHOOK RECEIVED]', { msgType: 'document', senderPhone, wamid: msgObj.id, timestamp: new Date().toISOString() });
                  console.log('[MEDIA ID EXTRACTED]', { mediaId, mimeType, filename, caption, timestamp: new Date().toISOString() });
                } else if (audio || msgType === 'audio' || msgType === 'voice') {
                  mediaId = audio?.id || (msgObj as any).audio?.id || (msgObj as any).voice?.id || '';
                  mimeType = audio?.mime_type || 'audio/ogg';
                  filename = `whatsapp_audio_${mediaId || Date.now()}.${mimeType.includes('mp3') ? 'mp3' : 'ogg'}`;
                  messageText = '[Voice Note / Audio Message]';
                  fileTypeCategory = 'AUDIO';
                  console.log('[MEDIA WEBHOOK RECEIVED]', { msgType: 'audio', senderPhone, wamid: msgObj.id, timestamp: new Date().toISOString() });
                  console.log('[MEDIA ID EXTRACTED]', { mediaId, mimeType, timestamp: new Date().toISOString() });
                } else if (video || msgType === 'video') {
                  mediaId = video?.id || (msgObj as any).video?.id || '';
                  mimeType = video?.mime_type || 'video/mp4';
                  caption = video?.caption || '';
                  filename = `whatsapp_video_${mediaId || Date.now()}.mp4`;
                  messageText = caption || '[Video Received]';
                  fileTypeCategory = 'VIDEO';
                  console.log('[MEDIA WEBHOOK RECEIVED]', { msgType: 'video', senderPhone, wamid: msgObj.id, timestamp: new Date().toISOString() });
                  console.log('[MEDIA ID EXTRACTED]', { mediaId, mimeType, timestamp: new Date().toISOString() });
                } else if (sticker || msgType === 'sticker') {
                  mediaId = sticker?.id || (msgObj as any).sticker?.id || '';
                  mimeType = sticker?.mime_type || 'image/webp';
                  filename = `whatsapp_sticker_${mediaId || Date.now()}.webp`;
                  messageText = '[Sticker Received]';
                  fileTypeCategory = 'IMAGE';
                  console.log('[MEDIA WEBHOOK RECEIVED]', { msgType: 'sticker', senderPhone, wamid: msgObj.id, timestamp: new Date().toISOString() });
                  console.log('[MEDIA ID EXTRACTED]', { mediaId, mimeType, timestamp: new Date().toISOString() });
                } else if (msgObj.text?.body) {
                  messageText = msgObj.text.body;
                } else if (typeof msgObj.text === 'string') {
                  messageText = msgObj.text;
                } else if ((msgObj as any).body) {
                  messageText = (msgObj as any).body;
                } else {
                  messageText = `[Media/Interactive Message: ${msgType || 'unknown'}]`;
                }

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
                    console.error(`[MetaWhatsAppProvider] Error downloading media ${mediaId}:`, mErr);
                  }
                }

                const ingestion = LeadEngineService.processInboundMessage({
                  channel: 'WHATSAPP',
                  senderPhone,
                  senderName: profileName,
                  messageText,
                  attachments,
                  whatsappMessageId: msgObj.id,
                  rawPayload: msgObj as unknown as Record<string, unknown>,
                  mobile: senderPhone,
                  contactName: profileName,
                });

                processedMessages.push(ingestion);
              }
            }
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[MetaWhatsAppProvider] Webhook processing failed:', error);
      addWebhookLog({
        channel: 'WHATSAPP_META',
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
   * Helper to execute HTTP request against Meta Graph API
   */
  private async executeMetaGraphApiRequest(metaPayload: Record<string, unknown>): Promise<{
    httpStatusCode: number;
    responseBodyText: string;
    parsedResponse: any;
    providerMessageId?: string;
    success: boolean;
    errorCode?: string | number;
    errorMessage?: string;
  }> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const graphVersion = process.env.META_GRAPH_VERSION || DEFAULT_META_GRAPH_VERSION;
    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || ''}`,
    };

    console.log(`===================================================================`);
    console.log(`[META WHATSAPP CLOUD API TRANSPORT DIAGNOSTICS]`);
    console.log(`URL             : ${url}`);
    console.log(`Method          : POST`);
    console.log(`Phone Number ID : ${phoneNumberId}`);
    console.log(`Graph Version   : ${graphVersion}`);
    console.log(`Masked Token    : ${maskToken(accessToken)}`);
    console.log(`Request Payload :\n${JSON.stringify(metaPayload, null, 2)}`);
    console.log(`===================================================================`);

    let httpStatusCode = 0;
    let responseBodyText = '';
    let parsedResponse: any = null;
    let success = false;
    let providerMessageId: string | undefined = undefined;
    let errorCode: string | number | undefined = undefined;
    let errorMessage: string | undefined = undefined;

    if (!accessToken || accessToken.trim() === '') {
      console.warn(`[MetaWhatsAppProvider Warning] WHATSAPP_ACCESS_TOKEN environment variable is missing. Simulating Meta Cloud API response...`);
      httpStatusCode = 200;
      providerMessageId = `wamid.HBgL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      parsedResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: metaPayload.to, wa_id: metaPayload.to }],
        messages: [{ id: providerMessageId }],
      };
      responseBodyText = JSON.stringify(parsedResponse);
      success = true;
      return {
        httpStatusCode,
        responseBodyText,
        parsedResponse,
        providerMessageId,
        success,
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(metaPayload),
      });

      httpStatusCode = response.status;
      responseBodyText = await response.text();

      try {
        parsedResponse = JSON.parse(responseBodyText);
      } catch (_) {
        parsedResponse = { raw: responseBodyText };
      }

      if (httpStatusCode >= 200 && httpStatusCode < 300 && parsedResponse?.messages?.[0]?.id) {
        success = true;
        providerMessageId = parsedResponse.messages[0].id;
      } else {
        success = false;
        errorCode = parsedResponse?.error?.code || httpStatusCode;
        const rawMsg = parsedResponse?.error?.message || `Meta API HTTP ${httpStatusCode}`;
        const errorDetails = parsedResponse?.error?.error_data?.details || '';

        if (errorCode === 131047 || rawMsg.includes('24 hours') || errorDetails.includes('24 hours')) {
          errorMessage = `Meta WhatsApp 24-Hour Policy (Code 131047): More than 24 hours have passed since customer last replied, or recipient has never messaged this WhatsApp Business Number. You MUST send an approved WhatsApp Template message to re-engage with this number.`;
        } else if (errorCode === 131026 || rawMsg.includes('undeliverable')) {
          errorMessage = `Meta WhatsApp Delivery Error (Code 131026): Message undeliverable. The phone number might not be registered on WhatsApp, or the recipient has opted out.`;
        } else if (errorCode === 132000 || errorCode === 132001 || rawMsg.includes('Template')) {
          errorMessage = `Meta Template Error (Code ${errorCode}): Template not found or parameter mismatch. Verify template name & language code in Meta WhatsApp Manager.`;
        } else if (rawMsg.includes('API access blocked') || errorCode === 200 || errorCode === 190 || parsedResponse?.error?.type === 'OAuthException') {
          errorMessage = `API access blocked by Meta (Code ${errorCode}): WHATSAPP_ACCESS_TOKEN expired/invalid, or Meta WABA account restricted. Generate a new Permanent System User Token in Meta Business Manager.`;
        } else {
          errorMessage = errorDetails ? `${rawMsg} (${errorDetails})` : rawMsg;
        }
      }
    } catch (err: any) {
      httpStatusCode = 500;
      success = false;
      errorCode = 'NETWORK_ERROR';
      errorMessage = err.message;
      responseBodyText = err.message;
      parsedResponse = { error: err.message };
    }

    return {
      httpStatusCode,
      responseBodyText,
      parsedResponse,
      providerMessageId,
      success,
      errorCode,
      errorMessage,
    };
  }

  /**
   * Asynchronously send outbound text/media message via Meta Cloud API
   */
  public async sendOutboundMessageAsync(options: SendOutboundOptions): Promise<MessageV2> {
    const conv = getConversationById(options.conversationId);
    if (!conv) {
      throw new Error(`Conversation with ID ${options.conversationId} not found.`);
    }

    const rawMobile = conv.mobile || conv.contactNumber || '';
    const cleanPhone = rawMobile.replace(/\D/g, '');
    const mobile = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;

    const now = new Date().toISOString();
    const tempWamid = `wamid.temp-${Date.now()}`;
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
      whatsappMessageId: tempWamid,
      deliveryStatus: 'SENDING',
      timestamp: now,
    };

    saveMessage(outboundMsg);

    const messageText = (options.content || '').trim();

    if (!messageText && (!options.attachments || options.attachments.length === 0)) {
      console.error('[AI_EMPTY_RESPONSE]', '[WHATSAPP_SEND_ERROR]', 'Attempted to send empty outbound text message. Aborting. Parameter text.body is required.');
      outboundMsg.deliveryStatus = 'FAILED';
      outboundMsg.failure_reason = 'The parameter text.body is required';
      outboundMsg.failed_at = new Date().toISOString();
      saveMessage(outboundMsg);
      throw new Error('The parameter text.body is required');
    }

    // Build standard Meta WhatsApp Cloud API request payload
    let metaPayload: Record<string, unknown> = {};

    if (options.templateName) {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: mobile,
        type: 'template',
        template: {
          name: options.templateName,
          language: { code: options.templateLanguage || 'en_US' },
          components: options.templateComponents || [],
        },
      };
      outboundMsg.messageType = 'TEMPLATE';
    } else if (options.attachments && options.attachments.length > 0) {
      const att = options.attachments[0];
      const mediaTypeLower = (att.fileType || 'document').toLowerCase();
      const metaType = ['image', 'document', 'audio', 'video'].includes(mediaTypeLower)
        ? mediaTypeLower
        : 'document';

      let mediaUrl = att.url;
      if (mediaUrl && mediaUrl.startsWith('/')) {
        const baseUrl = process.env.APP_URL || 'https://ais-dev-sspqobfvu5h7novljinqdy-160367546751.asia-southeast1.run.app';
        mediaUrl = `${baseUrl}${mediaUrl}`;
      }

      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: mobile,
        type: metaType,
        [metaType]: {
          link: mediaUrl,
          caption: messageText || undefined,
          filename: att.fileName || undefined,
        },
      };
    } else {
      metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: mobile,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      };
    }

    // Diagnostics Logging
    console.log('[WHATSAPP_PAYLOAD]', JSON.stringify(metaPayload));

    const result = await this.executeMetaGraphApiRequest(metaPayload);

    if (!result.success) {
      console.error('[WHATSAPP_SEND_ERROR]', result.errorMessage || 'Outbound WhatsApp delivery failed', {
        errorCode: result.errorCode,
        httpStatus: result.httpStatusCode,
        parsedResponse: result.parsedResponse || result.responseBodyText,
      });
    }

    const resolvedMessageId = result.providerMessageId || tempWamid;
    const finalStatus: DeliveryStatus = result.success ? 'SENT' : 'FAILED';

    outboundMsg.deliveryStatus = finalStatus;
    outboundMsg.status = finalStatus.toLowerCase();
    outboundMsg.whatsappMessageId = resolvedMessageId;
    outboundMsg.providerMessageId = resolvedMessageId;
    outboundMsg.meta_message_id = resolvedMessageId;
    outboundMsg.rawProviderResponse = result.parsedResponse || result.responseBodyText;
    outboundMsg.providerSuccess = result.success;
    outboundMsg.providerErrorCode = result.errorCode;
    outboundMsg.providerErrorMessage = result.errorMessage;
    outboundMsg.httpStatus = result.httpStatusCode;
    if (!result.success) {
      outboundMsg.failed_at = new Date().toISOString();
      outboundMsg.failure_reason = result.errorMessage || 'Outbound WhatsApp delivery failed';
    }
    saveMessage(outboundMsg);

    addWebhookLog({
      channel: 'WHATSAPP_META',
      direction: 'OUTBOUND',
      payload: {
        metaPayload,
        httpStatus: result.httpStatusCode,
        responseBody: result.responseBodyText,
        providerMessageId: resolvedMessageId,
        success: result.success,
        errorCode: result.errorCode || null,
        errorMessage: result.errorMessage || null,
      },
      status: result.success ? 'PROCESSED' : 'FAILED',
      errorReason: result.errorMessage,
    });

    const timelineSummary = result.success
      ? `Meta Cloud API Outbound SENT: "${options.content.substring(0, 50)}" (ID: ${resolvedMessageId})`
      : `Meta Cloud API Outbound FAILED: "${options.content.substring(0, 50)}" (${result.errorMessage || 'Error'})`;

    addTimelineEntry(conv.id, result.success ? 'MESSAGE_SENT' : 'MESSAGE_FAILED', timelineSummary, options.senderName, {
      provider: 'META_CLOUD_API',
      httpStatus: result.httpStatusCode,
      providerMessageId: resolvedMessageId,
      recipient: mobile,
    });

    eventBus.publishAsync('TimelineUpdated', 'TIMELINE', {
      entityType: conv.customerId ? 'CUSTOMER' : 'LEAD',
      entityId: conv.customerId || conv.leadId || conv.id,
      activityType: 'OUTBOUND_MESSAGE',
      summary: timelineSummary,
      actor: options.senderName,
    });

    // NOTE: Only simulate DELIVERED/READ in offline demo mode when WHATSAPP_ACCESS_TOKEN is missing.
    // In production with a real token, real delivery reports arrive via Meta Webhooks.
    if (result.success && !process.env.WHATSAPP_ACCESS_TOKEN) {
      setTimeout(() => {
        updateMessageStatus(resolvedMessageId, 'DELIVERED');
        setTimeout(() => {
          updateMessageStatus(resolvedMessageId, 'READ');
        }, 3000);
      }, 1500);
    }

    return outboundMsg;
  }

  /**
   * Synchronous wrapper for sendOutboundMessage
   */
  public sendOutboundMessage(options: SendOutboundOptions): MessageV2 {
    let convId = options.conversationId;
    let conv = getConversationById(convId);

    if (!conv) {
      const allConvs = getConversations();
      if (allConvs.length > 0) {
        conv = allConvs[0];
        convId = conv.id;
      } else {
        throw new Error(`Conversation with ID ${options.conversationId} not found.`);
      }
    }

    const now = new Date().toISOString();
    const tempWamid = `wamid.temp-${Date.now()}`;
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
      whatsappMessageId: tempWamid,
      deliveryStatus: 'SENDING',
      timestamp: now,
    };

    saveMessage(outboundMsg);

    this.sendOutboundMessageAsync(options).catch((err) => {
      console.error('[MetaWhatsAppProvider Async Error]:', err);
    });

    return outboundMsg;
  }

  /**
   * Send WhatsApp Template Message (for OTP, Invoices, Payment Reminders)
   */
  public async sendTemplateMessageAsync(options: SendTemplateOptions): Promise<MessageV2> {
    const cleanPhone = options.toPhone.replace(/\D/g, '');
    const mobile = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;

    const templateName = options.templateName;
    const languageCode = options.languageCode || 'en_US';

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mobile,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: options.components || [],
      },
    };

    const result = await this.executeMetaGraphApiRequest(metaPayload);

    const msgId = `MSG-TMPL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const resolvedMessageId = result.providerMessageId || `wamid.tmpl-${Date.now()}`;
    const finalStatus: DeliveryStatus = result.success ? 'SENT' : 'FAILED';

    const outboundMsg: MessageV2 = {
      id: msgId,
      conversationId: options.conversationId || 'SYSTEM_TEMPLATE_CONV',
      direction: 'OUTBOUND',
      senderId: options.senderId || 'SYSTEM_TEMPLATE',
      senderName: options.senderName || 'Automated Template Engine',
      messageType: 'TEMPLATE',
      content: `[WhatsApp Template: ${templateName}]`,
      whatsappMessageId: resolvedMessageId,
      providerMessageId: resolvedMessageId,
      deliveryStatus: finalStatus,
      timestamp: new Date().toISOString(),
      rawProviderResponse: result.parsedResponse || result.responseBodyText,
      providerSuccess: result.success,
      providerErrorCode: result.errorCode,
      providerErrorMessage: result.errorMessage,
      httpStatus: result.httpStatusCode,
    };

    saveMessage(outboundMsg);

    console.log(`[Meta WhatsApp Template Sent] Template: ${templateName} | Recipient: ${mobile} | Status: ${finalStatus}`);
    return outboundMsg;
  }

  /**
   * Send WhatsApp Media Message (Images, Documents, Audio, Video)
   */
  public async sendMediaMessageAsync(options: SendMediaOptions): Promise<MessageV2> {
    const cleanPhone = options.toPhone.replace(/\D/g, '');
    const mobile = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;

    const mediaType = options.mediaType;

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mobile,
      type: mediaType,
      [mediaType]: {
        link: options.mediaUrl,
        caption: options.caption || undefined,
        filename: options.filename || undefined,
      },
    };

    const result = await this.executeMetaGraphApiRequest(metaPayload);

    const msgId = `MSG-MEDIA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const resolvedMessageId = result.providerMessageId || `wamid.media-${Date.now()}`;
    const finalStatus: DeliveryStatus = result.success ? 'SENT' : 'FAILED';

    const outboundMsg: MessageV2 = {
      id: msgId,
      conversationId: options.conversationId || 'SYSTEM_MEDIA_CONV',
      direction: 'OUTBOUND',
      senderId: options.senderId || 'SYSTEM_MEDIA',
      senderName: options.senderName || 'Media Engine',
      messageType: mediaType.toUpperCase() as any,
      content: options.caption || `[Media: ${options.filename || mediaType}]`,
      attachments: [
        {
          id: `ATT-${Date.now()}`,
          fileName: options.filename || `${mediaType}_file`,
          fileType: mediaType.toUpperCase(),
          url: options.mediaUrl,
        },
      ],
      whatsappMessageId: resolvedMessageId,
      providerMessageId: resolvedMessageId,
      deliveryStatus: finalStatus,
      timestamp: new Date().toISOString(),
      rawProviderResponse: result.parsedResponse || result.responseBodyText,
      providerSuccess: result.success,
      providerErrorCode: result.errorCode,
      providerErrorMessage: result.errorMessage,
      httpStatus: result.httpStatusCode,
    };

    saveMessage(outboundMsg);

    console.log(`[Meta WhatsApp Media Sent] Type: ${mediaType} | Recipient: ${mobile} | Status: ${finalStatus}`);
    return outboundMsg;
  }

  /**
   * Send Direct Text WhatsApp Message to any destination phone number
   */
  public async sendDirectTextMessageAsync(options: {
    toPhone: string;
    message: string;
    senderId?: string;
    senderName?: string;
    conversationId?: string;
  }): Promise<MessageV2> {
    const cleanPhone = options.toPhone.replace(/\D/g, '');
    const mobile = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const messageText = (options.message || '').trim();

    if (!messageText) {
      throw new Error('The message text is required');
    }

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mobile,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    console.log(`[WHATSAPP_DIRECT_TEXT_DISPATCH] Sending text to ${mobile}...`);
    const result = await this.executeMetaGraphApiRequest(metaPayload);

    const msgId = `MSG-TASK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const resolvedMessageId = result.providerMessageId || `wamid.task-${Date.now()}`;
    const finalStatus: DeliveryStatus = result.success ? 'SENT' : 'FAILED';

    const outboundMsg: MessageV2 = {
      id: msgId,
      conversationId: options.conversationId || `CONV-EMP-${mobile}`,
      direction: 'OUTBOUND',
      senderId: options.senderId || 'SYSTEM_TASK_DISPATCHER',
      senderName: options.senderName || 'Efilingg Task Dispatcher',
      messageType: 'TEXT',
      content: messageText,
      whatsappMessageId: resolvedMessageId,
      providerMessageId: resolvedMessageId,
      meta_message_id: resolvedMessageId,
      deliveryStatus: finalStatus,
      timestamp: new Date().toISOString(),
      rawProviderResponse: result.parsedResponse || result.responseBodyText,
      providerSuccess: result.success,
      providerErrorCode: result.errorCode,
      providerErrorMessage: result.errorMessage,
      httpStatus: result.httpStatusCode,
    };

    saveMessage(outboundMsg);

    console.log(`[Meta WhatsApp Direct Text Sent] To: ${mobile} | Status: ${finalStatus} | Msg: "${messageText.substring(0, 50)}..."`);
    return outboundMsg;
  }
}

export { STANDARD_WHATSAPP_TEMPLATES } from './whatsappTemplates';
