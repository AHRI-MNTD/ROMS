import { apiClient } from "./client";
import type { Domain } from "@roms/shared";
import { DOMAIN_CATALOG } from "@roms/shared";

export interface DomainSummary {
  id: number;
  slug: string;
  emoji: string;
  name: string;
  subfunctionCount: number;
  taskCount: number;
}

export async function fetchDomains(): Promise<DomainSummary[]> {
  try {
    const resp = await apiClient.get<{ data: DomainSummary[] }>("/catalog/domains");
    return resp.data.data;
  } catch {
    // Fallback to bundled catalog
    return DOMAIN_CATALOG.map((d) => ({
      id: d.id,
      slug: d.slug,
      emoji: d.emoji,
      name: d.name,
      subfunctionCount: d.subfunctions.length,
      taskCount: d.subfunctions.reduce((a, sf) => a + sf.tasks.length, 0),
    }));
  }
}

export async function fetchDomainBySlug(slug: string): Promise<Domain> {
  try {
    const resp = await apiClient.get<Domain>(`/catalog/domains/${slug}`);
    return resp.data;
  } catch {
    const domain = DOMAIN_CATALOG.find((d) => d.slug === slug);
    if (!domain) throw new Error(`Domain '${slug}' not found`);
    return domain as Domain;
  }
}
