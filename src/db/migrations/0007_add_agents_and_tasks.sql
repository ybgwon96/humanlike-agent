-- Migration: Add agents and agent_tasks tables
-- Description: Trust Score Tracking and Autonomy Management System

-- Enum types
CREATE TYPE task_type AS ENUM ('SUGGESTION', 'DRAFT', 'EXECUTION', 'DECISION');
CREATE TYPE task_status AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'REJECTED');
CREATE TYPE user_feedback AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default Agent',
  autonomy_level INTEGER NOT NULL DEFAULT 1 CHECK (autonomy_level >= 1 AND autonomy_level <= 5),
  trust_score REAL NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_tasks INTEGER NOT NULL DEFAULT 0,
  successful_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_promotion TIMESTAMPTZ,
  last_evaluation TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent tasks table
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type task_type NOT NULL,
  requires_level INTEGER NOT NULL CHECK (requires_level >= 1 AND requires_level <= 5),
  description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'PENDING',
  user_feedback user_feedback,
  outcome JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_created_at ON agent_tasks(created_at DESC);
