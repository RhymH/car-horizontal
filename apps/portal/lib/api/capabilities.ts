import { apiClient } from "@/lib/api/client";

/** Clés de capability connues côté front (miroir du registre backend). */
export const CAPABILITY_LEASING = "leasing";
export const CAPABILITY_SALES = "sales";
export const CAPABILITY_PROMOTIONS = "promotions";
export const CAPABILITY_ARTICLE_RECOMMENDATIONS = "article-recommendations";
export const CAPABILITY_CLIENT_PORTAL = "client-portal";

/** État effectif d'un plugin pour l'organisation courante. */
export interface Capability {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const capabilitiesApi = {
  async list(signal?: AbortSignal): Promise<Capability[]> {
    const { data } = await apiClient.get<Capability[]>("/api/me/capabilities", {
      signal,
    });
    return data;
  },

  /** Active/désactive un plugin (Owner/Admin). */
  async set(key: string, enabled: boolean): Promise<void> {
    await apiClient.put(`/api/organizations/capabilities/${key}`, { enabled });
  },
};
