import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

export const taskTypeEnum = pgEnum('task_type', [
  'SUGGESTION',
  'DRAFT',
  'EXECUTION',
  'DECISION',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'PENDING',
  'APPROVED',
  'COMPLETED',
  'FAILED',
  'REJECTED',
]);

export const userFeedbackEnum = pgEnum('user_feedback', [
  'POSITIVE',
  'NEUTRAL',
  'NEGATIVE',
]);

export const agentTasks = pgTable('agent_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  type: taskTypeEnum('type').notNull(),
  requiresLevel: integer('requires_level').notNull(),
  description: text('description').notNull(),
  status: taskStatusEnum('status').notNull().default('PENDING'),
  userFeedback: userFeedbackEnum('user_feedback'),
  outcome: jsonb('outcome').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;

export type TaskType = 'SUGGESTION' | 'DRAFT' | 'EXECUTION' | 'DECISION';
export type TaskStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'REJECTED';
export type UserFeedback = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
