import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PASS_COOKIE, isCookieValid } from "@/lib/auth-gate";

/**
 * Internal-tool passcode gate.
 *
 * Allowed without passcode (public):
 *   - /client/*            (public simulation portal for end-customers)
 *   - /api/client/*        (endpoints powering the client portal)
 *   - /api/webhooks/*      (GHL inbound webhooks — auth via shared secret)
 *   - /api/internal/*      (worker-to-worker calls — auth via X-Internal-Auth)
 *   - /api/upload          (image upload — used by client portal + internal)
 *   - /api/pdf             (PDF download — used by both)
 *   - /api/auth/passcode   (the unlock endpoint itself)
 *   - /locked              (the unlock page itself)
 *
 * Everything else (homepage, /booking, /sav, /prospection, /roof-simulator,
 * other API routes) requires the shared passcode cookie.
 */

const PUBLIC_PREFIXES = [
  "/client/",
  "/api/client/",
  "/api/webhooks/",
  "/api/internal/",
  "/api/upload",
  "/api/pdf",
  "/api/auth/passcode",
  "/locked",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(PASS_COOKIE)?.value;
  if (await isCookieValid(cookie)) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to /locked, preserving the original
  // destination so we can send the user back after unlock.
  const url = request.nextUrl.clone();
  url.pathname = "/locked";
  url.search = "";
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

/**
 * Match every route EXCEPT Next.js internals and common static assets.
 * Public paths are filtered inside the middleware body above so we keep this
 * matcher simple.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
