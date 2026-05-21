"use client";

import { useEffect, useState } from "react";
import StatusPills, { getStatusDef } from "./StatusPills";
import type { Lead, LeadStatus } from "@/types/prospection";

interface Props {
  lead: Lead;
  /**
   * Called when the lead is updated (passes the new Lead) or deleted (null).
   * The parent should refresh its data and close the drawer.
   */
  onChanged: (updated: Lead | null) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet modal that lets a knocker edit OR delete an existing lead.
 *
 * Showcases:
 *   - inline status change with the same pills used in the create form
 *   - editable client name / phone / notes
 *   - editable meeting / follow-up date (depending on status)
 *   - hard-delete with confirm
 */
export default function LeadDetailDrawer({ lead, onChanged, onClose }: Props) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [clientName, setClientName] = useState(lead.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(lead.clientPhone ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate date inputs from existing timestamps
  useEffect(() => {
    if (lead.meetingAt) {
      const d = new Date(lead.meetingAt);
      setMeetingDate(d.toISOString().slice(0, 10));
      setMeetingTime(d.toTimeString().slice(0, 5));
    }
    if (lead.followUpAt) {
      const d = new Date(lead.followUpAt);
      setFollowUpDate(d.toISOString().slice(0, 10));
      setFollowUpTime(d.toTimeString().slice(0, 5));
    }
  }, [lead]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const needsMeeting = status === "meeting";
  const needsFollowUp = status === "repasser" || status === "suivi";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const meetingAt =
        needsMeeting && meetingDate && meetingTime
          ? new Date(`${meetingDate}T${meetingTime}:00`).getTime()
          : needsMeeting
            ? undefined
            : null; // null = clear server-side
      const followUpAt =
        needsFollowUp && followUpDate && followUpTime
          ? new Date(`${followUpDate}T${followUpTime}:00`).getTime()
          : needsFollowUp
            ? undefined
            : null;

      const body = {
        status,
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        meetingAt,
        followUpAt,
      };

      const res = await fetch(`/api/prospection/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      onChanged(data.lead as Lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Supprimer définitivement ce lead ?\n\n${lead.address}\n\nCette action est irréversible.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/prospection/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Erreur ${res.status}`);
      }
      onChanged(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
    }
  };

  const def = getStatusDef(lead.status);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{def.emoji}</span>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{lead.address}</p>
              <p className="text-xs text-gray-500">
                Par {lead.knockerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            aria-label="Fermer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Statut
            </h3>
            <StatusPills value={status} onChange={setStatus} size="md" />
          </section>

          {/* Meeting */}
          {needsMeeting && (
            <section className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h3 className="text-xs font-bold text-emerald-900 mb-2">
                🤝 Date du meeting
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="px-3 py-2 border-2 border-emerald-300 rounded-lg bg-white text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="px-3 py-2 border-2 border-emerald-300 rounded-lg bg-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </section>
          )}

          {/* Follow-up */}
          {needsFollowUp && (
            <section className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <h3 className="text-xs font-bold text-amber-900 mb-2">
                {status === "repasser"
                  ? "🔁 Quand repasser"
                  : "📌 Quand faire le suivi"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="px-3 py-2 border-2 border-amber-300 rounded-lg bg-white text-sm focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="px-3 py-2 border-2 border-amber-300 rounded-lg bg-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </section>
          )}

          {/* Client info */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Client
            </h3>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom complet"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(514) 867-0787"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none resize-y"
            />
          </section>

          {/* Photo preview */}
          {lead.photoUrl && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Photo
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lead.photoUrl}
                alt="Toiture"
                className="w-full max-h-64 object-cover rounded-xl border border-gray-200"
              />
            </section>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="px-4 py-3 bg-white border-2 border-rose-300 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              {deleting ? "..." : "🗑 Supprimer"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
