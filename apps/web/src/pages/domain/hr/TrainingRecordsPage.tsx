import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";

const DEPARTMENTS = [
  "Research & Development",
  "Laboratory Operations",
  "Clinical Affairs",
  "Data Management",
  "Finance & Administration",
  "Human Resources",
  "IT & Systems",
  "Regulatory Affairs",
  "Quality Management",
  "Field Operations",
  "Communications & Outreach",
  "Other",
];

type FormData = {
  department: string;
  jobTitle: string;
  startDate: string;
  employmentType: string;
  contractEndDate: string;
  contractRenewalDate: string;
  phone: string;
  emergencyContact: string;
};

const empty: FormData = {
  department: "",
  jobTitle: "",
  startDate: "",
  employmentType: "",
  contractEndDate: "",
  contractRenewalDate: "",
  phone: "",
  emergencyContact: "",
};

type Status = "idle" | "success" | "error";

export default function TrainingRecordsPage() {
  const user = useAuth((s) => s.user);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [apiError, setApiError] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const resp = await apiClient.post("/domains/hr/staff", body);
      return resp.data;
    },
    onSuccess: () => {
      setStatus("success");
      setForm(empty);
      setErrors({});
    },
    onError: (err: any) => {
      setStatus("error");
      const msg = err?.response?.data?.errors
        ? JSON.stringify(err.response.data.errors)
        : err?.response?.data?.code ?? "Registration failed. Please try again.";
      setApiError(msg);
    },
  });

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
    if (status !== "idle") setStatus("idle");
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.department) e.department = "Department is required.";
    if (!form.jobTitle.trim()) e.jobTitle = "Job title is required.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.employmentType) e.employmentType = "Employment type is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setStatus("error"); setApiError("You must be logged in to register."); return; }
    if (!validate()) return;
    const body: Record<string, unknown> = {
      userId: user.id,
      department: form.department,
      jobTitle: form.jobTitle.trim(),
      startDate: form.startDate,
      employmentType: form.employmentType || undefined,
      contractEndDate: form.contractEndDate || null,
      contractRenewalDate: form.contractRenewalDate || null,
      phone: form.phone.trim() || null,
      emergencyContact: form.emergencyContact.trim() || null,
    };
    mutation.mutate(body);
  };

  // ── Styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface-2)",
    overflow: "hidden",
  };

  const sectionHeader: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: "var(--fs-xs)",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
    background: "rgba(99,102,241,0.04)",
    borderBottom: "1px solid var(--color-divider)",
  };

  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px 20px",
    padding: "18px 20px",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: "var(--fs-xs)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    height: 36,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${hasError ? "#f87171" : "var(--color-divider)"}`,
    background: "var(--color-surface)",
    fontSize: "var(--fs-xs)",
    color: "var(--color-text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  });

  const errSpan: React.CSSProperties = {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
  };

  const required = <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>;

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* ── Page title ── */}


      {/* ── Success notification ── */}
      {status === "success" && (
        <div style={{
          padding: "18px 22px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #86efac",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>✅</span>
          <div>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "#15803d", marginBottom: 4 }}>
              Registration Submitted Successfully
            </div>
            <div style={{ fontSize: "var(--fs-xs)", color: "#166534", lineHeight: 1.7 }}>
              You are now in <strong>pending state</strong>. You will have authorized access as soon as the HR team
              approves your request. Please check back later or contact your HR administrator for updates.
            </div>
          </div>
        </div>
      )}

      {/* ── API error ── */}
      {status === "error" && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: "var(--fs-xs)", color: "#991b1b" }}>
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }} noValidate>

        {/* Section 1 – Work Details */}
        <div style={card}>
          <div style={sectionHeader}>Work Details</div>
          <div style={grid2}>
            {/* Department */}
            <label style={labelStyle}>
              <span>Department {required}</span>
              <select value={form.department} onChange={set("department")} style={{ ...inputStyle(!!errors.department), cursor: "pointer" }}>
                <option value="">— Select department —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <span style={errSpan}>{errors.department}</span>}
            </label>

            {/* Job Title */}
            <label style={labelStyle}>
              <span>Job Title {required}</span>
              <input type="text" value={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Senior Research Associate" style={inputStyle(!!errors.jobTitle)} />
              {errors.jobTitle && <span style={errSpan}>{errors.jobTitle}</span>}
            </label>

            {/* Start Date */}
            <label style={labelStyle}>
              <span>Start Date {required}</span>
              <input type="date" value={form.startDate} onChange={set("startDate")} style={inputStyle(!!errors.startDate)} />
              {errors.startDate && <span style={errSpan}>{errors.startDate}</span>}
            </label>

            {/* Employment Type */}
            <label style={labelStyle}>
              <span>Employment Type {required}</span>
              <select value={form.employmentType} onChange={set("employmentType")} style={{ ...inputStyle(!!errors.employmentType), cursor: "pointer" }}>
                <option value="">— Select type —</option>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
              </select>
              {errors.employmentType && <span style={errSpan}>{errors.employmentType}</span>}
            </label>

            {/* Contract End Date */}
            <label style={labelStyle}>
              <span>Contract End Date <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>(if applicable)</span></span>
              <input type="date" value={form.contractEndDate} onChange={set("contractEndDate")} style={inputStyle(false)} />
            </label>

            {/* Contract Renewal Date */}
            <label style={labelStyle}>
              <span>Contract Renewal Date <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>(if applicable)</span></span>
              <input type="date" value={form.contractRenewalDate} onChange={set("contractRenewalDate")} style={inputStyle(false)} />
            </label>
          </div>
        </div>

        {/* Section 2 – Contact Info */}
        <div style={card}>
          <div style={sectionHeader}>Contact Information</div>
          <div style={grid2}>
            <label style={labelStyle}>
              <span>Phone Number</span>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+251 9XX XXX XXX" style={inputStyle(false)} />
            </label>
            <label style={labelStyle}>
              <span>Emergency Contact</span>
              <input type="text" value={form.emergencyContact} onChange={set("emergencyContact")} placeholder="Name — Relationship — Phone" style={inputStyle(false)} />
            </label>
          </div>
        </div>

        {/* Section 3 – Account Info (read-only) */}
        <div style={card}>
          <div style={sectionHeader}>Account (Auto-filled from your login)</div>
          <div style={{ ...grid2, opacity: 0.85 }}>
            <label style={labelStyle}>
              <span>Full Name</span>
              <input type="text" value={user?.displayName ?? "—"} readOnly style={{ ...inputStyle(false), background: "rgba(0,0,0,0.03)", cursor: "not-allowed" }} />
            </label>
            <label style={labelStyle}>
              <span>Email Address</span>
              <input type="text" value={user?.email ?? "—"} readOnly style={{ ...inputStyle(false), background: "rgba(0,0,0,0.03)", cursor: "not-allowed" }} />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => { setForm(empty); setErrors({}); setStatus("idle"); }}
            style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer" }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              border: "none",
              background: mutation.isPending ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: "var(--fs-xs)",
              fontWeight: 800,
              cursor: mutation.isPending ? "not-allowed" : "pointer",
              letterSpacing: "0.03em",
              boxShadow: mutation.isPending ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
              transition: "all 0.2s",
            }}
          >
            {mutation.isPending ? "Submitting…" : "📨 Register"}
          </button>
        </div>
      </form>
    </div>
  );
}