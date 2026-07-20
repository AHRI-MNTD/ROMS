import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type StaffRow = {
  id?: string | number;
  fullName?: string;
  firstName?: string;
  department?: string;
  jobTitle?: string;
  position?: string;
  employmentType?: string;
  startDate?: string;
  [key: string]: unknown;
};

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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, loading,
}: {
  icon: string; label: string; value: string | number;
  loading?: boolean;
}) {
  return (
    <div style={{
      background: "var(--color-primary-highlight)",
      border: "1px solid var(--color-border)",
      borderRadius: 16,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flex: "1 1 160px",
      minWidth: 140,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "var(--color-primary)", borderRadius: "16px 0 0 16px" }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-primary-highlight)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 2 }}>
          {label}
        </div>
        {loading ? (
          <div style={{ height: 24, width: 50, background: "var(--color-border)", borderRadius: 6 }} />
        ) : (
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-primary)", lineHeight: 1, fontFamily: "var(--font-display)" }}>
            {value}
          </div>
        )}
      </div>
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
  const approvedQuery = useQuery({
    queryKey: ["hr-dashboard-approved"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/staff?page=1&limit=200");
        return resp.data as { data: StaffRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["hr-dashboard-pending"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/training-records?limit=200");
        return resp.data as { data: StaffRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  // Same endpoint as ApprovedPage — fetch real verified personnel
  const approvalsQuery = useQuery({
    queryKey: ["hr-dashboard-approvals"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/approvals");
        return resp.data as { data: ApprovalRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  const approved = approvedQuery.data?.data ?? [];
  const isLoading = approvedQuery.isLoading || pendingQuery.isLoading || approvalsQuery.isLoading;
  const totalApproved = approvedQuery.data?.total ?? 0;
  const totalPending = pendingQuery.data?.total ?? 0;

  // Top 3 most recently verified — sorted by reviewedAt desc
  const recentActivity = useMemo(() => {
    const verifiedRows = (approvalsQuery.data?.data ?? []).filter(
      (r) => r.approvalStatus === "APPROVED"
    );
    return [...verifiedRows]
      .sort((a, b) => {
        const ta = a.reviewedAt ?? a.createdAt ?? "";
        const tb = b.reviewedAt ?? b.createdAt ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 3)
      .map((r) => ({
        name: r.user?.displayName ?? "—",
        dept: r.department ?? "—",
        role: r.jobTitle ?? "—",
        date: r.startDate ? r.startDate.slice(0, 10) : "—",
        verifiedAt: r.reviewedAt ?? r.createdAt ?? "—",
      }));
  }, [approvalsQuery.data]);

  const { deptCounts, employmentCounts } = useMemo(() => {
    const deptMap: Record<string, number> = {};
    approved.forEach((r) => {
      const dept = String(r.department ?? "Other");
      deptMap[dept] = (deptMap[dept] ?? 0) + 1;
    });

    const empMap = { permanent: 0, contract: 0, msc_student: 0 };
    approved.forEach((r) => {
      const t = String(r.employmentType ?? "").toLowerCase();
      if (t === "permanent") empMap.permanent++;
      else if (t === "contract") empMap.contract++;
      else if (t === "msc_student" || t === "msc student") empMap.msc_student++;
    });

    return { deptCounts: deptMap, employmentCounts: empMap };
  }, [approved]);

  const sortedDepts = Object.entries(deptCounts).sort(([, a], [, b]) => b - a).slice(0, 6);
  const totalInDepts = sortedDepts.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <StatCard icon="👥" label="Verified Personnel" value={isLoading ? "—" : totalApproved} loading={isLoading} />
        <StatCard icon="📋" label="Pending Registrations" value={isLoading ? "—" : totalPending} loading={isLoading} />
        <StatCard icon="🏢" label="Departments" value={isLoading ? "—" : Object.keys(deptCounts).length} loading={isLoading} />
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
                  const verifiedOnLabel = row.verifiedAt !== "—"
                    ? new Date(row.verifiedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
                    : "—";
                  const cellBase: React.CSSProperties = {
                    padding: "0 12px",
                    height: 36,
                    maxHeight: 36,
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
                      <td style={{ ...cellBase, fontSize: 13, fontWeight: 600, color: "var(--color-text)" }} title={row.name}>{row.name}</td>
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