import type { EmotionAnalysisResult } from './emotion.types.js';

interface EmotionAdjustment {
  condition: (emotion: EmotionAnalysisResult) => boolean;
  instruction: string;
}

const EMOTION_ADJUSTMENTS: EmotionAdjustment[] = [
  {
    condition: (e) => e.emotionType === 'FRUSTRATED' && e.intensity > 7,
    instruction: '사용자가 매우 답답해하고 있습니다. 먼저 공감을 표현하고, 문제 해결에 집중하며, 격려의 말을 건네주세요.',
  },
  {
    condition: (e) => e.emotionType === 'FRUSTRATED' && e.intensity >= 5 && e.intensity <= 7,
    instruction: '사용자가 약간 답답해하는 것 같습니다. 차분하게 도움을 제공하고 이해한다는 것을 보여주세요.',
  },
  {
    condition: (e) => e.emotionType === 'EXCITED' && e.intensity > 6,
    instruction: '사용자가 매우 들떠 있습니다! 함께 기뻐하고 축하해 주세요. 긍정적인 에너지를 공유하세요.',
  },
  {
    condition: (e) => e.emotionType === 'TIRED' && e.intensity > 5,
    instruction: '사용자가 지쳐있는 것 같습니다. 응답을 간결하고 핵심적으로 하고, 필요하다면 휴식을 권유하세요.',
  },
  {
    condition: (e) => e.emotionType === 'STRESSED' && e.intensity > 6,
    instruction: '사용자가 스트레스를 받고 있습니다. 차분하고 안정적인 톤으로 응답하고, 단계별로 명확하게 안내하세요.',
  },
  {
    condition: (e) => e.emotionType === 'STRESSED' && e.intensity >= 4 && e.intensity <= 6,
    instruction: '사용자가 약간의 압박감을 느끼는 것 같습니다. 명확하고 체계적인 정보를 제공하세요.',
  },
  {
    condition: (e) => e.emotionType === 'NEGATIVE' && e.intensity > 7,
    instruction: '사용자가 부정적인 감정 상태입니다. 공감을 표현하고 도움이 될 수 있는 부분에 집중하세요.',
  },
  {
    condition: (e) => e.emotionType === 'POSITIVE' && e.intensity > 7,
    instruction: '사용자가 매우 긍정적인 상태입니다. 밝고 친근한 톤을 유지하세요.',
  },
];

export function buildEmotionAdjustedPrompt(
  basePrompt: string,
  emotion: EmotionAnalysisResult
): string {
  const applicableAdjustments = EMOTION_ADJUSTMENTS
    .filter((adj) => adj.condition(emotion))
    .map((adj) => adj.instruction);

  if (applicableAdjustments.length === 0) {
    return basePrompt;
  }

  const emotionSection = `[감정 인식]
감지된 감정: ${translateEmotionType(emotion.emotionType)} (강도: ${emotion.intensity}/10)
${applicableAdjustments.join('\n')}`;

  return `${basePrompt}\n\n${emotionSection}`;
}

export function shouldAdjustResponse(emotion: EmotionAnalysisResult): boolean {
  if (emotion.emotionType === 'NEUTRAL' && emotion.intensity <= 5) {
    return false;
  }

  if (emotion.confidence < 0.3) {
    return false;
  }

  return emotion.intensity > 5 || emotion.emotionType !== 'NEUTRAL';
}

function translateEmotionType(emotionType: string): string {
  const translations: Record<string, string> = {
    POSITIVE: '긍정적',
    NEGATIVE: '부정적',
    NEUTRAL: '중립',
    FRUSTRATED: '답답함/짜증',
    EXCITED: '흥분/기대',
    TIRED: '피로',
    STRESSED: '스트레스',
  };

  return translations[emotionType] ?? emotionType;
}
