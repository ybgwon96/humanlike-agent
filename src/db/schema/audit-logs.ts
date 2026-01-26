import { pgTable, uuid, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const resourceTypeEnum = pgEnum('resource_type', ['conversation', 'message']);
export const auditActionEnum = pgEnum('audit_action', ['delete']);

export interface AuditMetadata {
  [key: string]: unknown;
}

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    resourceType: resourceTypeEnum('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    action: auditActionEnum('action').notNull(),
    metadata: jsonb('metadata').$type<AuditMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_resource_type_idx').on(table.resourceType),
    index('audit_logs_resource_id_idx').on(table.resourceId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ResourceType = 'conversation' | 'message';
export type AuditAction = 'delete';
