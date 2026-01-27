import { pgTable, uuid, text, timestamp, boolean, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const notificationTypeEnum = pgEnum('notification_type', ['greeting', 'reminder', 'alert', 'proactive']);
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'normal', 'high']);

export interface NotificationMetadata {
  ttsEnabled?: boolean;
  soundEnabled?: boolean;
  actionUrl?: string;
}

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').default('proactive').notNull(),
    priority: notificationPriorityEnum('priority').default('normal').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<NotificationMetadata>(),
    isRead: boolean('is_read').default(false).notNull(),
    isDismissed: boolean('is_dismissed').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_is_read_idx').on(table.isRead),
    index('notifications_is_dismissed_idx').on(table.isDismissed),
    index('notifications_created_at_idx').on(table.createdAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = 'greeting' | 'reminder' | 'alert' | 'proactive';
export type NotificationPriority = 'low' | 'normal' | 'high';
