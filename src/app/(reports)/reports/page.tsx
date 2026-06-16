"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReportOrderCard from "@/components/reports/ReportOrderCard";
import type { ReportOrder, ReportStatus } from "@/types/reports";

const STATUS_FILTERS: Array<{ key: ReportStatus | "all"; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "in_progress", label: "En cours" },
  { key: "ready", label: "Prêts" },
  { key: "delivered", label: "Livrés" },
  { key: "unavailable", label: "Indisponibles" },
];

export default function ReportsListPage() {
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders as ReportOrder[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let out = orders;
    if (statusFilter !== "all") {
      out = out.filter((o) => o.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((o) => {
        const blob = [
          o.closerLabel,
          o.address,
          o.clientPhone,
          o.notes,
          o.createdByLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return out;
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const out: Record<ReportStatus | "all", number> = {
      all: orders.length,
      pending: 0,
      in_progress: 0,
      ready: 0,
      delivered: 0,
      unavailable: 0,
    };
    for (const o of orders) out[o.status]++;
    return out;
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commandes de rapports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Toutes les commandes de rapports PDF passées à l&apos;équipe.
          </p>
        </div>
        <Link
          href="/reports/new"
          className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light shadow-sm"
        >
          + Nouvelle commande
        </Link>
      </div>

      {/* Filters */}
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

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (client, adresse, notes)..."
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
          {orders.length === 0
            ? "Aucune commande encore. Click + Nouvelle commande pour commencer."
            : "Aucune commande ne correspond aux filtres."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <ReportOrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
