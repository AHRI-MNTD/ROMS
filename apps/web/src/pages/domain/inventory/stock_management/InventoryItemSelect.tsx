import React from "react";
import type { InventoryItem } from "./useInventoryData";

interface InventoryItemSelectProps {
  label: string;
  items: InventoryItem[];
  value: string;
  onValueChange: (value: string) => void;
  onSelectItem: (item: InventoryItem) => void;
  placeholder?: string;
  noResultsText?: string;
  inputStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  renderItemMeta?: (item: InventoryItem) => React.ReactNode;
  variant?: "detailed" | "minimal";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function InventoryItemSelect({
  label,
  items,
  value,
  onValueChange,
  onSelectItem,
  placeholder = "Type item name or Id",
  noResultsText = "No matching items found.",
  inputStyle,
  wrapperStyle,
  dropdownStyle,
  renderItemMeta,
  variant = "detailed",
}: InventoryItemSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const filteredItems = React.useMemo(() => {
    const query = normalizeSearch(value);
    const source = query.length === 0 ? items : items.filter((item) => {
      const sku = normalizeSearch(item.sku ?? "");
      const sourceCode = normalizeSearch(item.sourceCode ?? "");
      const name = normalizeSearch(item.name ?? "");
      const category = normalizeSearch(item.category ?? "");
      const unit = normalizeSearch(item.unit ?? "");
      return (
        sku.includes(query) ||
        sourceCode.includes(query) ||
        name.includes(query) ||
        category.includes(query) ||
        unit.includes(query) ||
        `${sku} - ${name}`.includes(query)
      );
    });

    return source.slice(0, 20);
  }, [items, value]);

  React.useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(filteredItems.length - 1, 0)));
  }, [filteredItems.length]);

  const chooseItem = React.useCallback((item: InventoryItem) => {
    onSelectItem(item);
    onValueChange([item.sku, item.name].filter(Boolean).join(" - "));
    setIsOpen(false);
  }, [onSelectItem, onValueChange]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
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

  const mergedInputStyle: React.CSSProperties = {
    minWidth: 220,
    border: "1px solid rgba(1, 105, 111, 0.14)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.74)",
    color: "var(--color-text)",
    padding: "10px 12px",
    paddingRight: 28,
    fontSize: "var(--fs-xs)",
    boxShadow: "0 8px 18px rgba(16, 24, 40, 0.04)",
    width: "100%",
    ...inputStyle,
  };

  const mergedDropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 20,
    marginTop: 6,
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    background: "var(--color-surface-2)",
    boxShadow: "0 10px 20px rgba(16, 24, 40, 0.08)",
    maxHeight: variant === "minimal" ? 360 : 180,
    overflowY: "auto",
    overflowX: "hidden",
    width: variant === "minimal" ? "200%" : "100%",
    minWidth: undefined,
    maxWidth: variant === "minimal" ? "none" : "100%",
    ...dropdownStyle,
  };

  return (
    <label style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", position: "relative", ...wrapperStyle }}>
      {label}
      <div style={{ position: "relative", width: "100%" }}>
        <input
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={mergedInputStyle}
        />
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "var(--color-text-muted)",
            fontSize: 8,
          }}
        >
          ▼
        </div>
      </div>

      {isOpen && (
        <div style={mergedDropdownStyle}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const isActive = index === activeIndex;
              const quantity = Number(item.quantity ?? 0);

              return (
                <button
                  key={item.id ?? `${item.sku}-${item.name}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    chooseItem(item);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: variant === "detailed" ? "1px solid var(--color-divider)" : "none",
                    background: isActive ? "var(--color-accent-soft)" : "transparent",
                    padding: variant === "detailed" ? "6px 10px" : "10px 14px",
                    cursor: "pointer",
                    fontSize: "var(--fs-xs)",
                    color: "var(--color-text)",
                    display: "grid",
                    gap: 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: variant === "minimal" ? 400 : 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.15,
                        minWidth: 0,
                      }}
                    >
                      {item.sku} - {item.name}
                    </span>
                    <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap", lineHeight: 1.15, flexShrink: 0 }}>
                      {quantity} {item.unit ?? "units"}
                    </span>
                  </div>
                  {variant === "detailed" ? (
                    <div style={{ color: "var(--color-text-muted)", display: "flex", gap: 6, flexWrap: "wrap", lineHeight: 1.15 }}>
                      <span>{item.sourceCode ? `Code: ${item.sourceCode}` : "Code: —"}</span>
                      <span>{item.category ?? "General"}</span>
                      {renderItemMeta ? <span>{renderItemMeta(item)}</span> : null}
                    </div>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div style={{ padding: "8px 10px", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>{noResultsText}</div>
          )}
        </div>
      )}
    </label>
  );
}