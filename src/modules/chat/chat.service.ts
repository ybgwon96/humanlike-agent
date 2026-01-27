import type { InputType, VoiceMetadata } from '../../db/schema/messages.js';
import type { TextMessageResponse, VoiceMessageResponse, StreamChunkResponse } from './chat.schemas.js';
import { maskSensitiveData } from '../../lib/privacy/masking.js';
import { AppError } from '../../middleware/error-handler.js';
import { transcribeAudio, STTError } from '../../services/stt/index.js';
import { saveRecording, getAudioUrl, type RecordingFormat } from '../../services/audio-storage/index.js';
import { streamCompletion, buildMessages, LLMError, validateResponse } from '../../services/llm/index.js';
import { assembleContext, formatContextForLLM } from '../context/context.service.js';
import { getPersonalityForUser, buildSystemPrompt } from '../personality/index.js';
import {
  analyzeEmotionFromContent,
  buildEmotionAdjustedPrompt,
  shouldAdjustResponse,
  getLegacySentimentScore,
} from '../emotion/index.js';
import * as messagesRepository from '../messages/messages.repository.js';
import * as conversationsRepository from '../conversations/conversations.repository.js';

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

    const format = input.mimeType === 'audio/webm' ? 'webm' : 'ogg';
    const { maskedContent } = maskSensitiveData(transcriptionResult.transcription);
    const sentiment = getLegacySentimentScore(transcriptionResult.transcription);

    const message = await messagesRepository.createMessage({
      conversationId: input.conversationId,
      sender: 'USER',
      inputType: 'voice' as InputType,
      content: transcriptionResult.transcription,
      maskedContent,
      sentiment,
      contentSearch: transcriptionResult.transcription,
    });

    await saveRecording(
      input.conversationId,
      message.id,
      input.audioBuffer,
      format as RecordingFormat
    );

    const audioUrl = getAudioUrl(input.conversationId, message.id, format);

    const voiceMetadata: VoiceMetadata = {
      transcriptionConfidence: transcriptionResult.confidence,
      audioDuration: transcriptionResult.duration,
      audioUrl,
    };

    await messagesRepository.updateMessage(message.id, {
      voiceMetadata,
    });

    return {
      messageId: message.id,
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
      : undefined;

    if (systemPrompt && shouldAdjustResponse(emotion)) {
      systemPrompt = buildEmotionAdjustedPrompt(systemPrompt, emotion);
    }

    let fullResponse = '';

    for await (const chunk of streamCompletion({
      messages: llmMessages,
      model: '',
      systemPrompt,
    })) {
      if (chunk.type === 'content') {
        fullResponse += chunk.data;
        yield { type: 'content', data: chunk.data };
      } else if (chunk.type === 'done') {
        if (personalityContext !== null) {
          const validation = validateResponse(fullResponse, personalityContext.profile);
          if (!validation.isValid) {
            yield {
              type: 'warning',
              data: `Response validation: ${validation.failedChecks.join(', ')}`,
            } as StreamChunkResponse;
          }
        }

        const { maskedContent: agentMaskedContent } = maskSensitiveData(fullResponse);
        const agentSentiment = getLegacySentimentScore(fullResponse);

        const agentMessage = await messagesRepository.createMessage({
          conversationId: input.conversationId,
          sender: 'AGENT',
          inputType: 'text',
          content: fullResponse,
          maskedContent: agentMaskedContent,
          sentiment: agentSentiment,
          contentSearch: fullResponse,
        });

        yield { type: 'done', data: '', messageId: agentMessage.id };
      }
    }
  } catch (error) {
    if (error instanceof LLMError) {
      yield { type: 'error', data: error.message };
      return;
    }
    yield { type: 'error', data: 'AI 응답 생성 중 오류가 발생했습니다' };
  }
}
