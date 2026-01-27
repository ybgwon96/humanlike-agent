import { pgTable, uuid, real, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const conversationFrequencyTierEnum = pgEnum('conversation_frequency_tier', [
  'HIGH',
  'MEDIUM',
  'LOW',
]);

export const userLearningPreferences = pgTable('user_learning_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  humorFrequencyModifier: real('humor_frequency_modifier').notNull().default(1.0),
  conversationFrequencyTier: conversationFrequencyTierEnum('conversation_frequency_tier')
    .notNull()
    .default('MEDIUM'),
  optimalConversationHours: jsonb('optimal_conversation_hours').$type<number[]>().default([]),
  autoApproveTaskTypes: jsonb('auto_approve_task_types').$type<string[]>().default([]),
  neverSuggestTaskTypes: jsonb('never_suggest_task_types').$type<string[]>().default([]),
  lastLearningRun: timestamp('last_learning_run', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UserLearningPreferences = typeof userLearningPreferences.$inferSelect;
export type NewUserLearningPreferences = typeof userLearningPreferences.$inferInsert;

export type ConversationFrequencyTier = 'HIGH' | 'MEDIUM' | 'LOW';
