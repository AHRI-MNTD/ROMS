import { describe, expect, it } from "vitest";
import { isUserAuthorizedForApprovers, formatApproversField } from "./inventory.routes";
import { Role } from "@roms/shared";

describe("Inventory Approver Authorization (Strict ID & Exact Matching)", () => {
  it("formats approvers field with structured user IDs and display names", () => {
    const approvers = [
      { id: "usr_pi_1", displayName: "Dr. Fitsum Girma", email: "fitsum@ahri.gov.et" },
      { id: "usr_pi_2", displayName: "Dr. Sagni Chali", email: "sagni@ahri.gov.et" },
    ];
    const formatted = formatApproversField(approvers);
    expect(formatted).toBe("[APPROVER_IDS:usr_pi_1,usr_pi_2] Dr. Fitsum Girma, Dr. Sagni Chali");
  });

  it("authorizes users matching explicit User ID in [APPROVER_IDS:...]", () => {
    const approverString = "[APPROVER_IDS:usr_pi_1,usr_pi_2] Dr. Fitsum Girma, Dr. Sagni Chali";
    
    const user1 = {
      id: "usr_pi_1",
      displayName: "Different Name",
      email: "different@ahri.gov.et",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
      permissions: [],
    };
    expect(isUserAuthorizedForApprovers(user1, approverString, "HAMMS")).toBe(true);

    const user2 = {
      id: "usr_pi_2",
      displayName: "Dr. Sagni Chali",
      email: "sagni@ahri.gov.et",
      roles: [],
      permissions: ["inventory:approve"],
    };
    expect(isUserAuthorizedForApprovers(user2, approverString, "HAMMS")).toBe(true);

    const unauthorizedUser = {
      id: "usr_other_99",
      displayName: "Dr. Other",
      email: "other@ahri.gov.et",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
      permissions: [],
    };
    expect(isUserAuthorizedForApprovers(unauthorizedUser, approverString, "HAMMS")).toBe(false);
  });

  it("authorizes users with Role.ADMIN or Role.RESEARCH_ADMIN automatically", () => {
    const adminUser = {
      id: "usr_admin_1",
      displayName: "Generic User",
      email: "user@example.com",
      roles: [Role.ADMIN],
    };
    expect(isUserAuthorizedForApprovers(adminUser, "Assalif Demissew", "General")).toBe(true);

    const researchAdmin = {
      id: "usr_ra_1",
      displayName: "Jane Doe",
      email: "jane@ahri.gov.et",
      roles: [Role.RESEARCH_ADMIN],
    };
    expect(isUserAuthorizedForApprovers(researchAdmin, "Wakweya Chali", "DRIVAX")).toBe(true);
  });

  it("authorizes users matching exact approver display name or email", () => {
    const alemayehu = {
      id: "usr_alex_1",
      displayName: "Alemayehu Godana",
      email: "alex@ahri.gov.et",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
    };
    expect(isUserAuthorizedForApprovers(alemayehu, "Alemayehu Godana, Migbaru Kefallew", "TES")).toBe(true);

    const assalif = {
      id: "usr_assalif_1",
      displayName: "Assalif Demissew",
      email: "assalif@ahri.gov.et",
      roles: [Role.PRINCIPAL_INVESTIGATOR],
    };
    expect(isUserAuthorizedForApprovers(assalif, "Assalif Demissew", "ANOSTEP")).toBe(true);
  });

  it("rejects unauthorized requesters who do not match assigned approver IDs or exact names", () => {
    const requester = {
      id: "usr_sci_1",
      displayName: "Random Scientist",
      email: "scientist@ahri.gov.et",
      roles: [Role.LAB_SCIENTIST],
    };
    expect(isUserAuthorizedForApprovers(requester, "Assalif Demissew", "ANOSTEP")).toBe(false);
    expect(isUserAuthorizedForApprovers(requester, "Wakweya Chali", "DRIVAX")).toBe(false);
  });

  it("rejects users who match names but lack approval permission/role", () => {
    const labScientistWithMatchingName = {
      id: "usr_match_1",
      displayName: "Assalif Demissew",
      email: "assalif@ahri.gov.et",
      roles: [Role.LAB_SCIENTIST], // Missing Role.PRINCIPAL_INVESTIGATOR and inventory:approve
      permissions: [],
    };
    expect(isUserAuthorizedForApprovers(labScientistWithMatchingName, "Assalif Demissew", "ANOSTEP")).toBe(false);
  });
});
