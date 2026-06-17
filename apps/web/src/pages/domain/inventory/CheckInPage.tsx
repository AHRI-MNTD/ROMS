import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";

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

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: checkInMovementsData } = useQuery({
    queryKey: ["inventory-checkin-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { type: "CHECK_IN", limit: 50 },
      });
      return resp.data as { data: any[]; total: number };
    },
  });

  const sortedMovements = React.useMemo(() => {
    if (!checkInMovementsData?.data) return [];
    return [...checkInMovementsData.data].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [checkInMovementsData]);

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
      .catch(() => {});
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

        const nextQuantity = Number(selectedItem.quantity ?? 0) + checkInQty;
        await apiClient.patch(`/domains/inventory/${selectedItem.id}`, {
          quantity: nextQuantity,
          projectFor: projectFor.trim() || projects[0],
          dateReceived: dateReceived || undefined,
          expiryDate: expiryDate || undefined,
          remark: note.trim() || undefined,
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

      await apiClient.post("/domains/inventory", {
        sku: newSku.trim(),
        codeNo: newSku.trim(),
        barcode,
        name: newName.trim(),
        itemDescription: newName.trim(),
        unit: newUnit.trim() || "units",
        unitDescription,
        quantity: Math.max(0, Math.floor(newOpeningQty)),
        category,
        projectFor: projectFor.trim() || projects[0],
        dateReceived: dateReceived || undefined,
        expiryDate: newExpiryDate || undefined,
        remark: note.trim() || undefined,
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
      const message = err instanceof Error ? err.message : "Check-in failed.";
      setFeedback({ type: "error", message });
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
            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", position: "relative" }}>
              Select Item
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  ref={itemInputRef}
                  value={selectedItemQuery}
                  onChange={(e) => {
                    setSelectedItemQuery(e.target.value);
                    setSelectedItemId("");
                    setItemMenuOpen(true);
                    setItemActiveIndex(0);
                  }}
                  onFocus={() => setItemMenuOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setItemMenuOpen(false), 120);
                  }}
                  onKeyDown={handleItemKeyDown}
                  placeholder="Type SKU or item name"
                  style={{
                    ...inputStyle,
                    paddingRight: "28px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "var(--color-text-muted)",
                    fontSize: "8px",
                  }}
                >
                  ▼
                </div>
              </div>

              {itemMenuOpen && filteredItemSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    minWidth: "100%",
                    width: "max-content",
                    maxWidth: "500px",
                    zIndex: 20,
                    marginTop: 6,
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    boxShadow: "0 12px 28px rgba(16, 24, 40, 0.12)",
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {filteredItemSuggestions.map((item, index) => {
                    const isActive = index === itemActiveIndex;
                    const quantity = Number(item.quantity ?? 0);
                    return (
                      <button
                        key={item.id ?? `${item.sku}-${item.name}`}
                        type="button"
                        onMouseEnter={() => setItemActiveIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          chooseInventoryItem(item);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          borderBottom: "1px solid var(--color-divider)",
                          background: isActive ? "var(--color-accent-soft)" : "transparent",
                          padding: "8px 12px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "var(--fs-xs)",
                          color: "var(--color-text)",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{item.sku} - {item.name}</span>
                        <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>
                          (Available: {quantity} {item.unit ?? "units"})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </label>

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
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Selected Item</div>
              <div style={{ fontSize: "var(--fs-md)", color: "var(--color-text)", fontWeight: 700 }}>{selectedItem ? selectedItemLabel : "—"}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {isLoading && "Loading inventory items..."}
            {!isLoading && error && "Inventory list unavailable. You can still try creating a new item."}
            {!isLoading && !error && `Loaded ${(data?.data ?? []).length} items`}
          </div>
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

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Check-In Reference Table (History)</div>
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
              {sortedMovements.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    No check-in history records available.
                  </td>
                </tr>
              ) : (
                sortedMovements.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
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
    </div>
  );
}