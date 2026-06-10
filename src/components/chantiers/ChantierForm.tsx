"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, COLOR_KEYS } from "@/lib/colors";
import {
  CHANTIER_TEAMS,
  type ChantierStyle,
  type ChantierTeam,
  type ChantierUrgency,
} from "@/types/chantiers";
import { useTeamChiefNames } from "@/lib/teams/use-teams";

interface FormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  addressLine1: string;
  addressLine2: string;
  submissionUrl: string;
  roofrUrl: string;
  style: "" | ChantierStyle;
  colorKey: string;
  urgency: ChantierUrgency;
  team: "" | ChantierTeam;
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
  submissionUrl: "",
  roofrUrl: "",
  style: "",
  colorKey: "",
  urgency: "non_urgent",
  team: "",
  signedAt: new Date().toISOString().slice(0, 10),
  scheduledDate: "",
  totalAmount: "",
  notes: "",
};

export default function ChantierForm() {
  const router = useRouter();
  const chiefNames = useTeamChiefNames();
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
          submissionUrl: form.submissionUrl || undefined,
          roofrUrl: form.roofrUrl || undefined,
          style: form.style || undefined,
          colorKey: form.colorKey || undefined,
          urgency: form.urgency,
          team: form.team || undefined,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Lien vers la soumission (optionnel)
          </label>
          <input
            type="url"
            value={form.submissionUrl}
            onChange={(e) => update("submissionUrl", e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Lien Roofr (optionnel)
          </label>
          <input
            type="url"
            value={form.roofrUrl}
            onChange={(e) => update("roofrUrl", e.target.value)}
            placeholder="https://app.roofr.com/..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Style (optionnel)
          </label>
          <select
            value={form.style}
            onChange={(e) =>
              update("style", e.target.value as FormState["style"])
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none bg-white"
          >
            <option value="">Non choisi</option>
            <option value="shingle_tile">Style européen</option>
            <option value="standing_seam">Joint debout</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Couleur (optionnel)
          </label>
          <select
            value={form.colorKey}
            onChange={(e) => update("colorKey", e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none bg-white"
          >
            <option value="">Non choisie</option>
            {COLOR_KEYS.map((key) => (
              <option key={key} value={key}>
                {COLORS[key].frenchName} ({COLORS[key].ral})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Urgence
        </label>
        <div className="flex items-center gap-2">
          {(["urgent", "non_urgent"] as ChantierUrgency[]).map((u) => {
            const active = form.urgency === u;
            return (
              <button
                key={u}
                type="button"
                onClick={() => update("urgency", u)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                  active
                    ? u === "urgent"
                      ? "bg-red-500 text-white"
                      : "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {u === "urgent" ? "🔥 Urgent" : "Non urgent"}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Équipe attribuée (optionnel)
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => update("team", "")}
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${
              !form.team
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Aucune
          </button>
          {CHANTIER_TEAMS.map((t) => {
            const active = form.team === t;
            const display = chiefNames[t] || t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => update("team", t)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 ${
                  active
                    ? "border-accent bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
                }`}
              >
                {display}
              </button>
            );
          })}
        </div>
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
