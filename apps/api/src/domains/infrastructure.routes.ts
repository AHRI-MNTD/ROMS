import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { logger } from "../utils/logger";

const router = Router();

router.get("/integration-jobs", requireAuth, requirePermission("infrastructure:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.integrationJob.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { createdAt: "desc" } }),
    prisma.integrationJob.count(),
  ]);
  res.json({ data, total, page });
});

router.get("/backup-jobs", requireAuth, requirePermission("infrastructure:read"), async (req, res) => {
  const data = await prisma.backupJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ data, total: data.length });
});

router.get("/sensor-readings", requireAuth, requirePermission("infrastructure:read"), async (req, res) => {
  const sensorId = req.query.sensorId as string | undefined;
  const data = await prisma.sensorReading.findMany({
    where: sensorId ? { sensorId } : {},
    orderBy: { recordedAt: "desc" },
    take: 100,
  });
  res.json({ data, total: data.length });
});

router.post("/integration-jobs", requireAuth, requirePermission("infrastructure:write"), async (req, res) => {
  try {
    const job = await prisma.integrationJob.create({ data: req.body as Record<string, unknown> });
    res.status(201).json(job);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

export default router;
