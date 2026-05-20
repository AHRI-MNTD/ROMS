import { Router, Request, Response } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateStockItemSchema } from "@roms/shared";
import { logger } from "../utils/logger";

const router = Router();

// GET / — list stock items
router.get("/", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const [data, total] = await Promise.all([
    prisma.stockItem.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: "asc" } }),
    prisma.stockItem.count(),
  ]);
  res.json({ data, total, page, pageSize });
});

router.get("/equipment", requireAuth, requirePermission("inventory:read"), async (_req, res) => {
  const data = await prisma.equipment.findMany({ orderBy: { model: "asc" } });
  res.json({ data, total: data.length });
});

router.get("/:id", requireAuth, requirePermission("inventory:read"), async (req, res) => {
  const item = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
  if (!item) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(item);
});

router.post("/", requireAuth, requirePermission("inventory:write"), auditMutation("StockItem", "CREATE"), async (req, res) => {
  const parsed = CreateStockItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const item = await prisma.stockItem.create({ data: parsed.data });
    res.status(201).json(item);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.patch("/:id", requireAuth, requirePermission("inventory:write"), auditMutation("StockItem", "UPDATE"), async (req, res) => {
  const item = await prisma.stockItem.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(item);
});

router.delete("/:id", requireAuth, requirePermission("inventory:delete"), auditMutation("StockItem", "DELETE"), async (req, res) => {
  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
