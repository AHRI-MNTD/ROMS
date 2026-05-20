import React from "react";
import { useTheme } from "../theme/useTheme";
import { useAuth } from "../auth/useAuth";

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

  return (
    <header
      style={{
        height: 42,
        minHeight: 42,
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
          onClick={logout}
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-text-muted)",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
          }}
        >
          Sign out
        </button>
      )}
    </header>
  );
};
