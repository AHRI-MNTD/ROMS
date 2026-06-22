import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type StaffRow = Record<string, unknown>;

export default function StaffDirectoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-list"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/staff");
        return resp.data as { data: StaffRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--fs-sm)",
            color: "#991b1b",
          }}
        >
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {data && (
        <>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {data.total} record{data.total === 1 ? "" : "s"}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <th style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Department</th>
                  <th style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Function / Job Title</th>
                  <th style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", textAlign: "left" }}>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, index) => (
                  <tr
                    key={index}
                    style={{ borderBottom: "1px solid var(--color-divider)", transition: "background 0.1s" }}
                    onMouseEnter={(event) => ((event.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface)")}
                    onMouseLeave={(event) => ((event.currentTarget as HTMLTableRowElement).style.background = "")}
                  >
                    <td style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.department ?? "—")}</td>
                    <td style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.jobTitle ?? "—")}</td>
                    <td style={{ padding: "5px 10px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{String(row.startDate ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}