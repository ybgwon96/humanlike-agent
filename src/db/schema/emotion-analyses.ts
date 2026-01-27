import { pgTable, uuid, text, timestamp, real, smallint, index, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { messages } from './messages.js';

export const emotionTypeEnum = pgEnum('emotion_type', [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
  'FRUSTRATED',
  'EXCITED',
  'TIRED',
  'STRESSED',
]);

export type EmotionTypeValue =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'NEUTRAL'
  | 'FRUSTRATED'
  | 'EXCITED'
  | 'TIRED'
  | 'STRESSED';

export type AnalysisMethod = 'rule_based' | 'llm' | 'hybrid';

export interface EmotionMetadata {
  matchedKeywords?: string[];
  punctuationScore?: number;
  capsRatio?: number;
  [key: string]: unknown;
}

export const emotionAnalyses = pgTable(
  'emotion_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    emotionType: emotionTypeEnum('emotion_type').notNull(),
    intensity: smallint('intensity').notNull(),
    confidence: real('confidence').notNull(),
    rawScore: real('raw_score'),
    analysisMethod: text('analysis_method').$type<AnalysisMethod>().default('rule_based'),
    metadata: jsonb('metadata').$type<EmotionMetadata>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_emotion_analyses_message_id').on(table.messageId),
    index('idx_emotion_analyses_emotion_type').on(table.emotionType),
    index('idx_emotion_analyses_created_at').on(table.createdAt),
  ]
);

export type EmotionAnalysis = typeof emotionAnalyses.$inferSelect;
export type NewEmotionAnalysis = typeof emotionAnalyses.$inferInsert;
