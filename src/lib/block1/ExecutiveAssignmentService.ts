/**
 * Enterprise Executive Assignment Engine
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Implements Round-Robin, Relationship Manager, Department-based,
 * and Manual executive routing policies.
 */

import { ExecutiveV2, ExecutiveAssignmentResult } from './types';
import { getExecutives, getNextRoundRobinExecutive } from './db';
import { eventBus } from '../eventBus';

export type AssignmentStrategy = 'ROUND_ROBIN' | 'RELATIONSHIP_MANAGER' | 'DEPARTMENT' | 'MANUAL';

export class ExecutiveAssignmentService {
  /**
   * Determine Executive Assignment based on requested strategy and context
   */
  public static assignExecutive(options: {
    strategy?: AssignmentStrategy;
    manualExecutiveId?: string;
    existingExecutiveId?: string;
    serviceCategory?: string;
  }): ExecutiveAssignmentResult {
    const executives = getExecutives().filter((e) => e.isActive);
    const strategy = options.strategy || 'ROUND_ROBIN';

    // 1. Manual Assignment Strategy
    if (strategy === 'MANUAL' && options.manualExecutiveId) {
      const match = executives.find((e) => e.id === options.manualExecutiveId);
      if (match) {
        return {
          executiveId: match.id,
          executiveName: match.name,
          assignmentStrategy: 'MANUAL',
        };
      }
    }

    // 2. Relationship Manager Strategy (Sticky Assignment)
    if (
      (strategy === 'RELATIONSHIP_MANAGER' || strategy === 'ROUND_ROBIN') &&
      options.existingExecutiveId
    ) {
      const match = executives.find((e) => e.id === options.existingExecutiveId);
      if (match) {
        return {
          executiveId: match.id,
          executiveName: match.name,
          assignmentStrategy: 'RELATIONSHIP_MANAGER',
        };
      }
    }

    // 3. Department Assignment Strategy
    if (options.serviceCategory) {
      const catUpper = options.serviceCategory.toUpperCase();
      let departmentTarget = '';
      if (catUpper.includes('GST')) departmentTarget = 'GST';
      else if (catUpper.includes('MCA') || catUpper.includes('COMPANY') || catUpper.includes('ROC'))
        departmentTarget = 'MCA';
      else if (catUpper.includes('ITR') || catUpper.includes('TAX') || catUpper.includes('AUDIT'))
        departmentTarget = 'ITR';

      if (departmentTarget) {
        const match = executives.find((e) =>
          e.department.toUpperCase().includes(departmentTarget)
        );
        if (match) {
          return {
            executiveId: match.id,
            executiveName: match.name,
            assignmentStrategy: 'DEPARTMENT',
          };
        }
      }
    }

    // 4. Default Round-Robin Strategy
    const selected = getNextRoundRobinExecutive();
    return {
      executiveId: selected.id,
      executiveName: selected.name,
      assignmentStrategy: 'ROUND_ROBIN',
    };
  }

  /**
   * Notify and emit event on conversation executive assignment
   */
  public static notifyAssignment(
    conversationId: string,
    executiveId: string,
    executiveName: string,
    assignedBy: string = 'SystemAutoRouter'
  ): void {
    eventBus.publishAsync('ConversationAssigned', 'CONVERSATION', {
      conversationId,
      assignedType: 'HUMAN_EXECUTIVE',
      assignedId: executiveId,
      assignedBy,
    });
  }
}
