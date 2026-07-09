import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

export default function InventoryDashboardPage() {
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery({
    queryKey: ["inventory-analytics"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/analytics");
      return resp.data;
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: requestsData, isLoading: isRequestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests");
      return resp.data;
    },
    refetchInterval: 30000,
  });

  const { data: movementsData, isLoading: isMovementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ["inventory-recent-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { limit: 6 },
      });
      return resp.data;
    },
    refetchInterval: 30000,
  });

  const handleRefreshAll = () => {
    refetchAnalytics();
    refetchRequests();
    refetchMovements();
  };

  const isLoading = isAnalyticsLoading || isRequestsLoading || isMovementsLoading;
  const error = analyticsError;

  const summary = analyticsData?.summary ?? {
    totalItems: 0,
    totalQuantity: 0,
    totalCheckIn: 0,
    totalCheckOut: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0,
    atRiskItems: 0,
  };

  const pendingRequestsCount = requestsData?.data?.filter(
    (req: any) => req.status === "PENDING"
  ).length ?? 0;

  const topDemandItems = analyticsData?.topDemandItems ?? [];
  const criticalItems = analyticsData?.criticalItems ?? [];
  const recentMovements = movementsData?.data ?? [];

  const statCardStyle = (tone: string): React.CSSProperties => ({
    padding: "16px 12px",
    borderRadius: 16,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(135deg, ${tone}08, rgba(255,255,255,0.98))`,
    boxShadow: "0 10px 20px rgba(16, 24, 40, 0.03)",
    backdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  });

  const statIconStyle = (tone: string): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: `${tone}15`,
    color: tone,
    fontSize: 17,
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Syncing live inventory data…</div>}

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Database / API Connection failure. Please ensure the API backend is running.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Aggregated KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div style={statCardStyle("#01696f")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={statIconStyle("#01696f")} aria-hidden="true">📦</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalItems}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Registered Items</div>
            </div>

            <div style={statCardStyle("#0c4e54")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={statIconStyle("#0c4e54")} aria-hidden="true">🧪</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalQuantity}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Total Quantity</div>
            </div>

            <div style={statCardStyle("#3b82f6")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={statIconStyle("#3b82f6")} aria-hidden="true">📋</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: pendingRequestsCount > 0 ? "#2563eb" : "var(--color-text)", fontWeight: 800 }}>
                    {pendingRequestsCount}
                  </div>
                  {pendingRequestsCount > 0 && (
                    <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: 700, background: "#dbeafe", padding: "1px 5px", borderRadius: 999 }}>
                      Action
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Pending Requests</div>
            </div>

            <div style={statCardStyle("#b45309")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={statIconStyle("#b45309")} aria-hidden="true">⬇️</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalCheckOut}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Cumulative Checkout</div>
            </div>

            <div style={statCardStyle("#dc2626")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={statIconStyle("#dc2626")} aria-hidden="true">⚠️</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: summary.lowStockItems > 0 ? "#dc2626" : "var(--color-text)", fontWeight: 800 }}>
                    {summary.lowStockItems}
                  </div>
                  {summary.lowStockItems > 0 && (
                    <span style={{ fontSize: "10px", color: "#b91c1c", fontWeight: 700, background: "#fee2e2", padding: "1px 5px", borderRadius: 999 }}>
                      Attention
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Low Stock items</div>
            </div>

            <div style={statCardStyle("#7f1d1d")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={statIconStyle("#7f1d1d")} aria-hidden="true">🛑</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: summary.outOfStockItems > 0 ? "#7f1d1d" : "var(--color-text)", fontWeight: 800 }}>
                    {summary.outOfStockItems}
                  </div>
                  {summary.outOfStockItems > 0 && (
                    <span style={{ fontSize: "10px", color: "#7f1d1d", fontWeight: 700, background: "#fee2e2", padding: "1px 5px", borderRadius: 999 }}>
                      Empty
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Out of Stock</div>
            </div>
          </div>

          {/* Core Analytics Split */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            {/* Column 1: Recent Activity & Top Demand */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Top Demand Items */}
              <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface)", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)", borderBottom: "1px solid var(--color-border)" }}>
                  🔥 High-Demand Inventory
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {topDemandItems.slice(0, 5).map((item: any, index: number) => (
                      <tr key={item.id ?? index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name ?? "Unknown item"}</div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            SKU: {item.sku}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.checkOutTotal} used</div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>Qty left: {item.quantity}</div>
                        </td>
                      </tr>
                    ))}
                    {topDemandItems.length === 0 && (
                      <tr>
                        <td style={{ padding: "16px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Recent Activity Timeline */}
              <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span>⏳ Recent Activity Feed</span>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {recentMovements.slice(0, 5).map((m: any, index: number) => {
                    const isCheckIn = m.movementType === "CHECK_IN";
                    const isCheckout = m.movementType === "CHECK_OUT";
                    const formattedDate = new Date(m.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

                    return (
                      <div key={m.id ?? index} style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
                        <div style={{
                          padding: 6,
                          borderRadius: 8,
                          background: isCheckIn ? "#f0fdf4" : "#fffbeb",
                          color: isCheckIn ? "#16a34a" : "#d97706",
                          fontSize: 12,
                          minWidth: 80,
                          textAlign: "center"
                        }}>
                          {isCheckIn ? "CHECK IN" : "CHECK OUT"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>
                            {m.stockItem?.name ?? "Unknown Item"} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({m.quantity} {m.stockItem?.unit ?? "units"})</span>
                          </div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            {m.projectFor && m.projectFor !== m.requestedBy ? `${m.projectFor} · ` : ""}{m.requestedBy ?? "System"} · {formattedDate}
                          </div>
                          {m.remark && m.remark !== "Imported from check-in CSV" && (
                            <div style={{ fontSize: "11px", fontStyle: "italic", color: "var(--color-text-muted)", marginTop: 4, background: "#f8fafc", padding: "4px 8px", borderRadius: 4 }}>
                              "{m.remark}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {recentMovements.length === 0 && (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
                      No recent inventory movements recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Critical / Low Stock Alert Panel & Expiring Soon Panel */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Critical / Low Stock Alert Panel */}
              <div style={{ borderRadius: 18, border: "1px solid rgba(239, 68, 68, 0.18)", background: "linear-gradient(180deg, rgba(254, 242, 242, 0.3), rgba(255, 255, 255, 0.98))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "#b91c1c", borderBottom: "1px solid rgba(239, 68, 68, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>⚠️ Stock Alert Register</span>
                  <span style={{ fontSize: "var(--fs-xs)", background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                    Needs Reorder
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {criticalItems.slice(0, 5).map((item: any, index: number) => {
                      const qty = Number(item.quantity ?? 0);
                      const isOut = qty <= 0;

                      return (
                        <tr key={item.id ?? index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name}</div>
                            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <div style={{ fontSize: "var(--fs-sm)", color: isOut ? "#dc2626" : "#d97706" }}>
                              {isOut ? "OUT OF STOCK" : `${qty} left`}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {criticalItems.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ padding: "30px 16px", textAlign: "center", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 700 }}>
                          ✅ All inventory levels are healthy!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expiring Soon Alert Panel */}
              <div style={{ borderRadius: 18, border: "1px solid rgba(249, 115, 22, 0.18)", background: "linear-gradient(180deg, rgba(255, 247, 237, 0.3), rgba(255, 255, 255, 0.98))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "#c2410c", borderBottom: "1px solid rgba(249, 115, 22, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>⏳ Expiring Soon Register</span>
                  <span style={{ fontSize: "var(--fs-xs)", background: "#ffedd5", color: "#c2410c", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                    Within 30 Days
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {(analyticsData?.expiringSoonItems ?? []).slice(0, 5).map((item: any, index: number) => {
                      const expDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                      return (
                        <tr key={item.id ?? index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name}</div>
                            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <div style={{ fontSize: "var(--fs-sm)", color: "#ea580c", fontWeight: 600 }}>
                              {expDate}
                            </div>
                            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                              Qty: {item.quantity}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!analyticsData?.expiringSoonItems || analyticsData.expiringSoonItems.length === 0) && (
                      <tr>
                        <td colSpan={2} style={{ padding: "30px 16px", textAlign: "center", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 700 }}>
                          ✅ No reagents expiring within 30 days.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}