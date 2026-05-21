"use client";

import { useEffect, useMemo, useState } from "react";
import LeadCard from "./LeadCard";
import StatusPills from "./StatusPills";
import { leadStatusCount } from "@/lib/prospection/utils";
import { KNOCKERS, type Knocker } from "@/lib/prospection/knockers";
import type { Lead, LeadStatus } from "@/types/prospection";

interface Props {
  knocker: Knocker;
  onPickLead?: (lead: Lead) => void;
  /** Bump this number to refresh after a new lead is created elsewhere */
  refreshSignal?: number;
}

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LeadsList({
  knocker,
  onPickLead,
  refreshSignal = 0,
}: Props) {
  const [date, setDate] = useState(todayDateKey());
  const [dateMode, setDateMode] = useState<"date" | "all">("date");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | null>(null);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (dateMode === "all") {
      params.set("range", "all");
    } else {
      params.set("date", date);
    }
    if (scope === "mine") params.set("knockerId", knocker.id);

    fetch(`/api/prospection/leads?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || `Erreur ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLeads(data.leads as Lead[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, dateMode, scope, knocker.id, refreshSignal]);

  const filtered = useMemo(() => {
    let out = leads;
    if (statusFilter) out = out.filter((l) => l.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((l) => {
        const blob = [
          l.address,
          l.clientName,
          l.clientPhone,
          l.notes,
          l.knockerName,
          l.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return out;
  }, [leads, statusFilter, search]);

  const counts = useMemo(() => leadStatusCount(leads), [leads]);
  const total = leads.length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setDateMode("date")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              dateMode === "date"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Par date
          </button>
          <button
            onClick={() => setDateMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              dateMode === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Tous les leads
          </button>
        </div>
        {dateMode === "date" && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        )}
      </div>

      {/* Scope (mine/all knockers) */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setScope("mine")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            scope === "mine"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Les miens
        </button>
        <button
          onClick={() => setScope("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            scope === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Toute l&apos;équipe
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (adresse, nom, téléphone, notes)..."
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
      />

      {/* Stats */}
      {total > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">
            {total} lead{total > 1 ? "s" : ""}{" "}
            {scope === "mine" ? `de ${knocker.name}` : "de l'équipe"}{" "}
            {dateMode === "all" ? "(toutes dates)" : "ce jour"}
          </p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {(["absent", "meeting", "repasser", "suivi", "refus"] as LeadStatus[]).map(
              (s) => {
                const isActive = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(isActive ? null : s)}
                    className={`px-1 py-1.5 rounded-lg text-xs transition-colors ${
                      isActive ? "bg-gray-100 ring-2 ring-gray-300" : ""
                    }`}
                  >
                    <p className="font-bold text-base">{counts[s]}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{s}</p>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Filter active hint */}
      {statusFilter && (
        <button
          onClick={() => setStatusFilter(null)}
          className="text-xs text-gray-500 underline"
        >
          Effacer le filtre
        </button>
      )}

      {/* Knocker scope quick chips — visible only when "Toute l'equipe" */}
      {scope === "all" && total > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {KNOCKERS.map((k) => {
            const count = leads.filter((l) => l.knockerId === k.id).length;
            if (count === 0) return null;
            return (
              <span
                key={k.id}
                className="px-2 py-1 bg-gray-100 rounded-full text-gray-700 font-semibold"
              >
                {k.name}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* List */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {total === 0
            ? dateMode === "all"
              ? "Aucun lead encore. Va sur l'onglet Ajouter pour commencer."
              : "Aucun lead pour cette date."
            : "Aucun lead ne correspond au filtre."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onPickLead} />
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export so the page can pass StatusPills if needed
export { StatusPills };
