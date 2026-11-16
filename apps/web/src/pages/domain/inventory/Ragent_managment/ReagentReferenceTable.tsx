import React, { useState, useMemo } from "react";
import type { ReagentItem } from "./reagentShared";
import { getStorageBadgeMeta, formatStorageCondition } from "./reagentShared";

export interface ReagentReferenceTableProps {
  items: ReagentItem[];
  isLoading?: boolean;
  onSelectItem?: (item: ReagentItem) => void;
  selectedItemId?: string;
  title?: string;
  description?: string;
  mode?: "picker" | "view";
}

export function ReagentReferenceTable({
  items,
  isLoading,
  onSelectItem,
  selectedItemId,
  title = "Reagent Inventory Reference",
  description = "Live concentration, storage conditions, lot numbers, and locations.",
  mode = "view",
}: ReagentReferenceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssay, setSelectedAssay] = useState("ALL");
  const [selectedStorage, setSelectedStorage] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const assays = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.assayType).filter(Boolean))).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedAssay !== "ALL" && item.assayType !== selectedAssay) return false;
      if (selectedStorage !== "ALL") {
        const cond = formatStorageCondition(item.storageCondition);
        if (cond !== selectedStorage && item.storageCondition !== selectedStorage) return false;
      }
      if (!q) return true;
      return (
        (item.reagentCode ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.assayType ?? "").toLowerCase().includes(q) ||
        (item.reagentType ?? "").toLowerCase().includes(q) ||
        (item.lotNumber ?? "").toLowerCase().includes(q) ||
        (item.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, selectedAssay, selectedStorage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

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
      {/* ── Table Header & Controls ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🧪</span>
            <span>{title}</span>
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
              {filteredItems.length} records
            </span>
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>{description}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Search box */}
          <input
            type="text"
            placeholder="Search code, reagent, assay, lot, location…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 9px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              minWidth: 200,
            }}
          />

          {/* Assay filter */}
          <select
            value={selectedAssay}
            onChange={(e) => {
              setSelectedAssay(e.target.value);
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
            <option value="ALL">All Assays</option>
            {assays.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Storage filter */}
          <select
            value={selectedStorage}
            onChange={(e) => {
              setSelectedStorage(e.target.value);
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
            <option value="ALL">All Storage</option>
            <option value="-80°C">-80°C</option>
            <option value="-20°C">-20°C</option>
            <option value="2-8°C">2-8°C</option>
            <option value="Ambient">Ambient</option>
          </select>
        </div>
      </div>

      {/* ── Scrollable Table Container (Horizontal Scrolling Supported) ── */}
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
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Reagent Code</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)" }}>Reagent Description</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 140 }}>Assay Type</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Reagent Type</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 120, textAlign: "right" }}>Available Conc.</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 90 }}>Storage</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Lot / Batch</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 95 }}>Expiry Date</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 110 }}>Location</th>
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 100, textAlign: "right" }}>Exp. Return</th>
              {mode === "picker" && <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)", width: 80, textAlign: "center" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  Loading reagents…
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                  No reagents match the filter criteria.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const badge = getStorageBadgeMeta(item.storageCondition);
                const isLow = item.availableConcentration <= item.minThreshold;
                const isExpired = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem && onSelectItem(item)}
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.04))",
                      background: isSelected ? "var(--color-primary-soft, #f0fdfa)" : "transparent",
                      cursor: onSelectItem ? "pointer" : "default",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--color-primary)", whiteSpace: "nowrap" }}>
                      {item.reagentCode}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--color-text)" }}>
                      {item.description}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {item.assayType}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {item.reagentType || "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: isLow ? "#ef4444" : "var(--color-text)" }}>
                      {item.availableConcentration} {item.concentrationUnit ?? ""}
                      {isLow && <span style={{ marginLeft: 4, fontSize: "9px", color: "#ef4444" }}>⚠️</span>}
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
                      {item.lotNumber || "—"}
                    </td>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", color: isExpired ? "#ef4444" : "var(--color-text-muted)", fontWeight: isExpired ? 700 : 400 }}>
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                      {isExpired && " (Exp)"}
                    </td>
                    <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {item.location || "—"}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {item.expectedReturnConcentration ? `${item.expectedReturnConcentration} ${item.concentrationUnit ?? ""}` : "0"}
                    </td>
                    {mode === "picker" && (
                      <td style={{ padding: "7px 10px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem && onSelectItem(item);
                          }}
                          style={{
                            padding: "3px 8px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            borderRadius: 4,
                            border: "none",
                            background: isSelected ? "var(--color-primary)" : "var(--color-surface-2)",
                            color: isSelected ? "#fff" : "var(--color-text)",
                            cursor: "pointer",
                          }}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--color-text-muted)", paddingTop: 4 }}>
          <span>
            Page {page} of {totalPages} ({filteredItems.length} items)
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

