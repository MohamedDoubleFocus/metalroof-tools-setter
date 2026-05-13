"use client";

import { useState } from "react";

interface FormState {
  email: string;
  buyerName: string;
  addressLine1: string;
  addressLine2: string;
  installationDate: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  buyerName: "",
  addressLine1: "",
  addressLine2: "",
  installationDate: "",
};

export default function WarrantyForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const update = (k: keyof FormState, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Light client-side validation — server revalidates anyway
    if (!form.email.trim()) return setError("Courriel requis.");
    if (!form.buyerName.trim()) return setError("Nom complet requis.");
    if (!form.addressLine1.trim()) return setError("Adresse requise.");
    if (!form.addressLine2.trim())
      return setError("Ville, province et code postal requis.");
    if (!form.installationDate)
      return setError("Date d'installation requise.");

    setLoading(true);
    try {
      const res = await fetch("/api/sav/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
      setSuccess(
        `Certificat envoyé à ${form.email}. Le client devrait le recevoir dans quelques minutes.`
      );
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Courriel du client
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="client@example.com"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <p className="text-xs text-gray-400 mt-1">
          Le certificat sera envoyé en pièce jointe à cette adresse.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom complet (avec civilité)
        </label>
        <input
          type="text"
          value={form.buyerName}
          onChange={(e) => update("buyerName", e.target.value)}
          placeholder="Mme Edith Villalon"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse (rue, numéro civique)
          </label>
          <input
            type="text"
            value={form.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            placeholder="760 Pl. des Pointeliers"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville, province et code postal
          </label>
          <input
            type="text"
            value={form.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            placeholder="Montréal, QC H1B 5W5"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date d&apos;installation
        </label>
        <input
          type="date"
          value={form.installationDate}
          onChange={(e) => update("installationDate", e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Envoi en cours…" : "Envoyer le certificat"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Le PDF est généré à partir du modèle officiel et envoyé directement au
        client par courriel.
      </p>
    </form>
  );
}
