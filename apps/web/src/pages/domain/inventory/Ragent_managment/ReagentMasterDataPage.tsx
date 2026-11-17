import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../../api/client";
import {
  ASSAY_TYPES,
  STORAGE_CONDITIONS,
  REAGENT_TYPES,
  CONCENTRATION_UNITS,
  needsNumberOfVill,
  hasConcentrationField,
} from "./reagentShared";
import { useReagentOptions } from "./useReagentData";

type MasterTab = "assays" | "storage" | "reagent_types" | "projects" | "units" | "locations";

export default function ReagentMasterDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MasterTab>("assays");
  const [hoveredTab, setHoveredTab] = useState<MasterTab | null>(null);
  const [search, setSearch] = useState("");

  // Top header actions & form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 6 Reagent Master Data inputs
  const [newAssayType, setNewAssayType] = useState("");
  const [newStorageCondition, setNewStorageCondition] = useState("");
  const [newReagentType, setNewReagentType] = useState("");
  const [newResearchProject, setNewResearchProject] = useState("");
  const [newConcentrationUnit, setNewConcentrationUnit] = useState("");
  const [newStorageLocation, setNewStorageLocation] = useState("");

  // Persistent custom additions across the 6 reagent master categories
  const [customData, setCustomData] = useState<{
    assays: string[];
    storage: Array<{ value: string; label: string; shortLabel: string; badgeBg: string; badgeColor: string; badgeBorder: string }>;
    reagentTypes: string[];
    projects: string[];
    units: string[];
    locations: string[];
  }>(() => {
    if (typeof window === "undefined") {
      return { assays: [], storage: [], reagentTypes: [], projects: [], units: [], locations: [] };
    }
    try {
      const saved = localStorage.getItem("roms_reagent_custom_master_v1");
      return saved ? JSON.parse(saved) : { assays: [], storage: [], reagentTypes: [], projects: [], units: [], locations: [] };
    } catch {
      return { assays: [], storage: [], reagentTypes: [], projects: [], units: [], locations: [] };
    }
  });

  const updateCustomData = (updater: (prev: typeof customData) => typeof customData) => {
    setCustomData((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("roms_reagent_custom_master_v1", JSON.stringify(next));
      } catch (err) {
        console.error("Failed to save custom reagent master data", err);
      }
      return next;
    });
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const { data: optionsData, isLoading } = useReagentOptions();

  // Projects from inventory master data
  const { data: projectsData } = useQuery({
    queryKey: ["inventory-master-projects"],
    queryFn: async () => {
      const resp = await apiClient.get<{ projects: string[] }>("/domains/inventory/master-data/projects");
      return resp.data.projects || [];
    },
    staleTime: 60000,
  });

  const projects = useMemo(() => {
    return (
      projectsData ?? [
        "MNTD",
        "TES Project",
        "VECTOR Project",
        "PARASITE Project",
        "HAMMS Project",
        "ANOSTEP Project",
        "PVSTATEM Project",
        "CDC Collaboration",
        "GOV Surveillance",
        "DRIVAX Study",
      ]
    );
  }, [projectsData]);

  const locations = useMemo(() => {
    return (
      optionsData?.locations ?? [
        "Freezer 1 (-80°C), Rack A",
        "Freezer 2 (-20°C), Rack B, Box 52",
        "Freezer 3 (-20°C), Rack C, Box 53",
        "Freezer 4 (-20°C), Rack D, Box 54",
        "Laboratory Refrigerator (2-8°C), Shelf 1",
        "Laboratory Refrigerator (2-8°C), Shelf 2",
        "Ambient Chemical Storage Cabinet 1",
        "Central Bio-Repository Cold Room",
      ]
    );
  }, [optionsData?.locations]);

  // Combined standard + user-added configurations for all 6 categories
  const allAssays = useMemo(() => {
    const list = [...ASSAY_TYPES, ...customData.assays];
    return Array.from(new Set(list));
  }, [customData.assays]);

  const allStorage = useMemo(() => {
    return [...STORAGE_CONDITIONS, ...customData.storage];
  }, [customData.storage]);

  const allReagentTypes = useMemo(() => {
    const list = [...REAGENT_TYPES, ...customData.reagentTypes];
    return Array.from(new Set(list));
  }, [customData.reagentTypes]);

  const allProjects = useMemo(() => {
    const list = [...projects, ...customData.projects];
    return Array.from(new Set(list));
  }, [projects, customData.projects]);

  const allUnits = useMemo(() => {
    const list = [...CONCENTRATION_UNITS, ...customData.units];
    return Array.from(new Set(list));
  }, [customData.units]);

  const allLocations = useMemo(() => {
    const list = [...locations, ...customData.locations];
    return Array.from(new Set(list));
  }, [locations, customData.locations]);

  // Tab definitions with distinct tones for gradients & accents
  const tabs: Array<{ id: MasterTab; label: string; icon: string; count: number; tone: string }> = [
    { id: "assays", label: "Assay Types", icon: "🔬", count: allAssays.length, tone: "#0284c7" },
    { id: "storage", label: "Storage Conditions", icon: "🌡️", count: allStorage.length, tone: "#0d9488" },
    { id: "reagent_types", label: "Reagent Types", icon: "🧪", count: allReagentTypes.length, tone: "#8b5cf6" },
    { id: "projects", label: "Research Projects", icon: "📂", count: allProjects.length, tone: "#f59e0b" },
    { id: "units", label: "Concentration Units", icon: "⚖️", count: allUnits.length, tone: "#10b981" },
    { id: "locations", label: "Storage Locations", icon: "📍", count: allLocations.length, tone: "#6366f1" },
  ];

  const q = search.trim().toLowerCase();

  const handleSyncGoogleSheets = async () => {
    setFormFeedback(null);
    setIsSyncing(true);
    try {
      const resp = await apiClient.post<{ message?: string }>("/domains/inventory/google-sheets/sync", {});
      setFormFeedback({
        type: "success",
        message: resp.data.message || "Successfully synchronized with Google Sheets!",
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-master-projects"] });
      await queryClient.invalidateQueries({ queryKey: ["reagent-options"] });
    } catch (err: any) {
      setFormFeedback({
        type: "error",
        message: getErrorMessage(err) || "Failed to sync with Google Sheets.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assay = newAssayType.trim();
    const storage = newStorageCondition.trim();
    const reagentType = newReagentType.trim();
    const project = newResearchProject.trim();
    const unit = newConcentrationUnit.trim();
    const location = newStorageLocation.trim();

    if (!assay && !storage && !reagentType && !project && !unit && !location) {
      setFormFeedback({
        type: "error",
        message: "Please enter at least one master record field (Assay Types, Storage Conditions, Reagent Types, Research Projects, Concentration Units, or Storage Locations).",
      });
      return;
    }

    // Update persistent state & localStorage
    updateCustomData((prev) => {
      const next = { ...prev };
      if (assay && !next.assays.includes(assay) && !ASSAY_TYPES.includes(assay as any)) {
        next.assays = [...next.assays, assay];
      }
      if (storage && !next.storage.some((s) => s.label.toLowerCase() === storage.toLowerCase() || s.value === storage)) {
        next.storage = [
          ...next.storage,
          {
            value: storage,
            label: storage,
            shortLabel: storage.length > 8 ? storage.slice(0, 8) : storage,
            badgeBg: "#e0e7ff",
            badgeColor: "#3730a3",
            badgeBorder: "#a5b4fc",
          },
        ];
      }
      if (reagentType && !next.reagentTypes.includes(reagentType) && !REAGENT_TYPES.includes(reagentType)) {
        next.reagentTypes = [...next.reagentTypes, reagentType];
      }
      if (project && !next.projects.includes(project) && !projects.includes(project)) {
        next.projects = [...next.projects, project];
      }
      if (unit && !next.units.includes(unit) && !CONCENTRATION_UNITS.includes(unit)) {
        next.units = [...next.units, unit];
      }
      if (location && !next.locations.includes(location) && !locations.includes(location)) {
        next.locations = [...next.locations, location];
      }
      return next;
    });

    // Sync to backend inventory master data table if project or unit or reagentType is provided
    if (project || unit || reagentType) {
      try {
        await apiClient.post("/domains/inventory/master-data", {
          category: reagentType || "Reagents",
          unit: unit || "Units",
          project: project || null,
          staff: null,
        });
        queryClient.invalidateQueries({ queryKey: ["inventory-master-projects"] });
      } catch (err) {
        console.warn("Backend master data sync notice:", err);
      }
    }

    // Reset inputs & close
    setNewAssayType("");
    setNewStorageCondition("");
    setNewReagentType("");
    setNewResearchProject("");
    setNewConcentrationUnit("");
    setNewStorageLocation("");
    setShowAddForm(false);
    setFormFeedback({
      type: "success",
      message: "New reagent master data entry saved successfully!",
    });
  };

  const formInputStyle: React.CSSProperties = {
    padding: "6px 9px",
    border: "1px solid var(--color-border)",
    borderRadius: 7,
    background: "var(--color-surface-2)",
    color: "var(--color-text)",
    fontSize: "11px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Header Card (Mirrored from Inventory Master Data) ── */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-primary-highlight)",
          background: "var(--inventory-card-bg)",
          boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: "12px 14px",
            background: "var(--inventory-hero-bg)",
            border: "1px solid var(--color-primary-highlight)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
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
        <div
          style={{
            padding: "8px 12px",
            background: formFeedback.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: formFeedback.type === "success" ? "1px solid #bbf7d0" : "1px solid #fca5a5",
            borderRadius: "6px",
            fontSize: "10.5px",
            color: formFeedback.type === "success" ? "#166534" : "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{formFeedback.message}</span>
          <button
            onClick={() => setFormFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            padding: 18,
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-primary-highlight)",
            background: "var(--inventory-card-bg)",
            boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {/* 1. Assay Types */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>🔬</span> Assay Types
              </span>
              <input
                type="text"
                value={newAssayType}
                onChange={(e) => setNewAssayType(e.target.value)}
                placeholder="e.g. Multiplex RT-PCR"
                style={formInputStyle}
              />
            </label>

            {/* 2. Storage Conditions */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>🌡️</span> Storage Conditions
              </span>
              <input
                type="text"
                value={newStorageCondition}
                onChange={(e) => setNewStorageCondition(e.target.value)}
                placeholder="e.g. -70°C Deep Freezer"
                style={formInputStyle}
              />
            </label>

            {/* 3. Reagent Types */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>🧪</span> Reagent Types
              </span>
              <input
                type="text"
                value={newReagentType}
                onChange={(e) => setNewReagentType(e.target.value)}
                placeholder="e.g. Lyophilized Pellet"
                style={formInputStyle}
              />
            </label>

            {/* 4. Research Projects */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>📂</span> Research Projects
              </span>
              <input
                type="text"
                value={newResearchProject}
                onChange={(e) => setNewResearchProject(e.target.value)}
                placeholder="e.g. MALARIA-GEN Study"
                style={formInputStyle}
              />
            </label>

            {/* 5. Concentration Units */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>⚖️</span> Concentration Units
              </span>
              <input
                type="text"
                value={newConcentrationUnit}
                onChange={(e) => setNewConcentrationUnit(e.target.value)}
                placeholder="e.g. pmol/µL, pg/mL"
                style={formInputStyle}
              />
            </label>

            {/* 6. Storage Locations */}
            <label style={{ fontSize: "10px", color: "var(--color-text)", fontWeight: 700, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>📍</span> Storage Locations
              </span>
              <input
                type="text"
                value={newStorageLocation}
                onChange={(e) => setNewStorageLocation(e.target.value)}
                placeholder="e.g. Freezer 5, Rack C"
                style={formInputStyle}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewAssayType("");
                setNewStorageCondition("");
                setNewReagentType("");
                setNewResearchProject("");
                setNewConcentrationUnit("");
                setNewStorageLocation("");
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--color-primary)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(1, 105, 111, 0.3)",
              }}
            >
              Save Record
            </button>
          </div>
        </form>
      )}
      {/* ── Summary Cards (Subtle near-white gradient with interactive hover action) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const isHovered = hoveredTab === t.id;

          const background = isDarkMode
            ? isActive
              ? `linear-gradient(145deg, ${t.tone}26 0%, #0c1524 100%)`
              : isHovered
              ? `linear-gradient(145deg, ${t.tone}18 0%, #0f1a2e 100%)`
              : "linear-gradient(145deg, #182234 0%, #0f172a 100%)"
            : isActive
            ? `linear-gradient(145deg, #ffffff 30%, ${t.tone}18 100%)`
            : isHovered
            ? `linear-gradient(145deg, #ffffff 35%, ${t.tone}12 100%)`
            : `linear-gradient(145deg, #ffffff 50%, ${t.tone}0a 100%)`;

          const border = isActive
            ? `1.5px solid ${t.tone}`
            : isHovered
            ? `1px solid ${t.tone}66`
            : isDarkMode
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid var(--color-border)";

          const boxShadow = isHovered
            ? `0 6px 18px rgba(0, 0, 0, 0.08), 0 0 0 1px ${t.tone}22`
            : isActive
            ? `0 4px 14px ${t.tone}22`
            : "0 2px 6px rgba(0, 0, 0, 0.03)";

          return (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              onMouseEnter={() => setHoveredTab(t.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border,
                background,
                boxShadow,
                transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "16px" }}>{t.icon}</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: isActive ? t.tone : "var(--color-text)",
                    background: isActive ? `${t.tone}18` : isHovered ? `${t.tone}10` : "transparent",
                    padding: "2px 6px",
                    borderRadius: 6,
                    transition: "all 0.2s ease",
                  }}
                >
                  {t.count}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: isActive ? t.tone : "var(--color-text)",
                  marginTop: 6,
                  transition: "color 0.2s ease",
                }}
              >
                {t.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Master Data Container ── */}
      <div
        style={{
          background: "var(--inventory-card-bg)",
          border: "1px solid var(--color-primary-highlight)",
          borderRadius: "var(--radius)",
          padding: 18,
          boxShadow: "0 4px 16px rgba(37, 147, 153, 0.50)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Navigation & Search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch("");
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === t.id ? "var(--color-primary)" : "var(--color-surface-2)",
                  color: activeTab === t.id ? "#ffffff" : "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.label}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "5px 10px",
              fontSize: "11.5px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              minWidth: 220,
            }}
          />
        </div>

        {/* ── Tab Content: Assay Types ── */}
        {activeTab === "assays" && (
          <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 750, borderCollapse: "collapse", fontSize: "11.5px" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", width: 50 }}>#</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Assay Type Name</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Form Rules / Concentration</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Number of Vill Rule</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allAssays.filter((a) => !q || a.toLowerCase().includes(q)).map((assay, idx) => {
                  const hasConc = hasConcentrationField(assay);
                  const alwaysVill = needsNumberOfVill(assay, "Buffer") && needsNumberOfVill(assay, "Primer and probe");
                  const conditionalVill = needsNumberOfVill(assay, "Buffer") && !needsNumberOfVill(assay, "Primer and probe");

                  return (
                    <tr key={assay} style={{ borderBottom: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-text-muted)" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--color-primary)" }}>{assay}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {hasConc ? (
                          <span style={{ color: "#10b981", fontWeight: 600 }}>Standard Concentration Included</span>
                        ) : (
                          <span style={{ color: "#f59e0b", fontWeight: 600 }}>Concentration Omitted (Kit Based)</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {alwaysVill ? (
                          <span style={{ color: "#0284c7", fontWeight: 700 }}>Mandatory Number of Vill</span>
                        ) : conditionalVill ? (
                          <span style={{ color: "#8b5cf6", fontWeight: 600 }}>Conditional: Buffer Only</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>Not required</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#15803d" }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab Content: Storage Conditions ── */}
        {activeTab === "storage" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {allStorage.filter((s) => !q || s.label.toLowerCase().includes(q) || s.shortLabel.toLowerCase().includes(q)).map((s) => (
              <div
                key={s.value}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `1.5px solid ${s.badgeBorder}`,
                  background: s.badgeBg,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: s.badgeColor }}>
                    {s.shortLabel}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#fff", color: s.badgeColor }}>
                    Code: {s.value}
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: s.badgeColor }}>
                  {s.label}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text)", lineHeight: 1.4, opacity: 0.85 }}>
                  {s.value === "80" && "Ultra-low temperature deep freezers for enzymes, viral RNA/DNA extracts, and primers."}
                  {s.value === "20" && "Standard laboratory freezers for PCR master mixes, antibodies, and primers."}
                  {s.value === "2-8" && "Cold storage refrigerators for extraction buffers, lysis solutions, and dyes."}
                  {s.value === "Ambient" && "Controlled ambient temperature storage (15-25°C) for stable salts and dry kits."}
                  {!["80", "20", "2-8", "Ambient"].includes(s.value) && "Specialized temperature controlled storage for laboratory materials."}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Reagent Types ── */}
        {activeTab === "reagent_types" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {allReagentTypes.filter((t) => !q || t.toLowerCase().includes(q)).map((type, idx) => (
              <div
                key={type}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>{type}</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>#{idx + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Projects ── */}
        {activeTab === "projects" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {allProjects.filter((p) => !q || p.toLowerCase().includes(q)).map((p) => (
              <div
                key={p}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: "14px" }}>📂</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Concentration Units ── */}
        {activeTab === "units" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {allUnits.filter((u) => !q || u.toLowerCase().includes(q)).map((unit) => (
              <div
                key={unit}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-primary)" }}>{unit}</span>
                <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: 4, background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                  Standard
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Locations ── */}
        {activeTab === "locations" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {allLocations.filter((l) => !q || l.toLowerCase().includes(q)).map((loc) => (
              <div
                key={loc}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: "14px" }}>📍</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>{loc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
