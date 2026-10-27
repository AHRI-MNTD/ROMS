import { describe, expect, it } from "vitest";
import { requirePermission, requireRole } from "./auth.middleware";
import { Role } from "@roms/shared";

function createMockReqRes(user: any, method = "GET", url = "/api/domains/inventory") {
  const req: any = {
    user,
    method,
    baseUrl: url,
    originalUrl: url,
    headers: {},
  };
  let statusCode: number | null = null;
  let jsonBody: any = null;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: any) => {
      jsonBody = body;
      return res;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getStatus: () => statusCode, getBody: () => jsonBody, wasNextCalled: () => nextCalled };
}

describe("Auth Middleware RBAC & Granular Permissions", () => {
  it("allows LAB_SCIENTIST to execute inventory:request", () => {
    const user = {
      id: "u1",
      email: "lab@ahri.gov.et",
      roles: [Role.LAB_SCIENTIST],
      permissions: [],
    };
    const { req, res, next, wasNextCalled } = createMockReqRes(user, "POST", "/domains/inventory/requests");
    const middleware = requirePermission("inventory:request");
    middleware(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });

  it("blocks standard LAB_SCIENTIST from approving inventory requests (inventory:approve)", () => {
    const user = {
      id: "u1",
      email: "lab@ahri.gov.et",
      roles: [Role.LAB_SCIENTIST],
      permissions: [],
    };
    const { req, res, next, getStatus, getBody, wasNextCalled } = createMockReqRes(user, "POST", "/domains/inventory/request-decisions");
    const middleware = requirePermission("inventory:approve");
    middleware(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(getStatus()).toBe(403);
    expect(getBody().code).toBe("FORBIDDEN");
  });

  it("allows RESEARCH_ADMIN and PRINCIPAL_INVESTIGATOR to execute inventory:approve", () => {
    const pi = {
      id: "pi1",
      email: "pi@ahri.gov.et",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
      permissions: [],
    };
    const { req, res, next, wasNextCalled } = createMockReqRes(pi, "POST", "/domains/inventory/request-decisions");
    requirePermission("inventory:approve")(req, res, next);
    expect(wasNextCalled()).toBe(true);

    const admin = {
      id: "admin1",
      email: "admin@ahri.gov.et",
      roles: [Role.RESEARCH_ADMIN],
      permissions: [],
    };
    const m2 = createMockReqRes(admin, "POST", "/domains/inventory/request-decisions");
    requirePermission("inventory:approve")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);
  });

  it("maps custom right 'inventory:Request/s' to inventory:request, but not to inventory:approve or inventory:disburse", () => {
    const user = {
      id: "u2",
      email: "user@ahri.gov.et",
      roles: [],
      permissions: ["inventory:Request/s"],
    };

    // Should allow request
    const m1 = createMockReqRes(user, "POST", "/domains/inventory/requests");
    requirePermission("inventory:request")(m1.req, m1.res, m1.next);
    expect(m1.wasNextCalled()).toBe(true);

    // Should block approve
    const m2 = createMockReqRes(user, "POST", "/domains/inventory/request-decisions");
    requirePermission("inventory:approve")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(false);
    expect(m2.getStatus()).toBe(403);

    // Should block disburse
    const m3 = createMockReqRes(user, "PATCH", "/domains/inventory/requests/1/disburse");
    requirePermission("inventory:disburse")(m3.req, m3.res, m3.next);
    expect(m3.wasNextCalled()).toBe(false);
    expect(m3.getStatus()).toBe(403);
  });

  it("strictly separates 'Check In' and 'Check Out' rights", () => {
    const checkInUser = {
      id: "u_checkin",
      email: "checkin@ahri.gov.et",
      roles: [],
      permissions: ["inventory:Check In"],
    };

    // Check In user has inventory:check-in
    const m1 = createMockReqRes(checkInUser, "POST", "/domains/inventory/bulk-checkin");
    requirePermission("inventory:check-in")(m1.req, m1.res, m1.next);
    expect(m1.wasNextCalled()).toBe(true);

    // Check In user is blocked from inventory:check-out
    const m2 = createMockReqRes(checkInUser, "POST", "/domains/inventory/bulk-checkout");
    requirePermission("inventory:check-out")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(false);
    expect(m2.getStatus()).toBe(403);

    // Check In user is blocked from inventory:disburse
    const m3 = createMockReqRes(checkInUser, "PATCH", "/domains/inventory/requests/1/disburse");
    requirePermission("inventory:disburse")(m3.req, m3.res, m3.next);
    expect(m3.wasNextCalled()).toBe(false);
    expect(m3.getStatus()).toBe(403);

    const checkOutUser = {
      id: "u_checkout",
      email: "checkout@ahri.gov.et",
      roles: [],
      permissions: ["inventory:Check Out"],
    };

    // Check Out user has inventory:check-out
    const m4 = createMockReqRes(checkOutUser, "POST", "/domains/inventory/bulk-checkout");
    requirePermission("inventory:check-out")(m4.req, m4.res, m4.next);
    expect(m4.wasNextCalled()).toBe(true);

    // Check Out user is blocked from inventory:check-in
    const m5 = createMockReqRes(checkOutUser, "POST", "/domains/inventory/bulk-checkin");
    requirePermission("inventory:check-in")(m5.req, m5.res, m5.next);
    expect(m5.wasNextCalled()).toBe(false);
    expect(m5.getStatus()).toBe(403);

    // Check Out user is blocked from inventory:disburse
    const m6 = createMockReqRes(checkOutUser, "PATCH", "/domains/inventory/requests/1/disburse");
    requirePermission("inventory:disburse")(m6.req, m6.res, m6.next);
    expect(m6.wasNextCalled()).toBe(false);
    expect(m6.getStatus()).toBe(403);
  });

  it("strictly enforces inventory:view-only mode and blocks write operations even for ADMIN role", () => {
    const viewOnlyAdmin = {
      id: "admin_vo",
      email: "auditor@ahri.gov.et",
      roles: [Role.ADMIN],
      permissions: ["inventory:view-only"],
    };

    // requirePermission test
    const m1 = createMockReqRes(viewOnlyAdmin, "POST", "/domains/inventory/requests");
    requirePermission("inventory:write")(m1.req, m1.res, m1.next);
    expect(m1.wasNextCalled()).toBe(false);
    expect(m1.getStatus()).toBe(403);

    // requireRole test on inventory mutation
    const m2 = createMockReqRes(viewOnlyAdmin, "POST", "/domains/inventory/bulk-checkin");
    requireRole(Role.ADMIN)(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(false);
    expect(m2.getStatus()).toBe(403);
    expect(m2.getBody().message).toContain("View-Only mode");
  });
});

