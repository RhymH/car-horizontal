/**
 * Session client persistée en localStorage : le client reste connecté entre les
 * visites (choix produit : accès permanent par email + mot de passe).
 */
export interface ClientSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  customerId?: string | null;
  fullName?: string;
}

const KEY = "ch_client_session";
let cache: ClientSession | null | undefined;

function read(): ClientSession | null {
  if (cache !== undefined) return cache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export const tokenStore = {
  get(): ClientSession | null {
    return read();
  },
  getAccessToken(): string | null {
    return read()?.accessToken ?? null;
  },
  set(session: ClientSession) {
    cache = session;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(session));
    }
  },
  clear() {
    cache = null;
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
  isExpired(skewMs = 5_000): boolean {
    const s = read();
    if (!s) return true;
    return Date.now() + skewMs >= new Date(s.accessTokenExpiresAt).getTime();
  },
};
