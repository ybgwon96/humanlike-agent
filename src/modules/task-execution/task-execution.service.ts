import type {
  ExecuteTaskInput,
  ExecuteTaskResult,
  ApproveTaskInput,
  RollbackResult,
  TaskStatusResponse,
  ExecutionSummary,
  ApprovalSummary,
} from './task-execution.types.js';
import * as repository from './task-execution.repository.js';
import { getAgentById, getTaskById } from '../trust-score/trust-score.repository.js';
import { checkPermission } from '../trust-score/autonomy-evaluator.js';

const APPROVAL_EXPIRY_HOURS = 24;

export async function executeTask(input: ExecuteTaskInput): Promise<ExecuteTaskResult> {
  const { taskId, agentId, payload } = input;

  const [agent, task] = await Promise.all([getAgentById(agentId), getTaskById(taskId)]);

  if (agent === null) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  if (task === null) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const hasPermission = checkPermission(task.requiresLevel, agent.autonomyLevel);

  if (!hasPermission) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + APPROVAL_EXPIRY_HOURS);

    const approvalRequest = await repository.createApprovalRequest({
      taskId,
      agentId,
      requestedLevel: task.requiresLevel,
      agentLevel: agent.autonomyLevel,
      status: 'PENDING',
      reason: `Agent level ${agent.autonomyLevel} is insufficient for task requiring level ${task.requiresLevel}`,
      expiresAt,
    });

    return {
      executionId: '',
      status: 'PENDING',
      approvalRequired: true,
      approvalRequestId: approvalRequest.id,
    };
  }

  const execution = await repository.createExecution({
    taskId,
    agentId,
    status: 'EXECUTING',
    startedAt: new Date(),
    reversible: false,
  });

  try {
    const result = await performTaskExecution(taskId, payload);

    const completedAt = new Date();
    const executionTimeMs = completedAt.getTime() - execution.startedAt!.getTime();

    await repository.updateExecution(execution.id, {
      status: 'COMPLETED',
      completedAt,
      executionTimeMs,
      output: result.output,
      reversible: result.reversible,
      rollbackInfo: result.rollbackInfo,
    });

    return {
      executionId: execution.id,
      status: 'COMPLETED',
      approvalRequired: false,
      output: result.output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const completedAt = new Date();
    const executionTimeMs = completedAt.getTime() - execution.startedAt!.getTime();

    await repository.updateExecution(execution.id, {
      status: 'FAILED',
      completedAt,
      executionTimeMs,
      errorMessage,
    });

    return {
      executionId: execution.id,
      status: 'FAILED',
      approvalRequired: false,
    };
  }
}

export async function approveTask(input: ApproveTaskInput): Promise<ExecuteTaskResult> {
  const { approvalRequestId, approvedBy } = input;

  const approvalRequest = await repository.getApprovalRequestById(approvalRequestId);

  if (approvalRequest === null) {
    throw new Error(`Approval request not found: ${approvalRequestId}`);
  }

  if (approvalRequest.status !== 'PENDING') {
    throw new Error(`Approval request is not pending: ${approvalRequest.status}`);
  }

  if (new Date() > approvalRequest.expiresAt) {
    await repository.updateApprovalRequest(approvalRequestId, { status: 'EXPIRED' });
    throw new Error('Approval request has expired');
  }

  await repository.updateApprovalRequest(approvalRequestId, {
    status: 'APPROVED',
    approvedBy,
    approvedAt: new Date(),
  });

  const execution = await repository.createExecution({
    taskId: approvalRequest.taskId,
    agentId: approvalRequest.agentId,
    status: 'EXECUTING',
    startedAt: new Date(),
    reversible: false,
  });

  try {
    const result = await performTaskExecution(approvalRequest.taskId);

    const completedAt = new Date();
    const executionTimeMs = completedAt.getTime() - execution.startedAt!.getTime();

    await repository.updateExecution(execution.id, {
      status: 'COMPLETED',
      completedAt,
      executionTimeMs,
      output: result.output,
      reversible: result.reversible,
      rollbackInfo: result.rollbackInfo,
    });

    return {
      executionId: execution.id,
      status: 'COMPLETED',
      approvalRequired: false,
      output: result.output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const completedAt = new Date();
    const executionTimeMs = completedAt.getTime() - execution.startedAt!.getTime();

    await repository.updateExecution(execution.id, {
      status: 'FAILED',
      completedAt,
      executionTimeMs,
      errorMessage,
    });

    return {
      executionId: execution.id,
      status: 'FAILED',
      approvalRequired: false,
    };
  }
}

export async function rejectApproval(approvalRequestId: string): Promise<void> {
  const approvalRequest = await repository.getApprovalRequestById(approvalRequestId);

  if (approvalRequest === null) {
    throw new Error(`Approval request not found: ${approvalRequestId}`);
  }

  if (approvalRequest.status !== 'PENDING') {
    throw new Error(`Approval request is not pending: ${approvalRequest.status}`);
  }

  await repository.updateApprovalRequest(approvalRequestId, {
    status: 'REJECTED',
  });
}

export async function rollbackTask(executionId: string): Promise<RollbackResult> {
  const execution = await repository.getExecutionById(executionId);

  if (execution === null) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  if (execution.status !== 'COMPLETED') {
    return {
      success: false,
      message: `Cannot rollback execution with status: ${execution.status}`,
    };
  }

  if (!execution.reversible) {
    return {
      success: false,
      message: 'This execution is not reversible',
    };
  }

  const rollbackInfo = execution.rollbackInfo;
  if (rollbackInfo === null || !rollbackInfo.canRollback) {
    return {
      success: false,
      message: 'No rollback information available',
    };
  }

  if (rollbackInfo.rollbackExpiresAt !== undefined) {
    const expiresAt = new Date(rollbackInfo.rollbackExpiresAt);
    if (new Date() > expiresAt) {
      return {
        success: false,
        message: 'Rollback window has expired',
      };
    }
  }

  try {
    await performRollback(execution.taskId, rollbackInfo.rollbackData);

    await repository.updateExecution(executionId, {
      status: 'ROLLED_BACK',
    });

    return {
      success: true,
      message: 'Rollback completed successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Rollback failed: ${errorMessage}`,
    };
  }
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const [executions, pendingApproval] = await Promise.all([
    repository.getExecutionsByTask(taskId),
    repository.getPendingApproval(taskId),
  ]);

  const executionSummaries: ExecutionSummary[] = executions.map((e) => ({
    id: e.id,
    status: e.status,
    startedAt: e.startedAt?.toISOString() ?? null,
    completedAt: e.completedAt?.toISOString() ?? null,
    executionTimeMs: e.executionTimeMs,
    reversible: e.reversible,
    errorMessage: e.errorMessage,
  }));

  const approvalSummary: ApprovalSummary | null = pendingApproval
    ? {
        id: pendingApproval.id,
        requestedLevel: pendingApproval.requestedLevel,
        agentLevel: pendingApproval.agentLevel,
        status: pendingApproval.status,
        reason: pendingApproval.reason,
        expiresAt: pendingApproval.expiresAt.toISOString(),
      }
    : null;

  const latestExecution = executions[0];
  const currentStatus = latestExecution?.status ?? null;

  return {
    taskId,
    currentStatus,
    executions: executionSummaries,
    pendingApproval: approvalSummary,
  };
}

interface TaskExecutionResult {
  output: Record<string, unknown>;
  reversible: boolean;
  rollbackInfo?: {
    canRollback: boolean;
    rollbackData?: Record<string, unknown>;
    rollbackExpiresAt?: string;
  };
}

async function performTaskExecution(
  taskId: string,
  payload?: Record<string, unknown>
): Promise<TaskExecutionResult> {
  // TODO: Implement actual task execution logic based on task type
  // This is a placeholder that simulates task execution
  return {
    output: {
      taskId,
      payload,
      executedAt: new Date().toISOString(),
      result: 'Task executed successfully',
    },
    reversible: false,
  };
}

async function performRollback(
  _taskId: string,
  _rollbackData?: Record<string, unknown>
): Promise<void> {
  // Actual rollback logic will be implemented based on task type
}
