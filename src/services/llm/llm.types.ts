export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamOptions {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  type: 'content' | 'done' | 'error';
  data: string;
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
