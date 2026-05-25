import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PASS_COOKIE,
  PORTAL_COOKIE,
  isCookieValid,
  isPortalCookieValid,
} from "@/lib/auth-gate";

/**
 * Two-surface passcode gate.
 *
 * The same deployment serves two completely different audiences depending on
 * which hostname the request hit:
 *
 *  - Closer site (default, e.g. metalroof-tools-setter.vercel.app):
 *      everything visible EXCEPT the freelancer portal (`/portal*`), which
 *      returns 404 here to keep the white-label water-tight.
 *      Requires the closer passcode cookie (PASS_COOKIE).
 *
 *  - Freelancer site (matched against FREELANCER_DOMAIN env var):
 *      ONLY `/portal*`, `/portal-locked`, and the supporting API endpoints
 *      are reachable. Everything else is redirected to `/portal` so the
 *      freelancer can never discover the closer-facing tools.
 *      Requires the portal passcode cookie (PORTAL_COOKIE).
 *
 * Public on BOTH sites (no passcode at all):
 *   - /client/*            (public simulation portal for end-customers)
 *   - /api/client/*        (endpoints powering the client portal)
 *   - /api/webhooks/*      (GHL inbound webhooks — auth via shared secret)
 *   - /api/internal/*      (worker-to-worker calls — auth via X-Internal-Auth)
 *   - /api/upload          (image upload — used by client portal + internal)
 *   - /api/pdf             (PDF download — used by both)
 *
 * Public on the closer site only:
 *   - /api/auth/passcode + /locked  (closer unlock)
 *
 * Public on the freelancer site only:
 *   - /api/auth/portal-passcode + /portal-locked  (freelancer unlock)
 */

const ALWAYS_PUBLIC_PREFIXES = [
  "/client/",
  "/api/client/",
  "/api/webhooks/",
  "/api/internal/",
  "/api/upload",
  "/api/pdf",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p));
}

function isPortalPath(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/portal-locked" ||
    pathname.startsWith("/api/auth/portal-passcode") ||
    pathname.startsWith("/api/reports/") || // freelancer needs reports API
    pathname === "/api/reports"
  );
}

function isFreelancerHost(host: string): boolean {
  const domain = process.env.FREELANCER_DOMAIN;
  if (!domain) return false;
  // Strip port for comparison
  const cleanHost = host.split(":")[0].toLowerCase();
  const cleanDomain = domain.split(":")[0].toLowerCase();
  return cleanHost === cleanDomain || cleanHost.endsWith("." + cleanDomain);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const onFreelancerSite = isFreelancerHost(host);

  // ─── Always-public paths on both sites ─────────────────────────────────
  if (startsWithAny(pathname, ALWAYS_PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  // ─── Freelancer site routing ───────────────────────────────────────────
  if (onFreelancerSite) {
    // Anything outside the portal surface gets pushed to /portal (or /portal-locked)
    if (!isPortalPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Unlock endpoint + locked page are open
    if (
      pathname === "/portal-locked" ||
      pathname.startsWith("/api/auth/portal-passcode")
    ) {
      return NextResponse.next();
    }

    // Everything else requires the portal cookie
    const portalCookie = request.cookies.get(PORTAL_COOKIE)?.value;
    if (await isPortalCookieValid(portalCookie)) {
      return NextResponse.next();
    }

    // Redirect to /portal-locked preserving the original destination
    const url = request.nextUrl.clone();
    url.pathname = "/portal-locked";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ─── Closer site routing ───────────────────────────────────────────────

  // Portal routes are 404 on the closer site (water-tight white-label)
  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/portal-locked" ||
    pathname.startsWith("/api/auth/portal-passcode")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Closer auth surface is open
  if (
    pathname === "/locked" ||
    pathname.startsWith("/api/auth/passcode")
  ) {
    return NextResponse.next();
  }

  // Everything else on the closer site requires the closer cookie
  const closerCookie = request.cookies.get(PASS_COOKIE)?.value;
  if (await isCookieValid(closerCookie)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/locked";
  url.search = "";
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
