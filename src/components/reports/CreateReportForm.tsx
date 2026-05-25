"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, {
  type AddressValue,
} from "@/components/prospection/AddressAutocomplete";

interface UploadedPhoto {
  url: string;
  name: string;
  preview: string;
}

export default function CreateReportForm() {
  const router = useRouter();

  const [address, setAddress] = useState<AddressValue | null>(null);
  const [closerLabel, setCloserLabel] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = useCallback((raw: string): string => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }, []);

  const handleAddPhoto = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Le fichier doit être une image.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError("Photo trop grosse (max 15 Mo).");
        return;
      }
      setUploadingPhoto(true);
      setError(null);
      try {
        const preview = URL.createObjectURL(file);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("index", String(photos.length));
        const res = await fetch("/api/reports/upload-photo", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Erreur upload");
        }
        const data = await res.json();
        setPhotos((p) => [
          ...p,
          { url: data.url, name: file.name, preview },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [photos.length]
  );

  const handleRemovePhoto = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index));
  };

  const canSubmit =
    address !== null && closerLabel.trim().length > 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!address || !closerLabel.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closerLabel: closerLabel.trim(),
          clientPhone: clientPhone.trim() || undefined,
          address: address.address,
          lat: address.lat,
          lng: address.lng,
          notes: notes.trim() || undefined,
          referencePhotos: photos.map((p) => p.url),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erreur création commande");
      }
      const data = await res.json();
      router.push(`/reports/${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSubmitting(false);
    }
  }, [address, closerLabel, clientPhone, notes, photos, submitting, router]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          1. Adresse de la propriété
        </h3>
        <AddressAutocomplete value={address} onChange={setAddress} />
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          2. Identification interne
        </h3>
        <input
          type="text"
          value={closerLabel}
          onChange={(e) => setCloserLabel(e.target.value)}
          placeholder="Nom du client (interne, pour le retrouver)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
        />
        <input
          type="tel"
          inputMode="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(formatPhone(e.target.value))}
          placeholder="(514) 867-0787 — optionnel"
          className="mt-3 w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-2">
          Ces infos restent privées. Le freelancer ne voit JAMAIS ni le nom ni
          le téléphone du client.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          3. Instructions pour le freelancer (optionnel)
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Détails particuliers, focus sur certains éléments du toit, etc."
          className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none resize-y"
        />
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          4. Photos de référence (optionnel)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Photo de la maison, vue Street View, drone, etc. Sera partagé avec le
          freelancer.
        </p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((p, i) => (
              <div
                key={p.url}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.preview}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
          {uploadingPhoto ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Upload en cours...</span>
            </>
          ) : (
            <>
              <span className="text-base">📷</span>
              <span className="text-sm font-semibold text-gray-700">
                Ajouter une photo
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingPhoto}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAddPhoto(file);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
      >
        {submitting ? "Envoi..." : "Envoyer la commande au freelancer"}
      </button>
    </div>
  );
}
