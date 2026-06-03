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

  // Filter approved SOPs list
  const approvedSops = useMemo(() => {
    return sops.filter(sop => {
      const isApproved = 
        sop.status.toUpperCase() === "APPROVED" || 
        sop.status.toUpperCase() === "ACTIVE / APPROVED" || 
        sop.status.toUpperCase() === "ACTIVE";

      const matchesSearch =
        sop.title.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = filterCategory === "All" || sop.sopSection === filterCategory;
      const matchesFamily = filterMethodFamily === "All" || sop.details?.methodFamily === filterMethodFamily;

      return isApproved && matchesSearch && matchesCategory && matchesFamily;
    });
  }, [sops, searchText, filterCategory, filterMethodFamily]);

  // Dynamic Options for Filters
  const categoriesList = useMemo(() => {
    const cats = sops.filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE").map(s => s.sopSection).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [sops]);

  const methodFamiliesList = useMemo(() => {
    const fams = sops.filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE").map(s => s.details?.methodFamily).filter(Boolean);
    return Array.from(new Set(fams)).sort();
  }, [sops]);

  // Compute metrics
  const metrics = useMemo(() => {
    const totalApproved = sops.filter(s => s.status.toUpperCase() === "APPROVED" || s.status.toUpperCase() === "ACTIVE / APPROVED" || s.status.toUpperCase() === "ACTIVE").length;
    const totalCategories = categoriesList.length;
    const totalMethodFamilies = methodFamiliesList.length;
    const totalFavorites = favorites.length;

    return { totalApproved, totalCategories, totalMethodFamilies, totalFavorites };
  }, [sops, categoriesList, methodFamiliesList, favorites]);

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
    <div style={{ display: "flex", gap: 16, width: "100%" }}>
      
      {/* ── LEFT COLUMN (75%): MAIN LIBRARY & FILTERS ── */}
      <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        
        {/* Metric Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { title: "Approved SOPs", value: metrics.totalApproved, icon: "🛡️", bg: "#ecfdf5", color: "#065f46" },
            { title: "Assay Categories", value: metrics.totalCategories, icon: "📁", bg: "#eff6ff", color: "#1d4ed8" },
            { title: "Method Families", value: metrics.totalMethodFamilies, icon: "🧪", bg: "#faf5ff", color: "#6b21a8" },
            { title: "My Bookmarks", value: metrics.totalFavorites, icon: "⭐", bg: "#fffbeb", color: "#b45309" }
          ].map((card, i) => (
            <div key={i} style={metricCardStyle}>
              <div style={{ ...iconWrapperStyle, background: card.bg, color: card.color }}>{card.icon}</div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={metricLabelStyle}>{card.title}</span>
                <span style={metricValueStyle}>{card.value}</span>
              </div>
            </div>
          ))}
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
              placeholder="Search approved library by title, code, or author..."
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
                <th style={thStyle}>Next Review</th>
                <th style={thStyle}>Category</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedSops.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
                    No approved SOPs found matching criteria.
                  </td>
                </tr>
              ) : (
                approvedSops.map((sop) => {
                  // Next review date (mocked: 1 year after effective/last updated date)
                  const effDateStr = sop.details?.signoff?.effectiveDate || sop.lastUpdated || "N/A";
                  let nextReviewStr = "N/A";
                  try {
                    if (effDateStr && effDateStr !== "N/A") {
                      const d = new Date(effDateStr);
                      d.setFullYear(d.getFullYear() + 1);
                      nextReviewStr = d.toLocaleDateString();
                    }
                  } catch (e) {}

                  return (
                    <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{sop.code}</td>
                      <td style={tdStyle}>{sop.title}</td>
                      <td style={tdStyle}>v{sop.version}</td>
                      <td style={tdStyle}>{effDateStr}</td>
                      <td style={tdStyle}>{nextReviewStr}</td>
                      <td style={tdStyle}>{sop.sopSection}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => handleOpenSopForReading(sop)}
                            style={actionBtnStyle}
                          >
                            📖 Read
                          </button>
                          <button
                            onClick={() => onPrintRequest(sop)}
                            style={{ ...actionBtnStyle, background: "#f1f5f9", color: "var(--color-text)" }}
                          >
                            🖨️ PDF
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

      {/* ── RIGHT COLUMN (25%): INFO WIDGETS & SIDEBAR ── */}
      <div style={{ flex: 0.6, display: "flex", flexDirection: "column", gap: 16, minWidth: "220px" }}>
        
        {/* Widget: Access History */}
        <div style={widgetCardStyle}>
          <h3 style={widgetHeaderStyle}>🕒 Recent History</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {recentHistory.length === 0 ? (
              <span style={emptyWidgetTextStyle}>No documents viewed recently.</span>
            ) : (
              recentHistory.map((h, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const matched = sops.find(s => s.code === h.code);
                    if (matched) handleOpenSopForReading(matched);
                  }}
                  style={historyItemStyle}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "var(--color-primary)" }}>
                    <span>{h.code}</span>
                    <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>{h.timestamp}</span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 2 }}>
                    {h.title}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget: My Bookmarks */}
        <div style={widgetCardStyle}>
          <h3 style={widgetHeaderStyle}>⭐ Bookmarked SOPs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {favoriteSopItems.length === 0 ? (
              <span style={emptyWidgetTextStyle}>No bookmarked documents yet.</span>
            ) : (
              favoriteSopItems.map((h, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenSopForReading(h)}
                  style={{ ...historyItemStyle, borderLeftColor: "#f59e0b" }}
                >
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#b45309" }}>{h.code}</span>
                  <div style={{ fontSize: "11.5px", color: "var(--color-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 2 }}>
                    {h.title}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget: Quality Announcements */}
        <div style={widgetCardStyle}>
          <h3 style={widgetHeaderStyle}>📢 Announcements</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {[
              { text: "Armauer Hansen Lab audits completed successfully. All workflows are in line with standards.", date: "Today" },
              { text: "Please use Version 1.2 of the DNA Extraction SOP; older versions have been retired.", date: "Yesterday" },
              { text: "Luminex MagPix equipment verification is scheduled for Friday. Ensure records are synced.", date: "2 days ago" }
            ].map((ann, i) => (
              <div key={i} style={{ borderBottom: i < 2 ? "1px dashed var(--color-border)" : "none", paddingBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700, color: "var(--color-text-faint)" }}>
                  <span>AUDIT & QUALITY</span>
                  <span>{ann.date}</span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--color-text)", margin: "4px 0 0 0", lineHeight: "1.35" }}>
                  {ann.text}
                </p>
              </div>
            ))}
          </div>
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
                <button
                  onClick={() => onPrintRequest(selectedSopForReading)}
                  style={{ ...btnBaseStyle, background: "var(--color-primary)", color: "#ffffff" }}
                >
                  🖨️ Print Document
                </button>
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
                      ["Assay Category", selectedSopForReading.sopSection],
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

                {/* Detailed Content loops */}
                {[
                  {
                    label: "Purpose, Scope & Background", data: selectedSopForReading.details?.purposeScope, fields: [
                      { k: "Purpose", v: "purpose", multiline: true },
                      { k: "Scope - what this SOP covers", v: "scopeCovers", multiline: true },
                      { k: "Scope - exclusions", v: "scopeExcluded", multiline: true },
                      { k: "Background / Introduction", v: "background", multiline: true },
                    ]
                  },
                  {
                    label: "Definitions & Abbreviations", data: selectedSopForReading.details?.definitions, fields: [
                      { k: "Definitions / Terminology", v: "definitions", multiline: true },
                      { k: "Abbreviations", v: "abbreviations", multiline: true },
                    ]
                  },
                  {
                    label: "Responsibility & Accountability", data: selectedSopForReading.details?.responsibility, fields: [
                      { k: "Roles involved", v: "roles", list: true },
                      { k: "Responsibility & accountability narrative", v: "responsibilityNarrative", multiline: true },
                    ]
                  },
                  { label: "Principle of the Method", text: selectedSopForReading.details?.principle },
                  {
                    label: "Samples / Specimens Covered", data: selectedSopForReading.details?.samples, fields: [
                      { k: "Sample matrices", v: "matrices", list: true },
                      { k: "Input material types", v: "inputMaterials", list: true },
                      { k: "Volume / amount required", v: "volumeRequired" },
                      { k: "Sample acceptance criteria", v: "acceptance", multiline: true },
                      { k: "Sample rejection criteria", v: "rejection", multiline: true },
                    ]
                  },
                  {
                    label: "Reagents & Supplies", data: selectedSopForReading.details?.reagents, fields: [
                      { k: "Full narrative", v: "narrative", multiline: true },
                      { k: "List", v: "list", multiline: true },
                    ]
                  },
                  {
                    label: "Equipment & Instruments", data: selectedSopForReading.details?.equipment, fields: [
                      { k: "Primary equipment used", v: "primary", list: true },
                      { k: "Equipment list", v: "list", multiline: true },
                    ]
                  },
                  {
                    label: "Environmental & Safety Controls", data: selectedSopForReading.details?.safety, fields: [
                      { k: "PPE required", v: "ppe", list: true },
                      { k: "Biosafety level", v: "level" },
                      { k: "Hazards", v: "hazards", list: true },
                      { k: "Waste handling", v: "waste", multiline: true },
                      { k: "Additional safety controls", v: "additional", multiline: true },
                    ]
                  },
                  {
                    label: "Quality Control", data: selectedSopForReading.details?.qualityControl, fields: [
                      { k: "Controls included", v: "controls", list: true },
                      { k: "DNA/RNA QC methods", v: "methods", list: true },
                      { k: "Acceptance criteria", v: "acceptance", multiline: true },
                      { k: "QC narrative", v: "narrative", multiline: true },
                    ]
                  },
                  {
                    label: "Stepwise Procedure", data: selectedSopForReading.details?.procedure, fields: [
                      { k: "Procedure narrative", v: "narrative", multiline: true },
                      { k: "Stepwise procedure list", v: "steps", multiline: true },
                    ]
                  },
                  {
                    label: "Calculation / Data Analysis", data: selectedSopForReading.details?.calculation, fields: [
                      { k: "Calculations / formulas", v: "formulas", multiline: true },
                      { k: "Software tools", v: "software", multiline: true },
                      { k: "Interpretation rules", v: "thresholds", multiline: true },
                    ]
                  },
                  {
                    label: "Result Reporting & Interpretation", data: selectedSopForReading.details?.resultReporting, fields: [
                      { k: "Reporting format", v: "format", multiline: true },
                      { k: "Cut-offs", v: "thresholds", multiline: true },
                      { k: "LIMS field mapping", v: "lims", multiline: true },
                      { k: "Narrative", v: "narrative", multiline: true },
                    ]
                  },
                  {
                    label: "Storage & Transport Requirements", data: selectedSopForReading.details?.storage, fields: [
                      { k: "Sample types", v: "types", list: true },
                      { k: "Recommended temp", v: "temp" },
                      { k: "Max duration", v: "duration" },
                      { k: "Transport modes", v: "transport", list: true },
                      { k: "Narrative", v: "narrative", multiline: true },
                    ]
                  },
                  { label: "References & Attachments", text: selectedSopForReading.details?.references }
                ].map((sec, sidx) => (
                  <div key={sidx} style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 16 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#031755", fontFamily: "Times New Roman", textTransform: "uppercase" }}>
                      {sec.label}
                    </h3>

                    {sec.text && (
                      <div
                        style={{ fontFamily: "Times New Roman", fontSize: "12px", color: "#000000", textAlign: "justify", lineHeight: "1.5" }}
                        dangerouslySetInnerHTML={{ __html: formatRichTextLocal(sec.text) }}
                      />
                    )}

                    {sec.data && sec.fields && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                        {sec.fields.map((f, fidx) => {
                          const val = sec.data[f.v];
                          if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;

                          return (
                            <div key={fidx} style={{ fontSize: "12px" }}>
                              <h4 style={{ margin: "0 0 2px 0", fontWeight: "bold", fontSize: "12px", color: "#333" }}>{f.k}:</h4>
                              {f.list && Array.isArray(val) ? (
                                <ul style={{ margin: "2px 0 4px 20px", padding: 0, listStyleType: "square" }}>
                                  {val.map((item: string, idx: number) => (
                                    <li key={idx} style={{ padding: "2px 0", fontFamily: "Times New Roman", fontSize: "12px", color: "#000000", textAlign: "justify" }}>{item}</li>
                                  ))}
                                </ul>
                              ) : f.multiline ? (
                                <div
                                  style={{ padding: "0px", margin: "2px 0 4px 0", color: "#000000", fontFamily: "Times New Roman", fontSize: "12px", textAlign: "justify", lineHeight: "1.5" }}
                                  dangerouslySetInnerHTML={{ __html: formatRichTextLocal(val) }}
                                />
                              ) : (
                                <div style={{ padding: "2px 0", color: "#000000", fontFamily: "Times New Roman", fontSize: "12px", textAlign: "justify" }}>{val}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
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
