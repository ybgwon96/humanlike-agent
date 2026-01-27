import type { TriggerReason } from './proactive.types.js';
import type { EmotionType } from '../emotion/emotion.types.js';

export interface ConversationValueInput {
  triggerReason: TriggerReason | null;
  emotionType: EmotionType | null;
  emotionIntensity: number;
  isStuck: boolean;
  idleDurationMinutes: number;
}

export interface ConversationValueResult {
  value: number;
  reasoning: string;
}

const TRIGGER_VALUE_MAP: Record<TriggerReason, { baseValue: number; reasoning: string }> = {
  STUCK_TIMEOUT: {
    baseValue: 90,
    reasoning: '사용자가 막힌 상태에서 도움이 필요할 가능성이 높습니다',
  },
  HIGH_FRUSTRATION: {
    baseValue: 85,
    reasoning: '높은 좌절감이 감지되어 즉각적인 지원이 필요합니다',
  },
  POST_FOCUS_IDLE: {
    baseValue: 70,
    reasoning: '집중 세션 후 휴식 제안이 적절한 시점입니다',
  },
  SCHEDULED: {
    baseValue: 50,
    reasoning: '예약된 알림으로 기본 우선순위입니다',
  },
  MANUAL: {
    baseValue: 30,
    reasoning: '수동 트리거로 낮은 긴급성입니다',
  },
};

const EMOTION_VALUE_BOOST: Partial<Record<EmotionType, number>> = {
  FRUSTRATED: 15,
  STRESSED: 10,
  TIRED: 5,
  NEGATIVE: 8,
};

const STUCK_BONUS = 20;
const LONG_IDLE_THRESHOLD_MINUTES = 30;
const IDLE_BONUS = 10;

export function calculateConversationValue(input: ConversationValueInput): ConversationValueResult {
  const { triggerReason, emotionType, emotionIntensity, isStuck, idleDurationMinutes } = input;

  if (!triggerReason) {
    return {
      value: 0,
      reasoning: '트리거 사유가 없어 대화 가치를 산정할 수 없습니다',
    };
  }

  const triggerConfig = TRIGGER_VALUE_MAP[triggerReason];
  let value = triggerConfig.baseValue;
  const reasons: string[] = [triggerConfig.reasoning];

  if (emotionType && EMOTION_VALUE_BOOST[emotionType]) {
    const boost = EMOTION_VALUE_BOOST[emotionType] ?? 0;
    const intensityMultiplier = Math.min(emotionIntensity / 10, 1);
    value += boost * intensityMultiplier;
    reasons.push(`${emotionType} 감정 감지로 가치 상향`);
  }

  if (isStuck && triggerReason !== 'STUCK_TIMEOUT') {
    value += STUCK_BONUS;
    reasons.push('STUCK 상태로 추가 가치 부여');
  }

  if (idleDurationMinutes >= LONG_IDLE_THRESHOLD_MINUTES && triggerReason === 'POST_FOCUS_IDLE') {
    value += IDLE_BONUS;
    reasons.push('장시간 대기 상태로 추가 가치 부여');
  }

  value = Math.min(100, Math.round(value));

  return {
    value,
    reasoning: reasons.join('. '),
  };
}

export function isHighValueConversation(result: ConversationValueResult): boolean {
  return result.value >= 70;
}
