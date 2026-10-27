import prisma from "@roms/db";
import { logger } from "../utils/logger";

export interface AuditEntry {
  userId?: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "READ_SENSITIVE";
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  strict?: boolean;
}

/**
 * Creates an audit log record within an existing Prisma transaction.
 * Guarantees atomicity between business operations and audit logs.
 */
export async function createAuditEntryTx(
  tx: { auditLog: { create: (args: any) => Promise<any> } },
  entry: AuditEntry
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      beforeJson: entry.beforeJson as any,
      afterJson: entry.afterJson as any,
      ip: entry.ip,
      userAgent: entry.userAgent,
    },
  });
}

/**
 * Standalone audit logging. In strict mode (or if strict is true), fails the mutation
 * if the audit log cannot be committed, ensuring compliant non-repudiation.
 */
export async function createAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        beforeJson: entry.beforeJson as any,
        afterJson: entry.afterJson as any,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    logger.error(err, `Failed to write audit log for ${entry.entityType}:${entry.entityId}`);
    if (entry.strict) {
      throw new Error(`AUDIT_LOG_FAILED: Failed to record audit log for ${entry.entityType}`);
    }
  }
}
