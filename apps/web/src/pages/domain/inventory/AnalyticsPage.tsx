import React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import logoAhri from "../../../assets/logo_ahri.png";

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
  expiringSoonItems?: (AnalyticsItem & { expiryDate?: string })[];
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
    <div style={{ padding: 16, borderRadius: 16, border: "1px solid var(--color-divider)", background: "var(--color-surface)" }}>
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
    <div style={{ padding: 16, borderRadius: 16, border: "1px solid var(--color-divider)", background: "var(--color-surface)" }}>
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
  const [isPrinting, setIsPrinting] = React.useState(false);
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
  const expiringSoonItems = data?.expiringSoonItems ?? [];
  const monthlyTrends = data?.monthlyTrends ?? [];
  const usageRecords = data?.usageRecords ?? [];

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

  const topProjects = React.useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of usageRecords) {
      if (row.projectFor) {
        grouped.set(row.projectFor, (grouped.get(row.projectFor) ?? 0) + Number(row.quantity ?? 0));
      }
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [usageRecords]);

  const topUsers = React.useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of usageRecords) {
      if (row.requestedBy) {
        grouped.set(row.requestedBy, (grouped.get(row.requestedBy) ?? 0) + Number(row.quantity ?? 0));
      }
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [usageRecords]);

  const printReport = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  const pageChromeStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 20,
    border: "1px solid rgba(1, 105, 111, 0.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,248,245,0.9))",
    boxShadow: "0 18px 45px rgba(16, 24, 40, 0.08)",
    backdropFilter: "blur(10px)",
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(1, 105, 111, 0.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,248,245,0.9))",
    boxShadow: "0 18px 45px rgba(16, 24, 40, 0.08)",
    backdropFilter: "blur(10px)",
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

  const cardStyle = (tone: string): React.CSSProperties => ({
    padding: "16px 12px",
    borderRadius: 16,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(135deg, ${tone}08, rgba(255,255,255,0.98))`,
    boxShadow: "0 10px 20px rgba(16, 24, 40, 0.03)",
    backdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <style>{`
        @media print {
          #root { display: none !important; }
          body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          #inventory-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            color: #0f172a !important;
          }
          
          #inventory-print-area .letterhead {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #01696f !important;
            padding-bottom: 12px !important;
            margin-bottom: 24px !important;
          }
          #inventory-print-area .letterhead-logo {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #01696f !important;
            text-transform: uppercase !important;
          }
          #inventory-print-area .letterhead-dept {
            font-size: 10px !important;
            font-weight: 700 !important;
            text-align: right !important;
            color: #0f766e !important;
            text-transform: uppercase !important;
          }
          #inventory-print-area .doc-title-container {
            text-align: center !important;
            margin-bottom: 24px !important;
          }
          #inventory-print-area .doc-title {
            font-size: 18px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            margin: 0 !important;
            color: #01696f !important;
          }
          #inventory-print-area .doc-subtitle {
            font-size: 12px !important;
            color: #475569 !important;
            margin: 4px 0 0 !important;
          }
          #inventory-print-area .metadata-summary {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            margin-bottom: 30px !important;
          }
          #inventory-print-area .metadata-item {
            display: flex !important;
            flex-direction: column !important;
          }
          #inventory-print-area .metadata-label {
            font-size: 9px !important;
            font-weight: 700 !important;
            color: #64748b !important;
            text-transform: uppercase !important;
          }
          #inventory-print-area .metadata-value {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #0f172a !important;
          }
          #inventory-print-area .details-vertical {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
          }
          #inventory-print-area .section-container {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
          #inventory-print-area .section-title {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #01696f !important;
            text-transform: uppercase !important;
            border-bottom: 1.5px solid #01696f !important;
            padding-bottom: 4px !important;
            margin-bottom: 12px !important;
          }
          #inventory-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 8px !important;
          }
          #inventory-print-area th {
            background: #f1f5f9 !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            padding: 6px 10px !important;
            border: 1px solid #e2e8f0 !important;
          }
          #inventory-print-area td {
            padding: 6px 10px !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 11px !important;
            color: #0f172a !important;
          }
          #inventory-print-area .signature-section {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 60px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #inventory-print-area .signature-box {
            width: 42% !important;
            border-top: 1px solid #94a3b8 !important;
            padding-top: 8px !important;
            text-align: center !important;
            font-size: 11px !important;
            color: #475569 !important;
          }
          @page {
            size: portrait;
            margin: 0.6in 0.8in 0.8in 0.8in;
          }
        }
        #inventory-print-area { display: none; }
        @media (max-width: 992px) {
          .grid-asym {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="report-card" style={pageChromeStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.12em", color: "#0f766e", fontWeight: 800, marginBottom: 8 }}>
              Executive Inventory Analytics
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", lineHeight: 1.05, marginBottom: 10 }}>
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

          <div style={{ minWidth: 260, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.74)", border: "1px solid rgba(1, 105, 111, 0.14)" }}>
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
            <div className="report-card" style={cardStyle("#01696f")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">📦</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(summary.totalItems)}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Tracked Items</div>
            </div>

            <div className="report-card" style={cardStyle("#0f766e")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">🧪</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(summary.totalQuantity)}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Units On Hand</div>
            </div>

            <div className="report-card" style={cardStyle("#0d6f89")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">⬆️</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(summary.totalCheckIn)}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Check-In Volume</div>
            </div>

            <div className="report-card" style={cardStyle("#b45309")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">⬇️</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(summary.totalCheckOut)}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>Check-Out Volume</div>
            </div>

            <div className="report-card" style={cardStyle("#92400e")}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">⚠️</span>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-text)", fontWeight: 800 }}>{formatNumber(summary.atRiskItems)}</div>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>At-Risk Items</div>
            </div>
          </div>

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Top Projects by Consumption</div>
              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {topProjects.length === 0 ? (
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No data available.</div>
                ) : (
                  topProjects.map(([name, qty]) => {
                    const maxQty = Math.max(...topProjects.map(([_, q]) => q), 1);
                    const fillPercent = Math.max(6, Math.round((qty / maxQty) * 100));
                    return (
                      <div key={name} style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
                          <span>{name}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{formatNumber(qty)} units</span>
                        </div>
                        <div style={{ height: 8, background: "rgba(15, 23, 42, 0.06)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${fillPercent}%`, height: "100%", background: "#0f766e", borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Top Staff Members by Consumption</div>
              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {topUsers.length === 0 ? (
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No data available.</div>
                ) : (
                  topUsers.map(([name, qty]) => {
                    const maxQty = Math.max(...topUsers.map(([_, q]) => q), 1);
                    const fillPercent = Math.max(6, Math.round((qty / maxQty) * 100));
                    return (
                      <div key={name} style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
                          <span>{name}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{formatNumber(qty)} units</span>
                        </div>
                        <div style={{ height: 8, background: "rgba(15, 23, 42, 0.06)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${fillPercent}%`, height: "100%", background: "#b45309", borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="report-section grid-asym" style={{ display: "grid", gap: 12, alignItems: "start" }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Risk Register</div>
              {criticalItems.length === 0 ? (
                <div style={{ padding: 16, fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No low-stock or out-of-stock items were found.</div>
              ) : (
                <div style={{ maxHeight: 310, overflowY: "auto" }}>
                  {criticalItems.map((item, idx) => {
                     const quantity = Number(item.quantity ?? 0);
                     const minThreshold = Number(item.minThreshold ?? 0);
                     const status = quantity <= 0 ? "Out of stock" : "Low stock";
                     const tone = quantity <= 0 ? "#ef4444" : "#f59e0b";
                     const bg = quantity <= 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)";

                     return (
                       <div key={item.id ?? item.sku ?? item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: idx < criticalItems.length - 1 ? "1px solid var(--color-divider)" : "none", gap: 16 }}>
                         <div style={{ flex: 1, minWidth: 0 }}>
                           <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.name ?? item.sku}>
                             {item.name ?? item.sku}
                           </div>
                           <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                             {item.sourceCode ?? item.sku ?? "No code"} · {item.category ?? "Unclassified"}
                           </div>
                         </div>
                         <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                           <span style={{ fontSize: "var(--fs-xxs)", fontWeight: 800, color: tone, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: bg }}>
                             {status}
                           </span>
                           <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 600 }}>
                             Current: {formatNumber(quantity)} / Min: {formatNumber(minThreshold)}
                           </span>
                           <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                             {formatNumber(Number(item.checkOutTotal ?? 0))} outs
                           </span>
                         </div>
                       </div>
                     );
                  })}
                </div>
              )}
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

          <div className="report-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Top Risks To Escalate</div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {criticalItems.length === 0 ? (
                  <div style={{ padding: 16, fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No escalation risks found.</div>
                ) : (
                  criticalItems.slice(0, 5).map((item, idx) => {
                    const quantity = Number(item.quantity ?? 0);
                    const minThreshold = Number(item.minThreshold ?? 0);
                    const riskLevel = quantity <= 0 ? "Immediate" : quantity <= Math.max(1, Math.floor(minThreshold / 2)) ? "High" : "Medium";
                    const tone = riskLevel === "Immediate" ? "#ef4444" : riskLevel === "High" ? "#f59e0b" : "#3b82f6";
                    const bg = riskLevel === "Immediate" ? "rgba(239, 68, 68, 0.08)" : riskLevel === "High" ? "rgba(245, 158, 11, 0.08)" : "rgba(59, 130, 246, 0.08)";

                    return (
                      <div
                        key={item.id ?? item.sku ?? item.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: idx < Math.min(5, criticalItems.length) - 1 ? "1px solid var(--color-divider)" : "none",
                          gap: 16
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.name ?? item.sku}>
                            {item.name ?? item.sku}
                          </div>
                          <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            {item.sourceCode ?? item.sku ?? "No code"} · Threshold {formatNumber(minThreshold)}
                          </div>
                        </div>
                        <span style={{ fontSize: "var(--fs-xxs)", fontWeight: 800, color: tone, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: bg, flexShrink: 0 }}>
                          {riskLevel} Risk
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Expiring Reagents (30 Days)</div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {expiringSoonItems.length === 0 ? (
                  <div style={{ padding: 16, fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No expiring reagents found.</div>
                ) : (
                  expiringSoonItems.slice(0, 5).map((item, idx) => {
                    const expDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                    return (
                      <div
                        key={item.id ?? item.sku ?? item.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: idx < Math.min(5, expiringSoonItems.length) - 1 ? "1px solid var(--color-divider)" : "none",
                          gap: 16
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={item.name ?? item.sku}>
                            {item.name ?? item.sku}
                          </div>
                          <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                            SKU: {item.sku} · Qty: {item.quantity}
                          </div>
                        </div>
                        <span style={{ fontSize: "var(--fs-xxs)", fontWeight: 800, color: "#ea580c", textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: "rgba(234, 88, 12, 0.08)", flexShrink: 0 }}>
                          {expDate}
                        </span>
                      </div>
                    );
                  })
                )}
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
        </div>
      )}

      {isPrinting && summary && createPortal(
        <div id="inventory-print-area">
          {/* Institutional Letterhead */}
          <div className="letterhead">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={logoAhri} style={{ height: "45px" }} alt="AHRI Logo" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="letterhead-logo">AHRI</span>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Armauer Hansen Research Institute</span>
              </div>
            </div>
            <div className="letterhead-dept">
              Department of Lab Operations & Supply Chain
            </div>
          </div>

          <div className="doc-title-container">
            <h1 className="doc-title">Executive Inventory & Supply Chain Analytics Report</h1>
            <p className="doc-subtitle">Live Operational Summary & Risk Assessment</p>
          </div>

          {/* Document Metadata Summary Table */}
          <div className="metadata-summary">
            <div className="metadata-item">
              <span className="metadata-label">Report Type</span>
              <span className="metadata-value">Inventory Analytics</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Generated By</span>
              <span className="metadata-value">ROMS Inventory Portal</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Security Class</span>
              <span className="metadata-value">Confidential / Internal</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Report Date</span>
              <span className="metadata-value">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>

          {/* Details Sections */}
          <div className="details-vertical">
            
            {/* Section 1: Executive Brief */}
            <div className="section-container">
              <div className="section-title">Section 1: Leadership Executive Summary</div>
              <p style={{ fontSize: "12px", lineHeight: 1.6, margin: "6px 0", color: "#334155" }}>
                {executiveSummary}
              </p>
            </div>

            {/* Section 2: Key Operational Metrics */}
            <div className="section-container">
              <div className="section-title">Section 2: Key Performance Indicators</div>
              <table>
                <thead>
                  <tr>
                    <th>Tracked Items</th>
                    <th>Units On Hand</th>
                    <th>Check-In Volume</th>
                    <th>Check-Out Volume</th>
                    <th>At-Risk Items</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{formatNumber(summary.totalItems)}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{formatNumber(summary.totalQuantity)}</td>
                    <td style={{ textAlign: "center" }}>{formatNumber(summary.totalCheckIn)}</td>
                    <td style={{ textAlign: "center" }}>{formatNumber(summary.totalCheckOut)}</td>
                    <td style={{ textAlign: "center", color: "#dc2626", fontWeight: "bold" }}>{formatNumber(summary.atRiskItems)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Critical At-Risk Items Register */}
            <div className="section-container">
              <div className="section-title">Section 3: At-Risk Stock Items (Low Stock & Out of Stock)</div>
              {criticalItems.length === 0 ? (
                <p style={{ fontSize: "11px", fontStyle: "italic", color: "#64748b" }}>No stock items are currently at risk.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>Item Name</th>
                      <th>SKU / Code</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Current Quantity</th>
                      <th>Min Threshold</th>
                      <th>Check-Outs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalItems.map((item) => {
                      const qty = Number(item.quantity ?? 0);
                      const min = Number(item.minThreshold ?? 0);
                      const status = qty <= 0 ? "Out of Stock" : "Low Stock";
                      const color = qty <= 0 ? "#dc2626" : "#d97706";
                      return (
                        <tr key={item.id ?? item.sku ?? item.name}>
                          <td style={{ fontWeight: 600 }}>{item.name ?? item.sku}</td>
                          <td>{item.sourceCode ?? item.sku ?? "—"}</td>
                          <td>{item.category ?? "Unclassified"}</td>
                          <td style={{ color, fontWeight: "bold" }}>{status}</td>
                          <td style={{ textAlign: "right" }}>{formatNumber(qty)}</td>
                          <td style={{ textAlign: "right" }}>{formatNumber(min)}</td>
                          <td style={{ textAlign: "right" }}>{formatNumber(Number(item.checkOutTotal ?? 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 3.5: Expiring Soon Reagents (Within 30 Days) */}
            <div className="section-container">
              <div className="section-title">Section 3.5: Expiring Soon Reagents (Within 30 Days)</div>
              {!expiringSoonItems || expiringSoonItems.length === 0 ? (
                <p style={{ fontSize: "11px", fontStyle: "italic", color: "#64748b" }}>No reagents are currently expiring within 30 days.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>Item Name</th>
                      <th>SKU / Code</th>
                      <th>Category</th>
                      <th>Expiry Date</th>
                      <th>Current Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringSoonItems.map((item) => {
                      const expDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
                      return (
                        <tr key={item.id ?? item.sku ?? item.name}>
                          <td style={{ fontWeight: 600 }}>{item.name ?? item.sku}</td>
                          <td>{item.sourceCode ?? item.sku ?? "—"}</td>
                          <td>{item.category ?? "Unclassified"}</td>
                          <td style={{ color: "#ea580c", fontWeight: "bold" }}>{expDate}</td>
                          <td style={{ textAlign: "right" }}>{formatNumber(Number(item.quantity ?? 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 4: Demand Distribution & Top Consumption */}
            <div className="section-container" style={{ breakInside: "avoid" }}>
              <div className="section-title">Section 4: Top Projects & Staff Consumption</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <h4 style={{ margin: "4px 0 8px 0", fontSize: "11px", color: "#475569" }}>Top Projects by Unit Consumption</h4>
                  {topProjects.length === 0 ? (
                    <p style={{ fontSize: "11px", fontStyle: "italic" }}>No data</p>
                  ) : (
                    <table style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th style={{ width: "100px" }}>Units Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProjects.map(([name, qty]) => (
                          <tr key={name}>
                            <td style={{ fontWeight: 600 }}>{name}</td>
                            <td style={{ textAlign: "right" }}>{formatNumber(qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: "4px 0 8px 0", fontSize: "11px", color: "#475569" }}>Top Staff Members by Unit Consumption</h4>
                  {topUsers.length === 0 ? (
                    <p style={{ fontSize: "11px", fontStyle: "italic" }}>No data</p>
                  ) : (
                    <table style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th style={{ width: "100px" }}>Units Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topUsers.map(([name, qty]) => (
                          <tr key={name}>
                            <td style={{ fontWeight: 600 }}>{name}</td>
                            <td style={{ textAlign: "right" }}>{formatNumber(qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Category Mix & Breakdown */}
            <div className="section-container" style={{ breakInside: "avoid" }}>
              <div className="section-title">Section 5: Category Mix & Stock Levels</div>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ width: "120px" }}>Item Count</th>
                    <th style={{ width: "120px" }}>Units On Hand</th>
                    <th style={{ width: "120px" }}>Check-Outs</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((row) => (
                    <tr key={row.category}>
                      <td style={{ fontWeight: 600 }}>{row.category || "Unclassified"}</td>
                      <td style={{ textAlign: "right" }}>{formatNumber(row.count)}</td>
                      <td style={{ textAlign: "right" }}>{formatNumber(row.quantity)}</td>
                      <td style={{ textAlign: "right" }}>{formatNumber(row.checkOut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 6: Historical Trends (Last 6 Months) */}
            <div className="section-container" style={{ breakInside: "avoid" }}>
              <div className="section-title">Section 6: Monthly Movement & Risk Trends</div>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ width: "120px" }}>Check-In Qty</th>
                    <th style={{ width: "120px" }}>Check-Out Qty</th>
                    <th style={{ width: "120px" }}>At-Risk Items Count</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrends.map((point) => (
                    <tr key={point.key}>
                      <td style={{ fontWeight: 600 }}>{point.label}</td>
                      <td style={{ textAlign: "right" }}>{formatNumber(point.checkIn)}</td>
                      <td style={{ textAlign: "right" }}>{formatNumber(point.checkOut)}</td>
                      <td style={{ textAlign: "right", color: point.stockRisk > 0 ? "#dc2626" : "inherit" }}>
                        {formatNumber(point.stockRisk)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Formal Signatures Section */}
          <div className="signature-section">
            <div className="signature-box">
              <strong>Prepared By: Lab Inventory Lead</strong>
              <div style={{ marginTop: "40px", borderTop: "1px dashed #cbd5e1", paddingTop: "4px" }}>
                Signature / Date
              </div>
            </div>
            <div className="signature-box">
              <strong>Approved By: Director of Lab Operations</strong>
              <div style={{ marginTop: "40px", borderTop: "1px dashed #cbd5e1", paddingTop: "4px" }}>
                Signature / Date
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
