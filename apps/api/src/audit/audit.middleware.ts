/**
 * ALCOA+ audit middleware — wraps mutation endpoints to capture
 * request body (before) and response (after) for all non-GET methods.
 *
 * Usage: router.post('/', auditMutation('Sample', 'CREATE'), handler)
 */
import { Request, Response, NextFunction } from "express";
import { createAuditEntry } from "./audit.service";

export function auditMutation(entityType: string, action: "CREATE" | "UPDATE" | "DELETE") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    const beforeJson = req.body as Record<string, unknown>;

    res.json = (body: unknown) => {
      const afterJson = body as Record<string, unknown>;
      const entityId = afterJson?.id as string | undefined;

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
