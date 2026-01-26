import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { conversationsRoutes } from './modules/conversations/conversations.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { contextRoutes } from './modules/context/context.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { audioRoutes } from './modules/audio/audio.routes.js';
import { chatRoutes } from './modules/chat/index.js';
import { ttsRoutes } from './modules/tts/index.js';

type Variables = {
  requestId: string;
};

export function createApp(): Hono<{ Variables: Variables }> {
  const app = new Hono<{ Variables: Variables }>();

  app.use('*', cors());
  app.use('*', secureHeaders());
  app.use('*', timing());
  app.use('*', loggerMiddleware);

  app.onError(errorHandler);

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  );

  const api = new Hono<{ Variables: Variables }>();

  api.route('/users', usersRoutes);
  api.route('/messages', messagesRoutes);
  api.route('/conversations', conversationsRoutes);
  api.route('/search', searchRoutes);
  api.route('/context', contextRoutes);
  api.route('/audio', audioRoutes);
  api.route('/chat', chatRoutes);
  api.route('/tts', ttsRoutes);

  app.route('/api/v1', api);

  return app;
}
