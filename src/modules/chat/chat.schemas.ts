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

export const streamChatSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export type StreamChatRequest = z.infer<typeof streamChatSchema>;

export interface ToolApprovalData {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: number;
  reason: string;
}

export interface ToolResultData {
  toolName: string;
  success: boolean;
  output: unknown;
  error?: string;
}

export interface StreamChunkResponse {
  type: 'content' | 'done' | 'error' | 'message_saved' | 'warning' | 'tool_approval' | 'tool_result';
  data: string;
  messageId?: string;
  toolApproval?: ToolApprovalData;
  toolResult?: ToolResultData;
}

export const toolApprovalSchema = z.object({
  conversationId: z.string().uuid(),
  approvalId: z.string(),
  approved: z.boolean(),
});

export type ToolApprovalRequest = z.infer<typeof toolApprovalSchema>;
