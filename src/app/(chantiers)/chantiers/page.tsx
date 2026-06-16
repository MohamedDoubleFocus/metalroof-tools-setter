"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ViewSwitch from "@/components/chantiers/ViewSwitch";
import ChantierFilters, {
  applyFilters,
  EMPTY_FILTERS,
  type FiltersState,
} from "@/components/chantiers/ChantierFilters";
import ChantierKanban from "@/components/chantiers/ChantierKanban";
import type { Chantier } from "@/types/chantiers";
import { useMyProfile } from "@/lib/auth/use-me";

export default function ChantiersKanbanPage() {
  const profile = useMyProfile();
  const isAdmin = profile?.role === "admin";
  const isForeman = profile?.role === "foreman";

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(() => ({
    ...EMPTY_FILTERS,
    // Foreman default-filter to their assigned team
    team: "all",
  }));

  // Once the profile loads, if foreman has a team assigned, default the filter
  useEffect(() => {
    if (isForeman && profile?.team && filters.team === "all") {
      setFilters((f) => ({ ...f, team: profile.team as FiltersState["team"] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForeman, profile?.team]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/chantiers")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setChantiers(data.chantiers as Chantier[]);
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

  const filtered = useMemo(
    () => applyFilters(chantiers, filters),
    [chantiers, filters]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Suivi de chantiers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Pipeline kanban — glisse les cards pour changer de stage ou monter
            la priorité.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              href="/chantiers/teams"
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm hover:border-accent hover:text-accent"
            >
              👥 Équipes
            </Link>
            <Link
              href="/chantiers/import-roofr"
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm hover:border-accent hover:text-accent"
            >
              🏠 Import Roofr
            </Link>
            <Link
              href="/chantiers/import"
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm hover:border-accent hover:text-accent"
            >
              Import
            </Link>
            <Link
              href="/chantiers/new"
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-accent text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-accent-light shadow-sm whitespace-nowrap"
            >
              + Nouveau
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ViewSwitch />
        <span className="text-xs text-gray-500">
          {filtered.length} chantier{filtered.length > 1 ? "s" : ""}
          {filtered.length !== chantiers.length && ` sur ${chantiers.length}`}
        </span>
      </div>

      <ChantierFilters value={filters} onChange={setFilters} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : chantiers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucun chantier encore. Crée le premier.
        </div>
      ) : (
        <ChantierKanban
          chantiers={chantiers}
          filters={filters}
          onChange={setChantiers}
          readOnly={isForeman}
          hideSubmission={isForeman}
        />
      )}
    </div>
  );
}
