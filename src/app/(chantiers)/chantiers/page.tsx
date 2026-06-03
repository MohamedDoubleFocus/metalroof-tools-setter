"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ChantierCard from "@/components/chantiers/ChantierCard";
import type { Chantier, ChantierStatus } from "@/types/chantiers";

const STATUS_FILTERS: Array<{ key: ChantierStatus | "all"; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "scheduled", label: "Planifiés" },
  { key: "in_progress", label: "En cours" },
  { key: "done", label: "Terminés" },
];

function sortQueue(items: Chantier[]): Chantier[] {
  return [...items].sort((a, b) => {
    const pa = a.priority ?? Number.POSITIVE_INFINITY;
    const pb = b.priority ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.signedAt - b.signedAt;
  });
}

export default function ChantiersListPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChantierStatus | "all">(
    "all"
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/chantiers")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setChantiers(data.chantiers as Chantier[]);
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
    let out = chantiers;
    if (statusFilter !== "all") {
      out = out.filter((c) => c.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((c) => {
        const blob = [
          c.clientName,
          c.clientPhone,
          c.clientEmail,
          c.addressLine1,
          c.addressLine2,
          c.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    // Order: scheduled uses queue order, others use signedAt desc (most recent first)
    if (statusFilter === "scheduled" || statusFilter === "all") {
      const scheduled = sortQueue(out.filter((c) => c.status === "scheduled"));
      const others = out
        .filter((c) => c.status !== "scheduled")
        .sort((a, b) => b.signedAt - a.signedAt);
      return [...scheduled, ...others];
    }
    return out.sort((a, b) => b.signedAt - a.signedAt);
  }, [chantiers, statusFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Suivi de chantiers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            File ordonnée par date de signature. Override avec un n° de priorité
            sur la fiche.
          </p>
        </div>
        <Link
          href="/chantiers/new"
          className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light shadow-sm"
        >
          + Nouveau chantier
        </Link>
      </div>

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

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (client, adresse, notes, téléphone)..."
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
      />

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
            ? "Aucun chantier encore. Crée le premier."
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
