/**
 * Express API Router for Block 3 MVP Features
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3)
 */

import { Router, Request, Response } from 'express';
import { VerificationSuiteService } from './VerificationSuiteService';
import { ObservabilityService } from './ObservabilityService';
import { NotificationEngineService } from './NotificationEngineService';
import { ConversationStateMachine } from './ConversationStateMachine';
import { PromptLoader } from './PromptLoader';
import { ConversationLifecycleState } from './types';

export const block3Router = Router();

// Initialize Notification Engine
NotificationEngineService.initialize();

/**
 * Run End-to-End Verification Test Suite
 */
block3Router.post('/test/run-suite', async (req: Request, res: Response) => {
  try {
    const result = await VerificationSuiteService.runAllScenarios();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * System Metrics
 */
block3Router.get('/metrics', (req: Request, res: Response) => {
  res.json(ObservabilityService.getMetrics());
});

/**
 * Health Check Endpoint
 */
block3Router.get('/health', (req: Request, res: Response) => {
  res.json(ObservabilityService.getHealthCheck());
});

/**
 * Get Real-time Enterprise Notifications
 */
block3Router.get('/notifications', (req: Request, res: Response) => {
  res.json({
    notifications: NotificationEngineService.getNotifications(),
    queueStatus: NotificationEngineService.getQueueStatus(),
  });
});

/**
 * Mark Notification as Read
 */
block3Router.post('/notifications/read', (req: Request, res: Response) => {
  const { id } = req.body;
  if (id) {
    NotificationEngineService.markAsRead(id);
  }
  res.json({ success: true });
});

/**
 * State Transition Endpoint
 */
block3Router.post('/state/transition', (req: Request, res: Response) => {
  const { conversationId, targetState, actor } = req.body;
  if (!conversationId || !targetState) {
    res.status(400).json({ success: false, error: 'conversationId and targetState are required.' });
    return;
  }

  const result = ConversationStateMachine.transitionState(
    conversationId,
    targetState as ConversationLifecycleState,
    actor || 'Admin'
  );
  res.json(result);
});

/**
 * Prompt Template Fetcher
 */
block3Router.post('/prompt/get', (req: Request, res: Response) => {
  const { promptName, variables } = req.body;
  if (!promptName) {
    res.status(400).json({ success: false, error: 'promptName is required.' });
    return;
  }

  const content = PromptLoader.getPrompt({ promptName, variables });
  res.json({ success: true, promptName, content });
});
