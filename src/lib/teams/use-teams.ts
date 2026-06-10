"use client";

import { useEffect, useState } from "react";
import type { Team } from "@/types/teams";
import type { ChantierTeam } from "@/types/chantiers";

/**
 * Module-level cache so multiple components on the same page don't trigger
 * parallel /api/teams requests. Reset on full page reload.
 */
let teamsCache: Team[] | null = null;
let teamsPromise: Promise<Team[]> | null = null;

function fetchTeams(): Promise<Team[]> {
  if (teamsCache) return Promise.resolve(teamsCache);
  if (!teamsPromise) {
    teamsPromise = fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        teamsCache = (data.teams ?? []) as Team[];
        return teamsCache;
      })
      .catch(() => {
        teamsPromise = null;
        return [] as Team[];
      });
  }
  return teamsPromise;
}

/**
 * Hook for read-only chief-name resolution from any client component.
 * Returns a map `chantierTeam → chiefName` ready to feed into <TeamBadge>.
 */
export function useTeamChiefNames(): Record<ChantierTeam, string> {
  const [names, setNames] = useState<Record<ChantierTeam, string>>(() => ({
    Nikita: "Nikita",
    MAX: "MAX",
    PAVEL: "PAVEL",
    OMAR: "OMAR",
  }));

  useEffect(() => {
    let cancelled = false;
    fetchTeams().then((teams) => {
      if (cancelled) return;
      const out: Record<ChantierTeam, string> = {
        Nikita: "Nikita",
        MAX: "MAX",
        PAVEL: "PAVEL",
        OMAR: "OMAR",
      };
      for (const t of teams) out[t.key] = t.chiefName || t.key;
      setNames(out);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}

/**
 * Invalidate the module cache — call after the team management screen
 * persists changes if you want other pages to see them on next mount.
 */
export function invalidateTeamsCache() {
  teamsCache = null;
  teamsPromise = null;
}
