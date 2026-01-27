-- Emotion Analysis Schema Migration
-- Adds emotion_type enum and emotion_analyses table for enhanced sentiment analysis

CREATE TYPE emotion_type AS ENUM (
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
  'FRUSTRATED',
  'EXCITED',
  'TIRED',
  'STRESSED'
);

CREATE TABLE emotion_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  emotion_type emotion_type NOT NULL,
  intensity SMALLINT NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  raw_score REAL,
  analysis_method TEXT DEFAULT 'rule_based',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emotion_analyses_message_id ON emotion_analyses(message_id);
CREATE INDEX idx_emotion_analyses_emotion_type ON emotion_analyses(emotion_type);
CREATE INDEX idx_emotion_analyses_created_at ON emotion_analyses(created_at);

COMMENT ON TABLE emotion_analyses IS 'Stores detailed emotion analysis results for messages';
COMMENT ON COLUMN emotion_analyses.intensity IS 'Emotion intensity on a scale of 1-10';
COMMENT ON COLUMN emotion_analyses.confidence IS 'Analysis confidence score between 0 and 1';
COMMENT ON COLUMN emotion_analyses.raw_score IS 'Legacy sentiment score (-1 to 1) for backward compatibility';
COMMENT ON COLUMN emotion_analyses.analysis_method IS 'Method used for analysis: rule_based, llm, or hybrid';
