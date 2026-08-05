import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const OVERVIEW_TAB = { to: "overview", label: "Overview", icon: "🏠", alwaysShow: true };

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: "📊", alwaysShow: false },
  { to: "training-records", label: "Personnel Registration", icon: "📋", alwaysShow: false },
  { to: "approved", label: "Personnel Database", icon: "🗂️", alwaysShow: false },
  { to: "approve-employee", label: "Personnel Verification", icon: "✅", alwaysShow: false },
];


export default function HRLayout() {
  const { user } = useAuth();

  const visibleTabs = tabs.filter((tab) => hasTabAccess(user?.roles, "hr", tab.to, user?.permissions));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, maxWidth: 1400, width: "100%" }}>
      {/* ── Sticky header with nav tabs ── */}
      <div className="domain-layout-header">
        {/* Page header (icon + title + description) — commented out
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          ...
        </div>
        */}

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

      {/* ── Page content — fills remaining height ── */}
      <div style={{ flex: 1, minHeight: 0, padding: "16px 28px 24px 28px", overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}