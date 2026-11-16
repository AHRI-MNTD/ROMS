import React from "react";
import type { ReagentItem } from "./reagentShared";
import { formatStorageCondition, getStorageBadgeMeta } from "./reagentShared";

interface ReagentItemSelectProps {
  label: string;
  items: ReagentItem[];
  value: string;
  onValueChange: (value: string) => void;
  onSelectItem: (item: ReagentItem) => void;
  placeholder?: string;
  noResultsText?: string;
  inputStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  required?: boolean;
}

function normalizeSearch(val: string) {
  return val.trim().toLowerCase();
}

export function ReagentItemSelect({
  label,
  items,
  value,
  onValueChange,
  onSelectItem,
  placeholder = "Search reagent code, description, or assay…",
  noResultsText = "No matching reagents found.",
  inputStyle,
  wrapperStyle,
  dropdownStyle,
  required,
}: ReagentItemSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredItems = React.useMemo(() => {
    const query = normalizeSearch(value);
    if (!query) return items.slice(0, 25);
    return items
      .filter((item) => {
        const code = normalizeSearch(item.reagentCode ?? "");
        const desc = normalizeSearch(item.description ?? "");
        const assay = normalizeSearch(item.assayType ?? "");
        const lot = normalizeSearch(item.lotNumber ?? "");
        const rType = normalizeSearch(item.reagentType ?? "");
        return (
          code.includes(query) ||
          desc.includes(query) ||
          assay.includes(query) ||
          lot.includes(query) ||
          rType.includes(query) ||
          `${code} - ${desc}`.toLowerCase().includes(query)
        );
      })
      .slice(0, 30);
  }, [items, value]);

  React.useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(filteredItems.length - 1, 0)));
  }, [filteredItems.length]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chooseItem = React.useCallback(
    (item: ReagentItem) => {
      onSelectItem(item);
      onValueChange(`${item.reagentCode} - ${item.description}`);
      setIsOpen(false);
    },
    [onSelectItem, onValueChange]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) {
      if (event.key === "Escape") setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = filteredItems[activeIndex];
      if (chosen) {
        chooseItem(chosen);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative", ...wrapperStyle }}>
      <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
        <span>{label}</span>
        {required && <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>}
      </label>

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            padding: "6px 28px 6px 9px",
            fontSize: "12px",
            outline: "none",
            ...inputStyle,
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "10px",
            cursor: "pointer",
            padding: 2,
          }}
        >
          ▼
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            minWidth: 320,
            zIndex: 60,
            marginTop: 4,
            maxHeight: 280,
            overflowY: "auto",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
            ...dropdownStyle,
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center" }}>
              {noResultsText}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === activeIndex;
              const badgeMeta = getStorageBadgeMeta(item.storageCondition);
              const isLow = item.availableConcentration <= item.minThreshold;

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseItem(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    background: isSelected ? "var(--color-surface-2)" : "transparent",
                    borderBottom: "1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.04))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--color-primary)" }}>
                        {item.reagentCode}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.description}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span>🔬 {item.assayType}</span>
                      {item.reagentType && <span>• {item.reagentType}</span>}
                      {item.lotNumber && <span>• Lot: {item.lotNumber}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isLow ? "#ef4444" : "var(--color-text)",
                      }}
                    >
                      {item.availableConcentration} {item.concentrationUnit ?? "units"}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: badgeMeta.badgeBg,
                        color: badgeMeta.badgeColor,
                        border: `1px solid ${badgeMeta.badgeBorder}`,
                      }}
                    >
                      {badgeMeta.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

