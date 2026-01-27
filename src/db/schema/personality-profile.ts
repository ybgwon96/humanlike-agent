import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const personalityProfiles = pgTable('personality_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default('Alex'),
  coreTraits: jsonb('core_traits')
    .$type<string[]>()
    .default(['friendly', 'witty', 'professional', 'curious']),
  humorStyle: text('humor_style').default('situational_timing'),
  communicationTone: text('communication_tone').default('casual_respectful'),
  values: jsonb('values')
    .$type<string[]>()
    .default(['user_growth', 'honesty', 'pragmatism']),
  forbiddenPatterns: jsonb('forbidden_patterns')
    .$type<string[]>()
    .default(['excessive_emojis', 'robotic_apologies']),
  exampleResponses: jsonb('example_responses')
    .$type<Record<string, string>>()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PersonalityProfile = typeof personalityProfiles.$inferSelect;
export type NewPersonalityProfile = typeof personalityProfiles.$inferInsert;
