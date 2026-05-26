import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { logger } from "../utils/logger";

const router = Router();

// Protocols
router.get("/protocols", requireAuth, requirePermission("lab-workflow:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.protocol.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { code: "asc" } }),
    prisma.protocol.count(),
  ]);
  res.json({ data, total, page });
});

router.post("/protocols", requireAuth, requirePermission("lab-workflow:write"), auditMutation("Protocol", "CREATE"), async (req, res) => {
  try {
    const p = await prisma.protocol.create({ data: req.body as { code: string; title: string; version?: string; studyCode?: string } });
    res.status(201).json(p);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/protocols/:id", requireAuth, requirePermission("lab-workflow:write"), auditMutation("Protocol", "UPDATE"), async (req, res) => {
  const p = await prisma.protocol.update({ where: { id: req.params.id }, data: req.body as any });
  res.json(p);
});

// Assay Runs
router.get("/assay-runs", requireAuth, requirePermission("lab-workflow:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.assayRun.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { createdAt: "desc" }, include: { protocol: true } }),
    prisma.assayRun.count(),
  ]);
  res.json({ data, total, page });
});

router.post("/assay-runs", requireAuth, requirePermission("lab-workflow:write"), auditMutation("AssayRun", "CREATE"), async (req, res) => {
  try {
    const run = await prisma.assayRun.create({ data: req.body as any });
    res.status(201).json(run);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

// Instrument bookings
router.get("/bookings", requireAuth, requirePermission("lab-workflow:read"), async (req, res) => {
  const data = await prisma.instrumentBooking.findMany({ include: { instrument: true, user: { select: { displayName: true } } }, orderBy: { startAt: "asc" } });
  res.json({ data, total: data.length });
});

router.post("/bookings", requireAuth, requirePermission("lab-workflow:write"), auditMutation("InstrumentBooking", "CREATE"), async (req, res) => {
  try {
    const booking = await prisma.instrumentBooking.create({ data: req.body as any });
    res.status(201).json(booking);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

export default router;
