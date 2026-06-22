import React, { useState, useMemo, useEffect } from "react";
import logoAhri from "../../../assets/logo_ahri.png";

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

interface QMSViewerViewProps {
  sops: SOPItem[];
  onPrintRequest: (sop: SOPItem) => void;
}

export default function QMSViewerView({ sops, onPrintRequest }: QMSViewerViewProps) {
  // Local state
  const [searchText, setSearchText] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterMethodFamily, setFilterMethodFamily] = useState<string>("All");
  const [selectedSopForReading, setSelectedSopForReading] = useState<SOPItem | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("TOTAL");
  const [showGuidelinesModal, setShowGuidelinesModal] = useState<boolean>(false);
  const [activeGuidelineTab, setActiveGuidelineTab] = useState<string>("intro");
  const [guidelineSearch, setGuidelineSearch] = useState<string>("");

  // Favorites & History states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentHistory, setRecentHistory] = useState<{ code: string; title: string; timestamp: string }[]>([]);

  // Load favorites and history from localStorage
  useEffect(() => {
    try {
      const favs = localStorage.getItem("roms_viewer_favorites");
      if (favs) setFavorites(JSON.parse(favs));

      const hist = localStorage.getItem("roms_viewer_history");
      if (hist) setRecentHistory(JSON.parse(hist));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Compute metrics dynamically from sops array
  const metrics = useMemo(() => {
    const total = sops.length;
    const drafts = sops.filter(s => s.status.toUpperCase() === "DRAFT").length;
    const submitted = sops.filter(s => s.status.toUpperCase() === "UNDER REVIEW" || s.status.toUpperCase() === "REVIEW" || s.status.toUpperCase() === "SUBMITTED").length;
    const approved = sops.filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE / APPROVED" || s.status.toUpperCase() === "ACTIVE").length;
    const returned = sops.filter(s => s.status.toUpperCase() === "RETURNED" || s.status.toUpperCase() === "NEEDS REVISION" || s.status.toUpperCase() === "REJECTED").length;

    return { total, drafts, submitted, approved, returned };
  }, [sops]);

  // Filter SOPs list based on active status card, category, method family, and search
  const filteredSops = useMemo(() => {
    return sops.filter(sop => {
      const statusUpper = sop.status.toUpperCase();
      let matchesStatus = true;

      if (selectedStatusFilter === "DRAFTS") {
        matchesStatus = statusUpper === "DRAFT";
      } else if (selectedStatusFilter === "SUBMITTED") {
        matchesStatus = statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW" || statusUpper === "SUBMITTED";
      } else if (selectedStatusFilter === "APPROVED") {
        matchesStatus = statusUpper === "APPROVED" || statusUpper === "ACTIVE / APPROVED" || statusUpper === "ACTIVE";
      } else if (selectedStatusFilter === "RETURNED") {
        matchesStatus = statusUpper === "RETURNED" || statusUpper === "NEEDS REVISION" || statusUpper === "REJECTED";
      }

      const matchesSearch =
        sop.title.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = filterCategory === "All" || sop.sopSection === filterCategory;
      const matchesFamily = filterMethodFamily === "All" || sop.details?.methodFamily === filterMethodFamily;

      return matchesStatus && matchesSearch && matchesCategory && matchesFamily;
    });
  }, [sops, searchText, filterCategory, filterMethodFamily, selectedStatusFilter]);

  // Dynamic Options for Filters
  const categoriesList = useMemo(() => {
    const cats = sops.map(s => s.sopSection).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [sops]);

  const methodFamiliesList = useMemo(() => {
    const fams = sops.map(s => s.details?.methodFamily).filter(Boolean);
    return Array.from(new Set(fams)).sort();
  }, [sops]);

  // Toggling favorite
  const handleToggleFavorite = (code: string) => {
    let updated;
    if (favorites.includes(code)) {
      updated = favorites.filter(c => c !== code);
    } else {
      updated = [...favorites, code];
    }
    setFavorites(updated);
    localStorage.setItem("roms_viewer_favorites", JSON.stringify(updated));
  };

  // Add to access history
  const handleOpenSopForReading = (sop: SOPItem) => {
    setSelectedSopForReading(sop);

    // Save to history
    const entry = {
      code: sop.code,
      title: sop.title,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Deduplicate history list, cap at 5
    const filtered = recentHistory.filter(h => h.code !== sop.code);
    const updated = [entry, ...filtered].slice(0, 5);
    setRecentHistory(updated);
    localStorage.setItem("roms_viewer_history", JSON.stringify(updated));
  };

  // Recently Approved (Top 3)
  const recentlyApprovedSops = useMemo(() => {
    return sops
      .filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE")
      .slice(0, 3);
  }, [sops]);

  // Filtered list of favorite SOPs for quick widgets list
  const favoriteSopItems = useMemo(() => {
    return sops.filter(s => favorites.includes(s.code));
  }, [sops, favorites]);

  const formatRichTextLocal = (text: string) => {
    if (!text) return "N/A";
    if (!/<[a-z][\s\S]*>/i.test(text)) {
      return text.replace(/\n/g, "<br/>");
    }
    return text;
  };

  return (
    <div style={{ width: "100%" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>

        {/* SOP Information Narrative Section */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0, textAlign: "center" }}>
              Standard Operating Procedures (SOPs) Guide
            </h2>
            <p
              onClick={() => setShowGuidelinesModal(true)}
              style={{
                fontSize: "13px",
                color: "var(--color-primary)",
                margin: "6px 0 0 0",
                textAlign: "center",
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: 600,
                display: "inline-block",
                width: "100%",
              }}
              title="Click to view the interactive SOP guidelines"
            >
              "Key guidelines for writing, standardizing, and implementing quality procedures in the laboratory"
            </p>
          </div>
        </div>
        {/* Search & Filters */}
        <div style={filterPanelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={selectStyle}
            >
              <option value="All">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Method Family:</span>
            <select
              value={filterMethodFamily}
              onChange={(e) => setFilterMethodFamily(e.target.value)}
              style={selectStyle}
            >
              <option value="All">All Families</option>
              {methodFamiliesList.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          <div style={{ position: "relative", flex: 1, minWidth: "150px" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--color-text-faint)" }}>🔍</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search library by title, code, or author..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Library Table */}
        <div style={tableContainerStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={thStyle}>SOP Code</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Version</th>
                <th style={thStyle}>Effective Date</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSops.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
                    No SOPs found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSops.map((sop) => {
                  const effDateStr = sop.details?.signoff?.effectiveDate || sop.lastUpdated || "N/A";

                  let badgeStyle = { background: "#e2e8f0", color: "#475569" };
                  const statusUpper = sop.status.toUpperCase();
                  if (statusUpper === "APPROVED" || statusUpper === "ACTIVE / APPROVED" || statusUpper === "ACTIVE") {
                    badgeStyle = { background: "#dcfce7", color: "#15803d" };
                  } else if (statusUpper === "DRAFT") {
                    badgeStyle = { background: "#e0f2fe", color: "#0369a1" };
                  } else if (statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW" || statusUpper === "SUBMITTED") {
                    badgeStyle = { background: "#ffedd5", color: "#c2410c" };
                  } else if (statusUpper === "REQUESTED") {
                    badgeStyle = { background: "#ffedd5", color: "#c2410c" };
                  } else if (statusUpper === "PANEL REVIEW") {
                    badgeStyle = { background: "#f3e8ff", color: "#6b21a8" };
                  } else if (statusUpper === "RETURNED" || statusUpper === "NEEDS REVISION" || statusUpper === "REJECTED") {
                    badgeStyle = { background: "#fee2e2", color: "#b91c1c" };
                  } else if (statusUpper === "AWAITING AUTHOR RESPONSE" || statusUpper === "AWAITING RESPONSE") {
                    badgeStyle = { background: "#fef3c7", color: "#d97706" };
                  }

                  const isApproved = statusUpper === "APPROVED" || statusUpper === "ACTIVE / APPROVED" || statusUpper === "ACTIVE";

                  return (
                    <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{sop.code}</td>
                      <td style={tdStyle}>{sop.title}</td>
                      <td style={tdStyle}>v{sop.version}</td>
                      <td style={tdStyle}>{effDateStr}</td>
                      <td style={tdStyle}>{sop.sopSection}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", ...badgeStyle }}>
                          {sop.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <button
                            onClick={() => handleOpenSopForReading(sop)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                            title="Read SOP"
                          >
                            📖
                          </button>
                          <button
                            onClick={() => isApproved && onPrintRequest(sop)}
                            disabled={!isApproved}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: isApproved ? "pointer" : "not-allowed",
                              fontSize: "16px",
                              opacity: isApproved ? 1 : 0.35
                            }}
                            title={isApproved ? "Download PDF" : "PDF download is only available for Approved SOPs"}
                          >
                            🖨️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── READ-ONLY DOCUMENT VIEWER MODAL ── */}
      {selectedSopForReading && (
        <div style={modalOverlayStyle}>
          <div style={modalContainerStyle}>

            {/* Modal Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", background: "#ecfdf5", padding: "2px 6px", borderRadius: 4 }}>
                    APPROVED REFERENCE LIBRARY
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>
                    v{selectedSopForReading.version} • {selectedSopForReading.code}
                  </span>
                </div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "4px 0 0 0", color: "var(--color-text)" }}>
                  {selectedSopForReading.title}
                </h2>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => handleToggleFavorite(selectedSopForReading.code)}
                  style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "#b45309", background: favorites.includes(selectedSopForReading.code) ? "#fffbeb" : "transparent" }}
                >
                  {favorites.includes(selectedSopForReading.code) ? "⭐ Bookmarked" : "☆ Bookmark SOP"}
                </button>
                {(() => {
                  const isReadingSopApproved = selectedSopForReading.status.toUpperCase() === "APPROVED" || selectedSopForReading.status.toUpperCase() === "ACTIVE / APPROVED" || selectedSopForReading.status.toUpperCase() === "ACTIVE";
                  return (
                    <button
                      onClick={() => isReadingSopApproved && onPrintRequest(selectedSopForReading)}
                      disabled={!isReadingSopApproved}
                      style={{
                        ...btnBaseStyle,
                        background: isReadingSopApproved ? "var(--color-primary)" : "var(--color-surface-offset)",
                        color: isReadingSopApproved ? "#ffffff" : "var(--color-text-faint)",
                        cursor: isReadingSopApproved ? "pointer" : "not-allowed",
                        border: isReadingSopApproved ? "none" : "1px solid var(--color-border)",
                        opacity: isReadingSopApproved ? 1 : 0.6
                      }}
                      title={isReadingSopApproved ? "Print Document" : "Print is only available for Approved SOPs"}
                    >
                      🖨️ Print Document
                    </button>
                  );
                })()}
                <button
                  onClick={() => setSelectedSopForReading(null)}
                  style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={docPaneStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Header Logo AHRI on page 1 of print / standard display */}
                <div style={{ display: "flex", justifyContent: "center", borderBottom: "2px solid var(--color-border)", paddingBottom: 10 }}>
                  <img src={logoAhri} style={{ height: "60px" }} alt="AHRI Logo" />
                </div>

                {/* SOP Title Details */}
                <div style={{ textAlign: "center" }}>
                  <h1 style={{ fontSize: "18pt", fontWeight: "800", color: "#071338", fontFamily: "Times New Roman" }}>
                    {selectedSopForReading.title}
                  </h1>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 6 }}>
                    SOP Code: <strong>{selectedSopForReading.code}</strong> | Version: <strong>v{selectedSopForReading.version}</strong> | Section: <strong>{selectedSopForReading.sopSection}</strong>
                  </div>
                </div>

                {/* Metadata Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: "Times New Roman", fontSize: "12px" }}>
                  <tbody>
                    {[
                      ["SOP Title", selectedSopForReading.title],
                      ["Document No", selectedSopForReading.code],
                      ["Version No", selectedSopForReading.version],
                      ["Assay Category", selectedSopForReading.details?.assayCategory || selectedSopForReading.sopSection],
                      ["Method Family", selectedSopForReading.details?.methodFamily || "N/A"],
                      ["Prepared By", `${selectedSopForReading.details?.signoff?.preparedByName || selectedSopForReading.author} on ${selectedSopForReading.details?.signoff?.preparedDate || selectedSopForReading.lastUpdated}`],
                      ["Reviewed By", `${selectedSopForReading.details?.signoff?.reviewedByName || "N/A"}`],
                      ["Approved By", `${selectedSopForReading.details?.signoff?.approvedByName || "N/A"}`]
                    ].map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: "1.5px solid #000000" }}>
                        <td style={{ width: "30%", padding: "6px 12px", borderRight: "1.5px solid #000000", fontWeight: "bold", background: "#f9f9f9" }}>{k}:</td>
                        <td style={{ padding: "6px 12px" }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Revision & Amendment History */}
                {selectedSopForReading.details?.revisionHistory && Array.isArray(selectedSopForReading.details.revisionHistory) && selectedSopForReading.details.revisionHistory.length > 0 && (
                  <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface-2)", marginTop: 16 }}>
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
                        {selectedSopForReading.details.revisionHistory.map((rev: any, idx: number) => (
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
                <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius)", padding: 16, background: "var(--color-surface-2)", marginTop: 16, marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)", fontSize: "13.5px", fontWeight: 700 }}>
                    🖋️ Digital Verifications & Sign-off Log
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                    {/* Author */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>AUTHOR</span>
                      <strong style={{ fontSize: "12px" }}>{selectedSopForReading.author}</strong>
                      <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Signed ({selectedSopForReading.details?.electronicSignatures?.author?.signedAt || selectedSopForReading.lastUpdated})</span>
                    </div>

                    {/* Verifier User */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>VERIFIER (USER)</span>
                      <strong style={{ fontSize: "12px" }}>{selectedSopForReading.details?.proposedVerifier || selectedSopForReading.details?.electronicSignatures?.verifierUser?.name || "Verifier User"}</strong>
                      {selectedSopForReading.details?.electronicSignatures?.verifierUser?.signedAt ? (
                        <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Verified ({selectedSopForReading.details.electronicSignatures.verifierUser.signedAt})</span>
                      ) : (
                        <span style={{ fontSize: "10.5px", color: "#d97706", fontWeight: "bold" }}>🔴 Awaiting sign-off</span>
                      )}
                    </div>

                    {/* Verifier QO */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>VERIFIER (QO)</span>
                      <strong style={{ fontSize: "12px" }}>{selectedSopForReading.details?.electronicSignatures?.verifierQo?.name || "QA Officer"}</strong>
                      {selectedSopForReading.details?.electronicSignatures?.verifierQo?.signedAt ? (
                        <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Verified ({selectedSopForReading.details.electronicSignatures.verifierQo.signedAt})</span>
                      ) : (
                        <span style={{ fontSize: "10.5px", color: "#d97706", fontWeight: "bold" }}>🔴 Awaiting sign-off</span>
                      )}
                    </div>

                    {/* Authorizer LM */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "#ffffff", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>AUTHORIZER (LM)</span>
                      <strong style={{ fontSize: "12px" }}>{selectedSopForReading.details?.proposedAuthorizer || selectedSopForReading.details?.electronicSignatures?.authorizerLm?.name || "LM Manager"}</strong>
                      {selectedSopForReading.details?.electronicSignatures?.authorizerLm?.signedAt ? (
                        <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "bold" }}>🟢 Authorized ({selectedSopForReading.details.electronicSignatures.authorizerLm.signedAt})</span>
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
                        const det = selectedSopForReading.details || {};
                        const purp = det.purpose || det.objectivesScope || "";
                        const sc = det.scope || "";
                        const bg = det.background || "";
                        if (!purp && !sc && !bg) return null;
                        return (
                          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {purp && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Purpose (verbatim):</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(purp) }} />
                              </div>
                            )}
                            {sc && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Scope:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(sc) }} />
                              </div>
                            )}
                            {bg && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Background / Introduction:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(bg) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    { label: "Abbreviations & Definitions", text: selectedSopForReading.details?.abbreviationsDefinitions },
                    {
                      label: "Tasks, Responsibilities & Accountabilities",
                      render: () => {
                        const det = selectedSopForReading.details || {};
                        const narrative = det.responsibilityAccountability || "";
                        const grid = det.tasksGrid || [];
                        const hasGrid = Array.isArray(grid) && grid.some((r: any) => r.task || r.authorized || r.responsible);
                        if (!narrative && !hasGrid) return null;
                        return (
                          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {narrative && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Responsibility & accountability (narrative):</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
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
                    { label: "Equipment Description", text: selectedSopForReading.details?.equipmentDescription },
                    {
                      label: "Environmental & Safety Controls",
                      render: () => {
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(waste) }} />
                              </div>
                            )}
                            {addSafety && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Additional Safety / Environmental Controls:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(addSafety) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    { label: "Calibration protocol", text: selectedSopForReading.details?.calibration },
                    { label: "Controls schedule", text: selectedSopForReading.details?.controls },
                    { label: "Maintenance instructions", text: selectedSopForReading.details?.maintenance },
                    { label: "Operation steps", text: selectedSopForReading.details?.operation },
                    { label: "Troubleshooting & Problem Solving", text: selectedSopForReading.details?.problemSolving },

                    // Analysis specific
                    { label: "Scientific Principle", text: selectedSopForReading.details?.principleMethodologicalBasis || selectedSopForReading.details?.principle },
                    {
                      label: "Samples / Specimens Covered",
                      render: () => {
                        const det = selectedSopForReading.details || {};
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
                              <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(det.sample) }} />
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(acceptance) }} />
                              </div>
                            )}
                            {rejection && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Sample Rejection Criteria:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(rejection) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      label: "Reagents & Supplies",
                      render: () => {
                        const det = selectedSopForReading.details || {};
                        const narrative = det.reagentsNarrative || "";
                        const onePerLine = det.reagentsOnePerLine || "";
                        const hasGrid = Array.isArray(det.reagentsGrid) && det.reagentsGrid.some((r: any) => r.item || r.location || r.condition);

                        if (!narrative && !onePerLine && !hasGrid) return null;

                        return (
                          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {narrative && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Reagents & Supplies Narrative:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
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
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      label: "Quality Control procedures",
                      render: () => {
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(criteria) }} />
                              </div>
                            )}
                            {narrative && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Quality Control Narrative:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      label: "Procedure Sequence",
                      render: () => {
                        const det = selectedSopForReading.details || {};
                        const narrative = det.procedureNarrative || det.procedure || "";
                        const steps = det.procedureOnePerLine || "";

                        if (!narrative && !steps) return null;

                        return (
                          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {narrative && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Procedure Narrative:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
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
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(formulas) }} />
                              </div>
                            )}
                            {tools && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Software / Analysis Tools Used:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(tools) }} />
                              </div>
                            )}
                            {rules && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Interpretation Rules & Thresholds:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(rules) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      label: "Result Reporting & Interpretation",
                      render: () => {
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(format) }} />
                              </div>
                            )}
                            {cutoffs && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Cut-offs / Thresholds:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(cutoffs) }} />
                              </div>
                            )}
                            {lims && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>LIMS / Database Field Mapping:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(lims) }} />
                              </div>
                            )}
                            {narrative && (
                              <div>
                                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Result Reporting Narrative:</strong>
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      label: "Storage & Transport Requirements",
                      render: () => {
                        const det = selectedSopForReading.details || {};
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(duration) }} />
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
                                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(narrative) }} />
                              </div>
                            )}
                          </div>
                        );
                      }
                    },
                    { label: "Related Documents", text: selectedSopForReading.details?.relatedDocuments },
                    { label: "Related Forms", text: selectedSopForReading.details?.relatedForms },
                    { label: "References", text: selectedSopForReading.details?.references },
                    { label: "Attachments & Annexes", text: selectedSopForReading.details?.attachments }
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
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text)" }} dangerouslySetInnerHTML={{ __html: formatRichTextLocal(sec.text) }} />
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
            </div>

          </div>
        </div>
      )}

      {showGuidelinesModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: "1050px" }}>
            {/* Modal Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", background: "var(--color-primary-soft)", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                  QUALITY MANAGEMENT SYSTEM (QMS) RESOURCES
                </span>
                <h2 style={{ fontSize: "16px", fontWeight: 800, margin: "4px 0 0 0", color: "var(--color-text)" }}>
                  Standard Operating Procedures (SOPs) Reference Guidelines
                </h2>
              </div>
              <button
                onClick={() => setShowGuidelinesModal(false)}
                style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)", padding: "6px 16px" }}
              >
                Close Guidelines
              </button>
            </div>

            {/* Modal Body: Left sidebar tabs & Right detail view */}
            <div style={{ flex: 1, display: "flex", background: "var(--color-surface-offset)", overflow: "hidden" }}>
              {/* Left sidebar */}
              <div style={{ width: "260px", minWidth: "260px", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", padding: "16px", background: "var(--color-surface)", gap: 12 }}>
                {/* Guideline Search Input */}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "11px" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search guidelines..."
                    value={guidelineSearch}
                    onChange={(e) => setGuidelineSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 28px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-xs)",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Nav list */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                  {GUIDELINE_SECTIONS.filter(sec =>
                    sec.title.toLowerCase().includes(guidelineSearch.toLowerCase()) ||
                    sec.plainText.toLowerCase().includes(guidelineSearch.toLowerCase())
                  ).map((sec) => {
                    const isTabActive = activeGuidelineTab === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setActiveGuidelineTab(sec.id)}
                        style={{
                          textAlign: "left",
                          padding: "8px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: isTabActive ? "var(--color-primary-soft)" : "transparent",
                          color: isTabActive ? "var(--color-primary)" : "var(--color-text)",
                          fontSize: "var(--fs-sm)",
                          fontWeight: isTabActive ? 600 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{sec.icon}</span>
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{sec.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right content pane */}
              <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto", background: "#ffffff", display: "flex", flexDirection: "column", gap: 16 }}>
                {(() => {
                  const activeSection = GUIDELINE_SECTIONS.find(s => s.id === activeGuidelineTab);
                  if (!activeSection) return <div style={{ color: "var(--color-text-faint)", fontStyle: "italic" }}>Select a section from the sidebar.</div>;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "2px solid var(--color-border)", paddingBottom: 10 }}>
                        <span style={{ fontSize: "24px" }}>{activeSection.icon}</span>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-primary)", margin: 0 }}>
                          {activeSection.title}
                        </h3>
                      </div>
                      <div style={{ color: "var(--color-text)", fontSize: "14px", lineHeight: "1.6" }}>
                        {activeSection.content}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Shared styles ──
const metricCardStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  boxShadow: "var(--shadow-sm)"
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "var(--color-text)",
  margin: 0
};

const iconWrapperStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0
};

const filterPanelStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  background: "var(--color-surface)",
  padding: "12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  flexWrap: "wrap"
};

const selectStyle: React.CSSProperties = {
  padding: "6px 20px 6px 10px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "var(--fs-sm)",
  outline: "none",
  cursor: "pointer"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 12px 6px 28px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "var(--fs-sm)",
  outline: "none"
};

const tableContainerStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
  boxShadow: "var(--shadow-sm)"
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "10.5px",
  fontWeight: 600,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left"
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "var(--fs-sm)",
  color: "var(--color-text)",
  borderBottom: "1px solid var(--color-divider)"
};

const actionBtnStyle: React.CSSProperties = {
  background: "var(--color-primary-soft)",
  color: "var(--color-primary)",
  border: "none",
  padding: "4px 10px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease"
};

const widgetCardStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "14px",
  boxShadow: "var(--shadow-sm)"
};

const widgetHeaderStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--color-text)",
  margin: 0
};

const emptyWidgetTextStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--color-text-faint)",
  fontStyle: "italic"
};

const historyItemStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderLeft: "3.5px solid var(--color-primary)",
  borderRadius: "4px",
  padding: "8px",
  cursor: "pointer",
  transition: "transform 0.1s ease"
};

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

const modalContainerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "950px",
  height: "calc(100vh - 40px)",
  background: "var(--color-surface-2)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid var(--color-border)"
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const btnBaseStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "11px",
  fontWeight: 700,
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  transition: "transform 0.1s ease"
};

const docPaneStyle: React.CSSProperties = {
  flex: 1,
  padding: "24px",
  overflowY: "auto",
  background: "#ffffff"
};

const GUIDELINE_SECTIONS = [
  {
    id: "intro",
    title: "Introduction",
    plainText: "Every organization performs numerous activities on a daily basis ranging from administrative tasks and equipment operation to service delivery and quality assurance To ensure that these activities are carried out consistently and correctly organizations develop Standard Operating Procedures SOPs An SOP is a documented set of instructions that describes how a specific task or process should be performed It provides employees with clear guidance on what to do how to do it who is responsible and what records must be maintained SOPs are fundamental tools for maintaining quality efficiency safety and consistency within an organization They transform organizational knowledge into written instructions that can be followed by all employees regardless of their experience level By establishing a standardized approach to work SOPs minimize variations in performance reduce errors and ensure that activities are conducted according to approved requirements",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Every organization performs numerous activities on a daily basis, ranging from administrative tasks and equipment operation to service delivery and quality assurance. To ensure that these activities are carried out consistently and correctly, organizations develop Standard Operating Procedures (SOPs).</p>
        <p>An SOP is a documented set of instructions that describes how a specific task or process should be performed. It provides employees with clear guidance on what to do, how to do it, who is responsible, and what records must be maintained.</p>
        <p>SOPs are fundamental tools for maintaining quality, efficiency, safety, and consistency within an organization. They transform organizational knowledge into written instructions that can be followed by all employees, regardless of their experience level. By establishing a standardized approach to work, SOPs minimize variations in performance, reduce errors, and ensure that activities are conducted according to approved requirements.</p>
      </div>
    )
  },
  {
    id: "purpose",
    title: "Purpose of SOPs",
    plainText: "The primary purpose of an SOP is to ensure that tasks are performed in a uniform and controlled manner When procedures are documented and followed consistently organizations can achieve reliable outcomes improve productivity and maintain compliance with quality standards SOPs help organizations to standardize routine and critical activities ensure consistency among different employees reduce operational errors and risks improve quality and reliability of results facilitate employee training and orientation clarify responsibilities and accountability preserve organizational knowledge support auditing monitoring and continuous improvement",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>The primary purpose of an SOP is to ensure that tasks are performed in a uniform and controlled manner. When procedures are documented and followed consistently, organizations can achieve reliable outcomes, improve productivity, and maintain compliance with quality standards.</p>
        <div style={{ background: "var(--color-primary-soft)", borderLeft: "4px solid var(--color-primary)", padding: "14px", borderRadius: "0 8px 8px 0", marginTop: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, color: "var(--color-primary)" }}>SOPs help organizations to:</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Standardize routine and critical activities.</li>
            <li>Ensure consistency among different employees.</li>
            <li>Reduce operational errors and risks.</li>
            <li>Improve quality and reliability of results.</li>
            <li>Facilitate employee training and orientation.</li>
            <li>Clarify responsibilities and accountability.</li>
            <li>Preserve organizational knowledge.</li>
            <li>Support auditing, monitoring, and continuous improvement.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: "characteristics",
    title: "Characteristics of an Effective SOP",
    plainText: "A well-developed SOP should possess several important characteristics Clarity Instructions should be written in simple and understandable language Accuracy Procedures should reflect the actual process being performed Completeness All necessary steps responsibilities and requirements should be included Consistency Similar activities should follow a uniform structure and format Accessibility SOPs should be available to all personnel who need to use them Currency SOPs should be reviewed and updated regularly to reflect changes in procedures equipment or regulations",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>A well-developed SOP should possess several important characteristics:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          {[
            { title: "Clarity ", desc: "Instructions should be written in simple and understandable language." },
            { title: "Accuracy ", desc: "Procedures should reflect the actual process being performed." },
            { title: "Completeness ", desc: "All necessary steps, responsibilities, and requirements should be included." },
            { title: "Consistency ", desc: "Similar activities should follow a uniform structure and format." },
            { title: "Accessibility ", desc: "SOPs should be available to all personnel who need to use them." },
            { title: "Currency ", desc: "SOPs should be reviewed and updated regularly to reflect changes in procedures, equipment, or regulations." }
          ].map(item => (
            <div key={item.title} style={{ padding: "12px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <strong style={{ color: "var(--color-primary)", display: "block", marginBottom: 4 }}>{item.title}</strong>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", lineHeight: "1.4" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "types",
    title: "Types of SOPs",
    plainText: "Organizations often classify SOPs into three major categories depending on their purpose and content 1 Procedure SOPs Procedure SOPs describe operational and administrative processes They explain the sequence of activities that employees must follow to complete a specific task or workflow Examples include Document control procedures Inventory management procedures Staff induction procedures Customer service procedures Record management procedures These SOPs typically define objectives responsibilities workflow steps required documents forms and reporting requirements 2 Equipment SOPs Equipment SOPs provide detailed instructions for operating maintaining calibrating and troubleshooting equipment Typical contents include Equipment description Safety precautions Startup procedures Calibration procedures Maintenance requirements Operational instructions Problem-solving guidelines Equipment SOPs help ensure that equipment functions correctly and safely while extending its operational lifespan 3 Analysis SOPs Analysis SOPs describe analytical testing or examination procedures They provide detailed guidance on sample handling reagents quality control analysis methods result interpretation and reporting These SOPs generally include Principle of analysis Sample requirements Equipment and materials Reagents and chemicals Quality control procedures Step-by-step analytical methods Result processing and reporting Analysis SOPs ensure that analytical procedures are performed accurately and consistently leading to reliable and reproducible results",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p>Organizations often classify SOPs into three major categories depending on their purpose and content.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 14, borderLeft: "4px solid var(--color-primary)", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "var(--color-primary)" }}>1. Procedure SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Procedure SOPs describe operational and administrative processes. They explain the sequence of activities that employees must follow to complete a specific task or workflow.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Examples:</strong> Document control, Inventory management, Staff induction, Customer service, and Record management.
            </div>
          </div>
          <div style={{ padding: 14, borderLeft: "4px solid #10b981", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "#10b981" }}>2. Equipment SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Equipment SOPs provide detailed instructions for operating, maintaining, calibrating, and troubleshooting equipment.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Typical contents:</strong> Equipment description, Safety precautions, Startup procedures, Calibration procedures, Maintenance requirements, Operational instructions, and Problem-solving guidelines.
            </div>
          </div>
          <div style={{ padding: 14, borderLeft: "4px solid #f59e0b", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "#f59e0b" }}>3. Analysis SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Analysis SOPs describe analytical, testing, or examination procedures. They provide detailed guidance on sample handling, reagents, quality control, analysis methods, result interpretation, and reporting.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Typical contents:</strong> Principle of analysis, Sample requirements, Equipment and materials, Reagents and chemicals, Quality control procedures, Step-by-step analytical methods, and Result processing/reporting.
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "process",
    title: "SOP Development Process",
    plainText: "Developing an SOP is a systematic process that involves multiple stakeholders Step 1 Identification of Need An employee or department identifies the need for a new SOP or the revision of an existing one Step 2 Assignment of Responsibilities Appropriate personnel are assigned responsibilities for writing reviewing and approving the document Step 3 Drafting the SOP The author prepares the SOP using the appropriate framework and format The document should be based on technical expertise and practical experience Step 4 Review and Verification The draft SOP is reviewed by users and subject-matter experts to ensure technical accuracy practicality and compliance with quality requirements Step 5 Approval Authorized management personnel review and formally approve the SOP before implementation Step 6 Distribution and Implementation The approved SOP is distributed to relevant personnel who receive training on its content and application Step 7 Review and Revision SOPs are periodically reviewed and revised whenever procedures equipment regulations or organizational requirements change",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Developing an SOP is a systematic process that involves multiple stakeholders.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { step: "Step 1", title: "Identification of Need", desc: "An employee or department identifies the need for a new SOP or the revision of an existing one." },
            { step: "Step 2", title: "Assignment of Responsibilities", desc: "Appropriate personnel are assigned responsibilities for writing, reviewing, and approving the document." },
            { step: "Step 3", title: "Drafting the SOP", desc: "The author prepares the SOP using the appropriate framework and format. The document should be based on technical expertise and practical experience." },
            { step: "Step 4", title: "Review and Verification", desc: "The draft SOP is reviewed by users and subject-matter experts to ensure technical accuracy, practicality, and compliance with quality requirements." },
            { step: "Step 5", title: "Approval", desc: "Authorized management personnel review and formally approve the SOP before implementation." },
            { step: "Step 6", title: "Distribution and Implementation", desc: "The approved SOP is distributed to relevant personnel, who receive training on its content and application." },
            { step: "Step 7", title: "Review and Revision", desc: "SOPs are periodically reviewed and revised whenever procedures, equipment, regulations, or organizational requirements change." }
          ].map(item => (
            <div key={item.step} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "4px" }}>
              <span style={{ fontWeight: 800, color: "var(--color-primary)", minWidth: "55px", fontSize: "13px" }}>{item.step}</span>
              <div style={{ fontSize: "13px" }}>
                <strong>{item.title}</strong>: <span style={{ color: "var(--color-text-muted)" }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "structure",
    title: "Structure of an SOP",
    plainText: "Although SOP formats may vary among organizations a standard SOP commonly contains the following sections Title Objectives and Scope Abbreviations and Definitions Responsibilities and Accountabilities Procedure or Method Related Documents Related Forms References Attachments or Annexes This structured approach ensures consistency and makes SOPs easier to understand and use",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Although SOP formats may vary among organizations, a standard SOP commonly contains the following sections:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
          {[
            "Title", "Objectives and Scope", "Abbreviations and Definitions",
            "Responsibilities and Accountabilities", "Procedure or Method",
            "Related Documents", "Related Forms", "References", "Attachments or Annexes"
          ].map(sec => (
            <span key={sec} style={{ padding: "6px 12px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: "20px", fontSize: "11px", fontWeight: "bold" }}>
              {sec}
            </span>
          ))}
        </div>
        <p>This structured approach ensures consistency and makes SOPs easier to understand and use.</p>
      </div>
    )
  },
  {
    id: "benefits",
    title: "Benefits of SOPs",
    plainText: "The implementation of SOPs provides numerous benefits to organizations Improved Quality Standardized procedures reduce variation and improve the quality of outputs and services Enhanced Efficiency Employees spend less time determining how tasks should be performed because instructions are readily available Reduced Errors Clear guidance minimizes mistakes and operational risks Better Training New employees can quickly learn procedures through documented instructions Increased Accountability Clearly defined responsibilities make it easier to identify and monitor performance Regulatory Compliance SOPs help organizations comply with internal policies industry standards and regulatory requirements Knowledge Retention Critical organizational knowledge remains available even when experienced employees leave the organization",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>The implementation of SOPs provides numerous benefits to organizations:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { t: "Improved Quality", d: "Standardized procedures reduce variation and improve the quality of outputs and services." },
            { t: "Enhanced Efficiency", d: "Employees spend less time determining how tasks should be performed because instructions are readily available." },
            { t: "Reduced Errors", d: "Clear guidance minimizes mistakes and operational risks." },
            { t: "Better Training", d: "New employees can quickly learn procedures through documented instructions." },
            { t: "Increased Accountability", d: "Clearly defined responsibilities make it easier to identify and monitor performance." },
            { t: "Regulatory Compliance", d: "SOPs help organizations comply with internal policies, industry standards, and regulatory requirements." },
            { t: "Knowledge Retention", d: "Critical organizational knowledge remains available even when experienced employees leave the organization." }
          ].map(item => (
            <div key={item.t} style={{ padding: 12, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <strong style={{ color: "var(--color-primary)", display: "block", marginBottom: 2 }}>{item.t}</strong>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{item.d}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "conclusion",
    title: "Conclusion",

    plainText: "Standard Operating Procedures are essential management and quality tools that ensure tasks are performed consistently efficiently and safely They provide employees with clear instructions define responsibilities and establish standardized methods for carrying out organizational activities Through proper development implementation and continuous review SOPs contribute significantly to operational excellence quality improvement employee competency and organizational success By documenting best practices and promoting uniformity SOPs serve as the foundation for effective and reliable organizational performance",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Standard Operating Procedures are essential management and quality tools that ensure tasks are performed consistently, efficiently, and safely. They provide employees with clear instructions, define responsibilities, and establish standardized methods for carrying out organizational activities.</p>
        <p>Through proper development, implementation, and continuous review, SOPs contribute significantly to operational excellence, quality improvement, employee competency, and organizational success. By documenting best practices and promoting uniformity, SOPs serve as the foundation for effective and reliable organizational performance.</p>
      </div>
    )
  },
  {
    id: "questions",
    title: "Discussion Questions",
    icon: "❓",
    plainText: "What is a Standard Operating Procedure SOP Why are SOPs important in an organization What are the three main types of SOPs How does an Equipment SOP differ from an Analysis SOP What are the key steps involved in developing an SOP What are the major components of a standard SOP How do SOPs contribute to quality improvement and employee training",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Think about these questions to evaluate your understanding of Standard Operating Procedures:</p>
        <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <li>What is a Standard Operating Procedure (SOP)?</li>
          <li>Why are SOPs important in an organization?</li>
          <li>What are the three main types of SOPs?</li>
          <li>How does an Equipment SOP differ from an Analysis SOP?</li>
          <li>What are the key steps involved in developing an SOP?</li>
          <li>What are the major components of a standard SOP?</li>
          <li>How do SOPs contribute to quality improvement and employee training?</li>
        </ol>
      </div>
    )
  }
];
