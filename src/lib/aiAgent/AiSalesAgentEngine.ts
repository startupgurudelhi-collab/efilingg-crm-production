/**
 * AI Sales Agent V1 Foundation - Core Execution Engine with Conversation Memory
 * Efilingg CRM AI Sales Module
 */

import { ConversationV2, MessageV2 } from '../block1/types';
import { WhatsAppService } from '../block1/WhatsAppService';
import { AiAgentRepository } from './db';
import { AiService, AiFaq } from '../../types/aiAgent';
import { createLead } from '../db';

// Indian States and Union Territories List
const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry'
];

const STATE_ALIASES: Record<string, string> = {
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'ncr': 'Delhi',
  'mh': 'Maharashtra',
  'maharashtra': 'Maharashtra',
  'mumbai': 'Maharashtra',
  'pune': 'Maharashtra',
  'up': 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'mp': 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  'tn': 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'chennai': 'Tamil Nadu',
  'ka': 'Karnataka',
  'karnataka': 'Karnataka',
  'bangalore': 'Karnataka',
  'bengaluru': 'Karnataka',
  'dl': 'Delhi',
  'hr': 'Haryana',
  'haryana': 'Haryana',
  'gurgaon': 'Haryana',
  'gurugram': 'Haryana',
  'pb': 'Punjab',
  'punjab': 'Punjab',
  'rj': 'Rajasthan',
  'rajasthan': 'Rajasthan',
  'jaipur': 'Rajasthan',
  'wb': 'West Bengal',
  'west bengal': 'West Bengal',
  'kolkata': 'West Bengal',
  'gujarat': 'Gujarat',
  'ahmedabad': 'Gujarat',
  'surat': 'Gujarat',
  'gj': 'Gujarat',
  'ts': 'Telangana',
  'telangana': 'Telangana',
  'hyderabad': 'Telangana',
  'ap': 'Andhra Pradesh',
  'andhra pradesh': 'Andhra Pradesh',
  'kl': 'Kerala',
  'kerala': 'Kerala',
  'br': 'Bihar',
  'bihar': 'Bihar',
  'patna': 'Bihar',
  'uk': 'Uttarakhand',
  'uttarakhand': 'Uttarakhand',
  'hp': 'Himachal Pradesh',
  'himachal pradesh': 'Himachal Pradesh',
  'jk': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'j&k': 'Jammu and Kashmir',
  'assam': 'Assam',
  'goa': 'Goa',
  'jharkhand': 'Jharkhand',
  'ranchi': 'Jharkhand',
  'chhattisgarh': 'Chhattisgarh',
  'raipur': 'Chhattisgarh',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'bhubaneswar': 'Odisha',
  'chandigarh': 'Chandigarh',
};

// HELPER: Language Switch Detection
function isLanguageSwitchRequest(lowerContent: string): boolean {
  const switchPhrases = [
    'hindi me baat karo',
    'hindi me baat kariye',
    'hindi me baat kare',
    'hindi me baat karein',
    'hindi me',
    'speak hindi',
    'talk in hindi',
    'speak in hindi',
    'in hindi',
    'hindi please',
    'use hindi',
    'can we speak in hindi',
    'hindi text',
  ];
  if (lowerContent === 'hindi' || lowerContent === 'hinglish') return true;
  return switchPhrases.some((phrase) => lowerContent.includes(phrase));
}

// HELPER: Get Stage Prompt by Stage and Language
function getStagePrompt(stage: string, isHindi: boolean): string {
  switch (stage) {
    case 'COLLECTING_NAME':
      return isHindi
        ? `*Stage 1/6:* Kripya apna *Poora Naam* share karein:`
        : `*Stage 1/6:* Please reply with your *Full Name*:`;
    case 'COLLECTING_MOBILE':
      return isHindi
        ? `*Stage 2/6:* Kripya apna 10-digit *Mobile Number* share karein:`
        : `*Stage 2/6:* Please provide your 10-digit *Mobile Number*:`;
    case 'COLLECTING_EMAIL':
      return isHindi
        ? `*Stage 3/6:* Kripya apna *Email Address* enter karein:`
        : `*Stage 3/6:* Please enter your *Email Address*:`;
    case 'COLLECTING_STATE':
      return isHindi
        ? `*Stage 4/6:* Aapki business kis *State* me sthit hai?`
        : `*Stage 4/6:* Which *State* is your business located in?`;
    case 'COLLECTING_BUSINESS_TYPE':
      return isHindi
        ? `*Stage 5/6:* Aapka *Business Type* kya hai? (e.g., Proprietorship, Partnership, Pvt Ltd, LLP):`
        : `*Stage 5/6:* What is your *Business Type*? (e.g., Proprietorship, Partnership, Pvt Ltd, LLP):`;
    case 'COLLECTING_TURNOVER':
      return isHindi
        ? `*Stage 6/6:* Aapka estimated *Annual Turnover* kitna hai? (e.g., Below 20 Lakhs, 20-40 Lakhs, Above 40 Lakhs):`
        : `*Stage 6/6:* What is your estimated *Annual Turnover*? (e.g., Below 20 Lakhs, 20-40 Lakhs, Above 40 Lakhs):`;
    default:
      return '';
  }
}

// HELPER: Get Resume Prompt when answering query during lead collection
function getResumePrompt(stage: string, isHindi: boolean): string {
  switch (stage) {
    case 'COLLECTING_NAME':
      return isHindi
        ? `Aur kripya apna poora naam share karein:`
        : `And please reply with your Full Name:`;
    case 'COLLECTING_MOBILE':
      return isHindi
        ? `Aur kripya apna 10-digit mobile number share karein:`
        : `And please share your 10-digit mobile number:`;
    case 'COLLECTING_EMAIL':
      return isHindi
        ? `Aur kripya apna email address share karein:`
        : `And please share your email address:`;
    case 'COLLECTING_STATE':
      return isHindi
        ? `Aur kripya apni state bataye:`
        : `And please share which state your business is located in:`;
    case 'COLLECTING_BUSINESS_TYPE':
      return isHindi
        ? `Aur kripya apna business type (Proprietorship, LLP, Partnership, Pvt Ltd) share karein:`
        : `And please share your business type (Proprietorship, LLP, Partnership, Pvt Ltd):`;
    case 'COLLECTING_TURNOVER':
      return isHindi
        ? `Aur kripya apna estimated annual turnover share karein:`
        : `And please share your estimated annual turnover:`;
    default:
      return '';
  }
}

// VALIDATION HELPERS
function validateName(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 3) return false;

  const lower = trimmed.toLowerCase();

  // Reject question / query / greeting / language switch terms
  const invalidKeywords = [
    'price', 'cost', 'charge', 'fees', 'fee', 'kitna', 'doc', 'kagaz', 'paper', 'requirement',
    'mandatory', 'required', 'process', 'how', 'kaise', 'step', 'time', 'days', 'lag', 'duration',
    'din', 'hello', 'hi', 'hey', 'yes', 'no', 'ok', 'thanks', 'thank', 'help', 'kya', 'kab',
    'hindi', 'speak', 'batao', 'bataye', 'kariye', 'karo', '?'
  ];

  for (const kw of invalidKeywords) {
    if (lower.includes(kw)) {
      return false;
    }
  }

  // Must contain at least 2 alphabetic characters
  const lettersCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (lettersCount < 2) return false;

  // Should not contain digits
  if (/\d/.test(trimmed)) return false;

  return true;
}

function validateMobile(input: string, contactNumber: string): { isValid: boolean; value?: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'same' || lower === 'same number' || lower === 'same phone' || lower === 'use same') {
    if (contactNumber && contactNumber.length >= 10) {
      const cleanContact = contactNumber.replace(/\D/g, '');
      const tenDigits = cleanContact.slice(-10);
      return { isValid: true, value: tenDigits };
    }
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return { isValid: true, value: digits };
  }

  if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) {
    return { isValid: true, value: digits.substring(2) };
  }

  return { isValid: false };
}

function validateEmail(input: string): { isValid: boolean; value?: string } {
  const trimmed = input.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(trimmed)) {
    return { isValid: true, value: trimmed.toLowerCase() };
  }
  return { isValid: false };
}

function validateState(input: string): { isValid: boolean; value?: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const invalidText = ['hello', 'hi', 'hey', 'yes', 'no', 'price', 'cost', 'help', 'kya', 'kaise', 'what', 'how', 'ok'];
  if (invalidText.includes(lower)) {
    return { isValid: false };
  }

  if (STATE_ALIASES[lower]) {
    return { isValid: true, value: STATE_ALIASES[lower] };
  }

  for (const st of INDIAN_STATES_AND_UTS) {
    const stLower = st.toLowerCase();
    if (stLower === lower || lower.includes(stLower) || stLower.includes(lower)) {
      return { isValid: true, value: st };
    }
  }

  return { isValid: false };
}

function validateBusinessType(input: string): { isValid: boolean; value?: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const invalidText = ['hello', 'hi', 'hey', 'yes', 'no', 'price', 'cost', 'help', 'kya', 'kaise', 'what', 'how', 'ok'];
  if (invalidText.includes(lower)) {
    return { isValid: false };
  }

  if (lower.includes('proprietor') || lower.includes('prop') || lower.includes('sole')) {
    return { isValid: true, value: 'Proprietorship' };
  }
  if (lower.includes('llp') || lower.includes('limited liability')) {
    return { isValid: true, value: 'LLP' };
  }
  if (lower.includes('partner') || lower.includes('firm')) {
    return { isValid: true, value: 'Partnership' };
  }
  if (lower.includes('pvt') || lower.includes('private') || lower.includes('pvt ltd') || lower.includes('incorporation')) {
    return { isValid: true, value: 'Private Limited' };
  }
  if (lower.includes('opc') || lower.includes('one person')) {
    return { isValid: true, value: 'OPC' };
  }

  return { isValid: false };
}

function validateTurnover(input: string): { isValid: boolean; value?: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const invalidText = ['hello', 'hi', 'hey', 'yes', 'no', 'price', 'cost', 'help', 'kya', 'kaise', 'what', 'how', 'ok'];
  if (invalidText.includes(lower)) {
    return { isValid: false };
  }

  if (lower.includes('below 20') || lower.includes('less than 20') || lower.includes('under 20') || lower.includes('< 20') || lower.includes('<20')) {
    return { isValid: true, value: 'Below 20 Lakhs' };
  }

  if (lower.includes('20-40') || lower.includes('20 to 40') || lower.includes('20 - 40') || lower.includes('20_40')) {
    return { isValid: true, value: '20-40 Lakhs' };
  }

  if (lower.includes('above 40') || lower.includes('more than 40') || lower.includes('greater than 40') || lower.includes('> 40') || lower.includes('>40') || lower.includes('40+')) {
    return { isValid: true, value: 'Above 40 Lakhs' };
  }

  if (
    /\d/.test(lower) ||
    lower.includes('lakh') ||
    lower.includes('lac') ||
    lower.includes('crore') ||
    lower.includes('cr') ||
    lower.includes('zero') ||
    lower.includes('nil') ||
    lower.includes('new') ||
    lower.includes('startup')
  ) {
    return { isValid: true, value: trimmed };
  }

  return { isValid: false };
}

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
      let sessionLanguage = session?.language || 'EN';

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
          language: sessionLanguage,
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

          const docsList = Array.isArray(newlyMatchedService.required_documents)
            ? newlyMatchedService.required_documents.join(', ')
            : String(newlyMatchedService.required_documents || 'PAN Card, Aadhaar Card, Address Proof');

          responseText += `📋 *${newlyMatchedService.service_name}*\n\n`;
          responseText += `• *Price:* ₹${newlyMatchedService.price}\n`;
          responseText += `• *Timeline:* ${newlyMatchedService.timeline}\n`;
          responseText += `• *Required Documents:* ${docsList}\n\n`;
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
            language: sessionLanguage,
          });

        } 
        // CASE B: Contextual Query or Lead Collection within an existing session
        else if (session && currentService) {
          const matchedServiceObj = activeServices.find((s) => s.service_name === currentService);

          const isCollectingStage = [
            'COLLECTING_NAME',
            'COLLECTING_MOBILE',
            'COLLECTING_EMAIL',
            'COLLECTING_STATE',
            'COLLECTING_BUSINESS_TYPE',
            'COLLECTING_TURNOVER',
          ].includes(currentStage);

          if (isCollectingStage) {
            const isHindi = sessionLanguage === 'HI';

            // 1. LANGUAGE SWITCH CHECK
            if (isLanguageSwitchRequest(lowerContent)) {
              sessionLanguage = 'HI';
              console.log(`[AI_LANGUAGE_SWITCH] Conversation ID: ${conversation.id} | New Language: HI`);

              const stagePrompt = getStagePrompt(currentStage, true);
              responseText = `Ji bilkul! Hum Hindi me baat karenge. 😊\n\n${stagePrompt}`;

              AiAgentRepository.saveConversationSession({
                conversation_id: conversation.id,
                customer_phone: conversation.contactNumber,
                current_service: currentService,
                current_stage: currentStage,
                collected_fields_json: collectedData,
                lead_score: 60,
                handover_required: false,
                language: 'HI',
              });

            } else {
              // 2. FAQ / QUESTION QUERY INTERRUPTION CHECK
              const isTimelineQuery = lowerContent.includes('din') || lowerContent.includes('time') || lowerContent.includes('days') || lowerContent.includes('duration') || lowerContent.includes('lag') || lowerContent.includes('kitna din');
              const isPriceQuery = lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('charge') || lowerContent.includes('fee') || lowerContent.includes('fees') || lowerContent.includes('kitna');
              const isDocQuery = lowerContent.includes('doc') || lowerContent.includes('kagaz') || lowerContent.includes('paper') || lowerContent.includes('requirement') || lowerContent.includes('mandatory') || lowerContent.includes('required') || lowerContent.includes('document');
              const isProcessQuery = lowerContent.includes('process') || lowerContent.includes('how') || lowerContent.includes('kaise') || lowerContent.includes('step');

              let matchedFaq: AiFaq | undefined = undefined;
              for (const faq of activeFaqs) {
                const fQ = faq.question.toLowerCase();
                if (fQ.includes(lowerContent) || lowerContent.includes(fQ.substring(0, 15))) {
                  matchedFaq = faq;
                  break;
                }
              }

              const isQuestionQuery = (isTimelineQuery || isPriceQuery || isDocQuery || isProcessQuery) && matchedServiceObj;

              if (isQuestionQuery || matchedFaq) {
                let answerPart = '';
                if (isTimelineQuery && matchedServiceObj) {
                  answerPart = `${matchedServiceObj.service_name} normally *${matchedServiceObj.timeline}* me complete ho jata hai.`;
                } else if (isPriceQuery && matchedServiceObj) {
                  answerPart = `${matchedServiceObj.service_name} standard package price is *₹${matchedServiceObj.price}*.`;
                } else if (isDocQuery && matchedServiceObj) {
                  const docsList = Array.isArray(matchedServiceObj.required_documents)
                    ? matchedServiceObj.required_documents.join(', ')
                    : String(matchedServiceObj.required_documents || 'PAN Card, Aadhaar Card, Address Proof');
                  answerPart = `Required Documents for ${matchedServiceObj.service_name}:\n• ${docsList}`;
                } else if (isProcessQuery && matchedServiceObj) {
                  answerPart = `*Process for ${matchedServiceObj.service_name}:*\n1. Basic details & documents\n2. Expert verification\n3. Portal application filing\n4. Registration certificate issue (${matchedServiceObj.timeline})`;
                } else if (matchedFaq) {
                  answerPart = `💡 *${matchedFaq.question}*\n\n${matchedFaq.answer}`;
                }

                const resumePrompt = getResumePrompt(currentStage, isHindi);
                responseText = `${answerPart}\n\n${resumePrompt}`;

                console.log(`[AI_STAGE_RESUME] Stage: ${currentStage} | Answered Query: "${rawContent}" | Resumed Prompt`);

                AiAgentRepository.saveConversationSession({
                  conversation_id: conversation.id,
                  customer_phone: conversation.contactNumber,
                  current_service: currentService,
                  current_stage: currentStage,
                  collected_fields_json: collectedData,
                  lead_score: 60,
                  handover_required: false,
                  language: sessionLanguage,
                });

              } else {
                // 3. FIELD VALIDATION PER STAGE
                if (currentStage === 'COLLECTING_NAME') {
                  const isValid = validateName(rawContent);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_NAME | Valid: ${isValid} | Field: name | Value: "${rawContent}"`);

                  if (isValid) {
                    collectedData.name = rawContent.trim();
                    currentStage = 'COLLECTING_MOBILE';
                    responseText = `Thank you, ${collectedData.name}! 👍\n\n*Stage 2/6:* Please provide your 10-digit *Mobile Number* (or reply 'SAME' to use ${conversation.contactNumber}):`;
                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_NAME | Field: name | Reason: "Invalid name format or query passed as name" | Input: "${rawContent}"`);
                    responseText = `Kripya apna poora naam bataye.`;
                  }

                } else if (currentStage === 'COLLECTING_MOBILE') {
                  const valRes = validateMobile(rawContent, conversation.contactNumber);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_MOBILE | Valid: ${valRes.isValid} | Field: mobile | Value: "${rawContent}"`);

                  if (valRes.isValid && valRes.value) {
                    collectedData.mobile = valRes.value;
                    currentStage = 'COLLECTING_EMAIL';
                    responseText = `Got it! 📱\n\n*Stage 3/6:* Please enter your *Email Address*:`;
                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_MOBILE | Field: mobile | Reason: "Invalid mobile number format" | Input: "${rawContent}"`);
                    responseText = `Kripya valid mobile number enter karein.`;
                  }

                } else if (currentStage === 'COLLECTING_EMAIL') {
                  const valRes = validateEmail(rawContent);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_EMAIL | Valid: ${valRes.isValid} | Field: email | Value: "${rawContent}"`);

                  if (valRes.isValid && valRes.value) {
                    collectedData.email = valRes.value;
                    currentStage = 'COLLECTING_STATE';
                    responseText = `Thank you! 📧\n\n*Stage 4/6:* Which *State* is your business located in?`;
                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_EMAIL | Field: email | Reason: "Invalid email format" | Input: "${rawContent}"`);
                    responseText = `Kripya valid email address enter karein.`;
                  }

                } else if (currentStage === 'COLLECTING_STATE') {
                  const valRes = validateState(rawContent);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_STATE | Valid: ${valRes.isValid} | Field: state | Value: "${rawContent}"`);

                  if (valRes.isValid && valRes.value) {
                    collectedData.state = valRes.value;
                    currentStage = 'COLLECTING_BUSINESS_TYPE';
                    responseText = `Duly noted! 📍\n\n*Stage 5/6:* What is your *Business Type*? (e.g., Proprietorship, Partnership, Pvt Ltd, LLP):`;
                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_STATE | Field: state | Reason: "Invalid Indian state" | Input: "${rawContent}"`);
                    responseText = `Kripya apni state bataye.`;
                  }

                } else if (currentStage === 'COLLECTING_BUSINESS_TYPE') {
                  const valRes = validateBusinessType(rawContent);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_BUSINESS_TYPE | Valid: ${valRes.isValid} | Field: business_type | Value: "${rawContent}"`);

                  if (valRes.isValid && valRes.value) {
                    collectedData.business_type = valRes.value;
                    currentStage = 'COLLECTING_TURNOVER';
                    responseText = `Almost done! 💼\n\n*Stage 6/6:* What is your estimated *Annual Turnover*? (e.g., Below 20 Lakhs, 20-40 Lakhs, Above 40 Lakhs):`;
                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_BUSINESS_TYPE | Field: business_type | Reason: "Invalid business type" | Input: "${rawContent}"`);
                    responseText = `Kripya business type bataye (Proprietorship, LLP, Partnership, Pvt Ltd).`;
                  }

                } else if (currentStage === 'COLLECTING_TURNOVER') {
                  const valRes = validateTurnover(rawContent);
                  console.log(`[AI_FIELD_VALIDATION] Stage: COLLECTING_TURNOVER | Valid: ${valRes.isValid} | Field: turnover | Value: "${rawContent}"`);

                  if (valRes.isValid && valRes.value) {
                    collectedData.turnover = valRes.value;
                    currentStage = 'HANDOVER';
                    isHandoverTriggered = true;

                    // [AI_LEAD_CREATE_START] LOG
                    console.log('[AI_LEAD_CREATE_START]', {
                      conversation_id: conversation.id,
                      customer_phone: conversation.contactNumber,
                      service_name: currentService,
                      collected_fields: collectedData,
                    });

                    try {
                      // 1. Create AI Qualified Lead record
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

                      // 2. Also register in Main CRM Lead Store (db.ts)
                      try {
                        createLead(
                          {
                            customerName: collectedData.name || conversation.customerName || 'WhatsApp Customer',
                            businessName: collectedData.business_type ? `${collectedData.name || 'Client'} (${collectedData.business_type})` : 'N/A',
                            mobile: collectedData.mobile || conversation.contactNumber,
                            email: collectedData.email || 'N/A',
                            serviceRequired: currentService,
                            leadSource: 'AI WhatsApp Agent',
                            stage: 'New Lead',
                            assignedTo: 'EMP-ADMIN',
                            createdBy: 'AI_SALES_AGENT',
                            notes: `Auto-generated lead via AI WhatsApp Sales Concierge. State: ${collectedData.state || 'N/A'}, Turnover: ${collectedData.turnover || 'N/A'}`,
                          },
                          'AI_SALES_AGENT'
                        );
                      } catch (crmErr: any) {
                        console.warn('[AI_LEAD_CREATE_CRM_SYNC_NOTE]', crmErr.message);
                      }

                      // [AI_LEAD_CREATE_SUCCESS] LOG
                      console.log('[AI_LEAD_CREATE_SUCCESS]', {
                        lead_id: newQualifiedLead.id,
                        status: newQualifiedLead.status,
                        storage_location: 'efilingg_crm_ai_qualified_leads & efilingg_leads',
                        assigned_to: newQualifiedLead.assigned_to,
                        conversation_id: conversation.id,
                        phone: conversation.contactNumber,
                        service: currentService,
                        all_collected_fields: collectedData,
                      });

                    } catch (createErr: any) {
                      // [AI_LEAD_CREATE_FAIL] LOG
                      console.error('[AI_LEAD_CREATE_FAIL]', {
                        conversation_id: conversation.id,
                        phone: conversation.contactNumber,
                        service: currentService,
                        all_collected_fields: collectedData,
                        error: createErr.message,
                      });
                    }

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
                      language: sessionLanguage,
                    });

                  } else {
                    console.log(`[AI_INVALID_INPUT] Stage: COLLECTING_TURNOVER | Field: turnover | Reason: "Invalid turnover value" | Input: "${rawContent}"`);
                    responseText = `Kripya estimated annual turnover bataye (e.g. Below 20 Lakhs, 20-40 Lakhs, Above 40 Lakhs).`;
                  }
                }
              }
            }

          } else {
            // NOT IN AN ACTIVE COLLECTION STAGE (E.G. SERVICE_DISCUSSION OR QUERY PHASE)
            const isTimelineQuery = lowerContent.includes('din') || lowerContent.includes('time') || lowerContent.includes('days') || lowerContent.includes('duration') || lowerContent.includes('lag') || lowerContent.includes('kitna din');
            const isPriceQuery = lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('charge') || lowerContent.includes('fee') || lowerContent.includes('fees') || lowerContent.includes('kitna');
            const isDocQuery = lowerContent.includes('doc') || lowerContent.includes('kagaz') || lowerContent.includes('paper') || lowerContent.includes('requirement') || lowerContent.includes('mandatory') || lowerContent.includes('required');
            const isProcessQuery = lowerContent.includes('process') || lowerContent.includes('how') || lowerContent.includes('kaise') || lowerContent.includes('step');

            // FAQ Match Check
            let matchedFaq: AiFaq | undefined = undefined;
            for (const faq of activeFaqs) {
              const fQ = faq.question.toLowerCase();
              const fA = faq.answer.toLowerCase();
              if (
                fQ.includes(lowerContent) ||
                lowerContent.includes(fQ.substring(0, 15)) ||
                (lowerContent.includes('mandatory') && (fQ.includes('mandatory') || fA.includes('mandatory'))) ||
                (lowerContent.includes('required') && (fQ.includes('required') || fA.includes('required')))
              ) {
                matchedFaq = faq;
                break;
              }
            }

            const isAffirmative = lowerContent === 'yes' || lowerContent === 'ha' || lowerContent === 'haan' || lowerContent.includes('start') || lowerContent.includes('proceed') || lowerContent.includes('apply');

            if (isAffirmative || currentStage === 'START') {
              currentStage = 'COLLECTING_NAME';
              responseText = `Great! Let's get started with your ${currentService}.\n\n*Stage 1/6:* Please reply with your *Full Name*:`;
            } else if (isTimelineQuery && matchedServiceObj) {
              responseText = `${matchedServiceObj.service_name} normally *${matchedServiceObj.timeline}* me complete ho jata hai.\n\nWould you like to proceed with the filing?`;
            } else if (isPriceQuery && matchedServiceObj) {
              responseText = `${matchedServiceObj.service_name} standard package price is *₹${matchedServiceObj.price}*.\n\nWould you like to proceed?`;
            } else if (isDocQuery && matchedServiceObj) {
              const docsList = Array.isArray(matchedServiceObj.required_documents)
                ? matchedServiceObj.required_documents.join(', ')
                : String(matchedServiceObj.required_documents || 'PAN Card, Aadhaar Card, Address Proof');
              responseText = `Required Documents for ${matchedServiceObj.service_name}:\n• ${docsList}\n\nWould you like to start?`;
            } else if (matchedFaq) {
              responseText = `💡 *${matchedFaq.question}*\n\n${matchedFaq.answer}\n\nWould you like to proceed with your ${currentService}?`;
            } else if (isProcessQuery && matchedServiceObj) {
              responseText = `*Process for ${matchedServiceObj.service_name}:*\n1. Share requested basic details & documents\n2. Document verification by expert\n3. Government portal application filing\n4. Registration certificate issue (${matchedServiceObj.timeline})\n\nWould you like to start?`;
            } else {
              // Default Fallback
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
              language: sessionLanguage,
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
