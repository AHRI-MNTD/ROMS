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
