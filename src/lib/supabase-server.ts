/**
 * Server-side Supabase clients for the App Router.
 *
 * Two flavors:
 *
 * 1. `createServerSupabase()` — uses the user's session cookies (Supabase Auth).
 *    Call from Server Components, Server Actions, and API routes. Respects the
 *    logged-in user's identity. Use this to fetch the session / user.
 *
 * 2. `createMiddlewareSupabase(request, response)` — same idea but adapted to
 *    the Next.js Edge middleware request/response API. Used only from
 *    src/middleware.ts.
 *
 * The pre-existing `supabase` from src/lib/supabase.ts (service_role, admin
 * bypass) stays around for server-side writes that don't need the user
 * identity (kv helpers, migrations, etc.).
 *
 * Auth flow ref: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} non configuré`);
  }
  return v;
}

/**
 * Returns a Supabase client tied to the current request's session cookies.
 * Use from Server Components, Server Actions, Route Handlers.
 *
 * Even though anon key is "public", we use it server-side here because the
 * session cookie is what grants the actual privileges. Service_role is used
 * separately via @/lib/supabase for bypass-RLS DB writes.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const url = getEnv("SUPABASE_URL");
  // Anon publishable key — safe to use here, the session cookie is the auth token.
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY non configuré"
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — fine, middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Middleware-flavored Supabase client. Reads cookies from the incoming
 * NextRequest and writes refreshed session cookies onto the provided
 * NextResponse so the user's session survives.
 *
 * Returns the client + the mutated response — the caller MUST use this
 * response (don't recreate a new NextResponse after calling this).
 */
export function createMiddlewareSupabase(
  request: NextRequest,
  response: NextResponse
) {
  const url = getEnv("SUPABASE_URL");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY non configuré"
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return supabase;
}
