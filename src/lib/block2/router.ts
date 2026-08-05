/**
 * Enterprise Block 2 Express REST Router
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 2)
 *
 * REST APIs for AI Sales Workspace, Gemini Integrations (Suggest Replies, Intent Detection,
 * Summarization, Auto-Reply), Executive Collaboration (Takeover, Internal Notes, Tags),
 * and Diagnostic Verification Test Suite.
 */

import { Router, Request, Response } from 'express';
import { AISalesWorkspaceService } from './AISalesWorkspaceService';
import { getConversationById, getConversations, saveConversation, getMessages } from '../block1/db';
import { requireFeatureFlag } from '../../server/featureFlags';

export const block2Router = Router();

// Apply feature flag middleware check for Block 2
block2Router.use(requireFeatureFlag('ENABLE_AI_SALES_WORKSPACE'));

// ==========================================
// 1. AI Integration Endpoints (Gemini Powered)
// ==========================================

/**
 * AI Suggested Replies (POST /api/v2/ai/suggest-replies)
 */
block2Router.post('/v2/ai/suggest-replies', async (req: Request, res: Response) => {
  try {
    const { conversationId, customPrompt } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing required field: conversationId' });
    }

    const result = await AISalesWorkspaceService.suggestReplies({
      conversationId,
      customPrompt,
    });

    return res.status(200).json({ success: true, result });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Service & Intent Detection (POST /api/v2/ai/detect-intent)
 */
block2Router.post('/v2/ai/detect-intent', async (req: Request, res: Response) => {
  try {
    const { messageText } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Missing required field: messageText' });
    }

    const result = await AISalesWorkspaceService.detectIntentAndService(messageText);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Conversation Summarization (POST /api/v2/ai/summarize)
 */
block2Router.post('/v2/ai/summarize', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing required field: conversationId' });
    }

    const summary = await AISalesWorkspaceService.summarizeConversation(conversationId);
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Auto-Reply (POST /api/v2/ai/auto-reply)
 */
block2Router.post('/v2/ai/auto-reply', async (req: Request, res: Response) => {
  try {
    const { conversationId, customerMessageText } = req.body;
    if (!conversationId || !customerMessageText) {
      return res.status(400).json({ error: 'Missing required parameters: conversationId, customerMessageText' });
    }

    const replyMessage = await AISalesWorkspaceService.generateAutoReply(conversationId, customerMessageText);
    return res.status(200).json({ success: true, message: replyMessage });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AI Document Checklist Generator (POST /api/v2/ai/request-documents)
 */
block2Router.post('/v2/ai/request-documents', (req: Request, res: Response) => {
  try {
    const { serviceCategory } = req.body;
    const documentChecklist = AISalesWorkspaceService.generateDocumentChecklist(serviceCategory || 'GST');
    return res.status(200).json({ success: true, serviceCategory: serviceCategory || 'GST', documentChecklist });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. Executive Collaboration Endpoints
// ==========================================

/**
 * Toggle Takeover between Human and AI (PATCH /api/v2/conversations/:id/takeover)
 */
block2Router.patch('/v2/conversations/:id/takeover', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { targetAssignedType, executiveId, executiveName } = req.body;

    if (!['AI_AGENT', 'HUMAN_EXECUTIVE'].includes(targetAssignedType)) {
      return res.status(400).json({ error: 'targetAssignedType must be AI_AGENT or HUMAN_EXECUTIVE' });
    }

    const updatedConv = AISalesWorkspaceService.toggleTakeover(
      conversationId,
      targetAssignedType,
      executiveId,
      executiveName
    );

    return res.status(200).json({ success: true, conversation: updatedConv });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add Internal Private Note (POST /api/v2/conversations/:id/notes)
 */
block2Router.post('/v2/conversations/:id/notes', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { authorId, authorName, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    const note = AISalesWorkspaceService.addInternalNote(
      conversationId,
      authorId || 'EMP-ADMIN',
      authorName || 'Executive',
      content
    );

    return res.status(201).json({ success: true, note });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Internal Private Notes (GET /api/v2/conversations/:id/notes)
 */
block2Router.get('/v2/conversations/:id/notes', (req: Request, res: Response) => {
  const conversationId = req.params.id;
  const notes = AISalesWorkspaceService.getInternalNotes(conversationId);
  return res.status(200).json({ success: true, count: notes.length, notes });
});

/**
 * Update Conversation Tags (PATCH /api/v2/conversations/:id/tags)
 */
block2Router.patch('/v2/conversations/:id/tags', (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array of strings.' });
    }

    const updatedTags = AISalesWorkspaceService.updateConversationTags(conversationId, tags);
    return res.status(200).json({ success: true, tags: updatedTags });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Conversation Tags (GET /api/v2/conversations/:id/tags)
 */
block2Router.get('/v2/conversations/:id/tags', (req: Request, res: Response) => {
  const conversationId = req.params.id;
  const tags = AISalesWorkspaceService.getConversationTags(conversationId);
  return res.status(200).json({ success: true, tags });
});

// ==========================================
// 3. Block 2 Diagnostics & Automated Testing
// ==========================================

/**
 * Block 2 Status (GET /api/v2/block2/status)
 */
block2Router.get('/v2/block2/status', (req: Request, res: Response) => {
  const conversations = getConversations();
  const aiHandledCount = conversations.filter((c) => c.assignedType === 'AI_AGENT').length;
  const humanHandledCount = conversations.filter((c) => c.assignedType === 'HUMAN_EXECUTIVE' || c.assignedType === 'ROUND_ROBIN').length;

  return res.status(200).json({
    status: 'ONLINE',
    module: 'BLOCK_2_AI_SALES_WORKSPACE',
    featureFlag: 'ENABLE_AI_SALES_WORKSPACE',
    metrics: {
      totalConversations: conversations.length,
      aiHandledCount,
      humanHandledCount,
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    },
  });
});

/**
 * Automated Verification Test Suite (POST /api/v2/block2/test/run-suite)
 */
block2Router.post('/v2/block2/test/run-suite', async (req: Request, res: Response) => {
  const suiteResults: Array<{ name: string; status: 'PASSED' | 'FAILED'; details: string }> = [];

  try {
    const conversations = getConversations();
    const testConv = conversations[0] || { id: 'CONV-1001', serviceCategory: 'GST Compliance', customerName: 'Aditya Gupta' };

    // Test 1: AI Suggested Replies Generator
    const suggested = await AISalesWorkspaceService.suggestReplies({
      conversationId: testConv.id,
    });

    if (suggested.suggestedReplies && suggested.suggestedReplies.length >= 2) {
      suiteResults.push({
        name: 'AI Suggested Replies Generator',
        status: 'PASSED',
        details: `Generated ${suggested.suggestedReplies.length} options (Intent: ${suggested.detectedIntent}).`,
      });
    } else {
      suiteResults.push({
        name: 'AI Suggested Replies Generator',
        status: 'FAILED',
        details: 'Failed to generate suggested replies array.',
      });
    }

    // Test 2: AI Intent & Service Category Detection
    const detected = await AISalesWorkspaceService.detectIntentAndService(
      'Hi I want to register a new Private Limited Company in Delhi. What is the fee?'
    );

    if (detected.serviceCategory && detected.leadScore >= 50) {
      suiteResults.push({
        name: 'AI Service & Intent Detection',
        status: 'PASSED',
        details: `Detected Category: "${detected.serviceCategory}", Score: ${detected.leadScore}.`,
      });
    } else {
      suiteResults.push({
        name: 'AI Service & Intent Detection',
        status: 'FAILED',
        details: 'Failed to detect service category or calculate lead score.',
      });
    }

    // Test 3: Conversation Takeover Switch
    const takeover = AISalesWorkspaceService.toggleTakeover(
      testConv.id,
      'HUMAN_EXECUTIVE',
      'EMP-NEHA',
      'Neha Sharma'
    );

    if (takeover.assignedType === 'HUMAN_EXECUTIVE' && takeover.assignedExecutiveName === 'Neha Sharma') {
      suiteResults.push({
        name: 'Executive Takeover Switch',
        status: 'PASSED',
        details: `Successfully switched conversation ${testConv.id} to HUMAN_EXECUTIVE (Neha Sharma).`,
      });
    } else {
      suiteResults.push({
        name: 'Executive Takeover Switch',
        status: 'FAILED',
        details: 'Failed to toggle takeover status.',
      });
    }

    // Test 4: Internal Notes Storage
    const note = AISalesWorkspaceService.addInternalNote(
      testConv.id,
      'EMP-ADMIN',
      'Master Admin',
      'Customer requested urgent GST registration before Friday.'
    );

    const notesList = AISalesWorkspaceService.getInternalNotes(testConv.id);
    if (note && notesList.length > 0) {
      suiteResults.push({
        name: 'Internal Private Notes Storage',
        status: 'PASSED',
        details: `Successfully stored internal note (Total notes: ${notesList.length}).`,
      });
    } else {
      suiteResults.push({
        name: 'Internal Private Notes Storage',
        status: 'FAILED',
        details: 'Failed to save or retrieve internal note.',
      });
    }

    // Test 5: Document Checklist Generator
    const docChecklist = AISalesWorkspaceService.generateDocumentChecklist('MCA Company Incorporation');
    if (docChecklist && docChecklist.length >= 3) {
      suiteResults.push({
        name: 'Document Checklist Generator',
        status: 'PASSED',
        details: `Generated ${docChecklist.length} document items for MCA Company Incorporation.`,
      });
    } else {
      suiteResults.push({
        name: 'Document Checklist Generator',
        status: 'FAILED',
        details: 'Failed to generate document checklist.',
      });
    }

    const allPassed = suiteResults.every((s) => s.status === 'PASSED');
    return res.status(200).json({
      success: allPassed,
      summary: allPassed ? 'ALL BLOCK 2 AI SALES WORKSPACE TESTS PASSED' : 'SOME TESTS FAILED',
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
