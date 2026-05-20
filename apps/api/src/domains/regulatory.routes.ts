import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateEthicsSubmissionSchema, CreateAdverseEventSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

// Ethics submissions
router.get("/ethics", requireAuth, requirePermission("regulatory:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.ethicsSubmission.findMany({ skip: (page - 1) * 20, take: 20, include: { study: { select: { code: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.ethicsSubmission.count(),
  ]);
  res.json({ data, total, page });
});

router.get("/ethics/:id", requireAuth, requirePermission("regulatory:read"), async (req, res) => {
  const e = await prisma.ethicsSubmission.findUnique({ where: { id: req.params.id }, include: { study: true } });
  if (!e) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(e);
});

router.post("/ethics", requireAuth, requirePermission("regulatory:write"), auditMutation("EthicsSubmission", "CREATE"), async (req, res) => {
  const parsed = CreateEthicsSubmissionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const e = await prisma.ethicsSubmission.create({ data: parsed.data });
    res.status(201).json(e);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/ethics/:id", requireAuth, requirePermission("regulatory:write"), auditMutation("EthicsSubmission", "UPDATE"), async (req, res) => {
  const e = await prisma.ethicsSubmission.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(e);
});

// Adverse Events
router.get("/adverse-events", requireAuth, requirePermission("regulatory:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.adverseEvent.findMany({ skip: (page - 1) * 20, take: 20, include: { study: { select: { code: true } }, participant: { select: { pseudonymId: true } } }, orderBy: { reportedAt: "desc" } }),
    prisma.adverseEvent.count(),
  ]);
  res.json({ data, total, page });
});

router.post("/adverse-events", requireAuth, requirePermission("regulatory:write"), auditMutation("AdverseEvent", "CREATE"), async (req, res) => {
  const parsed = CreateAdverseEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const ae = await prisma.adverseEvent.create({ data: parsed.data });
    res.status(201).json(ae);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

export default router;
