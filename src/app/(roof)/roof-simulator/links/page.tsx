"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

interface RecentCode {
  code: string;
  clientName?: string;
  phoneNumber?: string;
  createdAt?: number;
  expiresAt?: number;
  expired?: boolean;
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientLinksPage() {
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { type: "success"; code: string; url: string; smsSent: boolean; smsError?: string }
    | { type: "error"; message: string }
    | null
  >(null);
  const [recent, setRecent] = useState<RecentCode[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const res = await fetch("/api/client-codes");
      const data = await res.json();
      setRecent(data.items || []);
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/client-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResult({
          type: "error",
          message: data.error || "Erreur lors de la création du lien",
        });
      } else {
        setResult({
          type: "success",
          code: data.code,
          url: data.url,
          smsSent: data.smsSent,
          smsError: data.smsError,
        });
        setClientName("");
        setPhoneNumber("");
        setEmail("");
        loadRecent();
      }
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur réseau",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link
              href="/roof-simulator"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Retour au simulateur
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Créer un lien client
          </h1>
          <p className="text-gray-500 mb-6">
            Génère un code à 6 caractères et envoie le lien de simulation par
            SMS au client. Le lien expire dans 7 jours.
          </p>

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
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jean Tremblay"
                required
                disabled={submitting}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Téléphone (SMS)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(514) 867-0787"
                required
                disabled={submitting}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email (optionnel)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@exemple.com"
                disabled={submitting}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !clientName.trim() || !phoneNumber.trim()}
              className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? "Création..." : "Créer & envoyer SMS"}
            </button>
          </form>

          {result && result.type === "success" && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="font-semibold text-green-900">
                Lien créé : code <span className="font-mono">{result.code}</span>
              </p>
              <p className="text-sm text-green-800 mt-1 break-all">
                {result.url}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copyLink(result.url)}
                  className="px-3 py-1.5 bg-white border border-green-300 text-green-800 rounded-lg text-sm font-semibold hover:bg-green-100"
                >
                  Copier le lien
                </button>
              </div>
              {result.smsSent ? (
                <p className="text-xs text-green-700 mt-2">
                  ✓ SMS envoyé
                </p>
              ) : (
                <p className="text-xs text-orange-700 mt-2">
                  ⚠ SMS non envoyé : {result.smsError || "erreur"}
                </p>
              )}
            </div>
          )}

          {result && result.type === "error" && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800">
              {result.message}
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Liens récents
            </h2>
            {loadingRecent ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun lien créé depuis cette page pour l&apos;instant.
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((item) => (
                  <div
                    key={item.code}
                    className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">
                          {item.code}
                        </span>
                        {item.expired && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            expiré
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 truncate">
                        {item.clientName || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.phoneNumber || "—"} · {formatDate(item.createdAt)}
                      </div>
                    </div>
                    {!item.expired && (
                      <Link
                        href={`/client/${item.code}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-accent hover:text-accent shrink-0"
                      >
                        Ouvrir
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
