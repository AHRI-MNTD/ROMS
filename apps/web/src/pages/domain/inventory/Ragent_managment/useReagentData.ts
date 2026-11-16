import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../../api/client";
import type { ReagentItem, ReagentRequest, ReagentMovement, ReagentDashboardData } from "./reagentShared";

export interface ReagentListResult {
  data: ReagentItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

interface UseReagentDataOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  assayType?: string;
  storageCondition?: string;
  enabled?: boolean;
}

export function useReagentData(options?: UseReagentDataOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = options?.search?.trim() ?? "";
  const assayType = options?.assayType?.trim() ?? "";
  const storageCondition = options?.storageCondition?.trim() ?? "";
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["reagent-items", page, pageSize, search, assayType, storageCondition],
    enabled,
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory", {
        params: {
          page,
          pageSize,
          search: search || undefined,
          assayType: assayType && assayType !== "ALL" ? assayType : undefined,
          storageCondition: storageCondition && storageCondition !== "ALL" ? storageCondition : undefined,
        },
      });
      return resp.data as ReagentListResult;
    },
    staleTime: 30000,
  });
}

export function useReagentOptions() {
  return useQuery({
    queryKey: ["reagent-options"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/options");
      return resp.data as {
        assayTypes: string[];
        reagentTypes: string[];
        storageConditions: string[];
        locations: string[];
      };
    },
    staleTime: 60000,
  });
}

export function useReagentDashboard() {
  return useQuery({
    queryKey: ["reagent-dashboard"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/dashboard");
      return resp.data as ReagentDashboardData;
    },
    refetchInterval: 30000,
  });
}

export function useReagentRequests(status?: string) {
  return useQuery({
    queryKey: ["reagent-requests", status ?? "all"],
    queryFn: async () => {
      const resp = await apiClient.get("/domains/reagent-inventory/requests", {
        params: { status: status && status !== "ALL" ? status : undefined },
      });
      return resp.data as { data: ReagentRequest[]; total: number };
    },
    refetchInterval: 30000,
  });
}

