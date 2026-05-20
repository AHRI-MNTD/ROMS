import React from "react";
import type { Domain, SubFunction } from "@roms/shared";

interface TaskListProps {
  domain: Domain | null;
  subFunction: SubFunction | null;
  subfnIndex: number | null;
}

export const TaskList: React.FC<TaskListProps> = ({ domain, subFunction, subfnIndex }) => {
  if (!domain) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          flexDirection: "column",
          gap: 8,
          color: "var(--color-text-faint)",
        }}
      >
        <span style={{ fontSize: "2rem" }}>🔬</span>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)" }}>
          Select a domain
        </div>
        <div style={{ fontSize: "var(--fs-sm)" }}>
          Choose a research domain from the left panel
        </div>
      </div>
    );
  }

  if (!subFunction) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          flexDirection: "column",
          gap: 8,
          color: "var(--color-text-faint)",
        }}
      >
        <span style={{ fontSize: "2rem" }}>{domain.emoji}</span>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", color: "var(--color-text-muted)" }}>
          {domain.name}
        </div>
        <div style={{ fontSize: "var(--fs-sm)" }}>Select a sub-function to explore its operational tasks.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-bg)", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 16px 8px",
          borderBottom: "1px solid var(--color-divider)",
          flexShrink: 0,
          background: "var(--color-bg)",
        }}
      >
        <div
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-text-faint)",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            {domain.emoji} {domain.name}
          </span>
          <span style={{ color: "var(--color-text-muted)" }}>›</span>
          <span style={{ color: "var(--color-text-muted)" }}>{subFunction.name}</span>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", lineHeight: 1.2 }}>
          {subFunction.name}
        </div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", fontStyle: "italic", marginTop: 3 }}>
          {subFunction.tasks.length} operational tasks
        </div>
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {subFunction.tasks.map((task, i) => (
          <div
            key={i}
            className="anim task-item"
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 12px",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              animationDelay: `${i * 40}ms`,
              transition: "background 0.12s, box-shadow 0.12s",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-primary)",
                flexShrink: 0,
                marginTop: 5,
                opacity: 0.65,
              }}
            />
            <span
              style={{
                fontSize: "var(--fs-base)",
                lineHeight: 1.55,
                color: "var(--color-text)",
              }}
            >
              {task}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
