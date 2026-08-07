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

interface MasterDataComboboxProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  maxHeight?: number;
  dropdownWidth?: string | number;
}

function MasterDataCombobox({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  inputStyle,
  maxHeight = 350,
  dropdownWidth = "100%",
}: MasterDataComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, value]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
        <span>{label}</span>
        {required && <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIsOpen(true);
              setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIsOpen(true);
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && isOpen && filteredOptions[activeIndex]) {
              e.preventDefault();
              onChange(filteredOptions[activeIndex]);
              setIsOpen(false);
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "10px",
            cursor: "pointer",
            padding: 2,
          }}
        >
          ▼
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: dropdownWidth,
            minWidth: "100%",
            zIndex: 50,
            marginTop: 4,
            maxHeight: maxHeight,
            overflowY: "auto",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
          }}
        >
          {filteredOptions.map((opt, idx) => (
            <div
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: "11.5px",
                cursor: "pointer",
                background: idx === activeIndex ? "var(--color-primary-soft)" : "transparent",
                color: idx === activeIndex ? "var(--color-primary)" : "var(--color-text)",
                fontWeight: opt === value ? 700 : 400,
                borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.03))",
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const inventoryItems = data?.data ?? [];

  // Fetch Master Data Options (Units, Categories, Projects)
  const { data: masterOptionsData } = useQuery({
    queryKey: ["inventory-master-data-options"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/master-data/options");
      return resp.data as { units: string[]; categories: string[]; projects: string[] };
    },
  });

  const masterUnits = React.useMemo(() => {
    return masterOptionsData?.units ?? ["units", "pcs", "box", "pack", "vial", "bottle", "kit", "tube", "plate", "bag", "roll", "ml", "L", "g", "kg"];
  }, [masterOptionsData]);

  const masterCategories = React.useMemo(() => {
    return masterOptionsData?.categories ?? ["Consumables", "Equipment", "Reagents", "Glassware", "Chemicals", "PPE", "General"];
  }, [masterOptionsData]);

  const selectedItem = React.useMemo(() => {
    const exactById = inventoryItems.find((item) => item.id === selectedItemId);
    if (exactById) return exactById;

    const query = normalizeSearch(selectedItemQuery);
    if (!query) return undefined;

    const exactMatches = inventoryItems.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      return query === sku || query === name || query === `${sku} - ${name}`;
    });
    if (exactMatches.length > 0) return exactMatches[0];

    const partialMatches = inventoryItems.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const name = normalizeSearch(item.name ?? "");
      return sku.includes(query) || name.includes(query) || `${sku} - ${name}`.includes(query);
    });
    return partialMatches.length === 1 ? partialMatches[0] : undefined;
  }, [inventoryItems, selectedItemId, selectedItemQuery]);

  const selectedItemLabel = React.useMemo(() => {
    if (!selectedItem) return "";
    return [selectedItem.sku ?? "", selectedItem.name ?? ""].filter(Boolean).join(" - ");
  }, [selectedItem]);

  const selectedItemQuantity = Number(selectedItem?.quantity ?? 0);

  // Compute Next SKU automatically based on inventory + cart items
  const computeNextSku = React.useMemo(() => {
    const allSkus = [
      ...inventoryItems.map((i) => String(i.sku ?? "")),
      ...cart.map((c) => String(c.sku ?? "")),
    ];
    const nums = allSkus
      .map((s) => {
        const m = s.match(/(\d+)$/);
        return m ? Number(m[1]) : NaN;
      })
      .filter(Number.isFinite);
    const max = nums.length ? Math.max(...nums) : 0;
    return `MNTD${max + 1}`;
  }, [inventoryItems, cart]);

  // Code_No duplicate check against existing inventory & cart
  const isCodeNoDuplicate = React.useMemo(() => {
    if (mode !== "new") return false;
    const skuTrimmed = newSku.trim().toLowerCase();
    if (!skuTrimmed) return false;

    const existsInInventory = inventoryItems.some(
      (i) => String(i.sku ?? "").trim().toLowerCase() === skuTrimmed || String(i.sourceCode ?? "").trim().toLowerCase() === skuTrimmed
    );
    const existsInCart = cart.some((c) => String(c.sku ?? "").trim().toLowerCase() === skuTrimmed);

    return existsInInventory || existsInCart;
  }, [mode, newSku, inventoryItems, cart]);

  React.useEffect(() => {
    if (mode === "new" && !newSku) {
      const next = computeNextSku;
      setNewSku(next);
      if (!newBarcode) {
        setNewBarcode(next);
      }
    }
  }, [mode, computeNextSku, newSku, newBarcode]);

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

  const isExisting = mode === "existing";

  const inputStyle: React.CSSProperties = {
    border: isExisting ? "1px solid var(--color-border)" : "1px solid var(--inventory-new-item-input-border)",
    borderRadius: "6px",
    background: isExisting ? "var(--color-surface-2)" : "var(--inventory-new-item-input-bg)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10.5px",
    width: "100%",
    height: 30,
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: "1px solid #ef4444",
    background: "#fef2f2",
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: isExisting ? "1px solid var(--color-primary-highlight)" : "1px solid var(--inventory-new-item-border)",
          background: isExisting ? "var(--inventory-card-bg)" : "var(--inventory-new-item-card-bg)",
          boxShadow: isExisting ? "0 4px 16px var(--color-accent-soft)" : "0 4px 20px rgba(14, 165, 233, 0.15)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Mode Switcher */}
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
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
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
              border: !isExisting ? "1px solid #0284c7" : "1px solid transparent",
              background: !isExisting ? "var(--color-surface-2)" : "transparent",
              color: !isExisting ? "var(--color-text)" : "var(--color-text-muted)",
              fontWeight: !isExisting ? 700 : 500,
              fontSize: "var(--fs-xs)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: !isExisting ? "0 2px 8px rgba(14, 165, 233, 0.15)" : "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: !isExisting ? "rgba(14, 165, 233, 0.12)" : "var(--color-surface-offset)",
                color: !isExisting ? "#0284c7" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
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
                      background: "rgba(14, 165, 233, 0.12)",
                      color: "#0284c7",
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
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>Check In</div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "12px",
                background: isExisting ? "var(--color-primary-soft)" : "rgba(14, 165, 233, 0.12)",
                color: isExisting ? "var(--color-primary)" : "#0284c7",
                border: isExisting ? "1px solid var(--color-primary-highlight)" : "1px solid rgba(14, 165, 233, 0.25)",
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
              fontWeight: 600,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Existing Item Form */}
        {mode === "existing" && (
          <div key="existing-form" className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <InventoryItemSelect
              label="Select Item *"
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
              placeholder="Type item name or Code_No"
              inputStyle={{ ...inputStyle, minWidth: "auto" }}
              wrapperStyle={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 3, fontSize: "10px" }}
              dropdownStyle={{ width: "100%" }}
              renderItemMeta={(item) => `Available: ${Number(item.quantity ?? 0)} ${item.unit ?? "units"}`}
              variant="minimal"
            />

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Quantity <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input
                type="number"
                min={1}
                value={checkInQty}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setCheckInQty(Math.max(0, v));
                }}
                style={inputStyle}
                required
              />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Project For <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              {projects.length > 0 ? (
                <select value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} required>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} required />
              )}
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Date Received <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} required />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Expiry Date <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 400 }}>(Optional)</span>
              </span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            {/* Remark field - Double width (gridColumn: "span 2") */}
            <label style={{ gridColumn: "span 2", fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Remark <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 400 }}>(Optional)</span>
              </span>
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} placeholder="Optional notes" />
            </label>
          </div>
        )}

        {/* New Item Form - NO Min Threshold Field */}
        {mode === "new" && (
          <div key="new-form" className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Code_No <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input
                value={newSku}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewSku(val);
                  if (!newBarcode || newBarcode === newSku) {
                    setNewBarcode(val);
                  }
                }}
                style={isCodeNoDuplicate ? inputErrorStyle : inputStyle}
                placeholder="Auto-incremented Code_No"
                required
              />
              {isCodeNoDuplicate && (
                <span style={{ fontSize: "9px", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                  ⚠️ Code_No '{newSku.trim()}' is already used. Please enter a unique Code_No.
                </span>
              )}
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Barcode <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                style={inputStyle}
                placeholder="Barcode or Code_No"
                required
              />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Item Description <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={inputStyle}
                placeholder="Enter full item description"
                required
              />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Quantity <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input
                type="number"
                min={1}
                value={newOpeningQty}
                onChange={(e) => setNewOpeningQty(Math.max(1, Number(e.target.value) || 1))}
                style={inputStyle}
                required
              />
            </label>

            {/* Master Data Dropdown with typing recommendation for Unit */}
            <MasterDataCombobox
              label="Unit"
              required={true}
              value={newUnit}
              onChange={(val) => setNewUnit(val)}
              options={masterUnits}
              placeholder="Select or type unit..."
              inputStyle={inputStyle}
            />

            {/* Unit_Description is NOT compulsory (optional) */}
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Unit_Description <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 400 }}>(Optional)</span>
              </span>
              <input
                value={newUnitDescription}
                onChange={(e) => setNewUnitDescription(e.target.value)}
                style={inputStyle}
                placeholder="e.g. 50 tests/kit (Optional)"
              />
            </label>

            {/* Master Data Dropdown with typing recommendation for Category */}
            <MasterDataCombobox
              label="Category"
              required={true}
              value={newCategory}
              onChange={(val) => setNewCategory(val)}
              options={masterCategories}
              placeholder="Select or type category..."
              inputStyle={inputStyle}
              maxHeight={400}
              dropdownWidth="150%"
            />

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Project For <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              {projects.length > 0 ? (
                <select value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} required>
                  {projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={projectFor} onChange={(e) => setProjectFor(e.target.value)} style={inputStyle} required />
              )}
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Date Received <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>
              </span>
              <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={inputStyle} required />
            </label>

            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Expiry Date <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 400 }}>(Optional)</span>
              </span>
              <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} style={inputStyle} />
            </label>

            {/* Remark field - Double width (gridColumn: "span 2") */}
            <label style={{ gridColumn: "span 2", fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                Remark <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 400 }}>(Optional)</span>
              </span>
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} placeholder="Optional notes" />
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

        {/* Action Controls */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {isLoading && "Loading inventory items..."}
            {!isLoading && error && "Inventory list unavailable. You can still try creating a new item."}
            {!isLoading && !error && `Loaded ${(data?.data ?? []).length} items`}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
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
                  if (!projectFor.trim()) {
                    setFeedback({ type: "error", message: "Project For is required." });
                    return;
                  }
                  if (!dateReceived) {
                    setFeedback({ type: "error", message: "Date Received is required." });
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
                  // New Item Validation
                  const sku = newSku.trim();
                  const name = newName.trim();
                  const unit = newUnit.trim();
                  const category = newCategory.trim();
                  const barcode = newBarcode.trim() || sku;

                  if (!sku) {
                    setFeedback({ type: "error", message: "Code_No is required for new items." });
                    return;
                  }
                  if (isCodeNoDuplicate) {
                    setFeedback({ type: "error", message: `Code_No '${sku}' is already in use. Please enter a unique Code_No.` });
                    return;
                  }
                  if (!barcode) {
                    setFeedback({ type: "error", message: "Barcode is required for new items." });
                    return;
                  }
                  if (!name) {
                    setFeedback({ type: "error", message: "Item Description is required for new items." });
                    return;
                  }
                  if (!Number.isFinite(newOpeningQty) || newOpeningQty <= 0) {
                    setFeedback({ type: "error", message: "Quantity must be greater than zero." });
                    return;
                  }
                  if (!unit) {
                    setFeedback({ type: "error", message: "Unit is required for new items." });
                    return;
                  }
                  if (!category) {
                    setFeedback({ type: "error", message: "Category is required for new items." });
                    return;
                  }
                  if (!projectFor.trim()) {
                    setFeedback({ type: "error", message: "Project For is required." });
                    return;
                  }
                  if (!dateReceived) {
                    setFeedback({ type: "error", message: "Date Received is required." });
                    return;
                  }

                  const unitDescription = newUnitDescription.trim() || `${unit} per pack`;

                  const newItem: CartItem = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    mode: "new",
                    sku,
                    barcode,
                    name,
                    quantity: newOpeningQty,
                    unit,
                    unitDescription,
                    category,
                    projectFor: projectFor.trim() || projects[0],
                    dateReceived,
                    expiryDate: newExpiryDate || undefined,
                    remark: note.trim() || undefined,
                    itemLabel: `${sku} ${name}`.trim(),
                  };
                  setCart((prev) => [...prev, newItem]);
                  setFeedback({
                    type: "success",
                    message: `Added new item ${sku} to batch.`,
                  });

                  // Optimistically increment SKU for next item
                  const submittedNum = sku.match(/(\d+)$/);
                  const nextSku = submittedNum
                    ? sku.replace(/(\d+)$/, String(Number(submittedNum[1]) + 1))
                    : computeNextSku;
                  setNewSku(nextSku);
                  setNewBarcode(nextSku);
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
                padding: "8px 14px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ➕ Add to Cart
            </button>
          </div>
        </div>

        {/* Batch Cart Table */}
        {cart.length > 0 && (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 10, marginTop: 16 }}>
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
                {bulkCheckInMutation.isPending ? "Submitting..." : "Submit Batch"}
              </button>
            </div>
          </div>
        )}
      </div>

      <CheckInReferenceTable />
    </div>
  );
}