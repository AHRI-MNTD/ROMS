import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { useReagentRequests } from "./useReagentData";
import { ReagentRequest, formatStorageCondition, getStorageBadgeMeta } from "./reagentShared";
import logoAhri from "../../../../assets/logo_ahri.png";
import tegbarSignatureUrl from "../../../../assets/Tegbar Signiture.png";

export default function ReagentApprovedRequestsPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();

  // Load APPROVED and PARTIAL reagent requests
  const { data: requestsData, isLoading, refetch } = useReagentRequests("APPROVED,PARTIAL");
  const approvedRequests = useMemo(() => requestsData?.data ?? [], [requestsData?.data]);

  // Mark all viewed requests as seen in localStorage
  useEffect(() => {
    if (approvedRequests.length === 0) return;
    try {
      const saved = localStorage.getItem("roms_seen_reagent_approved");
      const seenMap: Record<string, boolean> = saved ? JSON.parse(saved) : {};
      let changed = false;
      for (const r of approvedRequests) {
        if (!seenMap[r.id]) {
          seenMap[r.id] = true;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("roms_seen_reagent_approved", JSON.stringify(seenMap));
        window.dispatchEvent(new Event("roms-reagent-request-updated"));
      }
    } catch {}
  }, [approvedRequests]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [handoffFilter, setHandoffFilter] = useState<"ALL" | "PENDING_HANDOFF" | "DISBURSED">("ALL");
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

  // Selected request for dedicated detail page view
  const [selectedRequest, setSelectedRequest] = useState<ReagentRequest | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const printHandoffReport = () => {
    const previousTitle = document.title;
    const requester = selectedRequest?.requestedFor || selectedRequest?.requestedBy || "Personnel";
    const rawDate = selectedRequest?.disbursedAt || selectedRequest?.decisionAt || selectedRequest?.createdAt;
    const dateStr = rawDate && !Number.isNaN(new Date(rawDate).getTime())
      ? new Date(rawDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const sanitizedRequester = requester.trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
    document.title = `AHRI_Reagent_Handoff_${sanitizedRequester}_${dateStr}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1500);
  };

  // Disbursement / Hand-off Mutation
  const disburseMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const resp = await apiClient.patch(`/domains/reagent-inventory/requests/${requestId}/disburse`);
      return resp.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reagent-requests"] });
      window.dispatchEvent(new Event("roms-reagent-request-updated"));
      setFeedback({
        type: "success",
        message: "Reagent hand-off recorded successfully! Physical materials marked as disbursed.",
      });
      if (selectedRequest) {
        setSelectedRequest((prev) => (prev ? { ...prev, disbursedAt: new Date().toISOString() } : null));
      }
    },
    onError: (err) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Failed to record reagent hand-off."),
      });
    },
  });

  const handleDisburse = (req: ReagentRequest) => {
    disburseMutation.mutate(req.id);
  };

  // Filtered list
  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return approvedRequests.filter((r) => {
      if (projectFilter !== "ALL" && r.projectFor !== projectFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (handoffFilter === "PENDING_HANDOFF" && r.disbursedAt) return false;
      if (handoffFilter === "DISBURSED" && !r.disbursedAt) return false;
      if (!q) return true;
      return (
        r.assayType.toLowerCase().includes(q) ||
        (r.reagentType ?? "").toLowerCase().includes(q) ||
        (r.projectFor ?? "").toLowerCase().includes(q) ||
        (r.requestedBy ?? "").toLowerCase().includes(q) ||
        (r.requestedFor ?? "").toLowerCase().includes(q) ||
        (r.reagentItem?.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [approvedRequests, projectFilter, statusFilter, handoffFilter, searchTerm]);

  const uniqueProjects = useMemo(
    () => Array.from(new Set(approvedRequests.map((r) => r.projectFor).filter((p): p is string => Boolean(p)))),
    [approvedRequests]
  );

  const metrics = useMemo(() => {
    const totalApproved = approvedRequests.length;
    const completedHandoffs = approvedRequests.filter((r) => Boolean(r.disbursedAt)).length;
    const pendingHandoff = totalApproved - completedHandoffs;
    const totalVills = approvedRequests.reduce((sum, r) => sum + (Number(r.numberOfVill) || 0), 0);
    return { totalApproved, completedHandoffs, pendingHandoff, totalVills };
  }, [approvedRequests]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Feedback Message ── */}
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: "12px",
            fontWeight: 600,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {selectedRequest ? (
        /* ══════════════════════════════════════════════════════════════════════
           DEDICATED DETAIL PAGE VIEW WITH PRINT & DOWNLOAD
           ══════════════════════════════════════════════════════════════════════ */
        <>
          <style>{`
            .reagent-handoff-report { background: #fff !important; color: #111827 !important; }
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
              #reagent-handoff-report, #reagent-handoff-report * { visibility: visible !important; }
              #reagent-handoff-report {
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
              .reagent-report-toolbar { display: none !important; }
              .reagent-report-section { break-inside: avoid; }
            }
          `}</style>

          {/* Dedicated Page Toolbar */}
          <div
            className="reagent-report-toolbar"
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
              onClick={() => setSelectedRequest(null)}
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

          {/* Printable Official Reagent Handoff Voucher Article */}
          <article
            id="reagent-handoff-report"
            className="reagent-handoff-report"
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
                    Laboratory Reagent Issuance &amp; Hand-Off Voucher
                  </h1>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>
                    ROMS · Cold-Chain Reagent Requisition &amp; Chain-of-Custody Record
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, lineHeight: 1.7, color: "#4b5563" }}>
                <div><strong>Requisition ID</strong></div>
                <div style={{ color: "#0f766e", fontWeight: 700, fontFamily: "monospace", fontSize: 11 }}>
                  {selectedRequest.id}
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
                      background: selectedRequest.disbursedAt ? "#dcfce7" : "#fff7ed",
                      color: selectedRequest.disbursedAt ? "#166534" : "#9a3412",
                      border: `1px solid ${selectedRequest.disbursedAt ? "#86efac" : "#fdba74"}`,
                    }}
                  >
                    {selectedRequest.disbursedAt ? "Handed Over / Disbursed" : "Approved · Pending Hand-Off"}
                  </span>
                </div>
              </div>
            </header>

            {/* Requester & Protocol Information */}
            <section className="reagent-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                1. Requisition &amp; Research Protocol Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                {[
                  ["Requested By", selectedRequest.requestedBy || "—"],
                  ["Recipient (Requested For)", selectedRequest.requestedFor || selectedRequest.requestedBy || "—"],
                  ["Target Research Project", selectedRequest.projectFor || "MNTD"],
                  ["Assay Type / Protocol", selectedRequest.assayType],
                  ["Reagent Type / Category", selectedRequest.reagentType || "Standard Chemical/Enzyme"],
                  ["Date Requested", new Date(selectedRequest.createdAt).toLocaleDateString()],
                  ["Date Approved", selectedRequest.decisionAt ? new Date(selectedRequest.decisionAt).toLocaleDateString() : "—"],
                  ["Requisition Status", selectedRequest.status],
                ].map(([label, value]) => (
                  <div key={label} style={{ fontSize: 10, lineHeight: 1.5 }}>
                    <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>{label}</div>
                    <div style={{ color: "#111827", fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Items & Concentrations Issued Table */}
            <section className="reagent-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                2. Reagents Issued &amp; Storage Conditions
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    {["#", "Reagent Description", "Reagent Code", "Approved Concentration", "Vials (Vill)", "Storage Condition", "Storage Location"].map((heading) => (
                      <th key={heading} style={{ padding: "9px 8px", border: "1px solid #d1d5db", color: "#374151", fontSize: 8, textTransform: "uppercase", fontWeight: 700 }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", textAlign: "center" }}>1</td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 700, color: "#0f766e" }}>
                      {selectedRequest.reagentItem?.description ?? selectedRequest.reagentType ?? selectedRequest.assayType}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontFamily: "monospace" }}>
                      {selectedRequest.reagentItem?.reagentCode ?? "—"}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800, color: "#15803d" }}>
                      {selectedRequest.approvedConcentration} {selectedRequest.concentrationUnit ?? ""}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 700 }}>
                      {selectedRequest.numberOfVill ?? "—"}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db" }}>
                      {selectedRequest.reagentItem ? formatStorageCondition(selectedRequest.reagentItem.storageCondition) : "Cold-Chain Controlled"}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db" }}>
                      {selectedRequest.reagentItem?.location ?? "Central Reagent Facility"}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={3} style={{ padding: "9px 8px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: 700 }}>
                      Total Reagents Issued
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800, color: "#15803d" }}>
                      {selectedRequest.approvedConcentration} {selectedRequest.concentrationUnit ?? ""}
                    </td>
                    <td style={{ padding: "9px 8px", border: "1px solid #d1d5db", fontWeight: 800 }}>
                      {selectedRequest.numberOfVill ?? 1} vial(s)
                    </td>
                    <td colSpan={2} style={{ border: "1px solid #d1d5db", padding: "9px 8px", fontSize: 9, color: "#6b7280" }}>
                      Expected Return: {selectedRequest.expectedReturn ? `${selectedRequest.expectedReturn} ${selectedRequest.concentrationUnit ?? ""}` : "Non-reusable / Complete consumption"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Requester Remark / Justification */}
            {selectedRequest.remark && (
              <section className="reagent-report-section" style={{ marginTop: 22 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  3. Requester Experiment Plan &amp; Notes
                </h2>
                <div style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", fontSize: 10, color: "#374151" }}>
                  {selectedRequest.remark}
                </div>
              </section>
            )}

            {/* Approval & Verification Record */}
            <section className="reagent-report-section" style={{ marginTop: 22 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                4. Approval Authorization Record
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", padding: 14, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                <div style={{ fontSize: 10 }}>
                  <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Authorized Reagent Manager</div>
                  <div style={{ marginTop: 3, fontWeight: 700, color: "#0f766e" }}>
                    {selectedRequest.approver || "Tegbar Getahun (Reagent Manager)"}
                  </div>
                </div>
                <div style={{ fontSize: 10 }}>
                  <div style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 8 }}>Authorization Date</div>
                  <div style={{ marginTop: 3, fontWeight: 700 }}>
                    {selectedRequest.decisionAt ? new Date(selectedRequest.decisionAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            </section>

            {/* Official Signatures & Chain of Custody */}
            <section className="reagent-report-section" style={{ marginTop: 34, paddingTop: 18, borderTop: "1px solid #d1d5db", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Handed Over By (Reagent Inventory Manager)</div>
                <img
                  src={tegbarSignatureUrl}
                  alt="Tegbar Getahun signature"
                  style={{ display: "block", width: 140, height: 74, objectFit: "contain", objectPosition: "left center", margin: "5px 0 -1px" }}
                />
                <div style={{ width: 220, borderTop: "1px solid #374151", paddingTop: 5, fontSize: 11, fontWeight: 700 }}>
                  Tegbar Getahun
                </div>
                <div style={{ marginTop: 3, fontSize: 9, color: "#6b7280" }}>
                  Reagent Inventory Manager · Handoff: {selectedRequest.disbursedAt ? new Date(selectedRequest.disbursedAt).toLocaleDateString() : "Pending Physical Hand-Off"}
                </div>
              </div>

              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Received By (Recipient Staff)</div>
                <div style={{ height: 50 }} />
                <div style={{ width: 220, borderTop: "1px solid #374151", paddingTop: 5, fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                  {selectedRequest.requestedFor || selectedRequest.requestedBy}
                </div>
                <div style={{ marginTop: 3, fontSize: 9, color: "#6b7280" }}>
                  Laboratory Personnel / Investigator
                </div>
              </div>
            </section>
          </article>

          {/* Pending Physical Hand-off Action Banner */}
          {!selectedRequest.disbursedAt && (
            <div
              className="reagent-report-toolbar"
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
                  <span>⌛ Pending Physical Reagent Hand-Off</span>
                </div>
                <div style={{ marginTop: 3, fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                  Reagent concentration has been allocated and manager-approved. Mark this requisition complete once physical vials are handed over to {selectedRequest.requestedFor || selectedRequest.requestedBy}.
                </div>
              </div>
              <button
                type="button"
                disabled={disburseMutation.isPending}
                onClick={() => handleDisburse(selectedRequest)}
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
                {disburseMutation.isPending ? "Recording Hand-Off…" : "🤝 Mark as Handed Over / Disbursed"}
              </button>
            </div>
          )}
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           STANDARD APPROVED REQUISITIONS FEED VIEW
           ══════════════════════════════════════════════════════════════════════ */
        <>
          {/* ── Page Header & Controls Card ── */}
          <div
            style={{
              padding: 18,
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-primary-highlight)",
              background: "var(--inventory-card-bg)",
              boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Header Hero Banner */}
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "var(--inventory-hero-bg)",
                border: "1px solid var(--color-primary-highlight)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  🤝
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                      Approved Reagent Requisitions &amp; Hand-Off
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
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
                      {approvedRequests.length} Ready for Hand-off
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Inspect approved requisitions, review item details, generate issuance vouchers, and mark physical reagent hand-off to lab staff
                  </div>
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
                  padding: "7px 12px",
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

            {/* Filter Controls */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search approved reagents, requester, project…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: "11.5px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  minWidth: 240,
                  flex: 1,
                }}
              />

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{
                  padding: "5px 8px",
                  fontSize: "11.5px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                }}
              >
                <option value="ALL">All Projects</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "5px 8px",
                  fontSize: "11.5px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                }}
              >
                <option value="ALL">All Approval Types</option>
                <option value="APPROVED">Fully Approved</option>
                <option value="PARTIAL">Partially Approved</option>
              </select>

              <select
                value={handoffFilter}
                onChange={(e) => setHandoffFilter(e.target.value as any)}
                style={{
                  padding: "5px 8px",
                  fontSize: "11.5px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                }}
              >
                <option value="ALL">All Handoff States</option>
                <option value="PENDING_HANDOFF">Awaiting Pickup / Hand-off</option>
                <option value="DISBURSED">Completed Hand-Offs</option>
              </select>
            </div>
          </div>

          {/* ── Summary Metrics Cards (Subtle near-white gradient with interactive hover action) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              {
                id: "total",
                label: "Total Approved Requisitions",
                icon: "📋",
                value: metrics.totalApproved,
                sub: "Active approved vouchers",
                tone: "#0284c7",
                onClick: () => {
                  setHandoffFilter("ALL");
                  setStatusFilter("ALL");
                },
                isActive: handoffFilter === "ALL" && statusFilter === "ALL",
              },
              {
                id: "vills",
                label: "Approved Vials (Vill)",
                icon: "🧪",
                value: metrics.totalVills,
                sub: "Cumulative across lots",
                tone: "#10b981",
                onClick: undefined,
                isActive: false,
              },
              {
                id: "pending",
                label: "Pending Hand-Off",
                icon: "⌛",
                value: metrics.pendingHandoff,
                sub: "Awaiting physical hand-off",
                tone: "#ea580c",
                onClick: () => setHandoffFilter("PENDING_HANDOFF"),
                isActive: handoffFilter === "PENDING_HANDOFF",
              },
              {
                id: "disbursed",
                label: "Completed Hand-Offs",
                icon: "🤝",
                value: metrics.completedHandoffs,
                sub: "Chain-of-custody signed",
                tone: "#3b82f6",
                onClick: () => setHandoffFilter("DISBURSED"),
                isActive: handoffFilter === "DISBURSED",
              },
            ].map((card) => {
              const isHovered = hoveredCard === card.id;
              const isSelected = card.isActive;

              const background = isDarkMode
                ? isSelected
                  ? `linear-gradient(145deg, ${card.tone}26 0%, #0c1524 100%)`
                  : isHovered
                  ? `linear-gradient(145deg, ${card.tone}18 0%, #0f1a2e 100%)`
                  : "linear-gradient(145deg, #182234 0%, #0f172a 100%)"
                : isSelected
                ? `linear-gradient(145deg, #ffffff 30%, ${card.tone}18 100%)`
                : isHovered
                ? `linear-gradient(145deg, #ffffff 35%, ${card.tone}12 100%)`
                : `linear-gradient(145deg, #ffffff 50%, ${card.tone}0a 100%)`;

              const border = isSelected
                ? `1.5px solid ${card.tone}`
                : isHovered
                ? `1px solid ${card.tone}66`
                : isDarkMode
                ? "1px solid rgba(255, 255, 255, 0.08)"
                : "1px solid var(--color-border)";

              const boxShadow = isHovered
                ? `0 6px 18px rgba(0, 0, 0, 0.08), 0 0 0 1px ${card.tone}22`
                : isSelected
                ? `0 4px 14px ${card.tone}22`
                : "0 2px 6px rgba(0, 0, 0, 0.03)";

              return (
                <div
                  key={card.id}
                  onClick={card.onClick}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border,
                    background,
                    boxShadow,
                    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                    cursor: card.onClick ? "pointer" : "default",
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
                        color: isSelected || isHovered ? card.tone : "var(--color-text-muted)",
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
                      color: isSelected || isHovered ? card.tone : "var(--color-text)",
                      marginTop: 2,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: isSelected || isHovered ? card.tone : "var(--color-text-muted)",
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

          {/* ── Approved Requests Table ── */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
              <table style={{ width: "100%", minWidth: 950, borderCollapse: "collapse", fontSize: "11.5px" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Assay Type</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Reagent / Description</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Project</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Approved Conc.</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Vills</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Requester</th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Hand-Off State</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: 170 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                        Loading approved requisitions…
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                        No approved reagent requisitions found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isDisbursed = Boolean(req.disbursedAt);

                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          style={{
                            borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary-soft)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-primary)" }}>
                            {req.assayType}
                          </td>
                          <td style={{ padding: "8px 10px", color: "var(--color-text)" }}>
                            {req.reagentItem?.description ?? req.reagentType ?? "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>{req.projectFor || "General"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#15803d" }}>
                            {req.approvedConcentration} {req.concentrationUnit ?? ""}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{req.numberOfVill ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{req.requestedFor || req.requestedBy}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: "9px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: req.status === "APPROVED" ? "#dcfce7" : "#ffedd5",
                                color: req.status === "APPROVED" ? "#15803d" : "#c2410c",
                                border: `1px solid ${req.status === "APPROVED" ? "#86efac" : "#fdba74"}`,
                              }}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {isDisbursed ? (
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d" }}>
                                ✅ Disbursed ({new Date(req.disbursedAt!).toLocaleDateString()})
                              </span>
                            ) : (
                              <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#f59e0b" }}>
                                ⏳ Ready for pickup
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                              {isDisbursed ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequest(req);
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    borderRadius: 5,
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface)",
                                    color: "var(--color-primary)",
                                    cursor: "pointer",
                                  }}
                                >
                                  👁️ View
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={disburseMutation.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisburse(req);
                                  }}
                                  style={{
                                    padding: "4px 12px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    borderRadius: 5,
                                    border: "none",
                                    background: "var(--color-primary)",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    boxShadow: "0 1px 4px rgba(13, 148, 136, 0.3)",
                                  }}
                                >
                                  🤝 Hand Off
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
