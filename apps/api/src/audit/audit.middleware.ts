/**
 * ALCOA+ audit middleware — wraps mutation endpoints to capture
 * request body (before) and response (after) for all non-GET methods.
 *
 * Usage: router.post('/', auditMutation('Sample', 'CREATE'), handler)
 */
import { Request, Response, NextFunction } from "express";
import { createAuditEntry } from "./audit.service";

const SENSITIVE_KEYS = new Set([
  "password",
  "hashedPassword",
  "verificationCode",
  "accessToken",
  "refreshToken",
  "token",
  "secret",
]);

function sanitizePayload(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  if (Array.isArray(payload)) return { items: payload.map((item) => sanitizePayload(item)) };

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function auditMutation(entityType: string, action: "CREATE" | "UPDATE" | "DELETE") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    const beforeJson = sanitizePayload(req.body);

    res.json = (body: unknown) => {
      const afterJson = sanitizePayload(body);
      const entityId = (body as Record<string, unknown>)?.id as string | undefined;

      setImmediate(() => {
        createAuditEntry({
          userId: req.user?.id,
          entityType,
          entityId: entityId ?? "unknown",
          action,
          beforeJson,
          afterJson: action !== "DELETE" ? afterJson : undefined,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });
      });

      return originalJson(body);
    };

    next();
  };
}
