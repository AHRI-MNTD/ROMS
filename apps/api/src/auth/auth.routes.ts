import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "@roms/db";
import { LoginSchema, Role } from "@roms/shared";
import { signAccessToken, signRefreshToken, verifyToken } from "./jwt";
import { requireAuth } from "./auth.middleware";
import { logger } from "../utils/logger";

const router = Router();

// POST /auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Email, password, and display name are required" });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ code: "EMAIL_TAKEN", message: "Email is already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        displayName,
        roles: [],
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions || [],
    });
    const refreshToken = signRefreshToken(user.id);

    logger.info({ userId: user.id, email: user.email }, "User registered");

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        permissions: user.permissions || [],
      },
    });
  } catch (err) {
    logger.error(err, "Register error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Registration failed" });
  }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
      return;
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions || [],
    });
    const refreshToken = signRefreshToken(user.id);

    logger.info({ userId: user.id, email: user.email }, "User logged in");

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        permissions: user.permissions || [],
      },
    });
  } catch (err) {
    logger.error(err, "Login error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Login failed" });
  }
});

// POST /auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ code: "MISSING_TOKEN", message: "refreshToken required" });
    return;
  }

  try {
    const payload = verifyToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ code: "INVALID_TOKEN", message: "User not found" });
      return;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions || [],
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ code: "INVALID_TOKEN", message: "Invalid or expired refresh token" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, displayName: true, roles: true, permissions: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    logger.error(err, "/me error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to fetch user" });
  }
});

// PATCH /auth/users/:id/roles
router.patch("/users/:id/roles", requireAuth, async (req: Request, res: Response) => {
  if (!req.user?.roles.includes(Role.ADMIN)) {
    res.status(403).json({ code: "FORBIDDEN", message: "Only administrators can modify roles" });
    return;
  }

  const { roles, permissions } = req.body;
  if (!Array.isArray(roles)) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "roles must be an array of strings" });
    return;
  }

  const updateData: any = { roles };
  if (Array.isArray(permissions)) {
    updateData.permissions = permissions;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, displayName: true, roles: true, permissions: true }
    });
    res.json(updated);
  } catch (err) {
    logger.error(err, "Update roles error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to update user roles" });
  }
});

export default router;
