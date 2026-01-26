import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit } from './audit.service.js';

const mockReturning = vi.fn();
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('../../config/database.js', () => ({
  db: {
    insert: () => mockInsert(),
  },
}));

describe('audit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
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

      mockReturning.mockResolvedValueOnce([mockAuditLog]);

      await logAudit({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'conversation',
        resourceId: '550e8400-e29b-41d4-a716-446655440002',
        action: 'delete',
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
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

      mockReturning.mockResolvedValueOnce([mockAuditLog]);

      await logAudit({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'message',
        resourceId: '550e8400-e29b-41d4-a716-446655440003',
        action: 'delete',
        metadata: { conversationId: '550e8400-e29b-41d4-a716-446655440002' },
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        resourceType: 'message',
        resourceId: '550e8400-e29b-41d4-a716-446655440003',
        action: 'delete',
        metadata: { conversationId: '550e8400-e29b-41d4-a716-446655440002' },
      });
    });

    it('DB 저장 실패 시 에러를 던진다', async () => {
      mockReturning.mockResolvedValueOnce([]);

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
