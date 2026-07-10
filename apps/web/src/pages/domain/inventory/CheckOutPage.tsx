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
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    width: "100%",
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
      <div style={{ padding: 19, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>{labelOverrides?.mainTitle || "Check Out"}</div>

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
            inputStyle={inputStyle}
            renderItemMeta={(item) => `Current: ${Number(item.quantity ?? 0)} ${item.unit ?? "units"}`}
            variant="minimal"
          />

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {labelOverrides?.quantity || "Quantity"}
            <input type="number" min={1} value={checkOutQty} onChange={(e) => setCheckOutQty(Number(e.target.value))} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
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

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Date Requested
            <input type="date" value={dateRequested} onChange={(e) => setDateRequested(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
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
            <div style={{ fontSize: "var(--fs-md)", color: checkOutQty > currentQty ? "#b91c1c" : "var(--color-text)", fontWeight: 700 }}>{selectedItem ? projectedBalance : "—"}</div>
          </div>
          <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Validation</div>
            <div style={{ fontSize: "var(--fs-md)", color: !selectedItem ? "var(--color-text-muted)" : checkOutQty > currentQty ? "#b91c1c" : "#166534", fontWeight: 700 }}>
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
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                checkOutMutation.mutate();
              }}
              disabled={checkOutMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: checkOutMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {checkOutMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 12, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>🛒 Batch Checkout Cart ({cart.length} items)</div>
            <button
              type="button"
              onClick={() => setCart([])}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "var(--fs-xs)" }}
            >
              Clear Cart
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Recipient</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
                  <th style={{ padding: "8px", textAlign: "center", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase", width: 140 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => {
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 40 }}>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.itemLabel}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.quantity}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.projectFor}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.requestedBy}</td>
                      <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.remark}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
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
                            style={{ background: "none", border: "none", color: "var(--color-text)", cursor: "pointer", fontSize: "var(--fs-xs)" }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setCart((prev) => prev.filter((i) => i.id !== item.id))}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "var(--fs-xs)" }}
                          >
                            🗑️ Remove
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

      <div style={{ padding: 18, border: "1px solid var(--color-border)", borderRadius: "var(--radius)", background: "var(--color-surface-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>{labelOverrides?.referenceTable || "Check-Out Reference Table (History)"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
                minWidth: "160px",
              }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
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
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "6px 10px",
                fontSize: "var(--fs-xs)",
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
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Code_No</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Barcode</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item_Description</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Quantity</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit_Description</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Category</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date Requested</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested By</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project For</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {historyPagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    No check-out history records available.
                  </td>
                </tr>
              ) : (
                historyPagedRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 40 }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.sku ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.sku ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                      <div title={row.stockItem?.name ?? ""} style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.stockItem?.name ?? "—"}
                      </div>
                    </td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.unit ?? "units"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{`${row.stockItem?.unit ?? "units"} per pack`}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.category ?? "General"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(row.occurredAt).toLocaleDateString()}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.requestedBy ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.projectFor ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                      <div title={row.remark ?? ""} style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.remark ?? "—"}
                      </div>
                    </td>
                  </tr>
                ))
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