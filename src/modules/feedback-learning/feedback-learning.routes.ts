import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as feedbackLearningService from './feedback-learning.service.js';
import {
  submitFeedbackSchema,
  getAdjustmentsQuerySchema,
  revertAdjustmentSchema,
  getPreferencesQuerySchema,
  runLearningSchema,
} from './feedback-learning.schemas.js';
import type { SingleResponse, PaginatedResponse } from '../../types/api.js';
import type { AdjustmentSummary, LearningResult, PreferencesResponse } from './feedback-learning.types.js';

export const feedbackLearningRoutes = new Hono();

feedbackLearningRoutes.post(
  '/feedback',
  zValidator('json', submitFeedbackSchema),
  async (c) => {
    const body = c.req.valid('json');
    const event = await feedbackLearningService.submitFeedback(body);

    return c.json<SingleResponse<typeof event>>(
      {
        success: true,
        data: event,
      },
      201
    );
  }
);

feedbackLearningRoutes.get(
  '/learning/adjustments',
  zValidator('query', getAdjustmentsQuerySchema),
  async (c) => {
    const { userId, limit } = c.req.valid('query');
    const adjustments = await feedbackLearningService.getAdjustments(userId, limit);

    return c.json<PaginatedResponse<AdjustmentSummary>>({
      success: true,
      data: adjustments,
      pagination: {
        page: 1,
        limit,
        total: adjustments.length,
        totalPages: 1,
      },
    });
  }
);

feedbackLearningRoutes.post(
  '/learning/revert',
  zValidator('json', revertAdjustmentSchema),
  async (c) => {
    const userId = c.req.header('x-user-id');

    if (!userId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID header is required',
          },
        },
        401
      );
    }

    const { adjustmentId } = c.req.valid('json');

    await feedbackLearningService.revertAdjustment(adjustmentId, userId);

    return c.json<SingleResponse<{ reverted: boolean }>>({
      success: true,
      data: { reverted: true },
    });
  }
);

feedbackLearningRoutes.get(
  '/preferences',
  zValidator('query', getPreferencesQuerySchema),
  async (c) => {
    const { userId } = c.req.valid('query');
    const preferences = await feedbackLearningService.getPreferences(userId);

    return c.json<SingleResponse<PreferencesResponse>>({
      success: true,
      data: preferences,
    });
  }
);

feedbackLearningRoutes.post(
  '/learning/run',
  zValidator('json', runLearningSchema),
  async (c) => {
    const { userId } = c.req.valid('json');
    const result = await feedbackLearningService.runDailyLearning(userId);

    return c.json<SingleResponse<LearningResult>>({
      success: true,
      data: result,
    });
  }
);
