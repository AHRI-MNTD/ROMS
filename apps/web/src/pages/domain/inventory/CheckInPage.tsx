import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";

type CheckInMode = "existing" | "new";

interface CheckInLogEntry {
  id: string;
  timestamp: string;
  itemLabel: string;
  quantity: number;
  mode: CheckInMode;
}

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });

  const [mode, setMode] = React.useState<CheckInMode>("existing");
  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [checkInQty, setCheckInQty] = React.useState(1);
  const [lotNumber, setLotNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [projectFor, setProjectFor] = React.useState("ROMS Inventory");
  const [status, setStatus] = React.useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");
  const [projects, setProjects] = React.useState<string[]>([]);

  const [newSku, setNewSku] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newUnit, setNewUnit] = React.useState("units");
  const [newMinThreshold, setNewMinThreshold] = React.useState(5);
  const [newOpeningQty, setNewOpeningQty] = React.useState(1);
  const [newLotNumber, setNewLotNumber] = React.useState("");
  const [newExpiryDate, setNewExpiryDate] = React.useState("");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logs, setLogs] = React.useState<CheckInLogEntry[]>([]);

  const selectedItem = React.useMemo(() => (data?.data ?? []).find((item) => item.id === selectedItemId), [data?.data, selectedItemId]);

  const inventoryReferenceRows = React.useMemo(() => {
    return (data?.data ?? []).map((item) => {
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
  }, [data?.data]);

  const quickLinkStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "var(--fs-xs)",
    textDecoration: "none",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    width: "100%",
  };

  React.useEffect(() => {
    let mounted = true;
    apiClient
      .get("/domains/inventory/master-data/projects")
      .then((resp) => {
        const list = resp.data?.projects ?? [];
        if (!mounted) return;
        setProjects(list);
        setProjectFor((prev) => (prev && prev !== "ROMS Inventory" ? prev : list[0] ?? "ROMS Inventory"));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
        const payload: Record<string, unknown> = { quantity: nextQuantity };
        if (lotNumber.trim()) {
          payload.lotNumber = lotNumber.trim();
        }
        if (expiryDate) {
          payload.expiryDate = expiryDate;
        }
        payload.projectFor = projectFor.trim() || "ROMS Inventory";
        payload.status = status;
        payload.remark = note.trim() || undefined;
        await apiClient.patch(`/domains/inventory/${selectedItem.id}`, payload);

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
        throw new Error("Opening quantity must be greater than zero.");
      }

      await apiClient.post("/domains/inventory", {
        sku: newSku.trim(),
        name: newName.trim(),
        unit: newUnit.trim() || "units",
        minThreshold: Math.max(0, Math.floor(newMinThreshold)),
        quantity: Math.max(0, Math.floor(newOpeningQty)),
        lotNumber: newLotNumber.trim() || undefined,
        expiryDate: newExpiryDate || undefined,
        projectFor: projectFor.trim() || "ROMS Inventory",
        status,
        note: note.trim() || undefined,
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

      setLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          itemLabel: result.itemLabel,
          quantity: result.quantity,
          mode: result.mode,
        },
        ...prev,
      ].slice(0, 8));

      if (result.mode === "existing") {
        setCheckInQty(1);
        setLotNumber("");
        setExpiryDate("");
        setNote("");
      } else {
        setNewSku("");
        setNewName("");
        setNewUnit("units");
        setNewMinThreshold(5);
        setNewOpeningQty(1);
        setNewLotNumber("");
        setNewExpiryDate("");
        setNote("");
        setProjectFor("ROMS Inventory");
        setStatus("APPROVED");
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Check-in failed.";
      setFeedback({ type: "error", message });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link to="../current-inventory" style={quickLinkStyle}>View Current Inventory</Link>
        <Link to="../check-out" style={quickLinkStyle}>Go To Check Out</Link>
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>Check In</div>

        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            <input type="radio" name="checkin-mode" checked={mode === "existing"} onChange={() => setMode("existing")} />
            Existing item
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            <input type="radio" name="checkin-mode" checked={mode === "new"} onChange={() => setMode("new")} />
            New item
          </label>
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
            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Select Item
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={inputStyle}>
                <option value="">Choose item</option>
                {(data?.data ?? []).map((item) => (
                  <option key={item.id ?? `${item.sku}-${item.name}`} value={item.id ?? ""}>
                    {item.sku} - {item.name} (Current: {item.quantity ?? 0})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Check-In Quantity
              <input type="number" min={1} value={checkInQty} onChange={(e) => setCheckInQty(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Lot Number (optional)
              <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Expiry Date (optional)
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
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
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as "APPROVED" | "PENDING" | "REJECTED")} style={inputStyle}>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </label>
          </div>
        )}

        {mode === "new" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Code_No (SKU)
              <input value={newSku} onChange={(e) => setNewSku(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Item Description
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Unit
              <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Opening Quantity
              <input type="number" min={1} value={newOpeningQty} onChange={(e) => setNewOpeningQty(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Min Threshold
              <input type="number" min={0} value={newMinThreshold} onChange={(e) => setNewMinThreshold(Number(e.target.value))} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Lot Number (optional)
              <input value={newLotNumber} onChange={(e) => setNewLotNumber(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Expiry Date (optional)
              <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} style={inputStyle} />
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
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as "APPROVED" | "PENDING" | "REJECTED")} style={inputStyle}>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </label>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </div>

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
            {checkInMutation.isPending ? "Submitting..." : mode === "existing" ? "Submit Check In" : "Create Item + Check In"}
          </button>
        </div>
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Recent Check-In Activity (Session)</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No check-in actions recorded yet in this session.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Time</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Mode</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(entry.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.mode === "existing" ? "Existing" : "New"}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.itemLabel}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Check-In Reference Table</div>
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
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date_Received</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Expiry_Date</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {inventoryReferenceRows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    No records available.
                  </td>
                </tr>
              ) : (
                inventoryReferenceRows.map((row, index) => (
                  <tr key={`${row.codeNo}-${index}`} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.codeNo}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.barcode}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.itemDescription}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.unit}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.unitDescription}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.category}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.project}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.dateReceived}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.expiryDate}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.remark}</td>
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