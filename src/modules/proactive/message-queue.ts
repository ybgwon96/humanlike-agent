import * as proactiveRepository from './proactive.repository.js';
import type { TriggerReason, EngagementDecision, MessagePriority } from './proactive.types.js';
import type { DeferredMessage } from '../../db/schema/proactive-engagements.js';

const DEFAULT_EXPIRY_HOURS = 4;

export interface DeferredMessageInput {
  userId: string;
  engagementId?: string;
  messageContent: string;
  triggerReason: TriggerReason;
  priority: MessagePriority;
  deferReason: string;
  scheduledFor: Date;
  expiresAt?: Date;
}

export async function queueDeferredMessage(input: DeferredMessageInput): Promise<DeferredMessage> {
  const expiresAt =
    input.expiresAt ??
    new Date(input.scheduledFor.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

  return proactiveRepository.createDeferredMessage({
    userId: input.userId,
    engagementId: input.engagementId ?? null,
    messageContent: input.messageContent,
    triggerReason: input.triggerReason,
    priority: input.priority,
    deferReason: input.deferReason,
    scheduledFor: input.scheduledFor,
    expiresAt,
  });
}

export async function queueFromDecision(
  userId: string,
  decision: EngagementDecision,
  deferReason: string
): Promise<DeferredMessage | null> {
  if (decision.action !== 'DEFER' || !decision.deferUntil || !decision.suggestedMessage) {
    return null;
  }

  return queueDeferredMessage({
    userId,
    messageContent: decision.suggestedMessage,
    triggerReason: decision.reason ?? 'MANUAL',
    priority: decision.priority,
    deferReason,
    scheduledFor: decision.deferUntil,
  });
}

export async function getPendingMessages(userId: string): Promise<DeferredMessage[]> {
  return proactiveRepository.getPendingDeferredMessages(userId);
}

export async function markMessageDelivered(messageId: string): Promise<void> {
  await proactiveRepository.markDeferredMessageDelivered(messageId);
}

export async function cleanupExpiredMessages(): Promise<number> {
  return proactiveRepository.deleteExpiredDeferredMessages();
}

export interface ProcessedDeferredMessage {
  message: DeferredMessage;
  delivered: boolean;
  error?: string;
}

export async function processPendingMessages(
  userId: string,
  deliverFn: (message: DeferredMessage) => Promise<void>
): Promise<ProcessedDeferredMessage[]> {
  const pending = await getPendingMessages(userId);
  const results: ProcessedDeferredMessage[] = [];

  for (const message of pending) {
    try {
      await deliverFn(message);
      await markMessageDelivered(message.id);
      results.push({ message, delivered: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ message, delivered: false, error: errorMessage });
    }
  }

  return results;
}
