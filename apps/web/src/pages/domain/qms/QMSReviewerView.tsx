import React, { useState, useMemo, useEffect } from "react";
import logoAhri from "../../../assets/logo_ahri.png";


import QMSFilterStrip, { matchesSopFilters } from "./QMSFilterStrip";

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

interface QMSReviewerViewProps {
  sops: SOPItem[];
  onSopUpdate: (updatedSops: SOPItem[]) => void;
  onPrintRequest: (sop: SOPItem) => void;
  onShareRequest: (sop: SOPItem) => void;
  onSopApproved?: (sop: SOPItem) => void;
  showSuccessMessage?: (message: string) => void;
}



const formatRichTextLocal = (text: string) => {
  if (!text) return "N/A";
  if (!/<[a-z][\s\S]*>/i.test(text)) {
    return text.replace(/\n/g, "<br/>");
  }
  return text;
};

const getReviewSections = (sopType: string, details: any) => {
  const sections: any[] = [
    {
      label: "Purpose, Scope & Background",
      render: () => {
        const purp = details?.purpose || details?.objectScope || details?.objectivesScope || "";
        const sc = details?.scope || "";
        const bg = details?.background || "";
        if (!purp && !sc && !bg) return null;
        return (
          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
            {purp && (
              <div>
                <strong style={{ display: "block", marginBottom: 4, color: "var(--color-text-muted)" }}>Purpose:</strong>
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
    { label: "Abbreviations & Definitions", text: details?.abbreviationsDefinitions },
    {
      label: "Tasks, Responsibilities & Accountabilities",
      render: () => {
        const narrative = details?.responsibilityAccountability || "";
        const grid = details?.tasksGrid || [];
        const hasGrid = Array.isArray(grid) && grid.some((r: any) => r.task || r.authorized || r.responsible);
        if (!narrative && !hasGrid) return null;
        return (
          <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
            {narrative && (
              <div>
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
    }
  ];

  if (sopType === "Equipment SOP") {
    sections.push(
      { label: "Equipment Description", text: details?.equipmentDescription },
      {
        label: "Environmental & Safety Controls",
        render: () => {
          const ppe = Array.isArray(details?.ppeRequired) ? details.ppeRequired : [];
          const ppeOther = details?.ppeRequiredOther || "";
          const bsl = details?.bslRequired || "";
          const hazards = Array.isArray(details?.hazardsRelevant) ? details.hazardsRelevant : [];
          const hazardsOther = details?.hazardsRelevantOther || "";
          const waste = details?.wasteHandling || "";
          const addSafety = details?.additionalSafety || details?.safetyEnvironment || "";

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
      { label: "Calibration protocol", text: details?.calibration },
      { label: "Controls schedule", text: details?.controls },
      { label: "Maintenance instructions", text: details?.maintenance },
      { label: "Operation steps", text: details?.operation },
      { label: "Troubleshooting & Problem Solving", text: details?.problemSolving }
    );
  } else if (sopType === "Analysis SOP") {
    sections.push(
      { label: "Scientific Principle", text: details?.principleMethodologicalBasis || details?.principle },
      {
        label: "Samples / Specimens Covered",
        render: () => {
          const matrices = Array.isArray(details?.sampleMatrices) ? details.sampleMatrices : [];
          const matricesOther = details?.sampleMatricesOther || "";
          const inputs = Array.isArray(details?.inputMaterialTypes) ? details.inputMaterialTypes : [];
          const inputsOther = details?.inputMaterialTypesOther || "";
          const volume = details?.sampleVolume || "";
          const acceptance = details?.sampleAcceptance || "";
          const rejection = details?.sampleRejection || "";

          const hasAny = matrices.length > 0 || inputs.length > 0 || volume || acceptance || rejection || details?.sample;
          if (!hasAny) return null;

          return (
            <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
              {details?.sample && !acceptance && !rejection && (
                <div dangerouslySetInnerHTML={{ __html: formatRichTextLocal(details.sample) }} />
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
          const narrative = details?.reagentsNarrative || "";
          const onePerLine = details?.reagentsOnePerLine || "";
          const hasGrid = Array.isArray(details?.reagentsGrid) && details.reagentsGrid.some((r: any) => r.item || r.location || r.condition);

          if (!narrative && !onePerLine && !hasGrid) return null;

          return (
            <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
              {narrative && (
                <div>
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
                      {details.reagentsGrid.map((row: any, ridx: number) => (
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
          const equip = Array.isArray(details?.primaryEquipment) ? details.primaryEquipment : [];
          const equipOther = details?.primaryEquipmentOther || "";
          const narrative = details?.equipmentOnePerLine || details?.equipmentSupplies || "";

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
        label: "Environmental & Safety Controls",
        render: () => {
          const ppe = Array.isArray(details?.ppeRequired) ? details.ppeRequired : [];
          const ppeOther = details?.ppeRequiredOther || "";
          const bsl = details?.bslRequired || "";
          const hazards = Array.isArray(details?.hazardsRelevant) ? details.hazardsRelevant : [];
          const hazardsOther = details?.hazardsRelevantOther || "";
          const waste = details?.wasteHandling || "";
          const addSafety = details?.additionalSafety || details?.safetyEnvironment || "";

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
      {
        label: "Quality Control procedures",
        render: () => {
          const controls = Array.isArray(details?.controlsIncluded) ? details.controlsIncluded : [];
          const controlsOther = details?.controlsIncludedOther || "";
          const methods = Array.isArray(details?.qcMethods) ? details.qcMethods : [];
          const methodsOther = details?.qcMethodsOther || "";
          const criteria = details?.acceptanceRejectionCriteria || "";
          const narrative = details?.qcNarrative || details?.qualityControl || "";

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
          const narrative = details?.procedureNarrative || details?.procedure || "";
          const steps = details?.procedureOnePerLine || "";

          if (!narrative && !steps) return null;

          return (
            <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
              {narrative && (
                <div>
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
          const formulas = details?.calculationsFormulas || "";
          const tools = details?.softwareAnalysisTools || "";
          const rules = details?.interpretationThresholds || "";

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
          const format = details?.reportingFormat || "";
          const cutoffs = details?.cutOffsThresholds || "";
          const lims = details?.limsDatabaseMapping || "";
          const narrative = details?.resultReportingNarrative || "";

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
          const stTypes = Array.isArray(details?.storageSampleTypes) ? details.storageSampleTypes : [];
          const stTypesOther = details?.storageSampleTypesOther || "";
          const temp = details?.storageTemperature || "";
          const duration = details?.maxStorageDuration || "";
          const modes = Array.isArray(details?.acceptableTransportModes) ? details.acceptableTransportModes : [];
          const modesOther = details?.acceptableTransportModesOther || "";
          const narrative = details?.storageTransportNarrative || "";

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
      }
    );
  } else {
    // Procedure SOP or default
    sections.push(
      {
        label: "Procedure Sequence",
        render: () => {
          const narrative = details?.procedureNarrative || details?.procedure || "";
          const steps = details?.procedureOnePerLine || "";

          if (!narrative && !steps) return null;

          return (
            <div style={{ fontSize: "var(--fs-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
              {narrative && (
                <div>
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
      }
    );
  }

  // Common trailing related documents sections
  sections.push(
    { label: "Related Documents", text: details?.relatedDocuments },
    { label: "Related Forms", text: details?.relatedForms },
    { label: "References", text: details?.references },
    { label: "Attachments & Annexes", text: details?.attachments }
  );

  return sections;
};

const getDiffSections = (sopType: string): any[] => {
  const sections: any[] = [
    { title: "Purpose", key: "purpose", textOnly: true },
    { title: "Scope", key: "scope", textOnly: true },
    { title: "Background / Introduction", key: "background", textOnly: true },
    { title: "Objectives & Scope (Legacy)", key: "objectivesScope", textOnly: true },
    { title: "Abbreviations & Definitions", key: "abbreviationsDefinitions", textOnly: true },
    { title: "Responsibility & Accountability (Narrative)", key: "responsibilityAccountability", textOnly: true },
    { title: "Tasks & Responsibilities Matrix", key: "tasksGrid", gridType: "tasks" }
  ];

  if (sopType === "Equipment SOP") {
    sections.push(
      { title: "Equipment Description", key: "equipmentDescription", textOnly: true },
      { title: "Biosafety Level (BSL) Required", key: "bslRequired", textOnly: true },
      { title: "PPE Required", key: "ppeRequired", arrayType: true },
      { title: "Hazards Relevant to this Procedure", key: "hazardsRelevant", arrayType: true },
      { title: "Waste Handling Instructions", key: "wasteHandling", textOnly: true },
      { title: "Additional Safety / Environmental Controls", key: "additionalSafety", textOnly: true },
      { title: "Safety & Environment Instructions (Legacy)", key: "safetyEnvironment", textOnly: true },
      { title: "Calibration protocol", key: "calibration", textOnly: true },
      { title: "Controls schedule", key: "controls", textOnly: true },
      { title: "Maintenance instructions", key: "maintenance", textOnly: true },
      { title: "Operation steps", key: "operation", textOnly: true },
      { title: "Troubleshooting & Problem Solving", key: "problemSolving", textOnly: true },
      { title: "Related Documents", key: "relatedDocuments", textOnly: true },
      { title: "Related Forms", key: "relatedForms", textOnly: true },
      { title: "References", key: "references", textOnly: true },
      { title: "Attachments & Annexes", key: "attachments", textOnly: true }
    );
  } else if (sopType === "Analysis SOP") {
    sections.push(
      { title: "Scientific Principle / Methodological basis", key: "principleMethodologicalBasis", textOnly: true },
      { title: "Scientific Principle (Legacy)", key: "principle", textOnly: true },
      { title: "Sample Matrices Covered", key: "sampleMatrices", arrayType: true },
      { title: "Input Material Type(s)", key: "inputMaterialTypes", arrayType: true },
      { title: "Volume/Amount Required per Sample", key: "sampleVolume", textOnly: true },
      { title: "Sample Acceptance Criteria", key: "sampleAcceptance", textOnly: true },
      { title: "Sample Rejection Criteria", key: "sampleRejection", textOnly: true },
      { title: "Sample Criteria (Legacy)", key: "sample", textOnly: true },
      { title: "Reagents & Supplies Narrative", key: "reagentsNarrative", textOnly: true },
      { title: "Reagents list (one per line)", key: "reagentsOnePerLine", textOnly: true },
      { title: "Reagents & Chemicals Matrix (Legacy)", key: "reagentsGrid", gridType: "reagents" },
      { title: "Primary Equipment Used", key: "primaryEquipment", arrayType: true },
      { title: "Equipment & instruments (one per line)", key: "equipmentOnePerLine", textOnly: true },
      { title: "Equipment & Supplies required (Legacy)", key: "equipmentSupplies", textOnly: true },
      { title: "Biosafety Level (BSL) Required", key: "bslRequired", textOnly: true },
      { title: "PPE Required", key: "ppeRequired", arrayType: true },
      { title: "Hazards Relevant to this Procedure", key: "hazardsRelevant", arrayType: true },
      { title: "Waste Handling Instructions", key: "wasteHandling", textOnly: true },
      { title: "Additional Safety / Environmental Controls", key: "additionalSafety", textOnly: true },
      { title: "Safety & Environment Instructions (Legacy)", key: "safetyEnvironment", textOnly: true },
      { title: "Controls Included", key: "controlsIncluded", arrayType: true },
      { title: "DNA/RNA QC Methods Specified", key: "qcMethods", arrayType: true },
      { title: "Acceptance / Rejection Criteria", key: "acceptanceRejectionCriteria", textOnly: true },
      { title: "Quality Control Narrative", key: "qcNarrative", textOnly: true },
      { title: "Quality Control procedures (Legacy)", key: "qualityControl", textOnly: true },
      { title: "Procedure Narrative", key: "procedureNarrative", textOnly: true },
      { title: "Stepwise procedure (one per line)", key: "procedureOnePerLine", textOnly: true },
      { title: "Procedure Sequence (Legacy)", key: "procedure", textOnly: true },
      { title: "Calculations / Formulas Used", key: "calculationsFormulas", textOnly: true },
      { title: "Software / Analysis Tools Used", key: "softwareAnalysisTools", textOnly: true },
      { title: "Interpretation Rules / Thresholds", key: "interpretationThresholds", textOnly: true },
      { title: "Reporting Format (units, layout)", key: "reportingFormat", textOnly: true },
      { title: "Cut-offs / Thresholds", key: "cutOffsThresholds", textOnly: true },
      { title: "LIMS / Database Field Mapping", key: "limsDatabaseMapping", textOnly: true },
      { title: "Result Reporting Narrative", key: "resultReportingNarrative", textOnly: true },
      { title: "Sample Types Stored/Transported", key: "storageSampleTypes", arrayType: true },
      { title: "Recommended Storage Temperature", key: "storageTemperature", textOnly: true },
      { title: "Maximum Storage Duration", key: "maxStorageDuration", textOnly: true },
      { title: "Acceptable Transport Modes", key: "acceptableTransportModes", arrayType: true },
      { title: "Storage & Transport Narrative", key: "storageTransportNarrative", textOnly: true },
      { title: "Related Documents", key: "relatedDocuments", textOnly: true },
      { title: "Related Forms", key: "relatedForms", textOnly: true },
      { title: "References", key: "references", textOnly: true },
      { title: "Attachments & Annexes", key: "attachments", textOnly: true }
    );
  } else {
    // Procedure SOP or default
    sections.push(
      { title: "Procedure Narrative", key: "procedureNarrative", textOnly: true },
      { title: "Step-by-step list (one per line)", key: "procedureOnePerLine", textOnly: true },
      { title: "Procedure Sequence (Legacy)", key: "procedure", textOnly: true },
      { title: "Related Documents", key: "relatedDocuments", textOnly: true },
      { title: "Related Forms", key: "relatedForms", textOnly: true },
      { title: "References", key: "references", textOnly: true },
      { title: "Attachments & Annexes", key: "attachments", textOnly: true }
    );
  }

  return sections;
};

const formatGridToString = (gridData: any[], type: string) => {
  if (!Array.isArray(gridData) || gridData.length === 0) return "";
  if (type === "tasks") {
    return gridData
      .map(row => {
        const auth = Array.isArray(row.authorized) ? row.authorized.join(", ") : (row.authorized || "");
        const resp = Array.isArray(row.responsible) ? row.responsible.join(", ") : (row.responsible || "");
        return `Task: ${row.task || ""}\nAuthorized: ${auth}\nResponsible: ${resp}`;
      })
      .join("\n\n");
  } else {
    return gridData
      .map(row => `Item: ${row.item || ""}\nLocation: ${row.location || ""}\nCondition: ${row.condition || ""}`)
      .join("\n\n");
  }
};

export default function QMSReviewerView({ sops, onSopUpdate, onPrintRequest, onShareRequest, onSopApproved, showSuccessMessage }: QMSReviewerViewProps) {
  // Standardized filter states & sub-tabs
  const [reviewerSubTab, setReviewerSubTab] = useState<"approved" | "review">("approved");
  const [searchText, setSearchText] = useState<string>("");
  const [sopType, setSopType] = useState<string>("All");
  const [sopStatus, setSopStatus] = useState<string>("All");
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [selectedSopForReview, setSelectedSopForReview] = useState<SOPItem | null>(null);
  // Reviewer specific inputs
  const [commentSection, setCommentSection] = useState<string>("General Comments");
  const [commentText, setCommentText] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);
  const [panelRole, setPanelRole] = useState<string>("Verifier (User)");

  // Dynamic list of available titles for Authorizer review queue
  const availableTitles = useMemo(() => {
    const titles = sops.map(s => s.title).filter(Boolean);
    return Array.from(new Set(titles)).sort();
  }, [sops]);

  // Realtime updatable count for pending SOPs in review queue
  const pendingReviewCount = useMemo(() => {
    return sops.filter(sop => {
      const st = sop.status.toUpperCase();
      return st !== "APPROVED" && st !== "ACTIVE / APPROVED" && st !== "ACTIVE";
    }).length;
  }, [sops]);

  // Compute reviewer metrics
  const metrics = useMemo(() => {
    const pending = sops.filter(s => s.status.toUpperCase() === "UNDER REVIEW" || s.status.toUpperCase() === "REVIEW" || s.status.toUpperCase() === "SUBMITTED" || s.status.toUpperCase() === "PANEL REVIEW").length;
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

  // Review Queue list (filtered using standardized filter matcher & sub-tab)
  const reviewQueue = useMemo(() => {
    return sops.filter(sop => {
      const matches = matchesSopFilters(sop, sopType, sopStatus, selectedTitles, searchText);
      if (!matches) return false;
      const st = sop.status.toUpperCase();
      if (reviewerSubTab === "approved") {
        return st === "APPROVED" || st === "ACTIVE / APPROVED" || st === "ACTIVE";
      } else {
        return st !== "APPROVED" && st !== "ACTIVE / APPROVED" && st !== "ACTIVE";
      }
    });
  }, [sops, sopType, sopStatus, selectedTitles, searchText, reviewerSubTab]);

  // Auto-populate or correct selectedSopForReview when in "review" tab
  useEffect(() => {
    if (reviewerSubTab === "review") {
      if (reviewQueue.length > 0) {
        const isCurrentlySelectedInQueue = selectedSopForReview && reviewQueue.some(s => s.id === selectedSopForReview.id);
        if (!selectedSopForReview || !isCurrentlySelectedInQueue) {
          setSelectedSopForReview(reviewQueue[0]);
        }
      } else {
        setSelectedSopForReview(null);
      }
    } else {
      if (selectedSopForReview !== null) {
        setSelectedSopForReview(null);
      }
    }
  }, [reviewerSubTab, reviewQueue, selectedSopForReview]);

  // Dynamic Method Families list
  const methodFamilyOptions = useMemo(() => {
    const fams = sops.map(s => s.details?.methodFamily).filter(Boolean);
    return Array.from(new Set(fams)).sort();
  }, [sops]);

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

  // Send SOP to Panel Review / Collaboration Action
  const handleSendToPanelReview = () => {
    if (!selectedSopForReview) return;

    const todayStr = new Date().toLocaleDateString();
    const updatedSop = { ...selectedSopForReview };
    updatedSop.status = "Panel Review";

    if (!updatedSop.details) updatedSop.details = {};
    if (!updatedSop.details.electronicSignatures) {
      updatedSop.details.electronicSignatures = {
        author: { name: updatedSop.author || "Author", signedAt: updatedSop.lastUpdated || todayStr },
        verifierUser: { name: updatedSop.details?.proposedVerifier || "Verifier User", signedAt: "" },
        verifierQo: { name: "QA Officer", signedAt: "" },
        authorizerLm: { name: updatedSop.details?.proposedAuthorizer || "Laboratory Manager", signedAt: "" }
      };
    }

    // Add to audit trail
    if (!updatedSop.details.history) updatedSop.details.history = [];
    updatedSop.details.history.push({
      action: "Sent for Panel Review",
      user: "Quality Officer",
      timestamp: new Date().toLocaleString(),
      details: "Document forwarded to verifiers and authorizer for digital sign-offs."
    });

    const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
    localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
    onSopUpdate(updatedList);
    setSelectedSopForReview(updatedSop);
    if (showSuccessMessage) {
      showSuccessMessage(`SOP ${updatedSop.code} has been successfully sent to Panel Review & Collaboration.`);
    } else {
      alert(`SOP ${updatedSop.code} has been successfully sent to Panel Review & Collaboration.`);
    }
  };

  // Electronic digital sign-off Action
  const handlePanelSignoff = (role: string) => {
    if (!selectedSopForReview) return;

    // GATE: Sign-off is only allowed once the SOP has been formally sent to Panel Review
    if (selectedSopForReview.status.toUpperCase() !== "PANEL REVIEW") {
      alert("Sign-off is not allowed yet. Please click 'Send for Panel Review' first to formally initiate the panel sign-off process.");
      return;
    }

    const roleKeyMap: Record<string, string> = {
      "Verifier (User)": "verifierUser",
      "Verifier (QO)": "verifierQo",
      "Authorizer (LM)": "authorizerLm"
    };

    const key = roleKeyMap[role];
    if (!key) return;

    const todayStr = new Date().toLocaleDateString();
    const updatedSop = { ...selectedSopForReview };

    if (!updatedSop.details) updatedSop.details = {};
    if (!updatedSop.details.electronicSignatures) {
      updatedSop.details.electronicSignatures = {
        author: { name: updatedSop.author || "Author", signedAt: updatedSop.lastUpdated || todayStr },
        verifierUser: { name: updatedSop.details?.proposedVerifier || "Verifier User", signedAt: "" },
        verifierQo: { name: "QA Officer", signedAt: "" },
        authorizerLm: { name: updatedSop.details?.proposedAuthorizer || "Laboratory Manager", signedAt: "" }
      };
    }

    // GATE: Authorizer (LM) can only sign off after both Verifier (User) and Verifier (QO) have signed
    if (role === "Authorizer (LM)") {
      const currentEs = updatedSop.details.electronicSignatures;
      const userVerified = !!currentEs.verifierUser?.signedAt;
      const qoVerified = !!currentEs.verifierQo?.signedAt;
      if (!userVerified || !qoVerified) {
        const missing: string[] = [];
        if (!userVerified) missing.push("Verifier (User)");
        if (!qoVerified) missing.push("Verifier (QO)");
        alert(`Authorizer (LM) sign-off requires both verifiers to sign first.\n\nStill awaiting: ${missing.join(" and ")}.`);
        return;
      }
    }

    // Mark as approved by this verifier/authorizer
    updatedSop.details.electronicSignatures = {
      ...updatedSop.details.electronicSignatures,
      [key]: {
        ...updatedSop.details.electronicSignatures[key],
        signedAt: todayStr
      }
    };

    // Add to audit trail
    if (!updatedSop.details.history) updatedSop.details.history = [];
    updatedSop.details.history.push({
      action: `Digitally Signed: ${role}`,
      user: updatedSop.details.electronicSignatures[key]?.name || role,
      timestamp: new Date().toLocaleString(),
      details: `Signed off for electronic verification/approval as ${role}.`
    });

    // Check if all 3 panel reviewers approved (verifierUser, verifierQo, authorizerLm)
    const es = updatedSop.details.electronicSignatures;
    const isFullyApproved = es.verifierUser?.signedAt && es.verifierQo?.signedAt && es.authorizerLm?.signedAt;

    if (isFullyApproved) {
      updatedSop.status = "Approved";

      // Update legacy signoff fields for printing/compatibility
      if (!updatedSop.details.signoff) updatedSop.details.signoff = {};
      updatedSop.details.signoff = {
        ...updatedSop.details.signoff,
        preparedByName: es.author?.name || updatedSop.author,
        preparedDate: es.author?.signedAt || updatedSop.lastUpdated,
        reviewedByName: `${es.verifierUser?.name || "Verifier (User)"} & ${es.verifierQo?.name || "QA Officer"}`,
        reviewedDate: `${es.verifierUser?.signedAt} / ${es.verifierQo?.signedAt}`,
        approvedByName: es.authorizerLm?.name || "Laboratory Manager",
        approvedDate: es.authorizerLm?.signedAt,
        effectiveDate: todayStr
      };

      updatedSop.details.history.push({
        action: "Final Approved",
        user: "System",
        timestamp: new Date().toLocaleString(),
        details: "SOP successfully approved. All required digital sign-offs are completed."
      });
    }

    const updatedList = sops.map(s => s.code === updatedSop.code ? updatedSop : s);
    localStorage.setItem("roms_local_sops", JSON.stringify(updatedList));
    onSopUpdate(updatedList);

    if (isFullyApproved) {
      setSelectedSopForReview(null);
      if (showSuccessMessage) {
        showSuccessMessage(`SOP ${updatedSop.code} has received all required digital signatures and is now officially APPROVED!`);
      } else {
        alert(`SOP ${updatedSop.code} has received all required digital signatures and is now officially APPROVED!`);
      }
      if (onSopApproved) {
        onSopApproved(updatedSop);
      }
    } else {
      setSelectedSopForReview(updatedSop);
      if (showSuccessMessage) {
        showSuccessMessage(`Sign-off recorded for ${role}. Awaiting other digital signatures.`);
      } else {
        alert(`Sign-off recorded for ${role}. Awaiting other digital signatures.`);
      }
    }
  };

  // Clarification request
  const handleRequestClarification = () => {
    if (!selectedSopForReview) return;

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
    if (showSuccessMessage) {
      showSuccessMessage("Status updated to 'Awaiting Author Response'.");
    } else {
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
    if (showSuccessMessage) {
      showSuccessMessage(`SOP ${updatedSop.code} returned for revision.`);
    } else {
      alert(`SOP ${updatedSop.code} returned for revision.`);
    }
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
      {/* ── SEARCH & FILTER PANEL (placed ABOVE buttons) ── */}
      <QMSFilterStrip
        sopType={sopType}
        onSopTypeChange={setSopType}
        sopStatus={sopStatus}
        onSopStatusChange={setSopStatus}
        availableTitles={availableTitles}
        selectedTitles={selectedTitles}
        onSelectedTitlesChange={setSelectedTitles}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onClear={() => {
          setSopType("All");
          setSopStatus("All");
          setSelectedTitles([]);
          setSearchText("");
        }}
      />

      {/* Left-aligned Side-by-Side Action Sub-Navigation Buttons */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            setReviewerSubTab("approved");
          }}
          style={{
            background: reviewerSubTab === "approved" ? "var(--color-primary)" : "var(--color-surface)",
            color: reviewerSubTab === "approved" ? "#ffffff" : "var(--color-text)",
            border: "1px solid var(--color-border)",
            padding: "7px 16px",
            borderRadius: "var(--radius-sm, 6px)",
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          ✅ Approved SOP
        </button>
        <button
          type="button"
          onClick={() => {
            setReviewerSubTab("review");
          }}
          style={{
            background: reviewerSubTab === "review" ? "var(--color-primary)" : "var(--color-surface)",
            color: reviewerSubTab === "review" ? "#ffffff" : "var(--color-text)",
            border: "1px solid var(--color-border)",
            padding: "7px 16px",
            borderRadius: "var(--radius-sm, 6px)",
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          🔎 Review SOP ({pendingReviewCount})
        </button>
      </div>

      {reviewerSubTab === "approved" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: selectedSopForReview ? "none" : "flex", flexDirection: "column", gap: 16 }}>

            {/* ── REVIEW QUEUE TABLE ── */}
            <div style={tableContainerStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ ...thStyle, width: 140 }}>SOP Code</th>
                    <th style={thStyle}>Title</th>
                    <th style={{ ...thStyle, width: 150 }}>SOP Type</th>
                    <th style={{ ...thStyle, width: 150 }}>Status</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 150 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
                        No approved SOPs found.
                      </td>
                    </tr>
                  ) : (
                    reviewQueue.map((sop) => {
                      let badgeStyle = { background: "#e2e8f0", color: "#475569" };
                      const statusUpper = sop.status.toUpperCase();
                      if (statusUpper === "UNDER REVIEW" || statusUpper === "REVIEW" || statusUpper === "SUBMITTED") {
                        badgeStyle = { background: "#ffedd5", color: "#c2410c" };
                      } else if (statusUpper === "PANEL REVIEW") {
                        badgeStyle = { background: "#f3e8ff", color: "#6b21a8" };
                      } else if (statusUpper === "AWAITING AUTHOR RESPONSE") {
                        badgeStyle = { background: "#fef3c7", color: "#d97706" };
                      } else if (statusUpper === "RETURNED") {
                        badgeStyle = { background: "#fee2e2", color: "#b91c1c" };
                      } else if (statusUpper === "APPROVED" || statusUpper === "ACTIVE" || statusUpper === "ACTIVE / APPROVED") {
                        badgeStyle = { background: "#dcfce7", color: "#15803d" };
                      }

                      return (
                        <tr key={sop.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                          <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.02em" }}>{sop.code}</td>
                          <td style={tdStyle}>{sop.title}</td>
                          <td style={tdStyle}>{sop.sopType || sop.sopSection || "Procedure SOP"}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", ...badgeStyle }}>
                              {sop.status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                              {(statusUpper === "APPROVED" || statusUpper === "ACTIVE" || statusUpper === "ACTIVE / APPROVED") ? (
                                <>
                                  <button
                                    onClick={() => setSelectedSopForReview(sop)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                                    title="View Details"
                                  >
                                    📖
                                  </button>
                                  <button
                                    onClick={() => onPrintRequest(sop)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                                    title="Download PDF"
                                  >
                                    🖨️
                                  </button>
                                  <button
                                    onClick={() => onShareRequest(sop)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                                    title="Share SOP"
                                  >
                                    🔗
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSelectedSopForReview(sop)}
                                  style={{ ...reviewBtnStyle, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", padding: 0, fontSize: "14px" }}
                                  title="Review SOP"
                                >
                                  🔍
                                </button>
                              )}
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
        </div>
      )}

      {reviewerSubTab === "review" && reviewQueue.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "36px" }}>🎉</span>
          <strong style={{ fontSize: "16px", color: "var(--color-text)" }}>All caught up!</strong>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)" }}>No SOPs currently in the review queue.</p>
        </div>
      )}

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

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {previousVersionSop && (
                  <button
                    onClick={() => setShowDiffView(!showDiffView)}
                    style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: showDiffView ? "var(--color-primary-soft)" : "transparent" }}
                  >
                    {showDiffView ? "📄 Exit Compare" : "📑 Compare Revisions"}
                  </button>
                )}

                {reviewerSubTab === "approved" ? (
                  <button
                    onClick={() => {
                      setSelectedSopForReview(null);
                      setShowDiffView(false);
                    }}
                    style={{ ...btnBaseStyle, border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-offset)" }}
                  >
                    Back to Approved List
                  </button>
                ) : (
                  /* Queue Navigation Controls */
                  reviewQueue.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => {
                          const idx = reviewQueue.findIndex(s => s.id === selectedSopForReview.id);
                          if (idx > 0) {
                            setSelectedSopForReview(reviewQueue[idx - 1]);
                            setShowDiffView(false);
                          }
                        }}
                        disabled={reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === 0}
                        style={{
                          ...btnBaseStyle,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-offset)",
                          color: reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === 0 ? "var(--color-text-faint)" : "var(--color-text)",
                          cursor: reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === 0 ? "not-allowed" : "pointer"
                        }}
                        title="Previous SOP"
                      >
                        ◀ Prev
                      </button>
                      
                      <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600 }}>
                        {reviewQueue.findIndex(s => s.id === selectedSopForReview.id) + 1} of {reviewQueue.length}
                      </span>

                      <button
                        onClick={() => {
                          const idx = reviewQueue.findIndex(s => s.id === selectedSopForReview.id);
                          if (idx < reviewQueue.length - 1) {
                            setSelectedSopForReview(reviewQueue[idx + 1]);
                            setShowDiffView(false);
                          }
                        }}
                        disabled={reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === reviewQueue.length - 1}
                        style={{
                          ...btnBaseStyle,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-offset)",
                          color: reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === reviewQueue.length - 1 ? "var(--color-text-faint)" : "var(--color-text)",
                          cursor: reviewQueue.findIndex(s => s.id === selectedSopForReview.id) === reviewQueue.length - 1 ? "not-allowed" : "pointer"
                        }}
                        title="Next SOP"
                      >
                        Next ▶
                      </button>

                      <select
                        value={selectedSopForReview.id}
                        onChange={(e) => {
                          const selected = reviewQueue.find(s => s.id === e.target.value);
                          if (selected) {
                            setSelectedSopForReview(selected);
                            setShowDiffView(false);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          fontSize: "11px",
                          borderRadius: "var(--radius-sm, 6px)",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)",
                          color: "var(--color-text)",
                          fontWeight: 600,
                          outline: "none"
                        }}
                      >
                        {reviewQueue.map(sop => (
                          <option key={sop.id} value={sop.id}>
                            {sop.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                )}
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

                    {getDiffSections(selectedSopForReview.sopType || selectedSopForReview.sopSection || "Procedure SOP").map((section, idx) => {
                      const curVal = selectedSopForReview.details?.[section.key];
                      const prevVal = previousVersionSop.details?.[section.key];

                      let curString = "";
                      let prevString = "";

                      if (section.textOnly) {
                        curString = curVal || "";
                        prevString = prevVal || "";
                      } else if (section.arrayType) {
                        const otherKey = section.key + "Other";
                        const otherValCur = selectedSopForReview.details?.[otherKey] || "";
                        const otherValPrev = previousVersionSop.details?.[otherKey] || "";

                        const formatArray = (arr: any, otherVal: string) => {
                          if (!Array.isArray(arr)) return arr || "";
                          return arr.map((x: string) => {
                            if ((x === "Other" || x === "Other (specify)") && otherVal) {
                              return `${x}: ${otherVal}`;
                            }
                            return x;
                          }).join(", ");
                        };

                        curString = formatArray(curVal, otherValCur);
                        prevString = formatArray(prevVal, otherValPrev);
                      } else if (section.gridType) {
                        curString = formatGridToString(curVal, section.gridType);
                        prevString = formatGridToString(prevVal, section.gridType);
                      }

                      if (curString.trim() === "" && prevString.trim() === "") return null;

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
                          ["Assay Category", selectedSopForReview.details?.assayCategory || selectedSopForReview.sopSection],
                          ["Method Family", selectedSopForReview.details?.methodFamily || "N/A"],
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

                    {/* Revision & Amendment History */}
                    {(selectedSopForReview.details?.annualReviews || selectedSopForReview.details?.versionHistory || selectedSopForReview.details?.amendmentLog) && (
                      <div style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden", marginTop: 16 }}>
                        <div style={{ background: "var(--color-surface)", padding: "8px 12px", fontSize: "12px", fontWeight: 700 }}>
                          📜 Revision & Amendment History
                        </div>
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 16 }}>

                          {/* Table A */}
                          {selectedSopForReview.details?.annualReviews && selectedSopForReview.details.annualReviews.length > 0 && (
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>A. Annual Review of Document</div>
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                  <thead>
                                    <tr style={{ background: "var(--color-surface-2)", borderBottom: "1.5px solid var(--color-border)" }}>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Revision No.</th>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Review Date</th>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Reviewed By (Name)</th>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Reviewed By (Sig.)</th>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approved By (Name)</th>
                                      <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Approved By (Sig.)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedSopForReview.details.annualReviews.map((rev: any, idx: number) => (
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
                          {selectedSopForReview.details?.versionHistory && selectedSopForReview.details.versionHistory.length > 0 && (
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>B. Version History</div>
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                  <thead>
                                    <tr style={{ background: "var(--color-surface-2)", borderBottom: "1.5px solid var(--color-border)" }}>
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
                                    {selectedSopForReview.details.versionHistory.map((rev: any, idx: number) => (
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
                          {selectedSopForReview.details?.amendmentLog && selectedSopForReview.details.amendmentLog.length > 0 && (
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 6 }}>C. Amendment</div>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                <thead>
                                  <tr style={{ background: "var(--color-surface-2)", borderBottom: "1.5px solid var(--color-border)" }}>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>S.N</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Version No.</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Effective Date</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Changes/Comments</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSopForReview.details.amendmentLog.map((rev: any, idx: number) => (
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
                      </div>
                    )}

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
                    {getReviewSections(selectedSopForReview.sopType || selectedSopForReview.sopSection || "Procedure SOP", selectedSopForReview.details).map((sec, sidx) => {
                      if (sec.render) {
                        const renderedResult = sec.render();
                        if (!renderedResult) return null;
                        return (
                          <div key={sidx} style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 16 }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#031755", fontFamily: "Times New Roman", textTransform: "uppercase" }}>
                              {sec.label}
                            </h3>
                            {renderedResult}
                          </div>
                        );
                      }

                      const hasVal = sec.text || (sec.data && Array.isArray(sec.data) && sec.data.some((r: any) => Object.values(r).some(v => v)));
                      if (!hasVal) return null;

                      return (
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

                          {sec.data && sec.grid && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)", marginTop: "6px" }}>
                              <thead>
                                <tr style={{ background: "var(--color-surface-2)" }}>
                                  {sec.grid.map((col: any, cidx: number) => (
                                    <th key={cidx} style={{ padding: "6px 10px", border: "1px solid var(--color-border)", textAlign: "left", fontWeight: "bold" }}>{col.h}</th>
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

                {/* Panel Review Approvals Section */}
                {(() => {
                  const todayStr = new Date().toLocaleDateString();
                  const es = selectedSopForReview.details?.electronicSignatures || {
                    author: { name: selectedSopForReview.author || "Author", signedAt: selectedSopForReview.lastUpdated || todayStr },
                    verifierUser: { name: selectedSopForReview.details?.proposedVerifier || "Verifier User", signedAt: "" },
                    verifierQo: { name: "QA Officer", signedAt: "" },
                    authorizerLm: { name: selectedSopForReview.details?.proposedAuthorizer || "Laboratory Manager", signedAt: "" }
                  };
                  const isReviewable = ["UNDER REVIEW", "REVIEW", "SUBMITTED", "PANEL REVIEW"].includes(selectedSopForReview.status.toUpperCase());
                  const isApproved = ["APPROVED", "ACTIVE", "ACTIVE / APPROVED"].includes(selectedSopForReview.status.toUpperCase());

                  if (!isReviewable && !isApproved) return null;

                  return (
                    <div style={{ border: "1px solid var(--color-primary)", borderRadius: 6, padding: 12, background: "var(--color-primary-soft)", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                      <h4 style={{ margin: 0, fontSize: "12.5px", fontWeight: "bold", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                        🖋️ Digital Sign-off & Verifications
                      </h4>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "11px" }}>
                        {/* Author */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>Author:</span> <em style={{ color: "var(--color-text-muted)" }}>{es.author?.name}</em>
                          </div>
                          <span style={{ color: "#16a34a", fontWeight: "bold" }}>🟢 Signed {es.author?.signedAt}</span>
                        </div>

                        {/* Verifier User */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>Verifier (User):</span> <em style={{ color: "var(--color-text-muted)" }}>{es.verifierUser?.name}</em>
                          </div>
                          {es.verifierUser?.signedAt ? (
                            <span style={{ color: "#16a34a", fontWeight: "bold" }}>🟢 Verified {es.verifierUser?.signedAt}</span>
                          ) : (
                            <span style={{ color: "#d97706", fontWeight: "bold" }}>⏳ Awaiting Sign-off</span>
                          )}
                        </div>

                        {/* Verifier QO */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 4 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>Verifier (QO):</span> <em style={{ color: "var(--color-text-muted)" }}>{es.verifierQo?.name}</em>
                          </div>
                          {es.verifierQo?.signedAt ? (
                            <span style={{ color: "#16a34a", fontWeight: "bold" }}>🟢 Verified {es.verifierQo?.signedAt}</span>
                          ) : (
                            <span style={{ color: "#d97706", fontWeight: "bold" }}>⏳ Awaiting Sign-off</span>
                          )}
                        </div>

                        {/* Authorizer LM */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>Authorizer (LM):</span> <em style={{ color: "var(--color-text-muted)" }}>{es.authorizerLm?.name}</em>
                          </div>
                          {es.authorizerLm?.signedAt ? (
                            <span style={{ color: "#16a34a", fontWeight: "bold" }}>🟢 Authorized {es.authorizerLm?.signedAt}</span>
                          ) : (
                            <span style={{ color: "#d97706", fontWeight: "bold" }}>⏳ Awaiting Sign-off</span>
                          )}
                        </div>
                      </div>

                      {isReviewable && (
                        <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 6, paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                          {selectedSopForReview.status.toUpperCase() === "PANEL REVIEW" ? (
                            // UNLOCKED: SOP is in Panel Review — sign-offs are allowed
                            (() => {
                              const currentEs = selectedSopForReview.details?.electronicSignatures;
                              const userVerified = !!currentEs?.verifierUser?.signedAt;
                              const qoVerified = !!currentEs?.verifierQo?.signedAt;
                              const bothVerifiersSigned = userVerified && qoVerified;
                              const isAuthorizerSelected = panelRole === "Authorizer (LM)";
                              const authorizerBlocked = isAuthorizerSelected && !bothVerifiersSigned;

                              return (
                                <>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-primary)" }}>SIGN OFF AS ROLE:</label>
                                    <select
                                      value={panelRole}
                                      onChange={(e) => setPanelRole(e.target.value)}
                                      style={{ ...selectStyle, width: "100%", padding: "6px", background: "#ffffff", borderColor: "var(--color-primary)" }}
                                    >
                                      <option value="Verifier (User)" disabled={userVerified}>
                                        Verifier (User) - compliance with practice{userVerified ? " ✅" : ""}
                                      </option>
                                      <option value="Verifier (QO)" disabled={qoVerified}>
                                        Verifier (QO) - compliance with standard{qoVerified ? " ✅" : ""}
                                      </option>
                                      <option value="Authorizer (LM)" disabled={!bothVerifiersSigned}>
                                        Authorizer (LM) - line manager approval{!bothVerifiersSigned ? " 🔒" : ""}
                                      </option>
                                    </select>
                                  </div>

                                  {authorizerBlocked && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px", background: "#fef3c7", border: "1px dashed #f59e0b", borderRadius: 6 }}>
                                      <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#b45309" }}>
                                        ⏳ Awaiting Verifier Sign-offs
                                      </span>
                                      <span style={{ fontSize: "10px", color: "#78350f", lineHeight: 1.4 }}>
                                        Authorizer (LM) can only sign off after both {!userVerified && <strong>Verifier (User)</strong>}{!userVerified && !qoVerified && " and "}{!qoVerified && <strong>Verifier (QO)</strong>} {!userVerified && !qoVerified ? "have" : "has"} signed.
                                      </span>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => handlePanelSignoff(panelRole)}
                                    disabled={authorizerBlocked}
                                    style={{
                                      ...btnBaseStyle,
                                      width: "100%",
                                      background: authorizerBlocked ? "#d1d5db" : "var(--color-primary)",
                                      color: authorizerBlocked ? "#9ca3af" : "#ffffff",
                                      padding: "8px",
                                      justifyContent: "center",
                                      cursor: authorizerBlocked ? "not-allowed" : "pointer"
                                    }}
                                  >
                                    🖋️ Sign-off & Approve
                                  </button>
                                </>
                              );
                            })()
                          ) : (
                            // LOCKED: SOP must be sent to Panel Review first
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px", background: "#fef3c7", border: "1px dashed #f59e0b", borderRadius: 6 }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
                                🔒 Sign-off Locked
                              </span>
                              <span style={{ fontSize: "10.5px", color: "#78350f", lineHeight: 1.5 }}>
                                Digital sign-offs are only available after the document has been formally sent to <strong>Panel Review</strong>. Click the <strong>"👥 Send for Panel Review"</strong> button above to unlock sign-offs.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                {/* Review Decision Action Buttons — relocated below post comment section */}
                {selectedSopForReview.status.toUpperCase() !== "APPROVED" &&
                  selectedSopForReview.status.toUpperCase() !== "ACTIVE" &&
                  selectedSopForReview.status.toUpperCase() !== "ACTIVE / APPROVED" && (
                    <div style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: 12, background: "var(--color-surface)", display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                        ⚡ REVIEW DECISION & ACTIONS:
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          onClick={handleRequestClarification}
                          style={{ ...btnBaseStyle, width: "100%", justifyContent: "center", border: "1px solid #f59e0b", color: "#b45309", background: "#fffbeb", padding: "8px" }}
                        >
                          ❓ Ask Clarification
                        </button>
                        <button
                          onClick={() => setShowReturnModal(true)}
                          style={{ ...btnBaseStyle, width: "100%", justifyContent: "center", background: "#ef4444", color: "#ffffff", padding: "8px" }}
                        >
                          ↩️ Return for Revision
                        </button>
                        {selectedSopForReview.status.toUpperCase() !== "PANEL REVIEW" ? (
                          <button
                            onClick={handleSendToPanelReview}
                            style={{ ...btnBaseStyle, width: "100%", justifyContent: "center", background: "#10b981", color: "#ffffff", padding: "8px" }}
                          >
                            👥 Send for Panel Review
                          </button>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "11px", fontWeight: 700, color: "#7b1fa2", background: "#f3e5f5", padding: "8px", borderRadius: "var(--radius-sm)" }}>
                            👥 In Panel Review
                          </span>
                        )}
                      </div>
                    </div>
                  )}

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
  gap: "8px",
  alignItems: "center",
  background: "var(--color-surface)",
  padding: "8px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  borderTop: "2.5px solid #0d9488",
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
  width: "100%",
  display: "flex",
  flexDirection: "column",
  background: "transparent",
  padding: "0"
};

const modalContainerStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-lg)",
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
