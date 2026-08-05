import React, { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";
import { useAuth } from "../auth/useAuth";
import { hasSubfunctionAccess } from "../auth/permissions";

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const SecondarySidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Collapsed state saved in localStorage so preference persists
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("roms_sec_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("roms_sec_sidebar_collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Find the domain slug from pathname /domains/:slug/...
  const match = location.pathname.match(/^\/domains\/([^/]+)/);
  const domainSlug = match ? match[1] : null;
  const domain = DOMAIN_CATALOG.find((d) => d.slug === domainSlug);

  // Automatically expand Secondary Sidebar whenever the user navigates to a domain from Main Sidebar
  useEffect(() => {
    if (domainSlug) {
      setIsCollapsed(false);
    }
  }, [domainSlug]);

  if (!domain) return null;

  const accessibleSubfunctions = domain.subfunctions.filter((sub) =>
    hasSubfunctionAccess(user?.roles, domain.slug, slugify(sub.name), user?.permissions)
  );

  return (
    <div
      style={{
        width: isCollapsed ? 44 : 220,
        minWidth: isCollapsed ? 44 : 220,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-divider)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease, min-width 0.2s ease",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* ── Row 1: Topbar spacer matching 44.5px SidebarHeader ── */}
      <div
        style={{
          height: "44.5px",
          minHeight: "44.5px",
          borderBottom: "1px solid var(--color-divider)",
          background: "var(--color-surface-offset)",
          flexShrink: 0,
          boxSizing: "border-box",
          width: "calc(100% + 1px)",
          marginRight: "-1px",
          position: "relative",
          zIndex: 100,
        }}
      />

      {/* ── Row 2: Secondary Sidebar Header with Collapse Toggle Button ── */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: "1.05rem", flexShrink: 0 }}>{domain.emoji}</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={domain.name}
              >
                {domain.name}
              </span>
            </div>
          )}

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar (view domain menus)" : "Collapse sidebar (maximize screen space)"}
            aria-label={isCollapsed ? "Expand secondary menu" : "Collapse secondary menu"}
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

      {/* ── Subfunctions Navigation Items ── */}
      <div style={{ padding: isCollapsed ? "4px 4px" : "4px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", overflowX: "hidden", flex: 1, minHeight: 0 }}>
        {accessibleSubfunctions.map((sub, idx) => {
          const subSlug = slugify(sub.name);
          const path = `/domains/${domain.slug}/${subSlug}`;

          return (
            <NavLink
              key={subSlug}
              to={path}
              onClick={() => {
                // Auto-collapse when user selects a subfunction to maximize screen width
                if (!isCollapsed) {
                  setIsCollapsed(true);
                }
              }}
              title={isCollapsed ? `${idx + 1}. ${sub.name}` : undefined}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "7px 0" : "6px 9px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                background: isActive ? "var(--color-primary-highlight)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                transition: "background 0.12s, color 0.12s",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, width: isCollapsed ? "auto" : "100%" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--color-surface-offset)",
                    borderRadius: "var(--radius-sm)",
                    opacity: 0.9,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                {!isCollapsed && (
                  <span style={{ flex: 1, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sub.name}
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

