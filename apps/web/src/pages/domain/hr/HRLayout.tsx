import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "dashboard", label: "Dashboard" },
  { to: "staff-directory", label: "Personnel Registry" },
  { to: "training-records", label: "Personnel Registration" },
  { to: "leave", label: "Personnel Leave" },
  { to: "approved", label: "Personnel Files" },
  { to: "approve-employee", label: "Verify Personnel" },
  { to: "analytics", label: "Analytics" },
];

type PageMeta = { icon: string; title: string; description: string };

const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    icon: "📊",
    title: "Dashboard",
    description: "Overview of personnel metrics, headcount, and recent activity.",
  },
  "staff-directory": {
    icon: "👥",
    title: "Personnel Registry",
    description: "Browse and manage the full directory of registered laboratory personnel.",
  },
  "training-records": {
    icon: "📋",
    title: "Personnel Registration",
    description: "Complete all required fields to submit your personnel file registration.",
  },
  leave: {
    icon: "🏖️",
    title: "Leave Management",
    description: "Submit, review, and track personnel leave requests and replacement cover.",
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
  analytics: {
    icon: "📈",
    title: "Personnel Analytics",
    description: "Insights and metrics across laboratory personnel qualifications and training.",
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
    <div style={{ padding: "0 28px 24px 28px", maxWidth: 1400 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: "24px",
          paddingBottom: "14px",
          marginBottom: 18,
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        {/* Dynamic page title / description */}
        <div style={{ minWidth: 280 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-xl)",
              color: "var(--color-text)",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{meta.icon}</span>
            <span>{meta.title}</span>
          </h1>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.55 }}>
            {meta.description}
          </p>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }} aria-label="Personnel sections">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "dashboard"}
              style={({ isActive }) => ({
                border: "1px solid",
                borderColor: isActive ? "var(--color-accent)" : "var(--color-border)",
                background: isActive ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.02em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}