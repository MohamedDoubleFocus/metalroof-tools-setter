"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, {
  type AddressValue,
} from "@/components/prospection/AddressAutocomplete";

/**
 * Minimal report-order form. Only two pieces of data:
 *   - address (required, geocoded via Places autocomplete)
 *   - notes  (optional, free-text instructions for the freelancer)
 *
 * Anything else (client name, phone, photos) would only add friction for the
 * closer and is intentionally NOT part of this flow.
 */
export default function CreateReportForm() {
  const router = useRouter();

  const [address, setAddress] = useState<AddressValue | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = address !== null && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!address || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Prefer the full Google-formatted address (with city/province/postal
      // code) so the freelancer gets enough context to produce the report.
      const fullAddress = address.formattedAddress || address.address;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullAddress,
          lat: address.lat,
          lng: address.lng,
          notes: notes.trim() || undefined,
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
  }, [address, notes, submitting, router]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Adresse de la propriété
        </h3>
        <AddressAutocomplete value={address} onChange={setAddress} />
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Notes pour le freelancer{" "}
          <span className="text-xs font-normal text-gray-400 normal-case">
            (optionnel)
          </span>
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
