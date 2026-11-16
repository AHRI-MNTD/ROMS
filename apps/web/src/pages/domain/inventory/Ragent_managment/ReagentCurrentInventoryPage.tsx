import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import { useReagentData } from "./useReagentData";
import {
  ReagentItem,
  formatStorageCondition,
  getStorageBadgeMeta,
  STORAGE_CONDITIONS,
  ASSAY_TYPES,
} from "./reagentShared";

export default function ReagentCurrentInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [assayFilter, setAssayFilter] = useState("ALL");
  const [storageFilter, setStorageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedItemModal, setSelectedItemModal] = useState<ReagentItem | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Load reagents
  const { data: reagentsData, isLoading } = useReagentData({
    page: 1,
    pageSize: 1000,
  });

  const allItems = useMemo(() => reagentsData?.data ?? [], [reagentsData?.data]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = allItems.length;
    let healthy = 0;
    let low = 0;
    let expired = 0;
    let totalConcentration = 0;
    let totalExpectedReturn = 0;
    const now = new Date();

    for (const item of allItems) {
      totalConcentration += item.availableConcentration ?? 0;
      totalExpectedReturn += item.expectedReturnConcentration ?? 0;
      const isExp = item.expiryDate ? new Date(item.expiryDate) < now : false;
      if (isExp) {
        expired++;
      } else if (item.availableConcentration <= item.minThreshold) {
        low++;
      } else {
        healthy++;
      }
    }
    return { total, healthy, low, expired, totalConcentration, totalExpectedReturn };
  }, [allItems]);

  // Filtering
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = new Date();

    return allItems.filter((item) => {
      if (assayFilter !== "ALL" && item.assayType !== assayFilter) return false;
      if (storageFilter !== "ALL") {
        const cond = formatStorageCondition(item.storageCondition);
        if (cond !== storageFilter && item.storageCondition !== storageFilter) return false;
      }
      if (statusFilter !== "ALL") {
        const isExp = item.expiryDate ? new Date(item.expiryDate) < now : false;
        const isLow = item.availableConcentration <= item.minThreshold;
        if (statusFilter === "EXPIRED" && !isExp) return false;
        if (statusFilter === "LOW" && (!isLow || isExp)) return false;
        if (statusFilter === "HEALTHY" && (isLow || isExp)) return false;
      }
      if (!q) return true;
      return (
        item.reagentCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.assayType.toLowerCase().includes(q) ||
        (item.reagentType ?? "").toLowerCase().includes(q) ||
        (item.lotNumber ?? "").toLowerCase().includes(q) ||
        (item.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [allItems, assayFilter, storageFilter, statusFilter, searchTerm]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = [
      "Reagent Code",
      "Description",
      "Assay Type",
      "Reagent Type",
      "Available Concentration",
      "Initial Concentration",
      "Issued Concentration",
      "Expected Return Concentration",
      "Unit",
      "Storage Condition",
      "Lot Number",
      "Expiry Date",
      "Location",
      "Status",
    ];

    const rows = filteredItems.map((i) => {
      const isExp = i.expiryDate ? new Date(i.expiryDate) < new Date() : false;
      const isLow = i.availableConcentration <= i.minThreshold;
      const status = isExp ? "Expired" : isLow ? "Low Stock" : "Healthy";
      return [
        `"${i.reagentCode}"`,
        `"${i.description.replace(/"/g, '""')}"`,
        `"${i.assayType}"`,
        `"${i.reagentType ?? ""}"`,
        i.availableConcentration,
        i.initialConcentration,
        i.issuedConcentration,
        i.expectedReturnConcentration,
        `"${i.concentrationUnit ?? ""}"`,
        `"${formatStorageCondition(i.storageCondition)}"`,
        `"${i.lotNumber ?? ""}"`,
        `"${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : ""}"`,
        `"${i.location ?? ""}"`,
        `"${status}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reagent_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const assayList = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.assayType).filter(Boolean))).sort(),
    [allItems]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Metric Cards (Mirroring CurrentInventoryPage) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {/* Total Reagents Catalog */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid rgba(14, 165, 233, 0.22)",
            background: isDarkMode
              ? "linear-gradient(145deg, #0e2238 0%, #071524 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(14, 165, 233, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Total Reagents Catalog
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>
            {metrics.total.toLocaleString()}
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--color-primary)", fontWeight: 600 }}>Across 23 assay protocols</div>
        </div>

        {/* Total Concentration Stock */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(13, 148, 136, 0.22)",
            background: isDarkMode
              ? "linear-gradient(145deg, #0d2c29 0%, #061c1a 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(13, 148, 136, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Total Concentration Stock
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-primary)", marginTop: 2 }}>
            {metrics.totalConcentration.toLocaleString()}
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>Available concentration units</div>
        </div>

        {/* Healthy Status */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #064e3b 0%, #032e23 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(16, 185, 129, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>
            Healthy Status
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#059669", marginTop: 2 }}>
            {metrics.healthy}
          </div>
          <div style={{ fontSize: "10.5px", color: "#10b981" }}>Adequate concentration</div>
        </div>

        {/* Low Concentration / Expired */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(239, 68, 68, 0.25)",
            background: isDarkMode
              ? "linear-gradient(145deg, #450a0a 0%, #2b0606 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(239, 68, 68, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>
            Low Concentration / Expired
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
            {metrics.low + metrics.expired}
          </div>
          <div style={{ fontSize: "10.5px", color: "#b91c1c" }}>
            {metrics.low} low • {metrics.expired} expired
          </div>
        </div>

        {/* Expected Returns */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: isDarkMode ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(99, 102, 241, 0.22)",
            background: isDarkMode
              ? "linear-gradient(145deg, #1d193d 0%, #0f0c22 100%)"
              : "linear-gradient(145deg, #ffffff 40%, rgba(99, 102, 241, 0.10) 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
            Expected Returns
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#4f46e5", marginTop: 2 }}>
            {metrics.totalExpectedReturn.toLocaleString()}
          </div>
          <div style={{ fontSize: "10.5px", color: "#6366f1" }}>Anticipated residual returns</div>
        </div>
      </div>

      {/* ── Table Controls & Filters Card ── */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>
              🧪 Current Reagent Inventory (Concentration-Based)
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--color-text-muted)" }}>
              Detailed visibility into reagent codes, descriptions, available vs issued concentrations, storage temperatures, and expected returns.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                cursor: "pointer",
              }}
            >
              📥 Export CSV ({filteredItems.length})
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search code, reagent description, lot, or location…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 10px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              minWidth: 260,
              flex: 1,
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
            <option value="ALL">All 23 Assays</option>
            {assayList.map((a) => (
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
            <option value="ALL">All Storage Conditions</option>
            <option value="-80°C">-80°C Ultra-Low</option>
            <option value="-20°C">-20°C Freezer</option>
            <option value="2-8°C">2-8°C Refrigerator</option>
            <option value="Ambient">Ambient Room Temp</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
            <option value="ALL">All Health States</option>
            <option value="HEALTHY">Healthy Stock</option>
            <option value="LOW">Low Concentration Alert</option>
            <option value="EXPIRED">Expired Lots</option>
          </select>
        </div>
      </div>

      {/* ── Main Inventory Table (Horizontal Scrollable) ── */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", fontSize: "11.5px" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 110 }}>Code</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Reagent Description</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 130 }}>Assay Type</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 110 }}>Reagent Type</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: 130 }}>Available Conc.</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: 110 }}>Issued Conc.</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: 110 }}>Exp. Return</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 95 }}>Storage</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 110 }}>Lot / Batch</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 95 }}>Expiry Date</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 110 }}>Location</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: 80 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                    Loading laboratory reagents catalog…
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                    No reagents found matching current filters.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const badgeMeta = getStorageBadgeMeta(item.storageCondition);
                  const isExp = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;
                  const isLow = item.availableConcentration <= item.minThreshold;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemModal(item)}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-primary)", whiteSpace: "nowrap" }}>
                        {item.reagentCode}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--color-text)" }}>
                        {item.description}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {item.assayType}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {item.reagentType || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: isLow ? "#ef4444" : "var(--color-text)" }}>
                        {item.availableConcentration} {item.concentrationUnit ?? ""}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                        {item.issuedConcentration ?? 0} {item.concentrationUnit ?? ""}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#0284c7", fontWeight: item.expectedReturnConcentration > 0 ? 700 : 400 }}>
                        {item.expectedReturnConcentration ? `${item.expectedReturnConcentration} ${item.concentrationUnit ?? ""}` : "0"}
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: badgeMeta.badgeBg,
                            color: badgeMeta.badgeColor,
                            border: `1px solid ${badgeMeta.badgeBorder}`,
                          }}
                        >
                          {badgeMeta.shortLabel}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {item.lotNumber || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: isExp ? "#ef4444" : "var(--color-text-muted)", fontWeight: isExp ? 700 : 400 }}>
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {item.location || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: isExp ? "#fee2e2" : isLow ? "#fef3c7" : "#dcfce7",
                            color: isExp ? "#b91c1c" : isLow ? "#b45309" : "#15803d",
                          }}
                        >
                          {isExp ? "Expired" : isLow ? "Low Stock" : "Healthy"}
                        </span>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--color-text-muted)", paddingTop: 10 }}>
            <span>
              Showing Page {page} of {totalPages} ({filteredItems.length} reagents)
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 10px",
                  borderRadius: 5,
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
                  padding: "4px 10px",
                  borderRadius: 5,
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

      {/* ── Reagent Item Detail Modal ── */}
      {selectedItemModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setSelectedItemModal(null)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 14,
              border: "1px solid var(--color-border)",
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-divider)", paddingBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-primary)" }}>
                    {selectedItemModal.reagentCode}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: getStorageBadgeMeta(selectedItemModal.storageCondition).badgeBg,
                      color: getStorageBadgeMeta(selectedItemModal.storageCondition).badgeColor,
                    }}
                  >
                    {formatStorageCondition(selectedItemModal.storageCondition)}
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: 700, color: "var(--color-text)" }}>
                  {selectedItemModal.description}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemModal(null)}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "12px" }}>
              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Assay Protocol</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedItemModal.assayType}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Reagent Type</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedItemModal.reagentType || "Standard"}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Available Concentration</div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--color-primary)", marginTop: 2 }}>
                  {selectedItemModal.availableConcentration} {selectedItemModal.concentrationUnit ?? ""}
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Initial Received Concentration</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>
                  {selectedItemModal.initialConcentration} {selectedItemModal.concentrationUnit ?? ""}
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Issued Concentration</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>
                  {selectedItemModal.issuedConcentration} {selectedItemModal.concentrationUnit ?? ""}
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Expected Return Concentration</div>
                <div style={{ fontWeight: 700, color: "#0284c7", marginTop: 2 }}>
                  {selectedItemModal.expectedReturnConcentration} {selectedItemModal.concentrationUnit ?? ""}
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Lot / Batch Number</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedItemModal.lotNumber || "—"}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Expiry Date</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>
                  {selectedItemModal.expiryDate ? new Date(selectedItemModal.expiryDate).toLocaleDateString() : "—"}
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Location / Freezer Bin</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedItemModal.location || "—"}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "var(--color-surface-2)" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Received From / Supplier</div>
                <div style={{ fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{selectedItemModal.receivedFrom || "—"}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--color-divider)", paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedItemModal(null)}
                style={{
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
