import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../theme/useTheme";
import { useAuth } from "../auth/useAuth";
import { apiClient, getErrorMessage } from "../api/client";
import logoAhri from "../assets/logo_ahri.png";

// ── Icons ─────────────────────────────────────────────────────────────────────
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
const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = ({ show }: { show: boolean }) =>
  show ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const UserPersonIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ── Shared: spinner ───────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
    </path>
  </svg>
);

// ── Shared: modal backdrop + card ─────────────────────────────────────────────
const ModalBackdrop: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(5px)",
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        width: 440,
        maxWidth: "94vw",
        boxShadow: "0 28px 72px rgba(0,0,0,0.24), 0 4px 16px rgba(0,0,0,0.10)",
        overflow: "hidden",
        animation: "fadeUp 0.18s ease both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

// ── Shared: modal header band ─────────────────────────────────────────────────
const ModalHeader: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  title: string;
  subtitle: string;
}> = ({ icon, iconBg, iconBorder, title, subtitle }) => (
  <div style={{
    padding: "22px 28px 18px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
  }}>
    {/* ── ROMS branding: perfect circle logo + wordmark side-by-side ── */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Perfect circle — logo fills with no gap */}
      <div style={{
        width: 44, height: 44,
        borderRadius: "50%",
        border: "2px solid var(--color-primary)",
        overflow: "hidden",
        flexShrink: 0,
        background: "var(--color-primary-highlight)",
      }}>
        <img
          src={logoAhri}
          alt="AHRI"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
      {/* Wordmark */}
      <div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-lg)",
          color: "var(--color-text)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}>
          ROMS
        </div>
        <div style={{
          fontSize: "var(--fs-xs)",
          color: "var(--color-text-muted)",
          letterSpacing: "0.01em",
          marginTop: 2,
          lineHeight: 1.4,
        }}>
          Research Operations Management System
        </div>
      </div>
    </div>

    {/* ── Modal-specific icon + title ── */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: iconBg, border: `1.5px solid ${iconBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
          {title}
        </div>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 3 }}>
          {subtitle}
        </div>
      </div>
    </div>
  </div>
);


// ── Shared: input with icon ───────────────────────────────────────────────────
const ModalInput: React.FC<{
  id: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; required?: boolean;
  rightSlot?: React.ReactNode; invalid?: boolean;
}> = ({ id, type, value, onChange, placeholder, required, rightSlot, invalid }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      border: `1.5px solid ${invalid ? "#ef4444" : focused ? "var(--color-primary)" : "var(--color-border)"}`,
      borderRadius: "var(--radius)",
      background: "var(--color-surface)",
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          flex: 1, padding: "10px 12px", background: "none", border: "none", outline: "none",
          color: "var(--color-text)", fontSize: "var(--fs-sm)", fontFamily: "inherit",
        }}
      />
      {rightSlot && <span style={{ display: "flex", alignItems: "center", paddingRight: 10 }}>{rightSlot}</span>}
    </div>
  );
};

// ── Shared: error banner ──────────────────────────────────────────────────────
const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 8,
    padding: "9px 12px",
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "var(--radius)",
    fontSize: "var(--fs-xs)", color: "#dc2626", lineHeight: 1.5,
  }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
    {message}
  </div>
);

// ── Shared: primary button ────────────────────────────────────────────────────
const PrimaryBtn: React.FC<{
  type?: "submit" | "button"; disabled?: boolean; onClick?: () => void;
  danger?: boolean; children: React.ReactNode;
}> = ({ type = "button", disabled, onClick, danger, children }) => (
  <button
    type={type} disabled={disabled} onClick={onClick}
    style={{
      padding: "9px 20px", borderRadius: "var(--radius)", border: "none",
      background: disabled ? "var(--color-border)" : danger ? "#dc2626" : "var(--color-primary)",
      color: "#fff", fontSize: "var(--fs-xs)", fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6,
      transition: "background 0.13s, transform 0.1s",
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = danger ? "#b91c1c" : "var(--color-primary-hover)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = danger ? "#dc2626" : "var(--color-primary)";
        e.currentTarget.style.transform = "translateY(0)";
      }
    }}
  >
    {children}
  </button>
);

// ── Shared: ghost/secondary button ───────────────────────────────────────────
const GhostBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button" onClick={onClick}
    style={{
      padding: "9px 20px", borderRadius: "var(--radius)",
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)", color: "var(--color-text-muted)",
      fontSize: "var(--fs-xs)", fontWeight: 600,
      cursor: "pointer", transition: "background 0.13s, color 0.13s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-offset)"; e.currentTarget.style.color = "var(--color-text)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
  >
    {children}
  </button>
);

// ── Modal footer actions row ──────────────────────────────────────────────────
const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    padding: "14px 28px 20px",
    display: "flex", gap: 8, justifyContent: "flex-end",
    borderTop: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Change Password Modal ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
interface ChangePasswordModalProps { onClose: () => void; }
const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8) s++;
    if (newPw.length >= 12) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (newPw !== confirmPw) { setError("New passwords do not match."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await apiClient.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to change password. Please try again."));
    } finally { setLoading(false); }
  };

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle}
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", padding: 0 }}>
      <EyeIcon show={show} />
    </button>
  );

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader
        icon={<LockIcon />}
        iconBg="var(--color-primary-highlight)"
        iconBorder="var(--color-primary)"
        title="Change Password"
        subtitle="Keep your account secure with a strong password"
      />

      {success ? (
        /* ── Success state ── */
        <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--color-text)" }}>Password Changed!</div>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>
              Your password has been updated successfully.
            </div>
          </div>
          <PrimaryBtn onClick={onClose}>Done</PrimaryBtn>
        </div>
      ) : (
        /* ── Form ── */
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Current password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="current-password" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                Current Password
              </label>
              <ModalInput
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPw} onChange={setCurrentPw}
                placeholder="Enter current password" required
                rightSlot={eyeBtn(showCurrent, () => setShowCurrent((v) => !v))}
              />
            </div>

            {/* New password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="new-password" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                New Password
              </label>
              <ModalInput
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPw} onChange={setNewPw}
                placeholder="Enter new password (min. 8 characters)" required
                rightSlot={eyeBtn(showNew, () => setShowNew((v) => !v))}
              />
              {/* Strength meter */}
              {newPw.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: n <= strength ? strengthColor : "var(--color-border)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "var(--fs-xxs)", fontWeight: 700, color: strengthColor, letterSpacing: "0.03em" }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="confirm-password" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                Confirm New Password
              </label>
              <ModalInput
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPw} onChange={setConfirmPw}
                placeholder="Re-enter new password" required
                invalid={!!confirmPw && confirmPw !== newPw}
                rightSlot={eyeBtn(showConfirm, () => setShowConfirm((v) => !v))}
              />
              {confirmPw && confirmPw !== newPw && (
                <span style={{ fontSize: "var(--fs-xxs)", color: "#ef4444", fontWeight: 600 }}>Passwords do not match</span>
              )}
            </div>

            {error && <ErrorBanner message={error} />}
          </div>

          <ModalFooter>
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn
              type="submit"
              disabled={loading || !currentPw || !newPw || newPw !== confirmPw}
            >
              {loading ? <><Spinner /> Updating…</> : "Update Password"}
            </PrimaryBtn>
          </ModalFooter>
        </form>
      )}
    </ModalBackdrop>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Sign-Out Confirmation Modal ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
interface SignOutModalProps { user: { displayName: string; email: string; roles: string[] }; onCancel: () => void; onConfirm: () => void; }
const SignOutModal: React.FC<SignOutModalProps> = ({ user, onCancel, onConfirm }) => (
  <ModalBackdrop onClose={onCancel}>
    <ModalHeader
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      }
      iconBg="rgba(220,38,38,0.08)"
      iconBorder="rgba(220,38,38,0.2)"
      title="Sign out of ROMS?"
      subtitle="You'll need to sign in again to access the system."
    />

    {/* Body */}
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Session info card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "var(--color-primary-highlight)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--color-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {user.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>{user.displayName}</div>
          <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)" }}>Current session will be terminated</div>
        </div>
        <div style={{
          marginLeft: "auto", flexShrink: 0,
          fontSize: "var(--fs-xxs)", fontWeight: 700, letterSpacing: "0.04em",
          background: "var(--color-primary)", color: "#fff",
          padding: "2px 9px", borderRadius: 99, textTransform: "uppercase",
        }}>
          Active
        </div>
      </div>

      {/* Warning */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "9px 12px",
        background: "rgba(239,68,68,0.05)",
        border: "1px solid rgba(239,68,68,0.14)",
        borderRadius: "var(--radius)",
        fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", lineHeight: 1.6,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Any unsaved changes will be lost. Ensure your work is saved before signing out.
      </div>
    </div>

    <ModalFooter>
      <GhostBtn onClick={onCancel}>Stay Signed In</GhostBtn>
      <PrimaryBtn danger onClick={onConfirm}>
        <SignOutIcon /> Yes, Sign Out
      </PrimaryBtn>
    </ModalFooter>
  </ModalBackdrop>
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Topbar ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export const SidebarHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header style={{
        height: 48, minHeight: 48,
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: 8, flexShrink: 0, zIndex: 100,
      }}>
        {/* AHRI logo */}
        <div style={{
          width: 30, height: 30,
          borderRadius: "50%",
          border: "1.5px solid var(--color-primary)",
          background: "var(--color-primary-highlight)",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <img
            src={logoAhri}
            alt="AHRI Logo"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "0.04em" }}>
          ROMS
        </span>

        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme} title="Toggle theme"
          style={{
            width: 26, height: 26, borderRadius: "var(--radius-sm)",
            border: "none", background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-text-muted)", transition: "background 0.14s, color 0.14s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-offset)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--color-text-muted)"; }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* User avatar + dropdown */}
        {user && (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              id="user-avatar-btn"
              onClick={() => setShowDropdown((v) => !v)}
              title={user.displayName}
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--color-primary)", color: "#fff",
                border: `2px solid ${showDropdown ? "var(--color-primary-hover)" : "transparent"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.15s, transform 0.15s",
                transform: showDropdown ? "scale(1.08)" : "scale(1)",
              }}
            >
              <UserPersonIcon size={14} />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: -55,
                width: 260,
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
                zIndex: 500, overflow: "hidden",
                animation: "fadeUp 0.14s ease both",
              }}>
                {/* User info */}
                <div style={{
                  padding: "14px 16px", borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", flexShrink: 0,
                    }}>
                      <UserPersonIcon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.displayName}
                      </div>
                      <div style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {user.roles.map((r) => (
                      <span key={r} style={{
                        fontSize: "var(--fs-xxs)", fontWeight: 700, letterSpacing: "0.05em",
                        textTransform: "uppercase", padding: "2px 7px", borderRadius: 99,
                        background: "var(--color-primary-highlight)", color: "var(--color-primary)",
                      }}>
                        {r.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: "6px" }}>
                  <button
                    id="change-password-btn"
                    onClick={() => { setShowDropdown(false); setShowChangePw(true); }}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "var(--radius)",
                      border: "none", background: "transparent",
                      color: "var(--color-text)", fontSize: "var(--fs-xs)", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                      textAlign: "left", transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-offset)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}><KeyIcon /></span>
                    Change Password
                  </button>

                  <div style={{ height: 1, background: "var(--color-border)", margin: "4px 6px" }} />

                  <button
                    id="sign-out-dropdown-btn"
                    onClick={() => { setShowDropdown(false); setShowSignOut(true); }}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "var(--radius)",
                      border: "none", background: "transparent",
                      color: "#dc2626", fontSize: "var(--fs-xs)", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                      textAlign: "left", transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <SignOutIcon /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Modals */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      {showSignOut && user && (
        <SignOutModal
          user={user}
          onCancel={() => setShowSignOut(false)}
          onConfirm={() => { setShowSignOut(false); logout(); }}
        />
      )}
    </>
  );
};

export const Topbar = SidebarHeader;
