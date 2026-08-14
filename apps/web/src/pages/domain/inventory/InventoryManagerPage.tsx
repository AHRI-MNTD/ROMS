import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";
import { RequestReferenceTable, RequestReferenceRow } from "./RequestReferenceTable";

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

export function isUserAssignedApprover(
  user: { displayName?: string | null; email?: string | null; roles?: string[] } | null,
  project?: string | null,
  approverField?: string | null
): boolean {
  if (!user) return false;

  const userDisplayName = (user.displayName ?? "").toLowerCase().trim();
  const userEmail = (user.email ?? "").toLowerCase().trim();
  const assignedStr = approverField || getApproverForProject(project);
  const assignedLower = assignedStr.toLowerCase();

  const names = assignedLower.split(/[,/]| and /).map((n) => n.trim()).filter(Boolean);

  for (const name of names) {
    if (name.includes("alemayehu") && (userDisplayName.includes("alemayehu") || userEmail.includes("alexbiology"))) return true;
    if (name.includes("migbaru") && (userDisplayName.includes("migbaru") || userEmail.includes("migbaru"))) return true;
    if (name.includes("assalif") && (userDisplayName.includes("assalif") || userEmail.includes("ashifera"))) return true;
    if (name.includes("tilahun") && (userDisplayName.includes("tilahun") || userEmail.includes("tilahun"))) return true;
    if (name.includes("wakweya") && (userDisplayName.includes("wakweya") || userEmail.includes("wakeya"))) return true;

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 0 && parts.every((p) => userDisplayName.includes(p))) {
      return true;
    }
  }

  return false;
}

interface RequestItemState {
  id: string;
  movementId?: string;
  sku?: string;
  name?: string;
  quantity: number;
  status: "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL";
  acceptedQuantity?: number;
}

interface RequestLogEntry {
  id: string;
  timestamp: string;
  itemLabel: string;
  quantity: number;
  requestedBy?: string;
  requestedFor?: string;
  project?: string;
  approver?: string;
  team?: string;
  items?: Array<{ id: string; movementId?: string; sku?: string; name?: string; quantity: number }>;
  bulk?: boolean;
  rawRows?: RequestReferenceRow[];
}

/* ─── Tooltip Action Icon Button ─────────────────────────────────────────── */
function IconBtn({
  title,
  onClick,
  children,
  color,
  hoverBg,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  color: string;
  hoverBg: string;
}) {
  const [hover, setHover] = React.useState(false);
  const [tooltipVisible, setTooltipVisible] = React.useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        title={title}
        onClick={onClick}
        onMouseEnter={() => { setHover(true); setTooltipVisible(true); }}
        onMouseLeave={() => { setHover(false); setTooltipVisible(false); }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          border: `1.5px solid ${color}33`,
          background: hover ? hoverBg : "transparent",
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          cursor: "pointer",
          transition: "all 0.15s ease",
          flexShrink: 0,
          padding: 0,
        }}
      >
        {children}
      </button>
      {tooltipVisible && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.92)",
            color: "#fff",
            fontSize: "9.5px",
            padding: "4px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 999,
            fontWeight: 600,
            letterSpacing: "0.02em",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {title}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid rgba(15,23,42,0.92)",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function InventoryManagerPage() {
  const user = useAuth((state) => state.user);
  const isAdmin = user?.roles?.some((role) => ["ADMIN", "RESEARCH_ADMIN"].includes(role)) ?? false;
  const queryClient = useQueryClient();

  const { data: persistedRequests } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests");
      return resp.data as { data: RequestReferenceRow[]; total: number };
    },
  });

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logs, setLogs] = React.useState<RequestLogEntry[]>([]);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [rowItemDecisions, setRowItemDecisions] = React.useState<Record<string, RequestItemState[]>>({});
  const [decidedBatchIds, setDecidedBatchIds] = React.useState<Set<string>>(new Set());
  const [showAllLogs, setShowAllLogs] = React.useState(false);

  /* Group pending requests by batch */
  React.useEffect(() => {
    const rows = (persistedRequests?.data ?? []).filter((r) => r.status === "PENDING");
    if (rows.length === 0) { setLogs([]); return; }

    const batches = new Map<string, RequestLogEntry>();
    for (const row of rows) {
      const batchKey = String(row.requestBatchId ?? row.rowKey);
      const existing = batches.get(batchKey);
      const batchRows = rows.filter((r) => String(r.requestBatchId ?? r.rowKey) === batchKey);
      const entry: RequestLogEntry = existing ?? {
        id: batchKey,
        timestamp: new Date(row.dateRequested).toISOString(),
        itemLabel: batchRows.length > 1 ? `${batchRows.length} item(s)` : row.itemDescription,
        quantity: 0,
        requestedBy: row.requestedBy,
        requestedFor: row.requestedFor,
        project: row.project,
        team: row.team,
        items: [],
        bulk: true,
        rawRows: [],
      };

      entry.quantity += Number(row.requestedQuantity ?? row.quantity ?? 0);
      entry.items = entry.items ?? [];
      entry.items.push({ id: row.rowKey, movementId: row.movementId, sku: row.codeNo, name: row.itemDescription, quantity: Number(row.requestedQuantity ?? row.quantity ?? 0) });
      entry.rawRows = entry.rawRows ?? [];
      entry.rawRows.push(row);
      batches.set(batchKey, entry);
    }

    const groupedLogs = [...batches.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(groupedLogs);
  }, [persistedRequests?.data]);

  /* Toggle inline expansion of a row */
  const toggleRowExpand = (entry: RequestLogEntry) => {
    if (expandedRowId === entry.id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(entry.id);
      if (!rowItemDecisions[entry.id]) {
        const items = entry.items && entry.items.length > 0
          ? entry.items
          : [{ id: String(entry.id), movementId: String(entry.id), sku: undefined, name: entry.itemLabel, quantity: entry.quantity }];
        setRowItemDecisions((prev) => ({
          ...prev,
          [entry.id]: items.map((it) => ({
            id: it.id,
            movementId: it.movementId ?? it.id,
            sku: it.sku,
            name: it.name,
            quantity: it.quantity,
            status: "PENDING" as const,
            acceptedQuantity: it.quantity,
          })),
        }));
      }
    }
  };

  /* Quick-Approve Mutation */
  const quickApproveMutation = useMutation({
    mutationFn: async (entry: RequestLogEntry) => {
      const items = entry.items && entry.items.length > 0
        ? entry.items
        : [{ id: String(entry.id), movementId: String(entry.id), sku: undefined, name: entry.itemLabel, quantity: entry.quantity }];
      const resp = await apiClient.post("/domains/inventory/request-decisions", {
        requestedBy: entry.requestedBy,
        requestedFor: entry.requestedFor,
        project: entry.project,
        team: entry.team,
        timestamp: entry.timestamp,
        items: items.map((it) => ({
          movementId: it.movementId ?? it.id,
          sku: it.sku,
          name: it.name,
          quantity: it.quantity,
          status: "APPROVED",
          acceptedQuantity: it.quantity,
        })),
      });
      return resp.data;
    },
    onSuccess: (_data, entry) => {
      setFeedback({ type: "success", message: `Approved ${entry.itemLabel} directly.` });
      setDecidedBatchIds((prev) => new Set([...prev, entry.id]));
      if (expandedRowId === entry.id) setExpandedRowId(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Quick approval failed.") });
    },
  });

  /* Save Decisions Mutation for inline expanded panel */
  const saveDecisionMutation = useMutation({
    mutationFn: async ({ entry, items }: { entry: RequestLogEntry; items: RequestItemState[] }) => {
      const toServerStatus = (status: "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL") => {
        if (status === "ACCEPT") return "APPROVED" as const;
        if (status === "REJECT") return "REJECTED" as const;
        return status as "PENDING" | "PARTIAL";
      };
      const resp = await apiClient.post("/domains/inventory/request-decisions", {
        requestedBy: entry.requestedBy,
        requestedFor: entry.requestedFor,
        project: entry.project,
        team: entry.team,
        timestamp: entry.timestamp,
        items: items.map((item) => ({
          movementId: item.movementId ?? item.id,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          status: toServerStatus(item.status),
          acceptedQuantity: item.acceptedQuantity,
        })),
      });
      return resp.data;
    },
    onSuccess: (_data, variables) => {
      setFeedback({ type: "success", message: `Saved decisions for ${variables.items.length} item(s).` });
      setDecidedBatchIds((prev) => new Set([...prev, variables.entry.id]));
      if (expandedRowId === variables.entry.id) setExpandedRowId(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Saving decisions failed.") });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
            background: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            fontSize: "var(--fs-xs)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", opacity: 0.6 }}>✕</button>
        </div>
      )}

      {/* ── Pending Requests Section ─────────────────────────────────── */}
      <div
        style={{
          padding: 18,
          border: "1px solid var(--color-primary-highlight)",
          borderRadius: 12,
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px var(--color-accent-soft)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "var(--inventory-hero-bg)",
            border: "1px solid var(--color-primary-highlight)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
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
            ⏳
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>Pending Requests</span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-highlight)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Awaiting Decision
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
              Click any row or the details icon (👁) to expand requested items and set decisions inline.
            </div>
          </div>
        </div>

        {(() => {
          const pendingLogs = logs.filter((e) => !decidedBatchIds.has(e.id));
          if (pendingLogs.length === 0) return (
            <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>No pending requests recorded yet.</div>
          );
          const visibleLogs = showAllLogs ? pendingLogs : pendingLogs.slice(0, 5);
          return (
            <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
              <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-offset)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10.5px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={{ ...thStyle, textAlign: "center" }} title="#">#</th>
                          <th style={thStyle} title="Item">Item</th>
                          <th style={thStyle} title="Quantity">Qty</th>
                          <th style={thStyle} title="Project">Project</th>
                          <th style={thStyle} title="Assigned Approver">Approver</th>
                          <th style={thStyle} title="Date">Date</th>
                          <th style={thStyle} title="Requested By">Requested By</th>
                          <th style={thStyle} title="Requested For">Requested For</th>
                          <th style={{ ...thStyle, textAlign: "center" }} title="Actions">Actions</th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((entry, index) => {
                    const isExpanded = expandedRowId === entry.id;
                    const cellStyle: React.CSSProperties = {
                      padding: "6px 8px",
                      fontSize: "10.5px",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    };
                    const dateStr = new Date(entry.timestamp).toLocaleDateString();
                    const currentItems = rowItemDecisions[entry.id] || (entry.items || []).map((it) => ({
                      id: it.id,
                      movementId: it.movementId ?? it.id,
                      sku: it.sku,
                      name: it.name,
                      quantity: it.quantity,
                      status: "PENDING" as const,
                      acceptedQuantity: it.quantity,
                    }));

                    const entryApprover = entry.approver || entry.rawRows?.[0]?.approver || getApproverForProject(entry.project);
                    const canUserApprove = isUserAssignedApprover(user, entry.project, entryApprover);

                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          onClick={() => toggleRowExpand(entry)}
                          style={{
                            borderBottom: "1px solid var(--color-divider)",
                            height: 38,
                            cursor: "pointer",
                            background: isExpanded ? "var(--color-primary-soft)" : "transparent",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ ...cellStyle, textAlign: "center", fontWeight: 700, color: "var(--color-text-faint)" }} title={String(index + 1)}>{index + 1}</td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: "var(--color-text)" }} title={entry.itemLabel}>{entry.itemLabel}</td>
                          <td style={cellStyle} title={String(entry.quantity)}>{entry.quantity}</td>
                          <td style={cellStyle} title={entry.project || "—"}>{entry.project || "—"}</td>
                          <td style={cellStyle} title={entryApprover}>{entryApprover}</td>
                          <td style={cellStyle} title={dateStr}>{dateStr}</td>
                          <td style={cellStyle} title={entry.requestedBy}>{entry.requestedBy}</td>
                          <td style={cellStyle} title={entry.requestedFor || "—"}>{entry.requestedFor || "—"}</td>
                          <td style={{ padding: "4px 8px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
                              {/* Eye icon to toggle expand */}
                              <IconBtn
                                title="See details"
                                onClick={(e) => { e.stopPropagation(); toggleRowExpand(entry); }}
                                color={isExpanded ? "var(--color-primary)" : "#475569"}
                                hoverBg="var(--color-primary-soft)"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </IconBtn>
                              {/* Direct Approve Icon */}
                              <IconBtn
                                title={canUserApprove ? "Approve directly" : `Only assigned approver (${entryApprover}) can approve`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canUserApprove) {
                                    setFeedback({ type: "error", message: `Authorization required: Only assigned approver (${entryApprover}) can approve this request.` });
                                    return;
                                  }
                                  quickApproveMutation.mutate(entry);
                                }}
                                color={canUserApprove ? "#16a34a" : "#94a3b8"}
                                hoverBg={canUserApprove ? "rgba(22,163,74,0.1)" : "rgba(148,163,184,0.1)"}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </IconBtn>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expanded Row */}
                        {isExpanded && (
                          <tr style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
                            <td colSpan={9} style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Title Bar */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                      </svg>
                                    </div>
                                    <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "0.01em" }}>Request Details</span>
                                    <span style={{ fontSize: "9px", padding: "1px 8px", borderRadius: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "1px solid var(--color-primary-highlight)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                      Pending
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedRowId(null); }}
                                    style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                                  >
                                    Close ▲
                                  </button>
                                </div>

                                {/* 1. Requested Items Table */}
                                <div style={{ border: "1px solid var(--color-border)", borderRadius: 7, overflow: "hidden" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                      <tr style={{ background: "var(--color-surface-offset)", borderBottom: "1px solid var(--color-border)" }}>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase" }}>Item Name / Code</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 60 }}>Qty</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 100 }}>Project</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 140 }}>Approver</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 90 }}>Date</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 120 }}>Requested By</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 120 }}>Requested For</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 90 }}>Team</th>
                                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 120 }}>Remark</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentItems.map((it, idx) => {
                                        const rawRow = entry.rawRows?.[idx];
                                        const projVal = rawRow?.project || entry.project || "—";
                                        const reqByVal = rawRow?.requestedBy || entry.requestedBy || "—";
                                        const reqForVal = rawRow?.requestedFor || entry.requestedFor || "—";
                                        const teamVal = rawRow?.team || entry.team || "—";
                                        const rawRemark = (rawRow?.remark ?? "").trim();
                                        const remarkVal = rawRemark === "Request item" ? "" : rawRemark;
                                        const dateVal = rawRow?.dateRequested ? new Date(rawRow.dateRequested).toLocaleDateString() : new Date(entry.timestamp).toLocaleDateString();

                                        return (
                                          <tr key={`req-item-${it.id}-${idx}`} style={{ borderBottom: idx < currentItems.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
                                            <td style={{ padding: "6px 8px", fontWeight: 600, color: "var(--color-text)" }}>
                                              {it.sku ? `${it.sku} — ${it.name}` : it.name}
                                            </td>
                                            <td style={{ padding: "6px 8px", fontWeight: 700 }}>{it.quantity}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{projVal}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{entryApprover}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{dateVal}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{reqByVal}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{reqForVal}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{teamVal}</td>
                                            <td style={{ padding: "6px 8px", color: "var(--color-text-muted)" }}>{remarkVal}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* 2. Separate Decision Panel */}
                                <div>
                                  <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-primary)", marginBottom: 6 }}>
                                    Decision Panel
                                  </div>
                                  {!canUserApprove && (
                                    <div style={{ padding: "8px 12px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 6, color: "#9a3412", fontSize: "10.5px", fontWeight: 700, marginBottom: 8 }}>
                                      🔒 Approver Authorization Required: Only assigned approver <u>{entryApprover}</u> is authorized to approve requests for project {entry.project}.
                                    </div>
                                  )}
                                  <div style={{ border: "1px solid var(--color-border)", borderRadius: 7, overflow: "hidden" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                      <thead>
                                        <tr style={{ background: "var(--color-surface-offset)", borderBottom: "1px solid var(--color-border)" }}>
                                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase" }}>Item Name / Code</th>
                                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 80 }}>Req. Qty</th>
                                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 170 }}>Decision</th>
                                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--color-text)", fontWeight: 700, textTransform: "uppercase", width: 110 }}>Accepted Qty</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {currentItems.map((it, idx) => (
                                          <tr key={`dec-item-${it.id}-${idx}`} style={{ borderBottom: idx < currentItems.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
                                            <td style={{ padding: "6px 10px", fontWeight: 600, color: "var(--color-text)" }}>
                                              {it.sku ? `${it.sku} — ${it.name}` : it.name}
                                            </td>
                                            <td style={{ padding: "6px 10px", fontWeight: 700 }}>{it.quantity}</td>
                                            <td style={{ padding: "6px 10px" }}>
                                              <select
                                                value={it.status}
                                                disabled={!canUserApprove}
                                                onChange={(e) => {
                                                  const nextStatus = e.target.value as "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL";
                                                  const updated = [...currentItems];
                                                  if (nextStatus === "PARTIAL") {
                                                    updated[idx] = { ...updated[idx], status: nextStatus, acceptedQuantity: Math.min(updated[idx].quantity, updated[idx].acceptedQuantity ?? updated[idx].quantity) };
                                                  } else if (nextStatus === "REJECT") {
                                                    updated[idx] = { ...updated[idx], status: nextStatus, acceptedQuantity: 0 };
                                                  } else {
                                                    updated[idx] = { ...updated[idx], status: nextStatus, acceptedQuantity: updated[idx].quantity };
                                                  }
                                                  setRowItemDecisions((prev) => ({ ...prev, [entry.id]: updated }));
                                                }}
                                                style={{
                                                  width: "100%",
                                                  padding: "5px 8px",
                                                  borderRadius: 6,
                                                  border: "1.5px solid",
                                                  borderColor: it.status === "ACCEPT" ? "#86efac" : it.status === "REJECT" ? "#fca5a5" : it.status === "PARTIAL" ? "#fdba74" : "var(--color-divider)",
                                                  fontWeight: 700,
                                                  fontSize: "11px",
                                                  background: it.status === "ACCEPT" ? "#dcfce7" : it.status === "REJECT" ? "#fee2e2" : it.status === "PARTIAL" ? "#fff7ed" : "var(--color-surface)",
                                                  color: it.status === "ACCEPT" ? "#166534" : it.status === "REJECT" ? "#991b1b" : it.status === "PARTIAL" ? "#9a3412" : "var(--color-text)",
                                                  cursor: !canUserApprove ? "not-allowed" : "pointer",
                                                }}
                                              >
                                                <option value="PENDING">Pending</option>
                                                <option value="ACCEPT">Approve (Accept)</option>
                                                <option value="PARTIAL">Partially Approve</option>
                                                <option value="REJECT">Reject</option>
                                              </select>
                                            </td>
                                            <td style={{ padding: "6px 10px" }}>
                                              {it.status === "PARTIAL" ? (
                                                <input
                                                  type="number"
                                                  value={it.acceptedQuantity ?? 0}
                                                  min={0}
                                                  max={it.quantity}
                                                  disabled={!canUserApprove}
                                                  onChange={(e) => {
                                                    const updated = [...currentItems];
                                                    updated[idx] = { ...updated[idx], acceptedQuantity: Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0)) };
                                                    setRowItemDecisions((prev) => ({ ...prev, [entry.id]: updated }));
                                                  }}
                                                  style={{ width: 70, padding: "4px 6px", borderRadius: 5, border: "1px solid var(--color-divider)", fontSize: "11px", background: "var(--color-surface)", color: "var(--color-text)" }}
                                                />
                                              ) : (
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: it.status === "REJECT" ? "#991b1b" : it.status === "ACCEPT" ? "#166534" : "var(--color-text)" }}>
                                                  {it.acceptedQuantity ?? (it.status === "REJECT" ? 0 : it.quantity)}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Save Button for expanded row */}
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canUserApprove) {
                                        setFeedback({ type: "error", message: `Authorization required: Only assigned approver (${entryApprover}) can approve this request.` });
                                        return;
                                      }
                                      saveDecisionMutation.mutate({ entry, items: currentItems });
                                    }}
                                    disabled={saveDecisionMutation.isPending || !canUserApprove}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 6,
                                      border: "none",
                                      background: canUserApprove ? "var(--color-primary)" : "#94a3b8",
                                      color: "#fff",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      cursor: canUserApprove ? "pointer" : "not-allowed",
                                    }}
                                  >
                                    {saveDecisionMutation.isPending ? "Saving..." : "Save Decisions"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {pendingLogs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllLogs((v) => !v)}
                  style={{ margin: "8px 10px", fontSize: "10.5px", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                >
                  {showAllLogs ? "Show less" : `Show all ${pendingLogs.length} requests`}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Shared Request/s Reference Table */}
      <RequestReferenceTable />
    </div>
  );
}
