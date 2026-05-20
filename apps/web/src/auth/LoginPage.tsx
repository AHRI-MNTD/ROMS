import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "./useAuth";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string; roles: string[] };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await apiClient.post<LoginResponse>("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = resp.data;
      login(user, accessToken, refreshToken);
      navigate("/");
    } catch {
      setError("Invalid email or password. Try scientist@roms.dev / password123");
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
        <div style={{ marginBottom: 28 }}>
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "var(--fs-xs)", fontWeight: 600, marginBottom: 4, color: "var(--color-text-muted)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="scientist@roms.dev"
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
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: "var(--fs-xs)", color: "var(--color-text-faint)" }}>
          Demo: <code>scientist@roms.dev</code> / <code>password123</code>
        </div>
      </div>
    </div>
  );
}
