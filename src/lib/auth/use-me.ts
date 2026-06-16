"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "./session";

let cache: UserProfile | null = null;
let cachePromise: Promise<UserProfile | null> | null = null;
let cacheLoaded = false;

function fetchMe(): Promise<UserProfile | null> {
  if (cacheLoaded) return Promise.resolve(cache);
  if (!cachePromise) {
    cachePromise = fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cache = data?.profile ?? null;
        cacheLoaded = true;
        return cache;
      })
      .catch(() => {
        cachePromise = null;
        return null;
      });
  }
  return cachePromise;
}

export interface ProfileState {
  profile: UserProfile | null;
  /** True once /api/me has returned (success or failure). */
  loaded: boolean;
}

/**
 * Hook to read the current user's profile in client components.
 * Cached at module level — only one network call per page load.
 *
 * Returns the profile directly for backward compat. Use `useProfileState()`
 * when you need to distinguish "still loading" from "loaded but no profile"
 * (critical for role-based UI — defaulting to admin-view during load shows
 * forbidden controls to foreman/SDR for a few hundred ms).
 */
export function useMyProfile(): UserProfile | null {
  return useProfileState().profile;
}

export function useProfileState(): ProfileState {
  const [state, setState] = useState<ProfileState>({
    profile: cache,
    loaded: cacheLoaded,
  });

  useEffect(() => {
    if (cacheLoaded) return;
    let cancelled = false;
    fetchMe().then((p) => {
      if (!cancelled) setState({ profile: p, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
