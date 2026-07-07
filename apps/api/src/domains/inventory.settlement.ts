export type InventoryDecisionStatus = "APPROVED" | "PENDING" | "REJECTED" | "PARTIAL";

export function getSettledRequestQuantity(status: InventoryDecisionStatus, quantity: number): number {
  if (status === "APPROVED" || status === "PARTIAL") {
    return Math.max(0, Math.floor(quantity));
  }

  return 0;
}

export function getInventoryDecisionDelta(previousStatus: InventoryDecisionStatus | null | undefined, previousQuantity: number, nextStatus: InventoryDecisionStatus, nextQuantity: number): number {
  const previousSettledQuantity = previousStatus ? getSettledRequestQuantity(previousStatus, previousQuantity) : 0;
  const nextSettledQuantity = getSettledRequestQuantity(nextStatus, nextQuantity);

  return nextSettledQuantity - previousSettledQuantity;
}