/**
 * Redis storage for team metadata.
 *
 * Schema:
 *   team:<key> → Team (persistent)
 *
 * Teams are auto-initialized to defaults the first time they're read, so
 * no migration is required — just call listTeams() and the 4 baseline crews
 * appear with empty employees + the key as their chief name.
 */

import { getJson, setJsonPersistent } from "@/lib/kv";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";
import type { Team, UpdateTeamInput, TeamEmployee } from "@/types/teams";

const teamKey = (key: ChantierTeam) => `team:${key}`;

function defaultTeam(key: ChantierTeam): Team {
  return {
    key,
    chiefName: key, // use the team identifier as the initial display name
    employees: [],
    notes: undefined,
    updatedAt: Date.now(),
  };
}

export async function getTeam(key: ChantierTeam): Promise<Team> {
  const existing = await getJson<Team>(teamKey(key));
  if (existing) return existing;
  // Lazy default — no write yet (we'd otherwise persist on every read).
  return defaultTeam(key);
}

export async function listTeams(): Promise<Team[]> {
  return Promise.all(CHANTIER_TEAMS.map((k) => getTeam(k)));
}

export async function updateTeam(
  key: ChantierTeam,
  patch: UpdateTeamInput
): Promise<Team> {
  const existing = await getTeam(key);
  const updated: Team = {
    ...existing,
    chiefName:
      patch.chiefName?.trim() || existing.chiefName || (existing.key as string),
    employees: patch.employees ?? existing.employees,
    notes:
      patch.notes === undefined
        ? existing.notes
        : patch.notes === null
          ? undefined
          : patch.notes.trim() || undefined,
    updatedAt: Date.now(),
  };
  await setJsonPersistent(teamKey(key), updated);
  return updated;
}

export function makeEmployee(name: string): TeamEmployee {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: name.trim() };
}
