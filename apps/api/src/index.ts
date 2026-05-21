import 'dotenv/config';
import { buildApp } from "./app";
import { env } from "./env";
import { logger } from "./utils/logger";

async function start() {
  const { httpServer } = await buildApp();

  httpServer.listen(env.API_PORT, () => {
    logger.info(`🚀 ROMS API running on http://localhost:${env.API_PORT}`);
    logger.info(`   GraphQL playground: http://localhost:${env.API_PORT}/graphql`);
    logger.info(`   OpenAPI spec:        http://localhost:${env.API_PORT}/openapi.json`);
    logger.info(`   Health check:        http://localhost:${env.API_PORT}/healthz`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
