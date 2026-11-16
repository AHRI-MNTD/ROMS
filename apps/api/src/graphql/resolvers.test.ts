import { describe, expect, it } from "vitest";
import { Role } from "@roms/shared";
import { requireGraphQLPermission } from "./resolvers";

describe("GraphQL authorization", () => {
  it("rejects missing authentication", () => {
    expect(() => requireGraphQLPermission({}, "biospecimen:read")).toThrow("Authentication required");
  });

  it("rejects authenticated users without the requested permission", () => {
    expect(() =>
      requireGraphQLPermission(
        { user: { id: "u1", email: "reader@example.com", roles: [Role.DATA_MANAGER], permissions: [] } },
        "biospecimen:write"
      )
    ).toThrow("Insufficient permissions");
  });

  it("allows an authorized role", () => {
    expect(() =>
      requireGraphQLPermission(
        { user: { id: "u1", email: "scientist@example.com", roles: [Role.LAB_SCIENTIST], permissions: [] } },
        "biospecimen:write"
      )
    ).not.toThrow();
  });
});
