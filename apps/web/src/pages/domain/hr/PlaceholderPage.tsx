import React from "react";

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: 18 }}>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>{description}</div>
    </div>
  );
}