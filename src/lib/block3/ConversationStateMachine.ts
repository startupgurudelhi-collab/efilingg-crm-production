/**
 * AI Conversation State Machine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3 - Module 2)
 *
 * Implements strict lifecycle states:
 * NEW -> GREETING_SENT -> SERVICE_IDENTIFIED -> QUALIFICATION -> DOCUMENT_COLLECTION
 * -> PROPOSAL_READY -> PAYMENT_PENDING -> PAYMENT_RECEIVED -> OPERATIONS_ASSIGNED
 * -> SERVICE_COMPLETED -> FOLLOWUP -> RENEWAL -> CLOSED
 */

import { ConversationLifecycleState, StateTransitionResult } from './types';
import { getConversationById, saveConversation, addTimelineEntry } from '../block1/db';
import { eventBus } from '../eventBus';

const VALID_TRANSITIONS: Record<ConversationLifecycleState, ConversationLifecycleState[]> = {
  NEW: ['GREETING_SENT', 'CLOSED'],
  GREETING_SENT: ['SERVICE_IDENTIFIED', 'CLOSED'],
  SERVICE_IDENTIFIED: ['QUALIFICATION', 'DOCUMENT_COLLECTION', 'CLOSED'],
  QUALIFICATION: ['DOCUMENT_COLLECTION', 'PROPOSAL_READY', 'CLOSED'],
  DOCUMENT_COLLECTION: ['PROPOSAL_READY', 'PAYMENT_PENDING', 'CLOSED'],
  PROPOSAL_READY: ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'CLOSED'],
  PAYMENT_PENDING: ['PAYMENT_RECEIVED', 'CLOSED'],
  PAYMENT_RECEIVED: ['OPERATIONS_ASSIGNED', 'CLOSED'],
  OPERATIONS_ASSIGNED: ['SERVICE_COMPLETED', 'CLOSED'],
  SERVICE_COMPLETED: ['FOLLOWUP', 'RENEWAL', 'CLOSED'],
  FOLLOWUP: ['RENEWAL', 'CLOSED'],
  RENEWAL: ['CLOSED', 'NEW'],
  CLOSED: ['NEW', 'GREETING_SENT'],
};

export class ConversationStateMachine {
  /**
   * Transition conversation to new lifecycle state with rollback protection
   */
  public static transitionState(
    conversationId: string,
    targetState: ConversationLifecycleState,
    actorName: string = 'System'
  ): StateTransitionResult {
    const conv = getConversationById(conversationId);
    if (!conv) {
      return {
        success: false,
        previousState: 'NEW',
        newState: targetState,
        conversationId,
        transitionTime: new Date().toISOString(),
        error: `Conversation ${conversationId} not found.`,
      };
    }

    const currentState = (conv.lifecycleState as ConversationLifecycleState) || 'NEW';

    // Validate allowed transition
    const allowedNext = VALID_TRANSITIONS[currentState] || [];
    if (!allowedNext.includes(targetState)) {
      return {
        success: false,
        previousState: currentState,
        newState: targetState,
        conversationId,
        transitionTime: new Date().toISOString(),
        error: `Invalid state transition from ${currentState} to ${targetState}. Allowed: ${allowedNext.join(', ')}`,
      };
    }

    // Save previous state for rollback guarantee
    const backupState = conv.lifecycleState;

    try {
      conv.lifecycleState = targetState;
      conv.updatedAt = new Date().toISOString();
      saveConversation(conv);

      // 1. Write Timeline
      addTimelineEntry(
        conversationId,
        'STATE_TRANSITION',
        `Lifecycle state changed from ${currentState} to ${targetState} by ${actorName}.`,
        actorName
      );

      // 2. Publish Event
      eventBus.publishAsync('ConversationStateChanged', 'CONVERSATION', {
        conversationId,
        previousState: currentState,
        newState: targetState,
        actor: actorName,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        previousState: currentState,
        newState: targetState,
        conversationId,
        transitionTime: new Date().toISOString(),
      };
    } catch (err) {
      // Rollback on failure
      conv.lifecycleState = backupState;
      saveConversation(conv);

      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        previousState: currentState,
        newState: targetState,
        conversationId,
        transitionTime: new Date().toISOString(),
        error: `State transition failed and rolled back: ${errorMsg}`,
      };
    }
  }

  public static getCurrentState(conversationId: string): ConversationLifecycleState {
    const conv = getConversationById(conversationId);
    return (conv?.lifecycleState as ConversationLifecycleState) || 'NEW';
  }
}
