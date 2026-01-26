import { z } from 'zod';

export const userProfileSchema = z.object({
  preferences: z.record(z.unknown()).optional(),
  workPatterns: z.record(z.unknown()).optional(),
  emotionalBaseline: z.number().min(-1).max(1).optional(),
});

export const createUserSchema = z.object({
  externalId: z.string().min(1).max(255),
  profile: userProfileSchema.optional(),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const updateUserProfileSchema = z.object({
  profile: userProfileSchema,
});

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;

export const storeSensitiveDataSchema = z.object({
  data: z.record(z.unknown()),
});

export type StoreSensitiveDataRequest = z.infer<typeof storeSensitiveDataSchema>;
