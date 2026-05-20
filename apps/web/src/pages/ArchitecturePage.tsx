import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchC4Model } from "../api/architecture";
import { C4_MODEL, C4_RELATIONSHIPS, C4_CONTAINER_INTERACTIONS } from "@roms/shared";
import type { C4Container, C4Component } from "@roms/shared";
import { LevelTabs } from "../components/c4/LevelTabs";
import { NodeCard } from "../components/c4/NodeCard";
import { BoundaryBox } from "../components/c4/BoundaryBox";
import { RelationsList } from "../components/c4/RelationsList";
import { DetailPanel } from "../components/c4/DetailPanel";

type PanelItem = Partial<C4Container> & Partial<C4Component>;

/**
 * Architecture page — ports roms-c4-architecture.html
 * Level tabs C1 / C2 / C3 with drill-down and slide-in detail panel.
 */
export default function ArchitecturePage() {
  const [level, setLevel] = useState(1);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [panelItem, setPanelItem] = useState<PanelItem | null>(null);

  const { data } = useQuery({
    queryKey: ["architecture/c4"],
    queryFn: fetchC4Model,
    initialData: {
      model: C4_MODEL,
      relationships: C4_RELATIONSHIPS,
      containerInteractions: C4_CONTAINER_INTERACTIONS,
    },
  });

  const { model } = data;

  const handleDrill = (containerId: string) => {
    setSelectedContainerId(containerId);
    setLevel(3);
  };

  const handleLevelSelect = (l: number) => {
    setLevel(l);
    if (l < 3) setSelectedContainerId(null);
  };

  const selectedContainer = model.containers.find((c) => c.id === selectedContainerId);

  const breadcrumb: { label: string; onClick?: () => void }[] = [
    { label: "System Context", onClick: () => handleLevelSelect(1) },
    ...(level >= 2 ? [{ label: "Containers", onClick: () => handleLevelSelect(2) }] : []),
    ...(level >= 3 && selectedContainer
      ? [{ label: `Components: ${selectedContainer.name}` }]
      : []),
  ];

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, position: "relative" }}>
      {/* Topbar row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", flex: 1 }}>
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "var(--color-text-faint)" }}>›</span>}
              <span
                onClick={item.onClick}
                style={{
                  cursor: item.onClick ? "pointer" : "default",
                  color: i === breadcrumb.length - 1 ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                  transition: "color 0.12s",
                }}
              >
                {item.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        <LevelTabs currentLevel={level} onSelect={handleLevelSelect} />
      </div>

      {/* ── C1 System Context ─────────────────────────────────────────────────── */}
      {level === 1 && (
        <div>
          <div className="c4-title">C1 — System Context</div>
          <div className="c4-desc">
            ROMS sits at the centre of the research operations ecosystem, serving six user types and
            integrating with eight external systems across data capture, finance, compliance, and
            laboratory infrastructure.
          </div>

          <div className="sec-header">Users & Actors</div>
          <div className="nodes-row" style={{ marginBottom: 20 }}>
            {model.system.users.map((u, i) => (
              <NodeCard
                key={i}
                icon={u.icon}
                kind="Person"
                name={u.name}
                desc={u.desc}
                color="ext"
              />
            ))}
          </div>

          <BoundaryBox label="System Boundary — ROMS">
            <div className="nodes-row" style={{ justifyContent: "center" }}>
              <NodeCard
                icon="🔬"
                kind="Software System"
                name={model.system.fullName}
                tech={model.system.tech}
                desc={model.system.desc}
                color="sys"
                drillLabel="Drill into Containers (C2)"
                onClick={() => handleLevelSelect(2)}
                style={{ minWidth: 280, maxWidth: 340 }}
              />
            </div>
          </BoundaryBox>

          <div className="sec-header" style={{ marginTop: 20 }}>External Systems</div>
          <div className="nodes-row">
            {model.system.externals.map((e, i) => (
              <NodeCard
                key={i}
                icon={e.icon}
                kind="External System"
                name={e.name}
                tech={e.tech}
                desc={e.desc}
                color="ext"
              />
            ))}
          </div>

          <RelationsList
            relations={data.relationships as { from: string; arrow: string; to: string; label: string }[]}
            title="Key Relationships"
          />
        </div>
      )}

      {/* ── C2 Containers ─────────────────────────────────────────────────────── */}
      {level === 2 && (
        <div>
          <div className="c4-title">C2 — Containers</div>
          <div className="c4-desc">
            ROMS is composed of eight containers: a React web application, a Node.js API gateway,
            PostgreSQL database, document store, notification service, IoT integration layer,
            identity provider, and an integration hub for external systems.
          </div>

          <BoundaryBox label="ROMS — System Boundary">
            <div className="nodes-row" style={{ flexWrap: "wrap" }}>
              {model.containers.map((c) => (
                <NodeCard
                  key={c.id}
                  icon={c.icon}
                  kind={`${c.kind} · ${c.tech}`}
                  name={c.name}
                  desc={c.desc}
                  color={c.color}
                  drillLabel={c.drillTo ? "View Components (C3)" : undefined}
                  onClick={() => setPanelItem(c as PanelItem)}
                  style={{ minWidth: 160, maxWidth: 200 }}
                />
              ))}
            </div>
          </BoundaryBox>

          <RelationsList
            relations={data.containerInteractions as { from: string; arrow: string; to: string; label: string }[]}
            title="Container Interactions"
          />
        </div>
      )}

      {/* ── C3 Components ─────────────────────────────────────────────────────── */}
      {level === 3 && selectedContainer && (
        <div>
          <div className="c4-title">C3 — Components: {selectedContainer.name}</div>
          <div className="c4-desc">
            {selectedContainer.desc} The components below represent the major functional modules or
            services within this container.
          </div>

          <BoundaryBox label={`${selectedContainer.name} — Container Boundary`}>
            <div className="nodes-row" style={{ flexWrap: "wrap" }}>
              {(model.components[selectedContainer.id] ?? []).map((comp, i) => (
                <NodeCard
                  key={i}
                  icon={comp.icon}
                  kind={`${comp.kind} · ${comp.tech}`}
                  name={comp.name}
                  desc={comp.desc}
                  color={comp.color}
                  onClick={() => setPanelItem(comp as PanelItem)}
                  style={{ minWidth: 160, maxWidth: 210 }}
                />
              ))}
            </div>
          </BoundaryBox>
        </div>
      )}

      {/* Detail panel */}
      {panelItem && (
        <DetailPanel
          item={panelItem}
          onClose={() => setPanelItem(null)}
          onDrill={handleDrill}
        />
      )}
    </div>
  );
}
