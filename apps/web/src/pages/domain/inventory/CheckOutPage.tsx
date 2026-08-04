import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";
import { InventoryItemSelect } from "./InventoryItemSelect";

interface LabelOverrides {
  mainTitle?: string;
  quantity?: string;
  referenceTable?: string;
}

interface CheckOutPageProps {
  mode?: string;
  labelOverrides?: LabelOverrides;
}

export default function CheckOutPage({ mode, labelOverrides }: CheckOutPageProps = {}) {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });

  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [selectedItemQuery, setSelectedItemQuery] = React.useState("");
  const [checkOutQty, setCheckOutQty] = React.useState(1);
  const [projectFor, setProjectFor] = React.useState("ROMS Inventory");
  const [dateRequested, setDateRequested] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = React.useState("");
  const [note, setNote] = React.useState("");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  interface CartItem {
    id: string;
    stockItemId: string;
    itemLabel: string;
    quantity: number;
    projectFor: string;
    requestedBy: string;
    remark: string;
  }
  const [cart, setCart] = React.useState<CartItem[]>([]);

  const bulkCheckoutMutation = useMutation({
    mutationFn: async (items: Omit<CartItem, "id" | "itemLabel">[]) => {
      const resp = await apiClient.post("/domains/inventory/bulk-checkout", { items });
      return resp.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-checkout-movements"] });
      setFeedback({
        type: "success",
        message: `Successfully checked out batch of ${cart.length} item(s).`,
      });
      setCart([]);
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Bulk check-out failed.") });
    },
  });

  const { data: checkOutMovementsData } = useQuery({
    queryKey: ["inventory-checkout-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { type: "CHECK_OUT", limit: 50 },
      });
      return resp.data as { data: any[]; total: number };
    },
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("date-desc");
  const [historyPage, setHistoryPage] = React.useState(1);
  const historyPageSize = 15;

  const historyCategories = React.useMemo(() => {
    if (!checkOutMovementsData?.data) return [];
    const cats = new Set<string>();
    checkOutMovementsData.data.forEach((row) => {
      const cat = row.stockItem?.category || "General";
      cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [checkOutMovementsData]);

  const filteredAndSortedMovements = React.useMemo(() => {
    if (!checkOutMovementsData?.data) return [];

    let result = checkOutMovementsData.data.filter((row) => {
      const sku = (row.stockItem?.sku ?? "").toLowerCase();
      const name = (row.stockItem?.name ?? "").toLowerCase();
      const category = (row.stockItem?.category ?? "General").toLowerCase();
      const project = (row.projectFor ?? "").toLowerCase();
      const remark = (row.remark ?? "").toLowerCase();
      const requested = (row.requestedBy ?? "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch = !query ||
        sku.includes(query) ||
        name.includes(query) ||
        category.includes(query) ||
        project.includes(query) ||
        remark.includes(query) ||
        requested.includes(query);

      const matchesCategory = categoryFilter === "all" ||
        (row.stockItem?.category ?? "General").toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      }
      if (sortBy === "qty-desc") {
        return Number(b.quantity ?? 0) - Number(a.quantity ?? 0);
      }
      if (sortBy === "qty-asc") {
        return Number(a.quantity ?? 0) - Number(b.quantity ?? 0);
      }
      if (sortBy === "name-asc") {
        return (a.stockItem?.name ?? "").localeCompare(b.stockItem?.name ?? "");
      }
      if (sortBy === "name-desc") {
        return (b.stockItem?.name ?? "").localeCompare(a.stockItem?.name ?? "");
      }
      return 0;
    });

    return result;
  }, [checkOutMovementsData, searchQuery, categoryFilter, sortBy]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredAndSortedMovements.length / historyPageSize));
  const historyPagedRows = filteredAndSortedMovements.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );
  React.useEffect(() => { setHistoryPage(1); }, [searchQuery, categoryFilter, sortBy]);
  React.useEffect(() => {
    if (historyPage > historyTotalPages && historyTotalPages > 0) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  const [projects, setProjects] = React.useState<string[]>([]);
  const [staffMembers, setStaffMembers] = React.useState<string[]>([]);

  const selectedItem = React.useMemo(() => (data?.data ?? []).find((item) => item.id === selectedItemId), [data?.data, selectedItemId]);
  const currentQty = Number(selectedItem?.quantity ?? 0);
  const projectedBalance = Math.max(0, currentQty - Math.max(0, checkOutQty));

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

  const inventoryReferenceRows = React.useMemo(() => {
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
        projectFor: "ROMS Inventory",
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
        const projectList = Array.from(new Set(rows.map((row) => String(row.project ?? "").trim()).filter((value): value is string => value.length > 0)));
        const staffList = Array.from(new Set(rows.map((row) => String(row.staff ?? "").trim()).filter((value): value is string => value.length > 0)));
        setProjects(projectList);
        setStaffMembers(staffList);
        setProjectFor(projectList[0] ?? "ROMS Inventory");
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

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem?.id) {
        throw new Error("Select an item to check out.");
      }
      if (!Number.isFinite(checkOutQty) || checkOutQty <= 0) {
        throw new Error("Check-out quantity must be greater than zero.");
      }
      if (checkOutQty > currentQty) {
        throw new Error("Check-out quantity cannot exceed current stock.");
      }
      if (!projectFor.trim()) {
        throw new Error("Project for is required.");
      }
      if (!requestedBy.trim()) {
        throw new Error("Requested by is required.");
      }

      await apiClient.post("/domains/inventory/bulk-checkout", {
        items: [{
          stockItemId: selectedItem.id,
          quantity: checkOutQty,
          projectFor: projectFor.trim(),
          requestedBy: requestedBy.trim(),
          remark: note.trim() || undefined,
        }],
      });

      return {
        itemLabel: `${selectedItem.sku ?? ""} ${selectedItem.name ?? ""}`.trim(),
        quantity: checkOutQty,
        destination: projectFor.trim(),
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });

      setFeedback({
        type: "success",
        message: `Checked out ${result.quantity} unit(s) for ${result.itemLabel} to ${result.destination}.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["inventory-checkout-movements"] });


      setCheckOutQty(1);
      setDateRequested(new Date().toISOString().slice(0, 10));
      setRequestedBy(staffMembers[0] || "");
      setNote("");
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Check-out failed.") });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: "1px solid #d97706",
          background: "linear-gradient(180deg, var(--color-surface-2) 0%, rgba(251, 191, 36, 0.05) 100%)",
          boxShadow: "0 4px 16px rgba(217, 119, 6, 0.07)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(251, 191, 36, 0.05) 100%)",
            border: "1px solid rgba(217, 119, 6, 0.18)",
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
              background: "rgba(217, 119, 6, 0.12)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📤
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                {labelOverrides?.mainTitle || "Check Out Form"}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "rgba(217, 119, 6, 0.12)",
                  color: "#d97706",
                  border: "1px solid rgba(217, 119, 6, 0.22)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Outgoing Stock
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
              Select an item from inventory and enter the quantity to dispense
            </div>
          </div>
        </div>

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

        <div className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
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
            {labelOverrides?.quantity || "Quantity"}
            <input type="number" min={1} value={checkOutQty} onChange={(e) => setCheckOutQty(Number(e.target.value))} style={inputStyle} />
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Project For
            {projects.length > 0 ? (
              <select value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle}>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            ) : (
              <input value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} />
            )}
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Date Requested
            <input type="date" value={dateRequested} onChange={(e) => setDateRequested(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
            Requested By
            {staffMembers.length > 0 ? (
              <select value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} style={inputStyle}>
                {staffMembers.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff}
                  </option>
                ))}
              </select>
            ) : (
              <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} style={inputStyle} />
            )}
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
            <div style={{ fontSize: "var(--fs-sm)", color: checkOutQty > currentQty ? "#b91c1c" : "var(--color-text)", fontWeight: 700 }}>{selectedItem ? projectedBalance : "—"}</div>
          </div>
          <div style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Validation</div>
            <div style={{ fontSize: "var(--fs-sm)", color: !selectedItem ? "var(--color-text-muted)" : checkOutQty > currentQty ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {!selectedItem ? "Select item" : checkOutQty > currentQty ? "Exceeds stock" : "Valid"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {isLoading && "Loading inventory items..."}
            {!isLoading && error && "Inventory list unavailable."}
            {!isLoading && !error && `Loaded ${(data?.data ?? []).length} items`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                if (!selectedItem) {
                  setFeedback({ type: "error", message: "Select an item to add to batch." });
                  return;
                }
                if (!Number.isFinite(checkOutQty) || checkOutQty <= 0) {
                  setFeedback({ type: "error", message: "Quantity must be greater than zero." });
                  return;
                }
                if (checkOutQty > currentQty) {
                  setFeedback({ type: "error", message: "Quantity cannot exceed current stock." });
                  return;
                }
                if (!projectFor.trim()) {
                  setFeedback({ type: "error", message: "Project for is required." });
                  return;
                }
                if (!requestedBy.trim()) {
                  setFeedback({ type: "error", message: "Requested by is required." });
                  return;
                }

                const newItem: CartItem = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  stockItemId: selectedItem.id!,
                  itemLabel: `${selectedItem.sku ?? ""} ${selectedItem.name ?? ""}`.trim(),
                  quantity: checkOutQty,
                  projectFor: projectFor.trim(),
                  requestedBy: requestedBy.trim(),
                  remark: note.trim() || "Batch checkout",
                };
                setCart((prev) => [...prev, newItem]);
                setFeedback({ type: "success", message: `Added ${checkOutQty} units of ${selectedItem.name} to batch.` });

                setSelectedItemId("");
                setSelectedItemQuery("");
                setCheckOutQty(1);
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
                cursor: "pointer",
              }}
            >
              ➕ Add to Cart
            </button>

          </div>
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>🛒 Batch Checkout Cart ({cart.length} items)</div>
              <button
                type="button"
                onClick={() => setCart([])}
                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "10.5px", fontWeight: 600 }}
              >
                Clear Cart
              </button>
            </div>
            <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
              <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "24%" }} />
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
                          <th style={thStyle} title="Project For">Project</th>
                          <th style={thStyle} title="Recipient">Recipient</th>
                          <th style={thStyle} title="Remark">Remark</th>
                          <th style={{ ...thStyle, textAlign: "center" }} title="Action">Action</th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
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
                        <td style={cellStyle} title={item.projectFor}>{item.projectFor}</td>
                        <td style={cellStyle} title={item.requestedBy}>{item.requestedBy}</td>
                        <td style={cellStyle} title={item.remark}>{item.remark}</td>
                        <td style={{ padding: "4px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.stockItemId);
                                setSelectedItemQuery(item.itemLabel);
                                setCheckOutQty(item.quantity);
                                setProjectFor(item.projectFor);
                                setRequestedBy(item.requestedBy);
                                setNote(item.remark);
                                setCart((prev) => prev.filter((i) => i.id !== item.id));
                              }}
                              title="Edit item"
                              style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "12px", padding: 0 }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => setCart((prev) => prev.filter((i) => i.id !== item.id))}
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
                const payload = cart.map((i) => ({
                  stockItemId: i.stockItemId,
                  quantity: i.quantity,
                  projectFor: i.projectFor,
                  requestedBy: i.requestedBy,
                  remark: i.remark,
                }));
                bulkCheckoutMutation.mutate(payload);
              }}
              disabled={bulkCheckoutMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "8px 16px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: bulkCheckoutMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {bulkCheckoutMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}
      </div>

      <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>{labelOverrides?.referenceTable || "Check-Out Reference Table (History)"}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                fontSize: "10px",
                height: 28,
                minWidth: "140px",
              }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                height: 28,
                fontSize: "10px",
              }}
            >
              <option value="all">All Categories</option>
              {historyCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                height: 28,
                fontSize: "10px",
              }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="qty-desc">Quantity (High to Low)</option>
              <option value="qty-asc">Quantity (Low to High)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
        <div className="table-responsive-container" style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                {(() => {
                  const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                  return (
                    <>
                      <th style={thStyle} title="Code_No">Code</th>
                      <th style={thStyle} title="Barcode">Barcode</th>
                      <th style={thStyle} title="Item_Description">Description</th>
                      <th style={thStyle} title="Quantity">Qty</th>
                      <th style={thStyle} title="Unit">Unit</th>
                      <th style={thStyle} title="Unit_Description">Unit Desc</th>
                      <th style={thStyle} title="Category">Category</th>
                      <th style={thStyle} title="Date Requested">Requested</th>
                      <th style={thStyle} title="Requested By">Recipient</th>
                      <th style={thStyle} title="Project For">Project</th>
                      <th style={thStyle} title="Remark">Remark</th>
                    </>
                  );
                })()}
              </tr>
            </thead>
            <tbody>
              {historyPagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "10px", fontSize: "10px", color: "var(--color-text-muted)" }}>
                    No check-out history records available.
                  </td>
                </tr>
              ) : (
                historyPagedRows.map((row) => {
                  const cellStyle: React.CSSProperties = {
                    padding: "6px 8px",
                    fontSize: "10px",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  };
                  const codeVal = row.stockItem?.sku ?? "—";
                  const descVal = row.stockItem?.name ?? "—";
                  const unitVal = row.stockItem?.unit ?? "units";
                  const unitDescVal = `${row.stockItem?.unit ?? "units"} per pack`;
                  const catVal = row.stockItem?.category ?? "General";
                  const dateReqVal = new Date(row.occurredAt).toLocaleDateString();
                  const reqByVal = row.requestedBy ?? "—";
                  const projVal = row.projectFor ?? "—";
                  const remarkVal = row.remark ?? "—";

                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 32 }}>
                      <td style={cellStyle} title={codeVal}>{codeVal}</td>
                      <td style={cellStyle} title={codeVal}>{codeVal}</td>
                      <td style={cellStyle} title={descVal}>{descVal}</td>
                      <td style={cellStyle}>{row.quantity}</td>
                      <td style={cellStyle} title={unitVal}>{unitVal}</td>
                      <td style={cellStyle} title={unitDescVal}>{unitDescVal}</td>
                      <td style={cellStyle} title={catVal}>{catVal}</td>
                      <td style={cellStyle} title={dateReqVal}>{dateReqVal}</td>
                      <td style={cellStyle} title={reqByVal}>{reqByVal}</td>
                      <td style={cellStyle} title={projVal}>{projVal}</td>
                      <td style={cellStyle} title={remarkVal}>{remarkVal}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History pagination — outside panel, bottom of page */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
          Page {historyPage} of {historyTotalPages}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            disabled={historyPage <= 1}
            style={{
              border: "1px solid var(--color-divider)",
              background: historyPage <= 1 ? "var(--color-surface-2)" : "var(--color-surface)",
              color: "var(--color-text)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "var(--fs-xs)",
              cursor: historyPage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
            disabled={historyPage >= historyTotalPages}
            style={{
              border: "1px solid var(--color-divider)",
              background: historyPage >= historyTotalPages ? "var(--color-surface-2)" : "var(--color-surface)",
              color: "var(--color-text)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "var(--fs-xs)",
              cursor: historyPage >= historyTotalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}