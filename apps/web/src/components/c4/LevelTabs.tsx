import React from "react";

interface LevelTabsProps {
  currentLevel: number;
  onSelect: (level: number) => void;
}

const LEVELS = [
  { level: 1, label: "C1 — System Context", colorClass: "c1" },
  { level: 2, label: "C2 — Containers", colorClass: "c2" },
  { level: 3, label: "C3 — Components", colorClass: "c3" },
];

export const LevelTabs: React.FC<LevelTabsProps> = ({ currentLevel, onSelect }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {LEVELS.map(({ level, label, colorClass }) => (
      <button
        key={level}
        onClick={() => onSelect(level)}
        style={{
          padding: "4px 12px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--fs-xs)",
          fontWeight: 600,
          border: `1px solid var(--c4-${colorClass.replace("c", "")}-border, var(--border))`,
          background:
            currentLevel === level
              ? `var(--c4-${colorClass.replace("c", "")}-bg, var(--surface))`
              : "transparent",
          color:
            currentLevel === level
              ? `var(--c4-${colorClass.replace("c", "")}, var(--text))`
              : "var(--color-text-muted)",
          cursor: "pointer",
          transition: "background 0.14s, color 0.14s",
        }}
      >
        {label}
      </button>
    ))}
  </div>
);
