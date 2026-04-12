"use client";

import { useState, useCallback } from "react";

interface Props {
  onResult: (preview: string, remoteUrl: string, address: string) => void;
  onBack: () => void;
}

export default function AddressInput({ onResult, onBack }: Props) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!address.trim()) {
      setError("Veuillez entrer une adresse.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/streetview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la recherche");
      }

      const data = await res.json();
      onResult(data.previewUrl, data.imageUrl, address.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la recherche de l'adresse"
      );
    } finally {
      setLoading(false);
    }
  }, [address, onResult]);

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Entrez l&apos;adresse de la maison
        </h2>
        <p className="text-gray-500 mt-2">
          Nous utiliserons Google Street View pour obtenir une photo
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ex: 1234 Rue Saint-Denis, Montréal, QC"
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-accent focus:outline-none text-gray-800 placeholder-gray-400"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className={`
            px-6 py-3 rounded-xl font-bold transition-all duration-200
            ${
              loading || !address.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-light"
            }
          `}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Rechercher"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">
        L&apos;adresse sera utilisée uniquement pour récupérer une image Street View.
        Assurez-vous que l&apos;adresse est complète et précise.
      </p>
    </div>
  );
}
