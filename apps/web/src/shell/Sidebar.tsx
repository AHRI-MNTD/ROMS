import React from "react";
import { NavLink } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";
import { useAuth } from "../auth/useAuth";
import { hasDomainAccess, isApprovedUser } from "../auth/permissions";
import { SidebarHeader } from "./Topbar";

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
        width: 220,
        minWidth: 220,
        height: "100%",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <SidebarHeader />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Main nav */}
        <div style={{ padding: "10px 8px 4px" }}>
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
        {visibleTopNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 9px",
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
            <span style={{ fontSize: "0.8rem", width: 18, textAlign: "center" }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--color-divider)", margin: "8px 0" }} />

      {/* Domain navigation */}
      <div style={{ padding: "4px 8px 10px" }}>
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
        {visibleDomains.map((domain) => (
          <NavLink
            key={domain.slug}
            to={`/domains/${domain.slug}`}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 9px",
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
                fontSize: "0.7rem",
                width: 18,
                height: 18,
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
          </NavLink>
        ))}
        {(user?.roles.includes("ADMIN") || user?.permissions?.includes("admin:all")) && (
          <NavLink
            to="/admin/user-rights"
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 9px",
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
                fontSize: "0.7rem",
                width: 18,
                height: 18,
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
          </NavLink>
        )}
      </div>
      </div>
    </nav>
  );
};
