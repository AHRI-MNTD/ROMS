/**
 * ROMS Notification Service
 * -------------------------
 * - BullMQ worker consuming the 'notifications' queue
 * - Dispatches email (stub), SMS (stub), and in-app Notification rows via Prisma
 * - Escalation loop: every 60s checks overdue CAPAs and creates reminder notifications
 * - Express HTTP endpoint POST /enqueue for the API to push events
 */

import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
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

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const NOTIFICATION_PORT = parseInt(process.env.NOTIFICATION_PORT ?? "4001");

const redisConnection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
export const notificationQueue = new Queue("notifications", { connection: redisConnection });

// ─── Job payload type ─────────────────────────────────────────────────────────

interface NotificationPayload {
  userId: string;
  kind: "EMAIL" | "SMS" | "IN_APP" | "ESCALATION";
  title: string;
  body: string;
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<NotificationPayload>(
  "notifications",
  async (job) => {
    const { userId, kind, title, body } = job.data;

    logger.info({ jobId: job.id, userId, kind, title }, "Processing notification");

    if (kind === "EMAIL") {
      // Stub — in production integrate with SendGrid / AWS SES
      logger.info({ to: userId, subject: title }, `[EMAIL STUB] ${body}`);
    } else if (kind === "SMS") {
      // Stub — in production integrate with Twilio / Africa's Talking
      logger.info({ to: userId }, `[SMS STUB] ${title}: ${body}`);
    }

    // Always write in-app notification row
    await prisma.notification.create({
      data: { userId, kind, title, body },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Notification",
        entityId: userId,
        action: "CREATE",
        afterJson: { kind, title },
      },
    });
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Notification job completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Notification job failed");
});

// ─── Escalation loop — checks overdue CAPAs every 60s ────────────────────────

async function runEscalationCheck() {
  try {
    const overdueCAPAs = await prisma.cAPA.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
      },
      include: { owner: true },
    });

    for (const capa of overdueCAPAs) {
      await notificationQueue.add("escalation", {
        userId: capa.ownerId,
        kind: "IN_APP",
        title: "Overdue CAPA Reminder",
        body: `CAPA "${capa.finding.slice(0, 80)}" was due ${capa.dueDate.toDateString()} and is still ${capa.status}.`,
      });

      // Mark as OVERDUE
      await prisma.cAPA.update({
        where: { id: capa.id },
        data: { status: "OVERDUE" },
      });
    }

    if (overdueCAPAs.length > 0) {
      logger.info(`Escalated ${overdueCAPAs.length} overdue CAPA(s)`);
    }
  } catch (err) {
    logger.error(err, "Escalation check failed");
  }
}

setInterval(() => { void runEscalationCheck(); }, 60_000);

// ─── HTTP endpoint ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.post("/enqueue", async (req, res) => {
  const payload = req.body as NotificationPayload;
  if (!payload.userId || !payload.kind || !payload.title) {
    res.status(400).json({ code: "INVALID_PAYLOAD", message: "userId, kind, title required" });
    return;
  }
  const job = await notificationQueue.add("notify", payload);
  res.json({ ok: true, jobId: job.id });
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "notification", uptime: process.uptime() });
});

app.listen(NOTIFICATION_PORT, () => {
  logger.info(`🔔 Notification service running on port ${NOTIFICATION_PORT}`);
  logger.info(`   POST /enqueue to push notification jobs`);
});
