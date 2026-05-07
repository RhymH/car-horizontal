import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/vehicles/:path*",
    "/timeline/:path*",
    "/reminders/:path*",
    "/appointments/:path*",
    "/history/:path*",
    "/loyalty/:path*",
    "/settings/:path*",
  ],
};
