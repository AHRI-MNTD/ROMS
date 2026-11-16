import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";

export interface InventoryItem {
  id?: string;
  sku?: string;
  sourceCode?: string;
  name?: string;
  category?: string;
  lotNumber?: string;
  quantity?: number;
  minThreshold?: number;
  checkInTotal?: number;
  checkOutTotal?: number;
  balancePercent?: number;
  unit?: string;
  expiryDate?: string;
  createdAt?: string;
}

export interface InventoryListResult {
  data: InventoryItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

interface UseInventoryDataOptions {
  page?: number;
  pageSize?: number;
  all?: boolean;
  search?: string;
  category?: string;
  project?: string;
  stockFilter?: "all" | "healthy" | "moderate" | "low" | "out";
  enabled?: boolean;
}

export function useInventoryData(options?: UseInventoryDataOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const all = options?.all ?? false;
  const search = options?.search?.trim() ?? "";
  const category = options?.category?.trim() ?? "all";
  const project = options?.project?.trim() ?? "all";
  const stockFilter = options?.stockFilter ?? "all";
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["inventory-list", page, pageSize, all, search, category, project, stockFilter],
    enabled,
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory", {
        params: {
          all: all ? "true" : undefined,
          page,
          pageSize,
          search: search || undefined,
          category: category !== "all" ? category : undefined,
          project: project !== "all" ? project : undefined,
          stockFilter: stockFilter !== "all" ? stockFilter : undefined,
        },
      });
      return resp.data as InventoryListResult;
    },
  });
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

export function useProjectStock(project?: string, stockItemId?: string) {
  return useQuery({
    queryKey: ["inventory-project-stock", project ?? "ALL", stockItemId ?? "ALL"],
    queryFn: async () => {
      const resp = await apiClient.get<{ data: ProjectStockItem[] }>("/domains/inventory/project-stock", {
        params: {
          project: project && project !== "ALL" ? project : undefined,
          stockItemId: stockItemId && stockItemId !== "ALL" ? stockItemId : undefined,
        },
      });
      const resData = resp.data as any;
      if (Array.isArray(resData)) return resData as ProjectStockItem[];
      if (Array.isArray(resData?.data)) return resData.data as ProjectStockItem[];
      return [];
    },
    staleTime: 15000,
  });
}
