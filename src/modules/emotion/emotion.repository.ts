import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { emotionAnalyses, type NewEmotionAnalysis, type EmotionAnalysis } from '../../db/schema/index.js';
import type { EmotionType } from './emotion.types.js';

export async function createEmotionAnalysis(
  data: NewEmotionAnalysis
): Promise<EmotionAnalysis> {
  const [analysis] = await db.insert(emotionAnalyses).values(data).returning();
  if (!analysis) {
    throw new Error('Failed to create emotion analysis');
  }
  return analysis;
}

export async function getEmotionAnalysisByMessageId(
  messageId: string
): Promise<EmotionAnalysis | null> {
  const [analysis] = await db
    .select()
    .from(emotionAnalyses)
    .where(eq(emotionAnalyses.messageId, messageId))
    .limit(1);

  return analysis ?? null;
}

export async function getEmotionAnalysesForUser(
  userId: string,
  options: { since?: Date; limit?: number } = {}
): Promise<EmotionAnalysis[]> {
  const { since, limit = 1000 } = options;

  const query = db
    .select({
      id: emotionAnalyses.id,
      messageId: emotionAnalyses.messageId,
      emotionType: emotionAnalyses.emotionType,
      intensity: emotionAnalyses.intensity,
      confidence: emotionAnalyses.confidence,
      rawScore: emotionAnalyses.rawScore,
      analysisMethod: emotionAnalyses.analysisMethod,
      metadata: emotionAnalyses.metadata,
      createdAt: emotionAnalyses.createdAt,
    })
    .from(emotionAnalyses)
    .innerJoin(
      sql`messages`,
      sql`messages.id = ${emotionAnalyses.messageId}`
    )
    .innerJoin(
      sql`conversations`,
      sql`conversations.id = messages.conversation_id`
    )
    .where(
      since
        ? and(
            sql`conversations.user_id = ${userId}`,
            gte(emotionAnalyses.createdAt, since)
          )
        : sql`conversations.user_id = ${userId}`
    )
    .orderBy(desc(emotionAnalyses.createdAt))
    .limit(limit);

  return query;
}

export async function getEmotionDistribution(
  userId: string,
  since?: Date
): Promise<{ emotionType: EmotionType; count: number }[]> {
  const result = await db
    .select({
      emotionType: emotionAnalyses.emotionType,
      count: sql<number>`count(*)::int`,
    })
    .from(emotionAnalyses)
    .innerJoin(
      sql`messages`,
      sql`messages.id = ${emotionAnalyses.messageId}`
    )
    .innerJoin(
      sql`conversations`,
      sql`conversations.id = messages.conversation_id`
    )
    .where(
      since
        ? and(
            sql`conversations.user_id = ${userId}`,
            gte(emotionAnalyses.createdAt, since)
          )
        : sql`conversations.user_id = ${userId}`
    )
    .groupBy(emotionAnalyses.emotionType);

  return result as { emotionType: EmotionType; count: number }[];
}

export async function getAverageIntensity(
  userId: string,
  since?: Date
): Promise<number> {
  const [result] = await db
    .select({
      avgIntensity: sql<number>`coalesce(avg(${emotionAnalyses.intensity}), 5)::float`,
    })
    .from(emotionAnalyses)
    .innerJoin(
      sql`messages`,
      sql`messages.id = ${emotionAnalyses.messageId}`
    )
    .innerJoin(
      sql`conversations`,
      sql`conversations.id = messages.conversation_id`
    )
    .where(
      since
        ? and(
            sql`conversations.user_id = ${userId}`,
            gte(emotionAnalyses.createdAt, since)
          )
        : sql`conversations.user_id = ${userId}`
    );

  return result?.avgIntensity ?? 5;
}

export async function getRecentAverageRawScore(
  userId: string,
  since: Date
): Promise<number> {
  const [result] = await db
    .select({
      avgScore: sql<number>`coalesce(avg(${emotionAnalyses.rawScore}), 0)::float`,
    })
    .from(emotionAnalyses)
    .innerJoin(
      sql`messages`,
      sql`messages.id = ${emotionAnalyses.messageId}`
    )
    .innerJoin(
      sql`conversations`,
      sql`conversations.id = messages.conversation_id`
    )
    .where(
      and(
        sql`conversations.user_id = ${userId}`,
        gte(emotionAnalyses.createdAt, since)
      )
    );

  return result?.avgScore ?? 0;
}

export async function getTotalAnalyzedCount(
  userId: string,
  since?: Date
): Promise<number> {
  const [result] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(emotionAnalyses)
    .innerJoin(
      sql`messages`,
      sql`messages.id = ${emotionAnalyses.messageId}`
    )
    .innerJoin(
      sql`conversations`,
      sql`conversations.id = messages.conversation_id`
    )
    .where(
      since
        ? and(
            sql`conversations.user_id = ${userId}`,
            gte(emotionAnalyses.createdAt, since)
          )
        : sql`conversations.user_id = ${userId}`
    );

  return result?.count ?? 0;
}
