import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  sender: z.enum(['USER', 'AGENT']).optional(),
  sentimentMin: z.coerce.number().min(-1).max(1).optional(),
  sentimentMax: z.coerce.number().min(-1).max(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  phraseMatch: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const quickSearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type QuickSearchQuery = z.infer<typeof quickSearchQuerySchema>;
