import { z } from 'zod';

export const personalityProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  coreTraits: z.array(z.string()),
  humorStyle: z.string(),
  communicationTone: z.string(),
  values: z.array(z.string()),
  forbiddenPatterns: z.array(z.string()),
  exampleResponses: z.record(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PersonalityProfileResponse = z.infer<typeof personalityProfileSchema>;

export const userPersonalityAdjustmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  humorFrequencyModifier: z.number().min(0).max(2),
  formalityLevel: z.enum(['informal', 'normal', 'formal']),
  customPreferences: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserPersonalityAdjustmentResponse = z.infer<typeof userPersonalityAdjustmentSchema>;

export const updateUserAdjustmentSchema = z.object({
  humorFrequencyModifier: z.number().min(0).max(2).optional(),
  formalityLevel: z.enum(['informal', 'normal', 'formal']).optional(),
  customPreferences: z.record(z.unknown()).optional(),
});

export type UpdateUserAdjustmentRequest = z.infer<typeof updateUserAdjustmentSchema>;

export const personalityWithAdjustmentsSchema = z.object({
  profile: personalityProfileSchema,
  adjustments: userPersonalityAdjustmentSchema.nullable(),
});

export type PersonalityWithAdjustments = z.infer<typeof personalityWithAdjustmentsSchema>;

export const validateResponseSchema = z.object({
  responseText: z.string().min(1, 'Response text is required'),
  conversationContext: z.array(z.string()).optional(),
});

export type ValidateResponseRequest = z.infer<typeof validateResponseSchema>;

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  validationDetails: z.object({
    toneCheck: z.enum(['passed', 'failed']),
    forbiddenPatterns: z.enum(['passed', 'failed']),
    failedPatterns: z.array(z.string()),
  }),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;
