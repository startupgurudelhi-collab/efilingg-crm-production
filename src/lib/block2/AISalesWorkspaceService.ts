/**
 * Enterprise AI Sales Workspace Service
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 2)
 *
 * Integrates Gemini AI (gemini-3.6-flash) via @google/genai SDK for:
 * - Dynamic Service & Intent Detection
 * - AI Suggested Replies based on live CRM Service Catalog
 * - Conversation Summarization & Requirement Extraction
 * - AI Auto-Reply & Document Checklist Generation
 * - Executive Takeover Management & Internal Notes
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  AISuggestReplyResult,
  AIDetectIntentResult,
  AISummaryResult,
  InternalNote,
} from './types';
import {
  getConversationById,
  getMessages,
  saveConversation,
  saveMessage,
  addTimelineEntry,
  getCustomers,
  getLeads,
} from '../block1/db';
import { getCustomServices } from '../db';
import { ConversationV2, MessageV2 } from '../block1/types';
import { eventBus } from '../eventBus';

// Initialize Gemini Client Lazily with standard User-Agent header
let genAiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    try {
      genAiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('[AISalesWorkspaceService] Failed to initialize GoogleGenAI client:', err);
    }
  }
  return genAiClient;
}

// Memory cache for internal notes & conversation tags
const internalNotesStore: Record<string, InternalNote[]> = {};
const conversationTagsStore: Record<string, string[]> = {};

export class AISalesWorkspaceService {
  /**
   * Helper to load dynamic CRM services catalog
   */
  public static getCRMServiceCatalog(): string {
    try {
      const customServices = getCustomServices();
      if (customServices && customServices.length > 0) {
        return customServices
          .map(
            (s) =>
              `- ${s.name} (Category: ${s.category}, Price: ₹${s.price}, Timeline: ${s.timeline || '5-7 days'}, Scope: ${s.scope?.join(', ') || 'N/A'}, Docs Needed: ${s.documentsRequired?.join(', ') || 'Standard Compliance'})`
          )
          .join('\n');
      }
    } catch (e) {
      console.warn('[AISalesWorkspaceService] Failed to load custom services, using standard fallback catalog:', e);
    }

    return `
- GST Registration & Monthly Compliance (Category: Taxation, Price: ₹1,499, Docs Needed: PAN, Aadhaar, Photo, Electricity Bill, Rental Agreement)
- Private Limited Company Incorporation (Category: Business Registration, Price: ₹6,999, Docs Needed: DSC, DIN, PAN, Aadhaar, Office Address Proof)
- Income Tax Return (ITR-1/2/3/4) Filing (Category: Taxation, Price: ₹999, Docs Needed: Form 16, Bank Statements, Investment Proofs)
- MSME Udyam Registration (Category: Certification, Price: ₹499, Docs Needed: Aadhaar, PAN, Bank Details)
- Trademark Registration (Category: Intellectual Property, Price: ₹4,500, Docs Needed: Logo, User Affidavit, Identity Proof)
- MCA Annual Compliance & AOC-4/MGT-7 Filing (Category: Compliance, Price: ₹8,999, Docs Needed: Financial Statements, Audit Report, Board Resolutions)
`;
  }

  /**
   * 1. AI Suggested Replies
   */
  public static async suggestReplies(options: {
    conversationId: string;
    customPrompt?: string;
  }): Promise<AISuggestReplyResult> {
    const messages = getMessages(options.conversationId);
    const conv = getConversationById(options.conversationId);
    const catalog = this.getCRMServiceCatalog();

    const recentThread = messages
      .slice(-6)
      .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Executive'}: ${m.content}`)
      .join('\n');

    const prompt = `
You are an expert sales and compliance consultant for "Efilingg CRM" (Indian Tax, GST, MCA & Business Registration Services).
Here is our live CRM Services Catalog:
${catalog}

Recent Customer Thread:
${recentThread || 'Customer is asking for business compliance services.'}

${options.customPrompt ? `Additional Instructions: ${options.customPrompt}` : ''}

Generate 3 concise, highly relevant, professional quick-reply options (1-2 sentences each) that an executive can click to send to the customer via WhatsApp.
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedReplies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of 3 short quick replies',
                },
                detectedIntent: { type: Type.STRING },
                detectedService: { type: Type.STRING },
                recommendedAction: { type: Type.STRING },
              },
              required: ['suggestedReplies'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return {
            suggestedReplies: parsed.suggestedReplies || [],
            detectedIntent: parsed.detectedIntent || 'INQUIRY',
            detectedService: parsed.detectedService || conv?.serviceCategory || 'General',
            recommendedAction: parsed.recommendedAction || 'Send document checklist',
          };
        }
      } catch (err) {
        console.warn('[AISalesWorkspaceService] Gemini call failed for suggestReplies, using heuristic fallback:', err);
      }
    }

    // Heuristic Fallback if Gemini key is missing or errored
    const categoryUpper = (conv?.serviceCategory || 'GST').toUpperCase();
    if (categoryUpper.includes('GST')) {
      return {
        suggestedReplies: [
          'Hello! We can get your GST registration done in 3-5 business days. Shall I share the required document checklist?',
          'Our GST registration package includes GSTIN generation, Certificate, and 1 month free return filing support at ₹1,499.',
          'Please send across your PAN card, Aadhaar card, and recent Electricity Bill to initiate your GST application.',
        ],
        detectedIntent: 'GST_REGISTRATION_INQUIRY',
        detectedService: 'GST Compliance',
        recommendedAction: 'Share GST Document Checklist',
      };
    } else if (categoryUpper.includes('MCA') || categoryUpper.includes('COMPANY')) {
      return {
        suggestedReplies: [
          'Hello! We offer end-to-end Private Limited incorporation including 2 DSCs, 2 DINs, Name approval & Certificate for ₹6,999.',
          'To start company incorporation, we need PAN, Aadhaar, and passport photo of directors.',
          'Our legal team will draft your MOA & AOA within 48 hours. Let us know if you would like to proceed!',
        ],
        detectedIntent: 'COMPANY_INCORPORATION',
        detectedService: 'MCA Registration',
        recommendedAction: 'Draft MOA/AOA & Collect Director Identity',
      };
    } else {
      return {
        suggestedReplies: [
          'Hello! Thank you for reaching out to Efilingg Compliance Services. How can I assist with your business filings today?',
          'We provide complete Tax, GST, MCA, and Legal Compliance services. Would you like a quick proposal?',
          'I have forwarded your request to our compliance specialist who will assist you shortly.',
        ],
        detectedIntent: 'GENERAL_INQUIRY',
        detectedService: conv?.serviceCategory || 'Taxation',
        recommendedAction: 'Send Service Proposal',
      };
    }
  }

  /**
   * 2. Detect Service Category & Intent
   */
  public static async detectIntentAndService(messageText: string): Promise<AIDetectIntentResult> {
    const catalog = this.getCRMServiceCatalog();
    const prompt = `
Analyze the following customer WhatsApp message for Efilingg Compliance CRM:
Message: "${messageText}"

CRM Available Services:
${catalog}

Extract:
1. Intent (INQUIRY, DOCUMENT_SUBMISSION, STATUS_CHECK, PRICING, ESCALATION_HUMAN, UNKNOWN)
2. Primary Service Category (e.g. GST, MCA, ITR, Trademark, MSME, Audit)
3. Sentiment (POSITIVE, NEUTRAL, URGENT, NEGATIVE)
4. Lead Score (integer 0 to 100 based on purchase intent and completeness)
5. Extracted fields (PAN, GSTIN, Email, Company Name, Person Name if mentioned)
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: { type: Type.STRING },
                serviceCategory: { type: Type.STRING },
                sentiment: { type: Type.STRING },
                leadScore: { type: Type.NUMBER },
                extractedFields: {
                  type: Type.OBJECT,
                  properties: {
                    pan: { type: Type.STRING },
                    gstin: { type: Type.STRING },
                    email: { type: Type.STRING },
                    companyName: { type: Type.STRING },
                    name: { type: Type.STRING },
                  },
                },
              },
              required: ['intent', 'serviceCategory', 'sentiment', 'leadScore'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return {
            intent: parsed.intent || 'INQUIRY',
            serviceCategory: parsed.serviceCategory || 'General',
            sentiment: parsed.sentiment || 'NEUTRAL',
            leadScore: parsed.leadScore || 60,
            extractedFields: parsed.extractedFields || {},
          };
        }
      } catch (err) {
        console.warn('[AISalesWorkspaceService] Gemini call failed for detectIntentAndService:', err);
      }
    }

    // Heuristic Fallback
    const textUpper = messageText.toUpperCase();
    let serviceCategory = 'General Compliance';
    let leadScore = 65;

    if (textUpper.includes('GST')) {
      serviceCategory = 'GST Registration & Return';
      leadScore = 80;
    } else if (textUpper.includes('COMPANY') || textUpper.includes('PVT') || textUpper.includes('MCA')) {
      serviceCategory = 'Private Limited Company';
      leadScore = 85;
    } else if (textUpper.includes('ITR') || textUpper.includes('TAX') || textUpper.includes('RETURN')) {
      serviceCategory = 'Income Tax Return';
      leadScore = 75;
    }

    return {
      intent: textUpper.includes('PRICE') || textUpper.includes('COST') ? 'PRICING' : 'INQUIRY',
      serviceCategory,
      sentiment: textUpper.includes('URGENT') || textUpper.includes('ASAP') ? 'URGENT' : 'NEUTRAL',
      leadScore,
      extractedFields: {},
    };
  }

  /**
   * 3. Summarize Conversation History
   */
  public static async summarizeConversation(conversationId: string): Promise<AISummaryResult> {
    const messages = getMessages(conversationId);
    const conv = getConversationById(conversationId);

    if (messages.length === 0) {
      return {
        summary: 'No messages exchanged in this conversation thread yet.',
        keyRequirements: [],
        missingDocuments: [],
        nextSteps: ['Initiate customer contact via WhatsApp welcome message.'],
      };
    }

    const threadText = messages
      .map((m) => `[${m.timestamp.substring(11, 16)}] ${m.senderName}: ${m.content}`)
      .join('\n');

    const prompt = `
Summarize this customer conversation thread for executive handoff at Efilingg Compliance CRM:
Service Category: ${conv?.serviceCategory || 'General'}
Customer Name: ${conv?.customerName || 'Customer'}

Conversation Thread:
${threadText}

Provide:
1. Short 2-sentence executive summary.
2. List of key requirements discussed.
3. Missing compliance documents needed.
4. Next recommended steps for the sales executive.
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
                nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['summary', 'keyRequirements', 'missingDocuments', 'nextSteps'],
            },
          },
        });

        if (response.text) {
          return JSON.parse(response.text.trim());
        }
      } catch (err) {
        console.warn('[AISalesWorkspaceService] Gemini call failed for summarizeConversation:', err);
      }
    }

    // Heuristic Fallback
    return {
      summary: `Customer ${conv?.customerName} inquired about ${conv?.serviceCategory || 'compliance services'} via ${conv?.channel || 'WhatsApp'}. Total ${messages.length} messages exchanged.`,
      keyRequirements: [`Service Requested: ${conv?.serviceCategory || 'GST / Tax Filing'}`],
      missingDocuments: ['Identity Proof (PAN & Aadhaar)', 'Address Proof (Electricity Bill / Rent Agreement)'],
      nextSteps: ['Verify uploaded documents', 'Send official proposal & fee quotation'],
    };
  }

  /**
   * 4. AI Auto-Reply Generation
   */
  public static async generateAutoReply(
    conversationId: string,
    customerMessageText: string
  ): Promise<MessageV2 | null> {
    const conv = getConversationById(conversationId);
    if (!conv) return null;

    // Check if escalation requested by customer
    if (
      customerMessageText.toLowerCase().includes('agent') ||
      customerMessageText.toLowerCase().includes('human') ||
      customerMessageText.toLowerCase().includes('speak to manager')
    ) {
      // Escalate conversation to human executive
      conv.assignedType = 'HUMAN_EXECUTIVE';
      saveConversation(conv);

      eventBus.publishAsync('ConversationAssigned', 'CONVERSATION', {
        conversationId: conv.id,
        assignedType: 'HUMAN_EXECUTIVE',
        assignedId: conv.assignedExecutiveId,
        assignedBy: 'AIEscalationEngine',
      });

      addTimelineEntry(
        conv.id,
        'ESCALATED_TO_HUMAN',
        `AI Escalated conversation to human executive ${conv.assignedExecutiveName} upon customer request.`,
        'AIAgent'
      );

      const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const escalationReply: MessageV2 = {
        id: msgId,
        conversationId: conv.id,
        direction: 'OUTBOUND',
        senderId: 'AI-AGENT',
        senderName: 'Efilingg AI Assistant',
        messageType: 'TEXT',
        content: `I am connecting you with our senior compliance executive ${conv.assignedExecutiveName}. They will take over this chat immediately!`,
        deliveryStatus: 'DELIVERED',
        timestamp: new Date().toISOString(),
      };
      saveMessage(escalationReply);
      return escalationReply;
    }

    // Generate AI Auto-Reply using Gemini
    const catalog = this.getCRMServiceCatalog();
    const prompt = `
You are Efilingg AI Assistant responding to a customer query on WhatsApp.
Customer Message: "${customerMessageText}"
Service Category: ${conv.serviceCategory || 'Compliance'}
CRM Catalog:
${catalog}

Provide a polite, accurate, concise WhatsApp response (max 3 sentences) answering their inquiry or explaining the next compliance steps.
`;

    let replyText = 'Thank you for your message! Our compliance team is processing your request and will provide full details shortly.';

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        if (response.text) {
          replyText = response.text.trim();
        }
      } catch (err) {
        console.warn('[AISalesWorkspaceService] Gemini auto-reply failed:', err);
      }
    }

    const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const autoReplyMsg: MessageV2 = {
      id: msgId,
      conversationId: conv.id,
      direction: 'OUTBOUND',
      senderId: 'AI-AGENT',
      senderName: 'Efilingg AI Assistant',
      messageType: 'TEXT',
      content: replyText,
      deliveryStatus: 'DELIVERED',
      timestamp: new Date().toISOString(),
    };

    saveMessage(autoReplyMsg);

    addTimelineEntry(
      conv.id,
      'AI_AUTO_REPLY',
      `AI Auto-replied: "${replyText.substring(0, 60)}..."`,
      'Efilingg AI Assistant'
    );

    return autoReplyMsg;
  }

  /**
   * 5. Generate Service Document Checklist
   */
  public static generateDocumentChecklist(serviceCategory: string): string[] {
    const catUpper = serviceCategory.toUpperCase();

    if (catUpper.includes('GST')) {
      return [
        'PAN Card of Business Owner / Company',
        'Aadhaar Card of Applicant',
        'Passport Size Photo',
        'Proof of Business Registration (Rent Agreement / Ownership Deed)',
        'Latest Electricity Bill of Business Premises',
        'Bank Cancelled Cheque / Statement',
      ];
    } else if (catUpper.includes('MCA') || catUpper.includes('COMPANY') || catUpper.includes('PVT')) {
      return [
        'PAN Card & Aadhaar of all Directors (Minimum 2)',
        'Passport Size Photograph of Directors',
        'Bank Statement / Utility Bill of Directors (not older than 2 months)',
        'Registered Office Proof (Electricity Bill + NOC from landlord)',
        'Digital Signature Certificates (DSC) - We issue this for you',
        'Proposed Company Names (Top 2 choices)',
      ];
    } else if (catUpper.includes('ITR') || catUpper.includes('TAX')) {
      return [
        'PAN Card & Aadhaar Card',
        'Form 16 / Form 16A from Employer / Deductor',
        'Bank Statements for FY (April 1 to March 31)',
        'Investment Proofs (80C, 80D, NPS, Home Loan Interest)',
        'Capital Gain Statements from Broker (if trading stocks/crypto)',
      ];
    } else if (catUpper.includes('TRADEMARK')) {
      return [
        'Logo / Brand Name Specimen',
        'Applicant Identity Proof (PAN / Passport)',
        'Udyam / MSME Certificate (For 50% Govt Fee discount)',
        'Signed Form TM-48 Authorization',
      ];
    }

    return [
      'Identity Proof (PAN Card / Aadhaar Card)',
      'Address Proof (Utility Bill / Bank Statement)',
      'Business Registration Document (if applicable)',
    ];
  }

  /**
   * 6. Executive Takeover Management
   */
  public static toggleTakeover(
    conversationId: string,
    targetAssignedType: 'AI_AGENT' | 'HUMAN_EXECUTIVE',
    executiveId?: string,
    executiveName?: string
  ): ConversationV2 {
    const conv = getConversationById(conversationId);
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found.`);
    }

    conv.assignedType = targetAssignedType;
    if (executiveId) conv.assignedExecutiveId = executiveId;
    if (executiveName) conv.assignedExecutiveName = executiveName;
    conv.updatedAt = new Date().toISOString();

    saveConversation(conv);

    const actor = executiveName || 'Executive';
    const actionDesc =
      targetAssignedType === 'HUMAN_EXECUTIVE'
        ? `${actor} took over conversation control from AI.`
        : `${actor} returned conversation control back to AI Auto-Pilot.`;

    addTimelineEntry(conv.id, 'CONVERSATION_TAKEOVER_TOGGLED', actionDesc, actor);

    eventBus.publishAsync('ConversationAssigned', 'CONVERSATION', {
      conversationId: conv.id,
      assignedType: targetAssignedType,
      assignedId: conv.assignedExecutiveId,
      assignedBy: actor,
    });

    return conv;
  }

  /**
   * 7. Internal Notes Management
   */
  public static addInternalNote(
    conversationId: string,
    authorId: string,
    authorName: string,
    content: string
  ): InternalNote {
    const note: InternalNote = {
      id: `NOTE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      conversationId,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
    };

    if (!internalNotesStore[conversationId]) {
      internalNotesStore[conversationId] = [];
    }
    internalNotesStore[conversationId].push(note);

    addTimelineEntry(
      conversationId,
      'INTERNAL_NOTE_ADDED',
      `Internal Note by ${authorName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      authorName
    );

    return note;
  }

  public static getInternalNotes(conversationId: string): InternalNote[] {
    return internalNotesStore[conversationId] || [];
  }

  /**
   * 8. Conversation Tags Management
   */
  public static updateConversationTags(conversationId: string, tags: string[]): string[] {
    conversationTagsStore[conversationId] = tags;

    addTimelineEntry(
      conversationId,
      'TAGS_UPDATED',
      `Tags updated: ${tags.join(', ')}`,
      'Executive'
    );

    return tags;
  }

  public static getConversationTags(conversationId: string): string[] {
    return conversationTagsStore[conversationId] || ['Inquiry', 'Active'];
  }
}
