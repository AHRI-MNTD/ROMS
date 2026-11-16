import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import { RequestReferenceRow, getApproverForProject } from "./RequestReferenceTable";
import betiSignatureUrl from "../../../../assets/Beti_Signature.png";
import logoAhri from "../../../../assets/logo_ahri.png";

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

  // Fetch approved & partial requests from API
  const { data: persistedRequests, isLoading, refetch } = useQuery({
    queryKey: ["inventory-requests", "approved"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests", {
        params: { status: "APPROVED,PARTIAL", all: "true" },
      });
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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDisbursing, setIsDisbursing] = useState(false);

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

    setIsDisbursing(true);
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
      setFeedback({
        type: "success",
        message: nextStatus
          ? "Inventory hand-off recorded successfully! Physical materials marked as issued."
          : "Inventory hand-off reversed successfully.",
      });
    } catch (err: any) {
      console.error("Failed to update handoff status for request:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to update handoff status";
      setFeedback({ type: "error", message: errMsg });
      setIssuedItemsMap((prev) => {
        const next = { ...prev };
        group.rows.forEach((row) => { delete next[row.rowKey]; });
        return next;
      });
      await refetch();
    } finally {
      setIsDisbursing(false);
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
    const requester = selectedGroup?.representative?.requestedFor || selectedGroup?.representative?.requestedBy || "Personnel";
    let rawDate: string | undefined;
    if (selectedGroup) {
      for (const row of selectedGroup.rows) {
        const match = row.remark?.match(/\[(?:DISBURSED|ISSUED) on ([^\]]+)\]/i);
        if (match?.[1]) {
          rawDate = match[1].split(/ by /i)[0];
          break;
        }
      }
      if (!rawDate) {
        rawDate = selectedGroup.representative.decisionAt || selectedGroup.representative.dateRequested;
      }
    }
    const dateStr = rawDate && !Number.isNaN(new Date(rawDate).getTime())
      ? new Date(rawDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const sanitizedRequester = requester.trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
    document.title = `AHRI_Inventory_Handoff_${sanitizedRequester}_${dateStr}`;
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
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: "12px",
            fontWeight: 600,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              color: "inherit",
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {selectedGroup ? (
        /* ══════════════════════════════════════════════════════════════════════
           DEDICATED DETAIL PAGE VIEW WITH PRINT & DOWNLOAD
           ══════════════════════════════════════════════════════════════════════ */
        <>
          <style>{`
            .handoff-report { background: #ffffff !important; color: #111827 !important; }
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

          {/* Dedicated Page Toolbar */}
          <div
            className="handoff-report-toolbar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              padding: "4px 0",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedGroupKey(null)}
              style={{
                padding: "8px 14px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              ← Back to Approved Requisitions
            </button>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={printHandoffReport}
                style={{
                  padding: "8px 14px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 7,
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                🖨️ Print Report
              </button>
              <button
                type="button"
                onClick={printHandoffReport}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  borderRadius: 7,
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.25)",
                }}
              >
                📥 Download PDF
              </button>
            </div>
          </div>

          {/* Printable Official Inventory Handoff Voucher Article */}
          <article
            id="handoff-report"
            className="handoff-report"
            style={{
              width: "100%",
              maxWidth: 960,
              margin: "0 auto",
              padding: "36px 42px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              background: "#ffffff",
              color: "#111827",
              boxShadow: "0 8px 28px rgba(15,23,42,0.08)",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {/* AHRI Header */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, paddingBottom: 16, borderBottom: "2px solid #0f766e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={logoAhri}
                  alt="AHRI Logo"
                  style={{ height: 54, width: 54, objectFit: "contain", borderRadius: 8 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f766e", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Armauer Hansen Research Institute (AHRI)
                  </div>
                  <h1 style={{ margin: "3px 0 2px", fontSize: 20, fontWeight: 800, color: "#111827" }}>
                    Laboratory Inventory Issuance &amp; Hand-Off Voucher
                  </h1>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>
                    ROMS · Material Requisition Issue &amp; Chain-of-Custody Record
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, lineHeight: 1.7, color: "#4b5563" }}>
                <div><strong>Requisition ID</strong></div>
                <div style={{ color: "#0f766e", fontWeight: 700, fontFamily: "monospace", fontSize: 11 }}>
                  {selectedGroup.representative.requestBatchId ?? selectedGroup.representative.movementId ?? selectedGroup.representative.rowKey}
                </div>
                <div style={{ marginTop: 2 }}><strong>Handoff Status</strong></div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      background: selectedGroup.allIssued ? "#dcfce7" : "#fff7ed",
                      color: selectedGroup.allIssued ? "#166534" : "#9a3412",
                      border: `1px solid ${selectedGroup.allIssued ? "#86efac" : "#fdba74"}`,
                    }}
                  >
                    {selectedGroup.allIssued ? "Handed Over / Disbursed" : "Approved · Pending Hand-Off"}
                  </span>
                </div>
              </div>
            </header>

            {/* Requester & Project Details */}
            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                1. Requisition &amp; Project Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                {[
                  ["Requested By", selectedGroup.representative.requestedBy || "—"],
                  ["Recipient (Requested For)", selectedGroup.representative.requestedFor || selectedGroup.representative.requestedBy || "—"],
                  ["Target Research Project", selectedGroup.representative.project || "General Inventory"],
                  ["Team / Department", selectedGroup.representative.team || "General Operations"],
                  ["Date Requested", selectedGroup.representative.dateRequested || "—"],
                  ["Date Approved", selectedGroup.representative.decisionAt ? new Date(selectedGroup.representative.decisionAt).toLocaleDateString() : "—"],
                  ["Requisition Status", selectedGroup.allIssued ? "DISBURSED (Handed Over)" : "APPROVED (Ready for Hand-off)"],
                ].map(([label, value]) => (
                  <div key={label} style={{ fontSize: 10, lineHeight: 1.5 }}>
                    <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>{label}</div>
                    <div style={{ color: "#111827", fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Items Issued Table */}
            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                2. Inventory Items Issued &amp; Specifications
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    {["#", "Item Description", "Item Code / SKU", "Approved Quantity", "Unit", "Packaging Description"].map((heading) => (
                      <th key={heading} style={{ padding: "9px 8px", border: "1px solid #d1d5db", color: "#374151", fontSize: 8, textTransform: "uppercase", fontWeight: 700 }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup.rows.map((item, index) => (
                    <tr key={item.rowKey}>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", textAlign: "center" }}>{index + 1}</td>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 700, color: "#0f766e" }}>
                        {item.itemDescription}
                      </td>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontFamily: "monospace" }}>
                        {item.codeNo || "—"}
                      </td>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800, color: "#15803d" }}>
                        {item.acceptedQuantity ?? item.quantity}
                      </td>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 700 }}>
                        {item.unit}
                      </td>
                      <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", color: "#4b5563" }}>
                        {item.unitDescription || `${item.unit} standard unit`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "9px 8px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: 700 }}>
                      Total Inventory Items Issued
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800, color: "#15803d" }}>
                      {selectedGroup.totalQuantity}
                    </td>
                    <td colSpan={2} style={{ border: "1px solid #d1d5db", padding: "9px 8px", fontSize: 9, color: "#6b7280" }}>
                      {selectedGroup.rows.length} line item(s) in requisition
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Requester Remark / Justification */}
            {selectedGroup.rows.some((item) => item.remark?.trim()) && (
              <section className="handoff-report-section" style={{ marginTop: 22 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  3. Requisition Remarks &amp; Notes
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", fontSize: 10, color: "#374151" }}>
                  {selectedGroup.rows
                    .filter((item) => item.remark?.trim())
                    .map((item) => (
                      <div key={`rem-${item.rowKey}`}>
                        <strong style={{ color: "#111827" }}>{item.itemDescription}:</strong> {item.remark}
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Approval & Verification Record */}
            <section className="handoff-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                4. Approval Authorization Record
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                <div style={{ fontSize: 10 }}>
                  <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Authorized Approver</div>
                  <div style={{ marginTop: 3, fontWeight: 700, color: "#0f766e" }}>
                    {selectedGroup.representative.approver || getApproverForProject(selectedGroup.representative.project)}
                  </div>
                </div>
                <div style={{ fontSize: 10 }}>
                  <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Authorization Date</div>
                  <div style={{ marginTop: 3, fontWeight: 700 }}>
                    {selectedGroup.representative.decisionAt ? new Date(selectedGroup.representative.decisionAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            </section>

            {/* Official Signatures & Chain of Custody */}
            <section className="handoff-report-section" style={{ marginTop: 34, paddingTop: 18, borderTop: "1px solid #d1d5db", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Handed Over By (Storekeeper / Inventory Officer)</div>
                <img
                  src={betiSignatureUrl}
                  alt="Betelhem Ashagrie signature"
                  style={{ display: "block", width: 140, height: 74, objectFit: "contain", objectPosition: "left center", margin: "5px 0 -1px" }}
                />
                <div style={{ width: 220, borderTop: "1px solid #374151", paddingTop: 5, fontSize: 11, fontWeight: 700 }}>
                  Betelhem Ashagrie
                </div>
                <div style={{ marginTop: 3, fontSize: 9, color: "#6b7280" }}>
                  Inventory Storekeeper · Handoff: {selectedGroup.allIssued ? getHandoffDate(selectedGroup.rows) : "Pending Physical Hand-Off"}
                </div>
              </div>

              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Received By (Recipient Staff)</div>
                <div style={{ height: 50 }} />
                <div style={{ width: 220, borderTop: "1px solid #374151", paddingTop: 5, fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                  {selectedGroup.representative.requestedFor || selectedGroup.representative.requestedBy || "Recipient"}
                </div>
                <div style={{ marginTop: 3, fontSize: 9, color: "#6b7280" }}>
                  Laboratory Personnel / Investigator
                </div>
              </div>
            </section>
          </article>

          {/* Action / Status Banner */}
          {!selectedGroup.allIssued ? (
            <div
              className="handoff-report-toolbar"
              style={{
                maxWidth: 960,
                margin: "18px auto 0",
                padding: "14px 18px",
                border: "1px solid #fdba74",
                borderRadius: 10,
                background: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.08)",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#9a3412", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⌛ Pending Physical Item Hand-Off</span>
                </div>
                <div style={{ marginTop: 3, fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                  Inventory items have been allocated and manager-approved. Mark this requisition complete once physical materials are handed over to {selectedGroup.representative.requestedFor || selectedGroup.representative.requestedBy || "the requester"}.
                </div>
              </div>
              <button
                type="button"
                disabled={isDisbursing}
                onClick={() => toggleGroupIssued(selectedGroup)}
                style={{
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  borderRadius: 7,
                  padding: "9px 20px",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                  transition: "all 0.2s ease",
                }}
              >
                {isDisbursing ? "Recording Hand-Off…" : "🤝 Mark as Handed Over / Issued"}
              </button>
            </div>
          ) : (
            <div
              className="handoff-report-toolbar"
              style={{
                maxWidth: 960,
                margin: "18px auto 0",
                padding: "12px 18px",
                border: "1px solid #86efac",
                borderRadius: 10,
                background: "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "11.5px", color: "#166534", fontWeight: 650 }}>
                ✓ This requisition has been fully issued and disbursed to {selectedGroup.representative.requestedFor || selectedGroup.representative.requestedBy || "recipient"}.
              </div>
              <button
                type="button"
                disabled={isDisbursing}
                onClick={() => toggleGroupIssued(selectedGroup)}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#b91c1c",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Undo Disbursement
              </button>
            </div>
          )}
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           STANDARD APPROVED REQUISITIONS FEED VIEW
           ══════════════════════════════════════════════════════════════════════ */
        <>
          {/* ── Top Hero & Notification Banner for Inventory Worker ── */}
          <div
            style={{
              padding: 18,
              borderRadius: "var(--radius)",
              background: "var(--inventory-card-bg)",
              border: "1px solid var(--color-primary-highlight)",
              boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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

          {/* ── Summary Cards (Subtle near-white gradient with interactive hover action) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              {
                id: "total",
                label: "Total Approved Requisitions",
                icon: "📋",
                value: metrics.totalApproved,
                sub: "Active approved batches",
                tone: "#0284c7",
              },
              {
                id: "units",
                label: "Total Approved Units",
                icon: "📦",
                value: metrics.totalQuantityApproved,
                sub: "Cumulative across items",
                tone: "#10b981",
              },
              {
                id: "pending",
                label: "Pending Handoff",
                icon: "⌛",
                value: metrics.pendingHandoffCount,
                sub: "Awaiting physical hand-off",
                tone: "#ea580c",
              },
              {
                id: "completed",
                label: "Completed Handoffs",
                icon: "🤝",
                value: metrics.totalIssuedCount,
                sub: "Disbursed to researchers",
                tone: "#3b82f6",
              },
            ].map((card) => {
              const isHovered = hoveredCard === card.id;

              const background = isDarkMode
                ? isHovered
                  ? `linear-gradient(145deg, ${card.tone}18 0%, #0f1a2e 100%)`
                  : "linear-gradient(145deg, #182234 0%, #0f172a 100%)"
                : isHovered
                ? `linear-gradient(145deg, #ffffff 35%, ${card.tone}12 100%)`
                : `linear-gradient(145deg, #ffffff 50%, ${card.tone}0a 100%)`;

              const border = isHovered
                ? `1px solid ${card.tone}66`
                : isDarkMode
                ? "1px solid rgba(255, 255, 255, 0.08)"
                : "1px solid var(--color-border)";

              const boxShadow = isHovered
                ? `0 6px 18px rgba(0, 0, 0, 0.08), 0 0 0 1px ${card.tone}22`
                : "0 2px 6px rgba(0, 0, 0, 0.03)";

              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border,
                    background,
                    boxShadow,
                    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: isHovered ? card.tone : "var(--color-text-muted)",
                        transition: "color 0.2s ease",
                      }}
                    >
                      {card.label}
                    </span>
                    <span style={{ fontSize: "15px" }}>{card.icon}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: isHovered ? card.tone : "var(--color-text)",
                      marginTop: 2,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: isHovered ? card.tone : "var(--color-text-muted)",
                      marginTop: 2,
                      opacity: 0.9,
                    }}
                  >
                    {card.sub}
                  </div>
                </div>
              );
            })}
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

          {renderHandoffTable("Pending Handoff", pendingHandoffGroups, false)}
          {renderHandoffTable("Handoff Reference Table", completedHandoffGroups, true)}
        </>
      )}
    </div>
  );
}
