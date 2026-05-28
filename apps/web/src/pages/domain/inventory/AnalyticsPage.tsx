import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

interface AnalyticsSummary {
  totalItems: number;
  totalQuantity: number;
  totalCheckIn: number;
  totalCheckOut: number;
  lowStockItems: number;
  outOfStockItems: number;
  healthyItems: number;
  atRiskItems: number;
}

interface AnalyticsCategory {
  category: string;
  count: number;
  quantity: number;
  checkOut: number;
}

interface AnalyticsMovementPoint {
  key: string;
  label: string;
  checkIn: number;
  checkOut: number;
  stockRisk: number;
}

interface AnalyticsBarItem {
  category: string;
  quantity: number;
}

interface AnalyticsItem {
  id?: string;
  sku?: string;
  sourceCode?: string;
  name?: string;
  category?: string;
  quantity?: number;
  minThreshold?: number;
  checkInTotal?: number;
  checkOutTotal?: number;
}

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  categoryBreakdown: AnalyticsCategory[];
  topDemandItems: AnalyticsItem[];
  criticalItems: AnalyticsItem[];
  monthlyTrends: AnalyticsMovementPoint[];
  usageRecords?: UsageRecord[];
}

interface UsageRecord {
  id: string;
  stockItemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  quantity: number;
  requestedBy: string;
  projectFor: string;
  status: string;
  occurredAt: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function getTrendPath(values: number[], width: number, height: number, padding = 20) {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x = padding + (values.length === 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth);
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function SvgTrendChart({
  points,
  label,
  color,
  accent,
}: {
  points: AnalyticsMovementPoint[];
  label: string;
  color: string;
  accent: string;
}) {
  const width = 720;
  const height = 240;
  const values = points.map((point) => point.checkOut);
  const path = getTrendPath(values, width, height, 24);
  const maxValue = Math.max(...values, 1);

  return (
    <div style={{ padding: 16, borderRadius: 18, border: `1px solid ${accent}22`, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: accent, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>Monthly movement volume over the last six months.</div>
        </div>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Highest month: {formatNumber(maxValue)}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id={`trend-${label.replace(/\s+/g, "-").toLowerCase()}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = 24 + (height - 48) * tick;
          return <line key={tick} x1="24" x2={width - 24} y1={y} y2={y} stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />;
        })}
        {points.map((point, index) => {
          const x = 24 + (points.length === 1 ? (width - 48) / 2 : (index / Math.max(points.length - 1, 1)) * (width - 48));
          return <line key={point.key} x1={x} x2={x} y1={24} y2={height - 24} stroke="rgba(15, 23, 42, 0.04)" />;
        })}
        {path && (
          <>
            <path d={`${path} L ${width - 24},${height - 24} L 24,${height - 24} Z`} fill={`url(#trend-${label.replace(/\s+/g, "-").toLowerCase()})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {points.map((point, index) => {
          const value = point.checkOut;
          const x = 24 + (points.length === 1 ? (width - 48) / 2 : (index / Math.max(points.length - 1, 1)) * (width - 48));
          const y = 24 + (height - 48) - (value / maxValue) * (height - 48);
          return (
            <g key={point.key}>
              <circle cx={x} cy={y} r="5.5" fill="#fff" stroke={color} strokeWidth="3" />
              <text x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
                {point.label}
              </text>
              <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text)">
                {formatNumber(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SvgBarChart({
  title,
  subtitle,
  items,
  valueKey,
  color,
  accent,
}: {
  title: string;
  subtitle: string;
  items: AnalyticsBarItem[];
  valueKey: string;
  color: string;
  accent: string;
}) {
  const width = 720;
  const rowHeight = 44;
  const height = Math.max(180, items.length * rowHeight + 56);
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey as keyof AnalyticsBarItem] ?? 0)), 1);

  return (
    <div style={{ padding: 16, borderRadius: 18, border: `1px solid ${accent}22`, background: "#fff" }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: accent, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", marginTop: 4 }}>{subtitle}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} style={{ width: "100%", height: "auto", display: "block" }}>
        {items.map((item, index) => {
          const value = Number(item[valueKey as keyof AnalyticsBarItem] ?? 0);
          const barWidth = (value / maxValue) * (width - 220);
          const y = 24 + index * rowHeight;
          const label = String(item.category ?? "Item");
          return (
            <g key={`${label}-${index}`}>
              <text x="0" y={y + 16} fontSize="12" fill="var(--color-text)" fontWeight="700">
                {label}
              </text>
              <text x={180} y={y + 16} fontSize="11" fill="var(--color-text-muted)" textAnchor="end">
                {formatNumber(value)}
              </text>
              <rect x="190" y={y} width={width - 220} height="18" rx="9" fill="rgba(15, 23, 42, 0.08)" />
              <rect x="190" y={y} width={Math.max(4, barWidth)} height="18" rx="9" fill={index % 2 === 0 ? color : accent} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory-analytics"],
    queryFn: async () => {
      const response = await apiClient.get("/domains/inventory/analytics");
      return response.data as AnalyticsResponse;
    },
  });

  const summary = data?.summary;
  const categoryBreakdown = data?.categoryBreakdown ?? [];
  const topDemandItems = data?.topDemandItems ?? [];
  const criticalItems = data?.criticalItems ?? [];
  const monthlyTrends = data?.monthlyTrends ?? [];
  const usageRecords = data?.usageRecords ?? [];

  const [usageSortBy, setUsageSortBy] = React.useState<"item" | "project" | "user">("item");
  const [datePreset, setDatePreset] = React.useState<"week" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = React.useState("");
  const [customEndDate, setCustomEndDate] = React.useState("");
  const [usageSearch, setUsageSearch] = React.useState("");

  const healthShare = React.useMemo(() => {
    const total = summary ? summary.healthyItems + summary.lowStockItems + summary.outOfStockItems : 0;
    return {
      healthy: percentage(summary?.healthyItems ?? 0, total),
      lowStock: percentage(summary?.lowStockItems ?? 0, total),
      outOfStock: percentage(summary?.outOfStockItems ?? 0, total),
    };
  }, [summary]);

  const riskTrendValues = monthlyTrends.map((point) => point.stockRisk);
  const maxRisk = Math.max(...riskTrendValues, 1);
  const maxCheckIn = Math.max(...monthlyTrends.map((point) => point.checkIn), 1);
  const maxCheckOut = Math.max(...monthlyTrends.map((point) => point.checkOut), 1);

  const executiveSummary = React.useMemo(() => {
    if (!summary) {
      return "No inventory records are available yet.";
    }

    const movementTotal = summary.totalCheckIn + summary.totalCheckOut;
    const demandShare = percentage(summary.totalCheckOut, movementTotal);
    return [
      `The inventory currently tracks ${formatNumber(summary.totalItems)} item records with ${formatNumber(summary.totalQuantity)} total units on hand.`,
      `There are ${formatNumber(summary.atRiskItems)} items requiring attention (${formatNumber(summary.lowStockItems)} low stock and ${formatNumber(summary.outOfStockItems)} out of stock).`,
      `Usage is active: ${formatNumber(summary.totalCheckOut)} units have been checked out, representing ${demandShare}% of total recorded movement.`,
    ].join(" ");
  }, [summary]);

  const filteredUsageRecords = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (datePreset === "week") {
      start.setDate(now.getDate() - 7);
    } else if (datePreset === "month") {
      start.setMonth(now.getMonth() - 1);
    } else {
      if (customStartDate) {
        const customStart = new Date(customStartDate);
        start.setTime(customStart.getTime());
      } else {
        start.setTime(0);
      }
      if (customEndDate) {
        const customEnd = new Date(customEndDate);
        end.setTime(customEnd.getTime());
        end.setHours(23, 59, 59, 999);
      }
    }

    const q = usageSearch.trim().toLowerCase();

    return usageRecords.filter((row) => {
      const when = new Date(row.occurredAt);
      if (Number.isNaN(when.getTime())) return false;
      if (when < start || when > end) return false;
      if (!q) return true;
      return (
        row.itemName.toLowerCase().includes(q) ||
        row.itemCode.toLowerCase().includes(q) ||
        row.projectFor.toLowerCase().includes(q) ||
        row.requestedBy.toLowerCase().includes(q)
      );
    });
  }, [usageRecords, datePreset, customStartDate, customEndDate, usageSearch]);

  const usageRows = React.useMemo(() => {
    return [...filteredUsageRecords].sort((a, b) => {
      if (usageSortBy === "item") {
        const byItem = a.itemName.localeCompare(b.itemName);
        if (byItem !== 0) return byItem;
        const byProject = a.projectFor.localeCompare(b.projectFor);
        if (byProject !== 0) return byProject;
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }

      if (usageSortBy === "project") {
        const byProject = a.projectFor.localeCompare(b.projectFor);
        if (byProject !== 0) return byProject;
        const byItem = a.itemName.localeCompare(b.itemName);
        if (byItem !== 0) return byItem;
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }

      const byUser = a.requestedBy.localeCompare(b.requestedBy);
      if (byUser !== 0) return byUser;
      const byItem = a.itemName.localeCompare(b.itemName);
      if (byItem !== 0) return byItem;
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
  }, [filteredUsageRecords, usageSortBy]);

  const topProjects = React.useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of filteredUsageRecords) {
      grouped.set(row.projectFor, (grouped.get(row.projectFor) ?? 0) + Number(row.quantity ?? 0));
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filteredUsageRecords]);

  const topUsers = React.useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of filteredUsageRecords) {
      grouped.set(row.requestedBy, (grouped.get(row.requestedBy) ?? 0) + Number(row.quantity ?? 0));
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filteredUsageRecords]);

  const cardStyle = (tone: string): React.CSSProperties => ({
    border: `1px solid ${tone}22`,
    background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.96))`,
  });

  const printReport = () => {
    window.print();
  };

  const exportUsageCsv = () => {
    if (usageRows.length === 0) {
      return;
    }
    const rows = ["sort_by,item,project,user,quantity,date,status"];
    for (const row of usageRows) {
      rows.push(
        [
          usageSortBy,
          row.itemName,
          row.projectFor,
          row.requestedBy,
          String(row.quantity ?? 0),
          new Date(row.occurredAt).toISOString(),
          row.status,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usage-analytics-${usageSortBy}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pageChromeStyle: React.CSSProperties = {
    padding: 22,
    borderRadius: 26,
    border: "1px solid rgba(1, 105, 111, 0.16)",
    background: "linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 250, 244, 0.96))",
    boxShadow: "0 18px 36px rgba(16, 24, 40, 0.06)",
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 22,
    border: "1px solid var(--color-border)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,248,244,0.95))",
    boxShadow: "0 18px 34px rgba(16, 24, 40, 0.05)",
    overflow: "hidden",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid var(--color-divider)",
    fontSize: "var(--fs-sm)",
    fontWeight: 800,
    color: "var(--color-text)",
    letterSpacing: "0.02em",
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .report-page { padding: 0 !important; }
          .report-card { box-shadow: none !important; break-inside: avoid; }
          .report-section { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>

      <div className="report-card" style={pageChromeStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.12em", color: "#0f766e", fontWeight: 800, marginBottom: 8 }}>
              Executive Inventory Analytics
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", color: "var(--color-text)", lineHeight: 1.05, marginBottom: 10 }}>
              Inventory health, demand pressure, and risk exposure at a glance.
            </h2>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
              This page is designed for leadership review. It converts live inventory records into a concise operational picture: what is available, what is at risk, what is moving, and where the next intervention should happen.
            </p>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={printReport}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: "var(--fs-xs)",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Download PDF Report
            </button>
          </div>

          <div style={{ minWidth: 260, flex: "0 0 260px", padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.74)", border: "1px solid rgba(1, 105, 111, 0.14)" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Leadership Brief</div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", lineHeight: 1.7 }}>{executiveSummary}</div>
          </div>
        </div>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading inventory analytics…</div>}

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #fca5a5", background: "#fef2f2", color: "#991b1b", fontSize: "var(--fs-sm)" }}>
          Inventory analytics unavailable. Start the API server and ensure inventory data is accessible.
        </div>
      )}

      {!isLoading && !error && summary && (
        <div className="report-page" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div className="report-card" style={{ ...cardStyle("#01696f"), borderRadius: 20, padding: 18, boxShadow: "0 16px 30px rgba(16, 24, 40, 0.06)" }}>
              <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e", marginBottom: 8, fontWeight: 800 }}>Tracked Items</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--color-text)" }}>{formatNumber(summary.totalItems)}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>Distinct inventory records currently in view.</div>
            </div>

            <div className="report-card" style={{ ...cardStyle("#0f766e"), borderRadius: 20, padding: 18, boxShadow: "0 16px 30px rgba(16, 24, 40, 0.06)" }}>
              <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e", marginBottom: 8, fontWeight: 800 }}>Units On Hand</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--color-text)" }}>{formatNumber(summary.totalQuantity)}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>Total current stock across all items.</div>
            </div>

            <div className="report-card" style={{ ...cardStyle("#0d6f89"), borderRadius: 20, padding: 18, boxShadow: "0 16px 30px rgba(16, 24, 40, 0.06)" }}>
              <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#0d6f89", marginBottom: 8, fontWeight: 800 }}>Check-In Volume</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--color-text)" }}>{formatNumber(summary.totalCheckIn)}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>Cumulative inbound movement recorded.</div>
            </div>

            <div className="report-card" style={{ ...cardStyle("#b45309"), borderRadius: 20, padding: 18, boxShadow: "0 16px 30px rgba(16, 24, 40, 0.06)" }}>
              <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#b45309", marginBottom: 8, fontWeight: 800 }}>Check-Out Volume</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--color-text)" }}>{formatNumber(summary.totalCheckOut)}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>Cumulative outbound demand and consumption.</div>
            </div>

            <div className="report-card" style={{ ...cardStyle("#92400e"), borderRadius: 20, padding: 18, boxShadow: "0 16px 30px rgba(16, 24, 40, 0.06)" }}>
              <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#92400e", marginBottom: 8, fontWeight: 800 }}>At-Risk Items</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--color-text)" }}>{formatNumber(summary.atRiskItems)}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 6 }}>Items that need replenishment attention.</div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Usage Analytics Explorer</div>
            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                  Sort By
                  <select value={usageSortBy} onChange={(e) => setUsageSortBy(e.target.value as "item" | "project" | "user")} style={{ marginTop: 4, width: "100%", border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 8px", background: "var(--color-surface)" }}>
                    <option value="item">Item</option>
                    <option value="project">Project</option>
                    <option value="user">User / Staff</option>
                  </select>
                </label>
                <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                  Date Range
                  <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as "week" | "month" | "custom")} style={{ marginTop: 4, width: "100%", border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 8px", background: "var(--color-surface)" }}>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
              </div>

              {datePreset === "custom" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    Start
                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ marginTop: 4, width: "100%", border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 8px", background: "var(--color-surface)" }} />
                  </label>
                  <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    End
                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ marginTop: 4, width: "100%", border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 8px", background: "var(--color-surface)" }} />
                  </label>
                </div>
              )}

              <input value={usageSearch} onChange={(e) => setUsageSearch(e.target.value)} placeholder="Search item, project, user" style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "7px 10px", background: "var(--color-surface)" }} />

              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Showing {formatNumber(Math.min(10, usageRows.length))} of {formatNumber(usageRows.length)} records · search keeps the drilldown manageable</div>
                <button type="button" onClick={exportUsageCsv} style={{ border: "1px solid var(--color-border)", background: "var(--color-accent-soft)", color: "var(--color-text)", borderRadius: 999, padding: "7px 10px", fontSize: "var(--fs-xs)", fontWeight: 800, cursor: "pointer" }}>Export CSV</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 10, background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "var(--fs-xs)", color: "#0f766e", fontWeight: 800, textTransform: "uppercase" }}>Top Projects</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {topProjects.length === 0 ? <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No data</div> : topProjects.map(([name, qty]) => <div key={name} style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>{name} · {formatNumber(qty)}</div>)}
                  </div>
                </div>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 10, background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "var(--fs-xs)", color: "#92400e", fontWeight: 800, textTransform: "uppercase" }}>Top Users</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {topUsers.length === 0 ? <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No data</div> : topUsers.map(([name, qty]) => <div key={name} style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>{name} · {formatNumber(qty)}</div>)}
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)" }}>
                {usageRows.length === 0 ? (
                  <div style={{ padding: 12, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No usage records for selected filters.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>{usageSortBy === "item" ? "Item" : usageSortBy === "project" ? "Project" : "User / Staff"}</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>{usageSortBy === "item" ? "Project" : usageSortBy === "project" ? "Item" : "Item"}</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>{usageSortBy === "user" ? "Project" : "User / Staff"}</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageRows.slice(0, 10).map((row) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                          <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 700 }}>{usageSortBy === "item" ? row.itemName : usageSortBy === "project" ? row.projectFor : row.requestedBy}</td>
                          <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>{usageSortBy === "item" ? row.projectFor || "-" : row.itemName}</td>
                          <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>{usageSortBy === "user" ? row.projectFor || "-" : row.requestedBy}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(Number(row.quantity ?? 0))}</td>
                          <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(row.occurredAt).toLocaleDateString()}</td>
                          <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: row.status.toLowerCase() === "rejected" ? "#991b1b" : row.status.toLowerCase() === "pending" ? "#92400e" : "#166534", fontWeight: 800 }}>{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)", gap: 12, alignItems: "start" }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Risk Register</div>
              <div style={{ padding: 16 }}>
                {criticalItems.length === 0 ? (
                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No low-stock or out-of-stock items were found.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {criticalItems.map((item) => {
                      const quantity = Number(item.quantity ?? 0);
                      const minThreshold = Number(item.minThreshold ?? 0);
                      const status = quantity <= 0 ? "Out of stock" : quantity <= minThreshold ? "Low stock" : "Healthy";
                      const tone = quantity <= 0 ? "#991b1b" : "#92400e";
                      const fill = minThreshold > 0 ? Math.max(6, Math.min(100, percentage(quantity, minThreshold))) : quantity > 0 ? 100 : 0;

                      return (
                        <div key={item.id ?? item.sku ?? item.name} style={{ padding: 14, borderRadius: 16, border: `1px solid ${tone}22`, background: quantity <= 0 ? "#fef2f2" : "#fffbeb" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 800 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{item.sourceCode ?? item.sku ?? "No code"} · {item.category ?? "Unclassified"}</div>
                            </div>
                            <div style={{ fontSize: "var(--fs-xs)", color: tone, fontWeight: 800, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.75)" }}>{status}</div>
                          </div>
                          <div style={{ height: 10, background: "rgba(15, 23, 42, 0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ width: `${fill}%`, height: "100%", background: quantity <= 0 ? "#dc2626" : "#f59e0b", borderRadius: 999 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                            <span>Current: {formatNumber(quantity)}</span>
                            <span>Minimum: {formatNumber(minThreshold)}</span>
                            <span>Check-outs: {formatNumber(Number(item.checkOutTotal ?? 0))}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Operational Snapshot</div>
              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8, fontWeight: 800 }}>Health Mix</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { label: "Healthy", value: summary.healthyItems, color: "#166534" },
                      { label: "Low Stock", value: summary.lowStockItems, color: "#b45309" },
                      { label: "Out of Stock", value: summary.outOfStockItems, color: "#991b1b" },
                    ].map((entry) => (
                      <div key={entry.label} style={{ display: "grid", gridTemplateColumns: "92px 1fr 44px", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.label}</div>
                        <div style={{ height: 10, background: "rgba(15, 23, 42, 0.08)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(4, percentage(entry.value, summary.totalItems || 1))}%`, height: "100%", background: entry.color, borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 800, textAlign: "right" }}>{entry.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8, fontWeight: 800 }}>Recommended Actions</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: "var(--color-text)", fontSize: "var(--fs-sm)", lineHeight: 1.55 }}>
                    <li>Replenish out-of-stock and low-stock items before they disrupt operations.</li>
                    <li>Review the highest check-out items for recurring consumption and supplier planning.</li>
                    <li>Validate minimum thresholds for fast-moving items to reduce emergency procurement.</li>
                    <li>Use this page as the monthly leadership report for stock health and demand pressure.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <SvgBarChart
              title="Category Mix"
              subtitle="Distribution of inventory by category using live item quantities."
              items={categoryBreakdown}
              valueKey="quantity"
              color="#0f766e"
              accent="#b45309"
            />

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Top Demand Items</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Check-Outs</th>
                  </tr>
                </thead>
                <tbody>
                  {topDemandItems.map((item) => (
                    <tr key={item.id ?? item.sku ?? item.name} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700 }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{item.sourceCode ?? item.sku ?? "No code"} · {item.category ?? "Unclassified"}</div>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontSize: "var(--fs-sm)", fontWeight: 800, color: "#92400e" }}>{formatNumber(Number(item.checkOutTotal ?? 0))}</td>
                    </tr>
                  ))}
                  {topDemandItems.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ padding: 16, fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No movement data is available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <SvgTrendChart points={monthlyTrends} label="Month-over-Month Check-Out Trend" color="#b45309" accent="#b45309" />
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Month-over-Month Check-In Trend</div>
              <div style={{ padding: 16 }}>
                <SvgTrendChart points={monthlyTrends.map((point) => ({ ...point, checkOut: point.checkIn }))} label="Month-over-Month Check-In Trend" color="#0f766e" accent="#0f766e" />
              </div>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <SvgTrendChart
              points={monthlyTrends.map((point) => ({ ...point, checkOut: point.stockRisk }))}
              label="Month-over-Month Stock Risk"
              color="#991b1b"
              accent="#991b1b"
            />

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Trend Interpretation</div>
              <div style={{ padding: 16, display: "grid", gap: 10, fontSize: "var(--fs-sm)", color: "var(--color-text)", lineHeight: 1.7 }}>
                <p>
                  Check-in and check-out trends are built from the movement ledger, so the chart reflects actual recorded activity instead of manually entered figures.
                </p>
                <p>
                  Stock risk is reconstructed month by month using the current inventory state and all ledger movements, which allows the system to estimate how many items were at or below threshold at each month end.
                </p>
                <p>
                  If check-out rises while risk also rises, it means usage pressure is outpacing replenishment. If check-in rises and risk falls, supply is recovering.
                </p>
              </div>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Monthly Movement Snapshot</div>
              <div style={{ padding: 16, display: "grid", gap: 10 }}>
                {monthlyTrends.map((point) => (
                  <div key={point.key} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--color-text)" }}>{point.label}</div>
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Risk: {formatNumber(point.stockRisk)}</div>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 56px", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Check-In</div>
                        <div style={{ height: 10, background: "rgba(15, 23, 42, 0.08)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(4, percentage(point.checkIn, maxCheckIn))}%`, height: "100%", background: "#0f766e", borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", textAlign: "right", color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(point.checkIn)}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 56px", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Check-Out</div>
                        <div style={{ height: 10, background: "rgba(15, 23, 42, 0.08)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(4, percentage(point.checkOut, maxCheckOut))}%`, height: "100%", background: "#b45309", borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", textAlign: "right", color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(point.checkOut)}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 56px", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Risk</div>
                        <div style={{ height: 10, background: "rgba(15, 23, 42, 0.08)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(4, percentage(point.stockRisk, maxRisk))}%`, height: "100%", background: "#991b1b", borderRadius: 999 }} />
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", textAlign: "right", color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(point.stockRisk)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Leadership Talking Points</div>
              <div style={{ padding: 16, display: "grid", gap: 10, fontSize: "var(--fs-sm)", color: "var(--color-text)", lineHeight: 1.7 }}>
                <p>
                  Inventory performance is currently stable overall, but the risk register shows where operations will feel pressure first. The most urgent items are the ones at or below minimum threshold, because they are the most likely to interrupt service continuity.
                </p>
                <p>
                  Demand is concentrated in a smaller set of frequently issued items. That means procurement planning should prioritize the top-used items and not just the overall stock total.
                </p>
                <p>
                  For a higher-body presentation, the key message is simple: protect the critical items, replenish low stock before it becomes a shortage, and monitor recurring check-out patterns to align purchasing with actual usage.
                </p>
              </div>
            </div>
          </div>

          <div className="report-section" style={sectionStyle}>
            <div style={sectionHeaderStyle}>Top Risks To Escalate</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {criticalItems.slice(0, 5).map((item) => {
                const quantity = Number(item.quantity ?? 0);
                const minThreshold = Number(item.minThreshold ?? 0);
                const riskLevel = quantity <= 0 ? "Immediate" : quantity <= Math.max(1, Math.floor(minThreshold / 2)) ? "High" : "Medium";
                return (
                  <div key={item.id ?? item.sku ?? item.name} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--color-text)" }}>{item.name ?? item.sku ?? "Unknown item"}</div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>{item.sourceCode ?? item.sku ?? "No code"} · Threshold {formatNumber(minThreshold)}</div>
                      </div>
                      <div style={{ fontSize: "var(--fs-xs)", color: riskLevel === "Immediate" ? "#991b1b" : riskLevel === "High" ? "#b45309" : "#92400e", fontWeight: 800 }}>{riskLevel} risk</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Monthly Snapshot</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>
                <span>Healthy share: {formatPercent(healthShare.healthy)}</span>
                <span>Low-stock share: {formatPercent(healthShare.lowStock)}</span>
                <span>Out-of-stock share: {formatPercent(healthShare.outOfStock)}</span>
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", lineHeight: 1.7 }}>
                The charts on this page are generated from the full inventory dataset and movement ledger every time the page loads. If stock changes, the summary, risk register, and trend lines change with it.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
