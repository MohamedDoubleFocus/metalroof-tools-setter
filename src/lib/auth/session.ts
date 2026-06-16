/**
 * Request-scoped session + profile helpers.
 *
 * `getSession()` and `getProfile()` are memoized per-request via React.cache
 * so repeated calls in the same render don't hit Supabase multiple times.
 */

import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";

export type UserRole = "admin" | "foreman" | "sdr";

export interface UserProfile {
  id: string; // auth.users.id (uuid)
  email: string;
  fullName: string | null;
  role: UserRole;
  team: string | null; // foreman's default team key (nullable)
  createdAt: string;
  updatedAt: string;
}

interface SessionInfo {
  userId: string;
  email: string;
}

/**
 * Returns the current user's session, or null if not signed in. Memoized
 * for the duration of a request.
 */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return {
      userId: data.user.id,
      email: data.user.email ?? "",
    };
  } catch {
    return null;
  }
});

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  team: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    team: row.team,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Returns the current user's profile (role + team), or null if no session
 * or no profile row exists.
 *
 * Uses the admin (service_role) client to read the profiles table so we
 * don't depend on RLS for this lookup.
 */
export const getProfile = cache(async (): Promise<UserProfile | null> => {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", session.userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
});

/** Returns the default landing path for a role. */
export function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/";
    case "foreman":
      return "/chantiers";
    case "sdr":
      return "/prospection";
  }
}
