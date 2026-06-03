import React, { useMemo } from "react";

interface SOPItem {
  id: string;
  code: string;
  title: string;
  sopSection: string;
  sopSubSection: string;
  version: string;
  status: string;
  author: string;
  lastUpdated: string;
  details?: Record<string, any>;
}

interface QMSDashboardViewProps {
  sops: SOPItem[];
  onTabChange: (tab: "dashboard" | "author" | "reviewer" | "viewer", statusFilter?: string | null) => void;
}

export default function QMSDashboardView({ sops, onTabChange }: QMSDashboardViewProps) {
  // Compute metrics dynamically from sops array
  const metrics = useMemo(() => {
    const total = sops.length;
    const drafts = sops.filter(s => s.status.toUpperCase() === "DRAFT").length;
    const submitted = sops.filter(s => s.status.toUpperCase() === "UNDER REVIEW" || s.status.toUpperCase() === "REVIEW" || s.status.toUpperCase() === "SUBMITTED").length;
    const approved = sops.filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE / APPROVED" || s.status.toUpperCase() === "ACTIVE").length;
    const returned = sops.filter(s => s.status.toUpperCase() === "RETURNED" || s.status.toUpperCase() === "NEEDS REVISION" || s.status.toUpperCase() === "REJECTED").length;

    return { total, drafts, submitted, approved, returned };
  }, [sops]);

  // Compute category distribution
  const categoriesData = useMemo(() => {
    const counts: Record<string, number> = {};
    sops.forEach(s => {
      const cat = s.sopSection || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [sops]);

  // Donut chart calculations
  const donutSegments = useMemo(() => {
    const { total, approved, submitted, drafts, returned } = metrics;
    if (total === 0) return [];
    
    const data = [
      { label: "Approved", value: approved, color: "#10b981" },
      { label: "Under Review", value: submitted, color: "#3b82f6" },
      { label: "Draft", value: drafts, color: "#f59e0b" },
      { label: "Returned", value: returned, color: "#ef4444" }
    ].filter(d => d.value > 0);

    let accumulatedAngle = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    return data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += (item.value / total) * circumference;

      return {
        ...item,
        percentage: percentage.toFixed(1),
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [metrics]);

  return (
    <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* ── OVERALL SOP OVERVIEW ── */}
      <div>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", margin: "0 0 14px 0", letterSpacing: "-0.01em" }}>
          Overall SOP Overview
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {/* Card: Total */}
          <div
            onClick={() => onTabChange("author", "All")}
            style={cardStyle}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <div style={{ ...iconWrapperStyle, background: "#eff6ff", color: "#1d4ed8" }}>📄</div>
            <div style={cardContentStyle}>
              <span style={cardLabelStyle}>TOTAL SOPs</span>
              <span style={cardValueStyle}>{metrics.total}</span>
              <span style={cardSubtitleStyle}>All time</span>
              <span style={{ ...cardLinkStyle, color: "#1d4ed8" }}>View all SOPs →</span>
            </div>
          </div>

          {/* Card: Drafts */}
          <div
            onClick={() => onTabChange("author", "DRAFT")}
            style={cardStyle}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <div style={{ ...iconWrapperStyle, background: "#fffbeb", color: "#b45309" }}>⏳</div>
            <div style={cardContentStyle}>
              <span style={cardLabelStyle}>DRAFTS</span>
              <span style={cardValueStyle}>{metrics.drafts}</span>
              <span style={cardSubtitleStyle}>In progress</span>
              <span style={{ ...cardLinkStyle, color: "#b45309" }}>View drafts →</span>
            </div>
          </div>

          {/* Card: Submitted */}
          <div
            onClick={() => onTabChange("reviewer")}
            style={cardStyle}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <div style={{ ...iconWrapperStyle, background: "#f0fdf4", color: "#15803d" }}>✈️</div>
            <div style={cardContentStyle}>
              <span style={cardLabelStyle}>SUBMITTED</span>
              <span style={cardValueStyle}>{metrics.submitted}</span>
              <span style={cardSubtitleStyle}>Awaiting review</span>
              <span style={{ ...cardLinkStyle, color: "#15803d" }}>View submissions →</span>
            </div>
          </div>

          {/* Card: Approved */}
          <div
            onClick={() => onTabChange("viewer")}
            style={cardStyle}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <div style={{ ...iconWrapperStyle, background: "#ecfdf5", color: "#065f46" }}>🛡️</div>
            <div style={cardContentStyle}>
              <span style={cardLabelStyle}>APPROVED</span>
              <span style={cardValueStyle}>{metrics.approved}</span>
              <span style={cardSubtitleStyle}>Published SOPs</span>
              <span style={{ ...cardLinkStyle, color: "#065f46" }}>View approved →</span>
            </div>
          </div>

          {/* Card: Returned */}
          <div
            onClick={() => onTabChange("author", "RETURNED")}
            style={cardStyle}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <div style={{ ...iconWrapperStyle, background: "#fef2f2", color: "#991b1b" }}>↩️</div>
            <div style={cardContentStyle}>
              <span style={cardLabelStyle}>RETURNED</span>
              <span style={cardValueStyle}>{metrics.returned}</span>
              <span style={cardSubtitleStyle}>Need revision</span>
              <span style={{ ...cardLinkStyle, color: "#991b1b" }}>View returned →</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── VISUAL REPORTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: 16 }}>
        
        {/* 1. SOPs by Status */}
        <div style={reportCardStyle}>
          <h3 style={reportHeaderStyle}>SOPs by Status</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: "100%" }}>
            
            {/* Donut graphic */}
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-border)" strokeWidth="12" />
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                ))}
              </svg>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)" }}>{metrics.total}</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 }}>Total</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
              {donutSegments.length === 0 ? (
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>No SOP data yet</div>
              ) : (
                donutSegments.map((seg, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                      <span style={{ color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--color-text)", marginLeft: 6, flexShrink: 0 }}>
                      {seg.value} <span style={{ fontSize: "10px", color: "var(--color-text-faint)", fontWeight: 400 }}>({seg.percentage}%)</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
            <span onClick={() => onTabChange("author")} style={reportLinkStyle}>View full report →</span>
          </div>
        </div>

        {/* 2. SOPs by Category */}
        <div style={reportCardStyle}>
          <h3 style={reportHeaderStyle}>SOPs by Category</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
            {categoriesData.length === 0 ? (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>No categories parsed yet</div>
            ) : (
              categoriesData.map((cat, i) => {
                const maxCount = Math.max(...categoriesData.map(c => c.count)) || 1;
                const percentage = (cat.count / maxCount) * 100;
                
                // Color array
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                const color = colors[i % colors.length];

                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                      <span style={{ color: "var(--color-text)", fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                        {cat.name}
                      </span>
                      <span style={{ fontWeight: 650, color: "var(--color-text-muted)" }}>{cat.count}</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "var(--color-surface)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
            <span onClick={() => onTabChange("author")} style={reportLinkStyle}>View full report →</span>
          </div>
        </div>

        {/* 3. Monthly Trend */}
        <div style={reportCardStyle}>
          <h3 style={reportHeaderStyle}>Monthly Trend</h3>
          
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Submitted</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
              <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Approved</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Returned</span>
            </div>
          </div>

          {/* SVG line chart */}
          <div style={{ flex: 1, minHeight: 110, position: "relative", width: "100%" }}>
            <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="200" y2="20" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="0" y1="50" x2="200" y2="50" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="0" y1="80" x2="200" y2="80" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
              
              {/* Trend Lines (Mock values for Jan-Jun) */}
              {/* Submitted: Jan (10) -> Feb (14) -> Mar (11) -> Apr (15) -> May (13) -> Jun (18) */}
              <path
                d="M 10 70 L 48 50 L 86 65 L 124 45 L 162 55 L 200 30"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Approved: Jan (6) -> Feb (9) -> Mar (7) -> Apr (11) -> May (9) -> Jun (13) */}
              <path
                d="M 10 82 L 48 70 L 86 78 L 124 60 L 162 70 L 200 52"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Returned: Jan (2) -> Feb (4) -> Mar (3) -> Apr (4) -> May (2) -> Jun (5) */}
              <path
                d="M 10 94 L 48 86 L 86 90 L 124 86 L 162 94 L 200 82"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              
              {/* Dots on paths */}
              {[
                { x: 10, ys: 70, ya: 82, yr: 94 },
                { x: 48, ys: 50, ya: 70, yr: 86 },
                { x: 86, ys: 65, ya: 78, yr: 90 },
                { x: 124, ys: 45, ya: 60, yr: 86 },
                { x: 162, ys: 55, ya: 70, yr: 94 },
                { x: 200, ys: 30, ya: 52, yr: 82 }
              ].map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.ys} r="2.5" fill="#10b981" />
                  <circle cx={pt.x} cy={pt.ya} r="2.5" fill="#3b82f6" />
                  <circle cx={pt.x} cy={pt.yr} r="2" fill="#ef4444" />
                </g>
              ))}
            </svg>
            
            {/* Axis labels */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--color-text-muted)", marginTop: 6, fontWeight: 600 }}>
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
            <span onClick={() => onTabChange("author")} style={reportLinkStyle}>View analytics →</span>
          </div>
        </div>

      </div>

    </div>
  );
}

// ── Shared Inline Styles ──
const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "16px",
  display: "flex",
  gap: "12px",
  cursor: "pointer",
  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: "var(--shadow-sm)",
};

const cardHover = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transform = "translateY(-2px)";
  e.currentTarget.style.boxShadow = "var(--shadow-md)";
  e.currentTarget.style.borderColor = "var(--color-primary)";
};

const cardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transform = "translateY(0)";
  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
  e.currentTarget.style.borderColor = "var(--color-border)";
};

const iconWrapperStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0
};

const cardContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const cardValueStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "var(--color-text)",
  lineHeight: "1.2",
  margin: "2px 0"
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--color-text-faint)",
  marginBottom: "10px",
  fontWeight: 500
};

const cardLinkStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  marginTop: "auto"
};

const reportCardStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  height: "260px",
  boxShadow: "var(--shadow-sm)"
};

const reportHeaderStyle: React.CSSProperties = {
  fontSize: "13.5px",
  fontWeight: 700,
  color: "var(--color-text)",
  margin: 0
};

const reportLinkStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 650,
  color: "var(--color-primary)",
  cursor: "pointer"
};
