import React, { useMemo, useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import { useAuth } from "../../../../auth/useAuth";
import { hasTabAccess } from "../../../../auth/permissions";
import type { ReagentRequest } from "./reagentShared";

const tabs = [
  { to: "overview", label: "Overview", icon: "🏠" },
  { to: "dashboard", label: "Dashboard", icon: "📊" },
  { to: "current-inventory", label: "Current Inventory", icon: "🧪" },
  { to: "check-in", label: "Check In", icon: "📥" },
  { to: "check-in-history", label: "Check-In", icon: "➕" },
  { to: "check-out", label: "Check Out", icon: "📤" },
  { to: "check-out-history", label: "Check-Out", icon: "➖" },
  { to: "requests", label: "Request", icon: "📋" },
  { to: "manage-requests", label: "Manage & Approve", icon: "✅" },
  { to: "approved-requests", label: "Approved Requests", icon: "🤝" },
  { to: "master-data", label: "Master Data", icon: "🗂️" },
];

export default function ReagentInventoryLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active sub-path (e.g., "", "overview", "dashboard", etc.)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activePath = lastPart === "reagent-management" || lastPart === "reagent-inventory" || !lastPart ? "overview" : lastPart;
  const isOverview = activePath === "overview";

  const visibleTabs = tabs.filter((tab) => {
    return tab.to === "overview" || hasTabAccess(user?.roles, "reagent-inventory", tab.to, user?.permissions, user?.email);
  });

  const isCurrentPathAllowed =
    isOverview ||
    hasTabAccess(user?.roles, "reagent-inventory", activePath, user?.permissions, user?.email);

  // Query pending requests for Manage & Approve badge
  const { data: pendingRequests, refetch: refetchPending } = useQuery({
    queryKey: ["reagent-requests", "pending-badge"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/requests", {
        params: { status: "PENDING" },
      });
      return resp.data as { data: ReagentRequest[]; total: number };
    },
    refetchInterval: 10000,
  });

  // Query approved & partial requests for Approved Requests badge
  const { data: approvedRequests, refetch: refetchApproved } = useQuery({
    queryKey: ["reagent-requests", "approved-badge"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/requests", {
        params: { status: "APPROVED,PARTIAL" },
      });
      return resp.data as { data: ReagentRequest[]; total: number };
    },
    refetchInterval: 10000,
  });

  // Real-time listener for fast badge synchronization across pages
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => {
      refetchPending();
      refetchApproved();
      setTick((t) => t + 1);
    };
    window.addEventListener("roms-reagent-request-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("roms-reagent-request-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refetchPending, refetchApproved]);

  const pendingCount = pendingRequests?.data?.length ?? 0;

  // Number of approved requests ready for physical hand-off or newly approved
  const approvedBadgeCount = useMemo(() => {
    const list = approvedRequests?.data ?? [];
    // Count all approved requisitions that are pending physical hand-off
    const pendingHandoff = list.filter((r) => !r.disbursedAt);
    if (pendingHandoff.length > 0) {
      return pendingHandoff.length;
    }
    // If all are disbursed, check for any un-acknowledged in local storage
    let seenMap: Record<string, boolean> = {};
    try {
      const saved = localStorage.getItem("roms_seen_reagent_approved");
      if (saved) seenMap = JSON.parse(saved);
    } catch {}
    return list.filter((r) => !seenMap[r.id]).length;
  }, [approvedRequests?.data, tick]);

  let title = "🧪 Reagent Inventory";
  let subtitle = "Assay-aware reagent tracking, concentration management, lot, expiry, and cold-chain storage.";

  if (activePath === "overview") {
    title = "Reagent Inventory";
    subtitle = "Centralized assay-specific reagent tracking, request workflows, and cold-chain compliance.";
  } else if (activePath === "dashboard") {
    title = "Dashboard";
    subtitle = "Real-time telemetry, concentration metrics, and stock risk signals.";
  } else if (activePath === "current-inventory") {
    title = "Current Reagent Inventory";
    subtitle = "Concentration-based catalog with storage temperatures and expected returns.";
  } else if (activePath === "check-in") {
    title = "Reagent Check-In";
    subtitle = "Receive reagents, record storage condition (-80, -20, 2-8, Ambient), lot, and concentration.";
  } else if (activePath === "check-in-history") {
    title = "Reagent Check-In History";
    subtitle = "Comprehensive audit trail and reference log of incoming reagent shipments and cold-chain receipts.";
  } else if (activePath === "check-out") {
    title = "Reagent Check-Out";
    subtitle = "Dispense reagents by concentration and Number of Vill, with expected-return tracking.";
  } else if (activePath === "check-out-history") {
    title = "Reagent Check-Out History";
    subtitle = "Audit trail of reagent disbursements, project allocations, and remaining concentration balances.";
  } else if (activePath === "requests") {
    title = "Reagent Request";
    subtitle = "Submit assay-driven reagent requisitions with dynamic conditional forms.";
  } else if (activePath === "manage-requests") {
    title = "Manage & Approve Requests";
    subtitle = "Reagent Inventory Manager portal for reviewing, approving, partially approving, or rejecting requests.";
  } else if (activePath === "approved-requests") {
    title = "Approved Reagent Requests";
    subtitle = "Inspect approved requisitions, review details, and execute physical reagent hand-off.";
  } else if (activePath === "master-data") {
    title = "Reagent Master Data";
    subtitle = "Assay types catalog, storage conditions, reagent categories, and laboratory storage locations.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Sticky header with nav tabs (Hidden on overview to let overview show hero logo banner) ── */}
      {!isOverview && (
        <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <nav className="domain-nav-container" aria-label="Reagent inventory sections">
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "overview"}
                className={({ isActive }) => `domain-nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
                {tab.to === "manage-requests" && pendingCount > 0 && (
                  <span
                    title={`${pendingCount} pending reagent request(s)`}
                    style={{
                      background: "#f59e0b",
                      color: "#ffffff",
                      borderRadius: "999px",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      marginLeft: 5,
                      lineHeight: 1,
                      boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
                {tab.to === "approved-requests" && approvedBadgeCount > 0 && (
                  <span
                    title={`${approvedBadgeCount} approved reagent request(s) ready for hand-off`}
                    style={{
                      background: "#10b981",
                      color: "#ffffff",
                      borderRadius: "999px",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      marginLeft: 5,
                      lineHeight: 1,
                      boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    {approvedBadgeCount}
                  </span>
                )}
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
          padding: isOverview ? 0 : "18px 24px 24px",
          background: "#ffffff",
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
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔒</div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px 0" }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
              Your current account does not have permission to view this section of Reagent Inventory.
            </p>
            <button
              onClick={() => navigate("/domains/reagent-inventory/reagent-management/overview")}
              style={{
                background: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Return to Reagent Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
