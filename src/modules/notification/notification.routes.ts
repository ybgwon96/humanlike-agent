import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as notificationService from './notification.service.js';
import {
  getPendingNotificationsQuerySchema,
  dismissNotificationParamsSchema,
  createNotificationSchema,
} from './notification.schemas.js';
import type { SingleResponse, PaginatedResponse } from '../../types/api.js';

export const notificationRoutes = new Hono();

notificationRoutes.get('/pending', zValidator('query', getPendingNotificationsQuerySchema), async (c) => {
  const userId = c.req.header('x-user-id');

  if (!userId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID header is required',
        },
      },
      401
    );
  }

  const query = c.req.valid('query');
  const result = await notificationService.getPendingNotifications(userId, query.limit);

  return c.json<PaginatedResponse<(typeof result.notifications)[0]>>({
    success: true,
    data: result.notifications,
    pagination: {
      page: 1,
      limit: query.limit,
      total: result.notifications.length,
      totalPages: 1,
    },
  });
});

notificationRoutes.post('/dismiss/:id', zValidator('param', dismissNotificationParamsSchema), async (c) => {
  const userId = c.req.header('x-user-id');

  if (!userId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID header is required',
        },
      },
      401
    );
  }

  const { id } = c.req.valid('param');
  await notificationService.dismissNotification(id, userId);

  return c.json<SingleResponse<{ dismissed: boolean }>>({
    success: true,
    data: { dismissed: true },
  });
});

notificationRoutes.post('/read/:id', zValidator('param', dismissNotificationParamsSchema), async (c) => {
  const userId = c.req.header('x-user-id');

  if (!userId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID header is required',
        },
      },
      401
    );
  }

  const { id } = c.req.valid('param');
  await notificationService.markAsRead(id, userId);

  return c.json<SingleResponse<{ read: boolean }>>({
    success: true,
    data: { read: true },
  });
});

notificationRoutes.post('/', zValidator('json', createNotificationSchema), async (c) => {
  const body = c.req.valid('json');

  const notification = await notificationService.createNotification({
    userId: body.userId,
    type: body.type,
    priority: body.priority,
    title: body.title,
    content: body.content,
    ttsEnabled: body.ttsEnabled,
    soundEnabled: body.soundEnabled,
    expiresInMinutes: body.expiresInMinutes,
  });

  return c.json<SingleResponse<typeof notification>>(
    {
      success: true,
      data: notification,
    },
    201
  );
});
