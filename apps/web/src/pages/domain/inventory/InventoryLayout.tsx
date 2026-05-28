import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "dashboard", label: "Dashboard" },
  { to: "current-inventory", label: "Current Inventory" },
  { to: "check-in", label: "Check In" },
  { to: "check-out", label: "Check Out" },
  { to: "requests", label: "Request/s" },
  { to: "analytics", label: "Analytics" },
  { to: "master-data", label: "Master Data" },
];

export default function InventoryLayout() {
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ minWidth: 280 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", marginBottom: 4 }}>
            📦 Lab Inventory & Supply Chain
          </h1>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
            Manage lab inventory & supply chain records. Showing live data from the ROMS API.
          </p>
        </div>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }} aria-label="Inventory sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "dashboard"}
              style={({ isActive }) => ({
                border: "1px solid",
                borderColor: isActive ? "var(--color-accent)" : "var(--color-border)",
                background: isActive ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.02em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}