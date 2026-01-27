import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as proactiveService from './proactive.service.js';
import {
  evaluateEngagementSchema,
  feedbackSchema,
  updatePreferencesSchema,
  pauseEngagementSchema,
} from './proactive.schemas.js';

export const proactiveRoutes = new Hono();

proactiveRoutes.post(
  '/agent/proactive-engagement/evaluate',
  zValidator('json', evaluateEngagementSchema),
  async (c) => {
    const { userId } = c.req.valid('json');
    const result = await proactiveService.evaluateAndEngageEnhanced(userId);
    return c.json(result);
  }
);

proactiveRoutes.post(
  '/agent/proactive-engagement/feedback',
  zValidator('json', feedbackSchema.extend({ userId: evaluateEngagementSchema.shape.userId })),
  async (c) => {
    const { userId, ...feedback } = c.req.valid('json');
    await proactiveService.submitFeedback(userId, feedback);
    return c.json({ success: true });
  }
);

proactiveRoutes.get('/users/:userId/engagement-patterns', async (c) => {
  const userId = c.req.param('userId');
  const result = await proactiveService.getEngagementPattern(userId);
  return c.json(result);
});

proactiveRoutes.patch(
  '/users/:userId/engagement-preferences',
  zValidator('json', updatePreferencesSchema),
  async (c) => {
    const userId = c.req.param('userId');
    const input = c.req.valid('json');
    const result = await proactiveService.updatePreferences(userId, input);
    return c.json(result);
  }
);

proactiveRoutes.post(
  '/users/:userId/engagement-pause',
  zValidator('json', pauseEngagementSchema),
  async (c) => {
    const userId = c.req.param('userId');
    const { durationHours } = c.req.valid('json');
    await proactiveService.pauseEngagement(userId, durationHours);
    return c.json({ success: true, pausedUntil: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() });
  }
);

proactiveRoutes.post('/users/:userId/engagement-resume', async (c) => {
  const userId = c.req.param('userId');
  await proactiveService.resumeEngagement(userId);
  return c.json({ success: true });
});

proactiveRoutes.get('/users/:userId/engagement-insights', async (c) => {
  const userId = c.req.param('userId');
  const insights = await proactiveService.getInsights(userId);
  return c.json(insights);
});

proactiveRoutes.post('/users/:userId/process-deferred', async (c) => {
  const userId = c.req.param('userId');
  const deliveredCount = await proactiveService.processDeferredMessages(userId);
  return c.json({ success: true, deliveredCount });
});
