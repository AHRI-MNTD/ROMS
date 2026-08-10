import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

export interface RequestReferenceRow {
  rowKey: string;
  requestBatchId?: string | null;
  movementId?: string;
  codeNo: string;
  barcode: string;
  itemDescription: string;
  quantity: number;
  requestedQuantity?: number;
  unit: string;
  unitDescription: string;
  category: string;
  dateRequested: string;
  requestedBy?: string;
  requestedFor?: string;
  project?: string;
  approver?: string | null;
  team?: string;
  remark?: string;
  status?: string;
  acceptedQuantity?: number;
}

export function getApproverForProject(project?: string | null): string {
  if (!project) return "Assalif Demissew";
  const p = project.toUpperCase();
  if (p.includes("TES")) {
    return "Alemayehu Godana, Migbaru Kefallew";
  }
  if (p.includes("ANOSTEP")) {
    return "Assalif Demissew";
  }
  if (p.includes("CDC")) {
    return "Assalif Demissew";
  }
  if (p.includes("HAMMS")) {
    return "Assalif Demissew, Migbaru Kefallew";
  }
  if (p.includes("PVSTATEM") || p.includes("PVSERO")) {
    return "Tilahun Ketema";
  }
  if (p.includes("DRIVAX")) {
    return "Wakweya Chali";
  }
  return "Assalif Demissew";
}

const referenceStatusStyles: Record<"ACCEPT" | "APPROVED" | "PENDING" | "REJECTED" | "PARTIAL", React.CSSProperties> = {
  ACCEPT: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  APPROVED: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  PENDING: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
  REJECTED: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  PARTIAL: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
};

export function RequestReferenceTable() {
  const { data: persistedRequests, isLoading } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests");
      return resp.data as { data: RequestReferenceRow[]; total: number };
    },
  });

  const rows = React.useMemo(() => persistedRequests?.data ?? [], [persistedRequests?.data]);

  const [requestSearch, setRequestSearch] = React.useState("");
  const [requestStatusFilter, setRequestStatusFilter] = React.useState("ALL");
  const [requestPage, setRequestPage] = React.useState(1);
  const requestPageSize = 15;

  const filteredRequests = React.useMemo(() => {
    return rows.filter((row) => {
      const status = row.status ?? "PENDING";
      const normalizedStatus = status === "ACCEPT" ? "APPROVED" : status;
      if (requestStatusFilter !== "ALL" && normalizedStatus !== requestStatusFilter) {
        return false;
      }

      const term = requestSearch.toLowerCase().trim();
      if (!term) return true;

      const trackingId = String(row.requestBatchId ?? row.movementId ?? row.rowKey).toLowerCase();
      const desc = String(row.itemDescription).toLowerCase();
      const code = String(row.codeNo).toLowerCase();
      const reqBy = String(row.requestedBy).toLowerCase();
      const proj = String(row.project).toLowerCase();
      const approverVal = String(row.approver || getApproverForProject(row.project)).toLowerCase();

      return (
        trackingId.includes(term) ||
        desc.includes(term) ||
        code.includes(term) ||
        reqBy.includes(term) ||
        proj.includes(term) ||
        approverVal.includes(term)
      );
    });
  }, [rows, requestSearch, requestStatusFilter]);

  const paginatedRequests = React.useMemo(() => {
    const start = (requestPage - 1) * requestPageSize;
    return filteredRequests.slice(start, start + requestPageSize);
  }, [filteredRequests, requestPage, requestPageSize]);

  const requestTotalPages = Math.max(1, Math.ceil(filteredRequests.length / requestPageSize));

  React.useEffect(() => { setRequestPage(1); }, [requestSearch, requestStatusFilter]);
  React.useEffect(() => {
    if (requestPage > requestTotalPages && requestTotalPages > 0) {
      setRequestPage(requestTotalPages);
    }
  }, [requestPage, requestTotalPages]);

  return (
    <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>Request/s Reference Table</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <input
            value={requestSearch}
            onChange={(e) => {
              setRequestSearch(e.target.value);
              setRequestPage(1);
            }}
            placeholder="Search history..."
            style={{
              minWidth: 260,
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              padding: "4px 8px",
              fontSize: "10px",
              height: 28,
            }}
          />
          <select
            value={requestStatusFilter}
            onChange={(e) => {
              setRequestStatusFilter(e.target.value);
              setRequestPage(1);
            }}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              padding: "4px 8px",
              fontSize: "10px",
              height: 28,
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
        <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
              {(() => {
                const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                return (
                  <>
                    <th style={thStyle} title="Tracking ID">ID</th>
                    <th style={thStyle} title="Code_No">Code</th>
                    <th style={thStyle} title="Barcode">Barcode</th>
                    <th style={thStyle} title="Item_Description">Description</th>
                    <th style={thStyle} title="Quantity">Qty</th>
                    <th style={thStyle} title="Unit">Unit</th>
                    <th style={thStyle} title="Unit_Description">Unit Desc</th>
                    <th style={thStyle} title="Category">Category</th>
                    <th style={thStyle} title="Date_Requested">Requested</th>
                    <th style={thStyle} title="Requested_By">By</th>
                    <th style={thStyle} title="Requested_For">For</th>
                    <th style={thStyle} title="Project">Project</th>
                    <th style={thStyle} title="Approver">Approver</th>
                    <th style={thStyle} title="Team">Team</th>
                    <th style={thStyle} title="Remark">Remark</th>
                    <th style={thStyle} title="Status">Status</th>
                  </>
                );
              })()}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={16} style={{ padding: "10px", fontSize: "10px", color: "var(--color-text-muted)", textAlign: "center" }}>
                  Loading request history...
                </td>
              </tr>
            ) : paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ padding: "10px", fontSize: "10px", color: "var(--color-text-muted)", textAlign: "center" }}>
                  No matching records available.
                </td>
              </tr>
            ) : (
              paginatedRequests.map((row, index) => {
                const cellStyle: React.CSSProperties = { padding: "4px 8px", fontSize: "10px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                const s = (v: unknown) => (v == null ? "" : String(v));
                const fullTrackingId = row.requestBatchId ?? row.movementId ?? row.rowKey;
                const trackIdShort = s(fullTrackingId).slice(-8).toUpperCase();
                const codeNoVal = s(row.codeNo);
                const barcodeVal = s(row.barcode);
                const descVal = s(row.itemDescription);
                const qtyVal = s(row.quantity);
                const unitVal = s(row.unit);
                const unitDescVal = s(row.unitDescription);
                const catVal = s(row.category);
                const dateReqVal = s(row.dateRequested);
                const reqByVal = s(row.requestedBy);
                const reqForVal = s(row.requestedFor);
                const projVal = s(row.project);
                const approverVal = s(row.approver || getApproverForProject(row.project));
                const teamVal = s(row.team);
                const remarkVal = s(row.remark);
                const rawStatus = row.status ?? "PENDING";
                const displayStatus = rawStatus === "ACCEPT" ? "APPROVED" : rawStatus;

                return (
                  <tr key={`${row.rowKey}-${index}`} style={{ borderBottom: "1px solid var(--color-divider)", height: 32 }}>
                    <td style={{ ...cellStyle, fontWeight: 700 }} title={s(fullTrackingId)}>{trackIdShort}</td>
                    <td style={cellStyle} title={codeNoVal}>{codeNoVal}</td>
                    <td style={cellStyle} title={barcodeVal}>{barcodeVal}</td>
                    <td style={cellStyle} title={descVal}>{descVal}</td>
                    <td style={cellStyle} title={qtyVal}>{qtyVal}</td>
                    <td style={cellStyle} title={unitVal}>{unitVal}</td>
                    <td style={cellStyle} title={unitDescVal}>{unitDescVal}</td>
                    <td style={cellStyle} title={catVal}>{catVal}</td>
                    <td style={cellStyle} title={dateReqVal}>{dateReqVal}</td>
                    <td style={cellStyle} title={reqByVal}>{reqByVal}</td>
                    <td style={cellStyle} title={reqForVal}>{reqForVal}</td>
                    <td style={cellStyle} title={projVal}>{projVal}</td>
                    <td style={cellStyle} title={approverVal}>{approverVal}</td>
                    <td style={cellStyle} title={teamVal}>{teamVal}</td>
                    <td style={cellStyle} title={remarkVal}>{remarkVal}</td>
                    <td style={{ padding: "4px 8px", fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: "9px",
                          ...(referenceStatusStyles[displayStatus as keyof typeof referenceStatusStyles] ?? referenceStatusStyles.PENDING),
                        }}
                      >
                        {displayStatus}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
          Page {requestPage} of {requestTotalPages} ({filteredRequests.length} records)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
            disabled={requestPage <= 1}
            style={{
              border: "1px solid var(--color-border)",
              background: requestPage <= 1 ? "var(--color-surface)" : "var(--color-surface-2)",
              color: "var(--color-text)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              fontSize: "var(--fs-xs)",
              cursor: requestPage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setRequestPage((p) => Math.min(requestTotalPages, p + 1))}
            disabled={requestPage >= requestTotalPages}
            style={{
              border: "1px solid var(--color-border)",
              background: requestPage >= requestTotalPages ? "var(--color-surface)" : "var(--color-surface-2)",
              color: "var(--color-text)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              fontSize: "var(--fs-xs)",
              cursor: requestPage >= requestTotalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
