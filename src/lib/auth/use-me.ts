"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "./session";

let cache: UserProfile | null = null;
let cachePromise: Promise<UserProfile | null> | null = null;

function fetchMe(): Promise<UserProfile | null> {
  if (cache) return Promise.resolve(cache);
  if (!cachePromise) {
    cachePromise = fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cache = data?.profile ?? null;
        return cache;
      })
      .catch(() => {
        cachePromise = null;
        return null;
      });
  }
  return cachePromise;
}

/**
 * Hook to read the current user's profile in client components.
 * Cached at module level — only one network call per page load.
 */
export function useMyProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetchMe().then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
