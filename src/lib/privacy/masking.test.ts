import { describe, it, expect } from 'vitest';
import { maskSensitiveData, getPatternNames } from './masking.js';

describe('masking', () => {
  describe('maskSensitiveData', () => {
    it('이메일 주소를 마스킹한다', () => {
      const input = 'Contact me at user@example.com for details';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('Contact me at [EMAIL] for details');
      expect(result.detectedPatterns).toContain('email');
    });

    it('전화번호를 마스킹한다', () => {
      const input = 'Call me at 010-1234-5678';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('Call me at [PHONE]');
      expect(result.detectedPatterns).toContain('phone');
    });

    it('신용카드 번호를 마스킹한다', () => {
      const input = 'Card number: 1234 5678 9012 3456';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('Card number: [CREDIT_CARD]');
      expect(result.detectedPatterns).toContain('credit_card');
    });

    it('API 키를 마스킹한다', () => {
      const input = 'My API key is sk_live_1234567890abcdefghij';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('My API key is [API_KEY]');
      expect(result.detectedPatterns).toContain('api_key');
    });

    it('주민등록번호를 마스킹한다', () => {
      const input = '주민번호: 901215-1234567';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('주민번호: [RESIDENT_ID]');
      expect(result.detectedPatterns).toContain('korean_resident_id');
    });

    it('여러 패턴을 동시에 마스킹한다', () => {
      const input = 'Email: test@test.com, Phone: 010-1234-5678';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe('Email: [EMAIL], Phone: [PHONE]');
      expect(result.detectedPatterns).toContain('email');
      expect(result.detectedPatterns).toContain('phone');
    });

    it('민감한 정보가 없는 텍스트는 그대로 반환한다', () => {
      const input = 'Hello, this is a normal message';
      const result = maskSensitiveData(input);

      expect(result.maskedContent).toBe(input);
      expect(result.detectedPatterns).toHaveLength(0);
    });
  });

  describe('getPatternNames', () => {
    it('패턴 이름 목록을 반환한다', () => {
      const names = getPatternNames();

      expect(names).toContain('email');
      expect(names).toContain('phone');
      expect(names).toContain('credit_card');
      expect(names).toContain('api_key');
    });
  });
});
