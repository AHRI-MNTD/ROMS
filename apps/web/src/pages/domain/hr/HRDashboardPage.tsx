import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

// ─── Types & Data ─────────────────────────────────────────────────────────────
type ApprovalRow = {
  id: string;
  department: string;
  jobTitle: string;
  startDate: string;
  approvalStatus: string;
  reviewedAt?: string | null;
  createdAt?: string | null;
  employmentType?: string | null;
  user?: { displayName?: string | null; email?: string | null };
};

const POSITIONS = [
  { name: "division_head", label: "Division Head" },
  { name: "lead_scientist", label: "Lead Scientist" },
  { name: "senior_scientist", label: "Senior Scientist" },
  { name: "post-doctoral_researcher", label: "Post-Doctoral Researcher" },
  { name: "researcher_ii", label: "Researcher II" },
  { name: "researcher_i", label: "Researcher I" },
  { name: "associate_researcher_ii", label: "Associate Researcher II" },
  { name: "associate_researcher_i", label: "Associate Researcher I" },
  { name: "assistant_researcher_ii", label: "Assistant Researcher II" },
  { name: "assistant_researcher_i", label: "Assistant Researcher I" },
  { name: "assistant_researcher", label: "Assistant Researcher" },
  { name: "junior_researcher", label: "Junior Researcher" },
  { name: "project_manager", label: "Project Manager" },
  { name: "assistant_project_management", label: "Assistant Project Management" },
  { name: "project_coordinator", label: "Project Coordinator" },
  { name: "senior_project_accountant", label: "Senior Project Accountant" },
  { name: "project_accountant", label: "Project Accountant" },
  { name: "junior_administration_officer", label: "Junior Administration Officer" },
  { name: "driver", label: "Driver" }
];

function getPositionLabel(value?: string | null) {
  if (!value) return "—";
  const found = POSITIONS.find(p => p.name === value);
  return found ? found.label : value;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const statIcon = (tone: string): React.CSSProperties => ({
  width: 18, height: 18, borderRadius: 6, display: "inline-flex",
  alignItems: "center", justifyContent: "center", background: `${tone}15`, color: tone, fontSize: 10,
});

function StatCard({
  icon, label, value, loading, tone, badge: bdg,
}: {
  icon: string; label: string; value: string | number;
  loading?: boolean; tone: string;
  badge?: { text: string; bg: string; color: string } | null;
}) {
  return (
    <div
      className="inventory-kpi-card"
      style={{
        border: `1px solid ${tone}22`,
        background: `linear-gradient(135deg, ${tone}08, rgba(255,255,255,0.98))`,
      }}
    >
      <div className="inventory-kpi-card-header">
        <div style={statIcon(tone)}>{icon}</div>
        <div className="inventory-kpi-card-value">
          {loading ? "—" : value}
        </div>
        {bdg && (
          <span style={{ fontSize: "8px", color: bdg.color, fontWeight: 700, background: bdg.bg, padding: "1px 3px", borderRadius: 999 }}>
            {bdg.text}
          </span>
        )}
      </div>
      <div className="inventory-kpi-card-label" title={label}>{label}</div>
    </div>
  );
}

// ─── Dept Bar ─────────────────────────────────────────────────────────────────
function DeptBar({ name, count, total }: { name: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "12px", color: "var(--color-text-muted)" }}>
        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{name}</span>
        <span>{count} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary)", borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Employment Mix ───────────────────────────────────────────────────────────
function EmploymentMix({ permanent, contract, msc }: { permanent: number; contract: number; msc: number }) {
  const total = permanent + contract + msc;
  const items = [
    { label: "Permanent", value: permanent },
    { label: "Contract", value: contract },
    { label: "MSc Student", value: msc },
  ];
  if (total === 0) return <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>No data available</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0, opacity: item.label === "Permanent" ? 1 : item.label === "Contract" ? 0.6 : 0.35 }} />
          <span style={{ fontSize: 13, color: "var(--color-text)", flex: 1 }}>{item.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{item.value}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", minWidth: 36, textAlign: "right" }}>
            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function HRDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/approvals");
        return resp.data as { data: ApprovalRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  const allProfiles = useMemo(() => data?.data ?? [], [data]);

  // Use the exact same exclusion logic as ApprovedPage (Personnel Files) so the
  // "Verified Personnel" KPI always matches the count shown there.
  const isDemoUser = (r: ApprovalRow) => {
    const name = (r.user?.displayName ?? "").toLowerCase();
    const email = (r.user?.email ?? "").toLowerCase();
    return (
      name.includes("carol nzinga") ||
      name.includes("david asante") ||
      name.includes("brian okonkwo") ||
      name.includes("henry osei") ||
      name.includes("alice mwangi") ||
      name.includes("eve diallo") ||
      name.includes("frank mensah") ||
      name === "roms system administrator" ||
      email === "admin@roms.dev" ||
      email === "pi@roms.dev" ||
      email === "scientist@roms.dev" ||
      email === "datamanager@roms.dev" ||
      email === "qa@roms.dev" ||
      email === "community@roms.dev" ||
      email === "systemadmin@roms.com" ||
      email.endsWith("@roms.dev")
    );
  };

  const verifiedProfiles = useMemo(() => {
    return allProfiles.filter((r) => r.approvalStatus === "APPROVED" && !isDemoUser(r));
  }, [allProfiles]);

  const pendingProfiles = useMemo(() => {
    return allProfiles.filter((r) => r.approvalStatus === "PENDING" && !isDemoUser(r));
  }, [allProfiles]);

  const totalVerified = verifiedProfiles.length;
  const totalPending = pendingProfiles.length;

  // Top 5 most recently verified staff members — sorted by reviewedAt / createdAt desc
  const recentActivity = useMemo(() => {
    return [...verifiedProfiles]
      .sort((a, b) => {
        const ta = a.reviewedAt ?? a.createdAt ?? "";
        const tb = b.reviewedAt ?? b.createdAt ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 5)
      .map((r) => ({
        name: r.user?.displayName ?? "—",
        dept: r.department ?? "—",
        role: getPositionLabel(r.jobTitle),
        date: formatDate(r.startDate),
        verifiedAt: r.reviewedAt ?? r.createdAt ?? null,
      }));
  }, [verifiedProfiles]);

  const { deptCounts, employmentCounts } = useMemo(() => {
    const deptMap: Record<string, number> = {};
    verifiedProfiles.forEach((r) => {
      const dept = r.department?.trim() || "Unassigned";
      deptMap[dept] = (deptMap[dept] ?? 0) + 1;
    });

    // Normalise stored employment type values to match the canonical enum:
    // stored as: "permanent" | "contract" | "msc_student"
    const empMap = { permanent: 0, contract: 0, msc_student: 0 };
    verifiedProfiles.forEach((r) => {
      const raw = String(r.employmentType ?? "").toLowerCase().trim();
      // Strip separators to allow flexible matching
      const t = raw.replace(/[-_\s]/g, "");
      if (t === "permanent" || t === "fulltime") empMap.permanent++;
      else if (t === "contract" || t === "contractual") empMap.contract++;
      else if (t === "mscstudent") empMap.msc_student++;
    });

    return { deptCounts: deptMap, employmentCounts: empMap };
  }, [verifiedProfiles]);

  const sortedDepts = Object.entries(deptCounts).sort(([, a], [, b]) => b - a);
  const totalInDepts = sortedDepts.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#991b1b" }}>
          Failed to load HR dashboard metrics. Ensure the API server is running.
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="inventory-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard
          icon="👥" label="Verified Personnel"
          value={isLoading ? "—" : totalVerified}
          loading={isLoading}
          tone="#01696f"
        />
        <StatCard
          icon="📋" label="Pending Verification"
          value={isLoading ? "—" : totalPending}
          loading={isLoading}
          tone="#b45309"
          badge={totalPending > 0 ? { text: "Action", bg: "#fef3c7", color: "#92400e" } : null}
        />
        <StatCard
          icon="🏢" label="Departments"
          value={isLoading ? "—" : Object.keys(deptCounts).length}
          loading={isLoading}
          tone="#3b82f6"
        />
      </div>

      {/* ── Middle Row ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

        {/* Department Breakdown */}
        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>🏢 Department Breakdown</div>
          {isLoading ? (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Loading…</div>
          ) : sortedDepts.length === 0 ? (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
              No department data yet.
            </div>
          ) : (
            sortedDepts.map(([dept, count]) => (
              <DeptBar key={dept} name={dept} count={count} total={totalInDepts} />
            ))
          )}
        </div>

        {/* Employment Mix + Module Coverage */}
        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>📊 Employment Type Mix</div>
          {isLoading ? (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Loading…</div>
          ) : (
            <EmploymentMix permanent={employmentCounts.permanent} contract={employmentCounts.contract} msc={employmentCounts.msc_student} />
          )}

          <div style={{ borderTop: "1px solid var(--color-border)", margin: "16px 0" }} />

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>📌 Module Coverage</div>
          {[
            { icon: "📋", text: "Personnel Registration — submit & track staff files" },
            { icon: "🗂️", text: "Personnel Files — verified credentials & history" },
            { icon: "✅", text: "Verify Personnel — review & approve submissions" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              <span>{item.icon}</span><span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity Table ───────────────────────────────────────────── */}
      <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>🕐 Recently Verified Personnel</div>
        {isLoading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Loading…</div>
        ) : recentActivity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--color-text-muted)", fontSize: 13 }}>
            No verified personnel yet. Start by registering staff in the <strong>Personnel Registration</strong> tab.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Full Name", "Department", "Role / Title", "Start Date", "Verified On", "Status"].map((h) => (
                    <th key={h} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row, i) => {
                  const verifiedOnLabel = formatDate(row.verifiedAt);
                  const cellBase: React.CSSProperties = {
                    padding: "0 12px",
                    height: 30,
                    maxHeight: 30,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    borderBottom: "1px solid var(--color-divider)",
                    verticalAlign: "middle",
                  };
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--color-divider)", transition: "background 0.1s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--color-primary-highlight)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
                    >
                      <td style={{ ...cellBase, fontSize: 12, color: "var(--color-text)" }} title={row.name}>{row.name}</td>
                      <td style={{ ...cellBase, fontSize: 12, color: "var(--color-text-muted)" }} title={row.dept}>{row.dept}</td>
                      <td style={{ ...cellBase, fontSize: 12, color: "var(--color-text-muted)" }} title={row.role}>{row.role}</td>
                      <td style={{ ...cellBase, fontSize: 12, color: "var(--color-text-muted)" }} title={row.date}>{row.date}</td>
                      <td style={{ ...cellBase, fontSize: 12, color: "var(--color-text-muted)" }} title={verifiedOnLabel}>{verifiedOnLabel}</td>
                      <td style={{ ...cellBase }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "var(--color-primary-highlight)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}>
                          Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}