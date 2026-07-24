import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "./useAuth";
import { isApprovedUser } from "./permissions";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string; roles: string[]; permissions: string[] };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCode, setDevCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize Google Sign-In
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
            theme: "outline",
            size: "large",
            width: 296,
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
    setError("");
    setLoading(true);
    try {
      const resp = await apiClient.post<LoginResponse>("/auth/google", { credential });
      const { accessToken, refreshToken, user } = resp.data;
      login(user, accessToken, refreshToken);
      if (!isApprovedUser(user.roles, user.permissions)) {
        navigate("/domains/hr/recruitment-onboarding/training-records");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    if (response.credential) {
      handleGoogleLoginResponse(response.credential);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        const resp = await apiClient.post<any>("/auth/register", { email, password, displayName });
        if (resp.data.status === "VERIFICATION_REQUIRED") {
          setVerificationEmail(email);
          if (resp.data.devVerificationCode) {
            setDevCode(resp.data.devVerificationCode);
            setVerificationCode(resp.data.devVerificationCode);
          }
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
        if (!isApprovedUser(user.roles, user.permissions)) {
          navigate("/domains/hr/recruitment-onboarding/training-records");
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.code === "EMAIL_UNVERIFIED") {
        setVerificationEmail(responseData.email || email);
        if (responseData.devVerificationCode) {
          setDevCode(responseData.devVerificationCode);
          setVerificationCode(responseData.devVerificationCode);
        }
        setShowVerification(true);
      } else {
        setError(responseData?.message || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await apiClient.post<LoginResponse>("/auth/verify-email", {
        email: verificationEmail,
        code: verificationCode,
      });
      const { accessToken, refreshToken, user } = resp.data;
      login(user, accessToken, refreshToken);
      if (!isApprovedUser(user.roles, user.permissions)) {
        navigate("/domains/hr/recruitment-onboarding/training-records");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: 360,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-xl)",
              color: "var(--color-text)",
              marginBottom: 4,
            }}
          >
            ROMS
          </div>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
            Research Operations Management System
          </div>
        </div>

        {showVerification ? (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
              <div
                style={{
                  flex: 1,
                  padding: "10px",
                  color: "var(--color-text)",
                  fontWeight: 600,
                  fontSize: "var(--fs-xs)",
                  textAlign: "center",
                }}
              >
                Verify Your Email
              </div>
            </div>

            <form onSubmit={handleVerificationSubmit}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 14, lineHeight: "1.4" }}>
                  A 6-digit verification code was sent to <strong style={{ color: "var(--color-text)" }}>{verificationEmail}</strong>.
                  {devCode ? (
                    <span style={{ display: "block", marginTop: 8, color: "var(--color-primary)", fontWeight: 600 }}>
                      👉 Local/Demo Mode: Your verification code is <strong>{devCode}</strong>
                    </span>
                  ) : (
                    <span style={{ display: "block", marginTop: 6, color: "var(--color-text-muted)" }}>
                      Please check your email inbox to retrieve the 6-digit code.
                    </span>
                  )}
                </p>
                <label
                  htmlFor="verificationCode"
                  style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" }}
                >
                  6-Digit Code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  required
                  placeholder="123456"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-lg)",
                    fontWeight: "bold",
                    letterSpacing: "4px",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "8px 10px",
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    color: "#991b1b",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--fs-sm)",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 14,
                }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  setError("");
                  setVerificationCode("");
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "none",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--fs-xs)",
                  cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </form>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(""); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "none",
                  border: "none",
                  borderBottom: !isSignUp ? "2px solid var(--color-primary)" : "none",
                  color: !isSignUp ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "var(--fs-xs)",
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(""); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "none",
                  border: "none",
                  borderBottom: isSignUp ? "2px solid var(--color-primary)" : "none",
                  color: isSignUp ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "var(--fs-xs)",
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {isSignUp && (
                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="displayName"
                    style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-muted)" }}
                  >
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-base)",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="email"
                  style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-muted)" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="example@gmail.com"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-base)",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="password"
                  style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-muted)" }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "var(--fs-base)",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "8px 10px",
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--fs-xs)",
                    color: "#991b1b",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--fs-sm)",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 10,
                }}
              >
                {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Sign Up" : "Sign In")}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              <span style={{ padding: "0 10px", fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            </div>

            {/* Google Login Button */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div id="google-signin-btn" style={{ minHeight: 40 }} />
            </div>

            <div style={{ marginTop: 20, fontSize: "var(--fs-xs)", color: "var(--color-text-faint)" }}>
              {isSignUp && (
                <>Please sign up with your work or personal email address.</>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
