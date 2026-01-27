import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  activityContexts,
  type ActivityContext,
  type NewActivityContext,
  type ActivityType,
} from '../../db/schema/activity-context.js';

export async function createActivity(data: NewActivityContext): Promise<ActivityContext> {
  const [activity] = await db.insert(activityContexts).values(data).returning();

  if (activity === undefined) {
    throw new Error('Failed to create activity');
  }

  return activity;
}

export async function getLatestActivity(userId: string): Promise<ActivityContext | null> {
  const [activity] = await db
    .select()
    .from(activityContexts)
    .where(eq(activityContexts.userId, userId))
    .orderBy(desc(activityContexts.recordedAt))
    .limit(1);

  return activity ?? null;
}

interface GetActivitiesOptions {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  activityType?: ActivityType;
  limit: number;
  offset: number;
}

export async function getActivities(options: GetActivitiesOptions): Promise<ActivityContext[]> {
  const { userId, startDate, endDate, activityType, limit, offset } = options;

  const conditions = [eq(activityContexts.userId, userId)];

  if (startDate) {
    conditions.push(gte(activityContexts.recordedAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityContexts.recordedAt, endDate));
  }

  if (activityType) {
    conditions.push(eq(activityContexts.activityType, activityType));
  }

  return db
    .select()
    .from(activityContexts)
    .where(and(...conditions))
    .orderBy(desc(activityContexts.recordedAt))
    .limit(limit)
    .offset(offset);
}

interface ActivityPattern {
  activityType: ActivityType;
  avgFocusScore: number;
  count: number;
  totalMinutes: number;
}

export async function getActivityPatterns(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ActivityPattern[]> {
  const result = await db
    .select({
      activityType: activityContexts.activityType,
      avgFocusScore: sql<number>`avg(${activityContexts.focusScore})`.as('avg_focus_score'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(activityContexts)
    .where(
      and(
        eq(activityContexts.userId, userId),
        gte(activityContexts.recordedAt, startDate),
        lte(activityContexts.recordedAt, endDate)
      )
    )
    .groupBy(activityContexts.activityType);

  return result.map((r) => ({
    activityType: r.activityType,
    avgFocusScore: Math.round(Number(r.avgFocusScore)),
    count: Number(r.count),
    totalMinutes: Number(r.count) * 0.5, // 30초 샘플링 기준
  }));
}

export async function deleteOldActivities(userId: string, olderThan: Date): Promise<number> {
  const result = await db
    .delete(activityContexts)
    .where(and(eq(activityContexts.userId, userId), lte(activityContexts.recordedAt, olderThan)))
    .returning({ id: activityContexts.id });

  return result.length;
}

export async function getPreviousActivity(userId: string): Promise<ActivityContext | null> {
  const activities = await db
    .select()
    .from(activityContexts)
    .where(eq(activityContexts.userId, userId))
    .orderBy(desc(activityContexts.recordedAt))
    .limit(2);

  return activities[1] ?? null;
}

export async function getRecentActivities(
  userId: string,
  minutes: number
): Promise<ActivityContext[]> {
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);

  return db
    .select()
    .from(activityContexts)
    .where(and(eq(activityContexts.userId, userId), gte(activityContexts.recordedAt, since)))
    .orderBy(desc(activityContexts.recordedAt));
}
