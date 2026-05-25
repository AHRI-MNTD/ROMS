import * as React from "react";

export default function PlasmicHost() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Plasmic host</h1>
      <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>
        Plasmic integration is currently disabled because the hosted module path is unavailable in this workspace.
      </p>
    </div>
  );
}