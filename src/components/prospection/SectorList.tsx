"use client";

import { useCallback, useEffect, useState } from "react";
import SectorDrawer from "./SectorDrawer";
import ProspectionMap from "./ProspectionMap";
import AssignmentPanel from "./AssignmentPanel";
import SectorNotesPanel from "./SectorNotesPanel";
import { todayDateKey } from "@/lib/prospection/utils";
import type {
  Sector,
  Street,
  LatLng,
  SectorAssignment,
} from "@/types/prospection";
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
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStreets, setActiveStreets] = useState<Street[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayAssignments, setTodayAssignments] = useState<SectorAssignment[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Load today's assignments for the summary at the top of the list view
  useEffect(() => {
    fetch(`/api/prospection/assignments?date=${todayDateKey()}`)
      .then((r) => r.json())
      .then((d) => setTodayAssignments(d.assignments || []))
      .catch(() => {});
  }, []);

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

  const handleDelete = useCallback(
    async (sectorId: string, sectorName: string) => {
      if (
        !confirm(
          `Supprimer le secteur "${sectorName}" ?\n\nToutes les rues et leur progression seront perdues. Cette action est irréversible.`
        )
      ) {
        return;
      }
      setDeletingId(sectorId);
      try {
        const res = await fetch(`/api/prospection/sectors/${sectorId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Erreur ${res.status}`);
        }
        setSectors((current) => current.filter((s) => s.id !== sectorId));
      } catch (err) {
        alert(
          `Suppression impossible : ${err instanceof Error ? err.message : "Erreur"}`
        );
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const handleCreate = useCallback(
    async (data: { name: string; polygon: LatLng[]; notes?: string }) => {
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
      // Surface Overpass warnings to the user (e.g. polygon too small, no streets found)
      if (result.warning) {
        alert(`⚠️ ${result.warning}`);
      }
      await loadSectors();
      setView("list");
      // Open the newly created sector
      if (result.sector?.id) {
        openSector(result.sector.id);
      }
    },
    [knocker.id, loadSectors, openSector]
  );

  /** Save edited notes on an existing sector. */
  const saveSectorNotes = useCallback(
    async (sectorId: string, notes: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/prospection/sectors/${sectorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        const d = await res.json();
        // Patch the cached sector list with the new notes
        setSectors((current) =>
          current.map((s) =>
            s.id === sectorId
              ? { ...s, notes: d.sector?.notes, updatedAt: d.sector?.updatedAt }
              : s
          )
        );
        return true;
      } catch (err) {
        alert(
          `Mise à jour impossible : ${err instanceof Error ? err.message : "Erreur"}`
        );
        return false;
      }
    },
    []
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

        {sector && (
          <SectorNotesPanel
            sectorId={sector.id}
            initialNotes={sector.notes}
            onSave={saveSectorNotes}
          />
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

            {sector && (
              <AssignmentPanel
                sectorId={sector.id}
                sectorName={sector.name}
                currentKnocker={knocker}
              />
            )}

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

      {/* Today's assignments — quick summary */}
      {todayAssignments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
            Aujourd&apos;hui
          </p>
          <ul className="space-y-1">
            {todayAssignments.map((a) => (
              <li key={a.id} className="text-sm text-blue-950">
                <span className="font-bold">{a.knockerName}</span>{" "}
                <span className="text-blue-700">→</span>{" "}
                <button
                  onClick={() => openSector(a.sectorId)}
                  className="font-semibold underline"
                >
                  {a.sectorName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      {sectors.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un secteur..."
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
        />
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : sectors.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Aucun secteur. Crée-en un pour suivre les rues faites par ton équipe.
        </div>
      ) : (
        (() => {
          const q = search.trim().toLowerCase();
          const visible = q
            ? sectors.filter((s) => {
                const blob = `${s.name} ${s.createdByName}`.toLowerCase();
                return blob.includes(q);
              })
            : sectors;
          if (visible.length === 0) {
            return (
              <div className="text-center py-10 text-gray-400 text-sm">
                Aucun secteur ne correspond à ta recherche.
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {visible.map((s) => {
                const isDeleting = deletingId === s.id;
                return (
                  <div
                    key={s.id}
                    className="flex items-stretch bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300"
                  >
                    <button
                      onClick={() => openSector(s.id)}
                      className="flex-1 text-left p-4 active:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-gray-900">{s.name}</p>
                            {s.notes?.trim() && (
                              <span
                                title="Ce secteur a des notes"
                                className="text-xs"
                              >
                                📝
                              </span>
                            )}
                          </div>
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
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={isDeleting}
                      title="Supprimer ce secteur"
                      className="px-4 border-l border-gray-100 text-rose-600 hover:bg-rose-50 active:bg-rose-100 disabled:opacity-50"
                    >
                      {isDeleting ? "..." : "🗑"}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
}
