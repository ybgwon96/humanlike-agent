import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { executeTaskSchema, approveTaskSchema } from './task-execution.schemas.js';
import * as service from './task-execution.service.js';

type Variables = {
  requestId: string;
};

export const taskExecutionRoutes = new Hono<{ Variables: Variables }>();

// POST /api/v1/tasks/:taskId/execute - Execute a task
taskExecutionRoutes.post(
  '/tasks/:taskId/execute',
  zValidator('json', executeTaskSchema),
  async (c) => {
    const taskId = c.req.param('taskId');
    const body = c.req.valid('json');

    try {
      const result = await service.executeTask({
        taskId,
        agentId: body.agentId,
        payload: body.payload,
      });

      if (result.approvalRequired) {
        return c.json(
          {
            success: false,
            approvalRequired: true,
            approvalRequestId: result.approvalRequestId,
            message: 'Task requires approval due to insufficient permission level',
          },
          403
        );
      }

      return c.json({
        success: true,
        executionId: result.executionId,
        status: result.status,
        approvalRequired: false,
        output: result.output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

// POST /api/v1/tasks/:taskId/approve - Approve a pending task
taskExecutionRoutes.post(
  '/tasks/:taskId/approve',
  zValidator('json', approveTaskSchema),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const result = await service.approveTask({
        approvalRequestId: body.approvalRequestId,
        approvedBy: body.approvedBy,
      });

      return c.json({
        success: true,
        executionId: result.executionId,
        status: result.status,
        output: result.output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

// POST /api/v1/tasks/:taskId/reject - Reject a pending approval
taskExecutionRoutes.post('/tasks/:taskId/reject', async (c) => {
  const approvalRequestId = c.req.query('approvalRequestId');

  if (!approvalRequestId) {
    return c.json({ success: false, error: 'approvalRequestId is required' }, 400);
  }

  try {
    await service.rejectApproval(approvalRequestId);

    return c.json({
      success: true,
      message: 'Approval request rejected',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 400);
  }
});

// POST /api/v1/executions/:executionId/rollback - Rollback an execution
taskExecutionRoutes.post('/executions/:executionId/rollback', async (c) => {
  const executionId = c.req.param('executionId');

  try {
    const result = await service.rollbackTask(executionId);

    if (!result.success) {
      return c.json({ success: false, error: result.message }, 400);
    }

    return c.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 400);
  }
});

// GET /api/v1/tasks/:taskId/status - Get task execution status
taskExecutionRoutes.get('/tasks/:taskId/status', async (c) => {
  const taskId = c.req.param('taskId');

  try {
    const status = await service.getTaskStatus(taskId);

    return c.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 400);
  }
});
