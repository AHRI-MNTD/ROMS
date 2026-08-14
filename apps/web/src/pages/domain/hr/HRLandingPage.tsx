import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoAhri from "../../../assets/logo_ahri.png";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

export interface HRCard {
  id: string;
  title: string;
  subtitle: string;
  rightRequired: string;
  icon: string;
  bullets: Array<{ label: string; icon: React.ReactNode }>;
}

const Ico = ({ d }: { d: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75}
    stroke="var(--color-primary, #0d9488)" style={{ width: 14, height: 14, flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const CARDS: HRCard[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Personnel Metrics & Headcount Overview",
    rightRequired: "Dashboard",
    icon: "📊",
    bullets: [
      { label: "Verified Personnel KPIs", icon: <Ico d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-1.22m0 0-3.94-1.22m3.94 1.22-1.22 3.94" /> },
      { label: "Pending Verification Alerts", icon: <Ico d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /> },
      { label: "Department Breakdown Charts", icon: <Ico d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /> },
      { label: "Employment Type Mix Analysis", icon: <Ico d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /> },
    ],
  },
  {
    id: "personnel-registration",
    title: "Personnel Registration",
    subtitle: "Staff File Submission & Onboarding",
    rightRequired: "Personnel Registration",
    icon: "📋",
    bullets: [
      { label: "Submit Personnel File Registration", icon: <Ico d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> },
      { label: "Track Application Status", icon: <Ico d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> },
      { label: "Upload Qualifications & Credentials", icon: <Ico d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /> },
      { label: "Record Employment Type & Start Date", icon: <Ico d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /> },
    ],
  },
  {
    id: "approved",
    title: "Personnel Database",
    subtitle: "Verified Files, Credentials & History",
    rightRequired: "Personnel Database",
    icon: "🗂️",
    bullets: [
      { label: "View Verified Personnel Files", icon: <Ico d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5" /> },
      { label: "Search by Name, Role & Department", icon: <Ico d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /> },
      { label: "Review Academic & Work History", icon: <Ico d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /> },
      { label: "Export Personnel Reports (CSV)", icon: <Ico d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /> },
    ],
  },
  {
    id: "approve-employee",
    title: "Personnel Verification",
    subtitle: "Review, Approve & Credential Check",
    rightRequired: "Personnel Verification",
    icon: "✅",
    bullets: [
      { label: "Review Submitted Personnel Profiles", icon: <Ico d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> },
      { label: "Approve or Reject Submissions", icon: <Ico d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 18H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 12h9.75" /> },
      { label: "Verify Credentials & Qualifications", icon: <Ico d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /> },
      { label: "Manage Pending Approval Queue", icon: <Ico d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /> },
    ],
  },
];

export default function HRLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restrictedCard, setRestrictedCard] = useState<HRCard | null>(null);
  const userRolesStr = user?.roles?.join(", ") || "Normal User";

  const handleCardClick = (card: HRCard) => {
    const isAllowed = hasTabAccess(user?.roles, "hr", card.id, user?.permissions);
    if (isAllowed) {
      navigate(`/domains/hr/recruitment-onboarding/${card.id}`);
    } else {
      setRestrictedCard(card);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%", minHeight: 0, width: "100%", maxWidth: 1400, margin: "0 auto", overflow: "hidden" }}>
      {/* ── Header Banner ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center", paddingTop: 4, paddingBottom: 16 }}>
        <img src={logoAhri} alt="AHRI Logo" style={{ height: "54px", width: "54px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px", border: "1px solid var(--color-border, #cbd5e1)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
        <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-primary, #0d9488)", textTransform: "uppercase" }}>
          Research Operation Management System (ROMS)
        </span>
        <div style={{ width: "100%", maxWidth: "800px", height: "1px", backgroundColor: "var(--color-divider)", margin: "12px 0" }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
          HR &amp; Staff Operations
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", margin: "4px 0 0 0", maxWidth: "820px", lineHeight: "1.4" }}>
          Centralized personnel management — from staff registration and verification to department analytics and employment records workflows.
        </p>
      </div>

      {/* ── Scrollable Cards Grid ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20, paddingRight: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", rowGap: "22px", columnGap: "20px", width: "100%", marginTop: "15px" }}>
          {CARDS.map((card) => {
            const isAllowed = hasTabAccess(user?.roles, "hr", card.id, user?.permissions);
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "14px", padding: "16px 14px 12px", cursor: isAllowed ? "pointer" : "default", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 3px 12px rgba(0,0,0,0.04)", minHeight: "210px", position: "relative" }}
                onMouseEnter={(e) => { if (isAllowed) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "var(--color-primary, #0d9488)"; } }}
                onMouseLeave={(e) => { if (isAllowed) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "var(--color-border)"; } }}
              >
                <div>
                  {/* Card header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                      <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>{card.icon}</span>
                      <h2 style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--color-text)", margin: 0, lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</h2>
                    </div>
                    {!isAllowed ? (
                      <span onClick={(e) => { e.stopPropagation(); setRestrictedCard(card); }} style={{ fontSize: "9.5px", fontWeight: 700, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "2px 6px", borderRadius: "10px", whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "2px", cursor: "pointer" }} title="Click to view permission details">�� Restricted</span>
                    ) : (
                      <span style={{ fontSize: "9.5px", fontWeight: 700, background: "var(--color-primary-highlight, #dcfce7)", color: "var(--color-primary, #0d9488)", padding: "2px 6px", borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0 }}>✓ Accessible</span>
                    )}
                  </div>
                  {/* Subtitle */}
                  <p style={{ fontSize: "10.5px", color: "var(--color-text-muted)", margin: "0 0 10px 0", lineHeight: 1.4 }}>{card.subtitle}</p>
                  {/* Bullets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", paddingLeft: "1px" }}>
                    {card.bullets.map((b, i) => (
                      <div key={i} style={{ fontSize: "11.5px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "6px", lineHeight: "1.3" }}>
                        {b.icon}
                        <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Footer */}
                <div style={{ marginTop: "12px", fontSize: "10.5px", fontWeight: 600, color: isAllowed ? "var(--color-primary, #0d9488)" : "#b91c1c", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <span onClick={(e) => { if (!isAllowed) { e.stopPropagation(); setRestrictedCard(card); } }} style={{ cursor: "pointer" }}>
                    {isAllowed ? "Open →" : "Permission Info 🔒"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Access Restricted Modal ── */}
      {restrictedCard && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} onClick={() => setRestrictedCard(null)}>
          <div style={{ background: "var(--color-surface, #ffffff)", border: "1px solid var(--color-border)", borderRadius: "18px", width: "100%", maxWidth: "520px", boxShadow: "0 20px 45px rgba(0,0,0,0.25)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>⚠️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#991b1b" }}>Access Restricted</h3>
                <span style={{ fontSize: "12px", color: "#7f1d1d", fontWeight: 500 }}>You don't have access to this page</span>
              </div>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--color-text)", lineHeight: 1.55 }}>
                You do not have permission to access the <strong>{restrictedCard.title}</strong> page.
              </p>
              <div style={{ background: "var(--color-surface-2, #f8fafc)", border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "12px", padding: "14px 16px", fontSize: "12.5px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-text-muted)" }}>Target Module:</span><strong style={{ color: "var(--color-text)" }}>{restrictedCard.title}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-text-muted)" }}>Required Right:</span><strong style={{ color: "#dc2626" }}>"{restrictedCard.rightRequired}"</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-text-muted)" }}>Your Assigned Role(s):</span><strong style={{ color: "var(--color-text)" }}>{userRolesStr}</strong></div>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Rights are managed via the <strong>User Rights Control</strong> panel. Contact your ROMS Administrator or QA/Research Manager to request access.
              </p>
            </div>
            <div style={{ padding: "14px 24px", background: "var(--color-surface-2, #f8fafc)", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setRestrictedCard(null)} style={{ background: "var(--color-primary, #0d9488)", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>I Understand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
