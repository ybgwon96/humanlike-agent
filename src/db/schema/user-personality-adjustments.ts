import { pgTable, uuid, text, timestamp, jsonb, real } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { personalityProfiles } from './personality-profile.js';

export const userPersonalityAdjustments = pgTable('user_personality_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => personalityProfiles.id),
  humorFrequencyModifier: real('humor_frequency_modifier').default(1.0),
  formalityLevel: text('formality_level').default('normal'),
  customPreferences: jsonb('custom_preferences')
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UserPersonalityAdjustment = typeof userPersonalityAdjustments.$inferSelect;
export type NewUserPersonalityAdjustment = typeof userPersonalityAdjustments.$inferInsert;
