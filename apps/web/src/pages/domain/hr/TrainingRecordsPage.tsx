import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type TrainingRow = Record<string, unknown>;

export default function TrainingRecordsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-training-records"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/training-records");
        return resp.data as { data: TrainingRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: 16 }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, marginBottom: 8 }}>Training Records</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          {data?.total ?? 0} record{(data?.total ?? 0) === 1 ? "" : "s"} loaded from the API. This section is ready for filter, detail, and compliance workflows.
        </div>
      </div>

      <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: 16 }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, marginBottom: 8 }}>Records</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
          {data?.data?.length ? "Training rows are available for future expansion." : "No training records returned yet."}
        </div>
      </div>
    </div>
  );
}