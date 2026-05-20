import React from "react";

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  style,
  className,
  onClick,
}) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background: "var(--color-surface-2, #fff)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius, 8px)",
      padding: "16px",
      cursor: onClick ? "pointer" : undefined,
      transition: onClick ? "box-shadow 0.14s" : undefined,
      ...style,
    }}
  >
    {(title || subtitle) && (
      <div style={{ marginBottom: 12 }}>
        {title && (
          <div
            style={{
              fontSize: "var(--fs-md, 14px)",
              fontWeight: 600,
              color: "var(--color-text)",
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              fontSize: "var(--fs-xs, 11px)",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    )}
    {children}
  </div>
);

export default Card;
