import type { FeedbackType, FeedbackContext } from '../../db/schema/feedback-events.js';
import type { AdjustmentType } from '../../db/schema/learning-adjustments.js';
import type { ConversationFrequencyTier } from '../../db/schema/user-learning-preferences.js';

export type { FeedbackType, FeedbackContext, AdjustmentType, ConversationFrequencyTier };

export interface SubmitFeedbackInput {
  userId: string;
  feedbackType: FeedbackType;
  context?: FeedbackContext;
  feedbackText?: string;
}

export interface AdjustmentSummary {
  id: string;
  adjustmentType: AdjustmentType;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  appliedAt: Date;
  reverted: boolean;
}

export interface LearningResult {
  userId: string;
  adjustments: AdjustmentSummary[];
  totalFeedbackAnalyzed: number;
}

export interface FeedbackStats {
  positiveCount: number;
  negativeCount: number;
  acceptCount: number;
  ignoreCount: number;
  taskHelpfulCount: number;
  taskNotHelpfulCount: number;
  total: number;
}

export interface HumorFeedbackStats {
  positiveCount: number;
  negativeCount: number;
}

export interface TaskFeedbackStats {
  taskType: string;
  acceptCount: number;
  rejectCount: number;
  consecutiveAccepts: number;
  consecutiveRejects: number;
}

export interface TimingStats {
  hour: number;
  acceptCount: number;
  ignoreCount: number;
  acceptanceRate: number;
}

export interface AdjustmentResult {
  adjustmentType: AdjustmentType;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface PreferencesResponse {
  userId: string;
  humorFrequencyModifier: number;
  conversationFrequencyTier: ConversationFrequencyTier;
  optimalConversationHours: number[];
  autoApproveTaskTypes: string[];
  neverSuggestTaskTypes: string[];
  lastLearningRun: Date | null;
  updatedAt: Date;
}

export const LEARNING_THRESHOLDS = {
  HUMOR_REDUCE: 3,
  HUMOR_INCREASE: 5,
  CONSECUTIVE_IGNORES: 3,
  ACCEPTANCE_RATE: 0.8,
  AUTO_APPROVE_COUNT: 5,
  SUPPRESS_REJECT_COUNT: 3,
  ANALYSIS_PERIOD_DAYS: 14,
  MIN_HUMOR_MODIFIER: 0.5,
  MAX_HUMOR_MODIFIER: 2.0,
  HUMOR_REDUCE_FACTOR: 0.5,
  HUMOR_INCREASE_FACTOR: 1.2,
} as const;
