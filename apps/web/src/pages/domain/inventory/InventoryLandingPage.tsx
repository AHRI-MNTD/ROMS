import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoAhri from "../../../assets/logo_ahri.png";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

export interface InventoryCard {
  id: string;
  title: string;
  subtitle: string;
  rightRequired: string;
  icon: string;
  bullets: Array<{
    label: string;
    icon: React.ReactNode;
  }>;
}

export default function InventoryLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restrictedModalCard, setRestrictedModalCard] = useState<InventoryCard | null>(null);

  const userRolesStr = user?.roles?.join(", ") || "Normal User";

  const cards: InventoryCard[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      subtitle: "Real-time Telemetry & Metrics",
      rightRequired: "Dashboard",
      icon: "📊",
      bullets: [
        {
          label: "View Real-Time Stock Telemetry",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-1.22m0 0-3.94-1.22m3.94 1.22-1.22 3.94" />
            </svg>
          )
        },
        {
          label: "Monitor Low Stock Alerts & Expirations",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          )
        },
        {
          label: "Track Recent Inventory Movement Logs",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        },
        {
          label: "Access High-Level Inventory Metrics",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
            </svg>
          )
        }
      ]
    },
    {
      id: "current-inventory",
      title: "Current Inventory",
      subtitle: "Reagent & Consumable Catalog",
      rightRequired: "Current Inventory",
      icon: "📦",
      bullets: [
        {
          label: "Browse Live Reagent & Consumable Catalog",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )
        },
        {
          label: "Search by Catalog Code, Lot & Location",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          )
        },
        {
          label: "Filter by Storage Unit & Expiry Status",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
          )
        },
        {
          label: "Export Custom Inventory Reports (CSV)",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )
        }
      ]
    },
    {
      id: "check-in",
      title: "Check-In",
      subtitle: "Receiving, Batches, & Stock Entry",
      rightRequired: "Check In",
      icon: "📥",
      bullets: [
        {
          label: "Receive New Reagent & Supply Shipments",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25" />
            </svg>
          )
        },
        {
          label: "Log Lot Numbers, Batches & Expiry Dates",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            </svg>
          )
        },
        {
          label: "Assign Storage Locations & Freezer Bins",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
          )
        },
        {
          label: "Update Item Quantities & Stock Records",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )
        }
      ]
    },
    {
      id: "check-out",
      title: "Check-Out",
      subtitle: "Disbursement & Usage Tracking",
      rightRequired: "Check Out",
      icon: "📤",
      bullets: [
        {
          label: "Disperse & Withdraw Consumed Supplies",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25V9m12 0a2.25 2.25 0 0 1 2.25 2.25v6.75a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V11.25A2.25 2.25 0 0 1 3.75 9h16.5Z" />
            </svg>
          )
        },
        {
          label: "Assign Items to Specific Projects & Labs",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.243a2.25 2.25 0 0 0 1.07 1.916l7.5 4.615a2.25 2.25 0 0 0 2.36 0l7.5-4.615a2.25 2.25 0 0 0 1.07-1.916V12.75" />
            </svg>
          )
        },
        {
          label: "Track Recipient Staff & Purpose Logs",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          )
        },
        {
          label: "Deduct Live Balances Automatically",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          )
        }
      ]
    },
    {
      id: "requests",
      title: "Request",
      subtitle: "Requisitions, Forms, & Submissions",
      rightRequired: "Request/s",
      icon: "📋",
      bullets: [
        {
          label: "Submit Staff Material Requisition Forms",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        },
        {
          label: "Specify Required Quantities & Urgency",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )
        },
        {
          label: "Track Real-Time Request Approval Status",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        },
        {
          label: "Review Historic Requisition Submissions",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          )
        }
      ]
    },
    {
      id: "inventory-manager",
      title: "Manager",
      subtitle: "Approvals, Adjustments, & Thresholds",
      rightRequired: "Inventory Manager",
      icon: "👨‍💼",
      bullets: [
        {
          label: "Review & Approve Pending Requisitions",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        },
        {
          label: "Adjust Requested Quantities & Fulfillments",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 18H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 12h9.75" />
            </svg>
          )
        },
        {
          label: "Manage Minimum Reorder Threshold Controls",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          )
        },
        {
          label: "Oversee Restock & Procurement Queues",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          )
        }
      ]
    },
    {
      id: "master-data",
      title: "Master Data",
      subtitle: "Catalogs, Freezers, & Bins",
      rightRequired: "Master Data",
      icon: "🗂️",
      bullets: [
        {
          label: "Manage Standard Item Master Catalogs",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5" />
            </svg>
          )
        },
        {
          label: "Configure Freezers, Shelves & Storage Bins",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a3 3 0 0 0 3 3m13.5-3a3 3 0 0 0 3 3m-19.5-3v-6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v6" />
            </svg>
          )
        },
        {
          label: "Define Unit Categories & Approved Vendors",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5" />
            </svg>
          )
        },
        {
          label: "Maintain System Lookup Codes & Taxonomies",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary, #0d9488)" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          )
        }
      ]
    }
  ];

  const handleCardClick = (card: InventoryCard) => {
    const isAllowed = hasTabAccess(user?.roles, "inventory", card.id, user?.permissions);
    if (isAllowed) {
      navigate(`/domains/inventory/stock-management/${card.id}`);
    } else {
      setRestrictedModalCard(card);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Centered Header Banner (Matching QMS SOP Landing style) ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center", paddingTop: 8 }}>
        <img
          src={logoAhri}
          alt="AHRI Logo"
          style={{
            height: "64px",
            width: "64px",
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: "10px",
            border: "1px solid var(--color-border, #cbd5e1)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
          }}
        />
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-primary, #0d9488)", textTransform: "uppercase" }}>
          Research Operation management system(ROMS)
        </span>
        <div style={{ width: "100%", maxWidth: "880px", height: "1px", backgroundColor: "var(--color-divider)", margin: "16px 0" }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
          Lab Inventory & Supply Chain
        </h1>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "6px 0 0 0", maxWidth: "820px", lineHeight: "1.5" }}>
          Centralized repository for laboratory stock tracking, reagent check-in/check-out, material requisitions, manager approvals, and master catalog data.
        </p>
      </div>

      {/* ── Informative Summary Cards Grid (Shown to ALL Users) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          width: "100%",
          paddingBottom: 24
        }}
      >
        {cards.map((card) => {
          const isAllowed = hasTabAccess(user?.roles, "inventory", card.id, user?.permissions);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                background: "var(--color-surface)",
                border: isAllowed ? "1px solid var(--color-border)" : "1.5px dashed rgba(220, 38, 38, 0.35)",
                borderRadius: "20px",
                padding: "24px 22px 20px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isAllowed ? "0 4px 16px rgba(0, 0, 0, 0.04)" : "0 2px 10px rgba(0, 0, 0, 0.02)",
                minHeight: "330px",
                position: "relative",
                backgroundColor: isAllowed ? "var(--color-surface)" : "var(--color-surface-2, #fafafa)",
                opacity: isAllowed ? 1 : 0.88,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = isAllowed
                  ? "0 12px 28px rgba(0, 0, 0, 0.08)"
                  : "0 8px 20px rgba(220, 38, 38, 0.12)";
                e.currentTarget.style.borderColor = isAllowed ? "var(--color-primary, #0d9488)" : "#dc2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isAllowed
                  ? "0 4px 16px rgba(0, 0, 0, 0.04)"
                  : "0 2px 10px rgba(0, 0, 0, 0.02)";
                e.currentTarget.style.borderColor = isAllowed ? "var(--color-border)" : "rgba(220, 38, 38, 0.35)";
              }}
            >
              {/* Header Title with Nav Icon & Rights Indicator */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    borderBottom: "1px solid var(--color-border)",
                    paddingBottom: "12px",
                    marginBottom: "14px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>
                      {card.icon}
                    </span>
                    <h2
                      style={{
                        fontSize: "14.5px",
                        fontWeight: 800,
                        color: "var(--color-text)",
                        margin: 0,
                        lineHeight: "1.3",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {card.title}
                    </h2>
                  </div>

                  {!isAllowed ? (
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "1px solid #fca5a5",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                      title="Click to view permission details"
                    >
                      🔒 Restricted
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "var(--color-primary-highlight, #dcfce7)",
                        color: "var(--color-primary, #0d9488)",
                        padding: "2px 7px",
                        borderRadius: "10px",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}
                    >
                      ✓ Accessible
                    </span>
                  )}
                </div>

                {/* Bullets List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "2px" }}>
                  {card.bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "12.5px",
                        color: "var(--color-text)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        lineHeight: "1.4"
                      }}
                    >
                      {bullet.icon}
                      <span style={{ fontWeight: 500 }}>{bullet.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtitle / Action Footer */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "10px",
                  borderTop: "1px dashed var(--color-border)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: isAllowed ? "var(--color-primary, #0d9488)" : "#b91c1c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>{card.subtitle}</span>
                <span>{isAllowed ? "Open →" : "Permission Info 🔒"}</span>
              </div>
            </div>
          );
        })}
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
            padding: 16
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
              animation: "fadeIn 0.2s ease-out"
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
                gap: 12
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
                  flexShrink: 0
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
                  gap: 8
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
                justifyContent: "flex-end"
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
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
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
