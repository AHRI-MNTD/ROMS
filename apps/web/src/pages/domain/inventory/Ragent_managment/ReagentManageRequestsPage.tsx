import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { useReagentRequests } from "./useReagentData";
import { ReagentRequest, formatStorageCondition } from "./reagentShared";

export default function ReagentManageRequestsPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();

  // Load pending reagent requests
  const { data: requestsData, isLoading, refetch } = useReagentRequests("PENDING");
  const pendingRequests = useMemo(() => requestsData?.data ?? [], [requestsData?.data]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [assayFilter, setAssayFilter] = useState("ALL");

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal detail view
  const [detailModalRequest, setDetailModalRequest] = useState<ReagentRequest | null>(null);

  // Partial approval adjustment in modal
  const [partialConcentration, setPartialConcentration] = useState<number | "">("");
  const [decisionRemark, setDecisionRemark] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // When opening modal, initialize partial concentration to requested amount
  const handleOpenDetail = (req: ReagentRequest) => {
    setDetailModalRequest(req);
    setPartialConcentration(req.requestedConcentration);
    setDecisionRemark(req.remark || "");
    setFeedback(null);
  };

  // Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      items: Array<{
        requestId: string;
        status: "APPROVED" | "REJECTED";
        approvedConcentration?: number;
        remark?: string;
      }>;
    }) => {
      const resp = await apiClient.post("/domains/reagent-inventory/request-decisions", payload);
      return resp.data;
    },
    onSuccess: async (_, variables) => {
      // Clear any seen status for approved requests so badge will alert immediately
      try {
        const saved = localStorage.getItem("roms_seen_reagent_approved");
        if (saved) {
          const seenMap = JSON.parse(saved);
          variables.items.forEach((item) => {
            if (item.status === "APPROVED") {
              delete seenMap[item.requestId];
            }
          });
          localStorage.setItem("roms_seen_reagent_approved", JSON.stringify(seenMap));
        }
      } catch { }

      await queryClient.invalidateQueries({ queryKey: ["reagent-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-items"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-dashboard"] });

      // Notify parent layouts and tabs immediately
      window.dispatchEvent(new Event("roms-reagent-request-updated"));

      setSelectedIds([]);
      setDetailModalRequest(null);
      setFeedback({
        type: "success",
        message: `Decision recorded successfully for ${variables.items.length} request(s).`,
      });
    },
    onError: (err) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Failed to submit decision. Please check available concentration."),
      });
    },
  });

  const handleApproveFull = (req: ReagentRequest) => {
    decisionMutation.mutate({
      items: [
        {
          requestId: req.id,
          status: "APPROVED",
          approvedConcentration: req.requestedConcentration,
          remark: decisionRemark || undefined,
        },
      ],
    });
  };

  const handleApprovePartial = (req: ReagentRequest) => {
    const conc = Number(partialConcentration);
    if (isNaN(conc) || conc <= 0) {
      setFeedback({ type: "error", message: "Approved concentration must be greater than 0." });
      return;
    }
    decisionMutation.mutate({
      items: [
        {
          requestId: req.id,
          status: "APPROVED",
          approvedConcentration: conc,
          remark: decisionRemark ? `[Partially Approved: ${conc}] ${decisionRemark}` : `[Partially Approved: ${conc}]`,
        },
      ],
    });
  };

  const handleReject = (req: ReagentRequest) => {
    decisionMutation.mutate({
      items: [
        {
          requestId: req.id,
          status: "REJECTED",
          approvedConcentration: 0,
          remark: decisionRemark || "Request rejected by Reagent Manager.",
        },
      ],
    });
  };

  // Batch actions
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    const items = selectedIds.map((id) => {
      const req = pendingRequests.find((r) => r.id === id);
      return {
        requestId: id,
        status: "APPROVED" as const,
        approvedConcentration: req?.requestedConcentration,
      };
    });
    decisionMutation.mutate({ items });
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return;
    const items = selectedIds.map((id) => ({
      requestId: id,
      status: "REJECTED" as const,
      approvedConcentration: 0,
      remark: "Batch rejected by Reagent Manager.",
    }));
    decisionMutation.mutate({ items });
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return pendingRequests.filter((r) => {
      if (projectFilter !== "ALL" && r.projectFor !== projectFilter) return false;
      if (assayFilter !== "ALL" && r.assayType !== assayFilter) return false;
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
  }, [pendingRequests, projectFilter, assayFilter, searchTerm]);

  const uniqueProjects = useMemo(
    () => Array.from(new Set(pendingRequests.map((r) => r.projectFor).filter((p): p is string => Boolean(p)))),
    [pendingRequests]
  );
  const uniqueAssays = useMemo(
    () => Array.from(new Set(pendingRequests.map((r) => r.assayType).filter((a): a is string => Boolean(a)))),
    [pendingRequests]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Feedback Banner ── */}
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

      {detailModalRequest ? (
        /* ══════════════════════════════════════════════════════════════════════
           DEDICATED REQUEST DETAIL & DECISION PAGE (Mirroring InventoryManagerPage)
           ══════════════════════════════════════════════════════════════════════ */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Header & Navigation */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-primary-highlight)",
              background: "var(--inventory-hero-bg)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>
                  🔍 Reagent Request Details
                </h2>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "#fef9c3",
                    color: "#854d0e",
                    fontSize: "9px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    border: "1px solid #fde68a",
                  }}
                >
                  Pending Decision
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: "11px", color: "var(--color-text-muted)" }}>
                Requisition ID: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>{detailModalRequest.id}</span> · Submitted on {new Date(detailModalRequest.createdAt).toLocaleString()} by {detailModalRequest.requestedBy}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDetailModalRequest(null)}
              style={{
                padding: "8px 14px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              ← Back to Pending Requests
            </button>
          </div>

          {/* ── Single Unified Rectangle Box Housing Details, Table, and Decision Panel ── */}
          <div
            style={{
              border: "1.5px solid var(--color-border)",
              borderRadius: 12,
              background: "#ffffff",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
            }}
          >
            {/* 1. Request Details (Clean layout without individual card boxes) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px 18px",
                paddingBottom: 18,
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {[
                ["Assay Protocol", detailModalRequest.assayType],
                ["Target Research Project", detailModalRequest.projectFor || "MNTD"],
                ["Requested By", detailModalRequest.requestedBy || "—"],
                ["Recipient (Requested For)", detailModalRequest.requestedFor || detailModalRequest.requestedBy || "—"],
                ["Reagent Type", detailModalRequest.reagentType || "Standard"],
                ["Authorized Approver", "Tegbar Getahun (Reagent Manager)"],
                ["Date Requested", new Date(detailModalRequest.createdAt).toLocaleDateString()],
                ["Requisition Status", detailModalRequest.status],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 650, color: "var(--color-text)", overflowWrap: "anywhere" }}>
                    {label === "Requisition Status" ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "10.5px",
                          fontWeight: 800,
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                        }}
                      >
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Requested Reagents & Cold-Chain Inventory Status Table (No background color) */}
            <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "var(--color-text)" }}>
                  Requested Reagents &amp; Cold-Chain Inventory Status
                </h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600 }}>
                  1 requisition item
                </span>
              </div>

              <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflowX: "auto", background: "transparent" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", background: "transparent" }}>
                  <thead>
                    <tr style={{ background: "transparent", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 40 }}>#</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700 }}>Reagent Description</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 110 }}>Catalog Code</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 130 }}>Requested Conc.</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 100 }}>Vials (Vill)</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 120 }}>Expected Return</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "9px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700, width: 220 }}>Live Stock Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "center", padding: "11px 10px", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "10px" }}>1</td>
                      <td style={{ padding: "11px 10px", fontWeight: 700, color: "var(--color-text)" }}>
                        {detailModalRequest.reagentItem?.description ?? detailModalRequest.reagentType ?? detailModalRequest.assayType}
                      </td>
                      <td style={{ padding: "11px 10px", fontFamily: "monospace", color: "var(--color-primary)", fontWeight: 650 }}>
                        {detailModalRequest.reagentItem?.reagentCode ?? "—"}
                      </td>
                      <td style={{ padding: "11px 10px", textAlign: "right" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--color-primary-soft)", color: "var(--color-primary)", fontWeight: 800, fontSize: "11.5px" }}>
                          {detailModalRequest.requestedConcentration} {detailModalRequest.concentrationUnit ?? ""}
                        </span>
                      </td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontWeight: 700, color: "var(--color-text)" }}>
                        {detailModalRequest.numberOfVill ?? "—"}
                      </td>
                      <td style={{ padding: "11px 10px", textAlign: "right", color: "var(--color-text-muted)", fontSize: "11px" }}>
                        {detailModalRequest.expectedReturn !== undefined && detailModalRequest.expectedReturn !== null ? `${detailModalRequest.expectedReturn} ${detailModalRequest.concentrationUnit ?? ""}` : "None (Consumable)"}
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        {detailModalRequest.reagentItem ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 800, color: detailModalRequest.reagentItem.availableConcentration < detailModalRequest.requestedConcentration ? "#ef4444" : "#10b981", fontSize: "11.5px" }}>
                              {detailModalRequest.reagentItem.availableConcentration} {detailModalRequest.reagentItem.concentrationUnit ?? ""} available
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                              {formatStorageCondition(detailModalRequest.reagentItem.storageCondition)} · {detailModalRequest.reagentItem.location || "Central Storage"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "10.5px" }}>Unlinked catalog stock</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {detailModalRequest.remark && (
                <div style={{ marginTop: 4, padding: "8px 12px", border: "1px dashed var(--color-border)", borderRadius: 6, fontSize: "11.5px", color: "var(--color-text)" }}>
                  <strong style={{ color: "var(--color-text-muted)" }}>Experiment Plan &amp; Justification: </strong>
                  {detailModalRequest.remark}
                </div>
              )}
            </section>

            {/* 3. Decision Panel (With its own demarcated background, keeping its distinct look) */}
            <section
              style={{
                padding: 18,
                border: "1px solid var(--color-primary-highlight)",
                borderRadius: 12,
                background: "var(--inventory-card-bg)",
                boxShadow: "0 4px 16px var(--color-accent-soft)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "var(--color-text)" }}>
                    Decision Panel · Tegbar Getahun (Reagent Manager)
                  </h3>
                  <div style={{ marginTop: 3, fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                    Assign an outcome for this requisition. If partially approving, specify the accepted concentration.
                  </div>
                </div>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary-highlight)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Manager Decision Authority Active
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>
                    Approved Concentration (Adjust for Partial Allocation)
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      max={detailModalRequest.requestedConcentration}
                      value={partialConcentration}
                      onChange={(e) => setPartialConcentration(e.target.value === "" ? "" : Number(e.target.value))}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        fontSize: "12px",
                        borderRadius: 6,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text)",
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--color-text-muted)", padding: "0 4px" }}>
                      {detailModalRequest.concentrationUnit ?? "units"}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>
                    Manager Decision Remark / Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Optional allocation justification or reason for rejection"
                    value={decisionRemark}
                    onChange={(e) => setDecisionRemark(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Decision Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--color-border-subtle, rgba(0,0,0,0.06))",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled={decisionMutation.isPending}
                  onClick={() => handleReject(detailModalRequest)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  ✕ Reject Requisition
                </button>

                {Number(partialConcentration) < detailModalRequest.requestedConcentration ? (
                  <button
                    type="button"
                    disabled={decisionMutation.isPending}
                    onClick={() => handleApprovePartial(detailModalRequest)}
                    style={{
                      padding: "8px 18px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      borderRadius: 6,
                      border: "none",
                      background: "#f59e0b",
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    ⚡ Partially Approve ({partialConcentration} {detailModalRequest.concentrationUnit ?? ""})
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={decisionMutation.isPending}
                    onClick={() => handleApproveFull(detailModalRequest)}
                    style={{
                      padding: "8px 20px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      borderRadius: 6,
                      border: "none",
                      background: "#10b981",
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    ✓ Approve Full ({detailModalRequest.requestedConcentration} {detailModalRequest.concentrationUnit ?? ""})
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           MAIN PENDING REQUESTS PORTAL VIEW
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
                  👨‍💼
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                      Reagent Manager Decisions Portal
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {pendingRequests.length} Pending Approval
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Designated portal for Tegbar Getahun to review incoming assay requisitions, verify stock concentration, and assign approval decisions
                  </div>
                </div>
              </div>

              {/* Batch Actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || decisionMutation.isPending}
                  onClick={handleBatchApprove}
                  style={{
                    padding: "6px 14px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "none",
                    background: selectedIds.length > 0 ? "#10b981" : "var(--color-surface-2)",
                    color: selectedIds.length > 0 ? "#ffffff" : "var(--color-text-muted)",
                    cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                    boxShadow: selectedIds.length > 0 ? "0 2px 6px rgba(16, 185, 129, 0.3)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  ✓ Approve Selected ({selectedIds.length})
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || decisionMutation.isPending}
                  onClick={handleBatchReject}
                  style={{
                    padding: "6px 14px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "none",
                    background: selectedIds.length > 0 ? "#ef4444" : "var(--color-surface-2)",
                    color: selectedIds.length > 0 ? "#ffffff" : "var(--color-text-muted)",
                    cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                    boxShadow: selectedIds.length > 0 ? "0 2px 6px rgba(239, 68, 68, 0.3)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  ✕ Reject Selected ({selectedIds.length})
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search assay, reagent, requester, or project…"
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
                value={assayFilter}
                onChange={(e) => setAssayFilter(e.target.value)}
                style={{
                  padding: "5px 8px",
                  fontSize: "11.5px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                }}
              >
                <option value="ALL">All Assays</option>
                {uniqueAssays.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Pending Requests Table ── */}
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
                    <th style={{ padding: "8px 10px", width: 36, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(filteredRequests.map((r) => r.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Assay Type</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Reagent / Type</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Project</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Req. Concentration</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Vills</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Exp. Return</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Requested By</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Stock Available</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                        Loading pending requests…
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                        🎉 No pending reagent requests awaiting decision.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isChecked = selectedIds.includes(req.id);
                      const stock = req.reagentItem;
                      const available = stock?.availableConcentration ?? null;
                      const isShortage = available !== null && available < req.requestedConcentration;

                      return (
                        <tr
                          key={req.id}
                          onClick={() => handleOpenDetail(req)}
                          style={{
                            borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))",
                            background: isChecked ? "var(--color-primary-soft, #f0fdfa)" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) e.currentTarget.style.background = "var(--color-primary-soft)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td
                            style={{ padding: "8px 10px", textAlign: "center" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds((prev) => [...prev, req.id]);
                                else setSelectedIds((prev) => prev.filter((id) => id !== req.id));
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-primary)" }}>
                            {req.assayType}
                          </td>
                          <td style={{ padding: "8px 10px", color: "var(--color-text)" }}>
                            {stock?.description ?? req.reagentType ?? "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>{req.projectFor || "General"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                            {req.requestedConcentration} {req.concentrationUnit ?? ""}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{req.numberOfVill ?? "—"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                            {req.expectedReturn ? `${req.expectedReturn} ${req.concentrationUnit ?? ""}` : "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>{req.requestedFor || req.requestedBy}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {available !== null ? (
                              <span style={{ fontWeight: 700, color: isShortage ? "#ef4444" : "#10b981" }}>
                                {available} {stock?.concentrationUnit ?? ""} {isShortage && "(Low)"}
                              </span>
                            ) : (
                              <span style={{ color: "var(--color-text-muted)" }}>Unlinked</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                              {/* Click View Details */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetail(req);
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

                              {/* Quick Approve Full */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveFull(req);
                                }}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  borderRadius: 5,
                                  border: "none",
                                  background: "#10b981",
                                  color: "#ffffff",
                                  cursor: "pointer",
                                }}
                              >
                                ✓
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
          </div>
        </>
      )}
    </div>
  );
}
