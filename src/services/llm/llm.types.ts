import type { JSONSchema7 } from 'json-schema';

export type LLMContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

export interface LLMTool {
  name: string;
  description: string;
  input_schema: JSONSchema7;
}

export interface LLMStreamOptions {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  systemPrompt?: string;
  tools?: LLMTool[];
}

export interface ToolUseData {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'content' | 'tool_use' | 'done' | 'error';
  data: string;
  toolUse?: ToolUseData;
}

export class LLMError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
