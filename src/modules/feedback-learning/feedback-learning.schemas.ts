import { z } from 'zod';

export const feedbackTypeSchema = z.enum([
  'EXPLICIT_POSITIVE',
  'EXPLICIT_NEGATIVE',
  'IMPLICIT_ACCEPT',
  'IMPLICIT_IGNORE',
  'TASK_HELPFUL',
  'TASK_NOT_HELPFUL',
]);

export const adjustmentTypeSchema = z.enum([
  'HUMOR_FREQUENCY',
  'CONVERSATION_FREQUENCY',
  'TASK_PERMISSION',
  'TIMING_PREFERENCE',
]);

export const conversationFrequencyTierSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const feedbackContextSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    triggerReason: z.string().optional(),
    timeOfDay: z.number().int().min(0).max(23).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
  })
  .optional();

export const submitFeedbackSchema = z.object({
  userId: z.string().uuid(),
  feedbackType: feedbackTypeSchema,
  context: feedbackContextSchema,
  feedbackText: z.string().max(2000).optional(),
});

export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackSchema>;

export const getAdjustmentsQuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type GetAdjustmentsQuery = z.infer<typeof getAdjustmentsQuerySchema>;

export const revertAdjustmentSchema = z.object({
  adjustmentId: z.string().uuid(),
});

export type RevertAdjustmentRequest = z.infer<typeof revertAdjustmentSchema>;

export const getPreferencesQuerySchema = z.object({
  userId: z.string().uuid(),
});

export type GetPreferencesQuery = z.infer<typeof getPreferencesQuerySchema>;

export const runLearningSchema = z.object({
  userId: z.string().uuid(),
});

export type RunLearningRequest = z.infer<typeof runLearningSchema>;

export const preferencesResponseSchema = z.object({
  userId: z.string().uuid(),
  humorFrequencyModifier: z.number(),
  conversationFrequencyTier: conversationFrequencyTierSchema,
  optimalConversationHours: z.array(z.number().int().min(0).max(23)),
  autoApproveTaskTypes: z.array(z.string()),
  neverSuggestTaskTypes: z.array(z.string()),
  lastLearningRun: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type PreferencesResponseSchema = z.infer<typeof preferencesResponseSchema>;

export const adjustmentResponseSchema = z.object({
  id: z.string().uuid(),
  adjustmentType: adjustmentTypeSchema,
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reason: z.string(),
  appliedAt: z.string().datetime(),
  reverted: z.boolean(),
});

export type AdjustmentResponseSchema = z.infer<typeof adjustmentResponseSchema>;

export const learningResultResponseSchema = z.object({
  userId: z.string().uuid(),
  adjustments: z.array(adjustmentResponseSchema),
  totalFeedbackAnalyzed: z.number().int(),
});

export type LearningResultResponseSchema = z.infer<typeof learningResultResponseSchema>;
