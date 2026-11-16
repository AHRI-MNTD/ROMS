import { Router, Request, Response } from "express";
import prisma, { Prisma } from "@roms/db";
import { randomUUID } from "node:crypto";
import {
  ReagentAssayTypeSchema,
  ReagentCheckInSchema,
  ReagentCheckoutSchema,
  ReagentDecisionSchema,
  ReagentRequestSchema,
} from "@roms/shared";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { createAuditEntryTx } from "../audit/audit.service";
import { logger } from "../utils/logger";

const router = Router();

const VILLAGE_ASSAYS = new Set([
  "RNA extruction Magmax kit", "Sequensing", "unknowns", "Digital PCR",
  "Purification (DNA/RNA)", "RT-qPCR", "DNA ladder", "nPCR",
]);
const CONDITIONAL_VILLAGE_ASSAYS = new Set([
  "Sequencing primers", "qPCR", "leshimaniasis", "G6PD Primer",
  "RFLP drug Resistance primers",
]);

function requiresNumberOfVill(assayType: string, reagentType?: string | null) {
  if (VILLAGE_ASSAYS.has(assayType)) return true;
  if (CONDITIONAL_VILLAGE_ASSAYS.has(assayType)) {
    return !/primer|probe/i.test(reagentType ?? "");
  }
  return false;
}

function validateVill(assayType: string, reagentType: string | null | undefined, numberOfVill: number | null | undefined) {
  if (requiresNumberOfVill(assayType, reagentType) && (!numberOfVill || numberOfVill <= 0)) {
    return false;
  }
  return true;
}

router.get("/", requireAuth, requirePermission("inventory:reagent-read"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const search = String(req.query.search ?? "").trim();
  const assayType = String(req.query.assayType ?? "").trim();
  const storageCondition = String(req.query.storageCondition ?? "").trim();
  const where: Prisma.ReagentItemWhereInput = {};
  if (search) {
    where.OR = [
      { reagentCode: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { lotNumber: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  if (assayType) where.assayType = assayType;
  if (storageCondition) where.storageCondition = storageCondition;
  const [data, total] = await Promise.all([
    prisma.reagentItem.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { description: "asc" } }),
    prisma.reagentItem.count({ where }),
  ]);
  res.json({ data, total, page, pageSize });
});

router.get("/options", requireAuth, requirePermission("inventory:reagent-read"), async (_req, res) => {
  const rows = await prisma.reagentItem.findMany({ select: { assayType: true, reagentType: true, storageCondition: true, location: true } });
  res.json({
    assayTypes: ReagentAssayTypeSchema.options,
    reagentTypes: Array.from(new Set(rows.map((r) => r.reagentType).filter(Boolean))),
    storageConditions: ["80", "20", "2-8", "Ambient"],
    locations: Array.from(new Set(rows.map((r) => r.location).filter(Boolean))),
  });
});

router.get("/dashboard", requireAuth, requirePermission("inventory:reagent-read"), async (_req, res) => {
  const [items, pending, approved, movements] = await Promise.all([
    prisma.reagentItem.findMany({ select: { availableConcentration: true, minThreshold: true, expiryDate: true } }),
    prisma.reagentRequest.count({ where: { status: "PENDING" } }),
    prisma.reagentRequest.count({ where: { status: { in: ["APPROVED", "PARTIAL"] } } }),
    prisma.reagentMovement.count(),
  ]);
  const now = new Date();
  res.json({
    totalItems: items.length,
    lowStock: items.filter((i) => i.availableConcentration <= i.minThreshold).length,
    expired: items.filter((i) => i.expiryDate && i.expiryDate < now).length,
    pendingRequests: pending,
    approvedRequests: approved,
    movementCount: movements,
  });
});

router.get("/requests", requireAuth, requirePermission("inventory:reagent-read"), async (req, res) => {
  const status = String(req.query.status ?? "").trim();
  const statuses = status.split(",").map((value) => value.trim()).filter(Boolean);
  const where = statuses.length > 1 ? { status: { in: statuses } } : statuses.length === 1 ? { status: statuses[0] } : {};
  const data = await prisma.reagentRequest.findMany({
    where,
    include: { reagentItem: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ data, total: data.length });
});

router.get("/movements", requireAuth, requirePermission("inventory:reagent-read"), async (req, res) => {
  const type = String(req.query.type ?? req.query.movementType ?? "").trim();
  const project = String(req.query.project ?? "").trim();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const all = String(req.query.all ?? "").toLowerCase() === "true";

  const where: Prisma.ReagentMovementWhereInput = {};
  if (type === "CHECK_IN" || type === "CHECK_OUT" || type === "REQUEST_DECISION") {
    where.movementType = type;
  }
  if (project && project !== "ALL") {
    where.projectFor = { equals: project, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.reagentMovement.findMany({
      where,
      skip: all ? undefined : (page - 1) * limit,
      take: all ? undefined : limit,
      include: {
        reagentItem: true,
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.reagentMovement.count({ where }),
  ]);
  res.json({ data, total, page, pageSize: limit });
});

router.post("/check-in", requireAuth, requirePermission("inventory:reagent-check-in"), async (req, res) => {
  const parsed = ReagentCheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.reagentItem.upsert({
        where: { reagentCode: input.reagentCode },
        update: {
          description: input.description, assayType: input.assayType, reagentType: input.reagentType ?? undefined,
          concentration: input.concentration ?? undefined, availableConcentration: { increment: input.concentrationValue },
          initialConcentration: { increment: input.concentrationValue }, concentrationUnit: input.concentrationUnit ?? undefined,
          quantity: input.quantity ?? undefined, quantityUnit: input.quantityUnit ?? undefined, volume: input.volume ?? undefined,
          volumeUnit: input.volumeUnit ?? undefined, lotNumber: input.lotNumber ?? undefined, expiryDate: input.expiryDate ?? undefined,
          storageCondition: input.storageCondition, location: input.location ?? undefined, receivedFrom: input.receivedFrom ?? undefined,
          minThreshold: input.minThreshold,
        },
        create: {
          reagentCode: input.reagentCode, description: input.description, assayType: input.assayType, reagentType: input.reagentType,
          concentration: input.concentration, availableConcentration: input.concentrationValue, initialConcentration: input.concentrationValue,
          concentrationUnit: input.concentrationUnit, quantity: input.quantity, quantityUnit: input.quantityUnit, volume: input.volume,
          volumeUnit: input.volumeUnit, lotNumber: input.lotNumber, expiryDate: input.expiryDate, storageCondition: input.storageCondition,
          location: input.location, receivedFrom: input.receivedFrom, minThreshold: input.minThreshold,
        },
      });
      const movement = await tx.reagentMovement.create({
        data: {
          reagentItemId: item.id, movementType: "CHECK_IN", concentration: input.concentrationValue,
          lotNumber: input.lotNumber, expiryDate: input.expiryDate, requestedBy: req.user?.email, status: "APPROVED",
        },
      });
      await createAuditEntryTx(tx, {
        userId: req.user?.id, entityType: "ReagentItem", entityId: item.id, action: "CREATE",
        afterJson: { operation: "CHECK_IN", movementId: movement.id, concentration: input.concentrationValue },
        ip: req.ip, userAgent: req.get("user-agent"),
      });
      return item;
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error, "Reagent check-in failed");
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Reagent check-in failed" });
  }
});

router.post("/check-out", requireAuth, requirePermission("inventory:reagent-check-out"), async (req, res) => {
  const parsed = ReagentCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  try {
    const movement = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; availableConcentration: number; expiryDate: Date | null }>>(
        Prisma.sql`SELECT id, "availableConcentration", "expiryDate" FROM "ReagentItem" WHERE id = ${input.reagentItemId} FOR UPDATE`
      );
      const item = rows[0];
      if (!item) throw new Error("NOT_FOUND");
      if (item.expiryDate && item.expiryDate < new Date()) throw new Error("EXPIRED");
      if (item.availableConcentration < input.concentration) throw new Error("INSUFFICIENT_CONCENTRATION");
      await tx.reagentItem.update({
        where: { id: input.reagentItemId },
        data: { availableConcentration: { decrement: input.concentration }, issuedConcentration: { increment: input.concentration }, expectedReturnConcentration: { increment: input.expectedReturn ?? 0 } },
      });
      return tx.reagentMovement.create({
        data: { reagentItemId: input.reagentItemId, movementType: "CHECK_OUT", concentration: input.concentration, numberOfVill: input.numberOfVill, expectedReturn: input.expectedReturn, projectFor: input.projectFor, requestedBy: req.user?.email, recipient: input.requestedFor, remark: input.remark, status: "APPROVED" },
      });
    });
    res.status(201).json({ data: movement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") return res.status(404).json({ code: "NOT_FOUND" });
    if (message === "EXPIRED") return res.status(400).json({ code: "EXPIRED_REAGENT" });
    if (message === "INSUFFICIENT_CONCENTRATION") return res.status(400).json({ code: "INSUFFICIENT_CONCENTRATION" });
    logger.error(error, "Reagent check-out failed");
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.post("/requests", requireAuth, requirePermission("inventory:reagent-request"), async (req, res) => {
  const parsed = ReagentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  if (!validateVill(input.assayType, input.reagentType, input.numberOfVill)) {
    res.status(400).json({ code: "NUMBER_OF_VILL_REQUIRED", message: "Number of Vill is required for this assay and reagent type." });
    return;
  }
  const request = await prisma.reagentRequest.create({
    data: {
      requestBatchId: randomUUID(), reagentItemId: input.reagentItemId, assayType: input.assayType, reagentType: input.reagentType,
      projectFor: input.projectFor, concentration: input.concentration, requestedConcentration: input.concentration,
      concentrationUnit: input.concentrationUnit, numberOfVill: input.numberOfVill, expectedReturn: input.expectedReturn,
      requestedBy: req.user?.email ?? "authenticated_user", requestedFor: input.requestedFor, additionalFields: input.additionalFields,
      remark: input.remark, status: "PENDING",
    },
  });
  res.status(201).json({ data: request });
});

router.post("/request-decisions", requireAuth, requirePermission("inventory:reagent-approve"), async (req, res) => {
  const parsed = ReagentDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  try {
    const results = await prisma.$transaction(async (tx) => {
      const updated = [];
      for (const decision of parsed.data.items) {
        const request = await tx.reagentRequest.findUnique({ where: { id: decision.requestId } });
        if (!request || request.status !== "PENDING") throw new Error("INVALID_REQUEST");
        const approved = decision.status === "REJECTED" ? 0 : Math.min(request.requestedConcentration, decision.approvedConcentration ?? request.requestedConcentration);
        if (approved > 0 && request.reagentItemId) {
          const item = await tx.$queryRaw<Array<{ availableConcentration: number }>>(Prisma.sql`SELECT "availableConcentration" FROM "ReagentItem" WHERE id = ${request.reagentItemId} FOR UPDATE`);
          if (!item[0] || item[0].availableConcentration < approved) throw new Error("INSUFFICIENT_CONCENTRATION");
          await tx.reagentItem.update({ where: { id: request.reagentItemId }, data: { availableConcentration: { decrement: approved }, issuedConcentration: { increment: approved }, expectedReturnConcentration: { increment: request.expectedReturn ?? 0 } } });
        }
        const status = approved === 0 ? "REJECTED" : approved < request.requestedConcentration ? "PARTIAL" : "APPROVED";
        const result = await tx.reagentRequest.update({ where: { id: request.id }, data: { status, approvedConcentration: approved, approver: req.user?.email, decisionAt: new Date(), remark: decision.remark } });
        if (request.reagentItemId) {
          await tx.reagentMovement.create({ data: { reagentItemId: request.reagentItemId, movementType: "REQUEST_DECISION", concentration: approved, numberOfVill: request.numberOfVill, expectedReturn: request.expectedReturn, projectFor: request.projectFor, requestedBy: request.requestedBy, recipient: request.requestedFor, status, remark: decision.remark } });
        }
        updated.push(result);
      }
      return updated;
    });
    res.json({ data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_REQUEST") return res.status(400).json({ code: "INVALID_REQUEST_STATE" });
    if (message === "INSUFFICIENT_CONCENTRATION") return res.status(400).json({ code: "INSUFFICIENT_CONCENTRATION" });
    logger.error(error, "Reagent decision failed");
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

router.patch("/requests/:id/disburse", requireAuth, requirePermission("inventory:reagent-approve"), async (req, res) => {
  const request = await prisma.reagentRequest.updateMany({
    where: { id: req.params.id, status: { in: ["APPROVED", "PARTIAL"] }, disbursedAt: null },
    data: { disbursedAt: new Date() },
  });
  if (!request.count) return res.status(400).json({ code: "INVALID_REQUEST_STATE" });
  res.json({ success: true });
});

export default router;
