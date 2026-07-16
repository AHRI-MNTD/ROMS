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
      <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>Master Configurations</div>
          <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Inventory master records mapping categories, units, projects, and active personnel.
          </div>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormFeedback(null);
          }}
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-accent-soft)",
            color: "var(--color-text)",
            borderRadius: "6px",
            padding: "5px 12px",
            fontSize: "10.5px",
            fontWeight: 700,
            height: 30,
            cursor: "pointer",
          }}
        >
          {showAddForm ? "✕ Close Editor" : "➕ Add Master Record"}
        </button>
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
        <form onSubmit={handleCreateSubmit} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface)", display: "grid", gap: 10 }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" }}>New Master Data Entry</div>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px", marginBottom: 3 }}>Rows (Total)</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-md)", fontWeight: 700 }}>{summary?.rows ?? data?.total ?? 0}</div>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px", marginBottom: 3 }}>Categories</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-md)", fontWeight: 700 }}>{summary?.categories ?? 0}</div>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px", marginBottom: 3 }}>Units</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-md)", fontWeight: 700 }}>{summary?.units ?? 0}</div>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px", marginBottom: 3 }}>Projects</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-md)", fontWeight: 700 }}>{summary?.projects ?? 0}</div>
        </div>
        <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <div style={{ color: "var(--color-text-muted)", fontSize: "10px", marginBottom: 3 }}>Staff</div>
          <div style={{ color: "var(--color-text)", fontSize: "var(--fs-md)", fontWeight: 700 }}>{summary?.staff ?? 0}</div>
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
        const colDefs: Array<{ key: ColKey; label: string; editValue: string; setEdit: (v: string) => void }> = [
          { key: "category", label: "Categories", editValue: editCategory, setEdit: setEditCategory },
          { key: "unit", label: "Units", editValue: editUnit, setEdit: setEditUnit },
          { key: "project", label: "Projects", editValue: editProject, setEdit: setEditProject },
          { key: "staff", label: "Staff", editValue: editStaff, setEdit: setEditStaff },
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {colDefs.map((c) => {
              const entries = colRows(c.key);
              return (
                <div key={c.key} style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "60%" }} />
                      <col style={{ width: "26%" }} />
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
                                  <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                                    <button onClick={() => handleSaveEdit(entry.id)} disabled={updateMutation.isPending} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 4, padding: "2px 5px", fontSize: "9px", cursor: "pointer" }}>Save</button>
                                    <button onClick={handleCancelEdit} style={{ background: "#64748b", color: "white", border: "none", borderRadius: 4, padding: "2px 5px", fontSize: "9px", cursor: "pointer" }}>✕</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
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