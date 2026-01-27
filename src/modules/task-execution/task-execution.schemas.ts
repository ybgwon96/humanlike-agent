import { z } from 'zod';

export const executeTaskSchema = z.object({
  agentId: z.string().uuid(),
  payload: z.record(z.unknown()).optional(),
});

export const approveTaskSchema = z.object({
  approvalRequestId: z.string().uuid(),
  approvedBy: z.string().uuid(),
});

export const rollbackTaskSchema = z.object({
  executionId: z.string().uuid(),
});

export const taskStatusResponseSchema = z.object({
  taskId: z.string().uuid(),
  currentStatus: z
    .enum(['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK'])
    .nullable(),
  executions: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK']),
      startedAt: z.string().nullable(),
      completedAt: z.string().nullable(),
      executionTimeMs: z.number().nullable(),
      reversible: z.boolean(),
      errorMessage: z.string().nullable(),
    })
  ),
  pendingApproval: z
    .object({
      id: z.string().uuid(),
      requestedLevel: z.number(),
      agentLevel: z.number(),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
      reason: z.string().nullable(),
      expiresAt: z.string(),
    })
    .nullable(),
});

export const executeTaskResultSchema = z.object({
  executionId: z.string().uuid(),
  status: z.enum(['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK']),
  approvalRequired: z.boolean(),
  approvalRequestId: z.string().uuid().optional(),
  output: z.record(z.unknown()).optional(),
});

export type ExecuteTaskBody = z.infer<typeof executeTaskSchema>;
export type ApproveTaskBody = z.infer<typeof approveTaskSchema>;
