import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";

export function ReagentCheckOutReferenceTable() {
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["reagent-checkout-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/movements", {
        params: { type: "CHECK_OUT", limit: 100 },
      });
      return resp.data as { data: any[]; total: number };
    },
    refetchInterval: 15000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [assayFilter, setAssayFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
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

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    rawMovements.forEach((row) => {
      const p = row.projectFor;
      if (p && p.trim()) set.add(p.trim());
    });
    return Array.from(set).sort();
  }, [rawMovements]);

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = rawMovements.filter((row) => {
      const code = (row.reagentItem?.reagentCode ?? "").toLowerCase();
      const desc = (row.reagentItem?.description ?? "").toLowerCase();
      const assay = (row.reagentItem?.assayType ?? "").toLowerCase();
      const project = (row.projectFor ?? "").toLowerCase();
      const recipient = (row.recipient ?? "").toLowerCase();
      const by = (row.requestedBy ?? "").toLowerCase();
      const remark = (row.remark ?? "").toLowerCase();

      const matchesSearch =
        !q ||
        code.includes(q) ||
        desc.includes(q) ||
        assay.includes(q) ||
        project.includes(q) ||
        recipient.includes(q) ||
        by.includes(q) ||
        remark.includes(q);

      const matchesAssay = assayFilter === "all" || assay === assayFilter.toLowerCase();
      const matchesProject = projectFilter === "all" || project === projectFilter.toLowerCase();

      return matchesSearch && matchesAssay && matchesProject;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.occurredAt || a.createdAt).getTime();
      const timeB = new Date(b.occurredAt || b.createdAt).getTime();
      return sortBy === "date-desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [rawMovements, searchQuery, assayFilter, projectFilter, sortBy]);

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
            <span>Reagent Check-Out Reference Table</span>
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
              {filteredMovements.length} check-out log{filteredMovements.length === 1 ? "" : "s"}
            </span>
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
            Audit log of dispensed reagents, concentrations deducted, Number of Vill, and expected returns.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search code, description, recipient, project…"
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
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
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
            <option value="all">All Projects</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
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
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 120 }}>Assay Type</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 120, textAlign: "right" }}>Dispensed Conc.</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 75, textAlign: "right" }}>Vills</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 105, textAlign: "right" }}>Exp. Return</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Project</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Dispensed To</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 140 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  Loading check-out movements…
                </td>
              </tr>
            ) : pagedMovements.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  No reagent check-out movements recorded yet.
                </td>
              </tr>
            ) : (
              pagedMovements.map((row) => {
                const dateStr = new Date(row.occurredAt || row.createdAt).toLocaleString();
                const item = row.reagentItem;

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
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, color: "#ef4444", whiteSpace: "nowrap" }}>
                      -{row.concentration} {item?.concentrationUnit ?? ""}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {row.numberOfVill ?? "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#0284c7", fontWeight: row.expectedReturn ? 700 : 400, whiteSpace: "nowrap" }}>
                      {row.expectedReturn ? `${row.expectedReturn} ${item?.concentrationUnit ?? ""}` : "—"}
                    </td>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                      {row.projectFor || "General"}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {row.recipient || row.requestedBy || "Technician"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>
                      {row.remark || "—"}
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

