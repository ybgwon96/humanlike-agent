import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as personalityService from './personality.service.js';
import { updateUserAdjustmentSchema, validateResponseSchema } from './personality.schemas.js';

export const personalityRoutes = new Hono();

personalityRoutes.get('/', async (c) => {
  const profile = await personalityService.getDefaultPersonality();
  return c.json(profile);
});

personalityRoutes.get('/users/:userId/adjustments', async (c) => {
  const { userId } = c.req.param();
  const adjustments = await personalityService.getUserPersonalityAdjustments(userId);

  if (adjustments === null) {
    return c.json({
      message: 'No adjustments found for this user',
      adjustments: null,
    });
  }

  return c.json(adjustments);
});

personalityRoutes.put(
  '/users/:userId/adjustments',
  zValidator('json', updateUserAdjustmentSchema),
  async (c) => {
    const { userId } = c.req.param();
    const body = c.req.valid('json');

    const adjustments = await personalityService.updateUserPersonalityAdjustments(userId, body);
    return c.json(adjustments);
  }
);

personalityRoutes.post(
  '/responses/validate',
  zValidator('json', validateResponseSchema),
  async (c) => {
    const body = c.req.valid('json');
    const result = await personalityService.validateResponseText(body);
    return c.json(result);
  }
);
