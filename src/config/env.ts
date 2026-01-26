import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),

  ENCRYPTION_KEY: z.string().min(32).describe('AES-256 encryption key'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MESSAGE_EXPIRY_DAYS: z.coerce.number().int().positive().default(180),
  CONTEXT_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.format();
    const errorMessages = Object.entries(errors)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const errorValue = value as { _errors?: string[] };
        return `  ${key}: ${errorValue._errors?.join(', ') ?? 'Unknown error'}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return result.data;
}

export const env = validateEnv();
