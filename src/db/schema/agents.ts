import { pgTable, uuid, text, timestamp, integer, real } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  name: text('name').notNull().default('Default Agent'),
  autonomyLevel: integer('autonomy_level').notNull().default(1),
  trustScore: real('trust_score').notNull().default(0),
  totalTasks: integer('total_tasks').notNull().default(0),
  successfulTasks: integer('successful_tasks').notNull().default(0),
  failedTasks: integer('failed_tasks').notNull().default(0),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  lastPromotion: timestamp('last_promotion', { withTimezone: true }),
  lastEvaluation: timestamp('last_evaluation', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
