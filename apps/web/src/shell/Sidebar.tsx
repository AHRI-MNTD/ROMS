import React from "react";
import { NavLink } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";

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
  return (
    <nav
      style={{
        width: 220,
        minWidth: 220,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
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
        {topNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              color: isActive ? "var(--color-primary)" : "var(--color-text)",
              background: isActive ? "var(--color-primary-highlight)" : "transparent",
              fontWeight: isActive ? 600 : 400,
              textDecoration: "none",
              marginBottom: 2,
              transition: "background 0.12s",
            })}
          >
            <span style={{ fontSize: "0.85rem", width: 20, textAlign: "center" }}>{item.icon}</span>
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
        {DOMAIN_CATALOG.map((domain) => (
          <NavLink
            key={domain.slug}
            to={`/domains/${domain.slug}`}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
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
                width: 20,
                height: 20,
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
      </div>
        {/* User rights / admin control at bottom */}
        <div style={{ marginTop: "auto", padding: "8px", borderTop: "1px solid var(--color-divider)" }}>
          <NavLink
            to="/admin/user-rights"
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              color: isActive ? "var(--color-primary)" : "var(--color-text)",
              background: isActive ? "var(--color-primary-highlight)" : "transparent",
              fontWeight: isActive ? 600 : 400,
              textDecoration: "none",
              marginBottom: 2,
              transition: "background 0.12s",
            })}
          >
            <span
              style={{
                fontSize: "0.75rem",
                width: 20,
                height: 20,
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
        </div>
    </nav>
  );
};
