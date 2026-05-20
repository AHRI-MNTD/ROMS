import React from "react";
import type { SubFunction } from "@roms/shared";

interface SubFunctionListProps {
  subfunctions: readonly SubFunction[];
  activeIdx: number | null;
  onSelect: (idx: number) => void;
}

export const SubFunctionList: React.FC<SubFunctionListProps> = ({
  subfunctions,
  activeIdx,
  onSelect,
}) => (
  <div
    style={{
      width: 220,
      minWidth: 220,
      background: "var(--color-surface-2)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        fontSize: "var(--fs-xs)",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: "var(--color-text-faint)",
        borderBottom: "1px solid var(--color-divider)",
        padding: "8px 12px",
        flexShrink: 0,
      }}
    >
      Sub-functions
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
      {subfunctions.length === 0 ? (
        <div style={{ padding: "20px 12px", fontSize: "var(--fs-sm)", color: "var(--color-text-faint)", fontStyle: "italic" }}>
          Select a domain
        </div>
      ) : (
        subfunctions.map((sf, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                width: "100%",
                textAlign: "left",
                padding: "8px 8px",
                borderRadius: "var(--radius-sm)",
                background: isActive ? "var(--color-primary-soft)" : "transparent",
                marginBottom: 2,
                transition: "background 0.12s",
                position: "relative",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 2,
                    height: "60%",
                    background: "var(--color-primary)",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-faint)",
                  flexShrink: 0,
                  marginTop: 1,
                  width: 16,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  opacity: isActive ? 0.7 : 1,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: "var(--fs-sm)",
                  lineHeight: 1.35,
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  fontWeight: isActive ? 600 : 400,
                  flex: 1,
                }}
              >
                {sf.name}
              </span>
            </button>
          );
        })
      )}
    </div>
  </div>
);
