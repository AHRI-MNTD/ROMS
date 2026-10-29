import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";
import { isUserAssignedApprover, getApproverForProject } from "./InventoryManagerPage";
import { isInventoryViewOnly, hasTabAccess } from "../../../auth/permissions";
import { ViewOnlyBanner } from "./ViewOnlyBanner";

export interface ProjectLoanRecord {
  id: string;
  loanCode: string;
  stockItemId: string;
  borrowerProject: string;
  lenderProject: string;
  requestedBy: string;
  requestedTo?: string | null;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  returnedQuantity?: number | null;
  status: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";
  requestNotes?: string | null;
  decisionNotes?: string | null;
  returnNotes?: string | null;
  dueDate?: string | null;
  decisionAt?: string | null;
  returnedAt?: string | null;
  returnedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  stockItem?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    category?: string | null;
  };
}

export interface ProjectStockItem {
  stockItemId: string;
  project: string;
  name: string;
  sku: string;
  unit: string;
  category: string;
  totalCheckIn: number;
  totalCheckOut: number;
  loanedOut: number;
  loanedIn: number;
  availableBalance: number;
}

export interface LoanCartItem {
  id: string;
  stockItemId: string;
  stockItemName: string;
  stockItemSku: string;
  stockItemUnit: string;
  stockItemCategory: string;
  borrowerProject: string;
  lenderProject: string;
  requestedQuantity: number;
  dueDate?: string;
  requestNotes?: string;
}

export default function ProjectLoansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isViewOnly = isInventoryViewOnly(user?.roles, user?.permissions);
  const isAllowed = hasTabAccess(user?.roles, "inventory", "project-loans", user?.permissions);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const updateTheme = () => setIsDarkMode(root.getAttribute("data-theme") === "dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // View & Modal States
  const [isRequestView, setIsRequestView] = useState(false);
  const [decisionModalLoan, setDecisionModalLoan] = useState<ProjectLoanRecord | null>(null);
  const [decisionType, setDecisionType] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [decisionQty, setDecisionQty] = useState<number>(1);
  const [decisionNote, setDecisionNote] = useState("");

  const [returnModalLoan, setReturnModalLoan] = useState<ProjectLoanRecord | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnNote, setReturnNote] = useState("");

  // New Request Form State
  const [newBorrowerProject, setNewBorrowerProject] = useState("");
  const [newLenderProject, setNewLenderProject] = useState("");
  const [newStockItemId, setNewStockItemId] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemSelectRef = React.useRef<HTMLDivElement | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [loanCart, setLoanCart] = useState<LoanCartItem[]>([]);
  const [cartFeedback, setCartFeedback] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Close item dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (itemSelectRef.current && !itemSelectRef.current.contains(event.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch active projects
  const { data: projectsData } = useQuery({
    queryKey: ["inventory-master-projects"],
    queryFn: async () => {
      const resp = await apiClient.get<{ projects: string[] }>("/domains/inventory/master-data/projects");
      return resp.data.projects || [];
    },
    staleTime: 60000,
  });
  const projects = projectsData || [];

  // Automatically resolve project for logged-in Project Manager
  const resolveDefaultProjectForUser = React.useCallback(
    (projList: string[] = projects) => {
      if (!user) return projList[0] || "";
      const email = (user.email ?? "").toLowerCase().trim();
      const displayName = (user.displayName ?? "").toLowerCase().trim();

      // 1. Assalif Demissew -> HAMMS Vector
      if (email.includes("ashifera") || email.includes("assalif") || displayName.includes("assalif")) {
        const found = projList.find((p) => p.toUpperCase().includes("VECTOR") || p.toUpperCase() === "HAMMS VECTOR");
        if (found) return found;
      }

      // 2. Migbaru Kefallew or Alemayehu Godana -> HAMMS Parasite
      if (
        email.includes("migbaru") ||
        displayName.includes("migbaru") ||
        email.includes("alexbiology") ||
        email.includes("alemayehu") ||
        displayName.includes("alemayehu")
      ) {
        const found = projList.find(
          (p) => p.toUpperCase().includes("PARASITE") || p.toUpperCase().includes("PARACITE")
        );
        if (found) return found;
      }

      // 3. Wakweya Chali -> DRIVAX
      if (email.includes("wakeya") || email.includes("wakweya") || displayName.includes("wakweya")) {
        const found = projList.find((p) => p.toUpperCase().includes("DRIVAX"));
        if (found) return found;
      }

      // 4. Tilahun Ketema or Tadele Emiru -> PvSTATEM
      if (
        email.includes("tilahun") ||
        displayName.includes("tilahun") ||
        email.includes("tadele") ||
        displayName.includes("tadele")
      ) {
        const found = projList.find((p) => p.toUpperCase().includes("PVSTATEM"));
        if (found) return found;
      }

      for (const p of projList) {
        if (p && displayName.includes(p.toLowerCase())) {
          return p;
        }
      }

      return projList[0] || "";
    },
    [user, projects]
  );

  useEffect(() => {
    if (projects.length > 0 && !newBorrowerProject) {
      const defaultProj = resolveDefaultProjectForUser(projects);
      if (defaultProj) setNewBorrowerProject(defaultProj);
    }
  }, [projects, resolveDefaultProjectForUser, newBorrowerProject]);

  // 2. Fetch project stock holding balances
  const { data: projectStockData } = useQuery({
    queryKey: ["inventory-project-stock"],
    queryFn: async () => {
      const resp = await apiClient.get<{ data: ProjectStockItem[] }>("/domains/inventory/project-stock");
      const resData = resp.data as any;
      if (Array.isArray(resData)) return resData as ProjectStockItem[];
      if (Array.isArray(resData?.data)) return resData.data as ProjectStockItem[];
      return [];
    },
    refetchInterval: 30000,
  });
  const projectStockList = projectStockData || [];

  // 3. Fetch all stock items for the catalog selector
  const { data: stockCatalogData } = useQuery({
    queryKey: ["inventory-all-stock-items"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory", { params: { all: "true" } });
      return (resp.data.data || []) as Array<{ id: string; sku: string; name: string; unit: string; quantity: number }>;
    },
    staleTime: 60000,
  });
  const stockCatalog = (stockCatalogData || []) as Array<{ id: string; sku: string; name: string; unit: string; quantity: number; category?: string }>;

  const filteredStockCatalog = useMemo(() => {
    const q = itemSearchQuery.trim().toLowerCase();
    if (!q) return stockCatalog;
    return stockCatalog.filter((item) => {
      const name = (item.name ?? "").toLowerCase();
      const sku = (item.sku ?? "").toLowerCase();
      const cat = (item.category ?? "").toLowerCase();
      const unit = (item.unit ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q) || unit.includes(q);
    });
  }, [stockCatalog, itemSearchQuery]);

  const selectedCatalogItem = useMemo(() => {
    return stockCatalog.find((it) => it.id === newStockItemId) || null;
  }, [stockCatalog, newStockItemId]);

  // 4. Fetch Loans
  const { data: loansData, isLoading: isLoansLoading, refetch: refetchLoans } = useQuery({
    queryKey: ["inventory-loans", statusFilter, projectFilter, searchTerm],
    queryFn: async () => {
      const resp = await apiClient.get<{ data: ProjectLoanRecord[]; total: number }>("/domains/inventory/loans", {
        params: {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          project: projectFilter !== "ALL" ? projectFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      });
      const resData = resp.data as any;
      if (Array.isArray(resData)) return resData as ProjectLoanRecord[];
      if (Array.isArray(resData?.data)) return resData.data as ProjectLoanRecord[];
      return [];
    },
    refetchInterval: 20000,
  });
  const allLoans = loansData || [];

  const totalPages = Math.max(1, Math.ceil(allLoans.length / pageSize));
  const paginatedLoans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allLoans.slice(start, start + pageSize);
  }, [allLoans, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, projectFilter, searchTerm]);

  // Check if current user is an approver or admin
  const isSuperAdmin = useMemo(() => {
    const roles = user?.roles || [];
    return roles.includes("ADMIN") || roles.includes("RESEARCH_ADMIN");
  }, [user]);

  // Determine which pending loans require decision from the current user
  const myPendingRequests = useMemo(() => {
    return allLoans.filter((loan) => {
      if (loan.status !== "PENDING") return false;
      if (isSuperAdmin) return true;
      return isUserAssignedApprover(user, loan.lenderProject, loan.requestedTo);
    });
  }, [allLoans, isSuperAdmin, user]);

  // Track seen notifications in localStorage
  useEffect(() => {
    if (myPendingRequests.length === 0) return;
    try {
      let seenMap: Record<string, boolean> = {};
      const saved = localStorage.getItem("roms_seen_loan_requests");
      if (saved) seenMap = JSON.parse(saved);
      let changed = false;
      myPendingRequests.forEach((loan) => {
        if (!seenMap[loan.id]) {
          seenMap[loan.id] = true;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("roms_seen_loan_requests", JSON.stringify(seenMap));
      }
    } catch {}
  }, [myPendingRequests]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = allLoans.length;
    const pending = allLoans.filter((l) => l.status === "PENDING").length;
    const active = allLoans.filter((l) => l.status === "APPROVED").length;
    const returned = allLoans.filter((l) => l.status === "RETURNED").length;
    const rejected = allLoans.filter((l) => l.status === "REJECTED").length;
    return { total, pending, active, returned, rejected };
  }, [allLoans]);

  // Projects that hold the selected new stock item
  const holdingProjectsForSelectedItem = useMemo(() => {
    if (!newStockItemId) return [];
    return projectStockList.filter(
      (ps) => ps.stockItemId === newStockItemId && ps.availableBalance > 0 && ps.project !== newBorrowerProject
    );
  }, [newStockItemId, projectStockList, newBorrowerProject]);

  // Create Loan Batch Mutation
  const createLoanBatchMutation = useMutation({
    mutationFn: async (items: LoanCartItem[]) => {
      const resp = await apiClient.post("/domains/inventory/loans", {
        items: items.map((it) => ({
          stockItemId: it.stockItemId,
          borrowerProject: it.borrowerProject,
          lenderProject: it.lenderProject,
          requestedQuantity: Number(it.requestedQuantity),
          dueDate: it.dueDate || undefined,
          requestNotes: it.requestNotes || undefined,
        })),
      });
      return resp.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-loans"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-project-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-loans-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
      setIsRequestView(false);
      setLoanCart([]);
      resetRequestForm();
      const count = data?.count || data?.data?.length || 1;
      alert(`🎉 Successfully submitted batch of ${count} inter-project loan request(s)!`);
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
    },
  });

  // Decision Mutation (Accept/Reject)
  const decisionMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      approvedQuantity,
      decisionNotes,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      approvedQuantity?: number;
      decisionNotes?: string;
    }) => {
      const resp = await apiClient.post(`/domains/inventory/loans/${id}/decision`, {
        status,
        approvedQuantity,
        decisionNotes,
      });
      return resp.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-loans"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-project-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-loans-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
      setDecisionModalLoan(null);
      alert(`✅ Loan request has been ${variables.status.toLowerCase()} successfully.`);
    },
    onError: (err: any) => {
      alert(`❌ Decision failed: ${getErrorMessage(err)}`);
    },
  });

  // Return Mutation (Mark as Returned)
  const returnMutation = useMutation({
    mutationFn: async ({
      id,
      returnedQuantity,
      returnNotes,
    }: {
      id: string;
      returnedQuantity?: number;
      returnNotes?: string;
    }) => {
      const resp = await apiClient.patch(`/domains/inventory/loans/${id}/return`, {
        returnedQuantity,
        returnNotes,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-loans"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-project-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-loans-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
      setReturnModalLoan(null);
      alert("✅ Loaned items confirmed as returned to lender! Action status updated to green.");
    },
    onError: (err: any) => {
      alert(`❌ Return recording failed: ${getErrorMessage(err)}`);
    },
  });

  const resetRequestForm = () => {
    const defaultProj = resolveDefaultProjectForUser();
    setNewBorrowerProject(defaultProj);
    setNewLenderProject("");
    setNewStockItemId("");
    setItemSearchQuery("");
    setIsItemDropdownOpen(false);
    setNewQuantity(1);
    setNewDueDate("");
    setNewNotes("");
    setFormError("");
    setCartFeedback("");
  };

  const handleOpenDecision = (loan: ProjectLoanRecord, type: "ACCEPT" | "REJECT") => {
    setDecisionModalLoan(loan);
    setDecisionType(type);
    setDecisionQty(loan.requestedQuantity);
    setDecisionNote("");
  };

  const handleOpenReturn = (loan: ProjectLoanRecord) => {
    setReturnModalLoan(loan);
    setReturnQty(loan.approvedQuantity || loan.requestedQuantity);
    setReturnNote("");
  };

  const handleAddToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");
    setCartFeedback("");

    if (!newBorrowerProject) {
      setFormError("Please select the Borrowing Project");
      return;
    }
    if (!newStockItemId) {
      setFormError("Please select an Item to loan");
      return;
    }
    if (!newLenderProject) {
      setFormError("Please select the Lending Project");
      return;
    }
    if (newBorrowerProject.trim().toLowerCase() === newLenderProject.trim().toLowerCase()) {
      setFormError("Borrowing project and lending project cannot be the same");
      return;
    }
    if (!newQuantity || newQuantity <= 0) {
      setFormError("Quantity must be greater than 0");
      return;
    }

    const selectedItem = stockCatalog.find((it) => it.id === newStockItemId);
    if (!selectedItem) {
      setFormError("Selected item not found");
      return;
    }

    const existingIndex = loanCart.findIndex(
      (c) => c.stockItemId === newStockItemId && c.lenderProject === newLenderProject
    );

    if (existingIndex >= 0) {
      const updated = [...loanCart];
      updated[existingIndex].requestedQuantity += Number(newQuantity);
      if (newDueDate) updated[existingIndex].dueDate = newDueDate;
      if (newNotes) updated[existingIndex].requestNotes = newNotes;
      setLoanCart(updated);
      setCartFeedback(`Updated quantity for "${selectedItem.name}" to ${updated[existingIndex].requestedQuantity} in cart.`);
    } else {
      const newItem: LoanCartItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stockItemId: selectedItem.id,
        stockItemName: selectedItem.name,
        stockItemSku: selectedItem.sku,
        stockItemUnit: selectedItem.unit,
        stockItemCategory: selectedItem.category || "General",
        borrowerProject: newBorrowerProject,
        lenderProject: newLenderProject,
        requestedQuantity: Number(newQuantity),
        dueDate: newDueDate || undefined,
        requestNotes: newNotes || undefined,
      };
      setLoanCart((prev) => [...prev, newItem]);
      setCartFeedback(`Added "${selectedItem.name}" (${newQuantity} ${selectedItem.unit}) to loan cart.`);
    }

    // Reset item fields for next addition while retaining borrower project & due date
    setNewStockItemId("");
    setItemSearchQuery("");
    setNewLenderProject("");
    setNewQuantity(1);
    setNewNotes("");
  };

  const handleEditCartItem = (item: LoanCartItem) => {
    setNewBorrowerProject(item.borrowerProject);
    setNewStockItemId(item.stockItemId);
    setItemSearchQuery(`${item.stockItemName} (${item.stockItemSku})`);
    setNewLenderProject(item.lenderProject);
    setNewQuantity(item.requestedQuantity);
    if (item.dueDate) setNewDueDate(item.dueDate);
    if (item.requestNotes) setNewNotes(item.requestNotes);
    setLoanCart((prev) => prev.filter((i) => i.id !== item.id));
    setCartFeedback(`Loaded "${item.stockItemName}" into form for editing.`);
  };

  const handleRemoveCartItem = (id: string) => {
    setLoanCart((prev) => prev.filter((i) => i.id !== id));
  };

  const submitBatchLoanRequests = () => {
    setFormError("");
    setCartFeedback("");

    let itemsToSubmit = [...loanCart];

    // If cart is empty, check if form currently has an item configured
    if (itemsToSubmit.length === 0) {
      if (!newBorrowerProject || !newStockItemId || !newLenderProject || !newQuantity || newQuantity <= 0) {
        setFormError("Please configure an item and click 'Add to Cart' or fill in all required fields.");
        return;
      }
      if (newBorrowerProject.trim().toLowerCase() === newLenderProject.trim().toLowerCase()) {
        setFormError("Borrowing project and lending project cannot be the same");
        return;
      }
      const selectedItem = stockCatalog.find((it) => it.id === newStockItemId);
      if (!selectedItem) {
        setFormError("Selected item not found");
        return;
      }
      itemsToSubmit = [
        {
          id: `${Date.now()}`,
          stockItemId: selectedItem.id,
          stockItemName: selectedItem.name,
          stockItemSku: selectedItem.sku,
          stockItemUnit: selectedItem.unit,
          stockItemCategory: selectedItem.category || "General",
          borrowerProject: newBorrowerProject,
          lenderProject: newLenderProject,
          requestedQuantity: Number(newQuantity),
          dueDate: newDueDate || undefined,
          requestNotes: newNotes || undefined,
        },
      ];
    }

    createLoanBatchMutation.mutate(itemsToSubmit);
  };

  const submitDecision = () => {
    if (!decisionModalLoan) return;
    decisionMutation.mutate({
      id: decisionModalLoan.id,
      status: decisionType === "ACCEPT" ? "APPROVED" : "REJECTED",
      approvedQuantity: decisionType === "ACCEPT" ? Number(decisionQty) : 0,
      decisionNotes: decisionNote || undefined,
    });
  };

  const submitReturn = () => {
    if (!returnModalLoan) return;
    returnMutation.mutate({
      id: returnModalLoan.id,
      returnedQuantity: Number(returnQty),
      returnNotes: returnNote || undefined,
    });
  };

  const canUserActOnLoan = (loan: ProjectLoanRecord) => {
    if (isViewOnly) return false;
    if (isSuperAdmin) return true;
    return isUserAssignedApprover(user, loan.lenderProject, loan.requestedTo);
  };

  // Status Badge Helper
  const getStatusBadge = (status: ProjectLoanRecord["status"]) => {
    switch (status) {
      case "PENDING":
        return {
          bg: "#fef3c7",
          color: "#92400e",
          border: "#fcd34d",
          label: "⏳ Pending Approval",
        };
      case "APPROVED":
        return {
          bg: "#e0f2fe",
          color: "#0369a1",
          border: "#7dd3fc",
          label: "🤝 Active Loan",
        };
      case "RETURNED":
        return {
          bg: "#dcfce7",
          color: "#166534",
          border: "#86efac",
          label: "✅ Returned",
        };
      case "REJECTED":
        return {
          bg: "#fee2e2",
          color: "#991b1b",
          border: "#fca5a5",
          label: "❌ Rejected",
        };
    }
  };

  const cardBackground = isDarkMode ? "var(--color-surface-2)" : "#ffffff";
  const headerBackground = isDarkMode ? "var(--color-surface)" : "#f8fafc";
  const borderStyle = "1px solid var(--color-border)";

  if (!isAllowed) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "var(--color-surface)",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
          maxWidth: "600px",
          margin: "40px auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔒</div>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px 0" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
          Your assigned user rights do not grant access to the <strong>Project Loans</strong> section. This page is secured for Project Managers and Inventory Managers. Please contact your system administrator or QA Officer if access is required.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: "100%", paddingBottom: 40 }}>
      {isViewOnly && (
        <ViewOnlyBanner
          pageName="Project Loans"
          description="You are reviewing Inter-Project Loans in view-only mode. Initiating loan requests, approver decisions, and return confirmations are restricted to assigned project managers and administrators."
        />
      )}
      {/* ── Top Header and Action Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 18px",
          background: cardBackground,
          borderRadius: 12,
          border: borderStyle,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🤝</span> Inter-Project Item Loans
          </h2>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: 2 }}>
            Borrow reagents and equipment held by other projects. Review incoming requests, approve allocations, and track returns.
          </div>
        </div>

        {!isViewOnly && (
          isRequestView ? (
            <button
              type="button"
              onClick={() => {
                setIsRequestView(false);
                resetRequestForm();
              }}
              style={{
                background: isDarkMode ? "var(--color-surface-2)" : "#f1f5f9",
                color: "var(--color-text)",
                border: borderStyle,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                transition: "all 0.15s ease",
              }}
            >
              <span>⬅️</span> Back to Loan Reference
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetRequestForm();
                setIsRequestView(true);
              }}
              style={{
                background: "var(--color-primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(1, 105, 111, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <span>➕</span> Request Item Loan
            </button>
          )
        )}
      </div>

      {/* ── Conditional View: Create Loan Request Page vs. Loans Reference Table ── */}
      {isRequestView ? (
        /* ── Create Inter-Project Loan Request Page View ── */
        <div
          style={{
            background: cardBackground,
            border: borderStyle,
            borderRadius: 12,
            padding: "24px 28px",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: borderStyle, paddingBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🤝</span> Create Inter-Project Loan Request
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: 2 }}>
                Configure items to borrow from other project stocks, queue them in your batch loan cart, and submit for project manager approval.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRequestView(false);
                resetRequestForm();
              }}
              style={{
                background: "transparent",
                border: borderStyle,
                borderRadius: 6,
                color: "var(--color-text)",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>✕</span> Cancel & Back
            </button>
          </div>

          {formError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#991b1b", fontSize: "12px" }}>
              {formError}
            </div>
          )}

          {cartFeedback && (
            <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span>ℹ️</span> {cartFeedback}
            </div>
          )}

          <form onSubmit={handleAddToCart} style={{ display: "grid", gap: 16 }}>
            {/* 1. Project Selection Row: Borrower & Lender */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Borrowing Project (Auto-filled by Project Manager identity) */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Borrowing Project (Your Project / Loaner) *
                </label>
                <select
                  value={newBorrowerProject}
                  onChange={(e) => {
                    setNewBorrowerProject(e.target.value);
                    if (e.target.value === newLenderProject) setNewLenderProject("");
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                >
                  <option value="">-- Select Your Active Project --</option>
                  {projects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {newBorrowerProject && (
                  <div style={{ fontSize: "10.5px", color: "var(--color-primary)", marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>👤</span> Auto-detected Project for {user?.displayName || "Project Manager"}
                  </div>
                )}
              </div>

              {/* Lending Project (Who holds the item) */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Lending Project (Project Holding the Item) *
                </label>
                <select
                  value={newLenderProject}
                  onChange={(e) => setNewLenderProject(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                >
                  <option value="">-- Select Lending Project --</option>
                  {holdingProjectsForSelectedItem.length > 0 ? (
                    holdingProjectsForSelectedItem.map((hp) => (
                      <option key={hp.project} value={hp.project}>
                        ⭐ {hp.project} — ({hp.availableBalance} {hp.unit} currently held)
                      </option>
                    ))
                  ) : (
                    projects
                      .filter((p) => p !== newBorrowerProject)
                      .map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))
                  )}
                </select>

                {newLenderProject && (
                  <div style={{ fontSize: "11px", color: "var(--color-primary)", marginTop: 4, fontWeight: 600 }}>
                    Assigned Approver: {getApproverForProject(newLenderProject)}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Item to Loan (Searchable with Live Typing Filter) */}
            <div ref={itemSelectRef} style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                Select Item to Borrow * <span style={{ fontSize: "10.5px", color: "var(--color-primary)", fontWeight: 500 }}>(Type to search name, SKU, or category)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setIsItemDropdownOpen(true);
                    if (!e.target.value) {
                      setNewStockItemId("");
                      setNewLenderProject("");
                    }
                  }}
                  onFocus={() => setIsItemDropdownOpen(true)}
                  placeholder="🔍 Type item name or SKU (e.g. Cotton Gauze, Pipette, Buffer)..."
                  style={{
                    width: "100%",
                    padding: "8px 30px 8px 12px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                    outline: "none",
                    boxShadow: isItemDropdownOpen ? "0 0 0 2px var(--color-primary)" : "none",
                  }}
                />
                {newStockItemId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewStockItemId("");
                      setItemSearchQuery("");
                      setNewLenderProject("");
                      setIsItemDropdownOpen(true);
                    }}
                    title="Clear selected item"
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                      fontSize: "10px",
                      pointerEvents: "none",
                    }}
                  >
                    ▼
                  </span>
                )}
              </div>

              {/* Dropdown list of filtered items */}
              {isItemDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    marginTop: 4,
                    maxHeight: 240,
                    overflowY: "auto",
                    background: isDarkMode ? "var(--color-surface-2)" : "#ffffff",
                    border: borderStyle,
                    borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  }}
                >
                  {filteredStockCatalog.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "11.5px", color: "var(--color-text-muted)", textAlign: "center" }}>
                      No items matching "{itemSearchQuery}"
                    </div>
                  ) : (
                    filteredStockCatalog.map((item) => {
                      const isSelected = item.id === newStockItemId;
                      const holdingCount = projectStockList.filter(
                        (ps) => ps.stockItemId === item.id && ps.project !== newBorrowerProject && ps.availableBalance > 0
                      ).length;

                      return (
                        <div
                          key={item.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNewStockItemId(item.id);
                            setItemSearchQuery(`${item.name} (${item.sku})`);
                            setNewLenderProject("");
                            setIsItemDropdownOpen(false);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--color-border)",
                            background: isSelected
                              ? (isDarkMode ? "rgba(13,148,136,0.2)" : "#f0fdfa")
                              : "transparent",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.05)" : "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "12px", color: "var(--color-text)" }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                              <span>SKU: {item.sku}</span>
                              <span>· Unit: [{item.unit}]</span>
                              {item.category && <span>· {item.category}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {holdingCount > 0 ? (
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#0d9488", background: "rgba(13,148,136,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                                Held by {holdingCount} other project{holdingCount === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                                No project holds stock
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {selectedCatalogItem && !isItemDropdownOpen && (
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Selected:</span>
                  <strong>{selectedCatalogItem.name}</strong> ({selectedCatalogItem.sku}) — [{selectedCatalogItem.unit}]
                </div>
              )}
            </div>

            {/* 3. Quantity and Due Date Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Quantity Needed *
                </label>
                <input
                  type="number"
                  min={1}
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            {/* 4. Justification Notes */}
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                Reason / Loan Justification
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Critical stockout for ongoing study assays; replenishment shipment arriving next Monday."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                  color: "var(--color-text)",
                  fontSize: "12px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Add to Cart Action */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
              <button
                type="submit"
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "1.5px solid var(--color-primary)",
                  background: isDarkMode ? "rgba(1, 105, 111, 0.15)" : "#f0fdfa",
                  color: "var(--color-primary)",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 3px rgba(1, 105, 111, 0.12)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>➕</span> Add Item to Loan Cart
              </button>
            </div>
          </form>

          {/* Batch Loan Cart Preview List */}
          {loanCart.length > 0 && (
            <div
              style={{
                padding: "14px 16px",
                background: isDarkMode ? "var(--color-surface)" : "#f8fafc",
                border: "1.5px solid var(--color-primary)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🛒</span> Batch Loan Cart ({loanCart.length} {loanCart.length === 1 ? "item" : "items"})
                </div>
                <button
                  type="button"
                  onClick={() => setLoanCart([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear Cart
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {loanCart.map((cartItem, idx) => (
                  <div
                    key={cartItem.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: cardBackground,
                      borderRadius: 6,
                      border: borderStyle,
                      fontSize: "11.5px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{ fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {idx + 1}. {cartItem.stockItemName}
                        <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)", marginLeft: 6 }}>
                          ({cartItem.stockItemSku})
                        </span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                        <span>Lender: <strong style={{ color: "var(--color-text)" }}>{cartItem.lenderProject}</strong></span>
                        <span>· Qty: <strong style={{ color: "#d97706" }}>{cartItem.requestedQuantity} {cartItem.stockItemUnit}</strong></span>
                        {cartItem.dueDate && <span>· Due: <strong>{new Date(cartItem.dueDate).toLocaleDateString()}</strong></span>}
                        {cartItem.requestNotes && <span>· Note: "{cartItem.requestNotes}"</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleEditCartItem(cartItem)}
                        title="Edit item in form"
                        style={{
                          background: "none",
                          border: borderStyle,
                          borderRadius: 4,
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(cartItem.id)}
                        title="Remove from cart"
                        style={{
                          background: "none",
                          border: borderStyle,
                          borderRadius: 4,
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                          color: "#ef4444",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, borderTop: borderStyle, paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => {
                setIsRequestView(false);
                resetRequestForm();
              }}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: borderStyle,
                background: "transparent",
                color: "var(--color-text)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel & Back
            </button>
            <button
              type="button"
              onClick={submitBatchLoanRequests}
              disabled={createLoanBatchMutation.isPending}
              style={{
                padding: "8px 24px",
                borderRadius: 6,
                border: "none",
                background: "var(--color-primary)",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: createLoanBatchMutation.isPending ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(1, 105, 111, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {createLoanBatchMutation.isPending
                ? "Submitting Batch…"
                : loanCart.length > 0
                ? `🚀 Submit Batch Loan Request (${loanCart.length} item${loanCart.length === 1 ? "" : "s"})`
                : "🚀 Send Loan Request"}
            </button>
          </div>
        </div>
      ) : (
        <>

      {/* ── Notification Banner (For Requested Project Manager) ── */}
      {myPendingRequests.length > 0 && (
        <div
          style={{
            padding: "12px 18px",
            background: isDarkMode ? "rgba(245, 158, 11, 0.12)" : "linear-gradient(90deg, rgb(255, 254, 249), rgb(255, 250, 230))",
            border: "1.5px solid rgb(221, 192, 143)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 2px 10px rgba(245, 158, 11, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "13.5px", color: isDarkMode ? "#fde68a" : "#92400e" }}>
                Action Required: You have {myPendingRequests.length} pending inter-project loan request(s) awaiting your review!
              </div>
              <div style={{ fontSize: "12px", color: isDarkMode ? "#fef08a" : "#b45309" }}>
                Another Project Manager is requesting to borrow items held by your project(s). Please review the request and Accept or Reject below.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                background: "#f59e0b",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              {myPendingRequests.length} Awaiting Decision
            </span>
          </div>
        </div>
      )}

      {/* ── Summary KPI Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {[
          { label: "Total Loan Requests", value: stats.total, color: "var(--color-primary)", icon: "📋" },
          { label: "Pending Reviews", value: stats.pending, color: "#d97706", icon: "⏳", alert: stats.pending > 0 },
          { label: "Active Loans", value: stats.active, color: "#0284c7", icon: "🤝" },
          { label: "Completed Returns", value: stats.returned, color: "#16a34a", icon: "✅" },
          { label: "Rejected Requests", value: stats.rejected, color: "#dc2626", icon: "❌" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "10px 14px",
              background: cardBackground,
              borderRadius: 10,
              border: item.alert ? `1.5px solid ${item.color}` : borderStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "10.5px", color: "var(--color-text-muted)", fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: item.color, marginTop: 2 }}>{item.value}</div>
            </div>
            <div style={{ fontSize: 20, opacity: 0.85 }}>{item.icon}</div>
          </div>
        ))}
      </div>

      {/* ── Dedicated Action Section for Pending Incoming Requests ── */}
      {myPendingRequests.length > 0 && (
        <div
          style={{
            background: cardBackground,
            borderRadius: 12,
            border: "1.5px solid rgb(221, 192, 143)",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.1)",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: isDarkMode ? "rgba(245, 158, 11, 0.2)" : "linear-gradient(90deg, rgb(255, 254, 249), rgb(255, 250, 230))",
              borderBottom: "1px solid rgb(252, 211, 77)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "12.5px", fontWeight: 800, color: isDarkMode ? "#fde68a" : "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚡</span> Incoming Loan Requests Requiring Your Decision
            </div>
            <span style={{ fontSize: "11px", color: isDarkMode ? "#fde68a" : "#b45309", fontWeight: 700 }}>
              {myPendingRequests.length} pending
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {myPendingRequests.map((loan) => (
              <div
                key={loan.id}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-primary)", background: "rgba(1, 105, 111, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                      {loan.loanCode}
                    </span>
                    <strong style={{ fontSize: "13px", color: "var(--color-text)" }}>
                      {loan.stockItem?.name || "Item"}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>({loan.stockItem?.sku})</span>
                  </div>

                  <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)", marginTop: 4 }}>
                    Borrower: <strong style={{ color: "var(--color-text)" }}>{loan.borrowerProject}</strong> ({loan.requestedBy})
                    {" → "}
                    Lender: <strong style={{ color: "var(--color-text)" }}>{loan.lenderProject}</strong>
                    {" · "}
                    Quantity: <strong style={{ color: "#d97706" }}>{loan.requestedQuantity} {loan.stockItem?.unit || "units"}</strong>
                    {loan.dueDate && (
                      <span> · Due: <strong>{new Date(loan.dueDate).toLocaleDateString()}</strong></span>
                    )}
                  </div>

                  {loan.requestNotes && (
                    <div style={{ fontSize: "11px", color: "var(--color-text)", background: isDarkMode ? "var(--color-surface)" : "#f1f5f9", padding: "4px 8px", borderRadius: 6, marginTop: 6, fontStyle: "italic" }}>
                      "{loan.requestNotes}"
                    </div>
                  )}
                </div>

                {!isViewOnly ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenDecision(loan, "ACCEPT")}
                      style={{
                        background: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>✓</span> Accept Loan
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDecision(loan, "REJECT")}
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fca5a5",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>✕</span> Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                    View Only Mode
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Search Bar for Reference Table ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          background: cardBackground,
          borderRadius: 10,
          border: borderStyle,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
          <span style={{ fontSize: "13px" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Item, SKU, Loan ID, Project, or Manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 6,
              border: borderStyle,
              background: isDarkMode ? "var(--color-surface)" : "#ffffff",
              color: "var(--color-text)",
              fontSize: "12px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Project Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px" }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: borderStyle,
                background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                color: "var(--color-text)",
                fontSize: "11.5px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "APPROVED", label: "Active" },
              { id: "RETURNED", label: "Returned" },
              { id: "REJECTED", label: "Rejected" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 6,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: statusFilter === btn.id ? "1px solid var(--color-primary)" : borderStyle,
                  background: statusFilter === btn.id ? "var(--color-primary)" : "transparent",
                  color: statusFilter === btn.id ? "#ffffff" : "var(--color-text-muted)",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Loan Reference Table ── */}
      <div
        style={{
          background: cardBackground,
          borderRadius: 12,
          border: borderStyle,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            background: headerBackground,
            borderBottom: borderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--color-text)" }}>
            📊 Inter-Project Loan Reference Table ({allLoans.length} entries)
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
            Real-time inter-project transfer and return log
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left", tableLayout: "fixed" }}>
            <thead>
              <tr
                style={{
                  height: 38,
                  maxHeight: 38,
                  background: headerBackground,
                  borderBottom: borderStyle,
                  color: "var(--color-text-muted)",
                  fontWeight: 700,
                  fontSize: "10.5px",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <th style={{ padding: "0 12px", width: 110, minWidth: 105, verticalAlign: "middle" }}>Loan ID</th>
                <th style={{ padding: "0 12px", width: 95, minWidth: 90, verticalAlign: "middle" }}>Date</th>
                <th style={{ padding: "0 12px", width: 280, minWidth: 260, verticalAlign: "middle" }}>Item Description</th>
                <th style={{ padding: "0 12px", width: 160, minWidth: 150, verticalAlign: "middle" }}>Borrower (Loaner)</th>
                <th style={{ padding: "0 12px", width: 160, minWidth: 150, verticalAlign: "middle" }}>Lender (Holder)</th>
                <th style={{ padding: "0 12px", width: 85, minWidth: 80, textAlign: "center", verticalAlign: "middle" }}>Req. Qty</th>
                <th style={{ padding: "0 12px", width: 85, minWidth: 80, textAlign: "center", verticalAlign: "middle" }}>Appr. Qty</th>
                <th style={{ padding: "0 12px", width: 105, minWidth: 100, verticalAlign: "middle" }}>Due Date</th>
                <th style={{ padding: "0 12px", width: 135, minWidth: 130, verticalAlign: "middle" }}>Status</th>
                <th style={{ padding: "0 12px", width: 200, minWidth: 180, verticalAlign: "middle" }}>Notes / Remarks</th>
                <th style={{ padding: "0 12px", width: 165, minWidth: 160, textAlign: "center", verticalAlign: "middle" }}>Action (Return Status)</th>
              </tr>
            </thead>
            <tbody>
              {isLoansLoading ? (
                <tr>
                  <td colSpan={11} style={{ padding: "30px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    Loading loan reference table...
                  </td>
                </tr>
              ) : paginatedLoans.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "35px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No inter-project loan records found matching the current filters.
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan, idx) => {
                  const b = getStatusBadge(loan.status);
                  const isAuthorizedLender = canUserActOnLoan(loan);
                  const isReturned = loan.status === "RETURNED";
                  const isApproved = loan.status === "APPROVED";
                  const isPending = loan.status === "PENDING";
                  const isRejected = loan.status === "REJECTED";

                  const itemFullName = loan.stockItem?.name || "Unknown Item";
                  const itemSku = loan.stockItem?.sku || "—";
                  const itemCat = loan.stockItem?.category || "General";
                  const fullItemTooltip = `${itemFullName} (SKU: ${itemSku} · Category: ${itemCat})`;

                  const borrowerTooltip = `Borrower: ${loan.borrowerProject} | Requested by: ${loan.requestedBy}`;
                  const approverName = loan.requestedTo || getApproverForProject(loan.lenderProject);
                  const lenderTooltip = `Lender: ${loan.lenderProject} | Approver: ${approverName}`;

                  const reqQtyTooltip = `Requested: ${loan.requestedQuantity} ${loan.stockItem?.unit || "units"}`;
                  const apprQtyTooltip =
                    loan.approvedQuantity !== null && loan.approvedQuantity !== undefined
                      ? `Approved: ${loan.approvedQuantity} ${loan.stockItem?.unit || "units"}`
                      : "Awaiting approval decision";

                  const isOverdue = isApproved && loan.dueDate && new Date(loan.dueDate) < new Date();
                  const dueDateStr = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : "—";
                  const dueTooltip = loan.dueDate
                    ? `Expected return: ${dueDateStr}${isOverdue ? " (OVERDUE)" : ""}`
                    : "No expected return date set";

                  const notePieces = [
                    loan.requestNotes && `Req: ${loan.requestNotes}`,
                    loan.decisionNotes && `Dec: ${loan.decisionNotes}`,
                    loan.returnNotes && `Ret: ${loan.returnNotes}`,
                  ].filter(Boolean);
                  const fullNotes = notePieces.length > 0 ? notePieces.join(" | ") : "No notes";

                  return (
                    <tr
                      key={loan.id}
                      style={{
                        height: 44,
                        maxHeight: 44,
                        borderBottom: borderStyle,
                        background: idx % 2 === 0 ? "transparent" : (isDarkMode ? "rgba(255,255,255,0.02)" : "#fafafa"),
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* 1. Loan Code */}
                      <td
                        title={loan.loanCode}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ background: "rgba(1, 105, 111, 0.08)", padding: "2px 6px", borderRadius: 4 }}>
                          {loan.loanCode}
                        </span>
                      </td>

                      {/* 2. Date Requested */}
                      <td
                        title={new Date(loan.createdAt).toLocaleDateString()}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          color: "var(--color-text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(loan.createdAt).toLocaleDateString()}
                      </td>

                      {/* 3. Item Description */}
                      <td
                        title={fullItemTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{itemFullName}</span>
                          <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)", marginLeft: 6 }}>
                            ({itemSku})
                          </span>
                        </div>
                      </td>

                      {/* 4. Borrower Project & Requester */}
                      <td
                        title={borrowerTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <strong style={{ color: "var(--color-text)" }}>{loan.borrowerProject}</strong>
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)", marginLeft: 4 }}>
                            ({loan.requestedBy})
                          </span>
                        </div>
                      </td>

                      {/* 5. Lender Project & Approver */}
                      <td
                        title={lenderTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <strong style={{ color: "var(--color-text)" }}>{loan.lenderProject}</strong>
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)", marginLeft: 4 }}>
                            ({approverName})
                          </span>
                        </div>
                      </td>

                      {/* 6. Requested Qty */}
                      <td
                        title={reqQtyTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          textAlign: "center",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {loan.requestedQuantity}{" "}
                        <span style={{ fontSize: "9.5px", color: "var(--color-text-muted)" }}>{loan.stockItem?.unit}</span>
                      </td>

                      {/* 7. Approved Qty */}
                      <td
                        title={apprQtyTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          textAlign: "center",
                          fontWeight: 700,
                          color: isApproved || isReturned ? "var(--color-primary)" : "var(--color-text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {loan.approvedQuantity !== null && loan.approvedQuantity !== undefined ? loan.approvedQuantity : "—"}
                      </td>

                      {/* 8. Due Date */}
                      <td
                        title={dueTooltip}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span>{dueDateStr}</span>
                          {isOverdue && (
                            <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700, marginLeft: 4 }}>
                              ⚠️ Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. Status Badge */}
                      <td
                        title={b.label}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            background: b.bg,
                            color: b.color,
                            border: `1px solid ${b.border}`,
                            padding: "2px 8px",
                            borderRadius: 999,
                            display: "inline-block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.label}
                        </span>
                      </td>

                      {/* 10. Notes / Audit */}
                      <td
                        title={fullNotes}
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                          {fullNotes}
                        </div>
                      </td>

                      {/* 11. Action Column (Last Column) */}
                      <td
                        style={{
                          height: 44,
                          maxHeight: 44,
                          padding: "0 12px",
                          verticalAlign: "middle",
                          textAlign: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isReturned ? (
                          /* RETURNED: Action button is permanently GREEN */
                          <button
                            type="button"
                            disabled
                            style={{
                              background: "#16a34a",
                              color: "#ffffff",
                              border: "1px solid #15803d",
                              borderRadius: 6,
                              padding: "4px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "default",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)",
                            }}
                            title={`Returned by ${loan.returnedBy || "Manager"} on ${loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : ""}`}
                          >
                            <span>✅ Returned</span>
                          </button>
                        ) : isApproved ? (
                          /* APPROVED (ACTIVE LOAN): Lender PM clicks to return items */
                          isAuthorizedLender ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReturn(loan)}
                              style={{
                                background: "linear-gradient(180deg, #059669, #047857)",
                                color: "#ffffff",
                                border: "1px solid #047857",
                                borderRadius: 6,
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                boxShadow: "0 2px 4px rgba(4, 120, 87, 0.25)",
                                transition: "all 0.15s ease",
                              }}
                              title="Mark loaned items as returned to the lender"
                            >
                              <span>📦 Confirm Return</span>
                            </button>
                          ) : (
                            <span
                              style={{ fontSize: "10.5px", color: "var(--color-text-muted)", fontWeight: 600 }}
                              title="Only the Lending Project Manager can record returned items"
                            >
                              Active (Awaiting Return)
                            </span>
                          )
                        ) : isPending ? (
                          /* PENDING: Lender can accept/reject */
                          isAuthorizedLender ? (
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(loan, "ACCEPT")}
                                style={{
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 5,
                                  padding: "3px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Accept Loan Request"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(loan, "REJECT")}
                                style={{
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  border: "1px solid #fca5a5",
                                  borderRadius: 5,
                                  padding: "3px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Reject Loan Request"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "10.5px", color: "var(--color-text-muted)" }}>
                              ⏳ Awaiting Lender
                            </span>
                          )
                        ) : (
                          /* REJECTED */
                          <span style={{ fontSize: "10.5px", color: "#991b1b", fontWeight: 600 }}>
                            ❌ Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar ── */}
        <div
          style={{
            padding: "8px 16px",
            background: headerBackground,
            borderTop: borderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            fontSize: "11.5px",
          }}
        >
          <div style={{ color: "var(--color-text-muted)" }}>
            Showing {allLoans.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, allLoans.length)} of {allLoans.length} entries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "3px 9px",
                borderRadius: 5,
                border: borderStyle,
                background: page <= 1 ? "transparent" : (isDarkMode ? "var(--color-surface)" : "#ffffff"),
                color: page <= 1 ? "var(--color-text-muted)" : "var(--color-text)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "11px",
              }}
            >
              ◀ Prev
            </button>
            <span style={{ fontWeight: 700, color: "var(--color-text)", padding: "0 4px" }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "3px 9px",
                borderRadius: 5,
                border: borderStyle,
                background: page >= totalPages ? "transparent" : (isDarkMode ? "var(--color-surface)" : "#ffffff"),
                color: page >= totalPages ? "var(--color-text-muted)" : "var(--color-text)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "11px",
              }}
            >
              Next ▶
            </button>
          </div>
        </div>
      </div>
      </>
    )}

      {/* ── Modal: Lender Decision (Accept / Reject) ── */}
      {decisionModalLoan && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: cardBackground,
              border: borderStyle,
              borderRadius: 12,
              width: "90%",
              maxWidth: 460,
              padding: 22,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-text)" }}>
              {decisionType === "ACCEPT" ? "✓ Accept Inter-Project Loan" : "✕ Reject Inter-Project Loan"}
            </div>

            <div style={{ fontSize: "12px", color: "var(--color-text)" }}>
              Borrower <strong>{decisionModalLoan.borrowerProject}</strong> ({decisionModalLoan.requestedBy}) is requesting{" "}
              <strong>{decisionModalLoan.requestedQuantity} {decisionModalLoan.stockItem?.unit}</strong> of{" "}
              <strong>{decisionModalLoan.stockItem?.name}</strong> from <strong>{decisionModalLoan.lenderProject}</strong>.
            </div>

            {decisionType === "ACCEPT" && (
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Approved Quantity to Loan
                </label>
                <input
                  type="number"
                  min={1}
                  max={decisionModalLoan.requestedQuantity}
                  value={decisionQty}
                  onChange={(e) => setDecisionQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: borderStyle,
                    background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                    color: "var(--color-text)",
                    fontSize: "12px",
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                {decisionType === "ACCEPT" ? "Approval Remark (Optional)" : "Reason for Rejection *"}
              </label>
              <textarea
                rows={2}
                placeholder={decisionType === "ACCEPT" ? "e.g. Approved for 2-week loan period." : "e.g. Currently needed for upcoming batch experiment."}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                required={decisionType === "REJECT"}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                  color: "var(--color-text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setDecisionModalLoan(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: "transparent",
                  color: "var(--color-text)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDecision}
                disabled={decisionMutation.isPending || (decisionType === "REJECT" && !decisionNote.trim())}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: decisionType === "ACCEPT" ? "#16a34a" : "#dc2626",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {decisionMutation.isPending ? "Processing…" : decisionType === "ACCEPT" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Lender Marks Items as Returned ── */}
      {returnModalLoan && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: cardBackground,
              border: borderStyle,
              borderRadius: 12,
              width: "90%",
              maxWidth: 460,
              padding: 22,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📦</span> Confirm Return of Loaned Items
            </div>

            <div style={{ fontSize: "12px", color: "var(--color-text)" }}>
              Confirm that <strong>{returnModalLoan.borrowerProject}</strong> has physically returned the loaned{" "}
              <strong>{returnModalLoan.stockItem?.name}</strong> back to <strong>{returnModalLoan.lenderProject}</strong>.
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                Quantity Returned ({returnModalLoan.stockItem?.unit})
              </label>
              <input
                type="number"
                min={1}
                value={returnQty}
                onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                  color: "var(--color-text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                Return Verification Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Items returned in full and verified in good condition."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: isDarkMode ? "var(--color-surface)" : "#ffffff",
                  color: "var(--color-text)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setReturnModalLoan(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: borderStyle,
                  background: "transparent",
                  color: "var(--color-text)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReturn}
                disabled={returnMutation.isPending}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {returnMutation.isPending ? "Recording…" : "Confirm Returned (Set Green)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
