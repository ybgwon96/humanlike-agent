import type { Agent } from '../../db/schema/agents.js';
import type {
  PromotionCriteria,
  LevelChangeResult,
} from './trust-score.types.js';
import { AUTONOMY_LEVEL_NAMES, AUTONOMY_LEVEL_PERMISSIONS } from './trust-score.types.js';

const PROMOTION_CRITERIA: PromotionCriteria[] = [
  { fromLevel: 1, toLevel: 2, requiredTasks: 20, minSuccessRate: 0.8 },
  { fromLevel: 2, toLevel: 3, requiredTasks: 50, minSuccessRate: 0.85 },
  { fromLevel: 3, toLevel: 4, requiredTasks: 100, minSuccessRate: 0.9 },
  { fromLevel: 4, toLevel: 5, requiredTasks: 200, minSuccessRate: 0.95 },
];

const DEMOTION_THRESHOLDS = {
  CONSECUTIVE_FAILURES: 3,
  MIN_TRUST_SCORE_LEVEL_2: 30,
  MIN_TRUST_SCORE_LEVEL_3: 50,
  MIN_TRUST_SCORE_LEVEL_4: 70,
  MIN_TRUST_SCORE_LEVEL_5: 85,
} as const;

const MIN_TRUST_SCORES: Record<number, number> = {
  2: DEMOTION_THRESHOLDS.MIN_TRUST_SCORE_LEVEL_2,
  3: DEMOTION_THRESHOLDS.MIN_TRUST_SCORE_LEVEL_3,
  4: DEMOTION_THRESHOLDS.MIN_TRUST_SCORE_LEVEL_4,
  5: DEMOTION_THRESHOLDS.MIN_TRUST_SCORE_LEVEL_5,
};

export function evaluatePromotion(agent: Agent): LevelChangeResult {
  const currentLevel = agent.autonomyLevel;

  if (currentLevel >= 5) {
    return createNoChangeResult(currentLevel);
  }

  const criteria = PROMOTION_CRITERIA.find((c) => c.fromLevel === currentLevel);
  if (criteria === undefined) {
    return createNoChangeResult(currentLevel);
  }

  const successRate =
    agent.totalTasks > 0 ? agent.successfulTasks / agent.totalTasks : 0;

  if (agent.totalTasks < criteria.requiredTasks) {
    return createNoChangeResult(currentLevel);
  }

  if (successRate < criteria.minSuccessRate) {
    return createNoChangeResult(currentLevel);
  }

  const newLevel = criteria.toLevel;
  const levelName = AUTONOMY_LEVEL_NAMES[newLevel];
  const permissions = AUTONOMY_LEVEL_PERMISSIONS[newLevel];

  return {
    levelChanged: true,
    previousLevel: currentLevel,
    currentLevel: newLevel,
    reason: 'promotion',
    notification: `축하합니다! ${levelName} (Level ${newLevel})로 승진했습니다. 새로운 권한: ${permissions}`,
  };
}

export function evaluateDemotion(agent: Agent, trustScore: number): LevelChangeResult {
  const currentLevel = agent.autonomyLevel;

  if (currentLevel <= 1) {
    return createNoChangeResult(currentLevel);
  }

  if (agent.consecutiveFailures >= DEMOTION_THRESHOLDS.CONSECUTIVE_FAILURES) {
    const newLevel = Math.max(1, currentLevel - 1);
    const levelName = AUTONOMY_LEVEL_NAMES[newLevel];

    return {
      levelChanged: true,
      previousLevel: currentLevel,
      currentLevel: newLevel,
      reason: 'demotion_failures',
      notification: `연속 실패로 인해 ${levelName} (Level ${newLevel})로 강등되었습니다. 연속 실패: ${agent.consecutiveFailures}회`,
    };
  }

  const minTrustScore = MIN_TRUST_SCORES[currentLevel];
  if (minTrustScore !== undefined && trustScore < minTrustScore) {
    const newLevel = currentLevel - 1;
    const levelName = AUTONOMY_LEVEL_NAMES[newLevel];

    return {
      levelChanged: true,
      previousLevel: currentLevel,
      currentLevel: newLevel,
      reason: 'demotion_low_score',
      notification: `신뢰도 점수 하락으로 ${levelName} (Level ${newLevel})로 강등되었습니다. 현재 점수: ${trustScore.toFixed(1)}, 최소 요구: ${minTrustScore}`,
    };
  }

  return createNoChangeResult(currentLevel);
}

export function checkPermission(taskLevel: number, agentLevel: number): boolean {
  return agentLevel >= taskLevel;
}

export function getRequiredTasksForPromotion(currentLevel: number): number | null {
  const criteria = PROMOTION_CRITERIA.find((c) => c.fromLevel === currentLevel);
  return criteria?.requiredTasks ?? null;
}

export function getMinSuccessRateForPromotion(currentLevel: number): number | null {
  const criteria = PROMOTION_CRITERIA.find((c) => c.fromLevel === currentLevel);
  return criteria?.minSuccessRate ?? null;
}

function createNoChangeResult(currentLevel: number): LevelChangeResult {
  return {
    levelChanged: false,
    previousLevel: currentLevel,
    currentLevel,
    reason: null,
    notification: null,
  };
}
