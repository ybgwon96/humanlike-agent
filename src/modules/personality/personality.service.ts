import { AppError } from '../../middleware/error-handler.js';
import type { PersonalityProfile, UserPersonalityAdjustment } from '../../db/schema/index.js';
import * as personalityRepository from './personality.repository.js';
import type {
  PersonalityProfileResponse,
  UserPersonalityAdjustmentResponse,
  UpdateUserAdjustmentRequest,
  ValidateResponseRequest,
  ValidationResult,
} from './personality.schemas.js';

function formatProfile(profile: PersonalityProfile): PersonalityProfileResponse {
  return {
    id: profile.id,
    name: profile.name,
    coreTraits: profile.coreTraits ?? [],
    humorStyle: profile.humorStyle ?? 'situational_timing',
    communicationTone: profile.communicationTone ?? 'casual_respectful',
    values: profile.values ?? [],
    forbiddenPatterns: profile.forbiddenPatterns ?? [],
    exampleResponses: profile.exampleResponses ?? {},
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function formatAdjustment(adj: UserPersonalityAdjustment): UserPersonalityAdjustmentResponse {
  return {
    id: adj.id,
    userId: adj.userId,
    profileId: adj.profileId,
    humorFrequencyModifier: adj.humorFrequencyModifier ?? 1.0,
    formalityLevel: (adj.formalityLevel ?? 'normal') as 'informal' | 'normal' | 'formal',
    customPreferences: adj.customPreferences ?? {},
    createdAt: adj.createdAt.toISOString(),
    updatedAt: adj.updatedAt.toISOString(),
  };
}

export async function getDefaultPersonality(): Promise<PersonalityProfileResponse> {
  const profile = await personalityRepository.getDefaultProfile();

  if (profile === null) {
    throw new AppError('PERSONALITY_NOT_FOUND', 'Default personality profile not found', 404);
  }

  return formatProfile(profile);
}

export async function getUserPersonalityAdjustments(
  userId: string
): Promise<UserPersonalityAdjustmentResponse | null> {
  const adjustments = await personalityRepository.getUserAdjustments(userId);

  if (adjustments === null) {
    return null;
  }

  return formatAdjustment(adjustments);
}

export async function updateUserPersonalityAdjustments(
  userId: string,
  input: UpdateUserAdjustmentRequest
): Promise<UserPersonalityAdjustmentResponse> {
  const profile = await personalityRepository.getDefaultProfile();

  if (profile === null) {
    throw new AppError('PERSONALITY_NOT_FOUND', 'Default personality profile not found', 404);
  }

  const adjustments = await personalityRepository.upsertUserAdjustments({
    userId,
    profileId: profile.id,
    humorFrequencyModifier: input.humorFrequencyModifier,
    formalityLevel: input.formalityLevel,
    customPreferences: input.customPreferences,
  });

  return formatAdjustment(adjustments);
}

export interface PersonalityContext {
  profile: PersonalityProfile;
  adjustments: UserPersonalityAdjustment | null;
}

export async function getPersonalityForUser(userId: string): Promise<PersonalityContext | null> {
  return personalityRepository.getUserAdjustmentsWithProfile(userId);
}

export function buildSystemPrompt(context: PersonalityContext): string {
  const { profile, adjustments } = context;
  const humorModifier = adjustments?.humorFrequencyModifier ?? 1.0;
  const formalityLevel = adjustments?.formalityLevel ?? 'normal';

  const coreTraits = profile.coreTraits ?? [];
  const values = profile.values ?? [];
  const forbiddenPatterns = profile.forbiddenPatterns ?? [];
  const exampleResponses = profile.exampleResponses ?? {};

  const formalityGuide = {
    informal: '친근하고 편안한 어조',
    normal: '친근하지만 존댓말 유지',
    formal: '격식 있고 정중한 어조',
  }[formalityLevel] ?? '친근하지만 존댓말 유지';

  let prompt = `당신의 이름은 ${profile.name}입니다.

핵심 성격: ${coreTraits.join(', ')}
유머 스타일: ${profile.humorStyle ?? 'situational_timing'} (빈도 수준: ${String(humorModifier)}x)
커뮤니케이션 톤: ${profile.communicationTone ?? 'casual_respectful'}
격식 수준: ${formalityGuide}
핵심 가치: ${values.join(', ')}

`;

  if (forbiddenPatterns.length > 0) {
    prompt += `절대 하지 말 것:
${forbiddenPatterns.map((p) => `- ${p}`).join('\n')}

`;
  }

  const examples = Object.entries(exampleResponses);
  if (examples.length > 0) {
    prompt += `상황별 응답 예시:
${examples.map(([k, v]) => `- ${k}: "${v}"`).join('\n')}

`;
  }

  if (humorModifier < 0.5) {
    prompt += `주의: 유머는 최소화하고 실용적인 정보 전달에 집중하세요.
`;
  } else if (humorModifier > 1.5) {
    prompt += `참고: 적절한 유머와 위트를 자주 활용하세요.
`;
  }

  return prompt.trim();
}

const DEFAULT_FORBIDDEN_PATTERNS = [
  'I apologize for any',
  'I cannot assist with',
  'As an AI language model',
  'I do not have personal opinions',
  '!!!!',
  '😀😀😀',
  '🙏🙏🙏',
];

const TONE_CHECK_PATTERNS = {
  overly_apologetic: /I('m| am) (so )?sorry/gi,
  excessive_exclamation: /!{3,}/g,
  excessive_emoji: /[\u{1F600}-\u{1F64F}]{3,}/gu,
  robotic_phrases: /(as an ai|i cannot assist|i do not have personal)/gi,
};

export async function validateResponseText(
  input: ValidateResponseRequest
): Promise<ValidationResult> {
  const { responseText } = input;
  const profile = await personalityRepository.getDefaultProfile();

  const forbiddenPatterns = profile?.forbiddenPatterns ?? DEFAULT_FORBIDDEN_PATTERNS;
  const failedPatterns: string[] = [];

  for (const pattern of forbiddenPatterns) {
    if (responseText.toLowerCase().includes(pattern.toLowerCase())) {
      failedPatterns.push(pattern);
    }
  }

  const forbiddenCheck = failedPatterns.length === 0 ? 'passed' : 'failed';

  let toneCheck: 'passed' | 'failed' = 'passed';
  for (const [, regex] of Object.entries(TONE_CHECK_PATTERNS)) {
    if (regex.test(responseText)) {
      toneCheck = 'failed';
      break;
    }
  }

  const isValid = forbiddenCheck === 'passed' && toneCheck === 'passed';

  return {
    isValid,
    validationDetails: {
      toneCheck,
      forbiddenPatterns: forbiddenCheck,
      failedPatterns,
    },
  };
}
