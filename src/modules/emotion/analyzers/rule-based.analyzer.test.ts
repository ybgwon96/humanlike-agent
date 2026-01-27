import { describe, it, expect } from 'vitest';
import { analyzeEmotion, getLegacySentimentScore } from './rule-based.analyzer.js';

describe('rule-based.analyzer', () => {
  describe('analyzeEmotion', () => {
    it('detects frustrated emotion with high intensity', () => {
      const result = analyzeEmotion('진짜 짜증나!! 왜 안돼!?');
      expect(result.emotionType).toBe('FRUSTRATED');
      expect(result.intensity).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects excited emotion', () => {
      const result = analyzeEmotion('대박! 드디어 성공했어! 최고!!');
      expect(result.emotionType).toBe('EXCITED');
      expect(result.intensity).toBeGreaterThanOrEqual(5);
    });

    it('detects tired emotion', () => {
      const result = analyzeEmotion('너무 지쳤어... 피곤해');
      expect(result.emotionType).toBe('TIRED');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects stressed emotion', () => {
      const result = analyzeEmotion('마감이 급해서 스트레스 받아');
      expect(result.emotionType).toBe('STRESSED');
    });

    it('detects positive emotion', () => {
      const result = analyzeEmotion('정말 감사합니다! 너무 좋아요');
      expect(result.emotionType).toBe('POSITIVE');
      expect(result.rawScore).toBeGreaterThan(0);
    });

    it('detects negative emotion', () => {
      const result = analyzeEmotion('문제가 있어요. 오류가 발생했습니다');
      expect(result.emotionType).toBe('NEGATIVE');
      expect(result.rawScore).toBeLessThan(0);
    });

    it('returns neutral for ambiguous content', () => {
      const result = analyzeEmotion('안녕하세요');
      expect(result.emotionType).toBe('NEUTRAL');
      expect(result.intensity).toBe(5);
    });

    it('includes matched keywords in metadata', () => {
      const result = analyzeEmotion('Thank you so much!');
      expect(result.metadata?.matchedKeywords).toContain('thank');
    });

    it('considers caps ratio for intensity', () => {
      const lowerCase = analyzeEmotion('frustrated');
      const upperCase = analyzeEmotion('FRUSTRATED!!!');
      expect(upperCase.intensity).toBeGreaterThanOrEqual(lowerCase.intensity);
    });

    it('handles mixed emotions by picking strongest', () => {
      const result = analyzeEmotion('짜증나지만 드디어 끝났어!');
      expect(['FRUSTRATED', 'EXCITED']).toContain(result.emotionType);
    });
  });

  describe('getLegacySentimentScore', () => {
    it('returns positive score for positive content', () => {
      const score = getLegacySentimentScore('great job! excellent work!');
      expect(score).toBeGreaterThan(0);
    });

    it('returns negative score for negative content', () => {
      const score = getLegacySentimentScore('terrible error, bad problem');
      expect(score).toBeLessThan(0);
    });

    it('returns 0 for neutral content', () => {
      const score = getLegacySentimentScore('hello world');
      expect(score).toBe(0);
    });

    it('returns score within -1 to 1 range', () => {
      const positive = getLegacySentimentScore('good great excellent amazing wonderful');
      const negative = getLegacySentimentScore('bad terrible awful hate dislike');
      expect(positive).toBeLessThanOrEqual(1);
      expect(positive).toBeGreaterThanOrEqual(-1);
      expect(negative).toBeLessThanOrEqual(1);
      expect(negative).toBeGreaterThanOrEqual(-1);
    });
  });
});
