/**
 * Enterprise Block 3 MVP Production Architecture Types
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3)
 */

export interface MetaAttribution {
  pageId?: string;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;
  creativeId?: string;
  clickId?: string;
  referralSource?: string;
  landingTimestamp?: string;
  conversationSource?: string;
  marketingAttribution?: Record<string, unknown>;
}

export type ConversationLifecycleState =
  | 'NEW'
  | 'GREETING_SENT'
  | 'SERVICE_IDENTIFIED'
  | 'QUALIFICATION'
  | 'DOCUMENT_COLLECTION'
  | 'PROPOSAL_READY'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_RECEIVED'
  | 'OPERATIONS_ASSIGNED'
  | 'SERVICE_COMPLETED'
  | 'FOLLOWUP'
  | 'RENEWAL'
  | 'CLOSED';

export interface StateTransitionResult {
  success: boolean;
  previousState: ConversationLifecycleState;
  newState: ConversationLifecycleState;
  conversationId: string;
  transitionTime: string;
  error?: string;
}

export interface PromptTemplateOptions {
  promptName: string;
  version?: string;
  language?: string;
  variables?: Record<string, string>;
}

export interface HardeningMetrics {
  totalWebhookRequests: number;
  totalWebhookFailures: number;
  aiResponseTimeMsAvg: number;
  averageConversationTimeMinutes: number;
  activeConversationsCount: number;
  openConversationsCount: number;
  humanTakeoverPercentage: number;
  averageExecutiveResponseTimeMinutes: number;
  notificationQueueStatus: 'HEALTHY' | 'DEGRADED' | 'PAUSED';
}
