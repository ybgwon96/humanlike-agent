import { AppError } from '../../middleware/error-handler.js';
import * as emotionRepository from './emotion.repository.js';
import * as messagesRepository from '../messages/messages.repository.js';
import { analyzeEmotion as ruleBasedAnalyze } from './analyzers/index.js';
import type {
  EmotionType,
  EmotionAnalysisResult,
  EmotionTrend,
} from './emotion.types.js';
import type { AnalyzeEmotionResponse, EmotionalProfileResponse } from './emotion.schemas.js';

export async function analyzeMessageEmotion(messageId: string): Promise<AnalyzeEmotionResponse> {
  const existingAnalysis = await emotionRepository.getEmotionAnalysisByMessageId(messageId);
  if (existingAnalysis) {
    return formatAnalysisResponse(existingAnalysis);
  }

  const message = await messagesRepository.getMessageById(messageId);
  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  const analysisResult = ruleBasedAnalyze(message.content);

  const savedAnalysis = await emotionRepository.createEmotionAnalysis({
    messageId,
    emotionType: analysisResult.emotionType,
    intensity: analysisResult.intensity,
    confidence: analysisResult.confidence,
    rawScore: analysisResult.rawScore,
    analysisMethod: analysisResult.analysisMethod,
    metadata: analysisResult.metadata ?? {},
  });

  return formatAnalysisResponse(savedAnalysis);
}

export function analyzeEmotionFromContent(content: string): EmotionAnalysisResult {
  return ruleBasedAnalyze(content);
}

export async function getUserEmotionalProfile(
  userId: string,
  days: number = 30
): Promise<EmotionalProfileResponse> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const recentDays = 7;
  const recentSince = new Date();
  recentSince.setDate(recentSince.getDate() - recentDays);

  const [distribution, avgIntensity, totalCount, recentAvgScore, olderAvgScore] = await Promise.all([
    emotionRepository.getEmotionDistribution(userId, since),
    emotionRepository.getAverageIntensity(userId, since),
    emotionRepository.getTotalAnalyzedCount(userId, since),
    emotionRepository.getRecentAverageRawScore(userId, recentSince),
    emotionRepository.getRecentAverageRawScore(userId, since),
  ]);

  const emotionDistribution: Record<EmotionType, number> = {
    POSITIVE: 0,
    NEGATIVE: 0,
    NEUTRAL: 0,
    FRUSTRATED: 0,
    EXCITED: 0,
    TIRED: 0,
    STRESSED: 0,
  };

  for (const item of distribution) {
    emotionDistribution[item.emotionType] = item.count;
  }

  const dominantEmotions = getDominantEmotions(emotionDistribution, totalCount);
  const recentTrend = calculateTrend(recentAvgScore, olderAvgScore);
  const emotionalBaseline = olderAvgScore;

  return {
    userId,
    dominantEmotions,
    averageIntensity: Math.round(avgIntensity * 10) / 10,
    emotionalBaseline: Math.round(emotionalBaseline * 100) / 100,
    recentTrend,
    emotionDistribution,
    totalAnalyzed: totalCount,
    calculatedAt: new Date().toISOString(),
  };
}

function getDominantEmotions(
  distribution: Record<EmotionType, number>,
  total: number
): EmotionType[] {
  if (total === 0) return ['NEUTRAL'];

  const sorted = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) return ['NEUTRAL'];

  const threshold = total * 0.15;
  const dominant = sorted
    .filter(([_, count]) => count >= threshold)
    .slice(0, 3)
    .map(([emotion]) => emotion as EmotionType);

  if (dominant.length > 0) return dominant;
  const firstEntry = sorted[0];
  return firstEntry ? [firstEntry[0] as EmotionType] : ['NEUTRAL'];
}

function calculateTrend(recentScore: number, olderScore: number): EmotionTrend {
  const diff = recentScore - olderScore;

  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

function formatAnalysisResponse(analysis: {
  id: string;
  messageId: string;
  emotionType: string;
  intensity: number;
  confidence: number;
  rawScore: number | null;
  analysisMethod: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}): AnalyzeEmotionResponse {
  return {
    id: analysis.id,
    messageId: analysis.messageId,
    emotionType: analysis.emotionType as EmotionType,
    intensity: analysis.intensity,
    confidence: analysis.confidence,
    rawScore: analysis.rawScore,
    analysisMethod: (analysis.analysisMethod ?? 'rule_based') as 'rule_based' | 'llm' | 'hybrid',
    metadata: analysis.metadata ?? undefined,
    createdAt: analysis.createdAt.toISOString(),
  };
}
