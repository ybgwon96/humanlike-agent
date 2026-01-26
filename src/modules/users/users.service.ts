import type { UserDto, UserProfile } from '../../types/domain.js';
import { AppError } from '../../middleware/error-handler.js';
import { encrypt, decrypt, isEncrypted } from '../../lib/privacy/encryption.js';
import * as usersRepository from './users.repository.js';

export interface CreateUserInput {
  externalId: string;
  profile?: Partial<UserProfile>;
}

export interface UpdateUserProfileInput {
  id: string;
  profile: Partial<UserProfile>;
}

export interface StoreSensitiveDataInput {
  userId: string;
  data: Record<string, unknown>;
}

function toDto(
  user: Awaited<ReturnType<typeof usersRepository.getUserById>>
): UserDto {
  if (user === null) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  return {
    id: user.id,
    externalId: user.externalId,
    profile: user.profile ?? {
      preferences: {},
      workPatterns: {},
      emotionalBaseline: 0,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(input: CreateUserInput): Promise<UserDto> {
  const existingUser = await usersRepository.getUserByExternalId(input.externalId);
  if (existingUser !== null) {
    throw new AppError('USER_EXISTS', 'User with this external ID already exists', 409);
  }

  const profile: UserProfile = {
    preferences: input.profile?.preferences ?? {},
    workPatterns: input.profile?.workPatterns ?? {},
    emotionalBaseline: input.profile?.emotionalBaseline ?? 0,
  };

  const user = await usersRepository.createUser({
    externalId: input.externalId,
    profile,
  });

  return toDto(user);
}

export async function getUserById(id: string): Promise<UserDto> {
  const user = await usersRepository.getUserById(id);
  return toDto(user);
}

export async function getUserByExternalId(externalId: string): Promise<UserDto> {
  const user = await usersRepository.getUserByExternalId(externalId);
  return toDto(user);
}

export async function getOrCreateUser(externalId: string): Promise<UserDto> {
  const existingUser = await usersRepository.getUserByExternalId(externalId);
  if (existingUser !== null) {
    return toDto(existingUser);
  }

  return createUser({ externalId });
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UserDto> {
  const user = await usersRepository.updateUserProfile(input.id, input.profile);
  return toDto(user);
}

export async function storeSensitiveData(input: StoreSensitiveDataInput): Promise<void> {
  const encryptedData = encrypt(JSON.stringify(input.data));
  const result = await usersRepository.updateEncryptedData(input.userId, encryptedData);

  if (result === null) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }
}

export async function getSensitiveData(userId: string): Promise<Record<string, unknown> | null> {
  const user = await usersRepository.getUserById(userId);
  if (user === null) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  if (user.encryptedData === null || !isEncrypted(user.encryptedData)) {
    return null;
  }

  const decrypted = decrypt(user.encryptedData);
  return JSON.parse(decrypted) as Record<string, unknown>;
}

export async function deleteUser(id: string): Promise<void> {
  const deleted = await usersRepository.deleteUser(id);

  if (!deleted) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }
}
