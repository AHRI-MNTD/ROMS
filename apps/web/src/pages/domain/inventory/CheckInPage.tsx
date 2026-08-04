import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { InventoryItemSelect } from "./InventoryItemSelect";
import { CheckInReferenceTable } from "./CheckInReferenceTable";

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
    borderRadius: "6px",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10.5px",
    width: "100%",
    height: 30,
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

  const isExisting = mode === "existing";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: isExisting ? "1px solid var(--color-primary)" : "1px solid #6366f1",
          background: isExisting
            ? "linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-primary-soft) 100%)"
            : "linear-gradient(180deg, var(--color-surface-2) 0%, rgba(99, 102, 241, 0.05) 100%)",
          boxShadow: isExisting
            ? "0 4px 16px rgba(1, 105, 111, 0.06)"
            : "0 4px 16px rgba(99, 102, 241, 0.08)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Prominent Mode Switcher at the very top */}
        <div
          style={{
            marginBottom: 16,
            padding: 4,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setMode("existing")}
            style={{
              padding: "10px 14px",
              borderRadius: 7,
              border: isExisting ? "1px solid var(--color-primary)" : "1px solid transparent",
              background: isExisting ? "var(--color-surface-2)" : "transparent",
              color: isExisting ? "var(--color-text)" : "var(--color-text-muted)",
              fontWeight: isExisting ? 700 : 500,
              fontSize: "var(--fs-xs)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: isExisting ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isExisting ? "var(--color-primary-soft)" : "var(--color-surface-offset)",
                color: isExisting ? "var(--color-primary)" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              📦
            </div>
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: "12px" }}>Existing Item</span>
                {isExisting && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "var(--color-primary-highlight)",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Active Mode
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--color-text-muted)",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                Select item from inventory catalog & add quantity
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("new")}
            style={{
              padding: "10px 14px",
              borderRadius: 7,
              border: !isExisting ? "1px solid #6366f1" : "1px solid transparent",
              background: !isExisting ? "var(--color-surface-2)" : "transparent",
              color: !isExisting ? "var(--color-text)" : "var(--color-text-muted)",
              fontWeight: !isExisting ? 700 : 500,
              fontSize: "var(--fs-xs)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: !isExisting ? "0 2px 8px rgba(99, 102, 241, 0.15)" : "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: !isExisting ? "rgba(99, 102, 241, 0.12)" : "var(--color-surface-offset)",
                color: !isExisting ? "#6366f1" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              ✨
            </div>
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: "12px" }}>New Item</span>
                {!isExisting && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#6366f1",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Active Mode
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--color-text-muted)",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                Register a new stock item and enter opening details
              </div>
            </div>
          </button>
        </div>

        {/* Section Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>Check In Form</div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "12px",
                background: isExisting ? "var(--color-primary-soft)" : "rgba(99, 102, 241, 0.1)",
                color: isExisting ? "var(--color-primary)" : "#6366f1",
                border: isExisting ? "1px solid var(--color-primary-highlight)" : "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              {isExisting ? "Existing Item" : "New Item"}
            </span>
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
          <div key="existing-form" className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
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
              inputStyle={{ ...inputStyle, minWidth: "auto" }}
              wrapperStyle={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "10px" }}
              renderItemMeta={(item) => `Available: ${Number(item.quantity ?? 0)} ${item.unit ?? "units"}`}
              variant="minimal"
            />

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Date Received
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Expiry Date
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Remark
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        {mode === "new" && (
          <div key="new-form" className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Code_No
              <input value={newSku} onChange={(e) => setNewSku(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Barcode
              <input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Item Description
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Quantity
              <input type="number" min={1} value={newOpeningQty} onChange={(e) => setNewOpeningQty(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Unit
              <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Unit_Description
              <input value={newUnitDescription} onChange={(e) => setNewUnitDescription(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Category
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Date Received
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Expiry Date
              <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Min Threshold
              <input type="number" min={0} value={newMinThreshold} onChange={(e) => setNewMinThreshold(Math.max(0, Math.floor(Number(e.target.value) || 0)))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
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

          </div>
        </div>

        {cart.length > 0 && (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>🛒 Batch Check-In Cart ({cart.length} items)</div>
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
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10.5px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={thStyle} title="Item Label">Item</th>
                          <th style={thStyle} title="Check-in Mode">Type</th>
                          <th style={thStyle} title="Quantity">Qty</th>
                          <th style={thStyle} title="Project For">Project</th>
                          <th style={thStyle} title="Date Received">Received</th>
                          <th style={thStyle} title="Expiry Date">Expiry</th>
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
                        <td style={cellStyle}>
                          <span style={{
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontSize: "8px",
                            fontWeight: 700,
                            background: item.mode === "new" ? "#dcfce7" : "#eff6ff",
                            color: item.mode === "new" ? "#15803d" : "#1d4ed8",
                            border: item.mode === "new" ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                          }}>
                            {item.mode === "new" ? "NEW" : "EXISTING"}
                          </span>
                        </td>
                        <td style={cellStyle}>{item.quantity}</td>
                        <td style={cellStyle} title={item.projectFor}>{item.projectFor}</td>
                        <td style={cellStyle} title={item.dateReceived}>{item.dateReceived}</td>
                        <td style={cellStyle} title={item.expiryDate || "—"}>{item.expiryDate || "—"}</td>
                        <td style={cellStyle} title={item.remark || "—"}>{item.remark || "—"}</td>
                        <td style={{ padding: "4px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
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

      <CheckInReferenceTable />
    </div>
  );
}