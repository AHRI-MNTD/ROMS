import React from "react";
import { DOMAIN_CATALOG } from "@roms/shared";
import { Badge, Button, Card } from "@roms/ui";

type ControlUser = {
  id: string;
  displayName: string;
  email: string;
  department: string;
  jobTitle: string;
  role: string;
  startDate: string;
};

type PermissionState = Record<string, Set<string>>;

const DEMO_USERS: ControlUser[] = [
  {
    id: "staff-alice",
    displayName: "Alice Mwangi",
    email: "scientist@roms.dev",
    department: "Lab Operations",
    jobTitle: "Laboratory Scientist",
    role: "LAB_SCIENTIST",
    startDate: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "staff-brian",
    displayName: "Brian Okonkwo",
    email: "datamanager@roms.dev",
    department: "Data Management",
    jobTitle: "Data Manager",
    role: "DATA_MANAGER",
    startDate: "2026-01-18T00:00:00.000Z",
  },
];

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
  const [assignments, setAssignments] = React.useState<Record<string, PermissionState>>(() =>
    Object.fromEntries(DEMO_USERS.map((user) => [user.id, buildPermissionState(user)])) as Record<string, PermissionState>
  );
  const [editorUserId, setEditorUserId] = React.useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = React.useState<PermissionState | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const activeUser = DEMO_USERS.find((user) => user.id === editorUserId) ?? null;
  const activeSelection = draftPermissions;

  const matrixRows = React.useMemo(() => {
    return DEMO_USERS.map((user) => {
      const selection = assignments[user.id] ?? buildPermissionState(user);
      const enabledDomains = DOMAIN_CATALOG.filter((domain) => hasAnyRights(selection, domain.slug)).length;
      const enabledRights = DOMAIN_CATALOG.reduce((sum, domain) => sum + (selection[domain.slug]?.size ?? 0), 0);
      return { user, selection, enabledDomains, enabledRights };
    });
  }, [assignments]);

  const totalAssignedRights = matrixRows.reduce((sum, row) => sum + row.enabledRights, 0);
  const usersWithAnyAccess = matrixRows.filter((row) => row.enabledDomains > 0).length;

  const openEditor = (user: ControlUser) => {
    const current = assignments[user.id] ?? buildPermissionState(user);
    setEditorUserId(user.id);
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

  const confirmSave = () => {
    if (!activeUser || !draftPermissions) {
      return;
    }
    setAssignments((current) => ({
      ...current,
      [activeUser.id]: clonePermissions(draftPermissions),
    }));
    setStatusMessage(`Saved rights for ${activeUser.displayName}`);
    closeEditor();
  };

  const pageStyle: React.CSSProperties = {
    padding: "20px 28px 32px",
    maxWidth: 1600,
    margin: "0 auto",
  };

  const surfaceStyle: React.CSSProperties = {
    border: "1px solid rgba(1, 105, 111, 0.12)",
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,248,245,0.92))",
    boxShadow: "0 20px 48px rgba(16, 24, 40, 0.08)",
  };

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
          Two seeded staff users are loaded here so you can click a user, edit domain-level privileges, review the selected rights, and save the result.
        </p>
      </div>

      {statusMessage && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #86efac", color: "#166534", fontSize: "var(--fs-sm)", fontWeight: 600 }}>
          {statusMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Card title="Seeded Users" subtitle="From staff profiles" style={{ boxShadow: "0 14px 30px rgba(16, 24, 40, 0.06)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{DEMO_USERS.length}</div>
        </Card>
        <Card title="Domains" subtitle="Columns in the matrix" style={{ boxShadow: "0 14px 30px rgba(16, 24, 40, 0.06)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{DOMAIN_CATALOG.length}</div>
        </Card>
        <Card title="Assigned Rights" subtitle="Across all users" style={{ boxShadow: "0 14px 30px rgba(16, 24, 40, 0.06)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{totalAssignedRights}</div>
        </Card>
        <Card title="Users With Access" subtitle="At least one domain right" style={{ boxShadow: "0 14px 30px rgba(16, 24, 40, 0.06)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-text)" }}>{usersWithAnyAccess}</div>
        </Card>
      </div>

      <div style={{ ...surfaceStyle, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--color-divider)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>User matrix</div>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>Click a user row to edit the privileges in a right-side overlay.</div>
          </div>
          <Badge label="Green check = at least 1 right" color="success" />
        </div>

        <div>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...columnHeaderStyle, width: "4.5%" }}>No_</th>
                <th style={{ ...columnHeaderStyle, width: "18%", textAlign: "left" }}>Users</th>
                {DOMAIN_CATALOG.map((domain) => (
                  <th key={domain.slug} style={{ ...columnHeaderStyle, width: "7.75%" }}>
                    <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{domain.emoji}</span>
                      <span>{domain.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row, index) => (
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
                  <td style={{ padding: "12px", fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", verticalAlign: "top" }}>{index + 1}</td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 800, color: "var(--color-text)", lineHeight: 1.25, marginBottom: 6 }}>{row.user.displayName}</div>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <Badge label={row.user.role.replace(/_/g, " ")} color="muted" />
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", lineHeight: 1.2 }}>{row.user.department}</span>
                    </div>
                  </td>
                  {DOMAIN_CATALOG.map((domain) => {
                    const count = row.selection[domain.slug]?.size ?? 0;
                    const active = count > 0;
                    return (
                      <td key={domain.slug} style={{ padding: "10px 6px", verticalAlign: "top", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, background: active ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.10)", color: active ? "#047857" : "#991b1b", fontWeight: 800, fontSize: "10px", minWidth: 42, justifyContent: "center" }}>
                          <span aria-hidden="true">{active ? "✓" : "✕"}</span>
                          <span>{count}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                    {activeUser.jobTitle} · {activeUser.department} · {activeUser.email}
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
                Confirming will apply {listSelectedRights(draftPermissions).length} selected privilege{listSelectedRights(draftPermissions).length === 1 ? "" : "s"} to this staff user.
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