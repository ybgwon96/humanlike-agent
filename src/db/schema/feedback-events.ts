import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const feedbackTypeEnum = pgEnum('feedback_type', [
  'EXPLICIT_POSITIVE',
  'EXPLICIT_NEGATIVE',
  'IMPLICIT_ACCEPT',
  'IMPLICIT_IGNORE',
  'TASK_HELPFUL',
  'TASK_NOT_HELPFUL',
]);

export interface FeedbackContext {
  conversationId?: string;
  taskId?: string;
  triggerReason?: string;
  timeOfDay?: number;
  dayOfWeek?: number;
}

export const feedbackEvents = pgTable('feedback_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  feedbackType: feedbackTypeEnum('feedback_type').notNull(),
  context: jsonb('context').$type<FeedbackContext>(),
  feedbackText: text('feedback_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FeedbackEvent = typeof feedbackEvents.$inferSelect;
export type NewFeedbackEvent = typeof feedbackEvents.$inferInsert;

export type FeedbackType =
  | 'EXPLICIT_POSITIVE'
  | 'EXPLICIT_NEGATIVE'
  | 'IMPLICIT_ACCEPT'
  | 'IMPLICIT_IGNORE'
  | 'TASK_HELPFUL'
  | 'TASK_NOT_HELPFUL';
