import { z } from 'zod';

export const notificationTypeSchema = z.enum(['greeting', 'reminder', 'alert', 'proactive']);
export const notificationPrioritySchema = z.enum(['low', 'normal', 'high']);

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: notificationTypeSchema.default('proactive'),
  priority: notificationPrioritySchema.default('normal'),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  ttsEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  expiresInMinutes: z.number().int().positive().max(1440).optional(),
});

export type CreateNotificationRequest = z.infer<typeof createNotificationSchema>;

export const getPendingNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export type GetPendingNotificationsQuery = z.infer<typeof getPendingNotificationsQuerySchema>;

export const dismissNotificationParamsSchema = z.object({
  id: z.string().uuid(),
});

export type DismissNotificationParams = z.infer<typeof dismissNotificationParamsSchema>;

export const notificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  priority: notificationPrioritySchema,
  title: z.string(),
  content: z.string(),
  ttsEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  isRead: z.boolean(),
  isDismissed: z.boolean(),
  createdAt: z.string().datetime(),
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
