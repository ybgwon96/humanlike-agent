import { describe, it, expect } from 'vitest';
import { buildEmotionAdjustedPrompt, shouldAdjustResponse } from './response-adjuster.js';
import type { EmotionAnalysisResult } from './emotion.types.js';

describe('response-adjuster', () => {
  const basePrompt = '당신은 친절한 AI 비서입니다.';

  describe('buildEmotionAdjustedPrompt', () => {
    it('adds empathy instruction for high intensity frustrated emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'FRUSTRATED',
        intensity: 8,
        confidence: 0.8,
        rawScore: -0.7,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toContain('[감정 인식]');
      expect(adjusted).toContain('공감');
      expect(adjusted).toContain('격려');
    });

    it('adds celebration instruction for excited emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'EXCITED',
        intensity: 7,
        confidence: 0.85,
        rawScore: 0.8,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toContain('축하');
    });

    it('adds concise response instruction for tired emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'TIRED',
        intensity: 6,
        confidence: 0.7,
        rawScore: -0.3,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toContain('간결');
      expect(adjusted).toContain('휴식');
    });

    it('adds calm instruction for stressed emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'STRESSED',
        intensity: 7,
        confidence: 0.75,
        rawScore: -0.5,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toContain('차분');
      expect(adjusted).toContain('단계별');
    });

    it('returns base prompt for neutral emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'NEUTRAL',
        intensity: 5,
        confidence: 0.5,
        rawScore: 0,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toBe(basePrompt);
    });

    it('returns base prompt for low intensity emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'FRUSTRATED',
        intensity: 3,
        confidence: 0.4,
        rawScore: -0.2,
        analysisMethod: 'rule_based',
      };

      const adjusted = buildEmotionAdjustedPrompt(basePrompt, emotion);
      expect(adjusted).toBe(basePrompt);
    });
  });

  describe('shouldAdjustResponse', () => {
    it('returns true for high intensity non-neutral emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'FRUSTRATED',
        intensity: 7,
        confidence: 0.8,
        rawScore: -0.6,
        analysisMethod: 'rule_based',
      };

      expect(shouldAdjustResponse(emotion)).toBe(true);
    });

    it('returns false for neutral emotion with low intensity', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'NEUTRAL',
        intensity: 5,
        confidence: 0.5,
        rawScore: 0,
        analysisMethod: 'rule_based',
      };

      expect(shouldAdjustResponse(emotion)).toBe(false);
    });

    it('returns false for low confidence emotion', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'FRUSTRATED',
        intensity: 8,
        confidence: 0.2,
        rawScore: -0.7,
        analysisMethod: 'rule_based',
      };

      expect(shouldAdjustResponse(emotion)).toBe(false);
    });

    it('returns true for non-neutral emotion regardless of intensity', () => {
      const emotion: EmotionAnalysisResult = {
        emotionType: 'POSITIVE',
        intensity: 4,
        confidence: 0.6,
        rawScore: 0.3,
        analysisMethod: 'rule_based',
      };

      expect(shouldAdjustResponse(emotion)).toBe(true);
    });
  });
});
