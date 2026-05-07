import type { AuthTokens } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/tokens";

interface RefreshSuccess {
  tokens: AuthTokens;
  activeOrganizationId: string | null;
}

let inflight: Promise<RefreshSuccess | null> | null = null;

async function callRefreshEndpoint(): Promise<RefreshSuccess | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      tokenStore.clear();
      return null;
    }
    const body = (await res.json()) as RefreshSuccess;
    tokenStore.setFromTokens(body.tokens, body.activeOrganizationId ?? null);
    return body;
  } catch {
    tokenStore.clear();
    return null;
  }
}

export function refreshTokens(): Promise<RefreshSuccess | null> {
  if (inflight) return inflight;
  inflight = callRefreshEndpoint().finally(() => {
    inflight = null;
  });
  return inflight;
}
