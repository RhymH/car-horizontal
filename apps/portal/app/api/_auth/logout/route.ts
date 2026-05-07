import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/env";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (refreshToken && accessToken) {
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response.cookies);
  return response;
}
