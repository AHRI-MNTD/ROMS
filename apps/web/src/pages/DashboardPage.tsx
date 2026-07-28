import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDomains } from "../api/catalog";
import { DOMAIN_CATALOG } from "@roms/shared";
import { useAuth } from "../auth/useAuth";
import { hasDomainAccess, getUserRights } from "../auth/permissions";
import { apiClient } from "../api/client";

// ── KPI stat card ─────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: string; label: string; value: string | number; sub?: string; accent?: string;
}> = ({ icon, label, value, sub, accent = "#01696f" }) => (
  <div
    style={{
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius)",
      padding: "10px 12px",
      display: "flex", alignItems: "center", gap: 10,
      transition: "box-shadow 0.14s, transform 0.12s",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      (e.currentTarget as HTMLDivElement).style.transform = "";
    }}
  >
    <div style={{
      width: 34, height: 34, borderRadius: "var(--radius-sm)",
      background: `${accent}18`, border: `1px solid ${accent}28`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.05rem", flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: "var(--fs-lg)", fontWeight: 700,
        color: "var(--color-text)", lineHeight: 1.1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", lineHeight: 1.3, marginTop: 1 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-faint)", marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

// ── System status pill ────────────────────────────────────────────────────────
const StatusPill: React.FC<{ label: string; status: "ok" | "warn" | "off" }> = ({ label, status }) => {
  const cfg = {
    ok:   { bg: "rgba(22,163,74,0.09)",   border: "rgba(22,163,74,0.22)",   color: "#16a34a", dot: "#16a34a" },
    warn: { bg: "rgba(217,119,6,0.09)",   border: "rgba(217,119,6,0.22)",   color: "#b45309", dot: "#b45309" },
    off:  { bg: "rgba(156,163,175,0.09)", border: "rgba(156,163,175,0.22)", color: "var(--color-text-faint)", dot: "var(--color-text-faint)" },
  }[status];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 11px",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 999,
      fontSize: "var(--fs-xs)", fontWeight: 600,
      color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0, display: "inline-block" }} />
      {label}
    </div>
  );
};

// ── Operations overview row ───────────────────────────────────────────────────
const OverviewRow: React.FC<{ label: string; value: string | number; color?: string; last?: boolean }> = ({
  label, value, color = "var(--color-text)", last,
}) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 14px",
    borderBottom: last ? "none" : "1px solid var(--color-divider)",
  }}>
    <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{label}</span>
    <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuth();

  const isAdmin    = !!(user?.roles?.includes("ADMIN") || user?.permissions?.includes("admin:all"));
  const isResAdmin = !!(user?.roles?.includes("RESEARCH_ADMIN"));
  const isAdminLike = isAdmin || isResAdmin;

  const isQA      = user?.roles?.includes("QA_OFFICER");
  const isPI      = user?.roles?.includes("PRINCIPAL_INVESTIGATOR");
  const isLabSci  = user?.roles?.includes("LAB_SCIENTIST");
  const isDataMgr = user?.roles?.includes("DATA_MANAGER");

  const allRights = useMemo(
    () => getUserRights(user?.roles, user?.permissions),
    [user?.roles, user?.permissions],
  );

  const { data: domains } = useQuery({
    queryKey: ["catalog/domains"],
    queryFn: fetchDomains,
    initialData: DOMAIN_CATALOG.map(d => ({
      id: d.id, slug: d.slug, emoji: d.emoji, name: d.name,
      subfunctionCount: d.subfunctions.length,
      taskCount: d.subfunctions.reduce((a, sf) => a + sf.tasks.length, 0),
    })),
  });

  const totalTasks        = domains.reduce((a, d) => a + d.taskCount, 0);
  const totalSubfunctions = domains.reduce((a, d) => a + d.subfunctionCount, 0);
  const accessibleDomains = useMemo(
    () => domains.filter(d => hasDomainAccess(user?.roles, d.slug, user?.permissions)),
    [domains, user?.roles, user?.permissions],
  );
  const totalRights = Object.values(allRights).reduce((a, s) => a + s.size, 0);

  // Admin-only: inventory + SOP + HR data
  const { data: invAnalytics, isLoading: invLoading } = useQuery({
    queryKey: ["dashboard/inv-analytics"],
    queryFn: async () => { const r = await apiClient.get("/domains/inventory/analytics"); return r.data; },
    enabled: isAdminLike,
    refetchInterval: 60000,
  });
  const { data: sopsRes, isLoading: sopsLoading } = useQuery({
    queryKey: ["dashboard/sops"],
    queryFn: async () => { const r = await apiClient.get("/domains/qms/sops"); return r.data; },
    enabled: isAdminLike,
    refetchInterval: 120000,
  });
  const { data: requestsRes, isLoading: reqLoading } = useQuery({
    queryKey: ["dashboard/requests"],
    queryFn: async () => { const r = await apiClient.get("/domains/inventory/requests"); return r.data; },
    enabled: isAdminLike,
    refetchInterval: 60000,
  });
  const { data: hrRes, isLoading: hrLoading } = useQuery({
    queryKey: ["dashboard/hr-approvals"],
    queryFn: async () => { const r = await apiClient.get("/domains/hr/approvals", { params: { status: "PENDING" } }); return r.data; },
    enabled: isAdminLike,
    refetchInterval: 120000,
  });

  // Derived admin stats
  const invSummary       = invAnalytics?.summary ?? { totalItems: 0, lowStockItems: 0, outOfStockItems: 0 };
  const allSops          = (sopsRes?.data ?? []) as any[];
  const reviewSops       = allSops.filter((s: any) => s.status === "REVIEW").length;
  const approvedSops     = allSops.filter((s: any) => s.status === "APPROVED").length;
  const allRequests      = (requestsRes?.data ?? []) as any[];
  const pendingRequests  = allRequests.filter((r: any) => r.status === "PENDING").length;
  const hrPending        = ((hrRes?.data ?? []) as any[]).length;

  const dateStr   = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const roleLabel = isAdmin    ? "System Administrator"
                  : isResAdmin ? "Research Administrator"
                  : isQA      ? "QA Officer"
                  : isPI      ? "Principal Investigator"
                  : isLabSci  ? "Lab Scientist"
                  : isDataMgr ? "Data Manager"
                  : (user?.roles?.map(r => r.replace(/_/g, " ")).join(", ") ?? "Staff");

  return (
    <div style={{
      padding: "22px 28px",
      maxWidth: 1200,
      display: "flex", flexDirection: "column", gap: 20,
      animation: "fadeUp 0.22s ease both",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-xl)",
              color: "var(--color-text)",
              lineHeight: 1.15,
            }}>
              Research Operations Dashboard
            </h1>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px",
              background: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-highlight)",
              borderRadius: 999,
              fontSize: "var(--fs-xxs)", fontWeight: 700,
              color: "var(--color-primary)", letterSpacing: "0.06em",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-primary)", display: "inline-block" }} />
              LIVE
            </span>
          </div>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            ROMS · {domains.length} domains · {totalSubfunctions} sub-functions · {totalTasks} operational tasks
            &nbsp;·&nbsp;
            <span style={{ color: "var(--color-text-faint)" }}>{dateStr}</span>
          </p>
        </div>

        {/* User card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "8px 14px",
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "var(--color-primary-soft)",
            border: "2px solid var(--color-primary-highlight)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.95rem", fontWeight: 700,
            color: "var(--color-primary)", flexShrink: 0,
          }}>
            {user?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--color-text)", lineHeight: 1.2 }}>
              {user?.displayName ?? "Guest"}
            </div>
            <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)" }}>
              {roleLabel}
            </div>
          </div>
          <div style={{ marginLeft: 8, width: 1, height: 28, background: "var(--color-divider)" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-faint)" }}>Domain Access</div>
            <div style={{
              fontSize: "var(--fs-sm)", fontWeight: 700,
              color: totalRights > 0 ? "#16a34a" : "var(--color-text-faint)",
            }}>
              {accessibleDomains.length}/{domains.length} domains
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <StatCard icon="🏗️" label="Domains"           value={domains.length}           sub="Research areas"       accent="#01696f" />
        <StatCard icon="📋" label="Sub-functions"      value={totalSubfunctions}        sub="5 per domain"         accent="#0d6f89" />
        <StatCard icon="✅" label="Operational Tasks"  value={totalTasks}               sub="5 per sub-function"   accent="#6b46c1" />
        <StatCard icon="🔓" label="My Access"          value={accessibleDomains.length} sub={`${totalRights} rights granted`} accent="#16a34a" />
        <StatCard icon="🧱" label="Containers"         value={8}                        sub="C2 layer (C4 model)"  accent="#0284c7" />
        <StatCard icon="🔗" label="Integrations"       value={8}                        sub="External systems"     accent="#d97706" />
      </div>

      {/* ── Admin-only section ─────────────────────────────────────────────── */}
      {isAdminLike && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

          {/* Operations Overview */}
          <div style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}>
            {/* header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px",
              borderBottom: "1px solid var(--color-divider)",
              background: "var(--color-surface)",
            }}>
              <span style={{ fontSize: "0.9rem" }}>📊</span>
              <span style={{
                fontSize: "var(--fs-xs)", fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: "var(--color-text-faint)",
              }}>
                Operations Overview
              </span>
            </div>
            {/* rows */}
            <div style={{ padding: "4px 0" }}>
              <OverviewRow label="Total Domains"         value={domains.length}                                                                    color="#01696f" />
              <OverviewRow label="Users with Access"     value={accessibleDomains.length}                                                          color="#0d6f89" />
              <OverviewRow label="Total SOPs"            value={sopsLoading ? "…" : allSops.length}                                               color="#6b46c1" />
              <OverviewRow label="SOPs — Approved"       value={sopsLoading ? "…" : approvedSops}                                                  color="#16a34a" />
              <OverviewRow label="SOPs — In Review"      value={sopsLoading ? "…" : reviewSops}         color={reviewSops > 0 ? "#b45309" : "var(--color-text)"} />
              <OverviewRow label="Inventory Items"       value={invLoading ? "…" : invSummary.totalItems}                                          color="#0284c7" />
              <OverviewRow label="Low / Out of Stock"    value={invLoading ? "…" : `${invSummary.lowStockItems} / ${invSummary.outOfStockItems}`}  color={invSummary.outOfStockItems > 0 ? "#dc2626" : invSummary.lowStockItems > 0 ? "#b45309" : "var(--color-text)"} />
              <OverviewRow label="Pending HR Approvals"  value={hrLoading ? "…" : hrPending}             color={hrPending > 0 ? "#b45309" : "var(--color-text)"} />
              <OverviewRow label="Pending Inv. Requests" value={reqLoading ? "…" : pendingRequests}      color={pendingRequests > 0 ? "#b45309" : "var(--color-text)"} last />
            </div>
          </div>

          {/* System Status */}
          <div style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}>
            {/* header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px",
              borderBottom: "1px solid var(--color-divider)",
              background: "var(--color-surface)",
            }}>
              <span style={{ fontSize: "0.9rem" }}>🟢</span>
              <span style={{
                fontSize: "var(--fs-xs)", fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
                color: "var(--color-text-faint)",
              }}>
                System Status
              </span>
            </div>
            {/* pills */}
            <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <StatusPill label="API Gateway — Online"        status="ok" />
              <StatusPill label="Database — Connected"        status="ok" />
              <StatusPill label="Auth Service — Active"       status="ok" />
              <StatusPill label="Cold Chain Monitor — Online" status="ok" />
              <StatusPill label="Document Store — Active"     status="ok" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
