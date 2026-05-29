import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApprovalRow = {
  id: string;
  department: string;
  jobTitle: string;
  startDate: string;
  approvalStatus: ApprovalStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  employmentType?: string | null;
  contractEndDate?: string | null;
  contractRenewalDate?: string | null;
  user?: {
    displayName?: string | null;
    email?: string | null;
    roles?: string[] | null;
  };
  reviewedBy?: {
    displayName?: string | null;
    email?: string | null;
  } | null;
};

type ApprovalPayload = {
  approvalStatus: ApprovalStatus;
  reviewNote?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

export default function ApproveEmployeePage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approvalStatus, reviewNote }: { id: string; approvalStatus: ApprovalStatus; reviewNote?: string | undefined }) => {
      const body: Record<string, unknown> = { approvalStatus };
      if (reviewNote !== undefined) body.reviewNote = reviewNote;
      const resp = await apiClient.patch(`/domains/hr/approvals/${id}`, body);
      return resp.data as ApprovalRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr-employee-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["hr-dashboard-staff"] });
    },
  });

  const rows = data?.data ?? [];
  const sortByRecent = (a: ApprovalRow, b: ApprovalRow) => {
    const ta = new Date(a.createdAt ?? a.reviewedAt ?? a.startDate ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.reviewedAt ?? b.startDate ?? 0).getTime();
    return tb - ta;
  };

  const pending = useMemo(() => rows.filter((row) => row.approvalStatus === "PENDING").slice().sort(sortByRecent), [rows]);
  const approved = useMemo(() => rows.filter((row) => row.approvalStatus === "APPROVED").slice().sort(sortByRecent), [rows]);
  const rejected = useMemo(() => rows.filter((row) => row.approvalStatus === "REJECTED").slice().sort(sortByRecent), [rows]);

  const handleDecision = async (id: string, approvalStatus: ApprovalStatus) => {
    const note = notes[id]?.trim();
    await approveMutation.mutateAsync({ id, approvalStatus, reviewNote: note || undefined });
    setNotes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const summaryCard = (tone: string): React.CSSProperties => ({
    padding: 16,
    borderRadius: 18,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.95))`,
    boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)",
  });

  const approvalPanelStyle = (borderColor: string, accentColor: string, shadowColor: string): React.CSSProperties => ({
    borderRadius: 18,
    border: `1px solid ${borderColor}`,
    background: `linear-gradient(180deg, ${accentColor}, rgba(255,255,255,0.96))`,
    overflow: "hidden",
    boxShadow: `0 14px 28px ${shadowColor}`,
  });

  const approvalHeaderStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: "var(--fs-md)",
    fontWeight: 800,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-divider)",
    textAlign: "center",
    letterSpacing: "0.02em",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-divider)",
    height: 48,
    overflow: "hidden",
  };

  const renderRow = (row: ApprovalRow, showActions: boolean, index: number) => (
    <tr key={row.id} style={{ ...rowStyle, ...(index === 0 ? { borderTop: "2px solid var(--color-divider)" } : {}) }}>
      <td style={{ padding: "8px 10px", verticalAlign: "top", width: "4%", textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700 }}>{index + 1}</td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "20%" }}>
        <div title={row.user?.displayName ?? "Unknown"} style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.user?.displayName ?? "Unknown"}</div>
      </td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "22%" }} title={row.department}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.department}</div></td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "20%" }} title={row.jobTitle}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.jobTitle}</div></td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", whiteSpace: "nowrap", width: "14%" }}>{formatDate(row.startDate)}</td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "12%" }}>{row.employmentType ?? "—"}</td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "12%" }}>{formatDate(row.contractEndDate ?? null)}</td>
      <td style={{ padding: "8px 10px", verticalAlign: "middle", width: "16%" }}>
        {showActions ? (
          <input
            value={notes[row.id] ?? ""}
            onChange={(e) => setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))}
            placeholder="Optional remark"
            style={{ width: "100%", height: 36, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "rgba(255,255,255,0.95)", font: "inherit", boxSizing: "border-box", overflow: "hidden" }}
          />
        ) : (
          <div title={row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"} style={{ lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"}</div>
        )}
      </td>
      {showActions ? (
        <td style={{ padding: "8px 10px", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap", width: "8%" }}>
          <button type="button" onClick={() => handleDecision(row.id, "APPROVED")} disabled={approveMutation.isPending} style={{ marginRight: 6, background: "#059669", color: "white", border: "none", padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>
            Approve
          </button>
          <button type="button" onClick={() => handleDecision(row.id, "REJECTED")} disabled={approveMutation.isPending} style={{ background: "#dc2626", color: "white", border: "none", padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>
            Reject
          </button>
        </td>
      ) : null}
    </tr>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Approval API error — start the API server with <code>pnpm --filter @roms/api dev</code> and ensure you're signed in.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12 }}>
        <div style={summaryCard("#b45309")}> 
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Pending Reviews</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{pending.length}</div>
        </div>
        <div style={summaryCard("#0f766e")}> 
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Approved</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{approved.length}</div>
        </div>
        <div style={summaryCard("#dc2626")}> 
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Rejected</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--color-text)" }}>{rejected.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={approvalPanelStyle("rgba(186, 197, 34, 0.18)", "rgba(240, 253, 244, 0.98)", "rgba(16, 24, 40, 0.05)")}> 
          <div style={approvalHeaderStyle}>Pending employee approvals</div>
          <div style={{ padding: "8px 12px 10px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Review the employee profile, then approve or disapprove access.</div>
          <div style={{ overflowX: "auto" }}>
            {pending.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "right", padding: "8px 10px", width: "4%" }}>#</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "22%" }}>Department</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Job title</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "14%" }}>Start date</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Employment</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Contract end</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", width: "16%" }}>Remark</th>
                    <th style={{ padding: "8px 10px", width: "8%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((row, i) => renderRow(row, true, i))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No pending employee approvals.</div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={approvalPanelStyle("rgba(34, 197, 94, 0.18)", "rgba(240, 253, 244, 0.98)", "rgba(16, 24, 40, 0.05)")}> 
            <div style={approvalHeaderStyle}>Approved list</div>
            <div style={{ overflowX: "auto" }}>
              {approved.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                        <th style={{ textAlign: "right", padding: "8px 10px", width: "4%" }}>#</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "22%" }}>Department</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Job title</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", width: "14%" }}>Start date</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Employment</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Contract end</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", width: "24%" }}>Reviewed</th>
                    </tr>
                  </thead>
                  <tbody>
                      {approved.map((row, i) => renderRow(row, false, i))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No approved employees yet.</div>
              )}
            </div>
          </div>

          <div style={approvalPanelStyle("rgba(239, 68, 68, 0.18)", "rgba(254, 242, 242, 0.98)", "rgba(185, 28, 28, 0.05)")}> 
            <div style={approvalHeaderStyle}>Rejected list</div>
            <div style={{ overflowX: "auto" }}>
              {rejected.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "right", padding: "8px 10px", width: "4%" }}>#</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "22%" }}>Department</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "20%" }}>Job title</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "14%" }}>Start date</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Employment</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "12%" }}>Contract end</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", width: "24%" }}>Reviewed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((row, i) => renderRow(row, false, i))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No rejected employees yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}