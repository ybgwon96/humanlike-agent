import * as proactiveRepository from './proactive.repository.js';
import type { FeedbackInput, FrequencyPreference } from './proactive.types.js';
import { DEFAULT_THRESHOLDS } from './proactive.types.js';

const ADJUSTMENT_THRESHOLDS = {
  LOW_ACCEPTANCE_RATE: 0.3,
  HIGH_ACCEPTANCE_RATE: 0.7,
  HIGH_HELPFULNESS_RATE: 0.6,
  ANALYSIS_PERIOD_DAYS: 14,
  MIN_SAMPLES_FOR_ADJUSTMENT: 10,
} as const;

export async function processFeedback(
  userId: string,
  feedback: FeedbackInput
): Promise<void> {
  const engagement = await proactiveRepository.getEngagementById(feedback.engagementId);
  if (!engagement) {
    throw new Error('Engagement not found');
  }

  if (engagement.userId !== userId) {
    throw new Error('Engagement does not belong to user');
  }

  await proactiveRepository.updateEngagementResponse(
    feedback.engagementId,
    feedback.response,
    feedback.wasHelpful ?? null,
    feedback.feedbackText ?? null,
    feedback.responseTimeMs ?? null
  );

  const pattern = await proactiveRepository.getOrCreateEngagementPattern(userId);

  const isAccepted = feedback.response === 'ACCEPTED';
  const isHelpful = feedback.wasHelpful === true;
  const isIgnored = feedback.response === 'IGNORED';

  await proactiveRepository.incrementEngagementStats(userId, isAccepted, isHelpful);

  if (isIgnored) {
    const newIgnoreCount = await proactiveRepository.incrementConsecutiveIgnores(userId);

    if (newIgnoreCount >= DEFAULT_THRESHOLDS.MAX_CONSECUTIVE_IGNORES) {
      const pauseUntil = new Date();
      pauseUntil.setHours(
        pauseUntil.getHours() + DEFAULT_THRESHOLDS.CONSECUTIVE_IGNORE_PAUSE_HOURS
      );

      await proactiveRepository.updateEngagementPattern(userId, {
        pausedUntil: pauseUntil,
      });
    }
  } else {
    await proactiveRepository.resetConsecutiveIgnores(userId);
  }

  await proactiveRepository.updateRates(userId);

  if (pattern.totalEngagements > 0 && pattern.totalEngagements % 10 === 0) {
    await adjustThresholds(userId);
  }
}

export async function adjustThresholds(userId: string): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - ADJUSTMENT_THRESHOLDS.ANALYSIS_PERIOD_DAYS);

  const stats = await proactiveRepository.getEngagementStats(userId, since);

  if (stats.totalEngagements < ADJUSTMENT_THRESHOLDS.MIN_SAMPLES_FOR_ADJUSTMENT) {
    return;
  }

  const acceptanceRate = stats.acceptedCount / stats.totalEngagements;
  const helpfulnessRate =
    stats.acceptedCount > 0 ? stats.helpfulCount / stats.acceptedCount : 0;

  const pattern = await proactiveRepository.getOrCreateEngagementPattern(userId);

  let newFrequency: FrequencyPreference | undefined;
  let newDailyLimit: number | undefined;

  if (acceptanceRate < ADJUSTMENT_THRESHOLDS.LOW_ACCEPTANCE_RATE) {
    if (pattern.frequencyPreference !== 'MINIMAL') {
      newFrequency = 'MINIMAL';
      newDailyLimit = Math.max(3, Math.floor(pattern.dailyLimit * 0.7));
    }
  } else if (
    acceptanceRate > ADJUSTMENT_THRESHOLDS.HIGH_ACCEPTANCE_RATE &&
    helpfulnessRate > ADJUSTMENT_THRESHOLDS.HIGH_HELPFULNESS_RATE
  ) {
    if (pattern.frequencyPreference !== 'PROACTIVE') {
      newFrequency = 'PROACTIVE';
      newDailyLimit = Math.min(20, Math.ceil(pattern.dailyLimit * 1.3));
    }
  }

  if (newFrequency || newDailyLimit) {
    await proactiveRepository.updateEngagementPattern(userId, {
      ...(newFrequency && { frequencyPreference: newFrequency }),
      ...(newDailyLimit && { dailyLimit: newDailyLimit }),
    });
  }
}

export interface EngagementInsights {
  totalEngagements: number;
  acceptanceRate: number;
  helpfulnessRate: number;
  mostEffectiveTrigger: string | null;
  leastEffectiveTrigger: string | null;
  recommendedAction: string | null;
}

export async function getEngagementInsights(userId: string): Promise<EngagementInsights> {
  const since = new Date();
  since.setDate(since.getDate() - ADJUSTMENT_THRESHOLDS.ANALYSIS_PERIOD_DAYS);

  const stats = await proactiveRepository.getEngagementStats(userId, since);

  if (stats.totalEngagements === 0) {
    return {
      totalEngagements: 0,
      acceptanceRate: 0,
      helpfulnessRate: 0,
      mostEffectiveTrigger: null,
      leastEffectiveTrigger: null,
      recommendedAction: null,
    };
  }

  const acceptanceRate = stats.acceptedCount / stats.totalEngagements;
  const helpfulnessRate =
    stats.acceptedCount > 0 ? stats.helpfulCount / stats.acceptedCount : 0;

  const triggerCounts = Object.entries(stats.byTriggerReason).filter(([, count]) => count > 0);
  const mostEffectiveTrigger =
    triggerCounts.length > 0
      ? triggerCounts.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
      : null;
  const leastEffectiveTrigger =
    triggerCounts.length > 0
      ? triggerCounts.reduce((a, b) => (a[1] < b[1] ? a : b))[0]
      : null;

  let recommendedAction: string | null = null;
  if (acceptanceRate < ADJUSTMENT_THRESHOLDS.LOW_ACCEPTANCE_RATE) {
    recommendedAction = '알림 빈도를 줄이는 것을 권장합니다.';
  } else if (
    acceptanceRate > ADJUSTMENT_THRESHOLDS.HIGH_ACCEPTANCE_RATE &&
    helpfulnessRate > ADJUSTMENT_THRESHOLDS.HIGH_HELPFULNESS_RATE
  ) {
    recommendedAction = '더 자주 도움을 드릴 수 있습니다.';
  }

  return {
    totalEngagements: stats.totalEngagements,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    helpfulnessRate: Math.round(helpfulnessRate * 100) / 100,
    mostEffectiveTrigger,
    leastEffectiveTrigger,
    recommendedAction,
  };
}
