import { apiClient } from "@/lib/api/client";

/** Configuration marque blanche du portail client (identité vue par les clients du garage). */
export interface OrganizationBranding {
  name: string;
  /** Slug public — sert au lien de connexion thémé du portail client (/login?garage=slug). */
  slug: string;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
  brandCoverImageUrl: string | null;
  brandTagline: string | null;
  contactPhone: string | null;
}

export interface UpdateOrganizationBrandingRequest {
  name: string;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
  brandCoverImageUrl: string | null;
  brandTagline: string | null;
  contactPhone: string | null;
}

export const brandingApi = {
  async get(signal?: AbortSignal): Promise<OrganizationBranding> {
    const { data } = await apiClient.get<OrganizationBranding>(
      "/api/organizations/branding",
      { signal },
    );
    return data;
  },

  /** Met à jour la marque blanche (Owner/Admin). */
  async update(request: UpdateOrganizationBrandingRequest): Promise<OrganizationBranding> {
    const { data } = await apiClient.put<OrganizationBranding>(
      "/api/organizations/branding",
      request,
    );
    return data;
  },
};
