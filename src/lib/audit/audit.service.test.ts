import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit } from './audit.service.js';

vi.mock('../../config/database.js', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

const mockDb = vi.mocked(await import('../../config/database.js')).db;

describe('audit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAudit', () => {
    it('대화 삭제 시 audit log를 생성한다', async () => {
      const mockAuditLog = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'conversation' as const,
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        action: 'delete' as const,
        metadata: null,
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([mockAuditLog]);

      await logAudit({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'conversation',
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        action: 'delete',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'conversation',
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        action: 'delete',
        metadata: undefined,
      });
    });

    it('메시지 삭제 시 metadata와 함께 audit log를 생성한다', async () => {
      const mockAuditLog = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'message' as const,
        resourceId: '550e8400-e29b-41d4-a716-446655440003',
        action: 'delete' as const,
        metadata: { conversationId: '550e8400-e29b-41d4-a716-446655440002' },
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValueOnce([mockAuditLog]);

      await logAudit({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'message',
        resourceId: '550e8400-e29b-41d4-a716-446655440003',
        action: 'delete',
        metadata: { conversationId: '550e8400-e29b-41d4-a716-446655440002' },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'message',
        resourceId: '550e8400-e29b-41d4-a716-446655440003',
        action: 'delete',
        metadata: { conversationId: '550e8400-e29b-41d4-a716-446655440002' },
      });
    });

    it('DB 저장 실패 시 에러를 던진다', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        logAudit({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          resourceType: 'conversation',
          resourceId: '550e8400-e29b-41d4-a716-446655440002',
          action: 'delete',
        })
      ).rejects.toThrow('Failed to create audit log');
    });
  });
});
