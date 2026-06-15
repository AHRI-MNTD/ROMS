import React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useInventoryData } from "./useInventoryData";
import { useAuth } from "../../../auth/useAuth";
import { apiClient } from "../../../api/client";

type StockFilter = "all" | "low" | "out" | "healthy";

export default function CurrentInventoryPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles.some((role) => ["ADMIN", "RESEARCH_ADMIN"].includes(role)) ?? false;

  const [searchTerm, setSearchTerm] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      const resp = await apiClient.post<{ message?: string }>("/domains/inventory/google-sheets/sync", {});
      alert(resp.data.message || "Successfully synchronized inventory with Google Sheets!");
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
    } catch (err: any) {
      alert(err.message || "Failed to synchronize with Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  const { data, isLoading, error, isFetching } = useInventoryData({ page, pageSize });
  const { data: allInventoryData } = useInventoryData({ all: true });

  // Extract unique categories dynamically from all available inventory items
  const categories = React.useMemo(() => {
    const uniqueCats = new Set<string>();
    (allInventoryData?.data ?? []).forEach((row) => {
      const cat = row.category ?? "General";
      if (cat) uniqueCats.add(cat);
    });
    return Array.from(uniqueCats).sort();
  }, [allInventoryData?.data]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Use allInventoryData for filtering when filters are active to search across all data
  const isFilteringActive = stockFilter !== "all" || categoryFilter !== "all" || normalizedSearch.length > 0;
  const sourceRows = isFilteringActive ? (allInventoryData?.data ?? []) : (data?.data ?? []);

  const filteredRows = sourceRows.filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    const isOut = quantity <= 0;
    const isLow = quantity > 0 && quantity <= minThreshold;
    const isHealthy = quantity > minThreshold;
    const rowCategory = row.category ?? "General";

    // Category Filter
    if (categoryFilter !== "all" && rowCategory.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    // Search Filter
    const matchesSearch =
      !normalizedSearch ||
      String(row.sourceCode ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.sku ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(rowCategory).toLowerCase().includes(normalizedSearch) ||
      String(row.unit ?? "").toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    // Stock Filter
    if (stockFilter === "out") {
      return isOut;
    }
    if (stockFilter === "low") {
      return isLow;
    }
    if (stockFilter === "healthy") {
      return isHealthy;
    }
    return true;
  });

  const inventoryRows = allInventoryData?.data ?? [];
  const lowStockCount = inventoryRows.filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    return quantity > 0 && quantity <= minThreshold;
  }).length;

  const outOfStockCount = inventoryRows.filter((row) => Number(row.quantity ?? 0) <= 0).length;
  const totalStock = inventoryRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);

  // When active filtering is used, paginate on the client. Otherwise, use backend pagination count.
  const displayTotal = isFilteringActive ? filteredRows.length : (data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(displayTotal / pageSize));

  // Sliced rows for UI display
  const paginatedRows = React.useMemo(() => {
    if (!isFilteringActive) return filteredRows; // already page-sliced by the backend hook
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, isFilteringActive, page, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, searchTerm, stockFilter, categoryFilter]);

  const handleExportCSV = () => {
    // We export all matches of the current filter criteria across the entire database
    const exportRows = allInventoryData?.data ? allInventoryData.data.filter((row) => {
      const quantity = Number(row.quantity ?? 0);
      const minThreshold = Number(row.minThreshold ?? 0);
      const isOut = quantity <= 0;
      const isLow = quantity > 0 && quantity <= minThreshold;
      const isHealthy = quantity > minThreshold;
      const rowCategory = row.category ?? "General";

      if (categoryFilter !== "all" && rowCategory.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      const matchesSearch =
        !normalizedSearch ||
        String(row.sourceCode ?? "").toLowerCase().includes(normalizedSearch) ||
        String(row.sku ?? "").toLowerCase().includes(normalizedSearch) ||
        String(row.name ?? "").toLowerCase().includes(normalizedSearch) ||
        String(rowCategory).toLowerCase().includes(normalizedSearch) ||
        String(row.unit ?? "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (stockFilter === "out") return isOut;
      if (stockFilter === "low") return isLow;
      if (stockFilter === "healthy") return isHealthy;
      return true;
    }) : [];

    if (exportRows.length === 0) {
      alert("No data matched current filters for export.");
      return;
    }

    const headers = ["Code / SKU", "Description", "Category", "Unit", "Check-In Total", "Check-Out Total", "Current Quantity", "Min Threshold", "Status"];
    const csvRows = [
      headers.join(","),
      ...exportRows.map((row) => {
        const qty = Number(row.quantity ?? 0);
        const minT = Number(row.minThreshold ?? 0);
        const checkOut = Number(row.checkOutTotal ?? 0);
        const checkIn = Number(row.checkInTotal ?? qty + checkOut);
        const status = qty <= 0 ? "Out of Stock" : qty <= minT ? "Low Stock" : "Healthy";

        return [
          `"${String(row.sourceCode ?? row.sku ?? "—").replace(/"/g, '""')}"`,
          `"${String(row.name ?? "—").replace(/"/g, '""')}"`,
          `"${String(row.category ?? "General").replace(/"/g, '""')}"`,
          `"${String(row.unit ?? "—").replace(/"/g, '""')}"`,
          checkIn,
          checkOut,
          qty,
          minT,
          `"${status}"`
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
    background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,246,241,0.92))",
    color: "var(--color-text)",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "var(--fs-xs)",
    textDecoration: "none",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    boxShadow: "0 10px 22px rgba(16, 24, 40, 0.06)",
  };

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.12)",
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,248,245,0.9))",
    boxShadow: "0 18px 45px rgba(16, 24, 40, 0.08)",
    backdropFilter: "blur(10px)",
  };

  const toolbarButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.14)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.72)",
    color: "var(--color-text)",
    padding: "10px 12px",
    fontSize: "var(--fs-xs)",
    boxShadow: "0 8px 18px rgba(16, 24, 40, 0.04)",
  };

  const inputStyle: React.CSSProperties = {
    minWidth: 220,
    border: "1px solid rgba(1, 105, 111, 0.14)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.74)",
    color: "var(--color-text)",
    padding: "10px 12px",
    fontSize: "var(--fs-xs)",
    boxShadow: "0 8px 18px rgba(16, 24, 40, 0.04)",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(1, 105, 111, 0.14)", background: "linear-gradient(180deg, rgba(1, 105, 111, 0.06), rgba(255,255,255,0.95))", boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)", minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Items matching</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-text)", fontWeight: 800 }}>{displayTotal}</span>
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(180, 83, 9, 0.14)", background: "linear-gradient(180deg, rgba(180, 83, 9, 0.06), rgba(255,255,255,0.95))", boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)", minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Low stock</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#92400e", fontWeight: 800 }}>{lowStockCount}</span>
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(153, 27, 27, 0.14)", background: "linear-gradient(180deg, rgba(153, 27, 27, 0.06), rgba(255,255,255,0.95))", boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)", minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Out of stock</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#991b1b", fontWeight: 800 }}>{outOfStockCount}</span>
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(12, 78, 84, 0.14)", background: "linear-gradient(180deg, rgba(12, 78, 84, 0.06), rgba(255,255,255,0.95))", boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)", minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total stock</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-text)", fontWeight: 800 }}>{totalStock}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isAdmin && <Link to="../check-in" style={quickLinkStyle}>+ Check In</Link>}
            <Link to="../check-out" style={quickLinkStyle}>- Check Out</Link>
            <button
              onClick={handleExportCSV}
              style={{
                ...quickLinkStyle,
                cursor: "pointer",
                border: "1px solid rgba(22, 101, 52, 0.25)",
                background: "linear-gradient(180deg, rgba(240, 253, 244, 0.95), rgba(220, 252, 231, 0.95))",
                color: "#15803d",
              }}
            >
              📥 Export CSV
            </button>
            {isAdmin && (
              <button
                onClick={handleSyncGoogleSheets}
                disabled={isSyncing}
                style={{
                  ...quickLinkStyle,
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  background: "linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.95))",
                  color: "#1d4ed8",
                }}
              >
                {isSyncing ? "⏳ Syncing..." : "🔄 Sync Google Sheets"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search SKU / name / unit" style={inputStyle} />

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={toolbarButtonStyle}>
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as StockFilter)} style={toolbarButtonStyle}>
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} style={toolbarButtonStyle}>
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
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
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: 12, background: "var(--color-surface-2)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    {(() => {
                      const thStyle: React.CSSProperties = { padding: "8px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
                      return (
                        <>
                          <th style={thStyle} title="Code_No">Code_No</th>
                          <th style={thStyle} title="Item_Description">Item_Description</th>
                          <th style={thStyle} title="Category">Category</th>
                          <th style={thStyle} title="Unit">Unit</th>
                          <th style={thStyle} title="Check-in total">Check-in total</th>
                          <th style={thStyle} title="Check-out total">Check-out total</th>
                          <th style={thStyle} title="Balance">Balance</th>
                          <th style={thStyle} title="% Balance">% Balance</th>
                          <th style={thStyle} title="Status">Status</th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, index) => {
                    const quantity = Number(row.quantity ?? 0);
                    const minThreshold = Number(row.minThreshold ?? 0);
                    const checkOutTotal = Number(row.checkOutTotal ?? 0);
                    const checkInTotal = Number(row.checkInTotal ?? quantity + checkOutTotal);
                    const balance = quantity;
                    const percentBalance = Number(row.balancePercent ?? (minThreshold > 0 ? (balance / minThreshold) * 100 : 0));
                    const isOutOfStock = quantity <= 0;
                    const isLowStock = quantity > 0 && quantity <= minThreshold;
                    const category = row.category ?? "General";

                    let statusLabel = "Healthy";
                    let statusColor = "#166534";
                    let statusBackground = "#dcfce7";

                    if (isOutOfStock) {
                      statusLabel = "Out of Stock";
                      statusColor = "#991b1b";
                      statusBackground = "#fee2e2";
                    } else if (isLowStock) {
                      statusLabel = "Low Stock";
                      statusColor = "#92400e";
                      statusBackground = "#fef3c7";
                    }

                    const cellStyle: React.CSSProperties = {
                      padding: "8px",
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    };

                    const codeVal = String(row.sourceCode ?? row.sku ?? "—");
                    const nameVal = String(row.name ?? "—");

                    return (
                      <tr
                        key={`${row.sku ?? "row"}-${index}`}
                        style={{ borderBottom: "1px solid var(--color-divider)", height: 40 }}
                      >
                        <td style={cellStyle} title={codeVal}>{codeVal}</td>
                        <td style={cellStyle} title={nameVal}>{nameVal}</td>
                        <td style={cellStyle} title={category}>{category}</td>
                        <td style={cellStyle} title={String(row.unit ?? "—")}>{String(row.unit ?? "—")}</td>
                        <td style={cellStyle}>{checkInTotal}</td>
                        <td style={cellStyle}>{checkOutTotal}</td>
                        <td style={cellStyle}>{balance}</td>
                        <td style={cellStyle}>{`${Math.round(percentBalance)}%`}</td>
                        <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", padding: "5px 10px", fontWeight: 700, color: statusColor, background: statusBackground, border: `1px solid ${statusColor}22` }}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
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
          No inventory records found.
        </div>
      )}
    </div>
  );
}