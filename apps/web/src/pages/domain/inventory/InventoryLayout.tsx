import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

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
  const { user } = useAuth();
  const location = useLocation();
  const activePath = location.pathname.split("/").pop() || "";

  const visibleTabs = tabs.filter((tab) => hasTabAccess(user?.roles, "inventory", tab.to, user?.permissions));

  let title = "📦 Lab Inventory & Supply Chain";
  let subtitle = "Manage lab inventory & supply chain records. Showing live data from the ROMS API.";

  if (activePath === "dashboard" || activePath === "stock-management") {
    title = "Operational Command Dashboard";
    subtitle = "Real-time telemetry and management controls for the research inventory system.";
  } else if (activePath === "current-inventory") {
    title = "LIVE INVENTORY SNAPSHOT";
    subtitle = "Current inventory";
  } else if (activePath === "check-in") {
    title = "Inventory Receipt & Check-In";
    subtitle = "Log incoming supply shipments and adjust stock levels.";
  } else if (activePath === "check-out") {
    title = "Material Disbursement & Check-Out";
    subtitle = "Record stock item withdrawals and track allocations.";
  } else if (activePath === "requests") {
    title = "Requisitions & Requests";
    subtitle = "Review, approve, and track lab staff material requisitions.";
  } else if (activePath === "analytics") {
    title = "Inventory Analytics & Insights";
    subtitle = "Monitor stock usage patterns, replenishment telemetry, and trends.";
  } else if (activePath === "master-data") {
    title = "Inventory Catalog & Master Data";
    subtitle = "Manage standard item catalogs, categories, and system references.";
  }

  return (
    <div style={{ padding: "0 28px 24px 28px", maxWidth: 1400 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: "24px",
          paddingBottom: "14px",
          marginBottom: 18,
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ minWidth: 280 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", marginBottom: 4 }}>
            {title}
          </h1>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
            {subtitle}
          </p>
        </div>

        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }} aria-label="Inventory sections">
          {visibleTabs.map((tab) => (
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