import type { AuthTokens } from "@/lib/api/types";

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;
let activeOrganizationId: string | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(accessToken);
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },
  getActiveOrganizationId(): string | null {
    return activeOrganizationId;
  },
  isExpired(skewMs = 5_000): boolean {
    if (!accessToken || !accessTokenExpiresAt) return true;
    return Date.now() + skewMs >= accessTokenExpiresAt;
  },
  setFromTokens(tokens: AuthTokens, organizationId: string | null = activeOrganizationId) {
    accessToken = tokens.accessToken;
    accessTokenExpiresAt = new Date(tokens.accessTokenExpiresAt).getTime();
    activeOrganizationId = organizationId;
    notify();
  },
  setActiveOrganizationId(organizationId: string | null) {
    activeOrganizationId = organizationId;
    notify();
  },
  clear() {
    accessToken = null;
    accessTokenExpiresAt = null;
    activeOrganizationId = null;
    notify();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
