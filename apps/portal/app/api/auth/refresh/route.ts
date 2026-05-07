import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/env";
import {
  ACTIVE_ORG_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setActiveOrgCookie,
  setRefreshCookie,
} from "@/lib/auth/cookies";
import type { RefreshResponse } from "@/lib/api/types";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const activeOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_cookie" }, { status: 401 });
  }

  const upstream = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const failure = NextResponse.json(
      await upstream.json().catch(() => ({})),
      { status: upstream.status },
    );
    clearAuthCookies(failure.cookies);
    return failure;
  }

  const data = (await upstream.json()) as RefreshResponse;
  const response = NextResponse.json({
    activeOrganizationId: activeOrg,
    tokens: {
      accessToken: data.tokens.accessToken,
      accessTokenExpiresAt: data.tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
    },
  });

  setRefreshCookie(
    response.cookies,
    data.tokens.refreshToken,
    data.tokens.refreshTokenExpiresAt,
  );
  setActiveOrgCookie(response.cookies, activeOrg);

  return response;
}
