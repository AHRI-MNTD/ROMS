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
    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const ip = rawIp.split(",")[0].trim();
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
    
    // Map custom domain-level right names (e.g. "inventory:Check In") to backend read/write permissions
    const expandedPermissions = (req.user.permissions || []).flatMap((perm) => {
      if (perm === "admin:all") return ["admin:all"];
      
      const parts = perm.split(":");
      if (parts.length !== 2) return [perm];
      
      const [domain, right] = parts;
      const mapped: string[] = [];
      
      // Having any specific right inside a domain grants read access to that domain
      mapped.push(`${domain}:read`);
      
      // Specific rights that involve writing or modifying data
      const writeRights: Record<string, string[]> = {
        biospecimen: ["Sample Collection", "Processing", "Storage", "Retrieval", "Disposal"],
        inventory: ["Check In", "Check Out", "Request/s"],
        qms: ["Document Control", "Audits", "CAPA", "Training"],
        "lab-workflow": ["Protocols", "Experiments", "Runs", "Instruments", "Reports"],
        "data-management": ["Studies", "Metadata", "Data Dictionary", "Exports", "Integrations"],
        infrastructure: ["Services", "Servers", "Monitoring", "Incidents", "Integrations"],
        hr: ["Profiles", "Leave", "Onboarding"],
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
