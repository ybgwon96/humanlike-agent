import { pgTable, uuid, text, timestamp, real, index, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations.js';

export const senderEnum = pgEnum('sender_type', ['USER', 'AGENT']);
export const inputTypeEnum = pgEnum('input_type', ['text', 'voice', 'system']);

export interface VoiceMetadata {
  transcriptionConfidence: number;
  audioDuration: number;
  audioUrl: string;
}

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    sender: senderEnum('sender').notNull(),
    inputType: inputTypeEnum('input_type').default('text').notNull(),
    content: text('content').notNull(),
    maskedContent: text('masked_content'),
    voiceMetadata: jsonb('voice_metadata').$type<VoiceMetadata>(),
    attachments: text('attachments').array(),
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
    index('messages_input_type_idx').on(table.inputType),
    index('messages_content_search_gin_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.content})`
    ),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type SenderType = 'USER' | 'AGENT';
export type InputType = 'text' | 'voice' | 'system';
