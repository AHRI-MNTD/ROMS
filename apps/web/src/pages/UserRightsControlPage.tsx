import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DOMAIN_CATALOG } from "@roms/shared";
import { Badge, Button, Card } from "@roms/ui";
import { apiClient } from "../api/client";

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
  { label: "Check In / Check Out", rights: ["Check In", "Check Out"] },
  { label: "Check In / Out History", rights: ["Check In History", "Check Out History"] },
  { label: "Request/s", rights: ["Request/s"] },
  { label: "Inventory Manager", rights: ["Inventory Manager"] },
  { label: "Analytics", rights: ["Analytics"] },
  { label: "Master Data", rights: ["Master Data"] },
];

const DOMAIN_RIGHTS: Record<string, string[]> = {
  biospecimen: ["Dashboard", "Sample Collection", "Processing", "Storage", "Retrieval", "Disposal", "Analytics"],
  inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Check In History", "Check Out History", "Request/s", "Inventory Manager", "Analytics", "Master Data"],
  qms: ["Dashboard", "Author", "Quality Officer", "Authorizer", "Audits", "CAPA", "Training"],
  "lab-workflow": ["Dashboard", "Protocols", "Instruments", "Experiments", "Runs", "Reports", "Analytics"],
  "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary", "Exports", "Integrations", "Analytics"],
  infrastructure: ["Dashboard", "Services", "Servers", "Monitoring", "Incidents", "Integrations", "Analytics"],
  hr: ["Dashboard", "Profiles", "Leave", "Onboarding", "Personnel Registration", "Performance", "Analytics"],
  finance: ["Dashboard", "Grants", "Budgets", "Expenses", "Approvals", "Reports", "Analytics"],
  participant: ["Dashboard", "Participants", "Consent", "Visits", "Engagement", "Follow-up", "Analytics"],
  regulatory: ["Dashboard", "Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting", "Analytics"],
};

const ROLE_SEEDS: Record<string, Record<string, string[]>> = {
  LAB_SCIENTIST: {
    biospecimen: ["Dashboard", "Sample Collection", "Processing"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s"],
    "lab-workflow": ["Dashboard", "Protocols", "Runs"],
    "data-management": ["Dashboard"],
    qms: ["Dashboard", "Author"],
  },
  DATA_MANAGER: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory"],
    qms: ["Dashboard"],
    participant: ["Dashboard", "Participants"],
    regulatory: ["Dashboard"],
    "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary"],
  },
  RESEARCH_ADMIN: {
    biospecimen: ["Dashboard"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Inventory Manager", "Master Data"],
    qms: ["Dashboard", "Author", "Quality Officer", "Audits", "CAPA"],
    hr: ["Dashboard", "Profiles", "Onboarding", "Personnel Registration"],
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

export default function UserRightsControlPage() {
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

  const pageStyle: React.CSSProperties = {
    padding: "20px 28px 20px",
    maxWidth: 1600,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const surfaceStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,248,245,0.92))",
    boxShadow: "0 20px 48px rgba(16, 24, 40, 0.08)",
  };

  const summaryCard = (tone: string): React.CSSProperties => ({
    padding: "10px 20px",

    borderRadius: 12,
    border: `1px solid ${tone}22`,
    background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.95))`,
    boxShadow: "0 14px 30px rgba(16, 24, 40, 0.06)",
    minWidth: 60,
    maxWidth: 160,
  });
  const editorCardStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    boxShadow: "0 4px 12px rgba(16, 24, 40, 0.04)",
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
    background: "#ffffff",
    whiteSpace: "normal",
    lineHeight: 1.15,
    position: "sticky",
    top: 0,
    zIndex: 20,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--color-text)", margin: 0 }}>
            🔐 User Right Control
          </h1>
          <Badge label="Admin access matrix" color="primary" />
        </div>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", maxWidth: 920, lineHeight: 1.5, margin: 0 }}>
          Approved employees from HR Personnel Database appear here. Click a user to edit domain-level privileges, review the selected rights, and save the result.
        </p>
      </div>

      {statusMessage && (
        <div style={{ flexShrink: 0, marginBottom: 14, padding: "10px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #86efac", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 600 }}>
          {statusMessage}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          Loading approved employees…
        </div>
      )}

      {isError && (
        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#991b1b", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: 16 }}>
          ⚠️ Failed to load employees. Please check your connection and try again.
        </div>
      )}

      {!isLoading && !isError && (
        // Three view states: matrix list → rights editor → review & confirm
        reviewOpen && activeUser && draftPermissions ? (
          /* ── REVIEW PAGE ─────────────────────────────────────────────── */
          <div style={{ ...surfaceStyle, padding: "20px 24px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>

            {/* ⚠️ Caution banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
              border: "1px solid rgba(245,158,11,0.35)",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", lineHeight: 1.35, marginBottom: 3 }}>
                  You are about to grant access rights to {activeUser.displayName}
                </div>
                <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.5 }}>
                  This will assign the{" "}
                  <strong style={{ color: "#78350f" }}>{selectedRole.replace(/_/g, " ")}</strong>{" "}
                  role with {listSelectedRights(draftPermissions).length} privilege{listSelectedRights(draftPermissions).length === 1 ? "" : "s"}. Please review carefully before confirming.
                </div>
              </div>
            </div>

            {/* Rights summary — domain + badges on the same row */}
            <div style={{ marginBottom: 16 }}>
              {selectedRightsByDomain(draftPermissions).length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {selectedRightsByDomain(draftPermissions).map(({ domain, rights }) => (
                    <div key={domain.slug} style={{
                      display: "flex", alignItems: "center", flexWrap: "wrap",
                      gap: 8, padding: "8px 12px", borderRadius: 10,
                      background: "rgba(1, 105, 111, 0.04)",
                      border: "1px solid rgba(1, 105, 111, 0.10)",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)", whiteSpace: "nowrap", minWidth: 220 }}>
                        {domain.emoji} {domain.name}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
                        {rights.map((right) => (
                          <Badge key={`${domain.slug}-${right}`} label={right} color="primary" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>No rights selected.</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid var(--color-divider)", marginTop: "auto", flexShrink: 0 }}>
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>
                No, cancel
              </Button>
              <Button variant="primary" onClick={confirmSave} disabled={listSelectedRights(draftPermissions).length === 0}>
                Yes, give the privilege
              </Button>
            </div>
          </div>
        ) : activeUser === null ? (
          <div style={{ ...surfaceStyle, overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--color-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0, background: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>User matrix</div>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)", background: "rgba(1,105,111,0.08)", border: "1px solid rgba(1,105,111,0.14)", borderRadius: 999, padding: "2px 10px", letterSpacing: "0.04em" }}>
                  {filteredRows.length === matrixRows.length ? `${matrixRows.length} users` : `${filteredRows.length} / ${matrixRows.length} users`}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: 10, fontSize: 13, color: "var(--color-text-faint)", pointerEvents: "none" }}>🔍</span>
                  <input
                    id="user-matrix-search"
                    type="text"
                    placeholder="Search users…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                      fontSize: "var(--fs-xs)", borderRadius: 10,
                      border: "1px solid rgba(1,105,111,0.18)",
                      background: "rgba(255,255,255,0.85)",
                      color: "var(--color-text)",
                      outline: "none", width: 180,
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(1,105,111,0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(1,105,111,0.18)"; }}
                  />
                </div>
                <select
                  id="user-matrix-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: "6px 28px 6px 10px",
                    fontSize: "var(--fs-xs)", borderRadius: 10,
                    border: "1px solid rgba(1,105,111,0.18)",
                    background: "rgba(255,255,255,0.85)",
                    color: roleFilter ? "var(--color-text)" : "var(--color-text-muted)",
                    outline: "none", cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2301696F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option value="">All roles</option>
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
                      padding: "5px 12px", fontSize: "var(--fs-xs)", fontWeight: 700,
                      borderRadius: 10, border: "1px solid rgba(220,38,38,0.22)",
                      background: "rgba(220,38,38,0.06)", color: "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive-container" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "1000px", tableLayout: "fixed", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...columnHeaderStyle, width: "4%" }}>No_</th>
                    <th style={{ ...columnHeaderStyle, width: "13%", textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800 }}>Users</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserDropdownOpen((prev) => !prev);
                          }}
                          title="Sort & Filter Users"
                          style={{
                            background: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") ? "rgba(1, 105, 111, 0.15)" : "transparent",
                            border: "1px solid",
                            borderColor: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") ? "var(--color-primary)" : "rgba(0,0,0,0.12)",
                            borderRadius: 4,
                            padding: "2px 4px",
                            cursor: "pointer",
                            fontSize: 9,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            color: (deptFilter || accessFilter !== "all" || userSortKey !== "name_asc") ? "var(--color-primary)" : "var(--color-text-muted)"
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
                            background: "#ffffff",
                            border: "1px solid rgba(1, 105, 111, 0.25)",
                            borderRadius: 12,
                            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
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
                                style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", padding: 0 }}
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
                                      background: selected ? "rgba(1, 105, 111, 0.1)" : "transparent",
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
                                border: "1px solid rgba(1, 105, 111, 0.2)",
                                background: "rgba(255,255,255,0.9)",
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
                                  border: "1px solid rgba(1, 105, 111, 0.2)",
                                  background: "rgba(255,255,255,0.9)",
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
                      <th key={domain.slug} style={{ ...columnHeaderStyle, width: "8.3%" }}>
                        <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 16, lineHeight: 1 }}>{domain.emoji}</span>
                          <span>{domain.name}</span>
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
                        style={{ padding: "28px 12px", textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}
                      >
                        No users match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => (
                      <tr
                        key={row.user.id}
                        onClick={() => openEditor(row.user)}
                        style={{ height: "32px", cursor: "pointer", borderBottom: "1px solid rgba(1, 105, 111, 0.08)", transition: "background 0.12s" }}
                        onMouseEnter={(event) => {
                          (event.currentTarget as HTMLTableRowElement).style.background = "rgba(1, 105, 111, 0.03)";
                        }}
                        onMouseLeave={(event) => {
                          (event.currentTarget as HTMLTableRowElement).style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "6px 8px", fontSize: "10px", color: "var(--color-text-muted)", verticalAlign: "middle" }}>{index + 1}</td>
                        <td style={{ padding: "6px 8px", verticalAlign: "middle", overflow: "hidden" }}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "normal",
                              color: "var(--color-text)",
                              lineHeight: 1.25,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            title={row.user.displayName}
                          >
                            {row.user.displayName}
                          </div>
                        </td>
                        {DOMAIN_CATALOG.map((domain) => {
                          const count = row.selection[domain.slug]?.size ?? 0;
                          const active = count > 0;
                          return (
                            <td key={domain.slug} style={{ padding: "6px 4px", verticalAlign: "middle", textAlign: "center" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 999, background: active ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.10)", color: active ? "#047857" : "#991b1b", fontWeight: 800, fontSize: "9px", minWidth: 36, justifyContent: "center" }}>
                                <span aria-hidden="true">{active ? "✓" : "✕"}</span>
                                <span>{count}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...surfaceStyle, padding: "16px 20px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "nowrap", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--color-divider)", minWidth: 0, flexShrink: 0 }}>
              {/* Left: user identity — compact sizing so it doesn't push right side to a new row */}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "0 1 auto" }}>
                <div id="user-rights-editor-title" style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeUser.displayName}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeUser.department} · {activeUser.email}
                </div>
              </div>

              {/* Right: role selector + badges + actions — all on the same row, no wrap */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "nowrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Assigned Role:</span>
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
                            return ["hr", new Set(["Training Records"])];
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
                    padding: "4px 22px 4px 8px",
                    fontSize: "11px", borderRadius: 8,
                    border: "1px solid rgba(1,105,111,0.18)",
                    background: "rgba(255,255,255,0.85)",
                    color: "var(--color-text)",
                    outline: "none", cursor: "pointer",
                    appearance: "none",
                    maxWidth: 160,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2301696F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 6px center",
                  }}
                >
                  <option value="STAFF">Staff (Restricted Onboarding)</option>
                  <option value="LAB_SCIENTIST">Lab Scientist</option>
                  <option value="DATA_MANAGER">Data Manager</option>
                  <option value="RESEARCH_ADMIN">Research Admin</option>
                  <option value="PRINCIPAL_INVESTIGATOR">Principal Investigator</option>
                  <option value="QA_OFFICER">QA Officer</option>
                  <option value="COMMUNITY_ENGAGEMENT">Community Engagement</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <Badge label={activeUser.role.replace(/_/g, " ")} color="primary" />
                <Badge label={`${listSelectedRights(activeSelection!).length} selected rights`} color="success" />
                <Button variant="secondary" onClick={closeEditor} style={{ padding: "5px 10px", height: "auto", fontSize: "11px" }}>
                  Back
                </Button>
                <Button variant="primary" onClick={saveDraft} disabled={listSelectedRights(activeSelection!).length === 0} style={{ padding: "5px 12px", height: "auto", fontSize: "11px" }}>
                  Save
                </Button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {DOMAIN_CATALOG.map((domain) => {
                  const rightOptions = getDomainRightOptions(domain.slug);
                  const enabled = activeSelection![domain.slug] ?? new Set<string>();
                  const domainLabel = `${domain.emoji} ${domain.name}`;
                  const selectedCount = countSelectedRightOptions(activeSelection!, domain.slug);
                  return (
                    <Card
                      key={domain.slug}
                      style={editorCardStyle}
                    >
                      {/* Custom domain header: centered title (2-line clamped), left-aligned count */}
                      <div style={{ marginBottom: 10 }}>
                        <div
                          title={domainLabel}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-text)",
                            lineHeight: 1.3,
                            textAlign: "center",
                            ...(domain.slug === "hr"
                              ? {}
                              : {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }),
                            cursor: "default",
                          }}
                        >
                          {domain.slug === "hr" ? (
                            <>{domain.emoji} HR &amp; Staff<br />Operations</>
                          ) : (
                            domainLabel
                          )}
                        </div>
                        <div style={{ fontSize: "var(--fs-xs, 11px)", color: "var(--color-text-muted)", marginTop: 4, textAlign: "left" }}>
                          {selectedCount}/{rightOptions.length} selected
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {rightOptions.map((option) => {
                          const checked = option.rights.every((right) => enabled.has(right));
                          return (
                            <label key={option.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 6px", borderRadius: 8, border: checked ? "1px solid rgba(1, 105, 111, 0.22)" : "1px solid rgba(148, 163, 184, 0.22)", background: checked ? "rgba(1, 105, 111, 0.06)" : "rgba(255,255,255,0.7)", cursor: "pointer", minHeight: 24 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRight(domain.slug, option.rights)}
                                style={{ width: 13, height: 13, accentColor: "var(--color-primary)", flexShrink: 0 }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text)", lineHeight: 1.2 }}>{option.label}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}