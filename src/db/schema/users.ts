import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export interface UserProfile {
  preferences: Record<string, unknown>;
  workPatterns: Record<string, unknown>;
  emotionalBaseline: number;
}

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: text('external_id').notNull().unique(),
  profile: jsonb('profile').$type<UserProfile>().default({
    preferences: {},
    workPatterns: {},
    emotionalBaseline: 0,
  }),
  encryptedData: text('encrypted_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
