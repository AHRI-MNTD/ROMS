import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoAhri from "../../../../assets/logo_ahri.png";
import { useAuth } from "../../../../auth/useAuth";
import { hasTabAccess } from "../../../../auth/permissions";

export interface ReagentCard {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  rightRequired: string;
  tone: string;
  icon: React.ReactNode;
  badge?: string;
  bullets: Array<{
    label: string;
    icon: React.ReactNode;
  }>;
}

export default function ReagentOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restrictedModalCard, setRestrictedModalCard] = useState<ReagentCard | null>(null);

  const userRolesStr = user?.roles?.join(", ") || "Normal User";

  const cards: ReagentCard[] = [
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: OPERATIONS (Check-In, Check-Out, Reagent Request)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: "check-in",
      title: "Reagent Check-In",
      subtitle: "Receiving & Cold-Chain Entry",
      section: "Operations",
      rightRequired: "Reagent Check In / Out",
      tone: "#0d9488",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0d9488" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      bullets: [
        {
          label: "Receive New & Existing Reagents",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: "Tag Cold Storage (-80, -20, 2-8, Amb)",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          ),
        },
        {
          label: "Batch Receiving Cart Submission",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          ),
        },
        {
          label: "Record Lot Numbers & Expiration",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0d9488" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "check-out",
      title: "Reagent Check-Out",
      subtitle: "Dispensing & Number of Vials",
      section: "Operations",
      rightRequired: "Reagent Check In / Out",
      tone: "#0284c7",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0284c7" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
        </svg>
      ),
      bullets: [
        {
          label: "Concentration-Based Dispensing",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0284c7" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          ),
        },
        {
          label: "Log Number of Vials (Vill)",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0284c7" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
          ),
        },
        {
          label: "Track Expected Return Dates",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0284c7" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          ),
        },
        {
          label: "Assign Project Allocations & Recipient",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#0284c7" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "requests",
      title: "Reagent Request",
      subtitle: "Dynamic Assay Requisitions",
      section: "Operations",
      rightRequired: "Reagent Request",
      tone: "#16a34a",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#16a34a" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      bullets: [
        {
          label: "Dynamic Fields for 23 Assay Types",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ),
        },
        {
          label: "Conditional Number of Vials Rules",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          ),
        },
        {
          label: "Batch Requisition Cart",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          ),
        },
        {
          label: "Track Pending & Partial Statuses",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: AUDIT & REPORTING (Dashboard, Inventory, Checkin/out History)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: "dashboard",
      title: "Dashboard",
      subtitle: "Concentration Telemetry & Signals",
      section: "Audit & Reporting",
      rightRequired: "Dashboard",
      tone: "#4f46e5",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#4f46e5" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      bullets: [
        {
          label: "Real-Time Concentration Telemetry",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#4f46e5" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-3.94-1.22m3.94 1.22l-1.22 3.94" />
            </svg>
          ),
        },
        {
          label: "Low Stock & Expiry Watchlists",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#4f46e5" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          ),
        },
        {
          label: "Assay Utilization Breakdown",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#4f46e5" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            </svg>
          ),
        },
        {
          label: "Cold-Chain Storage Distribution",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#4f46e5" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "current-inventory",
      title: "Current Inventory",
      subtitle: "Concentration Catalog & Stock",
      section: "Audit & Reporting",
      rightRequired: "Current Inventory",
      tone: "#059669",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#059669" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
      bullets: [
        {
          label: "900+ Reagents Concentration Catalog",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#059669" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ),
        },
        {
          label: "Filter by 23 Assays & Temperatures",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#059669" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          ),
        },
        {
          label: "Freezer, Rack & Bin Location Map",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#059669" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 012.25 9.375v-2.25zM3.375 15h6c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 012.25 18.375v-2.25C2.25 15.504 2.754 15 3.375 15z" />
            </svg>
          ),
        },
        {
          label: "Expected Returns & CSV Export",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#059669" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "check-in-history",
      title: "Check-In History",
      subtitle: "Receipt Audit Trail & Log",
      section: "Audit & Reporting",
      rightRequired: "Reagent Check In / Out History",
      tone: "#7c3aed",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#7c3aed" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bullets: [
        {
          label: "Incoming Shipment Audit Trail",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7c3aed" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: "Cold-Chain Arrival Temperatures",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7c3aed" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          ),
        },
        {
          label: "Supplier & Receiving Staff Audit",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7c3aed" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            </svg>
          ),
        },
        {
          label: "Batch Lot & Expiry Reference Table",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#7c3aed" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "check-out-history",
      title: "Check-Out History",
      subtitle: "Disbursement Log & Returns",
      section: "Audit & Reporting",
      rightRequired: "Reagent Check In / Out History",
      tone: "#dd6b20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#dd6b20" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25V9m12 0a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V11.25A2.25 2.25 0 013.75 9h16.5z" />
        </svg>
      ),
      bullets: [
        {
          label: "Concentration Deduction Trail",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25V9m12 0a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V11.25A2.25 2.25 0 013.75 9h16.5z" />
            </svg>
          ),
        },
        {
          label: "Vials Deducted & Residual Returns",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-19.5 0A2.25 2.25 0 004.5 15h15a2.25 2.25 0 002.25-2.25m-19.5 0v.243a2.25 2.25 0 001.07 1.916l7.5 4.615a2.25 2.25 0 002.36 0l7.5-4.615a2.25 2.25 0 001.07-1.916V12.75" />
            </svg>
          ),
        },
        {
          label: "Project Allocations & Purpose Log",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          ),
        },
        {
          label: "Staff Recipient Sign-Off Trail",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#dd6b20" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: ADMINISTRATION & GOVERNANCE (Manage, Approved, Master Data)
    // ═════════════════════════════════════════════════════════════════════════
    {
      id: "manage-requests",
      title: "Manage & Approve",
      subtitle: "Reagent Manager Portal",
      section: "Administration & Governance",
      rightRequired: "Ragent Manager",
      tone: "#b45309",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#b45309" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bullets: [
        {
          label: "Review Pending Requests Queue",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#b45309" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            </svg>
          ),
        },
        {
          label: "Approve, Partial, or Reject",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#b45309" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: "Adjust Approved Concentration & Vials",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#b45309" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          ),
        },
        {
          label: "Automated Live Stock Deduction",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#b45309" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "approved-requests",
      title: "Approved Requests",
      subtitle: "Physical Hand-Off & Voucher",
      section: "Administration & Governance",
      rightRequired: "Ragent Manager",
      tone: "#16a34a",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#16a34a" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0h3.15m-3.15 0v3m3.15-3v3m0 0h3.15a1.575 1.575 0 011.575 1.575v3.6a6.75 6.75 0 01-6.75 6.75H9.6a6.75 6.75 0 01-6.75-6.75v-3.6A1.575 1.575 0 014.425 10.8h3.15v-3" />
        </svg>
      ),
      bullets: [
        {
          label: "Approved Items Ready for Pickup",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          ),
        },
        {
          label: "Execute Physical Material Hand-Off",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0h3.15m-3.15 0v3m3.15-3v3m0 0h3.15a1.575 1.575 0 011.575 1.575v3.6a6.75 6.75 0 01-6.75 6.75H9.6a6.75 6.75 0 01-6.75-6.75v-3.6A1.575 1.575 0 014.425 10.8h3.15v-3" />
            </svg>
          ),
        },
        {
          label: "Print Official Requisition Vouchers",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656h10.5z" />
            </svg>
          ),
        },
        {
          label: "Chain-of-Custody Timestamps",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#16a34a" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "master-data",
      title: "Master Data",
      subtitle: "Assays & Cold Storage Standards",
      section: "Administration & Governance",
      rightRequired: "Master Data",
      tone: "#6366f1",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#6366f1" style={{ width: 20, height: 20, flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
        </svg>
      ),
      bullets: [
        {
          label: "23 Standard Assay Catalog & Rules",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#6366f1" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ),
        },
        {
          label: "4 Cold-Chain Storage Temperature Tiers",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#6366f1" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          ),
        },
        {
          label: "Concentration Measurement Units",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#6366f1" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          ),
        },
        {
          label: "Freezer, Rack & Bin Location Mapping",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="#6366f1" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 012.25 9.375v-2.25zM3.375 15h6c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 012.25 18.375v-2.25C2.25 15.504 2.754 15 3.375 15z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const sections = ["Operations", "Audit & Reporting", "Administration & Governance"];
  const groupedCards: Record<string, ReagentCard[]> = {
    Operations: cards.filter((c) => c.section === "Operations"),
    "Audit & Reporting": cards.filter((c) => c.section === "Audit & Reporting"),
    "Administration & Governance": cards.filter((c) => c.section === "Administration & Governance"),
  };

  const statusBadgeStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "1px solid transparent",
  };

  const handleCardClick = (card: ReagentCard) => {
    const isAllowed = hasTabAccess(user?.roles, "reagent-inventory", card.id, user?.permissions, user?.email);
    if (isAllowed) {
      navigate(`/domains/reagent-inventory/reagent-management/${card.id}`);
    } else {
      setRestrictedModalCard(card);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        fontFamily: "var(--font-body)",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* ── Active Title Block (Mirrored from SOP Landing Page) ── */}
      <div
        style={{
          padding: "36px 34px 26px",
          borderBottom: "1px solid var(--color-divider)",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          flexWrap: "wrap",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            textAlign: "center",
            marginTop: "-35px",
          }}
        >
          <img
            src={logoAhri}
            alt="AHRI Logo"
            style={{
              height: "64px",
              width: "64px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "8px",
              border: "1px solid var(--color-border, #cbd5e1)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
          />
          <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--color-primary)", textTransform: "uppercase" }}>
            Research Operation management system(ROMS)
          </span>
          <div style={{ width: "calc(100% + 68px)", height: "1px", backgroundColor: "var(--color-divider)", margin: "16px -34px" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            🧪 Reagent Inventory &amp; Cold-Chain Management
          </h1>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "4px 0 0 0", maxWidth: "820px" }}>
            Centralized repository for assay-specific reagents, concentration tracking, cold-chain storage (-80°C to Ambient), and approval workflows.
          </p>
        </div>
      </div>

      {/* ── Inner Scroll Pane with Mirrored SOP Card Layout ── */}
      <div style={{ flex: 1, padding: "20px 24px 36px", overflowY: "auto", background: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1400, margin: "0 auto" }}>
          {sections.map((sectionName) => {
            const sectionCards = groupedCards[sectionName] ?? [];
            if (sectionCards.length === 0) return null;

            return (
              <section key={sectionName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", paddingLeft: 2 }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)" }}>
                      {sectionName}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {sectionName === "Operations" && "Daily routines for receiving reagents, dispensing vials, and submitting requisitions."}
                      {sectionName === "Audit & Reporting" && "Live telemetry dashboards, concentration catalog, and check-in/out audit logs."}
                      {sectionName === "Administration & Governance" && "Managerial approvals, handoff chain-of-custody, and standard assay master data."}
                    </div>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)" }}>
                    {sectionCards.length} module{sectionCards.length === 1 ? "" : "s"}
                  </div>
                </div>

                {/* SOP Process Cards Grid (3 cards in a row, remaining wraps to next row) */}
                <style>{`
                  @media (max-width: 900px) {
                    .reagent-cards-grid {
                      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
                    }
                  }
                `}</style>
                <div
                  className="reagent-cards-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 16,
                    width: "100%",
                  }}
                >
                  {sectionCards.map((card) => {
                    const isAllowed = hasTabAccess(user?.roles, "reagent-inventory", card.id, user?.permissions, user?.email);

                    return (
                      <div
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        style={{
                          background: `linear-gradient(160deg, #ffffff 45%, ${card.tone}14 100%)`,
                          border: `1px solid ${card.tone}33`,
                          borderRadius: "20px",
                          padding: "24px 20px 20px",
                          cursor: isAllowed ? "pointer" : "not-allowed",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                          minHeight: "270px",
                          height: "295px",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.08)";
                          e.currentTarget.style.borderColor = card.tone || "var(--color-primary)";
                          e.currentTarget.style.background = `linear-gradient(160deg, #ffffff 20%, ${card.tone}22 100%)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.04)";
                          e.currentTarget.style.borderColor = `${card.tone}33`;
                          e.currentTarget.style.background = `linear-gradient(160deg, #ffffff 45%, ${card.tone}14 100%)`;
                        }}
                        title={isAllowed ? card.title : `${card.title} is restricted. Click to view permission details.`}
                      >
                        {/* Header with Icon, Title, and Access Status Badge */}
                        <div
                          style={{
                            borderBottom: "1px solid var(--color-border)",
                            paddingBottom: "10px",
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            width: "100%",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            {card.icon}
                            <h2
                              style={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "var(--color-text)",
                                margin: 0,
                                lineHeight: "1.3",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {card.title}
                            </h2>
                          </div>

                          {!isAllowed ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setRestrictedModalCard(card);
                              }}
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "1px solid #fca5a5",
                                ...statusBadgeStyle,
                                cursor: "pointer",
                              }}
                              title="Click to view permission details"
                            >
                              🔒 Restricted
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "rgba(13, 148, 136, 0.12)",
                                color: "var(--color-primary, #0d9488)",
                                border: "1px solid rgba(13, 148, 136, 0.25)",
                                ...statusBadgeStyle,
                              }}
                            >
                              ✓ Active Access
                            </span>
                          )}
                        </div>

                        {/* Middle area with bullets (SOP style) */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", justifyContent: "flex-start", paddingLeft: "4px" }}>
                          {card.bullets.map((b, idx) => (
                            <div key={idx} style={{ fontSize: "13px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "8px", lineHeight: "1.4" }}>
                              {b.icon}
                              <span>{b.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom area: line first, then sub-topic subtitle under line (SOP style) */}
                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                          {/* Thin divider line */}
                          <div
                            style={{
                              height: "1px",
                              background: "var(--color-border)",
                              width: "100%",
                            }}
                          />

                          {/* Sub Topic subtitle under the line */}
                          <h3
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 600,
                              color: "var(--color-text-muted)",
                              margin: 0,
                              lineHeight: "1.5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {card.subtitle}
                            </span>
                            <span style={{ fontSize: "13px", color: isAllowed ? card.tone : "#b91c1c", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                              {isAllowed ? "→" : "🔒"}
                            </span>
                          </h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ── Access Restricted Modal ── */}
      {restrictedModalCard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setRestrictedModalCard(null)}
        >
          <div
            style={{
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "#fef2f2",
                borderBottom: "1px solid #fecaca",
                padding: "18px 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#991b1b" }}>
                  Access Restricted
                </h3>
                <span style={{ fontSize: "12px", color: "#7f1d1d", fontWeight: 500 }}>
                  You don't have access to this page
                </span>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--color-text)", lineHeight: 1.55 }}>
                You do not have permission to access the <strong>{restrictedModalCard.title}</strong> page.
              </p>

              <div
                style={{
                  background: "var(--color-surface-2, #f8fafc)",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  fontSize: "12.5px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Target Module:</span>
                  <strong style={{ color: "var(--color-text)" }}>{restrictedModalCard.title}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Required Right:</span>
                  <strong style={{ color: "#dc2626" }}>"{restrictedModalCard.rightRequired}"</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Your Assigned Role(s):</span>
                  <strong style={{ color: "var(--color-text)" }}>{userRolesStr}</strong>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Rights for all users are managed via the <strong>User Rights Control</strong> panel. If your workflow requires access to this function, please contact your ROMS Administrator or QA/Research Manager.
              </p>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: "14px 24px",
                background: "var(--color-surface-2, #f8fafc)",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setRestrictedModalCard(null)}
                style={{
                  background: "var(--color-primary, #0d9488)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
