import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";
import { RequestReferenceTable, RequestReferenceRow } from "./RequestReferenceTable";

interface RequestLogEntry {
  id: string;
  timestamp: string;
  itemLabel: string;
  quantity: number;
  requestedBy?: string;
  requestedFor?: string;
  project?: string;
  team?: string;
  items?: Array<{ id: string; movementId?: string; sku?: string; name?: string; quantity: number }>;
  bulk?: boolean;
}

export default function InventoryManagerPage() {
  const user = useAuth((state) => state.user);
  const isAdmin = user?.roles.some((role) => ["ADMIN", "RESEARCH_ADMIN"].includes(role)) ?? true;
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
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeLog, setActiveLog] = React.useState<RequestLogEntry | null>(null);
  const [modalItems, setModalItems] = React.useState<Array<{ id: string; movementId?: string; sku?: string; name?: string; quantity: number; status: "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL"; acceptedQuantity?: number }>>([]);
  const [decidedBatchIds, setDecidedBatchIds] = React.useState<Set<string>>(new Set());
  const [showAllLogs, setShowAllLogs] = React.useState(false);

  React.useEffect(() => {
    const rows = (persistedRequests?.data ?? []).filter((r) => r.status === "PENDING");
    if (rows.length === 0) {
      setLogs([]);
      return;
    }

    const batches = new Map<string, RequestLogEntry>();
    for (const row of rows) {
      const batchKey = String(row.requestBatchId ?? row.rowKey);
      const existing = batches.get(batchKey);
      const entry = existing ?? {
        id: batchKey,
        timestamp: new Date(row.dateRequested).toISOString(),
        itemLabel: rows.filter((candidate) => String(candidate.requestBatchId ?? candidate.rowKey) === batchKey).length > 1 ? `${rows.filter((candidate) => String(candidate.requestBatchId ?? candidate.rowKey) === batchKey).length} item(s)` : row.itemDescription,
        quantity: 0,
        requestedBy: row.requestedBy,
        requestedFor: row.requestedFor,
        project: row.project,
        team: row.team,
        items: [],
        bulk: true,
      };

      entry.quantity += Number(row.requestedQuantity ?? row.quantity ?? 0);
      entry.items = entry.items ?? [];
      entry.items.push({ id: row.rowKey, movementId: row.movementId, sku: row.codeNo, name: row.itemDescription, quantity: Number(row.requestedQuantity ?? row.quantity ?? 0) });
      batches.set(batchKey, entry);
    }

    const groupedLogs = [...batches.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(groupedLogs);
  }, [persistedRequests?.data]);

  const saveDecisionMutation = useMutation({
    mutationFn: async () => {
      if (!activeLog) {
        throw new Error("No request is open.");
      }

      const toServerStatus = (status: "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL") => {
        if (status === "ACCEPT") return "APPROVED" as const;
        if (status === "REJECT") return "REJECTED" as const;
        return status as "PENDING" | "PARTIAL";
      };

      const resp = await apiClient.post("/domains/inventory/request-decisions", {
        requestedBy: activeLog.requestedBy,
        requestedFor: activeLog.requestedFor,
        project: activeLog.project,
        team: activeLog.team,
        timestamp: activeLog.timestamp,
        items: modalItems.map((item) => ({
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
    onSuccess: async () => {
      setFeedback({ type: "success", message: `Saved decisions for ${modalItems.length} item(s).` });
      if (activeLog) setDecidedBatchIds((prev) => new Set([...prev, activeLog.id]));
      queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setModalOpen(false);
      setActiveLog(null);
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Saving decisions failed.") });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {feedback && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
            background: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            fontSize: "var(--fs-xs)",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Pending requests section */}
      <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Pending requests</div>
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
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "35%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10.5px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={thStyle} title="Time">Time</th>
                          <th style={thStyle} title="Item">Item</th>
                          <th style={thStyle} title="Quantity">Qty</th>
                          <th style={thStyle} title="Requested By">Requested By</th>
                          <th style={thStyle} title="Requested For">Requested For</th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((entry) => {
                    const cellStyle: React.CSSProperties = {
                      padding: "6px 8px",
                      fontSize: "10.5px",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    };
                    const timeStr = new Date(entry.timestamp).toLocaleString();
                    const itemStr = entry.itemLabel;
                    const qtyStr = String(entry.quantity);
                    const reqBy = entry.requestedBy;
                    const reqFor = entry.requestedFor || '—';

                    return (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: "1px solid var(--color-divider)", height: 32, cursor: entry.items?.length ? "pointer" : "default" }}
                        onClick={() => {
                          if (!entry) return;
                          const items = entry.items && entry.items.length > 0 ? entry.items : [{ id: String(entry.id), movementId: String(entry.id), sku: undefined, name: entry.itemLabel, quantity: entry.quantity }];
                          setActiveLog(entry);
                          setModalItems(items.map((it) => ({ id: it.id, movementId: it.movementId ?? it.id, sku: it.sku, name: it.name, quantity: it.quantity, status: "PENDING" as const, acceptedQuantity: it.quantity })));
                          setModalOpen(true);
                        }}
                      >
                        <td style={cellStyle} title={timeStr}>{timeStr}</td>
                        <td style={cellStyle} title={itemStr}>{itemStr}</td>
                        <td style={cellStyle} title={qtyStr}>{qtyStr}</td>
                        <td style={cellStyle} title={reqBy}>{reqBy}</td>
                        <td style={cellStyle} title={reqFor}>{reqFor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pendingLogs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllLogs((v) => !v)}
                  style={{ marginTop: 8, fontSize: "10.5px", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                >
                  {showAllLogs ? `Show less` : `Show all ${pendingLogs.length} requests`}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Decision modal */}
      {modalOpen && activeLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => { setModalOpen(false); setActiveLog(null); }}>
          <div style={{ width: 980, maxWidth: "96%", maxHeight: "88vh", overflow: "hidden", background: "var(--color-surface)", borderRadius: 14, padding: 18, boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 800 }}>Request details</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(activeLog.timestamp).toLocaleString()}</div>
            </div>

            <div className="table-responsive-container" style={{ maxHeight: "68vh", paddingRight: 4 }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <th style={{ textAlign: "left", padding: 8 }}>Item</th>
                    <th style={{ textAlign: "left", padding: 8, width: 90 }}>Requested</th>
                    <th style={{ textAlign: "left", padding: 8, width: 220 }}>Decision</th>
                    <th style={{ textAlign: "left", padding: 8, width: 140 }}>Accepted qty</th>
                  </tr>
                </thead>
                <tbody>
                  {modalItems.map((it, idx) => (
                    <tr key={`${it.id}-${idx}`} style={{ borderBottom: "1px solid var(--color-divider)", height: 56 }}>
                      <td style={{ padding: 8, verticalAlign: "middle", maxWidth: 0 }} title={it.sku ? `${it.sku} — ${it.name}` : it.name}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sku ? `${it.sku} — ${it.name}` : it.name}</div>
                      </td>
                      <td style={{ padding: 8 }}>{it.quantity}</td>
                      <td style={{ padding: 8 }}>
                        <select
                          value={it.status}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            const nextStatus = e.target.value as "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL";
                            setModalItems((prev) => {
                              const next = [...prev];
                              if (nextStatus === "PARTIAL") {
                                next[idx] = { ...next[idx], status: nextStatus, acceptedQuantity: Math.min(next[idx].quantity, next[idx].acceptedQuantity ?? next[idx].quantity) };
                              } else if (nextStatus === "REJECT") {
                                next[idx] = { ...next[idx], status: nextStatus, acceptedQuantity: 0 };
                              } else {
                                next[idx] = { ...next[idx], status: nextStatus, acceptedQuantity: next[idx].quantity };
                              }
                              return next;
                            });
                          }}
                          style={{
                            width: "100%",
                            padding: "7px 9px",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            fontWeight: 700,
                            background: it.status === "ACCEPT" ? "#dcfce7" : it.status === "REJECT" ? "#fee2e2" : it.status === "PARTIAL" ? "#fff7ed" : "#f3f4f6",
                            color: it.status === "ACCEPT" ? "#166534" : it.status === "REJECT" ? "#991b1b" : it.status === "PARTIAL" ? "#9a3412" : "#374151",
                            cursor: !isAdmin ? "not-allowed" : "default",
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="ACCEPT">Accept</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="REJECT">Reject</option>
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        {it.status === "PARTIAL" ? (
                          <input type="number" value={it.acceptedQuantity ?? 0} min={0} max={it.quantity} disabled={!isAdmin} onChange={(e) => setModalItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], acceptedQuantity: Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0)) }; return n; })} style={{ width: 100, padding: 6 }} />
                        ) : (
                          <div>{it.acceptedQuantity ?? (it.status === "REJECT" ? 0 : it.quantity)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => { setModalOpen(false); setActiveLog(null); }} style={{ padding: "8px 12px" }}>Close</button>
              {isAdmin && (
                <button onClick={() => saveDecisionMutation.mutate()} disabled={saveDecisionMutation.isPending} style={{ padding: "8px 12px", background: "var(--color-primary)", color: "#fff", borderRadius: 6, opacity: saveDecisionMutation.isPending ? 0.7 : 1 }}>Save decisions</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared Request/s Reference Table */}
      <RequestReferenceTable />
    </div>
  );
}
