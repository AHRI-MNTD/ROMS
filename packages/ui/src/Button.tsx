import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
    fontWeight: 600,
    borderRadius: "var(--radius-sm, 6px)",
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "background 0.14s, color 0.14s, border-color 0.14s",
  },
};

const variantClass: Record<string, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "#fff",
    borderColor: "var(--color-primary)",
  },
  secondary: {
    background: "var(--color-surface)",
    color: "var(--color-text)",
    borderColor: "var(--color-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-muted)",
    borderColor: "transparent",
  },
  danger: {
    background: "var(--color-danger, #c0392b)",
    color: "#fff",
    borderColor: "transparent",
  },
};

const sizeStyle: Record<string, React.CSSProperties> = {
  sm: { padding: "3px 10px", fontSize: "var(--fs-xs, 11px)" },
  md: { padding: "6px 14px", fontSize: "var(--fs-sm, 13px)" },
  lg: { padding: "9px 20px", fontSize: "var(--fs-base, 14px)" },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  loading = false,
  children,
  disabled,
  style,
  ...rest
}) => {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...styles.base,
        ...variantClass[variant],
        ...sizeStyle[size],
        opacity: disabled || loading ? 0.55 : 1,
        ...style,
      }}
      {...rest}
    >
      {loading && <span style={{ fontSize: "0.75em" }}>⟳</span>}
      {children}
    </button>
  );
};

export default Button;
