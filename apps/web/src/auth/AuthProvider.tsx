import React, { useEffect } from "react";
import { useAuth } from "./useAuth";
import { apiClient } from "../api/client";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, login, logout } = useAuth();

  useEffect(() => {
    if (accessToken) {
      // Fetch current user to restore session
      apiClient
        .get("/auth/me")
        .then((resp) => {
          const user = resp.data as { id: string; email: string; displayName: string; roles: string[] };
          login(user, accessToken, localStorage.getItem("roms-refresh-token") ?? "");
        })
        .catch(() => {
          logout();
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};
