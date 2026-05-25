import React from "react";
import { useInventoryData } from "./useInventoryData";

export default function InventoryDashboardPage() {
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 500 });

  const inventoryRows = data?.data ?? [];
  const totalStock = inventoryRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const totalCheckIn = inventoryRows.reduce((sum, row) => sum + Number(row.checkInTotal ?? Number(row.quantity ?? 0)), 0);
  const totalCheckOut = inventoryRows.reduce((sum, row) => sum + Number(row.checkOutTotal ?? 0), 0);
  const lowStockCount = inventoryRows.filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    return quantity <= minThreshold;
  }).length;
  const topUsedItems = [...inventoryRows]
    .sort((left, right) => Number(right.checkOutTotal ?? 0) - Number(left.checkOutTotal ?? 0))
    .slice(0, 10);
  const outOfStockItems = inventoryRows
    .filter((row) => Number(row.quantity ?? 0) === 0)
    .slice(0, 10);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12 }}>
            <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>Total Items</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{data?.total ?? 0}</div>
            </div>
            <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>Total Check In</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{totalCheckIn}</div>
            </div>
            <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>Total Check Out</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{totalCheckOut}</div>
            </div>
            <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>Total Stock</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{totalStock}</div>
            </div>
            <div style={{ padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6 }}>Low Stock</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{lowStockCount}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <div style={{ borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)" }}>Top Used Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {topUsedItems.map((item, index) => (
                    <tr key={`${item.id ?? item.sku ?? item.name ?? index}`} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 600 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>{item.sourceCode ?? item.sku ?? "No code"} · Used {Number(item.checkOutTotal ?? 0)} · Qty {Number(item.quantity ?? 0)}</div>
                      </td>
                    </tr>
                  ))}
                  {topUsedItems.length === 0 && (
                    <tr>
                      <td style={{ padding: "9px 12px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No stock items available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)" }}>Out of Stock Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {outOfStockItems.map((item, index) => (
                    <tr key={`${item.id ?? item.sku ?? item.name ?? index}`} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 600 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>{item.sourceCode ?? item.sku ?? "No code"}</div>
                      </td>
                    </tr>
                  ))}
                  {outOfStockItems.length === 0 && (
                    <tr>
                      <td style={{ padding: "9px 12px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No out-of-stock items right now.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}