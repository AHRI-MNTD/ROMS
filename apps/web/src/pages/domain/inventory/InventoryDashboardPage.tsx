import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
    padding: "20px 16px",
    borderRadius: 18,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    background: `${tone}15`,
    color: tone,
    fontSize: 20,
  });

  const actionButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 12,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text)",
    fontWeight: 700,
    fontSize: "var(--fs-sm)",
    textDecoration: "none",
    transition: "all 0.2s ease-in-out",
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Dashboard Sub-Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            Operational Command Dashboard
          </h2>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            Real-time telemetry and management controls for the research inventory system.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          style={{
            background: "none",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: "var(--fs-xs)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🔄 Refresh Telemetry
        </button>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Syncing live inventory data…</div>}

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Database / API Connection failure. Please ensure the API backend is running.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Aggregated KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div style={statCardStyle("#01696f")}>
              <div>
                <div style={statIconStyle("#01696f")} aria-hidden="true">📦</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Registered Items</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalItems}</div>
            </div>

            <div style={statCardStyle("#0c4e54")}>
              <div>
                <div style={statIconStyle("#0c4e54")} aria-hidden="true">🧪</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total Quantity</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalQuantity}</div>
            </div>

            <div style={statCardStyle("#3b82f6")}>
              <div>
                <div style={statIconStyle("#3b82f6")} aria-hidden="true">📋</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Pending Requests</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: pendingRequestsCount > 0 ? "#2563eb" : "var(--color-text)", fontWeight: 800 }}>
                  {pendingRequestsCount}
                </div>
                {pendingRequestsCount > 0 && (
                  <span style={{ fontSize: "var(--fs-xs)", color: "#2563eb", fontWeight: 700, background: "#dbeafe", padding: "2px 6px", borderRadius: 999 }}>
                    Action required
                  </span>
                )}
              </div>
            </div>

            <div style={statCardStyle("#b45309")}>
              <div>
                <div style={statIconStyle("#b45309")} aria-hidden="true">⬇️</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cumulative Checkout</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--color-text)", fontWeight: 800 }}>{summary.totalCheckOut}</div>
            </div>

            <div style={statCardStyle("#dc2626")}>
              <div>
                <div style={statIconStyle("#dc2626")} aria-hidden="true">⚠️</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Low Stock items</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: summary.lowStockItems > 0 ? "#dc2626" : "var(--color-text)", fontWeight: 800 }}>
                  {summary.lowStockItems}
                </div>
                {summary.lowStockItems > 0 && (
                  <span style={{ fontSize: "var(--fs-xs)", color: "#b91c1c", fontWeight: 700, background: "#fee2e2", padding: "2px 6px", borderRadius: 999 }}>
                    Attention
                  </span>
                )}
              </div>
            </div>

            <div style={statCardStyle("#7f1d1d")}>
              <div>
                <div style={statIconStyle("#7f1d1d")} aria-hidden="true">🛑</div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Out of Stock</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: summary.outOfStockItems > 0 ? "#7f1d1d" : "var(--color-text)", fontWeight: 800 }}>
                  {summary.outOfStockItems}
                </div>
                {summary.outOfStockItems > 0 && (
                  <span style={{ fontSize: "var(--fs-xs)", color: "#7f1d1d", fontWeight: 700, background: "#fee2e2", padding: "2px 6px", borderRadius: 999 }}>
                    Empty
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ padding: "16px 20px", borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" }}>Quick Actions Command Console</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="../check-in" style={actionButtonStyle}>
                <span>➕</span> Check In / Restock
              </Link>
              <Link to="../check-out" style={actionButtonStyle}>
                <span>➖</span> Check Out / Issue Material
              </Link>
              <Link to="../requests" style={{ ...actionButtonStyle, border: pendingRequestsCount > 0 ? "1px solid #3b82f6" : "1px solid var(--color-border)", background: pendingRequestsCount > 0 ? "#eff6ff" : "var(--color-surface)" }}>
                <span>📋</span> Request Operations {pendingRequestsCount > 0 && <span style={{ background: "#3b82f6", color: "white", borderRadius: 999, fontSize: 10, padding: "2px 6px", marginLeft: 4 }}>{pendingRequestsCount}</span>}
              </Link>
              <Link to="../current-inventory" style={actionButtonStyle}>
                <span>🔍</span> Browse Catalog
              </Link>
              <Link to="../analytics" style={actionButtonStyle}>
                <span>📈</span> Analytics Dashboard
              </Link>
              <Link to="../master-data" style={actionButtonStyle}>
                <span>⚙️</span> Master Configurations
              </Link>
            </div>
          </div>

          {/* Core Analytics Split */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            {/* Column 1: Recent Activity & Top Demand */}
            <div style={{ display: "grid", gap: 16 }}>
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
                          fontWeight: 800,
                          fontSize: 12,
                          minWidth: 80,
                          textAlign: "center"
                        }}>
                          {isCheckIn ? "CHECK IN" : "CHECK OUT"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>
                            {m.stockItem?.name ?? "Unknown Item"} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({m.quantity} {m.stockItem?.unit ?? "units"})</span>
                          </div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            {m.projectFor ? `${m.projectFor} · ` : ""}{m.requestedBy ?? "System"} · {formattedDate}
                          </div>
                          {m.remark && (
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
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700 }}>{item.name ?? "Unknown item"}</div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            SKU: {item.sku} · Category: {item.category}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--color-text)" }}>{item.checkOutTotal} used</div>
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
            </div>

            {/* Column 2: Critical / Low Stock Alert Panel */}
            <div style={{ borderRadius: 18, border: "1px solid rgba(239, 68, 68, 0.18)", background: "linear-gradient(180deg, rgba(254, 242, 242, 0.3), rgba(255, 255, 255, 0.98))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "#b91c1c", borderBottom: "1px solid rgba(239, 68, 68, 0.1)", display: "flex", justifyContent: "between", alignItems: "center" }}>
                <span>⚠️ Stock Alert Register</span>
                <span style={{ fontSize: "var(--fs-xs)", background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                  Needs Reorder
                </span>
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {criticalItems.slice(0, 8).map((item: any, index: number) => {
                  const qty = Number(item.quantity ?? 0);
                  const isOut = qty <= 0;

                  return (
                    <div
                      key={item.id ?? index}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: isOut ? "1px solid rgba(239, 68, 68, 0.15)" : "1px solid rgba(217, 119, 6, 0.15)",
                        background: isOut ? "rgba(254, 242, 242, 0.6)" : "rgba(255, 251, 235, 0.6)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: isOut ? "#991b1b" : "#92400e" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                          SKU: {item.sku} · Threshold: {item.minThreshold} {item.unit ?? "units"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: isOut ? "#dc2626" : "#d97706" }}>
                          {isOut ? "OUT OF STOCK" : `${qty} left`}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {criticalItems.length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 700 }}>
                    ✅ All inventory levels are healthy and above minimal thresholds!
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}