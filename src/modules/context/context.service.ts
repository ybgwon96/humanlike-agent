import type { ContextData, MessageDto } from '../../types/domain.js';
import { env } from '../../config/env.js';
import { countTokens, fitMessagesInTokenLimit } from '../../lib/tokenizer/counter.js';
import { AppError } from '../../middleware/error-handler.js';
import * as messagesRepository from '../messages/messages.repository.js';
import * as conversationsRepository from '../conversations/conversations.repository.js';
import * as usersRepository from '../users/users.repository.js';

export interface AssembleContextInput {
  conversationId: string;
  maxTokens?: number;
  includeUserProfile?: boolean;
  includeContextSummary?: boolean;
}

export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatMessageForContext(message: MessageDto): string {
  const role = message.sender === 'USER' ? 'User' : 'Assistant';
  const content = message.maskedContent ?? message.content;
  return `[${role}]: ${content}`;
}

function calculateContextTokens(context: ContextData): number {
  let totalTokens = 0;

  if (context.conversation.contextSummary !== null) {
    totalTokens += countTokens(context.conversation.contextSummary).estimatedTokens;
  }

  for (const message of context.messages) {
    const formattedMessage = formatMessageForContext(message);
    totalTokens += countTokens(formattedMessage).estimatedTokens;
  }

  const userProfileJson = JSON.stringify(context.user.profile);
  totalTokens += countTokens(userProfileJson).estimatedTokens;

  return totalTokens;
}

export async function assembleContext(input: AssembleContextInput): Promise<ContextData> {
  const maxTokens = input.maxTokens ?? env.CONTEXT_MAX_TOKENS;

  const conversation = await conversationsRepository.getConversationWithMessageCount(input.conversationId);
  if (conversation === null) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
  }

  const user = await usersRepository.getUserById(conversation.userId);
  if (user === null) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  const messagesResult = await messagesRepository.getMessagesByConversationId(input.conversationId, {
    limit: 100,
    offset: 0,
  });

  const sortedMessages = messagesResult.messages.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const formattedMessages = sortedMessages.map((m) => formatMessageForContext({
    id: m.id,
    conversationId: m.conversationId,
    sender: m.sender,
    inputType: m.inputType,
    content: m.content,
    maskedContent: m.maskedContent,
    voiceMetadata: m.voiceMetadata
      ? {
          transcriptionConfidence: m.voiceMetadata.transcriptionConfidence,
          audioDuration: m.voiceMetadata.audioDuration,
          audioUrl: m.voiceMetadata.audioUrl,
        }
      : null,
    sentiment: m.sentiment,
    createdAt: m.createdAt,
  }));

  let availableTokens = maxTokens;

  if (input.includeContextSummary !== false && conversation.contextSummary !== null) {
    const summaryTokens = countTokens(conversation.contextSummary).estimatedTokens;
    availableTokens -= summaryTokens;
  }

  if (input.includeUserProfile !== false) {
    const profileTokens = countTokens(JSON.stringify(user.profile)).estimatedTokens;
    availableTokens -= profileTokens;
  }

  const reservedTokens = 100;
  availableTokens -= reservedTokens;

  const { messages: fittedMessageStrings } = fitMessagesInTokenLimit(
    formattedMessages.reverse(),
    availableTokens
  );

  const fittedMessageIndices = new Set(
    fittedMessageStrings.map((_, idx) => sortedMessages.length - 1 - idx)
  );

  const fittedMessages: MessageDto[] = sortedMessages
    .filter((_, idx) => fittedMessageIndices.has(idx))
    .map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      sender: m.sender,
      inputType: m.inputType,
      content: m.content,
      maskedContent: m.maskedContent,
      voiceMetadata: m.voiceMetadata
        ? {
            transcriptionConfidence: m.voiceMetadata.transcriptionConfidence,
            audioDuration: m.voiceMetadata.audioDuration,
            audioUrl: m.voiceMetadata.audioUrl,
          }
        : null,
      sentiment: m.sentiment,
      createdAt: m.createdAt,
    }));

  const contextData: ContextData = {
    conversation: {
      id: conversation.id,
      userId: conversation.userId,
      contextSummary: input.includeContextSummary !== false ? conversation.contextSummary : null,
      mode: conversation.mode,
      lastModeSwitch: conversation.lastModeSwitch,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      messageCount: conversation.messageCount,
    },
    messages: fittedMessages,
    user: {
      id: user.id,
      externalId: user.externalId,
      profile: input.includeUserProfile !== false ? user.profile ?? {
        preferences: {},
        workPatterns: {},
        emotionalBaseline: 0,
      } : {
        preferences: {},
        workPatterns: {},
        emotionalBaseline: 0,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    totalTokens: calculateContextTokens({
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        contextSummary: conversation.contextSummary,
        mode: conversation.mode,
        lastModeSwitch: conversation.lastModeSwitch,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        messageCount: conversation.messageCount,
      },
      messages: fittedMessages,
      user: {
        id: user.id,
        externalId: user.externalId,
        profile: user.profile ?? {
          preferences: {},
          workPatterns: {},
          emotionalBaseline: 0,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      totalTokens: 0,
    }),
  };

  return contextData;
}

export function formatContextForLLM(context: ContextData): ContextMessage[] {
  const messages: ContextMessage[] = [];

  if (context.conversation.contextSummary !== null) {
    messages.push({
      role: 'assistant',
      content: `[Previous conversation summary]: ${context.conversation.contextSummary}`,
    });
  }

  for (const message of context.messages) {
    messages.push({
      role: message.sender === 'USER' ? 'user' : 'assistant',
      content: message.maskedContent ?? message.content,
    });
  }

  return messages;
}

export function getContextStats(context: ContextData): {
  messageCount: number;
  totalTokens: number;
  hasContextSummary: boolean;
  oldestMessageDate: Date | null;
  newestMessageDate: Date | null;
} {
  const messageDates = context.messages.map((m) => m.createdAt);

  return {
    messageCount: context.messages.length,
    totalTokens: context.totalTokens,
    hasContextSummary: context.conversation.contextSummary !== null,
    oldestMessageDate: messageDates.length > 0 ? new Date(Math.min(...messageDates.map((d) => d.getTime()))) : null,
    newestMessageDate: messageDates.length > 0 ? new Date(Math.max(...messageDates.map((d) => d.getTime()))) : null,
  };
}
