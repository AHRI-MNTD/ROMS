import { apiClient } from "./client";
import type { C4Model } from "@roms/shared";
import { C4_MODEL, C4_RELATIONSHIPS, C4_CONTAINER_INTERACTIONS } from "@roms/shared";

export async function fetchC4Model() {
  try {
    const resp = await apiClient.get<{
      model: C4Model;
      relationships: typeof C4_RELATIONSHIPS;
      containerInteractions: typeof C4_CONTAINER_INTERACTIONS;
    }>("/architecture/c4");
    return resp.data;
  } catch {
    return {
      model: C4_MODEL,
      relationships: C4_RELATIONSHIPS,
      containerInteractions: C4_CONTAINER_INTERACTIONS,
    };
  }
}
