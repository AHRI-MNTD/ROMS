import React from "react";

interface ViewOnlyBannerProps {
  pageName: string;
  description?: string;
}

export function ViewOnlyBanner({ pageName, description }: ViewOnlyBannerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--radius, 10px)",
        background: "rgba(1, 105, 111, 0.08)",
        border: "1px solid rgba(1, 105, 111, 0.28)",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(1, 105, 111, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>👁️</span>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
            View-Only Access Active · {pageName}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>
            {description || "You have view-only permissions to inspect and study the workflow. Form submission and record mutation are disabled."}
          </div>
        </div>
      </div>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: "var(--color-primary)",
          color: "#ffffff",
          padding: "3px 10px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        Read-Only Mode
      </span>
    </div>
  );
}
