import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

const POSITIONS = [
  { name: "division_head", label: "Division Head" },
  { name: "lead_scientist", label: "Lead Scientist" },
  { name: "senior_scientist", label: "Senior Scientist" },
  { name: "post-doctoral_researcher", label: "Post-Doctoral Researcher" },
  { name: "researcher_ii", label: "Researcher II" },
  { name: "researcher_i", label: "Researcher I" },
  { name: "associate_researcher_ii", label: "Associate Researcher II" },
  { name: "associate_researcher_i", label: "Associate Researcher I" },
  { name: "assistant_researcher_ii", label: "Assistant Researcher II" },
  { name: "assistant_researcher_i", label: "Assistant Researcher I" },
  { name: "assistant_researcher", label: "Assistant Researcher" },
  { name: "junior_researcher", label: "Junior Researcher" },
  { name: "project_manager", label: "Project Manager" },
  { name: "assistant_project_management", label: "Assistant Project Management" },
  { name: "project_coordinator", label: "Project Coordinator" },
  { name: "senior_project_accountant", label: "Senior Project Accountant" },
  { name: "project_accountant", label: "Project Accountant" },
  { name: "junior_administration_officer", label: "Junior Administration Officer" },
  { name: "driver", label: "Driver" }
];

const EMPLOYMENT_TYPES = [
  { name: "permanent", label: "Permanent" },
  { name: "contract", label: "Contract" },
  { name: "msc_student", label: "MSc Student" }
];

const MNTD_HIRED_PROJECTS = [
  { name: "achides", label: "ACHIDES" },
  { name: "cease", label: "CEASE" },
  { name: "dpp", label: "DPP" },
  { name: "drivax", label: "DRIVAX" },
  { name: "emagen", label: "EMAGEN" },
  { name: "hamms", label: "HAMMS" },
  { name: "hrp", label: "HRP" },
  { name: "indie", label: "INDIE" },
  { name: "leishaccess", label: "LeishAccess" },
  { name: "optivivax", label: "OptiVivax" },
  { name: "pvstatem", label: "PvSTATEM" },
  { name: "sharp", label: "SHARP" },
  { name: "vispa", label: "VISPA" },
  { name: "CDC", label: "CDC" },
  { name: "AnoSTEP", label: "AnoSTEP" },
  { name: "AMNET", label: "AMNET" },
  { name: "PvSeroRDT", label: "PvSeroRDT" }
];

const MNTD_TEAMS = [
  { name: "Leadership", label: "Leadership (Division Head & Principal Investigators)" },
  { name: "Project_Management/Coordination", label: "Project Management/Coordination" },
  { name: "Team_Leader", label: "Team Leader" },
  { name: "Laboratory_Team", label: "Laboratory Team" },
  { name: "Field_Team", label: "Field Team" },
  { name: "Entomology_Team", label: "Entomology Team" },
  { name: "Data_Team", label: "Data Team" },
  { name: "Social_Science_Team", label: "Social Science Team" },
  { name: "Health_Economics_Team", label: "Health Economics Team" },
  { name: "logistics_finance_team", label: "Logistics/Finance Team" }
];

const MNTD_PROJECTS = [
  { name: "ACHIDES_(Dr._Fitsum)", label: "ACHIDES (Dr. Fitsum)" },
  { name: "CEASE_(Dr._Endalamaw)", label: "CEASE (Dr. Endalamaw)" },
  { name: "CONVINCE_(Dr._Fitsum)", label: "CONVINCE (Dr. Fitsum)" },
  { name: "DPP_(Dr._Endalamaw)", label: "DPP (Dr. Endalamaw)" },
  { name: "DRIVAX_(Dr._Fitsum)", label: "DRIVAX (Dr. Fitsum)" },
  { name: "EMAGEN_(Dr._Fitsum)", label: "EMAGEN (Dr. Fitsum)" },
  { name: "eSPT_(Dr._Endalamaw)", label: "eSPT (Dr. Endalamaw)" },
  { name: "HAMMS_(Dr._Fitsum)", label: "HAMMS (Dr. Fitsum)" },
  { name: "HRP_(Dr._Endalamaw)", label: "HRP (Dr. Endalamaw)" },
  { name: "INDIE_(Dr._Fitsum)", label: "INDIE (Dr. Fitsum)" },
  { name: "LeishAccess_(Dr._Endalamaw)", label: "LeishAccess (Dr. Endalamaw)" },
  { name: "OptiVivax_(Dr._Fitsum)", label: "OptiVivax (Dr. Fitsum)" },
  { name: "PvSTATEM_(Dr._Fitsum)", label: "PvSTATEM (Dr. Fitsum)" },
  { name: "RESONATE_(Dr._Yohannes)", label: "RESONATE (Dr. Yohannes)" },
  { name: "SHARP_(Dr._Endalamaw)", label: "SHARP (Dr. Endalamaw)" },
  { name: "SouthMap_(Dr._Endalamaw)", label: "SouthMap (Dr. Endalamaw)" },
  { name: "TES2022_(Dr._Fitsum)_1", label: "TES2020 (Dr. Fitsum)" },
  { name: "TES2022_(Dr._Fitsum)", label: "TES2022 (Dr. Fitsum)" },
  { name: "TES2024_(Dr._Fitsum)", label: "TES2024 (Dr. Fitsum)" },
  { name: "tMDA_(Dr._Fitsum)", label: "tMDA (Dr. Fitsum)" },
  { name: "VISPA_(Dr._Fitsum)", label: "VISPA (Dr. Fitsum)" },
  { name: "VivAction_(Dr._Endalamaw)", label: "VivAction (Dr. Endalamaw)" },
  { name: "VL-LAMP_(Dr._Endalamaw)", label: "VL-LAMP (Dr. Endalamaw)" },
  { name: "CDC_(Dr._Fitsum)", label: "CDC (Dr. Fitsum)" },
  { name: "AnoSTEP_(Dr._Fitsum)", label: "AnoSTEP (Dr. Fitsum)" },
  { name: "AMNET_(Dr._Fitsum)", label: "AMNET (Dr. Fitsum)" },
  { name: "PVseroRDT_(Dr._Fitsum)", label: "PVseroRDT (Dr. Fitsum)" }
];

const UNIVERSITIES = [
  { name: "adama_science_and_technology_university", label: "Adama Science and Technology University" },
  { name: "addis_ababa_science_and_technology_university", label: "Addis Ababa Science and Technology University" },
  { name: "addis_ababa_university", label: "Addis Ababa University" },
  { name: "adigrat_university", label: "Adigrat University" },
  { name: "ambo_university", label: "Ambo University" },
  { name: "arba_minch_university", label: "Arba Minch University" },
  { name: "arsi_university", label: "Arsi University" },
  { name: "assosa_university", label: "Assosa University" },
  { name: "axum_university", label: "Axum University" },
  { name: "bahir_dar_university", label: "Bahir Dar University" },
  { name: "bonga_university", label: "Bonga University" },
  { name: "borana_university", label: "Borana University" },
  { name: "bule_hora_university", label: "Bule Hora University" },
  { name: "dambi_dollo_university", label: "Dambi Dollo University" },
  { name: "debark_university", label: "Debark University" },
  { name: "debre_berhan_university", label: "Debre Berhan University" },
  { name: "debre_markos_university", label: "Debre Markos University" },
  { name: "debre_tabor_university", label: "Debre Tabor University" },
  { name: "defence_university", label: "Defence University" },
  { name: "dilla_university", label: "Dilla University" },
  { name: "dire_dawa_university", label: "Dire Dawa University" },
  { name: "ethiopian_civil_service_university", label: "Ethiopian Civil Service University" },
  { name: "ethiopian_police_university_college", label: "Ethiopian Police University College" },
  { name: "gambella_university", label: "Gambella University" },
  { name: "haramaya_university", label: "Haramaya University" },
  { name: "hawassa_university", label: "Hawassa University" },
  { name: "injibara_university", label: "Injibara University" },
  { name: "jijiga_university", label: "Jijiga University" },
  { name: "jimma_university", label: "Jimma University" },
  { name: "jinka_university", label: "Jinka University" },
  { name: "kebri_dehar_university", label: "Kebri Dehar University" },
  { name: "kotebe_metropolitan_university", label: "Kotebe Metropolitan University" },
  { name: "meda_walabu_university", label: "Meda Walabu University" },
  { name: "mekdela_amba_university", label: "Mekdela Amba University" },
  { name: "mekelle_university", label: "Mekelle University" },
  { name: "mettu_university", label: "Mettu University" },
  { name: "mizan_tepi_university", label: "Mizan Tepi University" },
  { name: "oda_bultum_university", label: "Oda Bultum University" },
  { name: "oromia_state_university", label: "Oromia State University" },
  { name: "raya_university", label: "Raya University" },
  { name: "salale_university", label: "Salale University" },
  { name: "semera_university", label: "Semera University" },
  { name: "university_of_gondar", label: "University of Gondar" },
  { name: "wachamo_university", label: "Wachamo University" },
  { name: "werabe_university", label: "Werabe University" },
  { name: "wolaita_sodo_university", label: "Wolaita Sodo University" },
  { name: "woldia_university", label: "Woldia University" },
  { name: "wolkite_university", label: "Wolkite University" },
  { name: "wollega_university", label: "Wollega University" },
  { name: "wollo_university", label: "Wollo University" },
  { name: "other", label: "OTHER" }
];

const WORK_EXP_OPTIONS = [
  { name: "less_than_1_year", label: "Less than 1 Year" },
  { name: "1_to_2_years", label: "1 to 2 Years" },
  { name: "2_to_3_years", label: "2 to 3 Years" },
  { name: "3_to_4_years", label: "3 to 4 Years" },
  { name: "4_to_5_years", label: "4 to 5 Years" },
  { name: "more_than_5_years", label: "More than 5 Years" }
];

type ApprovalRow = {
  id: string;
  department: string;
  jobTitle: string;
  startDate: string;
  approvalStatus: ApprovalStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  employmentType?: string | null;
  contractEndDate?: string | null;
  contractRenewalDate?: string | null;
  user?: {
    displayName?: string | null;
    email?: string | null;
    roles?: string[] | null;
  };
  reviewedBy?: {
    displayName?: string | null;
    email?: string | null;
  } | null;

  sex?: string | null;
  personalEmail?: string | null;
  ahriEmail?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  mntdProject?: string | null;
  mntdTeams?: string[] | null;
  mntdProjectsInvolved?: string[] | null;

  firstDegree?: string | null;
  firstDegreeUniv?: string | null;
  firstDegreeUnivOther?: string | null;
  firstDegreeYear?: string | null;

  secondDegree?: string | null;
  secondDegreeUniv?: string | null;
  secondDegreeUnivOther?: string | null;
  secondDegreeYear?: string | null;

  thirdDegree?: string | null;
  thirdDegreeUnivCountry?: string | null;
  thirdDegreeYear?: string | null;

  currentlyStudying?: boolean | null;
  studyMastersField?: string | null;
  studyMastersUniv?: string | null;
  studyMastersYear?: string | null;

  studyPhdField?: string | null;
  studyPhdUniv?: string | null;
  studyPhdYear?: string | null;

  studyCertField?: string | null;
  studyCertUniv?: string | null;
  studyCertYear?: string | null;

  totalWorkExp?: string | null;
  totalWorkExpAhri?: string | null;

  propertyInventory?: any;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function formatEmployment(value?: string | null): string {
  if (!value) return "—";
  const found = EMPLOYMENT_TYPES.find(t => t.name === value.toLowerCase());
  if (found) return found.label;
  const v = value.toUpperCase().replace(/[-_\s]/g, "");
  if (v === "CONTRACT" || v === "CONTRACTUAL") return "Contract";
  if (v === "PERMANENT" || v === "FULLTIME") return "Permanent";
  return value;
}

function getUniversityLabel(value?: string | null) {
  if (!value) return "—";
  const found = UNIVERSITIES.find(u => u.name === value);
  return found ? found.label : value;
}

function getPositionLabel(value?: string | null) {
  if (!value) return "—";
  const found = POSITIONS.find(p => p.name === value);
  return found ? found.label : value;
}

function getWorkExpLabel(value?: string | null) {
  if (!value) return "—";
  const found = WORK_EXP_OPTIONS.find(o => o.name === value);
  return found ? found.label : value;
}

function getTeamLabel(value: string) {
  const found = MNTD_TEAMS.find(t => t.name === value);
  return found ? found.label : value;
}

function getProjectLabel(value: string) {
  const found = MNTD_PROJECTS.find(p => p.name === value);
  return found ? found.label : value;
}

function getHiredProjectLabel(value?: string | null) {
  if (!value) return "—";
  const found = MNTD_HIRED_PROJECTS.find(p => p.name === value);
  return found ? found.label : value;
}

export default function ApproveEmployeePage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [listView, setListView] = useState<"approved" | "rejected" | null>(null);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approvalStatus, reviewNote }: { id: string; approvalStatus: ApprovalStatus; reviewNote?: string | undefined }) => {
      const body: Record<string, unknown> = { approvalStatus };
      if (reviewNote !== undefined) body.reviewNote = reviewNote;
      const resp = await apiClient.patch(`/domains/hr/approvals/${id}`, body);
      return resp.data as ApprovalRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr-employee-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["hr-dashboard-staff"] });
      setSelected(null);
    },
  });

  const rows = data?.data ?? [];
  const sortByRecent = (a: ApprovalRow, b: ApprovalRow) => {
    const ta = new Date(a.createdAt ?? a.reviewedAt ?? a.startDate ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.reviewedAt ?? b.startDate ?? 0).getTime();
    return tb - ta;
  };

  const pending = useMemo(() => rows.filter((row) => row.approvalStatus === "PENDING").slice().sort(sortByRecent), [rows]);
  const approved = useMemo(() => rows.filter((row) => row.approvalStatus === "APPROVED").slice().sort(sortByRecent), [rows]);
  const rejected = useMemo(() => rows.filter((row) => row.approvalStatus === "REJECTED").slice().sort(sortByRecent), [rows]);

  const handleDecision = async (id: string, approvalStatus: ApprovalStatus) => {
    const note = notes[id]?.trim();
    await approveMutation.mutateAsync({ id, approvalStatus, reviewNote: note || undefined });
    setNotes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const panelStyle = (borderColor: string): React.CSSProperties => ({
    borderRadius: 18,
    border: `1px solid ${borderColor}`,
    background: "var(--color-surface-2)",
    overflow: "hidden",
  });

  const headerStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: "var(--fs-md)",
    fontWeight: 800,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-divider)",
    letterSpacing: "0.02em",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-divider)",
    height: 32,
    overflow: "hidden",
  };

  const cellStyle: React.CSSProperties = {
    padding: "4px 6px",
    verticalAlign: "middle",
    fontSize: "10px",
  };

  const sharedTh = (width: string) => ({ textAlign: "left" as const, padding: "5px 6px", width });

  // Process selected inventory
  const activeInventory = useMemo(() => {
    if (!selected?.propertyInventory) return [];
    try {
      const inv = typeof selected.propertyInventory === "string"
        ? JSON.parse(selected.propertyInventory)
        : selected.propertyInventory;

      return Object.entries(inv)
        .map(([key, val]: [string, any]) => {
          const typeLabel = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          return {
            id: key,
            type: typeLabel,
            quantity: val?.quantity ?? 0,
            brand: val?.brand ?? ""
          };
        })
        .filter(i => i.quantity > 0);
    } catch (e) {
      return [];
    }
  }, [selected]);

  const renderRow = (row: ApprovalRow, showActions: boolean, index: number) => (
    <tr
      key={row.id}
      onClick={() => setSelected(row)}
      style={{ ...rowStyle, cursor: "pointer", transition: "background 0.1s", ...(index === 0 ? { borderTop: "2px solid var(--color-divider)" } : {}) }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ ...cellStyle, width: "4%", textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700 }}>{index + 1}</td>
      <td style={{ ...cellStyle, width: "16%" }}>
        <div title={row.user?.displayName ?? "Unknown"} style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.user?.displayName ?? "Unknown"}</div>
      </td>
      <td style={{ ...cellStyle, width: "18%" }} title={row.department}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.department}</div>
      </td>
      <td style={{ ...cellStyle, width: "18%" }} title={getPositionLabel(row.jobTitle)}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getPositionLabel(row.jobTitle)}</div>
      </td>
      <td style={{ ...cellStyle, whiteSpace: "nowrap", width: "10%" }}>{formatDate(row.startDate)}</td>
      <td style={{ ...cellStyle, width: "11%" }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatEmployment(row.employmentType)}</div>
      </td>
      <td style={{ ...cellStyle, width: "10%", whiteSpace: "nowrap" }}>{formatDate(row.contractEndDate ?? null)}</td>
      {showActions ? (
        <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap", width: "13%" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Verify"
            onClick={() => handleDecision(row.id, "APPROVED")}
            disabled={approveMutation.isPending}
            style={{ marginRight: 5, background: "#059669", color: "white", border: "none", width: 26, height: 22, borderRadius: 5, cursor: "pointer", fontWeight: 900, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >✓</button>
          <button
            type="button"
            title="Decline"
            onClick={() => handleDecision(row.id, "REJECTED")}
            disabled={approveMutation.isPending}
            style={{ background: "#dc2626", color: "white", border: "none", width: 26, height: 22, borderRadius: 5, cursor: "pointer", fontWeight: 900, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </td>
      ) : (
        <>
          <td style={{ ...cellStyle, width: "21%" }}>
            <div title={row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"} style={{ lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.reviewedBy ? `${row.reviewedBy.displayName ?? row.reviewedBy.email ?? "System"}${row.reviewNote ? ` · ${row.reviewNote}` : ""}` : "—"}</div>
          </td>
          <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap", width: "8%" }}>
            <button type="button" title="View details" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 6, width: 28, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontSize: 13 }}>👁</button>
          </td>
        </>
      )}
    </tr>
  );

  const listThead = (showActions: boolean) => (
    <thead>
      <tr style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
        <th style={{ textAlign: "right", padding: "5px 6px", width: "4%" }}>#</th>
        <th style={sharedTh("16%")}>Name</th>
        <th style={sharedTh("18%")}>Department</th>
        <th style={sharedTh("18%")}>Function / Job Title</th>
        <th style={sharedTh("10%")}>Start date</th>
        <th style={sharedTh("11%")}>Contract Type</th>
        <th style={sharedTh("10%")}>Contract end</th>
        {showActions ? (
          <th style={{ padding: "5px 6px", width: "13%", textAlign: "center" }}>Verification Decisions</th>
        ) : (
          <>
            <th style={sharedTh("21%")}>Verified By</th>
            <th style={sharedTh("8%")}>Action</th>
          </>
        )}
      </tr>
    </thead>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ── Top instruction banner ── */}
      <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15, fontStyle: "normal" }}>ℹ️</span>
        Review the personnel profile, then verify credentials and authorize task access. Click a row to see the full profile details.
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Approval API error — start the API server with <code>pnpm --filter @roms/api dev</code> and ensure you're signed in.
        </div>
      )}

      {!selected ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={panelStyle("rgba(186, 197, 34, 0.18)")}>
            <div style={{ ...headerStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Pending Personnel File Verifications</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setListView((v) => v === "approved" ? null : "approved")}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #86efac", background: listView === "approved" ? "#059669" : "#f0fdf4", color: listView === "approved" ? "#fff" : "#059669", fontWeight: 700, fontSize: "var(--fs-xs)", cursor: "pointer" }}
                >
                  Verified List ({approved.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListView((v) => v === "rejected" ? null : "rejected")}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: listView === "rejected" ? "#dc2626" : "#fef2f2", color: listView === "rejected" ? "#fff" : "#dc2626", fontWeight: 700, fontSize: "var(--fs-xs)", cursor: "pointer" }}
                >
                  Unverified List ({rejected.length})
                </button>
              </div>
            </div>
            <div className="table-responsive-container">
              {pending.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  {listThead(true)}
                  <tbody>{pending.map((row, i) => renderRow(row, true, i))}</tbody>
                </table>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No pending personnel file verifications.</div>
              )}
            </div>
          </div>

          {listView === "approved" && (
            <div style={panelStyle("rgba(34, 197, 94, 0.18)")}>
              <div style={headerStyle}>Verified List</div>
              <div className="table-responsive-container">
                {approved.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    {listThead(false)}
                    <tbody>{approved.map((row, i) => renderRow(row, false, i))}</tbody>
                  </table>
                ) : (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No verified personnel yet.</div>
                )}
              </div>
            </div>
          )}

          {listView === "rejected" && (
            <div style={panelStyle("rgba(239, 68, 68, 0.18)")}>
              <div style={headerStyle}>Unverified List</div>
              <div className="table-responsive-container">
                {rejected.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    {listThead(false)}
                    <tbody>{rejected.map((row, i) => renderRow(row, false, i))}</tbody>
                  </table>
                ) : (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: "10px 14px" }}>No unverified personnel yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...panelStyle("rgba(186, 197, 34, 0.18)"), padding: "20px 24px" }}>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--color-divider)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {(selected.user?.displayName ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
                    {selected.user?.displayName ?? "Unknown"}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    {selected.user?.email ?? "No email on record"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  background: selected.approvalStatus === "PENDING" ? "#fef9c3" : selected.approvalStatus === "APPROVED" ? "#dcfce7" : "#fef2f2",
                  color: selected.approvalStatus === "PENDING" ? "#854d0e" : selected.approvalStatus === "APPROVED" ? "#166534" : "#991b1b",
                  border: `1px solid ${selected.approvalStatus === "PENDING" ? "#fde047" : selected.approvalStatus === "APPROVED" ? "#86efac" : "#fca5a5"}`,
                  borderRadius: 999,
                  padding: "3px 12px"
                }}>
                  {selected.approvalStatus === "PENDING" ? "PENDING VERIFICATION" : selected.approvalStatus === "APPROVED" ? "VERIFIED" : "UNVERIFIED"}
                </span>
                {(() => {
                  const emp = formatEmployment(selected.employmentType);
                  const empColor =
                    emp === "Contract" ? { bg: "#fef9c3", text: "#854d0e", border: "#fde047" } :
                      emp === "Permanent" ? { bg: "#dcfce7", text: "#166534", border: "#86efac" } :
                        { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" };
                  return <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: empColor.bg, color: empColor.text, border: `1px solid ${empColor.border}`, borderRadius: 999, padding: "3px 12px" }}>{emp}</span>;
                })()}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--color-divider)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Back to List
              </button>
            </div>
          </div>

          {/* Details Grid layout: 2 Columns side-by-side */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 20 }}>
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Section title="Section 1: Personal Details & Contact Information">
                <div className="grid-responsive-2col">
                  <InfoRow label="Full Name" value={selected.user?.displayName ?? "—"} />
                  <InfoRow label="Sex" value={selected.sex ? selected.sex.replace(/^\w/, c => c.toUpperCase()) : "—"} />
                  <InfoRow label="Phone Number" value={selected.phone} />
                  <InfoRow label="Personal Email" value={selected.personalEmail} />
                  <InfoRow label="AHRI Email" value={selected.ahriEmail} />
                  <InfoRow label="Emergency Contact" value={selected.emergencyContact} />
                </div>
              </Section>

              <Section title="Section 2: Employment & Position details">
                <div className="grid-responsive-2col">
                  <InfoRow label="Department" value={selected.department} />
                  <InfoRow label="Current Position" value={getPositionLabel(selected.jobTitle)} />
                  <InfoRow label="Employment Type" value={formatEmployment(selected.employmentType)} />
                  <InfoRow label="AHRI Start Date" value={formatDate(selected.startDate)} />
                  {selected.employmentType === "contract" && (
                    <>
                      <InfoRow label="Contract End Date" value={formatDate(selected.contractEndDate)} />
                      <InfoRow label="Hired Project" value={getHiredProjectLabel(selected.mntdProject)} />
                    </>
                  )}
                </div>
                <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                  <InfoRow
                    label="MNTD Teams"
                    value={selected.mntdTeams && selected.mntdTeams.length > 0
                      ? selected.mntdTeams.map(t => getTeamLabel(t)).join(", ")
                      : "—"}
                  />
                  <InfoRow
                    label="Projects Involved"
                    value={selected.mntdProjectsInvolved && selected.mntdProjectsInvolved.length > 0
                      ? selected.mntdProjectsInvolved.map(p => getProjectLabel(p)).join(", ")
                      : "—"}
                  />
                </div>
              </Section>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Section title="Section 3: Qualifications & Academic Background">
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {/* First Degree */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Undergraduate/First Degree</div>
                    <div className="grid-responsive-2col">
                      <InfoRow label="Degree & Field" value={selected.firstDegree} />
                      <InfoRow label="University" value={selected.firstDegreeUniv === "other" ? selected.firstDegreeUnivOther : getUniversityLabel(selected.firstDegreeUniv)} />
                      <InfoRow label="Completed Year" value={selected.firstDegreeYear} />
                    </div>
                  </div>

                  {/* Second Degree */}
                  {selected.secondDegree && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Postgraduate/Second Degree</div>
                      <div className="grid-responsive-2col">
                        <InfoRow label="Degree & Field" value={selected.secondDegree} />
                        <InfoRow label="University" value={selected.secondDegreeUniv === "other" ? selected.secondDegreeUnivOther : getUniversityLabel(selected.secondDegreeUniv)} />
                        <InfoRow label="Completed Year" value={selected.secondDegreeYear} />
                      </div>
                    </div>
                  )}

                  {/* Third Degree */}
                  {selected.thirdDegree && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Postgraduate/Third Degree (PhD)</div>
                      <div className="grid-responsive-2col">
                        <InfoRow label="PhD & Field" value={selected.thirdDegree} />
                        <InfoRow label="University & Country" value={selected.thirdDegreeUnivCountry} />
                        <InfoRow label="Completed Year" value={selected.thirdDegreeYear} />
                      </div>
                    </div>
                  )}

                  {/* Currently Studying */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Current Study Status</div>
                    <InfoRow label="Currently Studying?" value={selected.currentlyStudying ? "Yes" : "No"} />

                    {selected.currentlyStudying && (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, paddingLeft: 10, borderLeft: "2px solid var(--color-border)" }}>
                        {selected.studyMastersField && (
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                            <strong>Masters:</strong> {selected.studyMastersField} at {selected.studyMastersUniv} (Expected: {selected.studyMastersYear})
                          </div>
                        )}
                        {selected.studyPhdField && (
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                            <strong>PhD:</strong> {selected.studyPhdField} at {selected.studyPhdUniv} (Expected: {selected.studyPhdYear})
                          </div>
                        )}
                        {selected.studyCertField && (
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                            <strong>Certifications:</strong> {selected.studyCertField} at {selected.studyCertUniv} (Expected: {selected.studyCertYear})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              <Section title="Section 4: Work Experience">
                <div className="grid-responsive-2col">
                  <InfoRow label="Total Experience" value={getWorkExpLabel(selected.totalWorkExp)} />
                  <InfoRow label="Experience at AHRI" value={getWorkExpLabel(selected.totalWorkExpAhri)} />
                </div>
              </Section>

              <Section title="Section 5: Personal Equipment Log">
                {activeInventory.length > 0 ? (
                  <div className="table-responsive-container">
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                          <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)" }}>Equipment Type</th>
                          <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)", width: 80, textAlign: "center" }}>Qty</th>
                          <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)" }}>Brand Name/Model</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInventory.map((item) => (
                          <tr key={item.id}>
                            <td style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)", fontWeight: 600 }}>{item.type}</td>
                            <td style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)", textAlign: "center" }}>{item.quantity}</td>
                            <td style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)" }}>{item.brand || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>No property inventory items registered.</div>
                )}
              </Section>

              {selected.reviewedBy && (
                <Section title="Verification History">
                  <div className="grid-responsive-2col">
                    <InfoRow label="Verified By" value={selected.reviewedBy.displayName ?? selected.reviewedBy.email ?? "System"} />
                    <InfoRow label="Verified On" value={formatDate(selected.reviewedAt)} />
                    {selected.reviewNote && <div style={{ gridColumn: "1 / -1" }}><InfoRow label="Verifier Notes" value={selected.reviewNote} /></div>}
                  </div>
                </Section>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: "16px 22px", marginTop: "50px", borderTop: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: 12, background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
            {selected.approvalStatus === "PENDING" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  <span>Verification Remarks / Notes (Optional)</span>
                  <input
                    value={notes[selected.id] ?? ""}
                    onChange={(e) => setNotes((cur) => ({ ...cur, [selected.id]: e.target.value }))}
                    placeholder="Enter verification notes..."
                    style={{ width: "100%", maxWidth: "400px", height: 34, padding: "0 10px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text)", outline: "none", boxSizing: "border-box" }}
                  />
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleDecision(selected.id, "REJECTED")}
                    disabled={approveMutation.isPending}
                    style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "var(--fs-xs)" }}
                  >
                    ✕ Decline Verification
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(selected.id, "APPROVED")}
                    disabled={approveMutation.isPending}
                    style={{ background: "#059669", color: "white", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "var(--fs-xs)" }}
                  >
                    ✓ Verify & Authorize
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setSelected(null)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer" }}>
                  Close Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 850, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 6 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", gap: 6, alignItems: "start" }}>
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}
