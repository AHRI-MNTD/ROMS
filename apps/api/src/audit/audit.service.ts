import prisma from "@roms/db";
import { logger } from "../utils/logger";

interface AuditEntry {
  userId?: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "READ_SENSITIVE";
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function createAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        beforeJson: entry.beforeJson ?? undefined,
        afterJson: entry.afterJson ?? undefined,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    logger.error(err, "Failed to write audit log");
    // Audit failures must not break business logic — log and continue
  }
}
