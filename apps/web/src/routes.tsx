import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import LoginPage from "./auth/LoginPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ArchitecturePage = lazy(() => import("./pages/ArchitecturePage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const BiospecimenPage = lazy(() => import("./pages/domain/BiospecimenPage"));
const InventoryLayout = lazy(() => import("./pages/domain/inventory/InventoryLayout"));
const InventoryLandingPage = lazy(() => import("./pages/domain/inventory/InventoryLandingPage"));
const InventoryDashboardPage = lazy(() => import("./pages/domain/inventory/InventoryDashboardPage"));
const CurrentInventoryPage = lazy(() => import("./pages/domain/inventory/CurrentInventoryPage"));
const CheckInPage = lazy(() => import("./pages/domain/inventory/CheckInPage"));
const CheckInHistoryPage = lazy(() => import("./pages/domain/inventory/CheckInHistoryPage"));
const CheckOutPage = lazy(() => import("./pages/domain/inventory/CheckOutPage"));
const CheckOutHistoryPage = lazy(() => import("./pages/domain/inventory/CheckOutHistoryPage"));
const RequestsPage = lazy(() => import("./pages/domain/inventory/RequestsPage"));
const InventoryManagerPage = lazy(() => import("./pages/domain/inventory/InventoryManagerPage"));
const AnalyticsPage = lazy(() => import("./pages/domain/inventory/AnalyticsPage"));
const MasterDataPage = lazy(() => import("./pages/domain/inventory/MasterDataPage"));
const QMSLayout = lazy(() => import("./pages/domain/qms/QMSLayout"));
const QMSPage = lazy(() => import("./pages/domain/qms/QMSPage"));
const CreateSOPPage = lazy(() => import("./pages/domain/qms/CreateSOPPage"));
const SOPGuidelinesPage = lazy(() => import("./pages/domain/qms/SOPGuidelinesPage"));
const LabWorkflowPage = lazy(() => import("./pages/domain/LabWorkflowPage"));
const DataManagementPage = lazy(() => import("./pages/domain/DataManagementPage"));
const InfrastructurePage = lazy(() => import("./pages/domain/InfrastructurePage"));
const HRLayout = lazy(() => import("./pages/domain/hr"));
const HRLandingPage = lazy(() => import("./pages/domain/hr/HRLandingPage"));
const HRDashboardPage = lazy(() => import("./pages/domain/hr/HRDashboardPage"));
const TrainingRecordsPage = lazy(() => import("./pages/domain/hr/TrainingRecordsPage"));
const ApprovedPage = lazy(() => import("./pages/domain/hr/ApprovedPage"));
const ApproveEmployeePage = lazy(() => import("./pages/domain/hr/ApproveEmployeePage"));
const FinancePage = lazy(() => import("./pages/domain/FinancePage"));
const ParticipantPage = lazy(() => import("./pages/domain/ParticipantPage"));
const RegulatoryPage = lazy(() => import("./pages/domain/RegulatoryPage"));
const UserRightsControlPage = lazy(() => import("./pages/UserRightsControlPage"));
const SubfunctionPlaceholderPage = lazy(() => import("./pages/domain/SubfunctionPlaceholderPage"));

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
      
      // Biospecimen & Biorepository
      {
        path: "domains/biospecimen",
        children: [
          { index: true, element: <Navigate to="/domains/biospecimen/sample-collection-intake" replace /> },
          { path: "sample-collection-intake", element: <BiospecimenPage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Lab Inventory & Supply Chain
      {
        path: "domains/inventory",
        children: [
          { index: true, element: <Navigate to="/domains/inventory/stock-management" replace /> },
          {
            path: "stock-management",
            element: <InventoryLayout />,
            children: [
              { index: true, element: <InventoryLandingPage /> },
              { path: "overview", element: <InventoryLandingPage /> },
              { path: "dashboard", element: <InventoryDashboardPage /> },
              { path: "current-inventory", element: <CurrentInventoryPage /> },
              { path: "check-in", element: <CheckInPage /> },
              { path: "check-in-history", element: <CheckInHistoryPage /> },
              { path: "check-out", element: <CheckOutPage /> },
              { path: "check-out-history", element: <CheckOutHistoryPage /> },
              { path: "requests", element: <RequestsPage /> },
              { path: "inventory-manager", element: <InventoryManagerPage /> },
              { path: "analytics", element: <AnalyticsPage /> },
              { path: "master-data", element: <MasterDataPage /> },
            ],
          },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // SOPs & Quality Management
      {
        path: "domains/qms",
        children: [
          { index: true, element: <Navigate to="/domains/qms/sop-authoring-control" replace /> },
          {
            path: "sop-authoring-control",
            element: <QMSLayout />,
            children: [
              { index: true, element: <QMSPage /> },
              { path: "create-sop", element: <CreateSOPPage /> },
              { path: "guidelines", element: <SOPGuidelinesPage /> },
            ],
          },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Lab Workflow & Experiments
      {
        path: "domains/lab-workflow",
        children: [
          { index: true, element: <Navigate to="/domains/lab-workflow/protocol-design-tracking" replace /> },
          { path: "protocol-design-tracking", element: <LabWorkflowPage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Research Data Management
      {
        path: "domains/data-management",
        children: [
          { index: true, element: <Navigate to="/domains/data-management/data-capture-edc" replace /> },
          { path: "data-capture-edc", element: <DataManagementPage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Infrastructure & IT Services
      {
        path: "domains/infrastructure",
        children: [
          { index: true, element: <Navigate to="/domains/infrastructure/platform-administration" replace /> },
          { path: "platform-administration", element: <InfrastructurePage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // HR & Staff Operations
      {
        path: "domains/hr",
        children: [
          { index: true, element: <Navigate to="/domains/hr/recruitment-onboarding" replace /> },
          {
            path: "recruitment-onboarding",
            element: <HRLayout />,
            children: [
              { index: true, element: <HRLandingPage /> },
              { path: "overview", element: <HRLandingPage /> },
              { path: "dashboard", element: <HRDashboardPage /> },
              { path: "training-records", element: <TrainingRecordsPage /> },
              { path: "approved", element: <ApprovedPage /> },
              { path: "approve-employee", element: <ApproveEmployeePage /> },
            ],
          },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Finance & Grant Management
      {
        path: "domains/finance",
        children: [
          { index: true, element: <Navigate to="/domains/finance/pre-award-management" replace /> },
          { path: "pre-award-management", element: <FinancePage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Participant & Community Engagement
      {
        path: "domains/participant",
        children: [
          { index: true, element: <Navigate to="/domains/participant/recruitment-screening" replace /> },
          { path: "recruitment-screening", element: <ParticipantPage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      // Regulatory, Ethics & Compliance
      {
        path: "domains/regulatory",
        children: [
          { index: true, element: <Navigate to="/domains/regulatory/ethics-submissions" replace /> },
          { path: "ethics-submissions", element: <RegulatoryPage /> },
          { path: ":subfunctionSlug", element: <SubfunctionPlaceholderPage /> },
        ],
      },
      
      { path: "admin/user-rights", element: <UserRightsControlPage /> },
    ],
  },
];

