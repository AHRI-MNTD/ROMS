import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "overview", label: "Overview", icon: "🏠", right: "Overview" },
  { to: "dashboard", label: "Dashboard", icon: "📊", right: "Dashboard" },
  { to: "current-inventory", label: "Current Inventory", icon: "📦", right: "Current Inventory" },
  { to: "check-in", label: "Check In", icon: "📥", right: "Check In" },
  { to: "check-in-history", label: "Check-In", icon: "➕", right: "Check In History" },
  { to: "check-out", label: "Check Out", icon: "📤", right: "Check Out" },
  { to: "check-out-history", label: "Check-Out", icon: "➖", right: "Check Out History" },
  { to: "requests", label: "Request", icon: "📋", right: "Request/s" },
  { to: "inventory-manager", label: "Manager", icon: "👨‍💼", right: "Inventory Manager" },
  { to: "master-data", label: "Master Data", icon: "🗂️", right: "Master Data" },
  { to: "analytics", label: "Analytics", icon: "📈", right: "Analytics" },
];

export default function InventoryLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active sub-path (e.g., "", "overview", "dashboard", "current-inventory")
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activePath = (lastPart === "stock-management" || !lastPart) ? "overview" : lastPart;

  const isOverview = activePath === "overview";
  const visibleTabs = tabs.filter((tab) => tab.to === "overview" || hasTabAccess(user?.roles, "inventory", tab.to, user?.permissions));

  // Check access to current path
  const isCurrentPathAllowed = isOverview || hasTabAccess(user?.roles, "inventory", activePath, user?.permissions);

  let title = "📦 Lab Inventory & Supply Chain";
  let subtitle = "Manage lab inventory & supply chain records. Showing live data from the ROMS API.";

  if (activePath === "overview") {
    title = "Lab Inventory & Supply Chain";
    subtitle = "Centralized repository for stock management, requisitions, and catalog master data.";
  } else if (activePath === "dashboard") {
    title = "Dashboard";
    subtitle = "Real-time telemetry and management controls";
  } else if (activePath === "current-inventory") {
    title = "Current Inventory";
    subtitle = "Current inventory and reagent catalog";
  } else if (activePath === "check-in") {
    title = "Check-In";
    subtitle = "Log incoming supply shipments and adjust stock levels.";
  } else if (activePath === "check-in-history") {
    title = "Check-In History";
    subtitle = "View check-in reference table and historical stock entries.";
  } else if (activePath === "check-out") {
    title = "Check-Out";
    subtitle = "Record stock item withdrawals and track allocations.";
  } else if (activePath === "check-out-history") {
    title = "Check-Out History";
    subtitle = "View check-out reference table and item disbursement logs.";
  } else if (activePath === "requests") {
    title = "Request";
    subtitle = "Submit and track lab staff material requisitions.";
  } else if (activePath === "inventory-manager") {
    title = "Manager";
    subtitle = "Review pending material requests, approve or adjust quantities.";
  } else if (activePath === "analytics") {
    title = "Analytics";
    subtitle = "Monitor stock usage patterns, replenishment telemetry, and trends.";
  } else if (activePath === "master-data") {
    title = "Master Data";
    subtitle = "Manage standard item catalogs, categories, and system references.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Sticky header with title + nav tabs (Hidden on overview to let overview show its own hero logo header) ── */}
      {!isOverview && (
        <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          {/* Title and subtitle hidden — nav tabs are self-explanatory */}
          {/*
          <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--color-text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </h1>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </p>
          </div>
          */}

          <nav className="domain-nav-container" aria-label="Inventory sections">
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "overview"}
                className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* ── Page content — fills remaining height ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: isOverview ? "12px 24px 16px" : "20px 28px 24px 28px",
          overflowY: isOverview ? "hidden" : "auto",
          display: isOverview ? "flex" : "block",
          flexDirection: isOverview ? "column" : undefined,
        }}
      >
        {isCurrentPathAllowed ? (
          <Outlet />
        ) : (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--color-surface)",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              maxWidth: "600px",
              margin: "40px auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔒</div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px 0" }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
              Your assigned user rights do not grant access to the <strong>{title}</strong> section. Please contact your system administrator or QA Officer if access is required.
            </p>
            <button
              onClick={() => navigate("/domains/inventory/stock-management/overview")}
              style={{
                background: "var(--color-primary, #0d9488)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🏠 Return to Inventory Landing Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}