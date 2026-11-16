import React from "react";

export const ASSAY_TYPES = [
  "Sequencing primers",
  "Enzymes",
  "RNA extruction Magmax kit",
  "Genotyping Pf",
  "Mag Max",
  "qPCR",
  "Sequensing",
  "leshimaniasis",
  "G6PD Primer",
  "RFLP drug Resistance primers",
  "unknowns",
  "plasmid and probe",
  "Digital PCR",
  "Parasite PvPf Genotyping Primers",
  "Immunoassay",
  "Recieved from CDC",
  "nPCR",
  "Purification (DNA/RNA)",
  "RT-qPCR",
  "Primers",
  "Conventional PCR",
  "DNA ladder",
  "Mosquito Id",
] as const;

export type AssayType = (typeof ASSAY_TYPES)[number];

export const STORAGE_CONDITIONS = [
  { value: "80", label: "-80°C Ultra-Low Freezer", shortLabel: "-80°C", badgeBg: "#dbeafe", badgeColor: "#1e40af", badgeBorder: "#93c5fd" },
  { value: "20", label: "-20°C Standard Freezer", shortLabel: "-20°C", badgeBg: "#e0f2fe", badgeColor: "#0369a1", badgeBorder: "#7dd3fc" },
  { value: "2-8", label: "2-8°C Laboratory Refrigerator", shortLabel: "2-8°C", badgeBg: "#ccfbf1", badgeColor: "#0f766e", badgeBorder: "#5eead4" },
  { value: "Ambient", label: "Ambient Room Temperature (15-25°C)", shortLabel: "Ambient", badgeBg: "#fef3c7", badgeColor: "#b45309", badgeBorder: "#fcd34d" },
];

export const REAGENT_TYPES = [
  "Primer and probe",
  "Buffer",
  "Enzyme",
  "Master Mix",
  "Polymerase",
  "Ladder",
  "Kit",
  "Extraction Reagent",
  "Control / Standard",
  "Antibody",
  "Substrate",
  "General Chemical",
];

export const CONCENTRATION_UNITS = [
  "µM",
  "nM",
  "mM",
  "ng/µL",
  "µg/µL",
  "mg/mL",
  "U/µL",
  "X (Conc)",
  "copies/µL",
  "vials",
  "reactions",
];

// Assays that ALWAYS require Number of Vill
const ALWAYS_VILL_ASSAYS = new Set([
  "RNA extruction Magmax kit",
  "Sequensing",
  "unknowns",
  "Digital PCR",
  "nPCR",
  "Purification (DNA/RNA)",
  "RT-qPCR",
  "DNA ladder",
]);

// Assays where reagent type determines if Number of Vill is required
const CONDITIONAL_VILL_ASSAYS = new Set([
  "Sequencing primers",
  "qPCR",
  "leshimaniasis",
  "G6PD Primer",
  "RFLP drug Resistance primers",
]);

/**
 * Determines if "Number of Vill" is required for an assay and reagent type.
 */
export function needsNumberOfVill(assayType: string, reagentType?: string | null): boolean {
  if (ALWAYS_VILL_ASSAYS.has(assayType)) return true;
  if (CONDITIONAL_VILL_ASSAYS.has(assayType)) {
    // If reagent type is Primer/probe, common fields only.
    // If Buffer or any other, requires Number of Vill.
    if (!reagentType) return false;
    const isPrimerOrProbe = /primer|probe/i.test(reagentType);
    return !isPrimerOrProbe;
  }
  return false;
}

/**
 * "RNA extruction Magmax kit" does NOT include concentration in request form.
 * All other assays include concentration.
 */
export function hasConcentrationField(assayType: string): boolean {
  return assayType !== "RNA extruction Magmax kit";
}

export function formatStorageCondition(condition?: string | null): string {
  if (!condition) return "Ambient";
  const c = condition.trim().toLowerCase();
  if (c.includes("80")) return "-80°C";
  if (c.includes("20")) return "-20°C";
  if (c.includes("2-8") || c.includes("4") || c.includes("refri")) return "2-8°C";
  return "Ambient";
}

export function getStorageBadgeMeta(condition?: string | null) {
  const code = formatStorageCondition(condition);
  return (
    STORAGE_CONDITIONS.find((s) => s.shortLabel === code) ?? {
      value: "Ambient",
      label: "Ambient",
      shortLabel: "Ambient",
      badgeBg: "#f3f4f6",
      badgeColor: "#374151",
      badgeBorder: "#d1d5db",
    }
  );
}

/**
 * Checks if the current user is Tegbar Getahun (Reagent Inventory Manager)
 * or has elevated managerial / administrative permissions.
 */
export function isTegbarUser(user: { displayName?: string | null; email?: string | null; roles?: string[] } | null | undefined): boolean {
  if (!user) return false;
  const name = (user.displayName ?? "").toLowerCase();
  const email = (user.email ?? "").toLowerCase();
  if (name.includes("tegbar") || email.includes("tegbar")) return true;
  const roles = user.roles ?? [];
  return roles.some((r) =>
    ["Admin", "System Administrator", "Inventory Manager", "Lab Manager", "QA Officer"].includes(r)
  );
}

export interface ReagentItem {
  id: string;
  reagentCode: string;
  description: string;
  assayType: string;
  reagentType?: string | null;
  concentration?: string | null;
  availableConcentration: number;
  initialConcentration: number;
  issuedConcentration: number;
  expectedReturnConcentration: number;
  concentrationUnit?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  volume?: number | null;
  volumeUnit?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  storageCondition: string;
  location?: string | null;
  receivedFrom?: string | null;
  minThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReagentRequest {
  id: string;
  requestBatchId?: string;
  reagentItemId?: string | null;
  assayType: string;
  reagentType?: string | null;
  projectFor?: string | null;
  concentration?: number | null;
  requestedConcentration: number;
  approvedConcentration: number;
  concentrationUnit?: string | null;
  numberOfVill?: number | null;
  expectedReturn?: number | null;
  requestedBy: string;
  requestedFor?: string | null;
  additionalFields?: any;
  status: "PENDING" | "APPROVED" | "PARTIAL" | "REJECTED";
  approver?: string | null;
  decisionAt?: string | null;
  disbursedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  reagentItem?: ReagentItem | null;
}

export interface ReagentMovement {
  id: string;
  reagentItemId: string;
  movementType: string;
  concentration: number;
  numberOfVill?: number | null;
  expectedReturn?: number | null;
  projectFor?: string | null;
  requestedBy?: string | null;
  recipient?: string | null;
  status: string;
  lotNumber?: string | null;
  expiryDate?: string | null;
  remark?: string | null;
  occurredAt: string;
  createdAt: string;
  reagentItem?: ReagentItem;
}

export interface ReagentDashboardData {
  totalItems: number;
  lowStock: number;
  expired: number;
  pendingRequests: number;
  approvedRequests: number;
  movementCount: number;
}
