import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: "📊" },
  { to: "current-inventory", label: "Current Inventory", icon: "📦" },
  { to: "check-in", label: "Check In", icon: "📥" },
  { to: "check-out", label: "Check Out", icon: "📤" },
  { to: "requests", label: "Request/s", icon: "📋" },
  //{ to: "analytics", label: "Analytics", icon: "📈" },
  { to: "master-data", label: "Master Data", icon: "🗂️" },
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
    subtitle = "Real-time telemetry and management controls";
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Sticky header with title + nav tabs ── */}
      <div className="domain-layout-header">
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--color-text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </p>
        </div>

        <nav className="domain-nav-container" aria-label="Inventory sections">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "dashboard"}
              className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-text">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Page content — fills remaining height ── */}
      <div style={{ flex: 1, minHeight: 0, padding: "16px 28px 24px 28px", overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}