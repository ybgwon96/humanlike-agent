import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { agents, type Agent, type NewAgent } from '../../db/schema/agents.js';
import {
  agentTasks,
  type AgentTask,
  type NewAgentTask,
  type TaskStatus,
} from '../../db/schema/agent-tasks.js';

export async function createAgent(data: NewAgent): Promise<Agent> {
  const [agent] = await db.insert(agents).values(data).returning();

  if (agent === undefined) {
    throw new Error('Failed to create agent');
  }

  return agent;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);

  return agent ?? null;
}

export async function getAgentByUserId(userId: string): Promise<Agent | null> {
  const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);

  return agent ?? null;
}

export async function updateAgent(
  id: string,
  data: Partial<Omit<Agent, 'id' | 'userId' | 'createdAt'>>
): Promise<Agent | null> {
  const [agent] = await db
    .update(agents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return agent ?? null;
}

export async function createTask(data: NewAgentTask): Promise<AgentTask> {
  const [task] = await db.insert(agentTasks).values(data).returning();

  if (task === undefined) {
    throw new Error('Failed to create task');
  }

  return task;
}

export async function getTaskById(id: string): Promise<AgentTask | null> {
  const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, id)).limit(1);

  return task ?? null;
}

export async function getTasksByAgentId(
  agentId: string,
  options?: { limit?: number; status?: TaskStatus }
): Promise<AgentTask[]> {
  const conditions = [eq(agentTasks.agentId, agentId)];

  if (options?.status !== undefined) {
    conditions.push(eq(agentTasks.status, options.status));
  }

  const query = db
    .select()
    .from(agentTasks)
    .where(and(...conditions))
    .orderBy(desc(agentTasks.createdAt));

  if (options?.limit !== undefined) {
    return query.limit(options.limit);
  }

  return query;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<AgentTask, 'id' | 'agentId' | 'createdAt'>>
): Promise<AgentTask | null> {
  const [task] = await db.update(agentTasks).set(data).where(eq(agentTasks.id, id)).returning();

  return task ?? null;
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  positiveFeedback: number;
  neutralFeedback: number;
  negativeFeedback: number;
}

export async function getTaskMetrics(agentId: string): Promise<TaskMetrics> {
  const tasks = await db.select().from(agentTasks).where(eq(agentTasks.agentId, agentId));

  const metrics: TaskMetrics = {
    totalTasks: tasks.length,
    completedTasks: 0,
    failedTasks: 0,
    positiveFeedback: 0,
    neutralFeedback: 0,
    negativeFeedback: 0,
  };

  for (const task of tasks) {
    if (task.status === 'COMPLETED') {
      metrics.completedTasks++;
    } else if (task.status === 'FAILED') {
      metrics.failedTasks++;
    }

    if (task.userFeedback === 'POSITIVE') {
      metrics.positiveFeedback++;
    } else if (task.userFeedback === 'NEUTRAL') {
      metrics.neutralFeedback++;
    } else if (task.userFeedback === 'NEGATIVE') {
      metrics.negativeFeedback++;
    }
  }

  return metrics;
}

export async function getRecentTasksWithFeedback(
  agentId: string,
  limit: number = 50
): Promise<AgentTask[]> {
  return db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.agentId, agentId), sql`${agentTasks.userFeedback} IS NOT NULL`))
    .orderBy(desc(agentTasks.createdAt))
    .limit(limit);
}

export async function incrementAgentTaskCounts(
  agentId: string,
  success: boolean
): Promise<Agent | null> {
  const agent = await getAgentById(agentId);
  if (agent === null) {
    return null;
  }

  const updates: Partial<Agent> = {
    totalTasks: agent.totalTasks + 1,
  };

  if (success) {
    updates.successfulTasks = agent.successfulTasks + 1;
    updates.consecutiveFailures = 0;
  } else {
    updates.failedTasks = agent.failedTasks + 1;
    updates.consecutiveFailures = agent.consecutiveFailures + 1;
  }

  return updateAgent(agentId, updates);
}
