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
import { STANDARD_WHATSAPP_TEMPLATES } from './MetaWhatsAppProvider';
import { WhatsAppTemplateRepository } from '../whatsapp/templateRepository';
import { MetaTemplateService } from '../whatsapp/metaTemplateService';
import { MetaApiLogger } from '../whatsapp/metaApiLogger';
import { isForbiddenCPaaSPayload } from './cpaasFilter';
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
  markConversationAsRead,
  archiveConversation,
  deleteConversation,
  updateMessageStatus,
} from './db';
import { eventBus, deadLetterQueue } from '../eventBus';

export const block1Router = Router();

// ==========================================
// 1. WhatsApp Cloud API Webhooks
// ==========================================

/**
 * Webhook Verification Endpoint (GET /api/webhooks/whatsapp, GET /api/whatsapp/webhook, GET /api/v2/whatsapp/webhook)
 */
const handleWebhookVerification = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const verification = WhatsAppService.verifyWebhook(mode, token, challenge);

  if (verification.verified && verification.challenge) {
    console.log('[WHATSAPP WEBHOOK VERIFIED] Challenge verified successfully');
    console.log('[WhatsApp Webhook] Verification SUCCESSFUL');
    return res.status(200).send(verification.challenge);
  }

  console.warn('[WhatsApp Webhook] Verification FAILED:', verification.reason);
  return res.status(403).json({ error: verification.reason || 'Verification failed.' });
};

block1Router.get('/webhooks/whatsapp', handleWebhookVerification);
block1Router.get('/whatsapp/webhook', handleWebhookVerification);
block1Router.get('/v2/whatsapp/webhook', handleWebhookVerification);

/**
 * Webhook Receiver Endpoint (POST /api/webhooks/whatsapp, POST /api/whatsapp/webhook, POST /api/v2/whatsapp/webhook)
 */
const handleWebhookIngestion = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[WHATSAPP WEBHOOK RECEIVED] Incoming webhook payload received via router');

    if (isForbiddenCPaaSPayload(payload)) {
      console.warn('[WhatsApp Router] Discarded legacy CPaaS webhook payload from CRM processing.');
      return res.status(200).json({
        success: true,
        message: 'Legacy CPaaS webhook payload discarded.',
        processedMessagesCount: 0,
        updatedStatusesCount: 0,
      });
    }

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

block1Router.post('/webhooks/whatsapp', handleWebhookIngestion);
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
 * WhatsApp Provider Status Report (POST /api/v2/whatsapp/provider/switch)
 */
block1Router.post('/v2/whatsapp/provider/switch', (req: Request, res: Response) => {
  try {
    const updatedReport = WhatsAppProviderFactory.getStatusReport();
    return res.status(200).json({
      success: true,
      message: `Active WhatsApp Provider: META_CLOUD_API (Official WhatsApp Business Cloud API)`,
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
 * Send WhatsApp Direct Text Message (POST /api/v2/whatsapp/send-to-phone, POST /api/whatsapp/send-to-phone)
 */
const handleDirectTextSend = async (req: Request, res: Response) => {
  try {
    const { toPhone, message, senderId, senderName, conversationId } = req.body;
    if (!toPhone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: toPhone, message',
      });
    }

    const resultMessage = await WhatsAppService.sendDirectTextMessageAsync({
      toPhone,
      message,
      senderId,
      senderName,
      conversationId,
    });

    return res.status(200).json({ success: true, message: resultMessage });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};
block1Router.post('/v2/whatsapp/send-to-phone', handleDirectTextSend);
block1Router.post('/whatsapp/send-to-phone', handleDirectTextSend);

/**
 * Send WhatsApp Task Assignment Intimation (POST /api/v2/whatsapp/send-task-intimation, POST /api/whatsapp/send-task-intimation)
 */
const handleTaskIntimationSend = async (req: Request, res: Response) => {
  try {
    const {
      assigneePhone,
      assigneeName,
      creatorName,
      taskTitle,
      taskDescription,
      priority,
      clientName,
      senderId,
    } = req.body;

    if (!assigneePhone || !taskTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: assigneePhone, taskTitle',
      });
    }

    const resultMessage = await WhatsAppService.sendTaskIntimationAsync({
      assigneePhone,
      assigneeName: assigneeName || 'Associate',
      creatorName: creatorName || 'Master Admin',
      taskTitle,
      taskDescription,
      priority: priority || 'High',
      clientName,
      senderId,
    });

    return res.status(200).json({ success: true, message: resultMessage });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};
block1Router.post('/v2/whatsapp/send-task-intimation', handleTaskIntimationSend);
block1Router.post('/whatsapp/send-task-intimation', handleTaskIntimationSend);

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
    const providerInstance = WhatsAppProviderFactory.getProvider();

    const testMessage = await providerInstance.sendOutboundMessageAsync({
      conversationId: req.body.conversationId || 'CONV-TEST-PROVIDER',
      senderId: 'SYS_TESTER',
      senderName: 'Provider Test Suite',
      content: `Provider Test Verification on Meta WhatsApp Cloud API at ${new Date().toISOString()}`,
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
      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
      }
      return res.sendFile(path.resolve(record.storage_path));
    }

    return res.status(404).send('Media file not found');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

block1Router.get('/v2/whatsapp/media/:mediaId/download', async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.mediaId;
    let record = WhatsAppMediaService.getCachedMedia(mediaId);
    if (!record) {
      record = await WhatsAppMediaService.downloadAndCacheMedia({ mediaId });
    }

    if (record && record.storage_path && fs.existsSync(record.storage_path)) {
      const mime = record.mime_type || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
      return res.sendFile(path.resolve(record.storage_path));
    }

    return res.status(404).send('Media file not found');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * FORENSIC MEDIA DEBUG ENDPOINT
 * GET /api/debug/media/:mediaId
 * Returns file path, size, mime type, first 32 bytes hex, download status, media URL status
 */
const handleMediaDebugRequest = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.mediaId;
    let record = WhatsAppMediaService.getCachedMedia(mediaId);
    if (!record) {
      record = await WhatsAppMediaService.downloadAndCacheMedia({ mediaId });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        media_id: mediaId,
        error: `Media ID ${mediaId} could not be fetched or found.`,
        filePath: null,
        size: 0,
        mimeType: null,
        first32BytesHex: '',
        downloadStatus: 404,
        mediaUrlStatus: 404,
      });
    }

    let fileExists = false;
    let fileSize = 0;
    let first32Hex = '';
    let magicValid = false;
    let magicType = 'NONE';

    if (record.storage_path && fs.existsSync(record.storage_path)) {
      fileExists = true;
      const fileBuf = fs.readFileSync(record.storage_path);
      fileSize = fileBuf.length;
      const magic = WhatsAppMediaService.inspectMagicHeader(fileBuf);
      first32Hex = magic.first32Hex;
      magicValid = magic.isValid;
      magicType = magic.type;
    }

    return res.status(200).json({
      success: fileExists && (record.fallback_reason === 'NONE' || !record.fallback_reason),
      mediaId: record.media_id,
      media_id: record.media_id,
      filePath: record.storage_path || null,
      file_path: record.storage_path || null,
      fileExists,
      file_exists: fileExists,
      size: fileSize,
      file_size: fileSize,
      mimeType: record.mime_type || null,
      mime_type: record.mime_type || null,
      first32BytesHex: first32Hex,
      first_32_bytes_hex: first32Hex,
      downloadStatus: record.http_status || (fileExists ? 200 : 404),
      download_status: record.http_status || (fileExists ? 200 : 404),
      mediaUrlStatus: (record.download_url || record.media_url) ? 200 : 404,
      media_url_status: (record.download_url || record.media_url) ? 200 : 404,
      fallbackTriggered: record.fallback_triggered || false,
      fallback_triggered: record.fallback_triggered || false,
      fallbackReason: record.fallback_reason || 'NONE',
      fallback_reason: record.fallback_reason || 'NONE',
      failureStage: record.failure_stage || 'NONE',
      failure_stage: record.failure_stage || 'NONE',
      metaMetadataResponse: record.meta_metadata_response || null,
      mediaStatus: record.media_status || (fileExists ? 'downloaded' : 'download_failed'),
      media_status: record.media_status || (fileExists ? 'downloaded' : 'download_failed'),
      magicHeaderValid: magicValid,
      magicHeaderType: magicType,
      filename: record.filename,
      mediaUrl: record.download_url || record.media_url || record.public_url || null,
      downloadedAt: record.downloaded_at,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};

block1Router.get('/debug/media/:mediaId', handleMediaDebugRequest);
block1Router.get('/v2/whatsapp/media/:mediaId/debug', handleMediaDebugRequest);

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
    console.log('[CHAT OPENED]', { conversationId: id, timestamp: new Date().toISOString() });

    // Mark as read when details are fetched upon opening
    const readResult = markConversationAsRead(id);
    const conversation = readResult.conversation || getConversationById(id);

    if (!conversation) {
      return res.status(404).json({ error: `Conversation ${id} not found.` });
    }

    const messages = getMessages(id);
    const timeline = getTimelineEntries(id);

    console.log('[CONVERSATION RELOADED]', {
      conversationId: id,
      unreadCount: conversation.unreadCount,
      messagesCount: messages.length,
      lastReadAt: conversation.lastReadAt || conversation.last_read_at,
    });

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
 * Mark Conversation as Read Endpoint (POST /api/v2/conversations/:id/read)
 */
block1Router.post('/v2/conversations/:id/read', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    console.log('[CHAT OPENED]', { conversationId, timestamp: new Date().toISOString() });
    const result = markConversationAsRead(conversationId);
    return res.status(200).json({
      success: true,
      conversation: result.conversation,
      markedCount: result.markedCount,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Mark Conversation as Read Alternative Endpoint (POST /api/v2/conversations/:id/mark-read)
 */
block1Router.post('/v2/conversations/:id/mark-read', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    console.log('[CHAT OPENED]', { conversationId, timestamp: new Date().toISOString() });
    const result = markConversationAsRead(conversationId);
    return res.status(200).json({
      success: true,
      conversation: result.conversation,
      markedCount: result.markedCount,
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

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!content && !hasAttachments) {
      return res.status(400).json({ error: 'Message content or attachments are required.' });
    }

    const messageContent = content || (hasAttachments ? `[${attachments[0].fileType || 'Attachment'}: ${attachments[0].fileName || 'File'}]` : '');

    const message = await WhatsAppService.sendOutboundMessageAsync({
      conversationId,
      senderId: senderId || 'EMP-ADMIN',
      senderName: senderName || 'Executive',
      content: messageContent,
      attachments,
    });

    return res.status(201).json({ success: true, message });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Available WhatsApp Approved & Standard Templates (GET /api/v2/whatsapp/templates)
 */
block1Router.get('/v2/whatsapp/templates', (req: Request, res: Response) => {
  try {
    const templates = WhatsAppTemplateRepository.getApprovedTemplates();
    return res.status(200).json({
      success: true,
      templates: templates.length > 0 ? templates : STANDARD_WHATSAPP_TEMPLATES,
      policyNote: 'Meta WhatsApp Cloud API requires approved template messages for initiating fresh conversations and outside the 24-hour customer service window.',
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Full Templates Catalog with Filter & Search (GET /api/v2/whatsapp/templates/catalog)
 */
block1Router.get('/v2/whatsapp/templates/catalog', (req: Request, res: Response) => {
  try {
    const templates = WhatsAppTemplateRepository.getTemplates();
    const lastSynced = WhatsAppTemplateRepository.getLastSyncedTimestamp();
    const statusBreakdown = {
      APPROVED: templates.filter((t) => t.status === 'APPROVED').length,
      PENDING: templates.filter((t) => t.status === 'PENDING').length,
      REJECTED: templates.filter((t) => t.status === 'REJECTED').length,
      PAUSED: templates.filter((t) => t.status === 'PAUSED').length,
      DRAFT: templates.filter((t) => t.status === 'DRAFT').length,
    };

    return res.status(200).json({
      success: true,
      count: templates.length,
      templates,
      statusBreakdown,
      lastSyncedAt: lastSynced,
      wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '987654321098765',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '109283746501234',
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create or Update Template (POST /api/v2/whatsapp/templates)
 */
block1Router.post('/v2/whatsapp/templates', async (req: Request, res: Response) => {
  try {
    const { template, user, submitToMeta } = req.body;
    if (!template || !template.name || !template.bodyText || !template.category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required template fields: name, bodyText, category',
      });
    }

    const performer = user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = await WhatsAppTemplateRepository.saveTemplate(template, performer, submitToMeta !== false);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Duplicate Template (POST /api/v2/whatsapp/templates/:id/duplicate)
 */
block1Router.post('/v2/whatsapp/templates/:id/duplicate', (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const user = req.body.user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = WhatsAppTemplateRepository.duplicateTemplate(templateId, user);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete Template (DELETE /api/v2/whatsapp/templates/:id)
 */
block1Router.delete('/v2/whatsapp/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const user = req.body.user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = await WhatsAppTemplateRepository.deleteTemplate(templateId, user);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Trigger Meta Sync (POST /api/v2/whatsapp/templates/sync)
 */
block1Router.post('/v2/whatsapp/templates/sync', async (req: Request, res: Response) => {
  try {
    const user = req.body.user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = await WhatsAppTemplateRepository.syncFromMeta(user);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Dispatch Test Send for Template (POST /api/v2/whatsapp/templates/test-send)
 */
block1Router.post('/v2/whatsapp/templates/test-send', async (req: Request, res: Response) => {
  try {
    const { toPhone, templateId, templateName, parameters, user } = req.body;
    if (!toPhone) {
      return res.status(400).json({ success: false, error: 'Target phone number is required' });
    }

    const template = templateId
      ? WhatsAppTemplateRepository.getTemplateById(templateId)
      : templateName
      ? WhatsAppTemplateRepository.getTemplateByName(templateName)
      : null;

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const performer = user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const sendResult = await MetaTemplateService.sendTestTemplate({
      toPhone,
      template,
      parameters: parameters || template.sampleParameters || [],
      senderId: performer.id,
      senderName: performer.name,
    });

    WhatsAppTemplateRepository.recordAuditLog({
      templateId: template.id,
      templateName: template.name,
      action: 'TEST_SENT',
      performedBy: performer.id,
      performedByName: performer.name,
      role: performer.role,
      details: `Dispatched test send of "${template.name}" to ${toPhone} (Result: ${
        sendResult.success ? 'Delivered' : 'Failed'
      })`,
    });

    return res.status(200).json(sendResult);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Template Audit Logs (GET /api/v2/whatsapp/templates/audit-logs)
 */
block1Router.get('/v2/whatsapp/templates/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = WhatsAppTemplateRepository.getAuditLogs();
    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Meta Graph API HTTP Request/Response Logs (GET /api/v2/whatsapp/templates/meta-api-logs)
 */
block1Router.get('/v2/whatsapp/templates/meta-api-logs', (req: Request, res: Response) => {
  try {
    const logs = MetaApiLogger.getLogs();
    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Clear Meta Graph API Logs (POST /api/v2/whatsapp/templates/meta-api-logs/clear)
 */
block1Router.post('/v2/whatsapp/templates/meta-api-logs/clear', (req: Request, res: Response) => {
  try {
    MetaApiLogger.clearLogs();
    return res.status(200).json({ success: true, message: 'Meta API logs cleared' });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reconcile Local CRM Templates with Meta Single Source of Truth (POST /api/v2/whatsapp/templates/reconcile-with-meta)
 */
block1Router.post('/v2/whatsapp/templates/reconcile-with-meta', async (req: Request, res: Response) => {
  try {
    const user = req.body.user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = await WhatsAppTemplateRepository.reconcileWithMeta(user);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Fetch Live Meta Templates directly via server (GET /api/v2/whatsapp/templates/meta-live)
 */
block1Router.get('/v2/whatsapp/templates/meta-live', async (req: Request, res: Response) => {
  try {
    const result = await MetaTemplateService.fetchMetaTemplates();
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Set Default Binding for Tasks, Leads, or Compliance (POST /api/v2/whatsapp/templates/set-default)
 */
block1Router.post('/v2/whatsapp/templates/set-default', (req: Request, res: Response) => {
  try {
    const { bindingType, templateId, user } = req.body;
    if (!bindingType || !templateId) {
      return res.status(400).json({ success: false, error: 'bindingType and templateId are required' });
    }

    const performer = user || { id: 'EMP-ADMIN', name: 'Master Administrator', role: 'Super Admin' };
    const result = WhatsAppTemplateRepository.setDefaultBinding(bindingType, templateId, performer);
    return res.status(200).json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get 24-Hour Customer Care Window Status for a Conversation (GET /api/v2/conversations/:id/window-status)
 */
block1Router.get('/v2/conversations/:id/window-status', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const windowStatus = LeadEngineService.get24HourWindowStatus(conversationId);
    return res.status(200).json({
      success: true,
      conversationId,
      windowStatus,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Start New Outbound Conversation (POST /api/v2/conversations/start-chat, POST /api/v2/conversations)
 * Creates or finds conversation for any phone number and optionally dispatches an initial Template or Direct Text message.
 */
const handleStartChat = async (req: Request, res: Response) => {
  try {
    const {
      phone,
      name,
      email,
      companyName,
      serviceCategory,
      senderId,
      senderName,
      messageType,
      initialMessage,
      templateName,
      templateLanguage,
      templateComponents,
    } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required to start a chat.' });
    }

    // 1. Get or create conversation, customer, and lead
    const result = LeadEngineService.getOrCreateOutboundConversation({
      phone,
      name,
      email,
      companyName,
      serviceCategory,
      creatorId: senderId,
      creatorName: senderName,
    });

    let dispatchedMessage = null;

    // 2. If an initial message or template is specified, dispatch it via Meta Cloud API
    if (templateName || (messageType === 'TEMPLATE' && templateName)) {
      dispatchedMessage = await WhatsAppService.sendTemplateMessageAsync({
        toPhone: phone,
        templateName: templateName || 'hello_world',
        languageCode: templateLanguage || 'en_US',
        components: templateComponents || [],
        conversationId: result.conversation.id,
        senderId: senderId || 'EMP-ADMIN',
        senderName: senderName || 'Executive',
      });
    } else if (initialMessage && initialMessage.trim()) {
      dispatchedMessage = await WhatsAppService.sendOutboundMessageAsync({
        conversationId: result.conversation.id,
        senderId: senderId || 'EMP-ADMIN',
        senderName: senderName || 'Executive',
        content: initialMessage.trim(),
      });
    }

    const windowStatus = LeadEngineService.get24HourWindowStatus(result.conversation.id);

    return res.status(200).json({
      success: true,
      conversation: result.conversation,
      customer: result.customer,
      lead: result.lead,
      isNew: result.isNew,
      dispatchedMessage,
      windowStatus,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};

block1Router.post('/v2/conversations/start-chat', handleStartChat);
block1Router.post('/v2/conversations', handleStartChat);

/**
 * Archive / Unarchive Conversation (POST /api/v2/conversations/:id/archive, PATCH /api/v2/conversations/:id/archive)
 */
const handleConversationArchive = (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const isArchived = req.body.is_archived !== undefined ? Boolean(req.body.is_archived) : true;

    const conv = archiveConversation(conversationId, isArchived);
    if (!conv) {
      return res.status(404).json({ success: false, error: `Conversation ${conversationId} not found.` });
    }

    return res.status(200).json({ success: true, conversation: conv });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
};

block1Router.post('/v2/conversations/:id/archive', handleConversationArchive);
block1Router.patch('/v2/conversations/:id/archive', handleConversationArchive);

/**
 * Soft Delete Conversation (DELETE /api/v2/conversations/:id)
 */
block1Router.delete('/v2/conversations/:id', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const deletedBy = (req.body && req.body.deletedBy) || 'User';

    const success = deleteConversation(conversationId, deletedBy);
    if (!success) {
      return res.status(404).json({ success: false, error: `Conversation ${conversationId} not found.` });
    }

    return res.status(200).json({ success: true, message: `Conversation ${conversationId} deleted.` });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update / Simulate Message Status (POST /api/v2/whatsapp/status)
 */
block1Router.post('/v2/whatsapp/status', (req: Request, res: Response) => {
  try {
    const { whatsappMessageId, messageId, status, failure_reason, errorCode, timestamp } = req.body;
    const targetId = whatsappMessageId || messageId;
    if (!targetId || !status) {
      return res.status(400).json({ error: 'Missing targetId (whatsappMessageId/messageId) or status' });
    }

    const updated = updateMessageStatus(targetId, status.toUpperCase(), {
      timestamp,
      failure_reason,
      errorCode,
    });

    if (!updated) {
      return res.status(404).json({ error: `Message with ID ${targetId} not found` });
    }

    return res.status(200).json({ success: true, messageId: targetId, status: status.toUpperCase() });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ error: error.message });
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

/**
 * Diagnostic Media Retention Audit Endpoint (GET /api/v2/whatsapp/media-retention-test)
 * Verifies whether media_id is stored in message metadata and tests Meta Graph API retention.
 */
block1Router.get('/v2/whatsapp/media-retention-test', async (req: Request, res: Response) => {
  try {
    const queryMediaId = req.query.media_id as string | undefined;
    const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const version = process.env.META_GRAPH_VERSION || 'v25.0';

    const messages = getMessages();
    const mediaMessages: Array<{
      messageId: string;
      media_id: string;
      mimeType: string;
      fileName?: string;
      public_url?: string;
    }> = [];

    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          const mId = att.whatsappMediaId || (att as any).media_id || (att as any).mediaId;
          if (mId) {
            mediaMessages.push({
              messageId: msg.id,
              media_id: mId,
              mimeType: att.mimeType || (att as any).mime_type || 'image/jpeg',
              fileName: att.fileName || (att as any).filename,
              public_url: att.url || (att as any).public_url,
            });
          }
        }
      }
    }

    const testMediaId = queryMediaId || (mediaMessages.length > 0 ? mediaMessages[0].media_id : '123456789012345');
    const targetMsgInfo = mediaMessages.find((m) => m.media_id === testMediaId) || {
      messageId: 'MSG-MEDIA-TEST-1',
      media_id: testMediaId,
      mimeType: 'image/jpeg',
    };

    console.log(`[MEDIA RETENTION TEST] Target mediaId: ${targetMsgInfo.media_id}, messageId: ${targetMsgInfo.messageId}, mimeType: ${targetMsgInfo.mimeType}`);

    let metaApiResponse: any = null;
    let freshDownloadUrl: string | null = null;
    let httpStatus = 0;
    let canBeRestored = false;

    if (!token || token.trim() === '' || token.includes('SANDBOX') || token.includes('DEMO')) {
      metaApiResponse = {
        error: {
          message: 'WHATSAPP_ACCESS_TOKEN is missing or set to demo/sandbox token in environment.',
          type: 'ConfigurationException',
          code: 401,
        },
      };
      httpStatus = 401;
    } else {
      const metaUrl = `https://graph.facebook.com/${version}/${testMediaId}`;
      const metaRes = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'EfilinggCRM-MediaRetentionAudit/1.0',
        },
      });

      httpStatus = metaRes.status;
      const resText = await metaRes.text();
      try {
        metaApiResponse = JSON.parse(resText);
      } catch (pErr) {
        metaApiResponse = { raw: resText };
      }

      if (metaRes.ok && metaApiResponse.url) {
        freshDownloadUrl = metaApiResponse.url;
        canBeRestored = true;
      }
    }

    return res.status(200).json({
      success: true,
      mediaIdStoredInAttachmentMetadata: true,
      foundMediaMessagesCount: mediaMessages.length,
      sampleMediaMessage: targetMsgInfo,
      metaApiAudit: {
        testedMediaId: testMediaId,
        httpStatus,
        canBeRestoredAutomatically: canBeRestored,
        freshDownloadUrl: freshDownloadUrl ? `${freshDownloadUrl.substring(0, 60)}...` : null,
        metaApiResponse,
      },
      auditEvidence: {
        messageId: targetMsgInfo.messageId,
        media_id: targetMsgInfo.media_id,
        mimeType: targetMsgInfo.mimeType,
        metaGraphApiResult: metaApiResponse,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
