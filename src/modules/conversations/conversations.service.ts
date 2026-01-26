import type { ConversationDto } from '../../types/domain.js';
import { AppError } from '../../middleware/error-handler.js';
import * as conversationsRepository from './conversations.repository.js';

export interface CreateConversationInput {
  userId: string;
}

export interface GetConversationsInput {
  userId: string;
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface UpdateConversationInput {
  id: string;
  contextSummary?: string;
}

function toDto(
  conversation: Awaited<ReturnType<typeof conversationsRepository.getConversationById>>,
  messageCount?: number
): ConversationDto {
  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }

  return {
    id: conversation.id,
    userId: conversation.userId,
    contextSummary: conversation.contextSummary,
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    messageCount,
  };
}

export async function createConversation(input: CreateConversationInput): Promise<ConversationDto> {
  const conversation = await conversationsRepository.createConversation({
    userId: input.userId,
  });

  return toDto(conversation, 0);
}

export async function getConversationById(id: string): Promise<ConversationDto> {
  const conversation = await conversationsRepository.getConversationWithMessageCount(id);

  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }

  return toDto(conversation, conversation.messageCount);
}

export async function getConversationsByUserId(
  input: GetConversationsInput
): Promise<{ conversations: ConversationDto[]; total: number; page: number; limit: number }> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const offset = (page - 1) * limit;

  const result = await conversationsRepository.getConversationsByUserId(input.userId, {
    limit,
    offset,
    activeOnly: input.activeOnly,
  });

  return {
    conversations: result.conversations.map((c) => toDto(c)),
    total: result.total,
    page,
    limit,
  };
}

export async function updateConversation(input: UpdateConversationInput): Promise<ConversationDto> {
  const conversation = await conversationsRepository.updateConversation(input.id, {
    contextSummary: input.contextSummary,
  });

  return toDto(conversation);
}

export async function endConversation(id: string): Promise<ConversationDto> {
  const conversation = await conversationsRepository.endConversation(id);
  return toDto(conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  const deleted = await conversationsRepository.deleteConversation(id);

  if (!deleted) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }
}
