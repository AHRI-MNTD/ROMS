import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { useReagentData, useReagentRequests } from "./useReagentData";
import { ReagentItemSelect } from "./ReagentItemSelect";
import {
  ReagentItem,
  ReagentRequest,
  ASSAY_TYPES,
  REAGENT_TYPES,
  CONCENTRATION_UNITS,
  needsNumberOfVill,
  hasConcentrationField,
} from "./reagentShared";

interface RequestCartItem {
  id: string;
  reagentItemId?: string;
  reagentCode?: string;
  reagentDescription?: string;
  assayType: string;
  reagentType?: string;
  projectFor: string;
  concentration?: number;
  concentrationUnit?: string;
  numberOfVill?: number;
  expectedReturn?: number;
  requestedBy: string;
  requestedFor: string;
  remark?: string;
}

export default function ReagentRequestPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();

  // Load existing reagents
  const { data: reagentsData } = useReagentData({ pageSize: 100 });
  const inventoryItems = useMemo(() => reagentsData?.data ?? [], [reagentsData?.data]);

  // Load user's submitted requests
  const { data: requestsData, isLoading: isRequestsLoading } = useReagentRequests();
  const requestHistory = useMemo(() => requestsData?.data ?? [], [requestsData?.data]);

  // Form states
  const [assayType, setAssayType] = useState<string>(ASSAY_TYPES[0]);
  const [reagentType, setReagentType] = useState<string>("Primer and probe");
  const [projectFor, setProjectFor] = useState<string>("ROMS Inventory");
  const [concentration, setConcentration] = useState<number | "">(10);
  const [concentrationUnit, setConcentrationUnit] = useState<string>("µM");
  const [numberOfVill, setNumberOfVill] = useState<number | "">(1);
  const [expectedReturn, setExpectedReturn] = useState<number | "">("");
  const [requestedFor, setRequestedFor] = useState<string>(user?.displayName || "");
  const [remark, setRemark] = useState<string>("");

  // Optional: Link to an existing catalog reagent
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemQuery, setSelectedItemQuery] = useState<string>("");

  // Master projects list
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

  // When user selects a reagent from catalog, auto-fill assay & reagent type
  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.assayType) setAssayType(selectedItem.assayType);
      if (selectedItem.reagentType) setReagentType(selectedItem.reagentType);
      if (selectedItem.concentrationUnit) setConcentrationUnit(selectedItem.concentrationUnit);
    }
  }, [selectedItem]);

  // Dynamically computed conditional field requirements based on user prompt rules:
  const requiresVill = useMemo(
    () => needsNumberOfVill(assayType, reagentType),
    [assayType, reagentType]
  );

  const includesConcentration = useMemo(
    () => hasConcentrationField(assayType),
    [assayType]
  );

  // Cart for batch requisition
  const [cart, setCart] = useState<RequestCartItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter for request reference table
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [requestSearch, setRequestSearch] = useState<string>("");

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const concVal = includesConcentration ? Number(concentration) : 0;
    if (includesConcentration && (isNaN(concVal) || concVal <= 0)) {
      setFeedback({ type: "error", message: "Concentration is required and must be greater than 0." });
      return;
    }

    const villVal = requiresVill ? Number(numberOfVill) : undefined;
    if (requiresVill && (!villVal || villVal <= 0)) {
      setFeedback({ type: "error", message: `Number of Vill is required for assay "${assayType}".` });
      return;
    }

    const item: RequestCartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      reagentItemId: selectedItem?.id,
      reagentCode: selectedItem?.reagentCode,
      reagentDescription: selectedItem?.description,
      assayType,
      reagentType,
      projectFor,
      concentration: includesConcentration ? concVal : undefined,
      concentrationUnit: includesConcentration ? concentrationUnit : undefined,
      numberOfVill: villVal,
      expectedReturn: expectedReturn !== "" ? Number(expectedReturn) : undefined,
      requestedBy: user?.displayName || user?.email || "Authenticated User",
      requestedFor: requestedFor.trim() || (user?.displayName || "Self"),
      remark: remark.trim() || undefined,
    };

    setCart((prev) => [...prev, item]);
    setFeedback({
      type: "success",
      message: `Added request for ${assayType} (${reagentType}) to requisition cart.`,
    });

    // Reset some fields
    setSelectedItemId("");
    setSelectedItemQuery("");
    setRemark("");
    setExpectedReturn("");
  };

  const handleBatchSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      for (const item of cart) {
        await apiClient.post("/domains/reagent-inventory/requests", {
          reagentItemId: item.reagentItemId,
          assayType: item.assayType,
          reagentType: item.reagentType,
          projectFor: item.projectFor,
          concentration: item.concentration ?? 1, // Fallback for no-concentration assay
          concentrationUnit: item.concentrationUnit,
          numberOfVill: item.numberOfVill,
          expectedReturn: item.expectedReturn,
          requestedFor: item.requestedFor,
          remark: item.remark,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["reagent-requests"] });
      setFeedback({
        type: "success",
        message: `Successfully submitted batch of ${cart.length} reagent request(s) to Tegbar for review!`,
      });
      setCart([]);
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Failed to submit reagent requests. Please check your inputs."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return requestHistory.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.assayType.toLowerCase().includes(q) ||
        (r.reagentType ?? "").toLowerCase().includes(q) ||
        (r.projectFor ?? "").toLowerCase().includes(q) ||
        (r.requestedBy ?? "").toLowerCase().includes(q) ||
        (r.requestedFor ?? "").toLowerCase().includes(q) ||
        (r.reagentItem?.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [requestHistory, statusFilter, requestSearch]);

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
      {/* ── Feedback Banner ── */}
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

      {/* ── Main Request Form Card ── */}
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
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                Reagent Requisition
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
                Dynamic Assay-Driven Form
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--color-surface-2)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                  fontWeight: 600,
                }}
              >
                23 Assay Protocols Supported
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
              Select assay type to dynamically configure required requisition parameters per laboratory SOP protocols
            </div>
          </div>
        </div>

        <form onSubmit={handleAddToCart}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {/* Assay Type (Determinant Field) */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--color-primary)", display: "block", marginBottom: 3 }}>
                Assay Type (Determines Form Fields) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                style={{ ...inputStyle, fontWeight: 700, borderColor: "var(--color-primary)" }}
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

            {/* Optional Existing Reagent Selection */}
            <div style={{ gridColumn: "span 2" }}>
              <ReagentItemSelect
                label="Pick Catalog Item (Optional Reference)"
                items={inventoryItems}
                value={selectedItemQuery}
                onValueChange={setSelectedItemQuery}
                onSelectItem={(item) => {
                  setSelectedItemId(item.id);
                  setSelectedItemQuery(`${item.reagentCode} - ${item.description}`);
                }}
                placeholder="Choose catalog reagent or leave blank for open requisition…"
              />
              {selectedItem && (
                <div style={{ fontSize: "10.5px", color: "var(--color-primary)", marginTop: 4 }}>
                  Current In Stock: {selectedItem.availableConcentration} {selectedItem.concentrationUnit ?? "units"} • Storage: {selectedItem.storageCondition}
                </div>
              )}
            </div>

            {/* Target Project (Common Field) */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Project <span style={{ color: "#ef4444" }}>*</span>
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

            {/* Reagent Type (Common Field) */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Reagent Type <span style={{ color: "#ef4444" }}>*</span>
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

            {/* Concentration (Included unless "RNA extruction Magmax kit") */}
            {includesConcentration ? (
              <div>
                <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                  Requested Concentration <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                    value={concentration}
                    onChange={(e) => setConcentration(e.target.value === "" ? "" : Number(e.target.value))}
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
            ) : (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  💡 Concentration omitted for MagMax Extraction Kit protocol.
                </span>
              </div>
            )}

            {/* Number of Vill (Conditional Field based on prompt rules) */}
            {requiresVill && (
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", display: "block", marginBottom: 3 }}>
                  Number of Vill (Vials) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  style={{ ...inputStyle, borderColor: "#0284c7" }}
                  value={numberOfVill}
                  onChange={(e) => setNumberOfVill(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Required vials count"
                />
              </div>
            )}

            {/* Expected Return */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Expected Return (if reusable)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                style={inputStyle}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Expected return amount"
              />
            </div>

            {/* Requested For / Personnel */}
            <div>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Requested For (Researcher / Tech)
              </label>
              <input
                type="text"
                style={inputStyle}
                value={requestedFor}
                onChange={(e) => setRequestedFor(e.target.value)}
                placeholder="Requester name"
              />
            </div>

            {/* Remark / Justification */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>
                Experiment Plan &amp; Notes
              </label>
              <input
                type="text"
                style={inputStyle}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Study cohort, PCR run batch, justification"
              />
            </div>
          </div>

          {/* Add to Cart Action */}
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
              <span>🛒 Add Request to Cart</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Batch Request Cart ── */}
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
                <span>🛒 Batch Requisition Cart</span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--color-primary)", color: "#fff" }}>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
                Submit all queued requests together for manager review and single-batch tracking.
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
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
                }}
              >
                {isSubmitting ? "Submitting Requests…" : `Submit Requisition Batch (${cart.length})`}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 750, borderCollapse: "collapse", fontSize: "11.5px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Assay Type</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Reagent Type</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Project</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Concentration</th>
                  <th style={{ padding: "7px 10px", textAlign: "right" }}>Vills</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>For</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)" }}>{item.assayType}</td>
                    <td style={{ padding: "7px 10px" }}>{item.reagentType}</td>
                    <td style={{ padding: "7px 10px" }}>{item.projectFor}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>
                      {item.concentration ? `${item.concentration} ${item.concentrationUnit ?? ""}` : "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right" }}>{item.numberOfVill ?? "—"}</td>
                    <td style={{ padding: "7px 10px" }}>{item.requestedFor}</td>
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

      {/* ── Request Reference Table (Mirroring RequestsPage) ── */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
              📑 Requisition History &amp; Approval Status
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
              Track approval decisions, partial allocations, and hand-off timestamps.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Search requests…"
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "11.5px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "11.5px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIAL">Partial</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Assay Type</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Reagent / Type</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Project</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Requested Conc.</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Approved Conc.</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Vills</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Requested By</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Hand-Off</th>
              </tr>
            </thead>
            <tbody>
              {isRequestsLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)" }}>
                    Loading requisitions…
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)" }}>
                    No reagent requests found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((req) => {
                  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                    PENDING: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
                    APPROVED: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
                    PARTIAL: { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
                    REJECTED: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
                  };
                  const sc = statusColors[req.status] ?? statusColors.PENDING;

                  return (
                    <tr key={req.id} style={{ borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)" }}>
                        {req.assayType}
                      </td>
                      <td style={{ padding: "7px 10px", color: "var(--color-text)" }}>
                        {req.reagentItem?.description ?? req.reagentType ?? "—"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>{req.projectFor || "General"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>
                        {req.requestedConcentration} {req.concentrationUnit ?? ""}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: req.approvedConcentration > 0 ? "#15803d" : "var(--color-text-muted)" }}>
                        {req.status === "PENDING" ? "—" : `${req.approvedConcentration} ${req.concentrationUnit ?? ""}`}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>{req.numberOfVill ?? "—"}</td>
                      <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>
                        {req.requestedFor || req.requestedBy}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                          }}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>
                        {req.disbursedAt ? (
                          <span style={{ color: "#15803d", fontWeight: 700 }}>
                            ✅ Disbursed ({new Date(req.disbursedAt).toLocaleDateString()})
                          </span>
                        ) : req.status === "APPROVED" || req.status === "PARTIAL" ? (
                          <span style={{ color: "#f59e0b", fontWeight: 600 }}>Ready for pickup</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
