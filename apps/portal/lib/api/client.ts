import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiBaseUrl } from "@/lib/env";
import { tokenStore } from "@/lib/auth/tokens";
import { refreshTokens } from "@/lib/auth/refresh-flow";
import {
  isNetworkError,
  reportNetworkFailure,
  reportNetworkSuccess,
} from "@/lib/diagnostics/outage";

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  const orgOverride = (config as AxiosRequestConfig & {
    organizationId?: string | null;
  }).organizationId;
  if (orgOverride) {
    config.headers.set("X-Organization-Id", orgOverride);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Le serveur a répondu : toute panne réseau en cours est terminée.
    reportNetworkSuccess();
    return response;
  },
  async (error: AxiosError) => {
    // Aucune réponse HTTP = panne réseau potentielle (API tombée, wifi coupé,
    // proxy bloquant). Alimente l'écran de diagnostic.
    if (isNetworkError(error)) {
      reportNetworkFailure();
    }

    const original = error.config as RetriableConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      typeof window !== "undefined"
    ) {
      original._retried = true;
      const refreshed = await refreshTokens();
      if (refreshed) {
        original.headers.set(
          "Authorization",
          `Bearer ${refreshed.tokens.accessToken}`,
        );
        return apiClient.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export type ApiError = AxiosError;
