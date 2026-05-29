import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSOPs } from "../../../api/domains";

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

export default function QMSPage() {
  const navigate = useNavigate();

  // Filtering & Pagination states
  const [searchText, setSearchText] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [selectedSubSection, setSelectedSubSection] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [statusFilterCard, setStatusFilterCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

      const matchesSection = selectedSection === "All" || sop.sopSection === selectedSection;
      const matchesSubSection = selectedSubSection === "All" || sop.sopSubSection === selectedSubSection;

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

      return matchesSearch && matchesSection && matchesSubSection && matchesStatus;
    });
  }, [allSops, searchText, selectedSection, selectedSubSection, selectedStatus, statusFilterCard]);

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
    const link = `${window.location.origin}/domains/qms/view-sop?code=${code}`;
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

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }} className="anim">
      {/* ── CONTENT PANE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Active Title Block */}
        <div
          style={{
            padding: "24px 32px 16px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            background: "var(--color-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: "1.25rem",
                background: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-sm)",
              }}
            >
              📄
            </span>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                SOPs & Quality Management
              </h1>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-faint)", margin: "4px 0 0 0" }}>
                Manage SOPs & Quality. Showing live data from the ROMS API
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("create-sop")}
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <span>+ Create SOP</span>
          </button>
        </div>

        {/* Inner Scroll Pane */}
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {sopsError && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
                API connection unavailable — showing locally added items.
              </div>
            )}

            {/* Stats Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                {
                  title: "Total SOPs",
                  value: stats.total,
                  subtitle: "All documents",
                  icon: "📄",
                  bg: "#e3f2fd",
                  color: "#0288d1",
                  filterValue: null,
                },
                {
                  title: "Drafts",
                  value: stats.drafts,
                  subtitle: "In progress",
                  icon: "⏳",
                  bg: "#fff3e0",
                  color: "#f57c00",
                  filterValue: "DRAFT",
                },
                {
                  title: "Under Review",
                  value: stats.review,
                  subtitle: "Awaiting review",
                  icon: "👥",
                  bg: "#f3e5f5",
                  color: "#565f04ff",
                  filterValue: "UNDER REVIEW",
                },
                {
                  title: "Approved",
                  value: stats.approved,
                  subtitle: "Published",
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
                      borderRadius: "var(--radius)",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
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
                    <div style={{ fontSize: "20px", width: 40, height: 40, background: card.bg, color: card.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {card.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{card.title}</span>
                      <h3 style={{ fontSize: "18px", fontWeight: 750, color: "var(--color-text)", margin: "2px 0 0 0" }}>{card.value}</h3>
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
                background: "var(--color-surface)",
                padding: 12,
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Search Input */}
              <div style={{ position: "relative", flex: 1 }}>
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

              {/* SOP Section Select */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Section:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setSelectedSubSection("All");
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
                  <option value="All">All Sections</option>
                  {SOP_SECTIONS.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* SOP Sub-section Select */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Sub-section:</span>
                <select
                  value={selectedSubSection}
                  onChange={(e) => {
                    setSelectedSubSection(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={selectedSection === "All"}
                  style={{
                    padding: "8px 24px 8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    outline: "none",
                    cursor: selectedSection === "All" ? "not-allowed" : "pointer",
                    opacity: selectedSection === "All" ? 0.6 : 1,
                    maxWidth: "180px",
                  }}
                >
                  <option value="All">All Sub-sections</option>
                  {selectedSection !== "All" && SOP_SUB_SECTIONS[selectedSection]?.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Reset Filters Button */}
              {(searchText || selectedSection !== "All" || selectedSubSection !== "All" || selectedStatus !== "All" || statusFilterCard) && (
                <button
                  onClick={() => {
                    setSearchText("");
                    setSelectedSection("All");
                    setSelectedSubSection("All");
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
                      } else if (statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW") {
                        badgeStyle = { background: "#f3e5f5", color: "#7b1fa2" };
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
                              ✏️
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

              {/* Sections rendering */}
              {[
                {
                  label: "B. Revision & Amendment History", data: selectedSopDetails.details?.revision, fields: [
                    { k: "Revision Number", v: "revisionNumber" },
                    { k: "Revision Date", v: "revisionDate" },
                    { k: "Summary of changes", v: "revisionSummary", area: true },
                    { k: "Rationale for change", v: "revisionRationale", area: true },
                  ]
                },
                {
                  label: "C. Purpose, Scope & Background", data: selectedSopDetails.details?.purposeScope, fields: [
                    { k: "Purpose (verbatim)", v: "purpose", area: true },
                    { k: "Scope - covers", v: "scopeCovers", area: true },
                    { k: "Scope - excluded", v: "scopeExcluded", area: true },
                    { k: "Background / Intro", v: "background", area: true },
                  ]
                },
                {
                  label: "D. Definitions & Abbreviations", data: selectedSopDetails.details?.definitions, fields: [
                    { k: "Definitions", v: "definitions", area: true },
                    { k: "Abbreviations", v: "abbreviations", area: true },
                  ]
                },
                {
                  label: "E. Responsibility & Accountability", data: selectedSopDetails.details?.responsibility, fields: [
                    { k: "Roles involved", v: "roles", badge: true },
                    { k: "Responsibility (narrative)", v: "responsibilityNarrative", area: true },
                  ]
                },
                { label: "F. Principle of the Method", text: selectedSopDetails.details?.principle },
                {
                  label: "G. Samples / Specimens Covered", data: selectedSopDetails.details?.samples, fields: [
                    { k: "Sample matrices", v: "matrices", badge: true },
                    { k: "Input material types", v: "inputMaterials", badge: true },
                    { k: "Volume required", v: "volumeRequired" },
                    { k: "Acceptance criteria", v: "acceptance", area: true },
                    { k: "Rejection criteria", v: "rejection", area: true },
                  ]
                },
                {
                  label: "H. Reagents & Supplies", data: selectedSopDetails.details?.reagents, fields: [
                    { k: "Reagents Narrative", v: "narrative", area: true },
                    { k: "Reagents List", v: "list", area: true },
                  ]
                },
                {
                  label: "I. Equipment & Instruments", data: selectedSopDetails.details?.equipment, fields: [
                    { k: "Primary Equipment", v: "primary", badge: true },
                    { k: "Equipment List", v: "list", area: true },
                  ]
                },
                {
                  label: "J. Environmental & Safety Controls", data: selectedSopDetails.details?.safety, fields: [
                    { k: "PPE required", v: "ppe", badge: true },
                    { k: "Biosafety Level", v: "level" },
                    { k: "Hazards relevant", v: "hazards", badge: true },
                    { k: "Waste handling", v: "waste", area: true },
                    { k: "Additional safety", v: "additional", area: true },
                  ]
                },
                {
                  label: "K. Quality Control", data: selectedSopDetails.details?.qualityControl, fields: [
                    { k: "Controls included", v: "controls", badge: true },
                    { k: "DNA/RNA QC methods", v: "methods", badge: true },
                    { k: "Acceptance criteria", v: "acceptance", area: true },
                    { k: "QC narrative", v: "narrative", area: true },
                  ]
                },
                {
                  label: "L. Stepwise Procedure", data: selectedSopDetails.details?.procedure, fields: [
                    { k: "Full procedure", v: "narrative", area: true },
                    { k: "Stepwise list", v: "steps", area: true },
                  ]
                },
                {
                  label: "M. Calculation / Data Analysis", data: selectedSopDetails.details?.calculation, fields: [
                    { k: "Calculations/formulas", v: "formulas", area: true },
                    { k: "Software/tools", v: "software", area: true },
                    { k: "Interpretation rules", v: "thresholds", area: true },
                  ]
                },
                {
                  label: "N. Result Reporting & Interpretation", data: selectedSopDetails.details?.resultReporting, fields: [
                    { k: "Reporting format", v: "format", area: true },
                    { k: "Cut-offs / thresholds", v: "thresholds", area: true },
                    { k: "LIMS mapping", v: "lims", area: true },
                    { k: "Result narrative", v: "narrative", area: true },
                  ]
                },
                {
                  label: "P. Storage & Transport Requirements", data: selectedSopDetails.details?.storage, fields: [
                    { k: "Sample types stored", v: "types", badge: true },
                    { k: "Recommended storage temp", v: "temp" },
                    { k: "Max storage duration", v: "duration" },
                    { k: "Acceptable transport", v: "transport", badge: true },
                    { k: "Storage narrative", v: "narrative", area: true },
                  ]
                },
                { label: "Q. References & Attachments", text: selectedSopDetails.details?.references },
                {
                  label: "R. Document Control & Sign-off", data: selectedSopDetails.details?.signoff, fields: [
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

                  {sec.text && <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)", whiteSpace: "pre-wrap" }}>{sec.text}</div>}

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
                              <div style={{ padding: 10, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", marginTop: 4, whiteSpace: "pre-wrap" }}>{val}</div>
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
              {selectedSopDetails.status.toUpperCase() === "DRAFT" && (
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
                  value={`${window.location.origin}/domains/qms/view-sop?code=${shareSop.code}`}
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

              <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <a
                  href={`mailto:?subject=SOP%20Shared%3A%20${encodeURIComponent(shareSop.code)}&body=Hi%20there%2C%0A%0APlease%20review%20this%20Standard%20Operating%20Procedure%20details%20by%20clicking%20on%20the%20link%20below%3A%0A%0A${encodeURIComponent(window.location.origin + '/domains/qms/view-sop?code=' + shareSop.code)}`}
                  style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  ✉ Share via Email
                </a>
                <button
                  onClick={() => setShareSop(null)}
                  style={{
                    background: "var(--color-primary)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA (RENDERED FOR PDF GENERATION) */}
      {printingSop && (
        <div id="qms-sop-print-area">
          {/* COVER PAGE (PAGE 1) */}
          <div className="cover-page page-break-after">
            <div className="text-center" style={{ width: "100%" }}>
              <h1 style={{ fontSize: "20px", fontWeight: "800", margin: "0 0 8px 0", color: "#1e3a8a", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
                ARMAUER HANSEN RESEARCH INSTITUTE
              </h1>
              <h3 style={{ fontSize: "11px", fontWeight: "700", margin: "0 0 20px 0", color: "#64748b", fontFamily: "sans-serif", letterSpacing: "0.08em" }}>
                QUALITY MANAGEMENT SYSTEM | CENTRAL LABORATORY
              </h3>
              <div style={{ borderBottom: "3px double #1e3a8a", width: "100%", margin: "0 auto 25px auto" }}></div>
              <div style={{ margin: "25px 0", display: "flex", justifyContent: "center" }}>
                {renderAhriLogo(240, 145)}
              </div>
              <div style={{ margin: "30px 0" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>
                  Standard Operating Procedure
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "0", color: "#0f172a", fontFamily: "sans-serif", borderTop: "2px solid #1e3a8a", borderBottom: "2px solid #1e3a8a", padding: "18px 10px", textTransform: "uppercase", lineHeight: "1.4" }}>
                  {printingSop.title}
                </h2>
              </div>
            </div>

            {/* Metadata Table Page 1 */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #1e3a8a", marginTop: "30px", fontFamily: "sans-serif" }}>
              <tbody>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", width: "30%", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Prepared by:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.details?.signoff?.preparedByName || printingSop.author || "N/A"}{" "}
                    {printingSop.details?.signoff?.preparedByRole ? `(${printingSop.details.signoff.preparedByRole})` : ""}{" "}
                    {printingSop.details?.signoff?.preparedDate ? `on ${printingSop.details.signoff.preparedDate}` : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Reviewed by:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.details?.signoff?.reviewedByName || "N/A"}{" "}
                    {printingSop.details?.signoff?.reviewedByRole ? `(${printingSop.details.signoff.reviewedByRole})` : ""}{" "}
                    {printingSop.details?.signoff?.reviewedDate ? `on ${printingSop.details.signoff.reviewedDate}` : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Approved by:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.details?.signoff?.approvedByName || "N/A"}{" "}
                    {printingSop.details?.signoff?.approvedByRole ? `(${printingSop.details.signoff.approvedByRole})` : ""}{" "}
                    {printingSop.details?.signoff?.approvedDate ? `on ${printingSop.details.signoff.approvedDate}` : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Effective Date:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Version No:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.version}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", backgroundColor: "#f8fafc" }}>Document No:</td>
                  <td style={{ border: "1.5px solid #1e3a8a", padding: "10px 14px", fontSize: "11px", color: "#334155" }}>
                    {printingSop.code}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* REPEATING HEADER / FOOTER BODY WRAPPER FOR PAGE 2+ */}
          <div className="printable-body-wrapper">
            <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
              <thead>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* Header Table: repeating on every page */}
                    <table style={{ width: "100%", border: "1.5px solid #1e3a8a", borderCollapse: "collapse", marginBottom: "20px", fontFamily: "sans-serif" }}>
                      <tbody>
                        <tr>
                          {/* Mini logo cell spans 3 rows */}
                          <td rowSpan={3} style={{ width: "90px", border: "1.5px solid #1e3a8a", textAlign: "center", verticalAlign: "middle", padding: "6px", backgroundColor: "#f8fafc" }}>
                            {renderAhriLogo(80, 50)}
                          </td>
                          <td style={{ border: "1.5px solid #1e3a8a", padding: "8px 12px", fontWeight: "bold", fontSize: "11px", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            ARMAUER HANSEN RESEARCH INSTITUTE LABORATORY
                          </td>
                          <td style={{ border: "1.5px solid #1e3a8a", padding: "8px 12px", fontSize: "10px", width: "180px", fontWeight: "bold", color: "#475569" }}>
                            Effective Date: {printingSop.details?.effectiveDate || printingSop.lastUpdated || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #1e3a8a", padding: "8px 12px", fontWeight: "bold", fontSize: "12px", color: "#0f172a", textTransform: "uppercase" }}>
                            TITLE: {printingSop.title}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ border: "1.5px solid #1e3a8a", padding: 0 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                              <tbody>
                                <tr>
                                  <td style={{ borderRight: "1.5px solid #1e3a8a", padding: "6px 12px", fontSize: "10px", fontWeight: "bold", width: "35%", color: "#475569" }}>
                                    Document No: {printingSop.code}
                                  </td>
                                  <td style={{ borderRight: "1.5px solid #1e3a8a", padding: "6px 12px", fontSize: "10px", fontWeight: "bold", width: "30%", color: "#475569" }}>
                                    Version No: {printingSop.version}
                                  </td>
                                  <td style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "bold", width: "35%", color: "#475569" }}>
                                    Page No: <span className="page-number"></span>
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
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1.5px solid #1e3a8a",
                      paddingTop: "8px",
                      marginTop: "10px",
                      fontFamily: "sans-serif",
                      fontSize: "10px",
                      fontWeight: "bold",
                      width: "100%",
                      color: "#475569"
                    }}>
                      <span>
                        Version No: {printingSop.version} | Year: {new Date(printingSop.details?.effectiveDate || printingSop.lastUpdated || Date.now()).getFullYear()}
                      </span>
                      <span>
                        Page: <span className="page-number"></span>
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>

              <tbody>
                <tr>
                  <td style={{ border: "none", padding: 0 }}>
                    {/* B TO R CONTENTS (Start Page 2) */}
                    <div style={{ fontFamily: "sans-serif", fontSize: "12px", color: "#000000", lineHeight: "1.5" }}>
                      {[
                        {
                          label: "B. Revision & Amendment History", data: printingSop.details?.revision, fields: [
                            { k: "Revision Number", v: "revisionNumber" },
                            { k: "Revision Date", v: "revisionDate" },
                            { k: "Summary of changes from previous version", v: "revisionSummary", multiline: true },
                            { k: "Rationale for change", v: "revisionRationale", multiline: true },
                          ]
                        },
                        {
                          label: "C. Purpose, Scope & Background", data: printingSop.details?.purposeScope, fields: [
                            { k: "Purpose (verbatim)", v: "purpose", multiline: true },
                            { k: "Scope - what this SOP covers", v: "scopeCovers", multiline: true },
                            { k: "Scope - what is explicitly excluded", v: "scopeExcluded", multiline: true },
                            { k: "Background / Introduction", v: "background", multiline: true },
                          ]
                        },
                        {
                          label: "D. Definitions & Abbreviations", data: printingSop.details?.definitions, fields: [
                            { k: "Definitions / Terminology (narrative)", v: "definitions", multiline: true },
                            { k: "Abbreviations used in this SOP", v: "abbreviations", multiline: true },
                          ]
                        },
                        {
                          label: "E. Responsibility & Accountability", data: printingSop.details?.responsibility, fields: [
                            { k: "Roles involved in executing this SOP", v: "roles", list: true },
                            { k: "Responsibility & accountability (narrative)", v: "responsibilityNarrative", multiline: true },
                          ]
                        },
                        { label: "F. Principle of the Method", text: printingSop.details?.principle },
                        {
                          label: "G. Samples / Specimens Covered", data: printingSop.details?.samples, fields: [
                            { k: "Sample matrices covered by this SOP", v: "matrices", list: true },
                            { k: "Input material type(s)", v: "inputMaterials", list: true },
                            { k: "Volume / amount required per sample", v: "volumeRequired" },
                            { k: "Sample acceptance criteria", v: "acceptance", multiline: true },
                            { k: "Sample rejection criteria", v: "rejection", multiline: true },
                          ]
                        },
                        {
                          label: "H. Reagents & Supplies", data: printingSop.details?.reagents, fields: [
                            { k: "Reagents & supplies (full narrative as in SOP)", v: "narrative", multiline: true },
                            { k: "Reagents & supplies (one per line)", v: "list", multiline: true },
                          ]
                        },
                        {
                          label: "I. Equipment & Instruments", data: printingSop.details?.equipment, fields: [
                            { k: "Primary equipment used", v: "primary", list: true },
                            { k: "Equipment & instruments (one per line)", v: "list", multiline: true },
                          ]
                        },
                        {
                          label: "J. Environmental & Safety Controls", data: printingSop.details?.safety, fields: [
                            { k: "PPE required", v: "ppe", list: true },
                            { k: "Biosafety level required", v: "level" },
                            { k: "Hazards relevant to this procedure", v: "hazards", list: true },
                            { k: "Waste handling instructions", v: "waste", multiline: true },
                            { k: "Additional safety / environmental controls", v: "additional", multiline: true },
                          ]
                        },
                        {
                          label: "K. Quality Control", data: printingSop.details?.qualityControl, fields: [
                            { k: "Controls included in this SOP", v: "controls", list: true },
                            { k: "DNA/RNA QC methods specified", v: "methods", list: true },
                            { k: "Acceptance / rejection criteria", v: "acceptance", multiline: true },
                            { k: "Quality control narrative (verbatim from SOP)", v: "narrative", multiline: true },
                          ]
                        },
                        {
                          label: "L. Stepwise Procedure", data: printingSop.details?.procedure, fields: [
                            { k: "Full procedure narrative", v: "narrative", multiline: true },
                            { k: "Stepwise procedure list", v: "steps", multiline: true },
                          ]
                        },
                        {
                          label: "M. Calculation / Data Analysis", data: printingSop.details?.calculation, fields: [
                            { k: "Calculations / formulas used", v: "formulas", multiline: true },
                            { k: "Software / analysis tools used", v: "software", multiline: true },
                            { k: "Interpretation rules / thresholds", v: "thresholds", multiline: true },
                          ]
                        },
                        {
                          label: "N. Result Reporting & Interpretation", data: printingSop.details?.resultReporting, fields: [
                            { k: "Reporting format (units, layout)", v: "format", multiline: true },
                            { k: "Cut-offs / thresholds", v: "thresholds", multiline: true },
                            { k: "LIMS / database field mapping", v: "lims", multiline: true },
                            { k: "Result reporting narrative", v: "narrative", multiline: true },
                          ]
                        },
                        {
                          label: "P. Storage & Transport Requirements", data: printingSop.details?.storage, fields: [
                            { k: "Sample types this SOP stores / transports", v: "types", list: true },
                            { k: "Recommended storage temperature", v: "temp" },
                            { k: "Maximum storage duration", v: "duration" },
                            { k: "Acceptable transport modes", v: "transport", list: true },
                            { k: "Storage & transport narrative", v: "narrative", multiline: true },
                          ]
                        },
                        { label: "Q. References & Attachments", text: printingSop.details?.references },
                        {
                          label: "R. Document Control & Sign-off", data: printingSop.details?.signoff, fields: [
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
                          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold", borderBottom: "1.5px solid #1e3a8a", color: "#1e3a8a", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {sec.label}
                          </h3>

                          {sec.text && <div style={{ fontSize: "11px", whiteSpace: "pre-wrap", paddingLeft: "10px", color: "#334155", lineHeight: "1.4" }}>{sec.text}</div>}

                          {sec.data && sec.fields && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "10px" }}>
                              {sec.fields.map((f, fidx) => {
                                const val = sec.data[f.v];
                                if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;

                                return (
                                  <div key={fidx} style={{ fontSize: "11px" }}>
                                    <h4 style={{ margin: "0 0 3px 0", fontSize: "11px", fontWeight: "bold", color: "#475569" }}>{f.k}:</h4>
                                    {f.list && Array.isArray(val) ? (
                                      <ul style={{ margin: "4px 0 6px 20px", padding: 0, listStyleType: "square" }}>
                                        {val.map((item: string, idx: number) => (
                                          <li key={idx} style={{ padding: "2px 0", fontSize: "11px", color: "#334155" }}>{item}</li>
                                        ))}
                                      </ul>
                                    ) : f.multiline ? (
                                      <div style={{ padding: "8px 12px", borderLeft: "3px solid #1e3a8a", background: "#f8fafc", whiteSpace: "pre-wrap", margin: "4px 0 8px 0", borderRadius: "0 4px 4px 0", color: "#334155", lineHeight: "1.4" }}>{val}</div>
                                    ) : (
                                      <div style={{ padding: "4px 0", paddingLeft: "8px", borderLeft: "2px solid #cbd5e1", color: "#334155" }}>{val}</div>
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
      )}

      {/* Dynamic CSS Styling & Print Styling */}
      <style>{`
        /* PRINT SPECIFIC STYLES */
        @media print {
          /* Remove all layout limits from ancestors of #qms-sop-print-area to prevent cutoff */
          html, body, #root, .anim {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #root > div, .anim > div {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            display: block !important;
            position: static !important;
          }
          
          /* Hide main app screen elements to prevent empty spacing or page push */
          .anim > *:not(#qms-sop-print-area) {
            display: none !important;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          #qms-sop-print-area, #qms-sop-print-area * {
            visibility: visible !important;
          }
          
          #qms-sop-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            text-align: left !important;
          }
          
          /* Force left-alignment for all standard elements inside the print area to override parent rules */
          #qms-sop-print-area td,
          #qms-sop-print-area th,
          #qms-sop-print-area p,
          #qms-sop-print-area div,
          #qms-sop-print-area h1,
          #qms-sop-print-area h2,
          #qms-sop-print-area h3,
          #qms-sop-print-area h4,
          #qms-sop-print-area li,
          #qms-sop-print-area span {
            text-align: left;
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
            height: 255mm !important; /* Perfect printable height for A4 with 20mm margins */
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 10mm 5mm !important;
          }
          
          .print-section-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 25px !important;
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
            size: A4 portrait;
            margin: 20mm 15mm !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Dynamic client-side repeating footer simulation */
          .printable-body-wrapper {
            position: relative;
            overflow: visible !important;
            height: auto !important;
          }
          
          body {
            counter-reset: page 1;
          }
          
          .page-number::after {
            counter-increment: page;
            content: counter(page);
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
    </div>
  );
}
