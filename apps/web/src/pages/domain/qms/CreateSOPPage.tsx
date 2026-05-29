import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Custom Circle Option Dropdown (Single-select)
interface CircleDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  hasOther?: boolean;
  otherValue?: string;
  onOtherChange?: (val: string) => void;
}

const CircleDropdown: React.FC<CircleDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  hasOther = false,
  otherValue = "",
  onOtherChange = () => { },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const isOtherSelected = hasOther && value === "Other (specify)";

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", width: "100%" }}>
      <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "10px 14px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          color: value ? "var(--color-text)" : "var(--color-text-faint)",
          fontSize: "var(--fs-sm)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          outline: "none",
          minHeight: 40,
        }}
      >
        <span>{value || "Select option"}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            marginTop: 4,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            maxHeight: 240,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--color-text)",
                  background: isSelected ? "var(--color-primary-highlight)" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: isSelected ? "4px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    background: isSelected ? "transparent" : "var(--color-surface-2)",
                  }}
                />
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {isOtherSelected && (
        <input
          type="text"
          placeholder="Please specify other details..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          required
          style={{
            marginTop: 4,
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "var(--fs-sm)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
};

// Custom Rectangle Multiple Option Dropdown (Multi-select)
interface RectangleMultiselectProps {
  label: string;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  hasOther?: boolean;
  otherValue?: string;
  onOtherChange?: (val: string) => void;
}

const RectangleMultiselect: React.FC<RectangleMultiselectProps> = ({
  label,
  selectedValues,
  onChange,
  options,
  hasOther = false,
  otherValue = "",
  onOtherChange = () => { },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const isOtherSelected = hasOther && selectedValues.includes("Other (specify)");

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", width: "100%" }}>
      <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          color: "var(--color-text)",
          fontSize: "var(--fs-sm)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          outline: "none",
          minHeight: 40,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: "90%" }}>
          {selectedValues.length === 0 ? (
            <span style={{ color: "var(--color-text-faint)" }}>Select multiple options</span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                style={{
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(val);
                }}
              >
                {val}
                <span style={{ fontSize: "9px" }}>✕</span>
              </span>
            ))
          )}
        </div>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            marginTop: 4,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            maxHeight: 280,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {options.map((opt) => {
            const isSelected = selectedValues.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => handleToggle(opt)}
                style={{
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--color-text)",
                  background: isSelected ? "var(--color-surface-offset)" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "1.5px solid var(--color-border)",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    background: isSelected ? "var(--color-primary)" : "var(--color-surface-2)",
                    borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                    color: "#ffffff",
                    fontSize: "8px",
                    fontWeight: "bold",
                  }}
                >
                  {isSelected && "✓"}
                </div>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {isOtherSelected && (
        <input
          type="text"
          placeholder="Please specify other details..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          required
          style={{
            marginTop: 4,
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "var(--fs-sm)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
};

// Generate SOP Version list: 1.0 to 5.1
const SOP_VERSION_OPTIONS: string[] = [];
for (let major = 1; major <= 5; major++) {
  for (let minor = 0; minor <= 9; minor++) {
    if (major === 5 && minor > 1) break;
    SOP_VERSION_OPTIONS.push(`${major}.${minor}`);
  }
}

export default function CreateSOPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("edit");

  const formRef = useRef<HTMLFormElement>(null);
  const [activeSection, setActiveSection] = useState("A");

  // A. SOP Identification
  const [enteredBy, setEnteredBy] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [sopCode, setSopCode] = useState("");
  const [sopVersion, setSopVersion] = useState("1.0");
  const [supersedes, setSupersedes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [sopStatus, setSopStatus] = useState("Draft");
  const [owningSite, setOwningSite] = useState("AHRI – Addis Ababa");
  const [owningSiteOther, setOwningSiteOther] = useState("");
  const [owningLabUnit, setOwningLabUnit] = useState("MNTD Molecular Lab");
  const [assayCategory, setAssayCategory] = useState("Sample collection / preparation");
  const [methodFamily, setMethodFamily] = useState("Conventional PCR");
  const [methodFamilyOther, setMethodFamilyOther] = useState("");

  // B. Revision & Amendment History
  const [revisionNumber, setRevisionNumber] = useState("");
  const [revisionDate, setRevisionDate] = useState("");
  const [revisionSummary, setRevisionSummary] = useState("");
  const [revisionRationale, setRevisionRationale] = useState("");

  // C. Purpose, Scope & Background
  const [purpose, setPurpose] = useState("");
  const [scopeCovers, setScopeCovers] = useState("");
  const [scopeExcluded, setScopeExcluded] = useState("");
  const [background, setBackground] = useState("");

  // D. Definitions & Abbreviations
  const [definitions, setDefinitions] = useState("");
  const [abbreviations, setAbbreviations] = useState("");

  // E. Responsibility & Accountability
  const [rolesInvolved, setRolesInvolved] = useState<string[]>([]);
  const [rolesInvolvedOther, setRolesInvolvedOther] = useState("");
  const [responsibilityNarrative, setResponsibilityNarrative] = useState("");

  // F. Principle of the Method
  const [principleBasis, setPrincipleBasis] = useState("");

  // G. Samples / Specimens Covered
  const [sampleMatrices, setSampleMatrices] = useState<string[]>([]);
  const [sampleMatricesOther, setSampleMatricesOther] = useState("");
  const [inputMaterialTypes, setInputMaterialTypes] = useState<string[]>([]);
  const [inputMaterialTypesOther, setInputMaterialTypesOther] = useState("");
  const [volumeRequired, setVolumeRequired] = useState("");
  const [sampleAcceptanceCriteria, setSampleAcceptanceCriteria] = useState("");
  const [sampleRejectionCriteria, setSampleRejectionCriteria] = useState("");

  // H. Reagents & Supplies
  const [reagentsSuppliesNarrative, setReagentsSuppliesNarrative] = useState("");
  const [reagentsSuppliesList, setReagentsSuppliesList] = useState("");

  // I. Equipment & Instruments
  const [primaryEquipment, setPrimaryEquipment] = useState<string[]>([]);
  const [primaryEquipmentOther, setPrimaryEquipmentOther] = useState("");
  const [equipmentList, setEquipmentList] = useState("");

  // J. Environmental & Safety Controls
  const [ppeRequired, setPpeRequired] = useState<string[]>([]);
  const [ppeRequiredOther, setPpeRequiredOther] = useState("");
  const [biosafetyLevel, setBiosafetyLevel] = useState("BSL-1");
  const [hazardsRelevant, setHazardsRelevant] = useState<string[]>([]);
  const [hazardsRelevantOther, setHazardsRelevantOther] = useState("");
  const [wasteHandling, setWasteHandling] = useState("");
  const [additionalSafetyControls, setAdditionalSafetyControls] = useState("");

  // K. Quality Control
  const [controlsIncluded, setControlsIncluded] = useState<string[]>([]);
  const [controlsIncludedOther, setControlsIncludedOther] = useState("");
  const [qcMethods, setQcMethods] = useState<string[]>([]);
  const [qcMethodsOther, setQcMethodsOther] = useState("");
  const [qcAcceptanceCriteria, setQcAcceptanceCriteria] = useState("");
  const [qcNarrative, setQcNarrative] = useState("");

  // L. Stepwise Procedure
  const [procedureNarrative, setProcedureNarrative] = useState("");
  const [procedureStepsList, setProcedureStepsList] = useState("");

  // M. Calculation / Data Analysis
  const [calculationsFormulas, setCalculationsFormulas] = useState("");
  const [softwareTools, setSoftwareTools] = useState("");
  const [interpretationRules, setInterpretationRules] = useState("");

  // N. Result Reporting & Interpretation
  const [reportingFormat, setReportingFormat] = useState("");
  const [cutOffsThresholds, setCutOffsThresholds] = useState("");
  const [limsDatabaseMapping, setLimsDatabaseMapping] = useState("");
  const [resultReportingNarrative, setResultReportingNarrative] = useState("");

  // P. Storage & Transport Requirements
  const [storageSampleTypes, setStorageSampleTypes] = useState<string[]>([]);
  const [recommendedTemp, setRecommendedTemp] = useState("Room temperature");
  const [maxStorageDuration, setMaxStorageDuration] = useState("");
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [storageTransportNarrative, setStorageTransportNarrative] = useState("");

  // Q. References & Attachments
  const [referencesText, setReferencesText] = useState("");
  const [originalSopFile, setOriginalSopFile] = useState<File | null>(null);
  const [supplementaryFile, setSupplementaryFile] = useState<File | null>(null);
  const [workflowFile, setWorkflowFile] = useState<File | null>(null);

  // R. Document Control & Sign-off
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByRole, setPreparedByRole] = useState("");
  const [preparedDate, setPreparedDate] = useState("");
  const [reviewedByName, setReviewedByName] = useState("");
  const [reviewedByRole, setReviewedByRole] = useState("");
  const [reviewedDate, setReviewedDate] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedByRole, setApprovedByRole] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [controlledCopyNumber, setControlledCopyNumber] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [finalComments, setFinalComments] = useState("");

  // Detect Edit Mode & Load Data
  useEffect(() => {
    if (editCode) {
      try {
        const saved = localStorage.getItem("roms_local_sops");
        if (saved) {
          const list = JSON.parse(saved);
          const item = list.find((s: any) => s.code === editCode);
          if (item) {
            setSopCode(item.code || "");
            setSopTitle(item.title || "");
            setSopVersion(item.version || "1.0");
            setSopStatus(item.status || "Draft");
            setAssayCategory(item.sopSection || "");
            setOwningLabUnit(item.sopSubSection || "");

            const details = item.details || {};
            setEnteredBy(item.author || "");
            setSupersedes(details.supersedes || "");
            setEffectiveDate(details.effectiveDate || "");
            setNextReviewDate(details.nextReviewDate || "");

            const siteStr = details.owningSite || "";
            if (siteStr.startsWith("Other: ")) {
              setOwningSite("Other (specify)");
              setOwningSiteOther(siteStr.replace("Other: ", ""));
            } else {
              setOwningSite(siteStr || "AHRI – Addis Ababa");
            }

            const familyStr = details.methodFamily || "";
            if (familyStr.startsWith("Other: ")) {
              setMethodFamily("Other (specify)");
              setMethodFamilyOther(familyStr.replace("Other: ", ""));
            } else {
              setMethodFamily(familyStr || "Conventional PCR");
            }

            const rev = details.revision || {};
            setRevisionNumber(rev.revisionNumber || "");
            setRevisionDate(rev.revisionDate || "");
            setRevisionSummary(rev.revisionSummary || "");
            setRevisionRationale(rev.revisionRationale || "");

            const ps = details.purposeScope || {};
            setPurpose(ps.purpose || "");
            setScopeCovers(ps.scopeCovers || "");
            setScopeExcluded(ps.scopeExcluded || "");
            setBackground(ps.background || "");

            const defs = details.definitions || {};
            setDefinitions(defs.definitions || "");
            setAbbreviations(defs.abbreviations || "");

            const resp = details.responsibility || {};
            const roles: string[] = resp.roles || [];
            const normalRoles = roles.map(r => {
              if (r.startsWith("Other: ")) {
                setRolesInvolvedOther(r.replace("Other: ", ""));
                return "Other (specify)";
              }
              return r;
            });
            setRolesInvolved(normalRoles);
            setResponsibilityNarrative(resp.responsibilityNarrative || "");

            setPrincipleBasis(details.principle || "");

            const sm = details.samples || {};
            const mats: string[] = sm.matrices || [];
            const normalMats = mats.map(m => {
              if (m.startsWith("Other: ")) {
                setSampleMatricesOther(m.replace("Other: ", ""));
                return "Other (specify)";
              }
              return m;
            });
            setSampleMatrices(normalMats);

            const inputs: string[] = sm.inputMaterials || [];
            const normalInputs = inputs.map(i => {
              if (i.startsWith("Other: ")) {
                setInputMaterialTypesOther(i.replace("Other: ", ""));
                return "Other (specify)";
              }
              return i;
            });
            setInputMaterialTypes(normalInputs);
            setVolumeRequired(sm.volumeRequired || "");
            setSampleAcceptanceCriteria(sm.acceptance || "");
            setSampleRejectionCriteria(sm.rejection || "");

            const rg = details.reagents || {};
            setReagentsSuppliesNarrative(rg.narrative || "");
            setReagentsSuppliesList(rg.list || "");

            const eq = details.equipment || {};
            const equips: string[] = eq.primary || [];
            const normalEquips = equips.map(e => {
              if (e.startsWith("Other: ")) {
                setPrimaryEquipmentOther(e.replace("Other: ", ""));
                return "Other (specify)";
              }
              return e;
            });
            setPrimaryEquipment(normalEquips);
            setEquipmentList(eq.list || "");

            const sf = details.safety || {};
            const ppes: string[] = sf.ppe || [];
            const normalPpes = ppes.map(p => {
              if (p.startsWith("Other: ")) {
                setPpeRequiredOther(p.replace("Other: ", ""));
                return "Other (specify)";
              }
              return p;
            });
            setPpeRequired(normalPpes);
            setBiosafetyLevel(sf.level || "BSL-1");

            const haz: string[] = sf.hazards || [];
            const normalHaz = haz.map(h => {
              if (h.startsWith("Other: ")) {
                setHazardsRelevantOther(h.replace("Other: ", ""));
                return "Other (specify)";
              }
              return h;
            });
            setHazardsRelevant(normalHaz);
            setWasteHandling(sf.waste || "");
            setAdditionalSafetyControls(sf.additional || "");

            const qc = details.qualityControl || {};
            const ctrls: string[] = qc.controls || [];
            const normalCtrls = ctrls.map(c => {
              if (c.startsWith("Other: ")) {
                setControlsIncludedOther(c.replace("Other: ", ""));
                return "Other (specify)";
              }
              return c;
            });
            setControlsIncluded(normalCtrls);

            const qcm: string[] = qc.methods || [];
            const normalQcm = qcm.map(q => {
              if (q.startsWith("Other: ")) {
                setQcMethodsOther(q.replace("Other: ", ""));
                return "Other (specify)";
              }
              return q;
            });
            setQcMethods(normalQcm);
            setQcAcceptanceCriteria(qc.acceptance || "");
            setQcNarrative(qc.narrative || "");

            const pr = details.procedure || {};
            setProcedureNarrative(pr.narrative || "");
            setProcedureStepsList(pr.steps || "");

            const calc = details.calculation || {};
            setCalculationsFormulas(calc.formulas || "");
            setSoftwareTools(calc.software || "");
            setInterpretationRules(calc.thresholds || "");

            const rr = details.resultReporting || {};
            setReportingFormat(rr.format || "");
            setCutOffsThresholds(rr.thresholds || "");
            setLimsDatabaseMapping(rr.lims || "");
            setResultReportingNarrative(rr.narrative || "");

            const st = details.storage || {};
            setStorageSampleTypes(st.types || []);
            setRecommendedTemp(st.temp || "Room temperature");
            setMaxStorageDuration(st.duration || "");
            setTransportModes(st.transport || []);
            setStorageTransportNarrative(st.narrative || "");

            setReferencesText(details.references || "");

            const sig = details.signoff || {};
            setPreparedByName(sig.preparedByName || "");
            setPreparedByRole(sig.preparedByRole || "");
            setPreparedDate(sig.preparedDate || "");
            setReviewedByName(sig.reviewedByName || "");
            setReviewedByRole(sig.reviewedByRole || "");
            setReviewedDate(sig.reviewedDate || "");
            setApprovedByName(sig.approvedByName || "");
            setApprovedByRole(sig.approvedByRole || "");
            setApprovedDate(sig.approvedDate || "");
            setControlledCopyNumber(sig.controlledCopyNumber || "");
            setDistributionList(sig.distributionList || "");
            setFinalComments(sig.finalComments || "");
          }
        }
      } catch (e) {
        console.error("Error loading SOP for editing:", e);
      }
    }
  }, [editCode]);

  // Save drafts and submit actions
  const saveSOPToLocalStorage = (statusToSave: string) => {
    if (!sopCode || !sopTitle) {
      alert("SOP Code and SOP Title are required to save draft or submit!");
      return false;
    }

    const newSopItem = {
      id: editCode ? `sop-local-${editCode}` : `sop-local-${Date.now()}`,
      code: sopCode,
      title: sopTitle,
      sopSection: assayCategory,
      sopSubSection: owningLabUnit,
      version: sopVersion,
      status: statusToSave,
      author: preparedByName || enteredBy || "Data Steward",
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      details: {
        supersedes,
        effectiveDate,
        nextReviewDate,
        owningSite: owningSite === "Other (specify)" ? `Other: ${owningSiteOther}` : owningSite,
        methodFamily: methodFamily === "Other (specify)" ? `Other: ${methodFamilyOther}` : methodFamily,
        revision: {
          revisionNumber,
          revisionDate,
          revisionSummary,
          revisionRationale
        },
        purposeScope: {
          purpose,
          scopeCovers,
          scopeExcluded,
          background
        },
        definitions: {
          definitions,
          abbreviations
        },
        responsibility: {
          roles: rolesInvolved.map(r => r === "Other (specify)" ? `Other: ${rolesInvolvedOther}` : r),
          responsibilityNarrative
        },
        principle: principleBasis,
        samples: {
          matrices: sampleMatrices.map(s => s === "Other (specify)" ? `Other: ${sampleMatricesOther}` : s),
          inputMaterials: inputMaterialTypes.map(i => i === "Other (specify)" ? `Other: ${inputMaterialTypesOther}` : i),
          volumeRequired,
          acceptance: sampleAcceptanceCriteria,
          rejection: sampleRejectionCriteria
        },
        reagents: {
          narrative: reagentsSuppliesNarrative,
          list: reagentsSuppliesList
        },
        equipment: {
          primary: primaryEquipment.map(e => e === "Other (specify)" ? `Other: ${primaryEquipmentOther}` : e),
          list: equipmentList
        },
        safety: {
          ppe: ppeRequired.map(p => p === "Other (specify)" ? `Other: ${ppeRequiredOther}` : p),
          level: biosafetyLevel,
          hazards: hazardsRelevant.map(h => h === "Other (specify)" ? `Other: ${hazardsRelevantOther}` : h),
          waste: wasteHandling,
          additional: additionalSafetyControls
        },
        qualityControl: {
          controls: controlsIncluded.map(c => c === "Other (specify)" ? `Other: ${controlsIncludedOther}` : c),
          methods: qcMethods.map(q => q === "Other (specify)" ? `Other: ${qcMethodsOther}` : q),
          acceptance: qcAcceptanceCriteria,
          narrative: qcNarrative
        },
        procedure: {
          narrative: procedureNarrative,
          steps: procedureStepsList
        },
        calculation: {
          formulas: calculationsFormulas,
          software: softwareTools,
          thresholds: interpretationRules
        },
        resultReporting: {
          format: reportingFormat,
          thresholds: cutOffsThresholds,
          lims: limsDatabaseMapping,
          narrative: resultReportingNarrative
        },
        storage: {
          types: storageSampleTypes,
          temp: recommendedTemp,
          duration: maxStorageDuration,
          transport: transportModes,
          narrative: storageTransportNarrative
        },
        references: referencesText,
        signoff: {
          preparedByName,
          preparedByRole,
          preparedDate,
          reviewedByName,
          reviewedByRole,
          reviewedDate,
          approvedByName,
          approvedByRole,
          approvedDate,
          controlledCopyNumber,
          distributionList,
          finalComments
        }
      }
    };

    try {
      const existing = localStorage.getItem("roms_local_sops");
      const list = existing ? JSON.parse(existing) : [];
      // Remove any existing one with the same code or previous code (editCode) to overwrite
      const codeToFilter = editCode || sopCode;
      const filtered = list.filter((item: any) => item.code !== codeToFilter);
      localStorage.setItem("roms_local_sops", JSON.stringify([newSopItem, ...filtered]));
      return true;
    } catch (e) {
      console.error(e);
      alert("Failed to save SOP data to storage.");
      return false;
    }
  };

  const handleSaveDraft = () => {
    const success = saveSOPToLocalStorage("DRAFT");
    if (success) {
      alert("SOP Draft saved successfully!");
      navigate("/domains/qms");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = saveSOPToLocalStorage(sopStatus || "Under review");
    if (success) {
      alert("SOP Submitted successfully!");
      navigate("/domains/qms");
    }
  };

  // List of sections for the left sidebar
  const sections = [
    { id: "A", label: "A. SOP Identification" },
    { id: "B", label: "B. Revision & History" },
    { id: "C", label: "C. Purpose & Scope" },
    { id: "D", label: "D. Definitions" },
    { id: "E", label: "E. Responsibility" },
    { id: "F", label: "F. Method Principle" },
    { id: "G", label: "G. Samples & Specimens" },
    { id: "H", label: "H. Reagents & Supplies" },
    { id: "I", label: "I. Equipment & Instruments" },
    { id: "J", label: "J. Safety Controls" },
    { id: "K", label: "K. Quality Control" },
    { id: "L", label: "L. Stepwise Procedure" },
    { id: "M", label: "M. Calculation & Analysis" },
    { id: "N", label: "N. Result Reporting" },
    { id: "P", label: "P. Storage & Transport" },
    { id: "Q", label: "Q. References & Files" },
    { id: "R", label: "R. Control & Sign-off" }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }}>
      {/* LEFT SIDEBAR INDEX */}
      <div
        style={{
          width: 250,
          minWidth: 250,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/domains/qms")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 20,
            padding: "4px 8px",
            textAlign: "left",
          }}
        >
          ← Back to QMS List
        </button>

        <h3
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            margin: "0 0 12px 8px",
          }}
        >
          SOP Sections
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: isActive ? "var(--color-primary-highlight)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  fontSize: "var(--fs-sm)",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FORM WORKSPACE CONTAINER */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* HEADER BLOCK (Compact, Minimalist) */}
        <div
          style={{
            padding: "10px 24px",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              AHRI MNTD – Standard Operating Procedure (SOP) Intake
            </h1>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: 0 }}>
              Fill in all fields to complete Full SOP documentation.
            </p>
          </div>
        </div>

        {/* FORM MAIN SCROLL */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            padding: "32px 40px 100px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* SECTION A. SOP Identification */}
          <div id="section-A" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              A. SOP Identification
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Entered by (data steward) *</label>
                <input type="text" required placeholder="Name of data steward" value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Title *</label>
                <input type="text" required placeholder="Full title of the SOP" value={sopTitle} onChange={(e) => setSopTitle(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Code / number *</label>
                <input type="text" required placeholder="e.g. SOP-MNTD-042" value={sopCode} onChange={(e) => setSopCode(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <CircleDropdown
                label="SOP version *"
                value={sopVersion}
                onChange={setSopVersion}
                options={SOP_VERSION_OPTIONS}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Supersedes (previous SOP code/version)</label>
                <input type="text" placeholder="e.g. SOP-MNTD-030 v1.2" value={supersedes} onChange={(e) => setSupersedes(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Effective Date *</label>
                <input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Next review date *</label>
                <input type="date" required value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <CircleDropdown
                label="SOP status *"
                value={sopStatus}
                onChange={setSopStatus}
                options={["Draft", "Under review", "Active / Approved", "Superseded", "Retired / Archived"]}
              />

              <CircleDropdown
                label="Owning site / institution *"
                value={owningSite}
                onChange={setOwningSite}
                options={["AHRI – Addis Ababa", "AHRI – Field Site", "Partner Laboratory", "Other (specify)"]}
                hasOther={true}
                otherValue={owningSiteOther}
                onOtherChange={setOwningSiteOther}
              />

              <CircleDropdown
                label="Owning Laboratory Unit *"
                value={owningLabUnit}
                onChange={setOwningLabUnit}
                options={["MNTD Molecular Lab", "MNTD Serology Lab", "MNTD Vector Entomology Lab", "MNTD NGS / Sequencing Lab", "Field laboratory"]}
              />

              <CircleDropdown
                label="Assay Category (cascading parent) *"
                value={assayCategory}
                onChange={setAssayCategory}
                options={[
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
                ]}
              />

              <CircleDropdown
                label="Method Family *"
                value={methodFamily}
                onChange={setMethodFamily}
                options={[
                  "Conventional PCR",
                  "Real-time qPCR",
                  "Digital PCR",
                  "Next-generation sequencing",
                  "Immunoassay / serology",
                  "Nucleic-acid extraction",
                  "Sample collection / preparation",
                  "Vector / entomology",
                  "Equipment SOP",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={methodFamilyOther}
                onOtherChange={setMethodFamilyOther}
              />
            </div>
          </div>

          {/* SECTION B. Revision & Amendment History */}
          <div id="section-B" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              B. Revision & Amendment History
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Revision Number</label>
                <input type="text" placeholder="e.g. Rev 1" value={revisionNumber} onChange={(e) => setRevisionNumber(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Revision Date</label>
                <input type="date" value={revisionDate} onChange={(e) => setRevisionDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Summary of changes from previous version</label>
                <textarea rows={3} placeholder="Describe the changes made in this revision..." value={revisionSummary} onChange={(e) => setRevisionSummary(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Rationale for change</label>
                <textarea rows={3} placeholder="Explain the reasons/necessity for making this change..." value={revisionRationale} onChange={(e) => setRevisionRationale(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION C. Purpose, Scope & Background */}
          <div id="section-C" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              C. Purpose, Scope & Background
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Purpose (verbatim) *</label>
                <textarea rows={4} required placeholder="State the purpose of this SOP exactly as described in the official document..." value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Scope – what this SOP covers *</label>
                <textarea rows={3} required placeholder="Detail the applicability and coverage of this procedure..." value={scopeCovers} onChange={(e) => setScopeCovers(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Scope – what is explicitly excluded</label>
                <textarea rows={3} placeholder="Identify what procedures, parameters or targets are explicitly excluded from this SOP..." value={scopeExcluded} onChange={(e) => setScopeExcluded(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Background / Introduction</label>
                <textarea rows={4} placeholder="Provide necessary theoretical context or laboratory introduction..." value={background} onChange={(e) => setBackground(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION D. Definitions & Abbreviations */}
          <div id="section-D" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              D. Definitions & Abbreviations
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Definitions / Terminology (narrative)</label>
                <textarea rows={4} placeholder="List key terms and their technical definition in context..." value={definitions} onChange={(e) => setDefinitions(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>D2. Abbreviations used in this SOP</label>
                <textarea rows={3} placeholder="e.g. DBS: Dried Blood Spot; qPCR: Quantitative Polymerase Chain Reaction..." value={abbreviations} onChange={(e) => setAbbreviations(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION E. Responsibility & Accountability */}
          <div id="section-E" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              E. Responsibility & Accountability
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Roles involved in executing this SOP *"
                selectedValues={rolesInvolved}
                onChange={setRolesInvolved}
                options={[
                  "Laboratory manager",
                  "Laboratory supervisor",
                  "Senior analyst / research scientist",
                  "Analyst / lab technologist",
                  "Laboratory technician",
                  "Entomologist / vector biologist",
                  "Data manager",
                  "Phlebotomist / clinician",
                  "Trainee / fellow",
                  "QA / QC officer",
                  "Biosafety officer",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={rolesInvolvedOther}
                onOtherChange={setRolesInvolvedOther}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Responsibility & accountability (narrative) *</label>
                <textarea rows={4} required placeholder="Describe detailed roles and their exact procedural accountability..." value={responsibilityNarrative} onChange={(e) => setResponsibilityNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION F. Principle of the Method */}
          <div id="section-F" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              F. Principle of the Method
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Principle / Methodological basis *</label>
              <textarea rows={6} required placeholder="Explain the scientific/methodological principles governing the assay..." value={principleBasis} onChange={(e) => setPrincipleBasis(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>

          {/* SECTION G. Samples / Specimens Covered */}
          <div id="section-G" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              G. Samples / Specimens Covered
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Sample matrices covered by this SOP *"
                selectedValues={sampleMatrices}
                onChange={setSampleMatrices}
                options={[
                  "Whole blood",
                  "DBS",
                  "Plasma",
                  "Serum",
                  "RBC pellet",
                  "RNA-protect whole blood",
                  "Mosquito – adult",
                  "Mosquito – larvae",
                  "Mosquito midgut",
                  "Mosquito head-thorax",
                  "Mosquito abdomen",
                  "Purified DNA extract",
                  "Purified RNA extract",
                  "In-vitro culture / control strain",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={sampleMatricesOther}
                onOtherChange={setSampleMatricesOther}
              />

              <RectangleMultiselect
                label="Input material type(s) *"
                selectedValues={inputMaterialTypes}
                onChange={setInputMaterialTypes}
                options={[
                  "DBS punch(es)",
                  "Whole blood",
                  "Plasma / serum",
                  "Single mosquito",
                  "Mosquito pool",
                  "Larvae",
                  "Cultured parasites",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={inputMaterialTypesOther}
                onOtherChange={setInputMaterialTypesOther}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Volume / amount required per sample *</label>
                <input type="text" required placeholder="e.g. 50 µL or 3 DBS punches" value={volumeRequired} onChange={(e) => setVolumeRequired(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Sample acceptance criteria *</label>
                <textarea rows={3} required placeholder="Detailed criteria for accepting incoming samples..." value={sampleAcceptanceCriteria} onChange={(e) => setSampleAcceptanceCriteria(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Sample rejection criteria *</label>
                <textarea rows={3} required placeholder="Detailed criteria for rejecting incoming samples..." value={sampleRejectionCriteria} onChange={(e) => setSampleRejectionCriteria(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION H. Reagents & Supplies */}
          <div id="section-H" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              H. Reagents & Supplies
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reagents & supplies (full narrative as in SOP) *</label>
                <textarea rows={5} required placeholder="Describe full list of materials, concentrations, and manufacturer guidelines..." value={reagentsSuppliesNarrative} onChange={(e) => setReagentsSuppliesNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>H2. Reagents & supplies (one per line) *</label>
                <textarea rows={4} required placeholder="Item 1 - Brand - Cat #&#10;Item 2 - Brand - Cat #" value={reagentsSuppliesList} onChange={(e) => setReagentsSuppliesList(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION I. Equipment & Instruments */}
          <div id="section-I" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              I. Equipment & Instruments
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Primary equipment used *"
                selectedValues={primaryEquipment}
                onChange={setPrimaryEquipment}
                options={[
                  "GeneRotex 96 automatic nucleic-acid extractor",
                  "KingFisher Flex",
                  "Bio-Rad CFX96 Deep Well",
                  "QIAcuity One Digital PCR",
                  "Luminex MAGPIX",
                  "Oxford Nanopore MinION Mk1C",
                  "Conventional thermocycler",
                  "Gel doc / UV imager",
                  "Centrifuge",
                  "Biosafety cabinet",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={primaryEquipmentOther}
                onOtherChange={setPrimaryEquipmentOther}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>I2. Equipment & instruments (one per line) *</label>
                <textarea rows={4} required placeholder="Equipment Name - Model - Manufacturer" value={equipmentList} onChange={(e) => setEquipmentList(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION J. Environmental & Safety Controls */}
          <div id="section-J" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              J. Environmental & Safety Controls
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="PPE required *"
                selectedValues={ppeRequired}
                onChange={setPpeRequired}
                options={[
                  "Lab coat",
                  "Gloves (nitrile)",
                  "Double gloves",
                  "Safety glasses / goggles",
                  "Face shield",
                  "N95 respirator",
                  "Surgical mask",
                  "Closed shoes",
                  "Disposable apron",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={ppeRequiredOther}
                onOtherChange={setPpeRequiredOther}
              />

              <CircleDropdown
                label="Biosafety level required *"
                value={biosafetyLevel}
                onChange={setBiosafetyLevel}
                options={["BSL-1", "BSL-2", "BSL-2+", "BSL-3"]}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Hazards relevant to this procedure *"
                selectedValues={hazardsRelevant}
                onChange={setHazardsRelevant}
                options={[
                  "Biohazardous material",
                  "Chemical hazard",
                  "Phenol / chloroform",
                  "Ethidium bromide / GelRed",
                  "UV radiation",
                  "Liquid nitrogen / cryogenic",
                  "Sharps / needles",
                  "Mosquito / vector bite risk",
                  "Electrical / high voltage",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={hazardsRelevantOther}
                onOtherChange={setHazardsRelevantOther}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Waste handling instructions *</label>
                <textarea rows={3} required placeholder="Detailed procedures for managing biological, chemical, or sharps waste..." value={wasteHandling} onChange={(e) => setWasteHandling(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Additional safety / environmental controls</label>
                <textarea rows={3} placeholder="e.g. Spill kits, specialized fume hoods..." value={additionalSafetyControls} onChange={(e) => setAdditionalSafetyControls(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION K. Quality Control */}
          <div id="section-K" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              K. Quality Control
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="Controls included in this SOP *"
                selectedValues={controlsIncluded}
                onChange={setControlsIncluded}
                options={[
                  "Positive control",
                  "Negative control",
                  "No-template control (NTC)",
                  "Internal / extraction control",
                  "Calibrator / standard curve",
                  "Reference strain (e.g., 3D7)",
                  "Blank",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={controlsIncludedOther}
                onOtherChange={setControlsIncludedOther}
              />

              <RectangleMultiselect
                label="DNA/RNA QC methods specified *"
                selectedValues={qcMethods}
                onChange={setQcMethods}
                options={[
                  "NanoDrop (UV)",
                  "Qubit (fluorometric)",
                  "TapeStation / Bioanalyzer",
                  "Agarose gel",
                  "Not performed",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={qcMethodsOther}
                onOtherChange={setQcMethodsOther}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Acceptance / rejection criteria *</label>
                <textarea rows={3} required placeholder="Criteria for validating the assay run based on control outputs..." value={qcAcceptanceCriteria} onChange={(e) => setQcAcceptanceCriteria(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Quality control narrative (verbatim from SOP)</label>
                <textarea rows={4} placeholder="Verbatim text detailing Quality Control guidelines..." value={qcNarrative} onChange={(e) => setQcNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION L. Stepwise Procedure */}
          <div id="section-L" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              L. Stepwise Procedure
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Full procedure narrative (verbatim from SOP) *</label>
                <textarea rows={8} required placeholder="Enter the exact wording of the stepwise procedure as described in the SOP document..." value={procedureNarrative} onChange={(e) => setProcedureNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>L2. Stepwise procedure (one step per line) *</label>
                <textarea rows={6} required placeholder="Step 1: Perform task A&#10;Step 2: Perform task B" value={procedureStepsList} onChange={(e) => setProcedureStepsList(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION M. Calculation / Data Analysis */}
          <div id="section-M" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              M. Calculation / Data Analysis
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Calculations / formulas used</label>
                <textarea rows={3} placeholder="List any math formulas or biological conversion factors needed..." value={calculationsFormulas} onChange={(e) => setCalculationsFormulas(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Software / analysis tools used</label>
                <textarea rows={3} placeholder="e.g. Bio-Rad CFX Manager, Microsoft Excel, R Studio..." value={softwareTools} onChange={(e) => setSoftwareTools(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Interpretation rules / thresholds</label>
                <textarea rows={3} placeholder="e.g. Cycle threshold (Ct) value < 37 is positive..." value={interpretationRules} onChange={(e) => setInterpretationRules(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION N. Result Reporting & Interpretation */}
          <div id="section-N" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              N. Result Reporting & Interpretation
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reporting format (units, layout)</label>
                <textarea rows={3} placeholder="e.g. parasites/µL, positive/negative..." value={reportingFormat} onChange={(e) => setReportingFormat(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Cut-offs / thresholds</label>
                <textarea rows={3} placeholder="Indicate boundaries for diagnostic reporting..." value={cutOffsThresholds} onChange={(e) => setCutOffsThresholds(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>LIMS / database field mapping</label>
                <textarea rows={3} placeholder="Map variables to fields in database schema..." value={limsDatabaseMapping} onChange={(e) => setLimsDatabaseMapping(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Result reporting narrative</label>
                <textarea rows={4} placeholder="Full workflow narrative for reporting..." value={resultReportingNarrative} onChange={(e) => setResultReportingNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION P. Storage & Transport Requirements */}
          <div id="section-P" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              P. Storage & Transport Requirements
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="Sample types this SOP stores / transports *"
                selectedValues={storageSampleTypes}
                onChange={setStorageSampleTypes}
                options={[
                  "DBS",
                  "Whole blood",
                  "Plasma",
                  "Serum",
                  "Cell pellet",
                  "Whole blood in RNA-protect",
                  "Preserved mosquitoes",
                  "Purified DNA / RNA"
                ]}
              />

              <CircleDropdown
                label="Recommended storage temperature *"
                value={recommendedTemp}
                onChange={setRecommendedTemp}
                options={["Room temperature", "+4 °C", "−20 °C", "−80 °C", "Liquid nitrogen", "Dry ice (transport)"]}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Maximum storage duration *</label>
                <input type="text" required placeholder="e.g. 6 months at -20°C, Indefinitely at -80°C" value={maxStorageDuration} onChange={(e) => setMaxStorageDuration(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <RectangleMultiselect
                label="Acceptable transport modes *"
                selectedValues={transportModes}
                onChange={setTransportModes}
                options={[
                  "Cold box with ice packs",
                  "Dry ice",
                  "LN2 dry shipper",
                  "Ambient with desiccant (DBS)",
                  "Commercial courier (categorized)",
                  "Hand-carried"
                ]}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Storage & transport narrative</label>
                <textarea rows={4} placeholder="Verbatim guidelines for storage container preparation and shipping validation..." value={storageTransportNarrative} onChange={(e) => setStorageTransportNarrative(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* SECTION Q. References & Attachments */}
          <div id="section-Q" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Q. References & Attachments
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>References (citations, manufacturer manuals)</label>
                <textarea rows={4} placeholder="Provide academic citations, guidelines or user guides referred to..." value={referencesText} onChange={(e) => setReferencesText(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach the original SOP document (PDF or DOCX) *</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setOriginalSopFile(e.target.files ? e.target.files[0] : null)}
                  style={{
                    padding: "8px 12px",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    cursor: "pointer",
                  }}
                />
                {originalSopFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {originalSopFile.name}</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach supplementary file (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setSupplementaryFile(e.target.files ? e.target.files[0] : null)}
                  style={{
                    padding: "8px 12px",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    cursor: "pointer",
                  }}
                />
                {supplementaryFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {supplementaryFile.name}</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach workflow diagram (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setWorkflowFile(e.target.files ? e.target.files[0] : null)}
                  style={{
                    padding: "8px 12px",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-sm)",
                    cursor: "pointer",
                  }}
                />
                {workflowFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {workflowFile.name}</span>}
              </div>
            </div>
          </div>

          {/* SECTION R. Document Control & Sign-off */}
          <div id="section-R" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              R. Document Control & Sign-off
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 20 }}>
              {/* Prepared */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared by (name) *</label>
                <input type="text" required value={preparedByName} onChange={(e) => setPreparedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared by (role) *</label>
                <input type="text" required value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared date *</label>
                <input type="date" required value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              {/* Reviewed */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed by (name) *</label>
                <input type="text" required value={reviewedByName} onChange={(e) => setReviewedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed by (role) *</label>
                <input type="text" required value={reviewedByRole} onChange={(e) => setReviewedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed date *</label>
                <input type="date" required value={reviewedDate} onChange={(e) => setReviewedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              {/* Approved */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved by (name) *</label>
                <input type="text" required value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved by (role) *</label>
                <input type="text" required value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved date *</label>
                <input type="date" required value={approvedDate} onChange={(e) => setApprovedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Controlled copy number *</label>
                <input type="text" required placeholder="e.g. Copy 01" value={controlledCopyNumber} onChange={(e) => setControlledCopyNumber(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Distribution list *</label>
                <input type="text" required placeholder="Who should receive copies of this SOP" value={distributionList} onChange={(e) => setDistributionList(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Final comments / notes</label>
              <textarea rows={3} placeholder="Any final comments or notes on document sign-off..." value={finalComments} onChange={(e) => setFinalComments(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>
        </form>

        {/* FLOATING ACTION BOTTOM BAR */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            padding: "16px 40px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            boxShadow: "0 -4px 10px rgba(0,0,0,0.05)",
            zIndex: 99,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/domains/qms")}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={(e) => {
              if (formRef.current) {
                if (formRef.current.reportValidity()) {
                  formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
              }
            }}
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Submit SOP
          </button>
        </div>

      </div>
    </div>
  );
}
