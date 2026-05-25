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
}

export function useInventoryData(options?: UseInventoryDataOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  return useQuery({
    queryKey: ["inventory-list", page, pageSize],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/inventory", {
        params: {
          page,
          pageSize,
        },
      });
      return resp.data as InventoryListResult;
    },
  });
}