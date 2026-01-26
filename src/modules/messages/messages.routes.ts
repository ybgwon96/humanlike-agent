import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as messagesService from './messages.service.js';
import { createMessageSchema, getMessagesQuerySchema } from './messages.schemas.js';
import type { PaginatedResponse, SingleResponse, SuccessResponse } from '../../types/api.js';
import type { MessageDto } from '../../types/domain.js';

export const messagesRoutes = new Hono();

messagesRoutes.post('/', zValidator('json', createMessageSchema), async (c) => {
  const body = c.req.valid('json');
  const message = await messagesService.createMessage(body);

  return c.json<SingleResponse<MessageDto>>(
    {
      success: true,
      data: message,
    },
    201
  );
});

messagesRoutes.get(
  '/conversation/:conversationId',
  zValidator('param', z.object({ conversationId: z.string().uuid() })),
  zValidator('query', getMessagesQuerySchema),
  async (c) => {
    const { conversationId } = c.req.valid('param');
    const query = c.req.valid('query');

    const result = await messagesService.getMessagesByConversationId({
      conversationId,
      page: query.page,
      limit: query.limit,
    });

    return c.json<PaginatedResponse<MessageDto>>({
      success: true,
      data: result.messages,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }
);

messagesRoutes.get(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const message = await messagesService.getMessageById(id);

    return c.json<SingleResponse<MessageDto>>({
      success: true,
      data: message,
    });
  }
);

messagesRoutes.delete(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    await messagesService.deleteMessage(id);

    return c.json<SuccessResponse>({
      success: true,
      message: 'Message deleted successfully',
    });
  }
);
