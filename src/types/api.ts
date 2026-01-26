import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: true;
  data: T;
}

export interface SuccessResponse {
  success: true;
  message: string;
}

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid(),
});
