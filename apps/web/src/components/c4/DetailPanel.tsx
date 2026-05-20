import React from "react";
import type { C4Container, C4Component } from "@roms/shared";

type PanelItem = Partial<C4Container> & Partial<C4Component>;

interface DetailPanelProps {
  item: PanelItem | null;
  onClose: () => void;
  onDrill?: (containerId: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ item, onClose, onDrill }) => {
  if (!item) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.15)",
          zIndex: 200,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          background: "var(--color-surface-2)",
          borderLeft: "1px solid var(--color-border)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--color-divider)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              {item.kind}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", color: "var(--color-text)", lineHeight: 1.2 }}>
              {item.name}
            </div>
            {item.tech && (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontStyle: "italic", marginTop: 2 }}>
                {item.tech}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {item.desc && (
            <div>
              <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: 6 }}>
                Description
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          )}

          {"responsibilities" in item && item.responsibilities && item.responsibilities.length > 0 && (
            <div>
              <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: 6 }}>
                Responsibilities
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {(item.responsibilities as string[]).map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>›</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {"drillTo" in item && item.drillTo === 3 && item.id && onDrill && (
            <button
              onClick={() => { onDrill(item.id!); onClose(); }}
              style={{
                fontSize: "var(--fs-xs)",
                color: "var(--color-primary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              ▶ Drill into Components (C3)
            </button>
          )}
        </div>
      </div>
    </>
  );
};
