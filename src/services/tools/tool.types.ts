import type { JSONSchema7 } from 'json-schema';

export type RiskLevel = 1 | 2 | 3;

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  riskLevel: RiskLevel;
  execute: (input: unknown) => Promise<ToolResult>;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ToolApprovalRequest {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: RiskLevel;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ToolExecutionContext {
  conversationId: string;
  messageId: string;
  userId: string;
}

export function requiresApproval(riskLevel: RiskLevel): boolean {
  return riskLevel >= 2;
}
