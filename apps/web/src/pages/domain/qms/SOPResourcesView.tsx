import React, { useState } from "react";

export default function SOPResourcesView() {
  const [activeSection, setActiveSection] = useState<string>("sec-master");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ background: "#ffffff", color: "var(--color-text)", minHeight: "100%", padding: "20px 24px 60px", fontFamily: "var(--font-body)", width: "100%" }}>

      {/* ── TOP HEADER (CENTERED, NO ICON) ── */}
      <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 24, marginBottom: 28, width: "100%" }}>
        <h1 style={{ textAlign: "center", fontSize: "22px", fontWeight: 800, color: "var(--color-primary)", margin: "0 0 16px 0", fontFamily: "var(--font-display)" }}>
          QMS Resource Library & Writing Guidelines
        </h1>

        {/* Summarized Overview Section with Main Topics (~4 lines) & Sub-topics (~3 lines) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text)" }}>

          {/* Main Topic 1 Summary (~4 lines) */}
          <p style={{ margin: 0 }}>
            {" "}
            <a href="#topic-1" onClick={(e) => { e.preventDefault(); scrollTo("topic-1"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
              1. Authoring Guidelines & Master SOP
            </a>
            , which governs how standard operating procedures, forms, and annexes are uniformly initiated, drafted, verified, and authorized across laboratory units. This master framework enforces standardized coding conventions (QM, P, E, A series) to ensure operational clarity, version control integrity, and mandatory annual review cycles.
          </p>

          {/* Subtopic Summaries (~3 lines each) */}
          <div style={{ paddingLeft: 12, display: "flex", flexDirection: "column", gap: 10, borderLeft: "2px solid var(--color-primary-soft)" }}>
            <p style={{ margin: 0 }}>
              •{" "}
              <a href="#sec-master" onClick={(e) => { e.preventDefault(); scrollTo("sec-master"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
                Master SOP (Development & Control)
              </a>
              : Outlines the step-by-step authoring workflow from initial request to QO code assignment, multi-peer content verification, LM authorization, and electronic signature archiving.
            </p>

            <p style={{ margin: 0 }}>
              •{" "}
              <a href="#annex-1" onClick={(e) => { e.preventDefault(); scrollTo("annex-1"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
                Annex 1 (Procedure SOP Framework)
              </a>
              : Defines the standard layout for procedural protocols, including objectives, scope, tasks/responsibilities grid, imperative step-by-step sequence, and related biosafety documents.
            </p>

            <p style={{ margin: 0 }}>
              •{" "}
              <a href="#annex-2" onClick={(e) => { e.preventDefault(); scrollTo("annex-2"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
                Annex 2 (Equipment SOP Framework)
              </a>
              : Establishes operational protocols for laboratory instruments, covering equipment description, safety controls, calibration schedules, routine maintenance, and problem-solving logs.
            </p>

            <p style={{ margin: 0 }}>
              •{" "}
              <a href="#annex-3" onClick={(e) => { e.preventDefault(); scrollTo("annex-3"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
                Annex 3 (Analysis SOP Framework)
              </a>
              : Specifies analytical method principles, specimen acceptance/rejection criteria, reagent storage conditions, quality control limits, LIMS entry, and result reporting guidelines.
            </p>
          </div>

          {/* Main Topic 2 Summary (~4 lines) */}
          <p style={{ margin: 0 }}>
            {" "}
            <a href="#topic-2" onClick={(e) => { e.preventDefault(); scrollTo("topic-2"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
              2. SOP Standard Documents
            </a>
            . These pre-formatted Word (.docx) templates and Excel (.xlsx) amendment tracking logs incorporate required metadata headers, revision logs, and signature tables for rapid authoring compliance.
          </p>

          {/* Main Topic 3 Summary (~4 lines) */}
          <p style={{ margin: 0 }}>
            {" "}
            <a href="#topic-3" onClick={(e) => { e.preventDefault(); scrollTo("topic-3"); }} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "" }}>
              3. International Reference Standards & WHO Guidelines
            </a>
            , embedding regulatory links to WHO Quality Management toolkits, ISO 15189:2022 laboratory accreditation requirements, CLSI QMS model guidelines, and CDC/NIH Biosafety standards.
          </p>

        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER (FULL WIDTH SPANS ALL SPACE) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 36, width: "100%" }}>

        {/* ========================================================================= */}
        {/* MAIN TOPIC 1: AUTHORING & QUALITY MANAGEMENT GUIDELINES */}
        {/* ========================================================================= */}
        <section id="topic-1" style={{ display: "flex", flexDirection: "column", gap: 20, borderBottom: "1px solid var(--color-divider)", paddingBottom: 32, width: "100%" }}>
          <div style={{ borderLeft: "4px solid var(--color-primary)", paddingLeft: 14 }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              Authoring & Quality Management Guidelines
            </h2>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Master Standard Operating Procedure (P1) and Authoring Frameworks</span>
          </div>

          {/* 1. Master SOP Content */}
          <div id="sec-master" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4, width: "100%" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", margin: 0, borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
              1. Master SOP
            </h3>

            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", margin: "8px 0 4px 0" }}>
              2. Objectives & Scope
            </h4>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              This SOP describes the development of SOPs, forms and annexes.
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              This SOP is applicable to all employees of the laboratory. Uniformly developing, changing and controlling SOPs, forms and annexes will lead to clarity and recognition.
            </p>

            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", margin: "12px 0 4px 0" }}>
              3. Abbreviations and definitions
            </h4>
            <p style={{ fontSize: "13px", margin: "0 0 8px 0" }}>
              For general abbreviations, definitions and terms refer to quality manual chapter 1 “General”.
            </p>

            {/* CENTERED TABLE */}
            <table style={{ width: "100%", maxWidth: 640, margin: "12px auto", borderCollapse: "collapse", fontSize: "12.5px", border: "1px solid var(--color-border)" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)" }}>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-border)", textAlign: "left", width: 180 }}>Term / Abbr.</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-border)", textAlign: "left" }}>Definition</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)", fontWeight: 600 }}>SOP</td><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Standard Operating Procedure</td></tr>
                <tr><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)", fontWeight: 600 }}>QM</td><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Quality Manual</td></tr>
                <tr><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)", fontWeight: 600 }}>User</td><td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Person who uses the quality document</td></tr>
              </tbody>
            </table>

            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", margin: "14px 0 4px 0" }}>
              4. Tasks, responsibilities and accountabilities
            </h4>

            {/* CENTERED TABLE */}
            <table style={{ width: "100%", maxWidth: 680, margin: "12px auto", borderCollapse: "collapse", fontSize: "12.5px", border: "1px solid var(--color-border)" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)" }}>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-border)", textAlign: "left" }}>Task</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-border)", textAlign: "left", width: 160 }}>Authorized</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-border)", textAlign: "left", width: 200 }}>Responsible</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Determining verifiers of documents</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>LM</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>LM</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Verification content-wise</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>User</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Authorizer of document</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Developing quality documents</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>User</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-border)" }}>Authorizer of document</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", margin: "16px 0 4px 0" }}>
              5. Procedure
            </h4>

            <h5 style={{ fontSize: "13px", fontWeight: 700, margin: "6px 0 2px 0" }}>5.1 SOPs</h5>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              The laboratory uses three types of SOPs: Analysis SOPs, Equipment SOPs, Procedure SOPs. There is a specific framework for developing each type of SOP (see annex 1 to 3).
            </p>

            <h5 style={{ fontSize: "13px", fontWeight: 700, margin: "10px 0 2px 0" }}>5.2 Developing quality documents</h5>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              Every employee can take the initiative in writing SOPs. In discussion with the LM and the QO verifiers are determined. The author writes the SOP. This person should have the appropriate knowledge and expertise regarding the procedure for which an SOP is written.
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: "6px 0 0 0" }}>
              Verification of quality documents is done by:
            </p>
            <ul style={{ margin: "4px 0 8px 20px", padding: 0, fontSize: "13px", lineHeight: 1.6 }}>
              <li>At least one user of the quality document for compliance with practice</li>
              <li>The QO for compliance with the quality standard.</li>
            </ul>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              Authorization of quality documents is done by the LM.
            </p>

            <div style={{ background: "var(--color-surface-2)", padding: 14, borderRadius: 6, fontSize: "12.5px", marginTop: 8, width: "100%" }}>
              <strong style={{ display: "block", marginBottom: 6, color: "var(--color-primary)" }}>Author & QO Workflow Steps:</strong>
              <ol style={{ margin: "0 0 0 18px", padding: 0, lineHeight: 1.6 }}>
                <li>The author makes him/herself known to the QO with the wish to write a new SOP.</li>
                <li>QO makes a unique code for the new SOP and proposes (when not yet known) who the verifiers are and the authorizer.</li>
                <li>The QO fills-out the header of the draft SOP and sends it to the author.</li>
                <li>The author writes the SOP; use the appropriate framework for developing the document (see annex 1 to 4).</li>
                <li>Save the SOP on the computer with the code and title, the year and month of developing the quality document and your initials as filename (for example: <code>P15.Recording.2013.08.MG.docx</code>).</li>
                <li>Send the draft SOP via email to the verifiers, authorizer and possible other users for commenting.</li>
                <li>Discuss the comments with the verifiers, authorizer and users, for example during a weekly staff meeting.</li>
                <li>Process the comments into an improved version of the SOP.</li>
                <li>Send the final SOP via email to the QO.</li>
                <li>Subsequently: The QO ensures that the SOP is printed and signed by the author, verifiers and authorizer.</li>
                <li>The author, verifiers and authorizers sign the SOP with a blue pen. The authorizer also places his/her signature in the header of each page. The last person who signs the SOP gives the SOP back to the QO.</li>
                <li>The QO places the signed SOP at the appropriate location.</li>
              </ol>
            </div>

            <h5 style={{ fontSize: "13px", fontWeight: 700, margin: "12px 0 2px 0" }}>5.3 Coding of quality documents</h5>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              Each SOP gets a unique code in the header of each page. Codes will not be changed after they have been assigned to a specific document.
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.6, margin: "6px 0 4px 0" }}>
              Coding is done as shown below:
            </p>
            <ul style={{ margin: "0 0 8px 20px", padding: 0, fontSize: "12.5px", fontFamily: "monospace", lineHeight: 1.7 }}>
              <li>Quality Manual: QM + chapter number</li>
              <li>Procedure SOP: P + index number</li>
              <li>Equipment SOP: E + index number</li>
              <li>Analysis SOP: A + index number</li>
              <li>Forms: Code of SOP or QM chapter + F + index number</li>
              <li>Annexes: Code of SOP or QM chapter + A + index number</li>
            </ul>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", margin: 0 }}>
              <em>For example: Annex to the Master SOP: SOP P1A1.</em>
            </p>

            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-primary)", margin: "14px 0 4px 0" }}>
              6. Related Documents | 7. Related Forms | 8. References | 9. Attachments
            </h4>
            <p style={{ fontSize: "13px", margin: 0 }}>
              <strong>Related Documents:</strong> QM1 “General”, Authorization Matrix | <strong>Related Forms:</strong> N/A | <strong>References:</strong> ISO 15189 Medical Laboratory – Requirements to quality and competence. International Organization for Standardization. Geneva 2012. | <strong>Attachments:</strong> Annex 1, Annex 2, Annex 3, Annex 4.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* ANNEX 1: FRAMEWORK FOR DEVELOPING PROCEDURE SOPS */}
          {/* ========================================================================= */}
          <div id="annex-1" style={{ paddingTop: 20, borderTop: "1px dashed var(--color-border)", display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-primary)", margin: 0 }}>
              Annex 1: Framework for developing Procedure SOPs
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", fontStyle: "italic", margin: 0 }}>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "12.5px", color: "var(--color-text)", lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>2. Objectives & Scope:</strong> [Describe briefly the objective of the SOP, the scope and to whom this SOP is applicable]</p>
              <p style={{ margin: 0 }}><strong>3. Abbreviations and definitions:</strong> [List abbreviations and terms used in this SOP and give their definition]</p>
              <p style={{ margin: 0 }}><strong>4. Tasks, responsibilities and accountabilities:</strong> [Describe in the table responsibilities and authorizations related to execution of procedure. For general authorizations refer to Authorization Matrix.]</p>
            </div>

            {/* CENTERED TABLE */}
            <table style={{ width: "100%", maxWidth: 640, margin: "12px auto", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)" }}>
              <thead><tr style={{ background: "var(--color-surface-2)" }}><th style={{ padding: 6, border: "1px solid var(--color-border)" }}>Task</th><th style={{ padding: 6, border: "1px solid var(--color-border)", width: 160 }}>Authorized</th><th style={{ padding: 6, border: "1px solid var(--color-border)", width: 200 }}>Responsible</th></tr></thead>
              <tbody><tr><td style={{ padding: 10, border: "1px solid var(--color-border)", color: "#999" }} colSpan={3}>[Fill procedure tasks and role assignments]</td></tr></tbody>
            </table>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "12.5px", color: "var(--color-text)", lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>5. Procedure:</strong> [Describe steps in chronological order. Write in imperative as much as possible, take basic user knowledge into account, describe all technical/administrative activities, refer to biosafety manual for waste/reagents.]</p>
              <p style={{ margin: 0 }}><strong>6. Related Documents:</strong> [List related SOPs, QM chapters, log sheets, manuals (e.g. QM1 “General”, Biosafety Manual)]</p>
              <p style={{ margin: 0 }}><strong>7. Related Forms:</strong> [Forms relevant to SOP (e.g. P43F1 “Induction checklist”)]</p>
              <p style={{ margin: 0 }}><strong>8. References:</strong> [Literature, books or journals used]</p>
              <p style={{ margin: 0 }}><strong>9. Attachments:</strong> [List annexes (e.g. P1A1 “Framework for developing Procedure SOPs”)].</p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ANNEX 2: FRAMEWORK FOR DEVELOPING EQUIPMENT SOPS */}
          {/* ========================================================================= */}
          <div id="annex-2" style={{ paddingTop: 20, borderTop: "1px dashed var(--color-border)", display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-primary)", margin: 0 }}>
              Annex 2: Framework for developing Equipment SOPs
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", fontStyle: "italic", margin: 0 }}>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "12.5px", color: "var(--color-text)", lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>2. Objectives & Scope:</strong> [Describe objective, scope, and applicability]</p>
              <p style={{ margin: 0 }}><strong>3. Abbreviations & Definitions:</strong> [List abbreviations and terms]</p>
              <p style={{ margin: 0 }}><strong>4. Tasks & Responsibilities:</strong> [Responsibilities for startup, calibration, controls, maintenance and operation]</p>
              <p style={{ margin: 0 }}><strong>5. Equipment Description:</strong> [Name, type, brand, supplier, function, method, principle, measurement range, photo]</p>
              <p style={{ margin: 0 }}><strong>6. Safety and Environment:</strong> [Dangers related to equipment, biosafety level, PPE, waste disposal]</p>
              <div style={{ margin: 0 }}>
                <strong>7. Startup procedure (calibration and controls) and maintenance:</strong>
                <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                  <li><strong>7.1 Calibration:</strong> [When/how calibrated, error codes, interpretation]</li>
                  <li><strong>7.2 Controls:</strong> [Internal/external controls, frequency, log sheets]</li>
                  <li><strong>7.3 Maintenance:</strong> [Daily, weekly, monthly, yearly protocols]</li>
                </ul>
              </div>
              <p style={{ margin: 0 }}><strong>8. Operation:</strong> [Stepwise operation in imperative]</p>
              <p style={{ margin: 0 }}><strong>9. Problem solving:</strong> [Common error troubleshooting]</p>
              <p style={{ margin: 0 }}><strong>10. Related Documents:</strong> [Manuals, logbooks]</p>
              <p style={{ margin: 0 }}><strong>11. Related Forms:</strong> [e.g. forms P43F1]</p>
              <p style={{ margin: 0 }}><strong>12. References:</strong> [Literature used for writing this SOP]</p>
              <p style={{ margin: 0 }}><strong>13. Attachments:</strong> [e.g. annexes P1A1]</p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ANNEX 3: FRAMEWORK FOR DEVELOPING ANALYSIS SOPS */}
          {/* ========================================================================= */}
          <div id="annex-3" style={{ paddingTop: 20, borderTop: "1px dashed var(--color-border)", display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-primary)", margin: 0 }}>
              Annex 3: Framework for developing Analysis SOPs
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", fontStyle: "italic", margin: 0 }}>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "12.5px", color: "var(--color-text)", lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>2. Objectives & Scope:</strong> [Describe briefly the objective of the SOP, the scope and to whom this SOP is applicable]</p>
              <p style={{ margin: 0 }}><strong>3. Abbreviations and definitions:</strong> [List abbreviations and terms that are present in this SOP and give their definition]</p>
              <p style={{ margin: 0 }}><strong>4. Tasks, responsibilities and accountabilities:</strong> [Describe responsibilities and authorizations related to the execution of the procedure]</p>
              <p style={{ margin: 0 }}><strong>5. Principle:</strong> [Assay principle, detection limits, specificity, reference values, interpretation]</p>
              <p style={{ margin: 0 }}><strong>6. Safety and environment:</strong> [Describe possible risks for safety and environment related to performing the analysis]</p>
              <p style={{ margin: 0 }}><strong>7. Sample:</strong> [Sample type (serum, blood, plasma), quantity, storage temp]</p>
              <p style={{ margin: 0 }}><strong>8. Equipment & Supplies:</strong> [Describe the equipment and supplies needed]</p>
              <p style={{ margin: 0 }}><strong>9. Reagents & Chemicals:</strong> [Reagents item, storage location, 4°C conditions]</p>
              <p style={{ margin: 0 }}><strong>10. Quality Control:</strong> [Control limits, out-of-control actions]</p>
              <p style={{ margin: 0 }}><strong>11. Procedure:</strong> [Sample prep, analytical sequence, result calculations, LIMS entry, archiving, cleanup]</p>
              <p style={{ margin: 0 }}><strong>12. Related Documents:</strong> [Logbooks, QM chapters, equipment manuals]</p>
              <p style={{ margin: 0 }}><strong>13. Related Forms:</strong> [Forms relevant to SOP (e.g. P43F1 “Induction checklist”)]</p>
              <p style={{ margin: 0 }}><strong>14. References:</strong> [Literature references]</p>
              <p style={{ margin: 0 }}><strong>15. Attachments:</strong> [Provide a list of annexes]</p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ANNEX 4: FRAMEWORK FOR DEVELOPING ANNEXES AND FORMS */}
          {/* ========================================================================= */}
          <div id="annex-4" style={{ paddingTop: 20, borderTop: "1px dashed var(--color-border)", display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-primary)", margin: 0 }}>
              Annex 4: Framework for developing Annexes and Forms
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", margin: 0 }}>

            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN TOPIC 2: SOP STANDARD DOCUMENTS & TEMPLATES */}
        {/* ========================================================================= */}
        <section id="topic-2" style={{ display: "flex", flexDirection: "column", gap: 16, borderBottom: "1px solid var(--color-divider)", paddingBottom: 32, width: "100%" }}>
          <div style={{ borderLeft: "4px solid #0d9488", paddingLeft: 14 }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              SOP Standard Documents
            </h2>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Downloadable SOP templates, logs, and reporting formats</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4, width: "100%" }}>
            {[
              { title: "Procedure SOP Template", type: "Word Document (.docx)", desc: "Standard template for analytical, diagnostic, and laboratory protocols." },
              { title: "Equipment SOP Template", type: "Word Document (.docx)", desc: "Template for equipment operation, calibration, and routine maintenance." },
              { title: "Analysis & Data SOP Template", type: "Word Document (.docx)", desc: "Template for bioinformatic, statistical, and data analysis pipelines." },
              { title: "SOP Revision & Amendment Log", type: "Excel Spreadsheet (.xlsx)", desc: "Tracking sheet for annual reviews, minor amendments, and audit history." }
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--color-border)", flexWrap: "wrap", gap: 12, width: "100%" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", margin: "0 0 2px 0" }}>{item.title}</h3>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-primary)" }}>{item.type}</span> — <span style={{ fontSize: "12.5px", color: "var(--color-text-muted)" }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN TOPIC 3: INTERNATIONAL REFERENCE STANDARDS & WHO GUIDELINES */}
        {/* ========================================================================= */}
        <section id="topic-3" style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
          <div style={{ borderLeft: "4px solid #7b1fa2", paddingLeft: 14 }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              International Reference Standards & WHO Guidelines
            </h2>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Regulatory frameworks, WHO toolkits, and ISO compliance standards</span>
          </div>

          <div style={{ fontSize: "13px", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 12, marginTop: 4, width: "100%" }}>
            <p style={{ margin: 0 }}>
              Laboratory quality systems in medical, diagnostic, and research facilities are constructed around internationally recognized standards. Key reference documents governing procedures include:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <div>
                <strong>1. World Health Organization (WHO):</strong>
                <p style={{ margin: "2px 0 0 0" }}>
                  The <a href="https://www.who.int/publications/i/item/9789241548274" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>WHO Quality Management System Training Toolkit for Medical Laboratories</a> provides a step-by-step framework covering the 12 quality system essentials, authoring pipelines, and audit readiness. Additionally, refer to the <a href="https://www.who.int/publications/i/item/9789240011311" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>WHO Laboratory Biosafety Manual (4th Edition)</a> for risk-based biosafety measures.
                </p>
              </div>

              <div>
                <strong>2. International Organization for Standardization (ISO):</strong>
                <p style={{ margin: "2px 0 0 0" }}>
                  The flagship quality standard <a href="https://www.iso.org/standard/76119.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>ISO 15189:2022 — Medical laboratories — Requirements for quality and competence</a> specifies technical competence, sample handling, document control, and management review standards required for laboratory accreditation.
                </p>
              </div>

              <div>
                <strong>3. Clinical and Laboratory Standards Institute (CLSI):</strong>
                <p style={{ margin: "2px 0 0 0" }}>
                  The <a href="https://clsi.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>CLSI QMS01-A4 — Quality Management System: A Model for Laboratory Services</a> models standard operational procedures, verification matrices, and control policies. For pre-analytical sample workflows, consult <a href="https://clsi.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>CLSI GP44-A4 Procedures for the Handling and Processing of Blood Specimens</a>.
                </p>
              </div>

              <div>
                <strong>4. CDC / NIH Biosafety & Containment Guidelines:</strong>
                <p style={{ margin: "2px 0 0 0" }}>
                  The <a href="https://www.cdc.gov/labs/BMBL.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>CDC / NIH Biosafety in Microbiological and Biomedical Laboratories (BMBL 6th Edition)</a> provides environmental controls, personal protective equipment (PPE), biosafety cabinet (BSC) operation, and bio-hazardous waste disposal standards.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}