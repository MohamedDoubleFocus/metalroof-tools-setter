"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  addressLine1: string;
  addressLine2: string;
  signedAt: string; // YYYY-MM-DD
  scheduledDate: string; // YYYY-MM-DD
  totalAmount: string;
  notes: string;
}

const EMPTY: FormState = {
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  addressLine1: "",
  addressLine2: "",
  signedAt: new Date().toISOString().slice(0, 10),
  scheduledDate: "",
  totalAmount: "",
  notes: "",
};

export default function ChantierForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof FormState, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/chantiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          clientEmail: form.clientEmail,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          signedAt: form.signedAt
            ? Date.parse(`${form.signedAt}T12:00:00`)
            : undefined,
          scheduledDate: form.scheduledDate || undefined,
          totalAmount: form.totalAmount
            ? Number(form.totalAmount)
            : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      router.push(`/chantiers/${data.chantier.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Nom du client
        </label>
        <input
          type="text"
          value={form.clientName}
          onChange={(e) => update("clientName", e.target.value)}
          placeholder="Mme Edith Villalon"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Téléphone
          </label>
          <input
            type="tel"
            value={form.clientPhone}
            onChange={(e) => update("clientPhone", e.target.value)}
            placeholder="(514) 867-0787"
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Email (optionnel)
          </label>
          <input
            type="email"
            value={form.clientEmail}
            onChange={(e) => update("clientEmail", e.target.value)}
            placeholder="client@exemple.com"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Adresse (rue + numéro)
        </label>
        <input
          type="text"
          value={form.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          placeholder="760 Pl. des Pointeliers"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Ville, province, code postal (optionnel)
        </label>
        <input
          type="text"
          value={form.addressLine2}
          onChange={(e) => update("addressLine2", e.target.value)}
          placeholder="Montréal, QC H1B 5W5"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Date de signature
          </label>
          <input
            type="date"
            value={form.signedAt}
            onChange={(e) => update("signedAt", e.target.value)}
            required
            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Date d&apos;install (opt.)
          </label>
          <input
            type="date"
            value={form.scheduledDate}
            onChange={(e) => update("scheduledDate", e.target.value)}
            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Total CAD (opt.)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.totalAmount}
            onChange={(e) => update("totalAmount", e.target.value)}
            placeholder="15000"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Notes (optionnel)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none resize-y"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {submitting ? "Création..." : "Créer le chantier"}
      </button>
    </form>
  );
}
