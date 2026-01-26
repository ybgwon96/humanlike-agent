import { pgTable, uuid, text, timestamp, real, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations.js';

export const senderEnum = pgEnum('sender_type', ['USER', 'AGENT']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    sender: senderEnum('sender').notNull(),
    content: text('content').notNull(),
    maskedContent: text('masked_content'),
    sentiment: real('sentiment').default(0),
    contentSearch: text('content_search'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_sentiment_idx').on(table.sentiment),
    index('messages_expires_at_idx').on(table.expiresAt),
    index('messages_content_search_gin_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.content})`
    ),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type SenderType = 'USER' | 'AGENT';
