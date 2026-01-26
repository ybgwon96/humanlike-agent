import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, closeDatabase } from './config/database.js';
import { logger } from './middleware/logger.js';

async function main(): Promise<void> {
  const isDbConnected = await checkDatabaseConnection();
  if (!isDbConnected) {
    logger.fatal('Failed to connect to database');
    process.exit(1);
  }

  logger.info('Database connection established');

  const app = createApp();

  const server = serve({
    fetch: app.fetch,
    port: env.PORT,
    hostname: env.HOST,
  });

  logger.info(`Server running on http://${env.HOST}:${env.PORT}`);

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down server...');
    server.close();
    await closeDatabase();
    logger.info('Server shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
