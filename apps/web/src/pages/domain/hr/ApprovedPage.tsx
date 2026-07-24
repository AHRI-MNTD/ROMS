import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../api/client";
import logoAhri from "../../../assets/logo_ahri.png";

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
  dutyStation?: string | null;
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
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["hr-employee-approvals"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals");
      return resp.data as { data: ApprovalRow[]; total: number };
    },
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"" | "Contract" | "Permanent" | "MSc Student">("");
  const [sortKey, setSortKey] = useState<SortKey>("reviewedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const printRef = useRef<HTMLDivElement>(null);
  const [printingPersonnel, setPrintingPersonnel] = useState<ApprovalRow | null>(null);
  const [printStatus, setPrintStatus] = useState<"idle" | "printing">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating">("idle");

  // Editing personnel detail state
  const [editingRow, setEditingRow] = useState<ApprovalRow | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Filter out demo users Carol Nzinga and Dr. David Asante as requested
  const approved = useMemo(() => {
    return (data?.data ?? []).filter((r) => {
      if (r.approvalStatus !== "APPROVED") return false;
      const name = (r.user?.displayName ?? "").toLowerCase();
      const email = (r.user?.email ?? "").toLowerCase();
      if (
        name.includes("carol nzinga") ||
        name.includes("david asante") ||
        email === "admin@roms.dev" ||
        email === "pi@roms.dev"
      ) {
        return false;
      }
      return true;
    });
  }, [data]);

  const selected = useMemo(() => {
    if (!idParam || approved.length === 0) return null;
    return approved.find((r) => r.id === idParam) || null;
  }, [idParam, approved]);

  const setSelected = (row: ApprovalRow | null) => {
    if (row) {
      setSearchParams({ id: row.id });
    } else {
      setSearchParams({});
    }
  };

  const handleStartEdit = (e: React.MouseEvent, row: ApprovalRow) => {
    e.stopPropagation();
    setEditingRow(row);
    setEditForm({
      displayName: row.user?.displayName ?? "",
      personalEmail: row.personalEmail ?? "",
      ahriEmail: row.ahriEmail ?? "",
      phone: row.phone ?? "",
      sex: row.sex ?? "male",
      emergencyContact: row.emergencyContact ?? "",
      department: row.department ?? "",
      jobTitle: row.jobTitle ?? "",
      employmentType: row.employmentType ?? "permanent",
      dutyStation: row.dutyStation ?? "",
      startDate: row.startDate ? new Date(row.startDate).toISOString().slice(0, 10) : "",
      contractEndDate: row.contractEndDate ? new Date(row.contractEndDate).toISOString().slice(0, 10) : "",
      mntdProject: row.mntdProject ?? "",
      mntdTeams: row.mntdTeams ?? [],
      mntdProjectsInvolved: row.mntdProjectsInvolved ?? [],
      firstDegree: row.firstDegree ?? "",
      firstDegreeUniv: row.firstDegreeUniv ?? "",
      firstDegreeUnivOther: row.firstDegreeUnivOther ?? "",
      firstDegreeYear: row.firstDegreeYear ?? "",
      secondDegree: row.secondDegree ?? "",
      secondDegreeUniv: row.secondDegreeUniv ?? "",
      secondDegreeUnivOther: row.secondDegreeUnivOther ?? "",
      secondDegreeYear: row.secondDegreeYear ?? "",
      thirdDegree: row.thirdDegree ?? "",
      thirdDegreeUnivCountry: row.thirdDegreeUnivCountry ?? "",
      thirdDegreeYear: row.thirdDegreeYear ?? "",
      currentlyStudying: Boolean(row.currentlyStudying),
      studyMastersField: row.studyMastersField ?? "",
      studyMastersUniv: row.studyMastersUniv ?? "",
      studyMastersYear: row.studyMastersYear ?? "",
      studyPhdField: row.studyPhdField ?? "",
      studyPhdUniv: row.studyPhdUniv ?? "",
      studyPhdYear: row.studyPhdYear ?? "",
      studyCertField: row.studyCertField ?? "",
      studyCertUniv: row.studyCertUniv ?? "",
      studyCertYear: row.studyCertYear ?? "",
      totalWorkExp: row.totalWorkExp ?? "",
      totalWorkExpAhri: row.totalWorkExpAhri ?? "",
    });
    setSaveStatus("idle");
    setSaveErrorMsg("");
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!editingRow) return;
      const resp = await apiClient.patch(`/domains/hr/staff/${editingRow.id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-approvals"] });
      setSaveStatus("success");
      setTimeout(() => {
        setEditingRow(null);
        setSaveStatus("idle");
      }, 1000);
    },
    onError: (err: any) => {
      setSaveStatus("error");
      setSaveErrorMsg(err?.response?.data?.message || err?.message || "Failed to save personnel changes.");
    },
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    updateMutation.mutate(editForm);
  };

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
    const originalTitle = document.title;
    document.title = `Personnel_Profile_Report_${(selected.user?.displayName ?? "Record").replace(/\s+/g, "_")}`;
    setPrintingPersonnel(selected);
    setPrintStatus("printing");
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setPrintingPersonnel(null);
      setPrintStatus("idle");
    }, 400);
  };

  const handleDownloadPdf = () => {
    if (!selected) return;
    const originalTitle = document.title;
    document.title = `Personnel_PDF_Report_${(selected.user?.displayName ?? "Record").replace(/\s+/g, "_")}`;
    setPrintingPersonnel(selected);
    setPdfStatus("generating");
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setPrintingPersonnel(null);
      setPdfStatus("idle");
    }, 400);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "6px 8px",
    textAlign: "left",
    fontSize: "10px",
    color: sortKey === key ? "var(--color-primary)" : "var(--color-text-muted)",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-divider)",
    background: sortKey === key ? "var(--color-primary-highlight)" : "transparent",
  });

  const cellStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: "10px",
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    fontSize: "12px",
    borderRadius: 6,
    border: "1px solid var(--color-divider)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-text-muted)",
    marginBottom: 3,
    display: "block",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading && <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>Loading…</div>}
      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Failed to load personnel data.
        </div>
      )}

      {/* ── EDIT MODE FORM VIEW ── */}
      {editingRow ? (
        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", padding: "20px 24px" }}>
          {/* Edit Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--color-divider)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(234, 179, 8, 0.15)", border: "2px solid #eab308", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                ✏️
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>
                  Edit Personnel Detail — {editingRow.user?.displayName ?? "Personnel"}
                </div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                  Update employee profile information and save changes to the database.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                style={{
                  padding: "6px 14px",
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

          {/* Edit Alert Status */}
          {saveStatus === "success" && (
            <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontSize: "12px", fontWeight: 700, marginBottom: 16 }}>
              ✓ Personnel details updated successfully!
            </div>
          )}

          {saveStatus === "error" && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#991b1b", fontSize: "12px", fontWeight: 600, marginBottom: 16 }}>
              ⚠️ {saveErrorMsg}
            </div>
          )}

          <form onSubmit={handleSaveEdit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Section 1: Personal Info */}
              <Section title="Section 1: Personal Details & Contact Information">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Sex</label>
                    <select
                      value={editForm.sex}
                      onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Personal Email</label>
                    <input
                      type="email"
                      value={editForm.personalEmail}
                      onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>AHRI Email</label>
                    <input
                      type="email"
                      value={editForm.ahriEmail}
                      onChange={(e) => setEditForm({ ...editForm, ahriEmail: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Emergency Contact</label>
                    <input
                      type="text"
                      value={editForm.emergencyContact}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </Section>

              {/* Section 2: Employment & Position */}
              <Section title="Section 2: Employment & Position Details">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Position / Job Title</label>
                    <select
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                      style={inputStyle}
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos.name} value={pos.name}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Employment Type</label>
                    <select
                      value={editForm.employmentType}
                      onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                      style={inputStyle}
                    >
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Duty Station</label>
                    <input
                      type="text"
                      value={editForm.dutyStation}
                      onChange={(e) => setEditForm({ ...editForm, dutyStation: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>AHRI Start Date</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  {editForm.employmentType === "contract" && (
                    <div>
                      <label style={labelStyle}>Contract End Date</label>
                      <input
                        type="date"
                        value={editForm.contractEndDate}
                        onChange={(e) => setEditForm({ ...editForm, contractEndDate: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Hired Project</label>
                    <select
                      value={editForm.mntdProject}
                      onChange={(e) => setEditForm({ ...editForm, mntdProject: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select Project…</option>
                      {MNTD_HIRED_PROJECTS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teams & Projects Selection */}
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>MNTD Teams (Select all that apply)</label>
                    <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--color-divider)", borderRadius: 6, padding: 8, background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {MNTD_TEAMS.map((t) => {
                        const isChecked = editForm.mntdTeams?.includes(t.name);
                        return (
                          <label key={t.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11px", color: "var(--color-text)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = editForm.mntdTeams || [];
                                const updated = e.target.checked
                                  ? [...current, t.name]
                                  : current.filter((x: string) => x !== t.name);
                                setEditForm({ ...editForm, mntdTeams: updated });
                              }}
                            />
                            {t.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Projects Involved (Select all that apply)</label>
                    <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--color-divider)", borderRadius: 6, padding: 8, background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {MNTD_PROJECTS.map((p) => {
                        const isChecked = editForm.mntdProjectsInvolved?.includes(p.name);
                        return (
                          <label key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11px", color: "var(--color-text)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = editForm.mntdProjectsInvolved || [];
                                const updated = e.target.checked
                                  ? [...current, p.name]
                                  : current.filter((x: string) => x !== p.name);
                                setEditForm({ ...editForm, mntdProjectsInvolved: updated });
                              }}
                            />
                            {p.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 3: Academic Background */}
              <Section title="Section 3: Academic Background & Qualifications">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Undergraduate/First Degree</label>
                    <input
                      type="text"
                      value={editForm.firstDegree}
                      onChange={(e) => setEditForm({ ...editForm, firstDegree: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>University</label>
                    <select
                      value={editForm.firstDegreeUniv}
                      onChange={(e) => setEditForm({ ...editForm, firstDegreeUniv: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select University…</option>
                      {UNIVERSITIES.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Completion Year</label>
                    <input
                      type="text"
                      value={editForm.firstDegreeYear}
                      onChange={(e) => setEditForm({ ...editForm, firstDegreeYear: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Second Degree (Master's)</label>
                    <input
                      type="text"
                      value={editForm.secondDegree}
                      onChange={(e) => setEditForm({ ...editForm, secondDegree: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>University (Master's)</label>
                    <select
                      value={editForm.secondDegreeUniv}
                      onChange={(e) => setEditForm({ ...editForm, secondDegreeUniv: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select University…</option>
                      {UNIVERSITIES.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Completion Year (Master's)</label>
                    <input
                      type="text"
                      value={editForm.secondDegreeYear}
                      onChange={(e) => setEditForm({ ...editForm, secondDegreeYear: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Third Degree (PhD)</label>
                    <input
                      type="text"
                      value={editForm.thirdDegree}
                      onChange={(e) => setEditForm({ ...editForm, thirdDegree: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>PhD University & Country</label>
                    <input
                      type="text"
                      value={editForm.thirdDegreeUnivCountry}
                      onChange={(e) => setEditForm({ ...editForm, thirdDegreeUnivCountry: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Completion Year (PhD)</label>
                    <input
                      type="text"
                      value={editForm.thirdDegreeYear}
                      onChange={(e) => setEditForm({ ...editForm, thirdDegreeYear: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </Section>

              {/* Section 4: Work Experience */}
              <Section title="Section 4: Work Experience">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Total Work Experience</label>
                    <select
                      value={editForm.totalWorkExp}
                      onChange={(e) => setEditForm({ ...editForm, totalWorkExp: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select Experience…</option>
                      {WORK_EXP_OPTIONS.map((w) => (
                        <option key={w.name} value={w.name}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Experience at AHRI</label>
                    <select
                      value={editForm.totalWorkExpAhri}
                      onChange={(e) => setEditForm({ ...editForm, totalWorkExpAhri: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select Experience…</option>
                      {WORK_EXP_OPTIONS.map((w) => (
                        <option key={w.name} value={w.name}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Section>
            </div>

            {/* Save Buttons Bar */}
            <div style={{ marginTop: 24, padding: "14px 20px", borderTop: "1px solid var(--color-divider)", display: "flex", gap: 12, justifyContent: "flex-end", background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--color-divider)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                style={{
                  padding: "8px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: saveStatus === "saving" ? 0.7 : 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                }}
              >
                {saveStatus === "saving" ? "⏳ Saving Changes…" : "💾 Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : !selected ? (
        <div style={{ borderRadius: 18, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>Personnel Registry & Files</span>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-primary)", background: "var(--color-primary-highlight)", border: "1px solid var(--color-border)", borderRadius: 999, padding: "2px 10px" }}>
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
            <div className="table-responsive-container">
              <table style={{ width: "100%", minWidth: "820px", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle("name"), width: "4%", cursor: "default" }}>#</th>
                    <th style={{ ...thStyle("name"), width: "20%" }} onClick={() => toggleSort("name")}>Name {sortIcon("name")}</th>
                    <th style={{ ...thStyle("department"), width: "19%" }} onClick={() => toggleSort("department")}>Department {sortIcon("department")}</th>
                    <th style={{ ...thStyle("jobTitle"), width: "18%" }} onClick={() => toggleSort("jobTitle")}>Function / Job Title {sortIcon("jobTitle")}</th>
                    <th style={{ ...thStyle("startDate"), width: "11%" }} onClick={() => toggleSort("startDate")}>Start Date {sortIcon("startDate")}</th>
                    <th style={{ ...thStyle("employmentType"), width: "10%" }} onClick={() => toggleSort("employmentType")}>Contract Type {sortIcon("employmentType")}</th>
                    <th style={{ ...thStyle("reviewedAt"), width: "10%", cursor: "default" }}>Contract End</th>
                    <th style={{ ...thStyle("name"), width: "8%", cursor: "default", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const empLabel = formatEmployment(row.employmentType);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row)}
                        style={{ cursor: "pointer", transition: "background 0.15s", height: 34 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--color-primary) 15%, transparent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...cellStyle, textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700, width: "4%" }}>{i + 1}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, width: "20%" }} title={row.user?.displayName ?? "Unknown"}>{row.user?.displayName ?? "Unknown"}</td>
                        <td style={{ ...cellStyle, width: "19%" }} title={row.department}>{row.department}</td>
                        <td style={{ ...cellStyle, width: "18%" }} title={getPositionLabel(row.jobTitle)}>{getPositionLabel(row.jobTitle)}</td>
                        <td style={{ ...cellStyle, width: "11%" }}>{formatDate(row.startDate)}</td>
                        <td style={{ ...cellStyle, width: "10%" }}>
                          {empLabel}
                        </td>
                        <td style={{ ...cellStyle, width: "10%" }}>{formatDate(row.contractEndDate)}</td>
                        <td style={{ ...cellStyle, width: "8%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => setSelected(row)}
                              title="View personnel file"
                              style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", border: "1px solid var(--color-border)", borderRadius: 6, width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-primary)", fontSize: 12 }}
                            >👁</button>
                            <button
                              type="button"
                              onClick={(e) => handleStartEdit(e, row)}
                              title="Edit personnel detail"
                              style={{ background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: 6, width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b45309", fontSize: 12 }}
                            >✏️</button>
                          </div>
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
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary-highlight)", border: "2px solid var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "var(--color-primary)", flexShrink: 0 }}>
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
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: "var(--color-primary-highlight)", color: "var(--color-primary)", border: "1px solid var(--color-border)", borderRadius: 999, padding: "3px 12px" }}>✓ VERIFIED</span>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{formatEmployment(selected.employmentType)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={(e) => handleStartEdit(e, selected)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(234, 179, 8, 0.4)",
                  background: "rgba(234, 179, 8, 0.15)",
                  color: "#b45309",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                ✏️ Edit Profile
              </button>
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
                    <InfoRow label="Duty Station" value={selected.dutyStation} />
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
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Section title="Section 3: Qualifications & Academic Background">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

                <Section title="Verification & Authorization History">
                  <div className="grid-responsive-2col">
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
            <ActionBtn
              onClick={handleDownloadPdf}
              isPending={pdfStatus === "generating"}
              icon={pdfStatus === "generating" ? "⏳" : "⬇"}
              label={pdfStatus === "generating" ? "Generating..." : "Download PDF"}
              disabled={pdfStatus === "generating"}
            />
            <ActionBtn
              onClick={handlePrint}
              isPending={printStatus === "printing"}
              icon={printStatus === "printing" ? "⏳" : "🖨"}
              label={printStatus === "printing" ? "Printing..." : "Print"}
              disabled={printStatus === "printing"}
            />
          </div>
        </div>
      )}

      {/* PRINT-ONLY PORTAL AREA */}
      {printingPersonnel && createPortal(
        <div id="hr-personnel-print-area">
          {/* Institutional Letterhead */}
          <div className="letterhead">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={logoAhri} style={{ height: "45px" }} alt="AHRI Logo" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="letterhead-logo">AHRI</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Armauer Hansen Research Institute</span>
              </div>
            </div>
            <div className="letterhead-dept">
              Department of Human Resources
            </div>
          </div>

          <div className="doc-title-container">
            <h1 className="doc-title">Personnel Profile Report</h1>
            <p className="doc-subtitle">Confidential Personnel Record Summary</p>
          </div>

          {/* Document Metadata */}
          <div className="metadata-summary">
            <div className="metadata-item">
              <span className="metadata-label">Personnel Name</span>
              <span className="metadata-value">{printingPersonnel.user?.displayName ?? "Unknown"}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Department</span>
              <span className="metadata-value">{printingPersonnel.department}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Verification Status</span>
              <span className="metadata-value" style={{ color: "#166534" }}>✓ VERIFIED</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Report Date</span>
              <span className="metadata-value">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>

          {/* Details Vertical Layout */}
          <div className="details-vertical">
            <Section title="Section 1: Personal Details & Contact Information">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <InfoRow label="Full Name" value={printingPersonnel.user?.displayName ?? "—"} />
                <InfoRow label="Sex" value={printingPersonnel.sex ? printingPersonnel.sex.replace(/^\w/, c => c.toUpperCase()) : "—"} />
                <InfoRow label="Phone Number" value={printingPersonnel.phone} />
                <InfoRow label="Personal Email" value={printingPersonnel.personalEmail} />
                <InfoRow label="AHRI Email" value={printingPersonnel.ahriEmail} />
                <InfoRow label="Emergency Contact" value={printingPersonnel.emergencyContact} />
              </div>
            </Section>

            <Section title="Section 2: Employment & Position details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <InfoRow label="Department" value={printingPersonnel.department} />
                <InfoRow label="Current Position" value={getPositionLabel(printingPersonnel.jobTitle)} />
                <InfoRow label="Employment Type" value={formatEmployment(printingPersonnel.employmentType)} />
                <InfoRow label="AHRI Start Date" value={formatDate(printingPersonnel.startDate)} />
                {printingPersonnel.employmentType === "contract" && (
                  <>
                    <InfoRow label="Contract End Date" value={formatDate(printingPersonnel.contractEndDate)} />
                    <InfoRow label="Hired Project" value={getHiredProjectLabel(printingPersonnel.mntdProject)} />
                  </>
                )}
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                <InfoRow
                  label="MNTD Teams"
                  value={printingPersonnel.mntdTeams && printingPersonnel.mntdTeams.length > 0
                    ? printingPersonnel.mntdTeams.map(t => getTeamLabel(t)).join(", ")
                    : "—"}
                />
                <InfoRow
                  label="Projects Involved"
                  value={printingPersonnel.mntdProjectsInvolved && printingPersonnel.mntdProjectsInvolved.length > 0
                    ? printingPersonnel.mntdProjectsInvolved.map(p => getProjectLabel(p)).join(", ")
                    : "—"}
                />
              </div>
            </Section>

            <Section title="Section 3: Qualifications & Academic Background">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* First Degree */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Undergraduate/First Degree</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <InfoRow label="Degree & Field" value={printingPersonnel.firstDegree} />
                    <InfoRow label="University" value={printingPersonnel.firstDegreeUniv === "other" ? printingPersonnel.firstDegreeUnivOther : getUniversityLabel(printingPersonnel.firstDegreeUniv)} />
                    <InfoRow label="Completed Year" value={printingPersonnel.firstDegreeYear} />
                  </div>
                </div>

                {/* Second Degree */}
                {printingPersonnel.secondDegree && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Postgraduate/Second Degree</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <InfoRow label="Degree & Field" value={printingPersonnel.secondDegree} />
                      <InfoRow label="University" value={printingPersonnel.secondDegreeUniv === "other" ? printingPersonnel.secondDegreeUnivOther : getUniversityLabel(printingPersonnel.secondDegreeUniv)} />
                      <InfoRow label="Completed Year" value={printingPersonnel.secondDegreeYear} />
                    </div>
                  </div>
                )}

                {/* Third Degree */}
                {printingPersonnel.thirdDegree && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Postgraduate/Third Degree (PhD)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <InfoRow label="PhD & Field" value={printingPersonnel.thirdDegree} />
                      <InfoRow label="University & Country" value={printingPersonnel.thirdDegreeUnivCountry} />
                      <InfoRow label="Completed Year" value={printingPersonnel.thirdDegreeYear} />
                    </div>
                  </div>
                )}

                {/* Currently Studying */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px dashed var(--color-divider)", paddingBottom: 2, marginBottom: 4 }}>Current Study Status</div>
                  <InfoRow label="Currently Studying?" value={printingPersonnel.currentlyStudying ? "Yes" : "No"} />

                  {printingPersonnel.currentlyStudying && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, paddingLeft: 10, borderLeft: "2px solid var(--color-border)" }}>
                      {printingPersonnel.studyMastersField && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                          <strong>Masters:</strong> {printingPersonnel.studyMastersField} at {printingPersonnel.studyMastersUniv} (Expected: {printingPersonnel.studyMastersYear})
                        </div>
                      )}
                      {printingPersonnel.studyPhdField && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                          <strong>PhD:</strong> {printingPersonnel.studyPhdField} at {printingPersonnel.studyPhdUniv} (Expected: {printingPersonnel.studyPhdYear})
                        </div>
                      )}
                      {printingPersonnel.studyCertField && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text)" }}>
                          <strong>Certifications:</strong> {printingPersonnel.studyCertField} at {printingPersonnel.studyCertUniv} (Expected: {printingPersonnel.studyCertYear})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Section 4: Work Experience">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <InfoRow label="Total Experience" value={getWorkExpLabel(printingPersonnel.totalWorkExp)} />
                <InfoRow label="Experience at AHRI" value={getWorkExpLabel(printingPersonnel.totalWorkExpAhri)} />
              </div>
            </Section>

            {/* Property Inventory Table */}
            <Section title="Section 5: Personal Equipment Log">
              {(() => {
                let invItems: any[] = [];
                if (printingPersonnel.propertyInventory) {
                  try {
                    invItems = typeof printingPersonnel.propertyInventory === "string"
                      ? JSON.parse(printingPersonnel.propertyInventory)
                      : printingPersonnel.propertyInventory;
                  } catch (e) { }
                }
                return invItems.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                        <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)" }}>Equipment Type</th>
                        <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)", width: 80, textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--color-divider)" }}>Brand Name/Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invItems.map((item: any) => (
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
                );
              })()}
            </Section>

            <Section title="Verification & Authorization History">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <InfoRow label="Verified On" value={formatDate(printingPersonnel.reviewedAt)} />
                <InfoRow label="Verified By" value={printingPersonnel.reviewedBy?.displayName ?? printingPersonnel.reviewedBy?.email ?? "System"} />
                {printingPersonnel.reviewNote && <div style={{ gridColumn: "1 / -1" }}><InfoRow label="Verifier Remarks" value={printingPersonnel.reviewNote} /></div>}
              </div>
            </Section>
          </div>

          {/* Formal Signatures */}
          <div className="signature-section">
            <div className="signature-box">
              <strong>Employee Signature</strong><br />
              Date: ________________________
            </div>
            <div className="signature-box">
              <strong>Authorized HR Representative</strong><br />
              Date: ________________________
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PRINT MEDIA STYLES */}
      <style>{`
        @media print {
          #root { display: none !important; }
          body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          #hr-personnel-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            color: #0f172a !important;
          }
          
          #hr-personnel-print-area .letterhead {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12px !important;
            margin-bottom: 24px !important;
          }
          #hr-personnel-print-area .letterhead-logo {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #1e3a8a !important;
            text-transform: uppercase !important;
          }
          #hr-personnel-print-area .letterhead-dept {
            font-size: 10px !important;
            font-weight: 700 !important;
            text-align: right !important;
            color: #475569 !important;
            text-transform: uppercase !important;
          }
          #hr-personnel-print-area .doc-title-container {
            text-align: center !important;
            margin-bottom: 24px !important;
          }
          #hr-personnel-print-area .doc-title {
            font-size: 18px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            margin: 0 !important;
          }
          #hr-personnel-print-area .doc-subtitle {
            font-size: 12px !important;
            color: #475569 !important;
            margin: 4px 0 0 !important;
          }
          #hr-personnel-print-area .metadata-summary {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            margin-bottom: 30px !important;
          }
          #hr-personnel-print-area .metadata-item {
            display: flex !important;
            flex-direction: column !important;
          }
          #hr-personnel-print-area .metadata-label {
            font-size: 9px !important;
            font-weight: 700 !important;
            color: #64748b !important;
            text-transform: uppercase !important;
          }
          #hr-personnel-print-area .metadata-value {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #0f172a !important;
          }
          #hr-personnel-print-area .details-vertical {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
          }
          #hr-personnel-print-area .section-container {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
          #hr-personnel-print-area .section-title {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #1e3a8a !important;
            text-transform: uppercase !important;
            border-bottom: 1.5px solid #1e3a8a !important;
            padding-bottom: 4px !important;
            margin-bottom: 12px !important;
          }
          #hr-personnel-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 8px !important;
          }
          #hr-personnel-print-area th {
            background: #f1f5f9 !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            padding: 6px 10px !important;
            border: 1px solid #e2e8f0 !important;
          }
          #hr-personnel-print-area td {
            padding: 6px 10px !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 11px !important;
            color: #0f172a !important;
          }
          #hr-personnel-print-area .signature-section {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 60px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #hr-personnel-print-area .signature-box {
            width: 42% !important;
            border-top: 1px solid #94a3b8 !important;
            padding-top: 8px !important;
            text-align: center !important;
            font-size: 11px !important;
            color: #475569 !important;
          }
          @page {
            size: portrait;
            margin: 0.6in 0.8in 0.8in 0.8in;
          }
        }

        #hr-personnel-print-area { display: none; }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section-container">
      <div className="section-title" style={{ fontSize: "10px", fontWeight: 850, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
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

function ActionBtn({ onClick, isPending, icon, label, disabled }: { onClick: () => void; isPending?: boolean; icon: string; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 14px",
        borderRadius: 10,
        border: "1px solid var(--color-primary)",
        background: isPending ? "var(--color-primary-highlight)" : "var(--color-primary)",
        color: isPending ? "var(--color-primary)" : "#fff",
        fontSize: "var(--fs-xs)",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.7 : 1,
        transition: "all 0.2s ease"
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}
