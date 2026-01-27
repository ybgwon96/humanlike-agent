import { eq, and, desc, gte, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  feedbackEvents,
  type FeedbackEvent,
  type NewFeedbackEvent,
  type FeedbackType,
} from '../../db/schema/feedback-events.js';
import {
  learningAdjustments,
  type LearningAdjustment,
  type NewLearningAdjustment,
} from '../../db/schema/learning-adjustments.js';
import {
  userLearningPreferences,
  type UserLearningPreferences,
} from '../../db/schema/user-learning-preferences.js';
import type { FeedbackStats, TimingStats } from './feedback-learning.types.js';

// FeedbackEvent CRUD
export async function createFeedbackEvent(data: NewFeedbackEvent): Promise<FeedbackEvent> {
  const [event] = await db.insert(feedbackEvents).values(data).returning();

  if (event === undefined) {
    throw new Error('Failed to create feedback event');
  }

  return event;
}

export async function getFeedbackEventsByUser(
  userId: string,
  since?: Date
): Promise<FeedbackEvent[]> {
  const conditions = [eq(feedbackEvents.userId, userId)];

  if (since) {
    conditions.push(gte(feedbackEvents.createdAt, since));
  }

  return db
    .select()
    .from(feedbackEvents)
    .where(and(...conditions))
    .orderBy(desc(feedbackEvents.createdAt));
}

export async function getFeedbackCountByType(
  userId: string,
  feedbackType: FeedbackType,
  since?: Date
): Promise<number> {
  const conditions = [
    eq(feedbackEvents.userId, userId),
    eq(feedbackEvents.feedbackType, feedbackType),
  ];

  if (since) {
    conditions.push(gte(feedbackEvents.createdAt, since));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedbackEvents)
    .where(and(...conditions));

  return result?.count ?? 0;
}

export async function getFeedbackStats(userId: string, since: Date): Promise<FeedbackStats> {
  const events = await getFeedbackEventsByUser(userId, since);

  const stats: FeedbackStats = {
    positiveCount: 0,
    negativeCount: 0,
    acceptCount: 0,
    ignoreCount: 0,
    taskHelpfulCount: 0,
    taskNotHelpfulCount: 0,
    total: events.length,
  };

  for (const event of events) {
    switch (event.feedbackType) {
      case 'EXPLICIT_POSITIVE':
        stats.positiveCount++;
        break;
      case 'EXPLICIT_NEGATIVE':
        stats.negativeCount++;
        break;
      case 'IMPLICIT_ACCEPT':
        stats.acceptCount++;
        break;
      case 'IMPLICIT_IGNORE':
        stats.ignoreCount++;
        break;
      case 'TASK_HELPFUL':
        stats.taskHelpfulCount++;
        break;
      case 'TASK_NOT_HELPFUL':
        stats.taskNotHelpfulCount++;
        break;
    }
  }

  return stats;
}

export async function getTimingStats(userId: string, since: Date): Promise<TimingStats[]> {
  const events = await getFeedbackEventsByUser(userId, since);

  const hourlyStats = new Map<number, { accept: number; ignore: number }>();

  for (let hour = 0; hour < 24; hour++) {
    hourlyStats.set(hour, { accept: 0, ignore: 0 });
  }

  for (const event of events) {
    const hour = event.context?.timeOfDay ?? event.createdAt.getHours();
    const stats = hourlyStats.get(hour);

    if (stats) {
      if (event.feedbackType === 'IMPLICIT_ACCEPT' || event.feedbackType === 'EXPLICIT_POSITIVE') {
        stats.accept++;
      } else if (
        event.feedbackType === 'IMPLICIT_IGNORE' ||
        event.feedbackType === 'EXPLICIT_NEGATIVE'
      ) {
        stats.ignore++;
      }
    }
  }

  const result: TimingStats[] = [];

  for (const [hour, stats] of hourlyStats) {
    const total = stats.accept + stats.ignore;
    result.push({
      hour,
      acceptCount: stats.accept,
      ignoreCount: stats.ignore,
      acceptanceRate: total > 0 ? stats.accept / total : 0,
    });
  }

  return result;
}

// LearningAdjustment CRUD
export async function createLearningAdjustment(
  data: NewLearningAdjustment
): Promise<LearningAdjustment> {
  const [adjustment] = await db.insert(learningAdjustments).values(data).returning();

  if (adjustment === undefined) {
    throw new Error('Failed to create learning adjustment');
  }

  return adjustment;
}

export async function getAdjustmentsByUser(
  userId: string,
  limit = 20
): Promise<LearningAdjustment[]> {
  return db
    .select()
    .from(learningAdjustments)
    .where(eq(learningAdjustments.userId, userId))
    .orderBy(desc(learningAdjustments.appliedAt))
    .limit(limit);
}

export async function getActiveAdjustmentsByUser(userId: string): Promise<LearningAdjustment[]> {
  return db
    .select()
    .from(learningAdjustments)
    .where(and(eq(learningAdjustments.userId, userId), isNull(learningAdjustments.revertedAt)))
    .orderBy(desc(learningAdjustments.appliedAt));
}

export async function getAdjustmentById(id: string): Promise<LearningAdjustment | null> {
  const [adjustment] = await db
    .select()
    .from(learningAdjustments)
    .where(eq(learningAdjustments.id, id))
    .limit(1);

  return adjustment ?? null;
}

export async function revertAdjustment(adjustmentId: string): Promise<boolean> {
  const [result] = await db
    .update(learningAdjustments)
    .set({ revertedAt: new Date() })
    .where(and(eq(learningAdjustments.id, adjustmentId), isNull(learningAdjustments.revertedAt)))
    .returning({ id: learningAdjustments.id });

  return result !== undefined;
}

// UserLearningPreferences CRUD
export async function getOrCreatePreferences(userId: string): Promise<UserLearningPreferences> {
  const [existing] = await db
    .select()
    .from(userLearningPreferences)
    .where(eq(userLearningPreferences.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userLearningPreferences)
    .values({ userId })
    .returning();

  if (created === undefined) {
    throw new Error('Failed to create user learning preferences');
  }

  return created;
}

export async function updatePreferences(
  userId: string,
  data: Partial<Omit<UserLearningPreferences, 'userId' | 'updatedAt'>>
): Promise<UserLearningPreferences> {
  await getOrCreatePreferences(userId);

  const [updated] = await db
    .update(userLearningPreferences)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userLearningPreferences.userId, userId))
    .returning();

  if (updated === undefined) {
    throw new Error('Failed to update user learning preferences');
  }

  return updated;
}

export async function updateLastLearningRun(userId: string): Promise<void> {
  await db
    .update(userLearningPreferences)
    .set({ lastLearningRun: new Date(), updatedAt: new Date() })
    .where(eq(userLearningPreferences.userId, userId));
}
