/**
 * Enterprise WhatsApp Integration Engine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Facade pattern delegating to WhatsAppProviderFactory.
 * Powered by Meta WhatsApp Cloud API (Official WhatsApp Business API).
 */

import { AttachmentV2, MessageV2 } from './types';
import { IngestionResult } from './LeadEngineService';
import { WhatsAppProviderFactory } from './WhatsAppProviderFactory';
import { SendMediaOptions, SendOutboundOptions, SendTemplateOptions } from './IWhatsAppProvider';
import { WhatsAppTemplateRepository } from '../whatsapp/templateRepository';

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
   * Verify Webhook challenge from active provider
   */
  public static verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): { verified: boolean; challenge?: string; reason?: string } {
    return WhatsAppProviderFactory.getProvider().verifyWebhook(mode, token, challenge);
  }

  /**
   * Process Inbound Webhook Payload via active provider
   */
  public static async processWebhook(payload: WhatsAppWebhookPayload): Promise<{
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  }> {
    return WhatsAppProviderFactory.getProvider().processWebhook(payload);
  }

  /**
   * Send Outbound Message to WhatsApp Customer via active provider (Async)
   */
  public static async sendOutboundMessageAsync(options: SendOutboundOptions): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendOutboundMessageAsync(options);
  }

  /**
   * Send Outbound Message to WhatsApp Customer via active provider (Sync wrapper)
   */
  public static sendOutboundMessage(options: SendOutboundOptions): MessageV2 {
    return WhatsAppProviderFactory.getProvider().sendOutboundMessage(options);
  }

  /**
   * Send Structured WhatsApp Template (for OTP, Invoices, Payment Reminders)
   */
  public static async sendTemplateMessageAsync(options: SendTemplateOptions): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendTemplateMessageAsync(options);
  }

  /**
   * Send WhatsApp Media Message (Images, Documents, Audio, Video)
   */
  public static async sendMediaMessageAsync(options: SendMediaOptions): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendMediaMessageAsync(options);
  }

  /**
   * Send WhatsApp OTP Template Message via active provider
   */
  public static async sendOtpAsync(toPhone: string, otpCode: string): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendTemplateMessageAsync({
      toPhone,
      templateName: 'auth_otp_code',
      languageCode: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otpCode }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otpCode }],
        },
      ],
      senderName: 'Authentication Engine',
    });
  }

  /**
   * Send WhatsApp Invoice PDF Message via active provider
   */
  public static async sendInvoicePdfAsync(
    toPhone: string,
    pdfUrl: string,
    invoiceNumber: string,
    caption?: string
  ): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendMediaMessageAsync({
      toPhone,
      mediaType: 'document',
      mediaUrl: pdfUrl,
      filename: `Invoice_${invoiceNumber}.pdf`,
      caption: caption || `Here is your tax invoice ${invoiceNumber} from Efilingg.`,
      senderName: 'Billing Engine',
    });
  }

  /**
   * Send WhatsApp Payment / Compliance Reminder via active provider
   */
  public static async sendReminderAsync(
    toPhone: string,
    reminderTitle: string,
    dueDate?: string
  ): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendTemplateMessageAsync({
      toPhone,
      templateName: 'compliance_payment_reminder',
      languageCode: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: reminderTitle },
            { type: 'text', text: dueDate || 'Immediate' },
          ],
        },
      ],
      senderName: 'Reminder Engine',
    });
  }

  /**
   * Send Direct Text WhatsApp Message to any phone number
   */
  public static async sendDirectTextMessageAsync(options: {
    toPhone: string;
    message: string;
    senderId?: string;
    senderName?: string;
    conversationId?: string;
  }): Promise<MessageV2> {
    return WhatsAppProviderFactory.getProvider().sendDirectTextMessageAsync(options);
  }

  /**
   * Send Task Assignment WhatsApp Intimation Notification to Employee
   * Template:
   * Dear Mr. X 
   * 
   * Urgent Notification
   * 
   * Mr. Y has assign a task for you, kindly compile within the time limit.
   * 
   * task details: {taskDetails}
   * Priority: {High / Medium / Low}
   * 
   * If task completed, then Mark as Done in your crm.
   */
  public static async sendTaskIntimationAsync(params: {
    assigneePhone: string;
    assigneeName: string;
    creatorName: string;
    taskTitle: string;
    taskDescription?: string;
    priority?: string;
    clientName?: string;
    senderId?: string;
  }): Promise<MessageV2> {
    const formatSalutationName = (rawName: string) => {
      const trimmed = (rawName || '').trim();
      if (!trimmed) return 'Associate';
      if (/^(Mr\.|Ms\.|Mrs\.|Dr\.|Adv\.|CA\.|CS\.)\s/i.test(trimmed)) {
        return trimmed;
      }
      return `Mr. ${trimmed}`;
    };

    const recipientGreeting = formatSalutationName(params.assigneeName);
    const creatorGreeting = formatSalutationName(params.creatorName);

    // Normalize Priority
    let formattedPriority = 'Medium';
    const rawPriority = (params.priority || '').toLowerCase();
    if (rawPriority.includes('crit') || rawPriority.includes('urg') || rawPriority.includes('high')) {
      formattedPriority = 'High';
    } else if (rawPriority.includes('low')) {
      formattedPriority = 'Low';
    } else {
      formattedPriority = 'Medium';
    }

    // Build Task Details string
    let details = params.taskTitle.trim();
    if (params.clientName && !details.toLowerCase().includes(params.clientName.toLowerCase())) {
      details = `${details} of ${params.clientName}`;
    }
    if (params.taskDescription && params.taskDescription.trim()) {
      const cleanDesc = params.taskDescription.replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW|URGENT)\]\s*/i, '').trim();
      if (cleanDesc && !details.includes(cleanDesc)) {
        details = `${details} (${cleanDesc})`;
      }
    }

    const message = `Dear ${recipientGreeting} 

Urgent Notification

${creatorGreeting} has assign a task for you, kindly compile within the time limit.

task details: ${details}
Priority: ${formattedPriority}

If task completed, then Mark as Done in your crm.`;

    const provider = WhatsAppProviderFactory.getProvider();
    try {
      const sentMsg = await provider.sendDirectTextMessageAsync({
        toPhone: params.assigneePhone,
        message,
        senderId: params.senderId || 'SYSTEM_TASK_NOTIFICATION',
        senderName: params.creatorName || 'Efilingg Task Notification',
      });

      // If direct text failed due to 24-hour window and a template is available, attempt template dispatch
      if (
        sentMsg.deliveryStatus === 'FAILED' &&
        sentMsg.providerErrorCode === 131047 &&
        process.env.WHATSAPP_ACCESS_TOKEN
      ) {
        console.warn(`[Task WhatsApp 24h Window Fallback] Direct text blocked by Meta 24h policy. Attempting template dispatch for ${params.assigneePhone}...`);
        const taskTmpl = WhatsAppTemplateRepository.getDefaultTaskTemplate();
        const templateName = taskTmpl?.name || process.env.WHATSAPP_TASK_TEMPLATE || 'task_assignment_v2';
        try {
          const tmplParams = [
            { type: 'text', text: recipientGreeting },
            { type: 'text', text: creatorGreeting },
            { type: 'text', text: details },
            { type: 'text', text: formattedPriority },
          ];

          const tmplMsg = await provider.sendTemplateMessageAsync({
            toPhone: params.assigneePhone,
            templateName,
            languageCode: taskTmpl?.language || 'en_US',
            components: [
              {
                type: 'body',
                parameters: tmplParams.slice(0, taskTmpl?.parameterCount || 4),
              },
            ],
            senderId: params.senderId || 'SYSTEM_TASK_NOTIFICATION',
            senderName: params.creatorName || 'Efilingg Task Notification',
          });
          return tmplMsg;
        } catch (tmplErr) {
          console.error('[Task WhatsApp Template Fallback Error]:', tmplErr);
        }
      }

      return sentMsg;
    } catch (err: any) {
      console.error('[sendTaskIntimationAsync Error]:', err);
      throw err;
    }
  }
}
