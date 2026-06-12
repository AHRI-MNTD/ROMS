import React, { useState, useMemo } from "react";
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

interface QMSReviewerViewProps {
  sops: SOPItem[];
  onSopUpdate: (updatedSops: SOPItem[]) => void;
}

export default function QMSReviewerView({ sops, onSopUpdate }: QMSReviewerViewProps) {
  // Local state
  const [searchText, setSearchText] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [selectedSopForReview, setSelectedSopForReview] = useState<SOPItem | null>(null);

  // Reviewer specific inputs
  const [commentSection, setCommentSection] = useState<string>("General Comments");
  const [commentText, setCommentText] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);

  // Compute reviewer metrics
  const metrics = useMemo(() => {
    const pending = sops.filter(s => s.status.toUpperCase() === "UNDER REVIEW" || s.status.toUpperCase() === "REVIEW" || s.status.toUpperCase() === "SUBMITTED").length;
    const returned = sops.filter(s => s.status.toUpperCase() === "RETURNED").length;
    const approvedToday = sops.filter(s => {
      if (s.status.toUpperCase() !== "APPROVED" && s.status.toUpperCase() !== "ACTIVE / APPROVED") return false;
      const appDate = s.details?.signoff?.approvedDate;
      if (!appDate) return false;
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      return appDate.includes(todayStr) || appDate.includes(new Date().toLocaleDateString());
    }).length;

    // Checked is total approved + returned + awaiting author response
    const reviewed = sops.filter(s =>
      s.status.toUpperCase() === "APPROVED" ||
      s.status.toUpperCase() === "ACTIVE / APPROVED" ||
      s.status.toUpperCase() === "RETURNED" ||
      s.status.toUpperCase() === "AWAITING AUTHOR RESPONSE"
    ).length;

    return { pending, returned, approvedToday, reviewed };
  }, [sops]);

  // Review Queue list (Submitted or Under Review items)
  const reviewQueue = useMemo(() => {
    return sops.filter(sop => {
      const isReviewable =
        sop.status.toUpperCase() === "UNDER REVIEW" ||
        sop.status.toUpperCase() === "REVIEW" ||
        sop.status.toUpperCase() === "SUBMITTED" ||
        sop.status.toUpperCase() === "AWAITING AUTHOR RESPONSE" ||
        sop.status.toUpperCase() === "RETURNED"; // Reviewer can view returned ones too

      const matchesSearch =
        sop.title.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.code.toLowerCase().includes(searchText.toLowerCase()) ||
        sop.author.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = filterCategory === "All" || sop.sopSection === filterCategory;

      return isReviewable && matchesSearch && matchesCategory;
    });
  }, [sops, searchText, filterCategory]);

  // Categories list for filter
  const categoryOptions = useMemo(() => {
    const cats = sops.map(s => s.sopSection).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [sops]);

  // Find previous version of the selected SOP for diff view
  const previousVersionSop = useMemo(() => {
    if (!selectedSopForReview) return null;
    // Find an SOP with same code but lower version number
    return sops.find(s =>
      s.code === selectedSopForReview.code &&
      parseFloat(s.version) < parseFloat(selectedSopForReview.version)
    ) || null;
  }, [selectedSopForReview, sops]);

  // Helper to format text
  const formatRichTextLocal = (text: string) => {
    if (!text) return "N/A";
    if (!/<[a-z][\s\S]*>/i.test(text)) {
      return text.replace(/\n/g, "<br/>");
    }
    return text;
  };

  // Add Comment Action
  const handleAddComment = () => {
    if (!selectedSopForReview || !commentText.trim()) return;

    const newComment = {
      id: "comment_" + Date.now(),
      section: commentSection,
      author: "Quality Reviewer",
      text: commentText,
      timestamp: new Date().toLocaleString()
    };

    const updatedSop = { ...selectedSopForReview };
    if (!updatedSop.details) updatedSop.details = {};
    if (!updatedSop.details.comments) updatedSop.details.comments = [];
    updatedSop.details.comments = [newComment, ...updatedSop.details.comments];

    // Update in list
    const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
    localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
    onSopUpdate(updatedList);
    setSelectedSopForReview(updatedSop);
    setCommentText("");
  };

  // Approve SOP Action
  const handleApproveSop = () => {
    if (!selectedSopForReview) return;

    if (window.confirm(`Are you sure you want to APPROVE SOP: ${selectedSopForReview.code}?`)) {
      const todayStr = new Date().toLocaleDateString();
      const updatedSop = { ...selectedSopForReview };

      updatedSop.status = "Approved";
      if (!updatedSop.details) updatedSop.details = {};
      if (!updatedSop.details.signoff) updatedSop.details.signoff = {};

      updatedSop.details.signoff = {
        ...updatedSop.details.signoff,
        reviewedByName: "Quality Officer",
        reviewedByRole: "Technical Reviewer",
        reviewedDate: todayStr,
        approvedByName: "Lab Director",
        approvedByRole: "Approving Authority",
        approvedDate: todayStr,
        effectiveDate: todayStr
      };

      // Add to audit trail
      if (!updatedSop.details.history) updatedSop.details.history = [];
      updatedSop.details.history.push({
        action: "Approved",
        user: "Quality Reviewer",
        timestamp: new Date().toLocaleString(),
        details: "Document approved and signed off for operations."
      });

      const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
      localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
      onSopUpdate(updatedList);
      setSelectedSopForReview(null);
      alert(`SOP ${updatedSop.code} has been successfully APPROVED.`);
    }
  };

  // Clarification request
  const handleRequestClarification = () => {
    if (!selectedSopForReview) return;

    if (window.confirm("Change status to 'Awaiting Author Response'?")) {
      const updatedSop = { ...selectedSopForReview };
      updatedSop.status = "Awaiting Author Response";

      if (!updatedSop.details) updatedSop.details = {};
      if (!updatedSop.details.history) updatedSop.details.history = [];
      updatedSop.details.history.push({
        action: "Clarification Requested",
        user: "Quality Reviewer",
        timestamp: new Date().toLocaleString(),
        details: "Awaiting response from the author on comments."
      });

      const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
      localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
      onSopUpdate(updatedList);
      setSelectedSopForReview(updatedSop);
      alert("Status updated to 'Awaiting Author Response'.");
    }
  };

  // Return for Revision Action
  const handleReturnSop = () => {
    if (!selectedSopForReview || !returnReason.trim()) return;

    const updatedSop = { ...selectedSopForReview };
    updatedSop.status = "Returned";

    if (!updatedSop.details) updatedSop.details = {};
    if (!updatedSop.details.history) updatedSop.details.history = [];

    updatedSop.details.history.push({
      action: "Returned for Revision",
      user: "Quality Reviewer",
      timestamp: new Date().toLocaleString(),
      details: returnReason
    });

    // Also add return reason as a general comment
    const returnComment = {
      id: "comment_" + Date.now(),
      section: "General Comments",
      author: "Quality Reviewer (Return Reason)",
      text: returnReason,
      timestamp: new Date().toLocaleString()
    };
    if (!updatedSop.details.comments) updatedSop.details.comments = [];
    updatedSop.details.comments = [returnComment, ...updatedSop.details.comments];

    const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
    localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
    onSopUpdate(updatedList);
    setSelectedSopForReview(null);
    setShowReturnModal(false);
    setReturnReason("");
    alert(`SOP ${updatedSop.code} returned for revision.`);
  };

  // Section List for Comments
  const docSections = [
    "General Comments",
    "Revision & Amendment History",
    "Purpose, Scope & Background",
    "Definitions & Abbreviations",
    "Responsibility & Accountability",
    "Principle of the Method",
    "Samples / Specimens Covered",
    "Reagents & Supplies",
    "Equipment & Instruments",
    "Environmental & Safety Controls",
    "Quality Control",
    "Stepwise Procedure",
    "Calculation / Data Analysis",
    "Result Reporting & Interpretation",
    "Storage & Transport Requirements",
    "References & Attachments",
    "Document Control & Sign-off"
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── METRICS SUMMARY BAR ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { title: "Pending Review", value: metrics.pending, icon: "⏳", bg: "#eff6ff", color: "#1d4ed8" },
          { title: "Returned for Revision", value: metrics.returned, icon: "↩️", bg: "#fef2f2", color: "#991b1b" },
          { title: "Approved Today", value: metrics.approvedToday, icon: "✅", bg: "#f0fdf4", color: "#15803d" },
          { title: "Total Reviewed", value: metrics.reviewed, icon: "📊", bg: "#faf5ff", color: "#6b21a8" }
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

      {/* ── SEARCH & FILTER PANEL ── */}
      <div style={filterPanelStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Categories</option>
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--color-text-faint)" }}>🔍</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search review queue by SOP code, title, or author..."
            style={inputStyle}
          />
        </div>
      </div>

      {/* ── REVIEW QUEUE TABLE ── */}
      <div style={tableContainerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
              <th style={thStyle}>SOP Code</th>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Author</th>
              <th style={thStyle}>Version</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {reviewQueue.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
                  No SOPs currently in the review queue.
                </td>
              </tr>
            ) : (
              reviewQueue.map((sop) => {
                // Mock priority level
                let priority = "Medium";
                let priorityColor = "#d97706";
                if (sop.sopSection.includes("NGS") || sop.sopSection.includes("dPCR")) {
                  priority = "High";
                  priorityColor = "#dc2626";
                } else if (sop.sopSection.includes("STANDARD") || sop.sopSection.includes("Equipment")) {
                  priority = "Low";
                  priorityColor = "#4b5563";
                }

                let badgeStyle = { background: "#e0e0e0", color: "#424242" };
                const statusUpper = sop.status.toUpperCase();
                if (statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW" || statusUpper === "SUBMITTED") {
                  badgeStyle = { background: "#e3f2fd", color: "#1565c0" };
                } else if (statusUpper === "AWAITING AUTHOR RESPONSE") {
                  badgeStyle = { background: "#fff3e0", color: "#e65100" };
                } else if (statusUpper === "RETURNED") {
                  badgeStyle = { background: "#ffebee", color: "#c62828" };
                } else if (statusUpper === "APPROVED") {
                  badgeStyle = { background: "#e8f5e9", color: "#2e7d32" };
                }

                return (
                  <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{sop.code}</td>
                    <td style={tdStyle}>{sop.title}</td>
                    <td style={tdStyle}>{sop.author}</td>
                    <td style={tdStyle}>v{sop.version}</td>
                    <td style={tdStyle}>{sop.sopSection}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "10.5px", fontWeight: 700, color: priorityColor, border: `1px solid ${priorityColor}`, padding: "2px 6px", borderRadius: 4, background: "transparent" }}>
                        {priority}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 6px", borderRadius: 4, ...badgeStyle }}>
                        {sop.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <button
                        onClick={() => setSelectedSopForReview(sop)}
                        style={reviewBtnStyle}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── READ-ONLY DOCUMENT REVIEW MODAL ── */}
      {selectedSopForReview && (
        <div style={modalOverlayStyle}>
          <div style={modalContainerStyle}>

            {/* Modal Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-primary)", background: "var(--color-primary-soft)", padding: "2px 6px", borderRadius: 4 }}>
                    REVIEW WORKSPACE
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>
                    v{selectedSopForReview.version} • {selectedSopForReview.code}
                  </span>
                </div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "4px 0 0 0", color: "var(--color-text)" }}>
                  {selectedSopForReview.title}
                </h2>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {previousVersionSop && (
                  <button
                    onClick={() => setShowDiffView(!showDiffView)}
                    style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: showDiffView ? "var(--color-primary-soft)" : "transparent" }}
                  >
                    {showDiffView ? "📄 Exit Compare" : "📑 Compare Revisions"}
                  </button>
                )}
                <button
                  onClick={handleRequestClarification}
                  style={{ ...btnBaseStyle, border: "1px solid #f59e0b", color: "#b45309", background: "transparent" }}
                >
                  ❓ Ask Clarification
                </button>
                <button
                  onClick={() => setShowReturnModal(true)}
                  style={{ ...btnBaseStyle, background: "#ef4444", color: "#ffffff" }}
                >
                  ↩️ Return for Revision
                </button>
                <button
                  onClick={handleApproveSop}
                  style={{ ...btnBaseStyle, background: "#10b981", color: "#ffffff" }}
                >
                  ✅ Approve SOP
                </button>
                <button
                  onClick={() => {
                    setSelectedSopForReview(null);
                    setShowDiffView(false);
                  }}
                  style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Body: Split view (Document vs Comments) */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* Document Pane (Read Only) */}
              <div style={docPaneStyle}>

                {showDiffView && previousVersionSop ? (
                  /* DIFF VIEW COMPONENT */
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ padding: "8px 12px", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 4, fontSize: "12px", color: "#b45309", fontWeight: 550 }}>
                      ⚠️ Comparing current revision (v{selectedSopForReview.version}) with previous revision (v{previousVersionSop.version}). Changed sections are marked below.
                    </div>

                    {[
                      { title: "Revision History", key: "revision", f: ["revisionNumber", "revisionDate", "revisionSummary", "revisionRationale"] },
                      { title: "Purpose & Scope", key: "purposeScope", f: ["purpose", "scopeCovers", "scopeExcluded", "background"] },
                      { title: "Definitions", key: "definitions", f: ["definitions", "abbreviations"] },
                      { title: "Responsibility", key: "responsibility", f: ["roles", "responsibilityNarrative"] },
                      { title: "Principle", key: "principle", textOnly: true },
                      { title: "Samples", key: "samples", f: ["matrices", "inputMaterials", "volumeRequired", "acceptance", "rejection"] },
                      { title: "Reagents", key: "reagents", f: ["narrative", "list"] },
                      { title: "Equipment", key: "equipment", f: ["primary", "list"] },
                      { title: "Safety", key: "safety", f: ["ppe", "level", "hazards", "waste", "additional"] },
                      { title: "Quality Control", key: "qualityControl", f: ["controls", "methods", "acceptance", "narrative"] },
                      { title: "Procedure", key: "procedure", f: ["narrative", "steps"] },
                      { title: "Calculations", key: "calculation", f: ["formulas", "software", "thresholds"] },
                      { title: "Reporting", key: "resultReporting", f: ["format", "thresholds", "lims", "narrative"] },
                      { title: "Storage", key: "storage", f: ["types", "temp", "duration", "transport", "narrative"] },
                      { title: "References", key: "references", textOnly: true }
                    ].map((section, idx) => {
                      const curVal = section.textOnly
                        ? selectedSopForReview.details?.[section.key]
                        : selectedSopForReview.details?.[section.key];
                      const prevVal = section.textOnly
                        ? previousVersionSop.details?.[section.key]
                        : previousVersionSop.details?.[section.key];

                      let curString = "";
                      let prevString = "";

                      if (section.textOnly) {
                        curString = curVal || "";
                        prevString = prevVal || "";
                      } else if (section.f) {
                        section.f.forEach(field => {
                          const c = curVal?.[field];
                          const p = prevVal?.[field];
                          if (c) curString += `\n[${field}]: ` + (Array.isArray(c) ? c.join(", ") : c);
                          if (p) prevString += `\n[${field}]: ` + (Array.isArray(p) ? p.join(", ") : p);
                        });
                      }

                      const hasChanges = curString.trim() !== prevString.trim();

                      return (
                        <div key={idx} style={{ border: hasChanges ? "1.5px solid #3b82f6" : "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ background: hasChanges ? "#eff6ff" : "var(--color-surface)", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: hasChanges ? "#1d4ed8" : "var(--color-text)" }}>{section.title}</h4>
                            {hasChanges && <span style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 6px", borderRadius: 4 }}>CHANGED</span>}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
                            {/* Previous Side */}
                            <div style={{ background: "#fafafa", padding: 8, borderRadius: 4, fontSize: "12px" }}>
                              <span style={{ display: "block", fontSize: "10px", color: "var(--color-text-faint)", fontWeight: 700, marginBottom: 4 }}>PREVIOUS VERSION (v{previousVersionSop.version})</span>
                              <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(prevString) || "Empty" }} />
                            </div>
                            {/* Current Side */}
                            <div style={{ background: hasChanges ? "#f0fdf4" : "#ffffff", padding: 8, borderRadius: 4, fontSize: "12px" }}>
                              <span style={{ display: "block", fontSize: "10px", color: "var(--color-text-faint)", fontWeight: 700, marginBottom: 4 }}>CURRENT VERSION (v{selectedSopForReview.version})</span>
                              <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(curString) || "Empty" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* STANDARD READ-ONLY SOP VIEWER */
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Header Logo AHRI on page 1 of print / standard display */}
                    <div style={{ display: "flex", justifyContent: "center", borderBottom: "2px solid var(--color-border)", paddingBottom: 10 }}>
                      <img src={logoAhri} style={{ height: "60px" }} alt="AHRI Logo" />
                    </div>

                    {/* SOP Title Details */}
                    <div style={{ textAlign: "center" }}>
                      <h1 style={{ fontSize: "18pt", fontWeight: "800", color: "#071338", fontFamily: "Times New Roman" }}>
                        {selectedSopForReview.title}
                      </h1>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 6 }}>
                        SOP Code: <strong>{selectedSopForReview.code}</strong> | Version: <strong>v{selectedSopForReview.version}</strong> | Section: <strong>{selectedSopForReview.sopSection}</strong>
                      </div>
                    </div>

                    {/* Metadata Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontFamily: "Times New Roman", fontSize: "12px" }}>
                      <tbody>
                        {[
                          ["SOP Title", selectedSopForReview.title],
                          ["Document No", selectedSopForReview.code],
                          ["Version No", selectedSopForReview.version],
                          ["Assay Category", selectedSopForReview.sopSection],
                          ["Prepared By", `${selectedSopForReview.details?.signoff?.preparedByName || selectedSopForReview.author} on ${selectedSopForReview.details?.signoff?.preparedDate || selectedSopForReview.lastUpdated}`],
                          ["Reviewed By", `${selectedSopForReview.details?.signoff?.reviewedByName || "Awaiting Review"}`],
                          ["Approved By", `${selectedSopForReview.details?.signoff?.approvedByName || "Awaiting Approval"}`]
                        ].map(([k, v]) => (
                          <tr key={k} style={{ borderBottom: "1.5px solid #000000" }}>
                            <td style={{ width: "30%", padding: "6px 12px", borderRight: "1.5px solid #000000", fontWeight: "bold", background: "#f9f9f9" }}>{k}:</td>
                            <td style={{ padding: "6px 12px" }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Audit History Block */}
                    {selectedSopForReview.details?.history && selectedSopForReview.details.history.length > 0 && (
                      <div style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "var(--color-surface)", padding: "8px 12px", fontSize: "12px", fontWeight: 700 }}>
                          Audit Trail & Revision History
                        </div>
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          {selectedSopForReview.details.history.map((h: any, hidx: number) => (
                            <div key={hidx} style={{ fontSize: "11.5px", borderBottom: "1px solid #f0f0f0", paddingBottom: 4 }}>
                              <strong>{h.timestamp}</strong> - <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{h.action}</span> by <em>{h.user}</em>
                              <div style={{ color: "var(--color-text-muted)", fontSize: "11px", marginTop: 2 }}>{h.details}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Content loops */}
                    {[
                      {
                        label: "Revision & Amendment History", data: selectedSopForReview.details?.revision, fields: [
                          { k: "Revision Number", v: "revisionNumber" },
                          { k: "Revision Date", v: "revisionDate" },
                          { k: "Summary of changes", v: "revisionSummary", multiline: true },
                          { k: "Rationale for change", v: "revisionRationale", multiline: true },
                        ]
                      },
                      {
                        label: "Purpose, Scope & Background", data: selectedSopForReview.details?.purposeScope, fields: [
                          { k: "Purpose", v: "purpose", multiline: true },
                          { k: "Scope - what this SOP covers", v: "scopeCovers", multiline: true },
                          { k: "Scope - exclusions", v: "scopeExcluded", multiline: true },
                          { k: "Background / Introduction", v: "background", multiline: true },
                        ]
                      },
                      {
                        label: "Definitions & Abbreviations", data: selectedSopForReview.details?.definitions, fields: [
                          { k: "Definitions / Terminology", v: "definitions", multiline: true },
                          { k: "Abbreviations", v: "abbreviations", multiline: true },
                        ]
                      },
                      {
                        label: "Responsibility & Accountability", data: selectedSopForReview.details?.responsibility, fields: [
                          { k: "Roles involved", v: "roles", list: true },
                          { k: "Responsibility & accountability narrative", v: "responsibilityNarrative", multiline: true },
                        ]
                      },
                      { label: "Principle of the Method", text: selectedSopForReview.details?.principle },
                      {
                        label: "Samples / Specimens Covered", data: selectedSopForReview.details?.samples, fields: [
                          { k: "Sample matrices", v: "matrices", list: true },
                          { k: "Input material types", v: "inputMaterials", list: true },
                          { k: "Volume / amount required", v: "volumeRequired" },
                          { k: "Sample acceptance criteria", v: "acceptance", multiline: true },
                          { k: "Sample rejection criteria", v: "rejection", multiline: true },
                        ]
                      },
                      {
                        label: "Reagents & Supplies", data: selectedSopForReview.details?.reagents, fields: [
                          { k: "Full narrative", v: "narrative", multiline: true },
                          { k: "List", v: "list", multiline: true },
                        ]
                      },
                      {
                        label: "Equipment & Instruments", data: selectedSopForReview.details?.equipment, fields: [
                          { k: "Primary equipment used", v: "primary", list: true },
                          { k: "Equipment list", v: "list", multiline: true },
                        ]
                      },
                      {
                        label: "Environmental & Safety Controls", data: selectedSopForReview.details?.safety, fields: [
                          { k: "PPE required", v: "ppe", list: true },
                          { k: "Biosafety level", v: "level" },
                          { k: "Hazards", v: "hazards", list: true },
                          { k: "Waste handling", v: "waste", multiline: true },
                          { k: "Additional safety controls", v: "additional", multiline: true },
                        ]
                      },
                      {
                        label: "Quality Control", data: selectedSopForReview.details?.qualityControl, fields: [
                          { k: "Controls included", v: "controls", list: true },
                          { k: "DNA/RNA QC methods", v: "methods", list: true },
                          { k: "Acceptance criteria", v: "acceptance", multiline: true },
                          { k: "QC narrative", v: "narrative", multiline: true },
                        ]
                      },
                      {
                        label: "Stepwise Procedure", data: selectedSopForReview.details?.procedure, fields: [
                          { k: "Procedure narrative", v: "narrative", multiline: true },
                          { k: "Stepwise procedure list", v: "steps", multiline: true },
                        ]
                      },
                      {
                        label: "Calculation / Data Analysis", data: selectedSopForReview.details?.calculation, fields: [
                          { k: "Calculations / formulas", v: "formulas", multiline: true },
                          { k: "Software tools", v: "software", multiline: true },
                          { k: "Interpretation rules", v: "thresholds", multiline: true },
                        ]
                      },
                      {
                        label: "Result Reporting & Interpretation", data: selectedSopForReview.details?.resultReporting, fields: [
                          { k: "Reporting format", v: "format", multiline: true },
                          { k: "Cut-offs", v: "thresholds", multiline: true },
                          { k: "LIMS field mapping", v: "lims", multiline: true },
                          { k: "Narrative", v: "narrative", multiline: true },
                        ]
                      },
                      {
                        label: "Storage & Transport Requirements", data: selectedSopForReview.details?.storage, fields: [
                          { k: "Sample types", v: "types", list: true },
                          { k: "Recommended temp", v: "temp" },
                          { k: "Max duration", v: "duration" },
                          { k: "Transport modes", v: "transport", list: true },
                          { k: "Narrative", v: "narrative", multiline: true },
                        ]
                      },
                      { label: "References & Attachments", text: selectedSopForReview.details?.references }
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
                )}

              </div>

              {/* Comments & Clarification Side Panel */}
              <div style={commentsPaneStyle}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 12px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>💬 Review Feedback & Comments</span>
                  <span style={{ fontSize: "10.5px", background: "var(--color-primary-soft)", color: "var(--color-primary)", padding: "1px 6px", borderRadius: 8 }}>
                    {selectedSopForReview.details?.comments?.length || 0}
                  </span>
                </h3>

                {/* Add Comment Section */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: 10, background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>LINK TO SECTION:</label>
                    <select
                      value={commentSection}
                      onChange={(e) => setCommentSection(e.target.value)}
                      style={{ ...selectStyle, width: "100%", padding: "6px" }}
                    >
                      {docSections.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)" }}>COMMENT DETAILS:</label>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write details of correction, issue, or clarification requested here..."
                      style={textareaStyle}
                    />
                  </div>

                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    style={{ ...btnBaseStyle, width: "100%", background: "var(--color-primary)", color: "#ffffff", padding: "8px" }}
                  >
                    Post Comment
                  </button>
                </div>

                {/* List of Comments */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {!selectedSopForReview.details?.comments || selectedSopForReview.details.comments.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--color-text-faint)", fontSize: "11px", padding: 20 }}>
                      No comments have been posted for this revision yet.
                    </div>
                  ) : (
                    selectedSopForReview.details.comments.map((c: any, cidx: number) => (
                      <div key={c.id || cidx} style={commentItemStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700 }}>
                          <span style={{ color: "var(--color-primary)" }}>{c.author}</span>
                          <span style={{ color: "var(--color-text-faint)" }}>{c.timestamp}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#d97706", fontWeight: 700, marginTop: 2 }}>
                          📁 {c.section}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--color-text)", marginTop: 4, lineHeight: "1.4", whiteSpace: "pre-line" }}>
                          {c.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── RETURN REASON MODAL ── */}
      {showReturnModal && (
        <div style={smallModalOverlayStyle}>
          <div style={smallModalContainerStyle}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
              Justification for Returning SOP
            </h3>
            <p style={{ fontSize: "11.5px", color: "var(--color-text-muted)", margin: "0 0 12px 0" }}>
              Please provide the author with a clear justification or summary of the corrections required to approve this document.
            </p>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="E.g., Missing biosafety level definitions in Section J, and step 4 of PCR workflow requires clarification on reagents volumes."
              style={{ ...textareaStyle, height: "120px", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReturnSop}
                disabled={!returnReason.trim()}
                style={{ ...btnBaseStyle, background: "#ef4444", color: "#ffffff" }}
              >
                Return to Author
              </button>
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

const reviewBtnStyle: React.CSSProperties = {
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
  maxWidth: "1150px",
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
  flex: 1.3,
  padding: "24px",
  overflowY: "auto",
  borderRight: "1px solid var(--color-border)",
  background: "#ffffff"
};

const commentsPaneStyle: React.CSSProperties = {
  flex: 0.7,
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--color-surface)"
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  height: "70px",
  padding: "6px 10px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--fs-sm)",
  background: "var(--color-surface-2)",
  color: "var(--color-text)",
  outline: "none",
  resize: "none"
};

const commentItemStyle: React.CSSProperties = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  padding: "10px",
  boxShadow: "var(--shadow-sm)"
};

const smallModalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1100
};

const smallModalContainerStyle: React.CSSProperties = {
  width: "420px",
  background: "var(--color-surface-2)",
  borderRadius: "var(--radius-lg)",
  padding: "20px",
  boxShadow: "var(--shadow-lg)",
  border: "1px solid var(--color-border)"
};
