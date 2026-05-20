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
    const allowed = req.user.roles.some((r) => hasPermission(r as Role, action));
    if (!allowed) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: `Permission '${action}' required`,
      });
      return;
    }
    next();
  };
}
