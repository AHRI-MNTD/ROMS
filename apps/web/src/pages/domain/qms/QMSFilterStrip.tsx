import React, { useState, useRef, useEffect, useMemo } from "react";

export interface QMSFilterStripProps {
  sopType: string;
  onSopTypeChange: (val: string) => void;

  sopStatus: string;
  onSopStatusChange: (val: string) => void;

  availableTitles?: string[];
  allSops?: { title: string }[];
  selectedTitles: string[];
  onSelectedTitlesChange: (titles: string[]) => void;

  searchText: string;
  onSearchTextChange: (val: string) => void;

  onClear?: () => void;
  onClearAll?: () => void;
}

export const QMS_SOP_TYPE_OPTIONS = ["All", "Analysis", "Equipment", "Procedure"];

export const QMS_SOP_STATUS_OPTIONS = [
  "All",
  "Requested",
  "Draft",
  "Under Review",
  "Panel Review",
  "Awaiting Response",
  "Returned",
  "Approved"
];

export default function QMSFilterStrip({
  sopType,
  onSopTypeChange,
  sopStatus,
  onSopStatusChange,
  availableTitles: propsAvailableTitles,
  allSops,
  selectedTitles,
  onSelectedTitlesChange,
  searchText,
  onSearchTextChange,
  onClear,
  onClearAll
}: QMSFilterStripProps) {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableTitles = useMemo(() => {
    if (propsAvailableTitles && propsAvailableTitles.length > 0) return propsAvailableTitles;
    if (allSops && allSops.length > 0) {
      const titles = allSops.map(s => s.title).filter(Boolean);
      return Array.from(new Set(titles)).sort();
    }
    return [];
  }, [propsAvailableTitles, allSops]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredTitles = availableTitles.filter(t =>
    t.toLowerCase().includes(titleSearch.toLowerCase())
  );

  const toggleTitle = (title: string) => {
    if (selectedTitles.includes(title)) {
      onSelectedTitlesChange(selectedTitles.filter(t => t !== title));
    } else {
      onSelectedTitlesChange([...selectedTitles, title]);
    }
  };

  const handleSelectAll = () => {
    onSelectedTitlesChange([...availableTitles]);
  };

  const handleDeselectAll = () => {
    onSelectedTitlesChange([]);
  };

  const handleClearAction = () => {
    if (onClear) onClear();
    if (onClearAll) onClearAll();
  };

  const isFiltered =
    sopType !== "All" ||
    sopStatus !== "All" ||
    selectedTitles.length > 0 ||
    searchText.trim() !== "";

  const selectStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: "var(--radius-sm, 6px)",
    border: "1px solid var(--color-border, #cbd5e1)",
    background: "var(--color-surface-2, #ffffff)",
    color: "var(--color-text, #0f172a)",
    fontSize: "12px",
    fontWeight: 500,
    outline: "none",
    cursor: "pointer",
    minWidth: "150px"
  };

  const labelHeaderStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-text-muted, #64748b)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "6px",
    display: "block"
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "flex-end",
        background: "var(--color-surface, #ffffff)",
        padding: "12px 18px",
        borderRadius: "var(--radius, 8px)",
        border: "1px solid var(--color-border, #cbd5e1)",
        borderTop: "2.5px solid #0d9488",
        flexWrap: "wrap",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* 1. SOP Type */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={labelHeaderStyle}>SOP Type</label>
        <select
          value={sopType}
          onChange={e => onSopTypeChange(e.target.value)}
          style={{
            ...selectStyle,
            borderColor: sopType !== "All" ? "#0d9488" : "var(--color-border, #cbd5e1)",
            background: sopType !== "All" ? "#f0fdfa" : "var(--color-surface-2, #ffffff)"
          }}
        >
          {QMS_SOP_TYPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* 2. SOP Status */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={labelHeaderStyle}>SOP Status</label>
        <select
          value={sopStatus}
          onChange={e => onSopStatusChange(e.target.value)}
          style={{
            ...selectStyle,
            borderColor: sopStatus !== "All" ? "#0d9488" : "var(--color-border, #cbd5e1)",
            background: sopStatus !== "All" ? "#f0fdfa" : "var(--color-surface-2, #ffffff)"
          }}
        >
          {QMS_SOP_STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Filter (Dynamic Title Multi-select with Rectangle Checkboxes) */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }} ref={dropdownRef}>
        <label style={labelHeaderStyle}>Filter</label>
        <button
          type="button"
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          style={{
            ...selectStyle,
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderColor: selectedTitles.length > 0 ? "#0d9488" : "var(--color-border, #cbd5e1)",
            background: selectedTitles.length > 0 ? "#f0fdfa" : "var(--color-surface-2, #ffffff)",
            minWidth: "400px"
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "360px" }}>
            {selectedTitles.length === 0
              ? "All"
              : selectedTitles.length === 1
              ? selectedTitles[0]
              : `${selectedTitles.length} Titles Selected`}
          </span>
          <span style={{ fontSize: "10px", marginLeft: 8 }}>▼</span>
        </button>

        {isFilterDropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "6px",
              width: "420px",
              maxHeight: "320px",
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border, #cbd5e1)",
              borderRadius: "var(--radius-sm, 6px)",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              padding: "14px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)" }}>Title Selection</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: "none", border: "none", color: "#0d9488", fontSize: "11px", cursor: "pointer", fontWeight: 600, padding: 0 }}
                >
                  All
                </button>
                <span style={{ fontSize: "11px", color: "var(--color-border)" }}>|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontWeight: 600, padding: 0 }}
                >
                  Clear
                </button>
              </div>
            </div>

            {availableTitles.length > 5 && (
              <input
                type="text"
                placeholder="Search titles..."
                value={titleSearch}
                onChange={e => setTitleSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "11px",
                  border: "1px solid var(--color-border, #cbd5e1)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            )}

            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              {filteredTitles.length === 0 ? (
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", padding: "4px 0" }}>No titles found</span>
              ) : (
                filteredTitles.map(title => {
                  const isChecked = selectedTitles.includes(title);
                  return (
                    <label
                      key={title}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        background: isChecked ? "#f0fdfa" : "transparent"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTitle(title)}
                        style={{
                          width: "14px",
                          height: "14px",
                          accentColor: "#0d9488",
                          cursor: "pointer"
                        }}
                      />
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "11.5px"
                        }}
                        title={title}
                      >
                        {title}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Search */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: "200px" }}>
        <label style={labelHeaderStyle}>Search</label>
        <div style={{ position: "relative", width: "100%" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px",
              color: "var(--color-text-faint, #94a3b8)"
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchText}
            onChange={e => onSearchTextChange(e.target.value)}
            placeholder="Search code, title, author..."
            style={{
              width: "100%",
              padding: "8px 14px 8px 30px",
              border: "1px solid",
              borderColor: searchText.trim() !== "" ? "#0d9488" : "var(--color-border, #cbd5e1)",
              borderRadius: "var(--radius-sm, 6px)",
              background: searchText.trim() !== "" ? "#f0fdfa" : "var(--color-surface-2, #ffffff)",
              color: "var(--color-text, #0f172a)",
              fontSize: "12px",
              fontWeight: 500,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {/* 5. Clear Button */}
      {isFiltered && (
        <button
          type="button"
          onClick={handleClearAction}
          style={{
            background: "none",
            border: "1px solid var(--color-border, #cbd5e1)",
            borderRadius: "var(--radius-sm, 6px)",
            padding: "8px 14px",
            fontSize: "12px",
            color: "var(--color-text-muted, #64748b)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontWeight: 600,
            alignSelf: "flex-end"
          }}
          title="Clear all filters"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// Helper filter evaluation function with flexible signature
export function matchesSopFilters(
  sop: { title: string; code: string; author: string; status: string; sopType?: string; sopSection?: string },
  sopTypeOrFilterObj: string | { sopType?: string; sopStatus?: string; selectedTitles?: string[]; searchText?: string },
  sopStatusArg?: string,
  selectedTitlesArg?: string[],
  searchTextArg?: string
): boolean {
  let sopType = "All";
  let sopStatus = "All";
  let selectedTitles: string[] = [];
  let searchText = "";

  if (typeof sopTypeOrFilterObj === "object" && sopTypeOrFilterObj !== null) {
    sopType = sopTypeOrFilterObj.sopType || "All";
    sopStatus = sopTypeOrFilterObj.sopStatus || "All";
    selectedTitles = sopTypeOrFilterObj.selectedTitles || [];
    searchText = sopTypeOrFilterObj.searchText || "";
  } else {
    sopType = (sopTypeOrFilterObj as string) || "All";
    sopStatus = sopStatusArg || "All";
    selectedTitles = selectedTitlesArg || [];
    searchText = searchTextArg || "";
  }

  // 1. SOP Type
  if (sopType !== "All") {
    const typeValue = (sop.sopType || sop.sopSection || "").toLowerCase();
    const targetType = sopType.toLowerCase();
    if (!typeValue.includes(targetType)) {
      return false;
    }
  }

  // 2. SOP Status
  if (sopStatus !== "All") {
    const st = sop.status.toUpperCase();
    const filterSt = sopStatus.toUpperCase();

    if (filterSt === "REQUESTED") {
      if (st !== "REQUESTED") return false;
    } else if (filterSt === "DRAFT") {
      if (st !== "DRAFT") return false;
    } else if (filterSt === "UNDER REVIEW") {
      if (st !== "UNDER REVIEW" && st !== "REVIEW" && st !== "SUBMITTED") return false;
    } else if (filterSt === "PANEL REVIEW") {
      if (st !== "PANEL REVIEW") return false;
    } else if (filterSt === "AWAITING RESPONSE") {
      if (st !== "AWAITING AUTHOR RESPONSE" && st !== "AWAITING RESPONSE") return false;
    } else if (filterSt === "RETURNED") {
      if (st !== "RETURNED" && st !== "NEEDS REVISION" && st !== "REJECTED") return false;
    } else if (filterSt === "APPROVED") {
      if (st !== "APPROVED" && st !== "ACTIVE / APPROVED" && st !== "ACTIVE") return false;
    } else {
      if (st !== filterSt) return false;
    }
  }

  // 3. Dynamic Title Selection
  if (selectedTitles.length > 0) {
    if (!selectedTitles.includes(sop.title)) {
      return false;
    }
  }

  // 4. Search Text
  if (searchText.trim() !== "") {
    const term = searchText.toLowerCase();
    const titleMatch = sop.title.toLowerCase().includes(term);
    const codeMatch = sop.code.toLowerCase().includes(term);
    const authorMatch = (sop.author || "").toLowerCase().includes(term);
    if (!titleMatch && !codeMatch && !authorMatch) {
      return false;
    }
  }

  return true;
}

