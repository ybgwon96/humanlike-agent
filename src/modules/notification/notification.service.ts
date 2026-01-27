import type { NotificationType, NotificationPriority, NotificationMetadata } from '../../db/schema/notifications.js';
import { AppError } from '../../middleware/error-handler.js';
import * as notificationRepository from './notification.repository.js';
import type { NotificationResponse } from './notification.schemas.js';

interface NotificationDto extends NotificationResponse {
  expiresAt: string | null;
}

function toDto(notification: Awaited<ReturnType<typeof notificationRepository.getNotificationById>>): NotificationDto {
  if (notification === null) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  const metadata = notification.metadata as NotificationMetadata | null;

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type as NotificationType,
    priority: notification.priority as NotificationPriority,
    title: notification.title,
    content: notification.content,
    ttsEnabled: metadata?.ttsEnabled ?? true,
    soundEnabled: metadata?.soundEnabled ?? true,
    isRead: notification.isRead,
    isDismissed: notification.isDismissed,
    createdAt: notification.createdAt.toISOString(),
    expiresAt: notification.expiresAt?.toISOString() ?? null,
  };
}

export interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  title: string;
  content: string;
  ttsEnabled?: boolean;
  soundEnabled?: boolean;
  expiresInMinutes?: number;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationDto> {
  const metadata: NotificationMetadata = {
    ttsEnabled: input.ttsEnabled ?? true,
    soundEnabled: input.soundEnabled ?? true,
  };

  const expiresAt = input.expiresInMinutes ? new Date(Date.now() + input.expiresInMinutes * 60 * 1000) : undefined;

  const notification = await notificationRepository.createNotification({
    userId: input.userId,
    type: input.type ?? 'proactive',
    priority: input.priority ?? 'normal',
    title: input.title,
    content: input.content,
    metadata,
    expiresAt,
  });

  return toDto(notification);
}

export async function getPendingNotifications(
  userId: string,
  limit: number = 10
): Promise<{ notifications: NotificationDto[] }> {
  const notifications = await notificationRepository.getPendingNotifications(userId, limit);

  return {
    notifications: notifications.map((n) => toDto(n)),
  };
}

export async function dismissNotification(id: string, userId: string): Promise<void> {
  const notification = await notificationRepository.getNotificationById(id);

  if (notification === null) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('FORBIDDEN', 'You do not have permission to dismiss this notification', 403);
  }

  const dismissed = await notificationRepository.dismissNotification(id);

  if (!dismissed) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }
}

export async function markAsRead(id: string, userId: string): Promise<void> {
  const notification = await notificationRepository.getNotificationById(id);

  if (notification === null) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('FORBIDDEN', 'You do not have permission to update this notification', 403);
  }

  await notificationRepository.markAsRead(id);
}

export async function createAgentGreeting(userId: string, message: string): Promise<NotificationDto> {
  return createNotification({
    userId,
    type: 'greeting',
    priority: 'normal',
    title: 'Hi there!',
    content: message,
    ttsEnabled: true,
    soundEnabled: true,
    expiresInMinutes: 30,
  });
}
