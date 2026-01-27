import { AppError } from '../../middleware/error-handler.js';
import * as proactiveRepository from './proactive.repository.js';
import * as activityService from '../activity/activity.service.js';
import * as emotionService from '../emotion/emotion.service.js';
import * as notificationService from '../notification/notification.service.js';
import { evaluateEngagement } from './decision-engine.js';
import { processFeedback as processUserFeedback, getEngagementInsights } from './learning-system.js';
import { queueFromDecision, processPendingMessages } from './message-queue.js';
import type {
  UserState,
  UserEngagementSettings,
  FeedbackInput,
  TriggerReason,
} from './proactive.types.js';
import type { EngagementDecisionResponse, EngagementPatternResponse, UpdatePreferencesInput } from './proactive.schemas.js';
import type { FrequencyPreference } from '../../db/schema/proactive-engagements.js';

async function buildUserState(userId: string): Promise<UserState> {
  const activity = await activityService.getCurrentActivity(userId);
  const emotionalProfile = await emotionService.getUserEmotionalProfile(userId, 1);

  let activityDurationMinutes = 0;
  if (activity?.recordedAt) {
    const now = new Date();
    activityDurationMinutes = (now.getTime() - activity.recordedAt.getTime()) / (1000 * 60);
  }

  const dominantEmotion = emotionalProfile.dominantEmotions[0] ?? null;

  return {
    userId,
    activityType: activity?.activityType ?? null,
    focusScore: activity?.focusScore ?? 0,
    interruptionCost: activity?.interruptionCost ?? null,
    activityDurationMinutes,
    emotionType: dominantEmotion,
    emotionIntensity: emotionalProfile.averageIntensity,
    lastActivityChangeAt: activity?.recordedAt ?? null,
  };
}

async function buildUserSettings(userId: string): Promise<UserEngagementSettings> {
  const pattern = await proactiveRepository.getOrCreateEngagementPattern(userId);
  const todayCount = await proactiveRepository.getTodayEngagementCount(userId);

  return {
    userId,
    frequencyPreference: pattern.frequencyPreference,
    dailyLimit: pattern.dailyLimit,
    consecutiveIgnores: pattern.consecutiveIgnores,
    pausedUntil: pattern.pausedUntil,
    preferredHours: (pattern.preferredHours as number[]) ?? [],
    triggerPreferences: (pattern.triggerPreferences as Partial<Record<TriggerReason, boolean>>) ?? {},
    todayEngagementCount: todayCount,
  };
}

export async function evaluateAndEngage(userId: string): Promise<EngagementDecisionResponse> {
  const [state, settings] = await Promise.all([
    buildUserState(userId),
    buildUserSettings(userId),
  ]);

  const decision = evaluateEngagement(state, settings);

  let engagementId: string | undefined;

  if (decision.action === 'ENGAGE' && decision.reason && decision.suggestedMessage) {
    const engagement = await proactiveRepository.createEngagement({
      userId,
      triggerReason: decision.reason,
      triggerContext: decision.context,
      messageContent: decision.suggestedMessage,
      messagePriority: decision.priority,
    });

    engagementId = engagement.id;

    await proactiveRepository.markEngagementDelivered(engagement.id);

    await notificationService.createNotification({
      userId,
      type: 'proactive',
      priority: decision.priority,
      title: getNotificationTitle(decision.reason),
      content: decision.suggestedMessage,
    });
  } else if (decision.action === 'DEFER' && decision.deferUntil && decision.suggestedMessage) {
    await queueFromDecision(userId, decision, 'High focus score or outside preferred hours');
  }

  return {
    shouldEngage: decision.shouldEngage,
    reason: decision.reason,
    action: decision.action,
    deferUntil: decision.deferUntil?.toISOString(),
    priority: decision.priority,
    suggestedMessage: decision.suggestedMessage,
    context: decision.context,
    engagementId,
  };
}

function getNotificationTitle(reason: TriggerReason): string {
  switch (reason) {
    case 'STUCK_TIMEOUT':
      return '도움이 필요하신가요?';
    case 'HIGH_FRUSTRATION':
      return '괜찮으세요?';
    case 'POST_FOCUS_IDLE':
      return '휴식 시간!';
    case 'SCHEDULED':
      return '예정된 알림';
    case 'MANUAL':
      return '알림';
    default:
      return '안녕하세요';
  }
}

export async function submitFeedback(userId: string, feedback: FeedbackInput): Promise<void> {
  const engagement = await proactiveRepository.getEngagementById(feedback.engagementId);

  if (!engagement) {
    throw new AppError('ENGAGEMENT_NOT_FOUND', 'Engagement not found', 404);
  }

  if (engagement.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Access denied', 403);
  }

  await processUserFeedback(userId, feedback);
}

export async function getEngagementPattern(userId: string): Promise<EngagementPatternResponse> {
  const pattern = await proactiveRepository.getOrCreateEngagementPattern(userId);

  return {
    userId: pattern.userId,
    frequencyPreference: pattern.frequencyPreference,
    dailyLimit: pattern.dailyLimit,
    consecutiveIgnores: pattern.consecutiveIgnores,
    pausedUntil: pattern.pausedUntil?.toISOString() ?? null,
    preferredHours: (pattern.preferredHours as number[]) ?? [],
    triggerPreferences: (pattern.triggerPreferences as Record<string, boolean>) ?? {},
    stats: {
      totalEngagements: pattern.totalEngagements,
      totalAccepted: pattern.totalAccepted,
      totalHelpful: pattern.totalHelpful,
      acceptanceRate: pattern.acceptanceRate ?? 0,
      helpfulnessRate: pattern.helpfulnessRate ?? 0,
    },
    lastEngagementAt: pattern.lastEngagementAt?.toISOString() ?? null,
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
  };
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<EngagementPatternResponse> {
  await proactiveRepository.getOrCreateEngagementPattern(userId);

  const updateData: {
    frequencyPreference?: FrequencyPreference;
    dailyLimit?: number;
    preferredHours?: number[];
    triggerPreferences?: Record<string, boolean>;
  } = {};

  if (input.frequencyPreference) {
    updateData.frequencyPreference = input.frequencyPreference;
  }

  if (input.dailyLimit !== undefined) {
    updateData.dailyLimit = input.dailyLimit;
  }

  if (input.preferredHours) {
    updateData.preferredHours = input.preferredHours;
  }

  if (input.triggerPreferences) {
    updateData.triggerPreferences = input.triggerPreferences;
  }

  await proactiveRepository.updateEngagementPattern(userId, updateData);

  return getEngagementPattern(userId);
}

export async function pauseEngagement(userId: string, durationHours: number): Promise<void> {
  const pausedUntil = new Date();
  pausedUntil.setHours(pausedUntil.getHours() + durationHours);

  await proactiveRepository.getOrCreateEngagementPattern(userId);
  await proactiveRepository.updateEngagementPattern(userId, { pausedUntil });
}

export async function resumeEngagement(userId: string): Promise<void> {
  await proactiveRepository.getOrCreateEngagementPattern(userId);
  await proactiveRepository.updateEngagementPattern(userId, {
    pausedUntil: null,
    consecutiveIgnores: 0,
  });
}

export async function getInsights(userId: string) {
  return getEngagementInsights(userId);
}

export async function processDeferredMessages(userId: string): Promise<number> {
  const results = await processPendingMessages(userId, async (message) => {
    await notificationService.createNotification({
      userId,
      type: 'proactive',
      priority: message.priority as 'low' | 'normal' | 'high',
      title: getNotificationTitle(message.triggerReason),
      content: message.messageContent,
    });
  });

  return results.filter((r) => r.delivered).length;
}
