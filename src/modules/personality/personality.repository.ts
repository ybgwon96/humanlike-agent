import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  personalityProfiles,
  userPersonalityAdjustments,
  type PersonalityProfile,
  type UserPersonalityAdjustment,
} from '../../db/schema/index.js';

export async function getDefaultProfile(): Promise<PersonalityProfile | null> {
  const results = await db
    .select()
    .from(personalityProfiles)
    .limit(1);

  return results[0] ?? null;
}

export async function getProfileById(id: string): Promise<PersonalityProfile | null> {
  const results = await db
    .select()
    .from(personalityProfiles)
    .where(eq(personalityProfiles.id, id))
    .limit(1);

  return results[0] ?? null;
}

export async function getUserAdjustments(
  userId: string
): Promise<UserPersonalityAdjustment | null> {
  const results = await db
    .select()
    .from(userPersonalityAdjustments)
    .where(eq(userPersonalityAdjustments.userId, userId))
    .limit(1);

  return results[0] ?? null;
}

export async function getUserAdjustmentsWithProfile(userId: string): Promise<{
  profile: PersonalityProfile;
  adjustments: UserPersonalityAdjustment | null;
} | null> {
  const defaultProfile = await getDefaultProfile();

  if (defaultProfile === null) {
    return null;
  }

  const adjustments = await getUserAdjustments(userId);

  return {
    profile: defaultProfile,
    adjustments,
  };
}

export interface UpsertUserAdjustmentInput {
  userId: string;
  profileId: string;
  humorFrequencyModifier?: number;
  formalityLevel?: string;
  customPreferences?: Record<string, unknown>;
}

export async function upsertUserAdjustments(
  input: UpsertUserAdjustmentInput
): Promise<UserPersonalityAdjustment> {
  const existing = await getUserAdjustments(input.userId);

  if (existing !== null) {
    const updateData: Partial<UserPersonalityAdjustment> = {
      updatedAt: new Date(),
    };

    if (input.humorFrequencyModifier !== undefined) {
      updateData.humorFrequencyModifier = input.humorFrequencyModifier;
    }
    if (input.formalityLevel !== undefined) {
      updateData.formalityLevel = input.formalityLevel;
    }
    if (input.customPreferences !== undefined) {
      updateData.customPreferences = input.customPreferences;
    }

    const [result] = await db
      .update(userPersonalityAdjustments)
      .set(updateData)
      .where(eq(userPersonalityAdjustments.id, existing.id))
      .returning();

    if (result === undefined) {
      throw new Error('Failed to update user personality adjustments');
    }

    return result;
  }

  const [result] = await db
    .insert(userPersonalityAdjustments)
    .values({
      userId: input.userId,
      profileId: input.profileId,
      humorFrequencyModifier: input.humorFrequencyModifier ?? 1.0,
      formalityLevel: input.formalityLevel ?? 'normal',
      customPreferences: input.customPreferences ?? {},
    })
    .returning();

  if (result === undefined) {
    throw new Error('Failed to create user personality adjustments');
  }

  return result;
}
