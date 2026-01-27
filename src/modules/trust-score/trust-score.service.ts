import { HTTPException } from 'hono/http-exception';
import type { Agent } from '../../db/schema/agents.js';
import type { AgentTask } from '../../db/schema/agent-tasks.js';
import * as repository from './trust-score.repository.js';
import { calculateTrustScore, computeMetricsFromTasks, getDefaultMetrics } from './trust-calculator.js';
import {
  evaluatePromotion,
  evaluateDemotion,
  checkPermission,
} from './autonomy-evaluator.js';
import type {
  CreateTaskInput,
  TaskFeedbackInput,
  AgentTrustScoreResponse,
  LevelChangeResult,
  TrustMetrics,
  AgentStats,
} from './trust-score.types.js';

export async function getOrCreateAgent(userId: string): Promise<Agent> {
  const existingAgent = await repository.getAgentByUserId(userId);
  if (existingAgent !== null) {
    return existingAgent;
  }

  return repository.createAgent({
    userId,
    name: 'Default Agent',
    autonomyLevel: 1,
    trustScore: 0,
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    consecutiveFailures: 0,
  });
}

export async function getAgentById(agentId: string): Promise<Agent> {
  const agent = await repository.getAgentById(agentId);
  if (agent === null) {
    throw new HTTPException(404, { message: 'Agent not found' });
  }
  return agent;
}

export async function createTask(
  agentId: string,
  input: CreateTaskInput
): Promise<{ task: AgentTask; permissionGranted: boolean }> {
  const agent = await getAgentById(agentId);

  const hasPermission = checkPermission(input.requiresLevel, agent.autonomyLevel);

  if (!hasPermission) {
    throw new HTTPException(403, {
      message: JSON.stringify({
        error: 'insufficient_permissions',
        agentLevel: agent.autonomyLevel,
        requiresLevel: input.requiresLevel,
      }),
    });
  }

  const task = await repository.createTask({
    agentId,
    type: input.type,
    requiresLevel: input.requiresLevel,
    description: input.description,
    status: 'PENDING',
  });

  return { task, permissionGranted: true };
}

export async function completeTask(
  taskId: string,
  success: boolean,
  outcome?: Record<string, unknown>,
  errorMessage?: string
): Promise<AgentTask> {
  const task = await repository.getTaskById(taskId);
  if (task === null) {
    throw new HTTPException(404, { message: 'Task not found' });
  }

  if (task.status !== 'PENDING' && task.status !== 'APPROVED') {
    throw new HTTPException(400, { message: 'Task is already completed or rejected' });
  }

  const updatedTask = await repository.updateTask(taskId, {
    status: success ? 'COMPLETED' : 'FAILED',
    completedAt: new Date(),
    outcome: outcome ?? null,
    errorMessage: errorMessage ?? null,
  });

  if (updatedTask === null) {
    throw new HTTPException(500, { message: 'Failed to update task' });
  }

  await repository.incrementAgentTaskCounts(task.agentId, success);

  return updatedTask;
}

export async function submitTaskFeedback(
  taskId: string,
  input: TaskFeedbackInput
): Promise<AgentTask> {
  const task = await repository.getTaskById(taskId);
  if (task === null) {
    throw new HTTPException(404, { message: 'Task not found' });
  }

  const updatedTask = await repository.updateTask(taskId, {
    userFeedback: input.feedback,
    outcome: input.outcome ?? task.outcome,
    errorMessage: input.errorMessage ?? task.errorMessage,
  });

  if (updatedTask === null) {
    throw new HTTPException(500, { message: 'Failed to update task feedback' });
  }

  return updatedTask;
}

export async function getTrustScore(agentId: string): Promise<AgentTrustScoreResponse> {
  const agent = await getAgentById(agentId);
  const tasks = await repository.getRecentTasksWithFeedback(agentId, 100);

  const metrics: TrustMetrics =
    tasks.length > 0 ? computeMetricsFromTasks(tasks) : getDefaultMetrics();

  const trustScore = calculateTrustScore(metrics);

  const stats: AgentStats = {
    totalTasks: agent.totalTasks,
    successfulTasks: agent.successfulTasks,
    failedTasks: agent.failedTasks,
    consecutiveFailures: agent.consecutiveFailures,
    taskSuccessRate:
      agent.totalTasks > 0 ? agent.successfulTasks / agent.totalTasks : 0,
  };

  return {
    agentId: agent.id,
    autonomyLevel: agent.autonomyLevel,
    trustScore,
    metrics,
    stats,
  };
}

export async function evaluateAndUpdateLevel(agentId: string): Promise<LevelChangeResult> {
  const agent = await getAgentById(agentId);
  const { trustScore } = await getTrustScore(agentId);

  await repository.updateAgent(agentId, {
    trustScore,
    lastEvaluation: new Date(),
  });

  const demotionResult = evaluateDemotion(agent, trustScore);
  if (demotionResult.levelChanged) {
    await repository.updateAgent(agentId, {
      autonomyLevel: demotionResult.currentLevel,
      consecutiveFailures: 0,
    });
    return demotionResult;
  }

  const promotionResult = evaluatePromotion(agent);
  if (promotionResult.levelChanged) {
    await repository.updateAgent(agentId, {
      autonomyLevel: promotionResult.currentLevel,
      lastPromotion: new Date(),
    });
    return promotionResult;
  }

  return {
    levelChanged: false,
    previousLevel: agent.autonomyLevel,
    currentLevel: agent.autonomyLevel,
    reason: null,
    notification: null,
  };
}

export async function checkTaskPermission(
  agentId: string,
  requiredLevel: number
): Promise<{ allowed: boolean; agentLevel: number; requiredLevel: number }> {
  const agent = await getAgentById(agentId);
  const allowed = checkPermission(requiredLevel, agent.autonomyLevel);

  return {
    allowed,
    agentLevel: agent.autonomyLevel,
    requiredLevel,
  };
}

export async function getTasksByAgent(
  agentId: string,
  options?: { limit?: number; status?: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'REJECTED' }
): Promise<AgentTask[]> {
  await getAgentById(agentId);
  return repository.getTasksByAgentId(agentId, options);
}
