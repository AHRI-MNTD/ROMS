// inventory.routes.ts
import { Router, Request, Response } from "express";
import prisma, { Prisma } from "@roms/db";
import { randomUUID } from "node:crypto";
import { requireAuth, requirePermission, requireRole } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateStockItemSchema, BulkCheckoutSchema, BulkCheckInSchema, Role } from "@roms/shared";
import { logger } from "../utils/logger";
import { GoogleSheetsSyncService } from "../services/googleSheets.service";
import { getInventoryDecisionDelta, getSettledRequestQuantity } from "./inventory.settlement";

type InventoryMasterDataRecord = {
  category: string;
  unit: string;
  requestBatchId?: string | null;
  project?: string | null;
  staff?: string | null;
};

type InventoryMasterDataPrisma = typeof prisma & {
  inventoryMasterData: {
    findMany: (args?: Record<string, unknown>) => Promise<InventoryMasterDataRecord[]>;
    count: (args?: Record<string, unknown>) => Promise<number>;
    findFirst?: (args?: Record<string, unknown>) => Promise<InventoryMasterDataRecord | null>;
  };
};

type StockItemSelect = {
  id: string;
  sku?: string | null;
  name?: string | null;
  unit?: string | null;
  category?: string | null;
};

type InventoryMovementRecord = {
  id?: string;
  stockItemId: string;
  movementType: "CHECK_IN" | "CHECK_OUT";
  quantity: number;
  occurredAt: Date;
  requestedBy?: string | null;
  projectFor?: string | null;
  recipient?: string | null;
  destination?: string | null;
  status?: "APPROVED" | "PENDING" | "REJECTED" | "PARTIAL" | null;
  remark?: string | null;
  requestedQuantity?: number;
  requestedFor?: string | null;
  requestBatchId?: string | null;
  team?: string | null;
  stockItem?: StockItemSelect | null;
  createdAt?: Date;
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

function toInventoryMovementStatus(value: unknown): "APPROVED" | "PENDING" | "REJECTED" | "PARTIAL" | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "APPROVED" || normalized === "PENDING" || normalized === "REJECTED" || normalized === "PARTIAL") {
    return normalized as any;
  }
  return undefined;
}

function mapMovementToRequestRow(movement: InventoryMovementRecord) {
  const stockItem = movement.stockItem;
  const requestedQuantity = Number(movement.requestedQuantity ?? movement.quantity ?? 0);
  const acceptedQuantity = Number(movement.quantity ?? 0);

  return {
    rowKey: movement.id ?? `${movement.requestBatchId ?? "batch"}-${movement.stockItemId}`,
    requestBatchId: movement.requestBatchId ?? null,
    codeNo: stockItem?.sku ?? "—",
    barcode: stockItem?.sku ?? "—",
    itemDescription: stockItem?.name ?? "—",
    quantity: acceptedQuantity,
    requestedQuantity,
    unit: stockItem?.unit ?? "units",
    unitDescription: `${stockItem?.unit ?? "units"} per pack`,
    category: stockItem?.category ?? "General",
    dateRequested: movement.occurredAt.toISOString().slice(0, 10),
    requestedBy: movement.requestedBy ?? "Unknown User",
    requestedFor: movement.requestedFor ?? "",
    project: movement.projectFor ?? "ROMS Inventory",
    team: movement.team ?? "",
    remark: movement.remark ?? "",
    status: movement.status ?? "PENDING",
    acceptedQuantity,
    movementId: movement.id,
  };
}

// GET / — list stock items
router.get("/", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const all = String(req.query.all ?? "").toLowerCase() === "true";
  const search = String(req.query.search ?? "").trim();
  const stockFilter = String(req.query.stockFilter ?? "all").toLowerCase();
  const filterClauses: Prisma.Sql[] = [];

  if (search.length > 0) {
    const pattern = `%${search}%`;
    filterClauses.push(Prisma.sql`(
      "sourceCode" ILIKE ${pattern}
      OR sku ILIKE ${pattern}
      OR name ILIKE ${pattern}
      OR category ILIKE ${pattern}
      OR unit ILIKE ${pattern}
    )`);
  }

  if (stockFilter === "low") {
    filterClauses.push(Prisma.sql`quantity > 0 AND quantity <= "minThreshold"`);
  } else if (stockFilter === "out") {
    filterClauses.push(Prisma.sql`quantity <= 0`);
  } else if (stockFilter === "healthy") {
    filterClauses.push(Prisma.sql`quantity > "minThreshold"`);
  }

  const whereClause =
    filterClauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filterClauses, " AND ")}`
      : Prisma.empty;

  const selectClause = Prisma.sql`
    SELECT
      id,
      sku,
      "sourceCode",
      name,
      category,
      "lotNumber",
      quantity,
      "minThreshold",
      "checkInTotal",
      "checkOutTotal",
      "balancePercent",
      unit,
      "expiryDate",
      "createdAt"
    FROM "StockItem"
  `;

  const paginationClause = all ? Prisma.empty : Prisma.sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  if (all) {
    const data = await prisma.$queryRaw<unknown[]>(Prisma.sql`${selectClause} ${whereClause} ORDER BY name ASC`);
    res.json({ data, total: data.length, page: 1, pageSize: data.length });
    return;
  }

  const [data, totalRows] = await Promise.all([
    prisma.$queryRaw<unknown[]>(Prisma.sql`${selectClause} ${whereClause} ORDER BY name ASC ${paginationClause}`),
    prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "StockItem" ${whereClause}`),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
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
      select: { category: true, unit: true, project: true, staff: true },
    }),
  ]);

  const summary = {
    rows: allRows.length,
    categories: new Set(allRows.map((row) => row.category).filter(Boolean)).size,
    units: new Set(allRows.map((row) => row.unit).filter(Boolean)).size,
    projects: new Set(allRows.map((row) => row.project).filter((v) => Boolean(v))).size,
    staff: new Set(allRows.map((row) => row.staff).filter((v) => Boolean(v))).size,
  };

  res.json({ data, total, page, pageSize, summary });
});

router.get("/master-data/projects", requireAuth, requirePermission("inventory:read"), async (_req: Request, res: Response) => {
  const rows = await prisma.inventoryMasterData.findMany({ select: { project: true } });
  const projects = Array.from(new Set(rows.map((r: any) => String(r.project ?? "")).filter((p: string) => p.trim().length > 0)));
  res.json({ projects });
});

// POST /master-data - add a new master data record
router.post("/master-data", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req: Request, res: Response) => {
  const { category, unit, project, staff } = req.body;

  const record = await prisma.inventoryMasterData.create({
    data: {
      category: category ? String(category).trim() : "",
      unit: unit ? String(unit).trim() : "",
      project: project ? String(project).trim() : null,
      staff: staff ? String(staff).trim() : null,
    },
  });

  res.status(201).json(record);
});

// PUT /master-data/:id - update an existing master data record
router.put("/master-data/:id", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category, unit, project, staff } = req.body;
  try {
    const record = await prisma.inventoryMasterData.update({
      where: { id },
      data: {
        category: category ? String(category).trim() : "",
        unit: unit ? String(unit).trim() : "",
        project: project ? String(project).trim() : null,
        staff: staff ? String(staff).trim() : null,
      },
    });
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Master data record not found." });
  }
});

// DELETE /master-data/:id - delete a master data record
router.delete("/master-data/:id", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.inventoryMasterData.delete({
      where: { id },
    });
    res.json({ success: true, message: "Record deleted successfully." });
  } catch (error) {
    res.status(404).json({ error: "Master data record not found." });
  }
});

router.get("/requests", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const where: any = {
    movementType: "CHECK_OUT",
    requestBatchId: { not: null },
  };
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: {
      stockItem: {
        select: { id: true, sku: true, name: true, unit: true, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = movements.map((movement) =>
    mapMovementToRequestRow({
      ...movement,
      stockItem: movement.stockItem,
    })
  );

  res.json({ data, total: data.length });
});

router.get("/movements", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const where: any = {};
  if (type === "CHECK_IN" || type === "CHECK_OUT") {
    where.movementType = type;
  }

  const [data, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        stockItem: {
          select: { id: true, sku: true, name: true, unit: true, category: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
  res.json({ data, total });
});

router.post("/requests", requireAuth, requirePermission("inventory:write"), async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "items must be a non-empty array" });
    return;
  }

  const requestedBy = toStringOrUndefined(req.body?.requestedBy) ?? req.user?.email ?? null;
  const requestedFor = toStringOrUndefined(req.body?.requestedFor) ?? null;
  const projectFor = toStringOrUndefined(req.body?.project) ?? "ROMS Inventory";
  const team = toStringOrUndefined(req.body?.team) ?? null;
  const occurredAt = toDateOrUndefined(req.body?.timestamp) ?? new Date();
  const batchId = randomUUID();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const createdRows = await Promise.all(
        items.map(async (rawItem: any) => {
          const stockItemId = toStringOrUndefined(rawItem?.id);
          const stockItem = stockItemId ? await tx.stockItem.findUnique({ where: { id: stockItemId } }) : null;
          if (!stockItemId || !stockItem) {
            throw new Error("INVALID_ITEM_ID");
          }

          const requestedQuantity = Math.max(0, Math.floor(toNumberOrUndefined(rawItem?.quantity) ?? 0));

          return tx.inventoryMovement.create({
            data: {
              requestBatchId: batchId,
              stockItemId,
              movementType: "CHECK_OUT",
              quantity: requestedQuantity,
              requestedQuantity,
              requestedBy,
              requestedFor,
              recipient: requestedFor,
              destination: projectFor,
              projectFor,
              team,
              status: "PENDING",
              remark: toStringOrUndefined(rawItem?.remark) ?? "Requested by user",
              occurredAt,
            },
            include: {
              stockItem: {
                select: { id: true, sku: true, name: true, unit: true, category: true },
              },
            },
          });
        })
      );

      return createdRows;
    });

    res.status(201).json({
      data: created.map((movement) =>
        mapMovementToRequestRow({
          ...movement,
          stockItem: movement.stockItem,
        })
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ITEM_ID") {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "Each item must include a valid id" });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.post("/request-decisions", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "items must be a non-empty array" });
    return;
  }

  const requestedBy = toStringOrUndefined(req.body?.requestedBy) ?? req.user?.email ?? null;
  const requestedFor = toStringOrUndefined(req.body?.requestedFor) ?? null;
  const projectFor = toStringOrUndefined(req.body?.project) ?? "ROMS Inventory";
  const team = toStringOrUndefined(req.body?.team) ?? null;
  const occurredAt = toDateOrUndefined(req.body?.timestamp) ?? new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const createdRows = await Promise.all(
        items.map(async (rawItem: any) => {
          const movementId = toStringOrUndefined(rawItem?.movementId);
          const stockItemId = toStringOrUndefined(rawItem?.id);
          const status = toInventoryMovementStatus(rawItem?.status) ?? "PENDING";
          const acceptedQuantity = Math.max(0, Math.floor(toNumberOrUndefined(rawItem?.acceptedQuantity) ?? toNumberOrUndefined(rawItem?.quantity) ?? 0));
          const quantity = getSettledRequestQuantity(status, acceptedQuantity);
          const requestedQuantity = Math.max(0, Math.floor(toNumberOrUndefined(rawItem?.quantity) ?? 0));

          if (!movementId && !stockItemId) {
            throw new Error("INVALID_ITEM_ID");
          }

          const summary =
            status === "REJECTED"
              ? `Rejected by project manager${requestedQuantity > 0 ? ` (${requestedQuantity} requested)` : ""}`
              : status === "PARTIAL"
                ? `Partial approval: accepted ${quantity} of ${requestedQuantity}`
                : `Approved by project manager${requestedQuantity > 0 ? ` (${requestedQuantity} requested)` : ""}`;

            const existingMovement = movementId
              ? await tx.inventoryMovement.findUnique({
                  where: { id: movementId },
                  select: { id: true, quantity: true, status: true, stockItemId: true, requestBatchId: true },
                })
              : null;

            const delta = getInventoryDecisionDelta(existingMovement?.status ?? null, Number(existingMovement?.quantity ?? 0), status, quantity);
            const resolvedStockItemId = existingMovement?.stockItemId ?? stockItemId;

            if (!resolvedStockItemId) {
              throw new Error("INVALID_ITEM_ID");
            }

            const stockItems = await tx.$queryRaw<any[]>(
              Prisma.sql`SELECT * FROM "StockItem" WHERE id = ${resolvedStockItemId} FOR UPDATE`
            );
            const stockItem = stockItems[0];
            if (!stockItem) {
              throw new Error("ITEM_NOT_FOUND");
            }

            if (delta !== 0) {
              const currentQuantity = Number(stockItem.quantity ?? 0);
              const nextQuantity = currentQuantity - delta;
              if (nextQuantity < 0) {
                throw new Error(`INSUFFICIENT_STOCK:${stockItem.name}`);
              }

              const nextCheckOutTotal = Math.max(0, Number(stockItem.checkOutTotal ?? 0) + delta);
              const nextCheckInTotal = Number(stockItem.checkInTotal ?? 0);

              await tx.stockItem.update({
                where: { id: stockItem.id },
                data: {
                  quantity: nextQuantity,
                  checkOutTotal: nextCheckOutTotal,
                  balancePercent: nextCheckInTotal > 0 ? (nextQuantity / nextCheckInTotal) * 100 : 0,
                },
              });
            }

          if (movementId) {
              const movement = await movementTx.inventoryMovement.update({
              where: { id: movementId },
              data: {
                quantity,
                requestedQuantity,
                requestedBy,
                requestedFor,
                recipient: requestedFor,
                destination: projectFor,
                projectFor,
                team,
                status,
                remark: [summary, toStringOrUndefined(rawItem?.name) ? `Item: ${toStringOrUndefined(rawItem?.name)}` : null, team ? `Team: ${team}` : null].filter(Boolean).join(" · "),
                occurredAt,
              },
              include: {
                stockItem: {
                  select: { id: true, sku: true, name: true, unit: true, category: true },
                },
              },
            });
            return movement;
          }

          return movementTx.inventoryMovement.create({
            data: {
              requestBatchId: randomUUID(),
              stockItemId: stockItemId!,
              movementType: "CHECK_OUT",
              quantity,
              requestedQuantity,
              requestedBy,
              requestedFor,
              recipient: requestedFor,
              destination: projectFor,
              projectFor,
              team,
              status,
              remark: [summary, toStringOrUndefined(rawItem?.name) ? `Item: ${toStringOrUndefined(rawItem?.name)}` : null, team ? `Team: ${team}` : null].filter(Boolean).join(" · "),
              occurredAt,
            },
            include: {
              stockItem: {
                select: { id: true, sku: true, name: true, unit: true, category: true },
              },
            },
          });
        })
      );

      return createdRows;
    });

    res.status(201).json({
      data: created.map((movement) =>
        mapMovementToRequestRow({
          ...movement,
          stockItem: movement.stockItem,
        })
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ITEM_ID") {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "Each item must include a valid id" });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.get("/analytics", requireAuth, requirePermission("inventory:read"), async (_req: Request, res: Response) => {
  const [stockItems, movements, expiringSoonItems] = await Promise.all([
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
        expiryDate: true,
      },
    }),
    prisma.inventoryMovement.findMany({
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
    prisma.stockItem.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
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
    expiringSoonItems,
    monthlyTrends: months,
    usageRecords,
  });
});

// POST /google-sheets/sync - Sync inventory with Google Sheets
router.post("/google-sheets/sync", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req, res) => {
  try {
    const result = await GoogleSheetsSyncService.pullStockItems(prisma);
    res.json({
      success: true,
      message: `Successfully synchronized inventory from Google Sheets.`,
      importedCount: result.imported,
      source: result.source,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({
      code: "SYNC_ERROR",
      message: error.message || "Failed to sync with Google Sheets.",
    });
  }
});

router.get("/:id", requireAuth, requirePermission("inventory:read"), async (req, res) => {
  const item = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
  if (!item) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  res.json(item);
});

router.post("/", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), auditMutation("StockItem", "CREATE"), async (req, res) => {
  const parsed = CreateStockItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() });
    return;
  }
  const { dateReceived: parsedDateReceived, ...stockItemData } = parsed.data;
  // enforce projectFor exists in master-data
  const projectForValue = String(req.body.projectFor ?? "ROMS Inventory").trim();
  if (projectForValue.length > 0) {
    const found = await prisma.inventoryMasterData.findFirst({ where: { project: projectForValue } });
    if (!found) {
      res.status(400).json({ code: "INVALID_PROJECT", message: "projectFor must exist in inventory master data" });
      return;
    }
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const createdItem = await tx.stockItem.create({
        data: {
          ...stockItemData,
          checkInTotal: Number(parsed.data.quantity ?? 0),
          checkOutTotal: 0,
          balancePercent: Number(parsed.data.quantity ?? 0) > 0 ? 100 : 0,
        } as never,
      });
      const movement = await movementTx.inventoryMovement.create({
        data: {
          stockItemId: createdItem.id,
          movementType: "CHECK_IN",
          quantity: createdItem.quantity,
          requestedBy: req.user?.email ?? null,
          projectFor: String(req.body.projectFor ?? "ROMS Inventory"),
          status: String(req.body.status ?? "APPROVED") as "APPROVED" | "PENDING" | "REJECTED",
          remark: String(req.body.remark ?? req.body.note ?? "Opening stock"),
          occurredAt: parsedDateReceived ?? new Date(),
        },
      });
      return { createdItem, movement };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Non-blocking Google Sheets sync in background
    GoogleSheetsSyncService.syncStockItem({
      sku: result.createdItem.sku,
      name: result.createdItem.name,
      category: result.createdItem.category,
      unit: result.createdItem.unit,
      quantity: result.createdItem.quantity,
      minThreshold: result.createdItem.minThreshold,
      checkInTotal: result.createdItem.checkInTotal,
      checkOutTotal: result.createdItem.checkOutTotal,
    });

    GoogleSheetsSyncService.syncMovement({
      id: result.movement.id,
      stockItemSku: result.createdItem.sku,
      stockItemName: result.createdItem.name,
      movementType: "CHECK_IN",
      quantity: result.movement.quantity,
      requestedBy: result.movement.requestedBy,
      projectFor: result.movement.projectFor,
      status: result.movement.status,
      remark: result.movement.remark,
      occurredAt: result.movement.occurredAt,
    });

    res.status(201).json(result.createdItem);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.post("/bulk-checkout", requireAuth, requirePermission("inventory:write"), async (req: Request, res: Response) => {
  const parsed = BulkCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { items } = parsed.data;

  // Sort items by stockItemId to avoid database deadlock in concurrent transactions
  const sortedItems = [...items].sort((a, b) => {
    const idA = String(a.stockItemId || "");
    const idB = String(b.stockItemId || "");
    return idA.localeCompare(idB);
  });

  try {
    const results = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const updatedItems = [];
      const createdMovements = [];

      for (const cartItem of sortedItems) {
        const { stockItemId, quantity, projectFor, requestedBy: staffName, remark } = cartItem;
        if (!stockItemId || !quantity || quantity <= 0) {
          throw new Error(`INVALID_ITEM_PARAMS:${stockItemId}`);
        }

        const existing = await tx.stockItem.findUnique({ where: { id: stockItemId } });
        if (!existing) {
          throw new Error(`ITEM_NOT_FOUND:${stockItemId}`);
        }

        const currentQty = Number(existing.quantity ?? 0);
        if (quantity > currentQty) {
          throw new Error(`INSUFFICIENT_STOCK:${existing.name}`);
        }

        const nextQuantity = currentQty - quantity;
        const nextCheckOutTotal = Number(existing.checkOutTotal ?? 0) + quantity;
        const nextCheckInTotal = Number(existing.checkInTotal ?? 0);
        const nextBalancePercent = nextCheckInTotal > 0 ? (nextQuantity / nextCheckInTotal) * 100 : 0;

        const updated = await tx.stockItem.update({
          where: { id: stockItemId },
          data: {
            quantity: nextQuantity,
            checkOutTotal: nextCheckOutTotal,
            balancePercent: nextBalancePercent,
          },
        });

        const movement = await movementTx.inventoryMovement.create({
          data: {
            stockItemId: updated.id,
            movementType: "CHECK_OUT",
            quantity: quantity,
            requestedBy: req.user?.email ?? null,
            destination: String(projectFor ?? "ROMS Inventory"),
            recipient: String(staffName ?? "").trim() || null,
            projectFor: String(projectFor ?? "ROMS Inventory"),
            status: "APPROVED",
            remark: String(remark ?? "Bulk checkout"),
            occurredAt: new Date(),
          },
        });

        updatedItems.push(updated);
        createdMovements.push({ ...movement, stockItem: updated });
      }
      return { updatedItems, createdMovements };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Sync to Google Sheets asynchronously in background
    results.createdMovements.forEach((mov) => {
      GoogleSheetsSyncService.syncStockItem({
        sku: mov.stockItem.sku,
        name: mov.stockItem.name,
        category: mov.stockItem.category,
        unit: mov.stockItem.unit,
        quantity: mov.stockItem.quantity,
        minThreshold: mov.stockItem.minThreshold,
        checkInTotal: mov.stockItem.checkInTotal,
        checkOutTotal: mov.stockItem.checkOutTotal,
      });

      GoogleSheetsSyncService.syncMovement({
        id: mov.id,
        stockItemSku: mov.stockItem.sku,
        stockItemName: mov.stockItem.name,
        movementType: "CHECK_OUT",
        quantity: mov.quantity,
        requestedBy: mov.requestedBy,
        projectFor: mov.projectFor,
        status: mov.status,
        remark: mov.remark,
        occurredAt: mov.occurredAt,
      });
    });

    res.json({ success: true, updatedItems: results.updatedItems });
  } catch (error: any) {
    logger.error(error);
    const message = error.message || "";
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ error: `Insufficient stock for ${message.split(":")[1]}.` });
    }
    if (message.startsWith("ITEM_NOT_FOUND:")) {
      return res.status(404).json({ error: "One or more items in the batch could not be found." });
    }
    res.status(500).json({ error: "Bulk checkout transaction failed." });
  }
});

router.post("/bulk-checkin", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req: Request, res: Response) => {
  const parsed = BulkCheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { items } = parsed.data;

  try {
    const results = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const batchId = randomUUID();
      const updatedItems = [];
      const createdMovements = [];

      for (const cartItem of items) {
        const mode = cartItem.mode;
        if (mode !== "existing" && mode !== "new") {
          throw new Error("INVALID_MODE");
        }

        const projectFor = toStringOrUndefined(cartItem.projectFor) ?? "ROMS Inventory";
        const foundProject = await tx.inventoryMasterData.findFirst({ where: { project: projectFor } });
        if (!foundProject) {
          throw new Error("INVALID_PROJECT");
        }

        const dateReceived = toDateOrUndefined(cartItem.dateReceived) ?? new Date();
        const remark = toStringOrUndefined(cartItem.remark) ?? toStringOrUndefined(cartItem.note) ?? (mode === "existing" ? "Stock increased" : "Opening stock");

        if (mode === "existing") {
          const stockItemId = toStringOrUndefined(cartItem.stockItemId);
          if (!stockItemId) {
            throw new Error("MISSING_STOCK_ITEM_ID");
          }
          const quantity = Math.max(0, Math.floor(Number(cartItem.quantity) || 0));
          if (quantity <= 0) {
            throw new Error("INVALID_QUANTITY");
          }

          const existing = await tx.stockItem.findUnique({ where: { id: stockItemId } });
          if (!existing) {
            throw new Error(`ITEM_NOT_FOUND:${stockItemId}`);
          }

          const previousQuantity = Number(existing.quantity ?? 0);
          const nextQuantity = previousQuantity + quantity;
          const nextCheckInTotal = Number(existing.checkInTotal ?? 0) + quantity;
          const nextBalancePercent = nextCheckInTotal > 0 ? (nextQuantity / nextCheckInTotal) * 100 : 0;

          const updated = await tx.stockItem.update({
            where: { id: stockItemId },
            data: {
              quantity: nextQuantity,
              checkInTotal: nextCheckInTotal,
              balancePercent: nextBalancePercent,
            },
          });

          const expiryDate = toDateOrUndefined(cartItem.expiryDate);
          if (expiryDate) {
            await tx.stockItem.update({
              where: { id: stockItemId },
              data: { expiryDate },
            });
          }

          const movement = await movementTx.inventoryMovement.create({
            data: {
              requestBatchId: batchId,
              stockItemId,
              movementType: "CHECK_IN",
              quantity,
              requestedBy: req.user?.email ?? null,
              destination: projectFor,
              recipient: null,
              projectFor,
              status: "APPROVED",
              remark,
              occurredAt: dateReceived,
            },
          });

          updatedItems.push(updated);
          createdMovements.push({ ...movement, stockItem: updated });
        } else {
          const sku = toStringOrUndefined(cartItem.sku);
          const name = toStringOrUndefined(cartItem.name) ?? toStringOrUndefined(cartItem.itemDescription);
          if (!sku || !name) {
            throw new Error("MISSING_NEW_ITEM_FIELDS");
          }
          const quantity = Math.max(0, Math.floor(Number(cartItem.quantity) || 0));
          if (quantity <= 0) {
            throw new Error("INVALID_QUANTITY");
          }

          const existingItem = await tx.stockItem.findUnique({ where: { sku } });
          if (existingItem) {
            throw new Error(`SKU_ALREADY_EXISTS:${sku}`);
          }

          const barcode = toStringOrUndefined(cartItem.barcode) ?? sku;
          const category = toStringOrUndefined(cartItem.category) ?? "General";
          const unit = toStringOrUndefined(cartItem.unit) ?? "units";
          const unitDescription = toStringOrUndefined(cartItem.unitDescription) ?? `${unit} per pack`;
          const expiryDate = toDateOrUndefined(cartItem.expiryDate);
          const minThreshold = typeof cartItem.minThreshold === "number" ? cartItem.minThreshold : 5;

          const createdItem = await tx.stockItem.create({
            data: {
              sku,
              barcode,
              name,
              category,
              unit,
              quantity,
              minThreshold,
              checkInTotal: quantity,
              checkOutTotal: 0,
              balancePercent: 100,
              expiryDate: expiryDate ?? null,
            } as never,
          });

          const movement = await movementTx.inventoryMovement.create({
            data: {
              requestBatchId: batchId,
              stockItemId: createdItem.id,
              movementType: "CHECK_IN",
              quantity,
              requestedBy: req.user?.email ?? null,
              destination: projectFor,
              recipient: null,
              projectFor,
              status: "APPROVED",
              remark,
              occurredAt: dateReceived,
            },
          });

          updatedItems.push(createdItem);
          createdMovements.push({ ...movement, stockItem: createdItem });
        }
      }

      return { updatedItems, createdMovements };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    results.createdMovements.forEach((mov) => {
      GoogleSheetsSyncService.syncStockItem({
        sku: mov.stockItem.sku,
        name: mov.stockItem.name,
        category: mov.stockItem.category,
        unit: mov.stockItem.unit,
        quantity: mov.stockItem.quantity,
        minThreshold: mov.stockItem.minThreshold,
        checkInTotal: mov.stockItem.checkInTotal,
        checkOutTotal: mov.stockItem.checkOutTotal,
      });

      GoogleSheetsSyncService.syncMovement({
        id: mov.id,
        stockItemSku: mov.stockItem.sku,
        stockItemName: mov.stockItem.name,
        movementType: "CHECK_IN",
        quantity: mov.quantity,
        requestedBy: mov.requestedBy,
        projectFor: mov.projectFor,
        status: mov.status,
        remark: mov.remark,
        occurredAt: mov.occurredAt,
      });
    });

    res.json({ success: true, updatedItems: results.updatedItems });
  } catch (error: any) {
    logger.error(error);
    const message = error.message || "";
    if (message === "INVALID_MODE") {
      return res.status(400).json({ error: "Invalid check-in mode. Must be 'existing' or 'new'." });
    }
    if (message === "INVALID_PROJECT") {
      return res.status(400).json({ error: "Project For must exist in inventory master data." });
    }
    if (message === "MISSING_STOCK_ITEM_ID") {
      return res.status(400).json({ error: "Stock Item ID is required for existing items." });
    }
    if (message === "INVALID_QUANTITY") {
      return res.status(400).json({ error: "Check-in quantity must be greater than zero." });
    }
    if (message === "MISSING_NEW_ITEM_FIELDS") {
      return res.status(400).json({ error: "SKU and Item Description are required for new items." });
    }
    if (message.startsWith("ITEM_NOT_FOUND:")) {
      return res.status(404).json({ error: "One or more items in the batch could not be found." });
    }
    if (message.startsWith("SKU_ALREADY_EXISTS:")) {
      return res.status(400).json({ error: `SKU '${message.split(":")[1]}' already exists.` });
    }
    res.status(500).json({ error: "Bulk check-in transaction failed." });
  }
});

router.patch("/:id", requireAuth, requirePermission("inventory:write"), auditMutation("StockItem", "UPDATE"), async (req, res) => {
  // Enforce role-based access for administrative updates
  const isAdmin = req.user?.roles.some(r => r === Role.ADMIN || r === Role.RESEARCH_ADMIN) ?? false;
  if (!isAdmin) {
    // Non-admins may NOT change quantity via PATCH at all.
    // All stock reductions must route through /bulk-checkout or /requests.
    // All stock additions must route through /bulk-checkin.
    if (req.body.quantity !== undefined) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Quantity changes must be submitted through the Check-Out or Request workflow. Direct quantity edits are restricted to administrators.",
      });
      return;
    }

    // Non-admins may NOT modify structural / administrative metadata.
    const hasMetadataChanges =
      req.body.sku !== undefined ||
      req.body.name !== undefined ||
      req.body.category !== undefined ||
      req.body.unit !== undefined ||
      req.body.minThreshold !== undefined ||
      req.body.lotNumber !== undefined ||
      req.body.barcode !== undefined ||
      req.body.sourceCode !== undefined;

    if (hasMetadataChanges) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Insufficient permissions for administrative modifications.",
      });
      return;
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
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

      let createdMovement = null;
      if (difference !== 0) {
        createdMovement = await movementTx.inventoryMovement.create({
          data: {
            stockItemId: updated.id,
            movementType: difference > 0 ? "CHECK_IN" : "CHECK_OUT",
            quantity: Math.abs(difference),
            requestedBy: req.user?.email ?? null,
            destination: String(req.body.destination ?? req.body.projectFor ?? "ROMS Inventory"),
            recipient: String(req.body.recipient ?? "").trim() || null,
            projectFor: String(req.body.projectFor ?? "ROMS Inventory"),
            status: "APPROVED",
            remark: String(req.body.remark ?? req.body.note ?? (difference > 0 ? "Stock increased" : "Stock decreased")),
            occurredAt: toDateOrUndefined(req.body.dateReceived ?? req.body.dateFiled) ?? new Date(),
          },
        });
      }

      return { updated, createdMovement };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }

    // Sync to Google Sheets asynchronously in background
    GoogleSheetsSyncService.syncStockItem({
      sku: result.updated.sku,
      name: result.updated.name,
      category: result.updated.category,
      unit: result.updated.unit,
      quantity: result.updated.quantity,
      minThreshold: result.updated.minThreshold,
      checkInTotal: result.updated.checkInTotal,
      checkOutTotal: result.updated.checkOutTotal,
    });

    if (result.createdMovement) {
      GoogleSheetsSyncService.syncMovement({
        id: result.createdMovement.id,
        stockItemSku: result.updated.sku,
        stockItemName: result.updated.name,
        movementType: result.createdMovement.movementType,
        quantity: result.createdMovement.quantity,
        requestedBy: result.createdMovement.requestedBy,
        projectFor: result.createdMovement.projectFor,
        status: result.createdMovement.status,
        remark: result.createdMovement.remark,
        occurredAt: result.createdMovement.occurredAt,
      });
    }

    res.json(result.updated);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROJECT") {
      res.status(400).json({ code: "INVALID_PROJECT", message: "projectFor must exist in inventory master data" });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.delete("/:id", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), auditMutation("StockItem", "DELETE"), async (req, res) => {
  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
