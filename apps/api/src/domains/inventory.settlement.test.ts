import { describe, expect, it } from "vitest";
import { getInventoryDecisionDelta, getSettledRequestQuantity } from "./inventory.settlement";

describe("inventory settlement helpers", () => {
  it("treats approved and partial decisions as settled quantities", () => {
    expect(getSettledRequestQuantity("APPROVED", 5)).toBe(5);
    expect(getSettledRequestQuantity("PARTIAL", 3.8)).toBe(3);
  });

  it("treats pending and rejected decisions as unsettled", () => {
    expect(getSettledRequestQuantity("PENDING", 5)).toBe(0);
    expect(getSettledRequestQuantity("REJECTED", 5)).toBe(0);
  });

  it("produces a positive delta when a request becomes approved", () => {
    expect(getInventoryDecisionDelta("PENDING", 0, "APPROVED", 4)).toBe(4);
  });

  it("produces a negative delta when an approved request is reverted to pending", () => {
    expect(getInventoryDecisionDelta("APPROVED", 4, "PENDING", 4)).toBe(-4);
  });

  it("produces the correct delta for partial reductions and rejections", () => {
    expect(getInventoryDecisionDelta("APPROVED", 10, "PARTIAL", 6)).toBe(-4);
    expect(getInventoryDecisionDelta("PARTIAL", 6, "REJECTED", 6)).toBe(-6);
  });
});