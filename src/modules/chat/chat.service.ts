import type { InputType, VoiceMetadata } from '../../db/schema/messages.js';
import type { TextMessageResponse, VoiceMessageResponse, StreamChunkResponse, ToolApprovalData, ToolResultData } from './chat.schemas.js';
import { maskSensitiveData } from '../../lib/privacy/masking.js';
import { AppError } from '../../middleware/error-handler.js';
import { transcribeAudio, STTError } from '../../services/stt/index.js';
import { saveRecording, getAudioUrl, type RecordingFormat } from '../../services/audio-storage/index.js';
import { streamCompletion, buildMessages, LLMError, validateResponse, type LLMMessage, type LLMContentBlock, type LLMTool, type ToolUseData } from '../../services/llm/index.js';
import { assembleContext, formatContextForLLM } from '../context/context.service.js';
import { getPersonalityForUser, buildSystemPrompt } from '../personality/index.js';
import {
  analyzeEmotionFromContent,
  buildEmotionAdjustedPrompt,
  shouldAdjustResponse,
  getLegacySentimentScore,
} from '../emotion/index.js';
import { toolRegistry, registerBuiltinTools, requiresApproval } from '../../services/tools/index.js';
import * as messagesRepository from '../messages/messages.repository.js';
import * as conversationsRepository from '../conversations/conversations.repository.js';

registerBuiltinTools();

interface PendingToolApproval {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  riskLevel: number;
  conversationId: string;
  messages: LLMMessage[];
  systemPrompt: string;
  createdAt: Date;
}

const pendingApprovals = new Map<string, PendingToolApproval>();

const DEFAULT_SYSTEM_PROMPT = `당신은 사용자를 돕는 AI 에이전트입니다.

역할:
- 사용자의 요청을 이해하고 적절히 수행합니다
- 질문에 정확하고 도움이 되는 답변을 제공합니다
- 친근하고 자연스러운 대화를 유지합니다

특징:
- 한국어로 자연스럽게 대화합니다
- 사용자의 의도를 파악하여 능동적으로 도움을 제공합니다
- 명확하고 구조화된 답변을 제공합니다`;

export interface SendTextMessageInput {
  conversationId: string;
  content: string;
}

export async function sendTextMessage(input: SendTextMessageInput): Promise<TextMessageResponse> {
  const conversation = await conversationsRepository.getConversationById(input.conversationId);

  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }

  if (conversation.endedAt !== null) {
    throw new AppError('CONVERSATION_ENDED', 'Cannot send message to ended conversation', 400);
  }

  const { maskedContent } = maskSensitiveData(input.content);
  const sentiment = getLegacySentimentScore(input.content);

  const message = await messagesRepository.createMessage({
    conversationId: input.conversationId,
    sender: 'USER',
    inputType: 'text',
    content: input.content,
    maskedContent,
    sentiment,
    contentSearch: input.content,
  });

  return {
    messageId: message.id,
    content: message.content,
    timestamp: message.createdAt,
  };
}

export interface SendVoiceMessageInput {
  conversationId: string;
  audioBuffer: Buffer;
  mimeType: string;
  language: 'ko' | 'en';
}

export async function sendVoiceMessage(input: SendVoiceMessageInput): Promise<VoiceMessageResponse> {
  const conversation = await conversationsRepository.getConversationById(input.conversationId);

  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }

  if (conversation.endedAt !== null) {
    throw new AppError('CONVERSATION_ENDED', 'Cannot send message to ended conversation', 400);
  }

  try {
    const transcriptionResult = await transcribeAudio(
      input.audioBuffer,
      input.language,
      input.mimeType
    );

    const format = input.mimeType.startsWith('audio/webm') ? 'webm' : 'ogg';
    const { maskedContent } = maskSensitiveData(transcriptionResult.transcription);
    const sentiment = getLegacySentimentScore(transcriptionResult.transcription);

    const messageId = crypto.randomUUID();

    await saveRecording(
      input.conversationId,
      messageId,
      input.audioBuffer,
      format as RecordingFormat
    );

    const audioUrl = getAudioUrl(input.conversationId, messageId, format);

    const voiceMetadata: VoiceMetadata = {
      transcriptionConfidence: transcriptionResult.confidence,
      audioDuration: transcriptionResult.duration,
      audioUrl,
    };

    await messagesRepository.createMessage({
      id: messageId,
      conversationId: input.conversationId,
      sender: 'USER',
      inputType: 'voice' as InputType,
      content: transcriptionResult.transcription,
      maskedContent,
      sentiment,
      contentSearch: transcriptionResult.transcription,
      voiceMetadata,
    });

    return {
      messageId,
      transcription: transcriptionResult.transcription,
      confidence: transcriptionResult.confidence,
      duration: transcriptionResult.duration,
      lowConfidence: transcriptionResult.lowConfidence,
    };
  } catch (error) {
    if (error instanceof STTError) {
      throw new AppError(error.code, error.message, 400);
    }
    throw error;
  }
}

export interface StreamChatInput {
  conversationId: string;
  content: string;
}

function getToolsForLLM(): LLMTool[] {
  return toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

async function* executeToolLoop(
  conversationId: string,
  messages: LLMMessage[],
  systemPrompt: string,
  personalityContext: Awaited<ReturnType<typeof getPersonalityForUser>>
): AsyncGenerator<StreamChunkResponse> {
  const tools = getToolsForLLM();
  let currentMessages = [...messages];
  let fullTextResponse = '';

  const MAX_TOOL_ITERATIONS = 10;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const toolUseBlocks: ToolUseData[] = [];

    for await (const chunk of streamCompletion({
      messages: currentMessages,
      model: '',
      systemPrompt,
      tools,
    })) {
      if (chunk.type === 'content') {
        fullTextResponse += chunk.data;
        yield { type: 'content', data: chunk.data };
      } else if (chunk.type === 'tool_use' && chunk.toolUse !== undefined) {
        toolUseBlocks.push(chunk.toolUse);
      } else if (chunk.type === 'error') {
        yield { type: 'error', data: chunk.data };
        return;
      }
    }

    if (toolUseBlocks.length === 0) {
      break;
    }

    const assistantContent: LLMContentBlock[] = [];
    if (fullTextResponse.length > 0) {
      assistantContent.push({ type: 'text', text: fullTextResponse });
    }
    for (const tu of toolUseBlocks) {
      assistantContent.push({
        type: 'tool_use',
        id: tu.id,
        name: tu.name,
        input: tu.input,
      });
    }
    currentMessages.push({ role: 'assistant', content: assistantContent });

    const toolResults: LLMContentBlock[] = [];

    for (const toolUse of toolUseBlocks) {
      const tool = toolRegistry.get(toolUse.name);

      if (tool === undefined) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Tool "${toolUse.name}" not found` }),
          is_error: true,
        });
        continue;
      }

      if (requiresApproval(tool.riskLevel)) {
        const approvalId = crypto.randomUUID();

        pendingApprovals.set(approvalId, {
          id: approvalId,
          toolName: toolUse.name,
          toolInput: toolUse.input,
          toolUseId: toolUse.id,
          riskLevel: tool.riskLevel,
          conversationId,
          messages: currentMessages,
          systemPrompt,
          createdAt: new Date(),
        });

        const approvalData: ToolApprovalData = {
          id: approvalId,
          toolName: toolUse.name,
          toolInput: toolUse.input,
          riskLevel: tool.riskLevel,
          reason: `도구 "${toolUse.name}"은(는) 위험도 ${tool.riskLevel}로 사용자 승인이 필요합니다`,
        };

        yield { type: 'tool_approval', data: '', toolApproval: approvalData };
        return;
      }

      const result = await toolRegistry.execute(toolUse.name, toolUse.input);

      const toolResultData: ToolResultData = {
        toolName: toolUse.name,
        success: result.success,
        output: result.output,
        error: result.error,
      };

      yield { type: 'tool_result', data: '', toolResult: toolResultData };

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result.output ?? { error: result.error }),
        is_error: !result.success,
      });
    }

    currentMessages.push({ role: 'user', content: toolResults });
    fullTextResponse = '';
  }

  if (fullTextResponse.length > 0) {
    if (personalityContext !== null) {
      const validation = validateResponse(fullTextResponse, personalityContext.profile);
      if (!validation.isValid) {
        yield {
          type: 'warning',
          data: `Response validation: ${validation.failedChecks.join(', ')}`,
        };
      }
    }

    const { maskedContent: agentMaskedContent } = maskSensitiveData(fullTextResponse);
    const agentSentiment = getLegacySentimentScore(fullTextResponse);

    const agentMessage = await messagesRepository.createMessage({
      conversationId,
      sender: 'AGENT',
      inputType: 'text',
      content: fullTextResponse,
      maskedContent: agentMaskedContent,
      sentiment: agentSentiment,
      contentSearch: fullTextResponse,
    });

    yield { type: 'done', data: '', messageId: agentMessage.id };
  } else {
    yield { type: 'done', data: '' };
  }
}

export async function* streamChat(
  input: StreamChatInput
): AsyncGenerator<StreamChunkResponse> {
  const conversation = await conversationsRepository.getConversationById(input.conversationId);

  if (conversation === null) {
    yield { type: 'error', data: 'Conversation not found' };
    return;
  }

  if (conversation.endedAt !== null) {
    yield { type: 'error', data: 'Cannot send message to ended conversation' };
    return;
  }

  const { maskedContent } = maskSensitiveData(input.content);
  const emotion = analyzeEmotionFromContent(input.content);
  const sentiment = emotion.rawScore;

  const userMessage = await messagesRepository.createMessage({
    conversationId: input.conversationId,
    sender: 'USER',
    inputType: 'text',
    content: input.content,
    maskedContent,
    sentiment,
    contentSearch: input.content,
  });

  yield {
    type: 'message_saved',
    data: '',
    messageId: userMessage.id,
  };

  try {
    const context = await assembleContext({ conversationId: input.conversationId });
    const contextMessages = formatContextForLLM(context);
    const llmMessages = buildMessages(contextMessages, input.content);

    const personalityContext = await getPersonalityForUser(conversation.userId);
    let systemPrompt = personalityContext !== null
      ? buildSystemPrompt(personalityContext)
      : DEFAULT_SYSTEM_PROMPT;

    if (systemPrompt && shouldAdjustResponse(emotion)) {
      systemPrompt = buildEmotionAdjustedPrompt(systemPrompt, emotion);
    }

    for await (const chunk of executeToolLoop(
      input.conversationId,
      llmMessages,
      systemPrompt,
      personalityContext
    )) {
      yield chunk;
    }
  } catch (error) {
    if (error instanceof LLMError) {
      yield { type: 'error', data: error.message };
      return;
    }
    yield { type: 'error', data: 'AI 응답 생성 중 오류가 발생했습니다' };
  }
}

export async function* handleToolApproval(
  approvalId: string,
  approved: boolean
): AsyncGenerator<StreamChunkResponse> {
  const approval = pendingApprovals.get(approvalId);

  if (approval === undefined) {
    yield { type: 'error', data: '승인 요청을 찾을 수 없습니다' };
    return;
  }

  pendingApprovals.delete(approvalId);

  const toolResultContent: LLMContentBlock[] = [];

  if (!approved) {
    toolResultContent.push({
      type: 'tool_result',
      tool_use_id: approval.toolUseId,
      content: JSON.stringify({ error: '사용자가 도구 실행을 거부했습니다' }),
      is_error: true,
    });
  } else {
    const result = await toolRegistry.execute(approval.toolName, approval.toolInput);

    const toolResultData: ToolResultData = {
      toolName: approval.toolName,
      success: result.success,
      output: result.output,
      error: result.error,
    };

    yield { type: 'tool_result', data: '', toolResult: toolResultData };

    toolResultContent.push({
      type: 'tool_result',
      tool_use_id: approval.toolUseId,
      content: JSON.stringify(result.output ?? { error: result.error }),
      is_error: !result.success,
    });
  }

  const updatedMessages: LLMMessage[] = [
    ...approval.messages,
    { role: 'user', content: toolResultContent },
  ];

  const conversation = await conversationsRepository.getConversationById(approval.conversationId);
  const personalityContext = conversation !== null
    ? await getPersonalityForUser(conversation.userId)
    : null;

  for await (const chunk of executeToolLoop(
    approval.conversationId,
    updatedMessages,
    approval.systemPrompt,
    personalityContext
  )) {
    yield chunk;
  }
}
