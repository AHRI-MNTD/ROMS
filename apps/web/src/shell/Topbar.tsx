import React, { useState } from "react";
import { useTheme } from "../theme/useTheme";
import { useAuth } from "../auth/useAuth";
import logoAhri from "../assets/logo_ahri.png";

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const Topbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <header
        style={{
          height: 40,
          minHeight: 40,
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 10,
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <img
          src={logoAhri}
          alt="AHRI Logo"
          style={{
            height: 24,
            objectFit: "contain",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-md)",
            color: "var(--color-text)",
            marginRight: 4,
          }}
        >
          ROMS
        </span>
        <span
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: 20,
            background: "var(--color-primary-highlight)",
            color: "var(--color-primary)",
          }}
        >
          v0.1
        </span>

        <div style={{ flex: 1 }} />

        {user && (
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
            {user.displayName}
          </span>
        )}

        <button
          onClick={toggleTheme}
          title="Toggle theme"
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
            transition: "background 0.14s, color 0.14s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-offset)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        {user && (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              color: "#fff",
              padding: "3px 10px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--color-primary)",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary-hover)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            Sign out
          </button>
        )}
      </header>

      {/* ── Logout Confirmation Dialog ── */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            animation: "fadeUp 0.18s ease",
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 20,
              width: 480,
              maxWidth: "92vw",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header band ── */}
            <div style={{
              padding: "24px 28px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}>
              {/* Icon circle */}
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(220,38,38,0.08)",
                border: "1.5px solid rgba(220,38,38,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              {/* Title */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
                  Sign out of ROMS?
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: 4, whiteSpace: "nowrap" }}>
                  You'll need to sign in again to access the system.
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Session info row */}
              {user && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: "var(--color-primary-highlight)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--color-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>
                    {(user.displayName ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      Current session will be terminated
                    </div>
                  </div>
                  <div style={{
                    marginLeft: "auto", fontSize: "10px", fontWeight: 700,
                    background: "var(--color-primary)", color: "#fff",
                    padding: "2px 8px", borderRadius: 99,
                  }}>
                    Active
                  </div>
                </div>
              )}

              {/* Warning */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 14px",
                background: "rgba(220,38,38,0.05)",
                border: "1px solid rgba(220,38,38,0.15)",
                borderRadius: 10,
                fontSize: "12px",
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Any unsaved changes will be lost. Ensure your work is saved before signing out.
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div style={{
              padding: "14px 28px 20px",
              display: "flex", gap: 10, justifyContent: "flex-end",
              borderTop: "1px solid var(--color-border)",
            }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.13s, color 0.13s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-offset)";
                  e.currentTarget.style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Stay Signed In
              </button>
              <button
                onClick={() => { setShowConfirm(false); logout(); }}
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "background 0.13s, transform 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#b91c1c";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#dc2626";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
