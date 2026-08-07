import React from "react";
import { CheckInReferenceTable } from "./CheckInReferenceTable";

export default function CheckInHistoryPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px var(--color-accent-soft)",
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
              Check-In History & Reference Log
            </h2>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
              Comprehensive audit trail of all incoming laboratory stock entries and reagent check-in movements.
            </p>
          </div>
        </div>
      </div>

      {/* Shared Check-In Reference Table */}
      <CheckInReferenceTable />
    </div>
  );
}
