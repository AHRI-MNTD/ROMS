import React from "react";
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
  const [checkOutQty, setCheckOutQty] = React.useState(1);
  const [projectFor, setProjectFor] = React.useState("ROMS Inventory");
  const [dateRequested, setDateRequested] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = React.useState("");
  const [note, setNote] = React.useState("");
  const [checkOutStatus, setCheckOutStatus] = React.useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logs, setLogs] = React.useState<CheckOutLogEntry[]>([]);
  const [projects, setProjects] = React.useState<string[]>([]);
  const [staffMembers, setStaffMembers] = React.useState<string[]>([]);

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
      .catch(() => {});
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

      const nextQuantity = currentQty - checkOutQty;
      await apiClient.patch(`/domains/inventory/${selectedItem.id}`, {
        quantity: nextQuantity,
        destination: projectFor.trim(),
        recipient: requestedBy.trim(),
        projectFor: projectFor.trim(),
        status: checkOutStatus,
        remark: note.trim() || undefined,
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
      setDateRequested(new Date().toISOString().slice(0, 10));
      setRequestedBy(staffMembers[0] || "");
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
      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
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
            Status
            <select value={checkOutStatus} onChange={(e) => setCheckOutStatus(e.target.value as "APPROVED" | "PENDING" | "REJECTED")} style={inputStyle}>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING">PENDING</option>
              <option value="REJECTED">REJECTED</option>
            </select>
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
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 10 }}>{labelOverrides?.referenceTable || "Check-Out Reference Table"}</div>
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
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.dateRequested}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.requestedBy}</td>
                    <td style={{ padding: "8px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.projectFor}</td>
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