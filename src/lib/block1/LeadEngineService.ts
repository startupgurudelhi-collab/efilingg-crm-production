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
  getCustomers,
  saveCustomer,
  getLeads,
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
  srno?: string;
  wabaSrno?: string;
  wabaNumber?: string;
  mobile?: string;
  contactName?: string;
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

    // 1. Customer Lookup
    const lookup = CustomerIdentityService.findCustomer({
      phone: normPhone,
      email: options.senderEmail,
      pan: options.senderPan,
      gstin: options.senderGstin,
      companyName: options.companyName,
    });

    console.log(`[Diagnostic 1/9] Customer Lookup | Phone: "${normPhone}" | Match Found: ${lookup.matchFound ? `YES (${lookup.customer?.id} - ${lookup.customer?.name})` : 'NO'}`);

    let customer: CustomerV2;
    if (lookup.matchFound && lookup.customer) {
      customer = lookup.customer;
      if (options.senderName && (customer.name.startsWith('WhatsApp Contact') || customer.name.startsWith('Lead (') || customer.name === normPhone)) {
        customer.name = options.senderName;
        saveCustomer(customer);
      }
      eventBus.publishAsync('CustomerMatched', 'CUSTOMER', {
        leadId: '',
        customerId: customer.id,
        matchType: lookup.matchType || 'PHONE',
        confidenceScore: lookup.confidenceScore || 1.0,
      });
      console.log(`[Diagnostic 2/9] Customer Updated/Matched | ID: ${customer.id} | Name: "${customer.name}" | Phone: "${customer.phone}"`);
    } else {
      // 2. Customer Creation
      customer = CustomerIdentityService.createCustomer({
        name: options.senderName || `WhatsApp Contact (${normPhone})`,
        phone: normPhone,
        email: options.senderEmail,
        pan: options.senderPan,
        gstin: options.senderGstin,
        companyName: options.companyName,
        tags: ['WHATSAPP_CLIENT'],
        assignedExecutiveId: 'EMP-ADMIN',
        assignedExecutiveName: 'Master Admin',
      });
      console.log(`[Diagnostic 2/9] Customer Created Automatically | ID: ${customer.id} | Name: "${customer.name}" | Phone: "${customer.phone}"`);
    }

    // 3. Lead Lookup
    const allLeads = getLeads();
    let openLead = allLeads.find(
      (l) =>
        (CustomerIdentityService.isPhoneMatch(l.phone, normPhone) || (customer && l.convertedCustomerId === customer.id)) &&
        l.status !== 'DISQUALIFIED'
    );

    console.log(`[Diagnostic 3/9] Lead Lookup | Customer ID: ${customer.id} | Open Lead Found: ${openLead ? `YES (${openLead.id} - ${openLead.status})` : 'NO'}`);

    let lead: LeadV2 = openLead!;
    let opportunity: OpportunityV2 | undefined = undefined;

    if (!openLead) {
      // 4. Lead Creation
      const assignment = ExecutiveAssignmentService.assignExecutive({
        strategy: 'ROUND_ROBIN',
        serviceCategory: options.serviceRequested,
      });
      const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      lead = {
        id: leadId,
        name: customer.name,
        phone: normPhone,
        email: options.senderEmail || customer.email,
        pan: options.senderPan || customer.pan,
        gstin: options.senderGstin || customer.gstin,
        companyName: options.companyName || customer.companyName,
        source: `${options.channel}_INBOUND`,
        serviceRequested: options.serviceRequested || 'General Inquiry',
        status: 'NEW',
        assignedExecutiveId: customer.assignedExecutiveId || assignment.executiveId,
        assignedExecutiveName: customer.assignedExecutiveName || assignment.executiveName,
        convertedCustomerId: customer.id,
        createdAt: now,
        updatedAt: now,
      };
      saveLead(lead);

      eventBus.publishAsync('LeadCreated', 'LEAD', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        assignedTo: lead.assignedExecutiveId,
        serviceRequested: lead.serviceRequested,
      });
      console.log(`[Diagnostic 4/9] Lead Created Automatically | ID: ${lead.id} | Name: "${lead.name}" | Assigned Executive: "${lead.assignedExecutiveName}"`);
    } else {
      console.log(`[Diagnostic 4/9] Existing Lead Retained | ID: ${lead.id} | Status: "${lead.status}"`);
    }

    // Optionally create Opportunity if requested
    if (options.createOpportunityIfCustomerExists || options.serviceRequested) {
      const oppId = `OPP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      opportunity = {
        id: oppId,
        title: `${options.serviceRequested || 'WhatsApp Inquiry'} - ${customer.name}`,
        customerId: customer.id,
        leadId: lead?.id,
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

    // 5. Conversation Lookup & CPaaS Identifier resolution
    let conversation = getConversationByContact(normPhone);
    console.log(`[Diagnostic 5/9] Conversation Lookup | Contact Phone: "${normPhone}" | Found: ${conversation ? `YES (${conversation.id} - ${conversation.state})` : 'NO'}`);

    const extractedSrno = options.srno || (options.rawPayload as any)?.srno || (options.rawPayload as any)?.sr_no || '51736254';
    const extractedWabaSrno = options.wabaSrno || (options.rawPayload as any)?.wabaSrno || (options.rawPayload as any)?.waba_srno || '1632';
    const extractedWabaNumber = options.wabaNumber || (options.rawPayload as any)?.wabaNumber || (options.rawPayload as any)?.waba_number || process.env.CPAAS_WABA_NUMBER || '919217666839';
    const extractedMobile = options.mobile || normPhone;
    const extractedContactName = options.contactName || options.senderName || customer.name || 'WhatsApp Contact';

    if (!conversation) {
      // 6. Conversation Creation
      const convId = `CONV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const executiveAssignment = ExecutiveAssignmentService.assignExecutive({
        strategy: 'ROUND_ROBIN',
        existingExecutiveId: customer.assignedExecutiveId || lead?.assignedExecutiveId,
        serviceCategory: options.serviceRequested,
      });

      conversation = {
        id: convId,
        channel: options.channel,
        contactNumber: normPhone,
        customerId: customer.id,
        leadId: lead?.id,
        customerName: customer.name,
        state: 'OPEN',
        assignedExecutiveId: executiveAssignment.executiveId,
        assignedExecutiveName: executiveAssignment.executiveName,
        assignedType: executiveAssignment.assignmentStrategy === 'MANUAL' ? 'HUMAN_EXECUTIVE' : 'ROUND_ROBIN',
        serviceCategory: options.serviceRequested || 'General Inquiry',
        unreadCount: 1,
        srno: extractedSrno,
        wabaSrno: extractedWabaSrno,
        wabaNumber: extractedWabaNumber,
        mobile: extractedMobile,
        contactName: extractedContactName,
        createdAt: now,
        updatedAt: now,
      };

      saveConversation(conversation);

      eventBus.publishAsync('ConversationCreated', 'CONVERSATION', {
        conversationId: conversation.id,
        channel: conversation.channel,
        customerId: conversation.customerId,
        contactNumber: conversation.contactNumber,
      });

      addTimelineEntry(
        conversation.id,
        'CONVERSATION_CREATED',
        `WhatsApp conversation opened with ${conversation.customerName}`,
        'WhatsAppWebhook'
      );
      console.log(`[Diagnostic 6/9] Conversation Created | ID: ${conversation.id} | Contact: "${conversation.contactNumber}" | Customer: "${conversation.customerName}" | SRNO: "${conversation.srno}"`);
    } else {
      let updated = false;
      if (!conversation.customerId && customer) {
        conversation.customerId = customer.id;
        updated = true;
      }
      if (!conversation.leadId && lead) {
        conversation.leadId = lead.id;
        updated = true;
      }
      if (conversation.customerName !== customer.name && customer.name) {
        conversation.customerName = customer.name;
        updated = true;
      }
      if (conversation.state === 'CLOSED') {
        conversation.state = 'OPEN';
        updated = true;
      }
      if (!conversation.srno || conversation.srno !== extractedSrno) {
        conversation.srno = extractedSrno;
        updated = true;
      }
      if (!conversation.wabaSrno || conversation.wabaSrno !== extractedWabaSrno) {
        conversation.wabaSrno = extractedWabaSrno;
        updated = true;
      }
      if (!conversation.wabaNumber || conversation.wabaNumber !== extractedWabaNumber) {
        conversation.wabaNumber = extractedWabaNumber;
        updated = true;
      }
      if (!conversation.mobile) {
        conversation.mobile = extractedMobile;
        updated = true;
      }
      if (!conversation.contactName) {
        conversation.contactName = extractedContactName;
        updated = true;
      }

      if (updated) {
        saveConversation(conversation);
      }
      console.log(`[Diagnostic 6/9] Conversation Retained/Updated | ID: ${conversation.id} | State: "${conversation.state}" | SRNO: "${conversation.srno}"`);
    }

    // 7. Save Message Insertion
    const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const message: MessageV2 = {
      id: msgId,
      conversationId: conversation.id,
      direction: 'INBOUND',
      senderId: customer.id,
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
    console.log(`[WHATSAPP MESSAGE SAVED] Saved message ID "${message.id}" (WhatsApp WAMID: "${message.whatsappMessageId || 'N/A'}") for conversation "${conversation.id}" from sender "${normPhone}"`);
    console.log(`[Diagnostic 7/9] Message Inserted | ID: ${message.id} | ConvID: ${conversation.id} | Direction: INBOUND | Content: "${message.content}"`);

    // 8. EventBus Emit
    addTimelineEntry(
      conversation.id,
      'MESSAGE_RECEIVED',
      `Inbound message: "${options.messageText.substring(0, 50)}${options.messageText.length > 50 ? '...' : ''}"`,
      conversation.customerName
    );

    eventBus.publishAsync('NewMessage', 'SYSTEM', {
      conversationId: conversation.id,
      messageId: message.id,
      senderName: message.senderName,
      content: message.content,
    });

    eventBus.publishAsync('TimelineUpdated', 'CONVERSATION', {
      conversationId: conversation.id,
    });

    console.log(`[Diagnostic 8/9] EventBus Emitted | Events: [CustomerMatched, LeadCreated/Updated, ConversationCreated/Updated, NewMessage, TimelineUpdated] for Conv ${conversation.id}`);

    eventBus.publishAsync('TimelineUpdated', 'TIMELINE', {
      entityType: 'CUSTOMER',
      entityId: customer.id,
      activityType: 'INBOUND_MESSAGE',
      summary: `Received message on ${options.channel}: ${options.messageText}`,
      actor: conversation.customerName,
    });

    eventBus.publishAsync('NewMessage', 'CONVERSATION', {
      conversationId: conversation.id,
      messageId: message.id,
      direction: message.direction,
      content: message.content,
    });

    return {
      customerFound: true,
      customer,
      lead,
      conversation,
      message,
      opportunity,
    };
  }
}
