import { z } from 'zod';

export const createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  sender: z.enum(['USER', 'AGENT']),
  content: z.string().min(1).max(10000),
});

export type CreateMessageRequest = z.infer<typeof createMessageSchema>;

export const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;

export const messageResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  sender: z.enum(['USER', 'AGENT']),
  content: z.string(),
  maskedContent: z.string().nullable(),
  sentiment: z.number().nullable(),
  createdAt: z.string().datetime(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;
