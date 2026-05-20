"use client";

import { useCallback, useEffect, useState } from "react";
import { KNOCKERS, type Knocker } from "@/lib/prospection/knockers";
import { todayDateKey } from "@/lib/prospection/utils";
import type { SectorAssignment } from "@/types/prospection";

interface Props {
  sectorId: string;
  sectorName: string;
  currentKnocker: Knocker;
}

/**
 * Lets the current knocker attribute the sector to a knocker on a specific
 * day, and shows the history of attributions for that sector.
 */
export default function AssignmentPanel({
  sectorId,
  sectorName,
  currentKnocker,
}: Props) {
  const [history, setHistory] = useState<SectorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [pickedKnocker, setPickedKnocker] = useState<string>(currentKnocker.id);
  const [pickedDate, setPickedDate] = useState<string>(todayDateKey());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/prospection/assignments?sectorId=${sectorId}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(data.assignments as SectorAssignment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = useCallback(async () => {
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch("/api/prospection/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId,
          knockerId: pickedKnocker,
          date: pickedDate,
          createdBy: currentKnocker.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erreur attribution");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAssigning(false);
    }
  }, [sectorId, pickedKnocker, pickedDate, currentKnocker.id, load]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer cette attribution ?")) return;
      try {
        await fetch(`/api/prospection/assignments/${id}`, {
          method: "DELETE",
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    },
    [load]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
      <h3 className="font-bold text-gray-900">Attributions</h3>

      {/* Form: assign */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          Attribuer <span className="font-semibold">{sectorName}</span> à :
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={pickedKnocker}
            onChange={(e) => setPickedKnocker(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none"
          >
            {KNOCKERS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <button
          onClick={handleAssign}
          disabled={assigning}
          className="w-full py-2 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light disabled:bg-gray-300"
        >
          {assigning ? "Attribution..." : "Attribuer"}
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Historique
        </p>
        {loading ? (
          <p className="text-xs text-gray-400 py-2">Chargement...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">
            Aucune attribution. Attribue ce secteur à quelqu&apos;un ci-dessus.
          </p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs"
              >
                <div>
                  <span className="font-bold text-gray-900">{a.date}</span>
                  <span className="text-gray-500"> • </span>
                  <span className="font-semibold">{a.knockerName}</span>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-gray-400 hover:text-red-600 text-xs"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
