/**
 * Enterprise Lead Engine & Orchestrator
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Coordinates identity resolution, lead creation, conversation opening,
 * executive assignment, opportunity generation, and event bus publishing.
 */

import {
  CustomerV2,
  LeadV2,
  ConversationV2,
  MessageV2,
  OpportunityV2,
  ChannelType,
  AttachmentV2,
} from './types';
import { CustomerIdentityService } from './CustomerIdentityService';
import { ExecutiveAssignmentService } from './ExecutiveAssignmentService';
import {
  getLeadById,
  saveLead,
  getConversationByContact,
  getConversationById,
  saveConversation,
  saveMessage,
  saveOpportunity,
  addTimelineEntry,
} from './db';
import { eventBus } from '../eventBus';

export interface IngestInboundMessageOptions {
  channel: ChannelType;
  senderPhone: string;
  senderName?: string;
  senderEmail?: string;
  senderPan?: string;
  senderGstin?: string;
  companyName?: string;
  messageText: string;
  serviceRequested?: string;
  attachments?: AttachmentV2[];
  whatsappMessageId?: string;
  rawPayload?: Record<string, unknown>;
  createOpportunityIfCustomerExists?: boolean;
}

export interface IngestionResult {
  customerFound: boolean;
  customer?: CustomerV2;
  lead?: LeadV2;
  conversation: ConversationV2;
  message: MessageV2;
  opportunity?: OpportunityV2;
}

export class LeadEngineService {
  /**
   * Process Inbound Customer/Lead Message Flow
   */
  public static processInboundMessage(options: IngestInboundMessageOptions): IngestionResult {
    const normPhone = CustomerIdentityService.normalizePhone(options.senderPhone);
    const now = new Date().toISOString();

    // 1. Perform Customer Identity Resolution
    const lookup = CustomerIdentityService.findCustomer({
      phone: normPhone,
      email: options.senderEmail,
      pan: options.senderPan,
      gstin: options.senderGstin,
      companyName: options.companyName,
    });

    let customer: CustomerV2 | undefined = undefined;
    let lead: LeadV2 | undefined = undefined;
    let opportunity: OpportunityV2 | undefined = undefined;

    if (lookup.matchFound && lookup.customer) {
      // ==========================================
      // EXISTING CUSTOMER FLOW
      // ==========================================
      customer = lookup.customer;

      eventBus.publishAsync('CustomerMatched', 'CUSTOMER', {
        leadId: '',
        customerId: customer.id,
        matchType: lookup.matchType || 'PHONE',
        confidenceScore: lookup.confidenceScore || 1.0,
      });

      // Optionally create an Opportunity if requested or service identified
      if (options.createOpportunityIfCustomerExists || options.serviceRequested) {
        const oppId = `OPP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        opportunity = {
          id: oppId,
          title: `${options.serviceRequested || 'General Inquiry'} - ${customer.name}`,
          customerId: customer.id,
          serviceCategory: options.serviceRequested || 'General',
          estimatedValue: 5000,
          stage: 'DISCOVERY',
          assignedExecutiveId: customer.assignedExecutiveId,
          assignedExecutiveName: customer.assignedExecutiveName,
          createdAt: now,
          updatedAt: now,
        };
        saveOpportunity(opportunity);
      }
    } else {
      // ==========================================
      // NEW CUSTOMER -> CREATE LEAD FLOW
      // ==========================================
      const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Assign Executive for the new Lead
      const assignment = ExecutiveAssignmentService.assignExecutive({
        strategy: 'ROUND_ROBIN',
        serviceCategory: options.serviceRequested,
      });

      lead = {
        id: leadId,
        name: options.senderName || `Lead (${normPhone})`,
        phone: normPhone,
        email: options.senderEmail,
        pan: options.senderPan,
        gstin: options.senderGstin,
        companyName: options.companyName,
        source: `${options.channel}_INBOUND`,
        serviceRequested: options.serviceRequested || 'General Compliance Inquiry',
        status: 'NEW',
        assignedExecutiveId: assignment.executiveId,
        assignedExecutiveName: assignment.executiveName,
        createdAt: now,
        updatedAt: now,
      };

      saveLead(lead);

      // Publish LeadCreated Event
      eventBus.publishAsync('LeadCreated', 'LEAD', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        assignedTo: lead.assignedExecutiveId,
        serviceRequested: lead.serviceRequested,
      });
    }

    // 2. Open or Retrieve Conversation
    let conversation = getConversationByContact(normPhone);

    if (!conversation) {
      const convId = `CONV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Executive assignment for conversation
      const executiveAssignment = ExecutiveAssignmentService.assignExecutive({
        strategy: 'ROUND_ROBIN',
        existingExecutiveId: customer?.assignedExecutiveId || lead?.assignedExecutiveId,
        serviceCategory: options.serviceRequested,
      });

      conversation = {
        id: convId,
        channel: options.channel,
        contactNumber: normPhone,
        customerId: customer?.id,
        leadId: lead?.id,
        customerName: customer?.name || lead?.name || options.senderName || normPhone,
        state: 'OPEN',
        assignedExecutiveId: executiveAssignment.executiveId,
        assignedExecutiveName: executiveAssignment.executiveName,
        assignedType: executiveAssignment.assignmentStrategy === 'MANUAL' ? 'HUMAN_EXECUTIVE' : 'ROUND_ROBIN',
        serviceCategory: options.serviceRequested || 'General',
        unreadCount: 1,
        createdAt: now,
        updatedAt: now,
      };

      saveConversation(conversation);

      // Publish ConversationCreated Event
      eventBus.publishAsync('ConversationCreated', 'CONVERSATION', {
        conversationId: conversation.id,
        channel: conversation.channel,
        customerId: conversation.customerId,
        contactNumber: conversation.contactNumber,
      });

      addTimelineEntry(
        conversation.id,
        'CONVERSATION_CREATED',
        `Conversation created via ${options.channel} from ${conversation.customerName}`,
        'SystemIngestion'
      );
    } else {
      // Re-open conversation if closed
      if (conversation.state === 'CLOSED') {
        conversation.state = 'OPEN';
        saveConversation(conversation);
      }
    }

    // 3. Save Inbound Message
    const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const message: MessageV2 = {
      id: msgId,
      conversationId: conversation.id,
      direction: 'INBOUND',
      senderId: customer?.id || lead?.id || normPhone,
      senderName: conversation.customerName,
      messageType: options.attachments && options.attachments.length > 0 ? 'IMAGE' : 'TEXT',
      content: options.messageText,
      attachments: options.attachments,
      whatsappMessageId: options.whatsappMessageId,
      deliveryStatus: 'DELIVERED',
      timestamp: now,
      rawPayload: options.rawPayload,
    };

    saveMessage(message);

    // 4. Record Timeline Activity
    addTimelineEntry(
      conversation.id,
      'MESSAGE_RECEIVED',
      `Inbound message: "${options.messageText.substring(0, 50)}${options.messageText.length > 50 ? '...' : ''}"`,
      conversation.customerName
    );

    eventBus.publishAsync('TimelineUpdated', 'TIMELINE', {
      entityType: customer ? 'CUSTOMER' : 'LEAD',
      entityId: customer?.id || lead?.id || conversation.id,
      activityType: 'INBOUND_MESSAGE',
      summary: `Received message on ${options.channel}: ${options.messageText}`,
      actor: conversation.customerName,
    });

    return {
      customerFound: !!customer,
      customer,
      lead,
      conversation,
      message,
      opportunity,
    };
  }
}
