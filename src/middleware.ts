import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { PORTAL_COOKIE, isPortalCookieValid } from "@/lib/auth-gate";
import { canAccess } from "@/lib/auth/can";
import { homeForRole, type UserRole } from "@/lib/auth/session";

/**
 * Two-surface routing + Supabase Auth gate.
 *
 * Closer site (default): full Supabase Auth (email+password). Role-based
 * access via the `profiles` table. Public-only paths bypass auth.
 *
 * Freelancer site (matched by FREELANCER_DOMAIN): kept on the legacy
 * `rp-pass` HMAC cookie — it's a completely separate white-labeled audience
 * that doesn't share employee identities with the internal team.
 */

const ALWAYS_PUBLIC_PREFIXES = [
  "/client/",
  "/api/client/",
  "/api/webhooks/",
  "/api/internal/",
  "/api/upload",
  "/api/pdf",
  // Vercel Blob server-to-server callbacks (signed inside handler).
  "/api/reports/upload-pdf",
  "/api/reports/upload-photo",
];

const AUTH_PUBLIC_PATHS = ["/login", "/auth/callback", "/logout"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p));
}

function isAuthPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isPortalPath(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/portal-locked" ||
    pathname.startsWith("/api/auth/portal-passcode") ||
    pathname.startsWith("/api/reports/") ||
    pathname === "/api/reports"
  );
}

function isFreelancerHost(host: string): boolean {
  const domain = process.env.FREELANCER_DOMAIN;
  if (!domain) return false;
  const cleanHost = host.split(":")[0].toLowerCase();
  const cleanDomain = domain.split(":")[0].toLowerCase();
  return cleanHost === cleanDomain || cleanHost.endsWith("." + cleanDomain);
}

async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  try {
    // Admin client (service_role) — bypasses RLS, single query.
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return (data?.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const onFreelancerSite = isFreelancerHost(host);

  // ─── Always-public paths on both sites ─────────────────────────────────
  if (startsWithAny(pathname, ALWAYS_PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  // ─── Freelancer site routing (rp-pass, unchanged) ──────────────────────
  if (onFreelancerSite) {
    if (!isPortalPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      pathname === "/portal-locked" ||
      pathname.startsWith("/api/auth/portal-passcode")
    ) {
      return NextResponse.next();
    }

    const portalCookie = request.cookies.get(PORTAL_COOKIE)?.value;
    if (await isPortalCookieValid(portalCookie)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/portal-locked";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ─── Closer site routing ───────────────────────────────────────────────

  // Portal routes are 404 on the closer site (white-label water-tight)
  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/portal-locked" ||
    pathname.startsWith("/api/auth/portal-passcode")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Auth pages (login, callback, logout) are open without session
  if (isAuthPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ─── Supabase session check ────────────────────────────────────────────
  // Prepare the response we'll mutate (refreshed cookies) before returning.
  let response = NextResponse.next({ request });
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Auth not configured — let request through (e.g. local dev without env).
    // The downstream API guards will still block writes.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ─── Role-based access check ───────────────────────────────────────────
  const role = await fetchProfileRole(user.id);
  if (!role) {
    // User exists in auth but has no profile row → block
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no-profile");
    return NextResponse.redirect(url);
  }

  // Home page: non-admin gets bounced to their role-specific home
  if (pathname === "/" && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!canAccess(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
