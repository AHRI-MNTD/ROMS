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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function formatEmployment(value?: string | null): string {
  if (!value) return "—";
  const v = value.toUpperCase().replace(/[-_\s]/g, "");
  if (v === "CONTRACT" || v === "CONTRACTUAL") return "Contract";
  if (v === "PERMANENT" || v === "FULLTIME") return "Permanent";
  return value;
}

export default function ApproveEmployeePage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [listView, setListView] = useState<"approved" | "rejected" | null>(null);

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



  const panelStyle = (borderColor: string): React.CSSProperties => ({
    borderRadius: 18,
    border: `1px solid ${borderColor}`,
    background: "var(--color-surface-2)",
    overflow: "hidden",
  });

  const headerStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: "var(--fs-md)",
    fontWeight: 800,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-divider)",
    letterSpacing: "0.02em",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-divider)",
    height: 36,
    overflow: "hidden",
  };

  const cellStyle: React.CSSProperties = {
    padding: "4px 6px",
    verticalAlign: "middle",
    fontSize: "var(--fs-xs)",
  };

  const sharedTh = (width: string) => ({ textAlign: "left" as const, padding: "5px 6px", width });

  const renderRow = (row: ApprovalRow, showActions: boolean, index: number) => (
    <tr key={row.id} style={{ ...rowStyle, ...(index === 0 ? { borderTop: "2px solid var(--color-divider)" } : {}) }}>
      <td style={{ ...cellStyle, width: "3%", textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700 }}>{index + 1}</td>
      <td style={{ ...cellStyle, width: "11%" }}>
        <div title={row.user?.displayName ?? "Unknown"} style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.user?.displayName ?? "Unknown"}</div>
      </td>
      <td style={{ ...cellStyle, width: "12%" }} title={row.department}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.department}</div></td>
      <td style={{ ...cellStyle, width: "12%" }} title={row.jobTitle}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.jobTitle}</div></td>
      <td style={{ ...cellStyle, whiteSpace: "nowrap", width: "8%" }}>{formatDate(row.startDate)}</td>
      <td style={{ ...cellStyle, width: "9%" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatEmployment(row.employmentType)}</div></td>
      <td style={{ ...cellStyle, width: "8%", whiteSpace: "nowrap" }}>{formatDate(row.contractEndDate ?? null)}</td>
      <td style={{ ...cellStyle, width: "8%", whiteSpace: "nowrap" }}>{formatDate(row.contractRenewalDate ?? null)}</td>
      <td style={{ ...cellStyle, width: showActions ? "11%" : "21%" }}>
        {showActions ? (
          <input
            value={notes[row.id] ?? ""}
            onChange={(e) => setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))}
            placeholder="Remark"
            style={{ width: "100%", height: 26, padding: "3px 6px", borderRadius: 5, border: "1px solid var(--color-divider)", background: "rgba(255,255,255,0.95)", font: "inherit", fontSize: "var(--fs-xs)", boxSizing: "border-box" }}
          />
        ) : (
          <div title={row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"} style={{ lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"}</div>
        )}
      </td>
      {showActions ? (
        <td style={{ ...cellStyle, textAlign: "right", whiteSpace: "nowrap", width: "10%" }}>
          <button type="button" onClick={() => handleDecision(row.id, "APPROVED")} disabled={approveMutation.isPending} style={{ marginRight: 4, background: "#059669", color: "white", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: "var(--fs-xs)" }}>
            ✓ Approve
          </button>
          <button type="button" onClick={() => handleDecision(row.id, "REJECTED")} disabled={approveMutation.isPending} style={{ background: "#dc2626", color: "white", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: "var(--fs-xs)" }}>
            ✕ Reject
          </button>
        </td>
      ) : null}
    </tr>
  );

  const listThead = (showActions: boolean) => (
    <thead>
      <tr style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
        <th style={{ textAlign: "right", padding: "5px 6px", width: "3%" }}>#</th>
        <th style={sharedTh("11%")}>Name</th>
        <th style={sharedTh("12%")}>Department</th>
        <th style={sharedTh("12%")}>Job title</th>
        <th style={sharedTh("8%")}>Start date</th>
        <th style={sharedTh("9%")}>Employment</th>
        <th style={sharedTh("8%")}>Contract end</th>
        <th style={sharedTh("8%")}>Renewal date</th>
        {showActions ? (
          <>
            <th style={sharedTh("11%")}>Remark</th>
            <th style={{ padding: "5px 6px", width: "10%" }}></th>
          </>
        ) : (
          <th style={sharedTh("21%")}>Reviewed</th>
        )}
      </tr>
    </thead>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Approval API error — start the API server with <code>pnpm --filter @roms/api dev</code> and ensure you're signed in.
        </div>
      )}


      <div style={{ display: "grid", gap: 12 }}>
        <div style={panelStyle("rgba(186, 197, 34, 0.18)")}>
          <div style={{ ...headerStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Pending employee approvals</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setListView((v) => v === "approved" ? null : "approved")}
                style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #86efac", background: listView === "approved" ? "#059669" : "#f0fdf4", color: listView === "approved" ? "#fff" : "#059669", fontWeight: 700, fontSize: "var(--fs-xs)", cursor: "pointer" }}
              >
                Approved list ({approved.length})
              </button>
              <button
                type="button"
                onClick={() => setListView((v) => v === "rejected" ? null : "rejected")}
                style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: listView === "rejected" ? "#dc2626" : "#fef2f2", color: listView === "rejected" ? "#fff" : "#dc2626", fontWeight: 700, fontSize: "var(--fs-xs)", cursor: "pointer" }}
              >
                Rejected list ({rejected.length})
              </button>
            </div>
          </div>
          <div style={{ padding: "8px 12px 10px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Review the employee profile, then approve or disapprove access.</div>
          <div>
            {pending.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                {listThead(true)}
                <tbody>{pending.map((row, i) => renderRow(row, true, i))}</tbody>
              </table>
            ) : (
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No pending employee approvals.</div>
            )}
          </div>
        </div>

        {listView === "approved" && (
          <div style={panelStyle("rgba(34, 197, 94, 0.18)")}>
            <div style={headerStyle}>Approved list</div>
            <div>
              {approved.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  {listThead(false)}
                  <tbody>{approved.map((row, i) => renderRow(row, false, i))}</tbody>
                </table>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No approved employees yet.</div>
              )}
            </div>
          </div>
        )}

        {listView === "rejected" && (
          <div style={panelStyle("rgba(239, 68, 68, 0.18)")}>
            <div style={headerStyle}>Rejected list</div>
            <div>
              {rejected.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  {listThead(false)}
                  <tbody>{rejected.map((row, i) => renderRow(row, false, i))}</tbody>
                </table>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No rejected employees yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
