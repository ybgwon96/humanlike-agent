-- Migration: Add proactive engagement tables
-- Description: Tables for proactive engagement decision engine and user preferences

-- Enum types
CREATE TYPE trigger_reason AS ENUM (
  'STUCK_TIMEOUT', 'HIGH_FRUSTRATION', 'POST_FOCUS_IDLE', 'SCHEDULED', 'MANUAL'
);

CREATE TYPE user_response AS ENUM ('ACCEPTED', 'DECLINED', 'IGNORED', 'DEFERRED');

CREATE TYPE frequency_preference AS ENUM ('MINIMAL', 'BALANCED', 'PROACTIVE');

-- Proactive engagements table
CREATE TABLE proactive_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_reason trigger_reason NOT NULL,
  trigger_context JSONB DEFAULT '{}',
  message_content TEXT NOT NULL,
  message_priority TEXT DEFAULT 'normal',
  user_response user_response,
  response_time_ms INTEGER,
  was_helpful BOOLEAN,
  feedback_text TEXT,
  delivered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User engagement patterns table
CREATE TABLE user_engagement_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  frequency_preference frequency_preference NOT NULL DEFAULT 'BALANCED',
  daily_limit INTEGER NOT NULL DEFAULT 10,
  consecutive_ignores INTEGER NOT NULL DEFAULT 0,
  paused_until TIMESTAMPTZ,
  preferred_hours JSONB DEFAULT '[]',
  trigger_preferences JSONB DEFAULT '{}',
  total_engagements INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  total_helpful INTEGER NOT NULL DEFAULT 0,
  acceptance_rate REAL DEFAULT 0,
  helpfulness_rate REAL DEFAULT 0,
  last_engagement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred messages table
CREATE TABLE deferred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES proactive_engagements(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  trigger_reason trigger_reason NOT NULL,
  priority TEXT DEFAULT 'normal',
  defer_reason TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proactive_engagements_user_id ON proactive_engagements(user_id);
CREATE INDEX idx_proactive_engagements_created_at ON proactive_engagements(created_at DESC);
CREATE INDEX idx_user_engagement_patterns_user_id ON user_engagement_patterns(user_id);
CREATE INDEX idx_deferred_messages_user_id ON deferred_messages(user_id);
CREATE INDEX idx_deferred_messages_scheduled ON deferred_messages(scheduled_for) WHERE delivered = FALSE;
