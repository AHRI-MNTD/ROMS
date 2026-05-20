/**
 * ROMS IoT Simulator
 * ------------------
 * Publishes fake temperature and heartbeat readings every 5 seconds
 * to the local MQTT broker for demo and development purposes.
 *
 * Run: pnpm simulate (in apps/iot)
 */

import mqtt from "mqtt";
import pino from "pino";

const logger = pino({
  transport: { target: "pino-pretty", options: { colorize: true } },
});

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";

const SENSORS = [
  { id: "SENSOR-FREEZER-1", baseTemp: -80, variation: 2 },
  { id: "SENSOR-FREEZER-2", baseTemp: -80, variation: 1.5 },
  { id: "SENSOR-FRIDGE-1",  baseTemp: 4,   variation: 0.5 },
];

const client = mqtt.connect(MQTT_URL, {
  clientId: `roms-simulator-${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 3000,
});

client.on("connect", () => {
  logger.info(`Simulator connected to ${MQTT_URL}`);
  logger.info("Publishing sensor readings every 5 seconds…");

  function publish() {
    for (const sensor of SENSORS) {
      const value = sensor.baseTemp + (Math.random() - 0.5) * sensor.variation;

      // Normal reading
      client.publish(
        `roms/sensors/${sensor.id}/temperature`,
        JSON.stringify({ value: +value.toFixed(2), unit: "celsius", ts: Date.now() }),
        { qos: 1 }
      );

      // Heartbeat
      client.publish(
        `roms/sensors/${sensor.id}/heartbeat`,
        JSON.stringify({ ts: Date.now(), status: "ok" }),
        { qos: 0 }
      );

      logger.debug({ sensorId: sensor.id, value: value.toFixed(2) }, "Published");
    }

    // Occasionally simulate a temperature excursion for demo
    if (Math.random() < 0.05) {
      const sensor = SENSORS[0];
      const excursionTemp = sensor.baseTemp + 8; // Well above threshold
      client.publish(
        `roms/sensors/${sensor.id}/temperature`,
        JSON.stringify({ value: +excursionTemp.toFixed(2), unit: "celsius", ts: Date.now(), simulated_excursion: true }),
        { qos: 1 }
      );
      logger.warn({ sensorId: sensor.id, temp: excursionTemp.toFixed(2) }, "⚠️  Simulated temperature excursion!");
    }
  }

  publish(); // Immediate first publish
  setInterval(publish, 5000);
});

client.on("error", (err) => {
  logger.error(err, "Simulator MQTT error");
});
