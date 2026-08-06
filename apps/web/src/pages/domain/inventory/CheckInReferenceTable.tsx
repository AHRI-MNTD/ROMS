import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

export function CheckInReferenceTable() {
  const { data: checkInMovementsData, isLoading } = useQuery({
    queryKey: ["inventory-checkin-movements"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/movements", {
        params: { type: "CHECK_IN", limit: 50 },
      });
      return resp.data as { data: any[]; total: number };
    },
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("date-desc");
  const [historyPage, setHistoryPage] = React.useState(1);
  const historyPageSize = 15;

  const historyCategories = React.useMemo(() => {
    if (!checkInMovementsData?.data) return [];
    const cats = new Set<string>();
    checkInMovementsData.data.forEach((row) => {
      const cat = row.stockItem?.category || "General";
      cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [checkInMovementsData]);

  const historyProjects = React.useMemo(() => {
    if (!checkInMovementsData?.data) return [];
    const projs = new Set<string>();
    checkInMovementsData.data.forEach((row) => {
      const proj = row.projectFor;
      if (proj && proj.trim()) {
        projs.add(proj.trim());
      }
    });
    return Array.from(projs).sort();
  }, [checkInMovementsData]);

  const filteredAndSortedMovements = React.useMemo(() => {
    if (!checkInMovementsData?.data) return [];

    let result = checkInMovementsData.data.filter((row) => {
      const sku = (row.stockItem?.sku ?? "").toLowerCase();
      const name = (row.stockItem?.name ?? "").toLowerCase();
      const category = (row.stockItem?.category ?? "General").toLowerCase();
      const project = (row.projectFor ?? "").toLowerCase();
      const remark = (row.remark ?? "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        sku.includes(query) ||
        name.includes(query) ||
        category.includes(query) ||
        project.includes(query) ||
        remark.includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        (row.stockItem?.category ?? "General").toLowerCase() === categoryFilter.toLowerCase();

      const matchesProject =
        projectFilter === "all" ||
        (row.projectFor ?? "").toLowerCase() === projectFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesProject;
    });

    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      }
      if (sortBy === "name-asc") {
        return (a.stockItem?.name ?? "").localeCompare(b.stockItem?.name ?? "");
      }
      if (sortBy === "name-desc") {
        return (b.stockItem?.name ?? "").localeCompare(a.stockItem?.name ?? "");
      }
      if (sortBy === "qty-desc") {
        return Number(b.quantity ?? 0) - Number(a.quantity ?? 0);
      }
      if (sortBy === "qty-asc") {
        return Number(a.quantity ?? 0) - Number(b.quantity ?? 0);
      }
      if (sortBy === "category-asc") {
        return (a.stockItem?.category ?? "General").localeCompare(b.stockItem?.category ?? "General");
      }
      if (sortBy === "category-desc") {
        return (b.stockItem?.category ?? "General").localeCompare(a.stockItem?.category ?? "General");
      }
      if (sortBy === "project-asc") {
        return (a.projectFor ?? "").localeCompare(b.projectFor ?? "");
      }
      if (sortBy === "project-desc") {
        return (b.projectFor ?? "").localeCompare(a.projectFor ?? "");
      }
      return 0;
    });

    return result;
  }, [checkInMovementsData, searchQuery, categoryFilter, projectFilter, sortBy]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredAndSortedMovements.length / historyPageSize));
  const historyPagedRows = filteredAndSortedMovements.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  React.useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, categoryFilter, projectFilter, sortBy]);

  React.useEffect(() => {
    if (historyPage > historyTotalPages && historyTotalPages > 0) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: 12,
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          background: "var(--color-surface-2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
            Check-In History
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                fontSize: "10px",
                height: 28,
                minWidth: "140px",
              }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                height: 28,
                fontSize: "10px",
              }}
            >
              <option value="all">All Categories</option>
              {historyCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                height: 28,
                fontSize: "10px",
              }}
            >
              <option value="all">All Projects</option>
              {historyProjects.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                padding: "4px 8px",
                height: 28,
                fontSize: "10px",
              }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="qty-desc">Quantity (High to Low)</option>
              <option value="qty-asc">Quantity (Low to High)</option>
              <option value="category-asc">Category (A-Z)</option>
              <option value="category-desc">Category (Z-A)</option>
              <option value="project-asc">Project (A-Z)</option>
              <option value="project-desc">Project (Z-A)</option>
            </select>
          </div>
        </div>

        <div
          className="table-responsive-container"
          style={{
            border: "1px solid var(--color-divider)",
            background: "var(--color-surface-2)",
            overflow: "hidden",
            borderRadius: 8,
          }}
        >
          <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                {(() => {
                  const thStyle: React.CSSProperties = {
                    padding: "6px 8px",
                    textAlign: "left",
                    fontSize: "10px",
                    color: "var(--color-text-faint)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  };
                  return (
                    <>
                      <th style={thStyle} title="Code_No">
                        Code
                      </th>
                      <th style={thStyle} title="Barcode">
                        Barcode
                      </th>
                      <th style={thStyle} title="Item_Description">
                        Description
                      </th>
                      <th style={thStyle} title="Mode">
                        Mode
                      </th>
                      <th style={thStyle} title="Quantity">
                        Qty
                      </th>
                      <th style={thStyle} title="Unit">
                        Unit
                      </th>
                      <th style={thStyle} title="Unit_Description">
                        Unit Desc
                      </th>
                      <th style={thStyle} title="Category">
                        Category
                      </th>
                      <th style={thStyle} title="Project">
                        Project
                      </th>
                      <th style={thStyle} title="Date_Received">
                        Received
                      </th>
                      <th style={thStyle} title="Expiry_Date">
                        Expiry
                      </th>
                      <th style={thStyle} title="Remark">
                        Remark
                      </th>
                    </>
                  );
                })()}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ padding: "10px", fontSize: "10px", color: "var(--color-text-muted)", textAlign: "center" }}>
                    Loading check-in history...
                  </td>
                </tr>
              ) : historyPagedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "10px", fontSize: "10px", color: "var(--color-text-muted)" }}>
                    No check-in history records available.
                  </td>
                </tr>
              ) : (
                historyPagedRows.map((row) => {
                  const cellStyle: React.CSSProperties = {
                    padding: "6px 8px",
                    fontSize: "10px",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  };
                  const codeVal = row.stockItem?.sku ?? "—";
                  const descVal = row.stockItem?.name ?? "—";
                  const unitVal = row.stockItem?.unit ?? "units";
                  const unitDescVal = `${row.stockItem?.unit ?? "units"} per pack`;
                  const catVal = row.stockItem?.category ?? "General";
                  const projVal = row.projectFor ?? "—";
                  const recDate = new Date(row.occurredAt).toLocaleDateString();
                  const expDate = row.stockItem?.expiryDate ? new Date(row.stockItem.expiryDate).toLocaleDateString() : "—";
                  const remarkVal = row.remark ?? "—";

                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 32 }}>
                      <td style={cellStyle} title={codeVal}>
                        {codeVal}
                      </td>
                      <td style={cellStyle} title={codeVal}>
                        {codeVal}
                      </td>
                      <td style={cellStyle} title={descVal}>
                        {descVal}
                      </td>
                      <td style={cellStyle}>
                        {row.remark && row.remark.includes("Opening stock") ? "New" : "Existing"}
                      </td>
                      <td style={cellStyle}>{row.quantity}</td>
                      <td style={cellStyle} title={unitVal}>
                        {unitVal}
                      </td>
                      <td style={cellStyle} title={unitDescVal}>
                        {unitDescVal}
                      </td>
                      <td style={cellStyle} title={catVal}>
                        {catVal}
                      </td>
                      <td style={cellStyle} title={projVal}>
                        {projVal}
                      </td>
                      <td style={cellStyle} title={recDate}>
                        {recDate}
                      </td>
                      <td style={cellStyle} title={expDate}>
                        {expDate}
                      </td>
                      <td style={cellStyle} title={remarkVal}>
                        {remarkVal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History pagination — outside panel, bottom of page */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
          Page {historyPage} of {historyTotalPages}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            disabled={historyPage <= 1}
            style={{
              border: "1px solid var(--color-divider)",
              background: historyPage <= 1 ? "var(--color-surface-2)" : "var(--color-surface)",
              color: "var(--color-text)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "var(--fs-xs)",
              cursor: historyPage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
            disabled={historyPage >= historyTotalPages}
            style={{
              border: "1px solid var(--color-divider)",
              background: historyPage >= historyTotalPages ? "var(--color-surface-2)" : "var(--color-surface)",
              color: "var(--color-text)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "var(--fs-xs)",
              cursor: historyPage >= historyTotalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
