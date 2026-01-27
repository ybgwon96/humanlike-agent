import type { ActivityType, InterruptionCost } from '../../db/schema/activity-context.js';
import type { EmotionType } from '../emotion/emotion.types.js';
import type { TriggerReason, UserResponse, FrequencyPreference } from '../../db/schema/proactive-engagements.js';

export type { TriggerReason, UserResponse, FrequencyPreference };

export interface UserState {
  userId: string;
  activityType: ActivityType | null;
  focusScore: number;
  interruptionCost: InterruptionCost | null;
  activityDurationMinutes: number;
  emotionType: EmotionType | null;
  emotionIntensity: number;
  lastActivityChangeAt: Date | null;
}

export interface TriggerContext {
  activityType?: ActivityType;
  focusScore?: number;
  emotionType?: EmotionType;
  emotionIntensity?: number;
  durationMinutes?: number;
  timestamp: string;
}

export type EngagementAction = 'ENGAGE' | 'DEFER' | 'BLOCK' | 'SKIP';
export type MessagePriority = 'low' | 'normal' | 'high';

export interface EngagementDecision {
  shouldEngage: boolean;
  reason: TriggerReason | null;
  action: EngagementAction;
  deferUntil?: Date;
  priority: MessagePriority;
  suggestedMessage: string | null;
  context: TriggerContext;
}

export interface UserEngagementSettings {
  userId: string;
  frequencyPreference: FrequencyPreference;
  dailyLimit: number;
  consecutiveIgnores: number;
  pausedUntil: Date | null;
  preferredHours: number[];
  triggerPreferences: Partial<Record<TriggerReason, boolean>>;
  todayEngagementCount: number;
}

export interface FeedbackInput {
  engagementId: string;
  response: UserResponse;
  wasHelpful?: boolean;
  feedbackText?: string;
  responseTimeMs?: number;
}

export const DEFAULT_THRESHOLDS = {
  STUCK_TIMEOUT_MINUTES: 10,
  HIGH_FRUSTRATION_INTENSITY: 7,
  POST_FOCUS_IDLE_MINUTES: 90,
  HIGH_FOCUS_SCORE: 90,
  MAX_DAILY_ENGAGEMENTS: 10,
  CONSECUTIVE_IGNORE_PAUSE_HOURS: 24,
  MAX_CONSECUTIVE_IGNORES: 3,
  DEFER_DURATION_MINUTES: 30,
} as const;

export const FREQUENCY_LIMITS: Record<FrequencyPreference, number> = {
  MINIMAL: 3,
  BALANCED: 10,
  PROACTIVE: 20,
} as const;

export type TimingDecision = 'IMMEDIATE' | 'WAIT_FOR_BREAK' | 'DEFER';

export interface EnhancedUserState extends UserState {
  activeFile: string | null;
  windowTitle: string | null;
  previousActivity: import('../../db/schema/activity-context.js').ActivityType | null;
  previousFocusScore: number;
}

export interface InterruptionCostResult {
  costScore: number;
  recoveryMinutes: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ConversationValueResult {
  value: number;
  reasoning: string;
}

export interface EnhancedEngagementDecision extends EngagementDecision {
  timing: TimingDecision;
  interruptionCost: InterruptionCostResult;
  conversationValue: ConversationValueResult;
  maxWaitMinutes?: number;
}

export const ENHANCED_THRESHOLDS = {
  VALUE_COST_IMMEDIATE_RATIO: 2,
  MAX_WAIT_FOR_BREAK_MINUTES: 30,
  FOCUS_DROP_TIME_WINDOW_MINUTES: 5,
} as const;
