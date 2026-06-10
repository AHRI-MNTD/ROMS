import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DOMAIN_CATALOG } from "@roms/shared";
import { slugify } from "../../shell/SecondarySidebar";
import { Badge, Card } from "@roms/ui";

export default function SubfunctionPlaceholderPage() {
  const { domainSlug, subfunctionSlug } = useParams<{ domainSlug: string; subfunctionSlug: string }>();

  const domain = DOMAIN_CATALOG.find((d) => d.slug === domainSlug);
  if (!domain) {
    return (
      <div style={{ padding: 28, color: "var(--color-text-muted)" }}>
        <h2>Domain not found</h2>
        <p>The domain slug "{domainSlug}" is not recognized.</p>
        <Link to="/" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Go to Dashboard</Link>
      </div>
    );
  }

  const subfunction = domain.subfunctions.find((sf) => slugify(sf.name) === subfunctionSlug);
  if (!subfunction) {
    return (
      <div style={{ padding: 28, color: "var(--color-text-muted)" }}>
        <h2>Sub-function not found</h2>
        <p>The sub-function slug "{subfunctionSlug}" is not recognized for {domain.name}.</p>
        <Link to={`/domains/${domain.slug}`} style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
          Back to {domain.name}
        </Link>
      </div>
    );
  }

  // Interactive task completion state
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const tasksCount = subfunction.tasks.length;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / tasksCount) * 100);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000, animation: "fadeUp 0.3s ease both" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 12 }}>
        <span>DOMAINS</span>
        <span>/</span>
        <span style={{ fontWeight: 600 }}>{domain.name.toUpperCase()}</span>
        <span>/</span>
        <span style={{ color: "var(--color-text-faint)" }}>{subfunction.name.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", margin: 0 }}>
            {subfunction.name}
          </h1>
          <Badge label="In Design Phase" color="primary" />
        </div>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", maxWidth: 700, lineHeight: 1.5 }}>
          The operations dashboard and system features for <strong>{subfunction.name}</strong> are currently being planned and drafted. View the functional scope and track the specifications below.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Scope checklist */}
        <Card
          title="Operational Scope & Requirements"
          subtitle="Interactive checklist of functional tasks from the ROMS specification catalog."
          style={{ padding: 18, borderRadius: 14 }}
        >
          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>
              <span>SPECIFICATION READINESS</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "var(--color-surface-offset)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "var(--color-primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subfunction.tasks.map((task, idx) => {
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
            subtitle="Pipeline and microservices integration parameters."
            style={{ padding: 18, borderRadius: 14 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>API ENDPOINT</span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--color-primary)", background: "var(--color-primary-soft)", padding: "2px 6px", borderRadius: 4 }}>
                  /api/domains/{domain.slug}/{slugify(subfunction.name)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>DATABASE COLLECTION</span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--color-text-muted)" }}>
                  roms_db.{domain.slug}_{slugify(subfunction.name).replace(/-/g, "_")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)" }}>RBAC ROLES REQUIRED</span>
                <span style={{ fontSize: "11px", color: "var(--color-text)" }}>
                  <span style={{ background: "var(--color-surface-offset)", padding: "2px 6px", borderRadius: 4, marginRight: 4 }}>ADMIN</span>
                  <span style={{ background: "var(--color-surface-offset)", padding: "2px 6px", borderRadius: 4 }}>LAB_SCIENTIST</span>
                </span>
              </div>
            </div>
          </Card>

          <Card
            title="Upcoming Features Preview"
            subtitle="Planned layout components for this workspace."
            style={{ padding: 18, borderRadius: 14 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>📊</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Live Analytics</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Real-time telemetry</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>⚡</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Auto-triggering</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Events & Webhooks</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>🖨️</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Reports Export</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>PDF/CSV export systems</div>
              </div>
              <div style={{ border: "1px dashed var(--color-border)", borderRadius: 8, padding: 10, textAlign: "center", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>🔔</div>
                <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>Escalation Alerts</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Alert thresholds</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
