// inventory.routes.ts
import { Router, Request, Response } from "express";
import prisma, { Prisma } from "@roms/db";
import { randomUUID } from "node:crypto";
import { requireAuth, requirePermission, requireRole } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { 
  CreateStockItemSchema, 
  BulkCheckoutSchema, 
  BulkCheckInSchema, 
  CreateInventoryRequestSchema,
  InventoryDecisionSchema,
  CreateProjectLoanSchema,
  CreateProjectLoanBatchSchema,
  ProjectLoanDecisionSchema,
  ReturnProjectLoanSchema,
  Role 
} from "@roms/shared";
import { logger } from "../utils/logger";
import { GoogleSheetsSyncService } from "../services/googleSheets.service";
import { getInventoryDecisionDelta, getSettledRequestQuantity } from "./inventory.settlement";
import { sendApprovedRequestsNotificationEmail } from "../auth/email";
import { env } from "../env";
import { createAuditEntry, createAuditEntryTx } from "../audit/audit.service";

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
  decisionAt?: Date | null;
  remark?: string | null;
  requestedQuantity?: number;
  requestedFor?: string | null;
  requestBatchId?: string | null;
  team?: string | null;
  approver?: string | null;
  stockItem?: StockItemSelect | null;
  createdAt?: Date;
};

export type ResolvedApprover = {
  id: string;
  displayName: string;
  email: string;
};

/**
 * Resolves authorized approvers strictly from the database for a given project.
 * No hardcoded name fallbacks.
 * 1. Checks Study table for assigned PI.
 * 2. Checks StaffProfile table for users assigned to the project with approval authority.
 * 3. Falls back strictly to active administrators queried from the database User table.
 */
export async function resolveApproversForProject(project?: string | null): Promise<ResolvedApprover[]> {
  const normalizedProject = (project || "").trim();
  const approversMap = new Map<string, ResolvedApprover>();

  if (normalizedProject) {
    // 1. Check Study table for assigned PI
    try {
      const study = await prisma.study.findFirst({
        where: {
          OR: [
            { code: { equals: normalizedProject, mode: "insensitive" } },
            { title: { equals: normalizedProject, mode: "insensitive" } },
          ],
        },
        select: { pi: true },
      });

      if (study?.pi?.trim()) {
        const piIdentifier = study.pi.trim();
        const piUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: piIdentifier, mode: "insensitive" } },
              { displayName: { equals: piIdentifier, mode: "insensitive" } },
            ],
          },
          select: { id: true, displayName: true, email: true },
        });

        if (piUser) {
          approversMap.set(piUser.id, {
            id: piUser.id,
            displayName: piUser.displayName || piUser.email,
            email: piUser.email,
          });
        }
      }
    } catch (err) {
      logger.error(err, `Error querying study for project approver: ${normalizedProject}`);
    }

    // 2. Check StaffProfile table for exact project assignments with approval authority
    try {
      const staffMatches = await prisma.staffProfile.findMany({
        where: {
          OR: [
            { mntdProject: { equals: normalizedProject, mode: "insensitive" } },
            { mntdProjectsInvolved: { has: normalizedProject } },
          ],
          user: {
            roles: {
              hasSome: [Role.PRINCIPAL_INVESTIGATOR, Role.RESEARCH_ADMIN, Role.ADMIN],
            },
          },
        },
        select: {
          user: { select: { id: true, displayName: true, email: true } },
        },
      });

      for (const sm of staffMatches) {
        if (sm.user?.id) {
          approversMap.set(sm.user.id, {
            id: sm.user.id,
            displayName: sm.user.displayName || sm.user.email,
            email: sm.user.email,
          });
        }
      }
    } catch (err) {
      logger.error(err, `Error querying staff profiles for project approver: ${normalizedProject}`);
    }
  }

  // 3. Fallback strictly to active administrators and research admins from the User database table
  if (approversMap.size === 0) {
    try {
      const systemAdmins = await prisma.user.findMany({
        where: {
          roles: {
            hasSome: [Role.RESEARCH_ADMIN, Role.ADMIN],
          },
        },
        select: { id: true, displayName: true, email: true },
        take: 5,
      });

      for (const admin of systemAdmins) {
        approversMap.set(admin.id, {
          id: admin.id,
          displayName: admin.displayName || admin.email,
          email: admin.email,
        });
      }
    } catch (err) {
      logger.error(err, "Error querying database system admins for fallback approvers");
    }
  }

  return Array.from(approversMap.values());
}

export function formatApproversField(approvers: ResolvedApprover[]): string {
  if (approvers.length === 0) return "ROMS Administrator";
  const idTag = `[APPROVER_IDS:${approvers.map((a) => a.id).join(",")}]`;
  const names = approvers.map((a) => a.displayName).join(", ");
  return `${idTag} ${names}`;
}

export function isUserAuthorizedForApprovers(
  user: { id?: string | null; displayName?: string | null; email?: string | null; roles?: string[]; permissions?: string[] } | undefined,
  approversString: string,
  project?: string | null
): boolean {
  if (!user) return false;

  const roles = user.roles || [];
  const perms = user.permissions || [];

  // 1. Administrative or inventory management authority
  if (roles.includes(Role.ADMIN) || roles.includes(Role.RESEARCH_ADMIN)) {
    return true;
  }
  if (perms.includes("admin:all") || perms.includes("inventory:manage")) {
    return true;
  }

  // Approver must have approval role or explicit approval permission
  if (!roles.includes(Role.PRINCIPAL_INVESTIGATOR) && !perms.includes("inventory:approve")) {
    return false;
  }

  // 2. Strict ID matching from [APPROVER_IDS:id1,id2]
  if (user.id) {
    const idMatch = approversString.match(/\[APPROVER_IDS:([^\]]+)\]/);
    if (idMatch && idMatch[1]) {
      const ids = idMatch[1].split(",").map((s) => s.trim());
      if (ids.includes(user.id)) {
        return true;
      }
    }
  }

  // 3. Exact matching on clean email or display name (no loose substring matching)
  const cleaned = approversString.replace(/\[APPROVER_IDS:[^\]]+\]/, "").trim();
  const tokens = cleaned.split(/[,/]| and /).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const userEmail = (user.email ?? "").trim().toLowerCase();
  const userDisplayName = (user.displayName ?? "").trim().toLowerCase();

  for (const token of tokens) {
    if (userEmail && token === userEmail) {
      return true;
    }
    if (userDisplayName && token === userDisplayName) {
      return true;
    }
  }

  return false;
}

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
  const projectFor = movement.projectFor ?? "ROMS Inventory";

  let itemUnit = stockItem?.unit ?? "units";
  if (movement.remark && movement.remark.includes("[Unit: ")) {
    const match = movement.remark.match(/\[Unit:\s*([^\]]+)\]/);
    if (match && match[1]) {
      itemUnit = match[1].trim();
    }
  }

  let unitDescription = `${itemUnit} per pack`;
  if (movement.remark && movement.remark.includes("[UnitDesc: ")) {
    const match = movement.remark.match(/\[UnitDesc:\s*([^\]]+)\]/);
    if (match && match[1]) {
      unitDescription = match[1].trim();
    }
  }

  const isDisbursed = Boolean(
    movement.remark && (movement.remark.includes("[ISSUED]") || movement.remark.includes("[DISBURSED]"))
  );

  return {
    rowKey: movement.id ?? `${movement.requestBatchId ?? "batch"}-${movement.stockItemId}`,
    requestBatchId: movement.requestBatchId ?? null,
    codeNo: stockItem?.sku ?? "—",
    barcode: stockItem?.sku ?? "—",
    itemDescription: stockItem?.name ?? "—",
    quantity: acceptedQuantity,
    requestedQuantity,
    unit: itemUnit,
    unitDescription,
    category: stockItem?.category ?? "General",
    dateRequested: movement.occurredAt.toISOString().slice(0, 10),
    requestedBy: movement.requestedBy ?? "Unknown User",
    requestedFor: movement.requestedFor ?? "",
    project: projectFor,
    team: movement.team ?? "",
    approver: movement.approver || "ROMS Administrator",
    remark: movement.remark ?? "",
    status: movement.status ?? "PENDING",
    decisionAt: movement.decisionAt?.toISOString() ?? null,
    acceptedQuantity,
    movementId: movement.id,
    isDisbursed,
  };
}

// GET / — list stock items
router.get("/", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const all = String(req.query.all ?? "").toLowerCase() === "true";
  const search = String(req.query.search ?? "").trim();
  const category = String(req.query.category ?? "").trim();
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

  if (category.length > 0 && category.toLowerCase() !== "all") {
    filterClauses.push(Prisma.sql`category ILIKE ${category}`);
  }

  const pctCalcSql = Prisma.sql`(CASE WHEN "checkInTotal" > 0 THEN ("quantity"::float / "checkInTotal") * 100 WHEN "quantity" > 0 THEN 100 ELSE 0 END)`;

  if (stockFilter === "low") {
    filterClauses.push(Prisma.sql`quantity > 0 AND ${pctCalcSql} > 0 AND ${pctCalcSql} < 50`);
  } else if (stockFilter === "moderate") {
    filterClauses.push(Prisma.sql`quantity > 0 AND ${pctCalcSql} >= 50 AND ${pctCalcSql} < 75`);
  } else if (stockFilter === "out") {
    filterClauses.push(Prisma.sql`quantity <= 0 OR ${pctCalcSql} <= 0`);
  } else if (stockFilter === "healthy") {
    filterClauses.push(Prisma.sql`quantity > 0 AND ${pctCalcSql} >= 75`);
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

router.get("/master-data/options", requireAuth, requirePermission("inventory:read"), async (_req: Request, res: Response) => {
  const [masterRows, stockRows] = await Promise.all([
    prisma.inventoryMasterData.findMany({ select: { category: true, unit: true, project: true } }),
    prisma.stockItem.findMany({ select: { category: true, unit: true } }),
  ]);

  const defaultUnits = ["units", "pcs", "box", "pack", "vial", "bottle", "kit", "tube", "plate", "bag", "roll", "ml", "L", "g", "kg", "meter"];
  const defaultCategories = ["Consumables", "Equipment", "Reagents", "Glassware", "Chemicals", "PPE", "General", "Office Supplies", "Diagnostic Kits"];

  const unitsSet = new Set<string>(defaultUnits);
  const categoriesSet = new Set<string>(defaultCategories);
  const projectsSet = new Set<string>();

  masterRows.forEach((r) => {
    if (r.unit?.trim()) unitsSet.add(r.unit.trim());
    if (r.category?.trim()) categoriesSet.add(r.category.trim());
    if (r.project?.trim()) projectsSet.add(r.project.trim());
  });

  stockRows.forEach((r) => {
    if (r.unit?.trim()) unitsSet.add(r.unit.trim());
    if (r.category?.trim()) categoriesSet.add(r.category.trim());
  });

  res.json({
    units: Array.from(unitsSet).sort(),
    categories: Array.from(categoriesSet).sort(),
    projects: Array.from(projectsSet).sort(),
  });
});


// POST /master-data - add a new master data record
router.post("/master-data", requireAuth, requirePermission("inventory:manage"), async (req: Request, res: Response) => {
  const { category, unit, project, staff } = req.body;

  const record = await prisma.inventoryMasterData.create({
    data: {
      category: category ? String(category).trim() : "",
      unit: unit ? String(unit).trim() : "",
      project: project ? String(project).trim() : null,
      staff: staff ? String(staff).trim() : null,
    },
  });

  GoogleSheetsSyncService.syncMasterData({ category, unit, project, staff });

  res.status(201).json(record);
});

// PUT /master-data/:id - update an existing master data record
router.put("/master-data/:id", requireAuth, requirePermission("inventory:manage"), async (req: Request, res: Response) => {
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

    GoogleSheetsSyncService.syncMasterData({ category, unit, project, staff });

    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Master data record not found." });
  }
});

// DELETE /master-data/:id - delete a master data record
router.delete("/master-data/:id", requireAuth, requirePermission("inventory:manage"), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.inventoryMasterData.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Master data record not found." });
      return;
    }

    await prisma.inventoryMasterData.delete({
      where: { id },
    });

    GoogleSheetsSyncService.deleteMasterData({
      category: existing.category,
      unit: existing.unit,
      project: existing.project,
      staff: existing.staff,
    });

    res.json({ success: true, message: "Record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete master data record." });
  }
});

router.get("/requests", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const isAll = String(req.query.all ?? "").toLowerCase() === "true";
  const hasExplicitPage = req.query.page !== undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 20);

  const where: any = {
    movementType: "CHECK_OUT",
    requestBatchId: { not: null },
  };
  if (statusFilter && statusFilter !== "ALL") {
    if (statusFilter.includes(",")) {
      where.status = { in: statusFilter.split(",").map((s) => s.trim()) };
    } else {
      where.status = statusFilter;
    }
  }

  // 1. If `all=true` (or unpaged query without page parameter), return ALL matching records with NO artificial ceiling
  if (isAll && !hasExplicitPage) {
    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        stockItem: {
          select: { id: true, sku: true, name: true, unit: true, category: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { occurredAt: "desc" }],
    });

    const data = movements.map((movement) =>
      mapMovementToRequestRow({
        ...movement,
        stockItem: movement.stockItem,
      })
    );

    res.json({
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      all: true,
    });
    return;
  }

  // 2. Batch-aware pagination:
  // Find distinct batches matching filter, paginated by batches to prevent batch splitting across pages
  const distinctBatches = await prisma.inventoryMovement.findMany({
    where,
    select: { requestBatchId: true, createdAt: true },
    distinct: ["requestBatchId"],
    orderBy: { createdAt: "desc" },
  });

  const totalBatches = distinctBatches.length;
  const pagedBatchIds = distinctBatches
    .slice((page - 1) * limit, page * limit)
    .map((b) => b.requestBatchId)
    .filter((id): id is string => Boolean(id));

  const movements = pagedBatchIds.length > 0
    ? await prisma.inventoryMovement.findMany({
        where: {
          requestBatchId: { in: pagedBatchIds },
          ...(where.status ? { status: where.status } : {}),
        },
        include: {
          stockItem: {
            select: { id: true, sku: true, name: true, unit: true, category: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { occurredAt: "desc" }],
      })
    : [];

  const data = movements.map((movement) =>
    mapMovementToRequestRow({
      ...movement,
      stockItem: movement.stockItem,
    })
  );

  res.json({
    data,
    total: totalBatches,
    totalMovements: data.length,
    page,
    limit,
    totalPages: Math.ceil(totalBatches / limit) || 1,
  });
});

router.get("/movements", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const stockItemId = String(req.query.stockItemId ?? "").trim();
  const project = String(req.query.project ?? "").trim();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const all = String(req.query.all ?? "").toLowerCase() === "true";

  const where: any = {};
  if (type === "CHECK_IN" || type === "CHECK_OUT") {
    where.movementType = type;
  }
  if (stockItemId.length > 0) {
    where.stockItemId = stockItemId;
  }
  if (project && project !== "ALL") {
    where.projectFor = { equals: project, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip: all ? undefined : (page - 1) * limit,
      take: all ? undefined : limit,
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

router.post("/requests", requireAuth, requirePermission("inventory:request"), async (req: Request, res: Response) => {
  const parsed = CreateInventoryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { items, project, requestedFor, team, timestamp } = parsed.data;

  // Derive requester identity strictly from authenticated user context — never client body
  const user = req.user!;
  const requestedBy = user.email || (user as any)?.displayName || "authenticated_user";
  const userDisplayName = (user as any)?.displayName || user.email || "";
  const projectFor = toStringOrUndefined(project) ?? "ROMS Inventory";

  const userRoles = (user.roles || []) as string[];
  const userPerms = (user.permissions || []) as string[];
  const isAdmin =
    userRoles.includes(Role.ADMIN) ||
    userRoles.includes(Role.RESEARCH_ADMIN) ||
    userPerms.includes("admin:all") ||
    userPerms.includes("inventory:manage");

  // Validate requester project against trusted database assignment source
  if (projectFor !== "ROMS Inventory") {
    const [masterProject, studyProject] = await Promise.all([
      prisma.inventoryMasterData.findFirst({
        where: { project: { equals: projectFor, mode: "insensitive" } },
      }),
      prisma.study.findFirst({
        where: {
          OR: [
            { code: { equals: projectFor, mode: "insensitive" } },
            { title: { contains: projectFor, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    if (!masterProject && !studyProject) {
      res.status(400).json({
        code: "INVALID_PROJECT",
        message: `Project "${projectFor}" is not recognized in system master data or active projects.`,
      });
      return;
    }

    // For non-administrative users, strictly verify project assignment in StaffProfile or MasterData
    if (!isAdmin) {
      const staffProfile = user.id
        ? await prisma.staffProfile.findUnique({
            where: { userId: user.id },
            select: { mntdProject: true, mntdProjectsInvolved: true },
          })
        : null;

      let isAssigned = false;
      const targetLower = projectFor.trim().toLowerCase();

      if (staffProfile) {
        const primaryLower = (staffProfile.mntdProject || "").trim().toLowerCase();
        if (primaryLower === targetLower) {
          isAssigned = true;
        } else if (Array.isArray(staffProfile.mntdProjectsInvolved)) {
          isAssigned = staffProfile.mntdProjectsInvolved.some(
            (p) => p.trim().toLowerCase() === targetLower
          );
        }
      }

      if (!isAssigned && masterProject && masterProject.staff) {
        const staffTokens = masterProject.staff.split(/[,/]| and /).map((s) => s.trim().toLowerCase());
        const userDisplayLower = userDisplayName.trim().toLowerCase();
        const userEmailLower = (user.email || "").trim().toLowerCase();
        if (staffTokens.includes(userDisplayLower) || staffTokens.includes(userEmailLower)) {
          isAssigned = true;
        }
      }

      // Strictly reject if not assigned (exact matching required)
      if (!isAssigned) {
        res.status(403).json({
          code: "UNAUTHORIZED_PROJECT",
          message: `Requester is not assigned to project "${projectFor}". Verified project assignment in Staff Profile or Master Data is required.`,
        });
        return;
      }
    }
  }

  // Approver is resolved strictly from database project assignment
  const resolvedApprovers = await resolveApproversForProject(projectFor);
  const approver = formatApproversField(resolvedApprovers);
  const occurredAt = timestamp ?? new Date();
  const batchId = randomUUID();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const createdRows = await Promise.all(
        items.map(async (rawItem) => {
          const stockItemId = toStringOrUndefined(rawItem.id);
          const stockItem = stockItemId ? await tx.stockItem.findUnique({ where: { id: stockItemId } }) : null;
          if (!stockItemId || !stockItem) {
            throw new Error("INVALID_ITEM_ID");
          }

          const requestedQuantity = Math.max(0, Math.floor(toNumberOrUndefined(rawItem.quantity) ?? 0));
          const requestedUnit = toStringOrUndefined(rawItem.unit) ?? stockItem.unit ?? "units";
          const requestedUnitDesc = toStringOrUndefined(rawItem.unitDescription);
          const userRemark = toStringOrUndefined(rawItem.remark) ?? "Requested by user";
          let finalRemark = requestedUnit !== (stockItem.unit ?? "units")
            ? (userRemark ? `${userRemark} [Unit: ${requestedUnit}]` : `[Unit: ${requestedUnit}]`)
            : userRemark;
          if (requestedUnitDesc) {
            finalRemark = finalRemark ? `${finalRemark} [UnitDesc: ${requestedUnitDesc}]` : `[UnitDesc: ${requestedUnitDesc}]`;
          }

          const lotNumber = toStringOrUndefined(rawItem.lotNumber) ?? null;

          return tx.inventoryMovement.create({
            data: {
              requestBatchId: batchId,
              stockItemId,
              movementType: "CHECK_OUT",
              quantity: requestedQuantity,
              requestedQuantity,
              requestedBy,
              requestedFor: requestedFor ?? null,
              recipient: requestedFor ?? null,
              destination: projectFor,
              projectFor,
              team: team ?? null,
              approver,
              lotNumber,
              status: "PENDING",
              remark: finalRemark,
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

      // Durable transaction-level audit log entry
      await createAuditEntryTx(tx, {
        userId: req.user?.id,
        entityType: "InventoryRequest",
        entityId: batchId,
        action: "CREATE",
        afterJson: {
          batchId,
          requestedBy,
          requestedFor,
          projectFor,
          itemCount: createdRows.length,
        },
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

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

router.patch("/requests/:id/disburse", requireAuth, requirePermission("inventory:disburse"), async (req: Request, res: Response) => {
  const movementId = req.params.id;
  try {
    const markAsDisbursed = req.body?.disbursed !== false;
    const reversalReason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const user = req.user!;
    const userRoles = (user.roles || []) as string[];
    const userPerms = (user.permissions || []) as string[];
    const isManagerOrAdmin =
      userRoles.includes(Role.ADMIN) ||
      userRoles.includes(Role.RESEARCH_ADMIN) ||
      userPerms.includes("admin:all") ||
      userPerms.includes("inventory:manage");

    // If reversing disbursement, enforce administrative authority and mandatory documented reason
    if (!markAsDisbursed) {
      if (!isManagerOrAdmin) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "Only inventory managers and administrators are authorized to reverse a recorded disbursement.",
        });
        return;
      }
      if (!reversalReason) {
        res.status(400).json({
          code: "REASON_REQUIRED",
          message: "A documented reason is required to reverse a disbursement record.",
        });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Row lock the movement
      const movementRows = await tx.$queryRaw<any[]>(
        Prisma.sql`SELECT * FROM "InventoryMovement" WHERE id = ${movementId} FOR UPDATE`
      );
      const movement = movementRows[0];
      if (!movement) {
        throw new Error("NOT_FOUND");
      }

      if (movement.status !== "APPROVED" && movement.status !== "PARTIAL") {
        throw new Error("INVALID_STATE");
      }

      const officerName = (user as any)?.displayName || user?.email || "Inventory Officer";
      const today = new Date().toISOString().slice(0, 10);
      const currentRemark = movement.remark || "";
      let nextRemark = currentRemark;

      if (markAsDisbursed) {
        if (!currentRemark.includes("[DISBURSED]")) {
          const tag = `[DISBURSED on ${today} by ${officerName}]`;
          nextRemark = currentRemark ? `${currentRemark} · ${tag}` : tag;
        }
      } else {
        // Controlled audit reversal: record reversal tag rather than silent erasure
        if (!currentRemark.includes("[DISBURSED") && !currentRemark.includes("[ISSUED")) {
          throw new Error("NOT_DISBURSED");
        }
        const reversalTag = `[DISBURSEMENT_REVERSED on ${today} by ${officerName}: ${reversalReason}]`;
        nextRemark = currentRemark.replace(/·?\s*\[DISBURSED[^\]]*\]/g, ` · ${reversalTag}`).trim();
      }

      const updatedRecord = await tx.inventoryMovement.update({
        where: { id: movementId },
        data: { remark: nextRemark },
        include: {
          stockItem: {
            select: { id: true, sku: true, name: true, unit: true, category: true },
          },
        },
      });

      // Atomic transaction-level audit log entry
      await createAuditEntryTx(tx, {
        userId: user.id,
        entityType: "InventoryMovement",
        entityId: movementId,
        action: "UPDATE",
        beforeJson: { remark: currentRemark },
        afterJson: {
          remark: nextRemark,
          isDisbursed: markAsDisbursed,
          officer: officerName,
          reason: markAsDisbursed ? undefined : reversalReason,
        },
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      return updatedRecord;
    });

    res.json({
      success: true,
      data: mapMovementToRequestRow({
        ...updated,
        stockItem: updated.stockItem,
      }),
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      res.status(404).json({ code: "NOT_FOUND", message: "Request movement record not found." });
      return;
    }
    if (error.message === "INVALID_STATE") {
      res.status(400).json({ code: "INVALID_STATE", message: "Only approved or partially approved requests can be marked as disbursed." });
      return;
    }
    if (error.message === "NOT_DISBURSED") {
      res.status(400).json({ code: "NOT_DISBURSED", message: "Request movement is not currently marked as disbursed." });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.post("/request-decisions", requireAuth, requirePermission("inventory:approve"), async (req: Request, res: Response) => {
  const isInventoryViewOnly = (req.user?.permissions || []).some(
    (p) => p.toLowerCase() === "inventory:view-only"
  );
  if (isInventoryViewOnly) {
    res.status(403).json({
      code: "FORBIDDEN",
      message: "Your account is configured in View-Only mode for the Inventory module. Write operations are disabled.",
    });
    return;
  }

  const parsed = InventoryDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { items } = parsed.data;

  const user = req.user;
  let userDisplayName = (user as any)?.displayName;
  if (!userDisplayName && user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true },
    });
    if (dbUser?.displayName) {
      userDisplayName = dbUser.displayName;
    }
  }
  const userForAuth = { ...user, displayName: userDisplayName };
  const decisionTimestamp = new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const movementTx = tx as typeof tx & InventoryMovementPrisma;
      const createdRows = [];

      for (const rawItem of items) {
        const movementId = rawItem.movementId;
        // Lock the movement row for the duration of the transaction to prevent concurrent decisions
        const movementRows = await tx.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "InventoryMovement" WHERE id = ${movementId} FOR UPDATE`
        );
        const existingMovement = movementRows[0];

        if (!existingMovement) {
          throw new Error(`MOVEMENT_NOT_FOUND:${movementId}`);
        }

        // Invariant 1: Only pending requests can be decided
        if (existingMovement.status !== "PENDING") {
          throw new Error(`MOVEMENT_NOT_PENDING:${movementId}`);
        }

        // Invariant 2: Cannot modify an already disbursed or issued record
        if (existingMovement.remark?.includes("[DISBURSED]") || existingMovement.remark?.includes("[ISSUED]")) {
          throw new Error(`CANNOT_MODIFY_DISBURSED:${movementId}`);
        }

        // Invariant 3: Independently authorize user for THIS item's project & approver
        const itemProject = existingMovement.projectFor || "ROMS Inventory";
        const assignedApprover = existingMovement.approver || "ROMS Administrator";
        const isItemAuthorized = isUserAuthorizedForApprovers(userForAuth as any, assignedApprover, itemProject);
        if (!isItemAuthorized) {
          throw new Error(`UNAUTHORIZED_FOR_ITEM:${movementId}`);
        }

        // Invariant 4: Enforce original requested quantity from DB — cannot be inflated by client
        const originalRequestedQuantity = Math.max(0, existingMovement.requestedQuantity || existingMovement.quantity);
        const targetStatus = rawItem.status;
        let finalStatus: "APPROVED" | "REJECTED" | "PARTIAL" = targetStatus;
        let quantity = 0;

        if (targetStatus === "APPROVED") {
          quantity = originalRequestedQuantity;
        } else if (targetStatus === "REJECTED") {
          quantity = 0;
        } else if (targetStatus === "PARTIAL") {
          const accepted = Math.max(0, Math.floor(rawItem.acceptedQuantity ?? 0));
          if (accepted >= originalRequestedQuantity) {
            finalStatus = "APPROVED";
            quantity = originalRequestedQuantity;
          } else if (accepted <= 0) {
            finalStatus = "REJECTED";
            quantity = 0;
          } else {
            finalStatus = "PARTIAL";
            quantity = accepted;
          }
        }

        // Deduct approved quantity from stockItem with row locking
        const delta = quantity;
        if (delta > 0) {
          const stockItems = await tx.$queryRaw<any[]>(
            Prisma.sql`SELECT * FROM "StockItem" WHERE id = ${existingMovement.stockItemId} FOR UPDATE`
          );
          const stockItem = stockItems[0];
          if (!stockItem) {
            throw new Error("ITEM_NOT_FOUND");
          }

          const currentQuantity = Number(stockItem.quantity ?? 0);
          if (currentQuantity < delta) {
            throw new Error(`INSUFFICIENT_STOCK:${stockItem.name}`);
          }

          const nextQuantity = currentQuantity - delta;
          const nextCheckOutTotal = Number(stockItem.checkOutTotal ?? 0) + delta;
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

        const approverName = userDisplayName || user?.email || "Authorized Approver";
        const approverRemark = toStringOrUndefined(rawItem.remark);
        const summary =
          finalStatus === "REJECTED"
            ? `Rejected by ${approverName}${originalRequestedQuantity > 0 ? ` (${originalRequestedQuantity} requested)` : ""}`
            : finalStatus === "PARTIAL"
              ? `Partial approval by ${approverName}: accepted ${quantity} of ${originalRequestedQuantity}`
              : `Approved by ${approverName}${originalRequestedQuantity > 0 ? ` (${originalRequestedQuantity} requested)` : ""}`;

        let nextRemark = [summary, approverRemark ? `Approver remark: ${approverRemark}` : null].filter(Boolean).join(" · ");
        if (existingMovement.remark) {
          const unitMatch = existingMovement.remark.match(/\[Unit:\s*([^\]]+)\]/);
          if (unitMatch) nextRemark += ` ${unitMatch[0]}`;
          const unitDescMatch = existingMovement.remark.match(/\[UnitDesc:\s*([^\]]+)\]/);
          if (unitDescMatch) nextRemark += ` ${unitDescMatch[0]}`;
        }

        // Conditional status update: strictly requires status to be PENDING
        const updateResult = await tx.inventoryMovement.updateMany({
          where: { id: movementId, status: "PENDING" },
          data: {
            quantity,
            requestedQuantity: originalRequestedQuantity,
            status: finalStatus,
            approver: approverName,
            decisionAt: decisionTimestamp,
            remark: nextRemark,
          },
        });
        if (updateResult.count === 0) {
          throw new Error(`MOVEMENT_NOT_PENDING:${movementId}`);
        }

        const updated = await tx.inventoryMovement.findUnique({
          where: { id: movementId },
          include: {
            stockItem: {
              select: { id: true, sku: true, name: true, unit: true, category: true },
            },
          },
        });
        if (!updated) {
          throw new Error(`MOVEMENT_NOT_FOUND:${movementId}`);
        }

        // Durable atomic audit log
        await createAuditEntryTx(tx, {
          userId: req.user?.id,
          entityType: "InventoryMovement",
          entityId: movementId,
          action: "UPDATE",
          beforeJson: {
            status: existingMovement.status,
            quantity: existingMovement.quantity,
            requestedQuantity: existingMovement.requestedQuantity,
          },
          afterJson: {
            status: finalStatus,
            quantity,
            requestedQuantity: originalRequestedQuantity,
            approver: approverName,
          },
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });

        createdRows.push(updated);
      }

      return createdRows;
    });

    // Send email notification for approved items
    const approvedMovements = created.filter(
      (m: any) => m.status === "APPROVED" || m.status === "PARTIAL"
    );
    if (approvedMovements.length > 0) {
      const managerName = userDisplayName || user?.email || "Inventory Manager";
      const inventoryWorkerEmail = env.INVENTORY_DISPATCH_EMAIL || "betelihemashagrie21@gmail.com";
      const primaryProject = approvedMovements[0]?.projectFor || "ROMS Inventory";
      const requestedBy = approvedMovements[0]?.requestedBy;
      const requesterEmail = requestedBy && requestedBy.includes("@") ? requestedBy.trim() : null;

      const emailPayload = {
        managerName,
        project: primaryProject,
        requestedBy: requestedBy || "Staff Member",
        requestedFor: approvedMovements[0]?.requestedFor || undefined,
        items: approvedMovements.map((m: any) => ({
          name: m.stockItem?.name || "Inventory Item",
          quantity: Number(m.quantity ?? 0),
          unit: m.stockItem?.unit || "units",
          status: m.status,
        })),
      };

      sendApprovedRequestsNotificationEmail(inventoryWorkerEmail, emailPayload).catch((err) =>
        logger.error(err, "Error dispatching approved request email notification to Inventory Worker")
      );

      if (requesterEmail && requesterEmail.toLowerCase() !== inventoryWorkerEmail.toLowerCase()) {
        sendApprovedRequestsNotificationEmail(requesterEmail, emailPayload).catch((err) =>
          logger.error(err, "Error dispatching approved request email notification to Requester")
        );
      }
    }

    res.status(201).json({
      data: created.map((movement: any) =>
        mapMovementToRequestRow({
          ...movement,
          stockItem: movement.stockItem,
        })
      ),
    });
  } catch (error: any) {
    const message = error?.message || "";
    if (message.startsWith("MOVEMENT_NOT_PENDING:")) {
      res.status(409).json({ code: "CONFLICT", message: "One or more requests are not pending or have already been decided." });
      return;
    }
    if (message.startsWith("CANNOT_MODIFY_DISBURSED:")) {
      res.status(409).json({ code: "CONFLICT", message: "Cannot modify a request that has already been disbursed or issued." });
      return;
    }
    if (message.startsWith("UNAUTHORIZED_FOR_ITEM:")) {
      res.status(403).json({ code: "FORBIDDEN", message: "You are not authorized to make decisions for one or more items in this batch." });
      return;
    }
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      res.status(400).json({ code: "INSUFFICIENT_STOCK", message: `Insufficient stock for ${message.split(":")[1]}.` });
      return;
    }
    if (message.startsWith("MOVEMENT_NOT_FOUND:")) {
      res.status(404).json({ code: "NOT_FOUND", message: "One or more request items could not be found." });
      return;
    }
    logger.error(error);
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.get("/analytics", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const now = new Date();
  const sixtyDaysAhead = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1));
  const project = String(req.query.project ?? "").trim();

  if (project && project !== "ALL" && project !== "Overall") {
    const projectMovements = await prisma.inventoryMovement.findMany({
      where: {
        OR: [
          { projectFor: { equals: project, mode: "insensitive" } },
          { destination: { equals: project, mode: "insensitive" } },
        ],
      },
      include: {
        stockItem: true,
      },
      orderBy: { occurredAt: "desc" },
    });

    const [activeLoansLent, activeLoansBorrowed] = await Promise.all([
      prisma.projectLoan.findMany({
        where: { lenderProject: { equals: project, mode: "insensitive" }, status: "APPROVED" },
      }),
      prisma.projectLoan.findMany({
        where: { borrowerProject: { equals: project, mode: "insensitive" }, status: "APPROVED" },
      }),
    ]);

    // Aggregate by stockItemId
    const itemMap = new Map<string, {
      id: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      minThreshold: number;
      expiryDate: Date | null;
      checkInTotal: number;
      checkOutTotal: number;
      lentTotal: number;
      borrowedTotal: number;
      quantity: number;
    }>();

    for (const m of projectMovements) {
      if (!m.stockItem) continue;
      const existing = itemMap.get(m.stockItemId) || {
        id: m.stockItem.id,
        sku: m.stockItem.sku,
        name: m.stockItem.name,
        category: m.stockItem.category || "General",
        unit: m.stockItem.unit || "units",
        minThreshold: m.stockItem.minThreshold || 5,
        expiryDate: m.stockItem.expiryDate,
        checkInTotal: 0,
        checkOutTotal: 0,
        lentTotal: 0,
        borrowedTotal: 0,
        quantity: 0,
      };

      if (m.movementType === "CHECK_IN" && m.status === "APPROVED") {
        existing.checkInTotal += Number(m.quantity || 0);
        if (m.expiryDate && (!existing.expiryDate || m.expiryDate < existing.expiryDate)) {
          existing.expiryDate = m.expiryDate;
        }
      } else if (m.movementType === "CHECK_OUT" && (m.status === "APPROVED" || m.status === "PARTIAL")) {
        existing.checkOutTotal += Number(m.quantity || 0);
      }
      itemMap.set(m.stockItemId, existing);
    }

    // Factor in loans
    for (const l of activeLoansLent) {
      const item = itemMap.get(l.stockItemId);
      if (item) {
        item.lentTotal += Number(l.approvedQuantity || l.requestedQuantity || 0);
      }
    }
    for (const l of activeLoansBorrowed) {
      let item = itemMap.get(l.stockItemId);
      if (!item) {
        const stock = await prisma.stockItem.findUnique({ where: { id: l.stockItemId } });
        if (stock) {
          item = {
            id: stock.id,
            sku: stock.sku,
            name: stock.name,
            category: stock.category || "General",
            unit: stock.unit || "units",
            minThreshold: stock.minThreshold || 5,
            expiryDate: stock.expiryDate,
            checkInTotal: 0,
            checkOutTotal: 0,
            lentTotal: 0,
            borrowedTotal: 0,
            quantity: 0,
          };
          itemMap.set(l.stockItemId, item);
        }
      }
      if (item) {
        item.borrowedTotal += Number(l.approvedQuantity || l.requestedQuantity || 0);
      }
    }

    const projectItems = Array.from(itemMap.values()).map((item) => {
      const qty = Math.max(0, item.checkInTotal - item.checkOutTotal - item.lentTotal + item.borrowedTotal);
      return { ...item, quantity: qty };
    });

    const totalItems = projectItems.length;
    const totalQuantity = projectItems.reduce((sum, r) => sum + r.quantity, 0);
    const totalCheckIn = projectItems.reduce((sum, r) => sum + r.checkInTotal, 0);
    const totalCheckOut = projectItems.reduce((sum, r) => sum + r.checkOutTotal, 0);

    const calcProjectPercent = (r: (typeof projectItems)[0]) => {
      if (r.quantity <= 0) return 0;
      const baseIn = r.checkInTotal + r.borrowedTotal;
      if (baseIn > 0) return (r.quantity / baseIn) * 100;
      return 100;
    };

    const outOfStockItems = projectItems.filter((r) => r.quantity <= 0).length;
    const lowStockItems = projectItems.filter((r) => {
      const pct = calcProjectPercent(r);
      return r.quantity > 0 && (pct < 50 || r.quantity <= r.minThreshold);
    }).length;
    const healthyItems = projectItems.filter((r) => r.quantity > r.minThreshold && calcProjectPercent(r) >= 75).length;
    const atRiskItems = lowStockItems + outOfStockItems;

    const categoryMap = new Map<string, { category: string; count: number; quantity: number; checkOut: number }>();
    projectItems.forEach((row) => {
      const category = row.category.trim() || "Unclassified";
      const current = categoryMap.get(category) ?? { category, count: 0, quantity: 0, checkOut: 0 };
      current.count += 1;
      current.quantity += row.quantity;
      current.checkOut += row.checkOutTotal;
      categoryMap.set(category, current);
    });
    const categoryBreakdown = [...categoryMap.values()].sort((a, b) => b.quantity - a.quantity);

    const topDemandItems = [...projectItems]
      .sort((a, b) => b.checkOutTotal - a.checkOutTotal)
      .slice(0, 8);

    const criticalItems = [...projectItems]
      .filter((r) => r.quantity <= r.minThreshold)
      .sort((a, b) => a.quantity - b.quantity || b.checkOutTotal - a.checkOutTotal)
      .slice(0, 8);

    const expiringSoonItems = projectItems
      .filter((r) => r.expiryDate && r.expiryDate >= now && r.expiryDate <= sixtyDaysAhead && r.quantity > 0)
      .sort((a, b) => (a.expiryDate?.getTime() ?? 0) - (b.expiryDate?.getTime() ?? 0))
      .slice(0, 10);
    const expiringSoonCount = expiringSoonItems.length;

    const expiredItems = projectItems
      .filter((r) => r.expiryDate && r.expiryDate < now && r.quantity > 0)
      .slice(0, 10);
    const expiredCount = expiredItems.length;

    const months: Array<{ key: string; label: string; checkIn: number; checkOut: number; stockRisk: number }> = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const key = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
      months.push({ key, label, checkIn: 0, checkOut: 0, stockRisk: 0 });
    }

    projectMovements.forEach((m) => {
      if (m.movementType === "CHECK_OUT" && m.status !== "APPROVED" && m.status !== "PARTIAL") return;
      const occurredAt = new Date(m.occurredAt);
      const key = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((month) => month.key === key);
      if (!bucket) return;
      if (m.movementType === "CHECK_IN") bucket.checkIn += Number(m.quantity || 0);
      else bucket.checkOut += Number(m.quantity || 0);
    });

    const usageRecords = projectMovements
      .filter((m) => m.movementType === "CHECK_OUT" && (m.status === "APPROVED" || m.status === "PARTIAL"))
      .slice(0, 100)
      .map((m, index) => ({
        id: `${m.stockItemId}-${m.occurredAt.toISOString()}-${index}`,
        stockItemId: m.stockItemId,
        itemName: m.stockItem?.name ?? "Unknown item",
        itemCode: m.stockItem?.sourceCode ?? m.stockItem?.sku ?? "",
        category: m.stockItem?.category ?? "Unclassified",
        quantity: Number(m.quantity ?? 0),
        requestedBy: String(m.requestedBy ?? m.recipient ?? "Unknown User"),
        projectFor: String(m.projectFor ?? m.destination ?? project),
        status: String(m.status ?? "APPROVED"),
        occurredAt: m.occurredAt,
      }));

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
        expiredItems: expiredCount,
      },
      categoryBreakdown,
      topDemandItems,
      criticalItems,
      expiringSoonItems,
      expiringSoonCount,
      expiredItems,
      expiredCount,
      monthlyTrends: months,
      usageRecords,
    });
    return;
  }

  const [stockItems, recentMovements, usageMovementRows, expiringSoonItems, expiredItems, expiredCount, expiringSoonCount] = await Promise.all([
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
    // Memory-bounded: only read movements for the active 6-month historical window
    prisma.inventoryMovement.findMany({
      where: {
        occurredAt: { gte: sixMonthsAgo },
      },
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
    // Memory-bounded: recent usage records limited to top 100
    prisma.inventoryMovement.findMany({
      where: {
        movementType: "CHECK_OUT",
        status: { in: ["APPROVED", "PARTIAL"] },
      },
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
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.stockItem.findMany({
      where: {
        expiryDate: {
          not: null,
          gte: now, // Lower bound: only items expiring in the future
          lte: sixtyDaysAhead, // Upper bound: within 60 days
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
    }),
    prisma.stockItem.findMany({
      where: {
        expiryDate: {
          not: null,
          lt: now, // Already expired
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
    }),
    prisma.stockItem.count({
      where: {
        expiryDate: {
          not: null,
          lt: now,
        },
      },
    }),
    prisma.stockItem.count({
      where: {
        expiryDate: {
          not: null,
          gte: now,
          lte: sixtyDaysAhead,
        },
      },
    }),
  ]);

  const movements = recentMovements;

  const totalItems = stockItems.length;
  const totalQuantity = stockItems.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const totalCheckIn = stockItems.reduce((sum, row) => sum + Number(row.checkInTotal ?? 0), 0);
  const totalCheckOut = stockItems.reduce((sum, row) => sum + Number(row.checkOutTotal ?? 0), 0);
  const calcPercentBalance = (row: any) => {
    const qty = Number(row.quantity ?? 0);
    const checkOut = Number(row.checkOutTotal ?? 0);
    const checkIn = Number(row.checkInTotal ?? (qty + checkOut));
    if (qty <= 0) return 0;
    if (checkIn > 0) return (qty / checkIn) * 100;
    return 100;
  };

  const outOfStockItems = stockItems.filter((row) => calcPercentBalance(row) <= 0).length;
  const lowStockItems = stockItems.filter((row) => {
    const pct = calcPercentBalance(row);
    return pct > 0 && pct < 50;
  }).length;
  const moderateStockItems = stockItems.filter((row) => {
    const pct = calcPercentBalance(row);
    return pct >= 50 && pct < 75;
  }).length;
  const healthyItems = stockItems.filter((row) => calcPercentBalance(row) >= 75).length;
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

  const months: Array<{ key: string; label: string; checkIn: number; checkOut: number; stockRisk: number }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    months.push({ key, label, checkIn: 0, checkOut: 0, stockRisk: 0 });
  }

  movements.forEach((movement) => {
    // Only completed/approved checkout movements count as consumption!
    // Pending requests and rejected requests must NEVER count towards usage.
    if (movement.movementType === "CHECK_OUT" && movement.status !== "APPROVED" && movement.status !== "PARTIAL") {
      return;
    }
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
      // Pending requests and rejected requests must NEVER alter historical stock reconstruction!
      if (movement.movementType === "CHECK_OUT" && movement.status !== "APPROVED" && movement.status !== "PARTIAL") {
        return;
      }
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
  const usageRecords = usageMovementRows.map((movement, index) => {
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
  });

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
      expiredItems: expiredCount,
    },
    categoryBreakdown,
    topDemandItems,
    criticalItems,
    expiringSoonItems,
    expiringSoonCount,
    expiredItems,
    expiredCount,
    monthlyTrends: months,
    usageRecords,
  });
});

// POST /google-sheets/sync - Sync inventory with Google Sheets
router.post("/google-sheets/sync", requireAuth, requireRole(Role.ADMIN, Role.RESEARCH_ADMIN), async (req, res) => {
  try {
    const result = await GoogleSheetsSyncService.pullAll(prisma);
    res.json({
      success: true,
      message: `Successfully synchronized inventory with ${result.source === "google" ? "Google Sheets" : "local fallback CSVs"}. (Stock Items: ${result.importedStockItems}, Check-ins: ${result.importedCheckIns}, Check-outs: ${result.importedCheckOuts}, Master Data: ${result.importedMasterData})`,
      importedCount: result.importedStockItems,
      importedStockItems: result.importedStockItems,
      importedCheckIns: result.importedCheckIns,
      importedCheckOuts: result.importedCheckOuts,
      importedMasterData: result.importedMasterData,
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

// ─── Inter-Project Loans & Project Stock Ledger ──────────────────────────────

export function getApproverForProjectFallback(project?: string | null): string {
  if (!project) return "Assalif Demissew";
  const p = project.toUpperCase();
  if (p.includes("TES")) return "Alemayehu Godana, Migbaru Kefallew, Wakweya Chali";
  if (p.includes("VECTOR")) return "Assalif Demissew";
  if (p.includes("PARASITE") || p.includes("PARACITE")) return "Migbaru Kefallew, Alemayehu Godana";
  if (p.includes("HAMMS")) return "Assalif Demissew";
  if (p.includes("ANOSTEP")) return "Assalif Demissew";
  if (p.includes("PVSTATEM") || p.includes("PVSERO")) return "Tilahun Ketema, Tadele Emiru";
  if (p.includes("CDC")) return "Assalif Demissew";
  if (p.includes("DRIVAX")) return "Wakweya Chali";
  return "Assalif Demissew";
}

export function isUserApproverForProject(
  user: { displayName?: string | null; email?: string | null; roles?: string[] } | null | undefined,
  project?: string | null,
  approverField?: string | null
): boolean {
  if (!user) return false;
  const roles = user.roles || [];
  if (roles.includes("ADMIN") || roles.includes("RESEARCH_ADMIN")) return true;

  const userDisplayName = (user.displayName ?? "").toLowerCase().trim();
  const userEmail = (user.email ?? "").toLowerCase().trim();
  const assignedStr = (approverField || "").trim();
  const fallbackStr = getApproverForProjectFallback(project);
  const combined = `${assignedStr}, ${fallbackStr}`.toLowerCase();

  const names = combined.split(/[,/]| and /).map((n) => n.trim()).filter(Boolean);

  for (const name of names) {
    if (name.includes("alemayehu") && (userDisplayName.includes("alemayehu") || userEmail.includes("alexbiology"))) return true;
    if (name.includes("migbaru") && (userDisplayName.includes("migbaru") || userEmail.includes("migbaru"))) return true;
    if (name.includes("assalif") && (userDisplayName.includes("assalif") || userEmail.includes("ashifera") || userEmail.includes("assalif"))) return true;
    if (name.includes("tilahun") && (userDisplayName.includes("tilahun") || userEmail.includes("tilahun"))) return true;
    if (name.includes("wakweya") && (userDisplayName.includes("wakweya") || userEmail.includes("wakeya") || userEmail.includes("wakweya"))) return true;
    if (name.includes("tadele") && (userDisplayName.includes("tadele") || userEmail.includes("tadele"))) return true;

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 0 && parts.every((p) => userDisplayName.includes(p) || userEmail.includes(p))) {
      return true;
    }
  }

  return false;
}

// GET /domains/inventory/project-stock - Get real-time stock balance held by each project
router.get("/project-stock", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const project = String(req.query.project ?? "").trim();

  const whereMovements: any = {};
  if (project && project !== "ALL") {
    whereMovements.OR = [
      { projectFor: { equals: project, mode: "insensitive" } },
      { destination: { equals: project, mode: "insensitive" } },
    ];
  }

  const [movements, activeLoans] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: whereMovements,
      include: {
        stockItem: {
          select: { id: true, sku: true, name: true, unit: true, category: true, quantity: true },
        },
      },
    }),
    prisma.projectLoan.findMany({
      where: { status: "APPROVED" },
    }),
  ]);

  const map = new Map<string, {
    stockItemId: string;
    project: string;
    name: string;
    sku: string;
    unit: string;
    category: string;
    totalCheckIn: number;
    totalCheckOut: number;
    loanedOut: number;
    loanedIn: number;
    availableBalance: number;
  }>();

  for (const m of movements) {
    const proj = (m.projectFor || m.destination || "ROMS Inventory").trim();
    if (!proj || proj === "ROMS Inventory") continue;
    if (project && project !== "ALL" && proj.toLowerCase() !== project.toLowerCase()) continue;

    const key = `${m.stockItemId}__${proj}`;
    const cur = map.get(key) || {
      stockItemId: m.stockItemId,
      project: proj,
      name: m.stockItem?.name || "Unknown",
      sku: m.stockItem?.sku || "—",
      unit: m.stockItem?.unit || "units",
      category: m.stockItem?.category || "General",
      totalCheckIn: 0,
      totalCheckOut: 0,
      loanedOut: 0,
      loanedIn: 0,
      availableBalance: 0,
    };

    if (m.movementType === "CHECK_IN" && m.status === "APPROVED") {
      cur.totalCheckIn += Number(m.quantity || 0);
    } else if (m.movementType === "CHECK_OUT" && (m.status === "APPROVED" || m.status === "PARTIAL")) {
      cur.totalCheckOut += Number(m.quantity || 0);
    }
    map.set(key, cur);
  }

  for (const l of activeLoans) {
    const lenderKey = `${l.stockItemId}__${l.lenderProject}`;
    if (map.has(lenderKey)) {
      const cur = map.get(lenderKey)!;
      cur.loanedOut += Number(l.approvedQuantity || l.requestedQuantity || 0);
    }
    const borrowerKey = `${l.stockItemId}__${l.borrowerProject}`;
    if (map.has(borrowerKey)) {
      const cur = map.get(borrowerKey)!;
      cur.loanedIn += Number(l.approvedQuantity || l.requestedQuantity || 0);
    }
  }

  const result = Array.from(map.values())
    .map((row) => ({
      ...row,
      availableBalance: Math.max(0, row.totalCheckIn - row.totalCheckOut - row.loanedOut + row.loanedIn),
    }))
    .filter((row) => row.availableBalance > 0);

  res.json({ data: result });
});

// GET /domains/inventory/loans - List all inter-project loan requests
router.get("/loans", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const status = String(req.query.status ?? "").trim();
  const project = String(req.query.project ?? "").trim();
  const search = String(req.query.search ?? "").trim();

  const where: any = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (project && project !== "ALL") {
    where.OR = [
      { borrowerProject: { equals: project, mode: "insensitive" } },
      { lenderProject: { equals: project, mode: "insensitive" } },
    ];
  }
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { loanCode: { contains: search, mode: "insensitive" } },
          { requestedBy: { contains: search, mode: "insensitive" } },
          { stockItem: { name: { contains: search, mode: "insensitive" } } },
          { stockItem: { sku: { contains: search, mode: "insensitive" } } },
          { borrowerProject: { contains: search, mode: "insensitive" } },
          { lenderProject: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const loans = await prisma.projectLoan.findMany({
    where,
    include: {
      stockItem: {
        select: { id: true, sku: true, name: true, unit: true, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: loans, total: loans.length });
});

// GET /domains/inventory/loans/pending-count - Pending loans requiring user's decision
router.get("/loans/pending-count", requireAuth, requirePermission("inventory:read"), async (req: Request, res: Response) => {
  const user = req.user;
  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.RESEARCH_ADMIN);

  const pendingLoans = await prisma.projectLoan.findMany({
    where: { status: "PENDING" },
    select: { id: true, lenderProject: true, requestedTo: true },
  });

  if (isAdmin) {
    res.json({ count: pendingLoans.length });
    return;
  }

  let userDisplayName = ((user as any)?.displayName ?? "").toLowerCase().trim();
  const userEmail = (user?.email ?? "").toLowerCase().trim();
  if (!userDisplayName && user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } });
    if (dbUser?.displayName) userDisplayName = dbUser.displayName.toLowerCase().trim();
  }

  const userWithDisplayName = { ...user, displayName: userDisplayName };

  const count = pendingLoans.filter((loan) => {
    if (loan.requestedTo) {
      const reqToLower = loan.requestedTo.toLowerCase();
      if (userEmail && reqToLower.includes(userEmail)) return true;
      if (userDisplayName && reqToLower.includes(userDisplayName)) return true;
    }
    return isUserApproverForProject(userWithDisplayName, loan.lenderProject, loan.requestedTo);
  }).length;

  res.json({ count });
});

// POST /domains/inventory/loans - Create new inter-project loan request (single or batch)
router.post("/loans", requireAuth, requirePermission("inventory:request"), async (req: Request, res: Response) => {
  // 1. Batch support: if body contains items array
  if (Array.isArray(req.body.items)) {
    const parsedBatch = CreateProjectLoanBatchSchema.safeParse(req.body);
    if (!parsedBatch.success) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsedBatch.error.flatten() });
      return;
    }

    const createdLoans = [];
    const startCount = await prisma.projectLoan.count();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < parsedBatch.data.items.length; i++) {
      const item = parsedBatch.data.items[i];
      if (item.borrowerProject.trim().toLowerCase() === item.lenderProject.trim().toLowerCase()) {
        res.status(400).json({ code: "INVALID_PROJECT", message: "Borrowing project and lending project cannot be the same" });
        return;
      }

      const stockItem = await prisma.stockItem.findUnique({ where: { id: item.stockItemId } });
      if (!stockItem) {
        res.status(404).json({ code: "ITEM_NOT_FOUND", message: `Stock item not found for id ${item.stockItemId}` });
        return;
      }

      const approvers = await resolveApproversForProject(item.lenderProject);
      const fallbackApproverName = getApproverForProjectFallback(item.lenderProject);
      const hasSpecificApprovers = approvers.some(
        (a) => a.displayName && !a.displayName.toLowerCase().includes("administrator")
      );
      const requestedToStr = hasSpecificApprovers
        ? approvers.map((a) => a.displayName).join(", ")
        : fallbackApproverName;

      const loanCode = `LN-${currentYear}-${String(startCount + i + 1).padStart(4, "0")}`;

      const loan = await prisma.projectLoan.create({
        data: {
          loanCode,
          stockItemId: item.stockItemId,
          borrowerProject: item.borrowerProject.trim(),
          lenderProject: item.lenderProject.trim(),
          requestedBy: (req.user as any)?.displayName || req.user?.email || "Unknown Requester",
          requestedTo: requestedToStr,
          requestedQuantity: item.requestedQuantity,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          requestNotes: item.requestNotes ? item.requestNotes.trim() : null,
          status: "PENDING",
        },
        include: {
          stockItem: true,
        },
      });

      for (const approver of approvers) {
        try {
          await prisma.notification.create({
            data: {
              userId: approver.id,
              kind: "IN_APP",
              title: `Inter-Project Loan Request: ${loan.loanCode}`,
              body: `${loan.requestedBy} requested to loan ${item.requestedQuantity} ${stockItem.unit} of ${stockItem.name} from ${item.lenderProject} to ${item.borrowerProject}.`,
            },
          });
        } catch (notifErr) {
          logger.warn(notifErr, `Failed to deliver notification to approver ${approver.email}`);
        }
      }

      await createAuditEntry({
        action: "CREATE",
        entityType: "ProjectLoan",
        entityId: loan.id,
        userId: req.user?.id || "system",
        afterJson: {
          operation: "inventory:loan:requested",
          loanCode: loan.loanCode,
          stockItemId: item.stockItemId,
          borrowerProject: item.borrowerProject,
          lenderProject: item.lenderProject,
          requestedQuantity: item.requestedQuantity,
          requestedBy: loan.requestedBy,
          requestedTo: requestedToStr,
        },
      });

      createdLoans.push(loan);
    }

    res.status(201).json({ data: createdLoans, count: createdLoans.length, message: `Successfully submitted ${createdLoans.length} inter-project loan request(s)` });
    return;
  }

  // 2. Single item support
  const parsed = CreateProjectLoanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { stockItemId, borrowerProject, lenderProject, requestedQuantity, dueDate, requestNotes } = parsed.data;

  if (borrowerProject.trim().toLowerCase() === lenderProject.trim().toLowerCase()) {
    res.status(400).json({ code: "INVALID_PROJECT", message: "Borrowing project and lending project cannot be the same" });
    return;
  }

  const stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!stockItem) {
    res.status(404).json({ code: "ITEM_NOT_FOUND", message: "Stock item not found" });
    return;
  }

  const approvers = await resolveApproversForProject(lenderProject);
  const fallbackApproverName = getApproverForProjectFallback(lenderProject);
  const hasSpecificApprovers = approvers.some(
    (a) => a.displayName && !a.displayName.toLowerCase().includes("administrator")
  );
  const requestedToStr = hasSpecificApprovers
    ? approvers.map((a) => a.displayName).join(", ")
    : fallbackApproverName;

  const count = await prisma.projectLoan.count();
  const loanCode = `LN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const loan = await prisma.projectLoan.create({
    data: {
      loanCode,
      stockItemId,
      borrowerProject: borrowerProject.trim(),
      lenderProject: lenderProject.trim(),
      requestedBy: (req.user as any)?.displayName || req.user?.email || "Unknown Requester",
      requestedTo: requestedToStr,
      requestedQuantity,
      dueDate: dueDate ? new Date(dueDate) : null,
      requestNotes: requestNotes ? requestNotes.trim() : null,
      status: "PENDING",
    },
    include: {
      stockItem: true,
    },
  });

  for (const approver of approvers) {
    try {
      await prisma.notification.create({
        data: {
          userId: approver.id,
          kind: "IN_APP",
          title: `Inter-Project Loan Request: ${loan.loanCode}`,
          body: `${loan.requestedBy} requested to loan ${requestedQuantity} ${stockItem.unit} of ${stockItem.name} from ${lenderProject} to ${borrowerProject}.`,
        },
      });
    } catch (notifErr) {
      logger.warn(notifErr, `Failed to deliver notification to approver ${approver.email}`);
    }
  }

  await createAuditEntry({
    action: "CREATE",
    entityType: "ProjectLoan",
    entityId: loan.id,
    userId: req.user?.id || "system",
    afterJson: {
      operation: "inventory:loan:requested",
      loanCode: loan.loanCode,
      stockItemId,
      borrowerProject,
      lenderProject,
      requestedQuantity,
      requestedBy: loan.requestedBy,
      requestedTo: requestedToStr,
    },
  });

  res.status(201).json({ data: loan, message: "Inter-project loan request created successfully" });
});

// POST /domains/inventory/loans/:id/decision - Approve or Reject inter-project loan
router.post("/loans/:id/decision", requireAuth, requirePermission("inventory:approve"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = ProjectLoanDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { status, approvedQuantity, decisionNotes } = parsed.data;

  const existing = await prisma.projectLoan.findUnique({
    where: { id },
    include: { stockItem: true },
  });
  if (!existing) {
    res.status(404).json({ code: "NOT_FOUND", message: "Loan record not found" });
    return;
  }
  if (existing.status !== "PENDING") {
    res.status(400).json({ code: "INVALID_STATE", message: `Loan is already ${existing.status}` });
    return;
  }

  // Verify that the user has permission to approve for this lender project
  const user = req.user;
  let userForAuth: any = user;
  if (!(user as any)?.displayName && user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } });
    if (dbUser?.displayName) userForAuth = { ...user, displayName: dbUser.displayName };
  }
  const isAuthorized = isUserApproverForProject(userForAuth, existing.lenderProject, existing.requestedTo);
  if (!isAuthorized) {
    res.status(403).json({
      code: "FORBIDDEN",
      message: `You are not authorized to make decisions on loan requests for project "${existing.lenderProject}". Assigned approver: ${existing.requestedTo || "Admin"}`,
    });
    return;
  }

  const finalApprovedQty = status === "APPROVED"
    ? (typeof approvedQuantity === "number" && approvedQuantity > 0 ? approvedQuantity : existing.requestedQuantity)
    : 0;

  const updated = await prisma.projectLoan.update({
    where: { id },
    data: {
      status,
      approvedQuantity: finalApprovedQty,
      decisionNotes: decisionNotes ? decisionNotes.trim() : null,
      decisionAt: new Date(),
    },
    include: { stockItem: true },
  });

  await createAuditEntry({
    action: "UPDATE",
    entityType: "ProjectLoan",
    entityId: updated.id,
    userId: req.user?.id || "system",
    afterJson: {
      operation: `inventory:loan:${status.toLowerCase()}`,
      loanCode: updated.loanCode,
      status,
      approvedQuantity: finalApprovedQty,
      decisionNotes,
      decidedBy: (req.user as any)?.displayName || req.user?.email,
    },
  });

  res.json({ data: updated, message: `Loan request has been ${status.toLowerCase()}` });
});

// PATCH /domains/inventory/loans/:id/return - Lender marks loaned items as returned
router.patch("/loans/:id/return", requireAuth, requirePermission("inventory:approve"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = ReturnProjectLoanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { returnedQuantity, returnNotes } = parsed.data;

  const existing = await prisma.projectLoan.findUnique({
    where: { id },
    include: { stockItem: true },
  });
  if (!existing) {
    res.status(404).json({ code: "NOT_FOUND", message: "Loan record not found" });
    return;
  }
  if (existing.status !== "APPROVED") {
    res.status(400).json({ code: "INVALID_STATE", message: "Only approved / active loans can be returned" });
    return;
  }

  const user = req.user;
  let userForAuth: any = user;
  if (!(user as any)?.displayName && user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } });
    if (dbUser?.displayName) userForAuth = { ...user, displayName: dbUser.displayName };
  }
  const isAuthorized = isUserApproverForProject(userForAuth, existing.lenderProject, existing.requestedTo);
  if (!isAuthorized) {
    res.status(403).json({
      code: "FORBIDDEN",
      message: `Only the lending project manager for "${existing.lenderProject}" or an authorized administrator can confirm the return of loaned items.`,
    });
    return;
  }

  const finalReturnQty = typeof returnedQuantity === "number" && returnedQuantity > 0
    ? returnedQuantity
    : (existing.approvedQuantity || existing.requestedQuantity);

  const updated = await prisma.projectLoan.update({
    where: { id },
    data: {
      status: "RETURNED",
      returnedQuantity: finalReturnQty,
      returnNotes: returnNotes ? returnNotes.trim() : null,
      returnedAt: new Date(),
      returnedBy: (req.user as any)?.displayName || req.user?.email || "Lender Manager",
    },
    include: { stockItem: true },
  });

  await createAuditEntry({
    action: "UPDATE",
    entityType: "ProjectLoan",
    entityId: updated.id,
    userId: req.user?.id || "system",
    afterJson: {
      operation: "inventory:loan:returned",
      loanCode: updated.loanCode,
      returnedQuantity: finalReturnQty,
      returnedBy: updated.returnedBy,
      returnNotes,
    },
  });

  res.json({ data: updated, message: "Loan items successfully recorded as returned to lender" });
});

router.get("/:id", requireAuth, requirePermission("inventory:read"), async (req, res) => {
  const item = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
  if (!item) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  res.json(item);
});

router.post("/", requireAuth, requirePermission("inventory:manage"), auditMutation("StockItem", "CREATE"), async (req, res) => {
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
          lotNumber: stockItemData.lotNumber ?? null,
          expiryDate: stockItemData.expiryDate ?? null,
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

router.post("/bulk-checkout", requireAuth, requirePermission("inventory:check-out"), async (req: Request, res: Response) => {
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

        // 1. Lock the StockItem row exclusively with FOR UPDATE to prevent concurrent checkouts
        const stockRows = await tx.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "StockItem" WHERE id = ${stockItemId} FOR UPDATE`
        );
        const existing = stockRows[0];
        if (!existing) {
          throw new Error(`ITEM_NOT_FOUND:${stockItemId}`);
        }

        const currentQty = Number(existing.quantity ?? 0);
        if (quantity > currentQty) {
          throw new Error(`INSUFFICIENT_STOCK:${existing.name}`);
        }

        // 2. Strict Lot balance verification & FEFO auto-allocation
        const suppliedLot = toStringOrUndefined(cartItem.lotNumber) ?? null;
        let finalLotNumber = suppliedLot;

        if (suppliedLot) {
          // Verify lot balance
          const [lotCheckIns, lotCheckOuts] = await Promise.all([
            tx.inventoryMovement.aggregate({
              where: { stockItemId, lotNumber: suppliedLot, movementType: "CHECK_IN" },
              _sum: { quantity: true },
            }),
            tx.inventoryMovement.aggregate({
              where: {
                stockItemId,
                lotNumber: suppliedLot,
                movementType: "CHECK_OUT",
                status: { in: ["APPROVED", "PARTIAL"] },
              },
              _sum: { quantity: true },
            }),
          ]);

          const totalLotIn = lotCheckIns._sum.quantity || 0;
          const totalLotOut = lotCheckOuts._sum.quantity || 0;
          const availableLotBalance = totalLotIn - totalLotOut;

          // If no check-ins exist for this lot, reject!
          if (totalLotIn === 0) {
            throw new Error(`UNKNOWN_LOT:${existing.name} (Lot "${suppliedLot}" has no check-in records)`);
          }

          // If requested quantity exceeds remaining lot balance, reject!
          if (quantity > availableLotBalance) {
            throw new Error(`INSUFFICIENT_LOT_BALANCE:${existing.name} (Lot "${suppliedLot}" available: ${availableLotBalance}, requested: ${quantity})`);
          }
          finalLotNumber = suppliedLot;
        } else {
          // FEFO auto-selection: find all check-in lots with active expiry dates ordered by expiryDate ASC
          const checkInLots = await tx.inventoryMovement.findMany({
            where: {
              stockItemId,
              movementType: "CHECK_IN",
              lotNumber: { not: null },
            },
            select: { lotNumber: true, expiryDate: true },
            orderBy: [{ expiryDate: "asc" }, { occurredAt: "asc" }],
          });

          // Unique candidate lots preserving FEFO order
          const distinctLots: Array<{ lotNumber: string; expiryDate: Date | null }> = [];
          const seen = new Set<string>();
          for (const item of checkInLots) {
            if (item.lotNumber && !seen.has(item.lotNumber)) {
              seen.add(item.lotNumber);
              distinctLots.push({ lotNumber: item.lotNumber, expiryDate: item.expiryDate });
            }
          }

          let fefoLotSelected: string | null = null;
          for (const cand of distinctLots) {
            const [candIn, candOut] = await Promise.all([
              tx.inventoryMovement.aggregate({
                where: { stockItemId, lotNumber: cand.lotNumber, movementType: "CHECK_IN" },
                _sum: { quantity: true },
              }),
              tx.inventoryMovement.aggregate({
                where: {
                  stockItemId,
                  lotNumber: cand.lotNumber,
                  movementType: "CHECK_OUT",
                  status: { in: ["APPROVED", "PARTIAL"] },
                },
                _sum: { quantity: true },
              }),
            ]);
            const lotBalance = (candIn._sum.quantity || 0) - (candOut._sum.quantity || 0);
            if (lotBalance >= quantity) {
              fefoLotSelected = cand.lotNumber;
              break;
            }
          }

          if (distinctLots.length > 0 && !fefoLotSelected) {
            throw new Error(`INSUFFICIENT_LOT_BALANCE:${existing.name} (No single lot has sufficient balance of ${quantity} units)`);
          }

          finalLotNumber = fefoLotSelected || existing.lotNumber || null;
        }

        // 3. Atomic conditional decrement on StockItem:
        const updateResult = await tx.stockItem.updateMany({
          where: { id: stockItemId, quantity: { gte: quantity } },
          data: {
            quantity: { decrement: quantity },
            checkOutTotal: { increment: quantity },
          },
        });
        if (updateResult.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${existing.name}`);
        }

        const updated = await tx.stockItem.findUnique({ where: { id: stockItemId } });
        if (!updated) {
          throw new Error(`ITEM_NOT_FOUND:${stockItemId}`);
        }

        const totalIn = Number(updated.checkInTotal ?? 0);
        const currentBal = Number(updated.quantity ?? 0);
        const finalBalancePercent = totalIn > 0 ? (currentBal / totalIn) * 100 : 0;
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: { balancePercent: finalBalancePercent },
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
            lotNumber: finalLotNumber || existing.lotNumber || null,
            status: "APPROVED",
            remark: String(remark ?? "Bulk checkout"),
            occurredAt: new Date(),
          },
        });

        updatedItems.push(updated);
        createdMovements.push({ ...movement, stockItem: updated });
      }

      // Durable atomic transaction audit log
      await createAuditEntryTx(tx, {
        userId: req.user?.id,
        entityType: "InventoryMovement",
        entityId: createdMovements[0]?.id || "bulk-checkout",
        action: "CREATE",
        afterJson: {
          operation: "BULK_CHECKOUT",
          itemCount: createdMovements.length,
          items: sortedItems.map((it) => ({
            stockItemId: it.stockItemId,
            quantity: it.quantity,
            projectFor: it.projectFor,
            recipient: it.requestedBy,
          })),
        },
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

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
    if (message.startsWith("UNKNOWN_LOT:")) {
      return res.status(400).json({ code: "UNKNOWN_LOT", error: message.replace("UNKNOWN_LOT:", "Unknown lot: ") });
    }
    if (message.startsWith("INSUFFICIENT_LOT_BALANCE:")) {
      return res.status(400).json({ code: "INSUFFICIENT_LOT_BALANCE", error: message.replace("INSUFFICIENT_LOT_BALANCE:", "Insufficient lot balance: ") });
    }
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ error: `Insufficient stock for ${message.split(":")[1]}.` });
    }
    if (message.startsWith("ITEM_NOT_FOUND:")) {
      return res.status(404).json({ error: "One or more items in the batch could not be found." });
    }
    res.status(500).json({ error: "Bulk checkout transaction failed." });
  }
});

router.post("/bulk-checkin", requireAuth, requirePermission("inventory:check-in"), async (req: Request, res: Response) => {
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
        const lotNumber = toStringOrUndefined(cartItem.lotNumber) ?? null;
        const expiryDate = toDateOrUndefined(cartItem.expiryDate);

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

          // FEFO policy: do not overwrite an earlier active expiry date with a later one!
          let nextExpiryDate = existing.expiryDate;
          if (expiryDate) {
            if (!existing.expiryDate || previousQuantity === 0 || expiryDate < existing.expiryDate) {
              nextExpiryDate = expiryDate;
            }
          }
          const nextLotNumber = lotNumber || existing.lotNumber;

          const updated = await tx.stockItem.update({
            where: { id: stockItemId },
            data: {
              quantity: nextQuantity,
              checkInTotal: nextCheckInTotal,
              balancePercent: nextBalancePercent,
              expiryDate: nextExpiryDate,
              lotNumber: nextLotNumber,
            },
          });

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
              lotNumber,
              expiryDate: expiryDate ?? null,
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
              lotNumber,
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
              lotNumber,
              expiryDate: expiryDate ?? null,
              remark,
              occurredAt: dateReceived,
            },
          });

          updatedItems.push(createdItem);
          createdMovements.push({ ...movement, stockItem: createdItem });
        }
      }

      // Durable atomic transaction audit log
      await createAuditEntryTx(tx, {
        userId: req.user?.id,
        entityType: "InventoryMovement",
        entityId: createdMovements[0]?.id || "bulk-checkin",
        action: "CREATE",
        afterJson: {
          operation: "BULK_CHECKIN",
          itemCount: createdMovements.length,
          items: createdMovements.map((m) => ({
            stockItemId: m.stockItemId,
            quantity: m.quantity,
            movementType: m.movementType,
            lotNumber: m.lotNumber,
          })),
        },
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

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

    createAuditEntry({
      userId: req.user?.id,
      entityType: "InventoryMovement",
      entityId: results.createdMovements[0]?.id || "bulk-checkin",
      action: "CREATE",
      afterJson: {
        operation: "BULK_CHECKIN",
        itemCount: results.createdMovements.length,
        items: items.map((it) => ({
          mode: it.mode,
          stockItemId: it.stockItemId,
          sku: it.sku,
          name: it.name,
          quantity: it.quantity,
          projectFor: it.projectFor,
        })),
      },
      ip: req.ip,
      userAgent: req.get("user-agent"),
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

router.patch("/:id", requireAuth, requirePermission("inventory:manage"), auditMutation("StockItem", "UPDATE"), async (req, res) => {
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

router.delete("/:id", requireAuth, requirePermission("inventory:manage"), auditMutation("StockItem", "DELETE"), async (req, res) => {
  const movementCount = await prisma.inventoryMovement.count({
    where: { stockItemId: req.params.id },
  });

  if (movementCount > 0) {
    res.status(400).json({
      code: "HAS_MOVEMENT_HISTORY",
      message: `Cannot delete stock item because it has ${movementCount} historical movement record(s). Preserving audit history is required for inventory governance.`,
    });
    return;
  }

  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
