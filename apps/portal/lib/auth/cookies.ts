import type { ResponseCookies } from "next/dist/server/web/spec-extension/cookies";

export const REFRESH_COOKIE = "ch_refresh";
export const ACTIVE_ORG_COOKIE = "ch_active_org";

export function setRefreshCookie(
  cookies: ResponseCookies,
  refreshToken: string,
  refreshExpiresAt: string,
) {
  const expires = new Date(refreshExpiresAt);
  cookies.set({
    name: REFRESH_COOKIE,
    value: refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export function setActiveOrgCookie(
  cookies: ResponseCookies,
  organizationId: string | null,
) {
  if (!organizationId) {
    cookies.delete(ACTIVE_ORG_COOKIE);
    return;
  }
  cookies.set({
    name: ACTIVE_ORG_COOKIE,
    value: organizationId,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearAuthCookies(cookies: ResponseCookies) {
  cookies.delete(REFRESH_COOKIE);
  cookies.delete(ACTIVE_ORG_COOKIE);
}
