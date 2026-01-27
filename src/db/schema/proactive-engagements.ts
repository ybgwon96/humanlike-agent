import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const triggerReasonEnum = pgEnum('trigger_reason', [
  'STUCK_TIMEOUT',
  'HIGH_FRUSTRATION',
  'POST_FOCUS_IDLE',
  'SCHEDULED',
  'MANUAL',
]);

export const userResponseEnum = pgEnum('user_response', [
  'ACCEPTED',
  'DECLINED',
  'IGNORED',
  'DEFERRED',
]);

export const frequencyPreferenceEnum = pgEnum('frequency_preference', [
  'MINIMAL',
  'BALANCED',
  'PROACTIVE',
]);

export const proactiveEngagements = pgTable('proactive_engagements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  triggerReason: triggerReasonEnum('trigger_reason').notNull(),
  triggerContext: jsonb('trigger_context').default({}),
  messageContent: text('message_content').notNull(),
  messagePriority: text('message_priority').default('normal'),
  userResponse: userResponseEnum('user_response'),
  responseTimeMs: integer('response_time_ms'),
  wasHelpful: boolean('was_helpful'),
  feedbackText: text('feedback_text'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userEngagementPatterns = pgTable('user_engagement_patterns', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  frequencyPreference: frequencyPreferenceEnum('frequency_preference').notNull().default('BALANCED'),
  dailyLimit: integer('daily_limit').notNull().default(10),
  consecutiveIgnores: integer('consecutive_ignores').notNull().default(0),
  pausedUntil: timestamp('paused_until', { withTimezone: true }),
  preferredHours: jsonb('preferred_hours').default([]),
  triggerPreferences: jsonb('trigger_preferences').default({}),
  totalEngagements: integer('total_engagements').notNull().default(0),
  totalAccepted: integer('total_accepted').notNull().default(0),
  totalHelpful: integer('total_helpful').notNull().default(0),
  acceptanceRate: real('acceptance_rate').default(0),
  helpfulnessRate: real('helpfulness_rate').default(0),
  lastEngagementAt: timestamp('last_engagement_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const deferredMessages = pgTable('deferred_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  engagementId: uuid('engagement_id').references(() => proactiveEngagements.id, {
    onDelete: 'cascade',
  }),
  messageContent: text('message_content').notNull(),
  triggerReason: triggerReasonEnum('trigger_reason').notNull(),
  priority: text('priority').default('normal'),
  deferReason: text('defer_reason').notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  delivered: boolean('delivered').notNull().default(false),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProactiveEngagement = typeof proactiveEngagements.$inferSelect;
export type NewProactiveEngagement = typeof proactiveEngagements.$inferInsert;

export type UserEngagementPattern = typeof userEngagementPatterns.$inferSelect;
export type NewUserEngagementPattern = typeof userEngagementPatterns.$inferInsert;

export type DeferredMessage = typeof deferredMessages.$inferSelect;
export type NewDeferredMessage = typeof deferredMessages.$inferInsert;

export type TriggerReason = 'STUCK_TIMEOUT' | 'HIGH_FRUSTRATION' | 'POST_FOCUS_IDLE' | 'SCHEDULED' | 'MANUAL';
export type UserResponse = 'ACCEPTED' | 'DECLINED' | 'IGNORED' | 'DEFERRED';
export type FrequencyPreference = 'MINIMAL' | 'BALANCED' | 'PROACTIVE';
