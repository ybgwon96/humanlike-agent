import { z } from 'zod';

export const synthesizeSpeechSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.enum(['en-US-male', 'en-US-female', 'ko-KR-female']),
  speed: z.number().min(0.75).max(1.25).default(1.0).optional(),
});

export type SynthesizeSpeechRequest = z.infer<typeof synthesizeSpeechSchema>;
