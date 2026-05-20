import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import LoginPage from "./auth/LoginPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ArchitecturePage = lazy(() => import("./pages/ArchitecturePage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const BiospecimenPage = lazy(() => import("./pages/domain/BiospecimenPage"));
const InventoryPage = lazy(() => import("./pages/domain/InventoryPage"));
const QMSPage = lazy(() => import("./pages/domain/QMSPage"));
const LabWorkflowPage = lazy(() => import("./pages/domain/LabWorkflowPage"));
const DataManagementPage = lazy(() => import("./pages/domain/DataManagementPage"));
const InfrastructurePage = lazy(() => import("./pages/domain/InfrastructurePage"));
const HRPage = lazy(() => import("./pages/domain/HRPage"));
const FinancePage = lazy(() => import("./pages/domain/FinancePage"));
const ParticipantPage = lazy(() => import("./pages/domain/ParticipantPage"));
const RegulatoryPage = lazy(() => import("./pages/domain/RegulatoryPage"));

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "architecture", element: <ArchitecturePage /> },
      { path: "operations", element: <OperationsPage /> },
      { path: "domains/biospecimen", element: <BiospecimenPage /> },
      { path: "domains/inventory", element: <InventoryPage /> },
      { path: "domains/qms", element: <QMSPage /> },
      { path: "domains/lab-workflow", element: <LabWorkflowPage /> },
      { path: "domains/data-management", element: <DataManagementPage /> },
      { path: "domains/infrastructure", element: <InfrastructurePage /> },
      { path: "domains/hr", element: <HRPage /> },
      { path: "domains/finance", element: <FinancePage /> },
      { path: "domains/participant", element: <ParticipantPage /> },
      { path: "domains/regulatory", element: <RegulatoryPage /> },
    ],
  },
];
