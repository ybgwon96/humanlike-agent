import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users, type User, type NewUser, type UserProfile } from '../../db/schema/users.js';

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();

  if (user === undefined) {
    throw new Error('Failed to create user');
  }

  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return user ?? null;
}

export async function getUserByExternalId(externalId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.externalId, externalId)).limit(1);

  return user ?? null;
}

export async function updateUserProfile(id: string, profile: Partial<UserProfile>): Promise<User | null> {
  const existingUser = await getUserById(id);
  if (existingUser === null) {
    return null;
  }

  const currentProfile = existingUser.profile ?? {
    preferences: {},
    workPatterns: {},
    emotionalBaseline: 0,
  };

  const updatedProfile: UserProfile = {
    ...currentProfile,
    ...profile,
    preferences: { ...currentProfile.preferences, ...profile.preferences },
    workPatterns: { ...currentProfile.workPatterns, ...profile.workPatterns },
  };

  const [user] = await db
    .update(users)
    .set({
      profile: updatedProfile,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
}

export async function updateEncryptedData(id: string, encryptedData: string): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({
      encryptedData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

  return result.length > 0;
}
