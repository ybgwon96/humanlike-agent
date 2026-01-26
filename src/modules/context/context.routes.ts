import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as contextService from './context.service.js';
import { assembleContextQuerySchema } from './context.schemas.js';
import type { SingleResponse } from '../../types/api.js';
import type { ContextData } from '../../types/domain.js';

export const contextRoutes = new Hono();

contextRoutes.get('/assemble', zValidator('query', assembleContextQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const context = await contextService.assembleContext({
    conversationId: query.conversationId,
    maxTokens: query.maxTokens,
    includeUserProfile: query.includeUserProfile,
    includeContextSummary: query.includeContextSummary,
  });

  const stats = contextService.getContextStats(context);

  return c.json<SingleResponse<ContextData & { stats: typeof stats }>>({
    success: true,
    data: {
      ...context,
      stats,
    },
  });
});

contextRoutes.get('/formatted', zValidator('query', assembleContextQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const context = await contextService.assembleContext({
    conversationId: query.conversationId,
    maxTokens: query.maxTokens,
    includeUserProfile: query.includeUserProfile,
    includeContextSummary: query.includeContextSummary,
  });

  const formattedMessages = contextService.formatContextForLLM(context);
  const stats = contextService.getContextStats(context);

  return c.json<
    SingleResponse<{
      messages: ReturnType<typeof contextService.formatContextForLLM>;
      user: ContextData['user'];
      stats: typeof stats;
    }>
  >({
    success: true,
    data: {
      messages: formattedMessages,
      user: context.user,
      stats,
    },
  });
});
