import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";

const DEPARTMENTS = [
  "Research & Development",
  "Laboratory Operations",
  "Clinical Affairs",
  "Data Management",
  "Finance & Administration",
  "Human Resources",
  "IT & Systems",
  "Regulatory Affairs",
  "Quality Management",
  "Field Operations",
  "Communications & Outreach",
  "Other",
];

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
  { name: "Project_Management/Coordination", label: "Project Management/Coordination" },
  { name: "Team_Leader", label: "Team Leader" },
  { name: "Laboratory_Team", label: "Laboratory Team" },
  { name: "Field_Team", label: "Field Team" },
  { name: "Entomology_Team", label: "Entomology Team" },
  { name: "Data_Team", label: "Data Team" },
  { name: "Social_Science_Team", label: "Social Science Team" },
  { name: "Health_Economics_Team", label: "Health Economics Team" },
  { name: "logistics_finance_team", label: "Logistics/Finance Team" },
  { name: "Leadership", label: "Leadership (Division Head & Principal Investigators)" }
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

const PROPERTY_ITEMS = [
  { id: "it_desktop_computer", label: "IT - Desktop Computer" },
  { id: "it_laptop_computer", label: "IT - Laptop Computer" },
  { id: "it_computer_screen", label: "IT - Computer Screen" },
  { id: "portable_device_tablet", label: "Portable Device - Tablet" },
  { id: "portable_device_external_hard_drive", label: "Portable Device - External Hard Drive" },
  { id: "portable_device_wi_fi", label: "Portable Device - Wi-Fi" },
  { id: "portable_device_gps", label: "Portable Device - GPS" },
  { id: "office_photocopy_printer_scanner_1", label: "Office - Photocopier/Printer/Scanner" },
  { id: "laboratory_equipment_instruments", label: "Laboratory - Equipment/Instruments" },
  { id: "field_equipment_instruments", label: "Field - Equipment/Instruments" }
];

type FormData = {
  fullName: string;
  sex: string;
  phone: string;
  personalEmail: string;
  ahriEmail: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;

  department: string;
  jobTitle: string;
  startDate: string;
  employmentType: string;
  contractEndDate: string;
  mntdProject: string;
  mntdTeams: string[];
  mntdProjectsInvolved: string[];

  firstDegree: string;
  firstDegreeUniv: string;
  firstDegreeUnivOther: string;
  firstDegreeYear: string;

  secondDegree: string;
  secondDegreeUniv: string;
  secondDegreeUnivOther: string;
  secondDegreeYear: string;

  thirdDegree: string;
  thirdDegreeUnivCountry: string;
  thirdDegreeYear: string;

  currentlyStudying: string;
  studyMastersField: string;
  studyMastersUniv: string;
  studyMastersYear: string;
  studyPhdField: string;
  studyPhdUniv: string;
  studyPhdYear: string;
  studyCertField: string;
  studyCertUniv: string;
  studyCertYear: string;

  totalWorkExp: string;
  totalWorkExpAhri: string;

  propertyInventory: Record<string, { quantity: number; brand: string }>;
};

const emptyForm = (): FormData => {
  const inventory: Record<string, { quantity: number; brand: string }> = {};
  PROPERTY_ITEMS.forEach(item => {
    inventory[item.id] = { quantity: 0, brand: "" };
  });

  return {
    fullName: "",
    sex: "",
    phone: "",
    personalEmail: "",
    ahriEmail: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    department: "",
    jobTitle: "",
    startDate: "",
    employmentType: "",
    contractEndDate: "",
    mntdProject: "",
    mntdTeams: [],
    mntdProjectsInvolved: [],
    firstDegree: "",
    firstDegreeUniv: "",
    firstDegreeUnivOther: "",
    firstDegreeYear: "",
    secondDegree: "",
    secondDegreeUniv: "",
    secondDegreeUnivOther: "",
    secondDegreeYear: "",
    thirdDegree: "",
    thirdDegreeUnivCountry: "",
    thirdDegreeYear: "",
    currentlyStudying: "",
    studyMastersField: "",
    studyMastersUniv: "",
    studyMastersYear: "",
    studyPhdField: "",
    studyPhdUniv: "",
    studyPhdYear: "",
    studyCertField: "",
    studyCertUniv: "",
    studyCertYear: "",
    totalWorkExp: "",
    totalWorkExpAhri: "",
    propertyInventory: inventory
  };
};

type Status = "idle" | "success" | "error";

export default function TrainingRecordsPage() {
  const user = useAuth((s) => s.user);
  const [form, setForm] = useState<FormData>(() => {
    const f = emptyForm();
    if (user?.displayName) f.fullName = user.displayName;
    if (user?.email) f.personalEmail = user.email;
    return f;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [apiError, setApiError] = useState<string>("");

  useEffect(() => {
    if (user) {
      setForm((f) => {
        const updates: Partial<FormData> = {};
        if (!f.fullName && user.displayName) {
          updates.fullName = user.displayName;
        }
        if (!f.personalEmail && user.email) {
          updates.personalEmail = user.email;
        }
        if (Object.keys(updates).length > 0) {
          return { ...f, ...updates };
        }
        return f;
      });
    }
  }, [user]);

  useEffect(() => {
    if (status === "success") {
      const element = document.getElementById("success-notification");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [status]);

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const resp = await apiClient.post("/domains/hr/staff", body);
      return resp.data;
    },
    onSuccess: () => {
      setStatus("success");
      setForm(emptyForm());
      setErrors({});
    },
    onError: (err: any) => {
      setStatus("error");
      const respData = err?.response?.data;
      let msg = "Registration failed. Please try again.";
      if (respData?.message) {
        msg = respData.message;
      } else if (respData?.errors) {
        msg = JSON.stringify(respData.errors);
      } else if (respData?.code) {
        msg = respData.code;
      }
      setApiError(msg);
    },
  });

  const handleChange = (key: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: "" }));
    if (status !== "idle") setStatus("idle");
  };

  const handleInventoryChange = (itemId: string, field: "quantity" | "brand", value: any) => {
    setForm((f) => ({
      ...f,
      propertyInventory: {
        ...f.propertyInventory,
        [itemId]: {
          ...f.propertyInventory[itemId],
          [field]: value
        }
      }
    }));
    if (status !== "idle") setStatus("idle");
  };

  const handleCheckboxChange = (key: "mntdTeams" | "mntdProjectsInvolved", item: string, checked: boolean) => {
    const list = [...form[key]];
    if (checked) {
      if (!list.includes(item)) list.push(item);
    } else {
      const idx = list.indexOf(item);
      if (idx !== -1) list.splice(idx, 1);
    }
    handleChange(key, list);
  };

  const validate = (): { isValid: boolean; errorKeys: string[] } => {
    const e: Record<string, string> = {};
    
    // Personal Info
    if (!form.fullName.trim()) {
      e.fullName = "Full name is required.";
    } else {
      const parts = form.fullName.trim().split(/\s+/);
      if (parts.length < 3) {
        e.fullName = "Please enter First Name, Father's Name and Grand Father's Name (at least 3 words).";
      }
    }
    if (!form.sex) e.sex = "Sex is required.";
    
    if (!form.phone.trim()) {
      e.phone = "Phone number is required.";
    } else if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      e.phone = "Phone number must be exactly 10 digits (e.g. 09xxxxxxxx).";
    }

    if (!form.personalEmail.trim()) {
      e.personalEmail = "Personal Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personalEmail.trim())) {
      e.personalEmail = "Please enter a valid email address.";
    }

    if (form.ahriEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ahriEmail.trim())) {
      e.ahriEmail = "Please enter a valid AHRI email address.";
    }

    if (!form.emergencyContactName.trim()) e.emergencyContactName = "Emergency contact name is required.";
    if (!form.emergencyContactRelationship.trim()) e.emergencyContactRelationship = "Relationship is required.";
    if (!form.emergencyContactPhone.trim()) {
      e.emergencyContactPhone = "Emergency contact phone number is required.";
    } else if (!/^[0-9]{10}$/.test(form.emergencyContactPhone.trim())) {
      e.emergencyContactPhone = "Phone number must be exactly 10 digits (e.g. 09xxxxxxxx).";
    }

    // Employment
    if (!form.department) e.department = "Department is required.";
    if (!form.jobTitle) e.jobTitle = "Job title is required.";
    if (!form.startDate) e.startDate = "Start Date is required.";
    if (!form.employmentType) e.employmentType = "Employment type is required.";
    
    if (form.employmentType === "contract") {
      if (!form.contractEndDate) e.contractEndDate = "Contract End Date is required.";
      if (!form.mntdProject) e.mntdProject = "MNTD Project is required.";
    }

    if (form.mntdTeams.length === 0) e.mntdTeams = "Please select at least one applicable team.";
    if (form.mntdProjectsInvolved.length === 0) e.mntdProjectsInvolved = "Please select at least one project.";

    // Education
    if (!form.firstDegree.trim()) e.firstDegree = "First Degree details are required.";
    if (!form.firstDegreeUniv) e.firstDegreeUniv = "First Degree University is required.";
    if (form.firstDegreeUniv === "other" && !form.firstDegreeUnivOther.trim()) {
      e.firstDegreeUnivOther = "Please specify university name and country.";
    }
    if (!form.firstDegreeYear) e.firstDegreeYear = "First Degree Completion Year is required.";

    if (form.secondDegreeUniv === "other" && !form.secondDegreeUnivOther.trim()) {
      e.secondDegreeUnivOther = "Please specify university name and country.";
    }

    if (!form.currentlyStudying) e.currentlyStudying = "Please select study status.";

    if (form.currentlyStudying === "yes") {
      const mastersOk = form.studyMastersField.trim() && form.studyMastersUniv.trim() && form.studyMastersYear.trim();
      const phdOk = form.studyPhdField.trim() && form.studyPhdUniv.trim() && form.studyPhdYear.trim();
      const certOk = form.studyCertField.trim() && form.studyCertUniv.trim() && form.studyCertYear.trim();
      
      if (!mastersOk && !phdOk && !certOk) {
        e.currentlyStudying = "Please complete study details for at least one program (Masters, PhD or Certifications).";
      }
    }

    // Work Experience
    if (!form.totalWorkExp) e.totalWorkExp = "Total work experience selection is required.";
    if (!form.totalWorkExpAhri) e.totalWorkExpAhri = "Total work experience at AHRI selection is required.";

    setErrors(e);
    return {
      isValid: Object.keys(e).length === 0,
      errorKeys: Object.keys(e)
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setStatus("error"); setApiError("You must be logged in to register."); return; }
    
    const { isValid, errorKeys } = validate();
    if (!isValid) {
      const firstErr = errorKeys[0];
      if (firstErr) {
        setApiError("Form contains validation errors. Please scroll up and fix them.");
        setStatus("error");
        
        setTimeout(() => {
          const element = document.getElementById(firstErr);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const inputElement = element.querySelector("input, select, textarea") || element;
            if (
              inputElement instanceof HTMLInputElement ||
              inputElement instanceof HTMLSelectElement ||
              inputElement instanceof HTMLTextAreaElement
            ) {
              inputElement.focus();
            }
          }
        }, 50);
      }
      return;
    }

    // Prepare payload
    const payload: Record<string, any> = {
      userId: user.id,
      department: form.department,
      jobTitle: form.jobTitle,
      startDate: new Date(form.startDate),
      employmentType: form.employmentType,
      contractEndDate: form.contractEndDate ? new Date(form.contractEndDate) : null,
      
      phone: form.phone.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactRelationship: form.emergencyContactRelationship.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
      sex: form.sex,
      personalEmail: form.personalEmail.trim(),
      ahriEmail: form.ahriEmail.trim() || null,
      mntdProject: form.mntdProject || null,
      mntdTeams: form.mntdTeams,
      mntdProjectsInvolved: form.mntdProjectsInvolved,
      
      firstDegree: form.firstDegree.trim(),
      firstDegreeUniv: form.firstDegreeUniv,
      firstDegreeUnivOther: form.firstDegreeUniv === "other" ? form.firstDegreeUnivOther.trim() : null,
      firstDegreeYear: form.firstDegreeYear,
      
      secondDegree: form.secondDegree.trim() || null,
      secondDegreeUniv: form.secondDegreeUniv || null,
      secondDegreeUnivOther: form.secondDegreeUniv === "other" ? form.secondDegreeUnivOther.trim() : null,
      secondDegreeYear: form.secondDegreeYear || null,
      
      thirdDegree: form.thirdDegree.trim() || null,
      thirdDegreeUnivCountry: form.thirdDegreeUnivCountry.trim() || null,
      thirdDegreeYear: form.thirdDegreeYear || null,
      
      currentlyStudying: form.currentlyStudying === "yes",
      studyMastersField: form.studyMastersField.trim() || null,
      studyMastersUniv: form.studyMastersUniv.trim() || null,
      studyMastersYear: form.studyMastersYear.trim() || null,
      
      studyPhdField: form.studyPhdField.trim() || null,
      studyPhdUniv: form.studyPhdUniv.trim() || null,
      studyPhdYear: form.studyPhdYear.trim() || null,
      
      studyCertField: form.studyCertField.trim() || null,
      studyCertUniv: form.studyCertUniv.trim() || null,
      studyCertYear: form.studyCertYear.trim() || null,
      
      totalWorkExp: form.totalWorkExp,
      totalWorkExpAhri: form.totalWorkExpAhri,
      
      propertyInventory: form.propertyInventory
    };

    mutation.mutate(payload);
  };

  // ── Styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface-2)",
    overflow: "hidden",
    marginBottom: 20
  };

  const sectionHeader: React.CSSProperties = {
    padding: "12px 20px",
    fontSize: "var(--fs-xs)",
    fontWeight: 850,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
    background: "rgba(99,102,241,0.06)",
    borderBottom: "1px solid var(--color-divider)",
  };

  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px 20px",
    padding: "18px 20px",
  };

  const fullWidth: React.CSSProperties = {
    gridColumn: "1 / -1"
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: "var(--fs-xs)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    height: 38,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${hasError ? "#ef4444" : "var(--color-divider)"}`,
    background: "var(--color-surface)",
    fontSize: "var(--fs-xs)",
    color: "var(--color-text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  });

  const errSpan: React.CSSProperties = {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
    fontWeight: 500
  };

  const required = <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>;

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 1000, margin: "0 auto" }}>
      
      {/* ── Success notification ── */}
      {status === "success" && (
        <div id="success-notification" style={{
          padding: "18px 22px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #86efac",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          marginBottom: 16
        }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>✅</span>
          <div>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "#15803d", marginBottom: 4 }}>
              Personnel File Submitted Successfully
            </div>
            <div style={{ fontSize: "var(--fs-xs)", color: "#166534", lineHeight: 1.7 }}>
              Your personnel file registration has been received and is currently in the <strong>pending verification state</strong>. 
              Once the credentials and job files are verified, your task authorizations and system privileges will be activated. 
              Please contact the system administrator if you have any questions.
            </div>
          </div>
        </div>
      )}

      {/* ── API error ── */}
      {status === "error" && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: "var(--fs-xs)", color: "#991b1b", marginBottom: 16 }}>
          <strong>Error:</strong> {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        
        {/* SECTION 1: PERSONAL DETAILS & CONTACT INFORMATION */}
        <div style={card}>
          <div style={sectionHeader}>Section 1: Personal Details & Contact Information</div>
          <div style={grid2}>
            {/* Full Name */}
            <label style={{ ...labelStyle, ...fullWidth }}>
              <span>Full Name {required}</span>
              <input 
                type="text" 
                id="fullName"
                value={form.fullName} 
                onChange={(e) => handleChange("fullName", e.target.value)} 
                placeholder="Enter First Name, Father's Name and Grand Father's Name" 
                style={inputStyle(!!errors.fullName)} 
              />
              {errors.fullName ? <span style={errSpan}>{errors.fullName}</span> : <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Must match: First Father Grandfather</span>}
            </label>

            {/* Sex */}
            <label style={labelStyle}>
              <span>Sex {required}</span>
              <select 
                id="sex"
                value={form.sex} 
                onChange={(e) => handleChange("sex", e.target.value)} 
                style={{ ...inputStyle(!!errors.sex), cursor: "pointer" }}
              >
                <option value="">— Select Sex —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.sex && <span style={errSpan}>{errors.sex}</span>}
            </label>

            {/* Phone Number */}
            <label style={labelStyle}>
              <span>Phone Number (Format: 09xxxxxxxx) {required}</span>
              <input 
                type="tel" 
                id="phone"
                value={form.phone} 
                onChange={(e) => handleChange("phone", e.target.value)} 
                placeholder="e.g. 0912345678" 
                style={inputStyle(!!errors.phone)} 
              />
              {errors.phone && <span style={errSpan}>{errors.phone}</span>}
            </label>

            {/* Personal Email Address */}
            <label style={labelStyle}>
              <span>Personal Email Address {required}</span>
              <input 
                type="email" 
                id="personalEmail"
                value={form.personalEmail} 
                onChange={(e) => handleChange("personalEmail", e.target.value)} 
                placeholder="e.g. username@gmail.com" 
                style={inputStyle(!!errors.personalEmail)} 
              />
              {errors.personalEmail && <span style={errSpan}>{errors.personalEmail}</span>}
            </label>

            {/* AHRI Email Address */}
            <label style={labelStyle}>
              <span>AHRI Email Address (if any)</span>
              <input 
                type="email" 
                id="ahriEmail"
                value={form.ahriEmail} 
                onChange={(e) => handleChange("ahriEmail", e.target.value)} 
                placeholder="e.g. first.last@ahri.gov.et" 
                style={inputStyle(!!errors.ahriEmail)} 
              />
              {errors.ahriEmail && <span style={errSpan}>{errors.ahriEmail}</span>}
            </label>

            {/* Emergency Contact – split into 3 fields */}
            <div style={{ ...fullWidth, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px 20px" }}>
              {/* Name */}
              <label style={labelStyle}>
                <span>Emergency Contact Name {required}</span>
                <input
                  type="text"
                  id="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                  placeholder="e.g. Abebe Bekele"
                  style={inputStyle(!!errors.emergencyContactName)}
                />
                {errors.emergencyContactName && <span style={errSpan}>{errors.emergencyContactName}</span>}
              </label>

              {/* Relationship */}
              <label style={labelStyle}>
                <span>Relationship {required}</span>
                <input
                  type="text"
                  id="emergencyContactRelationship"
                  value={form.emergencyContactRelationship}
                  onChange={(e) => handleChange("emergencyContactRelationship", e.target.value)}
                  placeholder="e.g. Father, Spouse, Sibling"
                  style={inputStyle(!!errors.emergencyContactRelationship)}
                />
                {errors.emergencyContactRelationship && <span style={errSpan}>{errors.emergencyContactRelationship}</span>}
              </label>

              {/* Phone */}
              <label style={labelStyle}>
                <span>Emergency Contact Phone {required}</span>
                <input
                  type="tel"
                  id="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                  placeholder="e.g. 0911000000"
                  style={inputStyle(!!errors.emergencyContactPhone)}
                />
                {errors.emergencyContactPhone && <span style={errSpan}>{errors.emergencyContactPhone}</span>}
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: EMPLOYMENT INFORMATION */}
        <div style={card}>
          <div style={sectionHeader}>Section 2: Employment & Position details</div>
          <div style={grid2}>
            {/* Department */}
            <label style={labelStyle}>
              <span>Department {required}</span>
              <select 
                id="department"
                value={form.department} 
                onChange={(e) => handleChange("department", e.target.value)} 
                style={{ ...inputStyle(!!errors.department), cursor: "pointer" }}
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <span style={errSpan}>{errors.department}</span>}
            </label>

            {/* Current Position at AHRI */}
            <label style={labelStyle}>
              <span>Function / Job Title {required}</span>
              <select 
                id="jobTitle"
                value={form.jobTitle} 
                onChange={(e) => handleChange("jobTitle", e.target.value)} 
                style={{ ...inputStyle(!!errors.jobTitle), cursor: "pointer" }}
              >
                <option value="">— Select Position —</option>
                {POSITIONS.map((p) => <option key={p.name} value={p.name}>{p.label}</option>)}
              </select>
              {errors.jobTitle && <span style={errSpan}>{errors.jobTitle}</span>}
            </label>

            {/* Type of Employment */}
            <label style={labelStyle}>
              <span>Contract / Employment Type {required}</span>
              <select 
                id="employmentType"
                value={form.employmentType} 
                onChange={(e) => handleChange("employmentType", e.target.value)} 
                style={{ ...inputStyle(!!errors.employmentType), cursor: "pointer" }}
              >
                <option value="">— Select Employment Type —</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t.name} value={t.name}>{t.label}</option>)}
              </select>
              {errors.employmentType && <span style={errSpan}>{errors.employmentType}</span>}
            </label>

            {/* Contract Date (conditional) */}
            <label style={{ ...labelStyle, opacity: form.employmentType === "contract" ? 1 : 0.4 }}>
              <span>If Contract, enter current contract end date {form.employmentType === "contract" && required}</span>
              <input 
                type="date" 
                id="contractEndDate"
                value={form.contractEndDate} 
                disabled={form.employmentType !== "contract"}
                onChange={(e) => handleChange("contractEndDate", e.target.value)} 
                style={inputStyle(!!errors.contractEndDate)} 
              />
              {errors.contractEndDate && <span style={errSpan}>{errors.contractEndDate}</span>}
            </label>

            {/* Project Hired On (conditional) */}
            <label style={{ ...labelStyle, ...fullWidth, opacity: form.employmentType === "contract" ? 1 : 0.4 }}>
              <span>If Contract, select the MNTD Project you are hired on {form.employmentType === "contract" && required}</span>
              <select 
                id="mntdProject"
                value={form.mntdProject} 
                disabled={form.employmentType !== "contract"}
                onChange={(e) => handleChange("mntdProject", e.target.value)} 
                style={{ ...inputStyle(!!errors.mntdProject), cursor: "pointer" }}
              >
                <option value="">— Select Project —</option>
                {MNTD_HIRED_PROJECTS.map((p) => <option key={p.name} value={p.name}>{p.label}</option>)}
              </select>
              {errors.mntdProject && <span style={errSpan}>{errors.mntdProject}</span>}
            </label>

            {/* Start Date */}
            <label style={labelStyle}>
              <span>AHRI Start Date {required}</span>
              <input 
                type="date" 
                id="startDate"
                value={form.startDate} 
                onChange={(e) => handleChange("startDate", e.target.value)} 
                style={inputStyle(!!errors.startDate)} 
              />
              {errors.startDate && <span style={errSpan}>{errors.startDate}</span>}
            </label>

            <div style={{ ...fullWidth, borderBottom: "1px solid var(--color-divider)", margin: "10px 0" }} />

            {/* MNTD Teams Checkboxes */}
            <div style={{ ...fullWidth, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>
                Select your applicable MNTD team(s) {required}
              </span>
              <div id="mntdTeams" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px 12px", background: "var(--color-surface)", padding: 12, borderRadius: 8, border: "1px solid var(--color-divider)" }}>
                {MNTD_TEAMS.map((t) => (
                  <label key={t.name} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, cursor: "pointer", color: "var(--color-text)" }}>
                    <input 
                      type="checkbox" 
                      checked={form.mntdTeams.includes(t.name)} 
                      onChange={(e) => handleCheckboxChange("mntdTeams", t.name, e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
              {errors.mntdTeams && <span style={errSpan}>{errors.mntdTeams}</span>}
            </div>

            {/* MNTD Projects involved Checkboxes */}
            <div style={{ ...fullWidth, display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>
                Select all the MNTD projects you are currently involved in {required}
              </span>
              <div id="mntdProjectsInvolved" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px 12px", background: "var(--color-surface)", padding: 12, borderRadius: 8, border: "1px solid var(--color-divider)", maxHeight: 320, overflowY: "auto" }}>
                {MNTD_PROJECTS.map((p) => (
                  <label key={p.name} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, cursor: "pointer", color: "var(--color-text)" }}>
                    <input 
                      type="checkbox" 
                      checked={form.mntdProjectsInvolved.includes(p.name)} 
                      onChange={(e) => handleCheckboxChange("mntdProjectsInvolved", p.name, e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
              {errors.mntdProjectsInvolved && <span style={errSpan}>{errors.mntdProjectsInvolved}</span>}
            </div>
          </div>
        </div>

        {/* SECTION 3: QUALIFICATIONS & ACADEMIC BACKGROUND */}
        <div style={card}>
          <div style={sectionHeader}>Section 3: Qualifications & Academic Background</div>
          <div style={grid2}>
            
            {/* Undergraduate Degree header */}
            <div style={{ ...fullWidth, fontWeight: 800, fontSize: 13, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
              Undergraduate/First Degree (BSc, BA, MD, DVM etc.)
            </div>

            {/* First Degree Field of Study */}
            <label style={labelStyle}>
              <span>Degree & Field of Study (Format: B.Sc. in Biology) {required}</span>
              <input 
                type="text" 
                id="firstDegree"
                value={form.firstDegree} 
                onChange={(e) => handleChange("firstDegree", e.target.value)} 
                placeholder="e.g. B.Sc. in Biology" 
                style={inputStyle(!!errors.firstDegree)} 
              />
              {errors.firstDegree && <span style={errSpan}>{errors.firstDegree}</span>}
            </label>

            {/* First Degree University */}
            <label style={labelStyle}>
              <span>First Degree University Name {required}</span>
              <select 
                id="firstDegreeUniv"
                value={form.firstDegreeUniv} 
                onChange={(e) => handleChange("firstDegreeUniv", e.target.value)} 
                style={{ ...inputStyle(!!errors.firstDegreeUniv), cursor: "pointer" }}
              >
                <option value="">— Select University —</option>
                {UNIVERSITIES.map((u) => <option key={u.name} value={u.name}>{u.label}</option>)}
              </select>
              {errors.firstDegreeUniv && <span style={errSpan}>{errors.firstDegreeUniv}</span>}
            </label>

            {/* First Degree University Other */}
            {form.firstDegreeUniv === "other" && (
              <label style={{ ...labelStyle, ...fullWidth }}>
                <span>If other, enter First Degree University Name and Country {required}</span>
                <input 
                  type="text" 
                  id="firstDegreeUnivOther"
                  value={form.firstDegreeUnivOther} 
                  onChange={(e) => handleChange("firstDegreeUnivOther", e.target.value)} 
                  placeholder="e.g. Harvard University, USA" 
                  style={inputStyle(!!errors.firstDegreeUnivOther)} 
                />
                {errors.firstDegreeUnivOther && <span style={errSpan}>{errors.firstDegreeUnivOther}</span>}
              </label>
            )}

            {/* First Degree Year Completed */}
            <label style={labelStyle}>
              <span>First Degree Year Completed (Format: YYYY-MM) {required}</span>
              <input 
                type="month" 
                id="firstDegreeYear"
                value={form.firstDegreeYear} 
                onChange={(e) => handleChange("firstDegreeYear", e.target.value)} 
                style={inputStyle(!!errors.firstDegreeYear)} 
              />
              {errors.firstDegreeYear && <span style={errSpan}>{errors.firstDegreeYear}</span>}
            </label>

            {/* Postgraduate Degree header */}
            <div style={{ ...fullWidth, fontWeight: 800, fontSize: 13, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)", paddingBottom: 4, marginTop: 10 }}>
              Postgraduate/Second Degree (MSc, MA, MPH, etc.) - Optional
            </div>

            {/* Second Degree Field of Study */}
            <label style={labelStyle}>
              <span>Degree & Field of Study</span>
              <input 
                type="text" 
                value={form.secondDegree} 
                onChange={(e) => handleChange("secondDegree", e.target.value)} 
                placeholder="e.g. MPH in Epidemiology" 
                style={inputStyle(false)} 
              />
            </label>

            {/* Second Degree University */}
            <label style={labelStyle}>
              <span>Second Degree University Name</span>
              <select 
                value={form.secondDegreeUniv} 
                onChange={(e) => handleChange("secondDegreeUniv", e.target.value)} 
                style={{ ...inputStyle(false), cursor: "pointer" }}
              >
                <option value="">— Select University —</option>
                {UNIVERSITIES.map((u) => <option key={u.name} value={u.name}>{u.label}</option>)}
              </select>
            </label>

            {/* Second Degree University Other */}
            {form.secondDegreeUniv === "other" && (
              <label style={{ ...labelStyle, ...fullWidth }}>
                <span>If other, enter Second Degree University Name and Country {required}</span>
                <input 
                  type="text" 
                  id="secondDegreeUnivOther"
                  value={form.secondDegreeUnivOther} 
                  onChange={(e) => handleChange("secondDegreeUnivOther", e.target.value)} 
                  placeholder="e.g. London School of Hygiene, UK" 
                  style={inputStyle(!!errors.secondDegreeUnivOther)} 
                />
                {errors.secondDegreeUnivOther && <span style={errSpan}>{errors.secondDegreeUnivOther}</span>}
              </label>
            )}

            {/* Second Degree Year Completed */}
            <label style={labelStyle}>
              <span>Second Degree Year Completed (Format: YYYY-MM)</span>
              <input 
                type="month" 
                value={form.secondDegreeYear} 
                onChange={(e) => handleChange("secondDegreeYear", e.target.value)} 
                style={inputStyle(false)} 
              />
            </label>

            {/* PhD Degree header */}
            <div style={{ ...fullWidth, fontWeight: 800, fontSize: 13, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)", paddingBottom: 4, marginTop: 10 }}>
              Postgraduate/Third Degree (PhD) - Optional
            </div>

            {/* Third Degree Field of Study */}
            <label style={labelStyle}>
              <span>PhD Field of Study/Program</span>
              <input 
                type="text" 
                value={form.thirdDegree} 
                onChange={(e) => handleChange("thirdDegree", e.target.value)} 
                placeholder="e.g. PhD in Molecular Genetics" 
                style={inputStyle(false)} 
              />
            </label>

            {/* Third Degree University & Country */}
            <label style={labelStyle}>
              <span>PhD University Name and Country</span>
              <input 
                type="text" 
                value={form.thirdDegreeUnivCountry} 
                onChange={(e) => handleChange("thirdDegreeUnivCountry", e.target.value)} 
                placeholder="e.g. Addis Ababa University, Ethiopia" 
                style={inputStyle(false)} 
              />
            </label>

            {/* Third Degree Year Completed */}
            <label style={labelStyle}>
              <span>PhD Year Completed (Format: YYYY-MM)</span>
              <input 
                type="month" 
                value={form.thirdDegreeYear} 
                onChange={(e) => handleChange("thirdDegreeYear", e.target.value)} 
                style={inputStyle(false)} 
              />
            </label>

            {/* Currently Studying */}
            <div style={{ ...fullWidth, borderBottom: "1px solid var(--color-divider)", margin: "10px 0" }} />
            
            <label style={{ ...labelStyle, ...fullWidth }}>
              <span>Are you currently studying? {required}</span>
              <div id="currentlyStudying" style={{ display: "flex", gap: 20, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text)" }}>
                  <input 
                    type="radio" 
                    name="currentlyStudying" 
                    value="yes"
                    checked={form.currentlyStudying === "yes"}
                    onChange={() => handleChange("currentlyStudying", "yes")}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text)" }}>
                  <input 
                    type="radio" 
                    name="currentlyStudying" 
                    value="no"
                    checked={form.currentlyStudying === "no"}
                    onChange={() => handleChange("currentlyStudying", "no")}
                  />
                  No
                </label>
              </div>
              {errors.currentlyStudying && <span style={errSpan}>{errors.currentlyStudying}</span>}
            </label>

            {/* Currently Studying Details Grid */}
            {form.currentlyStudying === "yes" && (
              <div style={{ ...fullWidth, background: "rgba(99,102,241,0.02)", padding: 16, borderRadius: 8, border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text)", borderBottom: "1px solid var(--color-divider)", paddingBottom: 4 }}>
                  Current Studies Details (Provide at least one)
                </span>
                
                {/* Masters Header */}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>Masters</span>
                  <input 
                    type="text" 
                    value={form.studyMastersField} 
                    onChange={(e) => handleChange("studyMastersField", e.target.value)} 
                    placeholder="Field of study" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="text" 
                    value={form.studyMastersUniv} 
                    onChange={(e) => handleChange("studyMastersUniv", e.target.value)} 
                    placeholder="University" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="month" 
                    value={form.studyMastersYear} 
                    onChange={(e) => handleChange("studyMastersYear", e.target.value)} 
                    style={inputStyle(false)} 
                  />
                </div>

                {/* PhD Header */}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>PhD</span>
                  <input 
                    type="text" 
                    value={form.studyPhdField} 
                    onChange={(e) => handleChange("studyPhdField", e.target.value)} 
                    placeholder="Field of study" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="text" 
                    value={form.studyPhdUniv} 
                    onChange={(e) => handleChange("studyPhdUniv", e.target.value)} 
                    placeholder="University" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="month" 
                    value={form.studyPhdYear} 
                    onChange={(e) => handleChange("studyPhdYear", e.target.value)} 
                    style={inputStyle(false)} 
                  />
                </div>

                {/* Certifications Header */}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 120px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>Certifications</span>
                  <input 
                    type="text" 
                    value={form.studyCertField} 
                    onChange={(e) => handleChange("studyCertField", e.target.value)} 
                    placeholder="Cert Field/Topic" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="text" 
                    value={form.studyCertUniv} 
                    onChange={(e) => handleChange("studyCertUniv", e.target.value)} 
                    placeholder="Institution" 
                    style={inputStyle(false)} 
                  />
                  <input 
                    type="month" 
                    value={form.studyCertYear} 
                    onChange={(e) => handleChange("studyCertYear", e.target.value)} 
                    style={inputStyle(false)} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: WORK EXPERIENCE(S) */}
        <div style={card}>
          <div style={sectionHeader}>Section 4: Work Experience(s)</div>
          <div style={grid2}>
            {/* Total work exp */}
            <label style={labelStyle}>
              <span>Total Work Experience(s) in Years {required}</span>
              <select 
                id="totalWorkExp"
                value={form.totalWorkExp} 
                onChange={(e) => handleChange("totalWorkExp", e.target.value)} 
                style={{ ...inputStyle(!!errors.totalWorkExp), cursor: "pointer" }}
              >
                <option value="">— Select Experience —</option>
                {WORK_EXP_OPTIONS.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
              </select>
              {errors.totalWorkExp && <span style={errSpan}>{errors.totalWorkExp}</span>}
            </label>

            {/* Total work exp at AHRI */}
            <label style={labelStyle}>
              <span>Total Work Experience(s) in Years at AHRI {required}</span>
              <select 
                id="totalWorkExpAhri"
                value={form.totalWorkExpAhri} 
                onChange={(e) => handleChange("totalWorkExpAhri", e.target.value)} 
                style={{ ...inputStyle(!!errors.totalWorkExpAhri), cursor: "pointer" }}
              >
                <option value="">— Select Experience —</option>
                {WORK_EXP_OPTIONS.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
              </select>
              {errors.totalWorkExpAhri && <span style={errSpan}>{errors.totalWorkExpAhri}</span>}
            </label>
          </div>
        </div>

        {/* SECTION 5: PERSONAL EQUIPMENT LOG */}
        <div style={card}>
          <div style={sectionHeader}>Section 5: Personal Equipment Log</div>
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 14 }}>
              Enter the quantities and types of all IT/electronic, office, laboratory and field equipment/instruments/devices under your name.
            </div>

            <div className="table-responsive-container">
              <div style={{ minWidth: "600px" }}>
                {/* Table Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "250px 100px 1fr",
                  gap: 12,
                  paddingBottom: 8,
                  borderBottom: "2px solid var(--color-border)",
                  fontWeight: 800,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-muted)"
                }}>
                  <span>Equipment Type</span>
                  <span>Quantity</span>
                  <span>Brand Name/Model</span>
                </div>

                {/* Table Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {PROPERTY_ITEMS.map((item) => {
                    const data = form.propertyInventory[item.id] || { quantity: 0, brand: "" };
                    return (
                      <div key={item.id} style={{
                        display: "grid",
                        gridTemplateColumns: "250px 100px 1fr",
                        gap: 12,
                        alignItems: "center"
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>{item.label}</span>
                        <input 
                          type="number" 
                          min="0"
                          value={data.quantity === 0 ? "" : data.quantity} 
                          onChange={(e) => handleInventoryChange(item.id, "quantity", parseInt(e.target.value) || 0)} 
                          placeholder="0"
                          style={{ ...inputStyle(false), textAlign: "center" }}
                        />
                        <input 
                          type="text" 
                          value={data.brand} 
                          onChange={(e) => handleInventoryChange(item.id, "brand", e.target.value)} 
                          placeholder="e.g. Dell Latitude 5420 / HP Laserjet" 
                          style={inputStyle(false)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 40 }}>
          <button
            type="button"
            onClick={() => { setForm(emptyForm()); setErrors({}); setStatus("idle"); }}
            style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer" }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              border: "none",
              background: mutation.isPending ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: "var(--fs-xs)",
              fontWeight: 800,
              cursor: mutation.isPending ? "not-allowed" : "pointer",
              letterSpacing: "0.03em",
              boxShadow: mutation.isPending ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
              transition: "all 0.2s",
            }}
          >
            {mutation.isPending ? "Submitting…" : "📨 Submit Profile Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}