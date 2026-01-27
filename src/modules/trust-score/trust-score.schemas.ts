import { z } from 'zod';

export const createTaskSchema = z.object({
  type: z.enum(['SUGGESTION', 'DRAFT', 'EXECUTION', 'DECISION']),
  requiresLevel: z.number().int().min(1).max(5),
  description: z.string().min(1).max(2000),
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

export const taskFeedbackSchema = z.object({
  feedback: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  outcome: z.record(z.unknown()).optional(),
  errorMessage: z.string().max(1000).optional(),
});

export type TaskFeedbackRequest = z.infer<typeof taskFeedbackSchema>;

export const completeTaskSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  outcome: z.record(z.unknown()).optional(),
  errorMessage: z.string().max(1000).optional(),
});

export type CompleteTaskRequest = z.infer<typeof completeTaskSchema>;

export const agentIdParamSchema = z.object({
  agentId: z.string().uuid(),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const trustMetricsSchema = z.object({
  taskSuccessRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(0).max(1),
  proactiveValue: z.number().min(0).max(1),
  errorRecovery: z.number().min(0).max(1),
});

export const agentStatsSchema = z.object({
  totalTasks: z.number().int().min(0),
  successfulTasks: z.number().int().min(0),
  failedTasks: z.number().int().min(0),
  consecutiveFailures: z.number().int().min(0),
  taskSuccessRate: z.number().min(0).max(1),
});

export const agentTrustScoreResponseSchema = z.object({
  agentId: z.string().uuid(),
  autonomyLevel: z.number().int().min(1).max(5),
  trustScore: z.number().min(0).max(100),
  metrics: trustMetricsSchema,
  stats: agentStatsSchema,
});

export const levelChangeResultSchema = z.object({
  levelChanged: z.boolean(),
  previousLevel: z.number().int().min(1).max(5),
  currentLevel: z.number().int().min(1).max(5),
  reason: z.enum(['promotion', 'demotion_failures', 'demotion_low_score']).nullable(),
  notification: z.string().nullable(),
});

export type LevelChangeResultResponse = z.infer<typeof levelChangeResultSchema>;
