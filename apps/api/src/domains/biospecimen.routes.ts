import { Router, Request, Response } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateSampleSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

// GET / — list samples (paginated)
router.get("/", requireAuth, requirePermission("biospecimen:read"), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.sample.findMany({ skip, take: pageSize, orderBy: { createdAt: "desc" }, include: { storageLocation: true } }),
      prisma.sample.count(),
    ]);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to list samples" });
  }
});

// GET /:id
router.get("/:id", requireAuth, requirePermission("biospecimen:read"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const sample = await prisma.sample.findUnique({ where: { id }, include: { storageLocation: true } });
  if (!sample) {
    res.status(404).json({ code: "NOT_FOUND", message: "Sample not found" });
    return;
  }
  res.json(sample);
});

// POST /
router.post("/", requireAuth, requirePermission("biospecimen:write"), auditMutation("Sample", "CREATE"), async (req: Request, res: Response) => {
  const parsed = CreateSampleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() });
    return;
  }
  try {
    const sample = await prisma.sample.create({ data: parsed.data });
    res.status(201).json(sample);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to create sample" });
  }
});

// PATCH /:id
router.patch("/:id", requireAuth, requirePermission("biospecimen:write"), auditMutation("Sample", "UPDATE"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sample = await prisma.sample.update({ where: { id }, data: req.body as Record<string, unknown> });
    res.json(sample);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to update sample" });
  }
});

// DELETE /:id
router.delete("/:id", requireAuth, requirePermission("biospecimen:delete"), auditMutation("Sample", "DELETE"), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.sample.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Failed to delete sample" });
  }
});

export default router;
