"use client";

import { SlotSuggestion } from "@/types/booking";

interface Props {
  suggestion: SlotSuggestion;
  rank: number;
}

export default function SlotSuggestionCard({ suggestion, rank }: Props) {
  const start = new Date(suggestion.startTime);
  const end = new Date(suggestion.endTime);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

  const added = suggestion.addedTravelMinutes;
  const colorClass =
    added <= 15
      ? "bg-green-50 border-green-200"
      : added <= 30
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200";

  const badgeClass =
    added <= 15
      ? "bg-green-100 text-green-800"
      : added <= 30
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-500 capitalize">
          #{rank} — {suggestion.dayLabel}
        </span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
          +{added} min trajet
        </span>
      </div>
      <div className="text-lg font-bold text-gray-900 mb-2">
        {formatTime(start)} - {formatTime(end)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        <span>
          {suggestion.travelFromPrevious} min depuis{" "}
          <span className="font-semibold text-gray-700">
            {suggestion.previousIsHome ? "🏠 Maison" : "RDV précédent"}
          </span>
        </span>
        <span>
          {suggestion.travelToNext} min vers{" "}
          <span className="font-semibold text-gray-700">
            {suggestion.nextIsHome ? "🏠 Maison" : "RDV suivant"}
          </span>
        </span>
        <span>{suggestion.dayEventCount} RDV ce jour</span>
      </div>
      {suggestion.conflict && (
        <p className="text-xs mt-2 font-semibold text-red-600">
          Attention : depasse le temps de trajet maximum
        </p>
      )}
    </div>
  );
}
