import { describe, expect, it } from "vitest";
import { Role, CreateProjectLoanSchema, ProjectLoanDecisionSchema, ReturnProjectLoanSchema } from "@roms/shared";
import { requirePermission } from "../auth/auth.middleware";
import { isUserApproverForProject, getApproverForProjectFallback } from "./inventory.routes";

function createMockReqRes(user: any, method = "POST", url = "/domains/inventory/loans") {
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

describe("Inter-Project Item Loans - RBAC & Business Rules", () => {
  it("enforces inventory:request permission to submit loan requests", () => {
    const scientist = {
      id: "u1",
      email: "sci@roms.dev",
      roles: [Role.LAB_SCIENTIST],
      permissions: [],
    };
    const { req, res, next, wasNextCalled } = createMockReqRes(scientist, "POST", "/domains/inventory/loans");
    requirePermission("inventory:request")(req, res, next);
    expect(wasNextCalled()).toBe(true);

    const viewer = {
      id: "u_viewer",
      email: "viewer@roms.dev",
      roles: [Role.DATA_MANAGER],
      permissions: [],
    };
    const m2 = createMockReqRes(viewer, "POST", "/domains/inventory/loans");
    requirePermission("inventory:request")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(false);
    expect(m2.getStatus()).toBe(403);
  });

  it("enforces inventory:approve permission for loan decisions and return confirmation", () => {
    const scientist = {
      id: "u1",
      email: "sci@roms.dev",
      roles: [Role.LAB_SCIENTIST],
      permissions: [],
    };
    const m1 = createMockReqRes(scientist, "POST", "/domains/inventory/loans/123/decision");
    requirePermission("inventory:approve")(m1.req, m1.res, m1.next);
    expect(m1.wasNextCalled()).toBe(false);
    expect(m1.getStatus()).toBe(403);

    const pi = {
      id: "u_pi",
      email: "pi@roms.dev",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
      permissions: [],
    };
    const m2 = createMockReqRes(pi, "POST", "/domains/inventory/loans/123/decision");
    requirePermission("inventory:approve")(m2.req, m2.res, m2.next);
    expect(m2.wasNextCalled()).toBe(true);

    const m3 = createMockReqRes(pi, "PATCH", "/domains/inventory/loans/123/return");
    requirePermission("inventory:approve")(m3.req, m3.res, m3.next);
    expect(m3.wasNextCalled()).toBe(true);
  });

  it("validates that CreateProjectLoanSchema enforces required fields and positive quantity", () => {
    const valid = CreateProjectLoanSchema.safeParse({
      stockItemId: "stock_123",
      borrowerProject: "TES",
      lenderProject: "HAMMS",
      requestedQuantity: 5,
      dueDate: "2026-11-15",
      requestNotes: "Urgent need for sample analysis",
    });
    expect(valid.success).toBe(true);

    const invalidQty = CreateProjectLoanSchema.safeParse({
      stockItemId: "stock_123",
      borrowerProject: "TES",
      lenderProject: "HAMMS",
      requestedQuantity: 0,
    });
    expect(invalidQty.success).toBe(false);

    const missingItem = CreateProjectLoanSchema.safeParse({
      borrowerProject: "TES",
      lenderProject: "HAMMS",
      requestedQuantity: 5,
    });
    expect(missingItem.success).toBe(false);
  });

  it("validates ProjectLoanDecisionSchema and ReturnProjectLoanSchema", () => {
    const validApproval = ProjectLoanDecisionSchema.safeParse({
      status: "APPROVED",
      approvedQuantity: 5,
      decisionNotes: "Approved under standard return terms",
    });
    expect(validApproval.success).toBe(true);

    const validRejection = ProjectLoanDecisionSchema.safeParse({
      status: "REJECTED",
      decisionNotes: "Stock reserved for upcoming cohort run",
    });
    expect(validRejection.success).toBe(true);

    const invalidStatus = ProjectLoanDecisionSchema.safeParse({
      status: "PENDING",
    });
    expect(invalidStatus.success).toBe(false);

    const validReturn = ReturnProjectLoanSchema.safeParse({
      returnedQuantity: 5,
      returnNotes: "Items verified intact in original packaging",
    });
    expect(validReturn.success).toBe(true);
  });

  it("correctly identifies authorized project approvers and administrators", () => {
    const adminUser = { displayName: "Super Admin", email: "admin@roms.dev", roles: [Role.ADMIN] };
    expect(isUserApproverForProject(adminUser, "HAMMS Vector")).toBe(true);
    expect(isUserApproverForProject(adminUser, "HAMMS Parasite")).toBe(true);
    expect(isUserApproverForProject(adminUser, "ANOSTEP")).toBe(true);

    const alemayehu = { displayName: "Alemayehu Godana", email: "alexbiology@gmail.com", roles: [Role.PRINCIPAL_INVESTIGATOR] };
    const migbaru = { displayName: "Migbaru Kefallew", email: "migbaru@gmail.com", roles: [Role.PRINCIPAL_INVESTIGATOR] };
    const assalif = { displayName: "Assalif Demissew", email: "ashifera@gmail.com", roles: [Role.PRINCIPAL_INVESTIGATOR] };
    const unrelatedUser = { displayName: "John Doe", email: "johndoe@example.com", roles: [Role.LAB_SCIENTIST] };

    // HAMMS Vector: Approver should be only Assalif
    expect(getApproverForProjectFallback("HAMMS Vector")).toBe("Assalif Demissew");
    expect(isUserApproverForProject(assalif, "HAMMS Vector")).toBe(true);
    expect(isUserApproverForProject(alemayehu, "HAMMS Vector")).toBe(false);
    expect(isUserApproverForProject(migbaru, "HAMMS Vector")).toBe(false);
    expect(isUserApproverForProject(unrelatedUser, "HAMMS Vector")).toBe(false);

    // HAMMS Parasite: Approver should be either Migbaru or Alemayehu
    expect(getApproverForProjectFallback("HAMMS Parasite")).toContain("Migbaru Kefallew");
    expect(getApproverForProjectFallback("HAMMS Parasite")).toContain("Alemayehu Godana");
    expect(isUserApproverForProject(alemayehu, "HAMMS Parasite")).toBe(true);
    expect(isUserApproverForProject(migbaru, "HAMMS Parasite")).toBe(true);
    expect(isUserApproverForProject(assalif, "HAMMS Parasite")).toBe(false);
    expect(isUserApproverForProject(unrelatedUser, "HAMMS Parasite")).toBe(false);

    // Other projects
    expect(isUserApproverForProject(alemayehu, "TES")).toBe(true);
    expect(getApproverForProjectFallback("ANOSTEP")).toContain("Assalif Demissew");
    expect(getApproverForProjectFallback("PVSTATEM")).toContain("Tilahun Ketema");
  });
});

