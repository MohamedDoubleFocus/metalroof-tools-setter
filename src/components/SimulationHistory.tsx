"use client";

import { useEffect, useState } from "react";

interface HistoryEntry {
  simId: string;
  clientName?: string;
  pdfUrl: string;
  thumbnailUrl?: string;
  createdAt: number;
  source: "closer-direct" | "client-portal" | "email";
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(ts).toLocaleDateString("fr-CA");
}

function sourceLabel(source: HistoryEntry["source"]): string {
  switch (source) {
    case "email":
      return "Envoyé par email";
    case "client-portal":
      return "Portail client";
    default:
      return "Téléchargé";
  }
}

export default function SimulationHistory() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/simulator/history")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <h3 className="text-base font-bold text-gray-800 mb-3">
        Historique des 5 dernières simulations
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <a
            key={item.simId}
            href={item.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-accent hover:shadow-md transition-all"
          >
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                PDF
              </div>
            )}
            <div className="p-3">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {item.clientName || "Sans nom"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatRelative(item.createdAt)} · {sourceLabel(item.source)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
