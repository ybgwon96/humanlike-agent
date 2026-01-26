import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, c: Context): Response {
  const requestId = c.get('requestId') as string | undefined;

  if (err instanceof AppError) {
    logger.warn({
      type: 'app_error',
      requestId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });

    return c.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 500
    );
  }

  if (err instanceof ZodError) {
    logger.warn({
      type: 'validation_error',
      requestId,
      issues: err.issues,
    });

    return c.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.issues,
        },
      },
      400
    );
  }

  if (err instanceof HTTPException) {
    logger.warn({
      type: 'http_exception',
      requestId,
      status: err.status,
      message: err.message,
    });

    return c.json<ErrorResponse>(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status
    );
  }

  logger.error({
    type: 'unhandled_error',
    requestId,
    error: err.message,
    stack: err.stack,
  });

  return c.json<ErrorResponse>(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
}
