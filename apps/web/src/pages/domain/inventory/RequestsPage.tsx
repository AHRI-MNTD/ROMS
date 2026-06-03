import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";

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

interface RequestReferenceRow {
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
  team?: string;
  remark?: string;
  status?: string;
  acceptedQuantity?: number;
}

export default function RequestsPage() {
  const user = useAuth((state) => state.user);
  const isAdmin = user?.roles.some((role) => ["ADMIN", "RESEARCH_ADMIN"].includes(role)) ?? false;
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });
  const { data: persistedRequests, refetch: refetchPersistedRequests } = useQuery({
    queryKey: ["inventory-requests"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/requests");
      return resp.data as { data: RequestReferenceRow[]; total: number };
    },
  });

  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [requestQty, setRequestQty] = React.useState(1);
  const [note, setNote] = React.useState("");

  const [requestedBy, setRequestedBy] = React.useState("");
  const [requestedFor, setRequestedFor] = React.useState("");
  const [requestDate, setRequestDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [project, setProject] = React.useState("ROMS Inventory");
  const [team, setTeam] = React.useState("");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logs, setLogs] = React.useState<RequestLogEntry[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeLog, setActiveLog] = React.useState<RequestLogEntry | null>(null);
  const [modalItems, setModalItems] = React.useState<Array<{ id: string; movementId?: string; sku?: string; name?: string; quantity: number; status: "PENDING" | "ACCEPT" | "REJECT" | "PARTIAL"; acceptedQuantity?: number }>>([]);
  const [projects, setProjects] = React.useState<string[]>([]);
  const [staffMembers, setStaffMembers] = React.useState<string[]>([]);
  const [referenceStatuses, setReferenceStatuses] = React.useState<Record<string, "ACCEPT" | "PENDING" | "REJECTED" | "PARTIAL">>({});
  const [referenceDecisionOrder, setReferenceDecisionOrder] = React.useState<string[]>([]);
  const [referenceRows, setReferenceRows] = React.useState<RequestReferenceRow[]>([]);

  const [cartItems, setCartItems] = React.useState<Array<{ id: string; sku?: string; name?: string; quantity: number }>>([]);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [decidedBatchIds, setDecidedBatchIds] = React.useState<Set<string>>(new Set());
  const [showAllLogs, setShowAllLogs] = React.useState(false);

  const selectedItem = React.useMemo(() => (data?.data ?? []).find((item) => item.id === selectedItemId), [data?.data, selectedItemId]);
  const currentQty = Number(selectedItem?.quantity ?? 0);
  const projectedBalance = Math.max(0, currentQty - Math.max(0, requestQty));

  // no status badges here anymore; requests are submitted for review

  const inventoryReferenceRows = React.useMemo<RequestReferenceRow[]>(() => {
    return (data?.data ?? []).map((item, index) => {
      const quantity = Number(item.quantity ?? 0);
      const minThreshold = Number(item.minThreshold ?? 0);
      const isOutOfStock = quantity <= 0;
      const isLowStock = quantity > 0 && quantity <= minThreshold;
      const name = String(item.name ?? "").toLowerCase();
      const category =
        name.includes("tube") || name.includes("plate") || name.includes("dish")
          ? "Consumables"
          : name.includes("meter") || name.includes("thermo")
            ? "Equipment"
            : "General";
      return {
        rowKey: item.id ?? item.sku ?? `${index}`,
        codeNo: item.sku ?? "—",
        barcode: item.sku ?? "—",
        itemDescription: item.name ?? "—",
        quantity,
        unit: item.unit ?? "units",
        unitDescription: `${item.unit ?? "units"} per pack`,
        category,
        dateRequested: new Date().toISOString().slice(0, 10),
        requestedBy: user?.displayName ?? user?.email ?? "Unknown User",
        requestedFor: "",
        project: "ROMS Inventory",
        team: "",
        remark: isOutOfStock ? "Out of stock" : isLowStock ? "Low stock" : item.lotNumber ? `Lot: ${item.lotNumber}` : "In stock",
      };
    });
  }, [data?.data, user?.displayName, user?.email]);

  React.useEffect(() => {
    let mounted = true;
    apiClient
      .get("/domains/inventory/master-data", { params: { page: 1, pageSize: 1000 } })
      .then((resp) => {
        const rows = (resp.data?.data ?? []) as Array<{ project?: string | null; staff?: string | null }>;
        if (!mounted) return;
        const projectList = Array.from(new Set(rows.map((row) => String(row.project ?? "").trim()).filter((v) => v.length > 0)));
        const staffList = Array.from(new Set(rows.map((row) => String(row.staff ?? "").trim()).filter((v) => v.length > 0)));
        setProjects(projectList);
        setStaffMembers(staffList);
        setProject(projectList[0] ?? "ROMS Inventory");
        setRequestedBy(staffList[0] ?? "");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!data?.data?.length) return;
    setReferenceStatuses((prev) => {
      const next = { ...prev };
      for (const item of data.data) {
        const key = String(item.id ?? item.sku ?? "");
        if (!key) continue;
        if (!next[key]) {
          next[key] = "PENDING";
        }
      }
      return next;
    });
  }, [data?.data]);

  React.useEffect(() => {
    const rows = persistedRequests?.data ?? [];
    if (rows.length === 0) {
      return;
    }

    setReferenceRows(rows);
    setReferenceStatuses((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        next[String(row.rowKey)] = (row.status as "ACCEPT" | "PENDING" | "REJECTED" | "PARTIAL") ?? "PENDING";
      }
      return next;
    });

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

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    width: "100%",
  };

  const referenceStatusStyles: Record<"ACCEPT" | "PENDING" | "REJECTED" | "PARTIAL", React.CSSProperties> = {
    ACCEPT: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
    PENDING: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
    REJECTED: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  };

  const bulkRequestMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; quantity: number }>) => {
      if (items.length === 0) throw new Error("Cart is empty.");

      const resp = await apiClient.post("/domains/inventory/requests", {
        requestedBy,
        requestedFor,
        project,
        team,
        timestamp: new Date().toISOString(),
        items: items.map((it) => ({ id: it.id, quantity: it.quantity, remark: note.trim() || undefined })),
      });

      return resp.data as { data: RequestReferenceRow[] };
    },
    onSuccess: async (resp) => {
      setFeedback({ type: "success", message: `Submitted ${cartItems.length} request(s) for review.` });
      await refetchPersistedRequests();
      setCartItems([]);
      setIsReviewOpen(false);
      setRequestQty(1);
      setNote("");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Bulk request failed.";
      setFeedback({ type: "error", message });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", maxWidth: 1100}}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>Request</div>

        {feedback && (
          <div
            style={{
              marginBottom: 14,
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Select Item
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={inputStyle}>
              <option value="">Choose item</option>
              {(data?.data ?? []).map((item) => (
                <option key={item.id ?? `${item.sku}-${item.name}`} value={item.id ?? ""}>
                  {item.sku} - {item.name} (Current: {item.quantity ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Quantity
            <input type="number" min={1} value={requestQty} onChange={(e) => setRequestQty(Number(e.target.value))} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Project
            {projects.length > 0 ? (
              <select value={project} onChange={(e) => setProject(e.target.value)} style={inputStyle}>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input value={project} onChange={(e) => setProject(e.target.value)} style={inputStyle} />
            )}
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Request Date
            <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Requested By
            {staffMembers.length > 0 ? (
              <select value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} style={inputStyle}>
                {staffMembers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} style={inputStyle} />
            )}
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Requested For
            {staffMembers.length > 0 ? (
              <select value={requestedFor} onChange={(e) => setRequestedFor(e.target.value)} style={inputStyle}>
                <option value="">(none)</option>
                {staffMembers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input value={requestedFor} onChange={(e) => setRequestedFor(e.target.value)} style={inputStyle} />
            )}
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Team
            <input value={team} onChange={(e) => setTeam(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Remark
            <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Current Stock</div>
            <div style={{ fontSize: "var(--fs-md)", color: "var(--color-text)", fontWeight: 700 }}>{selectedItem ? currentQty : "—"}</div>
          </div>
          <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Projected Balance</div>
            <div style={{ fontSize: "var(--fs-md)", color: requestQty > currentQty ? "#b91c1c" : "var(--color-text)", fontWeight: 700 }}>{selectedItem ? projectedBalance : "—"}</div>
          </div>
          <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Validation</div>
            <div style={{ fontSize: "var(--fs-md)", color: !selectedItem ? "var(--color-text-muted)" : requestQty > currentQty ? "#b45309" : "#166534", fontWeight: 700 }}>
              {!selectedItem ? "Select item" : requestQty > currentQty ? "⚠ Exceeds stock" : "Valid"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {isLoading && "Loading inventory items..."}
            {!isLoading && error && "Inventory list unavailable. You can still try creating a new item."}
            {!isLoading && !error && `Loaded ${(data?.data ?? []).length} items`}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                // add selected item to cart
                setFeedback(null);
                if (!selectedItem?.id) return setFeedback({ type: 'error', message: 'Select an item first.' });
                if (!Number.isFinite(requestQty) || requestQty <= 0) return setFeedback({ type: 'error', message: 'Quantity must be > 0.' });
                // Allow requests exceeding current stock — Project Manager will decide
                const sid = selectedItem.id as string;
                const sSku = selectedItem.sku ?? "";
                const sName = selectedItem.name ?? "";
                setCartItems((c) => [...c, { id: sid, sku: sSku, name: sName, quantity: requestQty }]);
                setRequestQty(1);
              }}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add to Cart
            </button>

            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              disabled={cartItems.length === 0}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Review
            </button>
          </div>
        </div>

        {/* Cart and Review container: review stays inside the cart block and only adds one footer row */}
        <div style={{ position: 'relative', marginTop: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: isReviewOpen ? 'rgba(212, 233, 229, 0.82)' : 'var(--color-surface)' }}>
          {cartItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, marginBottom: 8, padding: '10px 10px 0 10px' }}>
                {isReviewOpen ? 'Review Request(s)' : 'Cart'}
              </div>

              <div style={{ overflowX: 'auto', padding: '0 10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: isReviewOpen ? '12%' : '18%' }} />
                    <col style={{ width: isReviewOpen ? '12%' : '40%' }} />
                    {isReviewOpen && <col style={{ width: '12%' }} />}
                    {isReviewOpen && <col style={{ width: '12%' }} />}
                    {isReviewOpen && <col style={{ width: '12%' }} />}
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                      {isReviewOpen ? (
                        <>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Requested By</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Requested For</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Project</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Team</th>
                        </>
                      ) : (
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((c, i) => (
                      <tr key={`${c.id}-${i}`} style={{ borderBottom: '1px solid var(--color-divider)', height: 40 }}>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sku} - {c.name}</td>
                        <td style={{ padding: '8px' }}>{c.quantity}</td>
                        {isReviewOpen ? (
                          <>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{requestedBy}</td>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{requestedFor || '—'}</td>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project}</td>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team || '—'}</td>
                          </>
                        ) : (
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => {
                              setSelectedItemId(c.id);
                              setRequestQty(c.quantity);
                              setCartItems((rows) => rows.filter((_, idx) => idx !== i));
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                                aria-label="Edit item"
                                title="Edit"
                              >
                                <span aria-hidden="true">✎</span>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCartItems((rows) => rows.filter((_, idx) => idx !== i))}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid #fca5a5',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                                aria-label="Delete item"
                                title="Delete"
                              >
                                <span aria-hidden="true">X</span>
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isReviewOpen && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px', borderTop: '1px solid var(--color-divider)', background: 'rgba(17, 24, 39, 0.08)' }}>
                  <button onClick={() => setIsReviewOpen(false)} style={{ padding: '8px 12px' }}>Back</button>
                  <button onClick={() => bulkRequestMutation.mutate(cartItems.map((c) => ({ id: c.id, quantity: c.quantity })))} style={{ padding: '8px 12px', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px' }}>Submit</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", maxWidth: 1100 }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Recent Request Activity (Session)</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No request actions recorded yet in this session.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Time</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested By</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested For</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(entry.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.itemLabel}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.requestedBy}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.requestedFor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>Request/s Reference Table</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              value={requestSearch}
              onChange={(e) => {
                setRequestSearch(e.target.value);
                setRequestPage(1);
              }}
              placeholder="Search by Tracking ID, Item, Requested By, Project..."
              style={{
                minWidth: 300,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
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
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
                fontWeight: 600,
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select
              value={String(requestPageSize)}
              onChange={(e) => {
                setRequestPageSize(Number(e.target.value));
                setRequestPage(1);
              }}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
              }}
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Tracking ID</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Code_No</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Barcode</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item_Description</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Quantity</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit_Description</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Category</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date_Requested</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested_By</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested_For</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Team</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Status</th>
                </tr>
            </thead>
            <tbody>
              {inventoryReferenceRows.length === 0 ? (
                <tr>
                    <td colSpan={15} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>
                    No matching records available.
                  </td>
                </tr>
              ) : (
                inventoryReferenceRows.map((row, index) => (
                  <tr key={`${row.codeNo}-${index}`} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.codeNo}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.barcode}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.itemDescription}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.unit}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.unitDescription}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.category}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.dateRequested}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.requestedBy}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.requestedFor}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.project}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.team}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.remark}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", minWidth: 130 }}>
                        <select
                          value={referenceStatuses[String(row.rowKey)] ?? "PENDING"}
                          onChange={(e) => {
                            const next = e.target.value as "ACCEPT" | "PENDING" | "REJECTED";
                            setReferenceStatuses((prev) => ({ ...prev, [String(row.rowKey)]: next }));
                          }}
                          style={{
                            ...inputStyle,
                            minWidth: 120,
                            padding: "6px 8px",
                            fontWeight: 700,
                            ...referenceStatusStyles[referenceStatuses[String(row.rowKey)] ?? "PENDING"],
                          }}
                        >
                          {(() => {
                            const s = (referenceStatuses[String(row.rowKey)] as string) ?? (row as any).status ?? "PENDING";
                            if (s === "ACCEPT") return "APPROVED";
                            if (s === "PARTIAL") return "PARTIAL";
                            if (s === "REJECTED") return "REJECTED";
                            return "PENDING";
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Page {requestPage} of {requestTotalPages} (total records: {filteredRequests.length})
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
    </div>
  );
}
