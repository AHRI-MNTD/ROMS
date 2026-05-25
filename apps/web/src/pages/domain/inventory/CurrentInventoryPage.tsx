import React from "react";
import { Link } from "react-router-dom";
import { useInventoryData } from "./useInventoryData";

type StockFilter = "all" | "low" | "out" | "healthy";

export default function CurrentInventoryPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const { data, isLoading, error, isFetching } = useInventoryData({ page, pageSize });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = (data?.data ?? []).filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    const isOut = quantity <= 0;
    const isLow = quantity > 0 && quantity <= minThreshold;
    const isHealthy = quantity > minThreshold;

    const matchesSearch =
      !normalizedSearch ||
      String(row.sourceCode ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.sku ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.category ?? "").toLowerCase().includes(normalizedSearch) ||
      String(row.unit ?? "").toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

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

  const lowStockCount = (data?.data ?? []).filter((row) => {
    const quantity = Number(row.quantity ?? 0);
    const minThreshold = Number(row.minThreshold ?? 0);
    return quantity > 0 && quantity <= minThreshold;
  }).length;

  const outOfStockCount = (data?.data ?? []).filter((row) => Number(row.quantity ?? 0) <= 0).length;
  const totalStock = (data?.data ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize]);

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

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Items (Page)</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{data?.data.length ?? 0}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Low Stock</div>
          <div style={{ color: "#b91c1c", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{lowStockCount}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Out of Stock</div>
          <div style={{ color: "#991b1b", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{outOfStockCount}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Total Stock (Page)</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{totalStock}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="../check-in" style={quickLinkStyle}>+ Check In</Link>
          <Link to="../check-out" style={quickLinkStyle}>- Check Out</Link>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU / name / unit"
            style={{
              minWidth: 220,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              padding: "8px 10px",
              fontSize: "var(--fs-xs)",
            }}
          />
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              padding: "8px 10px",
              fontSize: "var(--fs-xs)",
            }}
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              padding: "8px 10px",
              fontSize: "var(--fs-xs)",
            }}
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}
      {!isLoading && isFetching && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>Refreshing…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Showing {filteredRows.length} of {data.data.length} item{data.data.length === 1 ? "" : "s"} on page {page} (total records: {data.total})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Code_No</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Item_Description</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Unit</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Check-in total</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Check-out total</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Balance</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>% Balance</th>
                  <th style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const quantity = Number(row.quantity ?? 0);
                  const minThreshold = Number(row.minThreshold ?? 0);
                  const checkOutTotal = Number(row.checkOutTotal ?? 0);
                  const checkInTotal = Number(row.checkInTotal ?? quantity + checkOutTotal);
                  const balance = quantity;
                  const percentBalance = Number(row.balancePercent ?? (minThreshold > 0 ? (balance / minThreshold) * 100 : 0));
                  const isOutOfStock = quantity <= 0;
                  const isLowStock = quantity > 0 && quantity <= minThreshold;
                  const category = row.category ?? "—";

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
                        background: isOutOfStock || isLowStock ? "var(--color-surface)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.sourceCode ?? row.sku ?? "—")}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.name ?? "—")}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{category}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.unit ?? "—")}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{checkInTotal}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{checkOutTotal}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: isOutOfStock || isLowStock ? "#b91c1c" : "var(--color-text-muted)", fontWeight: isOutOfStock || isLowStock ? 700 : 400 }}>{balance}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{`${Math.round(percentBalance)}%`}</td>
                      <td style={{ padding: "8px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", padding: "3px 8px", fontWeight: 600, color: statusColor, background: statusBackground }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  border: "1px solid var(--color-border)",
                  background: page <= 1 ? "var(--color-surface)" : "var(--color-surface-2)",
                  color: "var(--color-text)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 10px",
                  fontSize: "var(--fs-xs)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  border: "1px solid var(--color-border)",
                  background: page >= totalPages ? "var(--color-surface)" : "var(--color-surface-2)",
                  color: "var(--color-text)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 10px",
                  fontSize: "var(--fs-xs)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && (!data || data.total === 0) && (
        <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          No inventory records found.
        </div>
      )}
    </div>
  );
}