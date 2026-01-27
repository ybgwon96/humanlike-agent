import { eq, and, gte, desc, sql, lt } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  proactiveEngagements,
  userEngagementPatterns,
  deferredMessages,
  type ProactiveEngagement,
  type NewProactiveEngagement,
  type UserEngagementPattern,
  type DeferredMessage,
  type NewDeferredMessage,
  type TriggerReason,
  type UserResponse,
  type FrequencyPreference,
} from '../../db/schema/proactive-engagements.js';

// Proactive Engagements

export async function createEngagement(
  data: NewProactiveEngagement
): Promise<ProactiveEngagement> {
  const [engagement] = await db.insert(proactiveEngagements).values(data).returning();

  if (engagement === undefined) {
    throw new Error('Failed to create engagement');
  }

  return engagement;
}

export async function getEngagementById(id: string): Promise<ProactiveEngagement | null> {
  const [engagement] = await db
    .select()
    .from(proactiveEngagements)
    .where(eq(proactiveEngagements.id, id))
    .limit(1);

  return engagement ?? null;
}

export async function updateEngagementResponse(
  id: string,
  response: UserResponse,
  wasHelpful: boolean | null,
  feedbackText: string | null,
  responseTimeMs: number | null
): Promise<ProactiveEngagement | null> {
  const [updated] = await db
    .update(proactiveEngagements)
    .set({
      userResponse: response,
      wasHelpful,
      feedbackText,
      responseTimeMs,
      respondedAt: new Date(),
    })
    .where(eq(proactiveEngagements.id, id))
    .returning();

  return updated ?? null;
}

export async function markEngagementDelivered(id: string): Promise<ProactiveEngagement | null> {
  const [updated] = await db
    .update(proactiveEngagements)
    .set({ deliveredAt: new Date() })
    .where(eq(proactiveEngagements.id, id))
    .returning();

  return updated ?? null;
}

export async function getTodayEngagementCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(proactiveEngagements)
    .where(
      and(
        eq(proactiveEngagements.userId, userId),
        gte(proactiveEngagements.createdAt, startOfDay)
      )
    );

  return Number(result[0]?.count ?? 0);
}

export async function getRecentEngagements(
  userId: string,
  limit: number = 10
): Promise<ProactiveEngagement[]> {
  return db
    .select()
    .from(proactiveEngagements)
    .where(eq(proactiveEngagements.userId, userId))
    .orderBy(desc(proactiveEngagements.createdAt))
    .limit(limit);
}

// User Engagement Patterns

export async function getEngagementPattern(userId: string): Promise<UserEngagementPattern | null> {
  const [pattern] = await db
    .select()
    .from(userEngagementPatterns)
    .where(eq(userEngagementPatterns.userId, userId))
    .limit(1);

  return pattern ?? null;
}

export async function createEngagementPattern(userId: string): Promise<UserEngagementPattern> {
  const [pattern] = await db
    .insert(userEngagementPatterns)
    .values({ userId })
    .returning();

  if (pattern === undefined) {
    throw new Error('Failed to create engagement pattern');
  }

  return pattern;
}

export async function getOrCreateEngagementPattern(
  userId: string
): Promise<UserEngagementPattern> {
  const existing = await getEngagementPattern(userId);
  if (existing) return existing;
  return createEngagementPattern(userId);
}

interface UpdatePatternData {
  frequencyPreference?: FrequencyPreference;
  dailyLimit?: number;
  consecutiveIgnores?: number;
  pausedUntil?: Date | null;
  preferredHours?: number[];
  triggerPreferences?: Record<string, boolean>;
  totalEngagements?: number;
  totalAccepted?: number;
  totalHelpful?: number;
  acceptanceRate?: number;
  helpfulnessRate?: number;
  lastEngagementAt?: Date;
}

export async function updateEngagementPattern(
  userId: string,
  data: UpdatePatternData
): Promise<UserEngagementPattern | null> {
  const [updated] = await db
    .update(userEngagementPatterns)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userEngagementPatterns.userId, userId))
    .returning();

  return updated ?? null;
}

export async function incrementConsecutiveIgnores(userId: string): Promise<number> {
  const [updated] = await db
    .update(userEngagementPatterns)
    .set({
      consecutiveIgnores: sql`${userEngagementPatterns.consecutiveIgnores} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userEngagementPatterns.userId, userId))
    .returning({ consecutiveIgnores: userEngagementPatterns.consecutiveIgnores });

  return updated?.consecutiveIgnores ?? 0;
}

export async function resetConsecutiveIgnores(userId: string): Promise<void> {
  await db
    .update(userEngagementPatterns)
    .set({
      consecutiveIgnores: 0,
      updatedAt: new Date(),
    })
    .where(eq(userEngagementPatterns.userId, userId));
}

export async function incrementEngagementStats(
  userId: string,
  accepted: boolean,
  helpful: boolean
): Promise<void> {
  await db
    .update(userEngagementPatterns)
    .set({
      totalEngagements: sql`${userEngagementPatterns.totalEngagements} + 1`,
      totalAccepted: accepted
        ? sql`${userEngagementPatterns.totalAccepted} + 1`
        : userEngagementPatterns.totalAccepted,
      totalHelpful: helpful
        ? sql`${userEngagementPatterns.totalHelpful} + 1`
        : userEngagementPatterns.totalHelpful,
      lastEngagementAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userEngagementPatterns.userId, userId));
}

export async function updateRates(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE user_engagement_patterns
    SET
      acceptance_rate = CASE
        WHEN total_engagements > 0
        THEN total_accepted::real / total_engagements::real
        ELSE 0
      END,
      helpfulness_rate = CASE
        WHEN total_accepted > 0
        THEN total_helpful::real / total_accepted::real
        ELSE 0
      END,
      updated_at = NOW()
    WHERE user_id = ${userId}
  `);
}

// Deferred Messages

export async function createDeferredMessage(data: NewDeferredMessage): Promise<DeferredMessage> {
  const [message] = await db.insert(deferredMessages).values(data).returning();

  if (message === undefined) {
    throw new Error('Failed to create deferred message');
  }

  return message;
}

export async function getPendingDeferredMessages(userId: string): Promise<DeferredMessage[]> {
  const now = new Date();

  return db
    .select()
    .from(deferredMessages)
    .where(
      and(
        eq(deferredMessages.userId, userId),
        eq(deferredMessages.delivered, false),
        lt(deferredMessages.scheduledFor, now)
      )
    )
    .orderBy(deferredMessages.scheduledFor);
}

export async function markDeferredMessageDelivered(id: string): Promise<void> {
  await db
    .update(deferredMessages)
    .set({
      delivered: true,
      deliveredAt: new Date(),
    })
    .where(eq(deferredMessages.id, id));
}

export async function deleteExpiredDeferredMessages(): Promise<number> {
  const now = new Date();

  const deleted = await db
    .delete(deferredMessages)
    .where(
      and(
        eq(deferredMessages.delivered, false),
        lt(deferredMessages.expiresAt, now)
      )
    )
    .returning({ id: deferredMessages.id });

  return deleted.length;
}

// Statistics

interface EngagementStats {
  totalEngagements: number;
  acceptedCount: number;
  helpfulCount: number;
  byTriggerReason: Record<TriggerReason, number>;
}

export async function getEngagementStats(
  userId: string,
  since: Date
): Promise<EngagementStats> {
  const engagements = await db
    .select()
    .from(proactiveEngagements)
    .where(
      and(
        eq(proactiveEngagements.userId, userId),
        gte(proactiveEngagements.createdAt, since)
      )
    );

  const byTriggerReason: Record<TriggerReason, number> = {
    STUCK_TIMEOUT: 0,
    HIGH_FRUSTRATION: 0,
    POST_FOCUS_IDLE: 0,
    SCHEDULED: 0,
    MANUAL: 0,
  };

  let acceptedCount = 0;
  let helpfulCount = 0;

  for (const e of engagements) {
    byTriggerReason[e.triggerReason]++;
    if (e.userResponse === 'ACCEPTED') acceptedCount++;
    if (e.wasHelpful === true) helpfulCount++;
  }

  return {
    totalEngagements: engagements.length,
    acceptedCount,
    helpfulCount,
    byTriggerReason,
  };
}
