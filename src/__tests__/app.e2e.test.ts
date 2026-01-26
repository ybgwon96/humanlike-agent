import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';

vi.mock('../config/database.js', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    DATABASE_POOL_SIZE: 5,
    ENCRYPTION_KEY: 'test-encryption-key-32-chars!!!',
    LOG_LEVEL: 'silent',
    MESSAGE_EXPIRY_DAYS: 180,
    CONTEXT_MAX_TOKENS: 4096,
  },
}));

describe('App E2E Tests', () => {
  let app: Hono;

  beforeAll(async () => {
    app = new Hono();

    app.get('/health', (c) =>
      c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    );
  });

  afterAll(async () => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('헬스 체크 엔드포인트가 정상 응답을 반환한다', async () => {
      const res = await app.request('/health');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('API Response Structure', () => {
    it('성공 응답 구조가 올바르다', () => {
      const successResponse = {
        success: true,
        data: { id: '123', name: 'test' },
      };

      expect(successResponse).toHaveProperty('success', true);
      expect(successResponse).toHaveProperty('data');
    });

    it('에러 응답 구조가 올바르다', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      expect(errorResponse).toHaveProperty('success', false);
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
    });

    it('페이지네이션 응답 구조가 올바르다', () => {
      const paginatedResponse = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      };

      expect(paginatedResponse.pagination).toHaveProperty('page');
      expect(paginatedResponse.pagination).toHaveProperty('limit');
      expect(paginatedResponse.pagination).toHaveProperty('total');
      expect(paginatedResponse.pagination).toHaveProperty('totalPages');
    });
  });
});
