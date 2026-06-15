/**
 * Supabase Postgres client — server-side only.
 *
 * We use the SERVICE_ROLE key here, which bypasses Row Level Security and
 * has admin privileges on the database. This is safe ONLY because this
 * module is exclusively imported from Next.js server contexts (API routes,
 * server components, server-side helpers).
 *
 * ⚠️ NEVER import this from a `"use client"` component or expose the
 * resulting client to the browser. The service_role key would leak in the
 * JS bundle and anyone could read/write all tables.
 *
 * Auth in this app is handled by the `mr-pass` HMAC cookie (see
 * src/lib/auth-gate.ts and src/middleware.ts) — Supabase Auth is NOT used.
 *
 * The singleton is re-used across warm Vercel Fluid Compute invocations.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} non configuré. Ajoute-le dans .env.local et dans les Environment Variables Vercel.`
    );
  }
  return v;
}

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: "public" },
  });
  return cachedClient;
}

/**
 * Convenience export so consumers can `import { supabase } from "@/lib/supabase"`
 * without calling the getter every time. Lazy-initializes on first access.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
