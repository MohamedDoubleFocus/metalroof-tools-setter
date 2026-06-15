/**
 * Supabase Postgres storage for team metadata.
 *
 * Schema: see supabase/migrations/0001_initial.sql (table `teams`).
 *
 * Teams are auto-initialized to defaults the first time they're read — no
 * migration required. Just call listTeams() and the 4 baseline crews appear
 * with empty employees + the key as their chief name (lazy default, not
 * persisted until updateTeam is called).
 */

import { supabase } from "@/lib/supabase";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";
import type { Team, UpdateTeamInput, TeamEmployee } from "@/types/teams";

const TABLE = "teams";

interface TeamRow {
  key: string;
  chief_name: string;
  employees: TeamEmployee[];
  notes: string | null;
  updated_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    key: row.key as ChantierTeam,
    chiefName: row.chief_name,
    employees: row.employees ?? [],
    notes: row.notes ?? undefined,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function teamToRow(t: Team) {
  return {
    key: t.key,
    chief_name: t.chiefName,
    employees: t.employees,
    notes: t.notes ?? null,
    updated_at: new Date(t.updatedAt).toISOString(),
  };
}

function defaultTeam(key: ChantierTeam): Team {
  return {
    key,
    chiefName: key,
    employees: [],
    notes: undefined,
    updatedAt: Date.now(),
  };
}

export async function getTeam(key: ChantierTeam): Promise<Team> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`getTeam: ${error.message}`);
  if (data) return rowToTeam(data as TeamRow);
  // Lazy default — no write yet (we'd otherwise persist on every read).
  return defaultTeam(key);
}

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("key", [...CHANTIER_TEAMS]);
  if (error) throw new Error(`listTeams: ${error.message}`);
  const persisted = new Map<ChantierTeam, Team>(
    (data as TeamRow[]).map((row) => {
      const t = rowToTeam(row);
      return [t.key, t];
    })
  );
  return CHANTIER_TEAMS.map((k) => persisted.get(k) ?? defaultTeam(k));
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
  const { error } = await supabase
    .from(TABLE)
    .upsert(teamToRow(updated), { onConflict: "key" });
  if (error) throw new Error(`updateTeam: ${error.message}`);
  return updated;
}

export function makeEmployee(name: string): TeamEmployee {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: name.trim() };
}
