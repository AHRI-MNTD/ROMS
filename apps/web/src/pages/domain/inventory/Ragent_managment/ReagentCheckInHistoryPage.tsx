import React from "react";
import { ReagentCheckInReferenceTable } from "./ReagentCheckInReferenceTable";

export default function ReagentCheckInHistoryPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header Banner */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📥
          </div>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              Reagent Check-In History &amp; Reference Log
            </h2>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
              Comprehensive audit trail of all incoming reagent shipments, cold-chain receipt conditions (-80, -20, 2-8, Ambient), and batch receiving records.
            </p>
          </div>
        </div>
      </div>

      {/* Shared Reagent Check-In Reference Table */}
      <ReagentCheckInReferenceTable />
    </div>
  );
}

