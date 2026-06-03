"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ChantierStatusBadge from "@/components/chantiers/ChantierStatusBadge";
import ChantierActions from "@/components/chantiers/ChantierActions";
import ChantierTimeline from "@/components/chantiers/ChantierTimeline";
import type { Chantier, ChantierStatus } from "@/types/chantiers";

const STATUSES: ChantierStatus[] = ["scheduled", "in_progress", "done"];

const STATUS_LABEL: Record<ChantierStatus, string> = {
  scheduled: "Planifié",
  in_progress: "En cours",
  done: "Terminé",
};

export default function ChantierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/chantiers/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setChantier(data.chantier);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patch = async (
    field: string,
    body: Record<string, unknown>
  ): Promise<void> => {
    setSavingField(field);
    try {
      const res = await fetch(`/api/chantiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      setChantier(data.chantier);
    } finally {
      setSavingField(null);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Supprimer définitivement ce chantier ? Cette action ne peut pas être annulée."
      )
    )
      return;
    const res = await fetch(`/api/chantiers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/chantiers");
    } else {
      alert("Suppression échouée");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">Chargement...</div>;
  }
  if (error || !chantier) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error || "Chantier introuvable"}
        </div>
        <Link
          href="/chantiers"
          className="block mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour à la liste
        </Link>
      </div>

      {/* ─── Header card ──────────────────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">
            {chantier.clientName}
          </h1>
          <ChantierStatusBadge status={chantier.status} />
        </div>
        <div className="text-sm text-gray-700">
          {chantier.addressLine1}
          {chantier.addressLine2 && (
            <>
              <br />
              {chantier.addressLine2}
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap pt-2 border-t border-gray-100">
          <a
            href={`tel:${chantier.clientPhone}`}
            className="hover:text-accent underline-offset-2 hover:underline"
          >
            📞 {chantier.clientPhone}
          </a>
          {chantier.clientEmail ? (
            <a
              href={`mailto:${chantier.clientEmail}`}
              className="hover:text-accent underline-offset-2 hover:underline"
            >
              ✉️ {chantier.clientEmail}
            </a>
          ) : (
            <span className="text-gray-400 italic">✉️ pas d&apos;email</span>
          )}
        </div>
      </div>

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Actions</h2>
        <ChantierActions chantier={chantier} onChange={setChantier} />
        {chantier.invoicePdfUrl && (
          <a
            href={chantier.invoicePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-sm text-accent hover:underline text-center"
          >
            📄 Re-télécharger la facture envoyée
          </a>
        )}
      </div>

      {/* ─── Editable workflow fields ────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Planification</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              Statut
            </div>
            <select
              value={chantier.status}
              onChange={(e) =>
                patch("status", { status: e.target.value as ChantierStatus })
              }
              disabled={savingField === "status"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              Date d&apos;installation
            </div>
            <input
              type="date"
              value={chantier.scheduledDate || ""}
              onChange={(e) =>
                patch("scheduledDate", {
                  scheduledDate: e.target.value || null,
                })
              }
              disabled={savingField === "scheduledDate"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              Priorité (override)
            </div>
            <input
              type="number"
              min="1"
              value={chantier.priority ?? ""}
              placeholder="ex: 1"
              onChange={(e) => {
                const v = e.target.value;
                patch("priority", {
                  priority: v === "" ? null : Number(v),
                });
              }}
              disabled={savingField === "priority"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">
            Montant total (CAD) — requis pour facture
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={chantier.totalAmount ?? ""}
            placeholder="ex: 15000"
            onChange={(e) => {
              const v = e.target.value;
              patch("totalAmount", {
                totalAmount: v === "" ? null : Number(v),
              });
            }}
            disabled={savingField === "totalAmount"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">Notes</div>
          <textarea
            value={chantier.notes ?? ""}
            rows={3}
            onBlur={(e) => patch("notes", { notes: e.target.value || null })}
            onChange={(e) =>
              setChantier({ ...chantier, notes: e.target.value })
            }
            disabled={savingField === "notes"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none resize-y"
            placeholder="Contexte interne, demandes spéciales, etc."
          />
        </label>
      </div>

      {/* ─── Timeline ────────────────────────────────────────────── */}
      <ChantierTimeline chantier={chantier} />

      {/* ─── Danger zone ────────────────────────────────────────── */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-700 hover:underline"
        >
          Supprimer ce chantier
        </button>
      </div>
    </div>
  );
}
