import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateGrantSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

router.get("/grants", requireAuth, requirePermission("finance:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.grant.findMany({ skip: (page - 1) * 20, take: 20, include: { budgets: true }, orderBy: { createdAt: "desc" } }),
    prisma.grant.count(),
  ]);
  res.json({ data, total, page });
});

router.get("/grants/:id", requireAuth, requirePermission("finance:read"), async (req, res) => {
  const g = await prisma.grant.findUnique({ where: { id: req.params.id }, include: { budgets: true, subawards: true } });
  if (!g) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(g);
});

router.post("/grants", requireAuth, requirePermission("finance:write"), auditMutation("Grant", "CREATE"), async (req, res) => {
  const parsed = CreateGrantSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const g = await prisma.grant.create({ data: parsed.data });
    res.status(201).json(g);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/grants/:id", requireAuth, requirePermission("finance:write"), auditMutation("Grant", "UPDATE"), async (req, res) => {
  const g = await prisma.grant.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(g);
});

router.delete("/grants/:id", requireAuth, requirePermission("finance:delete"), auditMutation("Grant", "DELETE"), async (req, res) => {
  await prisma.grant.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
