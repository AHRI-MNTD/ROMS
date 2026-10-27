import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { RequestReferenceRow, getApproverForProject } from "./RequestReferenceTable";
import betiSignatureUrl from "../../../assets/Beti_Signature.png";
import logoAhri from "../../../assets/logo_ahri.png";

const approvedStatusStyles: Record<"APPROVED" | "PARTIAL", React.CSSProperties> = {
  APPROVED: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  PARTIAL: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" },
};

interface ApprovedRequestGroup {
  key: string;
  rows: RequestReferenceRow[];
  representative: RequestReferenceRow;
  totalQuantity: number;
  allIssued: boolean;
}

function getHandoffDate(rows: RequestReferenceRow[]): string {
  for (const row of rows) {
    const match = row.remark?.match(/\[(?:DISBURSED|ISSUED) on ([^\]]+)\]/i);
    if (match?.[1]) {
      const dateText = match[1].split(/ by /i)[0];
      const parsed = new Date(dateText);
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString();
      return dateText;
    }
  }
  return "—";
}

export default function ApprovedRequestsPage() {
  const queryClient = useQueryClient();

  // Fetch requests from API
  const { data: persistedRequests, isLoading, refetch } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests", { params: { all: "true" } });
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

  // Track physically issued/handed over items with server persistence + local optimistic state
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

  const isRowIssued = (row: RequestReferenceRow): boolean => {
    if (issuedItemsMap[row.rowKey] !== undefined) {
      return issuedItemsMap[row.rowKey];
    }
    return Boolean(row.isDisbursed);
  };

  const toggleGroupIssued = async (group: ApprovedRequestGroup) => {
    const nextStatus = !group.allIssued;
    let reversalReason = "";
    if (!nextStatus) {
      const reason = window.prompt("Reversing a recorded disbursement requires a documented reason for audit compliance. Please provide a reason:");
      if (!reason || !reason.trim()) {
        return;
      }
      reversalReason = reason.trim();
    }

    setIssuedItemsMap((prev) => {
      const next = { ...prev };
      group.rows.forEach((row) => { next[row.rowKey] = nextStatus; });
      return next;
    });

    try {
      await Promise.all(group.rows.filter((row) => row.movementId).map((row) =>
        apiClient.patch(`/domains/inventory/requests/${row.movementId}/disburse`, {
          disbursed: nextStatus,
          reason: !nextStatus ? reversalReason : undefined,
        })
      ));
      await queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
    } catch (err: any) {
      console.error("Failed to update handoff status for request:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to update handoff status";
      alert(errMsg);
      setIssuedItemsMap((prev) => {
        const next = { ...prev };
        group.rows.forEach((row) => { delete next[row.rowKey]; });
        return next;
      });
      await refetch();
    }
  };

  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Projects list for dropdown
  const uniqueProjects = useMemo(() => {
    const list = new Set<string>();
    approvedRows.forEach((r) => {
      if (r.project) list.add(r.project);
    });
    return Array.from(list).sort();
  }, [approvedRows]);

  const requestGroups = useMemo<ApprovedRequestGroup[]>(() => {
    const grouped = new Map<string, RequestReferenceRow[]>();
    approvedRows.forEach((row) => {
      const key = row.requestBatchId ? `batch:${row.requestBatchId}` : `row:${row.rowKey}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    return Array.from(grouped, ([key, rows]) => ({
      key,
      rows,
      representative: rows[0],
      totalQuantity: rows.reduce((sum, row) => sum + Number(row.acceptedQuantity ?? row.quantity ?? 0), 0),
      allIssued: rows.every((row) => isRowIssued(row)),
    })).sort((a, b) => new Date(b.representative.decisionAt ?? b.representative.dateRequested).getTime() - new Date(a.representative.decisionAt ?? a.representative.dateRequested).getTime());
  }, [approvedRows, issuedItemsMap]);

  const filteredGroups = useMemo(() => requestGroups.filter((group) => {
    const term = searchTerm.toLowerCase().trim();
    return group.rows.some((row) => {
      if (selectedProject !== "ALL" && row.project !== selectedProject) return false;
      if (!term) return true;
      const searchable = [row.requestBatchId, row.movementId, row.rowKey, row.itemDescription, row.codeNo, row.requestedBy, row.requestedFor, row.project, row.approver || getApproverForProject(row.project)].join(" ").toLowerCase();
      return searchable.includes(term);
    });
  }), [requestGroups, searchTerm, selectedProject]);

  const pendingHandoffGroups = filteredGroups.filter((group) => !group.allIssued);
  const completedHandoffGroups = filteredGroups.filter((group) => group.allIssued);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalApproved = requestGroups.length;
    const totalQuantityApproved = approvedRows.reduce(
      (sum, r) => sum + Number(r.acceptedQuantity ?? r.quantity ?? 0),
      0
    );
    const totalIssuedCount = requestGroups.filter((group) => group.allIssued).length;
    const pendingHandoffCount = totalApproved - totalIssuedCount;

    return { totalApproved, totalQuantityApproved, totalIssuedCount, pendingHandoffCount };
  }, [approvedRows, requestGroups]);

  const selectedGroup = requestGroups.find((group) => group.key === selectedGroupKey) ?? null;
  const printHandoffReport = () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1500);
  };

  const renderHandoffTable = (title: string, groups: ApprovedRequestGroup[], completed: boolean) => (
    <section style={{ padding: 14, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "var(--color-text)" }}>{title}</h3>
        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "9.5px", fontWeight: 800, background: completed ? "#dcfce7" : "#fff7ed", color: completed ? "#166534" : "#9a3412" }}>{groups.length} request{groups.length === 1 ? "" : "s"}</span>
      </div>
      <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", borderRadius: 8, overflowX: "auto", background: "var(--color-surface-2)" }}>
        <table style={{ width: "100%", minWidth: 850, borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead><tr style={{ background: "var(--color-surface-offset)", textAlign: "left" }}>
            {[["Request", "14%"], ["Items", "24%"], ["Total Qty", "9%"], ["Requested By", "13%"], ["Requested For", "13%"], ["Project", "12%"], ["Decision Date", "15%"]].map(([label, width]) => <th key={label} style={{ width, padding: "9px 10px", fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} style={{ padding: 18, textAlign: "center", color: "var(--color-text-muted)", fontSize: "11px" }}>Loading approved requests...</td></tr>
              : groups.length === 0 ? <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: "11px" }}>{completed ? "No completed handoffs yet." : "No pending handoffs."}</td></tr>
                : groups.map((group) => {
                  const row = group.representative;
                  const trackingId = row.requestBatchId ?? row.movementId ?? row.rowKey;
                  const itemNames = group.rows.map((item) => `${item.codeNo && item.codeNo !== "—" ? `${item.codeNo} — ` : ""}${item.itemDescription}`);
                  const itemSummary = group.rows.length > 1 ? `${group.rows.length} item(s)` : itemNames[0];
                  return <tr key={group.key} onClick={() => setSelectedGroupKey(group.key)} style={{ borderTop: "1px solid var(--color-divider)", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary-soft)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "9px 10px", color: "var(--color-primary)", fontWeight: 750, fontSize: "10.5px" }} title={String(trackingId)}>{String(trackingId).slice(-8).toUpperCase()}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text)", fontWeight: 650, fontSize: "10.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={itemNames.join("; ")}>{itemSummary}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 800, color: "var(--color-text)" }}>{group.totalQuantity}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-muted)", fontSize: "10.5px" }}>{row.requestedBy || "—"}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-muted)", fontSize: "10.5px" }}>{row.requestedFor || "—"}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-muted)", fontSize: "10.5px" }}>{row.project || "—"}</td>
                    <td style={{ padding: "9px 10px", color: "var(--color-text-muted)", fontSize: "10.5px" }}>{row.decisionAt ? new Date(row.decisionAt).toLocaleDateString() : "—"}</td>
                  </tr>;
                })}
          </tbody>
        </table>
      </div>
    </section>
  );

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

      {/* ── Handoff Tables and Request Details ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-text)" }}>Handoff Queue</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, Item, Requester, Project..."
            style={{ minWidth: 260, border: "1px solid var(--color-border)", borderRadius: 6, background: "var(--color-surface)", color: "var(--color-text)", padding: "6px 10px", fontSize: "11px", height: 32 }}
          />
          {uniqueProjects.length > 0 && (
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ border: "1px solid var(--color-border)", borderRadius: 6, background: "var(--color-surface)", color: "var(--color-text)", padding: "6px 10px", fontSize: "11px", height: 32, fontWeight: 600 }}>
              <option value="ALL">All Projects</option>
              {uniqueProjects.map((project) => <option key={project} value={project}>{project}</option>)}
            </select>
          )}
        </div>
      </div>

      {selectedGroup ? (selectedGroup.allIssued ? (
        <>
          <style>{`
            .handoff-report { background: #fff !important; color: #111827 !important; }
            @page { size: A4 portrait; margin: 0; }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * { visibility: hidden !important; }
              #handoff-report, #handoff-report * { visibility: visible !important; }
              #handoff-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 14mm 16mm !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
              }
              .handoff-report-toolbar { display: none !important; }
              .handoff-report-section { break-inside: avoid; }
            }
          `}</style>
          <div className="handoff-report-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setSelectedGroupKey(null)} style={{ padding: "7px 12px", border: "1px solid var(--color-border)", borderRadius: 7, background: "var(--color-surface)", color: "var(--color-text)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>← Back to Handoff Tables</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={printHandoffReport} style={{ padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: 7, background: "var(--color-surface)", color: "var(--color-text)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Print Report</button>
              <button type="button" onClick={printHandoffReport} style={{ padding: "8px 14px", border: "none", borderRadius: 7, background: "var(--color-primary)", color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Download PDF</button>
            </div>
          </div>

          <article id="handoff-report" className="handoff-report" style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "32px 38px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#111827", boxShadow: "0 8px 28px rgba(15,23,42,0.08)", fontFamily: "Arial, sans-serif" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, paddingBottom: 16, borderBottom: "2px solid #0f766e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img src={logoAhri} alt="AHRI Logo" style={{ height: 50, width: 50, objectFit: "contain", borderRadius: 6 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f766e", letterSpacing: "0.04em", textTransform: "uppercase" }}>Armauer Hansen Research Institute (AHRI)</div>
                  <h1 style={{ margin: "3px 0 2px", fontSize: 20, fontWeight: 800, color: "#111827" }}>Inventory Handoff Report</h1>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>ROMS · Material Requisition Issue & Handover Record</div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, lineHeight: 1.7, color: "#4b5563" }}>
                <div><strong>Request ID</strong></div>
                <div style={{ color: "#0f766e", fontWeight: 700 }}>{selectedGroup.representative.requestBatchId ?? selectedGroup.representative.movementId ?? selectedGroup.representative.rowKey}</div>
                <div style={{ marginTop: 2 }}><strong>Handoff Date</strong></div>
                <div style={{ fontWeight: 600 }}>{getHandoffDate(selectedGroup.rows)}</div>
              </div>
            </header>

            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 13, color: "#111827" }}>Requester Information</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {[
                  ["Requested By", selectedGroup.representative.requestedBy || "—"],
                  ["Requested For", selectedGroup.representative.requestedFor || "—"],
                  ["Project", selectedGroup.representative.project || "—"],
                  ["Team", selectedGroup.representative.team || "—"],
                  ["Date Requested", selectedGroup.representative.dateRequested || "—"],
                ].map(([label, value]) => <div key={label} style={{ fontSize: 10, lineHeight: 1.5 }}><div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>{label}</div><div style={{ color: "#111827", fontWeight: 600 }}>{value}</div></div>)}
              </div>
            </section>

            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 13, color: "#111827" }}>Items Issued</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  {["#", "Item Name", "Item Code", "Approved Quantity", "Unit"].map((heading) => <th key={heading} style={{ padding: "9px 8px", border: "1px solid #d1d5db", color: "#374151", fontSize: 8, textTransform: "uppercase" }}>{heading}</th>)}
                </tr></thead>
                <tbody>{selectedGroup.rows.map((item, index) => <tr key={item.rowKey}>
                  <td style={{ padding: "9px 8px", border: "1px solid #d1d5db" }}>{index + 1}</td>
                  <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 600 }}>{item.itemDescription}</td>
                  <td style={{ padding: "9px 8px", border: "1px solid #d1d5db" }}>{item.codeNo || "—"}</td>
                  <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 700 }}>{item.acceptedQuantity ?? item.quantity}</td>
                  <td style={{ padding: "9px 8px", border: "1px solid #d1d5db" }}>{item.unit}</td>
                </tr>)}</tbody>
                <tfoot><tr><td colSpan={3} style={{ padding: "9px 8px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: 700 }}>Total Units</td><td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800 }}>{selectedGroup.totalQuantity}</td><td style={{ border: "1px solid #d1d5db" }} /></tr></tfoot>
              </table>
            </section>

            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 13, color: "#111827" }}>Approval Record</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                <div style={{ fontSize: 10 }}><div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Authorized Approver</div><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedGroup.representative.approver || getApproverForProject(selectedGroup.representative.project)}</div></div>
                <div style={{ fontSize: 10 }}><div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Approved Date</div><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedGroup.representative.decisionAt ? new Date(selectedGroup.representative.decisionAt).toLocaleString() : "—"}</div></div>
              </div>
            </section>

            <section className="handoff-report-section" style={{ marginTop: 34, paddingTop: 18, borderTop: "1px solid #d1d5db", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Handed Over By</div>
                <img src={betiSignatureUrl} alt="Betelhem Ashagrie signature" style={{ display: "block", width: 132, height: 78, objectFit: "contain", objectPosition: "left center", margin: "5px 0 -1px" }} />
                <div style={{ width: 210, borderTop: "1px solid #374151", paddingTop: 5, fontSize: 11, fontWeight: 700 }}>Betelhem Ashagrie</div>
                <div style={{ marginTop: 3, fontSize: 9, color: "#6b7280" }}>Inventory Officer · Handoff Date: {getHandoffDate(selectedGroup.rows)}</div>
              </div>
              <div style={{ alignSelf: "end", fontSize: 9, lineHeight: 1.6, color: "#6b7280", textAlign: "right" }}>This report confirms the inventory items listed above were issued to the requesting personnel.</div>
            </section>
          </article>
        </>
      ) : (
        <section style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>Request Details</h2>
                <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "9px", fontWeight: 800, textTransform: "uppercase", background: selectedGroup.allIssued ? "#dcfce7" : "#fff7ed", color: selectedGroup.allIssued ? "#166534" : "#9a3412" }}>{selectedGroup.allIssued ? "Handed Over" : "Pending Handoff"}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: "10px", color: "var(--color-text-muted)" }}>Request ID: {selectedGroup.representative.requestBatchId ?? selectedGroup.representative.movementId ?? selectedGroup.representative.rowKey}</div>
            </div>
            <button type="button" onClick={() => setSelectedGroupKey(null)} style={{ padding: "7px 12px", border: "1px solid var(--color-border)", borderRadius: 7, background: "var(--color-surface)", color: "var(--color-text)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>← Back to Handoff Tables</button>
          </div>

          <section>
            <h3 style={{ margin: "0 0 9px", fontSize: "11px", fontWeight: 800, color: "var(--color-text)" }}>Requester Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 9 }}>
              {[
                ["Requested By", selectedGroup.representative.requestedBy || "—"],
                ["Requested For", selectedGroup.representative.requestedFor || "—"],
                ["Project", selectedGroup.representative.project || "—"],
                ["Authorized Approver", selectedGroup.representative.approver || getApproverForProject(selectedGroup.representative.project)],
                ["Date Requested", selectedGroup.representative.dateRequested || "—"],
                ["Decision Date", selectedGroup.representative.decisionAt ? new Date(selectedGroup.representative.decisionAt).toLocaleString() : "—"],
                ["Team", selectedGroup.representative.team || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "11px 12px", border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-surface)" }}>
                  <div style={{ marginBottom: 4, fontSize: "9px", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-muted)" }}>{label}</div>
                  <div style={{ fontSize: "11.5px", fontWeight: 650, color: "var(--color-text)", overflowWrap: "anywhere" }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "var(--color-text)" }}>Items in this request</h3>
              <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{selectedGroup.rows.length} item(s) · {selectedGroup.totalQuantity} total units</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 9 }}>
              {selectedGroup.rows.map((item) => (
                <div key={item.rowKey} style={{ padding: "12px 13px", border: "1px solid var(--color-border)", borderRadius: 9, background: "var(--color-surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)" }}>{item.itemDescription}</div>
                    <div style={{ whiteSpace: "nowrap", padding: "3px 7px", borderRadius: 6, background: "var(--color-primary-soft)", color: "var(--color-primary)", fontSize: "10px", fontWeight: 800 }}>{item.acceptedQuantity ?? item.quantity} {item.unit}</div>
                  </div>
                  <div style={{ marginTop: 5, fontSize: "10px", color: "var(--color-text-muted)" }}>Code: {item.codeNo || "—"} · {item.unitDescription || `${item.unit} per pack`}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ margin: "0 0 9px", fontSize: "11px", fontWeight: 800, color: "var(--color-text)" }}>Remark</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {selectedGroup.rows.filter((item) => item.remark?.trim()).length === 0 ? (
                <div style={{ padding: "11px 12px", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text-muted)", background: "var(--color-surface)", fontSize: "10.5px" }}>No remarks for this request.</div>
              ) : selectedGroup.rows.filter((item) => item.remark?.trim()).map((item) => (
                <div key={`remark-${item.rowKey}`} style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)", background: "var(--color-surface)", fontSize: "10.5px" }}>
                  <strong>{item.itemDescription}: </strong>{item.remark}
                </div>
              ))}
            </div>
          </section>

          {!selectedGroup.allIssued && (
            <div style={{ padding: "13px 15px", border: "1px solid #fdba74", borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#9a3412" }}>⌛ Pending Physical Handoff</div>
                <div style={{ marginTop: 3, fontSize: "10.5px", color: "var(--color-text-muted)" }}>Mark this request complete after all listed items are physically handed over.</div>
              </div>
              <button type="button" onClick={() => toggleGroupIssued(selectedGroup)} style={{ border: "none", background: "#ea580c", color: "#fff", borderRadius: 7, padding: "8px 16px", fontSize: "11px", fontWeight: 750, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>Mark as Issued</button>
            </div>
          )}
        </section>
      )) : (
        <>
          {renderHandoffTable("Pending Handoff", pendingHandoffGroups, false)}
          {renderHandoffTable("Handoff Reference Table", completedHandoffGroups, true)}
        </>
      )}
    </div>
  );
}
