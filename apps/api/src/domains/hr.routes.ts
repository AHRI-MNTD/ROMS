import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateStaffProfileSchema, ReviewStaffProfileSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

router.get("/staff", requireAuth, requirePermission("hr:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.staffProfile.findMany({
      skip: (page - 1) * 20,
      take: 20,
      include: {
        user: { select: { displayName: true, email: true, roles: true } },
        reviewedBy: { select: { displayName: true, email: true } },
      },
      orderBy: { department: "asc" },
    }),
    prisma.staffProfile.count(),
  ]);
  res.json({ data, total, page });
});

router.get("/approvals", requireAuth, requirePermission("hr:read"), async (req, res) => {
  const status = req.query.status as string | undefined;
  const where = status ? { approvalStatus: status } : {};
  const data = await prisma.staffProfile.findMany({
    where,
    include: {
      user: { select: { displayName: true, email: true, roles: true } },
      reviewedBy: { select: { displayName: true, email: true } },
    },
    orderBy: [{ approvalStatus: "asc" }, { updatedAt: "desc" }],
  });
  res.json({ data, total: data.length });
});

router.get("/staff/:id", requireAuth, requirePermission("hr:read"), async (req, res) => {
  const p = await prisma.staffProfile.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!p) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(p);
});

router.post("/staff", requireAuth, requirePermission("hr:write"), auditMutation("StaffProfile", "CREATE"), async (req, res) => {
  const parsed = CreateStaffProfileSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const p = await prisma.staffProfile.create({ data: parsed.data });
    res.status(201).json(p);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/staff/:id", requireAuth, requirePermission("hr:write"), auditMutation("StaffProfile", "UPDATE"), async (req, res) => {
  const p = await prisma.staffProfile.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(p);
});

router.patch("/approvals/:id", requireAuth, requirePermission("hr:write"), auditMutation("StaffProfile", "UPDATE"), async (req, res) => {
  const parsed = ReviewStaffProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() });
    return;
  }

  try {
    const updated = await prisma.staffProfile.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: parsed.data.approvalStatus,
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
      include: {
        user: { select: { displayName: true, email: true, roles: true } },
        reviewedBy: { select: { displayName: true, email: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.get("/training-records", requireAuth, requirePermission("hr:read"), async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const data = await prisma.trainingRecord.findMany({
    where: userId ? { userId } : {},
    orderBy: { completedAt: "desc" },
  });
  res.json({ data, total: data.length });
});

export default router;
