import { z } from 'zod';

export const sendTextMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export type SendTextMessageRequest = z.infer<typeof sendTextMessageSchema>;

export const voiceMessageParamsSchema = z.object({
  conversationId: z.string().uuid(),
  language: z.enum(['ko', 'en']).default('ko'),
});

export type VoiceMessageParams = z.infer<typeof voiceMessageParamsSchema>;

export interface TextMessageResponse {
  messageId: string;
  content: string;
  timestamp: Date;
}

export interface VoiceMessageResponse {
  messageId: string;
  transcription: string;
  confidence: number;
  duration: number;
  lowConfidence: boolean;
}
