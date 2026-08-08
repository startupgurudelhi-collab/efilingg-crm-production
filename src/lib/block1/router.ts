/**
 * Enterprise Block 1 Express REST Router
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * REST APIs for WhatsApp Cloud API, Customer Identity, Conversation Engine,
 * Lead Engine, Executive Assignment, and Automated Verification Suite.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CustomerIdentityService } from './CustomerIdentityService';
import { ExecutiveAssignmentService } from './ExecutiveAssignmentService';
import { LeadEngineService } from './LeadEngineService';
import { WhatsAppService, DEFAULT_WHATSAPP_VERIFY_TOKEN } from './WhatsAppService';
import { WhatsAppProviderFactory } from './WhatsAppProviderFactory';
import { WhatsAppMediaService } from './WhatsAppMediaService';
import {
  getCustomers,
  getLeads,
  getConversations,
  getConversationById,
  getMessages,
  saveConversation,
  getTimelineEntries,
  getWebhookLogs,
  getExecutives,
  resetBlock1DB,
} from './db';
import { eventBus, deadLetterQueue } from '../eventBus';

export const block1Router = Router();

// ==========================================
// 1. WhatsApp Cloud API Webhooks
// ==========================================

/**
 * Webhook Verification Endpoint (GET /api/whatsapp/webhook, GET /api/v2/whatsapp/webhook)
 */
const handleWebhookVerification = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const verification = WhatsAppService.verifyWebhook(mode, token, challenge);

  if (verification.verified && verification.challenge) {
    console.log('[WhatsApp Webhook] Verification SUCCESSFUL');
    return res.status(200).send(verification.challenge);
  }

  console.warn('[WhatsApp Webhook] Verification FAILED:', verification.reason);
  return res.status(403).json({ error: verification.reason || 'Verification failed.' });
};

block1Router.get('/whatsapp/webhook', handleWebhookVerification);
block1Router.get('/v2/whatsapp/webhook', handleWebhookVerification);

/**
 * Webhook Receiver Endpoint (POST /api/whatsapp/webhook, POST /api/v2/whatsapp/webhook)
 */
const handleWebhookIngestion = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await WhatsAppService.processWebhook(payload);
    return res.status(200).json({
      success: true,
      processedMessagesCount: result.processedMessages.length,
      updatedStatusesCount: result.updatedStatusesCount,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};

block1Router.post('/whatsapp/webhook', handleWebhookIngestion);
block1Router.post('/v2/whatsapp/webhook', handleWebhookIngestion);

/**
 * Send Outbound WhatsApp Message (POST /api/whatsapp/send, POST /api/v2/whatsapp/send, POST /api/v2/messages/send)
 */
const handleOutboundSend = async (req: Request, res: Response) => {
  try {
    const conversationId = req.body.conversationId || req.params.id;
    const { senderId, senderName, content, attachments } = req.body;
    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Missing required parameters: conversationId, content' });
    }

    const message = await WhatsAppService.sendOutboundMessageAsync({
      conversationId,
      senderId: senderId || 'SYSTEM_EXECUTIVE',
      senderName: senderName || 'Efilingg CRM Executive',
      content,
      attachments,
    });

    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};

block1Router.post('/whatsapp/send', handleOutboundSend);
block1Router.post('/v2/whatsapp/send', handleOutboundSend);
block1Router.post('/v2/messages/send', handleOutboundSend);

/**
 * Get Active WhatsApp Provider Status & Diagnostics (GET /api/v2/whatsapp/provider)
 */
block1Router.get('/v2/whatsapp/provider', (req: Request, res: Response) => {
  try {
    const statusReport = WhatsAppProviderFactory.getStatusReport();
    return res.status(200).json({
      success: true,
      report: statusReport,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Dynamically Switch Active WhatsApp Provider (POST /api/v2/whatsapp/provider/switch)
 */
block1Router.post('/v2/whatsapp/provider/switch', (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    if (!provider || !['meta', 'cpaas'].includes(String(provider).toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider value. Must be "meta" or "cpaas".',
      });
    }

    const targetProvider = String(provider).toLowerCase() as 'meta' | 'cpaas';
    WhatsAppProviderFactory.setRuntimeProviderOverride(targetProvider);

    const updatedReport = WhatsAppProviderFactory.getStatusReport();
    return res.status(200).json({
      success: true,
      message: `WhatsApp provider dynamically updated to ${targetProvider.toUpperCase()}.`,
      report: updatedReport,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send WhatsApp Template Message (POST /api/v2/whatsapp/send-template)
 * Supports OTP, Invoice, and Payment Reminder templates
 */
block1Router.post('/v2/whatsapp/send-template', async (req: Request, res: Response) => {
  try {
    const { toPhone, templateName, languageCode, components, conversationId, senderId, senderName } = req.body;
    if (!toPhone || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, templateName',
      });
    }

    const message = await WhatsAppService.sendTemplateMessageAsync({
      toPhone,
      templateName,
      languageCode: languageCode || 'en_US',
      components,
      conversationId,
      senderId,
      senderName,
    });

    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send WhatsApp OTP Message (POST /api/v2/whatsapp/send-otp)
 */
block1Router.post('/v2/whatsapp/send-otp', async (req: Request, res: Response) => {
  try {
    const { toPhone, otpCode } = req.body;
    if (!toPhone || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, otpCode',
      });
    }

    const message = await WhatsAppService.sendOtpAsync(toPhone, otpCode);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send WhatsApp Invoice PDF Message (POST /api/v2/whatsapp/send-invoice-pdf)
 */
block1Router.post('/v2/whatsapp/send-invoice-pdf', async (req: Request, res: Response) => {
  try {
    const { toPhone, pdfUrl, invoiceNumber, caption } = req.body;
    if (!toPhone || !pdfUrl || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, pdfUrl, invoiceNumber',
      });
    }

    const message = await WhatsAppService.sendInvoicePdfAsync(toPhone, pdfUrl, invoiceNumber, caption);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send WhatsApp Reminder Message (POST /api/v2/whatsapp/send-reminder)
 */
block1Router.post('/v2/whatsapp/send-reminder', async (req: Request, res: Response) => {
  try {
    const { toPhone, reminderTitle, dueDate } = req.body;
    if (!toPhone || !reminderTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, reminderTitle',
      });
    }

    const message = await WhatsAppService.sendReminderAsync(toPhone, reminderTitle, dueDate);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send WhatsApp Media Message (POST /api/v2/whatsapp/send-media)
 * Supports Images, Documents, Audio, Video
 */
block1Router.post('/v2/whatsapp/send-media', async (req: Request, res: Response) => {
  try {
    const { toPhone, mediaType, mediaUrl, caption, filename, conversationId, senderId, senderName } = req.body;
    if (!toPhone || !mediaType || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, mediaType, mediaUrl',
      });
    }

    const message = await WhatsAppService.sendMediaMessageAsync({
      toPhone,
      mediaType,
      mediaUrl,
      caption,
      filename,
      conversationId,
      senderId,
      senderName,
    });

    return res.status(200).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Test Provider Transmission (POST /api/v2/whatsapp/test-provider)
 */
block1Router.post('/v2/whatsapp/test-provider', async (req: Request, res: Response) => {
  try {
    const targetProviderType = req.body.provider
      ? (String(req.body.provider).toLowerCase() as 'meta' | 'cpaas')
      : WhatsAppProviderFactory.getActiveProviderType();

    const providerInstance = WhatsAppProviderFactory.getProvider(targetProviderType);

    const testMessage = await providerInstance.sendOutboundMessageAsync({
      conversationId: req.body.conversationId || 'CONV-TEST-PROVIDER',
      senderId: 'SYS_TESTER',
      senderName: 'Provider Test Suite',
      content: `Provider Test Verification on ${providerInstance.getProviderName()} at ${new Date().toISOString()}`,
    });

    return res.status(200).json({
      success: testMessage.deliveryStatus === 'SENT' || testMessage.providerSuccess === true,
      provider: providerInstance.getProviderName(),
      message: testMessage,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Cached WhatsApp Media List (GET /api/v2/whatsapp/media/cache)
 */
block1Router.get('/v2/whatsapp/media/cache', (req: Request, res: Response) => {
  try {
    const records = WhatsAppMediaService.getAllCachedRecords();
    return res.status(200).json({
      success: true,
      count: records.length,
      media: records,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * On-Demand Download / Retrieve WhatsApp Media (POST /api/v2/whatsapp/media/download, GET /api/v2/whatsapp/media/:mediaId)
 */
block1Router.post('/v2/whatsapp/media/download', async (req: Request, res: Response) => {
  try {
    const { mediaId, mimeType, filename, caption } = req.body;
    if (!mediaId) {
      return res.status(400).json({ success: false, error: 'mediaId parameter is required.' });
    }

    const record = await WhatsAppMediaService.downloadAndCacheMedia({
      mediaId,
      mimeType,
      filename,
      caption,
    });

    return res.status(200).json({
      success: true,
      record,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

block1Router.get('/v2/whatsapp/media/:mediaId', async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.mediaId;
    const isJson = req.query.json === 'true' || (req.headers.accept && req.headers.accept.includes('application/json'));

    let record = WhatsAppMediaService.getCachedMedia(mediaId);
    if (!record) {
      record = await WhatsAppMediaService.downloadAndCacheMedia({ mediaId });
    }

    if (isJson) {
      return res.status(200).json({ success: true, record });
    }

    if (record && record.storage_path && fs.existsSync(record.storage_path)) {
      const mime = record.mime_type || 'image/jpeg';
      res.setHeader('Content-Type', mime);
      return res.sendFile(path.resolve(record.storage_path));
    }

    return res.status(404).send('Media file not found');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. Customer Identity REST Endpoints
// ==========================================

/**
 * Customer Identity Lookup (GET /api/v2/customers/lookup)
 */
block1Router.get('/v2/customers/lookup', (req: Request, res: Response) => {
  const phone = req.query.phone as string | undefined;
  const email = req.query.email as string | undefined;
  const pan = req.query.pan as string | undefined;
  const gstin = req.query.gstin as string | undefined;
  const companyName = req.query.companyName as string | undefined;

  const lookupResult = CustomerIdentityService.findCustomer({
    phone,
    email,
    pan,
    gstin,
    companyName,
  });

  return res.status(200).json({
    success: true,
    result: lookupResult,
  });
});

/**
 * Get All Customers (GET /api/v2/customers)
 */
block1Router.get('/v2/customers', (req: Request, res: Response) => {
  const customers = getCustomers();
  return res.status(200).json({
    success: true,
    count: customers.length,
    customers,
  });
});

/**
 * Create Customer with Duplicate Prevention (POST /api/v2/customers)
 */
block1Router.post('/v2/customers', (req: Request, res: Response) => {
  try {
    const { name, phone, email, pan, gstin, companyName, address, tags, assignedExecutiveId, assignedExecutiveName } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    const customer = CustomerIdentityService.createCustomer({
      name,
      phone,
      email,
      pan,
      gstin,
      companyName,
      address,
      tags,
      assignedExecutiveId,
      assignedExecutiveName,
    });

    return res.status(201).json({ success: true, customer });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. Lead Engine REST Endpoints
// ==========================================

/**
 * Get All Leads (GET /api/v2/leads)
 */
block1Router.get('/v2/leads', (req: Request, res: Response) => {
  const leads = getLeads();
  return res.status(200).json({
    success: true,
    count: leads.length,
    leads,
  });
});

/**
 * Ingest Inbound Lead / Message (POST /api/v2/leads/ingest)
 */
block1Router.post('/v2/leads/ingest', (req: Request, res: Response) => {
  try {
    const {
      channel,
      senderPhone,
      senderName,
      senderEmail,
      senderPan,
      senderGstin,
      companyName,
      messageText,
      serviceRequested,
      attachments,
      createOpportunityIfCustomerExists,
    } = req.body;

    if (!senderPhone || !messageText) {
      return res.status(400).json({ error: 'Missing required parameters: senderPhone, messageText' });
    }

    const ingestion = LeadEngineService.processInboundMessage({
      channel: channel || 'WHATSAPP',
      senderPhone,
      senderName,
      senderEmail,
      senderPan,
      senderGstin,
      companyName,
      messageText,
      serviceRequested,
      attachments,
      createOpportunityIfCustomerExists: !!createOpportunityIfCustomerExists,
    });

    return res.status(200).json({ success: true, ingestion });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. Conversation Engine REST Endpoints
// ==========================================

/**
 * List Conversations (GET /api/v2/conversations)
 */
block1Router.get('/v2/conversations', (req: Request, res: Response) => {
  try {
    const state = req.query.state as string | undefined;
    const executiveId = req.query.executiveId as string | undefined;

    let conversations = getConversations();
    if (state) {
      conversations = conversations.filter((c) => c.state === state);
    }
    if (executiveId) {
      conversations = conversations.filter((c) => c.assignedExecutiveId === executiveId);
    }

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[GET /api/v2/conversations error]:', error);
    return res.status(500).json({
      success: false,
      count: 0,
      conversations: [],
      error: error.message,
    });
  }
});

/**
 * Get Conversation Details & Messages (GET /api/v2/conversations/:id)
 */
block1Router.get('/v2/conversations/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const conversation = getConversationById(id);
    if (!conversation) {
      return res.status(404).json({ error: `Conversation ${id} not found.` });
    }

    const messages = getMessages(id);
    const timeline = getTimelineEntries(id);

    return res.status(200).json({
      success: true,
      conversation,
      messagesCount: messages.length,
      messages,
      timeline,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Post Outbound Message to Conversation (POST /api/v2/conversations/:id/messages)
 */
block1Router.post('/v2/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { senderId, senderName, content, attachments } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const message = await WhatsAppService.sendOutboundMessageAsync({
      conversationId,
      senderId: senderId || 'EMP-ADMIN',
      senderName: senderName || 'Executive',
      content,
      attachments,
    });

    return res.status(201).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reassign Conversation Executive (PATCH /api/v2/conversations/:id/assign)
 */
block1Router.patch('/v2/conversations/:id/assign', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { strategy, executiveId } = req.body;

    const conv = getConversationById(conversationId);
    if (!conv) {
      return res.status(404).json({ error: `Conversation ${conversationId} not found.` });
    }

    const assignment = ExecutiveAssignmentService.assignExecutive({
      strategy: strategy || (executiveId ? 'MANUAL' : 'ROUND_ROBIN'),
      manualExecutiveId: executiveId,
      serviceCategory: conv.serviceCategory,
    });

    conv.assignedExecutiveId = assignment.executiveId;
    conv.assignedExecutiveName = assignment.executiveName;
    conv.assignedType = assignment.assignmentStrategy === 'MANUAL' ? 'HUMAN_EXECUTIVE' : 'ROUND_ROBIN';
    saveConversation(conv);

    ExecutiveAssignmentService.notifyAssignment(
      conv.id,
      assignment.executiveId,
      assignment.executiveName,
      'SupervisorAPI'
    );

    return res.status(200).json({ success: true, conversation: conv, assignment });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update Conversation State (PATCH /api/v2/conversations/:id/state)
 */
block1Router.patch('/v2/conversations/:id/state', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { state } = req.body;

    if (!['OPEN', 'PENDING_CUSTOMER', 'CLOSED'].includes(state)) {
      return res.status(400).json({ error: 'Invalid state value. Must be OPEN, PENDING_CUSTOMER, or CLOSED.' });
    }

    const conv = getConversationById(conversationId);
    if (!conv) {
      return res.status(404).json({ error: `Conversation ${conversationId} not found.` });
    }

    conv.state = state;
    if (state === 'OPEN') conv.unreadCount = 0;
    saveConversation(conv);

    return res.status(200).json({ success: true, conversation: conv });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. Diagnostics & Automated Testing Suite
// ==========================================

/**
 * Status Check Endpoint (GET /api/v2/block1/status)
 */
block1Router.get('/v2/block1/status', (req: Request, res: Response) => {
  const customers = getCustomers();
  const leads = getLeads();
  const conversations = getConversations();
  const messages = getMessages();
  const webhookLogs = getWebhookLogs();
  const executives = getExecutives();

  return res.status(200).json({
    status: 'ONLINE',
    module: 'BLOCK_1_BACKEND_INFRASTRUCTURE',
    metrics: {
      totalCustomers: customers.length,
      totalLeads: leads.length,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalWebhookLogs: webhookLogs.length,
      activeExecutives: executives.filter((e) => e.isActive).length,
    },
    eventBusMetrics: eventBus.getMetrics(),
    dlqSize: deadLetterQueue.size(),
  });
});

/**
 * Automated Verification Test Suite (POST /api/v2/block1/test/run-suite)
 *
 * Runs 5 automated checks verifying:
 * 1. Webhook Verification Challenge
 * 2. New Customer & Lead Creation Flow
 * 3. Existing Customer Match Flow
 * 4. Strict Duplicate Prevention Logic
 * 5. Conversation & Message Storage Integrity
 */
block1Router.post('/v2/block1/test/run-suite', (req: Request, res: Response) => {
  const suiteResults: Array<{ name: string; status: 'PASSED' | 'FAILED'; details: string }> = [];

  try {
    // Test 1: Webhook Verification Challenge
    const verifyResult = WhatsAppService.verifyWebhook(
      'subscribe',
      DEFAULT_WHATSAPP_VERIFY_TOKEN,
      'test_challenge_12345'
    );
    if (verifyResult.verified && verifyResult.challenge === 'test_challenge_12345') {
      suiteResults.push({
        name: 'Webhook Verification',
        status: 'PASSED',
        details: 'Correctly verified token and returned challenge.',
      });
    } else {
      suiteResults.push({
        name: 'Webhook Verification',
        status: 'FAILED',
        details: `Failed verification: ${verifyResult.reason}`,
      });
    }

    // Test 2: New Customer Flow
    const testPhoneNew = `9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newIngest = LeadEngineService.processInboundMessage({
      channel: 'WHATSAPP',
      senderPhone: testPhoneNew,
      senderName: 'Test Unregistered User',
      messageText: 'Hello I need help with GST Registration',
      serviceRequested: 'GST Compliance',
    });

    if (
      !newIngest.customerFound &&
      newIngest.lead &&
      newIngest.conversation &&
      newIngest.message &&
      newIngest.lead.assignedExecutiveId
    ) {
      suiteResults.push({
        name: 'New Customer & Lead Engine',
        status: 'PASSED',
        details: `Created Lead ID ${newIngest.lead.id} assigned to ${newIngest.lead.assignedExecutiveName}.`,
      });
    } else {
      suiteResults.push({
        name: 'New Customer & Lead Engine',
        status: 'FAILED',
        details: 'Failed to create lead or assign executive for new phone number.',
      });
    }

    // Test 3: Existing Customer Match Flow
    const existingCustIngest = LeadEngineService.processInboundMessage({
      channel: 'WHATSAPP',
      senderPhone: '919812492102', // Matches seeded customer Aditya Gupta
      messageText: 'Checking GSTR1 filing status for Apex Retails',
    });

    if (existingCustIngest.customerFound && existingCustIngest.customer?.id === 'CUST-1001') {
      suiteResults.push({
        name: 'Existing Customer Match',
        status: 'PASSED',
        details: `Matched existing customer CUST-1001 (${existingCustIngest.customer.name}).`,
      });
    } else {
      suiteResults.push({
        name: 'Existing Customer Match',
        status: 'FAILED',
        details: 'Failed to match existing customer Aditya Gupta (CUST-1001).',
      });
    }

    // Test 4: Duplicate Prevention Check
    const dupPhone = '919812492102';
    const dupCustomer = CustomerIdentityService.createCustomer({
      name: 'Duplicate Aditya Gupta',
      phone: dupPhone,
      email: 'compliance@apexretails.com',
    });

    if (dupCustomer.id === 'CUST-1001') {
      suiteResults.push({
        name: 'Duplicate Customer Prevention',
        status: 'PASSED',
        details: 'Prevented duplicate creation and returned existing customer record CUST-1001.',
      });
    } else {
      suiteResults.push({
        name: 'Duplicate Customer Prevention',
        status: 'FAILED',
        details: `Allowed duplicate customer creation with new ID ${dupCustomer.id}.`,
      });
    }

    // Test 5: Outbound Messaging & Storage Integrity
    const outboundTest = WhatsAppService.sendOutboundMessage({
      conversationId: newIngest.conversation.id,
      senderId: 'EMP-NEHA',
      senderName: 'Neha Sharma',
      content: 'Hello! I can assist you with your GST registration today.',
    });

    const convMessages = getMessages(newIngest.conversation.id);
    if (outboundTest && convMessages.length >= 2) {
      suiteResults.push({
        name: 'Conversation & Message Storage Integrity',
        status: 'PASSED',
        details: `Successfully stored inbound and outbound messages (${convMessages.length} total messages in thread).`,
      });
    } else {
      suiteResults.push({
        name: 'Conversation & Message Storage Integrity',
        status: 'FAILED',
        details: 'Failed to store or retrieve messages for conversation.',
      });
    }

    const allPassed = suiteResults.every((s) => s.status === 'PASSED');
    return res.status(200).json({
      success: allPassed,
      summary: allPassed ? 'ALL BLOCK 1 INFRASTRUCTURE TESTS PASSED' : 'SOME TESTS FAILED',
      suiteResults,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({
      success: false,
      error: error.message,
      suiteResults,
    });
  }
});
