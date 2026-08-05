/**
 * Enterprise AI Sales Workspace Types
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 2)
 */

import { ChannelType, DeliveryStatus, MessageType, AttachmentV2 } from '../block1/types';

export type InboxTabFilter =
  | 'ALL'
  | 'UNREAD'
  | 'ASSIGNED'
  | 'WAITING'
  | 'AI_HANDLING'
  | 'HUMAN_HANDLING'
  | 'HOT_LEADS'
  | 'EXISTING_CUSTOMERS';

export interface InternalNote {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AISuggestReplyResult {
  suggestedReplies: string[];
  detectedIntent?: string;
  detectedService?: string;
  recommendedAction?: string;
}

export interface AIDetectIntentResult {
  intent: 'INQUIRY' | 'DOCUMENT_SUBMISSION' | 'STATUS_CHECK' | 'PRICING' | 'ESCALATION_HUMAN' | 'UNKNOWN';
  serviceCategory: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'URGENT' | 'NEGATIVE';
  leadScore: number;
  extractedFields: {
    pan?: string;
    gstin?: string;
    email?: string;
    companyName?: string;
    name?: string;
  };
}

export interface AISummaryResult {
  summary: string;
  keyRequirements: string[];
  missingDocuments: string[];
  nextSteps: string[];
}

export interface NotificationAlert {
  id: string;
  type: 'NEW_MESSAGE' | 'NEW_LEAD' | 'AI_ESCALATION' | 'EXECUTIVE_ASSIGNMENT';
  title: string;
  message: string;
  conversationId?: string;
  timestamp: string;
  read: boolean;
}
