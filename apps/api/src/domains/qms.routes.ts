import { Router } from "express";
import prisma from "@roms/db";
import { requireAuth, requirePermission } from "../auth/auth.middleware";
import { auditMutation } from "../audit/audit.middleware";
import { CreateSOPSchema, CreateCAPASchema } from "@roms/shared";
import { logger } from "../utils/logger";


const router = Router();

// SOPs
router.get("/sops", requireAuth, requirePermission("qms:read"), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000; // Fetch all by default or larger limit for frontend list

    const [data, total] = await Promise.all([
      prisma.sOP.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { code: "asc" },
        include: { owner: { select: { displayName: true } } },
      }),
      prisma.sOP.count(),
    ]);

    const parsedData = data.map((sop) => {
      let sopSection = "STANDARD";
      let sopSubSection = "Strains (NF54, 3D7, Dd2, HB3)";
      let author = sop.owner?.displayName || "QA Officer";
      let lastUpdated = sop.updatedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      let description = sop.description || "";

      if (sop.description && sop.description.startsWith("{")) {
        try {
          const parsed = JSON.parse(sop.description);
          sopSection = parsed.sopSection || sopSection;
          sopSubSection = parsed.sopSubSection || sopSubSection;
          author = parsed.author || author;
          lastUpdated = parsed.lastUpdated || lastUpdated;
          description = parsed.originalDescription || "";
        } catch {
          // fallback
        }
      }

      return {
        id: sop.id,
        code: sop.code,
        title: sop.title,
        version: sop.version,
        status: sop.status,
        sopSection,
        sopSubSection,
        author,
        lastUpdated,
        description,
      };
    });

    res.json({ data: parsedData, total, page, pageSize: limit });
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: err.message });
  }
});



router.get("/sops/:id", requireAuth, requirePermission("qms:read"), async (req, res) => {
  const sop = await prisma.sOP.findUnique({ where: { id: req.params.id }, include: { owner: { select: { displayName: true } }, trainings: true } });
  if (!sop) { res.status(404).json({ code: "NOT_FOUND" }); return; }

  let sopSection = "STANDARD";
  let sopSubSection = "Strains (NF54, 3D7, Dd2, HB3)";
  let author = sop.owner?.displayName || "QA Officer";
  let lastUpdated = sop.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  let description = sop.description || "";

  if (sop.description && sop.description.startsWith("{")) {
    try {
      const parsed = JSON.parse(sop.description);
      sopSection = parsed.sopSection || sopSection;
      sopSubSection = parsed.sopSubSection || sopSubSection;
      author = parsed.author || author;
      lastUpdated = parsed.lastUpdated || lastUpdated;
      description = parsed.originalDescription || "";
    } catch {
      // fallback
    }
  }

  res.json({
    ...sop,
    sopSection,
    sopSubSection,
    author,
    lastUpdated,
    description,
  });
});

router.post("/sops", requireAuth, requirePermission("qms:write"), auditMutation("SOP", "CREATE"), async (req, res) => {
  const parsed = CreateSOPSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const sop = await prisma.sOP.create({ data: parsed.data });
    res.status(201).json(sop);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/sops/:id", requireAuth, requirePermission("qms:write"), auditMutation("SOP", "UPDATE"), async (req, res) => {
  const sop = await prisma.sOP.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(sop);
});

router.delete("/sops/:id", requireAuth, requirePermission("qms:delete"), auditMutation("SOP", "DELETE"), async (req, res) => {
  await prisma.sOP.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// CAPAs
router.get("/capas", requireAuth, requirePermission("qms:read"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const [data, total] = await Promise.all([
    prisma.cAPA.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { dueDate: "asc" }, include: { owner: { select: { displayName: true } } } }),
    prisma.cAPA.count(),
  ]);
  res.json({ data, total, page, pageSize: 20 });
});

router.post("/capas", requireAuth, requirePermission("qms:write"), auditMutation("CAPA", "CREATE"), async (req, res) => {
  const parsed = CreateCAPASchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.flatten() }); return; }
  try {
    const capa = await prisma.cAPA.create({ data: parsed.data });
    res.status(201).json(capa);
  } catch (err) { logger.error(err); res.status(500).json({ code: "INTERNAL_ERROR" }); }
});

router.patch("/capas/:id", requireAuth, requirePermission("qms:write"), auditMutation("CAPA", "UPDATE"), async (req, res) => {
  const capa = await prisma.cAPA.update({ where: { id: req.params.id }, data: req.body as Record<string, unknown> });
  res.json(capa);
});

export default router;
