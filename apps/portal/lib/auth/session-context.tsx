"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/tokens";
import { refreshTokens } from "@/lib/auth/refresh-flow";
import type { MeResponse } from "@/lib/api/types";

interface SessionContextValue {
  me: MeResponse | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (tokenStore.isExpired()) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        setMe(null);
        setIsLoading(false);
        return;
      }
    }
    try {
      const res = await apiClient.get<MeResponse>("/api/auth/me");
      setMe(res.data);
      tokenStore.setActiveOrganizationId(res.data.activeOrganizationId);
    } catch {
      setMe(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async () => {
    const token = tokenStore.getAccessToken();
    await fetch("/api/_auth/logout", {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).catch(() => undefined);
    tokenStore.clear();
    setMe(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<SessionContextValue>(
    () => ({ me, isLoading, refresh: load, logout }),
    [me, isLoading, load, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}
