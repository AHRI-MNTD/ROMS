import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";
import { slugify } from "../../shell/SecondarySidebar";
import { Card } from "@roms/ui";

export default function SubfunctionPlaceholderPage() {
  const { domainSlug, subfunctionSlug } = useParams<{ domainSlug: string; subfunctionSlug: string }>();

  const domain = DOMAIN_CATALOG.find((d) => d.slug === domainSlug);
  const subfunction = domain?.subfunctions.find((sf) => slugify(sf.name) === subfunctionSlug);

  const domainName = domain?.name || (domainSlug ? domainSlug.replace(/-/g, " ").toUpperCase() : "RESEARCH OPERATIONS");
  const subfunctionName = subfunction?.name || (subfunctionSlug ? subfunctionSlug.replace(/-/g, " ") : "SPECIALIZED MODULE");

  // Interactive task completion state
  const tasksList = subfunction?.tasks || [
    "System Requirements Specification & Architecture Review",
    "Database Schema Modeling & Relational Entities Setup",
    "RESTful API & GraphQL Query/Mutation Endpoints",
    "Role-Based Access Control & Security Policies",
    "Front-End User Interface & Telemetry Dashboard",
    "Integration & Deployment Verification Tests",
  ];

  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({ 0: true, 1: true });

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const tasksCount = tasksList.length;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / tasksCount) * 100);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000, margin: "0 auto", animation: "fadeUp 0.3s ease both" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 16 }}>
        <Link to="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>DASHBOARD</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{domainName.toUpperCase()}</span>
        <span>/</span>
        <span style={{ color: "var(--color-text-faint)" }}>{subfunctionName.toUpperCase()}</span>
      </div>

      {/* Hero Banner - Coming Soon / Under Active Development */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(1, 105, 111, 0.08) 0%, rgba(1, 105, 111, 0.02) 100%)",
          border: "1px solid rgba(1, 105, 111, 0.2)",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <span
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            MODULE UNDER ACTIVE DEVELOPMENT
          </span>
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            Targeted for Upcoming Release
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-xl)",
            color: "var(--color-text)",
            margin: "8px 0",
            fontWeight: 700,
          }}
        >
          {domain?.emoji || "🚀"} {subfunctionName}
        </h1>

        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", maxWidth: 750, lineHeight: 1.6, margin: "8px 0 16px 0" }}>
          The operational features and system components for <strong>{subfunctionName}</strong> are currently under active engineering and design.
          Our team is crafting this module for full integration into the ROMS enterprise platform. In the meantime, you can explore the fully functional live modules or track the upcoming functional roadmap below.
        </p>

        {/* Quick Links to Live Deployable Modules */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 8 }}>
          <Link
            to="/domains/inventory/stock-management"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📦 Open Inventory Module
          </Link>
          <Link
            to="/domains/hr/recruitment-onboarding"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            👥 Open HR Operations
          </Link>
          <Link
            to="/domains/qms/sop-authoring-control"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📜 Open SOPs & QMS
          </Link>
          <Link
            to="/"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Scope checklist */}
        <Card
          title="Module Roadmap & Specification Progress"
          subtitle="Functional tasks and technical specifications targeted for this module."
          style={{ padding: 18, borderRadius: 14 }}
        >
          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>
              <span>SPECIFICATION STAGING</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "var(--color-surface-offset)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--color-primary) 0%, #0d9488 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasksList.map((task, idx) => {
              const isChecked = !!completedTasks[idx];
              return (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: "var(--radius)",
                    border: "1px solid",
                    borderColor: isChecked ? "rgba(1, 105, 111, 0.25)" : "var(--color-border)",
                    background: isChecked ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTask(idx)}
                    style={{
                      marginTop: 2,
                      width: 15,
                      height: 15,
                      accentColor: "var(--color-primary)",
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ fontSize: "var(--fs-sm)", color: isChecked ? "var(--color-text)" : "var(--color-text-muted)", lineHeight: 1.4, fontWeight: isChecked ? 600 : 400 }}>
                    {task}
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        {/* System Schema mockup & timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card
            title="System Integration Status"
            subtitle="Pipeline and API microservices parameters."
            style={{ padding: 18, borderRadius: 14 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>MODULE STATUS</span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#0d9488", background: "rgba(13, 148, 136, 0.1)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  DEVELOPMENT IN PROGRESS
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>API ENDPOINT</span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--color-primary)", background: "var(--color-primary-soft)", padding: "2px 6px", borderRadius: 4 }}>
                  /api/domains/{domainSlug || "domain"}/{slugify(subfunctionName)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>ROLES ASSIGNED</span>
                <span style={{ fontSize: "11px", color: "var(--color-text)" }}>
                  <span style={{ background: "var(--color-surface-offset)", padding: "2px 6px", borderRadius: 4, marginRight: 4 }}>ADMIN</span>
                  <span style={{ background: "var(--color-surface-offset)", padding: "2px 6px", borderRadius: 4 }}>STAFF</span>
                </span>
              </div>
            </div>
          </Card>

          <Card
            title="Upcoming Module Features"
            subtitle="Planned layout components for this workspace."
            style={{ padding: 18, borderRadius: 14 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>📊</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Live Dashboards</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Real-time metrics</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>⚡</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Workflows</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Automated triggers</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>🖨️</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Reports Export</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>PDF/CSV export systems</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>🔔</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Audit Tracking</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>ALCOA+ Compliance</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
