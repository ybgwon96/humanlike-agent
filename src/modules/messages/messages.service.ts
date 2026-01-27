import type { SenderType } from '../../db/schema/messages.js';
import type { MessageDto } from '../../types/domain.js';
import { maskSensitiveData } from '../../lib/privacy/masking.js';
import { logAudit } from '../../lib/audit/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { getLegacySentimentScore } from '../emotion/index.js';
import * as messagesRepository from './messages.repository.js';
import * as conversationsRepository from '../conversations/conversations.repository.js';

export interface CreateMessageInput {
  conversationId: string;
  sender: SenderType;
  content: string;
}

export interface GetMessagesInput {
  conversationId: string;
  page?: number;
  limit?: number;
}

function toDto(message: Awaited<ReturnType<typeof messagesRepository.getMessageById>>): MessageDto {
  if (message === null) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: message.sender,
    inputType: message.inputType,
    content: message.content,
    maskedContent: message.maskedContent,
    voiceMetadata: message.voiceMetadata
      ? {
          transcriptionConfidence: message.voiceMetadata.transcriptionConfidence,
          audioDuration: message.voiceMetadata.audioDuration,
          audioUrl: message.voiceMetadata.audioUrl,
        }
      : null,
    sentiment: message.sentiment,
    createdAt: message.createdAt,
  };
}

export async function createMessage(input: CreateMessageInput): Promise<MessageDto> {
  const { maskedContent } = maskSensitiveData(input.content);
  const sentiment = getLegacySentimentScore(input.content);

  const message = await messagesRepository.createMessage({
    conversationId: input.conversationId,
    sender: input.sender,
    content: input.content,
    maskedContent,
    sentiment,
    contentSearch: input.content,
  });

  return toDto(message);
}

export async function getMessageById(id: string): Promise<MessageDto> {
  const message = await messagesRepository.getMessageById(id);
  return toDto(message);
}

export async function getMessagesByConversationId(
  input: GetMessagesInput
): Promise<{ messages: MessageDto[]; total: number; page: number; limit: number }> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const offset = (page - 1) * limit;

  const result = await messagesRepository.getMessagesByConversationId(input.conversationId, {
    limit,
    offset,
  });

  return {
    messages: result.messages.map((m) => toDto(m)),
    total: result.total,
    page,
    limit,
  };
}

export async function deleteMessage(id: string): Promise<void> {
  const message = await messagesRepository.getMessageById(id);

  if (message === null) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  const conversation = await conversationsRepository.getConversationById(message.conversationId);

  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Associated conversation not found', 404);
  }

  const deleted = await messagesRepository.deleteMessage(id);

  if (!deleted) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  await logAudit({
    userId: conversation.userId,
    resourceType: 'message',
    resourceId: id,
    action: 'delete',
    metadata: { conversationId: message.conversationId },
  });
}

export async function deleteExpiredMessages(): Promise<number> {
  return messagesRepository.deleteExpiredMessages();
}
