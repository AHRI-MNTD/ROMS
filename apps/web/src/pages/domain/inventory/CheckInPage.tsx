import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { InventoryItemSelect } from "./InventoryItemSelect";

type CheckInMode = "existing" | "new";

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });

  const [mode, setMode] = React.useState<CheckInMode>("existing");
  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [selectedItemQuery, setSelectedItemQuery] = React.useState("");
  const [checkInQty, setCheckInQty] = React.useState(1);
  const [note, setNote] = React.useState("");
  const [projectFor, setProjectFor] = React.useState("");
  const [dateReceived, setDateReceived] = React.useState(() => toDateInputValue());
  const [expiryDate, setExpiryDate] = React.useState<string>("");
  const [projects, setProjects] = React.useState<string[]>([]);

  const [newSku, setNewSku] = React.useState("");
  const [newBarcode, setNewBarcode] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newUnit, setNewUnit] = React.useState("units");
  const [newOpeningQty, setNewOpeningQty] = React.useState(1);
  const [newUnitDescription, setNewUnitDescription] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newExpiryDate, setNewExpiryDate] = React.useState<string>("");

  const [newMinThreshold, setNewMinThreshold] = React.useState<number>(5);

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  interface CartItem {
    id: string;
    mode: CheckInMode;
    stockItemId?: string;
    sku?: string;
    barcode?: string;
    name?: string;
    unit?: string;
    unitDescription?: string;
    category?: string;
    quantity: number;
    minThreshold?: number;
    projectFor: string;
    dateReceived: string;
    expiryDate?: string;
    remark?: string;
    itemLabel: string;
  }
  const [cart, setCart] = React.useState<CartItem[]>([]);

  const bulkCheckInMutation = useMutation({
    mutationFn: async (items: Omit<CartItem, "id" | "itemLabel">[]) => {
      const resp = await apiClient.post("/domains/inventory/bulk-checkin", { items });
      return resp.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-checkin-movements"] });
      setFeedback({
        type: "success",
        message: `Successfully checked in batch of ${cart.length} item(s).`,
      });
      setCart([]);
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Bulk check-in failed."),
      });
    },
  });

  const { data: checkInMovementsData } = useQuery({
    queryKey: ["inventory-checkin-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { type: "CHECK_IN", limit: 50 },
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
    if (!checkInMovementsData?.data) return [];
    const cats = new Set<string>();
    checkInMovementsData.data.forEach((row) => {
      const cat = row.stockItem?.category || "General";
      cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [checkInMovementsData]);

  const filteredAndSortedMovements = React.useMemo(() => {
    if (!checkInMovementsData?.data) return [];

    let result = checkInMovementsData.data.filter((row) => {
      const sku = (row.stockItem?.sku ?? "").toLowerCase();
      const name = (row.stockItem?.name ?? "").toLowerCase();
      const category = (row.stockItem?.category ?? "General").toLowerCase();
      const project = (row.projectFor ?? "").toLowerCase();
      const remark = (row.remark ?? "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch = !query ||
        sku.includes(query) ||
        name.includes(query) ||
        category.includes(query) ||
        project.includes(query) ||
        remark.includes(query);

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
  }, [checkInMovementsData, searchQuery, categoryFilter, sortBy]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredAndSortedMovements.length / historyPageSize));
  const historyPagedRows = filteredAndSortedMovements.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  // Reset to page 1 when filters change
  React.useEffect(() => { setHistoryPage(1); }, [searchQuery, categoryFilter, sortBy]);
  // Clamp page safely
  React.useEffect(() => {
    if (historyPage > historyTotalPages && historyTotalPages > 0) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const itemInputRef = React.useRef<HTMLInputElement | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = React.useState(false);
  const [itemActiveIndex, setItemActiveIndex] = React.useState(0);

  const inventoryItems = data?.data ?? [];

  const filteredItemSuggestions = React.useMemo(() => {
    const query = normalizeSearch(selectedItemQuery);
    if (!query) {
      return inventoryItems.slice(0, 20);
    }

    return inventoryItems.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      return sku.includes(query) || name.includes(query) || `${sku} - ${name}`.includes(query);
    });
  }, [inventoryItems, selectedItemQuery]);

  const selectedItem = React.useMemo(() => {
    const exactById = inventoryItems.find((item) => item.id === selectedItemId);
    if (exactById) {
      return exactById;
    }

    const query = normalizeSearch(selectedItemQuery);
    if (!query) {
      return undefined;
    }

    const exactMatches = inventoryItems.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      return query === sku || query === name || query === `${sku} - ${name}`;
    });
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }

    const partialMatches = inventoryItems.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      return sku.includes(query) || name.includes(query) || `${sku} - ${name}`.includes(query);
    });
    return partialMatches.length === 1 ? partialMatches[0] : undefined;
  }, [inventoryItems, selectedItemId, selectedItemQuery]);

  const selectedItemLabel = React.useMemo(() => {
    if (!selectedItem) {
      return "";
    }
    return [selectedItem.sku ?? "", selectedItem.name ?? ""].filter(Boolean).join(" - ");
  }, [selectedItem]);

  const selectedItemQuantity = Number(selectedItem?.quantity ?? 0);

  const computeNextSku = React.useMemo(() => {
    const nums = inventoryItems
      .map((i) => {
        const s = String(i.sku ?? "");
        const m = s.match(/(\d+)$/);
        return m ? Number(m[1]) : NaN;
      })
      .filter(Number.isFinite);
    const max = nums.length ? Math.max(...nums) : 0;
    return `MNTD${max + 1}`;
  }, [inventoryItems]);

  React.useEffect(() => {
    if (mode === "new" && !newSku) {
      setNewSku(computeNextSku);
    }
  }, [mode, computeNextSku, newSku]);

  React.useEffect(() => {
    setItemActiveIndex((prev) => Math.min(prev, Math.max(filteredItemSuggestions.length - 1, 0)));
  }, [filteredItemSuggestions.length]);

  React.useEffect(() => {
    if (!selectedItemQuery) {
      setSelectedItemId("");
      return;
    }

    const exact = inventoryItems.find((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      const query = normalizeSearch(selectedItemQuery);
      return query === sku || query === name || query === `${sku} - ${name}`;
    });

    if (exact) {
      setSelectedItemId(exact.id ?? "");
    }
  }, [inventoryItems, selectedItemQuery]);

  React.useEffect(() => {
    if (selectedItem) {
      setSelectedItemQuery(selectedItemLabel);
    }
  }, [selectedItem, selectedItemLabel]);

  React.useEffect(() => {
    let mounted = true;
    apiClient
      .get("/domains/inventory/master-data/projects")
      .then((resp) => {
        const list = resp.data?.projects ?? [];
        if (!mounted) return;
        setProjects(list);
        setProjectFor((prev) => (prev ? prev : list[0] ?? ""));
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  const chooseInventoryItem = React.useCallback((item: (typeof inventoryItems)[number]) => {
    setSelectedItemId(item.id ?? "");
    setSelectedItemQuery([item.sku, item.name].filter(Boolean).join(" - "));
    setItemMenuOpen(false);
  }, []);

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItemSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setItemMenuOpen(true);
      setItemActiveIndex((prev) => Math.min(prev + 1, filteredItemSuggestions.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setItemMenuOpen(true);
      setItemActiveIndex((prev) => Math.max(prev - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = filteredItemSuggestions[itemActiveIndex];
      if (chosen) {
        chooseInventoryItem(chosen);
      }
    }

    if (event.key === "Escape") {
      setItemMenuOpen(false);
    }
  };

  const inventoryReferenceRows = React.useMemo(() => {
    return inventoryItems.map((item) => {
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
        codeNo: item.sku ?? "—",
        barcode: item.sku ?? "—",
        itemDescription: item.name ?? "—",
        quantity,
        unit: item.unit ?? "units",
        unitDescription: `${item.unit ?? "units"} per pack`,
        category,
        project: "ROMS Inventory",
        dateReceived: item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "—",
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "—",
        remark: isOutOfStock ? "Out of stock" : isLowStock ? "Low stock" : item.lotNumber ? `Lot: ${item.lotNumber}` : "In stock",
      };
    });
  }, [inventoryItems]);

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    width: "100%",
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (mode === "existing") {
        if (!selectedItem?.id) {
          throw new Error("Select an item to check in.");
        }
        if (!Number.isFinite(checkInQty) || checkInQty <= 0) {
          throw new Error("Check-in quantity must be greater than zero.");
        }

        await apiClient.post("/domains/inventory/bulk-checkin", {
          items: [{
            mode: "existing",
            stockItemId: selectedItem.id,
            quantity: checkInQty,
            projectFor: projectFor.trim() || projects[0],
            dateReceived: dateReceived || undefined,
            expiryDate: expiryDate || undefined,
            remark: note.trim() || undefined,
          }],
        });

        return {
          mode,
          itemLabel: `${selectedItem.sku ?? ""} ${selectedItem.name ?? ""}`.trim(),
          quantity: checkInQty,
        };
      }

      if (!newSku.trim() || !newName.trim()) {
        throw new Error("SKU and Item Description are required for new items.");
      }
      if (!Number.isFinite(newOpeningQty) || newOpeningQty <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }

      const nameLower = newName.trim().toLowerCase();
      const category = newCategory.trim() || (nameLower.includes("tube") || nameLower.includes("plate") || nameLower.includes("dish")
        ? "Consumables"
        : nameLower.includes("meter") || nameLower.includes("thermo")
          ? "Equipment"
          : "General");
      const barcode = newBarcode.trim() || newSku.trim();
      const unitDescription = newUnitDescription.trim() || `${newUnit.trim() || "units"} per pack`;

      await apiClient.post("/domains/inventory/bulk-checkin", {
        items: [{
          mode: "new",
          sku: newSku.trim(),
          barcode,
          name: newName.trim(),
          itemDescription: newName.trim(),
          unit: newUnit.trim() || "units",
          unitDescription,
          quantity: Math.max(1, Math.floor(newOpeningQty)),
          minThreshold: newMinThreshold,
          category,
          projectFor: projectFor.trim() || projects[0],
          dateReceived: dateReceived || undefined,
          expiryDate: newExpiryDate || undefined,
          remark: note.trim() || undefined,
        }],
      });

      return {
        mode,
        itemLabel: `${newSku.trim()} ${newName.trim()}`.trim(),
        quantity: newOpeningQty,
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });

      setFeedback({
        type: "success",
        message: `${result.mode === "existing" ? "Checked in" : "Created and checked in"} ${result.quantity} unit(s) for ${result.itemLabel}.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["inventory-checkin-movements"] });


      if (result.mode === "existing") {
        setCheckInQty(1);
        setNote("");
        setSelectedItemId("");
        setSelectedItemQuery("");
      } else {
        // Optimistically increment from the SKU just submitted so the field
        // shows the correct next value before the refetch completes.
        const submittedNum = newSku.trim().match(/(\d+)$/);
        const nextSku = submittedNum
          ? newSku.trim().replace(/(\d+)$/, String(Number(submittedNum[1]) + 1))
          : computeNextSku;
        setNewSku(nextSku);
        setNewBarcode("");
        setNewName("");
        setNewUnit("units");
        setNewOpeningQty(1);
        setNewUnitDescription("");
        setNewCategory("");
        setNote("");
        // do NOT reset projectFor — keep the valid selected project
      }
    },
    onError: (err) => {
      setFeedback({ type: "error", message: getErrorMessage(err, "Check-in failed.") });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>Check In</div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              <input type="radio" name="checkin-mode" checked={mode === "existing"} onChange={() => setMode("existing")} />
              Existing item
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              <input type="radio" name="checkin-mode" checked={mode === "new"} onChange={() => setMode("new")} />
              New item
            </label>
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

        {mode === "existing" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <InventoryItemSelect
              label="Select Item"
              items={inventoryItems}
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
              renderItemMeta={(item) => `Available: ${Number(item.quantity ?? 0)} ${item.unit ?? "units"}`}
              variant="minimal"
            />

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Quantity
              <input
                type="number"
                min={1}
                value={checkInQty}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setCheckInQty(Math.max(0, v));
                }}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Project For
              {projects.length > 0 ? (
                <select value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle}>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} />
              )}
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Date Received
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Expiry Date
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Remark
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        {mode === "new" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Code_No
              <input value={newSku} onChange={(e) => setNewSku(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Barcode
              <input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Item Description
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Quantity
              <input type="number" min={1} value={newOpeningQty} onChange={(e) => setNewOpeningQty(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Unit
              <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Unit_Description
              <input value={newUnitDescription} onChange={(e) => setNewUnitDescription(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Category
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Project For
              {projects.length > 0 ? (
                <select value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle}>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} />
              )}
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Date Received
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Expiry Date
              <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Min Threshold
              <input type="number" min={0} value={newMinThreshold} onChange={(e) => setNewMinThreshold(Math.max(0, Math.floor(Number(e.target.value) || 0)))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Remark
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        {mode === "existing" && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Current Stock</div>
              <div style={{ fontSize: "var(--fs-md)", color: "var(--color-text)", fontWeight: 700 }}>{selectedItem ? selectedItemQuantity : "—"}</div>
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Projected Balance</div>
              <div style={{ fontSize: "var(--fs-md)", color: !selectedItem ? "var(--color-text-muted)" : checkInQty <= 0 ? "#b91c1c" : "var(--color-text)", fontWeight: 700 }}>
                {selectedItem ? selectedItemQuantity + Math.max(0, checkInQty) : "—"}
              </div>
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Validation</div>
              <div style={{ fontSize: "var(--fs-md)", color: !selectedItem ? "var(--color-text-muted)" : checkInQty <= 0 ? "#b91c1c" : "#166534", fontWeight: 700 }}>
                {!selectedItem ? "Select item" : checkInQty <= 0 ? "Enter quantity" : "Valid"}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {isLoading && "Loading inventory items..."}
            {!isLoading && error && "Inventory list unavailable. You can still try creating a new item."}
            {!isLoading && !error && `Loaded ${(data?.data ?? []).length} items`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                if (mode === "existing") {
                  if (!selectedItem?.id) {
                    setFeedback({ type: "error", message: "Select an item to add to batch." });
                    return;
                  }
                  if (!Number.isFinite(checkInQty) || checkInQty <= 0) {
                    setFeedback({ type: "error", message: "Check-in quantity must be greater than zero." });
                    return;
                  }

                  const newItem: CartItem = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    mode: "existing",
                    stockItemId: selectedItem.id,
                    quantity: checkInQty,
                    projectFor: projectFor.trim() || projects[0],
                    dateReceived,
                    expiryDate: expiryDate || undefined,
                    remark: note.trim() || undefined,
                    itemLabel: `${selectedItem.sku ?? ""} ${selectedItem.name ?? ""}`.trim(),
                  };
                  setCart((prev) => [...prev, newItem]);
                  setFeedback({
                    type: "success",
                    message: `Added ${checkInQty} units of ${selectedItem.name} to batch.`,
                  });
                  setCheckInQty(1);
                  setNote("");
                  setSelectedItemId("");
                  setSelectedItemQuery("");
                } else {
                  if (!newSku.trim() || !newName.trim()) {
                    setFeedback({ type: "error", message: "SKU and Item Description are required for new items." });
                    return;
                  }
                  if (!Number.isFinite(newOpeningQty) || newOpeningQty <= 0) {
                    setFeedback({ type: "error", message: "Quantity must be greater than zero." });
                    return;
                  }

                  const sku = newSku.trim();
                  const nameLower = newName.trim().toLowerCase();
                  const category = newCategory.trim() || (nameLower.includes("tube") || nameLower.includes("plate") || nameLower.includes("dish")
                    ? "Consumables"
                    : nameLower.includes("meter") || nameLower.includes("thermo")
                      ? "Equipment"
                      : "General");
                  const barcode = newBarcode.trim() || sku;
                  const unitDescription = newUnitDescription.trim() || `${newUnit.trim() || "units"} per pack`;

                  const newItem: CartItem = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    mode: "new",
                    sku,
                    barcode,
                    name: newName.trim(),
                    quantity: newOpeningQty,
                    minThreshold: newMinThreshold,
                    unit: newUnit.trim() || "units",
                    unitDescription,
                    category,
                    projectFor: projectFor.trim() || projects[0],
                    dateReceived,
                    expiryDate: newExpiryDate || undefined,
                    remark: note.trim() || undefined,
                    itemLabel: `${sku} ${newName.trim()}`.trim(),
                  };
                  setCart((prev) => [...prev, newItem]);
                  setFeedback({
                    type: "success",
                    message: `Added new item ${sku} to batch.`,
                  });
                  const submittedNum = sku.match(/(\d+)$/);
                  const nextSku = submittedNum
                    ? sku.replace(/(\d+)$/, String(Number(submittedNum[1]) + 1))
                    : computeNextSku;
                  setNewSku(nextSku);
                  setNewBarcode("");
                  setNewName("");
                  setNewUnit("units");
                  setNewOpeningQty(1);
                  setNewUnitDescription("");
                  setNewCategory("");
                  setNote("");
                  setNewExpiryDate("");
                }
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
                checkInMutation.mutate();
              }}
              disabled={checkInMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: checkInMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {checkInMutation.isPending ? "Submitting..." : mode === "existing" ? "Submit" : "Create Item + Submit"}
            </button>
          </div>
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 12, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>🛒 Batch Check-In Cart ({cart.length} items)</div>
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
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date Received</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Expiry Date</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
                  <th style={{ padding: "8px", textAlign: "center", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase", width: 140 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 40 }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.itemLabel}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: item.mode === "new" ? "#dcfce7" : "#eff6ff",
                        color: item.mode === "new" ? "#15803d" : "#1d4ed8",
                        border: item.mode === "new" ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                      }}>
                        {item.mode === "new" ? "NEW" : "EXISTING"}
                      </span>
                    </td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.projectFor}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.dateReceived}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.expiryDate || "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{item.remark || "—"}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setMode(item.mode);
                            if (item.mode === "existing") {
                              setSelectedItemId(item.stockItemId || "");
                              setSelectedItemQuery(item.itemLabel);
                              setCheckInQty(item.quantity);
                              setNote(item.remark || "");
                              setExpiryDate(item.expiryDate || "");
                            } else {
                              setNewSku(item.sku || "");
                              setNewBarcode(item.barcode || "");
                              setNewName(item.name || "");
                              setNewUnit(item.unit || "units");
                              setNewOpeningQty(item.quantity);
                              setNewUnitDescription(item.unitDescription || "");
                              setNewCategory(item.category || "");
                              setNote(item.remark || "");
                              setNewExpiryDate(item.expiryDate || "");
                              setNewMinThreshold(item.minThreshold || 5);
                            }
                            setProjectFor(item.projectFor);
                            setDateReceived(item.dateReceived);
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
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                const payload = cart.map((i) => {
                  if (i.mode === "existing") {
                    return {
                      mode: "existing" as const,
                      stockItemId: i.stockItemId,
                      quantity: i.quantity,
                      projectFor: i.projectFor,
                      dateReceived: i.dateReceived,
                      expiryDate: i.expiryDate,
                      remark: i.remark,
                    };
                  } else {
                    return {
                      mode: "new" as const,
                      sku: i.sku,
                      barcode: i.barcode,
                      name: i.name,
                      quantity: i.quantity,
                      minThreshold: i.minThreshold,
                      unit: i.unit,
                      unitDescription: i.unitDescription,
                      category: i.category,
                      projectFor: i.projectFor,
                      dateReceived: i.dateReceived,
                      expiryDate: i.expiryDate,
                      remark: i.remark,
                    };
                  }
                });
                bulkCheckInMutation.mutate(payload);
              }}
              disabled={bulkCheckInMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "8px 16px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: bulkCheckInMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {bulkCheckInMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}
      </div>

      <div style={{ padding: 18, border: "1px solid var(--color-border)", borderRadius: "var(--radius)", background: "var(--color-surface-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>Check-In Reference Table (History)</div>
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
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Mode</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Quantity</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Unit_Description</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Category</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date_Received</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Expiry_Date</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {historyPagedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    No check-in history records available.
                  </td>
                </tr>
              ) : (
                historyPagedRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 40 }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.sku ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.sku ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.name ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.remark && row.remark.includes("Opening stock") ? "New" : "Existing"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.unit ?? "units"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{`${row.stockItem?.unit ?? "units"} per pack`}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.category ?? "General"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.projectFor ?? "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(row.occurredAt).toLocaleDateString()}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.stockItem?.expiryDate ? new Date(row.stockItem.expiryDate).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.remark ?? "—"}</td>
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