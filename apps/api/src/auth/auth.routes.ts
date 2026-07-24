import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "@roms/db";
import { LoginSchema, Role } from "@roms/shared";
import { signAccessToken, signRefreshToken, verifyToken } from "./jwt";
import { requireAuth } from "./auth.middleware";
import { logger } from "../utils/logger";
import { OAuth2Client } from "google-auth-library";
import { env } from "../env";
import { sendVerificationEmail } from "./email";

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        displayName,
        emailVerified: false,
        verificationCode,
        roles: [],
      },
    });

    let emailSent = false;
    try {
      await sendVerificationEmail(user.email, verificationCode);
      emailSent = true;
    } catch (emailErr) {
      logger.error(emailErr, "Failed to send verification email");
    }

    const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS && !env.SMTP_PASS.includes("your-gmail-app-password"));

    logger.info({ userId: user.id, email: user.email, verificationCode }, "User registered; email verification code generated");

    res.status(201).json({
      status: "VERIFICATION_REQUIRED",
      email: user.email,
      message: emailSent
        ? "Verification code sent to your email."
        : "Registration successful. Please verify your email code.",
      devVerificationCode: !smtpConfigured ? verificationCode : undefined,
    });
  } catch (err) {
    logger.error(err, "Register error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Registration failed" });
  }
});

// POST /auth/verify-email
router.post("/verify-email", async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Email and code are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found" });
      return;
    }

    if (user.verificationCode !== code) {
      res.status(400).json({ code: "INVALID_CODE", message: "Invalid verification code" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
      },
    });

    const accessToken = signAccessToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      roles: updatedUser.roles,
      permissions: updatedUser.permissions || [],
    });
    const refreshToken = signRefreshToken(updatedUser.id);

    logger.info({ userId: updatedUser.id, email: updatedUser.email }, "User email verified and logged in");

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        roles: updatedUser.roles,
        permissions: updatedUser.permissions || [],
      },
    });
  } catch (err) {
    logger.error(err, "Verify email error");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Verification failed" });
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

    if (!user.hashedPassword) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "This email is registered via Google. Please sign in with Google." });
      return;
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
      return;
    }

    if (!user.emailVerified) {
      let code = user.verificationCode;
      if (!code) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationCode: code }
        });
      }

      logger.info(`
==================================================
📬 [MOCK EMAIL] Verification Code for ${user.email}:
👉 Code: ${code}
==================================================
      `);

      try {
        await sendVerificationEmail(user.email, code);
      } catch (emailErr) {
        logger.error(emailErr, "Failed to send email during login");
      }


      const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS && !env.SMTP_PASS.includes("your-gmail-app-password"));

      res.status(401).json({
        code: "EMAIL_UNVERIFIED",
        message: "Email is not verified. Please verify your email first.",
        email: user.email,
        devVerificationCode: !smtpConfigured ? code : undefined,
      });
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

// POST /auth/google
router.post("/google", async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Credential token is required" });
    return;
  }

  try {
    let email: string;
    let displayName: string;

    // Check for dev mock token
    if (process.env.NODE_ENV === "development" && credential.startsWith("mock-google-token-")) {
      email = credential.replace("mock-google-token-", "") + "@gmail.com";
      displayName = "Mock Google User";
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ code: "INVALID_TOKEN", message: "Invalid Google credential token" });
        return;
      }
      if (!payload.email_verified) {
        res.status(400).json({ code: "UNVERIFIED_EMAIL", message: "Your Google account's email address is not verified by Google" });
        return;
      }
      email = payload.email;
      displayName = payload.name || payload.email.split("@")[0];
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Register new user with Google login
      user = await prisma.user.create({
        data: {
          email,
          displayName,
          emailVerified: true,
          roles: [],
          permissions: [],
        },
      });
      logger.info({ userId: user.id, email: user.email }, "User registered via Google");
    } else {
      // If user existed but wasn't verified, mark them verified now since Google has verified their email
      if (!user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true, verificationCode: null }
        });
      }
      logger.info({ userId: user.id, email: user.email }, "User logged in via Google");
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
    logger.error(err, "Google auth error");
    res.status(401).json({ code: "INVALID_TOKEN", message: "Google authentication failed" });
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
    if (payload.type !== "refresh") {
      res.status(401).json({ code: "INVALID_TOKEN", message: "Invalid token type: refresh token expected" });
      return;
    }
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
  const allowed = req.user?.roles.includes(Role.ADMIN) || req.user?.roles.includes(Role.RESEARCH_ADMIN);
  if (!allowed) {
    res.status(403).json({ code: "FORBIDDEN", message: "Only administrators can modify roles" });
    return;
  }

  const { roles, permissions } = req.body;
  if (!Array.isArray(roles)) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "roles must be an array of strings" });
    return;
  }

  // Prevent RESEARCH_ADMIN from granting ADMIN role or admin:all permission
  if ((roles.includes(Role.ADMIN) || (Array.isArray(permissions) && permissions.includes("admin:all"))) && !req.user?.roles.includes(Role.ADMIN)) {
    res.status(403).json({ code: "FORBIDDEN", message: "Only full Admins can assign the Admin role or admin:all permission" });
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
