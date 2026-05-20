import { Router, Request, Response } from "express";
import { C4_MODEL, C4_RELATIONSHIPS, C4_CONTAINER_INTERACTIONS } from "@roms/shared";

const router = Router();

// GET /architecture/c4
router.get("/c4", (_req: Request, res: Response) => {
  res.json({
    model: C4_MODEL,
    relationships: C4_RELATIONSHIPS,
    containerInteractions: C4_CONTAINER_INTERACTIONS,
  });
});

export default router;
