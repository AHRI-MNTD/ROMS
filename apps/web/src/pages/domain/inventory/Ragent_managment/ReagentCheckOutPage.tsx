import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { useReagentData } from "./useReagentData";
import { ReagentItemSelect } from "./ReagentItemSelect";
import { ReagentCheckOutReferenceTable } from "./ReagentCheckOutReferenceTable";
import {
  ReagentItem,
  formatStorageCondition,
  getStorageBadgeMeta,
} from "./reagentShared";

interface CartItem {
  id: string;
  reagentItemId: string;
  reagentCode: string;
  description: string;
  assayType: string;
  concentration: number;
  concentrationUnit: string;
  numberOfVill?: number;
  expectedReturn?: number;
  projectFor: string;
  requestedFor: string;
  remark?: string;
}

export default function ReagentCheckOutPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();

  const { data: reagentsData, isLoading: isReagentsLoading } = useReagentData({ pageSize: 100 });
  const inventoryItems = useMemo(() => reagentsData?.data ?? [], [reagentsData?.data]);

  // Form state
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemQuery, setSelectedItemQuery] = useState<string>("");
  const [checkOutConcentration, setCheckOutConcentration] = useState<number | "">(10);
  const [numberOfVill, setNumberOfVill] = useState<number | "">(1);
  const [expectedReturn, setExpectedReturn] = useState<number | "">("");
  const [projectFor, setProjectFor] = useState<string>("ROMS Inventory");
  const [requestedFor, setRequestedFor] = useState<string>(user?.displayName || "Lab Technician");
  const [remark, setRemark] = useState<string>("");

  // Projects and staff lists from Master Data
  const [projects, setProjects] = useState<string[]>([
    "ROMS Inventory",
    "TES Project",
    "VECTOR Project",
    "PARASITE Project",
    "HAMMS Project",
    "ANOSTEP Project",
    "PVSTATEM Project",
    "CDC Collaboration",
    "GOV Surveillance",
    "DRIVAX Study",
  ]);

  useEffect(() => {
    apiClient
      .get("/domains/inventory/master-data/projects")
      .then((res) => {
        if (Array.isArray(res.data?.projects) && res.data.projects.length > 0) {
          setProjects(res.data.projects);
          setProjectFor(res.data.projects[0]);
        }
      })
      .catch(() => {});
  }, []);

  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  const availableConcentration = Number(selectedItem?.availableConcentration ?? 0);
  const concentrationVal = Number(checkOutConcentration) || 0;
  const projectedBalance = Math.max(0, availableConcentration - concentrationVal);

  // Cart for batch check-out
  const [cart, setCart] = useState<CartItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedItem) {
      setFeedback({ type: "error", message: "Please select a reagent to dispense." });
      return;
    }

    if (concentrationVal <= 0) {
      setFeedback({ type: "error", message: "Dispensed concentration must be greater than 0." });
      return;
    }

    if (concentrationVal > availableConcentration) {
      setFeedback({
        type: "error",
        message: `Requested concentration (${concentrationVal}) exceeds available concentration (${availableConcentration} ${selectedItem.concentrationUnit ?? ""}).`,
      });
      return;
    }

    // Check if already in cart
    const alreadyInCartConc = cart
      .filter((c) => c.reagentItemId === selectedItem.id)
      .reduce((acc, c) => acc + c.concentration, 0);

    if (alreadyInCartConc + concentrationVal > availableConcentration) {
      setFeedback({
        type: "error",
        message: `Cumulative cart concentration exceeds available balance of ${availableConcentration} ${selectedItem.concentrationUnit ?? ""}.`,
      });
      return;
    }

    const item: CartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      reagentItemId: selectedItem.id,
      reagentCode: selectedItem.reagentCode,
      description: selectedItem.description,
      assayType: selectedItem.assayType,
      concentration: concentrationVal,
      concentrationUnit: selectedItem.concentrationUnit ?? "units",
      numberOfVill: numberOfVill !== "" ? Number(numberOfVill) : undefined,
      expectedReturn: expectedReturn !== "" ? Number(expectedReturn) : undefined,
      projectFor,
      requestedFor,
      remark: remark.trim() || undefined,
    };

    setCart((prev) => [...prev, item]);
    setFeedback({
      type: "success",
      message: `Added ${selectedItem.reagentCode} (${concentrationVal} ${item.concentrationUnit}) to Checkout Cart.`,
    });

    // Reset selection & amounts
    setSelectedItemId("");
    setSelectedItemQuery("");
    setCheckOutConcentration(10);
    setExpectedReturn("");
    setRemark("");
  };

  const handleBatchCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      for (const item of cart) {
        await apiClient.post("/domains/reagent-inventory/check-out", {
          reagentItemId: item.reagentItemId,
          concentration: item.concentration,
          numberOfVill: item.numberOfVill,
          expectedReturn: item.expectedReturn,
          projectFor: item.projectFor,
          requestedFor: item.requestedFor,
          remark: item.remark,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["reagent-items"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-checkout-movements"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-movements"] });
      setFeedback({
        type: "success",
        message: `Successfully checked out batch of ${cart.length} reagent item(s)!`,
      });
      setCart([]);
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Bulk reagent check-out failed. Please check available concentrations."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    background: "var(--color-surface-2)",
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

      {/* ── Main Check-Out Form Card ── */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px rgb(37 147 153 / 65%)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "var(--inventory-hero-bg)",
            border: "1px solid var(--color-primary-highlight)",
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
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            📤
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                Reagent Check-Out &amp; Material Dispensing
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-highlight)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Outgoing Reagents
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
              Dispense reagents based on required concentration and Number of Vill, with expected-return tracking for reusable reagents
            </div>
          </div>
        </div>

        <form onSubmit={handleAddToCart}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {/* Reagent Selector */}
            <div style={{ gridColumn: "span 2" }}>
              <ReagentItemSelect
                label="Select Reagent to Dispense"
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
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: "11px", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Available: <strong style={{ color: "var(--color-primary)" }}>{availableConcentration} {selectedItem.concentrationUnit ?? "units"}</strong>
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Storage: <strong>{formatStorageCondition(selectedItem.storageCondition)}</strong>
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Assay: <strong>{selectedItem.assayType}</strong>
                  </span>
                  {selectedItem.location && (
                    <span style={{ color: "var(--color-text-muted)" }}>
                      Location: <strong>{selectedItem.location}</strong>
                    </span>
                  )}
                  <span style={{ color: projectedBalance <= (selectedItem.minThreshold ?? 0) ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                    Projected Balance: {projectedBalance} {selectedItem.concentrationUnit ?? ""}
                  </span>
                </div>
              )}
            </div>

            {/* Concentration (Instead of Quantity!) */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Concentration to Check Out <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  max={availableConcentration || undefined}
                  required
                  style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                  value={checkOutConcentration}
                  onChange={(e) => setCheckOutConcentration(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Concentration"
                />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 8px",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {selectedItem?.concentrationUnit ?? "units"}
                </span>
              </div>
            </div>

            {/* Number of Vill */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Number of Vill (Vials)
              </label>
              <input
                type="number"
                min="1"
                style={inputStyle}
                value={numberOfVill}
                onChange={(e) => setNumberOfVill(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Number of vials taken"
              />
            </div>

            {/* Expected Return Concentration */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Expected Return Concentration (if residual will be returned)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                style={inputStyle}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Expected return conc."
              />
            </div>

            {/* Project For */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Target Project <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                style={inputStyle}
                value={projectFor}
                onChange={(e) => setProjectFor(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested For / Recipient */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Dispensed To / Recipient <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                style={inputStyle}
                value={requestedFor}
                onChange={(e) => setRequestedFor(e.target.value)}
                placeholder="Technician or Researcher name"
              />
            </div>

            {/* Remark / Notes */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Experiment Purpose &amp; Remarks
              </label>
              <input
                type="text"
                style={inputStyle}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="E.g. TES surveillance run round 4, 96-well extraction"
              />
            </div>
          </div>

          {/* Add to Cart Button */}
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
                background: "var(--color-primary, #0d9488)",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(13, 148, 136, 0.3)",
              }}
            >
              <span>🛒 Add Reagent to Checkout Cart</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Batch Checkout Cart Table (Mirroring CheckOutPage) ── */}
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
                <span>🛒 Batch Checkout Cart</span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--color-primary)", color: "#fff" }}>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
                Review reagents to be dispensed and deducted from live concentrations.
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
                onClick={handleBatchCheckout}
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
                {isSubmitting ? "Processing Check-Out…" : `Commit Batch Check-Out (${cart.length})`}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse", fontSize: "11.5px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Code</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Reagent Description</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Assay</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Concentration</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Vills</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Exp. Return</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Project</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Recipient</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)" }}>{item.reagentCode}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text)" }}>{item.description}</td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>{item.assayType}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#ef4444" }}>
                      -{item.concentration} {item.concentrationUnit}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right" }}>{item.numberOfVill || "—"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {item.expectedReturn ? `${item.expectedReturn} ${item.concentrationUnit}` : "—"}
                    </td>
                    <td style={{ padding: "7px 10px" }}>{item.projectFor}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 600 }}>{item.requestedFor}</td>
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

      {/* ── Reagent Check-Out Reference Table ── */}
      <ReagentCheckOutReferenceTable />
    </div>
  );
}
