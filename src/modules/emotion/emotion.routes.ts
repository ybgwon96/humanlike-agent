import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  analyzeEmotionParamsSchema,
  getUserEmotionalProfileParamsSchema,
  getUserEmotionalProfileQuerySchema,
} from './emotion.schemas.js';
import { analyzeMessageEmotion, getUserEmotionalProfile } from './emotion.service.js';

export const emotionRoutes = new Hono();

emotionRoutes.post(
  '/messages/:messageId/analyze-emotion',
  zValidator('param', analyzeEmotionParamsSchema),
  async (c) => {
    const { messageId } = c.req.valid('param');
    const analysis = await analyzeMessageEmotion(messageId);
    return c.json(analysis);
  }
);

emotionRoutes.get(
  '/users/:userId/emotional-profile',
  zValidator('param', getUserEmotionalProfileParamsSchema),
  zValidator('query', getUserEmotionalProfileQuerySchema),
  async (c) => {
    const { userId } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const profile = await getUserEmotionalProfile(userId, days);
    return c.json(profile);
  }
);
