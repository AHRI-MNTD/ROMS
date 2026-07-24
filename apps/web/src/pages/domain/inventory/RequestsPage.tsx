import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";
import { InventoryItemSelect } from "./InventoryItemSelect";
import { RequestReferenceTable } from "./RequestReferenceTable";

export default function RequestsPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });

  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [selectedItemQuery, setSelectedItemQuery] = React.useState("");
  const [requestQty, setRequestQty] = React.useState(1);
  const [note, setNote] = React.useState("");

  const [requestedBy, setRequestedBy] = React.useState("");
  const [requestedFor, setRequestedFor] = React.useState("");
  const [requestDate, setRequestDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [project, setProject] = React.useState("ROMS Inventory");
  const [team, setTeam] = React.useState("");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [projects, setProjects] = React.useState<string[]>([]);
  const [staffMembers, setStaffMembers] = React.useState<string[]>([]);

  interface CartItem {
    id: string;
    stockItemId: string;
    itemLabel: string;
    quantity: number;
    project: string;
    requestedBy: string;
    requestedFor: string;
    team: string;
    remark: string;
  }
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);

  const selectedItem = React.useMemo(() => (data?.data ?? []).find((item) => item.id === selectedItemId), [data?.data, selectedItemId]);
  const currentQty = Number(selectedItem?.quantity ?? 0);
  const projectedBalance = Math.max(0, currentQty - Math.max(0, requestQty));

  React.useEffect(() => {
    if (!selectedItemQuery.trim()) {
      setSelectedItemId("");
      return;
    }

    const exact = (data?.data ?? []).find((item) => {
      const sku = String(item.sku ?? "").trim().toLowerCase();
      const name = String(item.name ?? "").trim().toLowerCase();
      const query = selectedItemQuery.trim().toLowerCase();
      return query === sku || query === name || query === `${sku} - ${name}`;
    });

    if (exact) {
      setSelectedItemId(exact.id ?? "");
    }
  }, [data?.data, selectedItemQuery]);

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
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10.5px",
    width: "100%",
    height: 30,
  };

  const bulkRequestMutation = useMutation({
    mutationFn: async (items: CartItem[]) => {
      if (items.length === 0) throw new Error("Cart is empty.");
      const firstItem = items[0];

      const resp = await apiClient.post("/domains/inventory/requests", {
        requestedBy: firstItem.requestedBy,
        requestedFor: firstItem.requestedFor || undefined,
        project: firstItem.project,
        team: firstItem.team || undefined,
        timestamp: new Date().toISOString(),
        items: items.map((it) => ({ id: it.stockItemId, quantity: it.quantity, remark: it.remark || undefined })),
      });

      return resp.data;
    },
    onSuccess: async () => {
      setFeedback({ type: "success", message: `Submitted request(s) for review.` });
      queryClient.invalidateQueries({ queryKey: ["inventory-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setCartItems([]);
      setRequestQty(1);
      setNote("");
      setSelectedItemId("");
      setSelectedItemQuery("");
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Bulk request failed.") });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Request Form & Batch Cart */}
      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          <InventoryItemSelect
            label="Select Item"
            items={data?.data ?? []}
            value={selectedItemQuery}
            onValueChange={(value) => {
              setSelectedItemQuery(value);
              setSelectedItemId("");
            }}
            onSelectItem={(item) => {
              setSelectedItemId(item.id ?? "");
              setSelectedItemQuery([item.sku, item.name].filter(Boolean).join(" - "));
            }}
            placeholder="Type item name or Id"
            inputStyle={{ ...inputStyle, minWidth: "auto" }}
            wrapperStyle={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "10px" }}
            renderItemMeta={(item) => `Current: ${Number(item.quantity ?? 0)} ${item.unit ?? "units"}`}
            variant="minimal"
          />

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Quantity
            <input type="number" min={1} value={requestQty} onChange={(e) => setRequestQty(Number(e.target.value))} style={inputStyle} />
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Request Date
            <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Team
            <input value={team} onChange={(e) => setTeam(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Remark
            <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          <div style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Current Stock</div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", fontWeight: 700 }}>{selectedItem ? currentQty : "—"}</div>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Projected Balance</div>
            <div style={{ fontSize: "var(--fs-sm)", color: requestQty > currentQty ? "#b91c1c" : "var(--color-text)", fontWeight: 700 }}>{selectedItem ? projectedBalance : "—"}</div>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Validation</div>
            <div style={{ fontSize: "var(--fs-sm)", color: !selectedItem ? "var(--color-text-muted)" : requestQty > currentQty ? "#b45309" : "#166534", fontWeight: 700 }}>
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
                setFeedback(null);
                if (!selectedItem) {
                  setFeedback({ type: 'error', message: 'Select an item first.' });
                  return;
                }
                if (!Number.isFinite(requestQty) || requestQty <= 0) {
                  setFeedback({ type: 'error', message: 'Quantity must be > 0.' });
                  return;
                }
                if (!project.trim()) {
                  setFeedback({ type: "error", message: "Project is required." });
                  return;
                }
                if (!requestedBy.trim()) {
                  setFeedback({ type: "error", message: "Requested by is required." });
                  return;
                }

                const newItem: CartItem = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  stockItemId: selectedItem.id!,
                  itemLabel: `${selectedItem.sku ?? ""} - ${selectedItem.name ?? ""}`.trim(),
                  quantity: requestQty,
                  project: project.trim(),
                  requestedBy: requestedBy.trim(),
                  requestedFor: requestedFor.trim(),
                  team: team.trim(),
                  remark: note.trim() || "Request item",
                };
                setCartItems((prev) => [...prev, newItem]);
                setFeedback({ type: 'success', message: `Added ${requestQty} units of ${selectedItem.name} to cart.` });

                setSelectedItemId("");
                setSelectedItemQuery("");
                setRequestQty(1);
                setNote("");
              }}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ➕ Add to Cart
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                if (!selectedItem) {
                  setFeedback({ type: 'error', message: 'Select an item to request.' });
                  return;
                }
                if (!Number.isFinite(requestQty) || requestQty <= 0) {
                  setFeedback({ type: 'error', message: 'Request quantity must be greater than zero.' });
                  return;
                }
                if (!project.trim()) {
                  setFeedback({ type: 'error', message: 'Project is required.' });
                  return;
                }
                if (!requestedBy.trim()) {
                  setFeedback({ type: 'error', message: 'Requested by is required.' });
                  return;
                }

                const newItem: CartItem = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  stockItemId: selectedItem.id!,
                  itemLabel: `${selectedItem.sku ?? ""} - ${selectedItem.name ?? ""}`.trim(),
                  quantity: requestQty,
                  project: project.trim(),
                  requestedBy: requestedBy.trim(),
                  requestedFor: requestedFor.trim(),
                  team: team.trim(),
                  remark: note.trim() || "Request item",
                };

                bulkRequestMutation.mutate([newItem]);
              }}
              disabled={bulkRequestMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: bulkRequestMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {bulkRequestMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        {cartItems.length > 0 && (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>🛒 Batch Request Cart ({cartItems.length} items)</div>
              <button
                type="button"
                onClick={() => setCartItems([])}
                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "10.5px", fontWeight: 600 }}
              >
                Clear Cart
              </button>
            </div>
            <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
              <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10.5px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={thStyle} title="Item Label">Item</th>
                          <th style={thStyle} title="Quantity">Qty</th>
                          <th style={thStyle} title="Project">Project</th>
                          <th style={thStyle} title="Requested By">By</th>
                          <th style={thStyle} title="Requested For">For</th>
                          <th style={thStyle} title="Team">Team</th>
                          <th style={thStyle} title="Remark">Remark</th>
                          <th style={{ ...thStyle, textAlign: "center" }} title="Action">Action</th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => {
                    const cellStyle: React.CSSProperties = {
                      padding: "6px 8px",
                      fontSize: "10.5px",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    };
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 32 }}>
                        <td style={cellStyle} title={item.itemLabel}>{item.itemLabel}</td>
                        <td style={cellStyle}>{item.quantity}</td>
                        <td style={cellStyle} title={item.project}>{item.project}</td>
                        <td style={cellStyle} title={item.requestedBy}>{item.requestedBy}</td>
                        <td style={cellStyle} title={item.requestedFor || "—"}>{item.requestedFor || "—"}</td>
                        <td style={cellStyle} title={item.team || "—"}>{item.team || "—"}</td>
                        <td style={cellStyle} title={item.remark}>{item.remark}</td>
                        <td style={{ padding: "4px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.stockItemId);
                                setSelectedItemQuery(item.itemLabel);
                                setRequestQty(item.quantity);
                                setProject(item.project);
                                setRequestedBy(item.requestedBy);
                                setRequestedFor(item.requestedFor);
                                setTeam(item.team);
                                setNote(item.remark);
                                setCartItems((prev) => prev.filter((i) => i.id !== item.id));
                              }}
                              title="Edit item"
                              style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "12px", padding: 0 }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => setCartItems((prev) => prev.filter((i) => i.id !== item.id))}
                              title="Remove item"
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "12px", padding: 0 }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  bulkRequestMutation.mutate(cartItems);
                }}
                disabled={bulkRequestMutation.isPending}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-primary)",
                  color: "#fff",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  cursor: bulkRequestMutation.isPending ? "not-allowed" : "pointer",
                }}
              >
                {bulkRequestMutation.isPending ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared Request/s Reference Table */}
      <RequestReferenceTable />
    </div>
  );
}
