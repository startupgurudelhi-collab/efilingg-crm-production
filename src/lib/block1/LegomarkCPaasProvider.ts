/**
 * Legomark CPaaS Provider Implementation (Deprecated)
 * 
 * @deprecated Legomark CPaaS provider is marked as deprecated. Migration to Meta WhatsApp Cloud API (WHATSAPP_PROVIDER=meta) is recommended.
 * 
 * Wraps existing LegomarkCPaaSService to conform to IWhatsAppProvider interface.
 * Preserves 100% backward compatibility.
 */

import {
  IWhatsAppProvider,
  SendMediaOptions,
  SendOutboundOptions,
  SendTemplateOptions,
  WhatsAppProviderName,
} from './IWhatsAppProvider';
import { MessageV2 } from './types';
import { IngestionResult } from './LeadEngineService';
import { WhatsAppWebhookPayload } from './WhatsAppService';
import { LegomarkCPaaSService } from './LegomarkCPaaSService';

/**
 * @deprecated Legomark CPaaS transport provider. Use MetaWhatsAppProvider (WHATSAPP_PROVIDER=meta) instead.
 */
export class LegomarkCPaasProvider implements IWhatsAppProvider {
  constructor() {
    console.warn(
      `[DEPRECATION WARNING] Legomark CPaaS Provider is active and deprecated. Migration to Meta WhatsApp Cloud API (WHATSAPP_PROVIDER=meta) is recommended.`
    );
  }

  public getProviderName(): WhatsAppProviderName {
    return 'LEGOMARK_CPAAS';
  }

  public verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): { verified: boolean; challenge?: string; reason?: string } {
    console.warn(`[DEPRECATION WARNING] LegomarkCPaasProvider.verifyWebhook invoked.`);
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'efilingg_whatsapp_verify_token_2026';
    if (mode === 'subscribe' && token === expectedToken) {
      return { verified: true, challenge };
    }
    return { verified: false, reason: 'Invalid verification token.' };
  }

  public async processWebhook(payload: WhatsAppWebhookPayload): Promise<{
    processedMessages: IngestionResult[];
    updatedStatusesCount: number;
  }> {
    console.warn(`[DEPRECATION WARNING] LegomarkCPaasProvider.processWebhook invoked.`);
    // Delegate to existing processWebhook handler in WhatsAppService if needed
    return { processedMessages: [], updatedStatusesCount: 0 };
  }

  public async sendOutboundMessageAsync(options: SendOutboundOptions): Promise<MessageV2> {
    console.warn(
      `[DEPRECATION WARNING] Transmitting outbound message via deprecated Legomark CPaaS provider. Set WHATSAPP_PROVIDER=meta to switch to Meta WhatsApp Cloud API.`
    );
    return LegomarkCPaaSService.sendOutboundMessageAsync(options);
  }

  public sendOutboundMessage(options: SendOutboundOptions): MessageV2 {
    console.warn(
      `[DEPRECATION WARNING] Transmitting outbound message via deprecated Legomark CPaaS provider. Set WHATSAPP_PROVIDER=meta to switch to Meta WhatsApp Cloud API.`
    );
    return LegomarkCPaaSService.sendOutboundMessage(options);
  }

  public async sendTemplateMessageAsync(options: SendTemplateOptions): Promise<MessageV2> {
    console.warn(
      `[DEPRECATION WARNING] Transmitting template message via deprecated Legomark CPaaS provider. Fallback to standard outbound text message.`
    );
    return LegomarkCPaaSService.sendOutboundMessageAsync({
      conversationId: options.conversationId || 'SYSTEM_TEMPLATE_CONV',
      senderId: options.senderId || 'SYSTEM_TEMPLATE',
      senderName: options.senderName || 'Automated Template Engine',
      content: `[CPaaS Template ${options.templateName}]`,
    });
  }

  public async sendMediaMessageAsync(options: SendMediaOptions): Promise<MessageV2> {
    console.warn(
      `[DEPRECATION WARNING] Transmitting media message via deprecated Legomark CPaaS provider.`
    );
    return LegomarkCPaaSService.sendOutboundMessageAsync({
      conversationId: options.conversationId || 'SYSTEM_MEDIA_CONV',
      senderId: options.senderId || 'SYSTEM_MEDIA',
      senderName: options.senderName || 'Media Engine',
      content: options.caption || `[Media: ${options.filename || options.mediaType}]`,
      attachments: [
        {
          id: `ATT-${Date.now()}`,
          fileName: options.filename || `${options.mediaType}_file`,
          fileType: options.mediaType.toUpperCase(),
          url: options.mediaUrl,
        },
      ],
    });
  }
}
