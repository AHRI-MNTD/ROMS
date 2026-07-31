import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "overview", label: "Overview", icon: "🏠", right: "Overview" },
  { to: "dashboard", label: "Dashboard", icon: "📊", right: "Dashboard" },
  { to: "current-inventory", label: "Current Inventory", icon: "📦", right: "Current Inventory" },
  { to: "check-in", label: "Check-In", icon: "📥", right: "Check In" },
  { to: "check-out", label: "Check-Out", icon: "📤", right: "Check Out" },
  { to: "requests", label: "Request", icon: "📋", right: "Request/s" },
  { to: "inventory-manager", label: "Manager", icon: "👨‍💼", right: "Inventory Manager" },
  { to: "master-data", label: "Master Data", icon: "🗂️", right: "Master Data" },
];

export default function InventoryLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [restrictedTabName, setRestrictedTabName] = useState<string | null>(null);

  // Determine active sub-path (e.g., "", "overview", "dashboard", "current-inventory")
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activePath = (lastPart === "stock-management" || !lastPart) ? "overview" : lastPart;

  const isOverview = activePath === "overview";

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
  } else if (activePath === "check-out") {
    title = "Check-Out";
    subtitle = "Record stock item withdrawals and track allocations.";
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

  const handleTabClick = (e: React.MouseEvent, tab: typeof tabs[0]) => {
    if (tab.to === "overview") return; // Overview is always allowed

    const isAllowed = hasTabAccess(user?.roles, "inventory", tab.to, user?.permissions);
    if (!isAllowed) {
      e.preventDefault();
      setRestrictedTabName(tab.label);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Sticky header with title + nav tabs (Hidden on overview to let overview show its own hero logo header) ── */}
      {!isOverview && (
        <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--color-text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </h1>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </p>
          </div>

          <nav className="domain-nav-container" aria-label="Inventory sections">
            {tabs.map((tab) => {
              const isAllowed = tab.to === "overview" || hasTabAccess(user?.roles, "inventory", tab.to, user?.permissions);
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === "overview"}
                  onClick={(e) => handleTabClick(e, tab)}
                  className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
                  style={{
                    opacity: isAllowed ? 1 : 0.65,
                    cursor: "pointer"
                  }}
                  title={!isAllowed ? `🔒 Restricted: Access to ${tab.label} is required` : undefined}
                >
                  <span className="nav-icon">{tab.icon}</span>
                  <span className="nav-text">{tab.label}</span>
                  {!isAllowed && <span style={{ fontSize: "10px", marginLeft: 4 }}>🔒</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {/* ── Page content — fills remaining height ── */}
      <div style={{ flex: 1, minHeight: 0, padding: isOverview ? "16px 24px 24px" : "16px 28px 24px 28px", overflowY: "auto" }}>
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

      {/* Restricted Tab Warning Modal when clicking header tab without permission */}
      {restrictedTabName && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16
          }}
          onClick={() => setRestrictedTabName(null)}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "18px",
              width: "100%", maxWidth: "480px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                ⚠️
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#991b1b" }}>Access Restricted</h3>
            </div>
            <div style={{ padding: "20px 24px", fontSize: "13.5px", color: "var(--color-text)", lineHeight: 1.5 }}>
              You do not have permission to access the <strong>{restrictedTabName}</strong> page. Permission rights are managed under <strong>User Rights Control</strong>.
            </div>
            <div style={{ padding: "12px 24px", background: "#f8fafc", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setRestrictedTabName(null)}
                style={{ background: "var(--color-primary, #0d9488)", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}