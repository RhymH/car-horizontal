import { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface PortalSession {
  userId: string;
  customerId: string | null;
  fullName: string;
  tokens: AuthTokens;
}

export interface PortalProfile {
  customerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
}

export interface PortalVehicleEvent {
  kind: string;
  title: string;
  dueAt: string | null;
  severity: string | null;
}

export interface PortalVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  licensePlate: string | null;
  currentMileage: number;
  mileageUpdatedAt: string;
  upcomingEvents: PortalVehicleEvent[];
}

export const portalApi = {
  async login(email: string, password: string): Promise<PortalSession> {
    const { data } = await apiClient.post<PortalSession>("/api/portal/auth/login", {
      email,
      password,
    });
    return data;
  },

  async acceptInvite(email: string, token: string, newPassword: string): Promise<PortalSession> {
    const { data } = await apiClient.post<PortalSession>("/api/portal/auth/accept-invite", {
      email,
      token,
      newPassword,
    });
    return data;
  },

  async getProfile(signal?: AbortSignal): Promise<PortalProfile> {
    const { data } = await apiClient.get<PortalProfile>("/api/portal/me", { signal });
    return data;
  },

  async getVehicles(signal?: AbortSignal): Promise<PortalVehicle[]> {
    const { data } = await apiClient.get<PortalVehicle[]>("/api/portal/vehicles", { signal });
    return data;
  },
};

/** Extrait un message lisible d'une erreur API (problem+json) ou renvoie le fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { detail?: string; title?: string } | undefined;
    return data?.detail ?? data?.title ?? fallback;
  }
  return fallback;
}
