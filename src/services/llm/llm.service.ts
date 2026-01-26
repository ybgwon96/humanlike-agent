import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { LLMStreamOptions, StreamChunk, LLMMessage } from './llm.types.js';
import { LLMError } from './llm.types.js';

const SYSTEM_PROMPT = `당신은 사용자의 AI 동료입니다. 단순히 시킨 일만 하는 게 아니라:
- 먼저 제안하고 의견을 제시합니다
- 자연스러운 대화와 위트 있는 농담도 합니다
- 사적인 이야기에도 관심을 갖고 응답합니다
- 진짜 인간 동료처럼 자율적으로 행동합니다

톤: 친근하고 전문적, 때로는 유머러스하게`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client === null) {
    client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export async function* streamCompletion(
  options: LLMStreamOptions
): AsyncGenerator<StreamChunk> {
  const anthropic = getClient();

  const systemPrompt = options.systemPrompt ?? SYSTEM_PROMPT;
  const messages = options.messages.filter(
    (m): m is { role: 'user' | 'assistant'; content: string } =>
      m.role !== 'system'
  );

  try {
    const stream = anthropic.messages.stream({
      model: options.model || env.LLM_MODEL,
      max_tokens: options.maxTokens || env.LLM_MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield {
          type: 'content',
          data: event.delta.text,
        };
      }
    }

    yield {
      type: 'done',
      data: '',
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new LLMError(
        'LLM_API_ERROR',
        error.message,
        error.status ?? 500
      );
    }
    throw new LLMError('LLM_UNKNOWN_ERROR', 'LLM 호출 중 알 수 없는 오류가 발생했습니다');
  }
}

export function buildMessages(
  contextMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  newMessage: string
): LLMMessage[] {
  const messages: LLMMessage[] = contextMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  messages.push({
    role: 'user',
    content: newMessage,
  });

  return messages;
}

export { SYSTEM_PROMPT };
