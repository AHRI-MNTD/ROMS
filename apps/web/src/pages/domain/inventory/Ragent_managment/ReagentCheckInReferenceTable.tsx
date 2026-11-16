import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import { getStorageBadgeMeta, formatStorageCondition } from "./reagentShared";

export function ReagentCheckInReferenceTable() {
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["reagent-checkin-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/movements", {
        params: { type: "CHECK_IN", limit: 100 },
      });
      return resp.data as { data: any[]; total: number };
    },
    refetchInterval: 15000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [assayFilter, setAssayFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const rawMovements = useMemo(() => movementsData?.data ?? [], [movementsData?.data]);

  const uniqueAssays = useMemo(() => {
    const set = new Set<string>();
    rawMovements.forEach((row) => {
      const a = row.reagentItem?.assayType;
      if (a) set.add(a);
    });
    return Array.from(set).sort();
  }, [rawMovements]);

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = rawMovements.filter((row) => {
      const code = (row.reagentItem?.reagentCode ?? "").toLowerCase();
      const desc = (row.reagentItem?.description ?? "").toLowerCase();
      const assay = (row.reagentItem?.assayType ?? "").toLowerCase();
      const lot = (row.lotNumber ?? row.reagentItem?.lotNumber ?? "").toLowerCase();
      const storage = formatStorageCondition(row.reagentItem?.storageCondition);
      const supplier = (row.reagentItem?.receivedFrom ?? "").toLowerCase();
      const by = (row.requestedBy ?? "").toLowerCase();

      const matchesSearch =
        !q ||
        code.includes(q) ||
        desc.includes(q) ||
        assay.includes(q) ||
        lot.includes(q) ||
        supplier.includes(q) ||
        by.includes(q);

      const matchesAssay = assayFilter === "all" || assay === assayFilter.toLowerCase();
      const matchesStorage = storageFilter === "all" || storage === storageFilter;

      return matchesSearch && matchesAssay && matchesStorage;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.occurredAt || a.createdAt).getTime();
      const timeB = new Date(b.occurredAt || b.createdAt).getTime();
      return sortBy === "date-desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [rawMovements, searchQuery, assayFilter, storageFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const pagedMovements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, page, pageSize]);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
            <span></span>
            <span>Reagent Check-In Reference Table</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--color-primary-soft, #ccfbf1)",
                color: "var(--color-primary, #0f766e)",
              }}
            >
              {filteredMovements.length} check-in log{filteredMovements.length === 1 ? "" : "s"}
            </span>
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
            Audit trail of incoming reagent shipments, cold-chain storage assignment, and intake batches.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search code, description, lot, supplier…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 9px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              minWidth: 220,
            }}
          />

          <select
            value={assayFilter}
            onChange={(e) => {
              setAssayFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 8px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
            }}
          >
            <option value="all">All Assays</option>
            {uniqueAssays.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={storageFilter}
            onChange={(e) => {
              setStorageFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 8px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
            }}
          >
            <option value="all">All Storage</option>
            <option value="-80°C">-80°C</option>
            <option value="-20°C">-20°C</option>
            <option value="2-8°C">2-8°C</option>
            <option value="Ambient">Ambient</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "5px 8px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
            }}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Horizontal Scrollable Table */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-surface)",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 1050,
            borderCollapse: "collapse",
            fontSize: "11px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 125 }}>Date & Time</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 100 }}>Reagent Code</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)" }}>Reagent Description</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 130 }}>Assay Type</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 120, textAlign: "right" }}>Intake Conc.</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 95 }}>Storage</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Lot Number</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 95 }}>Expiry Date</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 120 }}>Received From</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Received By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  Loading check-in movements…
                </td>
              </tr>
            ) : pagedMovements.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  No reagent check-in movements recorded yet.
                </td>
              </tr>
            ) : (
              pagedMovements.map((row) => {
                const dateStr = new Date(row.occurredAt || row.createdAt).toLocaleString();
                const item = row.reagentItem;
                const badge = getStorageBadgeMeta(item?.storageCondition);

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.04))",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)", whiteSpace: "nowrap" }}>
                      {item?.reagentCode ?? "—"}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--color-text)" }}>
                      {item?.description ?? "—"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {item?.assayType ?? "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, color: "#10b981", whiteSpace: "nowrap" }}>
                      +{row.concentration} {item?.concentrationUnit ?? ""}
                    </td>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: badge.badgeBg,
                          color: badge.badgeColor,
                          border: `1px solid ${badge.badgeBorder}`,
                        }}
                      >
                        {badge.shortLabel}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {row.lotNumber || item?.lotNumber || "—"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : item?.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {item?.receivedFrom || "—"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {row.requestedBy || "Inventory Admin"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--color-text-muted)", paddingTop: 4 }}>
          <span>
            Page {page} of {totalPages} ({filteredMovements.length} records)
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "3px 9px",
                borderRadius: 4,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "3px 9px",
                borderRadius: 4,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

