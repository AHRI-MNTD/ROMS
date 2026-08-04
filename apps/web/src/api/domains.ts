import { apiClient } from "./client";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize?: number;
}

export async function fetchSamples(page = 1): Promise<PaginatedResult<Record<string, unknown>>> {
  const resp = await apiClient.get("/domains/biospecimen", { params: { page } });
  return resp.data as PaginatedResult<Record<string, unknown>>;
}

export async function fetchGrants(page = 1): Promise<PaginatedResult<Record<string, unknown>>> {
  const resp = await apiClient.get("/domains/finance/grants", { params: { page } });
  return resp.data as PaginatedResult<Record<string, unknown>>;
}

export async function fetchSOPs(page = 1, limit = 1000): Promise<PaginatedResult<Record<string, unknown>>> {
  const resp = await apiClient.get("/domains/qms/sops", { params: { page, limit } });
  return resp.data as PaginatedResult<Record<string, unknown>>;
}

export async function syncSOPs(): Promise<{ ok: boolean; count: number }> {
  const resp = await apiClient.post("/domains/qms/sops/sync");
  return resp.data as { ok: boolean; count: number };
}

export async function fetchParticipants(page = 1): Promise<PaginatedResult<Record<string, unknown>>> {
  const resp = await apiClient.get("/domains/participant", { params: { page } });
  return resp.data as PaginatedResult<Record<string, unknown>>;
}

export async function fetchStudies(page = 1): Promise<PaginatedResult<Record<string, unknown>>> {
  const resp = await apiClient.get("/domains/data-management/studies", { params: { page } });
  return resp.data as PaginatedResult<Record<string, unknown>>;
}

export async function fetchAllUsers(): Promise<Array<{ id: string; name: string; email?: string }>> {
  const resp = await apiClient.get("/users");
  return (resp.data?.data ?? resp.data ?? []) as Array<{ id: string; name: string; email?: string }>;
}
