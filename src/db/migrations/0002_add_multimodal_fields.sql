-- Create enum types for multi-modal support
CREATE TYPE "conversation_mode" AS ENUM ('text', 'voice');
CREATE TYPE "input_type" AS ENUM ('text', 'voice', 'system');

-- Add multi-modal fields to conversations table
ALTER TABLE "conversations"
ADD COLUMN "mode" "conversation_mode" NOT NULL DEFAULT 'text',
ADD COLUMN "last_mode_switch" timestamp with time zone,
ADD COLUMN "preferred_mode" "conversation_mode";

-- Add multi-modal fields to messages table
ALTER TABLE "messages"
ADD COLUMN "input_type" "input_type" NOT NULL DEFAULT 'text',
ADD COLUMN "voice_metadata" jsonb,
ADD COLUMN "attachments" text[];

-- Create indexes for new fields
CREATE INDEX "conversations_mode_idx" ON "conversations" ("mode");
CREATE INDEX "messages_input_type_idx" ON "messages" ("input_type");

-- Add constraint: voice_metadata required when input_type is 'voice'
-- Note: This is a CHECK constraint that validates the data
ALTER TABLE "messages"
ADD CONSTRAINT "messages_voice_metadata_required"
CHECK (
  input_type != 'voice' OR voice_metadata IS NOT NULL
);

-- Add constraint: transcription_confidence must be between 0 and 1
ALTER TABLE "messages"
ADD CONSTRAINT "messages_voice_metadata_confidence_range"
CHECK (
  voice_metadata IS NULL OR
  (voice_metadata->>'transcriptionConfidence')::float BETWEEN 0 AND 1
);
