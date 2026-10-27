import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt";
import { hasPermission } from "@roms/shared";
import type { Role, DomainAction } from "@roms/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: Role[];
        permissions: string[];
      };
    }
  }
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, windowMs).unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Rely on req.ip (populated safely via app.set('trust proxy', 1))
    const ip = req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= max) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message });
      return;
    }

    record.count += 1;
    next();
  };
}


export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles as Role[],
      permissions: payload.permissions || [],
    };
    next();
  } catch {
    res.status(401).json({ code: "INVALID_TOKEN", message: "Token expired or invalid" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      return;
    }

    const isInventoryViewOnly = (req.user.permissions || []).some(
      (p) => p.toLowerCase() === "inventory:view-only"
    );
    // If request targets an inventory write/mutation route, view-only users are forbidden even with admin role
    const isMutationMethod = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
    if (isInventoryViewOnly && isMutationMethod && (req.baseUrl.includes("/inventory") || req.originalUrl.includes("/inventory"))) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Your account is configured in View-Only mode for the Inventory module. Write operations are disabled.",
      });
      return;
    }

    const allowed = roles.some((r) => req.user!.roles.includes(r));
    if (!allowed) {
      res.status(403).json({ code: "FORBIDDEN", message: "Insufficient role" });
      return;
    }
    next();
  };
}

export function requirePermission(action: DomainAction) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      return;
    }
    const hasRolePermission = req.user.roles.some((r) => hasPermission(r as Role, action));
    
    const isInventoryViewOnly = (req.user.permissions || []).some(
      (p) => p.toLowerCase() === "inventory:view-only"
    );

    // If the account has the inventory:view-only permission, strictly prohibit any inventory write or mutation
    if (isInventoryViewOnly && action.startsWith("inventory:") && action !== "inventory:read") {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Your account is configured in View-Only mode for the Inventory module. Write operations are disabled.",
      });
      return;
    }

    // Map custom domain-level right names (e.g. "inventory:Check In") to backend permissions
    const expandedPermissions = (req.user.permissions || []).flatMap((perm) => {
      if (perm === "admin:all") return ["admin:all"];
      
      const parts = perm.split(":");
      if (parts.length !== 2) return [perm];
      
      const [domain, right] = parts;
      const mapped: string[] = [];
      
      // Having any specific right inside a domain grants read access to that domain
      mapped.push(`${domain}:read`);
      
      // Specific inventory rights
      if (domain === "inventory") {
        if (!isInventoryViewOnly) {
          if (right === "Request/s") {
            mapped.push("inventory:request");
          } else if (right === "Check In") {
            mapped.push("inventory:check-in");
          } else if (right === "Check Out") {
            mapped.push("inventory:check-out");
          } else if (right === "Inventory Manager") {
            mapped.push(
              "inventory:write",
              "inventory:check-in",
              "inventory:check-out",
              "inventory:request",
              "inventory:approve",
              "inventory:disburse",
              "inventory:manage"
            );
          } else if (right === "Master Data") {
            mapped.push("inventory:manage");
          }
        }
        return mapped;
      }

      // Specific rights that involve writing or modifying data
      const writeRights: Record<string, string[]> = {
        biospecimen: ["Sample Collection", "Processing", "Storage", "Retrieval", "Disposal"],
        qms: ["Document Control", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA", "Training"],
        "lab-workflow": ["Protocols", "Experiments", "Runs", "Instruments", "Reports"],
        "data-management": ["Studies", "Metadata", "Data Dictionary", "Exports", "Integrations"],
        infrastructure: ["Services", "Servers", "Monitoring", "Incidents", "Integrations"],
        hr: ["Profiles", "Leave", "Onboarding", "Personnel Registration"],
        finance: ["Grants", "Budgets", "Expenses", "Approvals", "Reports"],
        participant: ["Participants", "Consent", "Visits", "Engagement", "Follow-up"],
        regulatory: ["Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting"],
      };
      
      if (writeRights[domain]?.includes(right)) {
        mapped.push(`${domain}:write`);
      }
      
      return mapped;
    });

    const hasCustomPermission = expandedPermissions.includes(action) || expandedPermissions.includes("admin:all");
    if (!hasRolePermission && !hasCustomPermission) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: `Permission '${action}' required`,
      });
      return;
    }
    next();
  };
}
