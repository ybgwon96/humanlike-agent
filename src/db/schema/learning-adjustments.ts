import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'HUMOR_FREQUENCY',
  'CONVERSATION_FREQUENCY',
  'TASK_PERMISSION',
  'TIMING_PREFERENCE',
]);

export const learningAdjustments = pgTable('learning_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  adjustmentType: adjustmentTypeEnum('adjustment_type').notNull(),
  oldValue: jsonb('old_value').notNull(),
  newValue: jsonb('new_value').notNull(),
  reason: text('reason').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  revertedAt: timestamp('reverted_at', { withTimezone: true }),
});

export type LearningAdjustment = typeof learningAdjustments.$inferSelect;
export type NewLearningAdjustment = typeof learningAdjustments.$inferInsert;

export type AdjustmentType =
  | 'HUMOR_FREQUENCY'
  | 'CONVERSATION_FREQUENCY'
  | 'TASK_PERMISSION'
  | 'TIMING_PREFERENCE';
