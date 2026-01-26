import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';
import * as schema from '../db/schema/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_SIZE,
});

export const db = drizzle(pool, { schema });

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}
