import { DOMAIN_CATALOG } from "@roms/shared";

export const ROLE_SEEDS: Record<string, Record<string, string[]>> = {
  LAB_SCIENTIST: {
    biospecimen: ["Dashboard", "Sample Collection", "Processing"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s"],
    "lab-workflow": ["Dashboard", "Protocols", "Experiments"],
    "data-management": ["Dashboard"],
    qms: ["Dashboard", "Author"],
  },
  DATA_MANAGER: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory"],
    qms: ["Dashboard"],
    participant: ["Dashboard", "Participants"],
    regulatory: ["Dashboard"],
    "data-management": ["Dashboard", "Studies", "Metadata", "Exports"],
  },
  RESEARCH_ADMIN: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Inventory Manager", "Master Data"],
    qms: ["Dashboard", "Author", "Quality Officer", "Audits", "CAPA"],
    hr: ["Dashboard", "Profiles"],
    finance: ["Dashboard", "Grants", "Budgets"],
    participant: ["Dashboard"],
    regulatory: ["Dashboard", "Compliance Register"],
    "data-management": ["Dashboard", "Studies"],
    infrastructure: ["Dashboard"],
  },
  PRINCIPAL_INVESTIGATOR: {
    biospecimen: ["Dashboard", "Retrieval"],
    inventory: ["Dashboard"],
    qms: ["Dashboard", "Authorizer", "Audits"],
    "lab-workflow": ["Dashboard", "Runs"],
    "data-management": ["Dashboard", "Studies", "Analytics"],
    hr: ["Dashboard"],
    finance: ["Dashboard", "Grants"],
    participant: ["Dashboard", "Participants"],
    regulatory: ["Dashboard", "Approvals"],
    infrastructure: ["Dashboard"],
  },
  QA_OFFICER: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard"],
    qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA"],
    "lab-workflow": ["Dashboard"],
    "data-management": ["Dashboard"],
    hr: ["Dashboard"],
    finance: ["Dashboard"],
    participant: ["Dashboard"],
    regulatory: ["Dashboard", "Compliance Register", "Reporting"],
    infrastructure: ["Dashboard"],
  },
  COMMUNITY_ENGAGEMENT: {
    participant: ["Dashboard", "Participants", "Engagement"],
    "data-management": ["Dashboard"],
    regulatory: ["Dashboard"],
    hr: ["Dashboard"],
  },
};

// Maps subfunction slugs to their required right in each domain
export const SUBFUNCTION_RIGHTS_MAP: Record<string, Record<string, string>> = {
  biospecimen: {
    "sample-collection-intake": "Sample Collection",
    "processing-preparation": "Processing",
    "cryopreservation-cold-chain": "Storage",
    "retrieval-dispensing": "Retrieval",
    "disposal-long-term-planning": "Disposal",
  },
  inventory: {
    "stock-management": "Dashboard",
    "equipment-instruments": "Dashboard",
    "procurement-vendors": "Dashboard",
    "waste-management": "Dashboard",
    "budget-cost-allocation": "Dashboard",
  },
  qms: {
    "sop-authoring-control": "Dashboard",
    "training-acknowledgment": "Training",
    "audits-capa": "Audits",
    "incident-deviation-reporting": "CAPA",
    "qms-accreditation": "Dashboard",
  },
  "lab-workflow": {
    "protocol-design-tracking": "Protocols",
    "instrument-scheduling": "Instruments",
    "result-capture-qc": "Experiments",
    "batch-run-management": "Runs",
    "assay-validation": "Reports",
  },
  "data-management": {
    "data-capture-edc": "Dashboard",
    "data-validation-cleaning": "Metadata",
    "standards-compliance": "Studies",
    "statistical-analysis": "Analytics",
    "data-sharing-archiving": "Exports",
  },
  infrastructure: {
    "platform-administration": "Services",
    "data-security": "Monitoring",
    "hpc-bioinformatics": "Integrations",
    "monitoring-biosafety-systems": "Monitoring",
    "disaster-recovery-continuity": "Incidents",
  },
  hr: {
    "recruitment-onboarding": "Dashboard",
    "training-competency": "Personnel Registration",
    "scheduling-capacity": "Leave",
    "performance-management": "Profiles",
    "health-safety-records": "Onboarding",
  },
  finance: {
    "pre-award-management": "Grants",
    "post-award-monitoring": "Budgets",
    "funder-reporting": "Reports",
    "sub-awards-contracts": "Expenses",
    "compliance-close-out": "Analytics",
  },
  participant: {
    "recruitment-screening": "Participants",
    "informed-consent": "Consent",
    "scheduling-retention": "Visits",
    "community-advisory-boards": "Engagement",
    "privacy-vulnerable-groups": "Follow-up",
  },
  regulatory: {
    "ethics-submissions": "Ethics Review",
    "regulatory-affairs": "Approvals",
    "gcp-compliance": "Compliance Register",
    "adverse-event-reporting": "Incidents",
    "inspection-readiness-tmf": "Analytics",
  },
};

// Maps layout tab paths to their required right
export const TAB_RIGHTS_MAP: Record<string, Record<string, string>> = {
  inventory: {
    "overview": "Dashboard",
    "dashboard": "Dashboard",
    "current-inventory": "Current Inventory",
    "check-in": "Check In",
    "check-in-history": "Check In History",
    "check-out": "Check Out",
    "check-out-history": "Check Out History",
    "requests": "Request/s",
    "inventory-manager": "Inventory Manager",
    "analytics": "Analytics",
    "master-data": "Master Data",
  },
  qms: {
    "overview": "Dashboard",
    "sops": "Dashboard",
    "resources": "Dashboard",
    "author": "Author",
    "create-sop": "Author",
    "qo": "Quality Officer",
    "review-sop": "Authorizer",
  },
  hr: {
    "dashboard": "Dashboard",
    "training-records": "Personnel Registration",
    "approved": "Profiles",
    "approve-employee": "Onboarding",
  },
};

// Gets the set of rights for the user across all domains
export function getUserRights(roles: string[] | undefined, permissions?: string[]): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};

  // Initialize domains
  for (const domain of DOMAIN_CATALOG) {
    result[domain.slug] = new Set<string>();
  }

  // 1. Add rights from custom permissions
  if (permissions && permissions.length > 0) {
    for (const perm of permissions) {
      if (perm === "admin:all") {
        const DOMAIN_RIGHTS: Record<string, string[]> = {
          biospecimen: ["Dashboard", "Sample Collection", "Processing", "Storage", "Retrieval", "Disposal", "Analytics"],
          inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Inventory Manager", "Master Data"],
          qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA", "Training"],
          "lab-workflow": ["Dashboard", "Protocols", "Experiments", "Runs", "Instruments", "Reports", "Analytics"],
          "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary", "Exports", "Integrations", "Analytics"],
          infrastructure: ["Dashboard", "Services", "Servers", "Monitoring", "Incidents", "Integrations", "Analytics"],
          hr: ["Dashboard", "Profiles", "Personnel Registration", "Onboarding", "Leave", "Performance", "Analytics"],
          finance: ["Dashboard", "Grants", "Budgets", "Expenses", "Approvals", "Reports", "Analytics"],
          participant: ["Dashboard", "Participants", "Consent", "Visits", "Engagement", "Follow-up", "Analytics"],
          regulatory: ["Dashboard", "Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting", "Analytics"],
        };
        for (const domain of DOMAIN_CATALOG) {
          const rights = DOMAIN_RIGHTS[domain.slug] ?? [];
          for (const r of rights) {
            result[domain.slug].add(r);
          }
        }
      } else {
        const [domainSlug, rightName] = perm.split(":");
        if (domainSlug && rightName && result[domainSlug]) {
          result[domainSlug].add(rightName);
        }
      }
    }
  }

  // 2. Add rights from roles
  if (roles && roles.includes("ADMIN")) {
    // Admin has all rights
    const DOMAIN_RIGHTS: Record<string, string[]> = {
      biospecimen: ["Dashboard", "Sample Collection", "Processing", "Storage", "Retrieval", "Disposal", "Analytics"],
      inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Inventory Manager", "Master Data"],
      qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA", "Training"],
      "lab-workflow": ["Dashboard", "Protocols", "Experiments", "Runs", "Instruments", "Reports", "Analytics"],
      "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary", "Exports", "Integrations", "Analytics"],
      infrastructure: ["Dashboard", "Services", "Servers", "Monitoring", "Incidents", "Integrations", "Analytics"],
      hr: ["Dashboard", "Profiles", "Personnel Registration", "Onboarding", "Leave", "Performance", "Analytics"],
      finance: ["Dashboard", "Grants", "Budgets", "Expenses", "Approvals", "Reports", "Analytics"],
      participant: ["Dashboard", "Participants", "Consent", "Visits", "Engagement", "Follow-up", "Analytics"],
      regulatory: ["Dashboard", "Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting", "Analytics"],
    };
    for (const domain of DOMAIN_CATALOG) {
      const rights = DOMAIN_RIGHTS[domain.slug] ?? [];
      for (const r of rights) {
        result[domain.slug].add(r);
      }
    }
  } else if (roles && roles.length > 0 && !(roles.length === 1 && roles[0] === "STAFF")) {
    // Union rights for all user roles
    for (const role of roles) {
      const seed = ROLE_SEEDS[role];
      if (seed) {
        for (const [domainSlug, rights] of Object.entries(seed)) {
          if (result[domainSlug]) {
            for (const r of rights) {
              result[domainSlug].add(r);
            }
          }
        }
      }
    }
  }

  // 3. Fallback: if no rights and no custom permissions (or role is STAFF and no custom permissions)
  const totalRights = Object.values(result).reduce((sum, set) => sum + set.size, 0);
  if (totalRights === 0) {
    // New/unapproved users have only Personnel Registration in hr
    result["hr"].add("Personnel Registration");
  }

  return result;
}

export function isApprovedUser(roles: string[] | undefined, permissions?: string[]): boolean {
  if (permissions && permissions.length > 0) return true;
  if (!roles || roles.length === 0) return false;
  if (roles.length === 1 && roles[0] === "STAFF") return false;
  return true;
}

export function hasDomainAccess(roles: string[] | undefined, domainSlug: string, permissions?: string[]): boolean {
  if (roles?.includes("ADMIN") || permissions?.includes("admin:all")) return true;
  const rights = getUserRights(roles, permissions);
  return (rights[domainSlug]?.size ?? 0) > 0;
}

export function hasSubfunctionAccess(roles: string[] | undefined, domainSlug: string, subfunctionSlug?: string, permissions?: string[]): boolean {
  if (roles?.includes("ADMIN") || permissions?.includes("admin:all")) return true;
  return hasDomainAccess(roles, domainSlug, permissions);
}

export function hasTabAccess(roles: string[] | undefined, domainSlug: string, tabSlug?: string, permissions?: string[]): boolean {
  if (roles?.includes("ADMIN") || permissions?.includes("admin:all")) return true;

  // If we have a specific tab slug, check the exact right required for that tab
  if (tabSlug && TAB_RIGHTS_MAP[domainSlug]) {
    const requiredRight = TAB_RIGHTS_MAP[domainSlug][tabSlug];
    if (requiredRight) {
      const rights = getUserRights(roles, permissions);
      return rights[domainSlug]?.has(requiredRight) ?? false;
    }
  }

  // Fallback: any access to the domain
  return hasDomainAccess(roles, domainSlug, permissions);
}

export function hasPathAccess(roles: string[] | undefined, pathname: string, permissions?: string[]): boolean {
  if (roles?.includes("ADMIN") || permissions?.includes("admin:all")) return true;

  // Normalize pathname: remove trailing slashes
  const cleanPath = pathname.replace(/\/$/, "");

  // If new user (unapproved): they only have access to Personnel Registration
  if (!isApprovedUser(roles, permissions)) {
    return cleanPath === "/domains/hr/recruitment-onboarding/training-records";
  }

  // 1. Root / Dashboard page
  if (cleanPath === "" || cleanPath === "/") {
    return true;
  }

  // 2. Admin user rights
  if (cleanPath === "/admin/user-rights") {
    return (
      roles?.includes("ADMIN") ||
      roles?.includes("RESEARCH_ADMIN") ||
      (permissions?.includes("admin:all") ?? false)
    );
  }

  // 3. Architecture & Operations
  if (cleanPath === "/architecture" || cleanPath === "/operations") {
    return roles?.some((r) => ["ADMIN", "RESEARCH_ADMIN"].includes(r)) || (permissions?.includes("admin:all") ?? false);
  }

  // 4. Domains paths: /domains/:domainSlug/...
  const domainMatch = cleanPath.match(/^\/domains\/([^/]+)/);
  if (domainMatch) {
    const domainSlug = domainMatch[1];

    // Check if user has access to this domain at all
    if (!hasDomainAccess(roles, domainSlug, permissions)) {
      return false;
    }

    // Check specific subfunctions / sub-paths
    // /domains/:domainSlug/:subfunctionSlug
    const subfunctionMatch = cleanPath.match(/^\/domains\/([^/]+)\/([^/]+)/);
    if (subfunctionMatch) {
      const subfunctionSlug = subfunctionMatch[2];

      // If it has a nested tab under the subfunction: /domains/:domainSlug/:subfunctionSlug/:tabSlug
      const tabMatch = cleanPath.match(/^\/domains\/([^/]+)\/([^/]+)\/([^/]+)/);
      if (tabMatch) {
        const tabSlug = tabMatch[3];
        return hasTabAccess(roles, domainSlug, tabSlug, permissions);
      }

      // Check access to the subfunction itself
      return hasSubfunctionAccess(roles, domainSlug, subfunctionSlug, permissions);
    }

    return true;
  }

  return true; // Default fallback for other paths
}
