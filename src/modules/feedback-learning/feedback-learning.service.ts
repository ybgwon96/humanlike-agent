import * as repository from './feedback-learning.repository.js';
import * as learningEngine from './learning-engine.js';
import * as feedbackProcessor from './feedback-processor.js';
import type { FeedbackEvent } from '../../db/schema/feedback-events.js';
import type { LearningAdjustment } from '../../db/schema/learning-adjustments.js';
import type {
  SubmitFeedbackInput,
  LearningResult,
  PreferencesResponse,
  AdjustmentSummary,
} from './feedback-learning.types.js';

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackEvent> {
  return feedbackProcessor.processFeedback(input);
}

export async function getAdjustments(userId: string, limit = 20): Promise<AdjustmentSummary[]> {
  const adjustments = await repository.getAdjustmentsByUser(userId, limit);

  return adjustments.map(mapAdjustmentToSummary);
}

export async function revertAdjustment(adjustmentId: string, userId: string): Promise<void> {
  const adjustment = await repository.getAdjustmentById(adjustmentId);

  if (!adjustment) {
    throw new Error('Adjustment not found');
  }

  if (adjustment.userId !== userId) {
    throw new Error('Adjustment does not belong to user');
  }

  if (adjustment.revertedAt) {
    throw new Error('Adjustment already reverted');
  }

  await repository.revertAdjustment(adjustmentId);

  await applyRevertedValue(userId, adjustment);
}

export async function getPreferences(userId: string): Promise<PreferencesResponse> {
  const preferences = await repository.getOrCreatePreferences(userId);

  return {
    userId: preferences.userId,
    humorFrequencyModifier: preferences.humorFrequencyModifier,
    conversationFrequencyTier: preferences.conversationFrequencyTier,
    optimalConversationHours: preferences.optimalConversationHours ?? [],
    autoApproveTaskTypes: preferences.autoApproveTaskTypes ?? [],
    neverSuggestTaskTypes: preferences.neverSuggestTaskTypes ?? [],
    lastLearningRun: preferences.lastLearningRun,
    updatedAt: preferences.updatedAt,
  };
}

export async function runDailyLearning(userId: string): Promise<LearningResult> {
  return learningEngine.runLearningBatch(userId);
}

function mapAdjustmentToSummary(adjustment: LearningAdjustment): AdjustmentSummary {
  return {
    id: adjustment.id,
    adjustmentType: adjustment.adjustmentType,
    oldValue: adjustment.oldValue,
    newValue: adjustment.newValue,
    reason: adjustment.reason,
    appliedAt: adjustment.appliedAt,
    reverted: adjustment.revertedAt !== null,
  };
}

async function applyRevertedValue(
  userId: string,
  adjustment: LearningAdjustment
): Promise<void> {
  switch (adjustment.adjustmentType) {
    case 'HUMOR_FREQUENCY':
      await repository.updatePreferences(userId, {
        humorFrequencyModifier: adjustment.oldValue as number,
      });
      break;

    case 'CONVERSATION_FREQUENCY':
      await repository.updatePreferences(userId, {
        conversationFrequencyTier: adjustment.oldValue as 'HIGH' | 'MEDIUM' | 'LOW',
      });
      break;

    case 'TIMING_PREFERENCE':
      await repository.updatePreferences(userId, {
        optimalConversationHours: adjustment.oldValue as number[],
      });
      break;

    case 'TASK_PERMISSION': {
      const oldValue = adjustment.oldValue as {
        autoApproveTaskTypes?: string[];
        neverSuggestTaskTypes?: string[];
      };

      if (oldValue.autoApproveTaskTypes) {
        await repository.updatePreferences(userId, {
          autoApproveTaskTypes: oldValue.autoApproveTaskTypes,
        });
      }

      if (oldValue.neverSuggestTaskTypes) {
        await repository.updatePreferences(userId, {
          neverSuggestTaskTypes: oldValue.neverSuggestTaskTypes,
        });
      }
      break;
    }
  }
}
