import type { ResourceType, AuditAction, AuditMetadata } from '../../db/schema/audit-logs.js';
import * as auditRepository from './audit.repository.js';

export interface LogAuditInput {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: AuditAction;
  metadata?: AuditMetadata;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  await auditRepository.createAuditLog({
    userId: input.userId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    action: input.action,
    metadata: input.metadata,
  });
}
