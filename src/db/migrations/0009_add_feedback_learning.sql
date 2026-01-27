-- Migration: Add feedback and learning system tables
-- Description: Adds tables for user feedback events, learning adjustments, and learning preferences

-- Create feedback_type enum
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM (
    'EXPLICIT_POSITIVE',
    'EXPLICIT_NEGATIVE',
    'IMPLICIT_ACCEPT',
    'IMPLICIT_IGNORE',
    'TASK_HELPFUL',
    'TASK_NOT_HELPFUL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create adjustment_type enum
DO $$ BEGIN
  CREATE TYPE adjustment_type AS ENUM (
    'HUMOR_FREQUENCY',
    'CONVERSATION_FREQUENCY',
    'TASK_PERMISSION',
    'TIMING_PREFERENCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create conversation_frequency_tier enum
DO $$ BEGIN
  CREATE TYPE conversation_frequency_tier AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create feedback_events table
CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type feedback_type NOT NULL,
  context JSONB,
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create learning_adjustments table
CREATE TABLE IF NOT EXISTS learning_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adjustment_type adjustment_type NOT NULL,
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  reason TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reverted_at TIMESTAMPTZ
);

-- Create user_learning_preferences table
CREATE TABLE IF NOT EXISTS user_learning_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  humor_frequency_modifier REAL NOT NULL DEFAULT 1.0,
  conversation_frequency_tier conversation_frequency_tier NOT NULL DEFAULT 'MEDIUM',
  optimal_conversation_hours JSONB DEFAULT '[]',
  auto_approve_task_types JSONB DEFAULT '[]',
  never_suggest_task_types JSONB DEFAULT '[]',
  last_learning_run TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for feedback_events
CREATE INDEX IF NOT EXISTS idx_feedback_events_user_id ON feedback_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_type ON feedback_events(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_events_created_at ON feedback_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_events_user_type_created
  ON feedback_events(user_id, feedback_type, created_at DESC);

-- Create indexes for learning_adjustments
CREATE INDEX IF NOT EXISTS idx_learning_adjustments_user_id ON learning_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_adjustments_type ON learning_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_learning_adjustments_applied_at ON learning_adjustments(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_adjustments_not_reverted
  ON learning_adjustments(user_id, applied_at DESC) WHERE reverted_at IS NULL;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_learning_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_learning_preferences
DROP TRIGGER IF EXISTS trigger_user_learning_preferences_updated_at ON user_learning_preferences;
CREATE TRIGGER trigger_user_learning_preferences_updated_at
  BEFORE UPDATE ON user_learning_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_preferences_updated_at();
