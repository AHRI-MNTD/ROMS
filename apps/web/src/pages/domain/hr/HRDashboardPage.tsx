import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type StaffRow = Record<string, unknown>;

export default function HRDashboardPage() {
  const staffQuery = useQuery({
    queryKey: ["hr-dashboard-staff"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/staff?page=1");
        return resp.data as { data: StaffRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  const trainingQuery = useQuery({
    queryKey: ["hr-dashboard-training"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/hr/training-records");
        return resp.data as { data: StaffRow[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  const staff = staffQuery.data?.data ?? [];
  const totalStaff = staffQuery.data?.total ?? 0;
  const totalTraining = trainingQuery.data?.total ?? 0;
  const departments = new Set(staff.map((row) => String(row.department ?? "Unknown")).filter(Boolean)).size;

  const cardStyle = (tone: string): React.CSSProperties => ({
    padding: 16,
    borderRadius: 18,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.95))`,
    boxShadow: "0 14px 28px rgba(16, 24, 40, 0.06)",
    minWidth: 120,
    maxWidth: 150,
    flex: "1 0 auto"  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 18 }}>

       
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: 16 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, marginBottom: 8 }}>What is covered</div>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            This Personnel workspace is now split into dashboard, personnel registry, personnel registration, leave records, induction, and analytics sections.
          </div>
        </div>

        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: 16 }}>
          <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, marginBottom: 8 }}>Preview</div>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Use the Personnel Registry tab to review live personnel data from the API. The remaining tabs are ready for future Personnel workflows.
          </div>
        </div>
      </div>
    </div>
  );
}