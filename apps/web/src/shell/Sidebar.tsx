import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";
import { useAuth } from "../auth/useAuth";
import { hasDomainAccess, isApprovedUser } from "../auth/permissions";
import { SidebarHeader, ProfileSection } from "./Topbar";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const topNav: NavItem[] = [
  { label: "Dashboard", path: "/", icon: "🏠" },
  { label: "Architecture", path: "/architecture", icon: "🏗️" },
  { label: "Operations", path: "/operations", icon: "📋" },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Check if a domain subfunction is currently selected (SecondarySidebar is active)
  const isDomainActive = Boolean(location.pathname.match(/^\/domains\/([^/]+)/));

  // Main sidebar defaults to opened (expanded) when user gets to the system
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const visibleTopNav = topNav.filter((item) => {
    if (item.path === "/") {
      return isApprovedUser(user?.roles, user?.permissions);
    }
    if (item.path === "/architecture" || item.path === "/operations") {
      return user?.roles.some((role) => ["ADMIN", "RESEARCH_ADMIN"].includes(role)) || user?.permissions.includes("admin:all");
    }
    return true;
  });

  const visibleDomains = DOMAIN_CATALOG.filter((domain) =>
    hasDomainAccess(user?.roles, domain.slug, user?.permissions)
  );

  return (
    <nav
      style={{
        width: isCollapsed ? 48 : 220,
        minWidth: isCollapsed ? 48 : 220,
        height: "100%",
        background: isDomainActive
          ? "linear-gradient(270deg, rgba(1, 105, 111, 0.16), rgba(1, 105, 111, 0.31))"
          : "linear-gradient(270deg, rgba(1, 105, 111, 0), rgba(1, 105, 111, 0.31))",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease, min-width 0.2s ease, background 0.3s ease",
        position: "relative",
        zIndex: 100,
      }}
    >
      <SidebarHeader isCollapsed={isCollapsed} />

      {/* ── Row 2: Main Sidebar Header with Collapse Toggle Button ── */}
      <div
        style={{
          height: 34,
          minHeight: 34,
          boxSizing: "border-box",
          padding: isCollapsed ? "0 4px" : "0 8px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgb(1, 105, 111)",
          borderRight: "1px solid rgb(1, 105, 111)",
          background: "rgba(1, 105, 111, 0.05)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            width: "100%",
            gap: 6,
          }}
        >
          {!isCollapsed && (
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgb(1, 105, 111)",
              }}
            >
              Navigation
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar (view menu list)" : "Collapse sidebar (maximize screen space)"}
            aria-label={isCollapsed ? "Expand main menu" : "Collapse main menu"}
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(1, 105, 111, 0.3)",
              background: "rgba(1, 105, 111, 0.08)",
              color: "rgb(1, 105, 111)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(1, 105, 111, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(1, 105, 111, 0.08)";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", borderRight: "1px solid rgb(1, 105, 111)" }}>
        {/* Main nav */}
        <div style={{ padding: isCollapsed ? "3px" : "3px 6px" }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "rgb(1, 105, 111)",
                padding: "3px 6px 2px",
              }}
            >
              Main
            </div>
          )}
          {visibleTopNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              title={isCollapsed ? item.label : undefined}
              onClick={() => {
                if (!isCollapsed) {
                  setIsCollapsed(true);
                }
              }}
              className={({ isActive }) => `sidebar-nav-link${isCollapsed ? " collapsed" : ""}${isActive ? " active" : ""}`}
              style={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 8,
                padding: isCollapsed ? "4px 0" : "4.5px 8px",
                textDecoration: "none",
              }}
            >
              <span
                className="sidebar-nav-icon"
                style={{
                  fontSize: "0.82rem",
                  width: 21,
                  height: 21,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "5px",
                  background: "rgba(1, 105, 111, 0.06)",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Domain navigation */}
        <div style={{ padding: isCollapsed ? "3px" : "3px 6px 4px" }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "rgb(1, 105, 111)",
                padding: "4px 6px 2px",
              }}
            >
              Domains
            </div>
          )}
          {visibleDomains.map((domain) => (
            <NavLink
              key={domain.slug}
              to={`/domains/${domain.slug}`}
              title={isCollapsed ? domain.name : undefined}
              onClick={() => {
                if (!isCollapsed) {
                  setIsCollapsed(true);
                }
              }}
              className={({ isActive }) => `sidebar-nav-link${isCollapsed ? " collapsed" : ""}${isActive ? " active" : ""}`}
              style={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 8,
                padding: isCollapsed ? "4px 0" : "4.5px 8px",
                textDecoration: "none",
              }}
            >
              <span
                className="sidebar-nav-icon"
                style={{
                  fontSize: "0.78rem",
                  width: 21,
                  height: 21,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(1, 105, 111, 0.06)",
                  borderRadius: "5px",
                  flexShrink: 0,
                }}
              >
                {domain.emoji}
              </span>
              {!isCollapsed && (
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.25,
                  }}
                >
                  {domain.name}
                </span>
              )}
            </NavLink>
          ))}
          {(user?.roles.includes("ADMIN") || user?.permissions?.includes("admin:all")) && (
            <NavLink
              to="/admin/user-rights"
              title={isCollapsed ? "User Right Control" : undefined}
              onClick={() => {
                if (!isCollapsed) {
                  setIsCollapsed(true);
                }
              }}
              className={({ isActive }) => `sidebar-nav-link${isCollapsed ? " collapsed" : ""}${isActive ? " active" : ""}`}
              style={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 8,
                padding: isCollapsed ? "4px 0" : "4.5px 8px",
                textDecoration: "none",
              }}
            >
              <span
                className="sidebar-nav-icon"
                style={{
                  fontSize: "0.78rem",
                  width: 21,
                  height: 21,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(1, 105, 111, 0.06)",
                  borderRadius: "5px",
                  flexShrink: 0,
                }}
              >
                🔐
              </span>
              {!isCollapsed && (
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.25,
                  }}
                >
                  User Right Control
                </span>
              )}
            </NavLink>
          )}
        </div>
      </div>

      {/* Profile section pinned to sidebar bottom */}
      <ProfileSection isCollapsed={isCollapsed} />
    </nav>
  );
};
