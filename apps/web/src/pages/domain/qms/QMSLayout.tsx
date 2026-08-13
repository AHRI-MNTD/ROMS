import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

const tabs = [
  { to: "overview", label: "Overview", icon: "🏠" },
  { to: "library", label: "Library", icon: "📚" },
  { to: "authoring", label: "Authoring", icon: "📝" },
  { to: "controls", label: "Controls", icon: "🛡️" },
  { to: "approval", label: "Approval", icon: "✅" },
];

export default function QMSLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active sub-path (e.g., "", "overview", "create-sop", "guidelines")
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activePath = (lastPart === "sop-authoring-control" || !lastPart) ? "overview" : lastPart;

  const isOverview = activePath === "overview";
  const visibleTabs = tabs.filter((tab) => tab.to === "overview" || hasTabAccess(user?.roles, "qms", tab.to, user?.permissions));

  // Check access to current path
  const isCurrentPathAllowed = isOverview || hasTabAccess(user?.roles, "qms", activePath, user?.permissions);

  let title = "Standard Operating Procedure (SOP)";
  let subtitle = "Centralized repository for standard operating procedures.";

  if (activePath === "overview") {
    title = "Standard Operating Procedure (SOP)";
    subtitle = "Centralized repository for standard operating procedures, authoring pipelines, quality controls, and reference guidelines.";
  } else if (activePath === "create-sop") {
    title = "Create SOP";
    subtitle = "Draft and Author a new standard operating procedure.";
  } else if (activePath === "guidelines") {
    title = "SOP Guidelines";
    subtitle = "Reference guidelines and best practices for authoring SOPs.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Sticky header with title + nav tabs (Hidden on overview to let overview show its own hero logo header) ── */}
      {!isOverview && (
        <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <nav className="domain-nav-container" aria-label="SOP sections">
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "overview"}
                className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* ── Page content — fills remaining height ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: isOverview ? "12px 24px 16px" : "20px 28px 24px 28px",
          overflowY: isOverview ? "hidden" : "auto",
          display: isOverview ? "flex" : "block",
          flexDirection: isOverview ? "column" : undefined,
        }}
      >
        {isCurrentPathAllowed ? (
          <Outlet />
        ) : (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--color-surface)",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              maxWidth: "600px",
              margin: "40px auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔒</div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px 0" }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
              Your assigned user rights do not grant access to the <strong>{title}</strong> section. Please contact your system administrator or QA Officer if access is required.
            </p>
            <button
              onClick={() => navigate("/domains/qms/sop-authoring-control")}
              style={{
                background: "var(--color-primary, #0d9488)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🏠 Return to SOP Landing Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
