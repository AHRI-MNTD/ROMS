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
}

export function useInventoryData(options?: UseInventoryDataOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const all = options?.all ?? false;

  return useQuery({
    queryKey: ["inventory-list", page, pageSize, all],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory", {
        params: {
          all: all ? "true" : undefined,
          page,
          pageSize,
        },
      });
      return resp.data as InventoryListResult;
    },
  });
}