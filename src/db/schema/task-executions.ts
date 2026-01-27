import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { agentTasks } from './agent-tasks.js';

export const executionStatusEnum = pgEnum('execution_status', [
  'PENDING',
  'EXECUTING',
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
]);

export const taskExecutions = pgTable('task_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => agentTasks.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  status: executionStatusEnum('status').notNull().default('PENDING'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  executionTimeMs: integer('execution_time_ms'),
  output: jsonb('output').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  rollbackInfo: jsonb('rollback_info').$type<RollbackInfo>(),
  reversible: boolean('reversible').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => agentTasks.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  requestedLevel: integer('requested_level').notNull(),
  agentLevel: integer('agent_level').notNull(),
  status: approvalStatusEnum('status').notNull().default('PENDING'),
  reason: text('reason'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;

export type ExecutionStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface RollbackInfo {
  canRollback: boolean;
  rollbackData?: Record<string, unknown>;
  rollbackExpiresAt?: string;
}
