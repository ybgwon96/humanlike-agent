import { db } from '../../config/database.js';
import { auditLogs, type NewAuditLog, type AuditLog } from '../../db/schema/audit-logs.js';

export async function createAuditLog(data: NewAuditLog): Promise<AuditLog> {
  const [auditLog] = await db.insert(auditLogs).values(data).returning();

  if (auditLog === undefined) {
    throw new Error('Failed to create audit log');
  }

  return auditLog;
}
