import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SecondarySidebar } from "./SecondarySidebar";
import { useAuth } from "../auth/useAuth";
import { hasPathAccess, isApprovedUser } from "../auth/permissions";

export const AppShell: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPathAccess(user?.roles, location.pathname, user?.permissions)) {
    if (!isApprovedUser(user?.roles, user?.permissions)) {
      return <Navigate to="/domains/hr/recruitment-onboarding/training-records" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <SecondarySidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          background: "var(--color-bg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

