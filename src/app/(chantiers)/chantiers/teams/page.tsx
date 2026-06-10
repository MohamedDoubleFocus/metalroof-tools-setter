"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";
import type { Team, TeamEmployee } from "@/types/teams";
import { TEAM_STYLES } from "@/components/chantiers/TeamBadge";
import type { Chantier } from "@/types/chantiers";
import { invalidateTeamsCache } from "@/lib/teams/use-teams";

function makeEmployeeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface TeamCardProps {
  team: Team;
  activeChantierCount: number;
  onUpdate: (updated: Team) => void;
}

function TeamCard({ team, activeChantierCount, onUpdate }: TeamCardProps) {
  const [chiefName, setChiefName] = useState(team.chiefName);
  const [employees, setEmployees] = useState<TeamEmployee[]>(team.employees);
  const [notes, setNotes] = useState(team.notes ?? "");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const style = TEAM_STYLES[team.key];

  const saveField = async (
    field: string,
    body: Record<string, unknown>
  ): Promise<void> => {
    setSaving(field);
    try {
      const res = await fetch(`/api/teams/${team.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      onUpdate(data.team);
      invalidateTeamsCache();
    } finally {
      setSaving(null);
    }
  };

  const addEmployee = async () => {
    const name = newEmployeeName.trim();
    if (!name) return;
    const next = [...employees, { id: makeEmployeeId(), name }];
    setEmployees(next);
    setNewEmployeeName("");
    await saveField("employees", { employees: next });
  };

  const removeEmployee = async (id: string) => {
    const next = employees.filter((e) => e.id !== id);
    setEmployees(next);
    await saveField("employees", { employees: next });
  };

  const renameEmployee = (id: string, newName: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name: newName } : e))
    );
  };

  const commitEmployeeRename = async () => {
    await saveField("employees", { employees });
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
      {/* Colored header */}
      <div className={`${style.bg} ${style.border} border-b-2 px-4 py-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${style.dot}`} />
            <span className={`font-bold text-xs uppercase tracking-wide ${style.text}`}>
              Équipe {team.key}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-white/70 text-gray-700 px-2 py-0.5 rounded-full">
            {activeChantierCount} chantier{activeChantierCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Chief name */}
        <label className="block">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
            Chef d&apos;équipe
          </div>
          <input
            type="text"
            value={chiefName}
            onChange={(e) => setChiefName(e.target.value)}
            onBlur={() => {
              const v = chiefName.trim();
              if (v && v !== team.chiefName) {
                saveField("chiefName", { chiefName: v });
              }
            }}
            disabled={saving === "chiefName"}
            placeholder="Nom du chef"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>

        {/* Employees */}
        <div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
            Employés ({employees.length})
          </div>
          <div className="space-y-1.5">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={emp.name}
                  onChange={(e) => renameEmployee(emp.id, e.target.value)}
                  onBlur={commitEmployeeRename}
                  disabled={saving === "employees"}
                  className="flex-1 px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:border-accent focus:outline-none"
                />
                <button
                  onClick={() => removeEmployee(emp.id)}
                  disabled={saving === "employees"}
                  className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                  title="Retirer"
                >
                  ×
                </button>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-xs text-gray-400 italic">Aucun employé pour l&apos;instant.</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmployee();
                }
              }}
              placeholder="+ Ajouter un employé"
              className="flex-1 px-3 py-1.5 border-2 border-dashed border-gray-200 rounded-lg text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={addEmployee}
              disabled={!newEmployeeName.trim() || saving === "employees"}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-light disabled:bg-gray-300"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Notes */}
        <label className="block">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
            Notes
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if ((notes || "").trim() !== (team.notes || "").trim()) {
                saveField("notes", { notes: notes.trim() || null });
              }
            }}
            disabled={saving === "notes"}
            rows={3}
            placeholder="Contexte interne, planning préféré, etc."
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none resize-y"
          />
        </label>
      </div>
    </div>
  );
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/chantiers").then((r) => r.json()),
    ])
      .then(([teamData, chantierData]) => {
        if (cancelled) return;
        setTeams(teamData.teams ?? []);
        setChantiers(chantierData.chantiers ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCountByTeam = useMemo(() => {
    const out: Record<ChantierTeam, number> = {
      Nikita: 0,
      MAX: 0,
      PAVEL: 0,
      OMAR: 0,
    };
    for (const c of chantiers) {
      if (c.team && c.status !== "done") out[c.team]++;
    }
    return out;
  }, [chantiers]);

  const onTeamUpdated = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
  };

  // Sort teams in the canonical order from the type definition
  const orderedTeams = CHANTIER_TEAMS.map(
    (k) => teams.find((t) => t.key === k) ?? null
  ).filter((t): t is Team => t !== null);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour aux chantiers
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Gestion des équipes
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Chef d&apos;équipe, employés, notes. Tout est sauvegardé automatiquement.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orderedTeams.map((team) => (
            <TeamCard
              key={team.key}
              team={team}
              activeChantierCount={activeCountByTeam[team.key]}
              onUpdate={onTeamUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
