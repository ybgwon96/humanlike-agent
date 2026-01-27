import type { ActivityType } from '../../db/schema/activity-context.js';

export interface InterruptionCostInput {
  focusScore: number;
  activeFile: string | null;
  focusDurationMinutes: number;
  activityType: ActivityType | null;
}

export type InterruptionLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InterruptionCostResult {
  costScore: number;
  recoveryMinutes: number;
  level: InterruptionLevel;
}

const CRITICAL_PATH_PATTERNS = [
  /^src\/core\//,
  /^src\/config\//,
  /config\.(ts|js|json)$/,
  /\.env/,
  /schema\.(ts|js)$/,
];

const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  CODING: 1.0,
  BROWSING: 0.7,
  MEETING: 2.0,
  IDLE: 0.3,
  STUCK: 0.5,
};

const FOCUS_DURATION_THRESHOLD_MINUTES = 60;
const EXTENDED_FOCUS_MULTIPLIER = 1.2;
const CRITICAL_FILE_MULTIPLIER = 1.5;

const RECOVERY_TIME_BASE_MINUTES = 5;
const RECOVERY_PER_FOCUS_POINT = 0.15;

function isCriticalFile(filePath: string | null): boolean {
  if (!filePath) return false;
  return CRITICAL_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

function calculateRecoveryTime(costScore: number): number {
  const baseRecovery = RECOVERY_TIME_BASE_MINUTES;
  const additionalRecovery = costScore * RECOVERY_PER_FOCUS_POINT;
  return Math.round(baseRecovery + additionalRecovery);
}

function determineLevel(costScore: number): InterruptionLevel {
  if (costScore >= 80) return 'HIGH';
  if (costScore >= 40) return 'MEDIUM';
  return 'LOW';
}

export function calculateInterruptionCost(input: InterruptionCostInput): InterruptionCostResult {
  const { focusScore, activeFile, focusDurationMinutes, activityType } = input;

  let costScore = focusScore;

  if (activityType) {
    costScore *= ACTIVITY_MULTIPLIERS[activityType];
  }

  if (isCriticalFile(activeFile)) {
    costScore *= CRITICAL_FILE_MULTIPLIER;
  }

  if (focusDurationMinutes >= FOCUS_DURATION_THRESHOLD_MINUTES) {
    costScore *= EXTENDED_FOCUS_MULTIPLIER;
  }

  costScore = Math.min(150, Math.round(costScore));

  const recoveryMinutes = calculateRecoveryTime(costScore);
  const level = determineLevel(costScore);

  return {
    costScore,
    recoveryMinutes,
    level,
  };
}

export function shouldDeferForHighCost(result: InterruptionCostResult): boolean {
  return result.level === 'HIGH';
}
