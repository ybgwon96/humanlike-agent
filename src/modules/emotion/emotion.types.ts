export type EmotionType =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'NEUTRAL'
  | 'FRUSTRATED'
  | 'EXCITED'
  | 'TIRED'
  | 'STRESSED';

export type AnalysisMethod = 'rule_based' | 'llm' | 'hybrid';

export interface EmotionAnalysisResult {
  emotionType: EmotionType;
  intensity: number;
  confidence: number;
  rawScore: number;
  analysisMethod: AnalysisMethod;
  metadata?: {
    matchedKeywords?: string[];
    punctuationScore?: number;
    capsRatio?: number;
  };
}

export interface StoredEmotionAnalysis {
  id: string;
  messageId: string;
  emotionType: EmotionType;
  intensity: number;
  confidence: number;
  rawScore: number | null;
  analysisMethod: AnalysisMethod;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type EmotionTrend = 'improving' | 'stable' | 'declining';

export interface UserEmotionalProfile {
  userId: string;
  dominantEmotions: EmotionType[];
  averageIntensity: number;
  emotionalBaseline: number;
  recentTrend: EmotionTrend;
  emotionDistribution: Record<EmotionType, number>;
  totalAnalyzed: number;
  calculatedAt: Date;
}

export interface EmotionPattern {
  keywords: string[];
  punctuation?: string[];
  intensityMultiplier: number;
}

export type EmotionPatternMap = Record<EmotionType, EmotionPattern>;
