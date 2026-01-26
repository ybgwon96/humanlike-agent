import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { messages, type Message, type NewMessage } from '../../db/schema/messages.js';
import { env } from '../../config/env.js';

export async function createMessage(data: NewMessage): Promise<Message> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.MESSAGE_EXPIRY_DAYS);

  const [message] = await db
    .insert(messages)
    .values({
      ...data,
      expiresAt,
    })
    .returning();

  if (message === undefined) {
    throw new Error('Failed to create message');
  }

  return message;
}

export async function getMessageById(id: string): Promise<Message | null> {
  const [message] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);

  return message ?? null;
}

export async function getMessagesByConversationId(
  conversationId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ messages: Message[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId)),
  ]);

  return {
    messages: result,
    total: countResult[0]?.count ?? 0,
  };
}

export async function updateMessage(
  id: string,
  data: Partial<Pick<Message, 'maskedContent' | 'sentiment' | 'contentSearch' | 'voiceMetadata'>>
): Promise<Message | null> {
  const [message] = await db.update(messages).set(data).where(eq(messages.id, id)).returning();

  return message ?? null;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const result = await db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });

  return result.length > 0;
}

export async function deleteExpiredMessages(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(messages)
    .where(and(sql`${messages.expiresAt} IS NOT NULL`, sql`${messages.expiresAt} < ${now}`))
    .returning({ id: messages.id });

  return result.length;
}
