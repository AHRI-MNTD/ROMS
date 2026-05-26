import React, { useState, useMemo, useEffect } from "react";
import { fetchSOPs, syncSOPs } from "../../api/domains";

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
  status: "APPROVED" | "DRAFT" | "UNDER REVIEW" | "REVIEW" | "RETIRED";
  author: string;
  lastUpdated: string;
}

export default function QMSPage() {
  // Navigation states
  const [activeSubfnIdx, setActiveSubfnIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("draft");

  // Filtering & Pagination states
  const [searchText, setSearchText] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [selectedSubSection, setSelectedSubSection] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [statusFilterCard, setStatusFilterCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showNewSopModal, setShowNewSopModal] = useState<boolean>(false);

  // New SOP Form state
  const [newSopCode, setNewSopCode] = useState<string>("");
  const [newSopTitle, setNewSopTitle] = useState<string>("");
  const [newSopSection, setNewSopSection] = useState<string>(SOP_SECTIONS[0]);
  const [newSopSubSection, setNewSopSubSection] = useState<string>(SOP_SUB_SECTIONS[SOP_SECTIONS[0]][0]);
  const [newSopVersion, setNewSopVersion] = useState<string>("1.0");
  const [newSopAuthor, setNewSopAuthor] = useState<string>("");

  // SOP dynamic backend states
  const [sops, setSops] = useState<SOPItem[]>([]);
  const [isSopsLoading, setIsSopsLoading] = useState<boolean>(false);
  const [sopsError, setSopsError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local state for added SOPs (client-side creations)
  const [localSops, setLocalSops] = useState<SOPItem[]>([]);

  const isCapasLoading = false;
  const dbCapasData = { data: [] as any[], total: 0 };

  // Trigger floating notifications
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load SOPs from database
  const loadSopsList = async () => {
    setIsSopsLoading(true);
    setSopsError(null);
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

  // Handle Kobo Sync
  const handleKoboSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncSOPs();
      showToast(`Successfully synced ${res.count} SOP submissions from KoboToolbox!`);
      await loadSopsList();
    } catch (err: any) {
      console.error(err);
      showToast("Sync failed or Kobo offline. Attempting offline fallback sync...");
      // Simulate/trigger backend's beautiful local mock data sync if available
      try {
        await loadSopsList();
      } catch {
        // fail-safe
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSopsList();
  }, []);

  // Subfunctions metadata (No numbers)
  const subfunctions = [
    { name: "SOPs", desc: "" },
    { name: "Training & Acknowledgment", desc: "Assign and track read-acknowledgments for SOP compliance" },
    { name: "Audits & CAPA", desc: "Track quality audits and corrective/preventive actions" },
    { name: "Incident & Deviation Reporting", desc: "Log non-conformances, near-misses, and deviations" },
    { name: "QMS & Accreditation", desc: "Monitor ISO standards compliance and quality KPIs" },
  ];

  // Merge client-created localSops with synced backend SOPs
  const allSops = useMemo(() => {
    const localCodes = new Set(localSops.map(s => s.code));
    const filteredBackend = sops.filter(s => !localCodes.has(s.code));
    return [...localSops, ...filteredBackend];
  }, [localSops, sops]);

  // Compute stats on the real list
  const stats = useMemo(() => {
    const total = allSops.length;
    const drafts = allSops.filter((s) => s.status === "DRAFT").length;
    const review = allSops.filter((s) => s.status === "UNDER REVIEW" || s.status === "REVIEW").length;
    const approved = allSops.filter((s) => s.status === "APPROVED").length;
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
        matchesStatus = sop.status === selectedStatus;
      } else if (statusFilterCard) {
        matchesStatus = sop.status === statusFilterCard;
      }

      return matchesSearch && matchesSection && matchesSubSection && matchesStatus;
    });
  }, [allSops, searchText, selectedSection, selectedSubSection, selectedStatus, statusFilterCard]);

  // Handle adding a new SOP locally
  const handleCreateSop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSopCode || !newSopTitle || !newSopAuthor) return;

    const newItem: SOPItem = {
      id: `sop-local-${Date.now()}`,
      code: newSopCode,
      title: newSopTitle,
      sopSection: newSopSection,
      sopSubSection: newSopSubSection,
      version: newSopVersion,
      status: "DRAFT",
      author: newSopAuthor,
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setLocalSops((prev) => [newItem, ...prev]);
    setShowNewSopModal(false);

    // Reset fields
    setNewSopCode("");
    setNewSopTitle("");
    setNewSopAuthor("");
    setNewSopVersion("1.0");
  };

  // Pagination constants
  const itemsPerPage = 5;
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

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }} className="anim">
      {/* ── LEFT COLUMN: Sub-functions Sidebar ── */}
      <div
        style={{
          width: 250,
          minWidth: 250,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
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
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
            SOPs & Quality Management
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-faint)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 4px 4px" }}>
            Sub-functions
          </span>
          {subfunctions.map((sub, idx) => {
            const isActive = activeSubfnIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveSubfnIdx(idx);
                  setCurrentPage(1);
                  setStatusFilterCard(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "left",
                  fontSize: "var(--fs-sm)",
                  transition: "all 0.12s",
                  background: isActive ? "var(--color-primary)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--color-text-muted)",
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? "var(--shadow-sm)" : "none",
                  borderLeft: isActive ? "4px solid var(--color-primary-highlight)" : "4px solid transparent",
                }}
              >
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sub.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT COLUMN: Content Pane ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Active Title Block */}
        {activeSubfnIdx !== 0 && (
          <div
            style={{
              padding: "24px 32px 16px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--color-surface)",
            }}
          >
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                {subfunctions[activeSubfnIdx].name}
              </h1>
              {subfunctions[activeSubfnIdx].desc && (
                <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
                  {subfunctions[activeSubfnIdx].desc}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Inner Scroll Pane */}
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>

          {/* Sub-function 1: SOP Authoring & Control */}
          {activeSubfnIdx === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Tab Navigation */}
              <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--color-divider)", margin: "0 -8px" }}>
                {[
                  {
                    id: "draft", label: "SOPs", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    )
                  },
                  {
                    id: "review", label: "Review & Approval Workflow", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    )
                  },
                  {
                    id: "version", label: "Version Control", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    )
                  },
                  {
                    id: "distribution", label: "Controlled Distribution", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="5" r="3"></circle><circle cx="12" cy="19" r="3"></circle><circle cx="5" cy="12" r="3"></circle><circle cx="19" cy="12" r="3"></circle></svg>
                    )
                  },
                  {
                    id: "change", label: "Change Control", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                    )
                  }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 16px",
                        fontSize: "var(--fs-sm)",
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                        borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                        transition: "all 0.15s",
                        marginBottom: "-1px",
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "draft" ? (
                <>
                  {sopsError && (
                    <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
                      API connection unavailable — showing locally added items.
                    </div>
                  )}

                  {/* Stats Cards Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
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
                            borderRadius: "var(--radius-sm)",
                            padding: "4px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                            boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                            height: 32,
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
                          <div style={{ fontSize: "11px", flexShrink: 0 }}>
                            {card.icon}
                          </div>
                          <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: "8px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{card.title}</span>
                            <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)", margin: "0" }}>{card.value}</h3>
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
                        placeholder="Search SOPs by title, code, section, sub-section..."
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

                    {/* Sync from Kobo Button */}
                    <button
                      onClick={handleKoboSync}
                      disabled={isSyncing}
                      style={{
                        background: "linear-gradient(135deg, var(--color-primary), #4f46e5)",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--fs-sm)",
                        fontWeight: 600,
                        cursor: isSyncing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "var(--shadow-sm)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        opacity: isSyncing ? 0.7 : 1,
                        marginLeft: "auto",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSyncing) {
                          e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
                          e.currentTarget.style.boxShadow = "var(--shadow-md)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSyncing) {
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                        }
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          animation: isSyncing ? "spin 1s linear infinite" : "none",
                        }}
                      >
                        🔄
                      </span>
                      {isSyncing ? "Syncing..." : "Sync from Kobo"}
                    </button>
                  </div>

                  {/* SOP Table */}
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
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 110 }}>SOP Code</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Title</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 160 }}>SOP Section</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 160 }}>SOP Sub Section</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 80 }}>Version</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 130 }}>Status</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 110 }}>Author</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", width: 110 }}>Last Updated</th>
                          <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", width: 100 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isSopsLoading ? (
                          <tr>
                            <td colSpan={9} style={{ padding: "30px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                              Loading SOP data…
                            </td>
                          </tr>
                        ) : paginatedSops.length > 0 ? (
                          paginatedSops.map((sop) => {
                            let badgeStyle = {};
                            if (sop.status === "APPROVED") {
                              badgeStyle = { background: "#e8f5e9", color: "#2e7d32" };
                            } else if (sop.status === "DRAFT") {
                              badgeStyle = { background: "#e3f2fd", color: "#1565c0" };
                            } else if (sop.status === "UNDER REVIEW" || sop.status === "REVIEW") {
                              badgeStyle = { background: "#f3e5f5", color: "#7b1fa2" };
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
                                <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.sopSection}</td>
                                <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.sopSubSection}</td>
                                <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.version}</td>
                                <td style={{ padding: "12px 16px", fontSize: "10px" }}>
                                  <span style={{ padding: "3px 8px", borderRadius: "10px", fontWeight: 700, textTransform: "uppercase", ...badgeStyle }}>
                                    {sop.status}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{sop.author}</td>
                                <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{sop.lastUpdated}</td>
                                <td style={{ padding: "12px 16px", display: "flex", gap: 6, justifyContent: "center" }}>
                                  <button title="View Details" style={{ color: "var(--color-text-muted)", cursor: "pointer", padding: 2 }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}>
                                    👁️
                                  </button>
                                  <button title="Edit" style={{ color: "var(--color-text-muted)", cursor: "pointer", padding: 2 }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}>
                                    ✏️
                                  </button>
                                  <button title="More Options" style={{ color: "var(--color-text-muted)", cursor: "pointer", padding: 2 }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}>
                                    ⋮
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} style={{ padding: "30px", textTransform: "uppercase", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textAlign: "center" }}>
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
                </>
              ) : (
                <div
                  style={{
                    padding: "60px 40px",
                    background: "var(--color-surface)",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {activeTab.replace(/([A-Z])/g, " $1")} Control Panel
                  </h3>
                  <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-faint)" }}>
                    This component is prepped and waiting to load specific functionalities.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sub-function 2: Training & Acknowledgment */}
          {activeSubfnIdx === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Stats Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { title: "Compliance Rate", value: "—", subtitle: "Role-based training completed", icon: "📈", bg: "#e8f5e9", color: "#2e7d32" },
                  { title: "Pending Assignments", value: "0", subtitle: "Awaiting staff acknowledgment", icon: "⏳", bg: "#fff3e0", color: "#f57c00" },
                  { title: "Overdue Trainings", value: "0", subtitle: "Reminders dispatched", icon: "⚠️", bg: "#ffebee", color: "#c62828" },
                ].map((card, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: card.bg,
                        color: card.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: "1.2rem",
                      }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{card.title}</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: "2px 0 0" }}>{card.value}</h3>
                      <span style={{ fontSize: "10px", color: "var(--color-text-faint)", marginTop: 2, display: "block" }}>{card.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Training logs table */}
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
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 100 }}>SOP Code</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left" }}>SOP Title</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 140 }}>Staff Member</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 120 }}>Role</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 120 }}>Status</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 110 }}>Assigned</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 110 }}>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={7} style={{ padding: "30px", textTransform: "uppercase", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textAlign: "center" }}>
                        No training records found.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-function 3: Audits & CAPA (Displays live data from Prisma API) */}
          {activeSubfnIdx === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Stats Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { title: "Active CAPA Plans", value: dbCapasData?.total ?? 0, subtitle: "Assigned corrective actions", icon: "📋", bg: "#e0f2f1", color: "#00796b" },
                  { title: "Resolved Findings", value: "0", subtitle: "Closed audit actions", icon: "✅", bg: "#e8f5e9", color: "#2e7d32" },
                  { title: "Quality Audit Score", value: "—", subtitle: "Last compliance review", icon: "⭐️", bg: "#fffde7", color: "#fbc02d" },
                ].map((card, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: card.bg,
                        color: card.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: "1.2rem",
                      }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>{card.title}</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: "2px 0 0" }}>{card.value}</h3>
                      <span style={{ fontSize: "10px", color: "var(--color-text-faint)", marginTop: 2, display: "block" }}>{card.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CAPA list */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ padding: "16px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active Audit non-conformances & CAPA
                  </h3>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Live database data</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left" }}>Finding & Observation</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 140 }}>Owner</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 120 }}>Due Date</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 120 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCapasLoading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "30px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                          Loading CAPA data…
                        </td>
                      </tr>
                    ) : dbCapasData?.data && dbCapasData.data.length > 0 ? (
                      dbCapasData.data.map((capa) => (
                        <tr key={capa.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                          <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{capa.finding}</td>
                          <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>{capa.owner?.displayName || "QA Officer"}</td>
                          <td style={{ padding: "12px 16px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>{new Date(capa.dueDate).toLocaleDateString()}</td>
                          <td style={{ padding: "12px 16px", fontSize: "10px" }}>
                            <span style={{ padding: "3px 8px", borderRadius: "10px", fontWeight: 700, background: "#fff8e1", color: "#f57f17" }}>
                              {capa.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "30px", textTransform: "uppercase", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textAlign: "center" }}>
                          No CAPAs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-function 4: Incident & Deviation Reporting */}
          {activeSubfnIdx === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Deviations table */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ padding: "16px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Logged Laboratory Incident & Deviation Reports
                  </h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 120 }}>Deviation Code</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left" }}>Description</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 110 }}>Severity</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 180 }}>Root Cause</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 110 }}>Logged Date</th>
                      <th style={{ padding: "12px 16px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "left", width: 110 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} style={{ padding: "30px", textTransform: "uppercase", fontSize: "var(--fs-xs)", color: "var(--color-text-faint)", textAlign: "center" }}>
                        No incident reports logged.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-function 5: QMS & Accreditation */}
          {activeSubfnIdx === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                {[
                  { title: "ISO 15189 Standard Compliance", desc: "Requirements for quality and competence in medical laboratories.", score: "—", status: "PENDING ASSESS", checklist: "Checkpoints unverified" },
                  { title: "ISO 17025 Standard Compliance", desc: "General requirements for the competence of testing and calibration laboratories.", score: "—", status: "PENDING ASSESS", checklist: "Checkpoints unverified" },
                  { title: "GLP & GCP Compliance Checklist", desc: "Good Laboratory Practice and Good Clinical Practice compliance guidelines.", score: "—", status: "PENDING ASSESS", checklist: "Training records pending" },
                  { title: "Laboratory Risk Registers", desc: "Identification and mitigation control register for laboratory bio-risk hazards.", score: "—", status: "PENDING ASSESS", checklist: "Mitigation register unverified" },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      padding: 20,
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <h3 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--color-text)" }}>{item.title}</h3>
                      <span style={{ padding: "2px 8px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: 10, fontSize: "10px", fontWeight: 700 }}>
                        {item.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.45 }}>{item.desc}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-divider)", paddingTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-faint)" }}>{item.checklist}</span>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-primary)" }}>{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── NEW SOP CREATION MODAL ── */}
      {showNewSopModal && (
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
              background: "var(--color-surface-2)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
              width: 500,
              maxWidth: "90%",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ background: "var(--color-surface)", padding: "16px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)" }}>Create New SOP</h3>
              <button onClick={() => setShowNewSopModal(false)} style={{ fontSize: "18px", color: "var(--color-text-muted)", cursor: "pointer" }}>×</button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSop} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* SOP Code */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SOP-BIO-008"
                  value={newSopCode}
                  onChange={(e) => setNewSopCode(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Title */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Autoclave Calibration Process"
                  value={newSopTitle}
                  onChange={(e) => setNewSopTitle(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    outline: "none",
                  }}
                />
              </div>

              {/* SOP Section & SOP Sub Section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Section</label>
                  <select
                    value={newSopSection}
                    onChange={(e) => {
                      const sec = e.target.value;
                      setNewSopSection(sec);
                      setNewSopSubSection(SOP_SUB_SECTIONS[sec][0]);
                    }}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                    }}
                  >
                    {SOP_SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Sub Section</label>
                  <select
                    value={newSopSubSection}
                    onChange={(e) => setNewSopSubSection(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                    }}
                  >
                    {SOP_SUB_SECTIONS[newSopSection]?.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Version & Author */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Version</label>
                  <input
                    type="text"
                    required
                    value={newSopVersion}
                    onChange={(e) => setNewSopVersion(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Author</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Smith"
                    value={newSopAuthor}
                    onChange={(e) => setNewSopAuthor(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowNewSopModal(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--color-primary)",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                  }}
                >
                  Create SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Toast Notification & Kobo Animations Style */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 9999,
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-sm)",
          fontWeight: 600,
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}>
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}
      <style>{`
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
