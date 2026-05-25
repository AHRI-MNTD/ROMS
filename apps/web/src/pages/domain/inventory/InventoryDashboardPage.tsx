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

  const statCardStyle = (tone: string): React.CSSProperties => ({
    padding: 16,
    borderRadius: 18,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.95))`,
    boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)",
  });

  const statIconStyle = (tone: string): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    background: `${tone}18`,
    color: tone,
    fontSize: 18,
    lineHeight: 1,
  });

  const panelHeaderStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: "var(--fs-md)",
    fontWeight: 800,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-divider)",
    textAlign: "center",
    letterSpacing: "0.02em",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-divider)",
  };

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
            <div style={statCardStyle("#01696f")}>
              <div style={statIconStyle("#01696f")} aria-hidden="true">📦</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total Items</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{data?.total ?? 0}</div>
            </div>
            <div style={statCardStyle("#0d6f89")}>
              <div style={statIconStyle("#0d6f89")} aria-hidden="true">⬆️</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total Check In</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{totalCheckIn}</div>
            </div>
            <div style={statCardStyle("#b45309")}>
              <div style={statIconStyle("#b45309")} aria-hidden="true">⬇️</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total Check Out</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{totalCheckOut}</div>
            </div>
            <div style={statCardStyle("#0c4e54")}>
              <div style={statIconStyle("#0c4e54")} aria-hidden="true">🧪</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total Stock</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{totalStock}</div>
            </div>
            <div style={statCardStyle("#92400e")}>
              <div style={statIconStyle("#92400e")} aria-hidden="true">⚠️</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Low Stock</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{lowStockCount}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <div style={{ borderRadius: 18, border: "1px solid rgba(34, 197, 94, 0.16)", background: "linear-gradient(180deg, rgba(240, 253, 244, 0.98), rgba(255,255,255,0.94))", overflow: "hidden", boxShadow: "0 14px 28px rgba(16, 24, 40, 0.05)" }}>
              <div style={panelHeaderStyle}>Top Used Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {topUsedItems.map((item, index) => (
                    <tr key={`${item.id ?? item.sku ?? item.name ?? index}`} style={rowStyle}>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>{item.sourceCode ?? item.sku ?? "No code"} · Used {Number(item.checkOutTotal ?? 0)} · Qty {Number(item.quantity ?? 0)}</div>
                      </td>
                    </tr>
                  ))}
                  {topUsedItems.length === 0 && (
                    <tr>
                      <td style={{ padding: "12px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No stock items available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ borderRadius: 18, border: "1px solid rgba(239, 68, 68, 0.18)", background: "linear-gradient(180deg, rgba(254, 242, 242, 0.98), rgba(255, 255, 255, 0.95))", overflow: "hidden", boxShadow: "0 14px 28px rgba(185, 28, 28, 0.05)" }}>
              <div style={{ ...panelHeaderStyle, color: "#991b1b", borderBottom: "1px solid rgba(239, 68, 68, 0.14)" }}>Out of Stock Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {outOfStockItems.map((item, index) => (
                    <tr key={`${item.id ?? item.sku ?? item.name ?? index}`} style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.12)", background: "rgba(254, 242, 242, 0.65)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "11px", color: "#991b1b", marginTop: 2 }}>{item.sourceCode ?? item.sku ?? "No code"}</div>
                      </td>
                    </tr>
                  ))}
                  {outOfStockItems.length === 0 && (
                    <tr>
                      <td style={{ padding: "12px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No out-of-stock items right now.</td>
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