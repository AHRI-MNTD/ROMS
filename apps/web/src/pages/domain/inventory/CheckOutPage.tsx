import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";

interface CheckOutLogEntry {
  id: string;
  timestamp: string;
  itemLabel: string;
  quantity: number;
  destination: string;
}

export default function CheckOutPage() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useInventoryData({ page: 1, pageSize: 200 });

  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [checkOutQty, setCheckOutQty] = React.useState(1);
  const [destination, setDestination] = React.useState("Lab Room 1");
  const [recipient, setRecipient] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [note, setNote] = React.useState("");
  const [checkOutStatus, setCheckOutStatus] = React.useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logs, setLogs] = React.useState<CheckOutLogEntry[]>([]);
  const [statusByRowKey, setStatusByRowKey] = React.useState<Record<string, "APPROVED" | "PENDING" | "REJECTED">>({});

  const selectedItem = React.useMemo(() => (data?.data ?? []).find((item) => item.id === selectedItemId), [data?.data, selectedItemId]);
  const currentQty = Number(selectedItem?.quantity ?? 0);
  const projectedBalance = Math.max(0, currentQty - Math.max(0, checkOutQty));

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
      const defaultStatus: "APPROVED" | "PENDING" | "REJECTED" = isOutOfStock ? "PENDING" : "APPROVED";

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
        defaultStatus,
        remark: isOutOfStock ? "Out of stock" : isLowStock ? "Low stock" : item.lotNumber ? `Lot: ${item.lotNumber}` : "In stock",
      };
    });
  }, [data?.data, user?.displayName, user?.email]);

  React.useEffect(() => {
    if (inventoryReferenceRows.length === 0) {
      return;
    }

    setStatusByRowKey((prev) => {
      const next = { ...prev };
      inventoryReferenceRows.forEach((row) => {
        if (!next[row.rowKey]) {
          next[row.rowKey] = row.defaultStatus;
        }
      });
      return next;
    });
  }, [inventoryReferenceRows]);

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
      if (!destination.trim()) {
        throw new Error("Destination is required.");
      }

      const nextQuantity = currentQty - checkOutQty;
      await apiClient.patch(`/domains/inventory/${selectedItem.id}`, {
        quantity: nextQuantity,
        destination: destination.trim(),
        recipient: recipient.trim() || undefined,
        projectFor: purpose.trim() || destination.trim(),
        status: checkOutStatus,
        remark: note.trim() || undefined,
      });

      return {
        itemLabel: `${selectedItem.sku ?? ""} ${selectedItem.name ?? ""}`.trim(),
        quantity: checkOutQty,
        destination: destination.trim(),
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });

      setFeedback({
        type: "success",
        message: `Checked out ${result.quantity} unit(s) for ${result.itemLabel} to ${result.destination}.`,
      });

      setLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          itemLabel: result.itemLabel,
          quantity: result.quantity,
          destination: result.destination,
        },
        ...prev,
      ].slice(0, 8));

      setCheckOutQty(1);
      setRecipient("");
      setPurpose("");
      setNote("");
      setCheckOutStatus("APPROVED");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Check-out failed.";
      setFeedback({ type: "error", message });
    },
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link to="../current-inventory" style={quickLinkStyle}>View Current Inventory</Link>
        <Link to="../check-in" style={quickLinkStyle}>Go To Check In</Link>
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>Check Out</div>

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
            Check-Out Quantity
            <input type="number" min={1} value={checkOutQty} onChange={(e) => setCheckOutQty(Number(e.target.value))} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Destination / Department
            <input value={destination} onChange={(e) => setDestination(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Recipient (optional)
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Purpose (optional)
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Status
            <select value={checkOutStatus} onChange={(e) => setCheckOutStatus(e.target.value as "APPROVED" | "PENDING" | "REJECTED")} style={inputStyle}>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING">PENDING</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
        </div>

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
            {checkOutMutation.isPending ? "Submitting..." : "Submit Check Out"}
          </button>
        </div>
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Recent Check-Out Activity (Session)</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>No check-out actions recorded yet in this session.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Time</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Item</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Destination</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{new Date(entry.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.itemLabel}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.quantity}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{entry.destination}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>Check-Out Reference Table</div>
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
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Date_Requested</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Requested_By</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Project_For</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {inventoryReferenceRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
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
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.dateRequested}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.requestedBy}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.projectFor}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                      <select
                        value={statusByRowKey[row.rowKey] ?? row.defaultStatus}
                        onChange={(e) => {
                          const value = e.target.value as "APPROVED" | "PENDING" | "REJECTED";
                          setStatusByRowKey((prev) => ({ ...prev, [row.rowKey]: value }));
                        }}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--color-surface)",
                          color: "var(--color-text)",
                          padding: "4px 6px",
                          fontSize: "var(--fs-xs)",
                        }}
                      >
                        <option value="APPROVED">APPROVED</option>
                        <option value="PENDING">PENDING</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
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