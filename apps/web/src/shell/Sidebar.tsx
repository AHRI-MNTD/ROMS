import React, { useState } from "react";
import { NavLink } from "react-router-dom";
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
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-divider)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease, min-width 0.2s ease",
        position: "relative",
        zIndex: 100,
      }}
    >
      <SidebarHeader isCollapsed={isCollapsed} />

      {/* ── Row 2: Main Sidebar Header with Collapse Toggle Button ── */}
      <div
        style={{
          height: 40,
          minHeight: 40,
          boxSizing: "border-box",
          padding: isCollapsed ? "0 6px" : "0 10px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--color-divider)",
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
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
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
              width: 26,
              height: 26,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-offset)",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-primary-highlight)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-surface-offset)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <svg
              width="14"
              height="14"
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

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {/* Main nav */}
        <div style={{ padding: isCollapsed ? "2px" : "4px 8px" }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
                padding: "4px 8px 8px",
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
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 7,
                padding: isCollapsed ? "4px 0" : "5px 9px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                background: isActive ? "var(--color-primary-highlight)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                marginBottom: 1,
                transition: "background 0.12s",
              })}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Domain navigation */}
        <div style={{ padding: isCollapsed ? "2px" : "4px 8px 10px" }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
                padding: "4px 8px 8px",
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
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 7,
                padding: isCollapsed ? "4px 0" : "5px 9px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                background: isActive ? "var(--color-primary-highlight)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                marginBottom: 1,
                transition: "background 0.12s",
              })}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface-offset)",
                  borderRadius: "var(--radius-sm)",
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
                    lineHeight: 1.3,
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
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : 7,
                padding: isCollapsed ? "4px 0" : "5px 9px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                background: isActive ? "var(--color-primary-highlight)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                marginBottom: 1,
                transition: "background 0.12s",
              })}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface-offset)",
                  borderRadius: "var(--radius-sm)",
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
                    lineHeight: 1.3,
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
