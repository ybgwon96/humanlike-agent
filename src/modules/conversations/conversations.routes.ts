import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as conversationsService from './conversations.service.js';
import {
  createConversationSchema,
  getConversationsQuerySchema,
  updateConversationSchema,
} from './conversations.schemas.js';
import type { PaginatedResponse, SingleResponse, SuccessResponse } from '../../types/api.js';
import type { ConversationDto } from '../../types/domain.js';

export const conversationsRoutes = new Hono();

conversationsRoutes.post('/', zValidator('json', createConversationSchema), async (c) => {
  const body = c.req.valid('json');
  const conversation = await conversationsService.createConversation(body);

  return c.json<SingleResponse<ConversationDto>>(
    {
      success: true,
      data: conversation,
    },
    201
  );
});

conversationsRoutes.get(
  '/user/:userId',
  zValidator('param', z.object({ userId: z.string().uuid() })),
  zValidator('query', getConversationsQuerySchema),
  async (c) => {
    const { userId } = c.req.valid('param');
    const query = c.req.valid('query');

    const result = await conversationsService.getConversationsByUserId({
      userId,
      page: query.page,
      limit: query.limit,
      activeOnly: query.activeOnly,
    });

    return c.json<PaginatedResponse<ConversationDto>>({
      success: true,
      data: result.conversations,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }
);

conversationsRoutes.get(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const conversation = await conversationsService.getConversationById(id);

    return c.json<SingleResponse<ConversationDto>>({
      success: true,
      data: conversation,
    });
  }
);

conversationsRoutes.patch(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', updateConversationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const conversation = await conversationsService.updateConversation({
      id,
      contextSummary: body.contextSummary,
    });

    return c.json<SingleResponse<ConversationDto>>({
      success: true,
      data: conversation,
    });
  }
);

conversationsRoutes.post(
  '/:id/end',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const conversation = await conversationsService.endConversation(id);

    return c.json<SingleResponse<ConversationDto>>({
      success: true,
      data: conversation,
    });
  }
);

conversationsRoutes.delete(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    await conversationsService.deleteConversation(id);

    return c.json<SuccessResponse>({
      success: true,
      message: 'Conversation deleted successfully',
    });
  }
);
