import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "./useAuth";
import { isApprovedUser } from "./permissions";
import logoAhri from "../assets/logo_ahri.png";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string; roles: string[]; permissions: string[] };
}

// ── Shared icon components ────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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

// ── Reusable input with icon ──────────────────────────────────────────────────
interface InputFieldProps {
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  autoComplete?: string;
}
const InputField: React.FC<InputFieldProps> = ({ id, type, value, onChange, placeholder, required, icon, rightSlot, autoComplete }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      border: `1.5px solid ${focused ? "var(--color-primary)" : "var(--color-border)"}`,
      borderRadius: "var(--radius)",
      background: "var(--color-surface)",
      transition: "border-color 0.15s",
      overflow: "hidden",
    }}>
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 38, flexShrink: 0,
        color: focused ? "var(--color-primary)" : "var(--color-text-muted)",
        transition: "color 0.15s",
      }}>
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          padding: "10px 10px 10px 0",
          background: "none",
          border: "none",
          outline: "none",
          color: "var(--color-text)",
          fontSize: "var(--fs-sm)",
          fontFamily: "inherit",
          minWidth: 0,
        }}
      />
      {rightSlot && (
        <span style={{ display: "flex", alignItems: "center", paddingRight: 10 }}>
          {rightSlot}
        </span>
      )}
    </div>
  );
};

// ── Primary button ────────────────────────────────────────────────────────────
const PrimaryButton: React.FC<{
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ type = "button", disabled, onClick, children, fullWidth = true }) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    style={{
      width: fullWidth ? "100%" : undefined,
      padding: "10px 20px",
      background: disabled ? "var(--color-border)" : "var(--color-primary)",
      color: "#fff",
      border: "none",
      borderRadius: "var(--radius)",
      fontSize: "var(--fs-sm)",
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s, transform 0.1s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      letterSpacing: "0.01em",
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--color-primary-hover)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.transform = "translateY(0)"; } }}
  >
    {children}
  </button>
);

// ── Error banner ──────────────────────────────────────────────────────────────
const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 8,
    padding: "9px 12px",
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "var(--radius)",
    fontSize: "var(--fs-xs)",
    color: "#dc2626",
    lineHeight: 1.5,
  }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
    {message}
  </div>
);

// ── Card shell ────────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    width: 390,
    maxWidth: "94vw",
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: 20,
    boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
    overflow: "hidden",
    animation: "fadeUp 0.22s ease both",
  }}>
    {children}
  </div>
);

// ── Card header with logo ─────────────────────────────────────────────────────
const CardHeader: React.FC = () => (
  <div style={{
    padding: "28px 28px 24px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  }}>
    {/* Logo circle + wordmark side-by-side */}
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* Perfect circle — logo fills it completely with no gap */}
      <div style={{
        width: 52, height: 52,
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
          fontSize: "var(--fs-xl)",
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
  </div>
);

// ── Tab switcher (Sign In / Sign Up) ─────────────────────────────────────────
const TabSwitcher: React.FC<{ isSignUp: boolean; onSwitch: (v: boolean) => void }> = ({ isSignUp, onSwitch }) => (
  <div style={{
    display: "flex",
    background: "var(--color-surface-offset)",
    borderRadius: "var(--radius)",
    padding: 3,
  }}>
    {[false, true].map((val) => (
      <button
        key={String(val)}
        type="button"
        onClick={() => onSwitch(val)}
        style={{
          flex: 1,
          padding: "7px 12px",
          borderRadius: "calc(var(--radius) - 2px)",
          border: "none",
          background: isSignUp === val ? "var(--color-surface-2)" : "transparent",
          color: isSignUp === val ? "var(--color-text)" : "var(--color-text-muted)",
          fontWeight: isSignUp === val ? 700 : 500,
          fontSize: "var(--fs-xs)",
          cursor: "pointer",
          boxShadow: isSignUp === val ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
          transition: "all 0.15s",
          letterSpacing: "0.01em",
        }}
      >
        {val ? "Sign Up" : "Sign In"}
      </button>
    ))}
  </div>
);

// ── Main LoginPage ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    const initGoogle = () => {
      const google = (window as any).google;
      if (google && google.accounts) {
        clearInterval(interval);
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "575925483255-v7vbqh1umjliu65kebqb7n5o60opob30.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
        });
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: "outline", size: "large", width: 334,
          });
        }
      }
    };
    if (!showVerification) {
      initGoogle();
      interval = setInterval(initGoogle, 1000);
    }
    return () => clearInterval(interval);
  }, [showVerification]);

  const handleGoogleLoginResponse = async (credential: string) => {
    setError(""); setLoading(true);
    try {
      const resp = await apiClient.post<LoginResponse>("/auth/google", { credential });
      const { accessToken, refreshToken, user } = resp.data;
      login(user, accessToken, refreshToken);
      navigate(isApprovedUser(user.roles, user.permissions) ? "/" : "/domains/hr/recruitment-onboarding/training-records");
    } catch (err: any) {
      setError(err.response?.data?.message || "Google authentication failed.");
    } finally { setLoading(false); }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    if (response.credential) handleGoogleLoginResponse(response.credential);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (isSignUp) {
        const resp = await apiClient.post<any>("/auth/register", { email, password, displayName });
        if (resp.data.status === "VERIFICATION_REQUIRED") {
          setVerificationEmail(email);
          if (resp.data.devVerificationCode) { setDevCode(resp.data.devVerificationCode); setVerificationCode(resp.data.devVerificationCode); }
          setShowVerification(true);
        } else {
          const { accessToken, refreshToken, user } = resp.data;
          login(user, accessToken, refreshToken);
          navigate("/domains/hr/recruitment-onboarding/training-records");
        }
      } else {
        const resp = await apiClient.post<LoginResponse>("/auth/login", { email, password });
        const { accessToken, refreshToken, user } = resp.data;
        login(user, accessToken, refreshToken);
        navigate(isApprovedUser(user.roles, user.permissions) ? "/" : "/domains/hr/recruitment-onboarding/training-records");
      }
    } catch (err: any) {
      const d = err.response?.data;
      if (d?.code === "EMAIL_UNVERIFIED") {
        setVerificationEmail(d.email || email);
        if (d.devVerificationCode) { setDevCode(d.devVerificationCode); setVerificationCode(d.devVerificationCode); }
        setShowVerification(true);
      } else {
        setError(d?.message || "Authentication failed. Please check your credentials.");
      }
    } finally { setLoading(false); }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const resp = await apiClient.post<LoginResponse>("/auth/verify-email", { email: verificationEmail, code: verificationCode });
      const { accessToken, refreshToken, user } = resp.data;
      login(user, accessToken, refreshToken);
      navigate(isApprovedUser(user.roles, user.permissions) ? "/" : "/domains/hr/recruitment-onboarding/training-records");
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed. Please check your code.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "24px 16px",
    }}>
      {/* Subtle background decoration */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: "-20%", right: "-10%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, var(--color-primary-soft) 0%, transparent 70%)",
          opacity: 0.5,
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", left: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, var(--color-primary-soft) 0%, transparent 70%)",
          opacity: 0.4,
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Email Verification screen ───────────────────────────────── */}
        {showVerification ? (
          <Card>
            <CardHeader />

            <div style={{ padding: "24px 28px 28px" }}>
              {/* Email indicator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "var(--color-primary-highlight)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                marginBottom: 20,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--color-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <MailIcon />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text)" }}>
                    Code sent to
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)" }}>
                    {verificationEmail}
                  </div>
                </div>
              </div>

              {devCode && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", marginBottom: 16,
                  background: "var(--color-primary-highlight)",
                  border: "1px solid var(--color-primary)",
                  borderRadius: "var(--radius)",
                  fontSize: "var(--fs-xs)", color: "var(--color-primary)", fontWeight: 600,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Demo code: <strong style={{ letterSpacing: "0.12em" }}>{devCode}</strong>
                </div>
              )}

              <form onSubmit={handleVerificationSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label htmlFor="verificationCode" style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" }}>
                    6-Digit Verification Code
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    required
                    placeholder="· · · · · ·"
                    style={{
                      width: "100%", padding: "12px",
                      border: "1.5px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-xl)", fontWeight: 800,
                      letterSpacing: "0.3em", textAlign: "center",
                      fontFamily: "inherit", outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                  />
                </div>

                {error && <ErrorBanner message={error} />}

                <PrimaryButton type="submit" disabled={loading || verificationCode.length < 6}>
                  {loading ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                        </path>
                      </svg>
                      Verifying…
                    </>
                  ) : "Verify & Sign In"}
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => { setShowVerification(false); setError(""); setVerificationCode(""); }}
                  style={{
                    padding: "9px", background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius)",
                    color: "var(--color-text-muted)",
                    fontSize: "var(--fs-xs)", fontWeight: 600,
                    cursor: "pointer", transition: "background 0.13s, color 0.13s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-offset)"; e.currentTarget.style.color = "var(--color-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  ← Back to Sign In
                </button>
              </form>
            </div>
          </Card>
        ) : (
          /* ── Sign In / Sign Up screen ─────────────────────────────────── */
          <Card>
            <CardHeader />
            <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Tab switcher */}
              <TabSwitcher isSignUp={isSignUp} onSwitch={(v) => { setIsSignUp(v); setError(""); }} />

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Full name — sign up only */}
                {isSignUp && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label htmlFor="displayName" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                      Full Name
                    </label>
                    <InputField
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={setDisplayName}
                      placeholder="Jane Doe"
                      required
                      icon={<UserIcon />}
                      autoComplete="name"
                    />
                  </div>
                )}

                {/* Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label htmlFor="email" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                    Email Address
                  </label>
                  <InputField
                    id="email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="example@gmail.com"
                    required
                    icon={<MailIcon />}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label htmlFor="password" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                    Password
                  </label>
                  <InputField
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                    required
                    icon={<LockIcon />}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", padding: 0 }}
                      >
                        <EyeIcon show={showPassword} />
                      </button>
                    }
                  />
                </div>

                {error && <ErrorBanner message={error} />}

                <div style={{ marginTop: 4 }}>
                  <PrimaryButton type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                          </path>
                        </svg>
                        {isSignUp ? "Creating account…" : "Signing in…"}
                      </>
                    ) : (isSignUp ? "Create Account" : "Sign In")}
                  </PrimaryButton>
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <span style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  or continue with
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              </div>

              {/* Google button */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div id="google-signin-btn" style={{ minHeight: 40 }} />
              </div>

              {isSignUp && (
                <p style={{ fontSize: "var(--fs-xxs)", color: "var(--color-text-faint)", textAlign: "center", lineHeight: 1.6 }}>
                  Please sign up with your work or personal email address.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
