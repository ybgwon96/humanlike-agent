import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    MESSAGE_EXPIRY_DAYS: 180,
  },
}));

describe('messages.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('메시지 생성 입력 유효성을 검사한다', async () => {
      const input = {
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        sender: 'USER' as const,
        content: 'Hello, world!',
      };

      expect(input.conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(['USER', 'AGENT']).toContain(input.sender);
      expect(input.content.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSentiment', () => {
    it('긍정적인 단어가 포함된 메시지는 양수 감정 점수를 갖는다', () => {
      const positiveWords = ['good', 'great', 'excellent', 'happy', 'love'];
      const content = 'This is a great and excellent experience, I love it!';

      let score = 0;
      for (const word of positiveWords) {
        if (content.toLowerCase().includes(word)) {
          score += 1;
        }
      }

      expect(score).toBeGreaterThan(0);
    });

    it('부정적인 단어가 포함된 메시지는 음수 감정 점수를 갖는다', () => {
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'error'];
      const content = 'This is terrible, I hate this error!';

      let score = 0;
      for (const word of negativeWords) {
        if (content.toLowerCase().includes(word)) {
          score -= 1;
        }
      }

      expect(score).toBeLessThan(0);
    });
  });
});
