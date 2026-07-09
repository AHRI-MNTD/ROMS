import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

const ROW_COUNT = 5;

const rowBase: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  borderBottom: "1px solid var(--color-border)",
  minHeight: 52,
};

export default function InventoryDashboardPage() {
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery({
    queryKey: ["inventory-analytics"],
    queryFn: async () => { const resp = await apiClient.get("/domains/inventory/analytics"); return resp.data; },
    refetchInterval: 30000,
  });

  const { data: requestsData, isLoading: isRequestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => { const resp = await apiClient.get("/domains/inventory/requests"); return resp.data; },
    refetchInterval: 30000,
  });

  const { data: movementsData, isLoading: isMovementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ["inventory-recent-movements"],
    queryFn: async () => { const resp = await apiClient.get("/domains/inventory/movements", { params: { limit: 6 } }); return resp.data; },
    refetchInterval: 30000,
  });

  const isLoading = isAnalyticsLoading || isRequestsLoading || isMovementsLoading;
  const error = analyticsError;

  const summary = analyticsData?.summary ?? {
    totalItems: 0, totalQuantity: 0, totalCheckIn: 0, totalCheckOut: 0,
    lowStockItems: 0, outOfStockItems: 0, healthyItems: 0, atRiskItems: 0,
  };

  const pendingRequestsCount = requestsData?.data?.filter((req: any) => req.status === "PENDING").length ?? 0;
  const topDemandItems: any[] = analyticsData?.topDemandItems ?? [];
  const criticalItems: any[] = analyticsData?.criticalItems ?? [];
  const recentMovements: any[] = movementsData?.data ?? [];
  const expiringSoonItems: any[] = analyticsData?.expiringSoonItems ?? [];

  const statCard = (tone: string): React.CSSProperties => ({
    padding: "12px", borderRadius: 16, border: `1px solid ${tone}22`,
    background: `linear-gradient(135deg, ${tone}08, rgba(255,255,255,0.98))`,
    boxShadow: "0 10px 20px rgba(16,24,40,0.03)", backdropFilter: "blur(8px)",
    display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden",
  });

  const statIcon = (tone: string): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 10, display: "inline-flex",
    alignItems: "center", justifyContent: "center", background: `${tone}15`, color: tone, fontSize: 16,
  });

  const cardStyle = (border: string, bg: string): React.CSSProperties => ({
    flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
    borderRadius: 18, border, background: bg, overflow: "hidden",
  });

  const cardHeader = (color: string, borderColor: string): React.CSSProperties => ({
    padding: "11px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color,
    borderBottom: `1px solid ${borderColor}`, display: "flex",
    justifyContent: "space-between", alignItems: "center", flexShrink: 0,
  });

  const badge = (bg: string, color: string): React.CSSProperties => ({
    fontSize: "var(--fs-xs)", background: bg, color, padding: "2px 8px", borderRadius: 999, fontWeight: 700,
  });

  const emptyCell = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 16px", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>—</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Syncing live inventory data…</div>}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Database / API Connection failure. Please ensure the API backend is running.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* ── KPI Stats Row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, flexShrink: 0 }}>
            {[
              { tone: "#01696f", icon: "📦", value: summary.totalItems, label: "Registered Items" },
              { tone: "#0c4e54", icon: "🧪", value: summary.totalQuantity, label: "Total Quantity" },
              { tone: "#3b82f6", icon: "📋", value: pendingRequestsCount, label: "Pending Requests", badge: pendingRequestsCount > 0 ? { text: "Action", bg: "#dbeafe", color: "#2563eb" } : null },
              { tone: "#b45309", icon: "⬇️", value: summary.totalCheckOut, label: "Cumulative Checkout" },
              { tone: "#dc2626", icon: "⚠️", value: summary.lowStockItems, label: "Low Stock Items", badge: summary.lowStockItems > 0 ? { text: "Attention", bg: "#fee2e2", color: "#b91c1c" } : null },
              { tone: "#7f1d1d", icon: "🛑", value: summary.outOfStockItems, label: "Out of Stock", badge: summary.outOfStockItems > 0 ? { text: "Empty", bg: "#fee2e2", color: "#7f1d1d" } : null },
            ].map(({ tone, icon, value, label, badge: bdg }) => (
              <div key={label} style={statCard(tone)}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={statIcon(tone)}>{icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{value}</div>
                  {bdg && <span style={{ fontSize: "10px", color: bdg.color, fontWeight: 700, background: bdg.bg, padding: "1px 5px", borderRadius: 999 }}>{bdg.text}</span>}
                </div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── 2-Column Cards Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>

            {/* ── Column 1: High-Demand + Recent Activity ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>

              {/* 🔥 High-Demand Inventory */}
              <div style={cardStyle("1px solid var(--color-border)", "var(--color-surface)")}>
                <div style={cardHeader("var(--color-text)", "var(--color-border)")}>
                  🔥 High-Demand Inventory
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {topDemandItems.length === 0
                    ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No data available.</div>
                    : Array.from({ length: ROW_COUNT }, (_, i) => {
                        const item = topDemandItems[i];
                        return (
                          <div key={i} style={rowBase}>
                            {item ? (
                              <>
                                <div>
                                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name ?? "Unknown item"}</div>
                                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>SKU: {item.sku}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.checkOutTotal} used</div>
                                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Qty left: {item.quantity}</div>
                                </div>
                              </>
                            ) : emptyCell}
                          </div>
                        );
                      })
                  }
                </div>
              </div>

              {/* ⏳ Recent Activity Feed */}
              <div style={cardStyle("1px solid var(--color-border)", "var(--color-surface)")}>
                <div style={cardHeader("var(--color-text)", "var(--color-border)")}>
                  ⏳ Recent Activity Feed
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {recentMovements.length === 0
                    ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No recent inventory movements recorded.</div>
                    : Array.from({ length: ROW_COUNT }, (_, i) => {
                        const m = recentMovements[i];
                        if (!m) return <div key={i} style={rowBase}>{emptyCell}</div>;
                        const isCheckIn = m.movementType === "CHECK_IN";
                        const formattedDate = new Date(m.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={i} style={rowBase}>
                            <div style={{ padding: "4px 10px", borderRadius: 8, background: isCheckIn ? "#f0fdf4" : "#fffbeb", color: isCheckIn ? "#16a34a" : "#d97706", fontSize: 11, fontWeight: 700, flexShrink: 0, marginRight: 12 }}>
                              {isCheckIn ? "CHECK IN" : "CHECK OUT"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {m.stockItem?.name ?? "Unknown Item"} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({m.quantity} {m.stockItem?.unit ?? "units"})</span>
                              </div>
                              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                                {m.requestedBy ?? "System"} · {formattedDate}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>

            {/* ── Column 2: Stock Alert + Expiring Soon ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>

              {/* ⚠️ Stock Alert Register */}
              <div style={cardStyle("1px solid rgba(239,68,68,0.18)", "linear-gradient(180deg, rgba(254,242,242,0.3), rgba(255,255,255,0.98))")}>
                <div style={cardHeader("#b91c1c", "rgba(239,68,68,0.1)")}>
                  <span>⚠️ Stock Alert Register</span>
                  <span style={badge("#fee2e2", "#b91c1c")}>Needs Reorder</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {criticalItems.length === 0
                    ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 700 }}>✅ All inventory levels are healthy!</div>
                    : Array.from({ length: ROW_COUNT }, (_, i) => {
                        const item = criticalItems[i];
                        if (!item) return <div key={i} style={rowBase}>{emptyCell}</div>;
                        const qty = Number(item.quantity ?? 0);
                        const isOut = qty <= 0;
                        return (
                          <div key={i} style={rowBase}>
                            <div>
                              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name}</div>
                              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>SKU: {item.sku}</div>
                            </div>
                            <div style={{ fontSize: "var(--fs-sm)", color: isOut ? "#dc2626" : "#d97706" }}>
                              {isOut ? "OUT OF STOCK" : `${qty} left`}
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>

              {/* ⏳ Expiring Soon Register */}
              <div style={cardStyle("1px solid rgba(249,115,22,0.18)", "linear-gradient(180deg, rgba(255,247,237,0.3), rgba(255,255,255,0.98))")}>
                <div style={cardHeader("#c2410c", "rgba(249,115,22,0.1)")}>
                  <span>⏳ Expiring Soon Register</span>
                  <span style={badge("#ffedd5", "#c2410c")}>Within 30 Days</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {expiringSoonItems.length === 0
                    ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 700 }}>✅ No reagents expiring within 30 days.</div>
                    : Array.from({ length: ROW_COUNT }, (_, i) => {
                        const item = expiringSoonItems[i];
                        if (!item) return <div key={i} style={rowBase}>{emptyCell}</div>;
                        const expDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                        return (
                          <div key={i} style={rowBase}>
                            <div>
                              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{item.name}</div>
                              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>SKU: {item.sku}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "var(--fs-sm)", color: "#ea580c", fontWeight: 600 }}>{expDate}</div>
                              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Qty: {item.quantity}</div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}