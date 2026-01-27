import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as trustScoreService from './trust-score.service.js';
import {
  createTaskSchema,
  taskFeedbackSchema,
  completeTaskSchema,
  agentIdParamSchema,
  taskIdParamSchema,
  userIdParamSchema,
} from './trust-score.schemas.js';
import type { SingleResponse } from '../../types/api.js';
import type { AgentTask } from '../../db/schema/agent-tasks.js';
import type { Agent } from '../../db/schema/agents.js';
import type { AgentTrustScoreResponse, LevelChangeResult } from './trust-score.types.js';

export const trustScoreRoutes = new Hono();

trustScoreRoutes.get(
  '/users/:userId/agent',
  zValidator('param', userIdParamSchema),
  async (c) => {
    const { userId } = c.req.valid('param');
    const agent = await trustScoreService.getOrCreateAgent(userId);

    return c.json<SingleResponse<Agent>>({
      success: true,
      data: agent,
    });
  }
);

trustScoreRoutes.get(
  '/agents/:agentId',
  zValidator('param', agentIdParamSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const agent = await trustScoreService.getAgentById(agentId);

    return c.json<SingleResponse<Agent>>({
      success: true,
      data: agent,
    });
  }
);

trustScoreRoutes.post(
  '/agents/:agentId/tasks',
  zValidator('param', agentIdParamSchema),
  zValidator('json', createTaskSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const body = c.req.valid('json');

    const { task, permissionGranted } = await trustScoreService.createTask(agentId, body);

    return c.json<SingleResponse<AgentTask & { permissionGranted: boolean }>>(
      {
        success: true,
        data: { ...task, permissionGranted },
      },
      201
    );
  }
);

trustScoreRoutes.get(
  '/agents/:agentId/tasks',
  zValidator('param', agentIdParamSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const tasks = await trustScoreService.getTasksByAgent(agentId);

    return c.json<SingleResponse<AgentTask[]>>({
      success: true,
      data: tasks,
    });
  }
);

trustScoreRoutes.put(
  '/tasks/:taskId/complete',
  zValidator('param', taskIdParamSchema),
  zValidator('json', completeTaskSchema),
  async (c) => {
    const { taskId } = c.req.valid('param');
    const body = c.req.valid('json');

    const task = await trustScoreService.completeTask(
      taskId,
      body.status === 'COMPLETED',
      body.outcome,
      body.errorMessage
    );

    return c.json<SingleResponse<AgentTask>>({
      success: true,
      data: task,
    });
  }
);

trustScoreRoutes.put(
  '/tasks/:taskId/feedback',
  zValidator('param', taskIdParamSchema),
  zValidator('json', taskFeedbackSchema),
  async (c) => {
    const { taskId } = c.req.valid('param');
    const body = c.req.valid('json');

    const task = await trustScoreService.submitTaskFeedback(taskId, body);

    return c.json<SingleResponse<AgentTask>>({
      success: true,
      data: task,
    });
  }
);

trustScoreRoutes.get(
  '/agents/:agentId/trust-score',
  zValidator('param', agentIdParamSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const trustScore = await trustScoreService.getTrustScore(agentId);

    return c.json<SingleResponse<AgentTrustScoreResponse>>({
      success: true,
      data: trustScore,
    });
  }
);

trustScoreRoutes.post(
  '/agents/:agentId/evaluate-promotion',
  zValidator('param', agentIdParamSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const result = await trustScoreService.evaluateAndUpdateLevel(agentId);

    return c.json<SingleResponse<LevelChangeResult>>({
      success: true,
      data: result,
    });
  }
);
