import type { ExecutionStatus, ApprovalStatus, RollbackInfo } from '../../db/schema/task-executions.js';

export type { ExecutionStatus, ApprovalStatus, RollbackInfo };

export interface ExecuteTaskInput {
  taskId: string;
  agentId: string;
  payload?: Record<string, unknown>;
}

export interface ExecuteTaskResult {
  executionId: string;
  status: ExecutionStatus;
  approvalRequired: boolean;
  approvalRequestId?: string;
  output?: Record<string, unknown>;
}

export interface ApproveTaskInput {
  approvalRequestId: string;
  approvedBy: string;
}

export interface RollbackTaskInput {
  executionId: string;
}

export interface RollbackResult {
  success: boolean;
  message?: string;
}

export interface TaskStatusResponse {
  taskId: string;
  currentStatus: ExecutionStatus | null;
  executions: ExecutionSummary[];
  pendingApproval: ApprovalSummary | null;
}

export interface ExecutionSummary {
  id: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  executionTimeMs: number | null;
  reversible: boolean;
  errorMessage: string | null;
}

export interface ApprovalSummary {
  id: string;
  requestedLevel: number;
  agentLevel: number;
  status: ApprovalStatus;
  reason: string | null;
  expiresAt: string;
}
