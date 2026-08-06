import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";

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
  stockFilter?: "all" | "healthy" | "moderate" | "low" | "out";
  enabled?: boolean;
}

export function useInventoryData(options?: UseInventoryDataOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const all = options?.all ?? false;
  const search = options?.search?.trim() ?? "";
  const category = options?.category?.trim() ?? "all";
  const stockFilter = options?.stockFilter ?? "all";
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["inventory-list", page, pageSize, all, search, category, stockFilter],
    enabled,
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory", {
        params: {
          all: all ? "true" : undefined,
          page,
          pageSize,
          search: search || undefined,
          category: category !== "all" ? category : undefined,
          stockFilter: stockFilter !== "all" ? stockFilter : undefined,
        },
      });
      return resp.data as InventoryListResult;
    },
  });
}