/**
 * Efilingg CRM Enterprise Block 1 Data Types & Interfaces
 *
 * Covers WhatsApp Cloud API, Customer Identity, Conversation Engine,
 * Lead Engine, Executive Assignment, and Opportunity Engine.
 */

export type ChannelType = 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';

export type ConversationState = 'OPEN' | 'PENDING_CUSTOMER' | 'CLOSED';

export type AssignmentType = 'AI_AGENT' | 'HUMAN_EXECUTIVE' | 'ROUND_ROBIN' | 'DEPARTMENT';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export type MessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'LOCATION' | 'TEMPLATE' | 'INTERACTIVE';

export type DeliveryStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface AttachmentV2 {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  url: string;
  mimeType?: string;
  whatsappMediaId?: string;
}

export interface CustomerV2 {
  id: string;
  name: string;
  phone: string; // E.164 normalized format, e.g. "919876543210"
  email?: string;
  pan?: string;
  gstin?: string;
  companyName?: string;
  address?: string;
  tags?: string[];
  assignedExecutiveId?: string;
  assignedExecutiveName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadV2 {
  id: string;
  name: string;
  phone: string;
  email?: string;
  pan?: string;
  gstin?: string;
  companyName?: string;
  source: string; // e.g. "WHATSAPP_INBOUND", "WEBSITE_FORM", "MANUAL"
  serviceRequested?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'DISQUALIFIED';
  assignedExecutiveId?: string;
  assignedExecutiveName?: string;
  convertedCustomerId?: string;
  campaignSource?: string;
  adSetId?: string;
  adId?: string;
  clickId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityV2 {
  id: string;
  title: string;
  customerId: string;
  leadId?: string;
  serviceCategory: string; // GST, MCA, ITR, Trademark, Audit, etc.
  estimatedValue: number;
  stage: 'DISCOVERY' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
  assignedExecutiveId?: string;
  assignedExecutiveName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveV2 {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  isActive: boolean;
  assignedConversationsCount: number;
}

export interface MessageV2 {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderId: string; // Customer ID, Executive ID, or WhatsApp Phone
  senderName: string;
  messageType: MessageType;
  content: string;
  attachments?: AttachmentV2[];
  whatsappMessageId?: string;
  providerMessageId?: string;
  deliveryStatus: DeliveryStatus;
  timestamp: string;
  is_read?: boolean;
  isRead?: boolean;
  read_at?: string;
  readAt?: string;
  rawPayload?: Record<string, unknown>;
  rawProviderResponse?: Record<string, unknown> | string;
  providerSuccess?: boolean;
  providerErrorCode?: string | number;
  providerErrorMessage?: string;
  httpStatus?: number;
}

export interface ConversationTimelineEntry {
  id: string;
  conversationId: string;
  activityType: string; // e.g. 'MESSAGE_RECEIVED', 'EXECUTIVE_ASSIGNED', 'STATE_CHANGED', 'LEAD_CREATED'
  summary: string;
  actor: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ConversationV2 {
  id: string;
  channel: ChannelType;
  contactNumber: string; // Customer or Lead phone number
  customerId?: string;
  leadId?: string;
  customerName: string;
  state: ConversationState;
  lifecycleState?: string;
  marketingAttribution?: Record<string, unknown>;
  assignedExecutiveId?: string;
  assignedExecutiveName?: string;
  assignedType: AssignmentType;
  serviceCategory?: string;
  lastMessageText?: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  unread_count?: number;
  lastReadAt?: string;
  last_read_at?: string;
  srno?: string;
  wabaSrno?: string;
  wabaNumber?: string;
  mobile?: string;
  contactName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLogV2 {
  id: string;
  channel: string;
  direction: 'INBOUND' | 'OUTBOUND';
  payload: Record<string, unknown>;
  status: 'PROCESSED' | 'FAILED' | 'IGNORED';
  errorReason?: string;
  receivedAt: string;
}

export interface CustomerLookupResult {
  matchFound: boolean;
  customer?: CustomerV2;
  matchType?: 'PHONE' | 'EMAIL' | 'PAN' | 'GSTIN' | 'COMPANY';
  confidenceScore?: number; // 0.0 to 1.0
}

export interface ExecutiveAssignmentResult {
  executiveId: string;
  executiveName: string;
  assignmentStrategy: 'ROUND_ROBIN' | 'RELATIONSHIP_MANAGER' | 'DEPARTMENT' | 'MANUAL';
}
