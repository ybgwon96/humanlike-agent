import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { LLMStreamOptions, StreamChunk, LLMMessage, ToolUseData } from './llm.types.js';
import { LLMError } from './llm.types.js';

const SYSTEM_PROMPT = `당신은 사용자의 AI 동료입니다. 단순히 시킨 일만 하는 게 아니라:
- 먼저 제안하고 의견을 제시합니다
- 자연스러운 대화와 위트 있는 농담도 합니다
- 사적인 이야기에도 관심을 갖고 응답합니다
- 진짜 인간 동료처럼 자율적으로 행동합니다

도구 사용:
- 파일 읽기/쓰기, 검색, 명령 실행 등의 도구를 활용할 수 있습니다
- 도구가 필요하면 자연스럽게 사용하세요

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

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlockParam[];
};

function convertToAnthropicMessages(messages: LLMMessage[]): AnthropicMessage[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role as 'user' | 'assistant', content: m.content };
      }

      const blocks: Anthropic.ContentBlockParam[] = m.content.map((block) => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text };
        }
        if (block.type === 'tool_use') {
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };
        }
        return {
          type: 'tool_result' as const,
          tool_use_id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error,
        };
      });

      return { role: m.role as 'user' | 'assistant', content: blocks };
    });
}

export async function* streamCompletion(
  options: LLMStreamOptions
): AsyncGenerator<StreamChunk> {
  const anthropic = getClient();

  const systemPrompt = options.systemPrompt ?? SYSTEM_PROMPT;
  const messages = convertToAnthropicMessages(options.messages);

  const requestOptions: Anthropic.MessageStreamParams = {
    model: options.model || env.LLM_MODEL,
    max_tokens: options.maxTokens || env.LLM_MAX_TOKENS,
    system: systemPrompt,
    messages,
  };

  if (options.tools !== undefined && options.tools.length > 0) {
    requestOptions.tools = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
    }));
  }

  try {
    const stream = anthropic.messages.stream(requestOptions);

    let currentToolUse: Partial<ToolUseData> | null = null;
    let toolInputJson = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
          };
          toolInputJson = '';
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield {
            type: 'content',
            data: event.delta.text,
          };
        } else if (event.delta.type === 'input_json_delta' && currentToolUse !== null) {
          toolInputJson += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop' && currentToolUse !== null) {
        try {
          const input = JSON.parse(toolInputJson || '{}') as Record<string, unknown>;
          yield {
            type: 'tool_use',
            data: '',
            toolUse: {
              id: currentToolUse.id!,
              name: currentToolUse.name!,
              input,
            },
          };
        } catch {
          yield {
            type: 'error',
            data: 'Failed to parse tool input',
          };
        }
        currentToolUse = null;
        toolInputJson = '';
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
