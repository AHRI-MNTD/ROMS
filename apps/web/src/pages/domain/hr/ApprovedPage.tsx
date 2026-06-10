import React from "react";
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
  return parsed.toLocaleDateString();
}

export default function ApprovedPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const approved = (data?.data ?? [])
    .filter((r) => r.approvalStatus === "APPROVED")
    .sort((a, b) => new Date(b.reviewedAt ?? b.createdAt ?? 0).getTime() - new Date(a.reviewedAt ?? a.createdAt ?? 0).getTime());

  const cellStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: "var(--fs-xs)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Loading…</div>}
      {error && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "var(--fs-sm)", color: "#991b1b" }}>Failed to load approvals.</div>}

      <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Approved Employees</span>
          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "#059669", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "2px 10px" }}>{approved.length} total</span>
        </div>

        {approved.length === 0 ? (
          <div style={{ padding: "16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>No approved employees yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "6px 8px", textAlign: "right", width: "3%" }}>#</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "16%" }}>Name</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "18%" }}>Department</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "17%" }}>Job Title</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "10%" }}>Start Date</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "10%" }}>Employment</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "9%" }}>Contract End</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "9%" }}>Renewal Date</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "9%" }}>Approved On</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "13%" }}>Reviewed By / Note</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 36 }}>
                    <td style={{ ...cellStyle, textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }} title={row.user?.displayName ?? "Unknown"}>{row.user?.displayName ?? "Unknown"}</td>
                    <td style={cellStyle} title={row.department}>{row.department}</td>
                    <td style={cellStyle} title={row.jobTitle}>{row.jobTitle}</td>
                    <td style={cellStyle}>{formatDate(row.startDate)}</td>
                    <td style={cellStyle}>{row.employmentType ?? "—"}</td>
                    <td style={cellStyle}>{formatDate(row.contractEndDate)}</td>
                    <td style={cellStyle}>{formatDate(row.contractRenewalDate)}</td>
                    <td style={cellStyle}>{formatDate(row.reviewedAt)}</td>
                    <td style={cellStyle} title={row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"}>
                      {row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"}
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
