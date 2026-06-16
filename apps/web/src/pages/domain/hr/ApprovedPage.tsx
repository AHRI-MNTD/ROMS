import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type ApprovalRow = {
  id: string;
  department: string;
  jobTitle: string;
  startDate: string;
  approvalStatus: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  employmentType?: string | null;
  contractEndDate?: string | null;
  contractRenewalDate?: string | null;
  user?: { displayName?: string | null; email?: string | null };
  reviewedBy?: { displayName?: string | null; email?: string | null } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function formatEmployment(value?: string | null): string {
  if (!value) return "—";
  const v = value.toUpperCase().replace(/[-_\s]/g, "");
  if (v === "CONTRACT" || v === "CONTRACTUAL") return "Contract";
  if (v === "PERMANENT" || v === "FULLTIME" || v === "FULL_TIME") return "Permanent";
  return value;
}

type SortKey = "name" | "department" | "jobTitle" | "startDate" | "employmentType" | "reviewedAt";
type SortDir = "asc" | "desc";

export default function ApprovedPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Contract" | "Permanent">("");
  const [sortKey, setSortKey] = useState<SortKey>("reviewedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const approved = useMemo(() => {
    return (data?.data ?? []).filter((r) => r.approvalStatus === "APPROVED");
  }, [data]);

  const filtered = useMemo(() => {
    let rows = [...approved];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.user?.displayName ?? "").toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.jobTitle.toLowerCase().includes(q) ||
          (r.user?.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterType) {
      rows = rows.filter((r) => formatEmployment(r.employmentType) === filterType);
    }
    rows.sort((a, b) => {
      let va = "";
      let vb = "";
      if (sortKey === "name") { va = a.user?.displayName ?? ""; vb = b.user?.displayName ?? ""; }
      else if (sortKey === "department") { va = a.department; vb = b.department; }
      else if (sortKey === "jobTitle") { va = a.jobTitle; vb = b.jobTitle; }
      else if (sortKey === "startDate") { va = a.startDate ?? ""; vb = b.startDate ?? ""; }
      else if (sortKey === "employmentType") { va = formatEmployment(a.employmentType); vb = formatEmployment(b.employmentType); }
      else if (sortKey === "reviewedAt") { va = a.reviewedAt ?? a.createdAt ?? ""; vb = b.reviewedAt ?? b.createdAt ?? ""; }
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [approved, search, filterType, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ opacity: 0.3, fontSize: 10 }}>⇅</span>;
    return <span style={{ fontSize: 10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const handlePrint = () => {
    if (!selected) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Employee Profile — ${selected.user?.displayName ?? "Unknown"}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .subtitle { color: #555; font-size: 14px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
      td:first-child { font-weight: 700; width: 40%; background: #f8f8f8; }
      .section { font-size: 15px; font-weight: 700; margin: 20px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
      @media print { body { padding: 20px; } }
    </style></head><body>${printRef.current?.innerHTML ?? ""}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const handleShare = async () => {
    if (!selected) return;
    const text = `Employee: ${selected.user?.displayName ?? "Unknown"}\nDepartment: ${selected.department}\nJob Title: ${selected.jobTitle}\nEmployment: ${formatEmployment(selected.employmentType)}\nStart Date: ${formatDate(selected.startDate)}`;
    if (navigator.share) {
      await navigator.share({ title: "Employee Profile", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Profile info copied to clipboard!");
    }
  };

  const handleDownloadPdf = () => {
    handlePrint();
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "var(--fs-xs)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-divider)",
    background: sortKey === key ? "rgba(99,102,241,0.05)" : "transparent",
  });

  const cellStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderBottom: "1px solid var(--color-divider)",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Loading…</div>}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Failed to load personnel data.
        </div>
      )}

      <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>Personnel Database</span>
            <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "#059669", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "2px 10px" }}>
              {filtered.length} {filtered.length === approved.length ? "total" : `of ${approved.length}`}
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-muted)", pointerEvents: "none" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, dept, role…"
                style={{ paddingLeft: 28, paddingRight: 8, height: 30, borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text)", outline: "none", width: 200 }}
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "" | "Contract" | "Permanent")}
              style={{ height: 30, borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text)", padding: "0 8px", cursor: "pointer" }}
            >
              <option value="">All Employment Types</option>
              <option value="Contract">Contract</option>
              <option value="Permanent">Permanent</option>
            </select>

            {(search || filterType) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterType(""); }}
                style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
            {approved.length === 0 ? "No personnel records yet." : "No results match your search or filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle("name"), width: "3%", cursor: "default" }}>#</th>
                  <th style={{ ...thStyle("name"), width: "16%" }} onClick={() => toggleSort("name")}>Name {sortIcon("name")}</th>
                  <th style={{ ...thStyle("department"), width: "17%" }} onClick={() => toggleSort("department")}>Department {sortIcon("department")}</th>
                  <th style={{ ...thStyle("jobTitle"), width: "16%" }} onClick={() => toggleSort("jobTitle")}>Job Title {sortIcon("jobTitle")}</th>
                  <th style={{ ...thStyle("startDate"), width: "10%" }} onClick={() => toggleSort("startDate")}>Start Date {sortIcon("startDate")}</th>
                  <th style={{ ...thStyle("employmentType"), width: "10%" }} onClick={() => toggleSort("employmentType")}>Employment {sortIcon("employmentType")}</th>
                  <th style={{ ...thStyle("reviewedAt"), width: "10%", cursor: "default" }}>Contract End</th>
                  <th style={{ ...thStyle("reviewedAt"), width: "10%", cursor: "default" }}>Renewal</th>
                  <th style={{ ...thStyle("reviewedAt"), width: "10%" }} onClick={() => toggleSort("reviewedAt")}>Approved On {sortIcon("reviewedAt")}</th>
                  <th style={{ ...thStyle("name"), width: "8%", cursor: "default" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const empLabel = formatEmployment(row.employmentType);
                  const empColor = empLabel === "Contract" ? { bg: "#fef9c3", text: "#854d0e", border: "#fde047" } : empLabel === "Permanent" ? { bg: "#dcfce7", text: "#166534", border: "#86efac" } : { bg: "transparent", text: "var(--color-text-muted)", border: "transparent" };
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      style={{ cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...cellStyle, textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700, width: "3%" }}>{i + 1}</td>
                      <td style={{ ...cellStyle, fontWeight: 700, width: "16%" }} title={row.user?.displayName ?? "Unknown"}>{row.user?.displayName ?? "Unknown"}</td>
                      <td style={{ ...cellStyle, width: "17%" }} title={row.department}>{row.department}</td>
                      <td style={{ ...cellStyle, width: "16%" }} title={row.jobTitle}>{row.jobTitle}</td>
                      <td style={{ ...cellStyle, width: "10%" }}>{formatDate(row.startDate)}</td>
                      <td style={{ ...cellStyle, width: "10%" }}>
                        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, background: empColor.bg, color: empColor.text, border: `1px solid ${empColor.border}`, borderRadius: 999, padding: "2px 8px" }}>
                          {empLabel}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, width: "10%" }}>{formatDate(row.contractEndDate)}</td>
                      <td style={{ ...cellStyle, width: "10%" }}>{formatDate(row.contractRenewalDate)}</td>
                      <td style={{ ...cellStyle, width: "10%" }}>{formatDate(row.reviewedAt)}</td>
                      <td style={{ ...cellStyle, width: "8%", textAlign: "center" }}>
                        <span style={{ fontSize: "var(--fs-xs)", color: "#6366f1", fontWeight: 700, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "2px 8px" }}>View</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selected && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(4px)" }}
        >
          <div style={{ background: "var(--color-surface-2)", borderRadius: 20, border: "1px solid var(--color-border)", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {(selected.user?.displayName ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>{selected.user?.displayName ?? "Unknown"}</div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{selected.user?.email ?? "No email on record"}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--color-text-muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            {/* Status Badge */}
            <div style={{ padding: "10px 22px", borderBottom: "1px solid var(--color-divider)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 999, padding: "3px 12px" }}>✓ APPROVED</span>
              {(() => {
                const emp = formatEmployment(selected.employmentType);
                const empColor = emp === "Contract" ? { bg: "#fef9c3", text: "#854d0e", border: "#fde047" } : { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" };
                return <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: empColor.bg, color: empColor.text, border: `1px solid ${empColor.border}`, borderRadius: 999, padding: "3px 12px" }}>{emp}</span>;
              })()}
            </div>

            {/* Printable content */}
            <div ref={printRef} style={{ padding: "18px 22px", display: "grid", gap: 18 }}>
              {/* Hidden print header */}
              <div style={{ display: "none" }} className="print-header">
                <h1 style={{ margin: 0 }}>Employee Profile — {selected.user?.displayName ?? "Unknown"}</h1>
                <p className="subtitle">{selected.user?.email ?? ""} · APPROVED</p>
              </div>

              {/* Work Info */}
              <Section title="Work Information">
                <InfoRow label="Department" value={selected.department} />
                <InfoRow label="Job Title" value={selected.jobTitle} />
                <InfoRow label="Employment Type" value={formatEmployment(selected.employmentType)} />
                <InfoRow label="Start Date" value={formatDate(selected.startDate)} />
                {selected.contractEndDate && <InfoRow label="Contract End Date" value={formatDate(selected.contractEndDate)} />}
                {selected.contractRenewalDate && <InfoRow label="Contract Renewal Date" value={formatDate(selected.contractRenewalDate)} />}
              </Section>

              {/* Approval Info */}
              <Section title="Approval Record">
                <InfoRow label="Approval Status" value="Approved" />
                <InfoRow label="Approved On" value={formatDate(selected.reviewedAt)} />
                <InfoRow label="Reviewed By" value={selected.reviewedBy?.displayName ?? selected.reviewedBy?.email ?? "—"} />
                {selected.reviewNote && <InfoRow label="Review Note" value={selected.reviewNote} />}
                <InfoRow label="Record Created" value={formatDate(selected.createdAt)} />
              </Section>
            </div>

            {/* Action Buttons */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--color-divider)", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <ActionBtn onClick={handleShare} color="#6366f1" icon="🔗" label="Share" />
              <ActionBtn onClick={handleDownloadPdf} color="#0f766e" icon="⬇" label="Download PDF" />
              <ActionBtn onClick={handlePrint} color="#1d4ed8" icon="🖨" label="Print" />
              <button type="button" onClick={() => setSelected(null)} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "var(--fs-xs)", fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 6 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "start" }}>
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function ActionBtn({ onClick, color, icon, label }: { onClick: () => void; color: string; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}
