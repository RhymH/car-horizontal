import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "@/lib/env";
import { tokenStore } from "@/lib/auth/tokens";

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// Rafraîchissement transparent à 401 (un seul essai), via le endpoint générique
// /api/auth/refresh qui ré-émet un token client (sans org).
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const session = tokenStore.get();

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      session?.refreshToken &&
      typeof window !== "undefined"
    ) {
      original._retried = true;
      try {
        const { data } = await axios.post<{
          tokens: {
            accessToken: string;
            accessTokenExpiresAt: string;
            refreshToken: string;
            refreshTokenExpiresAt: string;
          };
        }>(`${apiBaseUrl}/api/auth/refresh`, { refreshToken: session.refreshToken });

        tokenStore.set({ ...session, ...data.tokens });
        original.headers.set("Authorization", `Bearer ${data.tokens.accessToken}`);
        return apiClient.request(original);
      } catch {
        tokenStore.clear();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
