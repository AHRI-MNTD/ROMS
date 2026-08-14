import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const OVERVIEW_TAB = { to: "overview", label: "Overview", icon: "🏠", alwaysShow: true };

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: "📊", alwaysShow: false },
  { to: "personnel-registration", label: "Personnel Registration", icon: "📋", alwaysShow: false },
  { to: "approved", label: "Personnel Database", icon: "🗂️", alwaysShow: false },
  { to: "approve-employee", label: "Personnel Verification", icon: "✅", alwaysShow: false },
];


export default function HRLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Determine active sub-path (same pattern as InventoryLayout)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activePath = (lastPart === "recruitment-onboarding" || !lastPart) ? "overview" : lastPart;

  const isOverview = activePath === "overview";

  const visibleTabs = tabs.filter((tab) => hasTabAccess(user?.roles, "hr", tab.to, user?.permissions));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, maxWidth: 1400, width: "100%" }}>
      {/* ── Sticky header with nav tabs — Hidden on landing/overview page ── */}
      {!isOverview && (
        <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          {/* Nav tabs */}
          <nav className="domain-nav-container" aria-label="Personnel sections">
            {/* Overview — always visible */}
            <NavLink
              to={OVERVIEW_TAB.to}
              end
              className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">{OVERVIEW_TAB.icon}</span>
              <span className="nav-text">{OVERVIEW_TAB.label}</span>
            </NavLink>

            {/* Module tabs — filtered by permissions */}
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
      )}

      {/* ── Page content — fills remaining height ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: isOverview ? "12px 24px 16px" : "16px 28px 24px 28px",
          overflowY: isOverview ? "hidden" : "auto",
          display: isOverview ? "flex" : "block",
          flexDirection: isOverview ? "column" : undefined,
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}