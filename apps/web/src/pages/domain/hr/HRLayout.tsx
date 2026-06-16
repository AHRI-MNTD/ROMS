import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const tabs = [
  { to: "dashboard", label: "Dashboard" },
  { to: "staff-directory", label: "Staff Directory" },
  { to: "training-records", label: "Registration" },
  { to: "leave", label: "Leave" },
  { to: "approved", label: "Personnel" },
  { to: "approve-employee", label: "Approve Employee" },
  { to: "analytics", label: "Analytics" },
];

type PageMeta = { icon: string; title: string; description: string };

const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    icon: "📊",
    title: "Dashboard",
    description: "Overview of HR metrics, staff headcount, and recent activity.",
  },
  "staff-directory": {
    icon: "👥",
    title: "Staff Directory",
    description: "Browse and manage the full directory of registered staff members.",
  },
  "training-records": {
    icon: "📋",
    title: "Personnel Registration",
    description: "Complete all required fields to submit your personnel registration request.",
  },
  leave: {
    icon: "🏖️",
    title: "Leave Management",
    description: "Submit, review, and track staff leave requests and balances.",
  },
  approved: {
    icon: "🗂️",
    title: "Personnel Database",
    description: "View and manage the full records of all approved personnel.",
  },
  "approve-employee": {
    icon: "✅",
    title: "Approve Employee",
    description: "Review pending personnel registration requests and take approval action.",
  },
  analytics: {
    icon: "📈",
    title: "HR Analytics",
    description: "Insights, trends, and reporting across all HR operations.",
  },
};

const FALLBACK: PageMeta = {
  icon: "👤",
  title: "HR & Staff Operations",
  description: "Manage HR and staff operations records.",
};

function useActiveMeta(): PageMeta {
  const { pathname } = useLocation();
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  return PAGE_META[segment] ?? FALLBACK;
}

export default function HRLayout() {
  const meta = useActiveMeta();

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
          paddingBottom: 14,
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
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }} aria-label="HR sections">
          {tabs.map((tab) => (
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