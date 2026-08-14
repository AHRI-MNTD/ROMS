import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";
import { apiClient, getErrorMessage } from "../../../api/client";

export type StockFilter = "all" | "healthy" | "moderate" | "low" | "out";

export function getStockStatusInfo(percentBalance: number, quantity: number) {
  if (quantity <= 0 || percentBalance <= 0) {
    return {
      label: "Out of Stock",
      color: "#991b1b",
      bg: "#fee2e2",
      borderColor: "rgba(239, 68, 68, 0.2)",
    };
  }
  if (percentBalance < 50) {
    return {
      label: "Low Stock",
      color: "#92400e",
      bg: "#fef3c7",
      borderColor: "rgba(245, 158, 11, 0.2)",
    };
  }
  if (percentBalance < 75) {
    return {
      label: "Moderate Stock",
      color: "#1e40af",
      bg: "#dbeafe",
      borderColor: "rgba(59, 130, 246, 0.2)",
    };
  }
  return {
    label: "Healthy",
    color: "#166534",
    bg: "#dcfce7",
    borderColor: "rgba(34, 197, 94, 0.2)",
  };
}

function ItemMovementDetailsPanel({ item }: { item: any }) {
  const itemId = item.id;
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["inventory-item-movements", itemId],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { stockItemId: itemId, all: "true" },
      });
      return resp.data as { data: any[]; total: number };
    },
    enabled: Boolean(itemId),
  });

  const movements = movementsData?.data ?? [];
  const checkInMovements = movements.filter((m) => m.movementType === "CHECK_IN");
  const checkOutMovements = movements.filter((m) => m.movementType === "CHECK_OUT");

  const quantity = Number(item.quantity ?? 0);
  const checkOutTotalFromMovements = checkOutMovements.reduce(
    (sum, m) => sum + (m.status === "REJECTED" ? 0 : Number(m.quantity ?? 0)),
    0
  );
  const checkOutTotal = Number(item.checkOutTotal ?? checkOutTotalFromMovements);
  const checkInTotalFromMovements = checkInMovements.reduce((sum, m) => sum + Number(m.quantity ?? 0), 0);
  const checkInTotal = Number(item.checkInTotal ?? Math.max(checkInTotalFromMovements, quantity + checkOutTotal));
  const balance = quantity;
  const percentBalance = Number(item.balancePercent ?? (checkInTotal > 0 ? (balance / checkInTotal) * 100 : 0));
  const status = getStockStatusInfo(percentBalance, balance);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: 10,
    padding: "12px 16px",
    border: "1px solid rgba(1, 105, 111, 0.14)",
    boxShadow: "0 4px 12px rgba(16, 24, 40, 0.03)",
  };

  const subHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 800,
    color: "var(--color-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: "1px solid rgba(1, 105, 111, 0.1)",
  };

  const miniTableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10.5px",
  };

  const miniThStyle: React.CSSProperties = {
    padding: "6px 8px",
    textAlign: "left",
    color: "var(--color-text-faint)",
    borderBottom: "1px solid var(--color-divider)",
    textTransform: "uppercase",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    background: "rgba(1, 105, 111, 0.03)",
  };

  const miniTdStyle: React.CSSProperties = {
    padding: "6px 8px",
    color: "var(--color-text-muted)",
    borderBottom: "1px dashed rgba(1, 105, 111, 0.08)",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(240, 249, 248, 0.98) 0%, rgba(245, 247, 246, 0.96) 50%, rgba(235, 244, 244, 0.98) 100%)",
        border: "1px solid rgba(1, 105, 111, 0.22)",
        borderLeft: "1px solid rgba(1, 105, 111, 0.22);",
        boxShadow: "inset 0 2px 6px rgba(1, 105, 111, 0.04), 0 6px 16px rgba(16, 24, 40, 0.06)",
        display: "grid",
        gap: 16,
        margin: "4px 0",
      }}
    >
      {isLoading ? (
        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", padding: 12 }}>
          ⏳ Loading check-in & check-out detailed movement activity…
        </div>
      ) : (
        <>
          {/* Full-Width Check-In History */}
          <div style={{ ...cardStyle, borderLeft: "4px solid #166534" }}>
            <div style={subHeaderStyle}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "14px" }}>📥</span> <strong>Check-In History Log</strong>

              </span>
              <span style={{ fontSize: "10px", background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: 999, fontWeight: 800, border: "1px solid rgba(22, 101, 52, 0.2)" }}>
                Total Check-In: {checkInTotal} {item.unit || "units"}
              </span>
            </div>
            {checkInMovements.length === 0 ? (
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic", padding: "12px 10px", background: "rgba(240, 253, 244, 0.5)", borderRadius: 6 }}>
                No explicit check-in movement transactions logged for this item.
              </div>
            ) : (
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={miniTableStyle}>
                  <thead>
                    <tr>
                      <th style={miniThStyle}>Date & Time</th>
                      <th style={miniThStyle}>Qty In</th>
                      <th style={miniThStyle}>Unit</th>
                      <th style={miniThStyle}>Project / Source</th>
                      <th style={miniThStyle}>Checked In By</th>
                      <th style={miniThStyle}>Lot Number</th>
                      <th style={miniThStyle}>Expiry Date</th>
                      <th style={miniThStyle}>Batch Ref</th>
                      <th style={miniThStyle}>Status</th>
                      <th style={miniThStyle}>Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkInMovements.map((m, idx) => (
                      <tr key={m.id || idx} style={{ transition: "background 0.1s ease" }}>
                        <td style={{ ...miniTdStyle, fontWeight: 600, color: "var(--color-text)" }}>
                          {m.occurredAt ? new Date(m.occurredAt).toLocaleString() : "—"}
                        </td>
                        <td style={{ ...miniTdStyle, fontWeight: 800, color: "#166534", fontSize: "11px" }}>
                          +{m.quantity}
                        </td>
                        <td style={miniTdStyle}>{item.unit || "units"}</td>
                        <td style={miniTdStyle}>{m.projectFor || m.destination || "ROMS Inventory"}</td>
                        <td style={miniTdStyle}>{m.requestedBy || "System Admin"}</td>
                        <td style={miniTdStyle}>{m.lotNumber || item.lotNumber || "—"}</td>
                        <td style={miniTdStyle}>
                          {m.expiryDate ? new Date(m.expiryDate).toISOString().slice(0, 10) : item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "—"}
                        </td>
                        <td style={{ ...miniTdStyle, fontFamily: "monospace", fontSize: "9.5px" }}>
                          {m.requestBatchId ? m.requestBatchId.slice(0, 8) : "—"}
                        </td>
                        <td style={miniTdStyle}>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>
                            {m.status || "COMPLETED"}
                          </span>
                        </td>
                        <td style={{ ...miniTdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.remark || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 800, background: "rgba(220, 252, 231, 0.45)" }}>
                      <td style={miniTdStyle}>Total Check-In</td>
                      <td style={{ ...miniTdStyle, color: "#166534", fontSize: "11px" }}>+{checkInTotal}</td>
                      <td style={miniTdStyle} colSpan={8}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Full-Width Check-Out History */}
          <div style={{ ...cardStyle, borderLeft: "4px solid #991b1b" }}>
            <div style={subHeaderStyle}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "14px" }}>📤</span> <strong>Check-Out History Log</strong>

              </span>
              <span style={{ fontSize: "10px", background: checkOutTotal > 0 ? "#fee2e2" : "rgba(0,0,0,0.05)", color: checkOutTotal > 0 ? "#991b1b" : "var(--color-text-muted)", padding: "3px 10px", borderRadius: 999, fontWeight: 800, border: `1px solid ${checkOutTotal > 0 ? "rgba(153, 27, 27, 0.2)" : "rgba(0,0,0,0.1)"}` }}>
                Total Check-Out: {checkOutTotal} {item.unit || "units"}
              </span>
            </div>
            {checkOutMovements.length === 0 ? (
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", padding: "12px 14px", background: "rgba(254, 242, 242, 0.6)", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "16px" }}></span>
                <div>
                  <strong>Check-Out History is Empty (Total Out: 0)</strong>
                  <div style={{ fontSize: "10.5px", marginTop: 2 }}>This item is checked into inventory, but has not been disbursed or checked out to any project or staff member yet.</div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={miniTableStyle}>
                  <thead>
                    <tr>
                      <th style={miniThStyle}>Date & Time</th>
                      <th style={miniThStyle}>Qty Requested</th>
                      <th style={miniThStyle}>Qty Out (Accepted)</th>
                      <th style={miniThStyle}>Unit</th>
                      <th style={miniThStyle}>Project / Destination</th>
                      <th style={miniThStyle}>Requested By</th>
                      <th style={miniThStyle}>Recipient</th>
                      <th style={miniThStyle}>Team</th>
                      <th style={miniThStyle}>Status</th>
                      <th style={miniThStyle}>Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkOutMovements.map((m, idx) => (
                      <tr key={m.id || idx} style={{ transition: "background 0.1s ease" }}>
                        <td style={{ ...miniTdStyle, fontWeight: 600, color: "var(--color-text)" }}>
                          {m.occurredAt ? new Date(m.occurredAt).toLocaleString() : "—"}
                        </td>
                        <td style={miniTdStyle}>{m.requestedQuantity ?? m.quantity}</td>
                        <td style={{ ...miniTdStyle, fontWeight: 800, color: "#991b1b", fontSize: "11px" }}>
                          -{m.quantity}
                        </td>
                        <td style={miniTdStyle}>{item.unit || "units"}</td>
                        <td style={miniTdStyle}>{m.projectFor || m.destination || "—"}</td>
                        <td style={miniTdStyle}>{m.requestedBy || "—"}</td>
                        <td style={miniTdStyle}>{m.recipient || m.requestedBy || "—"}</td>
                        <td style={miniTdStyle}>{m.team || "—"}</td>
                        <td style={miniTdStyle}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: m.status === "APPROVED" ? "#dcfce7" : m.status === "REJECTED" ? "#fee2e2" : m.status === "PARTIAL" ? "#ffedd5" : "#fef3c7",
                            color: m.status === "APPROVED" ? "#166534" : m.status === "REJECTED" ? "#991b1b" : m.status === "PARTIAL" ? "#c2410c" : "#92400e"
                          }}>
                            {m.status || "APPROVED"}
                          </span>
                        </td>
                        <td style={{ ...miniTdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.remark || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 800, background: "rgba(254, 226, 226, 0.45)" }}>
                      <td style={miniTdStyle}>Total Check-Out</td>
                      <td style={miniTdStyle}></td>
                      <td style={{ ...miniTdStyle, color: "#991b1b", fontSize: "11px" }}>-{checkOutTotal}</td>
                      <td style={miniTdStyle} colSpan={7}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Activity Summary Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(1, 105, 111, 0.06)",
            border: "1px solid rgba(1, 105, 111, 0.16)",
            fontSize: "11px",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <span>Item: <strong style={{ color: "var(--color-text)" }}>{item.name || item.sku}</strong> ({item.sourceCode || item.sku})</span>
              <span>Category: <strong>{item.category || "General"}</strong></span>
              <span>Unit: <strong>{item.unit || "units"}</strong></span>
              <span>Total In: <strong style={{ color: "#166534", fontSize: "12px" }}>{checkInTotal}</strong></span>
              <span>Total Out: <strong style={{ color: "#991b1b", fontSize: "12px" }}>{checkOutTotal}</strong></span>
              <span>Current Balance: <strong style={{ color: "var(--color-text)", fontSize: "12px" }}>{balance}</strong></span>
              <span>% Bal: <strong style={{ fontSize: "12px" }}>{Math.round(percentBalance)}%</strong></span>
            </div>
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "999px",
                padding: "3px 10px",
                fontWeight: 800,
                fontSize: "10px",
                color: status.color,
                background: status.bg,
                border: `1px solid ${status.borderColor}`
              }}>
                {status.label}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CurrentInventoryPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin =
    (user?.roles?.some((r) => ["ADMIN", "RESEARCH_ADMIN"].includes(r)) ?? false) ||
    (user?.permissions?.includes("admin:all") ?? false);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");

  const [expandedRowIds, setExpandedRowIds] = React.useState<Set<string>>(new Set());

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const [page, setPage] = React.useState(1);
  const pageSize = 15;
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isExportHovered, setIsExportHovered] = React.useState(false);
  const [isSyncHovered, setIsSyncHovered] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    if (typeof document === "undefined") {
      return false;
    }
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({
    sku: "",
    name: "",
    category: "",
    unit: "",
    quantity: 0,
    minThreshold: 5,
    lotNumber: "",
    expiryDate: "",
  });

  const handleStartEdit = (item: any) => {
    if (!isSuperAdmin) return;
    setFeedback(null);
    setEditingItem(item);
    setEditForm({
      sku: item.sku ?? "",
      name: item.name ?? "",
      category: item.category ?? "",
      unit: item.unit ?? "",
      quantity: Number(item.quantity ?? 0),
      minThreshold: Number(item.minThreshold ?? 5),
      lotNumber: item.lotNumber ?? "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!isSuperAdmin || !editingItem) return;
    try {
      await apiClient.patch(`/domains/inventory/${editingItem.id}`, {
        sku: editForm.sku.trim() || undefined,
        name: editForm.name.trim() || undefined,
        category: editForm.category.trim() || undefined,
        unit: editForm.unit.trim() || undefined,
        quantity: editForm.quantity,
        minThreshold: editForm.minThreshold,
        lotNumber: editForm.lotNumber.trim() || null,
        expiryDate: editForm.expiryDate || null,
      });
      setFeedback({ type: "success", message: `Successfully updated item ${editForm.sku}.` });
      setEditingItem(null);
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
    } catch (err: any) {
      setFeedback({ type: "error", message: getErrorMessage(err, "Failed to update item.") });
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Are you sure you want to delete this stock item? All movement logs for this item will be lost.")) {
      return;
    }
    setFeedback(null);
    try {
      await apiClient.delete(`/domains/inventory/${item.id}`);
      setFeedback({ type: "success", message: `Successfully deleted item ${item.name || item.sku}.` });
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
    } catch (err: any) {
      setFeedback({ type: "error", message: getErrorMessage(err, "Failed to delete item.") });
    }
  };

  const handleSyncGoogleSheets = async () => {
    if (!isSuperAdmin) return;
    setFeedback(null);
    setIsSyncing(true);
    try {
      const resp = await apiClient.post<{ message?: string }>("/domains/inventory/google-sheets/sync", {});
      setFeedback({
        type: "success",
        message: resp.data.message || "Successfully synchronized inventory with Google Sheets!",
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Failed to synchronize with Google Sheets."),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const { data, isLoading, error, isFetching } = useInventoryData({
    page,
    pageSize,
    search: normalizedSearch,
    category: categoryFilter,
    stockFilter,
  });

  const { data: categoriesList } = useQuery({
    queryKey: ["inventory-categories-list"],
    queryFn: async () => {
      const [masterDataResp, itemsResp] = await Promise.all([
        apiClient.get("/domains/inventory/master-data", { params: { pageSize: 200 } }),
        apiClient.get("/domains/inventory", { params: { all: "true" } }),
      ]);
      const catSet = new Set<string>();
      (masterDataResp.data?.data ?? []).forEach((row: any) => {
        if (row.category?.trim()) catSet.add(row.category.trim());
      });
      (itemsResp.data?.data ?? []).forEach((row: any) => {
        if (row.category?.trim()) catSet.add(row.category.trim());
      });
      return Array.from(catSet).sort();
    },
  });

  const exportInventoryQuery = useInventoryData({
    all: true,
    search: normalizedSearch,
    category: categoryFilter,
    stockFilter,
    enabled: false,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["inventory-analytics"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/analytics");
      return resp.data as {
        summary: { lowStockItems: number; outOfStockItems: number; totalQuantity: number };
      };
    },
  });

  const filteredRows = data?.data ?? [];
  const lowStockCount = analyticsData?.summary.lowStockItems ?? 0;
  const outOfStockCount = analyticsData?.summary.outOfStockItems ?? 0;
  const totalStock = analyticsData?.summary.totalQuantity ?? 0;

  const displayTotal = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(displayTotal / pageSize));

  React.useEffect(() => {
    if (!isLoading && !isFetching && page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [isLoading, isFetching, page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, stockFilter]);

  const handleExportCSV = async () => {
    if (!isSuperAdmin) return;
    const exportResult = await exportInventoryQuery.refetch();
    const exportRows = exportResult.data?.data ?? [];

    if (exportRows.length === 0) {
      setFeedback({ type: "error", message: "No data matched current filters for export." });
      return;
    }

    const headers = ["Code / SKU", "Description", "Category", "Unit", "Check-In Total", "Check-Out Total", "Current Quantity", "Min Threshold", "% Balance", "Status"];
    const csvRows = [
      headers.join(","),
      ...exportRows.map((row) => {
        const qty = Number(row.quantity ?? 0);
        const minT = Number(row.minThreshold ?? 0);
        const checkOut = Number(row.checkOutTotal ?? 0);
        const checkIn = Number(row.checkInTotal ?? qty + checkOut);
        const pct = Number(row.balancePercent ?? (checkIn > 0 ? (qty / checkIn) * 100 : 0));
        const statusInfo = getStockStatusInfo(pct, qty);

        return [
          `"${String(row.sourceCode ?? row.sku ?? "—").replace(/"/g, '""')}"`,
          `"${String(row.name ?? "—").replace(/"/g, '""')}"`,
          `"${String(row.category ?? "General").replace(/"/g, '""')}"`,
          `"${String(row.unit ?? "—").replace(/"/g, '""')}"`,
          checkIn,
          checkOut,
          qty,
          minT,
          `"${Math.round(pct)}%"`,
          `"${statusInfo.label}"`
        ].join(",");
      })
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roms_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const quickLinkStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.18)",
    background: isDarkMode
      ? "var(--color-surface-2)"
      : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,246,241,0.92))",
    color: "var(--color-text)",
    borderRadius: "8px",
    padding: "5px 9px",
    fontSize: "10px",
    textDecoration: "none",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    height: 30,
    boxShadow: "0 4px 10px rgba(16, 24, 40, 0.03)",
  };

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.12)",
    borderRadius: 12,
    background: isDarkMode
      ? "var(--color-surface)"
      : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,248,245,0.9))",
    boxShadow: "0 10px 24px rgba(16, 24, 40, 0.05)",
    backdropFilter: "blur(10px)",
  };

  const toolbarButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.14)",
    borderRadius: 8,
    background: isDarkMode ? "var(--color-surface-2)" : "rgba(255,255,255,0.72)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10px",
    height: 30,
    boxShadow: "0 4px 10px rgba(16, 24, 40, 0.03)",
  };

  const inputStyle: React.CSSProperties = {
    minWidth: 150,
    border: "1px solid rgba(1, 105, 111, 0.14)",
    borderRadius: 8,
    background: isDarkMode ? "var(--color-surface-2)" : "rgba(255,255,255,0.74)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10px",
    height: 30,
    boxShadow: "0 4px 10px rgba(16, 24, 40, 0.03)",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {feedback && (
        <div
          style={{
            padding: 10,
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--fs-xs)",
            background: feedback.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: feedback.type === "success" ? "#047857" : "#b91c1c",
            border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ ...panelStyle, padding: "8px 12px" }}>
        <div className="inventory-toolbar">
          <div className="inventory-toolbar-left">
            {/* Summary stat badges */}
            <div style={{ padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 600 }}>Low Stock</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#92400e", fontWeight: 800 }}>{lowStockCount}</span>
            </div>
            <div style={{ padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 600 }}>Out of Stock</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#991b1b", fontWeight: 800 }}>{outOfStockCount}</span>
            </div>
            <div style={{ padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "9px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 600 }}>Total Stock</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text)", fontWeight: 800 }}>{totalStock}</span>
            </div>

            {isSuperAdmin && (
              <>
                <div style={{ width: 1, height: 18, background: "rgba(1, 105, 111, 0.15)", margin: "0 2px" }} />

                <button
                  onClick={handleExportCSV}
                  onMouseEnter={() => setIsExportHovered(true)}
                  onMouseLeave={() => setIsExportHovered(false)}
                  style={{
                    ...quickLinkStyle,
                    cursor: "pointer",
                    border: isExportHovered ? "1px solid rgba(22, 101, 52, 0.25)" : "1px solid transparent",
                    background: isExportHovered
                      ? "linear-gradient(180deg, rgba(240, 253, 244, 0.95), rgba(220, 252, 231, 0.95))"
                      : "transparent",
                    boxShadow: isExportHovered ? "0 4px 10px rgba(16, 24, 40, 0.03)" : "none",
                    color: "#15803d",
                    transform: isExportHovered ? "translateY(-1px)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  📥 Export CSV
                </button>
              </>
            )}
            {isSuperAdmin && (
              <button
                onClick={handleSyncGoogleSheets}
                disabled={isSyncing}
                onMouseEnter={() => setIsSyncHovered(true)}
                onMouseLeave={() => setIsSyncHovered(false)}
                style={{
                  ...quickLinkStyle,
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  border: isSyncing
                    ? "1px solid rgba(59, 130, 246, 0.25)"
                    : isSyncHovered
                      ? "1px solid rgba(59, 130, 246, 0.25)"
                      : "1px solid transparent",
                  background: isSyncing
                    ? "rgba(219, 234, 254, 0.95)"
                    : isSyncHovered
                      ? "linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.95))"
                      : "transparent",
                  boxShadow: isSyncing || isSyncHovered ? "0 4px 10px rgba(16, 24, 40, 0.03)" : "none",
                  color: "#1d4ed8",
                  transform: isSyncHovered && !isSyncing ? "translateY(-1px)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {isSyncing ? "⏳ Syncing..." : "🔄 Sync Google Sheets"}
              </button>
            )}
          </div>
          <div className="inventory-toolbar-right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search SKU / name / unit" style={inputStyle} />

            {/* Filter by Category */}
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={toolbarButtonStyle}>
              <option value="all">All Categories</option>
              {(categoriesList ?? []).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Filter by Stock Status */}
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as StockFilter)} style={toolbarButtonStyle}>
              <option value="all">All Status</option>
              <option value="healthy">Healthy (75%–100%)</option>
              <option value="moderate">Moderate Stock (50%–74.9%)</option>
              <option value="low">Low Stock (&lt;50%)</option>
              <option value="out">Out of Stock (0%)</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && <div>Loading…</div>}
      {!isLoading && isFetching && <div>Refreshing…</div>}
      {error && (
        <div>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface-2)", overflow: "hidden", borderRadius: 8 }}>
            <div className="table-responsive-container">
              <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: isSuperAdmin ? "12%" : "14%" }} />
                  <col style={{ width: isSuperAdmin ? "23%" : "29%" }} />
                  <col style={{ width: isSuperAdmin ? "11%" : "11%" }} />
                  <col style={{ width: isSuperAdmin ? "6%" : "6%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: isSuperAdmin ? "11%" : "11%" }} />
                  {isSuperAdmin && <col style={{ width: "8%" }} />}
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10.5px", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={thStyle} title="Code_No">Code</th>
                          <th style={thStyle} title="Item_Description">Description</th>
                          <th style={thStyle} title="Category">Category</th>
                          <th style={thStyle} title="Unit">Unit</th>
                          <th style={thStyle} title="Check-in total">In</th>
                          <th style={thStyle} title="Check-out total">Out</th>
                          <th style={thStyle} title="Balance">Bal</th>
                          <th style={thStyle} title="% Balance">% Bal</th>
                          <th style={thStyle} title="Status">Status</th>
                          {isSuperAdmin && <th style={{ ...thStyle, textAlign: "center" }} title="Actions">Actions</th>}
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const rowId = String(row.id || row.sku || index);
                    const isExpanded = expandedRowIds.has(rowId);

                    const quantity = Number(row.quantity ?? 0);
                    const checkOutTotal = Number(row.checkOutTotal ?? 0);
                    const checkInTotal = Number(row.checkInTotal ?? quantity + checkOutTotal);
                    const balance = quantity;
                    const percentBalance = Number(row.balancePercent ?? (checkInTotal > 0 ? (balance / checkInTotal) * 100 : 0));
                    const category = row.category ?? "General";
                    const statusInfo = getStockStatusInfo(percentBalance, balance);

                    const cellStyle: React.CSSProperties = {
                      padding: "6px 8px",
                      fontSize: "10.5px",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    };

                    const codeVal = String(row.sourceCode ?? row.sku ?? "—");
                    const nameVal = String(row.name ?? "—");

                    return (
                      <React.Fragment key={`${row.sku ?? "row"}-${index}`}>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--color-divider)",
                            height: 34,
                            background: isExpanded ? "rgba(1, 105, 111, 0.04)" : "transparent",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td
                            style={{ ...cellStyle, cursor: "pointer", fontWeight: 600, color: "var(--color-text)" }}
                            onClick={() => toggleRowExpanded(rowId)}
                            title="Click to expand/collapse check-in and check-out details"
                          >
                            <span style={{ display: "inline-block", width: 14, color: "var(--color-primary)", fontWeight: 800, fontSize: "10px" }}>
                              {isExpanded ? "▼" : "▶"}
                            </span>
                            {codeVal}
                          </td>
                          <td
                            style={{ ...cellStyle, cursor: "pointer" }}
                            onClick={() => toggleRowExpanded(rowId)}
                            title={nameVal}
                          >
                            {nameVal}
                          </td>
                          <td style={cellStyle} title={category}>{category}</td>
                          <td style={cellStyle} title={String(row.unit ?? "—")}>{String(row.unit ?? "—")}</td>
                          <td style={cellStyle} title={String(checkInTotal)}>{checkInTotal}</td>
                          <td style={cellStyle} title={String(checkOutTotal)}>{checkOutTotal}</td>
                          <td style={cellStyle} title={String(balance)}>{balance}</td>
                          <td style={cellStyle} title={`${Math.round(percentBalance)}%`}>{`${Math.round(percentBalance)}%`}</td>
                          <td style={{ padding: "4px 6px", fontSize: "10.5px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "999px",
                              padding: "2px 6px",
                              fontWeight: 700,
                              fontSize: "9px",
                              whiteSpace: "nowrap",
                              color: statusInfo.color,
                              background: statusInfo.bg,
                              border: `1px solid ${statusInfo.borderColor}`
                            }}>
                              {statusInfo.label}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td style={{ padding: "4px 8px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(row)}
                                  title="Edit item"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--color-primary)",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    padding: 0,
                                    display: "inline-flex",
                                    alignItems: "center"
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(row)}
                                  title="Delete item"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    padding: 0,
                                    display: "inline-flex",
                                    alignItems: "center"
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {isExpanded && (
                          <tr key={`expanded-${rowId}`}>
                            <td colSpan={isSuperAdmin ? 10 : 9} style={{ padding: "8px 12px", background: "rgba(1, 105, 111, 0.02)", borderBottom: "1px solid var(--color-divider)" }}>
                              <ItemMovementDetailsPanel item={row} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  border: "1px solid var(--color-divider)",
                  background: page <= 1 ? "var(--color-surface-2)" : "var(--color-surface)",
                  color: "var(--color-text)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: "var(--fs-xs)",
                  cursor: page <= 1 ? "not-allowed" : "pointer"
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  border: "1px solid var(--color-divider)",
                  background: page >= totalPages ? "var(--color-surface-2)" : "var(--color-surface)",
                  color: "var(--color-text)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: "var(--fs-xs)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && (!data || displayTotal === 0) && (
        <div style={{ padding: 18, border: "1px solid var(--color-divider)", borderRadius: 12, background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          No inventory records found matching current search and filters.
        </div>
      )}

      {isSuperAdmin && editingItem && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            width: "90%",
            maxWidth: 500,
            padding: 24,
            display: "grid",
            gap: 16,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>Edit Stock Item</div>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "var(--fs-md)", fontWeight: 700 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                SKU / Code
                <input
                  value={editForm.sku}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Quantity
                <input
                  type="number"
                  min={0}
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
                Name / Description
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Category
                <input
                  value={editForm.category}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Unit
                <input
                  value={editForm.unit}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Min Threshold
                <input
                  type="number"
                  min={0}
                  value={editForm.minThreshold}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, minThreshold: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Lot Number
                <input
                  value={editForm.lotNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, lotNumber: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
                Expiry Date
                <input
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  fontSize: "var(--fs-xs)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-primary)",
                  color: "#fff",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}