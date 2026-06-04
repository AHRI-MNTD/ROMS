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

  const heroStatStyle = (accent: string): React.CSSProperties => ({
    padding: "16px 18px",
    borderRadius: 18,
    border: `1px solid ${accent}22`,
    background: `linear-gradient(180deg, ${accent}12, rgba(255,255,255,0.95))`,
    boxShadow: "0 14px 26px rgba(16, 24, 40, 0.06)",
  });

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    background: "rgba(1, 105, 111, 0.08)",
    color: "#0c4e54",
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
      <div
        style={{
          ...panelStyle,
          position: "relative",
          overflow: "hidden",
          padding: 20,
          backgroundImage:
            "radial-gradient(circle at top left, rgba(1, 105, 111, 0.16), transparent 35%), radial-gradient(circle at top right, rgba(239, 172, 40, 0.16), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,248,244,0.94))",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.24), transparent 34%, rgba(255,255,255,0.1) 60%, transparent)" }} />
        <div style={{ position: "relative", display: "grid", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ maxWidth: 700 }}>
              <div style={chipStyle}>Live inventory snapshot</div>
              <h2 style={{ margin: "10px 0 6px", fontFamily: "var(--font-display)", fontSize: "38px", lineHeight: 1.03, color: "var(--color-text)" }}>
                Current inventory
              </h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <div style={heroStatStyle("#01696f")}>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Items matching</div>
              <div style={{ color: "var(--color-text)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, lineHeight: 1 }}>{displayTotal}</div>
            </div>
            <div style={heroStatStyle("#b45309")}>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Low stock</div>
              <div style={{ color: "#92400e", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, lineHeight: 1 }}>{lowStockCount}</div>
            </div>
            <div style={heroStatStyle("#991b1b")}>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Out of stock</div>
              <div style={{ color: "#991b1b", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, lineHeight: 1 }}>{outOfStockCount}</div>
            </div>
            <div style={heroStatStyle("#0c4e54")}>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Total stock</div>
              <div style={{ color: "var(--color-text)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, lineHeight: 1 }}>{totalStock}</div>
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

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}
      {!isLoading && isFetching && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>Refreshing…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 14, fontSize: "var(--fs-sm)", color: "#991b1b", boxShadow: "0 12px 24px rgba(185, 28, 28, 0.08)" }}>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Showing {paginatedRows.length} of {displayTotal} item{displayTotal === 1 ? "" : "s"} on page {page} (total records: {data.total})
          </div>
          <div style={{ ...panelStyle, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, rgba(1, 105, 111, 0.08), rgba(1, 105, 111, 0.03))" }}>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Code_No</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Item_Description</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Category</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Unit</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Check-in total</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Check-out total</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Balance</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>% Balance</th>
                    <th style={{ padding: "12px 10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left" }}>Status</th>
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

                  return (
                    <tr
                      key={`${row.sku ?? "row"}-${index}`}
                      style={{
                        borderBottom: "1px solid var(--color-divider)",
                        background: isOutOfStock || isLowStock ? "linear-gradient(90deg, rgba(185, 28, 28, 0.03), transparent)" : index % 2 === 0 ? "rgba(255,255,255,0.45)" : "rgba(249,248,245,0.5)",
                      }}
                    >
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>{String(row.sourceCode ?? row.sku ?? "—")}</td>
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 600 }}>{String(row.name ?? "—")}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{category}</td>
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.unit ?? "—")}</td>
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{checkInTotal}</td>
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{checkOutTotal}</td>
                      <td style={{ padding: "12px 10px", fontSize: "var(--fs-xs)", color: isOutOfStock || isLowStock ? "#b91c1c" : "var(--color-text)", fontWeight: isOutOfStock || isLowStock ? 800 : 600 }}>{balance}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{`${Math.round(percentBalance)}%`}</td>
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  border: "1px solid rgba(1, 105, 111, 0.14)",
                  background: page <= 1 ? "rgba(255,255,255,0.55)" : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(247,246,242,0.92))",
                  color: "var(--color-text)",
                  borderRadius: 14,
                  padding: "8px 12px",
                  fontSize: "var(--fs-xs)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 18px rgba(16, 24, 40, 0.05)",
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  border: "1px solid rgba(1, 105, 111, 0.14)",
                  background: page >= totalPages ? "rgba(255,255,255,0.55)" : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(247,246,242,0.92))",
                  color: "var(--color-text)",
                  borderRadius: 14,
                  padding: "8px 12px",
                  fontSize: "var(--fs-xs)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 18px rgba(16, 24, 40, 0.05)",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && (!data || displayTotal === 0) && (
        <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          No inventory records found.
        </div>
      )}
    </div>
  );
}