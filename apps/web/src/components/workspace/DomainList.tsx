import React from "react";
import type { Domain } from "@roms/shared";

interface DomainListProps {
  domains: readonly Domain[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export const DomainList: React.FC<DomainListProps> = ({ domains, activeId, onSelect }) => (
  <div
    style={{
      width: 220,
      minWidth: 220,
      background: "var(--color-surface)",
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
      Research Domains
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
      {domains.map((d) => {
        const isActive = d.id === activeId;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              textAlign: "left",
              padding: "8px 8px",
              borderRadius: "var(--radius-sm)",
              background: isActive ? "var(--color-primary-highlight)" : "transparent",
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
                  width: 2.5,
                  height: "60%",
                  background: "var(--color-primary)",
                  borderRadius: "0 2px 2px 0",
                }}
              />
            )}
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", width: 14, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {d.id}
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                flexShrink: 0,
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive
                  ? "color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))"
                  : "var(--color-surface-offset)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {d.emoji}
            </span>
            <span
              style={{
                fontSize: "var(--fs-sm)",
                lineHeight: 1.3,
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                fontWeight: isActive ? 600 : 400,
                flex: 1,
              }}
            >
              {d.name}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
