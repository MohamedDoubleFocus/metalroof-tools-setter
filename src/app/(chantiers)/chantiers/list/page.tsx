"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ChantierCard from "@/components/chantiers/ChantierCard";
import ViewSwitch from "@/components/chantiers/ViewSwitch";
import ChantierFilters, {
  applyFilters,
  EMPTY_FILTERS,
  type FiltersState,
} from "@/components/chantiers/ChantierFilters";
import { sortQueueOrder } from "@/lib/chantiers/kv-client";
import type { Chantier, ChantierStatus } from "@/types/chantiers";

const STATUS_FILTERS: Array<{ key: ChantierStatus | "all"; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "scheduled", label: "En attente" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminés" },
];

export default function ChantiersListPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [statusFilter, setStatusFilter] = useState<ChantierStatus | "all">(
    "all"
  );

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

  const counts = useMemo(() => {
    const out: Record<ChantierStatus | "all", number> = {
      all: chantiers.length,
      scheduled: 0,
      in_progress: 0,
      done: 0,
    };
    for (const c of chantiers) out[c.status]++;
    return out;
  }, [chantiers]);

  const filtered = useMemo(() => {
    let out = applyFilters(chantiers, filters);
    if (statusFilter !== "all") {
      out = out.filter((c) => c.status === statusFilter);
    }
    // Order: scheduled uses queue order, others use signedAt desc
    if (statusFilter === "scheduled" || statusFilter === "all") {
      const scheduled = sortQueueOrder(out.filter((c) => c.status === "scheduled"));
      const others = out
        .filter((c) => c.status !== "scheduled")
        .sort((a, b) => b.signedAt - a.signedAt);
      return [...scheduled, ...others];
    }
    return out.sort((a, b) => b.signedAt - a.signedAt);
  }, [chantiers, filters, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Suivi de chantiers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Vue liste — pratique pour la recherche détaillée.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>

      <ViewSwitch />

      <ChantierFilters value={filters} onChange={setFilters} />

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {chantiers.length === 0
            ? "Aucun chantier encore."
            : "Aucun chantier ne correspond aux filtres."}
        </div>
      ) : (
        <div className="space-y-3">
          {(() => {
            let scheduledRank = 0;
            return filtered.map((c) => {
              if (c.status === "scheduled") scheduledRank++;
              return (
                <ChantierCard
                  key={c.id}
                  chantier={c}
                  queuePosition={
                    c.status === "scheduled" ? scheduledRank : undefined
                  }
                />
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
