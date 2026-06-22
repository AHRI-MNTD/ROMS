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
};

type PermissionState = Record<string, Set<string>>;

const DOMAIN_RIGHTS: Record<string, string[]> = {
  biospecimen: ["Dashboard", "Sample Collection", "Processing", "Storage", "Retrieval", "Disposal", "Analytics"],
  inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out", "Request/s", "Analytics", "Master Data"],
  qms: ["Dashboard", "SOP Library", "Document Control", "Audits", "CAPA", "Training", "Analytics"],
  "lab-workflow": ["Dashboard", "Protocols", "Experiments", "Runs", "Instruments", "Reports", "Analytics"],
  "data-management": ["Dashboard", "Studies", "Metadata", "Data Dictionary", "Exports", "Integrations", "Analytics"],
  infrastructure: ["Dashboard", "Services", "Servers", "Monitoring", "Incidents", "Integrations", "Analytics"],
  hr: ["Dashboard", "Staff Directory", "Profiles", "Training Records", "Leave", "Onboarding", "Analytics"],
  finance: ["Dashboard", "Grants", "Budgets", "Expenses", "Approvals", "Reports", "Analytics"],
  participant: ["Dashboard", "Participants", "Consent", "Visits", "Engagement", "Follow-up", "Analytics"],
  regulatory: ["Dashboard", "Ethics Review", "Approvals", "Compliance Register", "Incidents", "Reporting", "Analytics"],
};

const ROLE_SEEDS: Record<string, Record<string, string[]>> = {
  LAB_SCIENTIST: {
    biospecimen: ["Dashboard", "Sample Collection", "Processing"],
    inventory: ["Dashboard", "Current Inventory", "Check In", "Check Out"],
    "lab-workflow": ["Dashboard", "Protocols", "Experiments"],
    "data-management": ["Dashboard"],
    qms: ["SOP Library"],
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
    inventory: ["Dashboard", "Current Inventory", "Analytics", "Master Data"],
    qms: ["Dashboard", "SOP Library", "Audits"],
    hr: ["Dashboard", "Staff Directory", "Profiles"],
    finance: ["Dashboard", "Grants", "Budgets"],
    participant: ["Dashboard"],
    regulatory: ["Dashboard", "Compliance Register"],
    "data-management": ["Dashboard", "Studies"],
    infrastructure: ["Dashboard"],
  },
  PRINCIPAL_INVESTIGATOR: {
    biospecimen: ["Dashboard", "Retrieval"],
    inventory: ["Dashboard"],
    qms: ["Dashboard", "Audits"],
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
    qms: ["Dashboard", "SOP Library", "Audits", "CAPA"],
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
  ADMIN: Object.fromEntries(DOMAIN_CATALOG.map((domain) => [domain.slug, ["Dashboard", ...((DOMAIN_RIGHTS[domain.slug] ?? []).filter((right) => right !== "Dashboard"))]])) as Record<string, string[]>,
};

function clonePermissions(source: PermissionState): PermissionState {
  return Object.fromEntries(Object.entries(source).map(([slug, rights]) => [slug, new Set(rights)])) as PermissionState;
}

function buildPermissionState(user: ControlUser): PermissionState {
  if (user.role === "ADMIN") {
    const seed = ROLE_SEEDS.ADMIN ?? {};
    return Object.fromEntries(
      DOMAIN_CATALOG.map((domain) => {
        const rights = seed[domain.slug] ?? [];
        return [domain.slug, new Set(rights)];
      })
    ) as PermissionState;
  }

  // New/Staff approved users start with exactly and only Training Records under hr
  if (user.role === "STAFF" || !ROLE_SEEDS[user.role]) {
    return Object.fromEntries(
      DOMAIN_CATALOG.map((domain) => {
        if (domain.slug === "hr") {
          return ["hr", new Set(["Training Records"])];
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
    return (approvedData.data as any[]).map((profile: any) => {
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
    return matrixRows.filter((row) => {
      const matchesSearch =
        q === "" ||
        row.user.displayName.toLowerCase().includes(q) ||
        row.user.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "" || row.user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [matrixRows, searchQuery, roleFilter]);

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

  const toggleRight = (slug: string, right: string) => {
    setDraftPermissions((current) => {
      if (!current) {
        return current;
      }
      const next = clonePermissions(current);
      const rights = next[slug] ?? new Set<string>();
      if (rights.has(right)) {
        rights.delete(right);
      } else {
        rights.add(right);
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
      await apiClient.patch(`/auth/users/${activeUser.userId}/roles`, {
        roles: selectedRole === "STAFF" ? [] : [selectedRole],
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
    padding: "20px 28px 32px",
    maxWidth: 1600,
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
    padding: 12,
    borderRadius: 18,
    boxShadow: "0 10px 24px rgba(16, 24, 40, 0.06)",
    height: "100%",
  };

  const columnHeaderStyle: React.CSSProperties = {
    padding: "8px 6px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-faint)",
    textAlign: "center",
    borderBottom: "1px solid var(--color-divider)",
    background: "rgba(255,255,255,0.72)",
    whiteSpace: "normal",
    lineHeight: 1.15,
  };

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", margin: 0 }}>
            🔐 User Right Control
          </h1>
          <Badge label="Admin access matrix" color="primary" />
        </div>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", maxWidth: 920, lineHeight: 1.6 }}>
          Approved employees from HR Personnel Database appear here. Click a user to edit domain-level privileges, review the selected rights, and save the result.
        </p>
      </div>

      {statusMessage && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #86efac", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 600 }}>
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
      <div style={{ ...surfaceStyle, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--color-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
            {(searchQuery || roleFilter) && (
              <button
                onClick={() => { setSearchQuery(""); setRoleFilter(""); }}
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

        <div>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...columnHeaderStyle, width: "4%" }}>No_</th>
                <th style={{ ...columnHeaderStyle, width: "13%", textAlign: "left" }}>Users</th>
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
                  style={{ cursor: "pointer", borderBottom: "1px solid rgba(1, 105, 111, 0.08)", transition: "background 0.12s" }}
                  onMouseEnter={(event) => {
                    (event.currentTarget as HTMLTableRowElement).style.background = "rgba(1, 105, 111, 0.03)";
                  }}
                  onMouseLeave={(event) => {
                    (event.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "10px 12px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", verticalAlign: "middle" }}>{index + 1}</td>
                  <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                    <div style={{ fontWeight: 700, color: "var(--color-text)", lineHeight: 1.25 }}>{row.user.displayName}</div>
                  </td>
                  {DOMAIN_CATALOG.map((domain) => {
                    const count = row.selection[domain.slug]?.size ?? 0;
                    const active = count > 0;
                    return (
                      <td key={domain.slug} style={{ padding: "10px 6px", verticalAlign: "middle", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, background: active ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.10)", color: active ? "#047857" : "#991b1b", fontWeight: 800, fontSize: "10px", minWidth: 42, justifyContent: "center" }}>
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
      )}
      {activeUser && activeSelection && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: sidebarWidth,
            background: "rgba(15, 23, 42, 0.44)",
            backdropFilter: "blur(4px)",
            zIndex: 60,
          }}
          onClick={closeEditor}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-rights-editor-title"
            onClick={(event) => event.stopPropagation()}
            style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,248,244,0.98))", boxShadow: "-24px 0 64px rgba(15, 23, 42, 0.25)", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div style={{ padding: "20px 20px 20px", borderBottom: "1px solid var(--color-divider)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 15, flexWrap: "wrap", marginTop: 19 }}>
                <div>
                  <div id="user-rights-editor-title" style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)", marginBottom: 6 }}>
                    {activeUser.displayName}
                  </div>
                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
                    {activeUser.jobTitle} · {activeUser.department} · {activeUser.email}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>Assigned Role:</span>
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
                        padding: "6px 28px 6px 10px",
                        fontSize: "var(--fs-xs)", borderRadius: 10,
                        border: "1px solid rgba(1,105,111,0.18)",
                        background: "rgba(255,255,255,0.85)",
                        color: "var(--color-text)",
                        outline: "none", cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2301696F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
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
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  <Badge label={activeUser.role.replace(/_/g, " ")} color="primary" />
                  <Badge label={`${listSelectedRights(activeSelection).length} selected rights`} color="success" />
                  <Button variant="secondary" onClick={closeEditor}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={saveDraft} disabled={listSelectedRights(activeSelection).length === 0}>
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 10,
                  height: "100%",
                }}
              >
                {DOMAIN_CATALOG.map((domain) => {
                  const rights = DOMAIN_RIGHTS[domain.slug] ?? [];
                  const enabled = activeSelection[domain.slug] ?? new Set<string>();
                  return (
                    <Card
                      key={domain.slug}
                      title={`${domain.emoji} ${domain.name}`}
                      subtitle={`${enabled.size}/${rights.length} selected`}
                      style={editorCardStyle}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        {rights.map((right) => {
                          const checked = enabled.has(right);
                          return (
                            <label key={right} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 12, border: checked ? "1px solid rgba(1, 105, 111, 0.22)" : "1px solid rgba(148, 163, 184, 0.22)", background: checked ? "rgba(1, 105, 111, 0.06)" : "rgba(255,255,255,0.7)", cursor: "pointer", minHeight: 34 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRight(domain.slug, right)}
                                style={{ width: 16, height: 16, accentColor: "var(--color-primary)", flexShrink: 0 }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.2 }}>{right}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 12, paddingTop: 14, borderTop: "1px solid var(--color-divider)" }}>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                  Review the selected rights before saving. The confirmation step lists every checked privilege.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewOpen && activeUser && draftPermissions && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: sidebarWidth,
            background: "rgba(15, 23, 42, 0.58)",
            zIndex: 70,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={() => setReviewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-rights-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, 100%)", borderRadius: 24, background: "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,248,244,0.98))", border: "1px solid rgba(255,255,255,0.24)", boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)", overflow: "hidden" }}
          >
            <div style={{ padding: 20, borderBottom: "1px solid var(--color-divider)" }}>
              <div id="review-rights-title" style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--color-text)", marginBottom: 6 }}>
                Are you sure you want to give these rights to {activeUser.displayName}?
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                Confirming will assign the <strong style={{ color: "var(--color-primary)" }}>{selectedRole.replace(/_/g, " ")}</strong> role and apply {listSelectedRights(draftPermissions).length} selected privilege{listSelectedRights(draftPermissions).length === 1 ? "" : "s"} to this staff user.
              </div>
            </div>
            <div style={{ padding: 20, maxHeight: 420, overflowY: "auto" }}>
              {selectedRightsByDomain(draftPermissions).length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedRightsByDomain(draftPermissions).map(({ domain, rights }) => (
                    <div key={domain.slug} style={{ padding: 14, borderRadius: 16, background: "rgba(1, 105, 111, 0.05)", border: "1px solid rgba(1, 105, 111, 0.10)" }}>
                      <div style={{ fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>
                        {domain.emoji} {domain.name}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
            <div style={{ padding: 20, borderTop: "1px solid var(--color-divider)", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>
                No, cancel
              </Button>
              <Button variant="primary" onClick={confirmSave} disabled={listSelectedRights(draftPermissions).length === 0}>
                Yes, give the privilege
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}