import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchSOPs, fetchAllUsers } from "../../../api/domains";
import { useAuth } from "../../../auth/useAuth";
import logoAhri from "../../../assets/logo_ahri.png";
import logoRoms from "../../../assets/Roms.png";
import { hasTabAccess } from "../../../auth/permissions";

import QMSDashboardView from "./QMSDashboardView";
import QMSReviewerView from "./QMSReviewerView";
import QMSViewerView from "./QMSViewerView";
import SOPResourcesView from "./SOPResourcesView";
import QMSFilterStrip, { matchesSopFilters } from "./QMSFilterStrip";

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
  const location = useLocation();
  const { user } = useAuth();

  const canAccessDashboard = useMemo(() => hasTabAccess(user?.roles, "qms", "overview", user?.permissions), [user]);
  const canAccessAuthor = useMemo(() => hasTabAccess(user?.roles, "qms", "author", user?.permissions), [user]);
  const canAccessQO = useMemo(() => hasTabAccess(user?.roles, "qms", "qo", user?.permissions), [user]);
  const canAccessAuthorizer = useMemo(() => hasTabAccess(user?.roles, "qms", "review-sop", user?.permissions), [user]);

  // Navigation tabs: "overview" (Landing Hub), "sops" (Viewer Library), "author" (Author dashboard), "qo" (QO dashboard), "review-sop" (Reviewers), "resources" (Guides & WHO links)
  const [activeTab, setActiveTab] = useState<"overview" | "sops" | "author" | "qo" | "review-sop" | "resources">("overview");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    if ((activeTab === "overview" || activeTab === "sops" || activeTab === "resources") && !canAccessDashboard) {
      if (canAccessAuthor) setActiveTab("author");
      else if (canAccessQO) setActiveTab("qo");
      else if (canAccessAuthorizer) setActiveTab("review-sop");
    } else if (activeTab === "author" && !canAccessAuthor) {
      if (canAccessDashboard) setActiveTab("overview");
      else if (canAccessQO) setActiveTab("qo");
      else if (canAccessAuthorizer) setActiveTab("review-sop");
    } else if (activeTab === "qo" && !canAccessQO) {
      if (canAccessDashboard) setActiveTab("overview");
      else if (canAccessAuthor) setActiveTab("author");
      else if (canAccessAuthorizer) setActiveTab("review-sop");
    } else if (activeTab === "review-sop" && !canAccessAuthorizer) {
      if (canAccessDashboard) setActiveTab("overview");
      else if (canAccessAuthor) setActiveTab("author");
      else if (canAccessQO) setActiveTab("qo");
    }
  }, [activeTab, canAccessDashboard, canAccessAuthor, canAccessQO, canAccessAuthorizer]);

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
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAllUsers().then(setUsers).catch(console.error);
  }, []);

  const [sops, setSops] = useState<SOPItem[]>([]);
  const [isSopsLoading, setIsSopsLoading] = useState<boolean>(false);
  const [sopsError, setSopsError] = useState<string | null>(null);
  const [localSops, setLocalSops] = useState<SOPItem[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(prev => prev === msg ? null : prev);
    }, 5000);
  };

  // Modals & Popups
  const [selectedSopDetails, setSelectedSopDetails] = useState<SOPItem | null>(null);
  const [selectedSopForReading, setSelectedSopForReading] = useState<SOPItem | null>(null);
  const [shareSop, setShareSop] = useState<SOPItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [shareEmailTo, setShareEmailTo] = useState("");
  const [printingSop, setPrintingSop] = useState<SOPItem | null>(null);

  // Author & QO specific standardized filters & sub-tabs
  const [authorSubTab, setAuthorSubTab] = useState<"status" | "create">("status");
  const [qoSubTab, setQoSubTab] = useState<"active" | "pending">("active");

  const [authorSopTypeFilter, setAuthorSopTypeFilter] = useState<string>("All");
  const [authorStatusFilter, setAuthorStatusFilter] = useState<string>("All");
  const [authorSelectedTitles, setAuthorSelectedTitles] = useState<string[]>([]);

  const [qoSearchText, setQoSearchText] = useState<string>("");
  const [qoSopTypeFilter, setQoSopTypeFilter] = useState<string>("All");
  const [qoStatusFilter, setQoStatusFilter] = useState<string>("All");
  const [qoSelectedTitles, setQoSelectedTitles] = useState<string[]>([]);

  // Author: Request SOP modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestType, setRequestType] = useState<"Procedure SOP" | "Equipment SOP" | "Analysis SOP">("Procedure SOP");
  const [requestVerifier, setRequestVerifier] = useState("");
  const [requestAuthorizer, setRequestAuthorizer] = useState("");
  const [requestAuthorName, setRequestAuthorName] = useState(user?.displayName || "");

  useEffect(() => {
    if (user?.displayName && !requestAuthorName) {
      setRequestAuthorName(user.displayName);
    }
  }, [user, requestAuthorName]);

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

  useEffect(() => {
    if (location.state && (location.state as any).successMessage) {
      triggerSuccess((location.state as any).successMessage);
      // Clear location state after displaying
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Always reset to overview landing page when navigating via sidebar / location key
  useEffect(() => {
    setActiveTab("overview");
    setSelectedSopDetails(null);
    setSelectedSopForReading(null);
    setShareSop(null);
  }, [location.key]);

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
      setQoVerifier(selectedSopForQOApprove.details?.proposedVerifier || " ");
      setQoAuthorizer(selectedSopForQOApprove.details?.proposedAuthorizer || " ");
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
      triggerSuccess("SOP request submitted successfully to QO!");
    } catch (e) {
      console.error(e);
      triggerSuccess("Failed to request SOP.");
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
      triggerSuccess(`SOP Code ${qoAssignedCode} assigned successfully! Template generated and sent to Author.`);
    } catch (e) {
      console.error(e);
      triggerSuccess("Failed to save approved SOP header.");
    }
  };

  // Filtered lists for Author perspective
  const authorSops = useMemo(() => {
    return allSops.filter(sop =>
      matchesSopFilters(sop, {
        sopType: authorSopTypeFilter,
        sopStatus: authorStatusFilter,
        selectedTitles: authorSelectedTitles,
        searchText: searchText
      })
    );
  }, [allSops, searchText, authorSopTypeFilter, authorStatusFilter, authorSelectedTitles]);

  // Filtered lists for QO perspective
  const requestedSopsQO = useMemo(() => {
    return allSops.filter(sop => {
      const isRequested = sop.status.toUpperCase() === "REQUESTED";
      return isRequested && matchesSopFilters(sop, {
        sopType: qoSopTypeFilter,
        sopStatus: "All",
        selectedTitles: qoSelectedTitles,
        searchText: qoSearchText
      });
    });
  }, [allSops, qoSearchText, qoSopTypeFilter, qoSelectedTitles]);

  const existingSopsQO = useMemo(() => {
    return allSops.filter(sop => {
      const isNotRequested = sop.status.toUpperCase() !== "REQUESTED";
      return isNotRequested && matchesSopFilters(sop, {
        sopType: qoSopTypeFilter,
        sopStatus: qoStatusFilter,
        selectedTitles: qoSelectedTitles,
        searchText: qoSearchText
      });
    });
  }, [allSops, qoSearchText, qoSopTypeFilter, qoStatusFilter, qoSelectedTitles]);

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
        triggerSuccess(`SOP ${code} deleted.`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleShare = (sop: SOPItem) => {
    setShareSop(sop);
    setIsCopied(false);
    setShareEmailTo("");
  };

  const handleSendEmail = (sop: SOPItem) => {
    const link = `${window.location.origin}/domains/qms?view=${sop.code}`;
    const subject = encodeURIComponent(`SOP ${sop.code}: ${sop.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease find the SOP details below:\n\nTitle: ${sop.title}\nCode: ${sop.code}\nStatus: ${sop.status}\n\nAccess the SOP here:\n${link}\n\nBest regards`
    );
    const to = encodeURIComponent(shareEmailTo.trim());
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
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
      triggerSuccess(`SOP ${sop.code} has been successfully submitted for review.`);
    } catch (e) {
      console.error(e);
    }
  };

  const footerYear = printingSop
    ? new Date(printingSop.details?.effectiveDate || printingSop.lastUpdated || Date.now()).getFullYear()
    : new Date().getFullYear();

  let dynamicTitle = "Standard Operating Procedure (SOP)";
  let dynamicSubtitle = "";

  if (activeTab === "overview") {
    dynamicTitle = "Standard Operating Procedure (SOP)";
    dynamicSubtitle = "Centralized repository for standard operating procedures, authoring pipelines, quality controls, and reference guidelines.";
  } else if (activeTab === "sops") {
    dynamicTitle = "SOP Library & Reference";
    dynamicSubtitle = "Search, Read, and Download standard operating procedures";
  } else if (activeTab === "author") {
    dynamicTitle = "SOP Drafting & Authoring";
    dynamicSubtitle = "Draft, Revise, and Submit procedures for review";
  } else if (activeTab === "qo") {
    dynamicTitle = "Quality Officer Controls";
    dynamicSubtitle = "Assign codes, and Approve drafting requests";
  } else if (activeTab === "review-sop") {
    dynamicTitle = "Document Approval & Sign-off";
    dynamicSubtitle = "Review queues, Verify, and Authorize";
  } else if (activeTab === "resources") {
    dynamicTitle = "Resources";
    dynamicSubtitle = "SOP Guides, Templates, and Reference Standards";
  }

  const renderSopDetailsInline = () => {
    if (!selectedSopDetails) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
              SOP Details: {selectedSopDetails.code}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{selectedSopDetails.title}</span>
          </div>
          <button
            onClick={() => setSelectedSopDetails(null)}
            style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            ← Back to List
          </button>
        </div>

        {/* Scroll Body */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Reviewer Comments */}
          {activeTab !== "qo" && selectedSopDetails.details?.comments && selectedSopDetails.details.comments.length > 0 && (
            <div style={{ background: "#fffaf0", border: "1px solid #feebc8", borderRadius: "var(--radius)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: "#dd6b20", fontSize: "14px", fontWeight: 700 }}>⚠️ Reviewer Comments & Revision Feedback</h4>
                {selectedSopDetails.status.toUpperCase() === "RETURNED" && (
                  <button onClick={() => { setSelectedSopDetails(null); handleEdit(selectedSopDetails.code); }}
                    style={{ background: "#dd6b20", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
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

          {/* Cover Info / Metadata Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, background: "var(--color-surface-2)", padding: 18, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "12.5px" }}>
            <div><strong>SOP Code:</strong> {selectedSopDetails.code}</div>
            <div><strong>Title:</strong> {selectedSopDetails.title}</div>
            <div><strong>Version:</strong> {selectedSopDetails.version}</div>
            <div><strong>Status:</strong> <span style={{ padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: "11px", ...getStatusColors(selectedSopDetails.status) }}>{selectedSopDetails.status}</span></div>
            <div><strong>Author:</strong> {selectedSopDetails.author}</div>
            <div><strong>SOP Type:</strong> {selectedSopDetails.sopType || selectedSopDetails.sopSection}</div>
            <div><strong>Owning Site:</strong> {selectedSopDetails.details?.owningSite || "AHRI – Addis Ababa"}</div>
            <div><strong>Owning Lab Unit:</strong> {selectedSopDetails.details?.owningLabUnit || selectedSopDetails.sopSubSection || "MNTD Molecular Lab"}</div>
            <div><strong>Proposed Verifier:</strong> {selectedSopDetails.details?.proposedVerifier || "QA Officer"}</div>
            <div><strong>Proposed Authorizer:</strong> {selectedSopDetails.details?.proposedAuthorizer || "Laboratory Manager"}</div>
            <div><strong>Effective Date:</strong> {selectedSopDetails.details?.effectiveDate || "N/A"}</div>
            <div><strong>Next Review Date:</strong> {selectedSopDetails.details?.nextReviewDate || "N/A"}</div>
            <div><strong>Assay Category:</strong> {selectedSopDetails.details?.assayCategory || "N/A"}</div>
            <div><strong>Method Family:</strong> {selectedSopDetails.details?.methodFamily || "N/A"}</div>
          </div>

          {/* Revision & Amendment History */}
          {(selectedSopDetails.details?.annualReviews || selectedSopDetails.details?.versionHistory || selectedSopDetails.details?.amendmentLog) && (
            <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface-2)", display: "flex", flexDirection: "column", gap: 20 }}>
              <h4 style={{ margin: "0 0 4px 0", color: "var(--color-primary)", fontSize: "13.5px", fontWeight: 700 }}>📜 Revision & Amendment History</h4>

              {/* Table A */}
              {selectedSopDetails.details?.annualReviews && selectedSopDetails.details.annualReviews.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>A. Annual Review of Document</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "var(--color-surface)", borderBottom: "1.5px solid var(--color-border)" }}>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Revision No.</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Review Date</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Reviewed By (Name)</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Reviewed By (Sig.)</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approved By (Name)</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approved By (Sig.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSopDetails.details.annualReviews.map((rev: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "6px 8px" }}>{rev.revNo}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.reviewDate}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.reviewedByName}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.reviewedBySignature}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.approvedByName}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.approvedBySignature}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Table B */}
              {selectedSopDetails.details?.versionHistory && selectedSopDetails.details.versionHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>B. Version History</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "var(--color-surface)", borderBottom: "1.5px solid var(--color-border)" }}>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Rev. No.</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Page No.</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Description</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Amend. Date</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Effective Date</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Amend Name</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Amend Sig.</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approval Name</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approval Sig.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSopDetails.details.versionHistory.map((rev: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "6px 8px" }}>{rev.revNo}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.pageNo}</td>
                            <td style={{ padding: "6px 8px", whiteSpace: "pre-wrap" }}>{rev.description}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.amendmentDate}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.effectiveDate}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.amendName}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.amendSignature}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.approvalName}</td>
                            <td style={{ padding: "6px 8px" }}>{rev.approvalSignature}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Table C */}
              {selectedSopDetails.details?.amendmentLog && selectedSopDetails.details.amendmentLog.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>C. Amendment</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface)", borderBottom: "1.5px solid var(--color-border)" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>S.N</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Version No.</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Effective Date</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Changes/Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSopDetails.details.amendmentLog.map((rev: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "6px 8px" }}>{rev.versionNo}</td>
                          <td style={{ padding: "6px 8px" }}>{rev.effectiveDate}</td>
                          <td style={{ padding: "6px 8px", whiteSpace: "pre-wrap" }}>{rev.changesComments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Content Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(selectedSopDetails.sopSection === "Procedure SOP" || selectedSopDetails.sopType === "Procedure SOP") ? (
              <>
                {selectedSopDetails.details?.purpose && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>1. Purpose, Scope & Background</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.purpose) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
                {selectedSopDetails.details?.definitions && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>2. Definitions & Abbreviations</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.definitions) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
                {selectedSopDetails.details?.responsibilities && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>3. Responsibility & Accountability</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.responsibilities) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
                {selectedSopDetails.details?.principle && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>4. Principle of the Method</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.principle) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
                {(selectedSopDetails.details?.sample || selectedSopDetails.details?.sampleMatricesCovered?.length || selectedSopDetails.details?.inputMaterialTypes?.length || selectedSopDetails.details?.volumeRequired || selectedSopDetails.details?.acceptanceCriteria || selectedSopDetails.details?.rejectionCriteria) && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>5. Samples / Specimens Covered</h4>
                    {selectedSopDetails.details?.sample && <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.sample) }} style={{ fontSize: "var(--fs-sm)", marginBottom: 8 }} />}
                    {selectedSopDetails.details?.sampleMatricesCovered && selectedSopDetails.details.sampleMatricesCovered.length > 0 && <div style={{ fontSize: "var(--fs-sm)", marginBottom: 4 }}><strong>Sample Matrices:</strong> {selectedSopDetails.details.sampleMatricesCovered.join(", ")}</div>}
                    {selectedSopDetails.details?.inputMaterialTypes && selectedSopDetails.details.inputMaterialTypes.length > 0 && <div style={{ fontSize: "var(--fs-sm)", marginBottom: 4 }}><strong>Input Materials:</strong> {selectedSopDetails.details.inputMaterialTypes.join(", ")}</div>}
                    {selectedSopDetails.details?.volumeRequired && <div style={{ fontSize: "var(--fs-sm)", marginBottom: 4 }}><strong>Volume Required:</strong> {selectedSopDetails.details.volumeRequired}</div>}
                    {selectedSopDetails.details?.acceptanceCriteria && <div style={{ fontSize: "var(--fs-sm)", marginBottom: 4 }}><strong>Acceptance Criteria:</strong> {selectedSopDetails.details.acceptanceCriteria}</div>}
                    {selectedSopDetails.details?.rejectionCriteria && <div style={{ fontSize: "var(--fs-sm)" }}><strong>Rejection Criteria:</strong> {selectedSopDetails.details.rejectionCriteria}</div>}
                  </div>
                )}
                {selectedSopDetails.details?.stepwise && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>6. Stepwise Procedure</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.stepwise) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
              </>
            ) : (
              <>
                {selectedSopDetails.details?.purpose && (
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>1. Purpose</h4>
                    <div dangerouslySetInnerHTML={{ __html: formatRichText(selectedSopDetails.details.purpose) }} style={{ fontSize: "var(--fs-sm)" }} />
                  </div>
                )}
                {selectedSopDetails.details && Object.keys(selectedSopDetails.details).map((key) => {
                  const val = (selectedSopDetails.details as any)[key];
                  if (typeof val !== "string" || !val || [
                    "purpose", "definitions", "responsibilities", "principle", "sample", "stepwise",
                    "reagentsNarrative", "reagentsOnePerLine", "comments", "revisionHistory",
                    "annualReviews", "versionHistory", "amendmentLog",
                    "proposedVerifier", "proposedAuthorizer", "owningSite", "owningLabUnit",
                    "effectiveDate", "nextReviewDate", "assayCategory", "methodFamily",
                    "electronicSignatures", "collaborationLog", "filenameSuggestion"
                  ].includes(key)) return null;
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                  return (
                    <div key={key} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface)" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>{label}</h4>
                      <div dangerouslySetInnerHTML={{ __html: formatRichText(val) }} style={{ fontSize: "var(--fs-sm)" }} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          {activeTab === "author" && selectedSopDetails.status.toUpperCase() === "DRAFT" && (
            <button onClick={() => handleSubmitForReview(selectedSopDetails)}
              style={{ background: "#7b1fa2", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}>
              Submit for Review
            </button>
          )}
          {activeTab === "author" && selectedSopDetails.status.toUpperCase() === "RETURNED" && (
            <button onClick={() => { setSelectedSopDetails(null); handleEdit(selectedSopDetails.code); }}
              style={{ background: "#dd6b20", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}>
              Edit SOP
            </button>
          )}
          <button onClick={() => setSelectedSopDetails(null)}
            style={{ background: "var(--color-primary)", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}>
            Close View
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }}>
      {/* ── CONTENT PANE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "clip" }}>

        {/* Active Title Block — Inventory-style header */}
        <div
          style={{
            padding: activeTab === "overview" ? "36px 34px 26px" : "28px 34px 24px",
            borderBottom: "1px solid var(--color-divider)",
            background: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: activeTab === "overview" ? "center" : "space-between",
            textAlign: activeTab === "overview" ? "center" : "left",
            flexWrap: "wrap",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Left side: Title + Back Button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: activeTab === "overview" ? "center" : "flex-start", width: activeTab === "overview" ? "100%" : "auto", textAlign: activeTab === "overview" ? "center" : "left", gap: 12, flexShrink: 0 }}>
            {activeTab === "overview" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center" }}>
                <img src={logoAhri} alt="AHRI Logo" style={{ height: "64px", width: "64px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px", border: "1px solid var(--color-border, #cbd5e1)", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)" }} />
                <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--color-primary)", textTransform: "uppercase" }}>
                  Research Operation management system(ROMS)
                </span>
                <div style={{ width: "calc(100% + 68px)", height: "1px", backgroundColor: "var(--color-divider)", margin: "16px -34px" }} />
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                  Standard Operating Procedure (SOP)
                </h1>
                {dynamicSubtitle && (
                  <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "4px 0 0 0", maxWidth: "820px" }}>
                    {dynamicSubtitle}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "left" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  {activeTab === "sops" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0d9488" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  )}
                  {activeTab === "author" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#dd6b20" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                  )}
                  {activeTab === "qo" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#7b1fa2" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                    </svg>
                  )}
                  {activeTab === "review-sop" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#16a34a" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {activeTab === "resources" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#e11d48" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                  <span>{dynamicTitle}</span>
                </h1>
                {dynamicSubtitle && (
                  <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                    {dynamicSubtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right side: Nav Tabs + Action button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Role Tab selection — pill style (shown on sub-pages: SOPs, Author, Quality Officer, Authorizer) */}
            {["sops", "author", "qo", "review-sop"].includes(activeTab) && (
              <nav style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="SOP sections">
                {[
                  {
                    id: "sops",
                    label: "Library",
                    allowed: canAccessDashboard,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0d9488" style={{ width: 14, height: 14, marginRight: 5, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                    )
                  },
                  {
                    id: "author",
                    label: "Authoring",
                    allowed: canAccessAuthor,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#dd6b20" style={{ width: 14, height: 14, marginRight: 5, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    )
                  },
                  {
                    id: "qo",
                    label: "Controls",
                    allowed: canAccessQO,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#7b1fa2" style={{ width: 14, height: 14, marginRight: 5, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                      </svg>
                    )
                  },
                  {
                    id: "review-sop",
                    label: "Approval",
                    allowed: canAccessAuthorizer,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#16a34a" style={{ width: 14, height: 14, marginRight: 5, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  }
                ].filter((t) => t.allowed).map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isHovered = hoveredTab === tab.id;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setCurrentPage(1);
                      }}
                      onMouseEnter={() => setHoveredTab(tab.id)}
                      onMouseLeave={() => setHoveredTab(null)}
                      style={{
                        border: "1px solid",
                        borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                        background: isActive
                          ? "var(--color-primary-highlight)"
                          : (isHovered ? "var(--color-surface-offset)" : "var(--color-surface-2)"),
                        color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                        borderRadius: "999px",
                        padding: "8px 14px",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </div>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {/* Inner Scroll Pane */}
        <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>

          {successMessage && (
            <div style={{
              padding: "10px 14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              color: "#166534",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontWeight: 600 }}>{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
          )}
          {/* sops Error handler */}
          {sopsError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b", marginBottom: 16 }}>
              API synced reading fallback enabled.
            </div>
          )}

          {/* TAB 0: OVERVIEW LANDING PAGE WITH 5 PROCESS CARDS */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "16px 4px 24px" }}>
              {/* 5 Main Process Cards in One Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 16,
                  width: "100%"
                }}
              >
                {[
                  {
                    id: "sops",
                    title: "SOP Library and Reference",
                    allowed: canAccessDashboard,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0d9488" style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                    ),
                    bullets: [
                      {
                        label: "Browse SOP Repository", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        )
                      },
                      {
                        label: "Search by Category", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                          </svg>
                        )
                      },
                      {
                        label: "View Version History", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )
                      },
                      {
                        label: "Download PDF Copies", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        )
                      }
                    ],
                    subtitle: "Search, Read, and Download"
                  },
                  {
                    id: "author",
                    title: "SOP Drafting and Authoring",
                    allowed: canAccessAuthor,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#dd6b20" style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    ),
                    bullets: [
                      {
                        label: "Create New SOP", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        )
                      },
                      {
                        label: "Edit Existing Drafts", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        )
                      },
                      {
                        label: "Save as Draft", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                          </svg>
                        )
                      },
                      {
                        label: "Submit for Review", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      }
                    ],
                    subtitle: "Draft, Revise, and Submit"
                  },
                  {
                    id: "qo",
                    title: "SOP Quality Controls",
                    allowed: canAccessQO,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#7b1fa2" style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                      </svg>
                    ),
                    bullets: [
                      {
                        label: "Assign Reviewers", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7b1fa2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        )
                      },
                      {
                        label: "Return with Comments", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7b1fa2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                        )
                      },
                      {
                        label: "Track Review Progress", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7b1fa2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      }
                    ],
                    subtitle: "Assign, and Approve Requests"
                  },
                  {
                    id: "review-sop",
                    title: "SOP Approval and Sign-off",
                    allowed: canAccessAuthorizer,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#16a34a" style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    bullets: [
                      {
                        label: "Verify Compliance", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      },
                      {
                        label: "Approve or Reject", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.465-.958.742-1.564.742H11.75a1.75 1.75 0 01-1.75-1.75v-1.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v1.25c0 .966-.784 1.75-1.75 1.75H4.25a1.75 1.75 0 01-1.75-1.75V12a1.75 1.75 0 011.75-1.75h2.383z" />
                          </svg>
                        )
                      },
                      {
                        label: "Electronic Sign-off", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        )
                      },
                      {
                        label: "Publish Approved SOPs", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        )
                      }
                    ],
                    subtitle: "Review, Verify, and Authorize"
                  },
                  {
                    id: "resources",
                    title: "Resources Library",
                    allowed: canAccessDashboard,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#e11d48" style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    ),
                    bullets: [
                      {
                        label: "SOP Templates", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#e11d48" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5M8.25 9h1.5" />
                          </svg>
                        )
                      },
                      {
                        label: "Writing Guidelines", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#e11d48" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                          </svg>
                        )
                      },
                      {
                        label: "Regulatory Standards", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#e11d48" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21V3m0 0a9.004 9.004 0 018.716 6.747M12 3a9.004 9.004 0 00-8.716 6.747M3.284 14.253a8.96 8.96 0 010-4.506m17.432 0a8.96 8.96 0 010 4.506" />
                          </svg>
                        )
                      },
                      {
                        label: "Training Documents", icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#e11d48" style={{ width: 16, height: 16, flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                          </svg>
                        )
                      }
                    ],
                    subtitle: "Guides, Templates, and Standards"
                  }
                ].map((card) => {
                  const isAllowed = card.allowed;
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (!isAllowed) return;
                        setActiveTab(card.id as any);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "20px",
                        padding: "26px 22px 22px",
                        cursor: isAllowed ? "pointer" : "not-allowed",
                        opacity: isAllowed ? 1 : 0.55,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease-in-out",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                        minHeight: "300px",
                        height: "340px",
                        position: "relative"
                      }}
                      onMouseEnter={(e) => {
                        if (!isAllowed) return;
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.08)";
                        e.currentTarget.style.borderColor = "var(--color-primary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isAllowed) return;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.04)";
                        e.currentTarget.style.borderColor = "var(--color-border)";
                      }}
                    >
                      {/* Header with Icon in front of neutral title text */}
                      <h1
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--color-text)",
                          margin: 0,
                          lineHeight: "1.3",
                          borderBottom: "1px solid var(--color-border)",
                          paddingBottom: "10px",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          width: "100%"
                        }}
                      >
                        {card.icon}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</span>
                        {!isAllowed && (
                          <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(220,38,38,0.12)", color: "#b91c1c", padding: "2px 8px", borderRadius: "12px", marginLeft: "auto", flexShrink: 0 }}>
                            🔒 Restricted
                          </span>
                        )}
                      </h1>

                    {/* Middle area with bullets */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", justifyContent: "flex-start", paddingLeft: "4px" }}>
                      {card.bullets.map((b, idx) => (
                        <div key={idx} style={{ fontSize: "13px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "8px", lineHeight: "1.4" }}>
                          {b.icon}
                          <span>{b.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom area: line first, then sub-topic subtitle under line */}
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Thin non-bold divider line */}
                      <div
                        style={{
                          height: "1px",
                          background: "var(--color-border)",
                          width: "100%"
                        }}
                      />

                      {/* Sub Topic subtitle under the line */}
                      <h3
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: "var(--color-text-muted)",
                          margin: 0,
                          lineHeight: "1.5"
                        }}
                      >
                        {card.subtitle}
                      </h3>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TAB 1: REFERENCE LIBRARY (VIEWER) */}
          {activeTab === "sops" && (
            <QMSViewerView
              sops={allSops}
              onPrintRequest={(sop) => handlePrintPDF(sop)}
              selectedSopForReading={selectedSopForReading}
              setSelectedSopForReading={setSelectedSopForReading}
            />
          )}

          {/* TAB 5: RESOURCES VIEW */}
          {activeTab === "resources" && (
            <SOPResourcesView />
          )}

          {/* TAB 2: AUTHOR PERSPECTIVE */}
          {activeTab === "author" && (
            shareSop ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>🔗 Share SOP</h3>
                  <button onClick={() => setShareSop(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}>Back to List</button>
                </div>
                <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* SOP info chip */}
                  <div style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: "var(--fs-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
                    📄 {shareSop.code} — {shareSop.title}
                  </div>
                  {/* Copy Link */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>🔗 Copy Link</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" readOnly value={`${window.location.origin}/domains/qms?view=${shareSop.code}`} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleCopyLink(shareSop.code)} style={{ background: isCopied ? "#10b981" : "var(--color-primary)", color: "#ffffff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer", minWidth: 100, transition: "background 0.2s" }}>
                        {isCopied ? "Copied! ✓" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                  {/* Share via Email */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600, borderTop: "1px solid var(--color-divider)", paddingTop: 18 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>✉️ Share via Email</label>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: 0 }}>Enter the recipient's email address. Your default mail client will open with the SOP link and details pre-filled.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="email" placeholder="recipient@example.com" value={shareEmailTo} onChange={(e) => setShareEmailTo(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleSendEmail(shareSop)} disabled={!shareEmailTo.trim()} style={{ background: shareEmailTo.trim() ? "#0ea5e9" : "var(--color-surface-offset)", color: shareEmailTo.trim() ? "#ffffff" : "var(--color-text-muted)", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: shareEmailTo.trim() ? "pointer" : "not-allowed", minWidth: 120, transition: "background 0.2s" }}>✉️ Send Email</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : isRequestModalOpen ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                    Request New SOP Drafting
                  </h3>
                  <button
                    onClick={() => setIsRequestModalOpen(false)}
                    style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}
                  >
                    Back to List
                  </button>
                </div>

                {/* Scroll Body */}
                <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Proposed SOP Title *</label>
                    <input
                      type="text"
                      placeholder=" "
                      value={requestTitle}
                      onChange={(e) => setRequestTitle(e.target.value)}
                      style={{ ...inputStyle, padding: "10px 12px" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Author Name / Initials *</label>
                    <input
                      type="text"
                      disabled
                      placeholder=" "
                      value={requestAuthorName}
                      onChange={(e) => setRequestAuthorName(e.target.value)}
                      style={{ ...inputStyle, padding: "10px 12px", backgroundColor: "var(--color-surface-offset)", cursor: "not-allowed" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Type *</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as any)}
                      style={{ ...selectStyle, padding: "10px 12px" }}
                    >
                      <option value="Analysis SOP">Analysis SOP</option>
                      <option value="Equipment SOP">Equipment SOP</option>
                      <option value="Procedure SOP">Procedure SOP</option>
                    </select>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button onClick={() => setIsRequestModalOpen(false)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)", padding: "8px 16px" }}>Cancel</button>
                  <button onClick={handleRequestSOP} style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff", padding: "8px 16px" }}>Request SOP</button>
                </div>
              </div>
            ) : selectedSopDetails ? (
              renderSopDetailsInline()
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Search and Filters for Author — standardized filter strip */}
                <QMSFilterStrip
                  allSops={allSops}
                  sopType={authorSopTypeFilter}
                  onSopTypeChange={setAuthorSopTypeFilter}
                  sopStatus={authorStatusFilter}
                  onSopStatusChange={setAuthorStatusFilter}
                  selectedTitles={authorSelectedTitles}
                  onSelectedTitlesChange={setAuthorSelectedTitles}
                  searchText={searchText}
                  onSearchTextChange={setSearchText}
                  onClearAll={() => {
                    setAuthorSopTypeFilter("All");
                    setAuthorStatusFilter("All");
                    setAuthorSelectedTitles([]);
                    setSearchText("");
                  }}
                />

                {/* Left-aligned Side-by-Side Action Sub-Navigation Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setAuthorSubTab("status")}
                    style={{
                      background: authorSubTab === "status" ? "var(--color-primary)" : "var(--color-surface)",
                      color: authorSubTab === "status" ? "#ffffff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                      padding: "7px 16px",
                      borderRadius: "var(--radius-sm, 6px)",
                      fontSize: "var(--fs-xs)",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    📊 SOP Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthorSubTab("create")}
                    style={{
                      background: authorSubTab === "create" ? "var(--color-primary)" : "var(--color-surface)",
                      color: authorSubTab === "create" ? "#ffffff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                      padding: "7px 16px",
                      borderRadius: "var(--radius-sm, 6px)",
                      fontSize: "var(--fs-xs)",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    ➕ Create New SOP
                  </button>
                </div>

                {authorSubTab === "create" ? (
                  <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                    <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                        Request New SOP Drafting
                      </h3>
                      <button onClick={() => setAuthorSubTab("status")} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}>
                        Back to List
                      </button>
                    </div>
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                        <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Proposed SOP Title *</label>
                        <input
                          type="text"
                          placeholder=" "
                          value={requestTitle}
                          onChange={(e) => setRequestTitle(e.target.value)}
                          style={{ ...inputStyle, padding: "10px 12px" }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                        <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Author Name / Initials *</label>
                        <input
                          type="text"
                          disabled
                          placeholder=" "
                          value={requestAuthorName}
                          onChange={(e) => setRequestAuthorName(e.target.value)}
                          style={{ ...inputStyle, padding: "10px 12px", backgroundColor: "var(--color-surface-offset)", cursor: "not-allowed" }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                        <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Type *</label>
                        <select
                          value={requestType}
                          onChange={(e) => setRequestType(e.target.value as any)}
                          style={{ ...selectStyle, padding: "10px 12px" }}
                        >
                          <option value="Analysis SOP">Analysis SOP</option>
                          <option value="Equipment SOP">Equipment SOP</option>
                          <option value="Procedure SOP">Procedure SOP</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                      <button onClick={() => setAuthorSubTab("status")} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)", padding: "8px 16px" }}>Cancel</button>
                      <button onClick={() => { handleRequestSOP(); setAuthorSubTab("status"); }} style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff", padding: "8px 16px" }}>Request SOP</button>
                    </div>
                  </div>
                ) : (
                  <>
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
                                  <td style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text)", fontFamily: "monospace", letterSpacing: "0.02em" }}>{sop.code}</td>
                                  <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{sop.title}</td>
                                  <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.sopType || sop.sopSection || "Procedure SOP"}</td>
                                  <td style={{ padding: "12px 16px", fontSize: "10px" }}>
                                    <span style={{ padding: "3px 8px", borderRadius: "10px", fontWeight: 700, background: statusColor.bg, color: statusColor.text, textTransform: "uppercase" }}>
                                      {sop.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 16px", display: "flex", gap: 12, justifyContent: "center" }}>
                                    <button onClick={() => handleViewDetails(sop)} title="View" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>📖</button>

                                    {(() => {
                                      const isEditable = sop.status.toUpperCase() === "DRAFT" || sop.status.toUpperCase() === "RETURNED";
                                      return (
                                        <button
                                          disabled={!isEditable}
                                          onClick={() => isEditable && handleEdit(sop.code)}
                                          title={isEditable ? "Edit SOP" : "Only Draft or Returned SOPs can be edited"}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            cursor: isEditable ? "pointer" : "not-allowed",
                                            opacity: isEditable ? 1 : 0.35,
                                          }}
                                        >
                                          <EditIcon />
                                        </button>
                                      );
                                    })()}

                                    <button onClick={() => handlePrintPDF(sop)} title="Print" style={{ background: "none", border: "none", cursor: "pointer" }}>🖨️</button>
                                    <button onClick={() => handleShare(sop)} title="Share" style={{ background: "none", border: "none", cursor: "pointer" }}>🔗</button>
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
                  </>
                )}
              </div>
            )
          )}

          {/* TAB 3: QUALITY OFFICER (QO) PERSPECTIVE */}
          {activeTab === "qo" && (
            shareSop ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>🔗 Share SOP</h3>
                  <button onClick={() => setShareSop(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}>Back to List</button>
                </div>
                <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: "var(--fs-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
                    📄 {shareSop.code} — {shareSop.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>🔗 Copy Link</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" readOnly value={`${window.location.origin}/domains/qms?view=${shareSop.code}`} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleCopyLink(shareSop.code)} style={{ background: isCopied ? "#10b981" : "var(--color-primary)", color: "#ffffff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer", minWidth: 100, transition: "background 0.2s" }}>
                        {isCopied ? "Copied! ✓" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600, borderTop: "1px solid var(--color-divider)", paddingTop: 18 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>✉️ Share via Email</label>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: 0 }}>Enter the recipient's email address. Your default mail client will open with the SOP link and details pre-filled.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="email" placeholder="recipient@example.com" value={shareEmailTo} onChange={(e) => setShareEmailTo(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleSendEmail(shareSop)} disabled={!shareEmailTo.trim()} style={{ background: shareEmailTo.trim() ? "#0ea5e9" : "var(--color-surface-offset)", color: shareEmailTo.trim() ? "#ffffff" : "var(--color-text-muted)", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: shareEmailTo.trim() ? "pointer" : "not-allowed", minWidth: 120, transition: "background 0.2s" }}>✉️ Send Email</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedSopForQOApprove ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Code Assign & Approve Request</h3>
                  <button onClick={() => setSelectedSopForQOApprove(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}>
                    Back to List
                  </button>
                </div>
                <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--color-surface-2)", padding: 16, borderRadius: 8, fontSize: "12px", border: "1px solid var(--color-border)", maxWidth: "600px" }}>
                    <div><strong>Proposed Title:</strong> {selectedSopForQOApprove.title}</div>
                    <div><strong>SOP Type:</strong> {selectedSopForQOApprove.sopType}</div>
                    <div><strong>Author:</strong> {selectedSopForQOApprove.author}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "600px" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Assign SOP Code *</label>
                    <input type="text" placeholder=" " value={qoAssignedCode} onChange={(e) => setQoAssignedCode(e.target.value)} style={{ ...inputStyle, padding: "10px 12px" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "600px" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Verifier User Name *</label>
                    <select value={qoVerifier} onChange={(e) => setQoVerifier(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", outline: "none", backgroundColor: "var(--color-surface-2)" }}>
                      <option value="" disabled>Select Verifier</option>
                      {users.map(u => (
                        <option key={u.id} value={u.displayName}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "600px" }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Authorizer Name (LM) *</label>
                    <select value={qoAuthorizer} onChange={(e) => setQoAuthorizer(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", outline: "none", backgroundColor: "var(--color-surface-2)" }}>
                      <option value="" disabled>Select Authorizer</option>
                      {users.map(u => (
                        <option key={u.id} value={u.displayName}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button onClick={() => setSelectedSopForQOApprove(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)", padding: "8px 16px" }}>Cancel</button>
                  <button onClick={handleQOApprove} style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff", padding: "8px 16px" }}>Approve & Send Draft</button>
                </div>
              </div>
            ) : selectedSopDetails ? (
              renderSopDetailsInline()
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Search & Filters for QO — standardized filter strip */}
                <QMSFilterStrip
                  allSops={allSops}
                  sopType={qoSopTypeFilter}
                  onSopTypeChange={setQoSopTypeFilter}
                  sopStatus={qoStatusFilter}
                  onSopStatusChange={setQoStatusFilter}
                  selectedTitles={qoSelectedTitles}
                  onSelectedTitlesChange={setQoSelectedTitles}
                  searchText={qoSearchText}
                  onSearchTextChange={setQoSearchText}
                  onClearAll={() => {
                    setQoSopTypeFilter("All");
                    setQoStatusFilter("All");
                    setQoSelectedTitles([]);
                    setQoSearchText("");
                  }}
                />

                {/* Left-aligned Side-by-Side Action Sub-Navigation Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setQoSubTab("active")}
                    style={{
                      background: qoSubTab === "active" ? "var(--color-primary)" : "var(--color-surface)",
                      color: qoSubTab === "active" ? "#ffffff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                      padding: "7px 16px",
                      borderRadius: "var(--radius-sm, 6px)",
                      fontSize: "var(--fs-xs)",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    📋 Active SOP
                  </button>
                  <button
                    type="button"
                    onClick={() => setQoSubTab("pending")}
                    style={{
                      background: qoSubTab === "pending" ? "var(--color-primary)" : "var(--color-surface)",
                      color: qoSubTab === "pending" ? "#ffffff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                      padding: "7px 16px",
                      borderRadius: "var(--radius-sm, 6px)",
                      fontSize: "var(--fs-xs)",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    🔔 Pending SOP Request ({requestedSopsQO.length})
                  </button>
                </div>

                {qoSubTab === "pending" ? (
                  /* Pending SOP Requests */
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0", color: "var(--color-primary)" }}>🔔 Pending SOP Requests ({requestedSopsQO.length})</h3>
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
                          {requestedSopsQO.length > 0 ? requestedSopsQO.map((sop) => (
                            <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)", fontSize: "var(--fs-sm)" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{sop.title}</td>
                              <td style={{ padding: "10px 14px" }}>{sop.sopType || "Procedure SOP"}</td>
                              <td style={{ padding: "10px 14px" }}>{sop.author}</td>
                              <td style={{ padding: "10px 14px" }}>{sop.details?.proposedAuthorizer}</td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                <button onClick={() => setSelectedSopForQOApprove(sop)} style={{ background: "var(--color-primary)", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: "11px" }}>Approve & Code</button>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--color-text-faint)", fontSize: "var(--fs-sm)" }}>No pending requests matching criteria.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Active SOPs */
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0" }}>📋 Active SOP Document Controls ({existingSopsQO.length})</h3>
                    <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", fontSize: "var(--fs-xs)" }}>
                            <th style={{ padding: "10px 14px", textAlign: "left", width: 140 }}>SOP Code</th>
                            <th style={{ padding: "10px 14px", textAlign: "left" }}>Title</th>
                            <th style={{ padding: "10px 14px", textAlign: "left", width: 150 }}>SOP Type</th>
                            <th style={{ padding: "10px 14px", textAlign: "left", width: 150 }}>Status</th>
                            <th style={{ padding: "10px 14px", textAlign: "center", width: 150 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {existingSopsQO.length > 0 ? existingSopsQO.map((sop) => (
                            <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)", fontSize: "var(--fs-sm)" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.02em" }}>{sop.code}</td>
                              <td style={{ padding: "10px 14px" }}>{sop.title}</td>
                              <td style={{ padding: "10px 14px" }}>{sop.sopType || sop.sopSection || "Procedure SOP"}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: "10px", padding: "2.5px 6px", borderRadius: 4, background: getStatusColors(sop.status).bg, color: getStatusColors(sop.status).text, fontWeight: "bold", textTransform: "uppercase" }}>{sop.status}</span>
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                  <button onClick={() => handleViewDetails(sop)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>📖</button>
                                  <button onClick={() => handleShare(sop)} title="Share" style={{ background: "none", border: "none", cursor: "pointer" }}>🔗</button>
                                  <button onClick={() => handlePrintPDF(sop)} style={{ background: "none", border: "none", cursor: "pointer" }}>🖨️</button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--color-text-faint)", fontSize: "var(--fs-sm)" }}>No coded SOPs matching criteria.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB 4: REVIEWERS & AUTHORIZERS */}
          {activeTab === "review-sop" && (
            shareSop ? (
              <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 680, margin: "0 auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                <div style={{ background: "var(--color-bg)", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>🔗 Share SOP</h3>
                  <button onClick={() => setShareSop(null)} style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}>Back to List</button>
                </div>
                <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: "var(--fs-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
                    📄 {shareSop.code} — {shareSop.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>🔗 Copy Link</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" readOnly value={`${window.location.origin}/domains/qms?view=${shareSop.code}`} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleCopyLink(shareSop.code)} style={{ background: isCopied ? "#10b981" : "var(--color-primary)", color: "#ffffff", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: "pointer", minWidth: 100, transition: "background 0.2s" }}>
                        {isCopied ? "Copied! ✓" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600, borderTop: "1px solid var(--color-divider)", paddingTop: 18 }}>
                    <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>✉️ Share via Email</label>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: 0 }}>Enter the recipient's email address. Your default mail client will open with the SOP link and details pre-filled.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="email" placeholder="recipient@example.com" value={shareEmailTo} onChange={(e) => setShareEmailTo(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--fs-xs)", outline: "none" }} />
                      <button onClick={() => handleSendEmail(shareSop)} disabled={!shareEmailTo.trim()} style={{ background: shareEmailTo.trim() ? "#0ea5e9" : "var(--color-surface-offset)", color: shareEmailTo.trim() ? "#ffffff" : "var(--color-text-muted)", border: "none", padding: "10px 16px", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-xs)", fontWeight: 600, cursor: shareEmailTo.trim() ? "pointer" : "not-allowed", minWidth: 120, transition: "background 0.2s" }}>✉️ Send Email</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <QMSReviewerView
                sops={allSops}
                onSopUpdate={(updatedList) => {
                  setLocalSops(updatedList);
                }}
                onPrintRequest={handlePrintPDF}
                onShareRequest={handleShare}
                onSopApproved={(sop) => {
                  setActiveTab("sops");
                  setSelectedSopForReading(sop);
                  handlePrintPDF(sop);
                }}
                showSuccessMessage={triggerSuccess}
              />
            )
          )}

        </div>
      </div>




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
                <h2 style={{ fontSize: "16pt", fontWeight: "800", margin: "0", color: "#091530ff", fontFamily: '"Times New Roman", Times, serif', padding: "8px 0", textTransform: "uppercase", lineHeight: "1.4" }}>
                  {printingSop.title}
                </h2>
              </div>
            </div>

            {/* Metadata Table Page 1 */}
            <table style={{ width: "calc(100% - 2px)", borderCollapse: "collapse", border: "1.5px solid #000000", marginTop: "20px", fontFamily: '"Times New Roman", Times, serif' }}>
              <tbody>
                {[
                  ["Prepared by", printingSop.details?.signoff?.preparedByName || printingSop.author || "N/A"],
                  ["Reviewed by", printingSop.details?.signoff?.reviewedByName || "N/A"],
                  ["Approved by", printingSop.details?.signoff?.approvedByName || "N/A"],
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
                    <div style={{ height: "20px" }} />
                  </td>
                </tr>
              </tfoot>

              <tbody>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* Dynamic section fields printed */}
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000000", lineHeight: "1.5", textAlign: "justify" }}>

                      {/* Revision & Amendment History */}
                      {(printingSop.details?.annualReviews || printingSop.details?.versionHistory || printingSop.details?.amendmentLog) && (
                        <div className="print-section-container">
                          <h3 className="print-section-title" style={{ margin: "10px 0 3px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
                            Revision & Amendment History
                          </h3>

                          {/* Table A: Annual Review of Document */}
                          {printingSop.details?.annualReviews && printingSop.details.annualReviews.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <strong style={{ display: "block", marginBottom: "4px", fontSize: "11pt", textTransform: "uppercase", color: "#031755ff" }}>A. Annual Review of Document</strong>
                              <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: '"Times New Roman", Times, serif', fontSize: "11pt" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Revision No.</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Review Date</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Reviewed By (Name)</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Reviewed By (Sig.)</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Approved By (Name)</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Approved By (Sig.)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {printingSop.details.annualReviews.map((rev: any, idx: number) => (
                                    <tr key={idx}>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.revNo || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.reviewDate || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.reviewedByName || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.reviewedBySignature || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.approvedByName || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.approvedBySignature || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Table B: Version History */}
                          {printingSop.details?.versionHistory && printingSop.details.versionHistory.length > 0 && (
                            <div style={{ marginTop: "14px" }}>
                              <strong style={{ display: "block", marginBottom: "4px", fontSize: "11pt", textTransform: "uppercase", color: "#031755ff" }}>B. Version History</strong>
                              <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: '"Times New Roman", Times, serif', fontSize: "10pt" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Rev. No.</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Page No.</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Description</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Amend. Date</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Effective Date</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Amend Name</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Amend Sig.</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Approval Name</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "4px", textAlign: "left", fontWeight: "bold" }}>Approval Sig.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {printingSop.details.versionHistory.map((rev: any, idx: number) => (
                                    <tr key={idx}>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.revNo || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.pageNo || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px", whiteSpace: "pre-wrap" }}>{rev.description || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.amendmentDate || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.effectiveDate || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.amendName || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.amendSignature || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.approvalName || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "4px" }}>{rev.approvalSignature || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Table C: Amendment Log */}
                          {printingSop.details?.amendmentLog && printingSop.details.amendmentLog.length > 0 && (
                            <div style={{ marginTop: "14px" }}>
                              <strong style={{ display: "block", marginBottom: "4px", fontSize: "11pt", textTransform: "uppercase", color: "#031755ff" }}>C. Amendment</strong>
                              <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: '"Times New Roman", Times, serif', fontSize: "11pt" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold", width: "10%" }}>S.N</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold", width: "20%" }}>Version No.</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold", width: "25%" }}>Effective Date</th>
                                    <th style={{ border: "1.5px solid #000000", padding: "6px", textAlign: "left", fontWeight: "bold" }}>Changes/Comments</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {printingSop.details.amendmentLog.map((rev: any, idx: number) => (
                                    <tr key={idx}>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px", fontWeight: "bold" }}>{idx + 1}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.versionNo || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px" }}>{rev.effectiveDate || "-"}</td>
                                      <td style={{ border: "1.5px solid #000000", padding: "6px", whiteSpace: "pre-wrap" }}>{rev.changesComments || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
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
                                    <strong>Purpose:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(purp) }} />
                                  </div>
                                )}
                                {sc && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Scope:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(sc) }} />
                                  </div>
                                )}
                                {bg && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Background / Introduction:</strong>
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
                                    <strong>Waste Handling Instructions:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(waste) }} />
                                  </div>
                                )}
                                {addSafety && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Additional Safety / Environmental Controls:</strong>
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
                                    <strong>Sample Acceptance Criteria:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(acceptance) }} />
                                  </div>
                                )}
                                {rejection && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Sample Rejection Criteria:</strong>
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
                                    <strong>Reagents & Chemicals Matrix:</strong>
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
                                    <strong>Acceptance / Rejection Criteria:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(criteria) }} />
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
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
                                    <strong>Calculations & Formulas:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(formulas) }} />
                                  </div>
                                )}
                                {tools && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Software / Analysis Tools Used:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(tools) }} />
                                  </div>
                                )}
                                {rules && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Interpretation Rules & Thresholds:</strong>
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
                                    <strong>Reporting Format (units, layout):</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(format) }} />
                                  </div>
                                )}
                                {cutoffs && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Cut-offs / Thresholds:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(cutoffs) }} />
                                  </div>
                                )}
                                {lims && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>LIMS / Database Field Mapping:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: formatRichText(lims) }} />
                                  </div>
                                )}
                                {narrative && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>Result Reporting Narrative:</strong>
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
                                    <strong>Maximum Storage Duration:</strong>
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
                                    <strong>Storage & Transport Narrative:</strong>
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
                              <h3 className="print-section-title" style={{ margin: "10px 0 3px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
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
                            <h3 className="print-section-title" style={{ margin: "10px 0 3px 0", fontSize: "13pt", fontWeight: "bold", color: "#031755ff", textTransform: "uppercase" }}>
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
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) { width: calc(100% - 2px) !important; border-collapse: collapse !important; border: 1.5px solid #000000 !important; margin-bottom: 8px !important; margin-right: 2px !important; }
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) td, #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) th { border: 1.5px solid #000000 !important; padding: 6px 12px !important; }
          #qms-sop-print-area table.header-inner-table, #qms-sop-print-area table.header-inner-table td { border: none !important; }
          #qms-sop-print-area table.header-inner-table td.header-doc-no { border-right: 1.5px solid #000000 !important; }
          #qms-sop-print-area p, #qms-sop-print-area div, #qms-sop-print-area li, #qms-sop-print-area span { text-align: justify !important; }
          #qms-sop-print-area h1, #qms-sop-print-area h2, #qms-sop-print-area h3, #qms-sop-print-area h4, #qms-sop-print-area th, #qms-sop-print-area td { text-align: left !important; }
          #qms-sop-print-area .text-center, #qms-sop-print-area .text-center * { text-align: center !important; }
          .cover-page { page-break-after: always !important; break-after: always !important; box-sizing: border-box !important; display: block !important; margin: 0 !important; padding: 0 !important; }
          .print-section-container { page-break-inside: auto !important; break-inside: auto !important; margin-bottom: 6px !important; margin-top: 0 !important; padding: 0 !important; }
          .print-section-container h3 { page-break-after: avoid !important; break-after: avoid !important; margin: 10px 0 3px 0 !important; }
          .print-subsection-container { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 4px !important; }
          .print-subsection-container h4 { page-break-after: avoid !important; break-after: avoid !important; margin: 0 0 2px 0 !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          table.print-outer-wrapper-table,
          table.print-outer-wrapper-table > tbody > tr,
          table.print-outer-wrapper-table > tbody > tr > td {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .page-break-before { page-break-before: always !important; break-before: always !important; }
          .page-break-after { page-break-after: always !important; break-after: always !important; }
          @page {
            size: portrait;
            margin: 0.2in 1.0in 0.8in 1.0in;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "${footerYear}/AHRI-MNTD";
              font-family: "Times New Roman", Times, serif;
              font-size: 10px;
              font-weight: bold;
              color: #490b09ff;
              vertical-align: top;
              padding-top: 6px;
              border-top: 2.5px solid #071338ff;
            }
            @bottom-center {
              content: "";
              vertical-align: top;
              padding-top: 6px;
              border-top: 2.5px solid #071338ff;
            }
            @bottom-right {
              content: "Page " counter(page);
              font-family: "Times New Roman", Times, serif;
              font-size: 10px;
              font-weight: bold;
              color: #071338ff;
              vertical-align: top;
              padding-top: 6px;
              border-top: 2.5px solid #071338ff;
            }
          }
          @page :first {
            margin-top: 1.0in;
            margin-bottom: 1.0in;
            counter-reset: page 0;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "";
              border-top: none;
            }
            @bottom-center {
              content: "";
              border-top: none;
            }
            @bottom-right {
              content: "";
              border-top: none;
            }
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

const compactSelectStyle: React.CSSProperties = {
  padding: "5px 22px 5px 8px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "11.5px",
  outline: "none",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background 0.15s ease"
};
