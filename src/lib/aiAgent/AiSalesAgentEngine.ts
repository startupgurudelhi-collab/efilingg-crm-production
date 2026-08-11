/**
 * AI Sales Agent V1 Foundation - Core Execution Engine
 * Efilingg CRM AI Sales Module
 */

import { ConversationV2, MessageV2 } from '../block1/types';
import { WhatsAppService } from '../block1/WhatsAppService';
import { AiAgentRepository } from './db';
import { AiService, AiFaq, AiLeadForm, AiLeadFormField, AiConversationSession } from '../../types/aiAgent';

export class AiSalesAgentEngine {
  /**
   * Main entrypoint to process an inbound WhatsApp message through the AI Sales Agent Engine.
   * Accepts either (conversation, message) or ({ conversation, message }).
   */
  public static async processMessage(
    param1: ConversationV2 | { conversation: ConversationV2; message: MessageV2 },
    param2?: MessageV2
  ): Promise<MessageV2 | null> {
    let conversation: ConversationV2;
    let message: MessageV2;

    if (param2) {
      conversation = param1 as ConversationV2;
      message = param2;
    } else if (param1 && typeof param1 === 'object' && 'conversation' in param1 && 'message' in param1) {
      conversation = (param1 as { conversation: ConversationV2; message: MessageV2 }).conversation;
      message = (param1 as { conversation: ConversationV2; message: MessageV2 }).message;
    } else {
      console.error('[AI_AGENT_ERROR] Invalid parameters provided to AiSalesAgentEngine.processMessage');
      return null;
    }

    // Only process inbound messages
    if (message.direction !== 'INBOUND') {
      return null;
    }

    try {
      // 1. Settings Verification
      const settings = AiAgentRepository.getSettings();
      if (!settings || !settings.agent_enabled) {
        console.log('[AI_AGENT_START] AI Sales Agent is currently DISABLED in settings. Skipping auto-response.');
        return null;
      }

      const content = message.content ? message.content.trim() : '';
      if (!content) {
        return null;
      }

      console.log(`[AI_AGENT_START] Processing inbound WhatsApp message: "${content}" for Conversation ID: "${conversation.id}" (Contact: ${conversation.contactNumber})`);

      const lowerContent = content.toLowerCase();

      // Fetch Knowledge Base Assets
      const activeServices = AiAgentRepository.getServices().filter((s) => s.active);
      const activeFaqs = AiAgentRepository.getFaqs().filter((f) => f.active);
      const activeForms = AiAgentRepository.getLeadForms().filter((f) => f.active);
      const allFields = AiAgentRepository.getLeadFields();
      const sessions = AiAgentRepository.getConversationSessions();

      // Check existing conversation session
      let session = sessions.find((s) => s.conversation_id === conversation.id);

      if (session && session.session_status === 'HANDOVER') {
        console.log(`[AI_AGENT_START] Session for conversation "${conversation.id}" is in HANDOVER mode. Skipping AI Agent response.`);
        return null;
      }

      // 2. Service Matching & FAQ Matching
      let matchedService: AiService | undefined = undefined;
      let matchedFaq: AiFaq | undefined = undefined;

      // Service Keyword Matching
      for (const srv of activeServices) {
        const sName = srv.service_name.toLowerCase();
        if (
          lowerContent.includes(sName) ||
          sName.includes(lowerContent) ||
          (lowerContent.includes('gst') && sName.includes('gst')) ||
          (lowerContent.includes('trademark') && sName.includes('trademark')) ||
          ((lowerContent.includes('pvt') || lowerContent.includes('private limited') || lowerContent.includes('incorporation')) && sName.includes('private limited')) ||
          ((lowerContent.includes('itr') || lowerContent.includes('income tax')) && sName.includes('income tax'))
        ) {
          matchedService = srv;
          console.log(`[AI_AGENT_SERVICE_MATCH] Matched Service: "${srv.service_name}" (ID: ${srv.id}, Price: ₹${srv.price}, Timeline: ${srv.timeline})`);
          break;
        }
      }

      // FAQ Keyword / Query Matching
      for (const faq of activeFaqs) {
        const fQ = faq.question.toLowerCase();
        const keywords = lowerContent.split(/\s+/).filter((w) => w.length > 3);
        const keywordMatches = keywords.filter((kw) => fQ.includes(kw)).length;

        if (fQ.includes(lowerContent) || lowerContent.includes(fQ) || keywordMatches >= 2) {
          matchedFaq = faq;
          console.log(`[AI_AGENT_FAQ_MATCH] Matched FAQ Question: "${faq.question}" (ID: ${faq.id})`);
          if (!matchedService && faq.service_id) {
            matchedService = activeServices.find((s) => s.id === faq.service_id);
            if (matchedService) {
              console.log(`[AI_AGENT_SERVICE_MATCH] Matched Service via FAQ Link: "${matchedService.service_name}" (ID: ${matchedService.id})`);
            }
          }
          break;
        }
      }

      // If matchedService is set but no matchedFaq was directly found, check if there are associated FAQs for the service and log the first match
      if (matchedService && !matchedFaq) {
        const associatedFaqs = activeFaqs.filter((f) => f.service_id === matchedService!.id);
        if (associatedFaqs.length > 0) {
          matchedFaq = associatedFaqs[0];
          console.log(`[AI_AGENT_FAQ_MATCH] Matched FAQ for Service "${matchedService.service_name}": "${matchedFaq.question}" (ID: ${matchedFaq.id})`);
        }
      }

      // 3. Response Generation
      let responseText = '';

      if (matchedService) {
        const serviceFaqs = activeFaqs.filter((f) => f.service_id === matchedService!.id);
        const serviceForm = activeForms.find((f) => f.service_id === matchedService!.id);
        const serviceFields = serviceForm ? allFields.filter((f) => f.form_id === serviceForm.id) : [];

        const docsList = Array.isArray(matchedService.required_documents)
          ? matchedService.required_documents.join(', ')
          : String(matchedService.required_documents || 'PAN Card, Aadhaar Card, Address Proof');

        responseText += `📋 *${matchedService.service_name}*\n\n`;
        responseText += `• *Price:* ₹${matchedService.price}\n`;
        responseText += `• *Timeline:* ${matchedService.timeline}\n`;
        responseText += `• *Required Documents:* ${docsList}\n\n`;
        responseText += `${matchedService.description}\n\n`;

        if (serviceFaqs.length > 0) {
          responseText += `💡 *Frequently Asked Questions:*\n`;
          serviceFaqs.slice(0, 2).forEach((faq) => {
            responseText += `• *Q:* ${faq.question}\n  *A:* ${faq.answer}\n`;
          });
          responseText += `\n`;
        }

        if (serviceFields.length > 0) {
          responseText += `To get started with your ${matchedService.service_name}, please reply with the following details:\n`;
          serviceFields.forEach((field, idx) => {
            responseText += `${idx + 1}. ${field.field_label}${field.required ? ' *' : ''}\n`;
          });
        } else {
          responseText += `Would you like our executive to initiate your ${matchedService.service_name} filing today?`;
        }

        // Save conversation session
        AiAgentRepository.saveConversationSession({
          conversation_id: conversation.id,
          customer_number: conversation.contactNumber,
          service_detected: matchedService.service_name,
          current_step: 'COLLECTING',
          collected_data: session ? session.collected_data : {},
          session_status: 'ACTIVE',
        });

      } else if (matchedFaq) {
        responseText += `💡 *FAQ: ${matchedFaq.question}*\n\n`;
        responseText += `${matchedFaq.answer}\n\n`;
        responseText += `How else can I assist you with your tax, GST, or business compliance needs today?`;

      } else {
        // Fallback / Greeting / General query
        responseText += `Hello! 👋 Welcome to Efilingg AI Sales Concierge.\n\n`;
        responseText += `I can help you with pricing, requirements, and filing for our services:\n\n`;

        activeServices.forEach((srv) => {
          responseText += `• *${srv.service_name}* — ₹${srv.price} (${srv.timeline})\n`;
        });

        responseText += `\nPlease reply with the service name (e.g., "GST Registration") to get started!`;
      }

      console.log(`[AI_AGENT_RESPONSE_GENERATED] Generated AI response text for conversation "${conversation.id}":\n${responseText}`);

      // 4. Send Response via WhatsApp
      const outboundMessage = await WhatsAppService.sendOutboundMessageAsync({
        conversationId: conversation.id,
        senderId: 'AI_SALES_AGENT',
        senderName: 'AI Sales Agent',
        content: responseText,
      });

      console.log(`[AI_AGENT_WHATSAPP_SEND] AI response sent successfully via WhatsApp to ${conversation.contactNumber} (Message ID: ${outboundMessage.id})`);

      return outboundMessage;

    } catch (err: any) {
      console.error(`[AI_AGENT_ERROR] Failed to execute AI Sales Agent for conversation "${conversation.id}": ${err.message}`, err);
      return null;
    }
  }
}
