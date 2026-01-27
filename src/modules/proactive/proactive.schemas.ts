import { z } from 'zod';

export const triggerReasonSchema = z.enum([
  'STUCK_TIMEOUT',
  'HIGH_FRUSTRATION',
  'POST_FOCUS_IDLE',
  'SCHEDULED',
  'MANUAL',
]);

export const userResponseSchema = z.enum(['ACCEPTED', 'DECLINED', 'IGNORED', 'DEFERRED']);

export const frequencyPreferenceSchema = z.enum(['MINIMAL', 'BALANCED', 'PROACTIVE']);

export const messagePrioritySchema = z.enum(['low', 'normal', 'high']);

export const evaluateEngagementSchema = z.object({
  userId: z.string().uuid(),
});

export const feedbackSchema = z.object({
  engagementId: z.string().uuid(),
  response: userResponseSchema,
  wasHelpful: z.boolean().optional(),
  feedbackText: z.string().max(1000).optional(),
  responseTimeMs: z.number().int().min(0).optional(),
});

export const updatePreferencesSchema = z.object({
  frequencyPreference: frequencyPreferenceSchema.optional(),
  dailyLimit: z.number().int().min(1).max(50).optional(),
  preferredHours: z.array(z.number().int().min(0).max(23)).optional(),
  triggerPreferences: z
    .object({
      STUCK_TIMEOUT: z.boolean().optional(),
      HIGH_FRUSTRATION: z.boolean().optional(),
      POST_FOCUS_IDLE: z.boolean().optional(),
      SCHEDULED: z.boolean().optional(),
      MANUAL: z.boolean().optional(),
    })
    .optional(),
});

export const pauseEngagementSchema = z.object({
  durationHours: z.number().int().min(1).max(168).default(24),
});

export const triggerContextSchema = z.object({
  activityType: z.string().optional(),
  focusScore: z.number().optional(),
  emotionType: z.string().optional(),
  emotionIntensity: z.number().optional(),
  durationMinutes: z.number().optional(),
  timestamp: z.string(),
});

export const engagementDecisionResponseSchema = z.object({
  shouldEngage: z.boolean(),
  reason: triggerReasonSchema.nullable(),
  action: z.enum(['ENGAGE', 'DEFER', 'BLOCK', 'SKIP']),
  deferUntil: z.string().datetime().optional(),
  priority: messagePrioritySchema,
  suggestedMessage: z.string().nullable(),
  context: triggerContextSchema,
  engagementId: z.string().uuid().optional(),
});

export const engagementPatternResponseSchema = z.object({
  userId: z.string().uuid(),
  frequencyPreference: frequencyPreferenceSchema,
  dailyLimit: z.number(),
  consecutiveIgnores: z.number(),
  pausedUntil: z.string().datetime().nullable(),
  preferredHours: z.array(z.number()),
  triggerPreferences: z.record(z.boolean()),
  stats: z.object({
    totalEngagements: z.number(),
    totalAccepted: z.number(),
    totalHelpful: z.number(),
    acceptanceRate: z.number(),
    helpfulnessRate: z.number(),
  }),
  lastEngagementAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type EvaluateEngagementInput = z.infer<typeof evaluateEngagementSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type PauseEngagementInput = z.infer<typeof pauseEngagementSchema>;
export type EngagementDecisionResponse = z.infer<typeof engagementDecisionResponseSchema>;
export type EngagementPatternResponse = z.infer<typeof engagementPatternResponseSchema>;
