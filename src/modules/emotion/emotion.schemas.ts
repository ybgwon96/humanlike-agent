import { z } from 'zod';

export const emotionTypeSchema = z.enum([
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
  'FRUSTRATED',
  'EXCITED',
  'TIRED',
  'STRESSED',
]);

export const analyzeEmotionResponseSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  emotionType: emotionTypeSchema,
  intensity: z.number().int().min(1).max(10),
  confidence: z.number().min(0).max(1),
  rawScore: z.number().min(-1).max(1).nullable(),
  analysisMethod: z.enum(['rule_based', 'llm', 'hybrid']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export const emotionalProfileResponseSchema = z.object({
  userId: z.string().uuid(),
  dominantEmotions: z.array(emotionTypeSchema),
  averageIntensity: z.number(),
  emotionalBaseline: z.number(),
  recentTrend: z.enum(['improving', 'stable', 'declining']),
  emotionDistribution: z.record(emotionTypeSchema, z.number()),
  totalAnalyzed: z.number().int(),
  calculatedAt: z.string().datetime(),
});

export const analyzeEmotionParamsSchema = z.object({
  messageId: z.string().uuid(),
});

export const getUserEmotionalProfileParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const getUserEmotionalProfileQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export type AnalyzeEmotionResponse = z.infer<typeof analyzeEmotionResponseSchema>;
export type EmotionalProfileResponse = z.infer<typeof emotionalProfileResponseSchema>;
