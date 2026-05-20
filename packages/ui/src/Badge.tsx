import React from "react";

export interface BadgeProps {
  label: string;
  color?: "primary" | "success" | "warning" | "danger" | "muted";
  style?: React.CSSProperties;
}

const colorMap: Record<string, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary-highlight)",
    color: "var(--color-primary)",
  },
  success: {
    background: "#d4edda",
    color: "#155724",
  },
  warning: {
    background: "#fff3cd",
    color: "#856404",
  },
  danger: {
    background: "#f8d7da",
    color: "#721c24",
  },
  muted: {
    background: "var(--color-surface-offset)",
    color: "var(--color-text-muted)",
  },
};

export const Badge: React.FC<BadgeProps> = ({ label, color = "muted", style }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "20px",
      fontSize: "var(--fs-xs, 11px)",
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      ...colorMap[color],
      ...style,
    }}
  >
    {label}
  </span>
);

export default Badge;
