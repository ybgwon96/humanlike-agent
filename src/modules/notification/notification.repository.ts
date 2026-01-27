import { eq, and, isNull, or, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { notifications, type NewNotification, type Notification } from '../../db/schema/notifications.js';

export async function createNotification(data: NewNotification): Promise<Notification> {
  const [notification] = await db.insert(notifications).values(data).returning();

  if (notification === undefined) {
    throw new Error('Failed to create notification');
  }

  return notification;
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return notification ?? null;
}

export async function getPendingNotifications(userId: string, limit: number): Promise<Notification[]> {
  const now = new Date();

  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isDismissed, false),
        or(isNull(notifications.expiresAt), sql`${notifications.expiresAt} > ${now}`)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function dismissNotification(id: string): Promise<boolean> {
  const [result] = await db
    .update(notifications)
    .set({
      isDismissed: true,
      dismissedAt: new Date(),
    })
    .where(eq(notifications.id, id))
    .returning({ id: notifications.id });

  return result !== undefined;
}

export async function markAsRead(id: string): Promise<boolean> {
  const [result] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(notifications.id, id))
    .returning({ id: notifications.id });

  return result !== undefined;
}

export async function deleteExpiredNotifications(): Promise<number> {
  const now = new Date();

  const result = await db
    .delete(notifications)
    .where(sql`${notifications.expiresAt} IS NOT NULL AND ${notifications.expiresAt} < ${now}`)
    .returning({ id: notifications.id });

  return result.length;
}
