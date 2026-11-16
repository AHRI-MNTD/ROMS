import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { useReagentData, useReagentOptions } from "./useReagentData";
import { ReagentItemSelect } from "./ReagentItemSelect";
import { ReagentCheckInReferenceTable } from "./ReagentCheckInReferenceTable";
import {
  ReagentItem,
  ASSAY_TYPES,
  STORAGE_CONDITIONS,
  REAGENT_TYPES,
  CONCENTRATION_UNITS,
  formatStorageCondition,
} from "./reagentShared";

type CheckInMode = "existing" | "new";

interface CartItem {
  id: string;
  mode: CheckInMode;
  reagentCode: string;
  description: string;
  assayType: string;
  reagentType?: string;
  concentrationValue: number;
  concentrationUnit: string;
  storageCondition: string;
  lotNumber?: string;
  expiryDate?: string;
  minThreshold: number;
  location?: string;
  receivedFrom?: string;
  quantity?: number;
  quantityUnit?: string;
  volume?: number;
  volumeUnit?: string;
}

export default function ReagentCheckInPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();

  const { data: reagentsData, isLoading: isReagentsLoading } = useReagentData({ pageSize: 100 });
  const { data: optionsData } = useReagentOptions();

  const inventoryItems = useMemo(() => reagentsData?.data ?? [], [reagentsData?.data]);

  // Mode: Existing reagent vs New reagent
  const [mode, setMode] = useState<CheckInMode>("existing");
  const [hoveredMode, setHoveredMode] = useState<CheckInMode | null>(null);

  // Existing Reagent selection
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemQuery, setSelectedItemQuery] = useState<string>("");

  // New Reagent fields
  const [newReagentCode, setNewReagentCode] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [assayType, setAssayType] = useState<string>(ASSAY_TYPES[0]);
  const [reagentType, setReagentType] = useState<string>(REAGENT_TYPES[0]);

  // Common Fields (Both modes)
  const [storageCondition, setStorageCondition] = useState<string>("20");
  const [concentrationValue, setConcentrationValue] = useState<number | "">(100);
  const [concentrationUnit, setConcentrationUnit] = useState<string>("µM");
  const [lotNumber, setLotNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [minThreshold, setMinThreshold] = useState<number | "">(10);
  const [location, setLocation] = useState<string>("");
  const [receivedFrom, setReceivedFrom] = useState<string>("");
  const [volume, setVolume] = useState<number | "">("");
  const [volumeUnit, setVolumeUnit] = useState<string>("µL");
  const [quantity, setQuantity] = useState<number | "">(1);

  // Cart for batch check-in
  const [cart, setCart] = useState<CartItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-generate reagent code for new reagent mode
  const nextReagentCode = useMemo(() => {
    const existingCodes = inventoryItems
      .map((i) => i.reagentCode)
      .filter((c) => /^RGT-\d+$/i.test(c))
      .map((c) => parseInt(c.replace(/[^0-9]/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `RGT-${String(max + 1 + cart.length).padStart(4, "0")}`;
  }, [inventoryItems, cart.length]);

  useEffect(() => {
    if (mode === "new" && !newReagentCode) {
      setNewReagentCode(nextReagentCode);
    }
  }, [mode, nextReagentCode, newReagentCode]);

  // Selected item object
  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  // When existing item selected, prepopulate storage, assay, and units
  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.assayType) setAssayType(selectedItem.assayType);
      if (selectedItem.reagentType) setReagentType(selectedItem.reagentType);
      if (selectedItem.storageCondition) {
        setStorageCondition(selectedItem.storageCondition);
      }
      if (selectedItem.concentrationUnit) setConcentrationUnit(selectedItem.concentrationUnit);
      if (selectedItem.location) setLocation(selectedItem.location);
      if (selectedItem.minThreshold) setMinThreshold(selectedItem.minThreshold);
    }
  }, [selectedItem]);

  // Mutation for batch check-in
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const conc = Number(concentrationValue);
    if (isNaN(conc) || conc <= 0) {
      setFeedback({ type: "error", message: "Concentration value must be greater than 0." });
      return;
    }

    if (mode === "existing") {
      if (!selectedItem) {
        setFeedback({ type: "error", message: "Please select an existing reagent from the catalog." });
        return;
      }
      const item: CartItem = {
        id: `cart-${Date.now()}-${Math.random()}`,
        mode: "existing",
        reagentCode: selectedItem.reagentCode,
        description: selectedItem.description,
        assayType: selectedItem.assayType,
        reagentType: selectedItem.reagentType ?? undefined,
        concentrationValue: conc,
        concentrationUnit,
        storageCondition,
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        minThreshold: Number(minThreshold) || 0,
        location: location.trim() || undefined,
        receivedFrom: receivedFrom.trim() || undefined,
        quantity: quantity !== "" ? Number(quantity) : undefined,
        volume: volume !== "" ? Number(volume) : undefined,
        volumeUnit: volumeUnit || undefined,
      };
      setCart((prev) => [...prev, item]);
      setFeedback({
        type: "success",
        message: `Added ${selectedItem.reagentCode} (${conc} ${concentrationUnit}) to Batch Check-In Cart.`,
      });
      // Reset inputs
      setSelectedItemId("");
      setSelectedItemQuery("");
      setLotNumber("");
      setExpiryDate("");
    } else {
      if (!newDescription.trim()) {
        setFeedback({ type: "error", message: "Reagent description is required for new reagents." });
        return;
      }
      const code = newReagentCode.trim() || nextReagentCode;
      const item: CartItem = {
        id: `cart-${Date.now()}-${Math.random()}`,
        mode: "new",
        reagentCode: code,
        description: newDescription.trim(),
        assayType,
        reagentType: reagentType || undefined,
        concentrationValue: conc,
        concentrationUnit,
        storageCondition,
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        minThreshold: Number(minThreshold) || 0,
        location: location.trim() || undefined,
        receivedFrom: receivedFrom.trim() || undefined,
        quantity: quantity !== "" ? Number(quantity) : undefined,
        volume: volume !== "" ? Number(volume) : undefined,
        volumeUnit: volumeUnit || undefined,
      };
      setCart((prev) => [...prev, item]);
      setFeedback({
        type: "success",
        message: `Added new reagent ${code} (${newDescription}) to Batch Check-In Cart.`,
      });
      // Reset inputs
      setNewDescription("");
      setNewReagentCode("");
      setLotNumber("");
      setExpiryDate("");
    }
  };

  const handleBatchSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      for (const item of cart) {
        await apiClient.post("/domains/reagent-inventory/check-in", {
          reagentCode: item.reagentCode,
          description: item.description,
          assayType: item.assayType,
          reagentType: item.reagentType,
          concentrationValue: item.concentrationValue,
          concentration: `${item.concentrationValue} ${item.concentrationUnit}`,
          concentrationUnit: item.concentrationUnit,
          storageCondition: item.storageCondition,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          minThreshold: item.minThreshold,
          location: item.location,
          receivedFrom: item.receivedFrom,
          quantity: item.quantity,
          volume: item.volume,
          volumeUnit: item.volumeUnit,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["reagent-items"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-checkin-movements"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-movements"] });
      setFeedback({
        type: "success",
        message: `Successfully checked in batch of ${cart.length} reagent item(s)!`,
      });
      setCart([]);
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Batch check-in failed. Please verify fields and try again."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExisting = mode === "existing";

  const inputStyle: React.CSSProperties = {
    border: isExisting ? "1px solid var(--color-border)" : "1px solid var(--inventory-new-item-input-border)",
    borderRadius: "6px",
    background: isExisting ? "var(--color-surface-2)" : "var(--inventory-new-item-input-bg)",
    color: "var(--color-text)",
    padding: "6px 9px",
    fontSize: "12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Feedback Message ── */}
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: "12px",
            fontWeight: 600,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Check-In Form Card (Mirrored Stock Management Style) ── */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: isExisting ? "1px solid var(--color-primary-highlight)" : "1px solid var(--inventory-new-item-border)",
          background: isExisting ? "var(--inventory-card-bg)" : "var(--inventory-new-item-card-bg)",
          boxShadow: "0 4px 16px rgb(37 147 153 / 65%)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            onClick={() => {
              setMode("existing");
              setFeedback(null);
            }}
            onMouseEnter={() => setHoveredMode("existing")}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              padding: "10px 14px",
              borderRadius: 7,
              border: isExisting
                ? "1px solid var(--color-primary)"
                : hoveredMode === "existing"
                ? "1px dashed var(--color-primary)"
                : "1px solid transparent",
              background: isExisting
                ? "var(--color-surface-2)"
                : hoveredMode === "existing"
                ? "var(--color-primary-soft, rgba(1, 105, 111, 0.08))"
                : "transparent",
              color: isExisting || hoveredMode === "existing" ? "var(--color-text)" : "var(--color-text-muted)",
              fontWeight: isExisting || hoveredMode === "existing" ? 700 : 500,
              fontSize: "var(--fs-xs)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transform: !isExisting && hoveredMode === "existing" ? "translateY(-1px)" : "translateY(0)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: isExisting
                ? "0 2px 8px rgba(0,0,0,0.08)"
                : hoveredMode === "existing"
                ? "0 3px 10px rgba(1, 105, 111, 0.12)"
                : "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isExisting
                  ? "var(--color-primary-soft)"
                  : hoveredMode === "existing"
                  ? "var(--color-primary-soft)"
                  : "var(--color-surface-offset)",
                color: isExisting || hoveredMode === "existing" ? "var(--color-primary)" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
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
                <span style={{ fontWeight: 700, fontSize: "12px" }}>Existing Reagent</span>
                {isExisting ? (
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
                ) : hoveredMode === "existing" ? (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      border: "1px dashed var(--color-primary-highlight)",
                    }}
                  >
                    Click to Switch ↵
                  </span>
                ) : null}
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
                Select reagent from inventory catalog &amp; add stock
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("new");
              setFeedback(null);
            }}
            onMouseEnter={() => setHoveredMode("new")}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              padding: "10px 14px",
              borderRadius: 7,
              border: !isExisting
                ? "1px solid #0284c7"
                : hoveredMode === "new"
                ? "1px dashed #0284c7"
                : "1px solid transparent",
              background: !isExisting
                ? "var(--color-surface-2)"
                : hoveredMode === "new"
                ? "rgba(2, 132, 199, 0.08)"
                : "transparent",
              color: !isExisting || hoveredMode === "new" ? "var(--color-text)" : "var(--color-text-muted)",
              fontWeight: !isExisting || hoveredMode === "new" ? 700 : 500,
              fontSize: "var(--fs-xs)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transform: isExisting && hoveredMode === "new" ? "translateY(-1px)" : "translateY(0)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: !isExisting
                ? "0 2px 8px rgba(14, 165, 233, 0.15)"
                : hoveredMode === "new"
                ? "0 3px 10px rgba(2, 132, 199, 0.12)"
                : "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: !isExisting
                  ? "rgba(14, 165, 233, 0.12)"
                  : hoveredMode === "new"
                  ? "rgba(2, 132, 199, 0.12)"
                  : "var(--color-surface-offset)",
                color: !isExisting || hoveredMode === "new" ? "#0284c7" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
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
                <span style={{ fontWeight: 700, fontSize: "12px" }}>New Reagent</span>
                {!isExisting ? (
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
                ) : hoveredMode === "new" ? (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "rgba(2, 132, 199, 0.12)",
                      color: "#0284c7",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      border: "1px dashed rgba(2, 132, 199, 0.4)",
                    }}
                  >
                    Click to Switch ↵
                  </span>
                ) : null}
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
                Register a new laboratory chemical and enter receiving details
              </div>
            </div>
          </button>
        </div>

        {/* Section Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)" }}>
              📥 Reagent Receiving &amp; Stock Check-In
            </div>
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
              {isExisting ? "Existing Reagent" : "New Reagent"}
            </span>
          </div>
        </div>

        {/* ── Form Fields Grid ── */}
        <form onSubmit={handleAddToCart}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {mode === "existing" ? (
              <div style={{ gridColumn: "span 2" }}>
                <ReagentItemSelect
                  label="Select Existing Reagent from Catalog"
                  required
                  items={inventoryItems}
                  value={selectedItemQuery}
                  onValueChange={setSelectedItemQuery}
                  onSelectItem={(item) => {
                    setSelectedItemId(item.id);
                    setSelectedItemQuery(`${item.reagentCode} - ${item.description}`);
                  }}
                  placeholder="Type reagent code, description, or assay…"
                />
                {selectedItem && (
                  <div style={{ fontSize: "11px", color: "var(--color-primary)", marginTop: 4, fontWeight: 600 }}>
                    Current Available: {selectedItem.availableConcentration} {selectedItem.concentrationUnit ?? "units"} • Storage: {formatStorageCondition(selectedItem.storageCondition)} • Assay: {selectedItem.assayType}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                    Reagent Code <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    style={inputStyle}
                    value={newReagentCode}
                    onChange={(e) => setNewReagentCode(e.target.value)}
                    placeholder="E.g. RGT-0042"
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  {/* Item description label changed to Reagent description as requested! */}
                  <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                    Reagent description <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    style={inputStyle}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="E.g. TaqMan Universal Master Mix II, no UNG"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                    Assay Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    style={inputStyle}
                    value={assayType}
                    onChange={(e) => setAssayType(e.target.value)}
                  >
                    {ASSAY_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                    Reagent Type
                  </label>
                  <select
                    style={inputStyle}
                    value={reagentType}
                    onChange={(e) => setReagentType(e.target.value)}
                  >
                    {REAGENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Storage Condition (Required for both modes with 4 values: 80, 20, 2-8, Ambient) */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Storage Condition <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                required
                style={{ ...inputStyle, fontWeight: 700 }}
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value)}
              >
                {STORAGE_CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Concentration & Concentration Unit */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Concentration Received <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                  value={concentrationValue}
                  onChange={(e) => setConcentrationValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Concentration"
                />
                <select
                  style={{ ...inputStyle, width: 80 }}
                  value={concentrationUnit}
                  onChange={(e) => setConcentrationUnit(e.target.value)}
                >
                  {CONCENTRATION_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lot / Batch Number */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Lot / Batch Number
              </label>
              <input
                type="text"
                style={inputStyle}
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="E.g. LOT-2026-X01"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Expiry Date
              </label>
              <input
                type="date"
                style={inputStyle}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* Minimum Concentration Threshold */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Minimum Threshold Alert
              </label>
              <input
                type="number"
                step="any"
                min="0"
                style={inputStyle}
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Low stock alert trigger"
              />
            </div>

            {/* Location / Storage Bin */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Freezer / Location / Box
              </label>
              <input
                type="text"
                style={inputStyle}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="E.g. Freezer 3, Rack B, Box 52"
              />
            </div>

            {/* Received From */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Received From / Supplier
              </label>
              <input
                type="text"
                style={inputStyle}
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="E.g. CDC Atlanta, Qiagen, Thermo"
              />
            </div>

            {/* Volume & Quantity (Optional) */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Volume &amp; Unit (Optional)
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  step="any"
                  style={{ ...inputStyle, flex: 1 }}
                  value={volume}
                  onChange={(e) => setVolume(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Vol"
                />
                <select
                  style={{ ...inputStyle, width: 65 }}
                  value={volumeUnit}
                  onChange={(e) => setVolumeUnit(e.target.value)}
                >
                  <option value="µL">µL</option>
                  <option value="mL">mL</option>
                  <option value="L">L</option>
                  <option value="mg">mg</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, borderTop: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))", paddingTop: 12 }}>
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: 7,
                border: "none",
                background: isExisting ? "var(--color-primary, #0d9488)" : "#0284c7",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: isExisting ? "0 2px 6px rgba(13, 148, 136, 0.3)" : "0 2px 8px rgba(14, 165, 233, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              <span>🛒 Add Reagent to Cart</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Batch Check-In Cart Table (Mirroring Stock Inventory) ── */}
      {cart.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-primary)",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 4px 14px rgba(13, 148, 136, 0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🛒 Batch Check-In Cart</span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--color-primary)", color: "#fff" }}>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
                Review queued check-in entries before final database commitment.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setCart([])}
                style={{
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "#ef4444",
                  cursor: "pointer",
                }}
              >
                Clear Cart
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBatchSubmit}
                style={{
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 800,
                  borderRadius: 6,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  cursor: !isSubmitting ? "pointer" : "not-allowed",
                  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
                }}
              >
                {isSubmitting ? "Committing Check-In…" : `Commit Batch Check-In (${cart.length})`}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse", fontSize: "11.5px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Mode</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Code</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Reagent Description</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Assay Type</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Concentration</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Storage</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Lot</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Location</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: item.mode === "new" ? "#0284c7" : "#0d9488" }}>
                      {item.mode === "new" ? "New" : "Existing"}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)" }}>{item.reagentCode}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text)" }}>{item.description}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>{item.assayType}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--color-text)" }}>
                      {item.concentrationValue} {item.concentrationUnit}
                    </td>
                    <td style={{ padding: "7px 10px" }}>{formatStorageCondition(item.storageCondition)}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>{item.lotNumber || "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>{item.location || "—"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reagent Check-In Reference Table ── */}
      <ReagentCheckInReferenceTable />
    </div>
  );
}
