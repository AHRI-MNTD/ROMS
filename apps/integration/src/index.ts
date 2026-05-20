/**
 * ROMS Integration Hub
 * --------------------
 * Express service exposing connector stubs for external systems.
 * All endpoints log the request and return mocked success responses.
 *
 * Connectors:
 *   POST /lims/samples/sync
 *   POST /redcap/crfs/push
 *   GET  /redcap/records/pull
 *   POST /erp/po
 *   POST /erp/journal
 *   POST /ethics/submission
 *   GET  /ethics/status/:id
 *   POST /registry/clinicaltrials
 */

import express from "express";
import pino from "pino";
import prisma from "@roms/db";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

const INTEGRATION_PORT = parseInt(process.env.INTEGRATION_PORT ?? "4002");

const app = express();
app.use(express.json({ limit: "5mb" }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

async function logJob(system: string, direction: "INBOUND" | "OUTBOUND", payloadSize?: number) {
  try {
    await prisma.integrationJob.create({
      data: { system, direction, payloadSize: payloadSize ?? 0, status: "SUCCESS", ranAt: new Date() },
    });
  } catch {
    // Non-fatal
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "integration", uptime: process.uptime() });
});

// ─── LIMS ─────────────────────────────────────────────────────────────────────

app.post("/lims/samples/sync", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[LIMS] Sync samples request received");
  await logJob("LIMS", "OUTBOUND", JSON.stringify(body).length);
  res.json({ ok: true, externalId: mockId("LIMS"), syncedCount: (body.samples as unknown[])?.length ?? 0 });
});

// ─── REDCap ───────────────────────────────────────────────────────────────────

app.post("/redcap/crfs/push", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[REDCap] Push CRF request received");
  await logJob("REDCap", "OUTBOUND", JSON.stringify(body).length);
  res.json({ ok: true, externalId: mockId("REDCAP"), instrumentCount: (body.instruments as unknown[])?.length ?? 0 });
});

app.get("/redcap/records/pull", async (req, res) => {
  logger.info({ query: req.query }, "[REDCap] Pull records request received");
  await logJob("REDCap", "INBOUND");
  res.json({
    ok: true,
    externalId: mockId("REDCAP-PULL"),
    records: [
      { record_id: "001", redcap_event_name: "enrollment_arm_1", field1: "value1" },
      { record_id: "002", redcap_event_name: "followup_arm_1",   field1: "value2" },
    ],
  });
});

// ─── ERP ──────────────────────────────────────────────────────────────────────

app.post("/erp/po", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[ERP] Purchase order request received");
  await logJob("ERP", "OUTBOUND", JSON.stringify(body).length);
  res.json({ ok: true, externalId: mockId("PO"), poNumber: `PO-${Date.now()}` });
});

app.post("/erp/journal", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[ERP] Journal entry request received");
  await logJob("ERP", "OUTBOUND", JSON.stringify(body).length);
  res.json({ ok: true, externalId: mockId("JNL"), journalRef: `JNL-${Date.now()}` });
});

// ─── Ethics ───────────────────────────────────────────────────────────────────

app.post("/ethics/submission", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[Ethics Portal] Submission request received");
  await logJob("Ethics", "OUTBOUND", JSON.stringify(body).length);
  const externalId = mockId("ETHICS");
  res.json({ ok: true, externalId, submissionRef: externalId, status: "SUBMITTED" });
});

app.get("/ethics/status/:id", async (req, res) => {
  logger.info({ id: req.params.id }, "[Ethics Portal] Status check request received");
  await logJob("Ethics", "INBOUND");
  res.json({
    ok: true,
    externalId: req.params.id,
    status: "PENDING_REVIEW",
    lastUpdated: new Date().toISOString(),
  });
});

// ─── Clinical Trials Registry ─────────────────────────────────────────────────

app.post("/registry/clinicaltrials", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  logger.info({ body }, "[Registry] ClinicalTrials.gov registration request received");
  await logJob("ClinicalTrials.gov", "OUTBOUND", JSON.stringify(body).length);
  const nctId = `NCT0${Math.floor(Math.random() * 9e7 + 1e7)}`;
  res.json({ ok: true, externalId: nctId, nctId, status: "REGISTERED" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(INTEGRATION_PORT, () => {
  logger.info(`🔗 Integration Hub running on port ${INTEGRATION_PORT}`);
  logger.info("   Available connectors: LIMS, REDCap, ERP, Ethics, ClinicalTrials.gov");
});
