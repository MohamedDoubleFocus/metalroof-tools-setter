"use client";

import { useState, useCallback } from "react";
import AddressAutocomplete, {
  type AddressValue,
} from "./AddressAutocomplete";
import StatusPills from "./StatusPills";
import type { LeadStatus, Lead } from "@/types/prospection";

interface Props {
  knockerId: string;
  onSubmitted: (lead: Lead) => void;
}

/**
 * Single-screen lead capture form, optimized for porte-à-porte:
 *   1. Detect / type address (top)
 *   2. Pick status (big colored pills)
 *   3. Conditional fields (meeting date, follow-up date) based on status
 *   4. Optional notes + photo
 *   5. Submit
 */
export default function LeadForm({ knockerId, onSubmitted }: Props) {
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const needsMeeting = status === "meeting";
  const needsFollowUp = status === "repasser" || status === "suivi";

  const reset = useCallback(() => {
    setAddress(null);
    setClientName("");
    setClientPhone("");
    setStatus(null);
    setMeetingDate("");
    setMeetingTime("");
    setFollowUpDate("");
    setFollowUpTime("");
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
  }, []);

  // Auto-format phone as user types: (514) 867-0787
  const formatPhone = useCallback((raw: string): string => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }, []);

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Le fichier doit être une image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Photo trop grosse (max 10 Mo).");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    },
    []
  );

  const canSubmit =
    address !== null &&
    status !== null &&
    (!needsMeeting || (meetingDate && meetingTime)) &&
    (!needsFollowUp || (followUpDate && followUpTime)) &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!address || !status || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload photo if present
      let photoUrl: string | undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const uRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uRes.ok) {
          const d = await uRes.json().catch(() => ({}));
          throw new Error(d.error || "Erreur upload photo");
        }
        const uData = await uRes.json();
        photoUrl = uData.imageUrl;
      }

      // 2. Build timestamps from local date+time
      const meetingAt =
        needsMeeting && meetingDate && meetingTime
          ? new Date(`${meetingDate}T${meetingTime}:00`).getTime()
          : undefined;
      const followUpAt =
        needsFollowUp && followUpDate && followUpTime
          ? new Date(`${followUpDate}T${followUpTime}:00`).getTime()
          : undefined;

      // 3. Post the lead
      const res = await fetch("/api/prospection/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knockerId,
          clientName: clientName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          address: address.address,
          streetName: address.streetName,
          houseNumber: address.houseNumber,
          lat: address.lat,
          lng: address.lng,
          status,
          meetingAt,
          followUpAt,
          notes: notes.trim() || undefined,
          photoUrl,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erreur création lead");
      }

      const data = await res.json();
      onSubmitted(data.lead as Lead);
      reset();
      // Show transient confirmation toast — knocker stays on form to add next lead
      setToast("✓ Lead enregistré avec succès");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }, [
    address,
    clientName,
    clientPhone,
    status,
    needsMeeting,
    needsFollowUp,
    meetingDate,
    meetingTime,
    followUpDate,
    followUpTime,
    notes,
    photoFile,
    knockerId,
    submitting,
    onSubmitted,
    reset,
  ]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Quick link to the shared Drive folder (visuals, scripts, references) */}
      <a
        href="https://drive.google.com/drive/u/2/folders/1YBSj-im64VvWlgLB_1_DAv7cVSi_yJY-"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-colors w-fit"
        title="Ouvrir le dossier Google Drive partagé"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 87.3 78"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
            fill="#0066da"
          />
          <path
            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
            fill="#00ac47"
          />
          <path
            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
            fill="#ea4335"
          />
          <path
            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
            fill="#00832d"
          />
          <path
            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            fill="#2684fc"
          />
          <path
            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            fill="#ffba00"
          />
        </svg>
        Documents partagés
      </a>

      {/* 1. ADRESSE */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          1. Adresse
        </h3>
        <AddressAutocomplete value={address} onChange={setAddress} />
      </section>

      {/* 2. INFOS CLIENT */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          2. Client
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nom complet du client"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
          <input
            type="tel"
            inputMode="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(formatPhone(e.target.value))}
            placeholder="(514) 867-0787"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
      </section>

      {/* 3. STATUT */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          3. Statut
        </h3>
        <StatusPills value={status} onChange={setStatus} />
      </section>

      {/* 3. Conditionnel — RDV */}
      {needsMeeting && (
        <section className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <h3 className="text-sm font-bold text-emerald-900 mb-3">
            🤝 Détails du meeting
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="px-3 py-3 border-2 border-emerald-300 rounded-xl bg-white focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="px-3 py-3 border-2 border-emerald-300 rounded-xl bg-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </section>
      )}

      {/* 4. Conditionnel — REPASSER / SUIVI */}
      {needsFollowUp && (
        <section className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="text-sm font-bold text-amber-900 mb-3">
            {status === "repasser" ? "🔁 Quand repasser" : "📌 Quand faire le suivi"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="px-3 py-3 border-2 border-amber-300 rounded-xl bg-white focus:border-amber-500 focus:outline-none"
            />
            <input
              type="time"
              value={followUpTime}
              onChange={(e) => setFollowUpTime(e.target.value)}
              className="px-3 py-3 border-2 border-amber-300 rounded-xl bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>
        </section>
      )}

      {/* 5. NOTES */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Notes (optionnel)
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Toiture maganée, propriétaire intéressé, etc."
          rows={3}
          maxLength={500}
          className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none resize-y"
        />
      </section>

      {/* 6. PHOTO */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Photo de la toiture (optionnel)
        </h3>
        {photoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Toiture"
              className="w-full h-48 object-cover rounded-xl border border-gray-200"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white rounded-lg text-xs font-semibold"
            >
              Retirer
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-3xl">📷</span>
            <span className="text-sm font-semibold text-gray-700">
              Prendre une photo
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        )}
      </section>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
      >
        {submitting ? "Enregistrement..." : "Enregistrer le lead"}
      </button>

      {/* TOAST de confirmation — fixed au bas, ne navigue pas */}
      {toast && (
        <div
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 px-6 py-3 bg-emerald-600 text-white rounded-full shadow-lg font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
