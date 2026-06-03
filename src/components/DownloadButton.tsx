"use client";

import { useState } from "react";

interface Props {
  loading: boolean;
  onClick: () => void;
  onSendEmail?: (email: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function DownloadButton({ loading, onClick, onSendEmail }: Props) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    { type: "success"; message: string } | { type: "error"; message: string } | null
  >(null);

  const handleSend = async () => {
    if (!onSendEmail) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ type: "error", message: "Email invalide" });
      return;
    }
    setSending(true);
    setStatus(null);
    const result = await onSendEmail(trimmed);
    setSending(false);
    if (result.ok) {
      setStatus({ type: "success", message: `Envoyé à ${trimmed}` });
      setEmail("");
    } else {
      setStatus({
        type: "error",
        message: result.error || "Erreur lors de l'envoi",
      });
    }
  };

  return (
    <div className="text-center mt-8">
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch">
        <button
          onClick={onClick}
          disabled={loading || sending}
          className={`
            px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200
            ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-light shadow-lg hover:shadow-xl"
            }
          `}
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Création du PDF...
            </span>
          ) : (
            "Télécharger le PDF"
          )}
        </button>

        {onSendEmail && (
          <button
            onClick={() => {
              setShowEmailForm((v) => !v);
              setStatus(null);
            }}
            disabled={loading || sending}
            className="px-6 py-4 rounded-xl text-base font-semibold border-2 border-gray-300 text-gray-700 hover:border-accent hover:text-accent transition-colors"
          >
            {showEmailForm ? "Annuler" : "Envoyer par email"}
          </button>
        )}
      </div>

      {showEmailForm && onSendEmail && (
        <div className="mt-4 max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              disabled={sending}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="px-5 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
          {status && (
            <p
              className={`text-sm mt-2 ${
                status.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500 mt-3">
        Document professionnel avec toutes vos simulations
      </p>
    </div>
  );
}
