import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { routes } from "./routes";
import PlasmicHost from "./plasmic-host";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  ...routes,
  { path: "/plasmic-host", element: <PlasmicHost /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div
                style={{
                  height: "100vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--fs-sm)",
                }}
              >
                Loading…
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
