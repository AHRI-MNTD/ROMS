import React, { useEffect } from "react";
import { useAuth } from "./useAuth";
import { apiClient } from "../api/client";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, login, logout, isHydrating, setHydrating } = useAuth();

  useEffect(() => {
    if (!accessToken) {
      // No token stored — nothing to hydrate
      setHydrating(false);
      return;
    }
    // Validate the stored token against the server before granting access
    apiClient
      .get("/auth/me")
      .then((resp) => {
        const user = resp.data as { id: string; email: string; displayName: string; roles: string[]; permissions: string[] };
        login(user, accessToken, localStorage.getItem("roms-refresh-token") ?? "");
      })
      .catch(() => {
        logout();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block rendering until the session check completes so no component
  // ever reads `user.roles` while `user` is still null.
  if (isHydrating) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text-muted)",
          fontSize: "var(--fs-sm)",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>⏳</span>
        Restoring session…
      </div>
    );
  }

  return <>{children}</>;
};
