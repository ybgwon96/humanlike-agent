import { eq, and, desc, gt, lt } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  taskExecutions,
  approvalRequests,
  type TaskExecution,
  type NewTaskExecution,
  type ApprovalRequest,
  type NewApprovalRequest,
  type ApprovalStatus,
} from '../../db/schema/task-executions.js';

export async function createExecution(data: NewTaskExecution): Promise<TaskExecution> {
  const [execution] = await db.insert(taskExecutions).values(data).returning();

  if (execution === undefined) {
    throw new Error('Failed to create task execution');
  }

  return execution;
}

export async function updateExecution(
  id: string,
  data: Partial<Omit<TaskExecution, 'id' | 'taskId' | 'agentId' | 'createdAt'>>
): Promise<TaskExecution | null> {
  const [execution] = await db
    .update(taskExecutions)
    .set(data)
    .where(eq(taskExecutions.id, id))
    .returning();

  return execution ?? null;
}

export async function getExecutionById(id: string): Promise<TaskExecution | null> {
  const [execution] = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.id, id))
    .limit(1);

  return execution ?? null;
}

export async function getExecutionsByTask(taskId: string): Promise<TaskExecution[]> {
  return db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, taskId))
    .orderBy(desc(taskExecutions.createdAt));
}

export async function getLatestExecution(taskId: string): Promise<TaskExecution | null> {
  const [execution] = await db
    .select()
    .from(taskExecutions)
    .where(eq(taskExecutions.taskId, taskId))
    .orderBy(desc(taskExecutions.createdAt))
    .limit(1);

  return execution ?? null;
}

export async function createApprovalRequest(data: NewApprovalRequest): Promise<ApprovalRequest> {
  const [request] = await db.insert(approvalRequests).values(data).returning();

  if (request === undefined) {
    throw new Error('Failed to create approval request');
  }

  return request;
}

export async function updateApprovalRequest(
  id: string,
  data: Partial<Omit<ApprovalRequest, 'id' | 'taskId' | 'agentId' | 'createdAt'>>
): Promise<ApprovalRequest | null> {
  const [request] = await db
    .update(approvalRequests)
    .set(data)
    .where(eq(approvalRequests.id, id))
    .returning();

  return request ?? null;
}

export async function getApprovalRequestById(id: string): Promise<ApprovalRequest | null> {
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, id))
    .limit(1);

  return request ?? null;
}

export async function getPendingApproval(taskId: string): Promise<ApprovalRequest | null> {
  const now = new Date();
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.taskId, taskId),
        eq(approvalRequests.status, 'PENDING'),
        gt(approvalRequests.expiresAt, now)
      )
    )
    .orderBy(desc(approvalRequests.createdAt))
    .limit(1);

  return request ?? null;
}

export async function expirePendingApprovals(taskId: string): Promise<void> {
  const now = new Date();
  await db
    .update(approvalRequests)
    .set({ status: 'EXPIRED' })
    .where(
      and(
        eq(approvalRequests.taskId, taskId),
        eq(approvalRequests.status, 'PENDING'),
        lt(approvalRequests.expiresAt, now)
      )
    );
}

export async function getApprovalsByAgent(
  agentId: string,
  status?: ApprovalStatus
): Promise<ApprovalRequest[]> {
  const conditions = [eq(approvalRequests.agentId, agentId)];

  if (status !== undefined) {
    conditions.push(eq(approvalRequests.status, status));
  }

  return db
    .select()
    .from(approvalRequests)
    .where(and(...conditions))
    .orderBy(desc(approvalRequests.createdAt));
}
