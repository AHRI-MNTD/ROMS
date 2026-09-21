import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { RequestReferenceRow, getApproverForProject } from "./RequestReferenceTable";

const approvedStatusStyles: Record<"APPROVED" | "PARTIAL", React.CSSProperties> = {
  APPROVED: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  PARTIAL: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
};

export default function ApprovedRequestsPage() {
  const queryClient = useQueryClient();

  // Fetch requests from API
  const { data: persistedRequests, isLoading, refetch } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests");
      return resp.data as { data: RequestReferenceRow[]; total: number };
    },
  });

  const rawRows = useMemo(() => persistedRequests?.data ?? [], [persistedRequests?.data]);

  // Filter ONLY approved & partial requests
  const approvedRows = useMemo(() => {
    return rawRows.filter((r) => {
      const status = (r.status ?? "PENDING").toUpperCase();
      return status === "APPROVED" || status === "ACCEPT" || status === "PARTIAL";
    });
  }, [rawRows]);

  // Mark approved requests as seen when worker visits this page
  useEffect(() => {
    if (approvedRows.length === 0) return;
    try {
      let seenMap: Record<string, boolean> = {};
      const saved = localStorage.getItem("roms_seen_approved_requests");
      if (saved) seenMap = JSON.parse(saved);

      let changed = false;
      approvedRows.forEach((r) => {
        if (!seenMap[r.rowKey]) {
          seenMap[r.rowKey] = true;
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem("roms_seen_approved_requests", JSON.stringify(seenMap));
      }
    } catch {}
  }, [approvedRows]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Track physically issued/handed over items in localStorage for worker convenience
  const [issuedItemsMap, setIssuedItemsMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("roms_issued_approved_requests");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("roms_issued_approved_requests", JSON.stringify(issuedItemsMap));
    } catch {}
  }, [issuedItemsMap]);

  const toggleItemIssued = (key: string) => {
    setIssuedItemsMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Selected row for detail modal
  const [selectedRow, setSelectedRow] = useState<RequestReferenceRow | null>(null);

  // Projects list for dropdown
  const uniqueProjects = useMemo(() => {
    const list = new Set<string>();
    approvedRows.forEach((r) => {
      if (r.project) list.add(r.project);
    });
    return Array.from(list).sort();
  }, [approvedRows]);

  // Filtered requests based on search and project
  const filteredRequests = useMemo(() => {
    return approvedRows.filter((row) => {
      if (selectedProject !== "ALL" && row.project !== selectedProject) {
        return false;
      }

      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const trackingId = String(row.requestBatchId ?? row.movementId ?? row.rowKey).toLowerCase();
      const desc = String(row.itemDescription).toLowerCase();
      const code = String(row.codeNo).toLowerCase();
      const reqBy = String(row.requestedBy).toLowerCase();
      const reqFor = String(row.requestedFor).toLowerCase();
      const proj = String(row.project).toLowerCase();
      const approverVal = String(row.approver || getApproverForProject(row.project)).toLowerCase();

      return (
        trackingId.includes(term) ||
        desc.includes(term) ||
        code.includes(term) ||
        reqBy.includes(term) ||
        reqFor.includes(term) ||
        proj.includes(term) ||
        approverVal.includes(term)
      );
    });
  }, [approvedRows, searchTerm, selectedProject]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedProject]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalApproved = approvedRows.length;
    const totalQuantityApproved = approvedRows.reduce(
      (sum, r) => sum + Number(r.acceptedQuantity ?? r.quantity ?? 0),
      0
    );
    const totalIssuedCount = approvedRows.filter((r) => issuedItemsMap[r.rowKey]).length;
    const pendingHandoffCount = totalApproved - totalIssuedCount;

    return { totalApproved, totalQuantityApproved, totalIssuedCount, pendingHandoffCount };
  }, [approvedRows, issuedItemsMap]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ── Top Hero & Notification Banner for Inventory Worker ── */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 14,
          background: "var(--inventory-hero-bg, linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(13,148,136,0.02) 100%))",
          border: "1px solid var(--color-primary-highlight, rgba(13,148,136,0.25))",
          boxShadow: "0 4px 18px var(--color-accent-soft, rgba(0,0,0,0.04))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--color-primary-soft, #dcfce7)",
              color: "var(--color-primary, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(13,148,136,0.15)",
            }}
          >
            ✅
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                Approved Requests Hub
              </h2>
              <span
                style={{
                  fontSize: "9.5px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #86efac",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Manager Approved
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "4px 0 0 0", lineHeight: 1.4 }}>
              Review manager-approved material requisitions and seamlessly issue inventory items to requesting lab personnel.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          🔄 Refresh Feed
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
          <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", fontWeight: 600 }}>Total Approved Requisitions</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>{metrics.totalApproved}</div>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #86efac", background: "var(--color-surface)" }}>
          <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: 600 }}>Total Approved Units</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#166534", marginTop: 2 }}>{metrics.totalQuantityApproved}</div>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #fdba74", background: "var(--color-surface)" }}>
          <div style={{ fontSize: "10.5px", color: "#9a3412", fontWeight: 600 }}>Pending Handoff</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#9a3412", marginTop: 2 }}>{metrics.pendingHandoffCount}</div>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #93c5fd", background: "var(--color-surface)" }}>
          <div style={{ fontSize: "10.5px", color: "#1e40af", fontWeight: 600 }}>Completed Handoffs</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e40af", marginTop: 2 }}>{metrics.totalIssuedCount}</div>
        </div>
      </div>

      {/* ── Main Approved Requests Table Container ── */}
      <div style={{ padding: 14, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
        {/* Filters Header */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Approved Requests List</span>
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", fontWeight: 700 }}>
              {filteredRequests.length} record{filteredRequests.length === 1 ? "" : "s"}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Item, Requester, Project..."
              style={{
                minWidth: 280,
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "11px",
                height: 32,
              }}
            />

            {uniqueProjects.length > 0 && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  padding: "6px 10px",
                  fontSize: "11px",
                  height: 32,
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Projects</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)", background: "var(--color-surface-offset)" }}>
                {(() => {
                  const thStyle: React.CSSProperties = { padding: "8px 8px", textAlign: "left", fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                  return (
                    <>
                      <th style={thStyle} title="Tracking ID">ID</th>
                      <th style={thStyle} title="Code No / Barcode">Code</th>
                      <th style={thStyle} title="Item Description">Item Description</th>
                      <th style={thStyle} title="Dispensed Qty">Qty</th>
                      <th style={thStyle} title="Unit">Unit</th>
                      <th style={thStyle} title="Category">Category</th>
                      <th style={thStyle} title="Date Approved">Date</th>
                      <th style={thStyle} title="Requested By">Requested By</th>
                      <th style={thStyle} title="Requested For">Requested For</th>
                      <th style={thStyle} title="Project">Project</th>
                      <th style={thStyle} title="Status">Status</th>
                      <th style={{ ...thStyle, textAlign: "center" }} title="Action">Action</th>
                    </>
                  );
                })()}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ padding: "18px", fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center" }}>
                    Loading approved requests list...
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "24px", fontSize: "11.5px", color: "var(--color-text-muted)", textAlign: "center" }}>
                    No matching approved requests found.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((row, index) => {
                  const cellStyle: React.CSSProperties = { padding: "6px 8px", fontSize: "10.5px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                  const fullTrackingId = row.requestBatchId ?? row.movementId ?? row.rowKey;
                  const trackIdShort = String(fullTrackingId).slice(-8).toUpperCase();
                  const rawStatus = (row.status ?? "APPROVED").toUpperCase();
                  const displayStatus = rawStatus === "ACCEPT" ? "APPROVED" : rawStatus;
                  const isIssued = issuedItemsMap[row.rowKey] ?? false;

                  return (
                    <tr
                      key={`${row.rowKey}-${index}`}
                      onClick={() => setSelectedRow(row)}
                      style={{
                        borderBottom: "1px solid var(--color-divider)",
                        height: 38,
                        cursor: "pointer",
                        background: isIssued ? "rgba(16, 185, 129, 0.03)" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-primary-soft)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isIssued ? "rgba(16, 185, 129, 0.03)" : "transparent")}
                    >
                      <td style={{ ...cellStyle, fontWeight: 700, color: "var(--color-primary)" }} title={String(fullTrackingId)}>
                        {trackIdShort}
                      </td>
                      <td style={cellStyle} title={row.codeNo}>{row.codeNo || "—"}</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: "var(--color-text)" }} title={row.itemDescription}>
                        {row.itemDescription}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 800, color: "#166534" }} title={String(row.acceptedQuantity ?? row.quantity)}>
                        {row.acceptedQuantity ?? row.quantity}
                      </td>
                      <td style={cellStyle} title={row.unit}>{row.unit}</td>
                      <td style={cellStyle} title={row.category}>{row.category}</td>
                      <td style={cellStyle} title={row.dateRequested}>{row.dateRequested}</td>
                      <td style={cellStyle} title={row.requestedBy}>{row.requestedBy || "—"}</td>
                      <td style={cellStyle} title={row.requestedFor || "—"}>{row.requestedFor || "—"}</td>
                      <td style={cellStyle} title={row.project}>{row.project || "—"}</td>
                      <td style={{ padding: "4px 8px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: "9px",
                            ...(approvedStatusStyles[displayStatus as keyof typeof approvedStatusStyles] ?? approvedStatusStyles.APPROVED),
                          }}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            title="View details"
                            style={{
                              border: "1px solid var(--color-border)",
                              background: "var(--color-surface)",
                              color: "var(--color-primary)",
                              borderRadius: 6,
                              padding: "3px 8px",
                              fontSize: "10px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            👁️ View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
            Showing page {page} of {totalPages} ({filteredRequests.length} approved items)
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                border: "1px solid var(--color-border)",
                background: page <= 1 ? "var(--color-surface)" : "var(--color-surface-2)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 10px",
                fontSize: "11px",
                cursor: page <= 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                border: "1px solid var(--color-border)",
                background: page >= totalPages ? "var(--color-surface)" : "var(--color-surface-2)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 10px",
                fontSize: "11px",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Detailed View Modal ── */}
      {selectedRow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedRow(null)}
        >
          <div
            style={{
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "620px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--inventory-hero-bg, #f0fdf4)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  📋
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 800, color: "var(--color-text)" }}>
                    Approved Requisition Details
                  </h3>
                  <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Tracking ID: <strong style={{ color: "var(--color-primary)" }}>{selectedRow.requestBatchId ?? selectedRow.movementId ?? selectedRow.rowKey}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "18px", cursor: "pointer", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "75vh", overflowY: "auto" }}>
              {/* Item Card Banner */}
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-surface-offset)", border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-text)" }}>{selectedRow.itemDescription}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Code: <strong>{selectedRow.codeNo || "—"}</strong> &nbsp;|&nbsp; Category: <strong>{selectedRow.category}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Dispensed Quantity</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#166534" }}>
                    {selectedRow.acceptedQuantity ?? selectedRow.quantity} <span style={{ fontSize: "12px", fontWeight: 600 }}>{selectedRow.unit}</span>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "11.5px" }}>
                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Requested By</div>
                  <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedRow.requestedBy || "—"}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Requested For</div>
                  <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedRow.requestedFor || "—"}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Project</div>
                  <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedRow.project || "—"}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Authorized Approver</div>
                  <div style={{ fontWeight: 700, color: "var(--color-primary)", marginTop: 2 }}>
                    {selectedRow.approver || getApproverForProject(selectedRow.project)}
                  </div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Date Requested</div>
                  <div style={{ fontWeight: 600, color: "var(--color-text)", marginTop: 2 }}>{selectedRow.dateRequested}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Team</div>
                  <div style={{ fontWeight: 600, color: "var(--color-text)", marginTop: 2 }}>{selectedRow.team || "—"}</div>
                </div>
              </div>

              {selectedRow.remark && (
                <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Remarks / Notes</div>
                  <div style={{ fontSize: "11.5px", color: "var(--color-text)", marginTop: 2 }}>{selectedRow.remark}</div>
                </div>
              )}

              {/* Handoff Status Control for Inventory Worker */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: issuedItemsMap[selectedRow.rowKey] ? "1px solid #86efac" : "1px solid #fdba74",
                  background: issuedItemsMap[selectedRow.rowKey] ? "#f0fdf4" : "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 800, color: issuedItemsMap[selectedRow.rowKey] ? "#166534" : "#9a3412" }}>
                    {issuedItemsMap[selectedRow.rowKey] ? "✓ Item Handed Over to Requester" : "⌛ Pending Physical Handoff"}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Toggle when the item is physically collected by the requester.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleItemIssued(selectedRow.rowKey)}
                  style={{
                    border: "none",
                    background: issuedItemsMap[selectedRow.rowKey] ? "#166534" : "#ea580c",
                    color: "#ffffff",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  }}
                >
                  {issuedItemsMap[selectedRow.rowKey] ? "Mark as Pending" : "Mark as Issued"}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "12px 20px", background: "var(--color-surface-offset)", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderRadius: 6,
                  padding: "6px 16px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
