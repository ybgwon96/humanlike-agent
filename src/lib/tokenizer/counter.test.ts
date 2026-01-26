import { describe, it, expect } from 'vitest';
import { countTokens, truncateToTokenLimit, fitMessagesInTokenLimit } from './counter.js';

describe('tokenizer', () => {
  describe('countTokens', () => {
    it('빈 문자열의 토큰 수를 0으로 반환한다', () => {
      const result = countTokens('');

      expect(result.estimatedTokens).toBe(0);
      expect(result.charCount).toBe(0);
    });

    it('문자열의 토큰 수를 추정한다', () => {
      const input = 'Hello world';
      const result = countTokens(input);

      expect(result.charCount).toBe(11);
      expect(result.estimatedTokens).toBe(3);
    });

    it('긴 텍스트의 토큰 수를 추정한다', () => {
      const input = 'a'.repeat(100);
      const result = countTokens(input);

      expect(result.charCount).toBe(100);
      expect(result.estimatedTokens).toBe(25);
    });
  });

  describe('truncateToTokenLimit', () => {
    it('제한 내의 텍스트는 그대로 반환한다', () => {
      const input = 'Short text';
      const result = truncateToTokenLimit(input, 100);

      expect(result).toBe(input);
    });

    it('제한을 초과하는 텍스트를 자른다', () => {
      const input = 'This is a longer text that should be truncated';
      const result = truncateToTokenLimit(input, 5);

      expect(result.length).toBeLessThan(input.length);
      expect(result.endsWith('...')).toBe(true);
    });

    it('긴 텍스트를 토큰 제한에 맞게 자른다', () => {
      const input = 'Hello world this is a test message for truncation';
      const result = truncateToTokenLimit(input, 3);

      expect(result.length).toBeLessThanOrEqual(15);
    });
  });

  describe('fitMessagesInTokenLimit', () => {
    it('제한 내의 메시지들은 모두 포함한다', () => {
      const messages = ['Hello', 'World', 'Test'];
      const result = fitMessagesInTokenLimit(messages, 100);

      expect(result.messages).toHaveLength(3);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('토큰 제한에 맞게 메시지를 자른다', () => {
      const messages = ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(100)];
      const result = fitMessagesInTokenLimit(messages, 30);

      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.totalTokens).toBeLessThanOrEqual(30);
    });

    it('빈 메시지 배열을 처리한다', () => {
      const result = fitMessagesInTokenLimit([], 100);

      expect(result.messages).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });
  });
});
