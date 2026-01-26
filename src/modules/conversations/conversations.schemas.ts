import { z } from 'zod';

export const createConversationSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

export const getConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  activeOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type GetConversationsQuery = z.infer<typeof getConversationsQuerySchema>;

export const updateConversationSchema = z.object({
  contextSummary: z.string().max(5000).optional(),
});

export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>;
