import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DOMAIN_CATALOG } from "@roms/shared";
import { Badge, Button, Card } from "@roms/ui";
import { apiClient } from "../api/client";
import { useTheme } from "../theme/useTheme";

type ControlUser = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  department: string;
  jobTitle: string;
  role: string;
  startDate: string;
  permissions: string[];
};

type PermissionState = Record<string, Set<string>>;

type RightOption = {
  label: string;
  rights: string[];
};

const INVENTORY_RIGHT_OPTIONS: RightOption[] = [
  { label: "Dashboard", rights: ["Dashboard"] },
  { label: "Current Inventory", rights: ["Current Inventory"] },
  { label: "Check In / Check Out", rights: ["Check In", "Check Out", "Approved Requests"] },
  { label: "Check In / Out History", rights: ["Check In History", "Check Out History"] },
  { label: "Request/s", rights: ["Request/s"] },
  { label: "Inventory Manager", rights: ["Inventory Manager"] },
  { label: "Analytics", rights: ["Analytics"] },
  { label: "Master Data", rights: ["Master Data"] },
  { label: "View-Only Mode (Read-Only)", rights: ["View-Only"] },
];

const REAGENT_RIGHT_OPTIONS: RightOption[] = [
  { label: "Dashboard", rights: ["Dashboard"] },
  { label: "Current Inventory", rights: ["Current Inventory"] },
  { label: "Reagent Check In / Out", rights: ["Check In", "Check Out"] },
  { label: "Reagent Check In / Out History", rights: ["Check In History", "Check Out History"] },
  { label: "Reagent Request", rights: ["Request/s"] },
  { label: "Ragent Manager", rights: ["Manage Requests", "Approved Requests"] },
  { label: "Master Data", rights: ["Master Data"] },
  { label: "View-Only Mode (Read-Only)", rights: ["View-Only"] },
];

const DOMAIN_RIGHTS: Record<string, string[]> = {
  biospecimen: ["Dashboard", "Sample Collection", "Processing", "Storage", "Retrieval", "Disposal", "Analytics"],
  inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Check In History", "Check Out History", "Request/s", "Approved Requests", "Inventory Manager", "Analytics", "Master Data", "View-Only"],
  "reagent-inventory": ["Dashboard", "Current Inventory", "Check In", "Check Out", "Check In History", "Check Out History", "Request/s", "Manage Requests", "Approved Requests", "Master Data", "View-Only"],
  qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA", "Training"],
  "lab-workflow": ["Dashboard", "Protocols", "Instruments", "Experiments", "Runs", "Reports", "Analytics"],
  "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary", "Exports", "Integrations", "Analytics"],
  infrastructure: ["Dashboard", "Services", "Servers", "Monitoring", "Incidents", "Integrations", "Analytics"],
  hr: ["Dashboard", "Profiles", "Leave", "Onboarding", "Personnel Registration", "Performance", "Analytics"],
  finance: ["Dashboard", "Grants", "Budgets", "Expenses", "Approvals", "Reports", "Analytics"],
  regulatory: ["Dashboard", "Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting", "Analytics"],
};

const ROLE_SEEDS: Record<string, Record<string, string[]>> = {
  LAB_SCIENTIST: {
    biospecimen: ["Dashboard", "Sample Collection", "Processing"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s"],
    "reagent-inventory": ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s"],
    "lab-workflow": ["Dashboard", "Protocols", "Runs"],
    "data-management": ["Dashboard"],
    qms: ["Dashboard", "Author"],
  },
  DATA_MANAGER: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory"],
    "reagent-inventory": ["Dashboard", "Current Inventory"],
    qms: ["Dashboard"],
    regulatory: ["Dashboard"],
    "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary"],
  },
  RESEARCH_ADMIN: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Inventory Manager", "Master Data"],
    "reagent-inventory": ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Manage Requests", "Approved Requests", "Master Data"],
    qms: ["Dashboard", "Author", "Quality Officer", "Audits", "CAPA"],
    hr: ["Dashboard", "Profiles", "Onboarding", "Personnel Registration"],
    finance: ["Dashboard", "Grants", "Budgets"],
    regulatory: ["Dashboard", "Compliance Register"],
    "data-management": ["Dashboard", "Studies"],
    infrastructure: ["Dashboard"],
  },
  PRINCIPAL_INVESTIGATOR: {
    biospecimen: ["Dashboard", "Retrieval"],
    inventory: ["Dashboard"],
    "reagent-inventory": ["Dashboard", "Current Inventory", "Request/s", "Manage Requests", "Approved Requests"],
    qms: ["Dashboard", "Authorizer", "Audits"],
    "lab-workflow": ["Dashboard", "Runs"],
    "data-management": ["Dashboard", "Studies", "Analytics"],
    hr: ["Dashboard"],
    finance: ["Dashboard", "Grants"],
    regulatory: ["Dashboard", "Approvals"],
    infrastructure: ["Dashboard"],
  },
  QA_OFFICER: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard"],
    "reagent-inventory": ["Dashboard", "Current Inventory"],
    qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA"],
    "lab-workflow": ["Dashboard"],
    "data-management": ["Dashboard"],
    hr: ["Dashboard"],
    finance: ["Dashboard"],
    regulatory: ["Dashboard", "Compliance Register", "Reporting"],
    infrastructure: ["Dashboard"],
  },
  COMMUNITY_ENGAGEMENT: {
    "data-management": ["Dashboard"],
    regulatory: ["Dashboard"],
    hr: ["Dashboard"],
  },
  ADMIN: Object.fromEntries(Object.keys(DOMAIN_RIGHTS).map((slug) => [slug, [...(DOMAIN_RIGHTS[slug] ?? [])]])) as Record<string, string[]>,
};

function clonePermissions(source: PermissionState): PermissionState {
  return Object.fromEntries(Object.entries(source).map(([slug, rights]) => [slug, new Set(rights)])) as PermissionState;
}

function buildPermissionState(user: ControlUser): PermissionState {
  if (user.permissions && user.permissions.length > 0) {
    const state: PermissionState = Object.fromEntries(
      DOMAIN_CATALOG.map((domain) => [domain.slug, new Set<string>()])
    ) as PermissionState;

    for (const perm of user.permissions) {
      if (perm === "admin:all") {
        for (const domain of DOMAIN_CATALOG) {
          const rights = DOMAIN_RIGHTS[domain.slug] ?? [];
          rights.forEach((r) => state[domain.slug].add(r));
        }
      } else {
        const [domainSlug, rightName] = perm.split(":");
        if (domainSlug && rightName && state[domainSlug]) {
          state[domainSlug].add(rightName);
        }
      }
    }
    return state;
  }

  if (user.role === "ADMIN") {
    const seed = ROLE_SEEDS.ADMIN ?? {};
    return Object.fromEntries(
      DOMAIN_CATALOG.map((domain) => {
        const rights = seed[domain.slug] ?? [];
        return [domain.slug, new Set(rights)];
      })
    ) as PermissionState;
  }

  // New/Staff approved users start with Personnel Registration under hr
  if (user.role === "STAFF" || !ROLE_SEEDS[user.role]) {
    return Object.fromEntries(
      DOMAIN_CATALOG.map((domain) => {
        if (domain.slug === "hr") {
          return ["hr", new Set(["Personnel Registration"])];
        }
        return [domain.slug, new Set()];
      })
    ) as PermissionState;
  }

  const seed = ROLE_SEEDS[user.role] ?? {};
  return Object.fromEntries(
    DOMAIN_CATALOG.map((domain) => {
      const rights = seed[domain.slug] ?? [];
      const allowedRights = (DOMAIN_RIGHTS[domain.slug] ?? []).filter((right) => rights.includes(right));
      return [domain.slug, new Set(allowedRights)];
    })
  ) as PermissionState;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function hasAnyRights(selection: PermissionState, slug: string) {
  return (selection[slug]?.size ?? 0) > 0;
}

function listSelectedRights(selection: PermissionState) {
  return DOMAIN_CATALOG.flatMap((domain) => Array.from(selection[domain.slug] ?? []).map((right) => `${domain.name}: ${right}`));
}

function selectedRightsByDomain(selection: PermissionState) {
  return DOMAIN_CATALOG.map((domain) => ({
    domain,
    rights: Array.from(selection[domain.slug] ?? []),
  })).filter((entry) => entry.rights.length > 0);
}

function getDomainRightOptions(domainSlug: string): RightOption[] {
  if (domainSlug === "inventory") {
    return INVENTORY_RIGHT_OPTIONS;
  }
  if (domainSlug === "reagent-inventory") {
    return REAGENT_RIGHT_OPTIONS;
  }

  return (DOMAIN_RIGHTS[domainSlug] ?? []).map((right) => ({
    label: right,
    rights: [right],
  }));
}

function countSelectedRightOptions(selection: PermissionState, domainSlug: string): number {
  const options = getDomainRightOptions(domainSlug);
  const enabledRights = selection[domainSlug] ?? new Set<string>();
  return options.filter((option) => option.rights.every((right) => enabledRights.has(right))).length;
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "rgba(1, 105, 111, 0.12)", text: "#01696F", border: "rgba(1, 105, 111, 0.28)" },
  { bg: "rgba(2, 132, 199, 0.12)", text: "#0284c7", border: "rgba(2, 132, 199, 0.28)" },
  { bg: "rgba(124, 58, 237, 0.12)", text: "#7c3aed", border: "rgba(124, 58, 237, 0.28)" },
  { bg: "rgba(217, 119, 6, 0.12)", text: "#d97706", border: "rgba(217, 119, 6, 0.28)" },
  { bg: "rgba(22, 163, 74, 0.12)", text: "#16a34a", border: "rgba(22, 163, 74, 0.28)" },
  { bg: "rgba(225, 29, 72, 0.12)", text: "#e11d48", border: "rgba(225, 29, 72, 0.28)" },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export default function UserRightsControlPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const sidebarWidth = 220;

  // Fetch approved employees from the HR API
  const { data: approvedData, isLoading, isError } = useQuery({
    queryKey: ["hr-approved-staff"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/hr/approvals", { params: { status: "APPROVED" } });
      return resp.data;
    },
  });

  // Map API response to ControlUser[]
  const users: ControlUser[] = React.useMemo(() => {
    if (!approvedData?.data) return [];
    // Exclude demo accounts and the ROMS System Administrator (sign-in credential only,
    // not a real staff member — must never appear in the User Rights matrix).
    const excludedNames = ["david asante", "carol nzinga", "roms system administrator"];
    const excludedEmails = ["systemadmin@roms.com"];
    return (approvedData.data as any[])
      .filter((profile: any) => {
        const name = (profile.user?.displayName ?? "").toLowerCase();
        const email = (profile.user?.email ?? "").toLowerCase();
        return (
          !excludedNames.some((ex) => name.includes(ex)) &&
          !excludedEmails.includes(email)
        );
      })
      .map((profile: any) => {
        const userRoles = profile.user?.roles ?? [];
        const primaryRole = userRoles.length > 0 ? userRoles[0] : "STAFF";
        return {
          id: profile.id,
          userId: profile.user?.id ?? "",
          displayName: profile.user?.displayName ?? "—",
          email: profile.user?.email ?? "—",
          department: profile.department ?? "—",
          jobTitle: profile.jobTitle ?? "—",
          role: primaryRole.toUpperCase().replace(/\s+/g, "_"),
          startDate: profile.startDate ?? profile.createdAt ?? "",
          permissions: profile.user?.permissions ?? [],
        };
      });
  }, [approvedData]);

  const [assignments, setAssignments] = React.useState<Record<string, PermissionState>>({});
  const [editorUserId, setEditorUserId] = React.useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = React.useState<PermissionState | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");

  // Users Column Sorting & Filtering states
  type UserSortKey = "name_asc" | "name_desc" | "rights_desc" | "rights_asc" | "dept_asc" | "role_asc";
  const [userSortKey, setUserSortKey] = React.useState<UserSortKey>("name_asc");
  const [deptFilter, setDeptFilter] = React.useState<string>("");
  const [accessFilter, setAccessFilter] = React.useState<"all" | "has_access" | "no_access" | "admin">("all");
  const [userDropdownOpen, setUserDropdownOpen] = React.useState<boolean>(false);
  const userDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allDepartments = React.useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department).filter(Boolean))).sort();
  }, [users]);

  // Seed default permissions for new users that don't have assignments yet
  React.useEffect(() => {
    if (users.length === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (!next[user.id]) {
          next[user.id] = buildPermissionState(user);
        }
      }
      return next;
    });
  }, [users]);

  const activeUser = users.find((user) => user.id === editorUserId) ?? null;
  const activeSelection = draftPermissions;

  const matrixRows = React.useMemo(() => {
    return users.map((user) => {
      const selection = assignments[user.id] ?? buildPermissionState(user);
      const enabledDomains = DOMAIN_CATALOG.filter((domain) => hasAnyRights(selection, domain.slug)).length;
      const enabledRights = DOMAIN_CATALOG.reduce((sum, domain) => sum + (selection[domain.slug]?.size ?? 0), 0);
      return { user, selection, enabledDomains, enabledRights };
    });
  }, [assignments, users]);

  const totalAssignedRights = matrixRows.reduce((sum, row) => sum + row.enabledRights, 0);
  const usersWithAnyAccess = matrixRows.filter((row) => row.enabledDomains > 0).length;

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = matrixRows.filter((row) => {
      const matchesSearch =
        q === "" ||
        row.user.displayName.toLowerCase().includes(q) ||
        row.user.email.toLowerCase().includes(q) ||
        row.user.department.toLowerCase().includes(q) ||
        row.user.jobTitle.toLowerCase().includes(q);
      const matchesRole = roleFilter === "" || row.user.role === roleFilter;
      const matchesDept = deptFilter === "" || row.user.department === deptFilter;

      let matchesAccess = true;
      if (accessFilter === "has_access") {
        matchesAccess = row.enabledRights > 0;
      } else if (accessFilter === "no_access") {
        matchesAccess = row.enabledRights === 0;
      } else if (accessFilter === "admin") {
        matchesAccess = row.user.role === "ADMIN";
      }

      return matchesSearch && matchesRole && matchesDept && matchesAccess;
    });

    return result.sort((a, b) => {
      if (userSortKey === "name_asc") {
        return a.user.displayName.localeCompare(b.user.displayName);
      } else if (userSortKey === "name_desc") {
        return b.user.displayName.localeCompare(a.user.displayName);
      } else if (userSortKey === "rights_desc") {
        return b.enabledRights - a.enabledRights || a.user.displayName.localeCompare(b.user.displayName);
      } else if (userSortKey === "rights_asc") {
        return a.enabledRights - b.enabledRights || a.user.displayName.localeCompare(b.user.displayName);
      } else if (userSortKey === "dept_asc") {
        return a.user.department.localeCompare(b.user.department) || a.user.displayName.localeCompare(b.user.displayName);
      } else if (userSortKey === "role_asc") {
        return a.user.role.localeCompare(b.user.role) || a.user.displayName.localeCompare(b.user.displayName);
      }
      return 0;
    });
  }, [matrixRows, searchQuery, roleFilter, deptFilter, accessFilter, userSortKey]);

  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = React.useState<string>("STAFF");

  const allRoles = React.useMemo(
    () => Array.from(new Set(users.map((u) => u.role))).sort(),
    [users]
  );

  const openEditor = (user: ControlUser) => {
    const current = assignments[user.id] ?? buildPermissionState(user);
    setEditorUserId(user.id);
    setSelectedRole(user.role);
    setDraftPermissions(clonePermissions(current));
    setReviewOpen(false);
    setStatusMessage(null);
  };

  const closeEditor = () => {
    setEditorUserId(null);
    setDraftPermissions(null);
    setReviewOpen(false);
  };

  const toggleRight = (slug: string, rightsToToggle: string[]) => {
    setDraftPermissions((current) => {
      if (!current) {
        return current;
      }
      const next = clonePermissions(current);
      const rights = next[slug] ?? new Set<string>();
      const shouldRemove = rightsToToggle.every((right) => rights.has(right));
      if (shouldRemove) {
        rightsToToggle.forEach((right) => rights.delete(right));
      } else {
        rightsToToggle.forEach((right) => rights.add(right));
      }
      next[slug] = rights;
      return next;
    });
  };

  const toggleAllInDomain = (domainSlug: string) => {
    setDraftPermissions((current) => {
      if (!current) return current;
      const next = clonePermissions(current);
      const options = getDomainRightOptions(domainSlug);
      const allDomainRights = options.flatMap((o) => o.rights);
      const currentRights = next[domainSlug] ?? new Set<string>();
      const allSelected = allDomainRights.every((r) => currentRights.has(r));

      if (allSelected) {
        next[domainSlug] = new Set<string>();
      } else {
        next[domainSlug] = new Set<string>(allDomainRights);
      }
      return next;
    });
  };

  const grantAllDomains = () => {
    setDraftPermissions(() => {
      return Object.fromEntries(
        DOMAIN_CATALOG.map((domain) => {
          const rights = getDomainRightOptions(domain.slug).flatMap((o) => o.rights);
          return [domain.slug, new Set(rights)];
        })
      ) as PermissionState;
    });
  };

  const clearAllDomains = () => {
    setDraftPermissions(() => {
      return Object.fromEntries(
        DOMAIN_CATALOG.map((domain) => [domain.slug, new Set<string>()])
      ) as PermissionState;
    });
  };

  const resetToRoleSeed = () => {
    if (!selectedRole) return;
    const seed = ROLE_SEEDS[selectedRole] ?? {};
    setDraftPermissions(() => {
      return Object.fromEntries(
        DOMAIN_CATALOG.map((domain) => {
          if (selectedRole === "STAFF") {
            if (domain.slug === "hr") {
              return ["hr", new Set(["Personnel Registration"])];
            }
            return [domain.slug, new Set<string>()];
          }
          const rights = seed[domain.slug] ?? [];
          const allowedRights = (DOMAIN_RIGHTS[domain.slug] ?? []).filter((r) => rights.includes(r));
          return [domain.slug, new Set(allowedRights)];
        })
      ) as PermissionState;
    });
  };

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (reviewOpen) {
          setReviewOpen(false);
        } else if (editorUserId) {
          closeEditor();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewOpen, editorUserId]);

  const saveDraft = () => {
    if (!activeUser || !draftPermissions) {
      return;
    }
    setReviewOpen(true);
  };

  const confirmSave = async () => {
    if (!activeUser || !draftPermissions) {
      return;
    }
    try {
      const selectedPermissions: string[] = [];
      if (selectedRole === "ADMIN") {
        selectedPermissions.push("admin:all");
      }
      for (const [domainSlug, rights] of Object.entries(draftPermissions)) {
        rights.forEach((r) => {
          selectedPermissions.push(`${domainSlug}:${r}`);
        });
      }

      await apiClient.patch(`/auth/users/${activeUser.userId}/roles`, {
        roles: selectedRole === "STAFF" ? [] : [selectedRole],
        permissions: selectedPermissions,
      });

      setAssignments((current) => ({
        ...current,
        [activeUser.id]: clonePermissions(draftPermissions),
      }));
      setStatusMessage(`Saved rights and assigned role ${selectedRole} for ${activeUser.displayName}`);
      queryClient.invalidateQueries({ queryKey: ["hr-approved-staff"] });
    } catch (err) {
      setStatusMessage("Failed to update user roles on server.");
    }
    closeEditor();
  };

  const pageContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
    background: "#ffffff",
  };

  const pageContentStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px 24px 24px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 1600,
    margin: "0 auto",
  };

  const topHeaderBoxStyle: React.CSSProperties = {
    padding: "18px 22px",
    borderRadius: "var(--radius, 12px)",
    border: "1px solid var(--color-primary-highlight, rgb(1, 105, 111))",
    background: "var(--inventory-card-bg, #ffffff)",
    boxShadow: "0 4px 16px rgb(37 147 153 / 65%)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    marginBottom: 14,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const surfaceStyle: React.CSSProperties = {
    border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.25)" : "1px solid rgba(1, 105, 111, 0.12)",
    background: isDarkMode
      ? "linear-gradient(180deg, rgba(31, 30, 28, 0.96), rgba(22, 21, 19, 0.92))"
      : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,248,245,0.92))",
    boxShadow: isDarkMode
      ? "0 20px 48px rgba(0, 0, 0, 0.45)"
      : "0 20px 48px rgba(16, 24, 40, 0.08)",
  };

  const summaryCard = (tone: string): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: 12,
    border: `1px solid ${tone}22`,
    background: isDarkMode
      ? `linear-gradient(180deg, ${tone}20, rgba(31, 30, 28, 0.95))`
      : `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.95))`,
    boxShadow: isDarkMode ? "0 14px 30px rgba(0, 0, 0, 0.3)" : "0 14px 30px rgba(16, 24, 40, 0.06)",
    minWidth: 60,
    maxWidth: 160,
  });

  const editorCardStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    boxShadow: isDarkMode ? "0 4px 12px rgba(0, 0, 0, 0.25)" : "0 4px 12px rgba(16, 24, 40, 0.04)",
    background: isDarkMode ? "var(--color-surface-2)" : "#ffffff",
    border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.2)" : "1px solid var(--color-border)",
  };

  const columnHeaderStyle: React.CSSProperties = {
    padding: "8px 4px",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-faint)",
    textAlign: "center",
    borderBottom: "1px solid var(--color-divider)",
    background: isDarkMode ? "#1d1c1a" : "#ffffff",
    whiteSpace: "normal",
    lineHeight: 1.15,
    position: "sticky",
    top: 0,
    zIndex: 20,
    boxShadow: isDarkMode ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <div style={pageContainerStyle}>
      {/* ── 1) Standard ROMS Domain Layout Header (Matching Inventory & Reagent layouts) ── */}
      <div className="domain-layout-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <nav className="domain-nav-container" aria-label="Admin Navigation">
          <div className="domain-nav-link active">
            <span className="nav-icon">🔐</span>
            <span className="nav-text">User Rights Control</span>
          </div>
        </nav>
      </div>

      {/* ── Page Content (Fills remaining height with zero horizontal overflow) ── */}
      <div style={pageContentStyle}>
        {/* ── 2) Top Header Div styled in Box with Border and Shadow matching CheckInPage ── */}
        <div style={topHeaderBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "19px", fontWeight: 800, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "20px" }}>🔐</span>
                  <span>User Rights &amp; Access Control</span>
                </h1>
                <span style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: isDarkMode ? "rgba(79, 152, 163, 0.18)" : "rgba(1, 105, 111, 0.10)",
                  color: "var(--color-primary, #01696F)",
                  border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.35)" : "1px solid rgba(1, 105, 111, 0.22)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase"
                }}>
                  Security Administration Matrix
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0, maxWidth: 840, lineHeight: 1.45 }}>
                Granular institutional governance matrix for ROMS modules. Click any personnel record to inspect, calibrate, or grant domain-specific operational privileges.
              </p>
            </div>
          </div>

          {/* ── KPI Executive Stats Strip (Inside the top box) ── */}
          {!activeUser && !isLoading && !isError && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginTop: 4
            }}>
              {/* Card 1: Total Approved Staff */}
              <div
                onClick={() => { setAccessFilter("all"); setRoleFilter(""); setSearchQuery(""); }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s ease",
                  background: isDarkMode ? "rgba(79, 152, 163, 0.12)" : "rgba(1, 105, 111, 0.04)",
                  border: accessFilter === "all" && !roleFilter && !searchQuery
                    ? "1px solid var(--color-primary)"
                    : (isDarkMode ? "1px solid rgba(79, 152, 163, 0.25)" : "1px solid rgba(1, 105, 111, 0.12)")
                }}
                title="Click to view all approved staff"
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: isDarkMode ? "rgba(79, 152, 163, 0.2)" : "rgba(1, 105, 111, 0.08)",
                  color: "var(--color-primary, #01696F)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  👥
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Approved Staff
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
                      {matrixRows.length}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                      personnel
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active Access Granted */}
              <div
                onClick={() => setAccessFilter("has_access")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s ease",
                  background: isDarkMode ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.04)",
                  border: accessFilter === "has_access"
                    ? "1px solid #10b981"
                    : (isDarkMode ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(16, 185, 129, 0.15)")
                }}
                title="Click to filter users with active permissions"
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: isDarkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.10)",
                  color: "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  🛡️
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active Privileges
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#10b981", lineHeight: 1.2 }}>
                      {usersWithAnyAccess}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                      ({Math.round((usersWithAnyAccess / Math.max(matrixRows.length, 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Pending Onboarding */}
              <div
                onClick={() => setAccessFilter("no_access")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s ease",
                  background: isDarkMode ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.04)",
                  border: accessFilter === "no_access"
                    ? "1px solid #f59e0b"
                    : (isDarkMode ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid rgba(245, 158, 11, 0.15)")
                }}
                title="Click to filter users with zero assigned rights"
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: isDarkMode ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.10)",
                  color: "#d97706",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  ⏳
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Pending Setup
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: matrixRows.length - usersWithAnyAccess > 0 ? "#d97706" : "var(--color-text-muted)", lineHeight: 1.2 }}>
                      {matrixRows.length - usersWithAnyAccess}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                      unassigned
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Governed Domains */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isDarkMode ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.04)",
                  border: isDarkMode ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(99, 102, 241, 0.12)"
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: isDarkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.10)",
                  color: "#6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  🌐
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Governed Modules
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
                      {DOMAIN_CATALOG.length}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                      core domains
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {statusMessage && (
        <div style={{
          flexShrink: 0, marginBottom: 12, padding: "9px 14px", borderRadius: 12,
          background: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
          border: isDarkMode ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid #86efac",
          color: isDarkMode ? "#34d399" : "#166534",
          fontSize: "12px", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span>
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 13, padding: "0 4px" }}
          >
            ×
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          Loading approved employees…
        </div>
      )}

      {isError && (
        <div style={{
          padding: "20px", borderRadius: 14,
          background: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239,68,68,0.06)",
          border: isDarkMode ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(239,68,68,0.18)",
          color: isDarkMode ? "#f87171" : "#991b1b",
          fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: 16
        }}>
          ⚠️ Failed to load employees. Please check your connection and try again.
        </div>
      )}

      {!isLoading && !isError && (
        // Three view states: matrix list → rights editor → review & confirm
        reviewOpen && activeUser && draftPermissions ? (
          /* ── REVIEW PAGE ─────────────────────────────────────────────── */
          <div style={{ ...surfaceStyle, padding: "22px 26px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto", borderRadius: 16 }}>

            {/* ⚠️ Caution Security Verification Banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "14px 18px", borderRadius: 14, marginBottom: 18,
              background: isDarkMode
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(180, 83, 9, 0.12))"
                : "linear-gradient(135deg, rgba(251,191,36,0.14), rgba(245,158,11,0.07))",
              border: isDarkMode
                ? "1px solid rgba(245, 158, 11, 0.4)"
                : "1px solid rgba(245,158,11,0.35)",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: isDarkMode ? "#fbbf24" : "#92400e",
                  lineHeight: 1.35, marginBottom: 4
                }}>
                  Security Review: Privilege Grant for {activeUser.displayName}
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: isDarkMode ? "#fcd34d" : "#a16207",
                  lineHeight: 1.5
                }}>
                  You are about to assign the{" "}
                  <strong style={{ color: isDarkMode ? "#fef08a" : "#78350f", textDecoration: "underline" }}>
                    {selectedRole.replace(/_/g, " ")}
                  </strong>{" "}
                  role with <strong>{listSelectedRights(draftPermissions).length}</strong> granted privilege{listSelectedRights(draftPermissions).length === 1 ? "" : "s"}. These credentials will take effect immediately upon confirmation.
                </div>
              </div>
            </div>

            {/* User Target Card in Review */}
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(1, 105, 111, 0.04)",
              border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(1, 105, 111, 0.12)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(() => {
                  const palette = getAvatarPalette(activeUser.displayName);
                  return (
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: palette.bg, color: palette.text,
                      border: `1px solid ${palette.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13
                    }}>
                      {getInitials(activeUser.displayName)}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text)" }}>
                    {activeUser.displayName}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {activeUser.jobTitle || "Specialist"} · {activeUser.department} · {activeUser.email}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>Target Role:</span>
                <span style={{
                  fontSize: 11.5, fontWeight: 800,
                  padding: "3px 10px", borderRadius: 999,
                  background: "rgba(1, 105, 111, 0.14)", color: "var(--color-primary)",
                  border: "1px solid rgba(1, 105, 111, 0.3)"
                }}>
                  {selectedRole.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Rights summary — domain + badges on the same row */}
            <div style={{ marginBottom: 16, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Privileges Grouped By Domain ({selectedRightsByDomain(draftPermissions).length} active modules)
              </div>
              {selectedRightsByDomain(draftPermissions).length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {selectedRightsByDomain(draftPermissions).map(({ domain, rights }) => (
                    <div key={domain.slug} style={{
                      display: "flex", alignItems: "center", flexWrap: "wrap",
                      gap: 10, padding: "10px 14px", borderRadius: 12,
                      background: isDarkMode ? "rgba(79, 152, 163, 0.10)" : "#ffffff",
                      border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.25)" : "1px solid rgba(1, 105, 111, 0.14)",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
                        <span style={{ fontSize: 16 }}>{domain.emoji}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text)" }}>
                          {domain.name}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          padding: "1px 6px", borderRadius: 6,
                          background: "rgba(1, 105, 111, 0.10)",
                          color: "var(--color-primary)"
                        }}>
                          {rights.length}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
                        {rights.map((right) => (
                          <span
                            key={`${domain.slug}-${right}`}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: isDarkMode ? "rgba(79, 152, 163, 0.2)" : "rgba(1, 105, 111, 0.08)",
                              border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.35)" : "1px solid rgba(1, 105, 111, 0.18)",
                              color: "var(--color-primary, #01696F)"
                            }}
                          >
                            ✓ {right}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", padding: 20, textAlign: "center" }}>
                  No rights selected.
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 14, borderTop: "1px solid var(--color-divider)", marginTop: "auto", flexShrink: 0 }}>
              <button
                onClick={() => setReviewOpen(false)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontSize: "12.5px",
                  fontWeight: 700,
                  background: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "#ffffff",
                  border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  cursor: "pointer"
                }}
              >
                Cancel &amp; Modify
              </button>
              <button
                onClick={confirmSave}
                disabled={listSelectedRights(draftPermissions).length === 0}
                style={{
                  padding: "8px 22px",
                  borderRadius: 10,
                  fontSize: "12.5px",
                  fontWeight: 800,
                  background: "var(--color-primary, #01696F)",
                  border: "none",
                  color: "#ffffff",
                  cursor: listSelectedRights(draftPermissions).length === 0 ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(1, 105, 111, 0.35)",
                  opacity: listSelectedRights(draftPermissions).length === 0 ? 0.6 : 1
                }}
              >
                Confirm &amp; Grant Access
              </button>
            </div>
          </div>
        ) : activeUser === null ? (
          /* ── MATRIX DIRECTORY TABLE VIEW ────────────────────────────── */
          <div style={{ ...surfaceStyle, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 16 }}>
            {/* Table Control Bar: Search, Quick Filters, Role Filter */}
            <div style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--color-divider)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              flexShrink: 0,
              background: isDarkMode ? "#1d1c1a" : "#ffffff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-text)" }}>
                  Personnel Access Matrix
                </div>
                <span style={{
                  fontSize: "10.5px", fontWeight: 700,
                  color: isDarkMode ? "var(--color-primary)" : "var(--color-text-muted)",
                  background: isDarkMode ? "rgba(79, 152, 163, 0.15)" : "rgba(1,105,111,0.08)",
                  border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1,105,111,0.14)",
                  borderRadius: 999, padding: "2px 9px", letterSpacing: "0.04em"
                }}>
                  {filteredRows.length === matrixRows.length ? `${matrixRows.length} users` : `${filteredRows.length} of ${matrixRows.length}`}
                </span>
              </div>

              {/* Filters toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: 10, fontSize: 12, color: "var(--color-text-muted)", pointerEvents: "none" }}>🔍</span>
                  <input
                    id="user-matrix-search"
                    type="text"
                    placeholder="Search name, email, dept…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 28, paddingRight: searchQuery ? 26 : 10, paddingTop: 5, paddingBottom: 5,
                      fontSize: "11.5px", borderRadius: 8,
                      border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1,105,111,0.18)",
                      background: isDarkMode ? "rgba(20, 19, 18, 0.85)" : "rgba(255,255,255,0.85)",
                      color: "var(--color-text)",
                      outline: "none", width: 190,
                      transition: "border-color 0.15s",
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        position: "absolute", right: 6,
                        background: "none", border: "none",
                        color: "var(--color-text-muted)", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, padding: 0
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Role select filter */}
                <select
                  id="user-matrix-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: "5px 26px 5px 10px",
                    fontSize: "11.5px", borderRadius: 8,
                    border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1,105,111,0.18)",
                    background: isDarkMode ? "rgba(20, 19, 18, 0.85)" : "rgba(255,255,255,0.85)",
                    color: roleFilter ? "var(--color-text)" : "var(--color-text-muted)",
                    outline: "none", cursor: "pointer",
                    appearance: "none",
                    backgroundImage: isDarkMode
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F98A3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`
                      : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2301696F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option value="">All Roles</option>
                  {allRoles.map((role) => (
                    <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
                  ))}
                </select>

                {(searchQuery || roleFilter || deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("");
                      setDeptFilter("");
                      setAccessFilter("all");
                      setUserSortKey("name_asc");
                    }}
                    style={{
                      padding: "4px 10px", fontSize: "11px", fontWeight: 700,
                      borderRadius: 8,
                      border: isDarkMode ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(220,38,38,0.22)",
                      background: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(220,38,38,0.06)",
                      color: isDarkMode ? "#f87171" : "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="table-responsive-container" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "1040px", tableLayout: "fixed", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...columnHeaderStyle, width: "3.5%" }}>#</th>
                    <th style={{ ...columnHeaderStyle, width: "17%", textAlign: "left", paddingLeft: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800 }}>Employee &amp; Role</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserDropdownOpen((prev) => !prev);
                          }}
                          title="Sort & Filter Users"
                          style={{
                            background: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc")
                              ? (isDarkMode ? "rgba(79, 152, 163, 0.25)" : "rgba(1, 105, 111, 0.15)")
                              : "transparent",
                            border: "1px solid",
                            borderColor: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc")
                              ? "var(--color-primary)"
                              : (isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"),
                            borderRadius: 4,
                            padding: "2px 4px",
                            cursor: "pointer",
                            fontSize: 9,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            color: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc")
                              ? "var(--color-primary)"
                              : "var(--color-text-muted)"
                          }}
                        >
                          <span style={{ fontSize: 9 }}>
                            {userSortKey === "name_asc" ? "▲" : userSortKey === "name_desc" ? "▼" : "▾"}
                          </span>
                          {(deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") && (
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-primary)" }} />
                          )}
                        </button>
                      </div>

                      {userDropdownOpen && (
                        <div
                          ref={userDropdownRef}
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            marginTop: 4,
                            width: 240,
                            background: isDarkMode ? "#1f1e1c" : "#ffffff",
                            border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1, 105, 111, 0.25)",
                            borderRadius: 12,
                            boxShadow: isDarkMode ? "0 12px 28px rgba(0,0,0,0.6)" : "0 12px 28px rgba(0,0,0,0.18)",
                            zIndex: 100,
                            padding: "12px 14px",
                            fontSize: 12,
                            color: "var(--color-text)",
                            textTransform: "none",
                            letterSpacing: "normal",
                            fontWeight: "normal"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--color-divider)" }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: "var(--color-text)" }}>Sort &amp; Filter Users</span>
                            {(deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") && (
                              <button
                                onClick={() => {
                                  setUserSortKey("name_asc");
                                  setDeptFilter("");
                                  setAccessFilter("all");
                                }}
                                style={{ fontSize: 10, fontWeight: 700, color: isDarkMode ? "#f87171" : "#b91c1c", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          {/* Sort Options */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
                              Sort Options
                            </div>
                            <div style={{ display: "grid", gap: 3 }}>
                              {[
                                { key: "name_asc", label: "🔤 Name: A → Z (Default)" },
                                { key: "name_desc", label: "🔤 Name: Z → A" },
                                { key: "rights_desc", label: "📊 Most Rights Granted" },
                                { key: "rights_asc", label: "📊 Fewest Rights Granted" },
                                { key: "dept_asc", label: "🏢 By Department (A → Z)" },
                                { key: "role_asc", label: "💼 By Role (A → Z)" },
                              ].map((opt) => {
                                const selected = userSortKey === opt.key;
                                return (
                                  <div
                                    key={opt.key}
                                    onClick={() => setUserSortKey(opt.key as UserSortKey)}
                                    style={{
                                      padding: "5px 8px",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      fontSize: 11,
                                      fontWeight: selected ? 700 : 500,
                                      background: selected
                                        ? (isDarkMode ? "rgba(79, 152, 163, 0.22)" : "rgba(1, 105, 111, 0.1)")
                                        : "transparent",
                                      color: selected ? "var(--color-primary)" : "var(--color-text)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between"
                                    }}
                                  >
                                    <span>{opt.label}</span>
                                    {selected && <span style={{ fontWeight: 800 }}>✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Access Filter Section */}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4, letterSpacing: "0.05em" }}>
                              Filter by Access
                            </div>
                            <select
                              value={accessFilter}
                              onChange={(e) => setAccessFilter(e.target.value as any)}
                              style={{
                                width: "100%",
                                padding: "4px 8px",
                                fontSize: 11,
                                borderRadius: 6,
                                border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1, 105, 111, 0.2)",
                                background: isDarkMode ? "#141312" : "rgba(255,255,255,0.9)",
                                color: "var(--color-text)",
                                outline: "none"
                              }}
                            >
                              <option value="all">All Users</option>
                              <option value="has_access">Has Active Rights (&gt;0)</option>
                              <option value="no_access">No Rights Assigned (0)</option>
                              <option value="admin">System Admins Only</option>
                            </select>
                          </div>

                          {/* Department Filter Section */}
                          {allDepartments.length > 0 && (
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4, letterSpacing: "0.05em" }}>
                                Filter by Department
                              </div>
                              <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  borderRadius: 6,
                                  border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1, 105, 111, 0.2)",
                                  background: isDarkMode ? "#141312" : "rgba(255,255,255,0.9)",
                                  color: "var(--color-text)",
                                  outline: "none"
                                }}
                              >
                                <option value="">All Departments</option>
                                {allDepartments.map((dept) => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                    {DOMAIN_CATALOG.map((domain) => (
                      <th key={domain.slug} style={{ ...columnHeaderStyle, width: "7.95%" }}>
                        <div style={{ display: "grid", justifyItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 15, lineHeight: 1 }}>{domain.emoji}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.15 }}>{domain.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={DOMAIN_CATALOG.length + 2}
                        style={{ padding: "36px 12px", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)" }}
                      >
                        No personnel match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => {
                      const palette = getAvatarPalette(row.user.displayName);
                      const hasAccess = row.enabledRights > 0;

                      return (
                        <tr
                          key={row.user.id}
                          onClick={() => openEditor(row.user)}
                          style={{
                            height: "44px",
                            cursor: "pointer",
                            borderBottom: isDarkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(1, 105, 111, 0.08)",
                            transition: "background 0.12s, border-left 0.12s"
                          }}
                          onMouseEnter={(event) => {
                            const tr = event.currentTarget as HTMLTableRowElement;
                            tr.style.background = isDarkMode ? "rgba(79, 152, 163, 0.14)" : "rgba(1, 105, 111, 0.04)";
                          }}
                          onMouseLeave={(event) => {
                            const tr = event.currentTarget as HTMLTableRowElement;
                            tr.style.background = "transparent";
                          }}
                        >
                          {/* Row number */}
                          <td style={{ padding: "8px 6px", fontSize: "10.5px", color: "var(--color-text-muted)", verticalAlign: "middle", textAlign: "center" }}>
                            {index + 1}
                          </td>

                          {/* Employee Identity Cell with Avatar & Details */}
                          <td style={{ padding: "6px 12px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                background: palette.bg,
                                color: palette.text,
                                border: `1px solid ${palette.border}`,
                                flexShrink: 0
                              }}>
                                {getInitials(row.user.displayName)}
                              </div>
                              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                                <div style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: "var(--color-text)",
                                  lineHeight: 1.25,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}>
                                  {row.user.displayName}
                                </div>
                                <div style={{
                                  fontSize: "10px",
                                  color: "var(--color-text-muted)",
                                  lineHeight: 1.2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  marginTop: 2
                                }}>
                                  {row.user.department || "Staff"} · <span style={{ opacity: 0.9 }}>{row.user.role.replace(/_/g, " ")}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Domain Privilege Badges */}
                          {DOMAIN_CATALOG.map((domain) => {
                            const count = row.selection[domain.slug]?.size ?? 0;
                            const active = count > 0;
                            return (
                              <td key={domain.slug} style={{ padding: "6px 4px", verticalAlign: "middle", textAlign: "center" }}>
                                {active ? (
                                  <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "2.5px 7px",
                                    borderRadius: 999,
                                    background: isDarkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(1, 105, 111, 0.08)",
                                    border: isDarkMode ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(1, 105, 111, 0.2)",
                                    color: isDarkMode ? "#34d399" : "#01696F",
                                    fontWeight: 800,
                                    fontSize: "9.5px",
                                    minWidth: 36,
                                    justifyContent: "center"
                                  }}>
                                    <span style={{ fontSize: "10px", lineHeight: 1 }}>✓</span>
                                    <span>{count}</span>
                                  </div>
                                ) : (
                                  <span style={{
                                    color: isDarkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
                                    fontSize: "11px",
                                    fontWeight: 500
                                  }}>
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── RIGHTS EDITOR VIEW (Active User Selected) ───────────────── */
          <div style={{ ...surfaceStyle, padding: "16px 20px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 16 }}>
            {/* Top Editor Header: User Identity & Action Buttons */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: "1px solid var(--color-divider)",
              flexShrink: 0
            }}>
              {/* Left: Employee identity */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(() => {
                  const palette = getAvatarPalette(activeUser.displayName);
                  return (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: palette.bg, color: palette.text,
                      border: `1px solid ${palette.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13, flexShrink: 0
                    }}>
                      {getInitials(activeUser.displayName)}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--color-text)", lineHeight: 1.2 }}>
                    {activeUser.displayName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>
                    {activeUser.jobTitle || "Personnel"} · {activeUser.department} · {activeUser.email}
                  </div>
                </div>
              </div>

              {/* Right: Role Template + Quick Tools + Back/Save */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Role Template Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)" }}>Template Role:</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setSelectedRole(newRole);

                      const seed = ROLE_SEEDS[newRole] ?? {};
                      const newPerms = Object.fromEntries(
                        DOMAIN_CATALOG.map((domain) => {
                          if (newRole === "STAFF") {
                            if (domain.slug === "hr") {
                              return ["hr", new Set(["Personnel Registration"])];
                            }
                            return [domain.slug, new Set()];
                          }
                          const rights = seed[domain.slug] ?? [];
                          const allowedRights = (DOMAIN_RIGHTS[domain.slug] ?? []).filter((right) => rights.includes(right));
                          return [domain.slug, new Set(allowedRights)];
                        })
                      ) as PermissionState;
                      setDraftPermissions(newPerms);
                    }}
                    style={{
                      padding: "4px 24px 4px 8px",
                      fontSize: "11px", borderRadius: 8,
                      border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.3)" : "1px solid rgba(1,105,111,0.22)",
                      background: isDarkMode ? "rgba(20, 19, 18, 0.85)" : "#ffffff",
                      color: "var(--color-text)",
                      outline: "none", cursor: "pointer",
                      appearance: "none",
                      backgroundImage: isDarkMode
                        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234F98A3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`
                        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2301696F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    <option value="STAFF">Staff (Restricted Onboarding)</option>
                    <option value="LAB_SCIENTIST">Lab Scientist</option>
                    <option value="DATA_MANAGER">Data Manager</option>
                    <option value="RESEARCH_ADMIN">Research Admin</option>
                    <option value="PRINCIPAL_INVESTIGATOR">Principal Investigator</option>
                    <option value="QA_OFFICER">QA Officer</option>
                    <option value="COMMUNITY_ENGAGEMENT">Community Engagement</option>
                    <option value="ADMIN">Admin (All Rights)</option>
                  </select>
                </div>

                {/* Quick actions: Grant All & Clear All */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={grantAllDomains}
                    title="Grant all privileges across all domains"
                    style={{
                      padding: "4px 8px", fontSize: "10.5px", fontWeight: 700,
                      borderRadius: 6,
                      background: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#10b981", cursor: "pointer"
                    }}
                  >
                    + Grant All
                  </button>
                  <button
                    onClick={clearAllDomains}
                    title="Clear all selected privileges"
                    style={{
                      padding: "4px 8px", fontSize: "10.5px", fontWeight: 700,
                      borderRadius: 6,
                      background: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: isDarkMode ? "#f87171" : "#b91c1c", cursor: "pointer"
                    }}
                  >
                    Clear All
                  </button>
                </div>

                {/* Count badge */}
                <span style={{
                  fontSize: "11px", fontWeight: 800,
                  padding: "3px 9px", borderRadius: 999,
                  background: isDarkMode ? "rgba(79, 152, 163, 0.2)" : "rgba(1, 105, 111, 0.10)",
                  color: "var(--color-primary, #01696F)",
                  border: isDarkMode ? "1px solid rgba(79, 152, 163, 0.35)" : "1px solid rgba(1, 105, 111, 0.22)"
                }}>
                  {listSelectedRights(activeSelection!).length} rights selected
                </span>

                {/* Back & Save */}
                <button
                  onClick={closeEditor}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "#ffffff",
                    border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    cursor: "pointer"
                  }}
                  title="Close editor and return to matrix (Esc)"
                >
                  Back (Esc)
                </button>
                <button
                  onClick={saveDraft}
                  disabled={listSelectedRights(activeSelection!).length === 0}
                  style={{
                    padding: "5px 16px",
                    borderRadius: 8,
                    fontSize: "11.5px",
                    fontWeight: 800,
                    background: "var(--color-primary, #01696F)",
                    border: "none",
                    color: "#ffffff",
                    cursor: listSelectedRights(activeSelection!).length === 0 ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(1, 105, 111, 0.35)",
                    opacity: listSelectedRights(activeSelection!).length === 0 ? 0.6 : 1
                  }}
                >
                  Save Privileges →
                </button>
              </div>
            </div>

            {/* Fluid Auto-Fitting Grid: NO Horizontal Scrolling on small PC screens, smooth vertical flow */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: 4,
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                  gap: 10,
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {DOMAIN_CATALOG.map((domain) => {
                  const rightOptions = getDomainRightOptions(domain.slug);
                  const enabled = activeSelection![domain.slug] ?? new Set<string>();
                  const selectedCount = countSelectedRightOptions(activeSelection!, domain.slug);
                  const allSelected = rightOptions.length > 0 && selectedCount === rightOptions.length;
                  const ratio = selectedCount / Math.max(rightOptions.length, 1);

                  return (
                    <div
                      key={domain.slug}
                      style={{
                        ...editorCardStyle,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "10px",
                        minWidth: 0,
                        boxSizing: "border-box",
                        border: selectedCount > 0
                          ? (isDarkMode ? "1px solid rgba(79, 152, 163, 0.35)" : "1px solid rgba(1, 105, 111, 0.25)")
                          : editorCardStyle.border
                      }}
                    >
                      {/* Card Header: Domain Icon, Title, and Select All quick button */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            <span style={{ fontSize: 15, flexShrink: 0 }}>{domain.emoji}</span>
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: "var(--color-text)",
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }} title={domain.name}>
                              {domain.name}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleAllInDomain(domain.slug)}
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 700,
                              padding: "2px 5px",
                              borderRadius: 4,
                              background: allSelected
                                ? (isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)")
                                : (isDarkMode ? "rgba(79, 152, 163, 0.2)" : "rgba(1, 105, 111, 0.08)"),
                              color: allSelected
                                ? (isDarkMode ? "#f87171" : "#b91c1c")
                                : "var(--color-primary, #01696F)",
                              border: "none",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0
                            }}
                            title={allSelected ? "Deselect all rights in this domain" : "Select all rights in this domain"}
                          >
                            {allSelected ? "Clear" : "All"}
                          </button>
                        </div>

                        {/* Domain Progress Bar & Count */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 }}>
                            {selectedCount}/{rightOptions.length} active
                          </span>
                          {selectedCount > 0 && (
                            <span style={{ fontSize: "9.5px", fontWeight: 700, color: allSelected ? "#10b981" : "var(--color-primary)" }}>
                              {Math.round(ratio * 100)}%
                            </span>
                          )}
                        </div>
                        <div style={{
                          width: "100%", height: 3,
                          borderRadius: 2,
                          background: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${ratio * 100}%`,
                            height: "100%",
                            background: allSelected ? "#10b981" : "var(--color-primary, #01696F)",
                            transition: "width 0.2s ease"
                          }} />
                        </div>
                      </div>

                      {/* Checkbox Rows */}
                      <div style={{ display: "grid", gap: 4, flex: 1 }}>
                        {rightOptions.map((option) => {
                          const checked = option.rights.every((right) => enabled.has(right));
                          return (
                            <label
                              key={option.label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 7px",
                                borderRadius: 7,
                                border: checked
                                  ? (isDarkMode ? "1px solid rgba(79, 152, 163, 0.45)" : "1px solid rgba(1, 105, 111, 0.25)")
                                  : (isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(148, 163, 184, 0.22)"),
                                background: checked
                                  ? (isDarkMode ? "rgba(79, 152, 163, 0.18)" : "rgba(1, 105, 111, 0.06)")
                                  : (isDarkMode ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.8)"),
                                cursor: "pointer",
                                minHeight: 24,
                                transition: "all 0.12s ease",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRight(domain.slug, option.rights)}
                                style={{ width: 13, height: 13, accentColor: "var(--color-primary, #01696F)", flexShrink: 0, cursor: "pointer" }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: "10.5px",
                                  fontWeight: checked ? 700 : 500,
                                  color: checked ? "var(--color-text)" : "var(--color-text-muted)",
                                  lineHeight: 1.25,
                                  wordBreak: "break-word"
                                }} title={option.label}>
                                  {option.label}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
      </div>
    </div>
  );
}