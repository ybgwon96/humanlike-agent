import type { ActivityType } from '../../db/schema/activity-context.js';

export type BreakType = 'ACTIVITY_TRANSITION' | 'FOCUS_DROP' | 'IDLE_DETECTED' | 'TASK_COMPLETION';

export interface BreakDetectionInput {
  currentActivity: ActivityType | null;
  previousActivity: ActivityType | null;
  currentFocusScore: number;
  previousFocusScore: number;
  windowTitle: string | null;
  focusDropTimeWindowMinutes: number;
}

export interface BreakDetectionResult {
  isBreak: boolean;
  breakType: BreakType | null;
}

const HIGH_ACTIVITY_TYPES: ActivityType[] = ['CODING', 'MEETING'];
const LOW_ACTIVITY_TYPES: ActivityType[] = ['BROWSING', 'IDLE'];
const FOCUS_DROP_THRESHOLD = 35;

const TASK_COMPLETION_PATTERNS = [
  /build\s*(success|complete|passed)/i,
  /commit\s*(success|complete)/i,
  /pushed?\s+to/i,
  /tests?\s+(pass|passed|passing)/i,
  /deploy(ed|ment)?\s*(success|complete)/i,
  /merged?\s+(success|to)/i,
  /pull\s+request\s+(created|merged)/i,
  /\[done\]/i,
  /task\s+complete/i,
];

function isActivityTransition(
  current: ActivityType | null,
  previous: ActivityType | null
): boolean {
  if (!current || !previous) return false;
  if (current === previous) return false;

  const wasHighActivity = HIGH_ACTIVITY_TYPES.includes(previous);
  const isNowLowActivity = LOW_ACTIVITY_TYPES.includes(current);

  return wasHighActivity && isNowLowActivity;
}

function isFocusDrop(
  currentScore: number,
  previousScore: number,
  _timeWindowMinutes: number
): boolean {
  const scoreDrop = previousScore - currentScore;
  return scoreDrop >= FOCUS_DROP_THRESHOLD;
}

function isIdleDetected(current: ActivityType | null): boolean {
  return current === 'IDLE';
}

function isTaskCompletion(windowTitle: string | null): boolean {
  if (!windowTitle) return false;
  return TASK_COMPLETION_PATTERNS.some((pattern) => pattern.test(windowTitle));
}

export function detectBreak(input: BreakDetectionInput): BreakDetectionResult {
  const {
    currentActivity,
    previousActivity,
    currentFocusScore,
    previousFocusScore,
    windowTitle,
    focusDropTimeWindowMinutes,
  } = input;

  if (isTaskCompletion(windowTitle)) {
    return {
      isBreak: true,
      breakType: 'TASK_COMPLETION',
    };
  }

  if (isActivityTransition(currentActivity, previousActivity)) {
    return {
      isBreak: true,
      breakType: 'ACTIVITY_TRANSITION',
    };
  }

  if (isFocusDrop(currentFocusScore, previousFocusScore, focusDropTimeWindowMinutes)) {
    return {
      isBreak: true,
      breakType: 'FOCUS_DROP',
    };
  }

  if (isIdleDetected(currentActivity)) {
    return {
      isBreak: true,
      breakType: 'IDLE_DETECTED',
    };
  }

  return {
    isBreak: false,
    breakType: null,
  };
}

export function getBreakTypeDescription(breakType: BreakType): string {
  switch (breakType) {
    case 'ACTIVITY_TRANSITION':
      return '고집중 활동에서 저집중 활동으로 전환됨';
    case 'FOCUS_DROP':
      return '집중도가 급격히 하락함';
    case 'IDLE_DETECTED':
      return '대기 상태 진입';
    case 'TASK_COMPLETION':
      return '작업 완료 감지';
  }
}
