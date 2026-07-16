import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: "📊" },
  { to: "training-records", label: "Personnel Registration", icon: "📋" },
  { to: "approved", label: "Personnel Files", icon: "🗂️" },
  { to: "approve-employee", label: "Verify Personnel", icon: "✅" },
];

type PageMeta = { icon: string; title: string; description: string };

const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    icon: "📊",
    title: "Dashboard",
    description: "Overview of personnel metrics, headcount, and recent activity.",
  },
  "training-records": {
    icon: "📋",
    title: "Personnel Registration",
    description: "Complete all required fields to submit your personnel file registration.",
  },
  approved: {
    icon: "🗂️",
    title: "Personnel Files Database",
    description: "View and manage verified personnel files, qualifications, and credentials.",
  },
  "approve-employee": {
    icon: "✅",
    title: "Verify Personnel File",
    description: "Review submitted personnel profiles and verify credentials."
  },
};

const FALLBACK: PageMeta = {
  icon: "👤",
  title: "Personnel Management",
  description: "Manage laboratory personnel files, qualifications, and appraisals.",
};

function useActiveMeta(): PageMeta {
  const { pathname } = useLocation();
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  return PAGE_META[segment] ?? FALLBACK;
}

export default function HRLayout() {
  const meta = useActiveMeta();
  const { user } = useAuth();

  const visibleTabs = tabs.filter((tab) => hasTabAccess(user?.roles, "hr", tab.to, user?.permissions));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, maxWidth: 1400, width: "100%" }}>
      {/* ── Sticky header with title + nav tabs ── */}
      <div className="domain-layout-header">
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              color: "var(--color-text)",
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span>{meta.icon}</span>
            <span>{meta.title}</span>
          </h1>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {meta.description}
          </p>
        </div>

        {/* Nav tabs */}
        <nav className="domain-nav-container" aria-label="Personnel sections">
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