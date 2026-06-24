import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

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
  approvalStatus: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  employmentType?: string | null;
  contractEndDate?: string | null;
  contractRenewalDate?: string | null;
  user?: { displayName?: string | null; email?: string | null };
  reviewedBy?: { displayName?: string | null; email?: string | null } | null;

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
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function formatEmployment(value?: string | null): string {
  if (!value) return "—";
  const found = EMPLOYMENT_TYPES.find(t => t.name === value.toLowerCase());
  if (found) return found.label;
  const v = value.toUpperCase().replace(/[-_\s]/g, "");
  if (v === "CONTRACT" || v === "CONTRACTUAL") return "Contract";
  if (v === "PERMANENT" || v === "FULLTIME" || v === "FULL_TIME") return "Permanent";
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

type SortKey = "name" | "department" | "jobTitle" | "startDate" | "employmentType" | "reviewedAt";
type SortDir = "asc" | "desc";

export default function ApprovedPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Contract" | "Permanent" | "MSc Student">("");
  const [sortKey, setSortKey] = useState<SortKey>("reviewedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const approved = useMemo(() => {
    return (data?.data ?? []).filter((r) => r.approvalStatus === "APPROVED");
  }, [data]);

  const filtered = useMemo(() => {
    let rows = [...approved];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.user?.displayName ?? "").toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.jobTitle.toLowerCase().includes(q) ||
          (r.user?.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterType) {
      rows = rows.filter((r) => formatEmployment(r.employmentType) === filterType);
    }
    rows.sort((a, b) => {
      let va = "";
      let vb = "";
      if (sortKey === "name") { va = a.user?.displayName ?? ""; vb = b.user?.displayName ?? ""; }
      else if (sortKey === "department") { va = a.department; vb = b.department; }
      else if (sortKey === "jobTitle") { va = a.jobTitle; vb = b.jobTitle; }
      else if (sortKey === "startDate") { va = a.startDate ?? ""; vb = b.startDate ?? ""; }
      else if (sortKey === "employmentType") { va = formatEmployment(a.employmentType); vb = formatEmployment(b.employmentType); }
      else if (sortKey === "reviewedAt") { va = a.reviewedAt ?? a.createdAt ?? ""; vb = b.reviewedAt ?? b.createdAt ?? ""; }
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [approved, search, filterType, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ opacity: 0.3, fontSize: 10 }}>⇅</span>;
    return <span style={{ fontSize: 10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const handlePrint = () => {
    if (!selected) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Personnel File — ${selected.user?.displayName ?? "Unknown"}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .subtitle { color: #555; font-size: 14px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; text-align: left; }
      th { background: #f1f5f9; font-weight: 700; }
      td.label { font-weight: 700; width: 35%; background: #f8fafc; }
      .section-title { font-size: 15px; font-weight: 700; margin: 24px 0 8px; border-bottom: 2px solid #334155; padding-bottom: 4px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.03em; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media print { body { padding: 10px; } }
    </style></head><body>${printRef.current?.innerHTML ?? ""}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const handleShare = async () => {
    if (!selected) return;
    const text = `Personnel: ${selected.user?.displayName ?? "Unknown"}\nDepartment: ${selected.department}\nJob Title: ${getPositionLabel(selected.jobTitle)}\nEmployment: ${formatEmployment(selected.employmentType)}\nStart Date: ${formatDate(selected.startDate)}`;
    if (navigator.share) {
      await navigator.share({ title: "Personnel File", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Profile info copied to clipboard!");
    }
  };

  const handleDownloadPdf = () => {
    handlePrint();
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "var(--fs-xs)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-divider)",
    background: sortKey === key ? "rgba(99,102,241,0.05)" : "transparent",
  });

  const cellStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderBottom: "1px solid var(--color-divider)",
  };

  // Process inventory object
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Loading…</div>}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Failed to load personnel data.
        </div>
      )}

      {!selected ? (
        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>Personnel Registry & Files</span>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "#059669", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "2px 10px" }}>
                {filtered.length} {filtered.length === approved.length ? "total" : `of ${approved.length}`}
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-muted)", pointerEvents: "none" }}>🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, dept, role…"
                  style={{ paddingLeft: 28, paddingRight: 8, height: 30, borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text)", outline: "none", width: 200 }}
                />
              </div>

              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{ height: 30, borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text)", padding: "0 8px", cursor: "pointer" }}
              >
                <option value="">All Employment Types</option>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="MSc Student">MSc Student</option>
              </select>

              {(search || filterType) && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setFilterType(""); }}
                  style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", cursor: "pointer" }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "24px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
              {approved.length === 0 ? "No personnel records yet." : "No results match your search or filter."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle("name"), width: "3%", cursor: "default" }}>#</th>
                    <th style={{ ...thStyle("name"), width: "18%" }} onClick={() => toggleSort("name")}>Name {sortIcon("name")}</th>
                    <th style={{ ...thStyle("department"), width: "17%" }} onClick={() => toggleSort("department")}>Department {sortIcon("department")}</th>
                    <th style={{ ...thStyle("jobTitle"), width: "17%" }} onClick={() => toggleSort("jobTitle")}>Function / Job Title {sortIcon("jobTitle")}</th>
                    <th style={{ ...thStyle("startDate"), width: "11%" }} onClick={() => toggleSort("startDate")}>Start Date {sortIcon("startDate")}</th>
                    <th style={{ ...thStyle("employmentType"), width: "11%" }} onClick={() => toggleSort("employmentType")}>Contract Type {sortIcon("employmentType")}</th>
                    <th style={{ ...thStyle("reviewedAt"), width: "11%", cursor: "default" }}>Contract End</th>
                    <th style={{ ...thStyle("reviewedAt"), width: "12%" }} onClick={() => toggleSort("reviewedAt")}>Verified On {sortIcon("reviewedAt")}</th>
                    <th style={{ ...thStyle("name"), width: "8%", cursor: "default" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const empLabel = formatEmployment(row.employmentType);
                    const empColor =
                      empLabel === "Contract" ? { bg: "#fef9c3", text: "#854d0e", border: "#fde047" } :
                        empLabel === "Permanent" ? { bg: "#dcfce7", text: "#166534", border: "#86efac" } :
                          empLabel === "MSc Student" ? { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" } :
                            { bg: "transparent", text: "var(--color-text-muted)", border: "transparent" };
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row)}
                        style={{ cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...cellStyle, textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700, width: "3%" }}>{i + 1}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, width: "18%" }} title={row.user?.displayName ?? "Unknown"}>{row.user?.displayName ?? "Unknown"}</td>
                        <td style={{ ...cellStyle, width: "17%" }} title={row.department}>{row.department}</td>
                        <td style={{ ...cellStyle, width: "17%" }} title={getPositionLabel(row.jobTitle)}>{getPositionLabel(row.jobTitle)}</td>
                        <td style={{ ...cellStyle, width: "11%" }}>{formatDate(row.startDate)}</td>
                        <td style={{ ...cellStyle, width: "11%" }}>
                          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, background: empColor.bg, color: empColor.text, border: `1px solid ${empColor.border}`, borderRadius: 999, padding: "2px 8px" }}>
                            {empLabel}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, width: "11%" }}>{formatDate(row.contractEndDate)}</td>
                        <td style={{ ...cellStyle, width: "12%" }}>{formatDate(row.reviewedAt)}</td>
                        <td style={{ ...cellStyle, width: "8%", textAlign: "center" }}>
                          <span style={{ fontSize: "var(--fs-xs)", color: "#6366f1", fontWeight: 700, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "2px 8px" }}>View</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: "20px 24px" }}>
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
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 999, padding: "3px 12px" }}>✓ VERIFIED</span>
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
                Back to Registry
              </button>
            </div>
          </div>

          {/* Printable wrapper */}
          <div ref={printRef}>
            {/* Hidden print header */}
            <div style={{ display: "none" }} className="print-header">
              <h1 style={{ margin: 0 }}>Personnel File — {selected.user?.displayName ?? "Unknown"}</h1>
              <p className="subtitle">{selected.user?.email ?? ""} · VERIFIED</p>
            </div>

            {/* Details Grid layout: 2 Columns side-by-side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 20 }}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <Section title="Section 1: Personal Details & Contact Information">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <InfoRow label="Full Name" value={selected.user?.displayName ?? "—"} />
                    <InfoRow label="Sex" value={selected.sex ? selected.sex.replace(/^\w/, c => c.toUpperCase()) : "—"} />
                    <InfoRow label="Phone Number" value={selected.phone} />
                    <InfoRow label="Personal Email" value={selected.personalEmail} />
                    <InfoRow label="AHRI Email" value={selected.ahriEmail} />
                    <InfoRow label="Emergency Contact" value={selected.emergencyContact} />
                  </div>
                </Section>

                <Section title="Section 2: Employment & Position details">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <Section title="Section 3: Qualifications & Academic Background">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* First Degree */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Undergraduate/First Degree</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <InfoRow label="Degree & Field" value={selected.firstDegree} />
                        <InfoRow label="University" value={selected.firstDegreeUniv === "other" ? selected.firstDegreeUnivOther : getUniversityLabel(selected.firstDegreeUniv)} />
                        <InfoRow label="Completed Year" value={selected.firstDegreeYear} />
                      </div>
                    </div>

                    {/* Second Degree */}
                    {selected.secondDegree && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Postgraduate/Second Degree</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <InfoRow label="Total Experience" value={getWorkExpLabel(selected.totalWorkExp)} />
                    <InfoRow label="Experience at AHRI" value={getWorkExpLabel(selected.totalWorkExpAhri)} />
                  </div>
                </Section>

                <Section title="Section 5: Personal Equipment Log">
                  {activeInventory.length > 0 ? (
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
                  ) : (
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>No property inventory items registered.</div>
                  )}
                </Section>

                <Section title="Verification & Authorization History">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <InfoRow label="Verified On" value={formatDate(selected.reviewedAt)} />
                    <InfoRow label="Verified By" value={selected.reviewedBy?.displayName ?? selected.reviewedBy?.email ?? "System"} />
                    {selected.reviewNote && <div style={{ gridColumn: "1 / -1" }}><InfoRow label="Verifier Remarks" value={selected.reviewNote} /></div>}
                  </div>
                </Section>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--color-divider)", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
            <ActionBtn onClick={handleShare} color="#6366f1" icon="🔗" label="Share" />
            <ActionBtn onClick={handleDownloadPdf} color="#0f766e" icon="⬇" label="Download PDF" />
            <ActionBtn onClick={handlePrint} color="#1d4ed8" icon="🖨" label="Print" />
            <button type="button" onClick={() => setSelected(null)} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-title" style={{ fontSize: "var(--fs-xs)", fontWeight: 850, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
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

function ActionBtn({ onClick, color, icon, label }: { onClick: () => void; color: string; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}
