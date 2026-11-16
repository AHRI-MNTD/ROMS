import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import { useReagentDashboard } from "./useReagentData";
import type { ReagentItem, ReagentRequest, ReagentMovement } from "./reagentShared";
import { getStorageBadgeMeta, formatStorageCondition } from "./reagentShared";

const ROW_COUNT = 5;

const rowBase: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 12px",
  borderBottom: "1px solid var(--color-border)",
  minHeight: 38,
};

export default function ReagentDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAssay, setSelectedAssay] = useState<string>("ALL");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Fetch telemetry overview
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useReagentDashboard();

  // Fetch reagents list for analytics calculations
  const { data: itemsData, isLoading: isItemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["reagent-items-dashboard", selectedAssay],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory", {
        params: {
          pageSize: 100,
          assayType: selectedAssay !== "ALL" ? selectedAssay : undefined,
        },
      });
      return resp.data as { data: ReagentItem[]; total: number };
    },
    refetchInterval: 30000,
  });

  // Fetch pending & approved requests
  const { data: requestsData, isLoading: isRequestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["reagent-requests-dashboard"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/requests");
      return resp.data as { data: ReagentRequest[]; total: number };
    },
    refetchInterval: 30000,
  });

  // Reagents list
  const items = useMemo(() => itemsData?.data ?? [], [itemsData?.data]);
  const requests = useMemo(() => requestsData?.data ?? [], [requestsData?.data]);

  // Unique assays for filter
  const assayList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.assayType).filter(Boolean))).sort();
  }, [items]);

  // Critical reagents (available <= minThreshold or depleted)
  const criticalItems = useMemo(() => {
    return items
      .filter((i) => i.availableConcentration <= i.minThreshold)
      .sort((a, b) => a.availableConcentration - b.availableConcentration)
      .slice(0, ROW_COUNT);
  }, [items]);

  // Reagents expiring within 90 days
  const expiringSoonItems = useMemo(() => {
    const now = new Date();
    const ninetyDays = new Date(Date.now() + 90 * 86400000);
    return items
      .filter((i) => i.expiryDate && new Date(i.expiryDate) < ninetyDays)
      .sort((a, b) => (new Date(a.expiryDate!).getTime()) - (new Date(b.expiryDate!).getTime()))
      .slice(0, ROW_COUNT);
  }, [items]);

  // Top reagents by issued concentration / usage
  const topDemandItems = useMemo(() => {
    return [...items]
      .sort((a, b) => (b.issuedConcentration ?? 0) - (a.issuedConcentration ?? 0))
      .slice(0, ROW_COUNT);
  }, [items]);

  // Pending requests count
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  // Approved requests count
  const approvedRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "APPROVED" || r.status === "PARTIAL").length;
  }, [requests]);

  // Total concentration across all items
  const totalAvailableConcentration = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.availableConcentration ?? 0), 0);
  }, [items]);

  const isLoading = isDashboardLoading || isItemsLoading || isRequestsLoading;

  const cardStyle = (border: string, bg: string): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    borderRadius: 12,
    border,
    background: bg,
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
  });

  const cardHeader = (color: string, borderColor: string): React.CSSProperties => ({
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 800,
    color,
    borderBottom: `1px solid ${borderColor}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  });

  const badge = (bg: string, color: string): React.CSSProperties => ({
    fontSize: "9px",
    background: bg,
    color,
    padding: "1px 6px",
    borderRadius: 999,
    fontWeight: 700,
  });

  const emptyCell = (color: string, text: string) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: "10px", fontWeight: 700 }}>
      {text}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        maxHeight: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ── Top Control Bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--color-text-muted)" }}>
            Assay Scope:
          </label>
          <select
            value={selectedAssay}
            onChange={(e) => setSelectedAssay(e.target.value)}
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontWeight: 600,
            }}
          >
            <option value="ALL">All 23 Assays</option>
            {assayList.map((assay) => (
              <option key={assay} value={assay}>
                {assay}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              refetchDashboard();
              refetchItems();
              refetchRequests();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            🔄 Refresh Live Signals
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Total Reagents */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid rgba(14, 165, 233, 0.22)",
            background: isDarkMode
              ? "linear-gradient(145deg, #0e2238 0%, #071524 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(14, 165, 233, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Total Reagents
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>
            {dashboardData?.totalItems ?? items.length}
          </div>
          <div style={{ fontSize: "10px", color: "var(--color-primary)", fontWeight: 600 }}>Active in repository</div>
        </div>

        {/* Total Concentration */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(13, 148, 136, 0.22)",
            background: isDarkMode
              ? "linear-gradient(145deg, #0d2c29 0%, #061c1a 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(13, 148, 136, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Total Available Conc.
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-primary)", marginTop: 2 }}>
            {totalAvailableConcentration.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Cumulative across lots</div>
        </div>

        {/* Low Stock Alerts */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(239, 68, 68, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #450a0a 0%, #2b0606 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(239, 68, 68, 0.12) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>
            Low / Critical Stock
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
            {dashboardData?.lowStock ?? criticalItems.length}
          </div>
          <div style={{ fontSize: "10px", color: "#b91c1c" }}>Below threshold</div>
        </div>

        {/* Expired / Watch */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(245, 158, 11, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #451a03 0%, #291002 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(245, 158, 11, 0.12) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>
            Expiring Soon (&lt;90d)
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#d97706", marginTop: 2 }}>
            {expiringSoonItems.length}
          </div>
          <div style={{ fontSize: "10px", color: "#b45309" }}>Requires rotation</div>
        </div>

        {/* Pending Requests */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(217, 119, 6, 0.35)" : "1px solid rgba(217, 119, 6, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #3c1b06 0%, #220f03 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(217, 119, 6, 0.12) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>
            Pending Requests
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#b45309", marginTop: 2 }}>
            {pendingRequestsCount}
          </div>
          <div style={{ fontSize: "10px", color: "#92400e" }}>Awaiting Tegbar review</div>
        </div>

        {/* Approved & Ready */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #064e3b 0%, #032e23 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(16, 185, 129, 0.12) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>
            Approved Reagents
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", marginTop: 2 }}>
            {approvedRequestsCount}
          </div>
          <div style={{ fontSize: "10px", color: "#047857" }}>Ready for hand-off</div>
        </div>
      </div>

      {/* ── Main Operational Grid (4 Quarters matching InventoryDashboardPage) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 12,
        }}
      >
        {/* Quadrant 1: Most Active / High Usage Reagents */}
        <div
          style={cardStyle(
            isDarkMode ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid rgba(14, 165, 233, 0.22)",
            isDarkMode
              ? "linear-gradient(160deg, #132238 0%, #091322 100%)"
              : "linear-gradient(160deg, #ffffff 45%, rgba(14, 165, 233, 0.08) 100%)"
          )}
        >
          <div style={cardHeader("var(--color-primary)", "rgba(14, 165, 233, 0.15)")}>
            <span>⚡ Most Active Reagents by Issued Concentration</span>
            <span style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>Top Demand</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {topDemandItems.length === 0 ? (
              emptyCell("var(--color-text-muted)", "No reagent movement records found.")
            ) : (
              topDemandItems.map((item, idx) => (
                <div key={item.id} style={rowBase}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-primary)" }}>#{idx + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>
                        {item.reagentCode} • {item.assayType}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-primary)" }}>
                      {item.issuedConcentration ?? 0} {item.concentrationUnit ?? "units"}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                      Avail: {item.availableConcentration}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quadrant 2: Critical / Low Concentration Alert */}
        <div
          style={cardStyle(
            isDarkMode ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(239, 68, 68, 0.25)",
            isDarkMode
              ? "linear-gradient(160deg, #330b0b 0%, #1e0505 100%)"
              : "linear-gradient(160deg, #ffffff 45%, rgba(239, 68, 68, 0.10) 100%)"
          )}
        >
          <div style={cardHeader("#ef4444", "rgba(239, 68, 68, 0.18)")}>
            <span>⚠️ Critical Reagents (Depleted or Near Threshold)</span>
            <span style={badge("#fecaca", "#991b1b")}>{criticalItems.length} critical</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {criticalItems.length === 0 ? (
              emptyCell("#059669", "✅ All reagents maintain healthy concentrations.")
            ) : (
              criticalItems.map((item) => (
                <div key={item.id} style={rowBase}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>
                      {item.reagentCode} • {item.assayType}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626" }}>
                      {item.availableConcentration} {item.concentrationUnit ?? ""}
                    </span>
                    <div style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                      Min: {item.minThreshold}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quadrant 3: Reagents Expiring Soon */}
        <div
          style={cardStyle(
            isDarkMode ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(245, 158, 11, 0.25)",
            isDarkMode
              ? "linear-gradient(160deg, #341a04 0%, #1f1002 100%)"
              : "linear-gradient(160deg, #ffffff 45%, rgba(245, 158, 11, 0.10) 100%)"
          )}
        >
          <div style={cardHeader("#d97706", "rgba(245, 158, 11, 0.18)")}>
            <span>⏳ Expiry Watch (&lt; 90 Days)</span>
            <span style={badge("#fef3c7", "#92400e")}>{expiringSoonItems.length} items</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {expiringSoonItems.length === 0 ? (
              emptyCell("#059669", "✅ No reagents expiring within 90 days.")
            ) : (
              expiringSoonItems.map((item) => {
                const days = item.expiryDate
                  ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000)
                  : 0;
                const isPast = days <= 0;

                return (
                  <div key={item.id} style={rowBase}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>
                        Lot: {item.lotNumber || "—"} • {item.location || "Location not recorded"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: isPast ? "#ef4444" : "#d97706",
                        }}
                      >
                        {isPast ? "Expired" : `${days} days left`}
                      </span>
                      <div style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quadrant 4: Pending Requisition Queue (for Tegbar / Lab Staff) */}
        <div
          style={cardStyle(
            isDarkMode ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(99, 102, 241, 0.22)",
            isDarkMode
              ? "linear-gradient(160deg, #1d193d 0%, #0f0c22 100%)"
              : "linear-gradient(160deg, #ffffff 45%, rgba(99, 102, 241, 0.08) 100%)"
          )}
        >
          <div style={cardHeader("#4f46e5", "rgba(99, 102, 241, 0.15)")}>
            <span>📋 Recent Reagent Requisitions</span>
            <span style={badge("rgba(99, 102, 241, 0.12)", "#4f46e5")}>{requests.length} total</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {requests.length === 0 ? (
              emptyCell("var(--color-text-muted)", "No reagent requests logged yet.")
            ) : (
              requests.slice(0, ROW_COUNT).map((req) => (
                <div key={req.id} style={rowBase}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.assayType} {req.reagentType ? `(${req.reagentType})` : ""}
                    </div>
                    <div style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>
                      By {req.requestedBy} • Proj: {req.projectFor || "General"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background:
                          req.status === "APPROVED"
                            ? "#dcfce7"
                            : req.status === "PARTIAL"
                            ? "#ffedd5"
                            : req.status === "REJECTED"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          req.status === "APPROVED"
                            ? "#15803d"
                            : req.status === "PARTIAL"
                            ? "#c2410c"
                            : req.status === "REJECTED"
                            ? "#b91c1c"
                            : "#b45309",
                      }}
                    >
                      {req.status}
                    </span>
                    <div style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {req.requestedConcentration} conc. {req.numberOfVill ? `• ${req.numberOfVill} vills` : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
