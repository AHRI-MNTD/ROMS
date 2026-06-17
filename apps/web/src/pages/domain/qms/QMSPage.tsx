import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fetchSOPs } from "../../../api/domains";
import logoAhri from "../../../assets/logo_ahri.png";
import QMSDashboardView from "./QMSDashboardView";
import QMSReviewerView from "./QMSReviewerView";
import QMSViewerView from "./QMSViewerView";

// Define TypeScript interfaces for our data structures
interface SOPItem {
  id: string;
  code: string;
  title: string;
  sopSection: string;
  sopSubSection: string;
  version: string;
  status: string;
  author: string;
  lastUpdated: string;
  sopType?: "Procedure SOP" | "Equipment SOP" | "Analysis SOP";
  details?: Record<string, any>;
}

const ASSAY_CATEGORY_OPTIONS = [
  "Sample collection / preparation",
  "Nucleic acid extraction",
  "Real-time qPCR",
  "Gel-based PCR (incl. nested PCR)",
  "Genotyping (MSP1 / MSP2)",
  "Digital PCR (Pfhrp2 / Pfhrp3)",
  "NGS library preparation",
  "Serology / bead-based assays",
  "Vector / entomology procedure",
  "Equipment operation / maintenance"
];

const METHOD_FAMILY_OPTIONS = [
  "Conventional PCR",
  "Real-time qPCR",
  "Digital PCR",
  "Next-generation sequencing",
  "Immunoassay / serology",
  "Nucleic-acid extraction",
  "Sample collection / preparation",
  "Vector / entomology",
  "Equipment SOP",
  "Other"
];

const formatRichText = (htmlOrText: string) => {
  if (!htmlOrText) return "";
  if (!/<[a-z][\s\S]*>/i.test(htmlOrText)) {
    return htmlOrText.replace(/\n/g, "<br/>");
  }
  return htmlOrText;
};

const getStatusColors = (status: string) => {
  const st = status.toUpperCase();
  if (st === "APPROVED" || st === "ACTIVE" || st === "ACTIVE / APPROVED") {
    return { bg: "#dcfce7", text: "#15803d" };
  } else if (st === "DRAFT") {
    return { bg: "#e0f2fe", text: "#0369a1" };
  } else if (st === "UNDER REVIEW" || st === "REVIEW" || st === "SUBMITTED" || st === "REQUESTED") {
    return { bg: "#ffedd5", text: "#c2410c" };
  } else if (st === "PANEL REVIEW") {
    return { bg: "#f3e8ff", text: "#6b21a8" };
  } else if (st === "RETURNED" || st === "NEEDS REVISION" || st === "REJECTED") {
    return { bg: "#fee2e2", text: "#b91c1c" };
  } else if (st === "AWAITING AUTHOR RESPONSE" || st === "AWAITING RESPONSE") {
    return { bg: "#fef3c7", text: "#d97706" };
  }
  return { bg: "#e2e8f0", text: "#475569" };
};

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18, display: "inline-block", verticalAlign: "middle" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18, display: "inline-block", verticalAlign: "middle" }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
  </svg>
);

// Suggest next index code prefix-based
const suggestNextCode = (type: string, sops: SOPItem[]): string => {
  let prefix = "P";
  if (type.includes("Procedure")) prefix = "P";
  else if (type.includes("Equipment")) prefix = "E";
  else if (type.includes("Analysis")) prefix = "A";
  else if (type.includes("Manual")) prefix = "QM";

  let maxIndex = 0;
  sops.forEach(s => {
    if (s.code && s.code.startsWith(prefix)) {
      const numPart = s.code.substring(prefix.length);
      const num = parseInt(numPart);
      if (!isNaN(num) && num > maxIndex) {
        maxIndex = num;
      }
    }
  });

  return `${prefix}${maxIndex + 1}`;
};

export default function QMSPage() {
  const navigate = useNavigate();

  // Navigation tabs: "sops" (Viewer Library), "author" (Author dashboard), "qo" (QO dashboard), "review-sop" (Reviewers)
  const [activeTab, setActiveTab] = useState<"sops" | "author" | "qo" | "review-sop">("sops");

  // Filtering states
  const [searchText, setSearchText] = useState<string>("");
  const [filterTitle, setFilterTitle] = useState<string>("All");
  const [filterAuthor, setFilterAuthor] = useState<string>("All");
  const [filterMethodFamily, setFilterMethodFamily] = useState<string>("All");
  const [filterAssayCategory, setFilterAssayCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [statusFilterCard, setStatusFilterCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // SOP lists
  const [sops, setSops] = useState<SOPItem[]>([]);
  const [isSopsLoading, setIsSopsLoading] = useState<boolean>(false);
  const [sopsError, setSopsError] = useState<string | null>(null);
  const [localSops, setLocalSops] = useState<SOPItem[]>([]);

  // Modals & Popups
  const [selectedSopDetails, setSelectedSopDetails] = useState<SOPItem | null>(null);
  const [shareSop, setShareSop] = useState<SOPItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [printingSop, setPrintingSop] = useState<SOPItem | null>(null);

  // Author & QO specific filters
  const [authorSopTypeFilter, setAuthorSopTypeFilter] = useState<string>("All");
  const [authorStatusFilter, setAuthorStatusFilter] = useState<string>("All");
  const [qoSearchText, setQoSearchText] = useState<string>("");
  const [qoSopTypeFilter, setQoSopTypeFilter] = useState<string>("All");
  const [qoStatusFilter, setQoStatusFilter] = useState<string>("All");
  const [qoAssayCategoryFilter, setQoAssayCategoryFilter] = useState<string>("All");
  const [qoMethodFamilyFilter, setQoMethodFamilyFilter] = useState<string>("All");

  // Author: Request SOP modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestType, setRequestType] = useState<"Procedure SOP" | "Equipment SOP" | "Analysis SOP">("Procedure SOP");
  const [requestVerifier, setRequestVerifier] = useState("");
  const [requestAuthorizer, setRequestAuthorizer] = useState("");
  const [requestAuthorName, setRequestAuthorName] = useState("");

  // QO: Setup Header & Code modal states
  const [selectedSopForQOApprove, setSelectedSopForQOApprove] = useState<SOPItem | null>(null);
  const [qoAssignedCode, setQoAssignedCode] = useState("");
  const [qoVerifier, setQoVerifier] = useState("");
  const [qoAuthorizer, setQoAuthorizer] = useState("");
  const [qoSite, setQoSite] = useState("AHRI – Addis Ababa");
  const [qoLabUnit, setQoLabUnit] = useState("MNTD Molecular Lab");

  // Load from LocalStorage and backend
  const loadSopsList = async () => {
    setIsSopsLoading(true);
    setSopsError(null);

    try {
      const saved = localStorage.getItem("roms_local_sops");
      if (saved) {
        setLocalSops(JSON.parse(saved));
      } else {
        setLocalSops([]);
      }
    } catch (e) {
      console.error("Failed to load local sops:", e);
    }

    try {
      const res = await fetchSOPs(1, 1000);
      setSops((res.data as unknown as SOPItem[]) || []);
    } catch (err: any) {
      console.error(err);
      setSopsError("Backend connection unavailable - showing local items.");
    } finally {
      setIsSopsLoading(false);
    }
  };

  useEffect(() => {
    // Clean environment flag check to wipe stale seeded or previously typed QMS local storage data once
    const cleaned = localStorage.getItem("roms_qms_cleaned_2026_06_15");
    if (!cleaned) {
      localStorage.removeItem("roms_local_sops");
      localStorage.removeItem("roms_viewer_favorites");
      localStorage.removeItem("roms_viewer_history");
      localStorage.setItem("roms_qms_cleaned_2026_06_15", "true");
    }
    loadSopsList();
  }, []);

  const allSops = useMemo(() => {
    const localCodes = new Set(localSops.map(s => s.code));
    const filteredBackend = sops.filter(s => !localCodes.has(s.code));
    return [...localSops, ...filteredBackend];
  }, [localSops, sops]);

  // Prepopulate QO Approval Modal fields when a requested SOP is chosen
  useEffect(() => {
    if (selectedSopForQOApprove) {
      const nextCode = suggestNextCode(selectedSopForQOApprove.sopType || selectedSopForQOApprove.sopSection || "Procedure SOP", allSops);
      setQoAssignedCode(nextCode);
      setQoVerifier(selectedSopForQOApprove.details?.proposedVerifier || "Melaku G. - QA Officer");
      setQoAuthorizer(selectedSopForQOApprove.details?.proposedAuthorizer || "Dr. Abraham A. - Laboratory Manager");
      setQoSite(selectedSopForQOApprove.details?.owningSite || "AHRI – Addis Ababa");
      setQoLabUnit(selectedSopForQOApprove.sopSubSection || "MNTD Molecular Lab");
    }
  }, [selectedSopForQOApprove, allSops]);

  // Action: Author requests a new SOP
  const handleRequestSOP = () => {
    if (!requestTitle.trim() || !requestAuthorName.trim()) {
      alert("All fields are required to request a new SOP!");
      return;
    }

    const newRequest: SOPItem = {
      id: `sop-local-${Date.now()}`,
      code: "AWAITING_CODE",
      title: requestTitle,
      sopSection: requestType,
      sopSubSection: "MNTD Molecular Lab",
      version: "1.0",
      status: "REQUESTED",
      author: requestAuthorName,
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sopType: requestType,
      details: {
        proposedVerifier: "",
        proposedAuthorizer: "",
        electronicSignatures: {
          author: { name: requestAuthorName, signedAt: new Date().toLocaleDateString() },
          verifierUser: { name: "", signedAt: "" },
          verifierQo: { name: "QA Officer", signedAt: "" },
          authorizerLm: { name: "", signedAt: "" }
        }
      }
    };

    try {
      const list = [newRequest, ...localSops];
      localStorage.setItem("roms_local_sops", JSON.stringify(list));
      setLocalSops(list);
      setIsRequestModalOpen(false);
      setRequestTitle("");
      setRequestAuthorName("");
      setRequestVerifier("");
      setRequestAuthorizer("");
      alert("SOP request submitted successfully to QO!");
    } catch (e) {
      console.error(e);
      alert("Failed to request SOP.");
    }
  };

  // Action: QO approves requested SOP, sets Code, Verifiers, and Authorizer
  const handleQOApprove = () => {
    if (!selectedSopForQOApprove || !qoAssignedCode.trim()) return;

    const codeExists = allSops.some(s => s.code.toUpperCase() === qoAssignedCode.toUpperCase() && s.id !== selectedSopForQOApprove.id);
    if (codeExists) {
      alert(`The code ${qoAssignedCode} is already assigned to another SOP. Codes must be unique!`);
      return;
    }

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const reviewDate = oneYearLater.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const updatedSop = {
      ...selectedSopForQOApprove,
      code: qoAssignedCode,
      sopSubSection: qoLabUnit,
      status: "DRAFT",
      lastUpdated: today,
      details: {
        ...(selectedSopForQOApprove.details || {}),
        owningSite: qoSite,
        owningLabUnit: qoLabUnit,
        proposedVerifier: qoVerifier,
        proposedAuthorizer: qoAuthorizer,
        effectiveDate: today,
        nextReviewDate: reviewDate,
        electronicSignatures: {
          author: { name: selectedSopForQOApprove.author, signedAt: today },
          verifierUser: { name: qoVerifier, signedAt: "" },
          verifierQo: { name: "QA Officer", signedAt: "" },
          authorizerLm: { name: qoAuthorizer, signedAt: "" }
        }
      }
    };

    try {
      const filtered = localSops.filter((s: any) => s.id !== selectedSopForQOApprove.id);
      const updatedList = [updatedSop, ...filtered];
      localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
      setLocalSops(updatedList);
      setSelectedSopForQOApprove(null);
      alert(`SOP Code ${qoAssignedCode} assigned successfully! Template generated and sent to Author.`);
    } catch (e) {
      console.error(e);
      alert("Failed to save approved SOP header.");
    }
  };

  // Filtered lists for Author perspective
  const authorSops = useMemo(() => {
    return allSops.filter(sop => {
      const matchesSearch =
        sop.title.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(searchText.toLowerCase());

      const matchesType = authorSopTypeFilter === "All" || (sop.sopType || sop.sopSection) === authorSopTypeFilter;

      const matchesStatus = authorStatusFilter === "All" || sop.status.toUpperCase() === authorStatusFilter.toUpperCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allSops, searchText, authorSopTypeFilter, authorStatusFilter]);

  // Filtered lists for QO perspective
  const requestedSopsQO = useMemo(() => {
    return allSops.filter(sop => {
      const isRequested = sop.status.toUpperCase() === "REQUESTED";
      const matchesSearch =
        sop.title.toLowerCase().includes(qoSearchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(qoSearchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(qoSearchText.toLowerCase());
      const matchesType = qoSopTypeFilter === "All" || (sop.sopType || sop.sopSection) === qoSopTypeFilter;
      const matchesAssayCategory = qoAssayCategoryFilter === "All" || sop.details?.assayCategory === qoAssayCategoryFilter;
      const matchesMethodFamily = qoMethodFamilyFilter === "All" || sop.details?.methodFamily === qoMethodFamilyFilter;

      return isRequested && matchesSearch && matchesType && matchesAssayCategory && matchesMethodFamily;
    });
  }, [allSops, qoSearchText, qoSopTypeFilter, qoAssayCategoryFilter, qoMethodFamilyFilter]);

  const existingSopsQO = useMemo(() => {
    return allSops.filter(sop => {
      const isNotRequested = sop.status.toUpperCase() !== "REQUESTED";
      const matchesSearch =
        sop.title.toLowerCase().includes(qoSearchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(qoSearchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(qoSearchText.toLowerCase());
      const matchesType = qoSopTypeFilter === "All" || (sop.sopType || sop.sopSection) === qoSopTypeFilter;
      const matchesStatus = qoStatusFilter === "All" || sop.status.toUpperCase() === qoStatusFilter.toUpperCase();
      const matchesAssayCategory = qoAssayCategoryFilter === "All" || sop.details?.assayCategory === qoAssayCategoryFilter;
      const matchesMethodFamily = qoMethodFamilyFilter === "All" || sop.details?.methodFamily === qoMethodFamilyFilter;

      return isNotRequested && matchesSearch && matchesType && matchesStatus && matchesAssayCategory && matchesMethodFamily;
    });
  }, [allSops, qoSearchText, qoSopTypeFilter, qoStatusFilter, qoAssayCategoryFilter, qoMethodFamilyFilter]);

  // Pagination constants
  const itemsPerPage = 10;
  const authorTotalPages = Math.ceil(authorSops.length / itemsPerPage) || 1;
  const paginatedAuthorSops = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return authorSops.slice(start, start + itemsPerPage);
  }, [authorSops, currentPage]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= authorTotalPages) {
      setCurrentPage(p);
    }
  };

  const handleViewDetails = (sop: SOPItem) => {
    setSelectedSopDetails(sop);
  };

  const handleEdit = (code: string) => {
    navigate(`create-sop?edit=${code}`);
  };

  const handleDelete = (code: string) => {
    if (window.confirm(`Are you sure you want to delete SOP: ${code}?`)) {
      try {
        const filtered = localSops.filter((s: any) => s.code !== code);
        localStorage.setItem("roms_local_sops", JSON.stringify(filtered));
        setLocalSops(filtered);
        alert(`SOP ${code} deleted.`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleShare = (sop: SOPItem) => {
    setShareSop(sop);
    setIsCopied(false);
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/domains/qms?view=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handlePrintPDF = (sop: SOPItem) => {
    setPrintingSop(sop);
    setTimeout(() => {
      window.print();
      setPrintingSop(null);
    }, 400);
  };

  const handleSubmitForReview = (sop: SOPItem) => {
    try {
      const updatedList = localSops.map((s: any) => {
        if (s.code === sop.code) {
          return { ...s, status: "UNDER REVIEW" };
        }
        return s;
      });
      localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
      setLocalSops(updatedList);
      setSelectedSopDetails(prev => prev ? { ...prev, status: "UNDER REVIEW" } : null);
      alert(`SOP ${sop.code} has been successfully submitted for review.`);
    } catch (e) {
      console.error(e);
    }
  };

  const footerYear = printingSop
    ? new Date(printingSop.details?.effectiveDate || printingSop.lastUpdated || Date.now()).getFullYear()
    : new Date().getFullYear();

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }}>
      {/* ── CONTENT PANE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Active Title Block */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.2rem", background: "var(--color-primary-soft)", color: "var(--color-primary)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}>
                📄
              </span>
              <div>
                <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0, letterSpacing: "-0.01em" }}>
                  SOP & Quality Management
                </h1>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "1px 0 0 0" }}>
                  Digital approval pipelines, verifications, and workflows
                </p>
              </div>
            </div>

            {/* Role Tab selection */}
            <div style={{ display: "flex", gap: 8, fontSize: "12.5px", fontWeight: 600, marginLeft: 12 }}>
              {[
                { id: "sops", label: "SOPs" },
                { id: "author", label: "Author" },
                { id: "qo", label: "Quality Officer" },
                { id: "review-sop", label: "Authorizer" }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                      borderRadius: "var(--radius-sm)",
                      background: isActive ? "var(--color-primary-soft)" : "transparent",
                      transition: "all 0.15s ease",
                      fontWeight: isActive ? 700 : 550,
                    }}
                  >
                    {tab.label}
                  </div>
                );
              })}
            </div>
          </div>

          {activeTab === "author" && (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              style={{
                background: "var(--color-primary)",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <span>+ Request New SOP</span>
            </button>
          )}
        </div>

        {/* Inner Scroll Pane */}
        <div style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>

          {/* sops Error handler */}
          {sopsError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b", marginBottom: 16 }}>
              API synced reading fallback enabled.
            </div>
          )}

          {/* TAB 1: REFERENCE LIBRARY (VIEWER) */}
          {activeTab === "sops" && (
            <QMSViewerView
              sops={allSops}
              onPrintRequest={(sop) => handlePrintPDF(sop)}
            />
          )}

          {/* TAB 2: AUTHOR PERSPECTIVE */}
          {activeTab === "author" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Search and Filters for Author */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--color-surface)", padding: "12px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>SOP Type:</span>
                  <select
                    value={authorSopTypeFilter}
                    onChange={(e) => setAuthorSopTypeFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Types</option>
                    <option value="Procedure SOP">Procedure SOP</option>
                    <option value="Equipment SOP">Equipment SOP</option>
                    <option value="Analysis SOP">Analysis SOP</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Status:</span>
                  <select
                    value={authorStatusFilter}
                    onChange={(e) => setAuthorStatusFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="REQUESTED">Requested</option>
                    <option value="DRAFT">Draft</option>
                    <option value="UNDER REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="RETURNED">Returned</option>
                    <option value="AWAITING AUTHOR RESPONSE">Awaiting Response</option>
                  </select>
                </div>

                <div style={{ position: "relative", flex: 1, minWidth: "150px" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--color-text-faint)" }}>🔍</span>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search my requested and draft SOPs..."
                    style={{ width: "100%", padding: "6px 12px 6px 28px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }}
                  />
                </div>
              </div>

              {/* Author's SOP list */}
              <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 140 }}>SOP Code</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left" }}>Title</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 150 }}>SOP Type</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 150 }}>Status</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "center", width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAuthorSops.length > 0 ? (
                      paginatedAuthorSops.map((sop) => {
                        const statusColor = getStatusColors(sop.status);

                        return (
                          <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text)" }}>{sop.code}</td>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{sop.title}</td>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.sopType || sop.sopSection || "Procedure SOP"}</td>
                            <td style={{ padding: "12px 16px", fontSize: "10px" }}>
                              <span style={{ padding: "3px 8px", borderRadius: "10px", fontWeight: 700, background: statusColor.bg, color: statusColor.text, textTransform: "uppercase" }}>
                                {sop.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px", display: "flex", gap: 12, justifyContent: "center" }}>
                              <button onClick={() => handleViewDetails(sop)} title="View" style={{ background: "none", border: "none", cursor: "pointer" }}><ViewIcon /></button>

                              {sop.status.toUpperCase() === "DRAFT" && (
                                <button onClick={() => handleEdit(sop.code)} title="Edit Draft" style={{ background: "none", border: "none", cursor: "pointer" }}><EditIcon /></button>
                              )}
                              {sop.status.toUpperCase() === "RETURNED" && (
                                <button onClick={() => handleEdit(sop.code)} title="Correct & Edit" style={{ background: "none", border: "none", cursor: "pointer" }}><EditIcon /></button>
                              )}

                              <button onClick={() => handlePrintPDF(sop)} title="Print" style={{ background: "none", border: "none", cursor: "pointer" }}>📄</button>
                              <button onClick={() => handleShare(sop)} title="Share" style={{ background: "none", border: "none", cursor: "pointer" }}>🔗</button>
                              <button onClick={() => handleDelete(sop.code)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: "24px", color: "var(--color-text-faint)", textAlign: "center", fontSize: "var(--fs-sm)" }}>No SOPs requested or authored by you.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                  Page {currentPage} of {authorTotalPages}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "4px 10px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", cursor: "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>&lt;</button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === authorTotalPages} style={{ padding: "4px 10px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", cursor: "pointer", opacity: currentPage === authorTotalPages ? 0.5 : 1 }}>&gt;</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUALITY OFFICER (QO) PERSPECTIVE */}
          {activeTab === "qo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Search & Filters for QO */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--color-surface)", padding: "12px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>SOP Type:</span>
                  <select
                    value={qoSopTypeFilter}
                    onChange={(e) => setQoSopTypeFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Types</option>
                    <option value="Procedure SOP">Procedure SOP</option>
                    <option value="Equipment SOP">Equipment SOP</option>
                    <option value="Analysis SOP">Analysis SOP</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Status:</span>
                  <select
                    value={qoStatusFilter}
                    onChange={(e) => setQoStatusFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Statuses (Excl. Requested)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="UNDER REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="RETURNED">Returned</option>
                    <option value="AWAITING AUTHOR RESPONSE">Awaiting Response</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Assay Category:</span>
                  <select
                    value={qoAssayCategoryFilter}
                    onChange={(e) => setQoAssayCategoryFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Categories</option>
                    {ASSAY_CATEGORY_OPTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Method Family:</span>
                  <select
                    value={qoMethodFamilyFilter}
                    onChange={(e) => setQoMethodFamilyFilter(e.target.value)}
                    style={{ padding: "6px 20px 6px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="All">All Families</option>
                    {METHOD_FAMILY_OPTIONS.map(fam => (
                      <option key={fam} value={fam}>{fam}</option>
                    ))}
                  </select>
                </div>

                <div style={{ position: "relative", flex: 1, minWidth: "150px" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--color-text-faint)" }}>🔍</span>
                  <input
                    type="text"
                    value={qoSearchText}
                    onChange={(e) => setQoSearchText(e.target.value)}
                    placeholder="Search QO queues by title, code, or author..."
                    style={{ width: "100%", padding: "6px 12px 6px 28px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }}
                  />
                </div>
              </div>

              {/* Requested SOPs queue */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0", color: "var(--color-primary)" }}>
                  🔔 Pending SOP Requests ({requestedSopsQO.length})
                </h3>
                <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", fontSize: "var(--fs-xs)" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Proposed Title</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", width: 140 }}>SOP Type</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", width: 120 }}>Requested By</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", width: 120 }}>Proposed LM</th>
                        <th style={{ padding: "10px 14px", textAlign: "center", width: 150 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestedSopsQO.length > 0 ? (
                        requestedSopsQO.map((sop) => (
                          <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)", fontSize: "var(--fs-sm)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{sop.title}</td>
                            <td style={{ padding: "10px 14px" }}>{sop.sopType || "Procedure SOP"}</td>
                            <td style={{ padding: "10px 14px" }}>{sop.author}</td>
                            <td style={{ padding: "10px 14px" }}>{sop.details?.proposedAuthorizer}</td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <button
                                onClick={() => setSelectedSopForQOApprove(sop)}
                                style={{ background: "var(--color-primary)", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: "11px" }}
                              >
                                Approve & Code
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--color-text-faint)", fontSize: "var(--fs-sm)" }}>No pending requests matching criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General coded SOP list for QO */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0" }}>
                  📋 Active SOP Document Controls ({existingSopsQO.length})
                </h3>
                <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", fontSize: "var(--fs-xs)" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Code</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Title</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Author</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Status</th>
                        <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingSopsQO.length > 0 ? (
                        existingSopsQO.map((sop) => (
                          <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)", fontSize: "var(--fs-sm)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{sop.code}</td>
                            <td style={{ padding: "10px 14px" }}>{sop.title}</td>
                            <td style={{ padding: "10px 14px" }}>{sop.author}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ fontSize: "10px", padding: "2.5px 6px", borderRadius: 4, background: getStatusColors(sop.status).bg, color: getStatusColors(sop.status).text, fontWeight: "bold", textTransform: "uppercase" }}>
                                {sop.status}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                <button onClick={() => handleViewDetails(sop)} style={{ background: "none", border: "none", cursor: "pointer" }}><ViewIcon /></button>
                                <button onClick={() => handlePrintPDF(sop)} style={{ background: "none", border: "none", cursor: "pointer" }}>🖨️</button>
                                <button onClick={() => handleDelete(sop.code)} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--color-text-faint)", fontSize: "var(--fs-sm)" }}>No coded SOPs matching criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: REVIEWERS & AUTHORIZERS */}
          {activeTab === "review-sop" && (
            <QMSReviewerView
              sops={allSops}
              onSopUpdate={(updatedList) => {
                setLocalSops(updatedList);
              }}
              onPrintRequest={handlePrintPDF}
              onShareRequest={handleShare}
            />
          )}

        </div>
      </div>

      {/* REQUEST SOP MODAL (AUTHOR) */}
      {isRequestModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={smallModalContainerStyle}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700 }}>Request New SOP Drafting</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>Proposed SOP Title *</label>
                <input
                  type="text"
                  placeholder="e.g. qPCR operation manual"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>Author Name / Initials *</label>
                <input
                  type="text"
                  placeholder="e.g. Melaku G. (MG)"
                  value={requestAuthorName}
                  onChange={(e) => setRequestAuthorName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Type *</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  style={selectStyle}
                >
                  <option value="Procedure SOP">Procedure SOP</option>
                  <option value="Equipment SOP">Equipment SOP</option>
                  <option value="Analysis SOP">Analysis SOP</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button onClick={() => setIsRequestModalOpen(false)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", background: "none" }}>Cancel</button>
                <button onClick={handleRequestSOP} style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff" }}>Request SOP</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE REQUEST & CODE MODAL (QO) */}
      {selectedSopForQOApprove && (
        <div style={modalOverlayStyle}>
          <div style={smallModalContainerStyle}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 700 }}>Code Assign & Approve Request</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, background: "var(--color-surface)", padding: 10, borderRadius: 6, fontSize: "11.5px" }}>
                <div><strong>Requested Title:</strong> {selectedSopForQOApprove.title}</div>
                <div><strong>SOP Type:</strong> {selectedSopForQOApprove.sopType}</div>
                <div><strong>Author:</strong> {selectedSopForQOApprove.author}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>Assign SOP Code (Suggested next index) *</label>
                <input
                  type="text"
                  placeholder="e.g. P15"
                  value={qoAssignedCode}
                  onChange={(e) => setQoAssignedCode(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>Verifier User Name *</label>
                <select
                  value={qoVerifier}
                  onChange={(e) => setQoVerifier(e.target.value)}
                  style={selectStyle}
                >
                  <option value="Melaku G. - QA Officer">Melaku G. - QA Officer</option>
                  <option value="Elizabeth T. - Senior Analyst">Elizabeth T. - Senior Analyst</option>
                  <option value="Tadesse D. - Laboratory Supervisor">Tadesse D. - Laboratory Supervisor</option>
                  <option value="Fikre S. - Safety Officer">Fikre S. - Safety Officer</option>
                  <option value="Saba W. - Quality Coordinator">Saba W. - Quality Coordinator</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)" }}>Authorizer Name (LM) *</label>
                <select
                  value={qoAuthorizer}
                  onChange={(e) => setQoAuthorizer(e.target.value)}
                  style={selectStyle}
                >
                  <option value="Dr. Abraham A. - Laboratory Manager">Dr. Abraham A. - Laboratory Manager</option>
                  <option value="Wondwossen A. - Quality Manager">Wondwossen A. - Quality Manager</option>
                  <option value="Aster Y. - Lab Director">Aster Y. - Lab Director</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button onClick={() => setSelectedSopForQOApprove(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", background: "none" }}>Cancel</button>
                <button onClick={handleQOApprove} style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff" }}>Approve & Send Draft</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedSopDetails && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
              width: 800,
              maxWidth: "95%",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ background: "var(--color-surface-2)", padding: "16px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                  📄 SOP Details: {selectedSopDetails.code}
                </h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{selectedSopDetails.title}</span>
              </div>
              <button
                onClick={() => setSelectedSopDetails(null)}
                style={{ background: "none", border: "none", fontSize: "24px", color: "var(--color-text-muted)", cursor: "pointer", lineHeight: 0.5 }}
              >
                ×
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Reviewer Comments & Feedback (Only shown if comments exist and tab is not Quality Officer) */}
              {activeTab !== "qo" && selectedSopDetails.details?.comments && selectedSopDetails.details.comments.length > 0 && (
                <div style={{ background: "#fffaf0", border: "1px solid #feebc8", borderRadius: "var(--radius)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, color: "#dd6b20", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      ⚠️ Reviewer Comments & Revision Feedback
                    </h4>
                    {selectedSopDetails.status.toUpperCase() === "RETURNED" && (
                      <button
                        onClick={() => {
                          setSelectedSopDetails(null);
                          handleEdit(selectedSopDetails.code);
                        }}
                        style={{
                          background: "#dd6b20",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        ✏️ Edit SOP Now
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedSopDetails.details.comments.map((comment: any) => (
                      <div key={comment.id} style={{ background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid #fbd38d", fontSize: "var(--fs-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-muted)", marginBottom: 4 }}>
                          <strong>{comment.author} ({comment.section})</strong>
                          <span>{comment.timestamp}</span>
                        </div>
                        <div style={{ color: "var(--color-text)", fontWeight: 500 }}>{comment.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "var(--color-surface-2)", padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                <div><strong>Code:</strong> {selectedSopDetails.code}</div>
                <div><strong>Title:</strong> {selectedSopDetails.title}</div>
                <div><strong>Version:</strong> {selectedSopDetails.version}</div>
                <div><strong>Status:</strong> {selectedSopDetails.status}</div>
                <div><strong>Author:</strong> {selectedSopDetails.author}</div>
                <div><strong>SOP Type:</strong> {selectedSopDetails.sopType || selectedSopDetails.sopSection}</div>
                {selectedSopDetails.details?.owningSite && <div><strong>Owning Site:</strong> {selectedSopDetails.details.owningSite}</div>}
                {selectedSopDetails.details?.effectiveDate && <div><strong>Effective Date:</strong> {selectedSopDetails.details.effectiveDate}</div>}
                <div><strong>Assay Category:</strong> {selectedSopDetails.details?.assayCategory || selectedSopDetails.sopSection || "N/A"}</div>
                <div><strong>Method Family:</strong> {selectedSopDetails.details?.methodFamily || "N/A"}</div>
              </div>

              {/* Revision & Amendment History */}
              {selectedSopDetails.details?.revisionHistory && Array.isArray(selectedSopDetails.details.revisionHistory) && selectedSopDetails.details.revisionHistory.length > 0 && (
                <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface-2)" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "13.5px", fontWeight: 700 }}>
                    📜 Revision & Amendment History
                  </h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)" }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface)", borderBottom: "1.5px solid var(--color-border)" }}>
                        <th style={{ padding: "8px", border: "1px solid var(--color-border)", textAlign: "left", width: "15%", fontWeight: 700 }}>Rev No</th>
                        <th style={{ padding: "8px", border: "1px solid var(--color-border)", textAlign: "left", width: "20%", fontWeight: 700 }}>Rev Date</th>
                        <th style={{ padding: "8px", border: "1px solid var(--color-border)", textAlign: "left", fontWeight: 700 }}>Summary of Changes</th>
                        <th style={{ padding: "8px", border: "1px solid var(--color-border)", textAlign: "left", fontWeight: 700 }}>Rationale for Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSopDetails.details.revisionHistory.map((rev: any, idx: number) => (
                        <tr key={idx} style={{ background: "var(--color-surface)" }}>
                          <td style={{ padding: "8px", border: "1px solid var(--color-border)", fontWeight: 600 }}>{rev.revNumber}</td>
                          <td style={{ padding: "8px", border: "1px solid var(--color-border)" }}>{rev.revDate}</td>
                          <td style={{ padding: "8px", border: "1px solid var(--color-border)", whiteSpace: "pre-wrap" }}>{rev.changeSummary}</td>
                          <td style={{ padding: "8px", border: "1px solid var(--color-border)", whiteSpace: "pre-wrap" }}>{rev.changeRationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Electronic Sign-off Status blocks */}
              <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface-2)" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "13.5px", fontWeight: 700 }}>
                  🖋️ Digital Verifications & Sign-off Log
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {/* Author */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--color-surface)", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>AUTHOR</span>
                    <strong style={{ fontSize: "12px" }}>{selectedSopDetails.author}</strong>
                    <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Initiated</span>
                  </div>

                  {/* Verifier User */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--color-surface)", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>VERIFIER (USER)</span>
                    <strong style={{ fontSize: "12px" }}>{selectedSopDetails.details?.proposedVerifier || "Verifier User"}</strong>
                    {selectedSopDetails.details?.electronicSignatures?.verifierUser?.signedAt ? (
                      <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Verified ({selectedSopDetails.details.electronicSignatures.verifierUser.signedAt})</span>
                    ) : (
                      <span style={{ fontSize: "10.5px", color: "#d97706", fontWeight: "bold" }}>🔴 Awaiting sign-off</span>
                    )}
                  </div>

                  {/* Authorizer LM */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--color-surface)", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>AUTHORIZER (LINE MANAGER)</span>
                    <strong style={{ fontSize: "12px" }}>{selectedSopDetails.details?.proposedAuthorizer || "LM Manager"}</strong>
                    {selectedSopDetails.details?.electronicSignatures?.authorizerLm?.signedAt ? (
                      <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Authorized ({selectedSopDetails.details.electronicSignatures.authorizerLm.signedAt})</span>
                    ) : (
                      <span style={{ fontSize: "10.5px", color: "#d97706", fontWeight: "bold" }}>🔴 Awaiting sign-off</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Framework Sections rendering */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    label: "Purpose, Scope & Background",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const purp = det.purpose || det.objectivesScope || "";
                      const sc = det.scope || "";
                      const bg = det.background || "";
                      if (!purp && !sc && !bg) return null;
                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {purp && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Purpose (verbatim):</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(purp) }} />
                            </div>
                          )}
                          {sc && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Scope:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(sc) }} />
                            </div>
                          )}
                          {bg && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Background / Introduction:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(bg) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  { label: "Abbreviations & Definitions", text: selectedSopDetails.details?.abbreviationsDefinitions },
                  {
                    label: "Tasks, Responsibilities & Accountabilities",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const narrative = det.responsibilityAccountability || "";
                      const grid = det.tasksGrid || [];
                      const hasGrid = Array.isArray(grid) && grid.some((r: any) => r.task || r.authorized || r.responsible);
                      if (!narrative && !hasGrid) return null;
                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Responsibility & accountability (narrative):</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                          {hasGrid && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 6, color: "var(--color-text-muted)" }}>Tasks & Roles Matrix:</strong>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)" }}>
                                <thead>
                                  <tr style={{ background: "var(--color-surface-2)" }}>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Task</th>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Authorized</th>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Responsible</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grid.map((row: any, ridx: number) => {
                                    const auth = Array.isArray(row.authorized) ? row.authorized.join(", ") : (row.authorized || "");
                                    const resp = Array.isArray(row.responsible) ? row.responsible.join(", ") : (row.responsible || "");
                                    return (
                                      <tr key={ridx} style={{ background: "var(--color-surface)" }}>
                                        <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{row.task}</td>
                                        <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{auth}</td>
                                        <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{resp}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  // Equipment specific
                  { label: "Equipment Description", text: selectedSopDetails.details?.equipmentDescription },
                  {
                    label: "Environmental & Safety Controls",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const ppe = Array.isArray(det.ppeRequired) ? det.ppeRequired : [];
                      const ppeOther = det.ppeRequiredOther || "";
                      const bsl = det.bslRequired || "";
                      const hazards = Array.isArray(det.hazardsRelevant) ? det.hazardsRelevant : [];
                      const hazardsOther = det.hazardsRelevantOther || "";
                      const waste = det.wasteHandling || "";
                      const addSafety = det.additionalSafety || det.safetyEnvironment || "";

                      const hasAny = ppe.length > 0 || bsl || hazards.length > 0 || waste || addSafety;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {bsl && (
                            <div>
                              <strong>Biosafety Level (BSL) Required:</strong>
                              <span style={{ marginLeft: 8, padding: "2px 8px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: 12, fontWeight: "bold", fontSize: "11px" }}>{bsl}</span>
                            </div>
                          )}
                          {ppe.length > 0 && (
                            <div>
                              <strong>PPE Required:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {ppe.map((p: string) => (
                                  <span key={p} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {p === "Other (specify)" && ppeOther ? `Other: ${ppeOther}` : p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {hazards.length > 0 && (
                            <div>
                              <strong>Hazards Relevant to this Procedure:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {hazards.map((h: string) => (
                                  <span key={h} style={{ padding: "3px 8px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {h === "Other (specify)" && hazardsOther ? `Other: ${hazardsOther}` : h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {waste && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Waste Handling Instructions:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(waste) }} />
                            </div>
                          )}
                          {addSafety && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Additional Safety / Environmental Controls:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(addSafety) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  { label: "Calibration protocol", text: selectedSopDetails.details?.calibration },
                  { label: "Controls schedule", text: selectedSopDetails.details?.controls },
                  { label: "Maintenance instructions", text: selectedSopDetails.details?.maintenance },
                  { label: "Operation steps", text: selectedSopDetails.details?.operation },
                  { label: "Troubleshooting & Problem Solving", text: selectedSopDetails.details?.problemSolving },

                  // Analysis specific
                  { label: "Scientific Principle", text: selectedSopDetails.details?.principleMethodologicalBasis || selectedSopDetails.details?.principle },
                  {
                    label: "Samples / Specimens Covered",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const matrices = Array.isArray(det.sampleMatrices) ? det.sampleMatrices : [];
                      const matricesOther = det.sampleMatricesOther || "";
                      const inputs = Array.isArray(det.inputMaterialTypes) ? det.inputMaterialTypes : [];
                      const inputsOther = det.inputMaterialTypesOther || "";
                      const volume = det.sampleVolume || "";
                      const acceptance = det.sampleAcceptance || "";
                      const rejection = det.sampleRejection || "";

                      const hasAny = matrices.length > 0 || inputs.length > 0 || volume || acceptance || rejection || det.sample;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {det.sample && !acceptance && !rejection && (
                            <div dangerouslySetInnerHTML={{ __html: formatRichText(det.sample) }} />
                          )}
                          {matrices.length > 0 && (
                            <div>
                              <strong>Sample Matrices Covered:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {matrices.map((m: string) => (
                                  <span key={m} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {m === "Other" && matricesOther ? `Other: ${matricesOther}` : m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {inputs.length > 0 && (
                            <div>
                              <strong>Input Material Type(s):</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {inputs.map((i: string) => (
                                  <span key={i} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {i === "Other" && inputsOther ? `Other: ${inputsOther}` : i}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {volume && (
                            <div>
                              <strong>Volume/Amount Required per Sample:</strong>
                              <span style={{ marginLeft: 8, fontWeight: 500 }}>{volume}</span>
                            </div>
                          )}
                          {acceptance && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Sample Acceptance Criteria:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(acceptance) }} />
                            </div>
                          )}
                          {rejection && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Sample Rejection Criteria:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(rejection) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Reagents & Supplies",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const narrative = det.reagentsNarrative || "";
                      const onePerLine = det.reagentsOnePerLine || "";
                      const hasGrid = Array.isArray(det.reagentsGrid) && det.reagentsGrid.some((r: any) => r.item || r.location || r.condition);

                      if (!narrative && !onePerLine && !hasGrid) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Reagents & Supplies Narrative:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                          {onePerLine && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Reagents list:</strong>
                              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {onePerLine.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                                  <li key={idx}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {hasGrid && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 6, color: "var(--color-text-muted)" }}>Reagents & Chemicals Matrix (Legacy):</strong>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)" }}>
                                <thead>
                                  <tr style={{ background: "var(--color-surface-2)" }}>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Item (SOP ref)</th>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Storage Location</th>
                                    <th style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>Storage Condition</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {det.reagentsGrid.map((row: any, ridx: number) => (
                                    <tr key={ridx} style={{ background: "var(--color-surface)" }}>
                                      <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{row.item}</td>
                                      <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{row.location}</td>
                                      <td style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{row.condition}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Equipment & Instruments",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const equip = Array.isArray(det.primaryEquipment) ? det.primaryEquipment : [];
                      const equipOther = det.primaryEquipmentOther || "";
                      const narrative = det.equipmentOnePerLine || det.equipmentSupplies || "";

                      const hasAny = equip.length > 0 || narrative;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {equip.length > 0 && (
                            <div>
                              <strong>Primary Equipment Used:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {equip.map((e: string) => (
                                  <span key={e} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {e === "Other" && equipOther ? `Other: ${equipOther}` : e}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Equipment & Instruments details:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Quality Control procedures",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const controls = Array.isArray(det.controlsIncluded) ? det.controlsIncluded : [];
                      const controlsOther = det.controlsIncludedOther || "";
                      const methods = Array.isArray(det.qcMethods) ? det.qcMethods : [];
                      const methodsOther = det.qcMethodsOther || "";
                      const criteria = det.acceptanceRejectionCriteria || "";
                      const narrative = det.qcNarrative || det.qualityControl || "";

                      const hasAny = controls.length > 0 || methods.length > 0 || criteria || narrative;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {controls.length > 0 && (
                            <div>
                              <strong>Controls Included:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {controls.map((c: string) => (
                                  <span key={c} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {c === "Other" && controlsOther ? `Other: ${controlsOther}` : c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {methods.length > 0 && (
                            <div>
                              <strong>DNA/RNA QC Methods Specified:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {methods.map((m: string) => (
                                  <span key={m} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {m === "Other" && methodsOther ? `Other: ${methodsOther}` : m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {criteria && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Acceptance / Rejection Criteria:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(criteria) }} />
                            </div>
                          )}
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Quality Control Narrative:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Procedure Sequence",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const narrative = det.procedureNarrative || det.procedure || "";
                      const steps = det.procedureOnePerLine || "";

                      if (!narrative && !steps) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Procedure Narrative:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                          {steps && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Step-by-step list:</strong>
                              <ol style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {steps.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                                  <li key={idx} style={{ marginBottom: 4 }}>{line}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Calculations / Data Analysis",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const formulas = det.calculationsFormulas || "";
                      const tools = det.softwareAnalysisTools || "";
                      const rules = det.interpretationThresholds || "";

                      const hasAny = formulas || tools || rules;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {formulas && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Calculations & Formulas:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(formulas) }} />
                            </div>
                          )}
                          {tools && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Software / Analysis Tools Used:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(tools) }} />
                            </div>
                          )}
                          {rules && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Interpretation Rules & Thresholds:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(rules) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Result Reporting & Interpretation",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const format = det.reportingFormat || "";
                      const cutoffs = det.cutOffsThresholds || "";
                      const lims = det.limsDatabaseMapping || "";
                      const narrative = det.resultReportingNarrative || "";

                      const hasAny = format || cutoffs || lims || narrative;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {format && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Reporting Format (units, layout):</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(format) }} />
                            </div>
                          )}
                          {cutoffs && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Cut-offs / Thresholds:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(cutoffs) }} />
                            </div>
                          )}
                          {lims && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>LIMS / Database Field Mapping:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(lims) }} />
                            </div>
                          )}
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Result Reporting Narrative:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    label: "Storage & Transport Requirements",
                    render: () => {
                      const det = selectedSopDetails.details || {};
                      const stTypes = Array.isArray(det.storageSampleTypes) ? det.storageSampleTypes : [];
                      const stTypesOther = det.storageSampleTypesOther || "";
                      const temp = det.storageTemperature || "";
                      const duration = det.maxStorageDuration || "";
                      const modes = Array.isArray(det.acceptableTransportModes) ? det.acceptableTransportModes : [];
                      const modesOther = det.acceptableTransportModesOther || "";
                      const narrative = det.storageTransportNarrative || "";

                      const hasAny = stTypes.length > 0 || temp || duration || modes.length > 0 || narrative;
                      if (!hasAny) return null;

                      return (
                        <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                          {stTypes.length > 0 && (
                            <div>
                              <strong>Sample Types Stored/Transported:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {stTypes.map((t: string) => (
                                  <span key={t} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {t === "Other" && stTypesOther ? `Other: ${stTypesOther}` : t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {temp && (
                            <div>
                              <strong>Recommended Storage Temperature:</strong>
                              <span style={{ marginLeft: 8, padding: "2px 8px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: 12, fontWeight: "bold", fontSize: "11px" }}>{temp}</span>
                            </div>
                          )}
                          {duration && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Maximum Storage Duration:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(duration) }} />
                            </div>
                          )}
                          {modes.length > 0 && (
                            <div>
                              <strong>Acceptable Transport Modes:</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {modes.map((m: string) => (
                                  <span key={m} style={{ padding: "3px 8px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "11px" }}>
                                    {m === "Other" && modesOther ? `Other: ${modesOther}` : m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {narrative && (
                            <div>
                              <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Storage & Transport Narrative:</strong>
                              <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  { label: "Related Documents", text: selectedSopDetails.details?.relatedDocuments },
                  { label: "Related Forms", text: selectedSopDetails.details?.relatedForms },
                  { label: "References", text: selectedSopDetails.details?.references },
                  { label: "Attachments & Annexes", text: selectedSopDetails.details?.attachments }
                ].map((sec: any, sidx) => {
                  if (sec.render) {
                    const renderedResult = sec.render();
                    if (!renderedResult) return null;
                    return (
                      <div key={sidx} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                        <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                          {sec.label}
                        </h4>
                        {renderedResult}
                      </div>
                    );
                  }

                  const hasVal = sec.text || (sec.data && Array.isArray(sec.data) && sec.data.some((r: any) => Object.values(r).some(v => v)));
                  if (!hasVal) return null;

                  return (
                    <div key={sidx} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                        {sec.label}
                      </h4>

                      {sec.text && (
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }} dangerouslySetInnerHTML={{ __html: formatRichText(sec.text) }} />
                      )}

                      {sec.data && sec.grid && (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)" }}>
                          <thead>
                            <tr style={{ background: "var(--color-surface-2)" }}>
                              {sec.grid.map((col: any, cidx: number) => (
                                <th key={cidx} style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left" }}>{col.h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.data.map((row: any, ridx: number) => (
                              <tr key={ridx}>
                                {sec.grid!.map((col: any, cidx: number) => (
                                  <td key={cidx} style={{ padding: "6px 10px", border: "1px solid var(--color-border)" }}>{row[col.k]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ background: "var(--color-surface-2)", padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              {activeTab === "author" && selectedSopDetails.status.toUpperCase() === "DRAFT" && (
                <button
                  onClick={() => handleSubmitForReview(selectedSopDetails)}
                  style={{ background: "#7b1fa2", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}
                >
                  Submit for Review
                </button>
              )}
              {activeTab === "author" && selectedSopDetails.status.toUpperCase() === "RETURNED" && (
                <button
                  onClick={() => {
                    setSelectedSopDetails(null);
                    handleEdit(selectedSopDetails.code);
                  }}
                  style={{ background: "#dd6b20", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}
                >
                  Edit SOP
                </button>
              )}
              <button
                onClick={() => setSelectedSopDetails(null)}
                style={{ background: "var(--color-primary)", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareSop && (
        <div style={modalOverlayStyle}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)", width: 500, maxWidth: "90%", overflow: "hidden" }}>
            <div style={{ background: "var(--color-surface-2)", padding: "16px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>🔗 Share SOP</h3>
              <button onClick={() => setShareSop(null)} style={{ background: "none", border: "none", fontSize: "20px", color: "var(--color-text-muted)", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
                Copy the link below to share access to <strong>{shareSop.code}</strong> with your laboratory staff:
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/domains/qms?view=${shareSop.code}`}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }}
                />
                <button
                  onClick={() => handleCopyLink(shareSop.code)}
                  style={{ background: isCopied ? "#10b981" : "var(--color-primary)", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer", minWidth: 80 }}
                >
                  {isCopied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>

              <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setShareSop(null)} style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA (RENDERED FOR PDF GENERATION) */}
      {printingSop && createPortal(
        <div id="qms-sop-print-area">
          {/* COVER PAGE (PAGE 1) */}
          <div className="cover-page page-break-after" style={{ boxSizing: "border-box", padding: 0 }}>
            <div className="text-center" style={{ width: "100%", marginTop: "0.4in" }}>
              <h1 className="cover-title" style={{ fontSize: "24pt", fontWeight: "800", margin: "0 0 24px 0", color: "#071338ff", fontFamily: '"Times New Roman", Times, serif', letterSpacing: "0.05em", lineHeight: "1.3" }}>
                ARMAUER HANSEN RESEARCH INSTITUTE LABORATORY
              </h1>

              <div style={{ margin: "40px 0" }}>
                <img src={logoAhri} style={{ height: "180px", display: "block", margin: "0 auto" }} alt="AHRI Logo" />
              </div>

              <div style={{ margin: "40px 0" }}>
                <h2 style={{ fontSize: "20pt", fontWeight: "800", margin: "0", color: "#091530ff", fontFamily: '"Times New Roman", Times, serif', padding: "8px 0", textTransform: "uppercase", lineHeight: "1.4" }}>
                  {printingSop.title}
                </h2>
              </div>
            </div>

            {/* Metadata Table Page 1 */}
            <table style={{ width: "calc(100% - 2px)", borderCollapse: "collapse", border: "1.5px solid #000000", marginTop: "50px", fontFamily: '"Times New Roman", Times, serif' }}>
              <tbody>
                {[
                  ["Prepared by", `${printingSop.details?.signoff?.preparedByName || printingSop.author || "N/A"} ${printingSop.details?.signoff?.preparedDate ? `on ${printingSop.details.signoff.preparedDate}` : ""}`],
                  ["Reviewed by", `${printingSop.details?.signoff?.reviewedByName || "N/A"} ${printingSop.details?.signoff?.reviewedDate ? `on ${printingSop.details.signoff.reviewedDate}` : ""}`],
                  ["Approved by", `${printingSop.details?.signoff?.approvedByName || "N/A"} ${printingSop.details?.signoff?.approvedDate ? `on ${printingSop.details.signoff.approvedDate}` : ""}`],
                  ["Effective Date", printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"],
                  ["Version No", printingSop.version],
                  ["Document No", printingSop.code],
                  ["SOP Type", printingSop.sopType || printingSop.sopSection || "Procedure SOP"],
                  ["Assay Category", printingSop.details?.assayCategory || printingSop.sopSection || "N/A"],
                  ["Method Family", printingSop.details?.methodFamily || "N/A"]
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ border: "1.5px solid #000000", padding: "6px 12px", fontWeight: "bold", fontSize: "12pt", width: "30%", color: "#000000", backgroundColor: "#f8fafc", lineHeight: "1.5" }}>
                      {label}:
                    </td>
                    <td style={{ border: "1.5px solid #000000", padding: "6px 12px", fontSize: "12pt", color: "#000000", lineHeight: "1.5" }}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="printable-body-wrapper">
            <table className="print-outer-wrapper-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "none" }}>
              <thead>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* Header Table */}
                    <table style={{ width: "100%", border: "1.5px solid #000000", borderCollapse: "collapse", marginBottom: "15px", fontFamily: '"Times New Roman", Times, serif' }}>
                      <tbody>
                        <tr>
                          <td rowSpan={3} style={{ width: "90px", border: "1.5px solid #000000", textAlign: "center", verticalAlign: "middle", padding: "6px", backgroundColor: "#f8fafc" }}>
                            <img src={logoAhri} style={{ height: "45px", display: "block", margin: "0 auto" }} alt="AHRI Logo" />
                          </td>
                          <td className="header-institution" style={{ border: "1.5px solid #000000", padding: "8px 12px", fontWeight: "bold", fontSize: "11px", color: "#071338ff", textTransform: "uppercase" }}>
                            ARMAUER HANSEN RESEARCH INSTITUTE LABORATORY
                          </td>
                          <td className="header-effective-date" style={{ border: "1.5px solid #000000", padding: "8px 12px", fontSize: "10px", width: "180px", fontWeight: "bold", color: "#490b09ff" }}>
                            Effective Date: {printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #000000", padding: "8px 12px", fontWeight: "bold", fontSize: "12px", color: "#000000", textTransform: "uppercase" }}>
                            TITLE: {printingSop.title}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #000000", padding: 0 }}>
                            <table className="header-inner-table" style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                              <tbody>
                                <tr>
                                  <td className="header-doc-no" style={{ borderRight: "1.5px solid #000000", padding: "6px 12px", fontSize: "10px", fontWeight: "bold", width: "50%", color: "#071338ff" }}>
                                    Document No: {printingSop.code}
                                  </td>
                                  <td className="header-version-no" style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "bold", width: "50%", color: "#490b09ff" }}>
                                    Version No: {printingSop.version}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </thead>

              <tfoot>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    <div className="footer-line" style={{ borderTop: "2.5px solid #071338ff", marginTop: "6px", width: "100%", height: "1px" }} />
                  </td>
                </tr>
              </tfoot>

              <tbody>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* Dynamic section fields printed */}
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000000", lineHeight: "1.5", textAlign: "justify" }}>

                      {/* Revision & Amendment History */}
                      {printingSop.details?.revisionHistory && Array.isArray(printingSop.details.revisionHistory) && printingSop.details.revisionHistory.length > 0 && (
                        <div className="print-section-container">
                          <h3 className="print-section-title" style={{ margin: "14px 0 4px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
                            Revision & Amendment History
                          </h3>
                          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", marginTop: "8px", fontFamily: '"Times New Roman", Times, serif', fontSize: "11pt" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f1f5f9" }}>
                                <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", width: "15%", fontWeight: "bold" }}>Rev No</th>
                                <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", width: "20%", fontWeight: "bold" }}>Rev Date</th>
                                <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Summary of Changes</th>
                                <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Rationale for Change</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printingSop.details.revisionHistory.map((rev: any, idx: number) => (
                                <tr key={idx}>
                                  <td style={{ border: "1.5px solid #000000", padding: "6px", fontWeight: "bold" }}>{rev.revNumber}</td>
                                  <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.revDate}</td>
                                  <td style={{ border: "1.5px solid #000000", padding: "6px", whiteSpace: "pre-wrap" }}>{rev.changeSummary}</td>
                                  <td style={{ border: "1.5px solid #000000", padding: "6px", whiteSpace: "pre-wrap" }}>{rev.changeRationale}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {[
                        {
                          label: "Purpose, Scope & Background",
                          render: () => {
                            const det = printingSop.details || {};
                            const purp = det.purpose || det.objectivesScope || "";
                            const sc = det.scope || "";
                            const bg = det.background || "";
                            if (!purp && !sc && !bg) return null;
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {purp && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Purpose (verbatim):</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(purp) }} />
                                  </div>
                                )}
                                {sc && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Scope:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(sc) }} />
                                  </div>
                                )}
                                {bg && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Background / Introduction:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(bg) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        { label: "Abbreviations & Definitions", text: printingSop.details?.abbreviationsDefinitions },
                        {
                          label: "Tasks, Responsibilities & Accountabilities",
                          render: () => {
                            const det = printingSop.details || {};
                            const narrative = det.responsibilityAccountability || "";
                            const grid = det.tasksGrid || [];
                            const hasGrid = Array.isArray(grid) && grid.some((r: any) => r.task || r.authorized || r.responsible);
                            if (!narrative && !hasGrid) return null;
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {narrative && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Responsibility & accountability (narrative):</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                                {hasGrid && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Tasks & Roles Matrix:</strong>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", marginTop: "4px" }}>
                                      <thead>
                                        <tr style={{ backgroundColor: "#f1f5f9" }}>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Task</th>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Authorized</th>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Responsible</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {grid.map((row: any, ridx: number) => {
                                          const auth = Array.isArray(row.authorized) ? row.authorized.join(", ") : (row.authorized || "");
                                          const resp = Array.isArray(row.responsible) ? row.responsible.join(", ") : (row.responsible || "");
                                          return (
                                            <tr key={ridx}>
                                              <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{row.task}</td>
                                              <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{auth}</td>
                                              <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{resp}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        // Equipment specific
                        { label: "Equipment Description", text: printingSop.details?.equipmentDescription },
                        {
                          label: "Environmental & Safety Controls",
                          render: () => {
                            const det = printingSop.details || {};
                            const ppe = Array.isArray(det.ppeRequired) ? det.ppeRequired : [];
                            const ppeOther = det.ppeRequiredOther || "";
                            const bsl = det.bslRequired || "";
                            const hazards = Array.isArray(det.hazardsRelevant) ? det.hazardsRelevant : [];
                            const hazardsOther = det.hazardsRelevantOther || "";
                            const waste = det.wasteHandling || "";
                            const addSafety = det.additionalSafety || det.safetyEnvironment || "";

                            const hasAny = ppe.length > 0 || bsl || hazards.length > 0 || waste || addSafety;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {bsl && (
                                  <div>
                                    <strong>Biosafety Level (BSL) Required:</strong>
                                    <span style={{ marginLeft: 8, fontWeight: "bold" }}>{bsl}</span>
                                  </div>
                                )}
                                {ppe.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>PPE Required:</strong> {ppe.map((p: string) => p === "Other (specify)" && ppeOther ? `Other: ${ppeOther}` : p).join(", ")}
                                  </div>
                                )}
                                {hazards.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Hazards Relevant:</strong> {hazards.map((h: string) => h === "Other (specify)" && hazardsOther ? `Other: ${hazardsOther}` : h).join(", ")}
                                  </div>
                                )}
                                {waste && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Waste Handling Instructions:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(waste) }} />
                                  </div>
                                )}
                                {addSafety && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Additional Safety / Environmental Controls:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(addSafety) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        { label: "7.1 Calibration", text: printingSop.details?.calibration },
                        { label: "7.2 Controls", text: printingSop.details?.controls },
                        { label: "7.3 Maintenance", text: printingSop.details?.maintenance },
                        { label: "Operation steps", text: printingSop.details?.operation },
                        { label: "Troubleshooting & Problem Solving", text: printingSop.details?.problemSolving },

                        // Analysis specific
                        { label: "Scientific Principle", text: printingSop.details?.principleMethodologicalBasis || printingSop.details?.principle },
                        {
                          label: "Samples / Specimens Covered",
                          render: () => {
                            const det = printingSop.details || {};
                            const matrices = Array.isArray(det.sampleMatrices) ? det.sampleMatrices : [];
                            const matricesOther = det.sampleMatricesOther || "";
                            const inputs = Array.isArray(det.inputMaterialTypes) ? det.inputMaterialTypes : [];
                            const inputsOther = det.inputMaterialTypesOther || "";
                            const volume = det.sampleVolume || "";
                            const acceptance = det.sampleAcceptance || "";
                            const rejection = det.sampleRejection || "";

                            const hasAny = matrices.length > 0 || inputs.length > 0 || volume || acceptance || rejection || det.sample;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {det.sample && !acceptance && !rejection && (
                                  <div dangerouslySetInnerHTML={{ __html: formatRichText(det.sample) }} />
                                )}
                                {matrices.length > 0 && (
                                  <div>
                                    <strong>Sample Matrices Covered:</strong> {matrices.map((m: string) => m === "Other" && matricesOther ? `Other: ${matricesOther}` : m).join(", ")}
                                  </div>
                                )}
                                {inputs.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Input Material Type(s):</strong> {inputs.map((i: string) => i === "Other" && inputsOther ? `Other: ${inputsOther}` : i).join(", ")}
                                  </div>
                                )}
                                {volume && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Volume/Amount Required:</strong> {volume}
                                  </div>
                                )}
                                {acceptance && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Sample Acceptance Criteria:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(acceptance) }} />
                                  </div>
                                )}
                                {rejection && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Sample Rejection Criteria:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(rejection) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Reagents & Supplies",
                          render: () => {
                            const det = printingSop.details || {};
                            const narrative = det.reagentsNarrative || "";
                            const onePerLine = det.reagentsOnePerLine || "";
                            const hasGrid = Array.isArray(det.reagentsGrid) && det.reagentsGrid.some((r: any) => r.item || r.location || r.condition);

                            if (!narrative && !onePerLine && !hasGrid) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {narrative && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Reagents & Supplies Narrative:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                                {onePerLine && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Reagents list:</strong>
                                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                      {onePerLine.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                                        <li key={idx}>{line}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {hasGrid && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Reagents & Chemicals Matrix (Legacy):</strong>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", marginTop: "4px" }}>
                                      <thead>
                                        <tr style={{ backgroundColor: "#f1f5f9" }}>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Item (SOP ref)</th>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Storage Location</th>
                                          <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left" }}>Storage Condition</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {det.reagentsGrid.map((row: any, ridx: number) => (
                                          <tr key={ridx}>
                                            <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{row.item}</td>
                                            <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{row.location}</td>
                                            <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{row.condition}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Equipment & Instruments",
                          render: () => {
                            const det = printingSop.details || {};
                            const equip = Array.isArray(det.primaryEquipment) ? det.primaryEquipment : [];
                            const equipOther = det.primaryEquipmentOther || "";
                            const narrative = det.equipmentOnePerLine || det.equipmentSupplies || "";

                            const hasAny = equip.length > 0 || narrative;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {equip.length > 0 && (
                                  <div>
                                    <strong>Primary Equipment Used:</strong> {equip.map((e: string) => e === "Other" && equipOther ? `Other: ${equipOther}` : e).join(", ")}
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Equipment & Instruments details:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Quality Control procedures",
                          render: () => {
                            const det = printingSop.details || {};
                            const controls = Array.isArray(det.controlsIncluded) ? det.controlsIncluded : [];
                            const controlsOther = det.controlsIncludedOther || "";
                            const methods = Array.isArray(det.qcMethods) ? det.qcMethods : [];
                            const methodsOther = det.qcMethodsOther || "";
                            const criteria = det.acceptanceRejectionCriteria || "";
                            const narrative = det.qcNarrative || det.qualityControl || "";

                            const hasAny = controls.length > 0 || methods.length > 0 || criteria || narrative;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {controls.length > 0 && (
                                  <div>
                                    <strong>Controls Included:</strong> {controls.map((c: string) => c === "Other" && controlsOther ? `Other: ${controlsOther}` : c).join(", ")}
                                  </div>
                                )}
                                {methods.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>DNA/RNA QC Methods Specified:</strong> {methods.map((m: string) => m === "Other" && methodsOther ? `Other: ${methodsOther}` : m).join(", ")}
                                  </div>
                                )}
                                {criteria && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Acceptance / Rejection Criteria:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(criteria) }} />
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Quality Control Narrative:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Procedure Sequence",
                          render: () => {
                            const det = printingSop.details || {};
                            const narrative = det.procedureNarrative || det.procedure || "";
                            const steps = det.procedureOnePerLine || "";

                            if (!narrative && !steps) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {narrative && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Procedure Narrative:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                                {steps && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Step-by-step list:</strong>
                                    <ol style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                      {steps.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                                        <li key={idx} style={{ marginBottom: 4 }}>{line}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Calculations / Data Analysis",
                          render: () => {
                            const det = printingSop.details || {};
                            const formulas = det.calculationsFormulas || "";
                            const tools = det.softwareAnalysisTools || "";
                            const rules = det.interpretationThresholds || "";

                            const hasAny = formulas || tools || rules;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {formulas && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Calculations & Formulas:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(formulas) }} />
                                  </div>
                                )}
                                {tools && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Software / Analysis Tools Used:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(tools) }} />
                                  </div>
                                )}
                                {rules && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Interpretation Rules & Thresholds:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(rules) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Result Reporting & Interpretation",
                          render: () => {
                            const det = printingSop.details || {};
                            const format = det.reportingFormat || "";
                            const cutoffs = det.cutOffsThresholds || "";
                            const lims = det.limsDatabaseMapping || "";
                            const narrative = det.resultReportingNarrative || "";

                            const hasAny = format || cutoffs || lims || narrative;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {format && (
                                  <div>
                                    <strong style={{ textDecoration: "underline" }}>Reporting Format (units, layout):</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(format) }} />
                                  </div>
                                )}
                                {cutoffs && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Cut-offs / Thresholds:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(cutoffs) }} />
                                  </div>
                                )}
                                {lims && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>LIMS / Database Field Mapping:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(lims) }} />
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Result Reporting Narrative:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        {
                          label: "Storage & Transport Requirements",
                          render: () => {
                            const det = printingSop.details || {};
                            const stTypes = Array.isArray(det.storageSampleTypes) ? det.storageSampleTypes : [];
                            const stTypesOther = det.storageSampleTypesOther || "";
                            const temp = det.storageTemperature || "";
                            const duration = det.maxStorageDuration || "";
                            const modes = Array.isArray(det.acceptableTransportModes) ? det.acceptableTransportModes : [];
                            const modesOther = det.acceptableTransportModesOther || "";
                            const narrative = det.storageTransportNarrative || "";

                            const hasAny = stTypes.length > 0 || temp || duration || modes.length > 0 || narrative;
                            if (!hasAny) return null;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {stTypes.length > 0 && (
                                  <div>
                                    <strong>Sample Types Stored/Transported:</strong> {stTypes.map((t: string) => t === "Other" && stTypesOther ? `Other: ${stTypesOther}` : t).join(", ")}
                                  </div>
                                )}
                                {temp && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Recommended Storage Temperature:</strong> <span style={{ fontWeight: "bold" }}>{temp}</span>
                                  </div>
                                )}
                                {duration && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Maximum Storage Duration:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(duration) }} />
                                  </div>
                                )}
                                {modes.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Acceptable Transport Modes:</strong> {modes.map((m: string) => m === "Other" && modesOther ? `Other: ${modesOther}` : m).join(", ")}
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong style={{ textDecoration: "underline" }}>Storage & Transport Narrative:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(narrative) }} />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        },
                        { label: "Related Documents", text: printingSop.details?.relatedDocuments },
                        { label: "Related Forms", text: printingSop.details?.relatedForms },
                        { label: "References", text: printingSop.details?.references },
                        { label: "Attachments & Annexes", text: printingSop.details?.attachments },

                        // Signature logs
                        {
                          label: "Electronic Sign-off Log", data: [
                            { role: "Author", name: printingSop.author, date: printingSop.details?.electronicSignatures?.author?.signedAt || "Signed" },
                            { role: "Verifier (User)", name: printingSop.details?.proposedVerifier || "Verifier User", date: printingSop.details?.electronicSignatures?.verifierUser?.signedAt || "Awaiting" },
                            { role: "Verifier (QO)", name: "QA Officer", date: printingSop.details?.electronicSignatures?.verifierQo?.signedAt || "Awaiting" },
                            { role: "Authorizer (LM)", name: printingSop.details?.proposedAuthorizer || "Laboratory Manager", date: printingSop.details?.electronicSignatures?.authorizerLm?.signedAt || "Awaiting" }
                          ], grid: [
                            { h: "Role", k: "role" },
                            { h: "Name", k: "name" },
                            { h: "Approval Signature / Date", k: "date" }
                          ]
                        }
                      ].map((sec, sidx) => {
                        if (sec.render) {
                          const renderedResult = sec.render();
                          if (!renderedResult) return null;
                          return (
                            <div key={sidx} className="print-section-container">
                              <h3 className="print-section-title" style={{ margin: "14px 0 4px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
                                {sec.label}
                              </h3>
                              {renderedResult}
                            </div>
                          );
                        }

                        const hasVal = sec.text || (sec.data && Array.isArray(sec.data) && sec.data.some((r: any) => Object.values(r).some(v => v)));
                        if (!hasVal) return null;

                        return (
                          <div key={sidx} className="print-section-container">
                            <h3 className="print-section-title" style={{ margin: "14px 0 4px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
                              {sec.label}
                            </h3>

                            {sec.text && (
                              <div style={{ fontSize: "12pt", color: "#000000", textAlign: "justify" }} dangerouslySetInnerHTML={{ __html: formatRichText(sec.text) }} />
                            )}

                            {sec.data && sec.grid && (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt", border: "1px solid #000000", marginTop: "6px" }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9" }}>
                                    {sec.grid.map((col, cidx) => (
                                      <th key={cidx} style={{ padding: "6px 8px", border: "1.5px solid #000000", textAlign: "left", fontWeight: "bold" }}>{col.h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sec.data.map((row: any, ridx: number) => (
                                    <tr key={ridx}>
                                      {sec.grid!.map((col, cidx) => (
                                        <td key={cidx} style={{ padding: "6px 8px", border: "1.5px solid #000000" }}>{row[col.k]}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        , document.body)}

      {/* Dynamic CSS Styling & Print Styling */}
      <style>{`
        @media print {
          #root { display: none !important; }
          body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          #qms-sop-print-area { display: block !important; position: static !important; width: 100% !important; background: #ffffff !important; overflow: visible !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
          #qms-sop-print-area, #qms-sop-print-area * { color: #000000; border-color: #000000; }
          #qms-sop-print-area .cover-title { color: #071338ff !important; }
          #qms-sop-print-area .header-institution { color: #071338ff !important; }
          #qms-sop-print-area .header-effective-date { color: #490b09ff !important; }
          #qms-sop-print-area .header-doc-no { color: #071338ff !important; }
          #qms-sop-print-area .header-version-no { color: #490b09ff !important; }
          #qms-sop-print-area .print-section-title { color: #031755ff !important; }
          #qms-sop-print-area .footer-line { border-top: 2.5px solid #071338ff !important; border-color: #071338ff !important; }
          table.print-outer-wrapper-table { border-collapse: separate !important; border-spacing: 0 !important; width: 100% !important; border: none !important; }
          table.print-outer-wrapper-table > tbody > tr > td, table.print-outer-wrapper-table > thead > tr > td, table.print-outer-wrapper-table > tfoot > tr > td { border: none !important; padding: 0 !important; }
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) { width: calc(100% - 2px) !important; border-collapse: collapse !important; border: 1.5px solid #000000 !important; margin-bottom: 15px !important; margin-right: 2px !important; }
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) td, #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) th { border: 1.5px solid #000000 !important; padding: 6px 12px !important; }
          #qms-sop-print-area table.header-inner-table, #qms-sop-print-area table.header-inner-table td { border: none !important; }
          #qms-sop-print-area table.header-inner-table td.header-doc-no { border-right: 1.5px solid #000000 !important; }
          #qms-sop-print-area p, #qms-sop-print-area div, #qms-sop-print-area li, #qms-sop-print-area span { text-align: justify !important; }
          #qms-sop-print-area h1, #qms-sop-print-area h2, #qms-sop-print-area h3, #qms-sop-print-area h4, #qms-sop-print-area th, #qms-sop-print-area td { text-align: left !important; }
          #qms-sop-print-area .text-center, #qms-sop-print-area .text-center * { text-align: center !important; }
          .cover-page { page-break-after: always !important; break-after: always !important; box-sizing: border-box !important; display: block !important; margin: 0 !important; padding: 0 !important; }
          .print-section-container { page-break-inside: auto !important; break-inside: auto !important; margin-bottom: 10px !important; margin-top: 0 !important; padding: 0 !important; }
          .print-section-container h3 { page-break-after: avoid !important; break-after: avoid !important; margin: 0 0 4px 0 !important; }
          .print-subsection-container { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 6px !important; }
          .print-subsection-container h4 { page-break-after: avoid !important; break-after: avoid !important; margin: 0 0 2px 0 !important; }
          table, tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .page-break-before { page-break-before: always !important; break-before: always !important; }
          .page-break-after { page-break-after: always !important; break-after: always !important; }
          @page {
            size: portrait;
            margin: 0.2in 1.0in 0.8in 1.0in;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "${footerYear}/AHRI-MNTD" !important;
              font-family: "Times New Roman", Times, serif !important;
              font-size: 10px !important;
              font-weight: bold !important;
              color: #490b09ff !important;
              vertical-align: top !important;
              padding-top: 4px !important;
            }
            @bottom-center { content: ""; }
            @bottom-right {
              content: "Page " counter(page) !important;
              font-family: "Times New Roman", Times, serif !important;
              font-size: 10px !important;
              font-weight: bold !important;
              color: #071338ff !important;
              vertical-align: top !important;
              padding-top: 4px !important;
            }
          }
          @page :first {
            margin-top: 1.0in;
            margin-bottom: 1.0in;
            counter-reset: page 0;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: none !important; }
            @bottom-center { content: ""; }
            @bottom-right { content: none !important; }
          }
          .printable-body-wrapper { position: relative; overflow: visible !important; height: auto !important; }
        }

        #qms-sop-print-area { display: none; }
      `}</style>
    </div>
  );
}

// Inline modal styles
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px"
};

const smallModalContainerStyle: React.CSSProperties = {
  width: "420px",
  background: "var(--color-surface-2)",
  borderRadius: "var(--radius-lg)",
  padding: "20px",
  boxShadow: "var(--shadow-lg)",
  border: "1px solid var(--color-border)",
  maxHeight: "90vh",
  overflowY: "auto"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "var(--fs-sm)",
  outline: "none",
  boxSizing: "border-box"
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "var(--fs-sm)",
  outline: "none",
  cursor: "pointer"
};

const btnBaseStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "11px",
  fontWeight: 700,
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  transition: "transform 0.1s ease"
};
