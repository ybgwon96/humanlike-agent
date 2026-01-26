import type { SearchResult, MessageDto } from '../../types/domain.js';
import * as searchRepository from './search.repository.js';
import type { SearchFilters } from './search.repository.js';

export interface SearchInput {
  query: string;
  filters?: {
    userId?: string;
    conversationId?: string;
    sender?: 'USER' | 'AGENT';
    sentimentMin?: number;
    sentimentMax?: number;
    startDate?: string;
    endDate?: string;
  };
  page?: number;
  limit?: number;
  phraseMatch?: boolean;
}

function toMessageDto(message: searchRepository.SearchResultItem['message']): MessageDto {
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

function buildFilters(input: SearchInput['filters']): SearchFilters {
  if (input === undefined) {
    return {};
  }

  return {
    userId: input.userId,
    conversationId: input.conversationId,
    sender: input.sender,
    sentimentMin: input.sentimentMin,
    sentimentMax: input.sentimentMax,
    startDate: input.startDate !== undefined ? new Date(input.startDate) : undefined,
    endDate: input.endDate !== undefined ? new Date(input.endDate) : undefined,
  };
}

export async function searchMessages(
  input: SearchInput
): Promise<{ results: SearchResult[]; total: number; page: number; limit: number }> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const offset = (page - 1) * limit;

  const filters = buildFilters(input.filters);
  const options = { limit, offset };

  const searchFn =
    input.phraseMatch === true
      ? searchRepository.searchByPhraseMatch
      : searchRepository.searchMessages;

  const result = await searchFn(input.query, filters, options);

  return {
    results: result.results.map((r) => ({
      message: toMessageDto(r.message),
      rank: r.rank,
      highlight: r.headline,
    })),
    total: result.total,
    page,
    limit,
  };
}

export async function quickSearch(
  query: string,
  userId?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const filters: SearchFilters = userId !== undefined ? { userId } : {};

  const result = await searchRepository.searchMessages(query, filters, { limit, offset: 0 });

  return result.results.map((r) => ({
    message: toMessageDto(r.message),
    rank: r.rank,
    highlight: r.headline,
  }));
}
