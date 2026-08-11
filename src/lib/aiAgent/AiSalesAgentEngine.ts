/**
 * AI Sales Agent V1 Foundation - Core Execution Engine with Conversation Memory
 * Efilingg CRM AI Sales Module
 */

import { ConversationV2, MessageV2 } from '../block1/types';
import { WhatsAppService } from '../block1/WhatsAppService';
import { AiAgentRepository } from './db';
import { AiService, AiFaq } from '../../types/aiAgent';

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

      const rawContent = message.content ? message.content.trim() : '';
      if (!rawContent) {
        return null;
      }

      console.log(`[AI_AGENT_START] Processing inbound WhatsApp message: "${rawContent}" for Conversation ID: "${conversation.id}" (Contact: ${conversation.contactNumber})`);

      const lowerContent = rawContent.toLowerCase();

      // Fetch Knowledge Base Assets
      const activeServices = AiAgentRepository.getServices().filter((s) => s.active);
      const activeFaqs = AiAgentRepository.getFaqs().filter((f) => f.active);

      // Check existing conversation session
      let session = AiAgentRepository.getConversationSessionByConversationId(conversation.id);

      // HANDOVER RULE: If handover is required, stop AI auto-responses
      if (session && (session.handover_required || session.current_stage === 'HANDOVER' || session.session_status === 'HANDOVER')) {
        console.log(`[AI_AGENT_START] Session for conversation "${conversation.id}" is in HANDOVER mode. Skipping AI Agent response.`);
        return null;
      }

      let responseText = '';
      let isHandoverTriggered = false;

      // Check explicit human handover request [BRANCH: HANDOVER]
      if (
        lowerContent.includes('talk to human') ||
        lowerContent.includes('agent please') ||
        lowerContent.includes('human agent') ||
        lowerContent.includes('customer care') ||
        lowerContent.includes('call me')
      ) {
        responseText = (settings.handover_message && settings.handover_message.trim())
          ? settings.handover_message.trim()
          : 'Thank you for sharing the details.\nOur team will contact you shortly.';
        
        isHandoverTriggered = true;

        AiAgentRepository.saveConversationSession({
          conversation_id: conversation.id,
          customer_phone: conversation.contactNumber,
          current_service: session?.current_service || 'General Inquiry',
          current_stage: 'HANDOVER',
          collected_fields_json: session?.collected_fields_json || {},
          lead_score: session?.lead_score || 50,
          handover_required: true,
        });
      } else {
        // 2. Service Matching Check [BRANCH: SERVICE_SELECTION]
        let newlyMatchedService: AiService | undefined = undefined;
        for (const srv of activeServices) {
          const sName = srv.service_name.toLowerCase();
          if (
            lowerContent.includes(sName) ||
            (lowerContent.includes('gst') && sName.includes('gst')) ||
            (lowerContent.includes('trademark') && sName.includes('trademark')) ||
            ((lowerContent.includes('pvt') || lowerContent.includes('private limited') || lowerContent.includes('incorporation')) && sName.includes('private limited')) ||
            ((lowerContent.includes('itr') || lowerContent.includes('income tax')) && sName.includes('income tax'))
          ) {
            newlyMatchedService = srv;
            console.log(`[AI_AGENT_SERVICE_MATCH] Matched Service: "${srv.service_name}" (ID: ${srv.id}, Price: ₹${srv.price}, Timeline: ${srv.timeline})`);
            break;
          }
        }

        // SESSION CONTEXT EVALUATION
        let currentService = newlyMatchedService?.service_name || session?.current_service || '';
        let currentStage = session?.current_stage || 'START';
        let collectedData: Record<string, any> = { ...(session?.collected_fields_json || {}) };

        // CASE A: User explicitly mentioned a Service (or switching service) [BRANCH: SERVICE_SELECTION]
        if (newlyMatchedService && (!session || newlyMatchedService.service_name !== session.current_service)) {
          currentService = newlyMatchedService.service_name;
          currentStage = 'SERVICE_DISCUSSION';

          const serviceFaqs = activeFaqs.filter((f) => f.service_id === newlyMatchedService!.id);
          const docsList = Array.isArray(newlyMatchedService.required_documents)
            ? newlyMatchedService.required_documents.join(', ')
            : String(newlyMatchedService.required_documents || 'PAN Card, Aadhaar Card, Address Proof');

          responseText += `📋 *${newlyMatchedService.service_name}*\n\n`;
          responseText += `• *Price:* ₹${newlyMatchedService.price}\n`;
          responseText += `• *Timeline:* ${newlyMatchedService.timeline}\n`;
          responseText += `• *Required Documents:* ${docsList}\n\n`;
          responseText += `${newlyMatchedService.description || 'Professional filing and compliance services.'}\n\n`;

          if (serviceFaqs.length > 0) {
            responseText += `💡 *Frequently Asked Questions:*\n`;
            serviceFaqs.slice(0, 2).forEach((faq) => {
              responseText += `• *Q:* ${faq.question}\n  *A:* ${faq.answer}\n`;
            });
            responseText += `\n`;
          }

          responseText += `Would you like to start your ${newlyMatchedService.service_name} today? Reply *YES* or share your Name to proceed.`;

          // Save session state
          AiAgentRepository.saveConversationSession({
            conversation_id: conversation.id,
            customer_phone: conversation.contactNumber,
            current_service: currentService,
            current_stage: currentStage,
            collected_fields_json: collectedData,
            lead_score: 50,
            handover_required: false,
          });

        } 
        // CASE B: Contextual Query or Lead Collection within an existing session
        else if (session && currentService) {
          const matchedServiceObj = activeServices.find((s) => s.service_name === currentService);

          const isTimelineQuery = lowerContent.includes('din') || lowerContent.includes('time') || lowerContent.includes('days') || lowerContent.includes('duration') || lowerContent.includes('lag');
          const isPriceQuery = lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('charge') || lowerContent.includes('fee') || lowerContent.includes('kitna');
          const isDocQuery = lowerContent.includes('doc') || lowerContent.includes('kagaz') || lowerContent.includes('paper') || lowerContent.includes('requirement');

          // FAQ Match Check [BRANCH: PROCESS_QUERY]
          let matchedFaq: AiFaq | undefined = undefined;
          for (const faq of activeFaqs) {
            const fQ = faq.question.toLowerCase();
            if (fQ.includes(lowerContent) || lowerContent.includes(fQ.substring(0, 15))) {
              matchedFaq = faq;
              break;
            }
          }

          if (isTimelineQuery && matchedServiceObj) {
            // [BRANCH: TIMELINE_QUERY]
            responseText = `${matchedServiceObj.service_name} normally *${matchedServiceObj.timeline}* me complete ho jata hai.\n\nWould you like to proceed with the filing?`;
          } else if (isPriceQuery && matchedServiceObj) {
            // [BRANCH: PRICE_QUERY]
            responseText = `${matchedServiceObj.service_name} standard package price is *₹${matchedServiceObj.price}*.\n\nWould you like to proceed?`;
          } else if (isDocQuery && matchedServiceObj) {
            // [BRANCH: DOCUMENT_QUERY]
            const docsList = Array.isArray(matchedServiceObj.required_documents)
              ? matchedServiceObj.required_documents.join(', ')
              : String(matchedServiceObj.required_documents || 'PAN Card, Aadhaar Card, Address Proof');
            responseText = `Required Documents for ${matchedServiceObj.service_name}:\n• ${docsList}\n\nWould you like to start?`;
          } else if (matchedFaq) {
            // [BRANCH: PROCESS_QUERY]
            responseText = `💡 *${matchedFaq.question}*\n\n${matchedFaq.answer}\n\nWould you like to proceed with your ${currentService}?`;
          } else {
            // LEAD COLLECTION STAGE TRANSITIONS [BRANCH: START_APPLICATION / LEAD_COLLECTION / HANDOVER]
            const isAffirmative = lowerContent === 'yes' || lowerContent === 'ha' || lowerContent === 'haan' || lowerContent.includes('start') || lowerContent.includes('proceed') || lowerContent.includes('apply');

            if (currentStage === 'SERVICE_DISCUSSION' || isAffirmative) {
              currentStage = 'COLLECTING_NAME';
              responseText = `Great! Let's get started with your ${currentService}.\n\n*Stage 1/6:* Please reply with your *Full Name*:`;

            } else if (currentStage === 'COLLECTING_NAME') {
              collectedData.name = rawContent;
              currentStage = 'COLLECTING_MOBILE';
              responseText = `Thank you, ${rawContent}! 👍\n\n*Stage 2/6:* Please provide your 10-digit *Mobile Number* (or reply 'SAME' to use ${conversation.contactNumber}):`;

            } else if (currentStage === 'COLLECTING_MOBILE') {
              collectedData.mobile = lowerContent === 'same' ? conversation.contactNumber : rawContent;
              currentStage = 'COLLECTING_EMAIL';
              responseText = `Got it! 📱\n\n*Stage 3/6:* Please enter your *Email Address*:`;

            } else if (currentStage === 'COLLECTING_EMAIL') {
              collectedData.email = rawContent;
              currentStage = 'COLLECTING_STATE';
              responseText = `Thank you! 📧\n\n*Stage 4/6:* Which *State* is your business located in?`;

            } else if (currentStage === 'COLLECTING_STATE') {
              collectedData.state = rawContent;
              currentStage = 'COLLECTING_BUSINESS_TYPE';
              responseText = `Duly noted! 📍\n\n*Stage 5/6:* What is your *Business Type*? (e.g., Proprietorship, Partnership, Pvt Ltd, LLP):`;

            } else if (currentStage === 'COLLECTING_BUSINESS_TYPE') {
              collectedData.business_type = rawContent;
              currentStage = 'COLLECTING_TURNOVER';
              responseText = `Almost done! 💼\n\n*Stage 6/6:* What is your estimated *Annual Turnover*? (e.g., Below 20 Lakhs, 20-40 Lakhs, Above 40 Lakhs):`;

            } else if (currentStage === 'COLLECTING_TURNOVER') {
              collectedData.turnover = rawContent;
              currentStage = 'HANDOVER';
              isHandoverTriggered = true;

              // AUTO LEAD CREATION
              const newQualifiedLead = AiAgentRepository.addQualifiedLead({
                conversation_id: conversation.id,
                customer_name: collectedData.name || conversation.customerName || 'WhatsApp Customer',
                mobile: collectedData.mobile || conversation.contactNumber,
                email: collectedData.email || 'N/A',
                service_name: currentService,
                lead_summary: `Service: ${currentService} | State: ${collectedData.state || 'N/A'} | Type: ${collectedData.business_type || 'N/A'} | Turnover: ${collectedData.turnover || 'N/A'}`,
                collected_data: collectedData,
                status: 'PENDING_FOLLOWUP',
                assigned_to: 'Unassigned',
              });

              console.log(`[AI_AGENT_LEAD_CREATED] Successfully created Qualified Lead ID "${newQualifiedLead.id}" with status PENDING_FOLLOWUP`);

              responseText = `Thank you for sharing the details. 🙏\nOur team will contact you shortly.`;

              // Save updated session state as HANDOVER
              AiAgentRepository.saveConversationSession({
                conversation_id: conversation.id,
                customer_phone: conversation.contactNumber,
                current_service: currentService,
                current_stage: 'HANDOVER',
                collected_fields_json: collectedData,
                lead_score: 90,
                handover_required: true,
              });
            } else {
              // Session Context Fallback
              responseText = `Regarding your ${currentService} inquiry: How can I assist you further? You can ask about price, timeline, required documents, or reply *YES* to start your application.`;
            }
          }

          if (!isHandoverTriggered) {
            // Save active session state
            AiAgentRepository.saveConversationSession({
              conversation_id: conversation.id,
              customer_phone: conversation.contactNumber,
              current_service: currentService,
              current_stage: currentStage,
              collected_fields_json: collectedData,
              lead_score: 60,
              handover_required: false,
            });
          }

        } else {
          // CASE C: General Greeting / Fallback
          responseText += `Hello! 👋 Welcome to Efilingg AI Sales Concierge.\n\n`;
          responseText += `I can help you with pricing, requirements, and filing for our services:\n\n`;

          if (activeServices.length > 0) {
            activeServices.forEach((srv) => {
              responseText += `• *${srv.service_name}* — ₹${srv.price} (${srv.timeline})\n`;
            });
          } else {
            responseText += `• *GST Registration* — ₹1499 (3-5 Business Days)\n`;
            responseText += `• *Private Limited Company Incorporation* — ₹6999 (7-10 Business Days)\n`;
            responseText += `• *Trademark Registration* — ₹4999 (1-2 Business Days)\n`;
          }

          responseText += `\nPlease reply with the service name (e.g., "GST Registration") to get started!`;
        }
      }

      // Final Empty Check Guard
      if (!responseText || !responseText.trim()) {
        console.error('[AI_EMPTY_RESPONSE] Generated response is empty or invalid. Applying safety fallback.');
        responseText = `Hello! 👋 Welcome to Efilingg AI Sales Concierge. Reply with a service name (e.g. "GST Registration") to get started!`;
      }

      const generatedResponse = responseText.trim();

      // Diagnostics Logging
      console.log('[AI_RESPONSE_TEXT]', generatedResponse);
      console.log('[AI_RESPONSE_LENGTH]', generatedResponse.length);

      // 4. Send Response via WhatsApp
      const outboundMessage = await WhatsAppService.sendOutboundMessageAsync({
        conversationId: conversation.id,
        senderId: 'AI_SALES_AGENT',
        senderName: 'AI Sales Agent',
        content: generatedResponse,
      });

      console.log(`[AI_AGENT_WHATSAPP_SEND] AI response sent successfully via WhatsApp to ${conversation.contactNumber} (Message ID: ${outboundMessage.id})`);

      return outboundMessage;

    } catch (err: any) {
      console.error(`[AI_AGENT_ERROR] Failed to execute AI Sales Agent for conversation "${conversation.id}": ${err.message}`, err);
      return null;
    }
  }
}
