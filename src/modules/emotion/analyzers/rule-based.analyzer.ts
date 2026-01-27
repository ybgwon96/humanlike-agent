import type { EmotionType, EmotionAnalysisResult, EmotionPatternMap } from '../emotion.types.js';

const EMOTION_PATTERNS: Partial<EmotionPatternMap> = {
  FRUSTRATED: {
    keywords: [
      '짜증', '답답', 'frustrated', 'annoyed', '화나', 'angry', '왜 안돼',
      '또 실패', '진짜 왜', '도대체', '어이없', '황당', '짜증나', '빡치',
      '열받', 'ridiculous', 'annoying', 'damn', 'ugh',
    ],
    punctuation: ['!', '?!', '!!', '?!!'],
    intensityMultiplier: 1.2,
  },
  EXCITED: {
    keywords: [
      '대박', '최고', '완벽', 'amazing', 'awesome', '드디어', 'finally',
      '성공', '해냈다', '와우', 'wow', 'incredible', '멋져', '굉장',
      'fantastic', 'brilliant', '신나', '기대', 'excited',
    ],
    punctuation: ['!', '!!', '!!!'],
    intensityMultiplier: 1.3,
  },
  TIRED: {
    keywords: [
      '지쳤', '피곤', 'tired', 'exhausted', '힘들', '졸려', '녹초',
      '기진맥진', 'worn out', 'drained', '쉬고 싶', '지친다',
    ],
    punctuation: [],
    intensityMultiplier: 1.0,
  },
  STRESSED: {
    keywords: [
      '스트레스', 'stressed', '압박', '마감', 'deadline', '급해',
      '바빠', 'overwhelmed', '긴장', 'anxious', '불안', '걱정',
      'worried', '부담', 'pressure',
    ],
    punctuation: ['!', '!!'],
    intensityMultiplier: 1.1,
  },
  POSITIVE: {
    keywords: [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'happy',
      'love', 'like', 'thank', 'thanks', 'helpful', 'perfect',
      '좋아', '감사', '최고', '훌륭', '행복', '기쁘', '즐거',
      '만족', '고마워', '좋네', '멋지',
    ],
    punctuation: [],
    intensityMultiplier: 1.0,
  },
  NEGATIVE: {
    keywords: [
      'bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'sad',
      'wrong', 'error', 'fail', 'problem', 'issue', '싫어', '문제',
      '실패', '오류', '나빠', '슬퍼', '우울', '속상', '화나', '안돼',
    ],
    punctuation: [],
    intensityMultiplier: 1.0,
  },
};

const SPECIFIC_EMOTIONS: EmotionType[] = ['FRUSTRATED', 'EXCITED', 'TIRED', 'STRESSED'];

function countPunctuation(content: string, patterns: string[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    count += matches?.length ?? 0;
  }
  return count;
}

function calculateCapsRatio(content: string): number {
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;
  const upperCase = letters.replace(/[^A-Z]/g, '');
  return upperCase.length / letters.length;
}

function findMatchedKeywords(content: string, keywords: string[]): string[] {
  const lowerContent = content.toLowerCase();
  return keywords.filter((keyword) => lowerContent.includes(keyword.toLowerCase()));
}

export function analyzeEmotion(content: string): EmotionAnalysisResult {
  const lowerContent = content.toLowerCase();
  const capsRatio = calculateCapsRatio(content);

  let bestMatch: {
    emotionType: EmotionType;
    score: number;
    matchedKeywords: string[];
    punctuationScore: number;
  } | null = null;

  for (const emotionType of SPECIFIC_EMOTIONS) {
    const pattern = EMOTION_PATTERNS[emotionType];
    if (!pattern) continue;

    const matchedKeywords = findMatchedKeywords(content, pattern.keywords);
    if (matchedKeywords.length === 0) continue;

    const punctuationScore = countPunctuation(content, pattern.punctuation ?? []);
    const baseScore = matchedKeywords.length * pattern.intensityMultiplier;
    const score = baseScore + punctuationScore * 0.5 + capsRatio * 2;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { emotionType, score, matchedKeywords, punctuationScore };
    }
  }

  if (bestMatch && bestMatch.score >= 1) {
    const intensity = Math.min(10, Math.max(1, Math.round(bestMatch.score * 2 + 3)));
    const confidence = Math.min(1, bestMatch.matchedKeywords.length * 0.2 + 0.3);

    return {
      emotionType: bestMatch.emotionType,
      intensity,
      confidence,
      rawScore: calculateLegacyScore(bestMatch.emotionType, intensity),
      analysisMethod: 'rule_based',
      metadata: {
        matchedKeywords: bestMatch.matchedKeywords,
        punctuationScore: bestMatch.punctuationScore,
        capsRatio,
      },
    };
  }

  let positiveScore = 0;
  let negativeScore = 0;
  const positiveMatches: string[] = [];
  const negativeMatches: string[] = [];

  const positivePattern = EMOTION_PATTERNS.POSITIVE;
  const negativePattern = EMOTION_PATTERNS.NEGATIVE;

  if (positivePattern) {
    for (const word of positivePattern.keywords) {
      if (lowerContent.includes(word.toLowerCase())) {
        positiveScore += 1;
        positiveMatches.push(word);
      }
    }
  }

  if (negativePattern) {
    for (const word of negativePattern.keywords) {
      if (lowerContent.includes(word.toLowerCase())) {
        negativeScore += 1;
        negativeMatches.push(word);
      }
    }
  }

  const totalMatches = positiveScore + negativeScore;
  if (totalMatches === 0) {
    return {
      emotionType: 'NEUTRAL',
      intensity: 5,
      confidence: 0.5,
      rawScore: 0,
      analysisMethod: 'rule_based',
      metadata: { matchedKeywords: [], punctuationScore: 0, capsRatio },
    };
  }

  const rawScore = Math.max(-1, Math.min(1, (positiveScore - negativeScore) / totalMatches));

  if (rawScore > 0.1) {
    const intensity = Math.min(10, Math.max(1, Math.round(rawScore * 5 + 5)));
    return {
      emotionType: 'POSITIVE',
      intensity,
      confidence: Math.min(1, totalMatches * 0.15 + 0.3),
      rawScore,
      analysisMethod: 'rule_based',
      metadata: { matchedKeywords: positiveMatches, punctuationScore: 0, capsRatio },
    };
  }

  if (rawScore < -0.1) {
    const intensity = Math.min(10, Math.max(1, Math.round(Math.abs(rawScore) * 5 + 5)));
    return {
      emotionType: 'NEGATIVE',
      intensity,
      confidence: Math.min(1, totalMatches * 0.15 + 0.3),
      rawScore,
      analysisMethod: 'rule_based',
      metadata: { matchedKeywords: negativeMatches, punctuationScore: 0, capsRatio },
    };
  }

  return {
    emotionType: 'NEUTRAL',
    intensity: 5,
    confidence: 0.4,
    rawScore,
    analysisMethod: 'rule_based',
    metadata: {
      matchedKeywords: [...positiveMatches, ...negativeMatches],
      punctuationScore: 0,
      capsRatio,
    },
  };
}

function calculateLegacyScore(emotionType: EmotionType, intensity: number): number {
  const normalizedIntensity = (intensity - 1) / 9;

  switch (emotionType) {
    case 'POSITIVE':
    case 'EXCITED':
      return normalizedIntensity;
    case 'NEGATIVE':
    case 'FRUSTRATED':
    case 'STRESSED':
      return -normalizedIntensity;
    case 'TIRED':
      return -normalizedIntensity * 0.5;
    case 'NEUTRAL':
    default:
      return 0;
  }
}

export function getLegacySentimentScore(content: string): number {
  const result = analyzeEmotion(content);
  return result.rawScore;
}
