-- Create enum types for audit logging
CREATE TYPE "resource_type" AS ENUM ('conversation', 'message');
CREATE TYPE "audit_action" AS ENUM ('delete');

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "resource_type" "resource_type" NOT NULL,
  "resource_id" uuid NOT NULL,
  "action" "audit_action" NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for audit_logs
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" ("resource_type");
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" ("resource_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
