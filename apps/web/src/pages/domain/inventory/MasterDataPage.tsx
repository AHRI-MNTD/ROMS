import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

interface InventoryMasterDataRow {
  id: string;
  category: string;
  unit: string;
  project?: string | null;
  staff?: string | null;
}

interface InventoryMasterDataResponse {
  data: InventoryMasterDataRow[];
  total: number;
  page: number;
  pageSize: number;
  summary?: {
    rows: number;
    categories: number;
    units: number;
    projects: number;
    staff: number;
  };
}

export default function MasterDataPage() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["inventory-master-data", page, pageSize, search],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/master-data", {
        params: {
          page,
          pageSize,
          search: search.trim() || undefined,
        },
      });
      return resp.data as InventoryMasterDataResponse;
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const summary = data?.summary;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>Master Data</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          Inventory master data loaded from BOMS_Inventory_Master_Data.csv and stored in the database.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Rows (Total)</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{summary?.rows ?? data?.total ?? 0}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Categories</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{summary?.categories ?? 0}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Units</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{summary?.units ?? 0}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Projects</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{summary?.projects ?? 0}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>Staff</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-lg)", fontWeight: 700 }}>{summary?.staff ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search category, unit, project, staff"
          style={{
            minWidth: 260,
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            padding: "8px 10px",
            fontSize: "var(--fs-xs)",
          }}
        />

        <select
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            padding: "8px 10px",
            fontSize: "var(--fs-xs)",
          }}
        >
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </select>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading master data…</div>}
      {!isLoading && isFetching && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>Refreshing…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Could not load master data from API.
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", background: "var(--color-surface-2)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Categories</th>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Units</th>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Projects</th>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase" }}>Staff</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    No master data rows found.
                  </td>
                </tr>
              ) : (
                (data?.data ?? []).map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "9px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.category || "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.unit || "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.project || "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{row.staff || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
          Page {page} of {totalPages} (total rows: {data?.total ?? 0})
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
    </div>
  );
}