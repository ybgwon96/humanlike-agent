import type { InputType, VoiceMetadata } from '../../db/schema/messages.js';
import type { TextMessageResponse, VoiceMessageResponse } from './chat.schemas.js';
import { maskSensitiveData } from '../../lib/privacy/masking.js';
import { AppError } from '../../middleware/error-handler.js';
import { transcribeAudio, STTError } from '../../services/stt/index.js';
import { saveRecording, getAudioUrl, type RecordingFormat } from '../../services/audio-storage/index.js';
import * as messagesRepository from '../messages/messages.repository.js';
import * as conversationsRepository from '../conversations/conversations.repository.js';

function analyzeSentiment(content: string): number {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like',
    'thank', 'thanks', 'helpful', 'perfect', '좋아', '감사', '최고', '훌륭',
  ];
  const negativeWords = [
    'bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'sad', 'wrong',
    'error', 'fail', 'problem', 'issue', '싫어', '문제', '실패', '오류',
  ];

  const lowerContent = content.toLowerCase();
  let score = 0;
  let wordCount = 0;

  for (const word of positiveWords) {
    if (lowerContent.includes(word)) {
      score += 1;
      wordCount += 1;
    }
  }

  for (const word of negativeWords) {
    if (lowerContent.includes(word)) {
      score -= 1;
      wordCount += 1;
    }
  }

  if (wordCount === 0) {
    return 0;
  }

  return Math.max(-1, Math.min(1, score / wordCount));
}

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
  const sentiment = analyzeSentiment(input.content);

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
    const sentiment = analyzeSentiment(transcriptionResult.transcription);

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
