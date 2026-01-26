import { eq, desc, sql, isNull, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { conversations, type Conversation, type NewConversation } from '../../db/schema/conversations.js';
import { messages } from '../../db/schema/messages.js';

export async function createConversation(data: NewConversation): Promise<Conversation> {
  const [conversation] = await db.insert(conversations).values(data).returning();

  if (conversation === undefined) {
    throw new Error('Failed to create conversation');
  }

  return conversation;
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);

  return conversation ?? null;
}

export async function getConversationsByUserId(
  userId: string,
  options: { limit?: number; offset?: number; activeOnly?: boolean } = {}
): Promise<{ conversations: Conversation[]; total: number }> {
  const { limit = 20, offset = 0, activeOnly = false } = options;

  const whereCondition = activeOnly
    ? and(eq(conversations.userId, userId), isNull(conversations.endedAt))
    : eq(conversations.userId, userId);

  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(whereCondition)
      .orderBy(desc(conversations.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(whereCondition),
  ]);

  return {
    conversations: result,
    total: countResult[0]?.count ?? 0,
  };
}

export async function updateConversation(
  id: string,
  data: Partial<Pick<Conversation, 'contextSummary' | 'endedAt'>>
): Promise<Conversation | null> {
  const [conversation] = await db
    .update(conversations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();

  return conversation ?? null;
}

export async function endConversation(id: string): Promise<Conversation | null> {
  return updateConversation(id, { endedAt: new Date() });
}

export async function deleteConversation(id: string): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });

  return result.length > 0;
}

export async function getConversationWithMessageCount(
  id: string
): Promise<(Conversation & { messageCount: number }) | null> {
  const [result] = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      contextSummary: conversations.contextSummary,
      startedAt: conversations.startedAt,
      endedAt: conversations.endedAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: sql<number>`count(${messages.id})::int`,
    })
    .from(conversations)
    .leftJoin(messages, eq(conversations.id, messages.conversationId))
    .where(eq(conversations.id, id))
    .groupBy(conversations.id)
    .limit(1);

  return result ?? null;
}
