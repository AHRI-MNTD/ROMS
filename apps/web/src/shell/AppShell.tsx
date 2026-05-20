import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../auth/useAuth";

export const AppShell: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Topbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--color-bg)",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
