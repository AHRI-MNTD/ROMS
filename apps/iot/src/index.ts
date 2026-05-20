/**
 * ROMS IoT Service
 * ----------------
 * MQTT subscriber connecting to mqtt://localhost:1883.
 *
 * Topics:
 *   roms/sensors/+/temperature  → writes SensorReading rows; alerts on threshold breach
 *   roms/sensors/+/heartbeat    → updates sensor health log
 *
 * Run: pnpm dev (in apps/iot)
 * Simulator: pnpm simulate
 */

import mqtt from "mqtt";
import pino from "pino";
import prisma from "@roms/db";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:4001";

// Temperature thresholds (Celsius)
const TEMP_THRESHOLDS: Record<string, { min: number; max: number }> = {
  default: { min: -85, max: -75 }, // −80°C freezer
};

function getThreshold(sensorId: string) {
  return TEMP_THRESHOLDS[sensorId] ?? TEMP_THRESHOLDS.default;
}

async function enqueueAlert(sensorId: string, value: number, threshold: { min: number; max: number }) {
  try {
    const resp = await fetch(`${NOTIFICATION_SERVICE_URL}/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "system", // Will be broadcast; TODO: route to freezer owner
        kind: "IN_APP",
        title: "Temperature Excursion Alert",
        body: `Sensor ${sensorId} recorded ${value.toFixed(1)}°C (allowed: ${threshold.min} to ${threshold.max}°C)`,
      }),
    });
    logger.info({ sensorId, value }, "Temperature excursion alert enqueued");
    return resp.ok;
  } catch (err) {
    logger.warn({ err }, "Could not reach notification service");
    return false;
  }
}

// ─── MQTT client ──────────────────────────────────────────────────────────────

const client = mqtt.connect(MQTT_URL, {
  clientId: `roms-iot-${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 5000,
});

client.on("connect", () => {
  logger.info(`Connected to MQTT broker at ${MQTT_URL}`);
  client.subscribe("roms/sensors/+/temperature", { qos: 1 });
  client.subscribe("roms/sensors/+/heartbeat", { qos: 0 });
  logger.info("Subscribed to roms/sensors/+/temperature and roms/sensors/+/heartbeat");
});

client.on("error", (err) => {
  logger.error(err, "MQTT error");
});

client.on("reconnect", () => {
  logger.info("Reconnecting to MQTT broker…");
});

client.on("message", async (topic: string, payload: Buffer) => {
  const parts = topic.split("/");
  // Expected: roms/sensors/<sensorId>/<metric>
  if (parts.length < 4) return;

  const sensorId = parts[2];
  const metric = parts[3];

  let message: Record<string, unknown>;
  try {
    message = JSON.parse(payload.toString()) as Record<string, unknown>;
  } catch {
    logger.warn({ topic }, "Non-JSON MQTT message, skipping");
    return;
  }

  if (metric === "temperature") {
    const value = Number(message.value);
    if (isNaN(value)) { logger.warn({ topic, payload: payload.toString() }, "Non-numeric temperature"); return; }

    logger.debug({ sensorId, value }, "Temperature reading received");

    // Persist to DB
    await prisma.sensorReading.create({
      data: {
        sensorId,
        value,
        unit: "celsius",
        kind: "temperature",
        recordedAt: new Date(),
      },
    });

    // Check threshold
    const threshold = getThreshold(sensorId);
    if (value < threshold.min || value > threshold.max) {
      logger.warn({ sensorId, value, threshold }, "TEMPERATURE EXCURSION DETECTED");
      await enqueueAlert(sensorId, value, threshold);
    }
  } else if (metric === "heartbeat") {
    logger.info({ sensorId, ts: message.ts ?? new Date().toISOString() }, "Sensor heartbeat");
  }
});

logger.info("ROMS IoT service started");
