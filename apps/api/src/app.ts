import express from "express";
import helmet from "helmet";
import cors from "cors";
import { json } from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { createServer } from "http";

import { env } from "./env";
import { logger } from "./utils/logger";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";

import authRouter from "./auth/auth.routes";
import catalogRouter from "./catalog/catalog.routes";
import architectureRouter from "./architecture/architecture.routes";
import biospecimenRouter from "./domains/biospecimen.routes";
import inventoryRouter from "./domains/inventory.routes";
import qmsRouter from "./domains/qms.routes";
import labWorkflowRouter from "./domains/labWorkflow.routes";
import dataManagementRouter from "./domains/dataManagement.routes";
import infrastructureRouter from "./domains/infrastructure.routes";
import hrRouter from "./domains/hr.routes";
import financeRouter from "./domains/finance.routes";
import participantRouter from "./domains/participant.routes";
import regulatoryRouter from "./domains/regulatory.routes";

import openApiSpec from "./openapi/openapi.json";

export async function buildApp() {
  const app = express();
  const httpServer = createServer(app);

  // ─── Security & middleware ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: env.NODE_ENV === "production",
    })
  );

  const allowedOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(json({ limit: "10mb" }));

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), version: "0.1.0" });
  });

  // ─── OpenAPI spec ─────────────────────────────────────────────────────────
  app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

  // ─── REST routes ──────────────────────────────────────────────────────────
  app.use(["/auth", "/api/auth"], authRouter);
  app.use(["/catalog", "/api/catalog"], catalogRouter);
  app.use(["/architecture", "/api/architecture"], architectureRouter);
  app.use(["/domains/biospecimen", "/api/domains/biospecimen"], biospecimenRouter);
  app.use(["/domains/inventory", "/api/domains/inventory"], inventoryRouter);
  app.use(["/domains/qms", "/api/domains/qms"], qmsRouter);
  app.use(["/domains/lab-workflow", "/api/domains/lab-workflow"], labWorkflowRouter);
  app.use(["/domains/data-management", "/api/domains/data-management"], dataManagementRouter);
  app.use(["/domains/infrastructure", "/api/domains/infrastructure"], infrastructureRouter);
  app.use(["/domains/hr", "/api/domains/hr"], hrRouter);
  app.use(["/domains/finance", "/api/domains/finance"], financeRouter);
  app.use(["/domains/participant", "/api/domains/participant"], participantRouter);
  app.use(["/domains/regulatory", "/api/domains/regulatory"], regulatoryRouter);

  // ─── GraphQL ──────────────────────────────────────────────────────────────
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    cors({ origin: allowedOrigins, credentials: true }),
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        user: (req as express.Request).user,
      }),
    })
  );

  // ─── Error handler ────────────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: err.message });
  });

  return { app, httpServer };
}
