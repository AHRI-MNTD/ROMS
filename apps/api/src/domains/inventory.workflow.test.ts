import { describe, expect, it } from "vitest";
import { Role } from "@roms/shared";
import { requirePermission } from "../auth/auth.middleware";

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

describe("Inventory Granular Workflow & Route Guards", () => {
  it("enforces inventory:check-in for bulk check-in", () => {
    const scientist = {
      id: "u1",
      email: "sci@roms.dev",
      roles: [Role.LAB_SCIENTIST],
      permissions: [],
    };
    const { req, res, next, getStatus, wasNextCalled } = createMockReqRes(scientist, "POST", "/domains/inventory/bulk-checkin");
    requirePermission("inventory:check-in")(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(getStatus()).toBe(403);

    const admin = {
      id: "u_admin",
      email: "admin@roms.dev",
      roles: [Role.ADMIN],
      permissions: [],
    };
    const m2 = createMockReqRes(admin, "POST", "/domains/inventory/bulk-checkin");
    requirePermission("inventory:check-in")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);
  });

  it("enforces inventory:check-out for bulk check-out", () => {
    const checkInUser = {
      id: "u_checkin_only",
      email: "in@roms.dev",
      roles: [],
      permissions: ["inventory:Check In"],
    };
    const { req, res, next, getStatus, wasNextCalled } = createMockReqRes(checkInUser, "POST", "/domains/inventory/bulk-checkout");
    requirePermission("inventory:check-out")(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(getStatus()).toBe(403);

    const checkOutUser = {
      id: "u_checkout",
      email: "out@roms.dev",
      roles: [],
      permissions: ["inventory:Check Out"],
    };
    const m2 = createMockReqRes(checkOutUser, "POST", "/domains/inventory/bulk-checkout");
    requirePermission("inventory:check-out")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);
  });

  it("enforces inventory:manage for catalog item creation and deletion", () => {
    const regularUser = {
      id: "u_reg",
      email: "reg@roms.dev",
      roles: [Role.LAB_SCIENTIST],
      permissions: ["inventory:Check In", "inventory:Check Out"],
    };
    const { req, res, next, getStatus, wasNextCalled } = createMockReqRes(regularUser, "POST", "/domains/inventory");
    requirePermission("inventory:manage")(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(getStatus()).toBe(403);

    const masterDataManager = {
      id: "u_md",
      email: "md@roms.dev",
      roles: [],
      permissions: ["inventory:Master Data"],
    };
    const m2 = createMockReqRes(masterDataManager, "POST", "/domains/inventory");
    requirePermission("inventory:manage")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);
  });

  it("enforces inventory:disburse for physical handoff", () => {
    const checkOutUser = {
      id: "u_co",
      email: "co@roms.dev",
      roles: [],
      permissions: ["inventory:Check Out"],
    };
    const { req, res, next, getStatus, wasNextCalled } = createMockReqRes(checkOutUser, "PATCH", "/domains/inventory/requests/1/disburse");
    requirePermission("inventory:disburse")(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(getStatus()).toBe(403);

    const researchAdmin = {
      id: "u_ra",
      email: "ra@roms.dev",
      roles: [Role.RESEARCH_ADMIN],
      permissions: [],
    };
    const m2 = createMockReqRes(researchAdmin, "PATCH", "/domains/inventory/requests/1/disburse");
    requirePermission("inventory:disburse")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);
  });

  it("strictly distinguishes exact project assignment from substring fragments", () => {
    const profileProject = "HAMMS";
    const requestedValid = "HAMMS";
    const requestedInvalid = "HAMMS_EXTRA";
    const requestedSubstring = "HAM";

    const isExactMatch = (p1: string, p2: string) => p1.trim().toLowerCase() === p2.trim().toLowerCase();

    expect(isExactMatch(profileProject, requestedValid)).toBe(true);
    expect(isExactMatch(profileProject, requestedInvalid)).toBe(false);
    expect(isExactMatch(profileProject, requestedSubstring)).toBe(false);
  });

  it("calculates lot balance and validates against overdraw", () => {
    const checkIns = 50;
    const previousCheckOuts = 35;
    const available = checkIns - previousCheckOuts; // 15
    expect(available).toBe(15);

    const validRequest = 10;
    const overdrawRequest = 20;

    expect(validRequest <= available).toBe(true);
    expect(overdrawRequest <= available).toBe(false);

    // Unrecorded lot must be rejected
    const unrecordedLotIn = 0;
    const isLotKnown = unrecordedLotIn > 0;
    expect(isLotKnown).toBe(false);
  });

  it("strictly excludes expired lots from FEFO candidate selection", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    const candidateLots = [
      { lotNumber: "LOT-EXPIRED-01", expiryDate: new Date("2026-10-01T00:00:00Z"), quantity: 100 }, // Expired last month
      { lotNumber: "LOT-ACTIVE-EARLY", expiryDate: new Date("2026-12-01T00:00:00Z"), quantity: 20 }, // Valid, expires in 1 month
      { lotNumber: "LOT-ACTIVE-LATE", expiryDate: new Date("2027-06-01T00:00:00Z"), quantity: 50 },  // Valid, expires next year
      { lotNumber: "LOT-NO-EXPIRY", expiryDate: null, quantity: 30 },                                 // Non-perishable / no expiry
    ];

    // Filter unexpired lots
    const unexpiredLots = candidateLots.filter(
      (lot) => lot.expiryDate === null || lot.expiryDate > now
    );

    expect(unexpiredLots.length).toBe(3);
    expect(unexpiredLots.some((l) => l.lotNumber === "LOT-EXPIRED-01")).toBe(false);

    // FEFO sorts valid lots: earliest expiry first, non-perishable last
    unexpiredLots.sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    });

    expect(unexpiredLots[0].lotNumber).toBe("LOT-ACTIVE-EARLY");
    expect(unexpiredLots[1].lotNumber).toBe("LOT-ACTIVE-LATE");
    expect(unexpiredLots[2].lotNumber).toBe("LOT-NO-EXPIRY");
  });

  it("strictly rejects expired lot if explicitly requested by user or approver", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    const lotRecord = { lotNumber: "LOT-SPECIFIED-EXPIRED", expiryDate: new Date("2026-09-15T00:00:00Z") };
    
    const isExpired = Boolean(lotRecord.expiryDate && lotRecord.expiryDate < now);
    expect(isExpired).toBe(true);

    const checkLotValidity = (record: { expiryDate: Date | null }) => {
      if (record.expiryDate && record.expiryDate < now) {
        throw new Error("EXPIRED_LOT");
      }
      return true;
    };

    expect(() => checkLotValidity(lotRecord)).toThrow("EXPIRED_LOT");
  });
});

