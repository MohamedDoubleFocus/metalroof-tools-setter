"use client";

import { useState } from "react";
import type { Chantier } from "@/types/chantiers";

type ActionKey = "notify" | "warranty" | "invoice";

interface Props {
  chantier: Chantier;
  onChange: (updated: Chantier) => void;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

const ENDPOINTS: Record<ActionKey, string> = {
  notify: "notify",
  warranty: "send-warranty",
  invoice: "send-invoice",
};

const LABELS: Record<ActionKey, { btn: string; confirm: string }> = {
  notify: {
    btn: "Notifier client (SMS)",
    confirm: "Envoyer un SMS de rappel au client maintenant ?",
  },
  warranty: {
    btn: "Envoyer la garantie",
    confirm:
      "Générer et envoyer le certificat de garantie par email au client ?",
  },
  invoice: {
    btn: "Envoyer la facture",
    confirm:
      "Générer et envoyer la facture finale par email au client ?",
  },
};

export default function ChantierActions({ chantier, onChange }: Props) {
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [feedback, setFeedback] = useState<Record<ActionKey, Feedback | null>>({
    notify: null,
    warranty: null,
    invoice: null,
  });

  const trigger = async (key: ActionKey) => {
    if (key === "invoice" && chantier.totalAmount == null) {
      setFeedback((f) => ({
        ...f,
        invoice: {
          type: "error",
          message:
            "Renseigne d'abord le montant total avant d'envoyer la facture.",
        },
      }));
      return;
    }
    if (!window.confirm(LABELS[key].confirm)) return;
    setBusy(key);
    setFeedback((f) => ({ ...f, [key]: null }));
    try {
      const res = await fetch(
        `/api/chantiers/${chantier.id}/${ENDPOINTS[key]}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setFeedback((f) => ({
          ...f,
          [key]: {
            type: "error",
            message: data.error || "Erreur",
          },
        }));
      } else {
        const successMsg =
          key === "notify"
            ? "SMS envoyé"
            : key === "warranty"
              ? "Garantie envoyée par email"
              : `Facture envoyée (${data.invoiceNumber || ""})`;
        setFeedback((f) => ({
          ...f,
          [key]: { type: "success", message: successMsg },
        }));
        // Refetch the chantier to refresh markers (warrantySentAt etc.)
        try {
          const refresh = await fetch(`/api/chantiers/${chantier.id}`);
          if (refresh.ok) {
            const j = await refresh.json();
            onChange(j.chantier);
          }
        } catch {
          // non-fatal
        }
      }
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        [key]: {
          type: "error",
          message: err instanceof Error ? err.message : "Erreur réseau",
        },
      }));
    } finally {
      setBusy(null);
    }
  };

  const renderButton = (key: ActionKey, marker?: number) => {
    const fb = feedback[key];
    return (
      <div className="space-y-2">
        <button
          onClick={() => trigger(key)}
          disabled={busy !== null}
          className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-800 hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {busy === key ? "Envoi..." : LABELS[key].btn}
        </button>
        {marker && (
          <p className="text-xs text-green-700">
            Dernier envoi : {new Date(marker).toLocaleString("fr-CA")}
          </p>
        )}
        {fb && (
          <p
            className={`text-xs ${
              fb.type === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {fb.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {renderButton("notify")}
      {renderButton("warranty", chantier.warrantySentAt)}
      {renderButton("invoice", chantier.invoiceSentAt)}
    </div>
  );
}
