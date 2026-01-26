import { pino } from 'pino';
import type { Context, Next } from 'hono';
import { env } from '../config/env.js';

const loggerOptions =
  env.NODE_ENV === 'development'
    ? {
        level: env.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {
        level: env.LOG_LEVEL,
      };

export const logger = pino(loggerOptions);

export async function loggerMiddleware(c: Context, next: Next): Promise<Response> {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);

  logger.info({
    type: 'request',
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  await next();

  const duration = Date.now() - start;

  logger.info({
    type: 'response',
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });

  return c.res;
}
