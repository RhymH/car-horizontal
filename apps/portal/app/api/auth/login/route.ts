import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/env";
import { setActiveOrgCookie, setRefreshCookie } from "@/lib/auth/cookies";
import type { LoginRequest, LoginResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest;

  const upstream = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const data = payload as LoginResponse;
  const response = NextResponse.json({
    userId: data.userId,
    activeOrganizationId: data.activeOrganizationId,
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
  setActiveOrgCookie(response.cookies, data.activeOrganizationId);

  return response;
}
