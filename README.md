# ROMS — Research Operations Management System

A full-stack monorepo for managing all 10 domains of biomedical and life-science research operations.

---

## Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROMS — System Boundary                          │
│                                                                          │
│  ┌──────────────┐   HTTPS/REST   ┌────────────────────────────────┐     │
│  │  Web App     │ ─────────────► │  API Gateway & Backend          │     │
│  │  React + TS  │                │  Express + GraphQL + Prisma      │     │
│  │  Port 5173   │                │  Port 4000                       │     │
│  └──────────────┘                └──────────┬─────────────────────┘     │
│                                             │                             │
│         ┌───────────────────────────────────┼────────────────────┐       │
│         │                                   │                    │       │
│         ▼                                   ▼                    ▼       │
│  ┌─────────────┐              ┌──────────────────┐  ┌──────────────┐    │
│  │ Core DB     │              │ Document Store   │  │ Notification │    │
│  │ PostgreSQL  │              │ S3/MinIO         │  │ BullMQ+Redis │    │
│  │ Port 5432   │              │ Port 9000/9001   │  │ Port 4001    │    │
│  └─────────────┘              └──────────────────┘  └──────────────┘    │
│                                                                          │
│  ┌─────────────┐              ┌──────────────────┐  ┌──────────────┐    │
│  │ IoT Layer   │              │ Identity & Access│  │ Integration  │    │
│  │ MQTT+Stream │              │ Keycloak/JWT     │  │ Hub          │    │
│  │ Port 4003   │              │ Port 8080        │  │ Port 4002    │    │
│  └─────────────┘              └──────────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

External: REDCap · LIMS · ELN · ERP · Ethics Portal · Registries · HPC
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL, Redis, Mosquitto, MinIO)
pnpm infra:up

# 3. Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Run database migrations
pnpm db:migrate

# 5. Seed demo data
pnpm db:seed

# 6. Start all services in dev mode
pnpm dev
```

### Access
| Service | URL |
|---|---|
| Web App | http://localhost:5173 |
| API Gateway | http://localhost:4000 |
| GraphQL Playground | http://localhost:4000/graphql |
| OpenAPI Spec | http://localhost:4000/openapi.json |
| C4 Architecture Explorer | http://localhost:5173/architecture |
| Domain Workspace | http://localhost:5173/operations |
| MinIO Console | http://localhost:9001 |
| Keycloak Admin | http://localhost:8080 |

---

## Default Demo Credentials

Password for all accounts: `password123`

| Name | Email | Role |
|---|---|---|
| Alice Mwangi | scientist@roms.dev | LAB_SCIENTIST |
| Brian Okonkwo | datamanager@roms.dev | DATA_MANAGER |
| Carol Nzinga | admin@roms.dev | RESEARCH_ADMIN |
| Dr. David Asante | pi@roms.dev | PRINCIPAL_INVESTIGATOR |
| Eve Diallo | qa@roms.dev | QA_OFFICER |
| Frank Mensah | community@roms.dev | COMMUNITY_ENGAGEMENT |
| Grace Abubakar | sysadmin@roms.dev | ADMIN |

---

## Domain Endpoint Table

| Domain | Slug | REST Base Path |
|---|---|---|
| Biospecimen & Biorepository | biospecimen | `GET/POST /domains/biospecimen` |
| Lab Inventory & Supply Chain | inventory | `GET/POST /domains/inventory` |
| SOPs & Quality Management | qms | `GET/POST /domains/qms/sops`, `/domains/qms/capas` |
| Lab Workflow & Experiments | lab-workflow | `GET/POST /domains/lab-workflow/protocols` |
| Research Data Management | data-management | `GET/POST /domains/data-management/studies` |
| Infrastructure & IT Services | infrastructure | `GET /domains/infrastructure/sensor-readings` |
| HR & Staff Operations | hr | `GET/POST /domains/hr/staff` |
| Finance & Grant Management | finance | `GET/POST /domains/finance/grants` |
| Participant & Community Engagement | participant | `GET/POST /domains/participant` |
| Regulatory, Ethics & Compliance | regulatory | `GET/POST /domains/regulatory/ethics` |

All mutations require `Authorization: Bearer <token>` and are RBAC-gated.

---

## C4 Architecture Mapping

| Container | App / Package |
|---|---|
| Web Application | `apps/web` |
| API Gateway & Backend | `apps/api` |
| Core Database | `packages/db` (Prisma + PostgreSQL) |
| Document Store | MinIO (docker-compose) |
| Notification Service | `apps/notification` |
| IoT Integration Layer | `apps/iot` |
| Identity & Access | Keycloak (docker-compose) + local JWT in dev |
| Integration Hub | `apps/integration` |

---

## IoT Simulator

```bash
# Start the simulator (publishes readings every 5s)
cd apps/iot && pnpm simulate
```

Topics published:
- `roms/sensors/SENSOR-FREEZER-1/temperature`
- `roms/sensors/SENSOR-FREEZER-1/heartbeat`
- `roms/sensors/SENSOR-FRIDGE-1/temperature`

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥ 20 |
| Package manager | pnpm | 9 |
| Language | TypeScript | 5.4 |
| Frontend | React + Vite | 18.3 / 5 |
| Routing | React Router | 6 |
| Data fetching | TanStack Query | 5 |
| State | Zustand | 4 |
| API | Express | 4 |
| GraphQL | Apollo Server | 4 |
| ORM | Prisma | 5 |
| Database | PostgreSQL | 16 |
| Queue | BullMQ | 5 |
| Cache | Redis | 7 |
| MQTT | eclipse-mosquitto | 2 |
| Object storage | MinIO | latest |
| Identity | Keycloak | 25.0 |

> **Production note:** PostgreSQL with `@@index([sensorId, recordedAt])` handles sensor time-series adequately in development. For high-volume production deployments, [TimescaleDB](https://www.timescale.com/) is recommended as a drop-in extension — no schema changes required beyond enabling the extension and converting `SensorReading` to a hypertable.

---

## Design Decisions & Known Limitations

1. **Local JWT vs. Keycloak:** In development, the API issues its own JWTs. Keycloak is available via Docker Compose for production SSO.
2. **Prisma migrations:** The initial migration needs to be created with `pnpm db:migrate` before seeding. The `packages/db/prisma/schema.prisma` is the single source of truth.
3. **No Tailwind:** Per spec, all styling uses CSS custom properties from `apps/web/src/theme/tokens.css`, which merges both source HTML token sets.
4. **TimescaleDB:** Not enabled by default (plain PostgreSQL). Noted as production option above.
5. **Email/SMS:** Stubbed with console logs. Replace with SendGrid/Twilio in `apps/notification/src/index.ts`.
6. **Integration connectors:** All return mocked data. Real connectors require credentials and vendor SDKs.
7. **Authentication in GraphQL:** GraphQL resolvers do not enforce RBAC independently — rely on REST auth middleware in production or add context-based guards.
# MNTD-ROMS
