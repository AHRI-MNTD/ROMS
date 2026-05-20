import { Router, Request, Response } from "express";
import { DOMAIN_CATALOG } from "@roms/shared";

const router = Router();

// GET /catalog/domains
router.get("/domains", (_req: Request, res: Response) => {
  const domains = DOMAIN_CATALOG.map((d) => ({
    id: d.id,
    slug: d.slug,
    emoji: d.emoji,
    name: d.name,
    subfunctionCount: d.subfunctions.length,
    taskCount: d.subfunctions.reduce((acc, sf) => acc + sf.tasks.length, 0),
  }));
  res.json({ data: domains, total: domains.length });
});

// GET /catalog/domains/:slug
router.get("/domains/:slug", (req: Request, res: Response) => {
  const { slug } = req.params;
  const domain = DOMAIN_CATALOG.find((d) => d.slug === slug);

  if (!domain) {
    res.status(404).json({ code: "NOT_FOUND", message: `Domain '${slug}' not found` });
    return;
  }

  res.json(domain);
});

export default router;
