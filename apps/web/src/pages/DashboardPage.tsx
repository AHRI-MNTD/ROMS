import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDomains } from "../api/catalog";
import { Link } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";

const KPICard: React.FC<{ label: string; value: string | number; emoji: string; sub?: string }> = ({
  label,
  value,
  emoji,
  sub,
}) => (
  <div
    style={{
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius)",
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    <div style={{ fontSize: "1.2rem" }}>{emoji}</div>
    <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
      {value}
    </div>
    <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--color-text)" }}>{label}</div>
    {sub && <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{sub}</div>}
  </div>
);

export default function DashboardPage() {
  const { data: domains } = useQuery({
    queryKey: ["catalog/domains"],
    queryFn: fetchDomains,
    initialData: DOMAIN_CATALOG.map((d) => ({
      id: d.id,
      slug: d.slug,
      emoji: d.emoji,
      name: d.name,
      subfunctionCount: d.subfunctions.length,
      taskCount: d.subfunctions.reduce((a, sf) => a + sf.tasks.length, 0),
    })),
  });

  const totalTasks = domains.reduce((a, d) => a + d.taskCount, 0);
  const totalSubfunctions = domains.reduce((a, d) => a + d.subfunctionCount, 0);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", marginBottom: 4 }}>
          Research Operations Dashboard
        </h1>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
          A unified overview of all 10 ROMS domains, 50 sub-functions, and 250 operational tasks.
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <KPICard emoji="🏗️" label="Domains" value={domains.length} sub="Research operation areas" />
        <KPICard emoji="📋" label="Sub-functions" value={totalSubfunctions} sub="5 per domain" />
        <KPICard emoji="✅" label="Operational Tasks" value={totalTasks} sub="5 per sub-function" />
        <KPICard emoji="🧱" label="Containers" value={8} sub="C2 architecture" />
        <KPICard emoji="⚙️" label="Components" value={20} sub="C3 drill-down" />
        <KPICard emoji="🔗" label="Integrations" value={8} sub="External systems" />
      </div>

      {/* Domain grid */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: 12 }}>
          Domain Overview
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {domains.map((d) => (
            <Link
              key={d.slug}
              to={`/domains/${d.slug}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  transition: "box-shadow 0.14s, transform 0.12s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                }}
              >
                <span
                  style={{
                    fontSize: "1.2rem",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--color-primary-soft)",
                    borderRadius: "var(--radius-sm)",
                    flexShrink: 0,
                  }}
                >
                  {d.emoji}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--fs-md)", fontWeight: 600, color: "var(--color-text)", marginBottom: 3 }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    {d.subfunctionCount} sub-functions · {d.taskCount} tasks
                  </div>
                </div>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <Link
          to="/architecture"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          🏗️ C4 Architecture Explorer
        </Link>
        <Link
          to="/operations"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          📋 Domain Workspace
        </Link>
      </div>
    </div>
  );
}
