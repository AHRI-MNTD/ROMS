# ROMS Inventory Module Deployability Report

**Assessment date:** 2026-11-02  
**Scope:** Inventory domain, login/authentication, approval and disbursement workflows, deployment configuration, and system security  
**Capacity target:** 160 registered users; approximately 30 concurrent active users

## Executive decision

**Decision: Conditional go-live / release remains blocked until the GraphQL access-control fix is independently acceptance-tested and production acceptance testing is completed.**

The Inventory REST workflow is structurally sound for the stated user population. It uses authenticated permission guards, schema validation, database transactions, row locks for stock deductions and approvals, FEFO lot selection, stock/lot checks, and audit records. The repository build and 34 targeted inventory/authentication/GraphQL tests pass.

This is not yet a full production sign-off because:

1. The GraphQL access-control remediation has been implemented and unit-tested in this worktree but still needs deployment verification.
2. No production-like load test result was supplied for 30 active users.
3. Go-live evidence is still a checklist rather than an executed end-to-end run against the deployment topology.
4. Development Compose contains intentionally weak credentials and must never be used as the production stack.

## Validation evidence

| Area | Result | Evidence |
|---|---|---|
| TypeScript/workspace build | PASS | `pnpm build` succeeded across 8 packages |
| Targeted auth/inventory/GraphQL tests | PASS | 6 files, 34 tests passed |
| Inventory authorization | PASS | Route permissions, view-only restrictions, project/approver checks |
| Request approval | PASS by code inspection/tests | Pending-only decisions, quantity settlement, row locking, audit entry |
| Check-out | PASS by code inspection/tests | Conditional stock decrement, lot validation, FEFO selection, transaction |
| Check-in | PASS by code inspection | Atomic stock/movement updates and loan settlement |
| GraphQL access control | REMEDIATED IN WORKTREE | Route authentication, resolver permission checks, input validation, and pagination bounds added; deployment verification remains |
| Production API image | PASS | Container build succeeded; runtime inspection confirmed compiled artifacts and Prisma files are present without API source or local certificate directories |
| Capacity target | NOT YET PROVEN | Load benchmark exists but was not run against production-like infrastructure |

## Inventory workflow assessment

### Intended flow

1. An authenticated user with `inventory:request` creates a request.
2. The API derives requester identity from the token, validates the project and user assignment, resolves project approvers, and creates pending movements.
3. An authorized approver approves, partially approves, or rejects each pending movement.
4. Approval locks the movement and stock item, validates available stock and lot/expiry rules, allocates FEFO stock, updates quantity/totals, and writes an audit record.
5. An authorized inventory officer records physical disbursement.
6. Check-in and direct check-out update stock and movement history transactionally; inter-project loans can be settled during check-in.

### Effectiveness and correctness

**Assessment: Good, with operational caveats.**

Positive controls include:

- REST inventory endpoints consistently require authentication and granular permissions.
- Project assignment and approver identity are checked server-side.
- Client-supplied requester identity is not trusted.
- Pending-only approval transitions prevent repeat decisions.
- Stock deductions use row locks and conditional quantity updates.
- Unknown, expired, and insufficient lots are rejected.
- FEFO excludes expired lots and prefers the earliest valid expiry.
- Bulk operations are transactional, and movement/audit records are created together.
- View-only inventory accounts are denied mutation operations at the API layer.
- Tests cover authorization, settlement deltas, loans, lot validation, and expiry behavior.

Residual risks and limitations:

- FEFO allocation currently requires one eligible lot to satisfy the entire requested quantity; it does not split a request across multiple lots. Confirm that this is the intended policy.
- Concurrent database operations can still return serialization/deadlock errors under contention; production should monitor and retry safe transaction failures.
- Google Sheets synchronization is asynchronous and must be treated as an integration mirror, not the system of record.
- The smoke test must be executed with real seeded data, real roles, and the deployed gateway rather than inferred from unit tests.

## Capacity and performance assessment

For 160 registered users and 30 active users, the API/PostgreSQL architecture is likely adequate if deployed with PostgreSQL and Redis on dedicated or appropriately sized infrastructure. The application has bounded list pagination, database indexes for core inventory fields, connection keep-alive at the gateway, and a benchmark script.

**Capacity status: CONDITIONAL, not measured.**

Before release, run the benchmark against the actual staging topology with:

- 30 concurrent authenticated users, mixed read/request/approval/check-in/check-out traffic.
- At least 10 minutes sustained load plus a short burst at 2x expected concurrency.
- Success rate at least 99.5%.
- p95 API latency at or below 500 ms for normal list/read operations.
- p95 mutation latency at or below 1 second, excluding external email/sheet services.
- No stock invariant violations, duplicate movements, negative quantities, or failed audit writes.
- PostgreSQL CPU, memory, connection pool, lock waits, slow queries, and disk growth monitored.

## Deployment and operations assessment

### Strengths

- Production Compose does not publish PostgreSQL or Redis ports.
- Production requires explicit PostgreSQL, MinIO, and JWT secrets.
- Production JWT validation rejects the default secret and requires at least 32 characters.
- Production environment validation requires HTTPS `APP_URL`, non-localhost `CORS_ORIGINS`, and explicit MQTT credentials.
- Nginx terminates TLS and redirects HTTP to HTTPS.
- Health checks exist for PostgreSQL, Redis, and MinIO.
- API and web images use multi-stage builds.

### Required operational controls

- Use `docker-compose.prod.yml`, never the development Compose file.
- Replace all demo/default accounts and passwords before connecting to a real network.
- Keep Keycloak, MinIO console, MQTT, PostgreSQL, and Redis on private networks; expose only the gateway.
- Production MQTT now disables anonymous access and requires a host-managed Mosquitto password file.
- Configure real SMTP credentials and verify email delivery/failure behavior.
- Configure backups, restore testing, retention, disk alerts, log rotation, and uptime monitoring.
- Use a trusted certificate whose hostname matches the deployment URL; do not rely on the committed development certificates.
- Document rollback and database migration procedures.
- Define an owner and response process for audit-log, notification, and Google Sheets synchronization failures.

## Security findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | [apps/api/src/app.ts](/home/yabets/ROMS/apps/api/src/app.ts:85) | 85 | GraphQL previously lacked `requireAuth`; resolver access was also unrestricted. Remediation is now present in the worktree and requires integration verification. | 10/10 |

**Remediation applied:** `/graphql` now requires authentication, each resolver checks the relevant domain permission, GraphQL mutation inputs are schema-validated, and pagination is bounded. Remaining work is deployment-level integration testing.

Other positive security controls include Helmet, CORS allowlisting, request-size limits, bcrypt password hashing, JWT expiry, inventory RBAC, approval/project authorization, transactional updates, and audit logging.

## Go-live gate

Do not announce production availability until all of the following are true:

- [x] GraphQL route authentication and resolver authorization are implemented and covered by focused tests.
- [ ] GraphQL access control is integration-tested through the deployed gateway, or GraphQL is disabled if not required.
- [ ] Production secrets, demo credentials, certificates, SMTP, and backup settings are verified.
- [ ] The inventory smoke test is executed end-to-end through Nginx.
- [ ] The 30-user staging load test meets the stated thresholds.
- [ ] Concurrent check-in/check-out and duplicate approval tests pass.
- [ ] Backup restore and rollback procedures are rehearsed.
- [ ] Monitoring and incident ownership are confirmed.

**Final rating:** Inventory workflow **functionally ready with conditions**; ROMS system **not yet security-ready for unrestricted deployment** until the GraphQL blocker and operational acceptance evidence are closed.
