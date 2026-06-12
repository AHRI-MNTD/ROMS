import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fetchSOPs } from "../../../api/domains";
import logoAhri from "../../../assets/logo_ahri.png";
import QMSDashboardView from "./QMSDashboardView";
import QMSReviewerView from "./QMSReviewerView";
import QMSViewerView from "./QMSViewerView";

// Define SOP Sections and Sub-sections metadata for premium dynamic dropdowns
const SOP_SECTIONS = [
  "DNA Extraction",
  "qPCR",
  "Gel based PCR",
  "Genotyping",
  "RNA",
  "dPCR",
  "NGS Library",
  "Serology",
  "Equipment",
  "STANDARD"
];

const SOP_SUB_SECTIONS: Record<string, string[]> = {
  "DNA Extraction": [
    "Chelex",
    "QIAGEN WB",
    "QIAGEN DBS",
    "MAGMAX WB",
    "MaGMAX DBS",
    "NucleoMag WB",
    "NucleoMag DBS",
    "CTAB"
  ],
  "qPCR": [
    "18S MPX",
    "Pfhrp2/3",
    "COX",
    "COX MPX",
    "Blood Meal",
    "Species ID"
  ],
  "Gel based PCR": [
    "18S nPCR",
    "Blood Meal",
    "Species ID",
    "COX"
  ],
  "Genotyping": [
    "MSP1",
    "MSP2",
    "Microsatellite (PfPK2 and Poly alpha)",
    "GLURP"
  ],
  "RNA": [
    "QIAGEN",
    "MAGMAX",
    "RT-qPCR"
  ],
  "dPCR": [
    "pfhrp2/3",
    "pfkelch13"
  ],
  "NGS Library": [
    "Parasite amplicon",
    "Mosquito amplicon",
    "MAD4Hatter",
    "PvAmpSeq",
    "ONT Run",
    "WGS",
    "Illumina Run"
  ],
  "Serology": [
    "PvSeroTAT-WEHI",
    "Antigen",
    "LSHTM - IgG",
    "CSP",
    "Human Genotyping",
    "Malaria inflammatory Biomarker"
  ],
  "Equipment": [
    "qPCR (Opus)",
    "Luminex MagPix",
    "KingFisher Flex",
    "QIAGEN dPCR",
    "Bio-Rad ddPCR™ Systems (ddPCR) QX600",
    "Fully automated Nucleic ACid Extractor machine GeneRotex 96",
    "ELISA Reader fully automated",
    "MultiModal ELISA Reader",
    "NextSeq 2000",
    "NextSeq 500",
    "Iseq 100",
    "Iseq (New)",
    "Tape station",
    "Bioanalyzer",
    "Oxford Nanopore (Minion)",
    "Oxford Nanopore (Gridion)",
    "Qubit",
    "NanoDrop",
    "Electronic balanace",
    "Water purification system",
    "Gel doc",
    "Electrophoresis system",
    "PH meter",
    "Microscope - inverted",
    "Microscpe - compound",
    "Microscope - stereo",
    "Automated DBS puncher",
    "ICE maker",
    "BSC (leshmania)",
    "BSC (malaria)",
    "BSC ( Master Mix)",
    "BSC (sample mix)",
    "Fume hood",
    "Mini bead beater",
    "Centrifuge",
    "Heat Block (Thermal shaker)",
    "Water Bath"
  ],
  "STANDARD": [
    "Strains (NF54, 3D7, Dd2, HB3)",
    "Plasmids (Pv18S, Pf18S)",
    "Invitro RNAs (Pvs25, PfMGET, CCP4)"
  ]
};

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
  details?: Record<string, any>;
}

const formatRichText = (htmlOrText: string) => {
  if (!htmlOrText) return "";
  // If the text does not contain any HTML tags, replace newlines with <br/>
  if (!/<[a-z][\s\S]*>/i.test(htmlOrText)) {
    return htmlOrText.replace(/\n/g, "<br/>");
  }
  return htmlOrText;
};

export default function QMSPage() {
  const navigate = useNavigate();

  // Filtering & Pagination states
  const [searchText, setSearchText] = useState<string>("");
  const [filterTitle, setFilterTitle] = useState<string>("All");
  const [filterAuthor, setFilterAuthor] = useState<string>("All");
  const [filterMethodFamily, setFilterMethodFamily] = useState<string>("All");
  const [filterAssayCategory, setFilterAssayCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [statusFilterCard, setStatusFilterCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"dashboard" | "author" | "reviewer" | "viewer">("dashboard");

  // SOP dynamic backend states
  const [sops, setSops] = useState<SOPItem[]>([]);
  const [isSopsLoading, setIsSopsLoading] = useState<boolean>(false);
  const [sopsError, setSopsError] = useState<string | null>(null);

  // Local state for added SOPs (persisted in localStorage)
  const [localSops, setLocalSops] = useState<SOPItem[]>([]);

  // Selected SOP for modals & printing
  const [selectedSopDetails, setSelectedSopDetails] = useState<SOPItem | null>(null);
  const [shareSop, setShareSop] = useState<SOPItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [printingSop, setPrintingSop] = useState<SOPItem | null>(null);

  // Load SOPs from database and local storage
  const loadSopsList = async () => {
    setIsSopsLoading(true);
    setSopsError(null);

    // Load from local storage
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
      setSopsError("Backend connection unavailable - showing locally created items.");
    } finally {
      setIsSopsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSopsList();
  }, []);

  // Merge client-created localSops with synced backend SOPs
  const allSops = useMemo(() => {
    const localCodes = new Set(localSops.map(s => s.code));
    const filteredBackend = sops.filter(s => !localCodes.has(s.code));
    return [...localSops, ...filteredBackend];
  }, [localSops, sops]);

  // Automatically open SOP details modal if "view" query param is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewCode = params.get("view");
    if (viewCode && allSops.length > 0) {
      const matched = allSops.find(s => s.code.toLowerCase() === viewCode.toLowerCase());
      if (matched) {
        setSelectedSopDetails(matched);
        // Clean up URL query parameter without reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [allSops]);

  // Dynamic options parsed from SOP list
  const titleOptions = useMemo(() => {
    const titles = allSops.map(s => s.title).filter(Boolean);
    return Array.from(new Set(titles)).sort();
  }, [allSops]);

  const authorOptions = useMemo(() => {
    const authors = allSops.map(s => s.author).filter(Boolean);
    return Array.from(new Set(authors)).sort();
  }, [allSops]);

  const methodFamilyOptions = useMemo(() => {
    const families = allSops.map(s => s.details?.methodFamily).filter(Boolean);
    return Array.from(new Set(families)).sort();
  }, [allSops]);

  const assayCategoryOptions = useMemo(() => {
    const categories = allSops.map(s => s.sopSection).filter(Boolean);
    return Array.from(new Set(categories)).sort();
  }, [allSops]);

  // Compute stats on the real list
  const stats = useMemo(() => {
    const total = allSops.length;
    const drafts = allSops.filter((s) => s.status.toUpperCase() === "DRAFT").length;
    const review = allSops.filter((s) => s.status.toUpperCase() === "UNDER REVIEW" || s.status.toUpperCase() === "REVIEW").length;
    const approved = allSops.filter((s) => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE / APPROVED").length;
    return { total, drafts, review, approved };
  }, [allSops]);

  // Filter lists based on selections
  const filteredSops = useMemo(() => {
    return allSops.filter((sop) => {
      const matchesSearch =
        sop.title.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.sopSection.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.sopSubSection.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(searchText.toLowerCase());

      const matchesTitle = filterTitle === "All" || sop.title === filterTitle;
      const matchesAuthor = filterAuthor === "All" || sop.author === filterAuthor;
      const matchesMethodFamily = filterMethodFamily === "All" || sop.details?.methodFamily === filterMethodFamily;
      const matchesAssayCategory = filterAssayCategory === "All" || sop.sopSection === filterAssayCategory;

      let matchesStatus = true;
      if (selectedStatus !== "All") {
        matchesStatus = sop.status.toUpperCase() === selectedStatus.toUpperCase();
      } else if (statusFilterCard) {
        if (statusFilterCard === "UNDER REVIEW") {
          matchesStatus = sop.status.toUpperCase() === "UNDER REVIEW" || sop.status.toUpperCase() === "REVIEW";
        } else if (statusFilterCard === "APPROVED") {
          matchesStatus = sop.status.toUpperCase() === "APPROVED" || sop.status.toUpperCase() === "ACTIVE / APPROVED";
        } else {
          matchesStatus = sop.status.toUpperCase() === statusFilterCard.toUpperCase();
        }
      }

      return matchesSearch && matchesTitle && matchesAuthor && matchesMethodFamily && matchesAssayCategory && matchesStatus;
    });
  }, [allSops, searchText, filterTitle, filterAuthor, filterMethodFamily, filterAssayCategory, selectedStatus, statusFilterCard]);

  // Pagination constants
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSops.length / itemsPerPage) || 1;
  const paginatedSops = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSops.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSops, currentPage]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  // Actions implementations
  const handleViewDetails = (sop: SOPItem) => {
    setSelectedSopDetails(sop);
  };

  const handleEdit = (code: string) => {
    navigate(`create-sop?edit=${code}`);
  };

  const handleDelete = (code: string) => {
    if (window.confirm(`Are you sure you want to delete SOP: ${code}?`)) {
      try {
        const saved = localStorage.getItem("roms_local_sops");
        if (saved) {
          const list = JSON.parse(saved);
          const filtered = list.filter((s: any) => s.code !== code);
          localStorage.setItem("roms_local_sops", JSON.stringify(filtered));
          setLocalSops(filtered);
          alert(`SOP ${code} deleted successfully.`);
        }
      } catch (e) {
        console.error(e);
        alert("Failed to delete SOP.");
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
    // Wait for the print layout to be painted in DOM, then call print
    setTimeout(() => {
      window.print();
      setPrintingSop(null);
    }, 400);
  };

  const handleSubmitForReview = (sop: SOPItem) => {
    try {
      const saved = localStorage.getItem("roms_local_sops");
      const list = saved ? JSON.parse(saved) : [];
      const exists = list.some((s: any) => s.code === sop.code);

      let updatedList;
      if (exists) {
        updatedList = list.map((s: any) => {
          if (s.code === sop.code) {
            return { ...s, status: "Under Review" };
          }
          return s;
        });
      } else {
        updatedList = [{ ...sop, status: "Under Review" }, ...list];
      }

      localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
      setLocalSops(updatedList);
      setSelectedSopDetails(prev => prev ? { ...prev, status: "Under Review" } : null);
      alert(`SOP ${sop.code} has been successfully submitted for review.`);
    } catch (e) {
      console.error(e);
      alert("Failed to submit SOP for review.");
    }
  };

  // AHRI Vector SVG representation
  const renderAhriLogo = (width = 220, height = 150) => (
    <svg width={width} height={height} viewBox="0 0 220 150" style={{ display: "block", margin: "0 auto" }}>
      {/* Swoosh paths */}
      <path d="M 20 100 C 60 20, 160 20, 200 80" fill="none" stroke="#1e3a8a" strokeWidth="8" strokeLinecap="round" />
      <path d="M 120 125 C 160 125, 200 110, 210 90" fill="none" stroke="#991b1b" strokeWidth="4" strokeLinecap="round" />

      {/* Globe */}
      <circle cx="170" cy="55" r="20" fill="none" stroke="#991b1b" strokeWidth="1.5" />
      <ellipse cx="170" cy="55" rx="8" ry="20" fill="none" stroke="#1e3a8a" strokeWidth="1.5" />
      <line x1="150" y1="55" x2="190" y2="55" stroke="#1e3a8a" strokeWidth="1.5" />

      {/* Text Ahri */}
      <text x="30" y="105" fontFamily="sans-serif" fontSize="46" fontWeight="bold" fill="#1e3a8a">A</text>
      <text x="65" y="105" fontFamily="sans-serif" fontSize="38" fontWeight="bold" fill="#991b1b">hri</text>

      {/* Subtext */}
      <text x="5" y="122" fontFamily="sans-serif" fontSize="7.5" fontWeight="600" fill="#1e293b">አርማውር ሐንሰን የምርምር ኢንስቲትዩት</text>
      <text x="5" y="132" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#1e293b">Armauer Hansen Research Institute</text>
      <text x="145" y="132" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="#b45309">Since 1970</text>
    </svg>
  );

  const footerYear = printingSop
    ? new Date(printingSop.details?.effectiveDate || printingSop.lastUpdated || Date.now()).getFullYear()
    : new Date().getFullYear();

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }} className="anim">
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
              <span
                style={{
                  fontSize: "1.2rem",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius)",
                }}
              >
                📄
              </span>
              <div>
                <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0, letterSpacing: "-0.01em" }}>
                  SOP & Quality Management
                </h1>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "1px 0 0 0" }}>
                  Manage procedures, compliance, and quality
                </p>
              </div>
            </div>

            {/* Role selection tab bar beside the title */}
            <div style={{ display: "flex", gap: 8, fontSize: "12.5px", fontWeight: 600, marginLeft: 12 }}>
              {[
                { id: "dashboard", label: "📊 Dashboard" },
                { id: "author", label: "✍️ Author" },
                { id: "reviewer", label: "🔍 Reviewer" },
                { id: "viewer", label: "📖 Viewer" }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                      borderRadius: "var(--radius-sm)",
                      background: isActive ? "var(--color-primary-soft)" : "transparent",
                      transition: "all 0.15s ease",
                      fontWeight: isActive ? 700 : 550,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = "var(--color-text)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = "var(--color-text-muted)";
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
              onClick={() => navigate("create-sop")}
              style={{
                background: "var(--color-primary)",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <span>+ Create SOP</span>
            </button>
          )}
        </div>

        {/* Inner Scroll Pane */}
        <div style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>

          {sopsError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b", marginBottom: 16 }}>
              API connection unavailable — showing locally added items.
            </div>
          )}

          {activeTab === "dashboard" && (
            <QMSDashboardView
              sops={allSops}
              onTabChange={(tab, statusFilter) => {
                setActiveTab(tab);
                if (statusFilter) {
                  if (statusFilter === "All") {
                    setSelectedStatus("All");
                    setStatusFilterCard(null);
                  } else {
                    setSelectedStatus(statusFilter);
                    setStatusFilterCard(statusFilter);
                  }
                  setCurrentPage(1);
                }
              }}
            />
          )}

          {activeTab === "reviewer" && (
            <QMSReviewerView
              sops={allSops}
              onSopUpdate={(updatedList) => {
                setLocalSops(updatedList);
              }}
            />
          )}

          {activeTab === "viewer" && (
            <QMSViewerView
              sops={allSops}
              onPrintRequest={(sop) => handlePrintPDF(sop)}
            />
          )}

          {activeTab === "author" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Stats Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  {
                    title: "Total SOPs",
                    value: stats.total,
                    icon: "📄",
                    bg: "#e3f2fd",
                    color: "#0288d1",
                    filterValue: null,
                  },
                  {
                    title: "Drafts",
                    value: stats.drafts,
                    icon: "⏳",
                    bg: "#fff3e0",
                    color: "#f57c00",
                    filterValue: "DRAFT",
                  },
                  {
                    title: "Under Review",
                    value: stats.review,
                    icon: "👥",
                    bg: "#f3e5f5",
                    color: "#565f04ff",
                    filterValue: "UNDER REVIEW",
                  },
                  {
                    title: "Approved",
                    value: stats.approved,
                    icon: "🛡️",
                    bg: "#e8f5e9",
                    color: "#2e7d32",
                    filterValue: "APPROVED",
                  },
                ].map((card, i) => {
                  const isSelected = statusFilterCard === card.filterValue;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setStatusFilterCard(card.filterValue);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: "var(--color-surface-2)",
                        border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                        boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = isSelected ? "var(--shadow-sm)" : "none";
                      }}
                    >
                      <div style={{ fontSize: "14px", width: 26, height: 26, background: card.bg, color: card.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {card.icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{card.title}</span>
                        <h3 style={{ fontSize: "15px", fontWeight: 750, color: "var(--color-text)", margin: 0 }}>{card.value}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Search and Filters Bar */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: "var(--color-surface)",
                  padding: 12,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* SOP Title Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Title:</span>
                  <select
                    value={filterTitle}
                    onChange={(e) => {
                      setFilterTitle(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "8px 24px 8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                      cursor: "pointer",
                      maxWidth: "180px",
                    }}
                  >
                    <option value="All">All Titles</option>
                    {titleOptions.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                {/* SOP Author Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Author:</span>
                  <select
                    value={filterAuthor}
                    onChange={(e) => {
                      setFilterAuthor(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "8px 24px 8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                      cursor: "pointer",
                      maxWidth: "150px",
                    }}
                  >
                    <option value="All">All Authors</option>
                    {authorOptions.map((auth) => (
                      <option key={auth} value={auth}>{auth}</option>
                    ))}
                  </select>
                </div>

                {/* SOP Method Family Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Method Family:</span>
                  <select
                    value={filterMethodFamily}
                    onChange={(e) => {
                      setFilterMethodFamily(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "8px 24px 8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                      cursor: "pointer",
                      maxWidth: "180px",
                    }}
                  >
                    <option value="All">All Families</option>
                    {methodFamilyOptions.map((mf) => (
                      <option key={mf} value={mf}>{mf}</option>
                    ))}
                  </select>
                </div>

                {/* SOP Assay Category Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Assay Category:</span>
                  <select
                    value={filterAssayCategory}
                    onChange={(e) => {
                      setFilterAssayCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "8px 24px 8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                      cursor: "pointer",
                      maxWidth: "180px",
                    }}
                  >
                    <option value="All">All Categories</option>
                    {assayCategoryOptions.map((ac) => (
                      <option key={ac} value={ac}>{ac}</option>
                    ))}
                  </select>
                </div>

                {/* Search Input */}
                <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)", fontSize: "14px" }}>
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search SOPs by title, code, section, author..."
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Reset Filters Button */}
                {(searchText || filterTitle !== "All" || filterAuthor !== "All" || filterMethodFamily !== "All" || filterAssayCategory !== "All" || selectedStatus !== "All" || statusFilterCard) && (
                  <button
                    onClick={() => {
                      setSearchText("");
                      setFilterTitle("All");
                      setFilterAuthor("All");
                      setFilterMethodFamily("All");
                      setFilterAssayCategory("All");
                      setSelectedStatus("All");
                      setStatusFilterCard(null);
                      setCurrentPage(1);
                    }}
                    style={{
                      background: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--fs-xs)",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* SOP Table (Revised Columns only display: SOP Code, Title, Version, Status, Author, Actions) */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 140 }}>SOP Code</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Title</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 100 }}>Version</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 150 }}>Status</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 160 }}>Author</th>
                      <th style={{ padding: "14px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSopsLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                          Loading SOP data…
                        </td>
                      </tr>
                    ) : paginatedSops.length > 0 ? (
                      paginatedSops.map((sop) => {
                        let badgeStyle = { background: "#e0e0e0", color: "#424242" };
                        const statusUpper = sop.status.toUpperCase();
                        if (statusUpper === "APPROVED" || statusUpper === "ACTIVE / APPROVED" || statusUpper === "ACTIVE") {
                          badgeStyle = { background: "#e8f5e9", color: "#2e7d32" };
                        } else if (statusUpper === "DRAFT") {
                          badgeStyle = { background: "#e3f2fd", color: "#1565c0" };
                        } else if (statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW" || statusUpper === "SUBMITTED") {
                          badgeStyle = { background: "#f3e5f5", color: "#7b1fa2" };
                        } else if (statusUpper === "RETURNED") {
                          badgeStyle = { background: "#fee2e2", color: "#dc2626" };
                        } else if (statusUpper === "AWAITING AUTHOR RESPONSE" || statusUpper === "AWAITING RESPONSE") {
                          badgeStyle = { background: "#fffbeb", color: "#d97706" };
                        } else if (statusUpper === "SUPERSEDED") {
                          badgeStyle = { background: "#fff3e0", color: "#e65100" };
                        } else if (statusUpper === "RETIRED / ARCHIVED" || statusUpper === "RETIRED" || statusUpper === "ARCHIVED") {
                          badgeStyle = { background: "#ffebee", color: "#c62828" };
                        }
                        return (
                          <tr
                            key={sop.id}
                            style={{
                              borderBottom: "1px solid var(--color-divider)",
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text)" }}>{sop.code}</td>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{sop.title}</td>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.version}</td>
                            <td style={{ padding: "12px 16px", fontSize: "10px" }}>
                              <span style={{ padding: "3px 8px", borderRadius: "10px", fontWeight: 700, textTransform: "uppercase", ...badgeStyle }}>
                                {sop.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{sop.author}</td>
                            <td style={{ padding: "12px 16px", display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
                              <button
                                onClick={() => handleViewDetails(sop)}
                                title="View Details"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => handleEdit(sop.code)}
                                title="Edit"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                ✍️
                              </button>
                              <button
                                onClick={() => handlePrintPDF(sop)}
                                title="Generate PDF"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                📄
                              </button>
                              <button
                                onClick={() => handleShare(sop)}
                                title="Share"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                🔗
                              </button>
                              <button
                                onClick={() => handleDelete(sop.code)}
                                title="Delete"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", textTransform: "uppercase", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textAlign: "center" }}>
                          No SOPs found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                  Showing {filteredSops.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredSops.length)} of {filteredSops.length} entries
                </span>

                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      fontSize: "var(--fs-xs)",
                      cursor: currentPage === 1 ? "default" : "pointer",
                      color: currentPage === 1 ? "var(--color-text-faint)" : "var(--color-text)",
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        background: currentPage === i + 1 ? "var(--color-primary)" : "var(--color-surface-2)",
                        color: currentPage === i + 1 ? "#ffffff" : "var(--color-text)",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 600,
                        cursor: "pointer",
                        borderColor: currentPage === i + 1 ? "var(--color-primary)" : "var(--color-border)",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      fontSize: "var(--fs-xs)",
                      cursor: currentPage === totalPages ? "default" : "pointer",
                      color: currentPage === totalPages ? "var(--color-text-faint)" : "var(--color-text)",
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    &gt;
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

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
              {/* Cover Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "var(--color-surface-2)", padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                <div><strong>Code:</strong> {selectedSopDetails.code}</div>
                <div><strong>Title:</strong> {selectedSopDetails.title}</div>
                <div><strong>Version:</strong> {selectedSopDetails.version}</div>
                <div><strong>Status:</strong> {selectedSopDetails.status}</div>
                <div><strong>Author:</strong> {selectedSopDetails.author}</div>
                <div><strong>Last Updated:</strong> {selectedSopDetails.lastUpdated}</div>
                {selectedSopDetails.details?.owningSite && <div><strong>Owning Site:</strong> {selectedSopDetails.details.owningSite}</div>}
                {selectedSopDetails.details?.effectiveDate && <div><strong>Effective Date:</strong> {selectedSopDetails.details.effectiveDate}</div>}
              </div>

              {/* Reviewer Feedback & Return Comments (Task 2) */}
              {selectedSopDetails.details?.comments && selectedSopDetails.details.comments.length > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
                    💬 Reviewer Feedback & Return Comments
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "200px", overflowY: "auto", paddingRight: 4 }}>
                    {selectedSopDetails.details?.comments?.map((comment: any, idx: number) => (
                      <div key={idx} style={{ fontSize: "12px", borderBottom: idx < (selectedSopDetails.details?.comments?.length || 0) - 1 ? "1px dashed #fcd34d" : "none", paddingBottom: idx < (selectedSopDetails.details?.comments?.length || 0) - 1 ? 8 : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#b45309", fontWeight: 700, marginBottom: 2 }}>
                          <span>{comment.author} ({comment.section})</span>
                          <span style={{ fontWeight: 400, fontSize: "11px", color: "var(--color-text-muted)" }}>{comment.timestamp}</span>
                        </div>
                        <div style={{ color: "#78350f", lineHeight: "1.4" }}>{comment.text}</div>
                      </div>
                    ))}
                  </div>
                  {/* Edit & Correct Button */}
                  {(selectedSopDetails.status.toUpperCase() === "RETURNED" || selectedSopDetails.status.toUpperCase() === "AWAITING AUTHOR RESPONSE") && (
                    <button
                      onClick={() => {
                        setSelectedSopDetails(null);
                        navigate(`create-sop?edit=${selectedSopDetails.code}`);
                      }}
                      style={{
                        alignSelf: "flex-start",
                        background: "#b45309",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 700,
                        cursor: "pointer",
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>✏️ Edit & Correct SOP</span>
                    </button>
                  )}
                </div>
              )}

              {/* Sections rendering */}
              {[
                {
                  label: "Revision & Amendment History", data: selectedSopDetails.details?.revision, fields: [
                    { k: "Revision Number", v: "revisionNumber" },
                    { k: "Revision Date", v: "revisionDate" },
                    { k: "Summary of changes", v: "revisionSummary", area: true },
                    { k: "Rationale for change", v: "revisionRationale", area: true },
                  ]
                },
                {
                  label: "Purpose, Scope & Background", data: selectedSopDetails.details?.purposeScope, fields: [
                    { k: "Purpose (verbatim)", v: "purpose", area: true },
                    { k: "Scope - covers", v: "scopeCovers", area: true },
                    { k: "Scope - excluded", v: "scopeExcluded", area: true },
                    { k: "Background / Intro", v: "background", area: true },
                  ]
                },
                {
                  label: "Definitions & Abbreviations", data: selectedSopDetails.details?.definitions, fields: [
                    { k: "Definitions", v: "definitions", area: true },
                    { k: "Abbreviations", v: "abbreviations", area: true },
                  ]
                },
                {
                  label: "Responsibility & Accountability", data: selectedSopDetails.details?.responsibility, fields: [
                    { k: "Roles involved", v: "roles", badge: true },
                    { k: "Responsibility (narrative)", v: "responsibilityNarrative", area: true },
                  ]
                },
                { label: "Principle of the Method", text: selectedSopDetails.details?.principle },
                {
                  label: "Samples / Specimens Covered", data: selectedSopDetails.details?.samples, fields: [
                    { k: "Sample matrices", v: "matrices", badge: true },
                    { k: "Input material types", v: "inputMaterials", badge: true },
                    { k: "Volume required", v: "volumeRequired" },
                    { k: "Acceptance criteria", v: "acceptance", area: true },
                    { k: "Rejection criteria", v: "rejection", area: true },
                  ]
                },
                {
                  label: "Reagents & Supplies", data: selectedSopDetails.details?.reagents, fields: [
                    { k: "Reagents Narrative", v: "narrative", area: true },
                    { k: "Reagents List", v: "list", area: true },
                  ]
                },
                {
                  label: "Equipment & Instruments", data: selectedSopDetails.details?.equipment, fields: [
                    { k: "Primary Equipment", v: "primary", badge: true },
                    { k: "Equipment List", v: "list", area: true },
                  ]
                },
                {
                  label: "Environmental & Safety Controls", data: selectedSopDetails.details?.safety, fields: [
                    { k: "PPE required", v: "ppe", badge: true },
                    { k: "Biosafety Level", v: "level" },
                    { k: "Hazards relevant", v: "hazards", badge: true },
                    { k: "Waste handling", v: "waste", area: true },
                    { k: "Additional safety", v: "additional", area: true },
                  ]
                },
                {
                  label: "Quality Control", data: selectedSopDetails.details?.qualityControl, fields: [
                    { k: "Controls included", v: "controls", badge: true },
                    { k: "DNA/RNA QC methods", v: "methods", badge: true },
                    { k: "Acceptance criteria", v: "acceptance", area: true },
                    { k: "QC narrative", v: "narrative", area: true },
                  ]
                },
                {
                  label: "Stepwise Procedure", data: selectedSopDetails.details?.procedure, fields: [
                    { k: "Full procedure", v: "narrative", area: true },
                    { k: "Stepwise list", v: "steps", area: true },
                  ]
                },
                {
                  label: "Calculation / Data Analysis", data: selectedSopDetails.details?.calculation, fields: [
                    { k: "Calculations/formulas", v: "formulas", area: true },
                    { k: "Software/tools", v: "software", area: true },
                    { k: "Interpretation rules", v: "thresholds", area: true },
                  ]
                },
                {
                  label: "Result Reporting & Interpretation", data: selectedSopDetails.details?.resultReporting, fields: [
                    { k: "Reporting format", v: "format", area: true },
                    { k: "Cut-offs / thresholds", v: "thresholds", area: true },
                    { k: "LIMS mapping", v: "lims", area: true },
                    { k: "Result narrative", v: "narrative", area: true },
                  ]
                },
                {
                  label: "Storage & Transport Requirements", data: selectedSopDetails.details?.storage, fields: [
                    { k: "Sample types stored", v: "types", badge: true },
                    { k: "Recommended storage temp", v: "temp" },
                    { k: "Max storage duration", v: "duration" },
                    { k: "Acceptable transport", v: "transport", badge: true },
                    { k: "Storage narrative", v: "narrative", area: true },
                  ]
                },
                { label: "References & Attachments", text: selectedSopDetails.details?.references },
                {
                  label: "Document Control & Sign-off", data: selectedSopDetails.details?.signoff, fields: [
                    { k: "Prepared by Name", v: "preparedByName" },
                    { k: "Prepared by Role", v: "preparedByRole" },
                    { k: "Prepared date", v: "preparedDate" },
                    { k: "Reviewed by Name", v: "reviewedByName" },
                    { k: "Reviewed by Role", v: "reviewedByRole" },
                    { k: "Reviewed date", v: "reviewedDate" },
                    { k: "Approved by Name", v: "approvedByName" },
                    { k: "Approved by Role", v: "approvedByRole" },
                    { k: "Approved date", v: "approvedDate" },
                    { k: "Controlled copy number", v: "controlledCopyNumber" },
                    { k: "Distribution list", v: "distributionList" },
                    { k: "Final comments", v: "finalComments", area: true },
                  ]
                }
              ].map((sec, sidx) => (
                <div key={sidx} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16 }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                    {sec.label}
                  </h4>

                  {sec.text && (
                    <div
                      style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }}
                      dangerouslySetInnerHTML={{ __html: formatRichText(sec.text) }}
                    />
                  )}

                  {sec.data && sec.fields && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {sec.fields.map((f, fidx) => {
                        const val = sec.data[f.v];
                        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;

                        return (
                          <div key={fidx} style={{ fontSize: "var(--fs-sm)" }}>
                            <strong>{f.k}:</strong>
                            {f.badge && Array.isArray(val) ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                {val.map((item, i) => (
                                  <span key={i} style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>{item}</span>
                                ))}
                              </div>
                            ) : f.area ? (
                              <div
                                style={{ padding: 10, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", marginTop: 4 }}
                                dangerouslySetInnerHTML={{ __html: formatRichText(val) }}
                              />
                            ) : (
                              <span style={{ marginLeft: 8 }}>{val}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{ background: "var(--color-surface-2)", padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              {(selectedSopDetails.status.toUpperCase() === "DRAFT" || selectedSopDetails.status.toUpperCase() === "RETURNED" || selectedSopDetails.status.toUpperCase() === "AWAITING AUTHOR RESPONSE") && (
                <button
                  onClick={() => handleSubmitForReview(selectedSopDetails)}
                  style={{ background: "#7b1fa2", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}
                >
                  Submit for Review
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
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
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
              width: 500,
              maxWidth: "90%",
              overflow: "hidden",
            }}
          >
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
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-xs)",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => handleCopyLink(shareSop.code)}
                  style={{
                    background: isCopied ? "#10b981" : "var(--color-primary)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    cursor: "pointer",
                    minWidth: 80,
                  }}
                >
                  {isCopied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>

              <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 16, display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
                <a
                  href={`mailto:?subject=SOP%20Shared%3A%20${encodeURIComponent(shareSop.code)}&body=Hi%20there%2C%0A%0APlease%20review%20this%20Standard%20Operating%20Procedure%20details%20by%20clicking%20on%20the%20link%20below%3A%0A%0A${encodeURIComponent(window.location.origin + '/domains/qms?view=' + shareSop.code)}`}
                  style={{
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  ✉ Email Link
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/domains/qms?view=' + shareSop.code)}&text=${encodeURIComponent('Please review this Standard Operating Procedure: ' + shareSop.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#0088cc",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  ✈ Telegram Link
                </a>
                <button
                  onClick={() => setShareSop(null)}
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA (RENDERED FOR PDF GENERATION VIA PORTAL ON BODY) */}
      {printingSop && createPortal(
        <div id="qms-sop-print-area">
          {/* COVER PAGE (PAGE 1) */}
          <div
            className="cover-page page-break-after"
            style={{ boxSizing: "border-box", padding: 0 }}
          >
            <div className="text-center" style={{ width: "100%", marginTop: "0.4in" }}>
              <h1
                className="cover-title"
                style={{
                  fontSize: "24pt", fontWeight: "800", margin: "0 0 24px 0",
                  color: "#071338ff", fontFamily: '"Times New Roman", Times, serif', letterSpacing: "0.05em",
                  lineHeight: "1.3"
                }}
              >
                ARMAUER HANSEN RESEARCH INSTITUTE LABORATORY
              </h1>

              <div style={{ margin: "40px 0" }}>
                <img
                  src={logoAhri}
                  style={{ height: "180px", display: "block", margin: "0 auto" }}
                  alt="AHRI Logo"
                />
              </div>

              <div style={{ margin: "40px 0" }}>
                <h2
                  style={{
                    fontSize: "20pt", fontWeight: "800", margin: "0",
                    color: "#091530ff", fontFamily: '"Times New Roman", Times, serif', padding: "8px 0",
                    textTransform: "uppercase", lineHeight: "1.4",
                  }}
                >
                  {printingSop.title}
                </h2>
              </div>
            </div>

            {/* Metadata Table Page 1 */}
            <table
              style={{
                width: "calc(100% - 2px)", borderCollapse: "collapse",
                border: "1.5px solid #000000", marginTop: "50px",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              <tbody>
                {[
                  ["Prepared by", `${printingSop.details?.signoff?.preparedByName || printingSop.author || "N/A"} ${printingSop.details?.signoff?.preparedByRole ? `(${printingSop.details.signoff.preparedByRole})` : ""} ${printingSop.details?.signoff?.preparedDate ? `on ${printingSop.details.signoff.preparedDate}` : ""}`],
                  ["Reviewed by", `${printingSop.details?.signoff?.reviewedByName || "N/A"} ${printingSop.details?.signoff?.reviewedByRole ? `(${printingSop.details.signoff.reviewedByRole})` : ""} ${printingSop.details?.signoff?.reviewedDate ? `on ${printingSop.details.signoff.reviewedDate}` : ""}`],
                  ["Approved by", `${printingSop.details?.signoff?.approvedByName || "N/A"} ${printingSop.details?.signoff?.approvedByRole ? `(${printingSop.details.signoff.approvedByRole})` : ""} ${printingSop.details?.signoff?.approvedDate ? `on ${printingSop.details.signoff.approvedDate}` : ""}`],
                  ["Effective Date", printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"],
                  ["Version No", printingSop.version],
                  ["Document No", printingSop.code],
                ].map(([label, value]) => {
                  let valColor = "#000000";
                  let valClass = "";
                  if (label === "Document No") {
                    valColor = "#071338ff";
                    valClass = "header-doc-no";
                  } else if (label === "Version No") {
                    valColor = "#490b09ff";
                    valClass = "header-version-no";
                  } else if (label === "Effective Date") {
                    valColor = "#490b09ff";
                    valClass = "header-effective-date";
                  }
                  return (
                    <tr key={label}>
                      <td style={{ border: "1.5px solid #000000", padding: "6px 12px", fontWeight: "bold", fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', width: "30%", color: "#000000", backgroundColor: "#f8fafc", lineHeight: "1.5" }}>
                        {label}:
                      </td>
                      <td className={valClass} style={{ border: "1.5px solid #000000", padding: "6px 12px", fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', color: valColor, lineHeight: "1.5" }}>
                        {value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* REPEATING HEADER / FOOTER BODY WRAPPER FOR PAGE 2+ */}
          <div className="printable-body-wrapper">
            <table className="print-outer-wrapper-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "none" }}>
              <thead>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* Header Table: repeating on every page */}
                    <table style={{ width: "100%", border: "1.5px solid #000000", borderCollapse: "collapse", marginBottom: "15px", fontFamily: '"Times New Roman", Times, serif' }}>
                      <tbody>
                        <tr>
                          {/* Mini logo cell spans 3 rows */}
                          <td rowSpan={3} style={{ width: "90px", border: "1.5px solid #000000", textAlign: "center", verticalAlign: "middle", padding: "6px", backgroundColor: "#f8fafc" }}>
                            <img src={logoAhri} style={{ height: "45px", display: "block", margin: "0 auto" }} alt="AHRI Logo" />
                          </td>
                          <td className="header-institution" style={{ border: "1.5px solid #000000", padding: "8px 12px", fontWeight: "bold", fontSize: "11px", fontFamily: '"Times New Roman", Times, serif', color: "#071338ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            ARMAUER HANSEN RESEARCH INSTITUTE LABORATORY
                          </td>
                          <td className="header-effective-date" style={{ border: "1.5px solid #000000", padding: "8px 12px", fontSize: "10px", fontFamily: '"Times New Roman", Times, serif', width: "180px", fontWeight: "bold", color: "#490b09ff" }}>
                            Effective Date: {printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #000000", padding: "8px 12px", fontWeight: "bold", fontSize: "12px", fontFamily: '"Times New Roman", Times, serif', color: "#000000", textTransform: "uppercase" }}>
                            TITLE: {printingSop.title}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #000000", padding: 0 }}>
                            <table className="header-inner-table" style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                              <tbody>
                                <tr>
                                  <td className="header-doc-no" style={{ borderRight: "1.5px solid #000000", padding: "6px 12px", fontSize: "10px", fontFamily: '"Times New Roman", Times, serif', fontWeight: "bold", width: "50%", color: "#071338ff" }}>
                                    Document No: {printingSop.code}
                                  </td>
                                  <td className="header-version-no" style={{ padding: "6px 12px", fontSize: "10px", fontFamily: '"Times New Roman", Times, serif', fontWeight: "bold", width: "50%", color: "#490b09ff" }}>
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
                    <div
                      className="footer-line"
                      style={{
                        borderTop: "2.5px solid #071338ff",
                        marginTop: "6px",
                        width: "100%",
                        height: "1px"
                      }}
                    />
                  </td>
                </tr>
              </tfoot>

              <tbody>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* B TO R CONTENTS (Start Page 2) */}
                    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000000", lineHeight: "1.5", textAlign: "justify" }}>
                      {[
                        {
                          label: "Revision & Amendment History", data: printingSop.details?.revision, fields: [
                            { k: "Revision Number", v: "revisionNumber" },
                            { k: "Revision Date", v: "revisionDate" },
                            { k: "Summary of changes from previous version", v: "revisionSummary", multiline: true },
                            { k: "Rationale for change", v: "revisionRationale", multiline: true },
                          ]
                        },
                        {
                          label: "Purpose, Scope & Background", data: printingSop.details?.purposeScope, fields: [
                            { k: "Purpose (verbatim)", v: "purpose", multiline: true },
                            { k: "Scope - what this SOP covers", v: "scopeCovers", multiline: true },
                            { k: "Scope - what is explicitly excluded", v: "scopeExcluded", multiline: true },
                            { k: "Background / Introduction", v: "background", multiline: true },
                          ]
                        },
                        {
                          label: "Definitions & Abbreviations", data: printingSop.details?.definitions, fields: [
                            { k: "Definitions / Terminology (narrative)", v: "definitions", multiline: true },
                            { k: "Abbreviations used in this SOP", v: "abbreviations", multiline: true },
                          ]
                        },
                        {
                          label: "Responsibility & Accountability", data: printingSop.details?.responsibility, fields: [
                            { k: "Roles involved in executing this SOP", v: "roles", list: true },
                            { k: "Responsibility & accountability (narrative)", v: "responsibilityNarrative", multiline: true },
                          ]
                        },
                        { label: "Principle of the Method", text: printingSop.details?.principle },
                        {
                          label: "Samples / Specimens Covered", data: printingSop.details?.samples, fields: [
                            { k: "Sample matrices covered by this SOP", v: "matrices", list: true },
                            { k: "Input material type(s)", v: "inputMaterials", list: true },
                            { k: "Volume / amount required per sample", v: "volumeRequired" },
                            { k: "Sample acceptance criteria", v: "acceptance", multiline: true },
                            { k: "Sample rejection criteria", v: "rejection", multiline: true },
                          ]
                        },
                        {
                          label: "Reagents & Supplies", data: printingSop.details?.reagents, fields: [
                            { k: "Reagents & supplies (full narrative as in SOP)", v: "narrative", multiline: true },
                            { k: "Reagents & supplies (one per line)", v: "list", multiline: true },
                          ]
                        },
                        {
                          label: "Equipment & Instruments", data: printingSop.details?.equipment, fields: [
                            { k: "Primary equipment used", v: "primary", list: true },
                            { k: "Equipment & instruments (one per line)", v: "list", multiline: true },
                          ]
                        },
                        {
                          label: "Environmental & Safety Controls", data: printingSop.details?.safety, fields: [
                            { k: "PPE required", v: "ppe", list: true },
                            { k: "Biosafety level required", v: "level" },
                            { k: "Hazards relevant to this procedure", v: "hazards", list: true },
                            { k: "Waste handling instructions", v: "waste", multiline: true },
                            { k: "Additional safety / environmental controls", v: "additional", multiline: true },
                          ]
                        },
                        {
                          label: "Quality Control", data: printingSop.details?.qualityControl, fields: [
                            { k: "Controls included in this SOP", v: "controls", list: true },
                            { k: "DNA/RNA QC methods specified", v: "methods", list: true },
                            { k: "Acceptance / rejection criteria", v: "acceptance", multiline: true },
                            { k: "Quality control narrative (verbatim from SOP)", v: "narrative", multiline: true },
                          ]
                        },
                        {
                          label: "Stepwise Procedure", data: printingSop.details?.procedure, fields: [
                            { k: "Full procedure narrative", v: "narrative", multiline: true },
                            { k: "Stepwise procedure list", v: "steps", multiline: true },
                          ]
                        },
                        {
                          label: "Calculation / Data Analysis", data: printingSop.details?.calculation, fields: [
                            { k: "Calculations / formulas used", v: "formulas", multiline: true },
                            { k: "Software / analysis tools used", v: "software", multiline: true },
                            { k: "Interpretation rules / thresholds", v: "thresholds", multiline: true },
                          ]
                        },
                        {
                          label: "Result Reporting & Interpretation", data: printingSop.details?.resultReporting, fields: [
                            { k: "Reporting format (units, layout)", v: "format", multiline: true },
                            { k: "Cut-offs / thresholds", v: "thresholds", multiline: true },
                            { k: "LIMS / database field mapping", v: "lims", multiline: true },
                            { k: "Result reporting narrative", v: "narrative", multiline: true },
                          ]
                        },
                        {
                          label: "Storage & Transport Requirements", data: printingSop.details?.storage, fields: [
                            { k: "Sample types this SOP stores / transports", v: "types", list: true },
                            { k: "Recommended storage temperature", v: "temp" },
                            { k: "Maximum storage duration", v: "duration" },
                            { k: "Acceptable transport modes", v: "transport", list: true },
                            { k: "Storage & transport narrative", v: "narrative", multiline: true },
                          ]
                        },
                        { label: "References & Attachments", text: printingSop.details?.references },
                        {
                          label: "Document Control & Sign-off", data: printingSop.details?.signoff, fields: [
                            { k: "Prepared by (name)", v: "preparedByName" },
                            { k: "Prepared by (role)", v: "preparedByRole" },
                            { k: "Prepared date", v: "preparedDate" },
                            { k: "Reviewed by (name)", v: "reviewedByName" },
                            { k: "Reviewed by (role)", v: "reviewedByRole" },
                            { k: "Reviewed date", v: "reviewedDate" },
                            { k: "Approved by (name)", v: "approvedByName" },
                            { k: "Approved by (role)", v: "approvedByRole" },
                            { k: "Approved date", v: "approvedDate" },
                            { k: "Controlled copy number", v: "controlledCopyNumber" },
                            { k: "Distribution list", v: "distributionList" },
                            { k: "Final comments / notes", v: "finalComments", multiline: true },
                          ]
                        }
                      ].map((sec, sidx) => (
                        <div key={sidx} className="print-section-container">
                          <h3 className="print-section-title" style={{ margin: "0 0 4px 0", fontFamily: '"Times New Roman", Times, serif', fontSize: "14pt", fontWeight: "bold", borderBottom: "none", color: "#031755ff", paddingBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.5" }}>
                            {sec.label}
                          </h3>

                          {sec.text && (
                            <div
                              style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", paddingLeft: "0px", color: "#000000", lineHeight: "1.5", textAlign: "justify" }}
                              dangerouslySetInnerHTML={{ __html: formatRichText(sec.text) }}
                            />
                          )}

                          {sec.data && sec.fields && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "0px" }}>
                              {sec.fields.map((f, fidx) => {
                                const val = sec.data[f.v];
                                if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;

                                return (
                                  <div key={fidx} className="print-subsection-container" style={{ fontSize: "12pt" }}>
                                    <h4 style={{ margin: "0 0 2px 0", fontFamily: '"Times New Roman", Times, serif', fontSize: "13pt", fontWeight: "bold", color: "#000000", lineHeight: "1.5" }}>{f.k}:</h4>
                                    {f.list && Array.isArray(val) ? (
                                      <ul style={{ margin: "2px 0 4px 20px", padding: 0, listStyleType: "square" }}>
                                        {val.map((item: string, idx: number) => (
                                          <li key={idx} style={{ padding: "2px 0", fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000000", lineHeight: "1.5", textAlign: "justify" }}>{item}</li>
                                        ))}
                                      </ul>
                                    ) : f.multiline ? (
                                      <div
                                        style={{ padding: "0px", margin: "2px 0 4px 0", color: "#000000", fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", lineHeight: "1.5", textAlign: "justify" }}
                                        dangerouslySetInnerHTML={{ __html: formatRichText(val) }}
                                      />
                                    ) : (
                                      <div style={{ padding: "2px 0", paddingLeft: "0px", borderLeft: "none", color: "#000000", fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", lineHeight: "1.5", textAlign: "justify" }}>{val}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
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
        /* PRINT SPECIFIC STYLES */
        @media print {
          /* Hide the main app root completely to prevent any whitespace, offsets or page push */
          #root {
            display: none !important;
          }
          
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #qms-sop-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Force solid black color for elements by default, but exclude custom color elements */
          #qms-sop-print-area,
          #qms-sop-print-area * {
            color: #000000;
            border-color: #000000;
          }
          
          /* Specific color overrides using class names */
          #qms-sop-print-area .cover-title {
            color: #071338ff !important;
          }
          #qms-sop-print-area .header-institution {
            color: #071338ff !important;
          }
          #qms-sop-print-area .header-effective-date {
            color: #490b09ff !important;
          }
          #qms-sop-print-area .header-doc-no {
            color: #071338ff !important;
          }
          #qms-sop-print-area .header-version-no {
            color: #490b09ff !important;
          }
          #qms-sop-print-area .print-section-title {
            color: #031755ff !important;
          }
          #qms-sop-print-area .footer-line {
            border-top: 2.5px solid #071338ff !important;
            border-color: #071338ff !important;
          }

          /* Ensure outer wrapper table does not collapse or show borders */
          table.print-outer-wrapper-table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            width: 100% !important;
            border: none !important;
          }
          table.print-outer-wrapper-table > tbody > tr > td,
          table.print-outer-wrapper-table > thead > tr > td,
          table.print-outer-wrapper-table > tfoot > tr > td {
            border: none !important;
            padding: 0 !important;
          }

          /* Ensure all content tables have distinct collapsed borders and fit inside page width */
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) {
            width: calc(100% - 2px) !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
            margin-bottom: 15px !important;
            margin-right: 2px !important;
          }
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) td,
          #qms-sop-print-area table:not(.print-outer-wrapper-table):not(.header-inner-table) th {
            border: 1.5px solid #000000 !important;
            padding: 6px 12px !important;
          }

          /* Explicitly remove borders for inner header table except the Document No right border */
          #qms-sop-print-area table.header-inner-table,
          #qms-sop-print-area table.header-inner-table td {
            border: none !important;
          }
          #qms-sop-print-area table.header-inner-table td.header-doc-no {
            border-right: 1.5px solid #000000 !important;
          }
          
          /* Justify alignment for standard text blocks */
          #qms-sop-print-area p,
          #qms-sop-print-area div,
          #qms-sop-print-area li,
          #qms-sop-print-area span {
            text-align: justify !important;
          }
          
          /* Keep headings and tables left aligned */
          #qms-sop-print-area h1,
          #qms-sop-print-area h2,
          #qms-sop-print-area h3,
          #qms-sop-print-area h4,
          #qms-sop-print-area th,
          #qms-sop-print-area td {
            text-align: left !important;
          }
          
          /* Specifically allow class 'text-center' to center-align */
          #qms-sop-print-area .text-center,
          #qms-sop-print-area .text-center * {
            text-align: center !important;
          }
          
          .cover-page {
            page-break-after: always !important;
            break-after: always !important;
            box-sizing: border-box !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-section-container {
            page-break-inside: auto !important;
            break-inside: auto !important;
            margin-bottom: 10px !important;
            margin-top: 0 !important;
            padding: 0 !important;
          }
          
          .print-section-container h3 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin: 0 0 4px 0 !important;
          }
          
          .print-subsection-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 6px !important;
          }
          
          .print-subsection-container h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin: 0 0 2px 0 !important;
          }
          
          table, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .page-break-before {
            page-break-before: always !important;
            break-before: always !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: always !important;
          }
          
          @page {
            size: portrait;
            margin: 0.2in 1.0in 0.8in 1.0in; /* Enforces minimized top margin on pages 2+ */
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "` + footerYear + `/AHRI-MNTD" !important;
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
            margin-top: 1.0in; /* Enforces normal top margin for the cover page */
            margin-bottom: 1.0in;
            counter-reset: page 0;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: none !important; }
            @bottom-center { content: ""; }
            @bottom-right { content: none !important; }
          }
          
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .printable-body-wrapper {
            position: relative;
            overflow: visible !important;
            height: auto !important;
          }
        }

        /* SCREEN-ONLY PRINT ELEMENT HIDE */
        #qms-sop-print-area {
          display: none;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div >
  );
}
