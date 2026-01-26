import { z } from 'zod';

export const audioParamsSchema = z.object({
  conversationId: z.string().uuid(),
  filename: z.string().regex(/^[a-f0-9-]{36}\.(webm|ogg|mp3)$/, 'Invalid filename format'),
});

export type AudioParams = z.infer<typeof audioParamsSchema>;
