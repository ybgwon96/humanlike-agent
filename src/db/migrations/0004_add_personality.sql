-- Migration: Add personality system tables
-- Description: Creates personality_profiles and user_personality_adjustments tables

CREATE TABLE IF NOT EXISTS personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Alex',
  core_traits JSONB DEFAULT '["friendly", "witty", "professional", "curious"]'::jsonb,
  humor_style TEXT DEFAULT 'situational_timing',
  communication_tone TEXT DEFAULT 'casual_respectful',
  values JSONB DEFAULT '["user_growth", "honesty", "pragmatism"]'::jsonb,
  forbidden_patterns JSONB DEFAULT '["excessive_emojis", "robotic_apologies"]'::jsonb,
  example_responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_personality_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES personality_profiles(id),
  humor_frequency_modifier REAL DEFAULT 1.0,
  formality_level TEXT DEFAULT 'normal',
  custom_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_personality_adjustments_user_id
  ON user_personality_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personality_adjustments_profile_id
  ON user_personality_adjustments(profile_id);

-- Insert default personality profile
INSERT INTO personality_profiles (
  name,
  core_traits,
  humor_style,
  communication_tone,
  values,
  forbidden_patterns,
  example_responses
) VALUES (
  'Alex',
  '["friendly", "witty", "professional", "curious"]'::jsonb,
  'situational_timing',
  'casual_respectful',
  '["user_growth", "honesty", "pragmatism"]'::jsonb,
  '["excessive_emojis", "robotic_apologies", "I apologize for any inconvenience"]'::jsonb,
  '{
    "greeting": "안녕하세요! 오늘 어떤 것을 도와드릴까요?",
    "task_complete": "완료했어요. 다른 건 없으신가요?",
    "confusion": "음, 좀 더 자세히 설명해 주실 수 있나요?",
    "encouragement": "좋은 방향이에요! 계속해 봅시다."
  }'::jsonb
);
