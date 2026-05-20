import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateParticipantSchema, CreateConsentSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", requireAuth, requirePermission("participant:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const studyId = req.query.studyId as string | undefined;
  const [data, total] = await Promise.all([
    prisma.participant.findMany({
      where: studyId ? { studyId } : {},
      skip: (page - 1) * 20, take: 20,
      include: { study: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.participant.count({ where: studyId ? { studyId } : {} }),
  ]);
  res.json({ data, total, page });
});

router.get("/:id", requireAuth, requirePermission("participant:read"), async (req, res) => {
  const p = await prisma.participant.findUnique({ where: { id: req.params.id }, include: { consents: true, visits: true } });
  if (!p) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(p);
});

router.post("/", requireAuth, requirePermission("participant:write"), auditMutation("Participant", "CREATE"), async (req, res) => {
  const parsed = CreateParticipantSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const p = await prisma.participant.create({ data: parsed.data });
    res.status(201).json(p);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/:id", requireAuth, requirePermission("participant:write"), auditMutation("Participant", "UPDATE"), async (req, res) => {
  const p = await prisma.participant.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(p);
});

// Consents
router.post("/:id/consents", requireAuth, requirePermission("participant:write"), auditMutation("Consent", "CREATE"), async (req, res) => {
  const parsed = CreateConsentSchema.safeParse({ ...req.body, participantId: req.params.id });
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const c = await prisma.consent.create({ data: parsed.data });
    res.status(201).json(c);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

export default router;
