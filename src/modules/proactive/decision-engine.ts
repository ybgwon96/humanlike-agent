import type {
  UserState,
  EngagementDecision,
  UserEngagementSettings,
  TriggerReason,
  TriggerContext,
  MessagePriority,
} from './proactive.types.js';
import { DEFAULT_THRESHOLDS, FREQUENCY_LIMITS } from './proactive.types.js';

const MESSAGE_TEMPLATES = {
  STUCK_TIMEOUT: (minutes: number) =>
    `${minutes}분 동안 같은 문제에 머물러 계신 것 같아요. 제가 도움을 드릴까요?`,
  HIGH_FRUSTRATION: () =>
    `조금 힘드신 것 같아요. 잠시 쉬어가시거나, 제가 도와드릴 수 있는 게 있을까요?`,
  POST_FOCUS_IDLE: (minutes: number) =>
    `${minutes}분 이상 집중하셨네요! 잠시 휴식을 취하시는 건 어떨까요?`,
  SCHEDULED: () => `예정된 알림입니다.`,
  MANUAL: () => `요청하신 알림입니다.`,
} as const;

function createBlockDecision(context: TriggerContext): EngagementDecision {
  return {
    shouldEngage: false,
    reason: null,
    action: 'BLOCK',
    priority: 'normal',
    suggestedMessage: null,
    context,
  };
}

function createSkipDecision(context: TriggerContext): EngagementDecision {
  return {
    shouldEngage: false,
    reason: null,
    action: 'SKIP',
    priority: 'normal',
    suggestedMessage: null,
    context,
  };
}

function createDeferDecision(
  deferUntil: Date,
  context: TriggerContext
): EngagementDecision {
  return {
    shouldEngage: false,
    reason: null,
    action: 'DEFER',
    deferUntil,
    priority: 'normal',
    suggestedMessage: null,
    context,
  };
}

function createEngageDecision(
  reason: TriggerReason,
  priority: MessagePriority,
  message: string,
  context: TriggerContext
): EngagementDecision {
  return {
    shouldEngage: true,
    reason,
    action: 'ENGAGE',
    priority,
    suggestedMessage: message,
    context,
  };
}

function buildContext(state: UserState): TriggerContext {
  return {
    activityType: state.activityType ?? undefined,
    focusScore: state.focusScore,
    emotionType: state.emotionType ?? undefined,
    emotionIntensity: state.emotionIntensity,
    durationMinutes: state.activityDurationMinutes,
    timestamp: new Date().toISOString(),
  };
}

function isInPreferredHours(settings: UserEngagementSettings): boolean {
  if (settings.preferredHours.length === 0) return true;

  const currentHour = new Date().getHours();
  return settings.preferredHours.includes(currentHour);
}

function isTriggerEnabled(
  trigger: TriggerReason,
  settings: UserEngagementSettings
): boolean {
  const preference = settings.triggerPreferences[trigger];
  return preference !== false;
}

function checkBlockConditions(
  state: UserState,
  settings: UserEngagementSettings
): { blocked: boolean; reason?: string } {
  if (state.activityType === 'MEETING') {
    return { blocked: true, reason: 'User is in a meeting' };
  }

  if (settings.pausedUntil && settings.pausedUntil > new Date()) {
    return { blocked: true, reason: 'Engagements are paused' };
  }

  const dailyLimit = FREQUENCY_LIMITS[settings.frequencyPreference];
  if (settings.todayEngagementCount >= dailyLimit) {
    return { blocked: true, reason: 'Daily limit reached' };
  }

  if (settings.consecutiveIgnores >= DEFAULT_THRESHOLDS.MAX_CONSECUTIVE_IGNORES) {
    return { blocked: true, reason: 'Too many consecutive ignores' };
  }

  return { blocked: false };
}

function checkDeferConditions(
  state: UserState,
  settings: UserEngagementSettings
): { deferred: boolean; deferUntil?: Date } {
  if (state.focusScore >= DEFAULT_THRESHOLDS.HIGH_FOCUS_SCORE) {
    const deferUntil = new Date();
    deferUntil.setMinutes(deferUntil.getMinutes() + DEFAULT_THRESHOLDS.DEFER_DURATION_MINUTES);
    return { deferred: true, deferUntil };
  }

  if (!isInPreferredHours(settings)) {
    const nextPreferredHour = findNextPreferredHour(settings.preferredHours);
    if (nextPreferredHour !== null) {
      const deferUntil = new Date();
      const currentHour = deferUntil.getHours();
      const hoursToAdd = nextPreferredHour > currentHour
        ? nextPreferredHour - currentHour
        : 24 - currentHour + nextPreferredHour;
      deferUntil.setHours(deferUntil.getHours() + hoursToAdd, 0, 0, 0);
      return { deferred: true, deferUntil };
    }
  }

  return { deferred: false };
}

function findNextPreferredHour(preferredHours: number[]): number | null {
  if (preferredHours.length === 0) return null;

  const currentHour = new Date().getHours();
  const sorted = [...preferredHours].sort((a, b) => a - b);

  const nextHour = sorted.find(h => h > currentHour);
  return nextHour ?? sorted[0] ?? null;
}

function evaluateTriggerRules(
  state: UserState,
  settings: UserEngagementSettings,
  context: TriggerContext
): EngagementDecision | null {
  if (
    state.activityType === 'STUCK' &&
    state.activityDurationMinutes >= DEFAULT_THRESHOLDS.STUCK_TIMEOUT_MINUTES &&
    isTriggerEnabled('STUCK_TIMEOUT', settings)
  ) {
    return createEngageDecision(
      'STUCK_TIMEOUT',
      'normal',
      MESSAGE_TEMPLATES.STUCK_TIMEOUT(Math.floor(state.activityDurationMinutes)),
      context
    );
  }

  if (
    state.emotionType === 'FRUSTRATED' &&
    state.emotionIntensity >= DEFAULT_THRESHOLDS.HIGH_FRUSTRATION_INTENSITY &&
    isTriggerEnabled('HIGH_FRUSTRATION', settings)
  ) {
    return createEngageDecision(
      'HIGH_FRUSTRATION',
      'high',
      MESSAGE_TEMPLATES.HIGH_FRUSTRATION(),
      context
    );
  }

  if (
    state.activityType === 'IDLE' &&
    state.activityDurationMinutes >= DEFAULT_THRESHOLDS.POST_FOCUS_IDLE_MINUTES &&
    isTriggerEnabled('POST_FOCUS_IDLE', settings)
  ) {
    return createEngageDecision(
      'POST_FOCUS_IDLE',
      'low',
      MESSAGE_TEMPLATES.POST_FOCUS_IDLE(Math.floor(state.activityDurationMinutes)),
      context
    );
  }

  return null;
}

export function evaluateEngagement(
  state: UserState,
  settings: UserEngagementSettings
): EngagementDecision {
  const context = buildContext(state);

  const blockCheck = checkBlockConditions(state, settings);
  if (blockCheck.blocked) {
    return createBlockDecision(context);
  }

  const deferCheck = checkDeferConditions(state, settings);
  if (deferCheck.deferred && deferCheck.deferUntil) {
    return createDeferDecision(deferCheck.deferUntil, context);
  }

  const triggerDecision = evaluateTriggerRules(state, settings, context);
  if (triggerDecision) {
    return triggerDecision;
  }

  return createSkipDecision(context);
}

export function generateMessage(reason: TriggerReason, context: TriggerContext): string {
  switch (reason) {
    case 'STUCK_TIMEOUT':
      return MESSAGE_TEMPLATES.STUCK_TIMEOUT(context.durationMinutes ?? 10);
    case 'HIGH_FRUSTRATION':
      return MESSAGE_TEMPLATES.HIGH_FRUSTRATION();
    case 'POST_FOCUS_IDLE':
      return MESSAGE_TEMPLATES.POST_FOCUS_IDLE(context.durationMinutes ?? 90);
    case 'SCHEDULED':
      return MESSAGE_TEMPLATES.SCHEDULED();
    case 'MANUAL':
      return MESSAGE_TEMPLATES.MANUAL();
    default:
      return '안녕하세요. 도움이 필요하시면 말씀해 주세요.';
  }
}

export function getPriorityForReason(reason: TriggerReason): MessagePriority {
  switch (reason) {
    case 'HIGH_FRUSTRATION':
      return 'high';
    case 'POST_FOCUS_IDLE':
      return 'low';
    case 'STUCK_TIMEOUT':
    case 'SCHEDULED':
    case 'MANUAL':
    default:
      return 'normal';
  }
}
