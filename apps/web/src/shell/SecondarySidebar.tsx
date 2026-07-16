import React from "react";
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

  // Find the domain slug from pathname /domains/:slug/...
  const match = location.pathname.match(/^\/domains\/([^/]+)/);
  const domainSlug = match ? match[1] : null;
  const domain = DOMAIN_CATALOG.find((d) => d.slug === domainSlug);

  if (!domain) return null;

  return (
    <div
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
      <div style={{ padding: "16px 12px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: "1rem" }}>{domain.emoji}</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              lineHeight: 1.2,
            }}
          >
            {domain.name}
          </span>
        </div>
        <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 12, marginBottom: 8 }} />
      </div>

      <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {domain.subfunctions
          .filter((sub) => hasSubfunctionAccess(user?.roles, domain.slug, slugify(sub.name), user?.permissions))
          .map((sub, idx) => {
            const subSlug = slugify(sub.name);
            const path = `/domains/${domain.slug}/${subSlug}`;

            return (
              <NavLink
                key={subSlug}
                to={path}
                style={({ isActive }) => ({
                  display: "flex",
                  flexDirection: "column",
                  padding: "6px 9px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  background: isActive ? "var(--color-primary-highlight)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  transition: "background 0.12s, color 0.12s",
                })}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-surface-offset)",
                      borderRadius: "var(--radius-sm)",
                      opacity: 0.8,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.3 }}>{sub.name}</span>
                </div>
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};
