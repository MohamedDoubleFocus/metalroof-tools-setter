"use client";

import { useEffect, useState } from "react";

interface Props {
  sectorId: string;
  initialNotes?: string;
  /** Returns true on success so the parent knows to leave edit mode. */
  onSave: (sectorId: string, notes: string) => Promise<boolean>;
}

/**
 * Inline editor for a sector's free-form notes.
 *
 * Two states:
 *   - Display: shows the existing notes (or a placeholder hint) with an Edit button
 *   - Edit:    textarea + Save / Cancel
 */
export default function SectorNotesPanel({
  sectorId,
  initialNotes,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  // Re-sync when the active sector changes (drawer reopens for a different one)
  useEffect(() => {
    setDraft(initialNotes ?? "");
    setEditing(false);
  }, [sectorId, initialNotes]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(sectorId, draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
          Notes du secteur
        </h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          maxLength={1000}
          autoFocus
          placeholder="Ex: quartier aisé, beaucoup de duplex, repasser le samedi matin…"
          className="w-full px-3 py-2.5 border-2 border-amber-300 rounded-lg bg-white text-sm focus:border-amber-500 focus:outline-none resize-y"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDraft(initialNotes ?? "");
              setEditing(false);
            }}
            disabled={saving}
            className="flex-1 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-semibold hover:bg-amber-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          📝 Notes du secteur
        </h3>
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          {initialNotes?.trim() ? "Modifier" : "+ Ajouter"}
        </button>
      </div>
      {initialNotes?.trim() ? (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {initialNotes}
        </p>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Aucune note pour ce secteur.
        </p>
      )}
    </div>
  );
}
