import { Router, Request, Response } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateStockItemSchema } from "@roms/shared";
import { logger } from "../utils/logger";

type InventoryMasterDataRecord = {
  category: string;
  unit: string;
  project: string | null;
  staff: string | null;
};

type InventoryMasterDataPrisma = typeof prisma & {
  inventoryMasterData: {
    findMany: (args?: Record<string, unknown>) => Promise<InventoryMasterDataRecord[]>;
    count: (args?: Record<string, unknown>) => Promise<number>;
  };
};

type InventoryMovementRecord = {
  stockItemId: string;
  movementType: "CHECK_IN" | "CHECK_OUT";
  quantity: number;
  occurredAt: Date;
  requestedBy?: string | null;
  projectFor?: string | null;
  recipient?: string | null;
  destination?: string | null;
  status?: "APPROVED" | "PENDING" | "REJECTED" | null;
  remark?: string | null;
};

type InventoryMovementPrisma = typeof prisma & {
  inventoryMovement: {
    findMany: (args?: Record<string, unknown>) => Promise<InventoryMovementRecord[]>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

const router: ReturnType<typeof Router> = Router();
const inventoryPrisma = prisma as InventoryMasterDataPrisma;
const movementPrisma = prisma as InventoryMovementPrisma;

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toDateOrUndefined(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// GET / — list stock items
router.get("/", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const all = String(req.query.all ?? "").toLowerCase() === "true";

  if (all) {
    const data = await prisma.stockItem.findMany({ orderBy: { name: "asc" } });
    res.json({ data, total: data.length, page: 1, pageSize: data.length });
    return;
  }

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

router.get("/master-data", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const search = String(req.query.search ?? "").trim();

  const where = search
    ? {
        OR: [
          { category: { contains: search, mode: "insensitive" as const } },
          { unit: { contains: search, mode: "insensitive" as const } },
          { project: { contains: search, mode: "insensitive" as const } },
          { staff: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [data, total, allRows] = await Promise.all([
    inventoryPrisma.inventoryMasterData.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ category: "asc" }, { unit: "asc" }, { project: "asc" }, { staff: "asc" }],
    }),
    inventoryPrisma.inventoryMasterData.count({ where }),
    inventoryPrisma.inventoryMasterData.findMany({
      where,
      select: {
        category: true,
        unit: true,
        project: true,
        staff: true,
      },
    }),
  ]);

  const summary = {
    rows: allRows.length,
    categories: new Set(allRows.map((row: InventoryMasterDataRecord) => row.category).filter(Boolean)).size,
    units: new Set(allRows.map((row: InventoryMasterDataRecord) => row.unit).filter(Boolean)).size,
    projects: new Set(allRows.map((row: InventoryMasterDataRecord) => row.project).filter((value: string | null): value is string => Boolean(value))).size,
    staff: new Set(allRows.map((row: InventoryMasterDataRecord) => row.staff).filter((value: string | null): value is string => Boolean(value))).size,
  };

  res.json({ data, total, page, pageSize, summary });
});

// GET /master-data/projects - return distinct project names from master data
router.get("/master-data/projects", requireAuth, requirePermission("inventory:read"), async (_req: Request, res: Response) => {
  const rows = await prisma.inventoryMasterData.findMany({ select: { project: true } });
  const projects = Array.from(new Set(rows.map((r: any) => String(r.project ?? "")).filter((p: string) => p.trim().length > 0)));
  res.json({ projects });
});

router.get("/analytics", requireAuth, requirePermission("inventory:read"), async (_req: Request, res: Response) => {
  const [stockItems, movements] = await Promise.all([
    prisma.stockItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        sku: true,
        sourceCode: true,
        name: true,
        category: true,
        quantity: true,
        minThreshold: true,
        checkInTotal: true,
        checkOutTotal: true,
      },
    }),
    movementPrisma.inventoryMovement.findMany({
      select: {
        stockItemId: true,
        movementType: true,
        quantity: true,
        occurredAt: true,
        requestedBy: true,
        projectFor: true,
        recipient: true,
        destination: true,
        status: true,
        remark: true,
      },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const totalItems = stockItems.length;
  const totalQuantity = stockItems.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const totalCheckIn = stockItems.reduce((sum, row) => sum + Number(row.checkInTotal ?? 0), 0);
  const totalCheckOut = stockItems.reduce((sum, row) => sum + Number(row.checkOutTotal ?? 0), 0);
  const lowStockItems = stockItems.filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    return quantity > 0 && quantity <= minThreshold;
  }).length;
  const outOfStockItems = stockItems.filter((row) => Number(row.quantity ?? 0) <= 0).length;
  const healthyItems = stockItems.filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    return quantity > minThreshold;
  }).length;
  const atRiskItems = lowStockItems + outOfStockItems;

  const categoryMap = new Map<string, { category: string; count: number; quantity: number; checkOut: number }>();
  stockItems.forEach((row) => {
    const category = String(row.category ?? "Unclassified").trim() || "Unclassified";
    const current = categoryMap.get(category) ?? { category, count: 0, quantity: 0, checkOut: 0 };
    current.count += 1;
    current.quantity += Number(row.quantity ?? 0);
    current.checkOut += Number(row.checkOutTotal ?? 0);
    categoryMap.set(category, current);
  });

  const categoryBreakdown = [...categoryMap.values()].sort((left, right) => right.quantity - left.quantity);

  const topDemandItems = [...stockItems]
    .sort((left, right) => Number(right.checkOutTotal ?? 0) - Number(left.checkOutTotal ?? 0))
    .slice(0, 8);

  const criticalItems = [...stockItems]
    .filter((row) => Number(row.quantity ?? 0) <= Number(row.minThreshold ?? 0))
    .sort((left, right) => Number(left.quantity ?? 0) - Number(right.quantity ?? 0) || Number(right.checkOutTotal ?? 0) - Number(left.checkOutTotal ?? 0))
    .slice(0, 8);

  const now = new Date();
  const months: Array<{ key: string; label: string; checkIn: number; checkOut: number; stockRisk: number }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    months.push({ key, label, checkIn: 0, checkOut: 0, stockRisk: 0 });
  }

  movements.forEach((movement) => {
    const occurredAt = new Date(movement.occurredAt);
    const key = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((month) => month.key === key);
    if (!bucket) {
      return;
    }
    if (movement.movementType === "CHECK_IN") {
      bucket.checkIn += Number(movement.quantity ?? 0);
    } else {
      bucket.checkOut += Number(movement.quantity ?? 0);
    }
  });

  months.forEach((month) => {
    const [year, monthIndex] = month.key.split("-").map((value) => Number(value));
    const cutoff = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
    const itemState = new Map<string, { quantity: number; threshold: number }>();

    stockItems.forEach((row) => {
      itemState.set(row.id, {
        quantity: Number(row.quantity ?? 0),
        threshold: Number(row.minThreshold ?? 0),
      });
    });

    movements.forEach((movement) => {
      if (new Date(movement.occurredAt) <= cutoff) {
        return;
      }
      const current = itemState.get(movement.stockItemId);
      if (!current) {
        return;
      }
      const delta = movement.movementType === "CHECK_IN" ? Number(movement.quantity ?? 0) : -Number(movement.quantity ?? 0);
      current.quantity -= delta;
    });

    month.stockRisk = [...itemState.values()].filter((item) => item.quantity <= item.threshold).length;
  });

  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  const usageRecords = movements
    .filter((movement) => movement.movementType === "CHECK_OUT")
    .map((movement, index) => {
      const stockItem = stockById.get(movement.stockItemId);
      return {
        id: `${movement.stockItemId}-${movement.occurredAt.toISOString()}-${index}`,
        stockItemId: movement.stockItemId,
        itemName: stockItem?.name ?? "Unknown item",
        itemCode: stockItem?.sourceCode ?? stockItem?.sku ?? "",
        category: stockItem?.category ?? "Unclassified",
        quantity: Number(movement.quantity ?? 0),
        requestedBy: String(movement.requestedBy ?? movement.recipient ?? "Unknown User"),
        projectFor: String(movement.projectFor ?? movement.destination ?? "Unassigned"),
        status: String(movement.status ?? "APPROVED"),
        occurredAt: movement.occurredAt,
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  res.json({
    summary: {
      totalItems,
      totalQuantity,
      totalCheckIn,
      totalCheckOut,
      lowStockItems,
      outOfStockItems,
      healthyItems,
      atRiskItems,
    },
    categoryBreakdown,
    topDemandItems,
    criticalItems,
    monthlyTrends: months,
    usageRecords,
  });
});

router.get("/:id", requireAuth, requirePermission("inventory:read"), async (req, res) => {
  const item = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
  if (!item) { res.status(404).json({ code: "NOT_FOUND" }); return; }
  res.json(item);
});

router.post("/", requireAuth, requirePermission("inventory:write"), auditMutation("StockItem", "CREATE"), async (req, res) => {
  const parsed = CreateStockItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  const { dateReceived: parsedDateReceived, ...stockItemData } = parsed.data;
  // enforce projectFor exists in master-data
  const projectForValue = String(req.body.projectFor ?? parsed.data.projectFor ?? "ROMS Inventory").trim();
  if (projectForValue.length > 0) {
    const found = await prisma.inventoryMasterData.findFirst({ where: { project: projectForValue } });
    if (!found) {
      res.status(400).json({ code: "INVALID_PROJECT", message: "projectFor must exist in inventory master data" });
      return;
    }
  }
  try {
    const item = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const createdItem = await tx.stockItem.create({
        data: {
          ...stockItemData,
          checkInTotal: Number(parsed.data.quantity ?? 0),
          checkOutTotal: 0,
          balancePercent: Number(parsed.data.quantity ?? 0) > 0 ? 100 : 0,
        } as never,
      });
      await movementTx.inventoryMovement.create({
        data: {
          stockItemId: createdItem.id,
          movementType: "CHECK_IN",
          quantity: createdItem.quantity,
          requestedBy: req.user?.email ?? null,
          projectFor: String(req.body.projectFor ?? "ROMS Inventory"),
          status: String(req.body.status ?? "APPROVED") as "APPROVED" | "PENDING" | "REJECTED",
          remark: String(req.body.note ?? "Opening stock"),
          occurredAt: parsedDateReceived ?? new Date(),
        },
      });
      return createdItem;
    });
    res.status(201).json(item);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.patch("/:id", requireAuth, requirePermission("inventory:write"), auditMutation("StockItem", "UPDATE"), async (req, res) => {
  try {
    const item = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const existing = await tx.stockItem.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        return null;
      }

      const stockUpdate: Record<string, unknown> = {};
      const quantityUpdate = toNumberOrUndefined(req.body.quantity);
      const sku = toStringOrUndefined(req.body.sku);
      const sourceCode = toStringOrUndefined(req.body.sourceCode);
      const name = toStringOrUndefined(req.body.name);
      const category = toStringOrUndefined(req.body.category);
      const lotNumber = toStringOrUndefined(req.body.lotNumber);
      const unit = toStringOrUndefined(req.body.unit);
      const expiryDate = toDateOrUndefined(req.body.expiryDate);
      const minThreshold = toNumberOrUndefined(req.body.minThreshold);

      if (sku) stockUpdate.sku = sku;
      if (sourceCode) stockUpdate.sourceCode = sourceCode;
      if (name) stockUpdate.name = name;
      if (category) stockUpdate.category = category;
      if (lotNumber !== undefined) stockUpdate.lotNumber = lotNumber;
      if (unit) stockUpdate.unit = unit;
      if (expiryDate !== undefined) stockUpdate.expiryDate = expiryDate;
      if (minThreshold !== undefined) stockUpdate.minThreshold = Math.max(0, Math.floor(minThreshold));
      if (quantityUpdate !== undefined) stockUpdate.quantity = Math.max(0, Math.floor(quantityUpdate));

      // If projectFor provided, validate it exists in master-data
      const projectForProvided = toStringOrUndefined(req.body.projectFor);
      if (projectForProvided) {
        const foundProject = await tx.inventoryMasterData.findFirst({ where: { project: projectForProvided } });
        if (!foundProject) {
          throw new Error("INVALID_PROJECT");
        }
      }

      const previousQuantity = Number(existing.quantity ?? 0);
      const nextQuantity = stockUpdate.quantity !== undefined ? Number(stockUpdate.quantity) : previousQuantity;
      const difference = nextQuantity - previousQuantity;

      if (difference > 0) {
        stockUpdate.checkInTotal = Number(existing.checkInTotal ?? 0) + difference;
      } else if (difference < 0) {
        stockUpdate.checkOutTotal = Number(existing.checkOutTotal ?? 0) + Math.abs(difference);
      }

      const nextCheckInTotal = Number(stockUpdate.checkInTotal ?? existing.checkInTotal ?? 0);
      stockUpdate.balancePercent = nextCheckInTotal > 0 ? (nextQuantity / nextCheckInTotal) * 100 : 0;

      const updated = await tx.stockItem.update({ where: { id: req.params.id }, data: stockUpdate });

      if (difference !== 0) {
        await movementTx.inventoryMovement.create({
          data: {
            stockItemId: updated.id,
            movementType: difference > 0 ? "CHECK_IN" : "CHECK_OUT",
            quantity: Math.abs(difference),
            requestedBy: req.user?.email ?? null,
            destination: String(req.body.destination ?? req.body.projectFor ?? "ROMS Inventory"),
            recipient: String(req.body.recipient ?? "").trim() || null,
            projectFor: String(req.body.projectFor ?? "ROMS Inventory"),
            status: String(req.body.status ?? (difference > 0 ? "APPROVED" : "APPROVED")) as "APPROVED" | "PENDING" | "REJECTED",
            remark: String(req.body.remark ?? req.body.note ?? (difference > 0 ? "Stock increased" : "Stock decreased")),
            occurredAt: toDateOrUndefined(req.body.dateReceived ?? req.body.dateFiled) ?? new Date(),
          },
        });
      }

      return updated;
    });

    if (!item) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }

    res.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROJECT") {
      res.status(400).json({ code: "INVALID_PROJECT", message: "projectFor must exist in inventory master data" });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.delete("/:id", requireAuth, requirePermission("inventory:delete"), auditMutation("StockItem", "DELETE"), async (req, res) => {
  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
