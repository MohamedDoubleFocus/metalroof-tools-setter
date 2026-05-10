"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import SlotSuggestionCard from "./SlotSuggestionCard";
import { SlotSuggestion } from "@/types/booking";
import { getSettings } from "@/lib/booking/settings";

type SortMode = "distance" | "asap";

// We display ALL availability windows the optimizer returns (1 per gap, so
// at most ~3 per day). No artificial cap — the setter wants the full picture.

export default function SlotFinder() {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<SlotSuggestion[]>([]);
  const [daysScanned, setDaysScanned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("distance");

  const inputRef = useRef<HTMLInputElement>(null);
  const apiInitialized = useRef(false);

  // Wire up Google Places Autocomplete to the address input
  useEffect(() => {
    if (!inputRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    async function init() {
      try {
        if (!apiInitialized.current) {
          setOptions({ key: apiKey! });
          apiInitialized.current = true;
        }
        const { Autocomplete } = (await importLibrary(
          "places"
        )) as google.maps.PlacesLibrary;
        if (cancelled || !inputRef.current) return;

        const ac = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ca" },
          fields: ["formatted_address", "geometry"],
          types: ["address"],
        });

        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place.geometry?.location) {
            setCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
          if (place.formatted_address) {
            setAddress(place.formatted_address);
          }
        });
      } catch {
        // silent — fall back to plain input
      }
    }

    init();

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  const handleManualChange = (val: string) => {
    setAddress(val);
    setCoords(null);
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setAllSlots([]);
    setDaysScanned(null);

    try {
      const settings = getSettings();
      const res = await fetch("/api/booking/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coords: coords ?? undefined,
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setAllSlots(data.suggestions);
      setDaysScanned(data.daysScanned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Compute display list based on sort mode
  const displayedSlots = useMemo(() => {
    if (allSlots.length === 0) return [];

    if (sortMode === "asap") {
      // Earliest window first — full list
      return [...allSlots].sort(
        (a, b) =>
          new Date(a.windowStart).getTime() -
          new Date(b.windowStart).getTime()
      );
    }

    // sortMode === "distance" — best score first — full list
    return [...allSlots].sort((a, b) => a.score - b.score);
  }, [allSlots, sortMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="Adresse du nouveau client..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          autoComplete="off"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Chercher"}
        </button>
      </div>

      {coords && (
        <p className="text-xs text-gray-400 -mt-3">
          Adresse localisée : {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Analyse des 15 prochains jours en cours...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {daysScanned !== null && !loading && allSlots.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">
            {allSlots.length} disponibilités sur les {daysScanned} prochains
            jours
          </p>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setSortMode("distance")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sortMode === "distance"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Par distance
            </button>
            <button
              onClick={() => setSortMode("asap")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sortMode === "asap"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Au plus tôt
            </button>
          </div>
        </div>
      )}

      {displayedSlots.length > 0 && (
        <div className="space-y-3">
          {displayedSlots.map((s, i) => (
            <SlotSuggestionCard
              key={`${s.date}-${s.windowStart}`}
              suggestion={s}
              rank={i + 1}
            />
          ))}
        </div>
      )}

      {daysScanned !== null && allSlots.length === 0 && !loading && (
        <p className="text-sm text-gray-500">
          Aucun créneau disponible dans les 15 prochains jours pour cette adresse.
        </p>
      )}
    </div>
  );
}
