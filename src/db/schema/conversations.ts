import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const conversationModeEnum = pgEnum('conversation_mode', ['text', 'voice']);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contextSummary: text('context_summary'),
    mode: conversationModeEnum('mode').default('text').notNull(),
    lastModeSwitch: timestamp('last_mode_switch', { withTimezone: true }),
    preferredMode: conversationModeEnum('preferred_mode'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('conversations_user_id_idx').on(table.userId),
    index('conversations_started_at_idx').on(table.startedAt),
    index('conversations_mode_idx').on(table.mode),
  ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationMode = 'text' | 'voice';
