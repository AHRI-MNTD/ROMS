import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { logger } from "../utils/logger";

const router = Router();

router.get("/studies", requireAuth, requirePermission("data-management:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.study.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { code: "asc" } }),
    prisma.study.count(),
  ]);
  res.json({ data, total, page });
});

router.get("/studies/:id", requireAuth, requirePermission("data-management:read"), async (req, res) => {
  const study = await prisma.study.findUnique({ where: { id: req.params.id }, include: { crfs: true } });
  if (!study) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(study);
});

router.post("/studies", requireAuth, requirePermission("data-management:write"), auditMutation("Study", "CREATE"), async (req, res) => {
  try {
    const s = await prisma.study.create({ data: req.body as Record<string, unknown> });
    res.status(201).json(s);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/studies/:id", requireAuth, requirePermission("data-management:write"), auditMutation("Study", "UPDATE"), async (req, res) => {
  const s = await prisma.study.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(s);
});

// CRFs
router.get("/crfs", requireAuth, requirePermission("data-management:read"), async (req, res) => {
  const data = await prisma.cRF.findMany({ include: { study: { select: { code: true, title: true } } }, orderBy: { name: "asc" } });
  res.json({ data, total: data.length });
});

// Data Queries
router.get("/queries", requireAuth, requirePermission("data-management:read"), async (req, res) => {
  const status = req.query.status as string | undefined;
  const data = await prisma.dataQuery.findMany({
    where: status ? { status: status as "OPEN" | "ANSWERED" | "CLOSED" } : {},
    include: { crf: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data, total: data.length });
});

export default router;
