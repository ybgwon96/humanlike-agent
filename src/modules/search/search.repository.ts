import { sql, eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { messages, type Message } from '../../db/schema/messages.js';
import { conversations } from '../../db/schema/conversations.js';

export interface SearchFilters {
  userId?: string;
  conversationId?: string;
  sender?: 'USER' | 'AGENT';
  sentimentMin?: number;
  sentimentMax?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  message: Message;
  rank: number;
  headline: string;
}

export async function searchMessages(
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<{ results: SearchResultItem[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const tsVector = sql`to_tsvector('english', ${messages.content})`;

  const conditions: ReturnType<typeof sql>[] = [sql`${tsVector} @@ ${tsQuery}`];

  if (filters.conversationId !== undefined) {
    conditions.push(sql`${messages.conversationId} = ${filters.conversationId}`);
  }

  if (filters.sender !== undefined) {
    conditions.push(sql`${messages.sender} = ${filters.sender}`);
  }

  if (filters.sentimentMin !== undefined) {
    conditions.push(sql`${messages.sentiment} >= ${filters.sentimentMin}`);
  }

  if (filters.sentimentMax !== undefined) {
    conditions.push(sql`${messages.sentiment} <= ${filters.sentimentMax}`);
  }

  if (filters.startDate !== undefined) {
    conditions.push(sql`${messages.createdAt} >= ${filters.startDate}`);
  }

  if (filters.endDate !== undefined) {
    conditions.push(sql`${messages.createdAt} <= ${filters.endDate}`);
  }

  const hasUserFilter = filters.userId !== undefined;

  if (hasUserFilter) {
    conditions.push(sql`${conversations.userId} = ${filters.userId}`);

    const whereClause = sql.join(conditions, sql` AND `);

    const [results, countResult] = await Promise.all([
      db
        .select({
          message: messages,
          rank: sql<number>`ts_rank(${tsVector}, ${tsQuery})`,
          headline: sql<string>`ts_headline('english', ${messages.content}, ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25')`,
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(whereClause)
        .orderBy(sql`ts_rank(${tsVector}, ${tsQuery}) DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(whereClause),
    ]);

    return {
      results: results.map((r) => ({
        message: r.message,
        rank: r.rank,
        headline: r.headline,
      })),
      total: countResult[0]?.count ?? 0,
    };
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const [results, countResult] = await Promise.all([
    db
      .select({
        message: messages,
        rank: sql<number>`ts_rank(${tsVector}, ${tsQuery})`,
        headline: sql<string>`ts_headline('english', ${messages.content}, ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25')`,
      })
      .from(messages)
      .where(whereClause)
      .orderBy(sql`ts_rank(${tsVector}, ${tsQuery}) DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(whereClause),
  ]);

  return {
    results: results.map((r) => ({
      message: r.message,
      rank: r.rank,
      headline: r.headline,
    })),
    total: countResult[0]?.count ?? 0,
  };
}

export async function searchByPhraseMatch(
  phrase: string,
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<{ results: SearchResultItem[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const tsQuery = sql`phraseto_tsquery('english', ${phrase})`;
  const tsVector = sql`to_tsvector('english', ${messages.content})`;

  const conditions: ReturnType<typeof sql>[] = [sql`${tsVector} @@ ${tsQuery}`];

  if (filters.conversationId !== undefined) {
    conditions.push(sql`${messages.conversationId} = ${filters.conversationId}`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const [results, countResult] = await Promise.all([
    db
      .select({
        message: messages,
        rank: sql<number>`ts_rank(${tsVector}, ${tsQuery})`,
        headline: sql<string>`ts_headline('english', ${messages.content}, ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25')`,
      })
      .from(messages)
      .where(whereClause)
      .orderBy(sql`ts_rank(${tsVector}, ${tsQuery}) DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(whereClause),
  ]);

  return {
    results: results.map((r) => ({
      message: r.message,
      rank: r.rank,
      headline: r.headline,
    })),
    total: countResult[0]?.count ?? 0,
  };
}
