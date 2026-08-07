import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

interface InventoryMasterDataRow {
  id: string;
  category: string;
  unit: string;
  project?: string | null;
  staff?: string | null;
}

interface InventoryMasterDataResponse {
  data: InventoryMasterDataRow[];
  total: number;
  page: number;
  pageSize: number;
  summary?: {
    rows: number;
    categories: number;
    units: number;
    projects: number;
    staff: number;
  };
}

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  // Form states for creating a new record
  const [newCategory, setNewCategory] = React.useState("");
  const [newUnit, setNewUnit] = React.useState("");
  const [newProject, setNewProject] = React.useState("");
  const [newStaff, setNewStaff] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formFeedback, setFormFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Row editing states
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editCategory, setEditCategory] = React.useState("");
  const [editUnit, setEditUnit] = React.useState("");
  const [editProject, setEditProject] = React.useState("");
  const [editStaff, setEditStaff] = React.useState("");
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncGoogleSheets = async () => {
    setFormFeedback(null);
    setIsSyncing(true);
    try {
      const resp = await apiClient.post<{ message?: string }>("/domains/inventory/google-sheets/sync", {});
      setFormFeedback({
        type: "success",
        message: resp.data.message || "Successfully synchronized with Google Sheets!",
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-master-data"] });
    } catch (err: any) {
      setFormFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to sync with Google Sheets.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["inventory-master-data", page, pageSize, search],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory/master-data", {
        params: {
          page,
          pageSize,
          search: search.trim() || undefined,
        },
      });
      return resp.data as InventoryMasterDataResponse;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: Omit<InventoryMasterDataRow, "id">) => {
      const resp = await apiClient.post("/domains/inventory/master-data", payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-master-data"] });
      setNewCategory("");
      setNewUnit("");
      setNewProject("");
      setNewStaff("");
      setShowAddForm(false);
      setFormFeedback({ type: "success", message: "Record added successfully." });
    },
    onError: (err) => {
      setFormFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to add record." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Omit<InventoryMasterDataRow, "id"> }) => {
      const resp = await apiClient.put(`/domains/inventory/master-data/${id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-master-data"] });
      setEditingId(null);
      setFormFeedback({ type: "success", message: "Record updated successfully." });
    },
    onError: (err) => {
      setFormFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update record." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiClient.delete(`/domains/inventory/master-data/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-master-data"] });
      setFormFeedback({ type: "success", message: "Record deleted successfully." });
    },
    onError: (err) => {
      setFormFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to delete record." });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      category: newCategory.trim(),
      unit: newUnit.trim(),
      project: newProject.trim() || null,
      staff: newStaff.trim() || null,
    });
  };

  const handleStartEdit = (row: InventoryMasterDataRow) => {
    setEditingId(row.id);
    setEditCategory(row.category);
    setEditUnit(row.unit);
    setEditProject(row.project || "");
    setEditStaff(row.staff || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      payload: {
        category: editCategory.trim(),
        unit: editUnit.trim(),
        project: editProject.trim() || null,
        staff: editStaff.trim() || null,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this master data record? This may affect inventory forms referencing it.")) {
      deleteMutation.mutate(id);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const summary = data?.summary;

  const formInputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    padding: "5px 8px",
    fontSize: "10.5px",
    width: "100%",
    height: 30,
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header Card */}
      <div
        style={{
          padding: 18,
          borderRadius: 12,
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px var(--color-accent-soft)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "var(--inventory-hero-bg)",
            border: "1px solid var(--color-primary-highlight)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ⚙️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--color-text)" }}>
                Master Configurations
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-highlight)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Reference Data
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>
              Manage categories, units, projects, and active personnel used across all inventory forms
            </div>
          </div>
          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={handleSyncGoogleSheets}
              disabled={isSyncing}
              style={{
                border: "1px solid var(--color-primary-highlight)",
                background: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                borderRadius: "7px",
                padding: "6px 12px",
                fontSize: "10.5px",
                fontWeight: 700,
                height: 32,
                cursor: isSyncing ? "not-allowed" : "pointer",
                opacity: isSyncing ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {isSyncing ? "⏳ Syncing..." : "🔄 Sync Google Sheets"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormFeedback(null);
              }}
              style={{
                border: showAddForm ? "1px solid var(--color-primary)" : "1px solid var(--color-primary-highlight)",
                background: showAddForm ? "var(--color-primary-soft)" : "var(--color-surface)",
                color: "var(--color-primary)",
                borderRadius: "7px",
                padding: "6px 12px",
                fontSize: "10.5px",
                fontWeight: 700,
                height: 32,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {showAddForm ? "✕ Close Editor" : "➕ Add Master Record"}
            </button>
          </div>
        </div>

      </div>

      {formFeedback && (
        <div style={{

          padding: "8px 12px",
          background: formFeedback.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: formFeedback.type === "success" ? "1px solid #bbf7d0" : "1px solid #fca5a5",
          borderRadius: "6px",
          fontSize: "10.5px",
          color: formFeedback.type === "success" ? "#166534" : "#991b1b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{formFeedback.message}</span>
          <button onClick={() => setFormFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            padding: 18,
            borderRadius: 12,
            border: "1px solid var(--color-primary-highlight)",
            background: "var(--inventory-card-bg)",
            boxShadow: "0 2px 10px var(--color-accent-soft)",
            display: "grid",
            gap: 12,
          }}
          className="anim"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ➕
            </div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-text)" }}>New Master Data Entry</span>
            <span
              style={{
                fontSize: "9px",
                padding: "1px 7px",
                borderRadius: 10,
                background: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-highlight)",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Config Record
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Category
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Consumables"
                style={formInputStyle}
              />
            </label>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Unit
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. Vial, Pack"
                style={formInputStyle}
              />
            </label>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Project
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Optional"
                style={formInputStyle}
              />
            </label>
            <label style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
              Staff Name
              <input
                type="text"
                value={newStaff}
                onChange={(e) => setNewStaff(e.target.value)}
                placeholder="Optional"
                style={formInputStyle}
              />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "10.5px",
                height: 30,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-accent-soft)",
                color: "var(--color-text)",
                borderRadius: "6px",
                padding: "5px 12px",
                fontSize: "10.5px",
                fontWeight: 700,
                height: 30,
                cursor: createMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {createMutation.isPending ? "Adding..." : "Add Record"}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Rows (Total)</div>
          <div style={{ color: "var(--color-text)", fontSize: "11px", fontWeight: 700 }}>{summary?.rows ?? data?.total ?? 0}</div>
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Categories</div>
          <div style={{ color: "var(--color-text)", fontSize: "11px", fontWeight: 700 }}>{summary?.categories ?? 0}</div>
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Units</div>
          <div style={{ color: "var(--color-text)", fontSize: "11px", fontWeight: 700 }}>{summary?.units ?? 0}</div>
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Projects</div>
          <div style={{ color: "var(--color-text)", fontSize: "11px", fontWeight: 700 }}>{summary?.projects ?? 0}</div>
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Staff</div>
          <div style={{ color: "var(--color-text)", fontSize: "11px", fontWeight: 700 }}>{summary?.staff ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "space-between", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search category, unit, project, staff..."
          style={{
            minWidth: 260,
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            padding: "4px 8px",
            fontSize: "10px",
            height: 28,
          }}
        />

        <select
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            padding: "4px 8px",
            fontSize: "10px",
            height: 28,
          }}
        >
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </select>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading master data…</div>}
      {!isLoading && isFetching && <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>Refreshing…</div>}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b" }}>
          Could not load master data from API.
        </div>
      )}
      {!isLoading && !error && (() => {
        const rows = data?.data ?? [];

        type ColKey = "category" | "unit" | "project" | "staff";
        const colDefs: Array<{
          key: ColKey;
          label: string;
          editValue: string;
          setEdit: (v: string) => void;
          colWidths: [string, string, string];
        }> = [
          { key: "category", label: "Categories", editValue: editCategory, setEdit: setEditCategory, colWidths: ["12%", "72%", "16%"] },
          { key: "unit", label: "Units", editValue: editUnit, setEdit: setEditUnit, colWidths: ["20%", "56%", "24%"] },
          { key: "project", label: "Projects", editValue: editProject, setEdit: setEditProject, colWidths: ["20%", "56%", "24%"] },
          { key: "staff", label: "Staff", editValue: editStaff, setEdit: setEditStaff, colWidths: ["15%", "65%", "20%"] },
        ];

        const colRows = (key: ColKey) =>
          rows
            .filter((r) => String(r[key] ?? "").trim() !== "")
            .sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")));

        const hasAny = colDefs.some((c) => colRows(c.key).length > 0);
        if (!hasAny) {
          return (
            <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius)", background: "var(--color-surface-2)", padding: "10px 12px", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
              No master data rows found.
            </div>
          );
        }

        const thStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontSize: "10px", color: "var(--color-text-faint)", textTransform: "uppercase", borderBottom: "1px solid var(--color-divider)", background: "var(--color-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

        return (
          <div className="grid-responsive-4col">
            {colDefs.map((c) => {
              const entries = colRows(c.key);
              return (
                <div key={c.key} style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: c.colWidths[0] }} />
                      <col style={{ width: c.colWidths[1] }} />
                      <col style={{ width: c.colWidths[2] }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: "right", paddingRight: 6 }}>#</th>
                        <th style={thStyle} title={c.label}>{c.label}</th>
                        <th style={thStyle} />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: "6px 8px", fontSize: "10px", color: "var(--color-text-muted)" }}>—</td>
                        </tr>
                      ) : (
                        entries.map((entry, idx) => {
                          const isEditing = editingId === entry.id;
                          const cellVal = String(entry[c.key] ?? "");
                          return (
                            <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-divider)", height: 32, background: isEditing ? "rgba(1,105,111,0.04)" : "none" }}>
                              <td style={{ padding: "4px 6px 4px 8px", fontSize: "10px", color: "var(--color-text-faint)", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{idx + 1}</td>
                              <td style={{ padding: "4px 8px", verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={c.editValue}
                                    onChange={(e) => c.setEdit(e.target.value)}
                                    style={{ ...formInputStyle, height: 24, fontSize: "10px", padding: "2px 6px" }}
                                    autoFocus
                                  />
                                ) : (
                                  <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }} title={cellVal}>{cellVal}</span>
                                )}
                              </td>
                              <td style={{ padding: "4px 6px", verticalAlign: "middle", textAlign: "center", whiteSpace: "nowrap" }}>
                                {isEditing ? (
                                  <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                    <button onClick={() => handleSaveEdit(entry.id)} disabled={updateMutation.isPending} style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer", fontSize: "12px", padding: 0 }} title="Save">✔️</button>
                                    <button onClick={handleCancelEdit} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px", padding: 0 }} title="Cancel">❌</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                    <button onClick={() => handleStartEdit(entry)} style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "12px", padding: 0 }} title="Edit record">✏️</button>
                                    <button onClick={() => handleDelete(entry.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "12px", padding: 0 }} title="Delete record">🗑️</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
          Page {page} of {totalPages} (total rows: {data?.total ?? 0})
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              border: "1px solid var(--color-border)",
              background: page <= 1 ? "var(--color-surface)" : "var(--color-surface-2)",
              color: "var(--color-text)",
              borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "10.5px",
              height: 30,
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              border: "1px solid var(--color-border)",
              background: page >= totalPages ? "var(--color-surface)" : "var(--color-surface-2)",
              color: "var(--color-text)",
              borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "10.5px",
              height: 30,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}