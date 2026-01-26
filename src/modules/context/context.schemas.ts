import { z } from 'zod';

export const assembleContextQuerySchema = z.object({
  conversationId: z.string().uuid(),
  maxTokens: z.coerce.number().int().positive().max(32000).optional(),
  includeUserProfile: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  includeContextSummary: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
});

export type AssembleContextQuery = z.infer<typeof assembleContextQuerySchema>;
