import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as searchService from './search.service.js';
import { searchQuerySchema, quickSearchQuerySchema } from './search.schemas.js';
import type { PaginatedResponse, SingleResponse } from '../../types/api.js';
import type { SearchResult } from '../../types/domain.js';

export const searchRoutes = new Hono();

searchRoutes.get('/messages', zValidator('query', searchQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const result = await searchService.searchMessages({
    query: query.q,
    filters: {
      userId: query.userId,
      conversationId: query.conversationId,
      sender: query.sender,
      sentimentMin: query.sentimentMin,
      sentimentMax: query.sentimentMax,
      startDate: query.startDate,
      endDate: query.endDate,
    },
    page: query.page,
    limit: query.limit,
    phraseMatch: query.phraseMatch,
  });

  return c.json<PaginatedResponse<SearchResult>>({
    success: true,
    data: result.results,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
});

searchRoutes.get('/quick', zValidator('query', quickSearchQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const results = await searchService.quickSearch(query.q, query.userId, query.limit);

  return c.json<SingleResponse<SearchResult[]>>({
    success: true,
    data: results,
  });
});
