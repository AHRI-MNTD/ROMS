import React from "react";
import { CheckOutReferenceTable } from "./CheckOutReferenceTable";

export default function CheckOutHistoryPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "var(--radius)",
          border: "1px solid #d97706",
          background: "linear-gradient(180deg, var(--color-surface-2) 0%, rgba(251, 191, 36, 0.05) 100%)",
          boxShadow: "0 4px 16px rgba(217, 119, 6, 0.07)",
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
              background: "rgba(217, 119, 6, 0.12)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📤
          </div>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              Check-Out History & Disbursement Log
            </h2>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
              Comprehensive audit log of all item disbursements, project allocations, and outgoing stock movements.
            </p>
          </div>
        </div>
      </div>

      {/* Shared Check-Out Reference Table */}
      <CheckOutReferenceTable />
    </div>
  );
}
