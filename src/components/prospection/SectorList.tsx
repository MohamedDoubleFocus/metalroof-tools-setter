"use client";

import { useCallback, useEffect, useState } from "react";
import SectorDrawer from "./SectorDrawer";
import ProspectionMap from "./ProspectionMap";
import type { Sector, Street, LatLng } from "@/types/prospection";
import type { Knocker } from "@/lib/prospection/knockers";

interface Props {
  knocker: Knocker;
}

/**
 * 3-state UI:
 *   1. List of existing sectors (with active sector preview)
 *   2. Detail view of a sector (streets to do / done, map)
 *   3. Drawer mode (creating a new sector)
 */
export default function SectorList({ knocker }: Props) {
  const [view, setView] = useState<"list" | "detail" | "draw">("list");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStreets, setActiveStreets] = useState<Street[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prospection/sectors");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSectors(data.sectors as Sector[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSectors();
  }, [loadSectors]);

  const openSector = useCallback(async (id: string) => {
    setActiveId(id);
    setView("detail");
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/prospection/sectors/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveStreets(data.streets as Street[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (data: { name: string; polygon: LatLng[] }) => {
      const res = await fetch("/api/prospection/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, knockerId: knocker.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erreur création secteur");
      }
      const result = await res.json();
      await loadSectors();
      setView("list");
      // Open the newly created sector
      if (result.sector?.id) {
        openSector(result.sector.id);
      }
    },
    [knocker.id, loadSectors, openSector]
  );

  const toggleStreetDone = useCallback(
    async (street: Street) => {
      const newDone = !street.doneAt;
      // Optimistic update
      setActiveStreets((current) =>
        current.map((s) =>
          s.id === street.id
            ? {
                ...s,
                doneAt: newDone ? Date.now() : undefined,
                doneBy: newDone ? knocker.id : undefined,
                doneByName: newDone ? knocker.name : undefined,
              }
            : s
        )
      );
      try {
        await fetch(
          `/api/prospection/sectors/${street.sectorId}/streets/${encodeURIComponent(street.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ knockerId: knocker.id, done: newDone }),
          }
        );
      } catch {
        // Revert on failure
        if (activeId) openSector(activeId);
      }
    },
    [knocker.id, knocker.name, activeId, openSector]
  );

  // ─── DRAW VIEW ────────────────────────────────────────
  if (view === "draw") {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setView("list")}
          className="text-sm text-gray-500 mb-3 flex items-center gap-1"
        >
          ← Retour
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Nouveau secteur</h2>
        <SectorDrawer onSave={handleCreate} onCancel={() => setView("list")} />
      </div>
    );
  }

  // ─── DETAIL VIEW ──────────────────────────────────────
  if (view === "detail" && activeId) {
    const sector = sectors.find((s) => s.id === activeId);
    const done = activeStreets.filter((s) => s.doneAt).length;
    const total = activeStreets.length;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => setView("list")}
          className="text-sm text-gray-500 flex items-center gap-1"
        >
          ← Retour aux secteurs
        </button>

        {sector && (
          <div>
            <h2 className="text-xl font-bold text-gray-900">{sector.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {done}/{total} rues faites • Créé par {sector.createdByName}
            </p>
          </div>
        )}

        {detailLoading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          <>
            <ProspectionMap
              leads={[]}
              sector={sector}
              streets={activeStreets}
              onStreetClick={toggleStreetDone}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
              {activeStreets.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  Aucune rue trouvée dans ce secteur.
                </div>
              ) : (
                activeStreets.map((street) => {
                  const isDone = !!street.doneAt;
                  return (
                    <button
                      key={street.id}
                      onClick={() => toggleStreetDone(street)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div
                        className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {isDone && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold ${
                            isDone ? "text-gray-400 line-through" : "text-gray-900"
                          }`}
                        >
                          {street.name}
                        </p>
                        {isDone && street.doneByName && (
                          <p className="text-xs text-gray-500">
                            Par {street.doneByName}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Secteurs</h2>
        <button
          onClick={() => setView("draw")}
          className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light"
        >
          + Nouveau
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : sectors.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Aucun secteur. Crée-en un pour suivre les rues faites par ton équipe.
        </div>
      ) : (
        <div className="space-y-2">
          {sectors.map((s) => (
            <button
              key={s.id}
              onClick={() => openSector(s.id)}
              className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 active:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.streetIds.length} rues • Par {s.createdByName}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
