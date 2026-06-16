/**
 * Permission guards for server routes (API + server actions).
 *
 * Each `requireXxx()` helper:
 *   - reads the current session/profile,
 *   - throws a typed `AuthError` if the user is not signed in or not allowed,
 *   - otherwise returns the profile.
 *
 * Route handlers wrap their work in a try/catch and use `respondError(err)`
 * to convert the AuthError into a 401/403 NextResponse.
 */

import { NextResponse } from "next/server";
import { getProfile, type UserProfile, type UserRole } from "./session";

export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/**
 * Requires any signed-in user. Throws 401 if not signed in.
 */
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getProfile();
  if (!profile) throw new AuthError(401, "Non authentifié");
  return profile;
}

/**
 * Requires admin role. Throws 403 if not admin.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireAuth();
  if (profile.role !== "admin")
    throw new AuthError(403, "Réservé aux administrateurs");
  return profile;
}

/**
 * Requires foreman OR admin role.
 */
export async function requireForemanOrAdmin(): Promise<UserProfile> {
  const profile = await requireAuth();
  if (profile.role !== "admin" && profile.role !== "foreman")
    throw new AuthError(403, "Accès refusé");
  return profile;
}

/**
 * Requires SDR OR admin role.
 */
export async function requireSDROrAdmin(): Promise<UserProfile> {
  const profile = await requireAuth();
  if (profile.role !== "admin" && profile.role !== "sdr")
    throw new AuthError(403, "Accès refusé");
  return profile;
}

/**
 * Convert an AuthError (or unknown error) into a NextResponse with the right
 * HTTP status. Use in route handlers.
 */
export function respondError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Erreur" },
    { status: 500 }
  );
}

/**
 * Path-based access check used by middleware. Returns true if `role` may
 * access `pathname`. Paths starting with `/api/` are checked using their
 * prefix (the API routes do their own fine-grained checks via require*).
 */
export function canAccess(role: UserRole, pathname: string): boolean {
  // Universally allowed for any signed-in user: profile lookup, auth pages.
  // /api/me is read by every client component for role-gating UI — blocking it
  // for foreman/SDR breaks the entire role-conditional UI tree.
  if (
    pathname === "/api/me" ||
    pathname === "/login" ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/auth/")
  ) {
    return true;
  }

  // Admin sees everything.
  if (role === "admin") return true;

  // Foreman: only chantiers (read-only enforced by UI + API), and shared assets.
  if (role === "foreman") {
    return (
      pathname === "/" || // gets redirected to /chantiers below; allow render
      pathname.startsWith("/chantiers") ||
      pathname.startsWith("/api/chantiers") ||
      pathname.startsWith("/api/teams") // foreman needs to read teams for filter display
    );
  }

  // SDR: only prospection.
  if (role === "sdr") {
    return (
      pathname === "/" ||
      pathname.startsWith("/prospection") ||
      pathname.startsWith("/api/prospection")
    );
  }

  return false;
}
