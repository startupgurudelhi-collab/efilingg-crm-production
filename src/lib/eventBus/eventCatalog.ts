/**
 * Enterprise Standard Event Catalog & Payload Types
 * Efilingg CRM Enterprise Foundation Layer (Sprint 1.2)
 *
 * Defines strongly typed payload interfaces and registers standard enterprise event schemas.
 * Pure definitions - NO business logic or domain processing.
 */

import { eventRegistry } from './EventRegistry';

// ==========================================
// Payload Interfaces
// ==========================================

export interface LeadCreatedPayload {
  leadId: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  assignedTo?: string;
  serviceRequested?: string;
}

export interface LeadUpdatedPayload {
  leadId: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  updatedBy: string;
}

export interface CustomerMatchedPayload {
  leadId: string;
  customerId: string;
  matchType: 'PAN' | 'GSTIN' | 'PHONE' | 'EMAIL';
  confidenceScore: number;
}

export interface CustomerCreatedPayload {
  customerId: string;
  name: string;
  pan?: string;
  gstin?: string;
  email?: string;
  phone: string;
}

export interface ConversationCreatedPayload {
  conversationId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';
  customerId?: string;
  contactNumber: string;
}

export interface ConversationAssignedPayload {
  conversationId: string;
  assignedType: 'AI_AGENT' | 'HUMAN_EXECUTIVE';
  assignedId: string;
  assignedBy: string;
}

export interface TaskCreatedPayload {
  taskId: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedEntityId?: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  completedBy: string;
  completedAt: string;
  outcome?: string;
}

export interface WorkflowStartedPayload {
  workflowId: string;
  workflowType: string;
  entityId: string;
  initiatedBy: string;
}

export interface WorkflowCompletedPayload {
  workflowId: string;
  workflowType: string;
  status: 'SUCCESS' | 'FAILED' | 'TERMINATED';
  durationSeconds: number;
}

export interface DocumentUploadedPayload {
  documentId: string;
  documentType: 'PAN' | 'AADHAAR' | 'GST_CERTIFICATE' | 'MOA' | 'AOA' | 'OTHER';
  fileName: string;
  uploadedBy: string;
  fileSize: number;
}

export interface DocumentVerifiedPayload {
  documentId: string;
  verificationStatus: 'VERIFIED' | 'REJECTED';
  verifiedBy: 'AI_OCR' | 'HUMAN';
  rejectionReason?: string;
}

export interface ProposalGeneratedPayload {
  proposalId: string;
  leadId: string;
  amount: number;
  servicesIncluded: string[];
  generatedBy: string;
}

export interface ProposalViewedPayload {
  proposalId: string;
  viewedAt: string;
  ipAddress?: string;
}

export interface PaymentInitiatedPayload {
  paymentLinkId: string;
  amount: number;
  customerId: string;
  gateway: string;
}

export interface PaymentCompletedPayload {
  paymentId: string;
  transactionRef: string;
  amount: number;
  customerId: string;
  paidAt: string;
}

export interface PaymentFailedPayload {
  paymentLinkId: string;
  failureReason: string;
  gatewayErrorCode?: string;
}

export interface NotificationCreatedPayload {
  notificationId: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'ACTION_REQUIRED';
}

export interface TimelineUpdatedPayload {
  entityType: 'LEAD' | 'CUSTOMER' | 'CONVERSATION' | 'OPPORTUNITY';
  entityId: string;
  activityType: string;
  summary: string;
  actor: string;
}

export interface AuditLoggedPayload {
  auditId: string;
  action: string;
  actor: string;
  targetResource: string;
  details: string;
}

export interface FeatureFlagChangedPayload {
  flagKey: string;
  previousValue: boolean;
  newValue: boolean;
  changedBy: string;
}

export interface SystemStartedPayload {
  version: string;
  environment: string;
  timestamp: string;
}

export interface SystemStoppedPayload {
  reason: string;
  timestamp: string;
}

// ==========================================
// Catalog Registration Function
// ==========================================

export function registerStandardEventCatalog(): void {
  eventRegistry.register<LeadCreatedPayload>({
    eventName: 'LeadCreated',
    category: 'LEAD',
    version: '1.0',
    description: 'Triggered when a new sales lead enters the CRM',
    producer: 'LeadIngestionService',
    consumers: ['AIQueue', 'NotificationService', 'TimelineEngine'],
  });

  eventRegistry.register<LeadUpdatedPayload>({
    eventName: 'LeadUpdated',
    category: 'LEAD',
    version: '1.0',
    description: 'Triggered when lead details or status change',
    producer: 'LeadService',
    consumers: ['TimelineEngine', 'AuditLogService'],
  });

  eventRegistry.register<CustomerMatchedPayload>({
    eventName: 'CustomerMatched',
    category: 'CUSTOMER',
    version: '1.0',
    description: 'Triggered when identity resolution links a lead to an existing customer',
    producer: 'IdentityResolutionService',
    consumers: ['Customer360Engine', 'ConversationRouter'],
  });

  eventRegistry.register<CustomerCreatedPayload>({
    eventName: 'CustomerCreated',
    category: 'CUSTOMER',
    version: '1.0',
    description: 'Triggered when a verified new customer record is established',
    producer: 'CustomerService',
    consumers: ['Customer360Engine', 'AuditLogService'],
  });

  eventRegistry.register<ConversationCreatedPayload>({
    eventName: 'ConversationCreated',
    category: 'CONVERSATION',
    version: '1.0',
    description: 'Triggered when a new messaging thread is initialized',
    producer: 'ChannelIngestionService',
    consumers: ['AIReceptionAgent', 'ConversationQueue'],
  });

  eventRegistry.register<ConversationAssignedPayload>({
    eventName: 'ConversationAssigned',
    category: 'CONVERSATION',
    version: '1.0',
    description: 'Triggered when a conversation is assigned to AI or Human Executive',
    producer: 'ConversationRoutingService',
    consumers: ['NotificationService', 'TimelineEngine'],
  });

  eventRegistry.register<TaskCreatedPayload>({
    eventName: 'TaskCreated',
    category: 'TASK',
    version: '1.0',
    description: 'Triggered when a new operational or sales follow-up task is assigned',
    producer: 'TaskEngine',
    consumers: ['NotificationService', 'SLAEngine'],
  });

  eventRegistry.register<TaskCompletedPayload>({
    eventName: 'TaskCompleted',
    category: 'TASK',
    version: '1.0',
    description: 'Triggered when a task is marked completed',
    producer: 'TaskEngine',
    consumers: ['WorkflowEngine', 'TimelineEngine'],
  });

  eventRegistry.register<WorkflowStartedPayload>({
    eventName: 'WorkflowStarted',
    category: 'WORKFLOW',
    version: '1.0',
    description: 'Triggered when an automated workflow sequence initiates',
    producer: 'WorkflowEngine',
    consumers: ['SLAEngine', 'TimelineEngine'],
  });

  eventRegistry.register<WorkflowCompletedPayload>({
    eventName: 'WorkflowCompleted',
    category: 'WORKFLOW',
    version: '1.0',
    description: 'Triggered when a workflow finishes execution',
    producer: 'WorkflowEngine',
    consumers: ['OperationsService', 'AnalyticsEngine'],
  });

  eventRegistry.register<DocumentUploadedPayload>({
    eventName: 'DocumentUploaded',
    category: 'DOCUMENT',
    version: '1.0',
    description: 'Triggered when a customer uploads a document file',
    producer: 'DocumentService',
    consumers: ['AIDocumentAgent', 'Customer360Engine'],
  });

  eventRegistry.register<DocumentVerifiedPayload>({
    eventName: 'DocumentVerified',
    category: 'DOCUMENT',
    version: '1.0',
    description: 'Triggered when document OCR/manual validation succeeds or fails',
    producer: 'DocumentVerificationService',
    consumers: ['WorkflowEngine', 'NotificationService'],
  });

  eventRegistry.register<ProposalGeneratedPayload>({
    eventName: 'ProposalGenerated',
    category: 'PROPOSAL',
    version: '1.0',
    description: 'Triggered when a quotation proposal is generated',
    producer: 'ProposalEngine',
    consumers: ['NotificationService', 'TimelineEngine'],
  });

  eventRegistry.register<ProposalViewedPayload>({
    eventName: 'ProposalViewed',
    category: 'PROPOSAL',
    version: '1.0',
    description: 'Triggered when customer opens and views proposal link',
    producer: 'ProposalEngine',
    consumers: ['SalesFollowupEngine', 'NotificationService'],
  });

  eventRegistry.register<PaymentInitiatedPayload>({
    eventName: 'PaymentInitiated',
    category: 'PAYMENT',
    version: '1.0',
    description: 'Triggered when a payment link is issued to customer',
    producer: 'PaymentGatewayService',
    consumers: ['PaymentFollowupEngine', 'TimelineEngine'],
  });

  eventRegistry.register<PaymentCompletedPayload>({
    eventName: 'PaymentCompleted',
    category: 'PAYMENT',
    version: '1.0',
    description: 'Triggered when gateway confirms payment settlement',
    producer: 'PaymentGatewayWebhook',
    consumers: ['OperationsHandoverService', 'AccountsEngine', 'NotificationService'],
  });

  eventRegistry.register<PaymentFailedPayload>({
    eventName: 'PaymentFailed',
    category: 'PAYMENT',
    version: '1.0',
    description: 'Triggered when payment attempt fails or expires',
    producer: 'PaymentGatewayWebhook',
    consumers: ['NotificationService', 'SalesFollowupEngine'],
  });

  eventRegistry.register<NotificationCreatedPayload>({
    eventName: 'NotificationCreated',
    category: 'NOTIFICATION',
    version: '1.0',
    description: 'Triggered when system generates an alert or notification',
    producer: 'NotificationService',
    consumers: ['UIWebsocketGateway', 'PushNotificationService'],
  });

  eventRegistry.register<TimelineUpdatedPayload>({
    eventName: 'TimelineUpdated',
    category: 'TIMELINE',
    version: '1.0',
    description: 'Triggered when a new activity log entry is attached to an entity timeline',
    producer: 'TimelineEngine',
    consumers: ['Customer360Engine'],
  });

  eventRegistry.register<AuditLoggedPayload>({
    eventName: 'AuditLogged',
    category: 'AUDIT',
    version: '1.0',
    description: 'Triggered when an enterprise audit event is committed',
    producer: 'AuditService',
    consumers: ['SecurityMonitoringService'],
  });

  eventRegistry.register<FeatureFlagChangedPayload>({
    eventName: 'FeatureFlagChanged',
    category: 'FEATURE_FLAG',
    version: '1.0',
    description: 'Triggered when a feature flag runtime override changes state',
    producer: 'FeatureFlagService',
    consumers: ['SystemLogger'],
  });

  eventRegistry.register<SystemStartedPayload>({
    eventName: 'SystemStarted',
    category: 'SYSTEM',
    version: '1.0',
    description: 'Triggered on application initialization',
    producer: 'SystemBootstrap',
    consumers: ['HealthMonitorService'],
  });

  eventRegistry.register<SystemStoppedPayload>({
    eventName: 'SystemStopped',
    category: 'SYSTEM',
    version: '1.0',
    description: 'Triggered on application graceful shutdown',
    producer: 'SystemBootstrap',
    consumers: ['HealthMonitorService'],
  });
}

// Auto-register catalog on module load
registerStandardEventCatalog();
