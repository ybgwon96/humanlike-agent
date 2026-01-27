import * as repository from './feedback-learning.repository.js';
import {
  LEARNING_THRESHOLDS,
  type AdjustmentResult,
  type FeedbackStats,
  type LearningResult,
  type ConversationFrequencyTier,
  type TimingStats,
} from './feedback-learning.types.js';

export async function runLearningBatch(userId: string): Promise<LearningResult> {
  const since = new Date();
  since.setDate(since.getDate() - LEARNING_THRESHOLDS.ANALYSIS_PERIOD_DAYS);

  const feedbackStats = await repository.getFeedbackStats(userId, since);
  const timingStats = await repository.getTimingStats(userId, since);
  const preferences = await repository.getOrCreatePreferences(userId);

  const adjustments: LearningResult['adjustments'] = [];

  const humorAdjustment = calculateHumorAdjustment(feedbackStats, preferences.humorFrequencyModifier);
  if (humorAdjustment) {
    const saved = await repository.createLearningAdjustment({
      userId,
      adjustmentType: humorAdjustment.adjustmentType,
      oldValue: humorAdjustment.oldValue,
      newValue: humorAdjustment.newValue,
      reason: humorAdjustment.reason,
    });

    await repository.updatePreferences(userId, {
      humorFrequencyModifier: humorAdjustment.newValue as number,
    });

    adjustments.push({
      id: saved.id,
      adjustmentType: saved.adjustmentType,
      oldValue: saved.oldValue,
      newValue: saved.newValue,
      reason: saved.reason,
      appliedAt: saved.appliedAt,
      reverted: false,
    });
  }

  const frequencyAdjustment = calculateFrequencyAdjustment(
    feedbackStats,
    preferences.conversationFrequencyTier
  );
  if (frequencyAdjustment) {
    const saved = await repository.createLearningAdjustment({
      userId,
      adjustmentType: frequencyAdjustment.adjustmentType,
      oldValue: frequencyAdjustment.oldValue,
      newValue: frequencyAdjustment.newValue,
      reason: frequencyAdjustment.reason,
    });

    await repository.updatePreferences(userId, {
      conversationFrequencyTier: frequencyAdjustment.newValue as ConversationFrequencyTier,
    });

    adjustments.push({
      id: saved.id,
      adjustmentType: saved.adjustmentType,
      oldValue: saved.oldValue,
      newValue: saved.newValue,
      reason: saved.reason,
      appliedAt: saved.appliedAt,
      reverted: false,
    });
  }

  const timingAdjustment = calculateTimingPreference(
    timingStats,
    preferences.optimalConversationHours ?? []
  );
  if (timingAdjustment) {
    const saved = await repository.createLearningAdjustment({
      userId,
      adjustmentType: timingAdjustment.adjustmentType,
      oldValue: timingAdjustment.oldValue,
      newValue: timingAdjustment.newValue,
      reason: timingAdjustment.reason,
    });

    await repository.updatePreferences(userId, {
      optimalConversationHours: timingAdjustment.newValue as number[],
    });

    adjustments.push({
      id: saved.id,
      adjustmentType: saved.adjustmentType,
      oldValue: saved.oldValue,
      newValue: saved.newValue,
      reason: saved.reason,
      appliedAt: saved.appliedAt,
      reverted: false,
    });
  }

  await repository.updateLastLearningRun(userId);

  return {
    userId,
    adjustments,
    totalFeedbackAnalyzed: feedbackStats.total,
  };
}

export function calculateHumorAdjustment(
  stats: FeedbackStats,
  currentModifier: number
): AdjustmentResult | null {
  if (stats.negativeCount >= LEARNING_THRESHOLDS.HUMOR_REDUCE) {
    const newModifier = Math.max(
      LEARNING_THRESHOLDS.MIN_HUMOR_MODIFIER,
      currentModifier * LEARNING_THRESHOLDS.HUMOR_REDUCE_FACTOR
    );

    if (newModifier !== currentModifier) {
      return {
        adjustmentType: 'HUMOR_FREQUENCY',
        oldValue: currentModifier,
        newValue: newModifier,
        reason: `부정적 유머 피드백 ${stats.negativeCount}개 감지 - 유머 빈도 50% 감소`,
      };
    }
  }

  if (
    stats.positiveCount >= LEARNING_THRESHOLDS.HUMOR_INCREASE &&
    stats.negativeCount === 0
  ) {
    const newModifier = Math.min(
      LEARNING_THRESHOLDS.MAX_HUMOR_MODIFIER,
      currentModifier * LEARNING_THRESHOLDS.HUMOR_INCREASE_FACTOR
    );

    if (newModifier !== currentModifier) {
      return {
        adjustmentType: 'HUMOR_FREQUENCY',
        oldValue: currentModifier,
        newValue: newModifier,
        reason: `긍정적 유머 피드백 ${stats.positiveCount}개 감지 - 유머 빈도 20% 증가`,
      };
    }
  }

  return null;
}

export function calculateFrequencyAdjustment(
  stats: FeedbackStats,
  currentTier: ConversationFrequencyTier
): AdjustmentResult | null {
  const totalInteractions = stats.acceptCount + stats.ignoreCount;

  if (totalInteractions === 0) {
    return null;
  }

  if (stats.ignoreCount >= LEARNING_THRESHOLDS.CONSECUTIVE_IGNORES) {
    const newTier = decreaseTier(currentTier);

    if (newTier !== currentTier) {
      return {
        adjustmentType: 'CONVERSATION_FREQUENCY',
        oldValue: currentTier,
        newValue: newTier,
        reason: `연속 무시 ${stats.ignoreCount}회 감지 - 대화 빈도 한 단계 감소`,
      };
    }
  }

  const acceptanceRate = stats.acceptCount / totalInteractions;

  if (acceptanceRate >= LEARNING_THRESHOLDS.ACCEPTANCE_RATE) {
    const newTier = increaseTier(currentTier);

    if (newTier !== currentTier) {
      return {
        adjustmentType: 'CONVERSATION_FREQUENCY',
        oldValue: currentTier,
        newValue: newTier,
        reason: `수용률 ${Math.round(acceptanceRate * 100)}% 달성 - 대화 빈도 한 단계 증가`,
      };
    }
  }

  return null;
}

export function calculateTaskPermissionAdjustment(
  taskType: string,
  consecutiveAccepts: number,
  consecutiveRejects: number,
  autoApproveTypes: string[],
  neverSuggestTypes: string[]
): AdjustmentResult | null {
  if (
    consecutiveAccepts >= LEARNING_THRESHOLDS.AUTO_APPROVE_COUNT &&
    !autoApproveTypes.includes(taskType)
  ) {
    const newAutoApprove = [...autoApproveTypes, taskType];

    return {
      adjustmentType: 'TASK_PERMISSION',
      oldValue: { autoApproveTaskTypes: autoApproveTypes },
      newValue: { autoApproveTaskTypes: newAutoApprove },
      reason: `작업 유형 '${taskType}' 연속 승인 ${consecutiveAccepts}회 - 자동 승인 목록에 추가`,
    };
  }

  if (
    consecutiveRejects >= LEARNING_THRESHOLDS.SUPPRESS_REJECT_COUNT &&
    !neverSuggestTypes.includes(taskType)
  ) {
    const newNeverSuggest = [...neverSuggestTypes, taskType];

    return {
      adjustmentType: 'TASK_PERMISSION',
      oldValue: { neverSuggestTaskTypes: neverSuggestTypes },
      newValue: { neverSuggestTaskTypes: newNeverSuggest },
      reason: `작업 유형 '${taskType}' 연속 거부 ${consecutiveRejects}회 - 제안 제외 목록에 추가`,
    };
  }

  return null;
}

export function calculateTimingPreference(
  timingStats: TimingStats[],
  currentOptimalHours: number[]
): AdjustmentResult | null {
  const optimalHours = timingStats
    .filter((stat) => {
      const total = stat.acceptCount + stat.ignoreCount;
      return total >= 3 && stat.acceptanceRate >= 0.7;
    })
    .map((stat) => stat.hour)
    .sort((a, b) => a - b);

  const hasChanged =
    optimalHours.length !== currentOptimalHours.length ||
    optimalHours.some((hour, index) => hour !== currentOptimalHours[index]);

  if (hasChanged && optimalHours.length > 0) {
    return {
      adjustmentType: 'TIMING_PREFERENCE',
      oldValue: currentOptimalHours,
      newValue: optimalHours,
      reason: `최적 대화 시간대 업데이트: ${formatHours(optimalHours)}`,
    };
  }

  return null;
}

function decreaseTier(tier: ConversationFrequencyTier): ConversationFrequencyTier {
  switch (tier) {
    case 'HIGH':
      return 'MEDIUM';
    case 'MEDIUM':
      return 'LOW';
    case 'LOW':
      return 'LOW';
  }
}

function increaseTier(tier: ConversationFrequencyTier): ConversationFrequencyTier {
  switch (tier) {
    case 'LOW':
      return 'MEDIUM';
    case 'MEDIUM':
      return 'HIGH';
    case 'HIGH':
      return 'HIGH';
  }
}

function formatHours(hours: number[]): string {
  if (hours.length === 0) {
    return '없음';
  }

  return hours.map((h) => `${h}시`).join(', ');
}
