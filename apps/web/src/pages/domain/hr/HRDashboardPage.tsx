import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

// ─── Department colour map ────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  "Research & Development": "#6366f1",
  "Laboratory Operations": "#0ea5e9",
  "Clinical Affairs": "#10b981",
  "Data Management": "#f59e0b",
  "Finance & Administration": "#8b5cf6",
  "Human Resources": "#ec4899",
  "IT & Systems": "#14b8a6",
  "Regulatory Affairs": "#f97316",
  "Quality Management": "#06b6d4",
  "Field Operations": "#84cc16",
  "Communications & Outreach": "#a78bfa",
  Other: "#94a3b8",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, accent, loading,
}: {
  icon: string; label: string; value: string | number;
  sub?: string; accent: string; loading?: boolean;
}) {
  return (
    <div style={{
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border)",
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      flex: "1 1 180px",
      minWidth: 160,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent, borderRadius: "16px 0 0 16px" }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4 }}>
          {label}
        </div>
        {loading ? (
          <div style={{ height: 28, width: 60, background: "var(--color-border)", borderRadius: 6 }} />
        ) : (
          <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1, fontFamily: "var(--font-display)" }}>
            {value}
          </div>
        )}
        {sub && <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Dept Bar ─────────────────────────────────────────────────────────────────
function DeptBar({ name, count, total }: { name: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = DEPT_COLORS[name] ?? DEPT_COLORS["Other"];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "12px", color: "var(--color-text-muted)" }}>
        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{name}</span>
        <span>{count} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Employment Mix ───────────────────────────────────────────────────────────
function EmploymentMix({ permanent, contract, msc }: { permanent: number; contract: number; msc: number }) {
  const total = permanent + contract + msc;
  const items = [
    { label: "Permanent", value: permanent, color: "#6366f1" },
    { label: "Contract", value: contract, color: "#f59e0b" },
    { label: "MSc Student", value: msc, color: "#10b981" },
  ];
  if (total === 0) return <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>No data available</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
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

// ─── Quick Link Button ────────────────────────────────────────────────────────
function QuickLink({ icon, label, desc, to, accent }: { icon: string; label: string; desc: string; to: string; accent: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left", width: "100%", transition: "box-shadow 0.18s, border-color 0.18s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 3px ${accent}22`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 16, color: "var(--color-text-muted)" }}>›</span>
    </button>
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

  const approved = approvedQuery.data?.data ?? [];
  const isLoading = approvedQuery.isLoading || pendingQuery.isLoading;
  const totalApproved = approvedQuery.data?.total ?? 0;
  const totalPending = pendingQuery.data?.total ?? 0;

  const { deptCounts, employmentCounts, recentActivity } = useMemo(() => {
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

    const recentActivity = [...approved].slice(0, 5).map((r) => ({
      name: String(r.fullName ?? r.firstName ?? "—"),
      dept: String(r.department ?? "—"),
      role: String(r.jobTitle ?? r.position ?? "—"),
      date: String(r.startDate ?? "—"),
    }));

    return { deptCounts: deptMap, employmentCounts: empMap, recentActivity };
  }, [approved]);

  const sortedDepts = Object.entries(deptCounts).sort(([, a], [, b]) => b - a).slice(0, 6);
  const totalInDepts = sortedDepts.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <StatCard icon="👥" label="Verified Personnel" value={isLoading ? "—" : totalApproved} sub="Active staff files" accent="#6366f1" loading={isLoading} />
        <StatCard icon="📋" label="Pending Registrations" value={isLoading ? "—" : totalPending} sub="Awaiting verification" accent="#f59e0b" loading={isLoading} />
        <StatCard icon="🏢" label="Departments" value={isLoading ? "—" : Object.keys(deptCounts).length} sub="Active units" accent="#10b981" loading={isLoading} />
        <StatCard icon="🔬" label="Employment Types" value={3} sub="Permanent · Contract · MSc" accent="#0ea5e9" />
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

        {/* Quick Actions */}
        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>⚡ Quick Actions</div>
          <QuickLink icon="📋" label="Register Personnel" desc="Submit a new staff file for review" to="../training-records" accent="#6366f1" />
          <QuickLink icon="🗂️" label="View Personnel Files" desc="Browse verified staff records" to="../approved" accent="#10b981" />
          <QuickLink icon="✅" label="Verify Submissions" desc="Approve or reject pending files" to="../approve-employee" accent="#f59e0b" />
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
                  {["Full Name", "Department", "Role / Title", "Start Date", "Status"].map((h) => (
                    <th key={h} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--color-divider)", transition: "background 0.1s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
                  >
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{row.name}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>{row.dept}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>{row.role}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>{row.date}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#15803d" }}>
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}